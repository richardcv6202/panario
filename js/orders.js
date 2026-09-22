// ============================================================
// 📦 ORDERS MODULE - Panario (Pedidos con FIX de duplicados
// y todas las funcionalidades de fases anteriores)
// CORREGIDO: Eliminada lógica de deudas de pedidos
// CORREGIDO FASE 2 (160926): Venta desde pedido con pago adelantado
//   ya NO se marca como deuda (Problema #8)
// CORREGIDO (160926 v3): Edición de pedido NO actualizaba client_name
// CORREGIDO FASE 1.2 (190926 v2):
//   - updateOrderStatus() permite la entrega aunque falle el stock
// AÑADIDO FASE 1.3.2 (190926 v3):
//   - saveOrder() genera uuid para orders y order_items
// AÑADIDO FASE 2.1 (190926 v4):
//   - limpiarListaEspera(), eliminarDeListaEspera(),
//     procesarClienteDeLista(), cancelarPedidoDesdeLista(),
//     cancelarPedidosGlobalmente()
// 🆕 ENTREGA 4 (230926 v5): ORDEN ASCENDENTE POR ID
//   - getOrders() ordena por: ORDER BY o.delivery_date ASC, o.id ASC
// 🆕 ENTREGA 7 (230926 v6): REPROGRAMAR PEDIDOS POR RANGO
//   - NUEVA función reprogramarPedidosPorRango()
//   - NUEVA función autoEliminarDeListaAlComprar()
// 🆕 v2.1.12 (210926 v7): CORRECCIÓN #2 - BLOQUEO POR RECETAS NO COMPARTIDAS
//   - ✅ NUEVA función puedeUsuarioActualProcesarPedido(orderOrId)
//   - ✅ NUEVA función puedeUsuarioActualProcesarVenta() (por simetría)
//   - ✅ updateOrderStatus() verifica permisos antes de ejecutar
//   - ✅ registrarVentaDesdePedido() verifica permisos antes de crear la venta
//   - ✅ cancelarPedidoDesdeLista() verifica permisos
//   - ✅ procesarClienteDeLista() verifica permisos
//   - ✅ eliminarDeListaEspera() verifica permisos
//   - ✅ Los pedidos de la lista de espera también se filtran por permisos
//   - ✅ Se guarda en la caché interna para evitar queries repetidas
// 🆕 v2.1.13 (210926 v8): CORRECCIÓN #4 - EXCLUIR DÍAS DE LA SEMANA EN RANGO
//   - ✅ NUEVA función getNombreDiaSemana(diaNumero) para UI
//   - ✅ generarFechasPorPatron() acepta nuevo campo: diasExcluidos
//     * Aplica SOLO cuando patron.tipo === 'rango'
//     * Se combina con paridad (pares/impares)
//     * Ej: "Rango 1-30 octubre, solo pares, excluyendo domingos"
//   - ✅ getDiasExcluidosDelPatron() helper para normalizar entrada
//   - ✅ Compatibilidad total: si no se pasa diasExcluidos, se comporta igual que antes
//   - ✅ Verificación en crearPedidosMultiples() para excluir fechas correctamente
//   - ✅ Logs de diagnóstico de exclusión
// ============================================================

window.OrdersModule = {};

// ============================================================
// 🆕 v2.1.12: CACHÉ DE PERMISOS POR PEDIDO
// ============================================================

const _permisosPedidosCache = new Map();
const _permisosVentasCache = new Map();

function limpiarCachePermisos() {
    _permisosPedidosCache.clear();
    _permisosVentasCache.clear();
    console.log('🔐 Caché de permisos de pedidos/ventas limpiada');
}

window.limpiarCachePermisos = limpiarCachePermisos;

// ============================================================
// 🆕 v2.1.12: VERIFICAR PERMISOS DE UN PEDIDO
// ============================================================

function puedeUsuarioActualProcesarPedido(orderOrId) {
    try {
        const user = window.AuthModule?.getCurrentUser();
        if (!user) {
            return { puede: false, razon: 'No hay usuario autenticado', recetasBloqueadas: [] };
        }
        
        if (user.is_admin === 1) {
            return { puede: true, razon: '', recetasBloqueadas: [] };
        }
        
        let orderId = null;
        let order = null;
        
        if (typeof orderOrId === 'number') {
            orderId = orderOrId;
        } else if (orderOrId && typeof orderOrId === 'object') {
            order = orderOrId;
            orderId = order.id;
        }
        
        if (!orderId) {
            return { puede: true, razon: '', recetasBloqueadas: [] };
        }
        
        if (_permisosPedidosCache.has(orderId)) {
            return _permisosPedidosCache.get(orderId);
        }
        
        if (!order || !order.items) {
            try {
                const items = window.DBModule.query(
                    `SELECT oi.producto_id, oi.receta_id, oi.product_name, 
                            p.nombre as producto_nombre, r.name as receta_nombre
                     FROM order_items oi
                     LEFT JOIN productos p ON oi.producto_id = p.id
                     LEFT JOIN recipes r ON oi.receta_id = r.id
                     WHERE oi.order_id = ? AND oi.deleted_at IS NULL`,
                    [orderId]
                );
                order = { id: orderId, items: items };
            } catch (e) {
                console.warn('⚠️ Error cargando items del pedido para verificar permisos:', e);
                return { puede: true, razon: '', recetasBloqueadas: [] };
            }
        }
        
        if (!order.items || order.items.length === 0) {
            const result = { puede: true, razon: '', recetasBloqueadas: [] };
            _permisosPedidosCache.set(orderId, result);
            return result;
        }
        
        const recetasBloqueadas = [];
        
        for (const item of order.items) {
            if (!item.receta_id) continue;
            
            try {
                const recetas = window.DBModule.query(
                    `SELECT id, user_id, shared, name 
                     FROM recipes 
                     WHERE id = ? AND deleted_at IS NULL`,
                    [item.receta_id]
                );
                
                if (recetas.length === 0) {
                    recetasBloqueadas.push({
                        id: item.receta_id,
                        nombre: item.receta_nombre || item.producto_nombre || 'Receta eliminada',
                        razon: 'Receta eliminada'
                    });
                    continue;
                }
                
                const receta = recetas[0];
                
                if (receta.user_id !== user.id && receta.shared !== 1) {
                    recetasBloqueadas.push({
                        id: receta.id,
                        nombre: receta.name || 'Receta',
                        razon: 'No compartida'
                    });
                }
            } catch (e) {
                console.warn(`⚠️ Error verificando receta ${item.receta_id}:`, e);
                recetasBloqueadas.push({
                    id: item.receta_id,
                    nombre: item.receta_nombre || 'Receta',
                    razon: 'Error al verificar'
                });
            }
        }
        
        let result;
        if (recetasBloqueadas.length > 0) {
            result = {
                puede: false,
                razon: `Este pedido usa ${recetasBloqueadas.length} receta(s) que no te han compartido. No puedes procesarlo.`,
                recetasBloqueadas
            };
        } else {
            result = { puede: true, razon: '', recetasBloqueadas: [] };
        }
        
        _permisosPedidosCache.set(orderId, result);
        return result;
        
    } catch (e) {
        console.error('❌ Error en puedeUsuarioActualProcesarPedido:', e);
        return { puede: true, razon: '', recetasBloqueadas: [] };
    }
}

