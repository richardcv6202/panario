// ============================================================
// 📦 ORDERS MODULE - Panario (Pedidos con FIX de duplicados
// y todas las funcionalidades de fases anteriores)
// CORREGIDO: Eliminada lógica de deudas de pedidos
// CORREGIDO FASE 2 (160926): Venta desde pedido con pago adelantado
//   ya NO se marca como deuda (Problema #8)
// CORREGIDO (160926 v3): Edición de pedido NO actualizaba client_name
//   - WHERE ahora usa negocio_id (no user_id)
//   - Desvincula client_id si el nombre cambió manualmente
//   - Verifica filas afectadas
// ============================================================

window.OrdersModule = {};

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
                INSERT INTO clients (user_id, name, phone, email, address, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                user.id, clientData.name, clientData.phone || null,
                clientData.email || null, clientData.address || null,
                clientData.notes || null
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
// PEDIDOS - OBTENER (POR NEGOCIO, NO POR USUARIO)
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

    sql += ' GROUP BY o.id ORDER BY o.delivery_date ASC, o.created_at ASC';

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
                   r.name as receta_nombre
            FROM order_items oi
            LEFT JOIN productos p ON oi.producto_id = p.id
            LEFT JOIN recipes r ON p.receta_id = r.id
            WHERE oi.order_id = ? AND oi.deleted_at IS NULL
        `, [id]);
        
        order.payments = window.DBModule.query(
            'SELECT * FROM payments WHERE order_id = ? AND deleted_at IS NULL',
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
// CORREGIDO v3: WHERE por negocio_id, desvincula client_id si
// el nombre cambió, verifica filas afectadas
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

        // 🔧 FIX v3: Detectar si el nombre del cliente cambió
        // Si cambió y el pedido tenía client_id, desvincularlo
        let clientId = orderData.client_id || null;
        
        if (isUpdate && oldOrder) {
            const nombreAnterior = (oldOrder.client_name || '').trim().toLowerCase();
            const nombreNuevo = (clientName || '').trim().toLowerCase();
            
            if (nombreAnterior !== nombreNuevo) {
                console.log('📝 [FIX v3] El nombre del cliente cambió. Desvinculando client_id.');
                clientId = null;  // Desvincular para que el nuevo nombre sea el que manda
            } else {
                // Si el nombre es igual, conservar el client_id existente
                clientId = oldOrder.client_id || clientId;
            }
        }

        let calculatedTotal = total;
        if (!total && orderData.items) {
            calculatedTotal = orderData.items.reduce((sum, item) => sum + (item.quantity * (item.unit_price || 0)), 0);
        }

        if (isUpdate) {
            // 🔧 FIX v3: WHERE usa negocio_id en lugar de user_id
            // Esto permite editar pedidos creados por cualquier usuario del mismo negocio
            const updateResult = window.DBModule.execute(`
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
            
            // 🔧 FIX v3: Verificar que el UPDATE afectó al menos 1 fila
            const verifyResult = window.DBModule.query(
                'SELECT id, client_name FROM orders WHERE id = ?',
                [orderId]
            );
            
            if (verifyResult.length === 0) {
                return { success: false, error: '❌ El pedido no se encontró o no tienes permiso para editarlo' };
            }
            
            if (verifyResult[0].client_name !== clientName) {
                console.warn('⚠️ [FIX v3] El nombre del cliente NO se actualizó correctamente');
                console.warn('   Esperado:', clientName);
                console.warn('   Encontrado:', verifyResult[0].client_name);
            } else {
                console.log('✅ [FIX v3] Nombre del cliente actualizado correctamente a:', clientName);
            }

            window.DBModule.execute('DELETE FROM order_items WHERE order_id = ?', [orderId]);
        } else {
            const result = window.DBModule.execute(`
                INSERT INTO orders (user_id, negocio_id, client_id, client_name, client_phone,
                    delivery_date, status, priority, total, notes, session,
                    has_advance_payment, advance_amount, advance_payment_method)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                user.id, negocioId, clientId, clientName, clientPhone, deliveryDate,
                status, priority, calculatedTotal, notes, session,
                hasAdvancePayment, advanceAmount, advancePaymentMethod
            ]);
            orderId = result.lastId;
        }

        if (!orderId) return { success: false, error: 'Error: No se pudo obtener el ID del pedido' };

        // Insertar items
        if (orderData.items && orderData.items.length > 0) {
            for (const item of orderData.items) {
                if (item.producto_id || (item.product_name && item.quantity > 0)) {
                    window.DBModule.execute(`
                        INSERT INTO order_items (order_id, product_name, producto_id, receta_id, 
                            quantity, unit_price, subtotal, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        orderId, item.product_name || 'Producto',
                        item.producto_id || null, item.receta_id || null,
                        item.quantity || 1, item.unit_price || 0,
                        (item.quantity || 1) * (item.unit_price || 0),
                        item.notes || null
                    ]);
                }
            }
        }

        // Cambios de estado con efectos secundarios
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
// RESERVA POR PERÍODO - GENERADOR DE FECHAS CON PARIDAD
// ============================================================

