// ============================================================
// 📦 SALES MODULE - Panario (Ventas y Finanzas con soporte para
// ventas liberadas, modificación de cliente y FIX de duplicados)
// AÑADIDO FASE 1.3.2 (190926):
//   - saveSale() genera uuid para sales y transactions
//   - registerTransaction() genera uuid para transactions
//   - saveLiberatedSale() hereda uuid desde saveSale()
// 🆕 FIX 2 (190926 v2):
//   - normalizarFechaVenta() helper para evitar fechas YYYY-MM-DD sin hora
//   - saveSale() normaliza saleData.sale_date antes de INSERT/UPDATE
//   - registerTransaction() normaliza transactionData.transaction_date
//   - Defensa en profundidad: aunque la UI ya normaliza, aquí se re-valida
// 🆕 v2.1.12 (210926 v3): CORRECCIÓN #2 - BLOQUEO POR RECETAS NO COMPARTIDAS
//   - ✅ NUEVA función puedeUsuarioActualProcesarVenta() (wrapper local,
//     delega a la de orders.js si existe para consistencia)
//   - ✅ saveSale(): verifica permisos antes de EDITAR (no al crear)
//   - ✅ voidSale(): verifica permisos antes de anular
//   - ✅ unvoidSale(): verifica permisos antes de restaurar
//   - ✅ deleteSale(): verifica permisos antes de eliminar
//   - ✅ updateExpense/voidExpense/unvoidExpense/deleteExpense:
//     los gastos NO tienen receta, así que no se bloquean
//   - ✅ Cuando el usuario NO puede procesar una venta:
//     - saveSale() → devuelve { success: false, error: '🔒 ...' }
//     - voidSale() → devuelve { success: false, error: '🔒 ...' }
//     - unvoidSale() → devuelve { success: false, error: '🔒 ...' }
//     - deleteSale() → devuelve { success: false, error: '🔒 ...' }
//   - ✅ Se limpia la caché de permisos cuando se edita una venta
//   - ✅ saveSale() permite CREAR ventas aunque la receta no esté
//     compartida (para no bloquear la operación de venta en mostrador).
//     Solo se bloquea la EDICIÓN/ANULACIÓN/RESTAURACIÓN/ELIMINACIÓN
//     de ventas existentes que el usuario no puede procesar.
// ============================================================

window.SalesModule = {};

// ============================================================
// 🆕 v2.1.12: WRAPPER LOCAL PARA VERIFICAR PERMISOS DE VENTA
// ============================================================
// Delega a orders.js si está disponible para tener una única
// fuente de verdad. Si no está disponible, hace la verificación
// directamente en sales.js.

function _puedeUsuarioActualProcesarVenta(saleOrId) {
    // 1) Intentar delegar a orders.js
    try {
        if (typeof window.OrdersModule?.puedeUsuarioActualProcesarVenta === 'function') {
            return window.OrdersModule.puedeUsuarioActualProcesarVenta(saleOrId);
        }
    } catch (e) {
        console.warn('⚠️ Error delegando a OrdersModule.puedeUsuarioActualProcesarVenta:', e);
    }
    
    // 2) Fallback: verificación local
    try {
        const user = window.AuthModule?.getCurrentUser();
        if (!user) {
            return { puede: false, razon: 'No hay usuario autenticado', recetaBloqueada: null };
        }
        
        // Admin siempre puede
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
        
        // Cargar la venta si no la tenemos
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
                    return { puede: false, razon: 'Venta no encontrada', recetaBloqueada: null };
                }
                sale = sales[0];
            } catch (e) {
                console.warn('⚠️ Error cargando venta para verificar permisos:', e);
                return { puede: true, razon: '', recetaBloqueada: null };
            }
        }
        
        // Sin receta → no hay bloqueo
        if (!sale.receta_id) {
            return { puede: true, razon: '', recetaBloqueada: null };
        }
        
        // Verificar la receta
        try {
            const recetas = window.DBModule.query(
                `SELECT id, user_id, shared, name 
                 FROM recipes 
                 WHERE id = ? AND deleted_at IS NULL`,
                [sale.receta_id]
            );
            
            if (recetas.length === 0) {
                return {
                    puede: false,
                    razon: `La receta asociada a esta venta fue eliminada. No puedes procesarla.`,
                    recetaBloqueada: { id: sale.receta_id, nombre: 'Receta eliminada', razon: 'Eliminada' }
                };
            }
            
            const receta = recetas[0];
            
            if (receta.user_id !== user.id && receta.shared !== 1) {
                return {
                    puede: false,
                    razon: `Esta venta usa la receta "${receta.name}" que no te han compartido. No puedes procesarla.`,
                    recetaBloqueada: { id: receta.id, nombre: receta.name, razon: 'No compartida' }
                };
            }
            
            return { puede: true, razon: '', recetaBloqueada: null };
            
        } catch (e) {
            console.warn(`⚠️ Error verificando receta ${sale.receta_id}:`, e);
            return { puede: true, razon: '', recetaBloqueada: null };
        }
        
    } catch (e) {
        console.error('❌ Error en _puedeUsuarioActualProcesarVenta:', e);
        return { puede: true, razon: '', recetaBloqueada: null };
    }
}