function puedeUsuarioActualProcesarVenta(saleOrId) {
    try {
        const user = window.AuthModule?.getCurrentUser();
        if (!user) {
            return { puede: false, razon: 'No hay usuario autenticado', recetaBloqueada: null };
        }
        
        if (user.is_admin === 1) {
            return { puede: true, razon: '', recetaBloqueada: null };
        }
        
        let saleId = null;
        let sale = null;
        
        if (typeof saleOrId === 'number') {
            saleId = saleOrId;
        } else if (saleOrId && typeof saleOrId === 'object') {
            sale = saleOrId;
            saleId = sale.id;
        }
        
        if (!saleId) {
            return { puede: true, razon: '', recetaBloqueada: null };
        }
        
        if (_permisosVentasCache.has(saleId)) {
            return _permisosVentasCache.get(saleId);
        }
        
        if (!sale) {
            try {
                const sales = window.DBModule.query(
                    `SELECT s.id, s.receta_id, s.producto_id, s.product_name, 
                            r.name as receta_nombre
                     FROM sales s
                     LEFT JOIN recipes r ON s.receta_id = r.id
                     WHERE s.id = ? AND s.deleted_at IS NULL`,
                    [saleId]
                );
                if (sales.length === 0) {
                    const result = { puede: false, razon: 'Venta no encontrada', recetaBloqueada: null };
                    _permisosVentasCache.set(saleId, result);
                    return result;
                }
                sale = sales[0];
            } catch (e) {
                console.warn('⚠️ Error cargando venta para verificar permisos:', e);
                return { puede: true, razon: '', recetaBloqueada: null };
            }
        }
        
        if (!sale.receta_id) {
            const result = { puede: true, razon: '', recetaBloqueada: null };
            _permisosVentasCache.set(saleId, result);
            return result;
        }
        
        try {
            const recetas = window.DBModule.query(
                `SELECT id, user_id, shared, name 
                 FROM recipes 
                 WHERE id = ? AND deleted_at IS NULL`,
                [sale.receta_id]
            );
            
            if (recetas.length === 0) {
                const result = {
                    puede: false,
                    razon: `La receta asociada a esta venta fue eliminada. No puedes procesarla.`,
                    recetaBloqueada: { id: sale.receta_id, nombre: 'Receta eliminada', razon: 'Eliminada' }
                };
                _permisosVentasCache.set(saleId, result);
                return result;
            }
            
            const receta = recetas[0];
            
            if (receta.user_id !== user.id && receta.shared !== 1) {
                const result = {
                    puede: false,
                    razon: `Esta venta usa la receta "${receta.name}" que no te han compartido. No puedes procesarla.`,
                    recetaBloqueada: { id: receta.id, nombre: receta.name, razon: 'No compartida' }
                };
                _permisosVentasCache.set(saleId, result);
                return result;
            }
            
            const result = { puede: true, razon: '', recetaBloqueada: null };
            _permisosVentasCache.set(saleId, result);
            return result;
            
        } catch (e) {
            console.warn(`⚠️ Error verificando receta ${sale.receta_id}:`, e);
            return { puede: true, razon: '', recetaBloqueada: null };
        }
        
    } catch (e) {
        console.error('❌ Error en puedeUsuarioActualProcesarVenta:', e);
        return { puede: true, razon: '', recetaBloqueada: null };
    }
}

window.puedeUsuarioActualProcesarPedido = puedeUsuarioActualProcesarPedido;
window.puedeUsuarioActualProcesarVenta = puedeUsuarioActualProcesarVenta;

// ============================================================
// CLIENTES
// ============================================================

async function getClients() {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return [];
    try {
        return window.DBModule.query(
            'SELECT * FROM clients WHERE user_id = ? AND deleted_at IS NULL ORDER BY name ASC',
            [user.id]
        );
    } catch (e) {
        console.warn('⚠️ Error obteniendo clientes:', e);
        return [];
    }
}

async function getClient(id) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return null;
    try {
        const results = window.DBModule.query(
            'SELECT * FROM clients WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
            [id, user.id]
        );
        return results.length > 0 ? results[0] : null;
    } catch (e) {
        console.warn('⚠️ Error obteniendo cliente:', e);
        return null;
    }
}

async function saveClient(clientData) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    try {
        if (clientData.id) {
            window.DBModule.execute(`
                UPDATE clients 
                SET name = ?, phone = ?, email = ?, address = ?, notes = ?
                WHERE id = ? AND user_id = ?
            `, [
                clientData.name, clientData.phone || null,
                clientData.email || null, clientData.address || null,
                clientData.notes || null, clientData.id, user.id
            ]);
            return { success: true, id: clientData.id };
        } else {
            const result = window.DBModule.execute(`
                INSERT INTO clients (user_id, name, phone, email, address, notes, uuid)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                user.id, clientData.name, clientData.phone || null,
                clientData.email || null, clientData.address || null,
                clientData.notes || null,
                window.DBModule.generateUuidForTable('clients')
            ]);
            return { success: true, id: result.lastId };
        }
    } catch (e) {
        console.error('Error guardando cliente:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// PRODUCTOS
// ============================================================

async function getProductos() {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return [];
    try {
        return window.DBModule.getProductos();
    } catch (e) {
        console.warn('⚠️ Error obteniendo productos:', e);
        return [];
    }
}

async function getProducto(id) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return null;
    try {
        return window.DBModule.getProducto(id);
    } catch (e) {
        console.warn('⚠️ Error obteniendo producto:', e);
        return null;
    }
}

// ============================================================
// PEDIDOS - OBTENER (POR NEGOCIO)
// ============================================================

async function getOrders(filters = {}) {
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return [];

    let sql = `
        SELECT o.*, 
               c.name as client_name_full,
               (
                   SELECT GROUP_CONCAT(DISTINCT p.nombre)
                   FROM order_items oi
                   LEFT JOIN productos p ON oi.producto_id = p.id
                   WHERE oi.order_id = o.id 
                     AND oi.deleted_at IS NULL
               ) as productos_nombres,
               (
                   SELECT wl.position 
                   FROM waiting_list wl 
                   WHERE wl.order_id = o.id 
                     AND wl.deleted_at IS NULL 
                     AND wl.status = 'waiting'
                   LIMIT 1
               ) as waiting_position
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        WHERE o.negocio_id = ? AND o.deleted_at IS NULL
    `;
    let params = [negocioId];

    if (filters.status) { sql += ' AND o.status = ?'; params.push(filters.status); }
    if (filters.client_id) { sql += ' AND o.client_id = ?'; params.push(filters.client_id); }
    if (filters.from_date) { sql += ' AND DATE(o.delivery_date) >= DATE(?)'; params.push(filters.from_date); }
    if (filters.to_date) { sql += ' AND DATE(o.delivery_date) <= DATE(?)'; params.push(filters.to_date); }
    if (filters.search) {
        sql += ' AND (o.client_name LIKE ? OR c.name LIKE ?)';
        const searchTerm = '%' + filters.search + '%';
        params.push(searchTerm, searchTerm);
    }

    sql += ' GROUP BY o.id ORDER BY o.delivery_date ASC, o.id ASC';

    try {
        return window.DBModule.query(sql, params);
    } catch (e) {
        console.error('Error obteniendo pedidos:', e);
        return [];
    }
}

// ============================================================
// PEDIDO INDIVIDUAL (POR NEGOCIO)
// ============================================================

async function getOrder(id) {
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return null;

    try {
        const results = window.DBModule.query(
            `SELECT o.*, c.name as client_name_full 
             FROM orders o
             LEFT JOIN clients c ON o.client_id = c.id
             WHERE o.id = ? AND o.negocio_id = ? AND o.deleted_at IS NULL`,
            [id, negocioId]
        );
        
        if (results.length === 0) return null;
        
        const order = results[0];
        
        order.items = window.DBModule.query(`
            SELECT oi.*, p.nombre as producto_nombre, p.precio_venta,
                   p.unidad_venta, p.cantidad_por_unidad, p.receta_id,
                   r.name as receta_nombre, r.shared as receta_shared,
                   r.user_id as receta_user_id
            FROM order_items oi
            LEFT JOIN productos p ON oi.producto_id = p.id
            LEFT JOIN recipes r ON p.receta_id = r.id
            WHERE oi.order_id = ? AND oi.deleted_at IS NULL
            ORDER BY oi.id ASC
        `, [id]);
        
        order.payments = window.DBModule.query(
            'SELECT * FROM payments WHERE order_id = ? AND deleted_at IS NULL ORDER BY id ASC',
            [id]
        );
        
        const waitingItem = window.DBModule.query(`
            SELECT * FROM waiting_list 
            WHERE order_id = ? AND deleted_at IS NULL AND status = 'waiting'
        `, [id]);
        order.waiting_list = waitingItem.length > 0 ? waitingItem[0] : null;
        
        return order;
    } catch (e) {
        console.error('Error obteniendo pedido:', e);
        return null;
    }
}

// ============================================================
// GUARDAR PEDIDO (individual)
// ============================================================

async function saveOrder(orderData) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return { success: false, error: 'No hay negocio activo' };

    try {
        let orderId = orderData.id || null;
        let isUpdate = false;
        let oldOrder = null;

        if (!orderData.client_name) return { success: false, error: 'El nombre del cliente es obligatorio' };
        if (!orderData.delivery_date) return { success: false, error: 'La fecha de entrega es obligatoria' };
        if (!orderData.items || orderData.items.length === 0) return { success: false, error: 'Debe agregar al menos un producto' };

        if (orderId) {
            oldOrder = await getOrder(orderId);
            if (!oldOrder) return { success: false, error: 'Pedido no encontrado o no tienes permiso' };
            isUpdate = true;
            
            const permisos = puedeUsuarioActualProcesarPedido(oldOrder);
            if (!permisos.puede) {
                return { success: false, error: '🔒 ' + permisos.razon };
            }
        }

        const clientName = orderData.client_name || 'Cliente sin nombre';
        const clientPhone = orderData.client_phone || null;
        const deliveryDate = orderData.delivery_date || new Date(Date.now() + 86400000).toISOString();
        const status = orderData.status || 'pending';
        const priority = orderData.priority || 'normal';
        const total = orderData.total || 0;
        const notes = orderData.notes || null;
        const session = orderData.session || null;
        const hasAdvancePayment = orderData.has_advance_payment ? 1 : 0;
        const advanceAmount = orderData.advance_amount || 0;
        const advancePaymentMethod = orderData.advance_payment_method || null;

        let clientId = orderData.client_id || null;
        
        if (isUpdate && oldOrder) {
            const nombreAnterior = (oldOrder.client_name || '').trim().toLowerCase();
            const nombreNuevo = (clientName || '').trim().toLowerCase();
            
            if (nombreAnterior !== nombreNuevo) {
                console.log('📝 [saveOrder] El nombre del cliente cambió. Desvinculando client_id.');
                clientId = null;
            } else {
                clientId = oldOrder.client_id || clientId;
            }
        }

        let calculatedTotal = total;
        if (!total && orderData.items) {
            calculatedTotal = orderData.items.reduce((sum, item) => sum + (item.quantity * (item.unit_price || 0)), 0);
        }

        if (isUpdate) {
            window.DBModule.execute(`
                UPDATE orders 
                SET client_id = ?, client_name = ?, client_phone = ?,
                    delivery_date = ?, status = ?, priority = ?, total = ?, 
                    notes = ?, session = ?, has_advance_payment = ?,
                    advance_amount = ?, advance_payment_method = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND negocio_id = ?
            `, [
                clientId, clientName, clientPhone, deliveryDate, status, priority,
                calculatedTotal, notes, session, hasAdvancePayment, advanceAmount,
                advancePaymentMethod, orderId, negocioId
            ]);

            window.DBModule.execute('DELETE FROM order_items WHERE order_id = ?', [orderId]);
        } else {
            const orderUuid = window.DBModule.generateUuidForTable('orders');
            
            const result = window.DBModule.execute(`
                INSERT INTO orders (user_id, negocio_id, client_id, client_name, client_phone,
                    delivery_date, status, priority, total, notes, session,
                    has_advance_payment, advance_amount, advance_payment_method, uuid)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                user.id, negocioId, clientId, clientName, clientPhone, deliveryDate,
                status, priority, calculatedTotal, notes, session,
                hasAdvancePayment, advanceAmount, advancePaymentMethod, orderUuid
            ]);
            orderId = result.lastId;
            
            console.log(`✅ [saveOrder] Pedido #${orderId} creado con uuid ${orderUuid}`);
        }

        if (!orderId) return { success: false, error: 'Error: No se pudo obtener el ID del pedido' };

        if (orderData.items && orderData.items.length > 0) {
            for (const item of orderData.items) {
                if (item.producto_id || (item.product_name && item.quantity > 0)) {
                    const itemUuid = window.DBModule.generateUuidForTable('order_items');
                    
                    window.DBModule.execute(`
                        INSERT INTO order_items (order_id, product_name, producto_id, receta_id, 
                            quantity, unit_price, subtotal, notes, uuid)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        orderId, item.product_name || 'Producto',
                        item.producto_id || null, item.receta_id || null,
                        item.quantity || 1, item.unit_price || 0,
                        (item.quantity || 1) * (item.unit_price || 0),
                        item.notes || null, itemUuid
                    ]);
                }
            }
        }

        _permisosPedidosCache.delete(orderId);

        if (status === 'confirmed' || status === 'production') {
            try { await descontarStockPedido(orderId); } catch (e) {}
        }
        if (status === 'delivered') {
            try { await registrarVentaDesdePedido(orderId); } catch (e) {}
            try { await cancelarDeudaPedido(orderId); } catch (e) {}
        }
        if (status === 'waiting') {
            try { await window.DBModule.addToWaitingList(orderId); } catch (e) {}
        }

        if (hasAdvancePayment && advanceAmount > 0) {
            if (isUpdate) {
                window.DBModule.execute(
                    'UPDATE payments SET deleted_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = "paid"',
                    [orderId]
                );
            }
            window.DBModule.execute(`
                INSERT INTO payments (order_id, amount, payment_method, status, notes)
                VALUES (?, ?, ?, ?, ?)
            `, [orderId, advanceAmount, advancePaymentMethod || 'cash', 'paid', 'Pago por adelantado']);
        }

        window.DBModule.saveAndNotify();
        
        if (window.NotificationsModule) {
            window.NotificationsModule.addNotification(
                `📋 Pedido #${orderId} ${isUpdate ? 'actualizado' : 'creado'} correctamente`,
                'success', 3000
            );
        }
        
        return { success: true, id: orderId, updated: isUpdate };

    } catch (e) {
        console.error('❌ Error guardando pedido:', e);
        return { success: false, error: e.message || 'Error al guardar el pedido' };
    }
}