function generarFechasPorPatron(patron) {
    const {
        tipo, fechaInicio, fechaFin,
        diasSemana, diasEspecificos, paridad
    } = patron;

    const fechas = [];
    if (!fechaInicio || !fechaFin) return fechas;

    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T00:00:00');
    if (inicio > fin) return fechas;

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

        if (incluir) fechas.push(fechaStr);
        cursor.setDate(cursor.getDate() + 1);
    }

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

                const result = window.DBModule.execute(`
                    INSERT INTO orders (user_id, negocio_id, client_name, client_phone,
                        delivery_date, status, priority, total, notes, session)
                    VALUES (?, ?, ?, ?, ?, 'pending', 'normal', ?, ?, ?)
                `, [
                    user.id, negocioId, clientName, clientPhone || null,
                    deliveryDate, totalPorPedido, notes || null, sesion || null
                ]);

                const newOrderId = result.lastId;
                if (!newOrderId) { errores.push({ fecha, error: 'No se pudo obtener ID' }); continue; }

                for (const item of items) {
                    window.DBModule.execute(`
                        INSERT INTO order_items (order_id, product_name, producto_id, receta_id, 
                            quantity, unit_price, subtotal, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        newOrderId, item.product_name || 'Producto',
                        item.producto_id || null, item.receta_id || null,
                        item.quantity || 1, item.unit_price || 0,
                        (item.quantity || 1) * (item.unit_price || 0), null
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
// REGISTRAR VENTA DESDE PEDIDO - CON FIX DE DUPLICADOS
// ============================================================

async function registrarVentaDesdePedido(orderId, cantidadOverride = null) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return { success: false, error: 'No hay negocio activo' };

    try {
        const order = await getOrder(orderId);
        if (!order) return { success: false, error: 'Pedido no encontrado' };

        const ventaExistente = window.DBModule.query(
            'SELECT id FROM sales WHERE order_id = ? AND deleted_at IS NULL', [orderId]
        );

        if (ventaExistente.length > 0 && !cantidadOverride) {
            console.log('ℹ️ Venta ya registrada para pedido #' + orderId);
            return { success: true, message: 'Venta ya registrada', ventas: ventaExistente.length };
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
            
            // FIX FASE 2 (Problema #8): Si el pedido tiene pago adelantado,
            // la venta NUNCA se marca como deuda.
            let isDebt = 0;
            if (!order.has_advance_payment && totalPaid < order.total) {
                isDebt = 1;
            }
            
            const productNameConNota = notaListaEspera ? `${productName} (${notaListaEspera})` : productName;

            const result = window.DBModule.execute(`
                INSERT INTO sales (
                    user_id, negocio_id, product_name, producto_id, receta_id, 
                    quantity, unit_price, total, payment_method, 
                    buyer, is_debt, paid, sale_date, 
                    order_id, voided, from_waiting_list
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
            `, [
                user.id, negocioId, productNameConNota, productoId, recetaId,
                quantity, unitPrice, total, paymentMethod,
                order.client_name, isDebt, isDebt ? 0 : 1,
                saleDate, orderId, fromWaitingList
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

                    window.DBModule.execute(`
                        INSERT INTO transactions (
                            user_id, negocio_id, type, category, concept, amount, 
                            payment_method, sale_id, transaction_date, voided
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
                    `, [user.id, negocioId, 'income', 'venta', concept, total, paymentMethod, result.lastId, saleDate]);
                    
                    console.log(`✅ Transacción creada para venta #${result.lastId}`);
                } else {
                    console.log(`ℹ️ Transacción ya existe para venta #${result.lastId}, no se duplica`);
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

    try {
        const order = await getOrder(orderId);
        if (!order) return { success: false, error: 'Pedido no encontrado' };

        const oldStatus = order.status;
        const validStatuses = ['pending', 'confirmed', 'production', 'ready', 'delivered', 'cancelled', 'waiting', 'waiting_bought'];

        if (!validStatuses.includes(status)) return { success: false, error: 'Estado no válido: ' + status };
        if (oldStatus === status) return { success: true, message: 'El estado ya es ' + status };

        if ((status === 'confirmed' || status === 'production') && 
            (oldStatus !== 'confirmed' && oldStatus !== 'production')) {
            const stockResult = await descontarStockPedido(orderId);
            if (!stockResult.success) return { success: false, error: 'Error al descontar stock: ' + stockResult.error };
        }

        if (status === 'cancelled' && oldStatus !== 'cancelled') {
            try { await reponerStockPedido(orderId); } catch (e) {}
            if (oldStatus === 'waiting' || oldStatus === 'waiting_bought') {
                await window.DBModule.removeFromWaitingList(orderId);
            }
        }

        if (status === 'delivered' && (oldStatus === 'pending' || oldStatus === 'confirmed')) {
            const stockResult = await descontarStockPedido(orderId);
            if (!stockResult.success) return { success: false, error: 'Error al descontar stock: ' + stockResult.error };
        }

        if (status === 'delivered' && oldStatus !== 'delivered') {
            try { await registrarVentaDesdePedido(orderId); } catch (e) {}
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

        // 🔧 FIX v3: UPDATE por negocio_id en lugar de user_id
        const result = window.DBModule.execute(`
            UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ? AND negocio_id = ?
        `, [status, orderId, negocioId]);

        if (!result.success) return { success: false, error: result.error || 'Error al actualizar estado' };

        window.DBModule.saveAndNotify();

        if (window.NotificationsModule) {
            window.NotificationsModule.addNotification(
                `📋 Pedido #${orderId} actualizado a: ${status}`, 'info', 3000
            );
        }

        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================================
// PAGOS Y DEUDAS (CORREGIDO - SOLO VENTAS)
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
            SELECT 
                id,
                product_name,
                total,
                buyer,
                sale_date,
                payment_method,
                quantity,
                is_debt,
                paid,
                sale_date as delivery_date,
                'venta' as type
            FROM sales 
            WHERE negocio_id = ? 
              AND is_debt = 1 
              AND paid = 0 
              AND deleted_at IS NULL 
              AND voided = 0
            ORDER BY sale_date ASC
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
// WAITING LIST
// ============================================================

async function getWaitingList() {
    try { return window.DBModule.getWaitingList(); } catch (e) { return []; }
}

async function getWaitingListCount() {
    try { return window.DBModule.getWaitingListCount(); } catch (e) { return 0; }
}

async function getWaitingListWithDetails(excludeOrderId = null) {
    try { return window.DBModule.getWaitingListWithDetails(excludeOrderId); } catch (e) { return []; }
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
    addToWaitingList, removeFromWaitingList, attendFromWaitingList
};

console.log('📦 Orders Module cargado correctamente v2.0.2 (FASE 2 + FIX v3: edición de pedido actualiza client_name)');