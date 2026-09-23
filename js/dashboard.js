// ============================================================
// 📦 DASHBOARD MODULE - Panario (Panel de Control)
// CORREGIDO: Todas las consultas usan negocio_id en lugar de user_id
// CORREGIDO FASE 2 (160926): Primer día de venta usa 'localtime'
// CORREGIDO (160926 v2): Reemplazado 'localtime' de SQLite por
//   conversión en JavaScript, porque sql.js en WASM NO respeta
//   la zona horaria del navegador.
// CORREGIDO FASE 4B (170926): 
//   - dailySales ahora INCLUYE las ventas liberadas en el total
// AÑADIDO FASE C (180926 v2):
//   - 3 modos de visualización del gráfico: 'last7' | 'dom-sab' | 'lun-dom'
// 🆕 FASE 3.1 (200926 v3):
//   - NUEVO: releasedSales → { count, total }
//   - NUEVO: bestWorstDay → { best, worst }
//   - NUEVO: salesByEmployee → [{ user_id, name, count, total }]
// 🆕 ENTREGA 5 (230926 v4): PEDIDOS MAÑANA EN DASHBOARD
//   - ✅ NUEVO: ordersTomorrowCount → total de pedidos con
//     fecha de entrega = MAÑANA (calculado en JS con fecha local)
//   - ✅ Se calcula usando fechaLocalYYYYMMDD() para evitar
//     desfase UTC en zonas horarias negativas (Cuba UTC-4/5)
//   - ✅ Se devuelve en el objeto de stats junto a
//     ordersTodayCount y waitingListCount
//   - ✅ Los pedidos cancelados, entregados y compró-por-lista
//     NO se cuentan (solo pending, confirmed, production, ready, waiting)
//   - ✅ Optimización: una sola query trae TODOS los pedidos con
//     fecha de entrega, y se agrupan por día en JS
//   - ✅ Compatibilidad: si la tabla orders no existe o falla,
//     devuelve 0 sin romper el dashboard
// 🆕 v2.2.2 (230926 v5): CORRECCIÓN #2 - CONTEO UNIFICADO EN DASHBOARD
//   - ✅ ordersTodayCount y ordersTomorrowCount ahora usan la
//     función unificada window.DBModule.contarPedidosYVentasFecha()
//   - ✅ Esto garantiza que el Dashboard muestre exactamente el
//     mismo número que la tarjeta de fecha en el módulo de Pedidos.
//   - ✅ Se eliminó la lógica de conteo duplicada que causaba la
//     discrepancia (el bug original).
//   - ✅ Se mantiene la optimización de traer todos los pedidos
//     en una sola query y agruparlos en JS.
// ============================================================

window.DashboardModule = {};

// ============================================================
// 🔧 HELPER: Conversión de fecha UTC a fecha local YYYY-MM-DD
// ============================================================

/**
 * Convierte una fecha UTC (string o Date) a fecha local del navegador
 * en formato YYYY-MM-DD.
 * 
 * Usar esta función en lugar de `DATE(fecha, 'localtime')` de SQLite,
 * porque sql.js en WASM no respeta la zona horaria del navegador.
 * 
 * @param {string|Date} fechaUTC - Fecha en UTC
 * @returns {string|null} Fecha en formato YYYY-MM-DD en zona horaria local
 */
function fechaLocalYYYYMMDD(fechaUTC) {
    if (!fechaUTC) return null;
    try {
        const d = new Date(fechaUTC);
        if (isNaN(d.getTime())) return null;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return null;
    }
}

/**
 * Devuelve la fecha de hoy en formato YYYY-MM-DD (zona horaria local).
 */
function hoyYYYYMMDD() {
    return fechaLocalYYYYMMDD(new Date());
}

/**
 * 🆕 ENTREGA 5: Devuelve la fecha de MAÑANA en formato YYYY-MM-DD (local).
 */
function mananaYYYYMMDD() {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    return fechaLocalYYYYMMDD(manana);
}

// ============================================================
// 🆕 FASE C: HELPER PARA CALCULAR RANGO DEL GRÁFICO
// ============================================================