/**
 * Limpia la caché de permisos de ventas.
 * Llamar cuando se edita una venta para invalidar la caché.
 */
function _limpiarCachePermisosVenta(saleId) {
    try {
        if (saleId && typeof window.OrdersModule?.limpiarCachePermisos === 'function') {
            // Limpiar también la caché de orders (compartida)
            window.OrdersModule.limpiarCachePermisos();
        }
    } catch (e) {
        console.warn('⚠️ Error limpiando caché de permisos:', e);
    }
}

window._puedeUsuarioActualProcesarVenta = _puedeUsuarioActualProcesarVenta;

// ============================================================
// FIX 2: NORMALIZACIÓN DE FECHAS
// ============================================================
// 
// PROBLEMA:
//   new Date("2026-09-17") → 17 sept 00:00 UTC → 16 sept 20:00 local (UTC-4) ❌
//   new Date("2026-09-17T00:00:00") → 17 sept 00:00 LOCAL ✅
//   Pero si SQLite lo interpreta como UTC → 16 sept 20:00 local ❌
//
// SOLUCIÓN:
//   - Si la fecha es HOY → usar hora actual (new Date().toISOString())
//   - Si la fecha es otra → usar mediodía UTC (T12:00:00.000Z)
//   
//   Mediodía UTC siempre cae en el mismo día local en cualquier zona
//   horaria razonable (UTC-12 a UTC+12).
// ============================================================

function normalizarFechaVenta(fechaInput) {
    // Si no hay fecha, usar hora actual
    if (!fechaInput) {
        return new Date().toISOString();
    }
    
    // Si ya viene con hora (ISO completo), respetarla
    if (typeof fechaInput === 'string' && fechaInput.includes('T')) {
        return fechaInput;
    }
    
    // Si viene como YYYY-MM-DD (de <input type="date">)
    const fechaStr = String(fechaInput).trim();
    
    // Validar formato YYYY-MM-DD
    const match = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
        console.warn('⚠️ [normalizarFechaVenta] Formato no reconocido:', fechaInput);
        return new Date().toISOString();
    }
    
    // ¿Es hoy?
    const hoyStr = new Date().toISOString().split('T')[0];
    if (fechaStr === hoyStr) {
        // Hoy → hora actual real (preserva la hora exacta de la venta)
        return new Date().toISOString();
    }
    
    // Otra fecha → mediodía UTC (garantiza el mismo día local)
    return `${fechaStr}T12:00:00.000Z`;
}

// ============================================================
// VENTAS - OBTENER (POR NEGOCIO, NO POR USUARIO)
// ============================================================