// ============================================================
// 🆕 v2.1.13: HELPERS DE DÍAS DE LA SEMANA
// ============================================================

/**
 * Devuelve el nombre del día de la semana en español.
 * @param {number} diaNumero - 0=Domingo, 1=Lunes, ..., 6=Sábado
 * @param {boolean} corto - Si true, devuelve abreviatura (Lun, Mar...)
 */
function getNombreDiaSemana(diaNumero, corto = false) {
    const diasLargo = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diasCorto = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const idx = parseInt(diaNumero);
    if (isNaN(idx) || idx < 0 || idx > 6) return '';
    return corto ? diasCorto[idx] : diasLargo[idx];
}

/**
 * Normaliza el array de días excluidos.
 * Acepta: undefined, null, [], [0, 6], ['0', '6']
 * Devuelve: array de enteros únicos válidos (0-6) o [] si no hay
 */
function getDiasExcluidosDelPatron(patron) {
    if (!patron) return [];
    const raw = patron.diasExcluidos;
    if (!raw || !Array.isArray(raw) || raw.length === 0) return [];
    
    const set = new Set();
    raw.forEach(d => {
        const n = parseInt(d);
        if (!isNaN(n) && n >= 0 && n <= 6) set.add(n);
    });
    return Array.from(set).sort();
}

window.getNombreDiaSemana = getNombreDiaSemana;
window.getDiasExcluidosDelPatron = getDiasExcluidosDelPatron;

// ============================================================
// RESERVA POR PERÍODO - GENERADOR DE FECHAS
// 🆕 v2.1.13: Soporta exclusiones de días de la semana
// ============================================================

function generarFechasPorPatron(patron) {
    const { tipo, fechaInicio, fechaFin, diasSemana, diasEspecificos, paridad } = patron;

    const fechas = [];
    if (!fechaInicio || !fechaFin) return fechas;

    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T00:00:00');
    if (inicio > fin) return fechas;

    // 🆕 v2.1.13: Normalizar días excluidos
    const diasExcluidos = getDiasExcluidosDelPatron(patron);
    const excluidosSet = new Set(diasExcluidos);
    
    if (diasExcluidos.length > 0) {
        console.log(`📅 [generarFechasPorPatron] Excluyendo días: ${diasExcluidos.map(d => getNombreDiaSemana(d, true)).join(', ')}`);
    }

    const cursor = new Date(inicio);

    while (cursor <= fin) {
        const diaSemana = cursor.getDay();
        const diaMes = cursor.getDate();
        const fechaStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;

        let incluir = false;

        switch (tipo) {
            case 'rango':
                if (!paridad || paridad === 'todos') incluir = true;
                else if (paridad === 'pares') incluir = (diaMes % 2 === 0);
                else if (paridad === 'impares') incluir = (diaMes % 2 !== 0);
                else incluir = true;
                break;
            case 'semana':
                incluir = Array.isArray(diasSemana) && diasSemana.includes(diaSemana);
                break;
            case 'especificos':
                incluir = Array.isArray(diasEspecificos) && diasEspecificos.includes(diaMes);
                break;
            default:
                incluir = true;
        }

        // 🆕 v2.1.13: Aplicar exclusión SOLO en modo 'rango'
        // (en 'semana' y 'especificos' el usuario ya selecciona qué días incluir)
        if (incluir && tipo === 'rango' && excluidosSet.size > 0) {
            if (excluidosSet.has(diaSemana)) {
                incluir = false;
            }
        }

        if (incluir) fechas.push(fechaStr);
        cursor.setDate(cursor.getDate() + 1);
    }

    console.log(`📅 [generarFechasPorPatron] Generadas ${fechas.length} fechas (tipo=${tipo}, excluidos=${diasExcluidos.length})`);
    return fechas;
}