/**
 * Calcula el rango de días a mostrar en el gráfico, respetando
 * el modo seleccionado por el usuario.
 * 
 * Modos disponibles:
 *   - 'last7'   → Últimos 7 días (retrocede 6 días desde hoy)
 *   - 'dom-sab' → Semana completa de Domingo a Sábado
 *   - 'lun-dom' → Semana completa de Lunes a Domingo
 * 
 * @param {number} weekOffset - 0 = ventana actual, -1 = anterior, etc.
 * @param {string} chartMode - 'last7' | 'dom-sab' | 'lun-dom'
 * @returns {object} { startDate, endDate, weekLabel, isCurrentRange }
 */
function calcularRangoGrafico(weekOffset, chartMode) {
    const validModes = ['last7', 'dom-sab', 'lun-dom'];
    if (!validModes.includes(chartMode)) {
        chartMode = 'last7';
    }
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    let startDate, endDate, weekLabel, isCurrentRange;
    
    // ============================================================
    // MODO 1: ÚLTIMOS 7 DÍAS
    // ============================================================
    if (chartMode === 'last7') {
        const endBase = new Date(hoy);
        endBase.setDate(endBase.getDate() + (weekOffset * 7));
        
        endDate = new Date(endBase);
        startDate = new Date(endBase);
        startDate.setDate(startDate.getDate() - 6);
        
        isCurrentRange = (weekOffset === 0);
        
        if (weekOffset === 0) {
            weekLabel = 'Últimos 7 días';
        } else {
            weekLabel = `Hace ${Math.abs(weekOffset)} sem.`;
        }
    }
    // ============================================================
    // MODO 2: SEMANA DOM-SÁB
    // ============================================================
    else if (chartMode === 'dom-sab') {
        const dayOfWeek = hoy.getDay();
        
        const inicioSemanaActual = new Date(hoy);
        inicioSemanaActual.setDate(inicioSemanaActual.getDate() - dayOfWeek);
        
        startDate = new Date(inicioSemanaActual);
        startDate.setDate(startDate.getDate() + (weekOffset * 7));
        
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        
        isCurrentRange = (weekOffset === 0);
        weekLabel = (weekOffset === 0) ? 'Dom-Sáb (Actual)' : 'Dom-Sáb (Anterior)';
    }
    // ============================================================
    // MODO 3: SEMANA LUN-DOM
    // ============================================================
    else if (chartMode === 'lun-dom') {
        const dayOfWeek = hoy.getDay();
        const offsetDesdeLunes = (dayOfWeek + 6) % 7;
        
        const inicioSemanaActual = new Date(hoy);
        inicioSemanaActual.setDate(inicioSemanaActual.getDate() - offsetDesdeLunes);
        
        startDate = new Date(inicioSemanaActual);
        startDate.setDate(startDate.getDate() + (weekOffset * 7));
        
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        
        isCurrentRange = (weekOffset === 0);
        weekLabel = (weekOffset === 0) ? 'Lun-Dom (Actual)' : 'Lun-Dom (Anterior)';
    }
    
    return {
        startDate: startDate,
        endDate: endDate,
        weekLabel: weekLabel,
        isCurrentRange: isCurrentRange
    };
}

// ============================================================
// 📊 ESTADÍSTICAS DEL DASHBOARD
// 🆕 ENTREGA 5: Añadido ordersTomorrowCount
// 🆕 v2.2.2: Conteo unificado para ordersTodayCount y ordersTomorrowCount
// ============================================================