async function getSales(filters = {}) {
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return [];

    let sql = `SELECT s.*, p.nombre as producto_nombre, r.name as receta_nombre 
               FROM sales s
               LEFT JOIN productos p ON s.producto_id = p.id
               LEFT JOIN recipes r ON s.receta_id = r.id
               WHERE s.negocio_id = ? AND s.deleted_at IS NULL`;
    let params = [negocioId];

    if (filters.from_date) {
        sql += ' AND DATE(s.sale_date) >= DATE(?)';
        params.push(filters.from_date);
    }
    if (filters.to_date) {
        sql += ' AND DATE(s.sale_date) <= DATE(?)';
        params.push(filters.to_date);
    }
    if (filters.payment_method) {
        sql += ' AND s.payment_method = ?';
        params.push(filters.payment_method);
    }
    if (filters.is_debt !== undefined && filters.is_debt !== null) {
        sql += ' AND s.is_debt = ?';
        params.push(filters.is_debt ? 1 : 0);
    }
    if (filters.paid !== undefined && filters.paid !== null) {
        sql += ' AND s.paid = ?';
        params.push(filters.paid ? 1 : 0);
    }
    if (filters.is_liberated !== undefined && filters.is_liberated !== null) {
        sql += ' AND s.is_liberated = ?';
        params.push(filters.is_liberated ? 1 : 0);
    }
    if (filters.search) {
        sql += ' AND (s.product_name LIKE ? OR s.buyer LIKE ?)';
        const searchTerm = '%' + filters.search + '%';
        params.push(searchTerm, searchTerm);
    }
    if (filters.session) {
        sql += ' AND s.session = ?';
        params.push(filters.session);
    }
    if (filters.include_voided) {
        sql += ' AND s.voided = 0';
    }

    sql += ' ORDER BY s.sale_date DESC';
    return window.DBModule.query(sql, params);
}

// ============================================================
// VENTA INDIVIDUAL (POR NEGOCIO)
// ============================================================

async function getSale(id) {
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return null;

    const results = window.DBModule.query(
        `SELECT s.*, p.nombre as producto_nombre, r.name as receta_nombre 
         FROM sales s
         LEFT JOIN productos p ON s.producto_id = p.id
         LEFT JOIN recipes r ON s.receta_id = r.id
         WHERE s.id = ? AND s.negocio_id = ? AND s.deleted_at IS NULL`,
        [id, negocioId]
    );
    return results.length > 0 ? results[0] : null;
}

// ============================================================
// GUARDAR VENTA - CON FIX DE DUPLICADOS EN TRANSACCIONES
// 🆕 v2.1.12: Verifica permisos antes de EDITAR (no al crear)
// ============================================================