function calcularHoraPorSesion(sesion) {
    const horasPorSesion = { 'manana': '10:00', 'tarde': '15:00', 'noche': '19:00' };
    return horasPorSesion[sesion] || '10:00';
}

function verificarPedidosDuplicados(clientName, fechas) {
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return {};

    const resultado = {};
    try {
        for (const fecha of fechas) {
            const existing = window.DBModule.query(`
                SELECT id FROM orders 
                WHERE negocio_id = ? 
                  AND LOWER(client_name) = LOWER(?)
                  AND DATE(delivery_date) = DATE(?)
                  AND deleted_at IS NULL
                  AND status NOT IN ('cancelled')
                LIMIT 1
            `, [negocioId, clientName, fecha]);
            resultado[fecha] = existing.length > 0 ? existing[0].id : null;
        }
    } catch (e) {
        console.warn('⚠️ Error verificando duplicados:', e);
    }
    return resultado;
}

async function crearPedidosMultiples(data) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return { success: false, error: 'No hay negocio activo' };

    try {
        const { clientName, clientPhone, items, patron, sesion, notes, fechasExcluidas } = data;

        if (!clientName) return { success: false, error: 'El nombre del cliente es obligatorio' };
        if (!items || items.length === 0) return { success: false, error: 'Debe agregar al menos un producto' };
        if (!patron || !patron.fechaInicio || !patron.fechaFin) return { success: false, error: 'El patrón de fechas es obligatorio' };

        const fechasGeneradas = generarFechasPorPatron(patron);
        if (fechasGeneradas.length === 0) return { success: false, error: 'El patrón no genera ninguna fecha válida' };

        const excluidasSet = new Set(fechasExcluidas || []);
        const fechasFinales = fechasGeneradas.filter(f => !excluidasSet.has(f));
        if (fechasFinales.length === 0) return { success: false, error: 'No hay fechas seleccionadas para crear' };

        const duplicados = verificarPedidosDuplicados(clientName, fechasFinales);
        const totalPorPedido = items.reduce((sum, item) => sum + (item.quantity * (item.unit_price || 0)), 0);
        const horaEntrega = calcularHoraPorSesion(sesion);

        const creados = [];
        const omitidos = [];
        const errores = [];

        for (const fecha of fechasFinales) {
            if (duplicados[fecha]) {
                omitidos.push({ fecha, razon: 'duplicado', pedidoId: duplicados[fecha] });
                continue;
            }

            try {
                const deliveryDate = `${fecha}T${horaEntrega}:00`;
                const orderUuid = window.DBModule.generateUuidForTable('orders');

                const result = window.DBModule.execute(`
                    INSERT INTO orders (user_id, negocio_id, client_name, client_phone,
                        delivery_date, status, priority, total, notes, session, uuid)
                    VALUES (?, ?, ?, ?, ?, 'pending', 'normal', ?, ?, ?, ?)
                `, [
                    user.id, negocioId, clientName, clientPhone || null,
                    deliveryDate, totalPorPedido, notes || null, sesion || null, orderUuid
                ]);

                const newOrderId = result.lastId;
                if (!newOrderId) { errores.push({ fecha, error: 'No se pudo obtener ID' }); continue; }

                for (const item of items) {
                    const itemUuid = window.DBModule.generateUuidForTable('order_items');
                    
                    window.DBModule.execute(`
                        INSERT INTO order_items (order_id, product_name, producto_id, receta_id, 
                            quantity, unit_price, subtotal, notes, uuid)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        newOrderId, item.product_name || 'Producto',
                        item.producto_id || null, item.receta_id || null,
                        item.quantity || 1, item.unit_price || 0,
                        (item.quantity || 1) * (item.unit_price || 0), null, itemUuid
                    ]);
                }

                creados.push({ fecha, orderId: newOrderId });
            } catch (e) {
                errores.push({ fecha, error: e.message });
            }
        }

        window.DBModule.saveAndNotify();

        if (window.NotificationsModule) {
            if (creados.length > 0) {
                window.NotificationsModule.addNotification(
                    `📅 ${creados.length} pedido${creados.length > 1 ? 's' : ''} creado${creados.length > 1 ? 's' : ''} por período`,
                    'success', 5000
                );
            }
            if (omitidos.length > 0) {
                window.NotificationsModule.addNotification(
                    `⚠️ ${omitidos.length} fecha${omitidos.length > 1 ? 's' : ''} omitida${omitidos.length > 1 ? 's' : ''} por duplicados`,
                    'warning', 5000
                );
            }
        }

        return {
            success: true, creados, omitidos, errores,
            totalCreados: creados.length,
            totalOmitidos: omitidos.length,
            totalErrores: errores.length,
            totalPorPedido,
            montoTotal: totalPorPedido * creados.length
        };

    } catch (e) {
        console.error('❌ Error creando pedidos múltiples:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// REGISTRAR VENTA DESDE PEDIDO
// ============================================================

async function registrarVentaDesdePedido(orderId, cantidadOverride = null) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return { success: false, error: 'No hay negocio activo' };

    const permisos = puedeUsuarioActualProcesarPedido(orderId);
    if (!permisos.puede) {
        console.warn('🔒 [registrarVentaDesdePedido] Bloqueado:', permisos.razon);
        return { success: false, error: '🔒 ' + permisos.razon };
    }

    try {
        const order = await getOrder(orderId);
        if (!order) return { success: false, error: 'Pedido no encontrado' };

        const ventaExistente = window.DBModule.query(
            'SELECT id FROM sales WHERE order_id = ? AND deleted_at IS NULL', [orderId]
        );

        if (ventaExistente.length > 0 && !cantidadOverride) {
            console.log('ℹ️ Venta ya registrada para pedido #' + orderId);
            return { success: true, message: 'Venta ya registrada', ventas: ventaExistente.length, alreadyExists: true };
        }

        if (!order.items || order.items.length === 0) {
            return { success: false, error: 'El pedido no tiene productos' };
        }

        const waitingItem = window.DBModule.query(`
            SELECT id FROM waiting_list 
            WHERE order_id = ? AND deleted_at IS NULL AND status IN ('attended', 'waiting')
        `, [orderId]);
        const fromWaitingList = waitingItem.length > 0 ? 1 : 0;

        let saleDate;
        const ahora = new Date();
        const createdDate = new Date(order.created_at);
        const horasDesdeCreacion = (ahora - createdDate) / (1000 * 60 * 60);

        if (fromWaitingList || horasDesdeCreacion < 24) {
            saleDate = ahora.toISOString();
        } else {
            saleDate = order.delivery_date || ahora.toISOString();
        }

        const notaListaEspera = fromWaitingList
            ? `Compró por lista de espera el día ${ahora.toLocaleDateString('es-ES')}`
            : null;

        let ventasRegistradas = 0;
        let totalVenta = 0;

        for (const item of order.items) {
            const productoId = item.producto_id || null;
            const recetaId = item.receta_id || null;
            const productName = item.producto_nombre || item.product_name || 'Producto';
            const quantity = cantidadOverride !== null ? Math.min(cantidadOverride, item.quantity) : item.quantity;
            const unitPrice = item.unit_price || 0;
            const total = quantity * unitPrice;

            let paymentMethod = 'cash';
            if (order.has_advance_payment && order.advance_amount > 0) {
                paymentMethod = order.advance_payment_method || 'cash';
            }

            const totalPaid = order.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
            
            let isDebt = 0;
            if (!order.has_advance_payment && totalPaid < order.total) {
                isDebt = 1;
            }
            
            const productNameConNota = notaListaEspera ? `${productName} (${notaListaEspera})` : productName;
            const saleUuid = window.DBModule.generateUuidForTable('sales');

            const result = window.DBModule.execute(`
                INSERT INTO sales (
                    user_id, negocio_id, product_name, producto_id, receta_id, 
                    quantity, unit_price, total, payment_method, 
                    buyer, is_debt, paid, sale_date, 
                    order_id, voided, from_waiting_list, uuid
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            `, [
                user.id, negocioId, productNameConNota, productoId, recetaId,
                quantity, unitPrice, total, paymentMethod,
                order.client_name, isDebt, isDebt ? 0 : 1,
                saleDate, orderId, fromWaitingList, saleUuid
            ]);

            if (result.success) {
                ventasRegistradas++;
                totalVenta += total;

                const txExistente = window.DBModule.query(`
                    SELECT id FROM transactions 
                    WHERE sale_id = ? AND user_id = ? 
                      AND deleted_at IS NULL AND voided = 0
                `, [result.lastId, user.id]);

                if (txExistente.length === 0) {
                    const concept = fromWaitingList
                        ? `Venta desde lista de espera #${orderId}: ${productName}`
                        : `Venta desde pedido #${orderId}: ${productName}`;
                    const txUuid = window.DBModule.generateUuidForTable('transactions');

                    window.DBModule.execute(`
                        INSERT INTO transactions (
                            user_id, negocio_id, type, category, concept, amount, 
                            payment_method, sale_id, transaction_date, voided, uuid
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
                    `, [user.id, negocioId, 'income', 'venta', concept, total, paymentMethod, result.lastId, saleDate, txUuid]);
                }
            }
        }

        window.DBModule.saveDatabase();

        const mensaje = fromWaitingList
            ? `🔄 Venta de $${totalVenta.toFixed(2)} registrada desde lista de espera (pedido #${orderId})`
            : `💰 Venta de $${totalVenta.toFixed(2)} registrada desde pedido #${orderId}`;

        if (ventasRegistradas > 0 && window.NotificationsModule) {
            window.NotificationsModule.addNotification(mensaje, 'success', 4000);
        }

        return { success: true, ventas: ventasRegistradas, total: totalVenta, fromWaitingList, saleDate };

    } catch (e) {
        console.error('❌ Error registrando venta desde pedido:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// PROCESAR LISTA DE ESPERA AL CANCELAR
// ============================================================

async function procesarListaEsperaAlCancelar(orderId, seleccionados = []) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    try {
        let procesados = 0;
        let totalProcesado = 0;

        for (const sel of seleccionados) {
            try {
                const waitingOrderId = sel.order_id;
                const cantidadAtender = sel.cantidadAtender || 0;
                if (cantidadAtender <= 0) continue;

                const permisos = puedeUsuarioActualProcesarPedido(waitingOrderId);
                if (!permisos.puede) {
                    console.warn(`🔒 Pedido #${waitingOrderId} bloqueado por permisos:`, permisos.razon);
                    continue;
                }

                const waitingOrder = await getOrder(waitingOrderId);
                if (!waitingOrder) continue;

                const cantidadTotal = waitingOrder.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

                if (cantidadAtender >= cantidadTotal) {
                    await registrarVentaDesdePedido(waitingOrderId);
                    await window.DBModule.attendFromWaitingList(waitingOrderId);
                    procesados++;
                    totalProcesado += cantidadAtender;
                } else {
                    await registrarVentaDesdePedido(waitingOrderId, cantidadAtender);
                    await window.DBModule.atenderParcialmenteDeLista(waitingOrderId, cantidadAtender, cantidadTotal);
                    procesados++;
                    totalProcesado += cantidadAtender;
                }
            } catch (e) {
                console.warn(`⚠️ Error procesando pedido #${sel.order_id}:`, e);
            }
        }

        window.DBModule.saveDatabase();

        if (procesados > 0 && window.NotificationsModule) {
            window.NotificationsModule.addNotification(
                `✅ ${procesados} pedido${procesados > 1 ? 's' : ''} de lista de espera procesado${procesados > 1 ? 's' : ''}`,
                'success', 4000
            );
        }

        return { success: true, procesados, totalProcesado };
    } catch (e) {
        console.error('❌ Error procesando lista de espera:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// AUTO-CANCELAR PEDIDOS VENCIDOS
// ============================================================

async function autoCancelarPedidosVencidos() {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return { success: false, error: 'No hay negocio activo' };

    try {
        const ahora = new Date();
        const hace48h = new Date(ahora.getTime() - (48 * 60 * 60 * 1000));

        const pedidosVencidos = window.DBModule.query(`
            SELECT id, client_name, status FROM orders
            WHERE negocio_id = ? AND deleted_at IS NULL
              AND status IN ('pending', 'confirmed')
              AND created_at < ?
        `, [negocioId, hace48h.toISOString()]);

        if (pedidosVencidos.length === 0) return { success: true, cancelados: 0 };

        let cancelados = 0;
        for (const pedido of pedidosVencidos) {
            try {
                if (pedido.status === 'confirmed') await reponerStockPedido(pedido.id);

                window.DBModule.execute(`
                    UPDATE orders 
                    SET status = 'cancelled', 
                        notes = COALESCE(notes || ' | ', '') || 'Cancelado automáticamente por vencimiento (>48h)',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [pedido.id]);

                await window.DBModule.removeFromWaitingList(pedido.id);
                cancelados++;
            } catch (e) {}
        }

        window.DBModule.saveDatabase();

        if (cancelados > 0 && window.NotificationsModule) {
            window.NotificationsModule.addNotification(
                `🕐 ${cancelados} pedido${cancelados > 1 ? 's' : ''} cancelado${cancelados > 1 ? 's' : ''} por vencimiento`,
                'warning', 6000
            );
        }

        return { success: true, cancelados };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================================
// CANCELAR DEUDA
// ============================================================

async function cancelarDeudaPedido(orderId) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    try {
        const order = await getOrder(orderId);
        if (!order) return { success: false, error: 'Pedido no encontrado' };

        const totalPaid = order.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const remaining = order.total - totalPaid;

        if (remaining <= 0) return { success: true, message: 'No hay deuda pendiente' };

        window.DBModule.execute(`
            INSERT INTO payments (order_id, amount, payment_method, status, notes)
            VALUES (?, ?, ?, ?, ?)
        `, [orderId, remaining, 'cash', 'paid', 'Cancelación de deuda por entrega de pedido']);

        if (window.NotificationsModule) {
            window.NotificationsModule.addNotification(
                `💰 Deuda de $${remaining.toFixed(2)} cancelada para pedido #${orderId}`,
                'success', 4000
            );
        }

        return { success: true, amount: remaining };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================================
// DESCONTAR / REPONER STOCK
// ============================================================

async function descontarStockPedido(orderId) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    try {
        const order = await getOrder(orderId);
        if (!order) return { success: false, error: 'Pedido no encontrado' };

        let errores = [];
        for (const item of order.items) {
            if (item.receta_id) {
                try {
                    const result = await window.RecipesModule.descontarStockReceta(
                        item.receta_id, item.quantity,
                        `Pedido #${orderId}: ${item.producto_nombre || item.product_name}`
                    );
                    if (!result.success) errores.push(`${item.producto_nombre}: ${result.error}`);
                } catch (e) {
                    errores.push(`${item.producto_nombre}: ${e.message}`);
                }
            }
        }

        if (errores.length > 0) return { success: false, error: errores.join('; ') };
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function reponerStockPedido(orderId) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    try {
        const order = await getOrder(orderId);
        if (!order) return { success: false, error: 'Pedido no encontrado' };

        for (const item of order.items) {
            if (item.receta_id) {
                try {
                    await window.RecipesModule.descontarStockReceta(
                        item.receta_id, -item.quantity,
                        `Reposición por cancelación de pedido #${orderId}`
                    );
                } catch (e) {}
            }
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================================
// CAMBIAR ESTADO DEL PEDIDO
// ============================================================

async function updateOrderStatus(orderId, status) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return { success: false, error: 'No hay negocio activo' };

    const permisos = puedeUsuarioActualProcesarPedido(orderId);
    if (!permisos.puede) {
        console.warn('🔒 [updateOrderStatus] Bloqueado:', permisos.razon);
        return { success: false, error: '🔒 ' + permisos.razon };
    }

    try {
        const order = await getOrder(orderId);
        if (!order) return { success: false, error: 'Pedido no encontrado' };

        const oldStatus = order.status;
        const validStatuses = ['pending', 'confirmed', 'production', 'ready', 'delivered', 'cancelled', 'waiting', 'waiting_bought'];

        if (!validStatuses.includes(status)) return { success: false, error: 'Estado no válido: ' + status };
        if (oldStatus === status) return { success: true, message: 'El estado ya es ' + status };

        let stockWarning = null;

        if ((status === 'confirmed' || status === 'production') && 
            (oldStatus !== 'confirmed' && oldStatus !== 'production')) {
            const stockResult = await descontarStockPedido(orderId);
            if (!stockResult.success) {
                return { success: false, error: 'Error al descontar stock: ' + stockResult.error };
            }
        }

        if (status === 'cancelled' && oldStatus !== 'cancelled') {
            try { await reponerStockPedido(orderId); } catch (e) {}
            if (oldStatus === 'waiting' || oldStatus === 'waiting_bought') {
                await window.DBModule.removeFromWaitingList(orderId);
            }
        }

        if (status === 'delivered' && oldStatus !== 'delivered') {
            if (oldStatus === 'pending' || oldStatus === 'confirmed' || oldStatus === 'production' || oldStatus === 'ready') {
                try {
                    const stockResult = await descontarStockPedido(orderId);
                    if (!stockResult.success) {
                        stockWarning = stockResult.error;
                    }
                } catch (e) {
                    stockWarning = e.message;
                }
            }
            
            try {
                const ventaResult = await registrarVentaDesdePedido(orderId);
                if (!ventaResult.success) {
                    return { success: false, error: 'Error al registrar la venta: ' + ventaResult.error };
                }
            } catch (e) {
                return { success: false, error: 'Error al registrar la venta: ' + e.message };
            }
            
            try { await cancelarDeudaPedido(orderId); } catch (e) {}
        }

        if (status === 'waiting' && oldStatus !== 'waiting') {
            const waitingResult = await window.DBModule.addToWaitingList(orderId);
            if (waitingResult.success) {
                window.NotificationsModule?.addNotification(
                    `⏰ Pedido #${orderId} añadido a lista de espera (posición ${waitingResult.position})`,
                    'info', 4000
                );
            }
        }

        if (status === 'waiting_bought' && oldStatus !== 'waiting_bought') {
            const attendResult = await window.DBModule.attendFromWaitingList(orderId);
            if (!attendResult.success) return { success: false, error: attendResult.error };
        }

        const result = window.DBModule.execute(`
            UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ? AND negocio_id = ?
        `, [status, orderId, negocioId]);

        if (!result.success) return { success: false, error: result.error || 'Error al actualizar estado' };

        _permisosPedidosCache.delete(orderId);

        window.DBModule.saveAndNotify();

        if (window.NotificationsModule) {
            window.NotificationsModule.addNotification(
                `📋 Pedido #${orderId} actualizado a: ${status}`, 'info', 3000
            );
        }
        
        const response = { success: true };
        if (stockWarning) response.stockWarning = stockWarning;
        return response;
        
    } catch (e) {
        console.error('❌ [updateOrderStatus] Error crítico:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// PAGOS Y DEUDAS
// ============================================================

async function registerPayment(paymentData) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    try {
        const result = window.DBModule.execute(`
            INSERT INTO payments (order_id, amount, payment_method, status, notes)
            VALUES (?, ?, ?, ?, ?)
        `, [
            paymentData.order_id, paymentData.amount,
            paymentData.payment_method || 'cash',
            paymentData.status || 'paid',
            paymentData.notes || null
        ]);

        window.DBModule.saveAndNotify();
        return { success: true, id: result.lastId };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getDebts() {
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return [];

    try {
        const debts = window.DBModule.query(`
            SELECT id, product_name, total, buyer, sale_date, payment_method,
                quantity, is_debt, paid, sale_date as delivery_date, 'venta' as type
            FROM sales 
            WHERE negocio_id = ? AND is_debt = 1 AND paid = 0 
              AND deleted_at IS NULL AND voided = 0
            ORDER BY sale_date ASC, id ASC
        `, [negocioId]);

        return debts.map(d => ({
            ...d,
            remaining: d.total,
            client_name: d.buyer || 'Cliente sin nombre'
        }));
    } catch (e) {
        console.error('Error obteniendo deudas:', e);
        return [];
    }
}

// ============================================================
// WAITING LIST - WRAPPERS
// ============================================================

async function getWaitingList() {
    try { return window.DBModule.getWaitingList(); } catch (e) { return []; }
}

async function getWaitingListCount() {
    try { return window.DBModule.getWaitingListCount(); } catch (e) { return 0; }
}

async function getWaitingListWithDetails(excludeOrderId = null) {
    try {
        const lista = window.DBModule.getWaitingListWithDetails(excludeOrderId);
        
        const user = window.AuthModule?.getCurrentUser();
        if (!user || user.is_admin === 1) {
            return lista;
        }
        
        const listaFiltrada = lista.filter(item => {
            const permisos = puedeUsuarioActualProcesarPedido(item.order_id);
            return permisos.puede;
        });
        
        if (listaFiltrada.length < lista.length) {
            console.log(`🔒 [getWaitingListWithDetails] ${lista.length - listaFiltrada.length} pedido(s) filtrado(s) por permisos`);
        }
        
        return listaFiltrada;
    } catch (e) {
        console.warn('Error obteniendo lista de espera:', e);
        return [];
    }
}

async function addToWaitingList(orderId) {
    try { return window.DBModule.addToWaitingList(orderId); } catch (e) { return { success: false, error: e.message }; }
}

async function removeFromWaitingList(orderId) {
    try { return window.DBModule.removeFromWaitingList(orderId); } catch (e) { return { success: false, error: e.message }; }
}

async function attendFromWaitingList(orderId) {
    try { return window.DBModule.attendFromWaitingList(orderId); } catch (e) { return { success: false, error: e.message }; }
}

// ============================================================
// GESTIÓN AVANZADA DE LISTA DE ESPERA
// ============================================================

async function limpiarListaEspera() {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return { success: false, error: 'No hay negocio activo' };

    console.log('🧹 [limpiarListaEspera] Iniciando...');

    try {
        const items = window.DBModule.query(`
            SELECT id, order_id, position, client_name
            FROM waiting_list 
            WHERE negocio_id = ? AND deleted_at IS NULL AND status = 'waiting'
            ORDER BY position ASC
        `, [negocioId]);

        console.log(`🧹 [limpiarListaEspera] ${items.length} items a limpiar`);

        let eliminados = 0;
        let cancelados = 0;
        let bloqueados = 0;

        for (const item of items) {
            try {
                const permisos = puedeUsuarioActualProcesarPedido(item.order_id);
                if (!permisos.puede) {
                    bloqueados++;
                    console.log(`🔒 Pedido #${item.order_id} bloqueado, se omite de la limpieza`);
                    continue;
                }
                
                window.DBModule.execute(`
                    UPDATE waiting_list 
                    SET deleted_at = CURRENT_TIMESTAMP, status = 'removed'
                    WHERE id = ?
                `, [item.id]);
                eliminados++;

                const orderCheck = window.DBModule.query(
                    'SELECT id, status FROM orders WHERE id = ? AND negocio_id = ?',
                    [item.order_id, negocioId]
                );

                if (orderCheck.length > 0) {
                    const order = orderCheck[0];
                    if (order.status !== 'cancelled' && order.status !== 'delivered' && order.status !== 'waiting_bought') {
                        window.DBModule.execute(`
                            UPDATE orders 
                            SET status = 'cancelled',
                                notes = COALESCE(notes || ' | ', '') || 'Cancelado por limpieza de lista de espera',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        `, [item.order_id]);
                        cancelados++;
                    }
                }
            } catch (e) {
                console.warn(`⚠️ [limpiarListaEspera] Error procesando item #${item.id}:`, e.message);
            }
        }

        try { window.DBModule.reindexWaitingList(); } catch (e) {}

        window.DBModule.saveAndNotify();

        if (window.NotificationsModule) {
            let msg = `🧹 Lista de espera limpiada: ${eliminados} items eliminados, ${cancelados} pedidos cancelados`;
            if (bloqueados > 0) msg += `, ${bloqueados} omitidos por permisos`;
            window.NotificationsModule.addNotification(msg, 'success', 5000);
        }

        console.log(`✅ [limpiarListaEspera] Completado: ${eliminados} eliminados, ${cancelados} cancelados, ${bloqueados} bloqueados`);

        return { success: true, eliminados, cancelados, bloqueados };
    } catch (e) {
        console.error('❌ [limpiarListaEspera] Error:', e);
        return { success: false, error: e.message };
    }
}

async function eliminarDeListaEspera(orderId) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return { success: false, error: 'No hay negocio activo' };

    const permisos = puedeUsuarioActualProcesarPedido(orderId);
    if (!permisos.puede) {
        return { success: false, error: '🔒 ' + permisos.razon };
    }

    try {
        const item = window.DBModule.query(`
            SELECT * FROM waiting_list 
            WHERE order_id = ? AND negocio_id = ? AND deleted_at IS NULL AND status = 'waiting'
        `, [orderId, negocioId]);

        if (item.length === 0) {
            return { success: false, error: 'El pedido no está en la lista de espera' };
        }

        window.DBModule.execute(`
            UPDATE waiting_list 
            SET deleted_at = CURRENT_TIMESTAMP, status = 'removed'
            WHERE order_id = ? AND negocio_id = ?
        `, [orderId, negocioId]);

        window.DBModule.execute(`
            UPDATE orders 
            SET status = 'cancelled',
                notes = COALESCE(notes || ' | ', '') || 'Cancelado al eliminar de lista de espera',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND negocio_id = ?
        `, [orderId, negocioId]);

        window.DBModule.reindexWaitingList();
        window.DBModule.saveAndNotify();

        _permisosPedidosCache.delete(orderId);

        if (window.NotificationsModule) {
            window.NotificationsModule.addNotification(
                `✅ Cliente eliminado de la lista de espera`,
                'success', 3000
            );
        }

        return { success: true, message: 'Cliente eliminado de la lista' };
    } catch (e) {
        console.error('❌ [eliminarDeListaEspera] Error:', e);
        return { success: false, error: e.message };
    }
}

async function procesarClienteDeLista(orderId, cantidad = null) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return { success: false, error: 'No hay negocio activo' };

    const permisos = puedeUsuarioActualProcesarPedido(orderId);
    if (!permisos.puede) {
        return { success: false, error: '🔒 ' + permisos.razon };
    }

    console.log(`✅ [procesarClienteDeLista] Procesando pedido #${orderId}, cantidad: ${cantidad || 'toda'}`);

    try {
        const item = window.DBModule.query(`
            SELECT * FROM waiting_list 
            WHERE order_id = ? AND negocio_id = ? AND deleted_at IS NULL AND status = 'waiting'
        `, [orderId, negocioId]);

        if (item.length === 0) {
            return { success: false, error: 'El pedido no está en la lista de espera' };
        }

        const order = await getOrder(orderId);
        if (!order) return { success: false, error: 'Pedido no encontrado' };

        const cantidadTotal = order.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
        const cantidadAtender = cantidad !== null ? Math.min(cantidad, cantidadTotal) : cantidadTotal;

        let ventaResult;
        if (cantidadAtender >= cantidadTotal) {
            ventaResult = await registrarVentaDesdePedido(orderId);
        } else {
            ventaResult = await registrarVentaDesdePedido(orderId, cantidadAtender);
        }

        if (!ventaResult.success) {
            return { success: false, error: 'Error al registrar la venta: ' + ventaResult.error };
        }

        if (cantidadAtender >= cantidadTotal) {
            window.DBModule.execute(`
                UPDATE waiting_list 
                SET status = 'attended', attended_at = CURRENT_TIMESTAMP, deleted_at = CURRENT_TIMESTAMP
                WHERE order_id = ? AND negocio_id = ?
            `, [orderId, negocioId]);

            window.DBModule.execute(`
                UPDATE orders 
                SET status = 'waiting_bought', updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND negocio_id = ?
            `, [orderId, negocioId]);
        } else {
            try {
                await window.DBModule.atenderParcialmenteDeLista(orderId, cantidadAtender, cantidadTotal);
            } catch (e) {
                console.warn('⚠️ Error en atención parcial:', e);
            }
        }

        window.DBModule.reindexWaitingList();
        window.DBModule.saveAndNotify();

        _permisosPedidosCache.delete(orderId);

        if (window.NotificationsModule) {
            window.NotificationsModule.addNotification(
                `✅ Cliente atendido: ${ventaResult.ventas} venta(s) por $${(ventaResult.total || 0).toFixed(2)}`,
                'success', 4000
            );
        }

        console.log(`✅ [procesarClienteDeLista] Completado: ${ventaResult.ventas} ventas, $${ventaResult.total}`);

        return {
            success: true,
            ventas: ventaResult.ventas,
            total: ventaResult.total,
            cantidadAtendida: cantidadAtender,
            cantidadTotal,
            completo: cantidadAtender >= cantidadTotal
        };
    } catch (e) {
        console.error('❌ [procesarClienteDeLista] Error:', e);
        return { success: false, error: e.message };
    }
}

async function cancelarPedidoDesdeLista(orderId, causa = '', nota = '') {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return { success: false, error: 'No hay negocio activo' };

    const permisos = puedeUsuarioActualProcesarPedido(orderId);
    if (!permisos.puede) {
        return { success: false, error: '🔒 ' + permisos.razon };
    }

    try {
        const order = await getOrder(orderId);
        if (!order) return { success: false, error: 'Pedido no encontrado' };

        if (order.status === 'confirmed' || order.status === 'production') {
            try { await reponerStockPedido(orderId); } catch (e) {
                console.warn('⚠️ Error reponiendo stock:', e);
            }
        }

        window.DBModule.execute(`
            UPDATE waiting_list 
            SET deleted_at = CURRENT_TIMESTAMP, status = 'removed'
            WHERE order_id = ? AND negocio_id = ?
        `, [orderId, negocioId]);

        const notaCancelacion = [];
        if (causa) notaCancelacion.push(causa);
        if (nota) notaCancelacion.push(nota);
        const notaFinal = notaCancelacion.join(' | ') || 'Cancelado desde lista de espera';

        window.DBModule.execute(`
            UPDATE orders 
            SET status = 'cancelled',
                notes = COALESCE(notes || ' | ', '') || ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND negocio_id = ?
        `, [notaFinal, orderId, negocioId]);

        window.DBModule.reindexWaitingList();
        window.DBModule.saveAndNotify();

        _permisosPedidosCache.delete(orderId);

        if (window.NotificationsModule) {
            window.NotificationsModule.addNotification(
                `❌ Pedido #${orderId} cancelado desde lista de espera`,
                'info', 3000
            );
        }

        return { success: true };
    } catch (e) {
        console.error('❌ [cancelarPedidoDesdeLista] Error:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// CANCELACIÓN GLOBAL DE PEDIDOS POR RANGO
// ============================================================

async function cancelarPedidosGlobalmente(fechaDesde, fechaHasta, causa = '', nota = '') {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    if (user.is_admin !== 1) return { success: false, error: 'Solo el administrador puede cancelar pedidos globalmente' };
    
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return { success: false, error: 'No hay negocio activo' };

    if (!fechaDesde || !fechaHasta) {
        return { success: false, error: 'Debes especificar fecha desde y hasta' };
    }
    if (fechaDesde > fechaHasta) {
        return { success: false, error: 'La fecha "desde" debe ser anterior a "hasta"' };
    }

    console.log(`🚨 [cancelarPedidosGlobalmente] Rango: ${fechaDesde} → ${fechaHasta}`);

    try {
        const pedidos = window.DBModule.query(`
            SELECT id, client_name, status, delivery_date
            FROM orders 
            WHERE negocio_id = ? 
              AND deleted_at IS NULL
              AND status IN ('pending', 'confirmed', 'production', 'ready')
              AND DATE(delivery_date) >= DATE(?)
              AND DATE(delivery_date) <= DATE(?)
            ORDER BY delivery_date ASC, id ASC
        `, [negocioId, fechaDesde, fechaHasta]);

        console.log(`🚨 [cancelarPedidosGlobalmente] ${pedidos.length} pedidos a cancelar`);

        const notaFinal = [causa, nota].filter(x => x).join(' | ') || 'Cancelación global';

        let cancelados = 0;
        const errores = [];

        for (const pedido of pedidos) {
            try {
                if (pedido.status === 'confirmed' || pedido.status === 'production') {
                    try { await reponerStockPedido(pedido.id); } catch (e) {
                        console.warn(`⚠️ Error reponiendo stock pedido #${pedido.id}:`, e.message);
                    }
                }

                try { await window.DBModule.removeFromWaitingList(pedido.id); } catch (e) {}

                window.DBModule.execute(`
                    UPDATE orders 
                    SET status = 'cancelled',
                        notes = COALESCE(notes || ' | ', '') || ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [`🚨 CANCELACIÓN GLOBAL: ${notaFinal}`, pedido.id]);

                _permisosPedidosCache.delete(pedido.id);
                cancelados++;
            } catch (e) {
                errores.push(`Pedido #${pedido.id}: ${e.message}`);
            }
        }

        const itemsRestantes = window.DBModule.query(`
            SELECT w.id, w.order_id, w.position, o.delivery_date
            FROM waiting_list w
            JOIN orders o ON w.order_id = o.id
            WHERE w.negocio_id = ? 
              AND w.deleted_at IS NULL 
              AND w.status = 'waiting'
              AND o.deleted_at IS NULL
            ORDER BY w.position ASC
        `, [negocioId]);

        const itemsPreservar = itemsRestantes.filter(item => {
            const fechaEntrega = (item.delivery_date || '').split('T')[0];
            return fechaEntrega > fechaHasta;
        });

        const itemsEliminar = itemsRestantes.filter(item => {
            const fechaEntrega = (item.delivery_date || '').split('T')[0];
            return fechaEntrega <= fechaHasta;
        });

        for (const item of itemsEliminar) {
            try {
                window.DBModule.execute(`
                    UPDATE waiting_list 
                    SET deleted_at = CURRENT_TIMESTAMP, status = 'removed'
                    WHERE id = ?
                `, [item.id]);
            } catch (e) {}
        }

        window.DBModule.reindexWaitingList();
        window.DBModule.saveAndNotify();

        if (window.NotificationsModule) {
            window.NotificationsModule.addNotification(
                `🚨 Cancelación global: ${cancelados} pedidos cancelados`,
                'warning', 6000
            );
        }

        return {
            success: true,
            cancelados,
            reiniciados: itemsEliminar.length,
            preservados: itemsPreservar.length,
            errores: errores.length > 0 ? errores : null,
            notaFinal
        };
    } catch (e) {
        console.error('❌ [cancelarPedidosGlobalmente] Error:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// REPROGRAMAR PEDIDOS POR RANGO
// ============================================================

async function reprogramarPedidosPorRango(fechaDesde, fechaHasta, fechaDestino, causa = '', nota = '', clienteFiltro = '') {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    if (user.is_admin !== 1) return { success: false, error: 'Solo el administrador puede reprogramar pedidos' };
    
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return { success: false, error: 'No hay negocio activo' };

    if (!fechaDesde || !fechaHasta || !fechaDestino) {
        return { success: false, error: 'Debes especificar fecha desde, hasta y destino' };
    }
    if (fechaDesde > fechaHasta) {
        return { success: false, error: 'La fecha "desde" debe ser anterior a "hasta"' };
    }
    if (fechaDestino >= fechaDesde && fechaDestino <= fechaHasta) {
        return { success: false, error: 'La fecha destino no puede estar dentro del rango origen' };
    }

    console.log(`🔄 [reprogramarPedidosPorRango] Rango: ${fechaDesde} → ${fechaHasta} ⇒ ${fechaDestino}`);

    try {
        let sql = `
            SELECT id, client_name, status, delivery_date, total
            FROM orders 
            WHERE negocio_id = ? 
              AND deleted_at IS NULL
              AND status IN ('pending', 'confirmed', 'production', 'ready')
              AND DATE(delivery_date) >= DATE(?)
              AND DATE(delivery_date) <= DATE(?)
        `;
        let params = [negocioId, fechaDesde, fechaHasta];

        if (clienteFiltro && clienteFiltro.trim()) {
            sql += ' AND LOWER(client_name) LIKE LOWER(?)';
            params.push('%' + clienteFiltro.trim() + '%');
        }

        sql += ' ORDER BY delivery_date ASC, id ASC';

        const pedidos = window.DBModule.query(sql, params);

        if (pedidos.length === 0) {
            console.log('ℹ️ [reprogramarPedidosPorRango] No hay pedidos para reprogramar');
            return { 
                success: true, 
                reprogramados: 0, 
                errores: null,
                mensaje: 'No hay pedidos en el rango especificado'
            };
        }

        console.log(`🔄 [reprogramarPedidosPorRango] ${pedidos.length} pedidos a reprogramar`);

        const notaReprogramacion = [];
        if (causa) notaReprogramacion.push(`🔄 ${causa}`);
        if (nota) notaReprogramacion.push(nota);
        const notaFinal = notaReprogramacion.length > 0 
            ? `Reprogramado: ${notaReprogramacion.join(' | ')}`
            : 'Reprogramado';

        let reprogramados = 0;
        const errores = [];

        for (const pedido of pedidos) {
            try {
                const horaOriginal = (pedido.delivery_date || 'T10:00:00').split('T')[1] || '10:00:00';
                const nuevaFechaHora = `${fechaDestino}T${horaOriginal}`;

                window.DBModule.execute(`
                    UPDATE orders 
                    SET delivery_date = ?,
                        notes = COALESCE(notes || ' | ', '') || ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND negocio_id = ?
                `, [nuevaFechaHora, notaFinal, pedido.id, negocioId]);

                _permisosPedidosCache.delete(pedido.id);
                reprogramados++;
            } catch (e) {
                console.error(`❌ Error reprogramando pedido #${pedido.id}:`, e);
                errores.push(`Pedido #${pedido.id} (${pedido.client_name}): ${e.message}`);
            }
        }

        window.DBModule.saveAndNotify();

        if (window.NotificationsModule && reprogramados > 0) {
            window.NotificationsModule.addNotification(
                `🔄 ${reprogramados} pedido${reprogramados > 1 ? 's' : ''} reprogramado${reprogramados > 1 ? 's' : ''} al ${fechaDestino}`,
                'success', 5000
            );
        }

        console.log(`✅ [reprogramarPedidosPorRango] Completado: ${reprogramados} reprogramados, ${errores.length} errores`);

        return {
            success: true,
            reprogramados,
            errores: errores.length > 0 ? errores : null,
            fechaDestino,
            notaFinal
        };

    } catch (e) {
        console.error('❌ [reprogramarPedidosPorRango] Error crítico:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// AUTO-ELIMINAR DE LISTA AL COMPRAR
// ============================================================

async function autoEliminarDeListaAlComprar(clientName) {
    if (!clientName || !clientName.trim()) {
        return { success: false, error: 'Nombre de cliente requerido' };
    }

    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return { success: false, error: 'No hay negocio activo' };

    try {
        const items = window.DBModule.query(`
            SELECT w.id, w.order_id, w.client_name, w.status
            FROM waiting_list w
            WHERE w.negocio_id = ?
              AND w.deleted_at IS NULL
              AND w.status = 'waiting'
              AND LOWER(w.client_name) = LOWER(?)
        `, [negocioId, clientName.trim()]);

        if (items.length === 0) {
            return { success: true, eliminados: 0 };
        }

        console.log(`🔄 [autoEliminarDeListaAlComprar] ${items.length} items de "${clientName}" a eliminar`);

        let eliminados = 0;

        for (const item of items) {
            try {
                window.DBModule.execute(`
                    UPDATE waiting_list 
                    SET deleted_at = CURRENT_TIMESTAMP, status = 'removed'
                    WHERE id = ?
                `, [item.id]);

                const orderCheck = window.DBModule.query(
                    'SELECT id, status FROM orders WHERE id = ? AND negocio_id = ?',
                    [item.order_id, negocioId]
                );

                if (orderCheck.length > 0) {
                    const order = orderCheck[0];
                    if (order.status === 'waiting') {
                        window.DBModule.execute(`
                            UPDATE orders 
                            SET status = 'waiting_bought',
                                notes = COALESCE(notes || ' | ', '') || 'Compró directamente (auto-eliminado de lista)',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        `, [item.order_id]);
                    }
                }

                eliminados++;
            } catch (e) {
                console.warn(`⚠️ Error eliminando item #${item.id}:`, e);
            }
        }

        if (eliminados > 0) {
            window.DBModule.reindexWaitingList();
            window.DBModule.saveAndNotify();

            if (window.NotificationsModule) {
                window.NotificationsModule.addNotification(
                    `✅ ${eliminados} entrada${eliminados > 1 ? 'es' : ''} de "${clientName}" eliminada${eliminados > 1 ? 's' : ''} de la lista de espera`,
                    'info', 4000
                );
            }
        }

        return { success: true, eliminados };
    } catch (e) {
        console.error('❌ [autoEliminarDeListaAlComprar] Error:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// EXPORTACIÓN
// ============================================================

window.OrdersModule = {
    getClients, getClient, saveClient,
    getProductos, getProducto,
    getOrders, getOrder, saveOrder,
    updateOrderStatus,
    registerPayment, getDebts,
    descontarStockPedido, reponerStockPedido,
    cancelarDeudaPedido,
    registrarVentaDesdePedido,
    autoCancelarPedidosVencidos,
    procesarListaEsperaAlCancelar,
    crearPedidosMultiples,
    generarFechasPorPatron,
    calcularHoraPorSesion,
    verificarPedidosDuplicados,
    getWaitingList, getWaitingListCount, getWaitingListWithDetails,
    addToWaitingList, removeFromWaitingList, attendFromWaitingList,
    limpiarListaEspera,
    eliminarDeListaEspera,
    procesarClienteDeLista,
    cancelarPedidoDesdeLista,
    cancelarPedidosGlobalmente,
    reprogramarPedidosPorRango,
    autoEliminarDeListaAlComprar,
    // 🆕 v2.1.12: Permisos
    puedeUsuarioActualProcesarPedido,
    puedeUsuarioActualProcesarVenta,
    limpiarCachePermisos,
    // 🆕 v2.1.13: Helpers de días de la semana
    getNombreDiaSemana,
    getDiasExcluidosDelPatron
};

console.log('📦 Orders Module v2.1.13 (ENTREGA C: corrección #4 - excluir días de la semana en rango)');
console.log('   ✅ generarFechasPorPatron() acepta diasExcluidos para modo "rango"');
console.log('   ✅ Nueva función getNombreDiaSemana(diaNumero, corto)');
console.log('   ✅ Nueva función getDiasExcluidosDelPatron(patron)');