async function getDashboardStats(options = {}) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) {
        console.warn('⚠️ No hay usuario autenticado');
        return null;
    }

    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) {
        console.warn('⚠️ No hay negocio actual');
        return null;
    }

    const weekOffset = options.weekOffset || 0;
    
    let chartMode = 'last7';
    if (typeof options.chartMode === 'string') {
        const validModes = ['last7', 'dom-sab', 'lun-dom'];
        if (validModes.includes(options.chartMode)) {
            chartMode = options.chartMode;
        }
    }

    try {
        console.log('📊 Obteniendo estadísticas del dashboard... (negocio:', negocioId, ', weekOffset:', weekOffset, ', chartMode:', chartMode, ')');
        
        // ============================================================
        // VENTAS TOTALES
        // ============================================================
        let totalSales = 0;
        let totalRevenue = 0;
        try {
            const salesResult = window.DBModule.query(
                'SELECT COUNT(*) as count, SUM(total) as total FROM sales WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0',
                [negocioId]
            );
            totalSales = salesResult[0]?.count || 0;
            totalRevenue = salesResult[0]?.total || 0;
        } catch (e) {
            console.warn('⚠️ Error obteniendo ventas:', e);
        }

        // ============================================================
        // VENTAS DE HOY (corregido con JS, no SQLite localtime)
        // ============================================================
        let todaySalesCount = 0;
        let todayRevenue = 0;
        try {
            const hoyStr = hoyYYYYMMDD();
            
            const todasLasVentas = window.DBModule.query(
                `SELECT sale_date, total 
                 FROM sales 
                 WHERE negocio_id = ? 
                 AND deleted_at IS NULL 
                 AND voided = 0`,
                [negocioId]
            );
            
            for (const venta of todasLasVentas) {
                const fechaLocal = fechaLocalYYYYMMDD(venta.sale_date);
                if (fechaLocal === hoyStr) {
                    todaySalesCount++;
                    todayRevenue += venta.total || 0;
                }
            }
        } catch (e) {
            console.error('❌ Error obteniendo ventas de hoy:', e);
        }

        // ============================================================
        // VENTAS POR DÍA - SEGÚN MODO DEL GRÁFICO (FASE C)
        // ============================================================
        let dailySales = [];
        let isCurrentRange = true;
        try {
            const rango = calcularRangoGrafico(weekOffset, chartMode);
            const startDate = rango.startDate;
            const endDate = rango.endDate;
            isCurrentRange = rango.isCurrentRange;
            
            console.log('📅 Rango del gráfico calculado:', 
                startDate.toISOString().split('T')[0], 
                '→', 
                endDate.toISOString().split('T')[0],
                `(${rango.weekLabel})`,
                `[Modo: ${chartMode}]`
            );
            
            const rangoMin = new Date(startDate);
            rangoMin.setHours(0, 0, 0, 0);
            rangoMin.setDate(rangoMin.getDate() - 1);
            
            const rangoMax = new Date(endDate);
            rangoMax.setHours(23, 59, 59, 999);
            rangoMax.setDate(rangoMax.getDate() + 1);
            
            const ventasPeriodo = window.DBModule.query(
                `SELECT sale_date, total, is_liberated
                 FROM sales 
                 WHERE negocio_id = ? 
                 AND sale_date >= ? 
                 AND sale_date <= ?
                 AND deleted_at IS NULL 
                 AND voided = 0`,
                [negocioId, rangoMin.toISOString(), rangoMax.toISOString()]
            );
            
            console.log(`💰 [FASE C] Ventas en período: ${ventasPeriodo.length}`);
            const totalLiberadas = ventasPeriodo.filter(v => v.is_liberated === 1).length;
            console.log(`   🚀 De las cuales liberadas: ${totalLiberadas}`);
            
            const totalesPorFecha = {};
            for (const venta of ventasPeriodo) {
                const fechaLocal = fechaLocalYYYYMMDD(venta.sale_date);
                if (!fechaLocal) continue;
                if (!totalesPorFecha[fechaLocal]) totalesPorFecha[fechaLocal] = 0;
                totalesPorFecha[fechaLocal] += venta.total || 0;
            }
            
            for (let i = 0; i < 7; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                
                dailySales.push({
                    date: dateStr,
                    total: totalesPorFecha[dateStr] || 0
                });
            }
            
            const totalSemanaCalc = dailySales.reduce((sum, d) => sum + d.total, 0);
            console.log(`   📊 Total período (con liberadas): $${totalSemanaCalc.toFixed(2)}`);
            
        } catch (e) {
            console.warn('⚠️ Error obteniendo ventas diarias:', e);
        }

        // ============================================================
        // DÍAS CON VENTAS, PROMEDIO, PRIMER DÍA
        // ============================================================
        let diasConVentas = 0;
        let promedioVentasDiarias = 0;
        let primerDiaVenta = null;
        
        try {
            const todasLasFechas = window.DBModule.query(
                `SELECT sale_date 
                 FROM sales 
                 WHERE negocio_id = ? 
                 AND deleted_at IS NULL 
                 AND voided = 0
                 ORDER BY sale_date ASC`,
                [negocioId]
            );
            
            const fechasLocales = [];
            for (const row of todasLasFechas) {
                const fechaLocal = fechaLocalYYYYMMDD(row.sale_date);
                if (fechaLocal) fechasLocales.push(fechaLocal);
            }
            
            const fechasUnicas = [...new Set(fechasLocales)].sort();
            
            diasConVentas = fechasUnicas.length;
            primerDiaVenta = fechasUnicas[0] || null;
            
            if (diasConVentas > 0) {
                promedioVentasDiarias = totalRevenue / diasConVentas;
            }
        } catch (e) {
            console.warn('⚠️ Error obteniendo días con ventas:', e);
        }

        // ============================================================
        // CLIENTES DIFERENTES
        // ============================================================
        let clientesDiferentes = 0;
        try {
            const clientesResult = window.DBModule.query(
                `SELECT COUNT(DISTINCT buyer) as clientes
                 FROM sales 
                 WHERE negocio_id = ? 
                   AND deleted_at IS NULL 
                   AND voided = 0
                   AND buyer IS NOT NULL 
                   AND buyer != '' 
                   AND buyer != 'Cliente sin nombre'
                   AND buyer != 'Cliente ocasional'`,
                [negocioId]
            );
            clientesDiferentes = clientesResult[0]?.clientes || 0;
        } catch (e) {
            console.warn('⚠️ Error obteniendo clientes diferentes:', e);
        }

        // ============================================================
        // PEDIDOS PENDIENTES
        // ============================================================
        let pendingOrdersCount = 0;
        try {
            const pendingOrders = window.DBModule.query(
                'SELECT COUNT(*) as count FROM orders WHERE negocio_id = ? AND status NOT IN ("delivered", "cancelled") AND deleted_at IS NULL',
                [negocioId]
            );
            pendingOrdersCount = pendingOrders[0]?.count || 0;
        } catch (e) {
            console.warn('⚠️ Error obteniendo pedidos pendientes:', e);
        }

        // ============================================================
        // DEUDAS
        // ============================================================
        let totalDebts = 0;
        let debtCount = 0;
        let debtDetails = [];
        try {
            const debtSales = window.DBModule.query(`
                SELECT id, product_name, total, buyer, sale_date, 
                       payment_method, quantity, is_debt, paid
                FROM sales 
                WHERE negocio_id = ? 
                AND is_debt = 1 
                AND paid = 0 
                AND deleted_at IS NULL 
                AND voided = 0
                ORDER BY sale_date ASC, id ASC
            `, [negocioId]);
            
            debtDetails = debtSales.map(s => ({
                id: s.id,
                client_name: s.buyer || 'Cliente sin nombre',
                total: s.total,
                remaining: s.total,
                delivery_date: s.sale_date,
                product_name: s.product_name,
                payment_method: s.payment_method || 'cash',
                quantity: s.quantity || 1,
                type: 'venta'
            }));
            
            totalDebts = debtDetails.reduce((sum, d) => sum + d.remaining, 0);
            debtCount = debtDetails.length;
        } catch (e) {
            console.warn('⚠️ Error obteniendo deudas:', e);
        }

        // ============================================================
        // PRODUCTOS MÁS VENDIDOS
        // ============================================================
        let topProducts = [];
        try {
            topProducts = window.DBModule.query(`
                SELECT product_name, COUNT(*) as sales_count, SUM(total) as total_revenue
                FROM sales
                WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0
                GROUP BY product_name
                ORDER BY sales_count DESC
                LIMIT 5
            `, [negocioId]);
        } catch (e) {
            console.warn('⚠️ Error obteniendo productos más vendidos:', e);
        }

        // ============================================================
        // MÉTODOS DE PAGO
        // ============================================================
        let paymentMethods = [];
        try {
            paymentMethods = window.DBModule.query(`
                SELECT payment_method, COUNT(*) as count, SUM(total) as total
                FROM sales
                WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0
                GROUP BY payment_method
            `, [negocioId]);
        } catch (e) {
            console.warn('⚠️ Error obteniendo métodos de pago:', e);
        }

        // ============================================================
        // GASTOS
        // ============================================================
        let totalExpenses = 0;
        try {
            const expensesResult = window.DBModule.query(
                'SELECT SUM(amount) as total FROM transactions WHERE negocio_id = ? AND type = "expense" AND deleted_at IS NULL AND voided = 0',
                [negocioId]
            );
            totalExpenses = expensesResult[0]?.total || 0;
        } catch (e) {
            console.warn('⚠️ Error obteniendo gastos:', e);
        }

        // ============================================================
        // INVERSIÓN INICIAL
        // ============================================================
        let initialInvestment = 0;
        try {
            const investmentResult = window.DBModule.query(
                'SELECT SUM(amount) as total FROM transactions WHERE negocio_id = ? AND category = "inversion" AND deleted_at IS NULL AND voided = 0',
                [negocioId]
            );
            initialInvestment = investmentResult[0]?.total || 0;
        } catch (e) {
            console.warn('⚠️ Error obteniendo inversión:', e);
        }

        // ============================================================
        // FONDOS - EFECTIVO
        // ============================================================
        let cashIncomeTotal = 0;
        let cashExpensesTotal = 0;
        let cashBalance = 0;
        let cashSalesTotal = 0;
        try {
            const cashIncome = window.DBModule.query(
                'SELECT SUM(amount) as total FROM transactions WHERE negocio_id = ? AND payment_method = "cash" AND type = "income" AND deleted_at IS NULL AND voided = 0',
                [negocioId]
            );
            cashIncomeTotal = cashIncome[0]?.total || 0;

            const cashExpenses = window.DBModule.query(
                'SELECT SUM(amount) as total FROM transactions WHERE negocio_id = ? AND payment_method = "cash" AND type = "expense" AND deleted_at IS NULL AND voided = 0',
                [negocioId]
            );
            cashExpensesTotal = cashExpenses[0]?.total || 0;

            cashBalance = cashIncomeTotal - cashExpensesTotal;

            const cashSales = window.DBModule.query(
                'SELECT SUM(total) as total FROM sales WHERE negocio_id = ? AND payment_method = "cash" AND deleted_at IS NULL AND voided = 0',
                [negocioId]
            );
            cashSalesTotal = cashSales[0]?.total || 0;
        } catch (e) {
            console.warn('⚠️ Error obteniendo fondos en efectivo:', e);
        }

        // ============================================================
        // FONDOS - BANCO
        // ============================================================
        let bankIncomeTotal = 0;
        let bankExpensesTotal = 0;
        let bankBalance = 0;
        let transferSalesTotal = 0;
        try {
            const bankIncome = window.DBModule.query(
                'SELECT SUM(amount) as total FROM transactions WHERE negocio_id = ? AND payment_method = "transfer" AND type = "income" AND deleted_at IS NULL AND voided = 0',
                [negocioId]
            );
            bankIncomeTotal = bankIncome[0]?.total || 0;

            const bankExpenses = window.DBModule.query(
                'SELECT SUM(amount) as total FROM transactions WHERE negocio_id = ? AND payment_method = "transfer" AND type = "expense" AND deleted_at IS NULL AND voided = 0',
                [negocioId]
            );
            bankExpensesTotal = bankExpenses[0]?.total || 0;

            bankBalance = bankIncomeTotal - bankExpensesTotal;

            const transferSales = window.DBModule.query(
                'SELECT SUM(total) as total FROM sales WHERE negocio_id = ? AND payment_method = "transfer" AND deleted_at IS NULL AND voided = 0',
                [negocioId]
            );
            transferSalesTotal = transferSales[0]?.total || 0;
        } catch (e) {
            console.warn('⚠️ Error obteniendo fondos en banco:', e);
        }

        // ============================================================
        // RECETAS TOTALES
        // ============================================================
        let totalRecipes = 0;
        try {
            const recipesResult = window.DBModule.query(
                'SELECT COUNT(*) as count FROM recipes WHERE negocio_id = ? AND deleted_at IS NULL',
                [negocioId]
            );
            totalRecipes = recipesResult[0]?.count || 0;
        } catch (e) {
            console.warn('⚠️ Error obteniendo recetas:', e);
        }

        // ============================================================
        // MEJORES CLIENTES
        // ============================================================
        let topClients = [];
        try {
            const allSales = window.DBModule.query(`
                SELECT buyer, total
                FROM sales
                WHERE negocio_id = ? 
                AND deleted_at IS NULL 
                AND voided = 0
                AND buyer IS NOT NULL 
                AND buyer != ''
                AND buyer != 'Cliente sin nombre'
                AND buyer != 'Cliente ocasional'
            `, [negocioId]);
            
            if (allSales.length > 0) {
                const clientMap = {};
                allSales.forEach(sale => {
                    const buyer = sale.buyer.trim();
                    if (!clientMap[buyer]) {
                        clientMap[buyer] = { count: 0, total: 0 };
                    }
                    clientMap[buyer].count += 1;
                    clientMap[buyer].total += sale.total;
                });
                
                topClients = Object.entries(clientMap)
                    .map(([buyer, data]) => ({
                        buyer: buyer,
                        sales_count: data.count,
                        total_spent: data.total
                    }))
                    .sort((a, b) => b.total_spent - a.total_spent)
                    .slice(0, 3);
            }
        } catch (e) {
            console.warn('⚠️ Error obteniendo mejores clientes:', e);
        }

        // ============================================================
        // PEDIDOS HOY, MAÑANA Y LISTA DE ESPERA
        // 🆕 v2.2.2: Conteo unificado con DBModule.contarPedidosYVentasFecha()
        // ============================================================
        let ordersTodayCount = 0;
        let ordersTomorrowCount = 0;
        let waitingListCount = 0;
        try {
            const hoyStr = hoyYYYYMMDD();
            const mananaStr = mananaYYYYMMDD();
            
            console.log(`📅 [v2.2.2] Contando pedidos para HOY (${hoyStr}) y MAÑANA (${mananaStr})...`);
            
            // 🆕 v2.2.2: Usar la función unificada para el conteo
            const conteoHoy = window.DBModule.contarPedidosYVentasFecha(hoyStr);
            ordersTodayCount = conteoHoy.pedidos;
            
            const conteoManana = window.DBModule.contarPedidosYVentasFecha(mananaStr);
            ordersTomorrowCount = conteoManana.pedidos;
            
            console.log(`   📅 Pedidos HOY (unificado): ${ordersTodayCount}`);
            console.log(`   📅 Pedidos MAÑANA (unificado): ${ordersTomorrowCount}`);
            
            const waitingCount = window.DBModule.query(
                `SELECT COUNT(*) as count FROM waiting_list 
                 WHERE negocio_id = ? AND deleted_at IS NULL AND status = 'waiting'`,
                [negocioId]
            );
            waitingListCount = waitingCount[0]?.count || 0;
            
            console.log(`   ⏰ Lista de espera: ${waitingListCount}`);
        } catch (e) {
            console.warn('⚠️ Error obteniendo pedidos hoy/mañana:', e);
        }

        // ============================================================
        // CORRIENTE HOY
        // ============================================================
        let corrienteHoy = null;
        try {
            if (window.CorrienteUtils) {
                const hoy = hoyYYYYMMDD();
                corrienteHoy = window.CorrienteUtils.getResumen(hoy);
            }
        } catch (e) {
            console.warn('⚠️ Error obteniendo corriente hoy:', e);
        }

        // ============================================================
        // VENTAS LIBERADAS (cantidad + importe)
        // ============================================================
        let releasedSales = { count: 0, total: 0 };
        try {
            const releasedResult = window.DBModule.query(`
                SELECT COUNT(*) as count, SUM(total) as total
                FROM sales
                WHERE negocio_id = ? 
                  AND is_liberated = 1
                  AND deleted_at IS NULL 
                  AND voided = 0
            `, [negocioId]);
            
            releasedSales = {
                count: releasedResult[0]?.count || 0,
                total: releasedResult[0]?.total || 0
            };
            console.log(`🚀 [FASE 3.1] Ventas liberadas: ${releasedSales.count} ($${releasedSales.total.toFixed(2)})`);
        } catch (e) {
            console.warn('⚠️ Error obteniendo ventas liberadas:', e);
        }

        // ============================================================
        // MEJOR Y PEOR DÍA DE VENTAS (histórico)
        // ============================================================
        let bestWorstDay = { best: null, worst: null };
        try {
            const todasLasVentas = window.DBModule.query(`
                SELECT sale_date, total
                FROM sales
                WHERE negocio_id = ? 
                  AND deleted_at IS NULL 
                  AND voided = 0
            `, [negocioId]);
            
            const totalesPorFecha = {};
            for (const venta of todasLasVentas) {
                const fechaLocal = fechaLocalYYYYMMDD(venta.sale_date);
                if (!fechaLocal) continue;
                if (!totalesPorFecha[fechaLocal]) totalesPorFecha[fechaLocal] = 0;
                totalesPorFecha[fechaLocal] += venta.total || 0;
            }
            
            const fechasArray = Object.entries(totalesPorFecha)
                .map(([date, total]) => ({ date, total }))
                .filter(d => d.total > 0);
            
            if (fechasArray.length > 0) {
                fechasArray.sort((a, b) => a.total - b.total);
                
                bestWorstDay.worst = fechasArray[0];
                bestWorstDay.best = fechasArray[fechasArray.length - 1];
                
                console.log(`📅 [FASE 3.1] Mejor día: ${bestWorstDay.best.date} ($${bestWorstDay.best.total.toFixed(2)})`);
                console.log(`📅 [FASE 3.1] Peor día: ${bestWorstDay.worst.date} ($${bestWorstDay.worst.total.toFixed(2)})`);
            }
        } catch (e) {
            console.warn('⚠️ Error obteniendo mejor/peor día:', e);
        }

        // ============================================================
        // VENTAS POR EMPLEADO
        // ============================================================
        let salesByEmployee = [];
        try {
            const ventasPorUsuario = window.DBModule.query(`
                SELECT 
                    s.created_by,
                    COUNT(*) as count,
                    SUM(s.total) as total,
                    u.name as user_name,
                    u.username as user_username
                FROM sales s
                LEFT JOIN users u ON s.created_by = u.id
                WHERE s.negocio_id = ? 
                  AND s.deleted_at IS NULL 
                  AND s.voided = 0
                  AND s.created_by IS NOT NULL
                GROUP BY s.created_by
                ORDER BY total DESC
            `, [negocioId]);
            
            salesByEmployee = ventasPorUsuario.map(row => ({
                user_id: row.created_by,
                name: row.user_name || row.user_username || 'Usuario desconocido',
                username: row.user_username || '',
                count: row.count || 0,
                total: row.total || 0
            }));
            
            if (salesByEmployee.length === 0) {
                const ventasPorUser = window.DBModule.query(`
                    SELECT 
                        s.user_id,
                        COUNT(*) as count,
                        SUM(s.total) as total,
                        u.name as user_name,
                        u.username as user_username
                    FROM sales s
                    LEFT JOIN users u ON s.user_id = u.id
                    WHERE s.negocio_id = ? 
                      AND s.deleted_at IS NULL 
                      AND s.voided = 0
                    GROUP BY s.user_id
                    ORDER BY total DESC
                `, [negocioId]);
                
                salesByEmployee = ventasPorUser.map(row => ({
                    user_id: row.user_id,
                    name: row.user_name || row.user_username || 'Usuario desconocido',
                    username: row.user_username || '',
                    count: row.count || 0,
                    total: row.total || 0
                }));
            }
            
            console.log(`👥 [FASE 3.1] Empleados con ventas: ${salesByEmployee.length}`);
        } catch (e) {
            console.warn('⚠️ Error obteniendo ventas por empleado:', e);
        }

        // ============================================================
        // RETORNAR OBJETO COMPLETO
        // 🆕 ENTREGA 5: Incluye ordersTomorrowCount
        // 🆕 v2.2.2: ordersTodayCount y ordersTomorrowCount usan conteo unificado
        // ============================================================
        return {
            totalSales, totalRevenue, todaySalesCount, todayRevenue,
            pendingOrdersCount, 
            ordersTodayCount, 
            ordersTomorrowCount,
            waitingListCount,
            totalDebts, debtCount, debtDetails,
            topProducts, topClients, clientesDiferentes,
            diasConVentas, promedioVentasDiarias, primerDiaVenta,
            dailySales, paymentMethods,
            totalExpenses, initialInvestment, totalRecipes,
            netProfit: totalRevenue - totalExpenses,
            cash: {
                income: cashIncomeTotal, expenses: cashExpensesTotal,
                balance: cashBalance, sales: cashSalesTotal,
                salesVsExpenses: cashSalesTotal - cashExpensesTotal
            },
            bank: {
                income: bankIncomeTotal, expenses: bankExpensesTotal,
                balance: bankBalance, sales: transferSalesTotal,
                salesVsExpenses: transferSalesTotal - bankExpensesTotal
            },
            salesByMethod: {
                cash: cashSalesTotal, transfer: transferSalesTotal, debt: totalDebts
            },
            corrienteHoy: corrienteHoy,
            weekOffset: weekOffset,
            chartMode: chartMode,
            isCurrentRange: isCurrentRange,
            releasedSales: releasedSales,
            bestWorstDay: bestWorstDay,
            salesByEmployee: salesByEmployee
        };

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        return null;
    }
}

// ============================================================
// EXPORTACIÓN
// ============================================================

window.DashboardModule = {
    getDashboardStats,
    calcularRangoGrafico
};

console.log('📦 Dashboard Module cargado correctamente v2.2.2 (CORRECCIÓN #2: conteo unificado en Dashboard)');