async function saveSale(saleData) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    try {
        if (!saleData.producto_id && !saleData.product_name) {
            return { success: false, error: 'Debes seleccionar un producto o escribir el nombre' };
        }

        if (!saleData.total) {
            saleData.total = saleData.quantity * saleData.unit_price;
        }

        // 🆕 v2.1.12: Verificar permisos SOLO si es EDICIÓN
        if (saleData.id && saleData.id > 0) {
            const permisos = _puedeUsuarioActualProcesarVenta(saleData.id);
            if (!permisos.puede) {
                console.warn('🔒 [saveSale] Edición bloqueada:', permisos.razon);
                return { success: false, error: '🔒 ' + permisos.razon };
            }
        }

        // 🆕 FIX 2: Normalizar sale_date (defensa en profundidad)
        const saleDateNormalizada = normalizarFechaVenta(saleData.sale_date);
        console.log('📅 [saveSale] Fecha normalizada:', saleData.sale_date, '→', saleDateNormalizada);

        let result;
        let isUpdate = false;
        let oldSale = null;

        // Determinar is_liberated
        const isLiberated = saleData.is_liberated ? 1 : 0;
        
        // Si es venta liberada, forzar buyer y no permitir deuda
        let buyer = saleData.buyer;
        let isDebt = saleData.is_debt ? 1 : 0;
        let paid = saleData.paid !== undefined ? (saleData.paid ? 1 : 0) : 1;
        let paymentMethod = saleData.payment_method || 'cash';
        
        if (isLiberated) {
            buyer = 'Cliente ocasional';
            isDebt = 0;
            paid = 1;
            if (paymentMethod === 'debt') paymentMethod = 'cash';
        }

        if (saleData.id && saleData.id > 0) {
            isUpdate = true;
            
            oldSale = await getSale(saleData.id);
            if (!oldSale) {
                return { success: false, error: 'Venta no encontrada o no tienes permiso' };
            }

            if (oldSale.producto_id && oldSale.receta_id) {
                await reponerStockVenta(oldSale);
            }

            result = window.DBModule.execute(`
                UPDATE sales 
                SET product_name = ?, producto_id = ?, receta_id = ?,
                    quantity = ?, unit_price = ?, total = ?, 
                    payment_method = ?, buyer = ?, is_debt = ?, paid = ?,
                    sale_date = ?, session = ?, is_liberated = ?
                WHERE id = ? AND user_id = ?
            `, [
                saleData.product_name || null,
                saleData.producto_id || null,
                saleData.receta_id || null,
                saleData.quantity,
                saleData.unit_price,
                saleData.total,
                paymentMethod,
                buyer || null,
                isDebt,
                paid,
                saleDateNormalizada,
                saleData.session || null,
                isLiberated,
                saleData.id,
                user.id
            ]);
            
            // 🔧 FIX CRÍTICO: Eliminar transacciones ANTERIORES por sale_id
            const txResult = window.DBModule.execute(
                'UPDATE transactions SET deleted_at = CURRENT_TIMESTAMP WHERE sale_id = ? AND user_id = ?',
                [saleData.id, user.id]
            );
            console.log('🗑️ Transacciones anteriores eliminadas por sale_id:', saleData.id);
            
        } else {
            // 🆕 FASE 1.3.2: Generar uuid para la venta
            const saleUuid = window.DBModule.generateUuidForTable('sales');
            
            result = window.DBModule.execute(`
                INSERT INTO sales (user_id, product_name, producto_id, receta_id, quantity, unit_price, 
                    total, payment_method, buyer, is_debt, paid, sale_date, session, is_liberated, voided, uuid)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
            `, [
                user.id,
                saleData.product_name || null,
                saleData.producto_id || null,
                saleData.receta_id || null,
                saleData.quantity,
                saleData.unit_price,
                saleData.total,
                paymentMethod,
                buyer || null,
                isDebt,
                paid,
                saleDateNormalizada,
                saleData.session || null,
                isLiberated,
                saleUuid
            ]);
            
            console.log(`✅ [saveSale] Venta #${result.lastId} creada con uuid ${saleUuid}`);
        }

        const saleId = isUpdate ? saleData.id : result.lastId;
        
        // 🆕 v2.1.12: Limpiar caché de permisos porque la venta cambió
        _limpiarCachePermisosVenta(saleId);
        
        // Descontar stock si tiene receta
        if (saleData.receta_id) {
            const stockResult = await window.RecipesModule.descontarStockReceta(
                saleData.receta_id, 
                saleData.quantity,
                `Venta: ${saleData.product_name || 'producto'} (${saleData.quantity} unidades)`
            );
            
            if (!stockResult.success) {
                if (!isUpdate) {
                    window.DBModule.execute('DELETE FROM sales WHERE id = ?', [saleId]);
                }
                return { success: false, error: 'Error al descontar stock: ' + stockResult.error };
            }
        }

        // Verificar que NO exista ya una transacción para esta venta
        const txExistente = window.DBModule.query(`
            SELECT id FROM transactions 
            WHERE sale_id = ? AND user_id = ? 
              AND deleted_at IS NULL AND voided = 0
        `, [saleId, user.id]);

        if (txExistente.length === 0) {
            // Registrar transacción (solo si no existe)
            await registerTransaction({
                type: 'income',
                category: isLiberated ? 'venta_liberada' : 'venta',
                concept: isLiberated 
                    ? `🚀 Venta liberada: ${saleData.product_name || 'producto'} x${saleData.quantity}` 
                    : `Venta: ${saleData.product_name || 'producto'} x${saleData.quantity}`,
                amount: saleData.total,
                payment_method: paymentMethod,
                sale_id: saleId,
                transaction_date: saleDateNormalizada
            });
            console.log('✅ Transacción creada para venta:', saleId);
        } else {
            console.log('ℹ️ Ya existe transacción para venta', saleId, '- no se duplica');
        }

        window.DBModule.saveAndNotify();

        // Buscar pedido asociado (solo si NO es liberada y hay buyer)
        if (buyer && !isUpdate && !isLiberated) {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            
            const orders = window.DBModule.query(`
                SELECT id, status, client_name, delivery_date 
                FROM orders 
                WHERE user_id = ? 
                AND client_name LIKE ?
                AND DATE(delivery_date) = DATE(?)
                AND status IN ('pending', 'confirmed', 'production', 'ready')
                AND deleted_at IS NULL
            `, [user.id, '%' + buyer + '%', todayStr]);
            
            if (orders.length > 0) {
                const order = orders[0];
                const updateResult = await window.OrdersModule.updateOrderStatus(order.id, 'delivered');
                
                if (updateResult.success) {
                    window.DBModule.execute('UPDATE sales SET order_id = ? WHERE id = ?', [order.id, saleId]);
                    window.DBModule.saveAndNotify();
                    
                    window.NotificationsModule?.addNotification(
                        `🔄 Venta #${saleId} vinculada al pedido #${order.id}`,
                        'success', 4000
                    );
                }
            }
        }

        return { success: true, id: saleId, updated: isUpdate };

    } catch (e) {
        console.error('Error guardando venta:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// GUARDAR VENTA LIBERADA
// ============================================================

async function saveLiberatedSale(data) {
    return saveSale({
        product_name: data.product_name,
        producto_id: data.producto_id,
        receta_id: data.receta_id,
        quantity: data.quantity,
        unit_price: data.unit_price,
        total: data.quantity * data.unit_price,
        payment_method: data.payment_method || 'cash',
        buyer: 'Cliente ocasional',
        is_debt: false,
        paid: true,
        is_liberated: true,
        sale_date: data.sale_date || new Date().toISOString(),
        session: data.session || null
    });
}

// ============================================================
// REPONER STOCK
// ============================================================

async function reponerStockVenta(sale) {
    if (!sale || !sale.receta_id) return { success: true };
    
    try {
        const result = await window.RecipesModule.descontarStockReceta(
            sale.receta_id, -sale.quantity,
            `Reposición por edición de venta #${sale.id}`
        );
        return result;
    } catch (e) {
        console.warn('Error reponiendo stock:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// ANULAR VENTA
// 🆕 v2.1.12: Verifica permisos antes de anular
// ============================================================

async function voidSale(id, reason) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    // 🆕 v2.1.12: Verificar permisos
    const permisos = _puedeUsuarioActualProcesarVenta(id);
    if (!permisos.puede) {
        console.warn('🔒 [voidSale] Bloqueado:', permisos.razon);
        return { success: false, error: '🔒 ' + permisos.razon };
    }

    try {
        const existing = await getSale(id);
        if (!existing) return { success: false, error: 'Venta no encontrada' };
        if (existing.voided === 1) return { success: false, error: 'La venta ya está anulada' };

        if (existing.receta_id) {
            const stockResult = await window.RecipesModule.descontarStockReceta(
                existing.receta_id, -existing.quantity,
                `Anulación de venta #${id}: ${reason}`
            );
            if (!stockResult.success) return { success: false, error: 'Error al reponer stock: ' + stockResult.error };
        }

        window.DBModule.execute(`
            UPDATE sales SET voided = 1, void_reason = ?, voided_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `, [reason, id, user.id]);

        // Anular TODAS las transacciones asociadas (por sale_id)
        window.DBModule.execute(`
            UPDATE transactions SET voided = 1, void_reason = ?, voided_at = CURRENT_TIMESTAMP
            WHERE sale_id = ? AND user_id = ?
        `, [reason, id, user.id]);

        // 🆕 v2.1.12: Limpiar caché
        _limpiarCachePermisosVenta(id);

        window.DBModule.saveAndNotify();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================================
// RESTAURAR VENTA
// 🆕 v2.1.12: Verifica permisos antes de restaurar
// ============================================================

async function unvoidSale(id) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    // 🆕 v2.1.12: Verificar permisos
    const permisos = _puedeUsuarioActualProcesarVenta(id);
    if (!permisos.puede) {
        console.warn('🔒 [unvoidSale] Bloqueado:', permisos.razon);
        return { success: false, error: '🔒 ' + permisos.razon };
    }

    try {
        const existing = await getSale(id);
        if (!existing) return { success: false, error: 'Venta no encontrada' };
        if (existing.voided !== 1) return { success: false, error: 'La venta no está anulada' };

        if (existing.receta_id) {
            const stockResult = await window.RecipesModule.descontarStockReceta(
                existing.receta_id, existing.quantity,
                `Restauración de venta #${id}`
            );
            if (!stockResult.success) return { success: false, error: 'Error al descontar stock: ' + stockResult.error };
        }

        window.DBModule.execute(`
            UPDATE sales SET voided = 0, void_reason = NULL, voided_at = NULL
            WHERE id = ? AND user_id = ?
        `, [id, user.id]);

        window.DBModule.execute(`
            UPDATE transactions SET voided = 0, void_reason = NULL, voided_at = NULL
            WHERE sale_id = ? AND user_id = ?
        `, [id, user.id]);

        // 🆕 v2.1.12: Limpiar caché
        _limpiarCachePermisosVenta(id);

        window.DBModule.saveAndNotify();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================================
// ELIMINAR VENTA (soft-delete)
// 🆕 v2.1.12: Verifica permisos antes de eliminar
// ============================================================

async function deleteSale(id) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    // 🆕 v2.1.12: Verificar permisos
    const permisos = _puedeUsuarioActualProcesarVenta(id);
    if (!permisos.puede) {
        console.warn('🔒 [deleteSale] Bloqueado:', permisos.razon);
        return { success: false, error: '🔒 ' + permisos.razon };
    }

    try {
        const sale = await getSale(id);
        if (!sale) return { success: false, error: 'Venta no encontrada' };

        if (sale.receta_id) {
            await window.RecipesModule.descontarStockReceta(
                sale.receta_id, -sale.quantity,
                `Eliminación de venta #${id}`
            );
        }

        window.DBModule.execute('UPDATE sales SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [id, user.id]);
        window.DBModule.execute('UPDATE transactions SET deleted_at = CURRENT_TIMESTAMP WHERE sale_id = ? AND user_id = ?', [id, user.id]);
        
        // 🆕 v2.1.12: Limpiar caché
        _limpiarCachePermisosVenta(id);
        
        window.DBModule.saveAndNotify();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================================
// GASTOS (POR NEGOCIO)
// ============================================================
// Nota: Los gastos NO tienen receta asociada, por lo que NO se
// ven afectados por la corrección #2 (bloqueo por recetas no
// compartidas). Se mantienen sin verificación de permisos.

async function getExpenses(filters = {}) {
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return [];

    let sql = 'SELECT * FROM transactions WHERE negocio_id = ? AND type = "expense" AND deleted_at IS NULL';
    let params = [negocioId];

    if (filters.from_date) { sql += ' AND DATE(transaction_date) >= DATE(?)'; params.push(filters.from_date); }
    if (filters.to_date) { sql += ' AND DATE(transaction_date) <= DATE(?)'; params.push(filters.to_date); }
    if (filters.category) { sql += ' AND category = ?'; params.push(filters.category); }
    if (filters.payment_method) { sql += ' AND payment_method = ?'; params.push(filters.payment_method); }
    if (filters.include_voided) { sql += ' AND voided = 0'; }

    sql += ' ORDER BY transaction_date DESC';
    return window.DBModule.query(sql, params);
}

async function getExpense(id) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return null;
    const results = window.DBModule.query(
        'SELECT * FROM transactions WHERE id = ? AND user_id = ? AND type = "expense" AND deleted_at IS NULL',
        [id, user.id]
    );
    return results.length > 0 ? results[0] : null;
}

async function updateExpense(id, expenseData) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    try {
        const existing = await getExpense(id);
        if (!existing) return { success: false, error: 'Gasto no encontrado' };
        if (existing.voided === 1) return { success: false, error: 'No se puede editar un gasto anulado' };

        const fechaNormalizada = normalizarFechaVenta(expenseData.transaction_date);

        window.DBModule.execute(`
            UPDATE transactions 
            SET concept = ?, amount = ?, category = ?, payment_method = ?, transaction_date = ?
            WHERE id = ? AND user_id = ? AND type = "expense"
        `, [
            expenseData.concept, expenseData.amount, expenseData.category || 'otros',
            expenseData.payment_method || 'cash',
            fechaNormalizada, id, user.id
        ]);

        window.DBModule.saveAndNotify();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function voidExpense(id, reason) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    try {
        const existing = await getExpense(id);
        if (!existing) return { success: false, error: 'Gasto no encontrado' };
        if (existing.voided === 1) return { success: false, error: 'El gasto ya está anulado' };

        window.DBModule.execute(`
            UPDATE transactions SET voided = 1, void_reason = ?, voided_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `, [reason, id, user.id]);

        window.DBModule.saveAndNotify();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function unvoidExpense(id) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    try {
        const existing = await getExpense(id);
        if (!existing) return { success: false, error: 'Gasto no encontrado' };
        if (existing.voided !== 1) return { success: false, error: 'El gasto no está anulado' };

        window.DBModule.execute(`
            UPDATE transactions SET voided = 0, void_reason = NULL, voided_at = NULL
            WHERE id = ? AND user_id = ?
        `, [id, user.id]);

        window.DBModule.saveAndNotify();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function deleteExpense(id) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    try {
        const expense = await getExpense(id);
        if (!expense) return { success: false, error: 'Gasto no encontrado' };

        window.DBModule.execute(
            'UPDATE transactions SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
            [id, user.id]
        );

        window.DBModule.saveAndNotify();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================================
// TRANSACCIONES
// ============================================================

async function getTransactions(filters = {}) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return [];

    let sql = 'SELECT * FROM transactions WHERE user_id = ? AND deleted_at IS NULL';
    let params = [user.id];

    if (filters.from_date) { sql += ' AND DATE(transaction_date) >= DATE(?)'; params.push(filters.from_date); }
    if (filters.to_date) { sql += ' AND DATE(transaction_date) <= DATE(?)'; params.push(filters.to_date); }
    if (filters.type) { sql += ' AND type = ?'; params.push(filters.type); }
    if (filters.category) { sql += ' AND category = ?'; params.push(filters.category); }
    if (filters.payment_method) { sql += ' AND payment_method = ?'; params.push(filters.payment_method); }
    if (filters.include_voided) { sql += ' AND voided = 0'; }

    sql += ' ORDER BY transaction_date DESC';
    return window.DBModule.query(sql, params);
}

async function registerTransaction(transactionData) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    try {
        const txUuid = window.DBModule.generateUuidForTable('transactions');
        const fechaNormalizada = normalizarFechaVenta(transactionData.transaction_date);
        
        const result = window.DBModule.execute(`
            INSERT INTO transactions (user_id, type, category, concept, amount, payment_method, sale_id, transaction_date, voided, uuid)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        `, [
            user.id, transactionData.type || 'income',
            transactionData.category || 'general', transactionData.concept,
            transactionData.amount, transactionData.payment_method || 'cash',
            transactionData.sale_id || null,
            fechaNormalizada,
            txUuid
        ]);

        window.DBModule.saveAndNotify();
        return { success: true, id: result.lastId };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function registerExpense(expenseData) {
    try {
        return await registerTransaction({
            type: 'expense',
            category: expenseData.category || 'gasto',
            concept: expenseData.concept,
            amount: expenseData.amount,
            payment_method: expenseData.payment_method || 'cash',
            transaction_date: expenseData.transaction_date || new Date().toISOString()
        });
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================================
// BALANCE (POR NEGOCIO)
// ============================================================

async function getBalance() {
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) return null;

    const incomeResult = window.DBModule.query(
        'SELECT SUM(amount) as total FROM transactions WHERE negocio_id = ? AND type = "income" AND deleted_at IS NULL AND voided = 0',
        [negocioId]
    );
    const totalIncome = incomeResult[0]?.total || 0;

    const expenseResult = window.DBModule.query(
        'SELECT SUM(amount) as total FROM transactions WHERE negocio_id = ? AND type = "expense" AND deleted_at IS NULL AND voided = 0',
        [negocioId]
    );
    const totalExpenses = expenseResult[0]?.total || 0;

    const investmentResult = window.DBModule.query(
        'SELECT SUM(amount) as total FROM transactions WHERE negocio_id = ? AND category = "inversion" AND deleted_at IS NULL AND voided = 0',
        [negocioId]
    );
    const initialInvestment = investmentResult[0]?.total || 0;

    const salesResult = window.DBModule.query(
        'SELECT SUM(total) as total FROM sales WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0',
        [negocioId]
    );
    const totalSales = salesResult[0]?.total || 0;

    const debts = await window.OrdersModule?.getDebts() || [];
    const totalDebts = debts.reduce((sum, d) => sum + (d.remaining || 0), 0);

    const cashTransactions = window.DBModule.query(
        'SELECT SUM(amount) as total FROM transactions WHERE negocio_id = ? AND payment_method = "cash" AND type = "income" AND deleted_at IS NULL AND voided = 0',
        [negocioId]
    );
    const cashIncome = cashTransactions[0]?.total || 0;

    const cashExpenses = window.DBModule.query(
        'SELECT SUM(amount) as total FROM transactions WHERE negocio_id = ? AND payment_method = "cash" AND type = "expense" AND deleted_at IS NULL AND voided = 0',
        [negocioId]
    );
    const cashExpensesTotal = cashExpenses[0]?.total || 0;

    const bankIncome = window.DBModule.query(
        'SELECT SUM(amount) as total FROM transactions WHERE negocio_id = ? AND payment_method = "transfer" AND type = "income" AND deleted_at IS NULL AND voided = 0',
        [negocioId]
    );
    const bankIncomeTotal = bankIncome[0]?.total || 0;

    const bankExpenses = window.DBModule.query(
        'SELECT SUM(amount) as total FROM transactions WHERE negocio_id = ? AND payment_method = "transfer" AND type = "expense" AND deleted_at IS NULL AND voided = 0',
        [negocioId]
    );
    const bankExpensesTotal = bankExpenses[0]?.total || 0;

    return {
        totalIncome, totalExpenses,
        netProfit: totalIncome - totalExpenses,
        initialInvestment, totalSales, totalDebts,
        cash: { income: cashIncome, expenses: cashExpensesTotal, balance: cashIncome - cashExpensesTotal },
        bank: { income: bankIncomeTotal, expenses: bankExpensesTotal, balance: bankIncomeTotal - bankExpensesTotal },
        transactions: { total: totalIncome + totalExpenses }
    };
}

// ============================================================
// EXPORTACIÓN
// ============================================================

window.SalesModule = {
    getSales, getSale, saveSale, saveLiberatedSale,
    deleteSale, voidSale, unvoidSale,
    getExpenses, getExpense, updateExpense, deleteExpense,
    registerExpense, voidExpense, unvoidExpense,
    getTransactions, registerTransaction, getBalance,
    reponerStockVenta,
    normalizarFechaVenta,
    // 🆕 v2.1.12
    _puedeUsuarioActualProcesarVenta
};

console.log('📦 Sales Module v2.1.12 (ENTREGA B: corrección #2 - bloqueo por recetas no compartidas)');
console.log('   ✅ saveSale(): verifica permisos al EDITAR (no al crear)');
console.log('   ✅ voidSale(): verifica permisos antes de anular');
console.log('   ✅ unvoidSale(): verifica permisos antes de restaurar');
console.log('   ✅ deleteSale(): verifica permisos antes de eliminar');
console.log('   ✅ _puedeUsuarioActualProcesarVenta(): delega a orders.js o fallback local');
console.log('   ✅ Gastos NO se bloquean (no tienen receta)');