// ============================================================
// 📦 DASHBOARD MODULE - Panario (Panel de Control)
// v2.2.7 (011026): 🎯 Corrección N5 — Promedio diario por producto
//   - ✅ NUEVO: campo promedioProducto en el objeto de retorno
//   - ✅ NUEVO: lectura de show_producto_promedio y producto_promedio_id
//   - ✅ NUEVO: llamada a DBModule.getPromedioDiarioProducto() cuando aplica
//   - ✅ MANTENIDO: _diagnosticoIngresos, debtDetailsByClient, etc.
//
// HISTORIAL:
// v2.2.6 (011026): Corrección N3 — Diagnóstico de ingresos
// v2.2.5 (290926): Correcciones GitHub 290926 (Punto #5 - Parte 1/2)
// v2.2.4 (260926): REGRESIÓN #5 — Ventas por empleado (COALESCE)
// v2.2.3 (260926): CORRECCIONES #2 y #3 — Días sin ventas
// ============================================================

window.DashboardModule = {};

// ============================================================
// 🔧 HELPER: Conversión de fecha UTC a fecha local YYYY-MM-DD
// ============================================================

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

function hoyYYYYMMDD() {
    return fechaLocalYYYYMMDD(new Date());
}

function mananaYYYYMMDD() {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    return fechaLocalYYYYMMDD(manana);
}

// ============================================================
// 🆕 FASE C: HELPER PARA CALCULAR RANGO DEL GRÁFICO
// ============================================================

function calcularRangoGrafico(weekOffset, chartMode) {
    const validModes = ['last7', 'dom-sab', 'lun-dom'];
    if (!validModes.includes(chartMode)) {
        chartMode = 'last7';
    }
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    let startDate, endDate, weekLabel, isCurrentRange;
    
    if (chartMode === 'last7') {
        const endBase = new Date(hoy);
        endBase.setDate(endBase.getDate() + (weekOffset * 7));
        endDate = new Date(endBase);
        startDate = new Date(endBase);
        startDate.setDate(startDate.getDate() - 6);
        isCurrentRange = (weekOffset === 0);
        weekLabel = (weekOffset === 0) ? 'Últimos 7 días' : `Hace ${Math.abs(weekOffset)} sem.`;
    } else if (chartMode === 'dom-sab') {
        const dayOfWeek = hoy.getDay();
        const inicioSemanaActual = new Date(hoy);
        inicioSemanaActual.setDate(inicioSemanaActual.getDate() - dayOfWeek);
        startDate = new Date(inicioSemanaActual);
        startDate.setDate(startDate.getDate() + (weekOffset * 7));
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        isCurrentRange = (weekOffset === 0);
        weekLabel = (weekOffset === 0) ? 'Dom-Sáb (Actual)' : 'Dom-Sáb (Anterior)';
    } else if (chartMode === 'lun-dom') {
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
    
    return { startDate, endDate, weekLabel, isCurrentRange };
}

// ============================================================
// 📊 ESTADÍSTICAS DEL DASHBOARD
// 🆕 v2.2.7: + promedioProducto (N5)
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
        // 🆕 v2.2.6: Logging detallado + cálculo paralelo de transactions
        // ============================================================
        let totalSales = 0;
        let totalRevenue = 0;
        let totalIncomeFromTransactions = 0;  // 🆕 v2.2.6
        let _diagnosticoIngresos = {};        // 🆕 v2.2.6
        try {
            // Cálculo principal: SUM(sales.total)
            const salesResult = window.DBModule.query(
                'SELECT COUNT(*) as count, SUM(total) as total FROM sales WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0',
                [negocioId]
            );
            totalSales = salesResult[0]?.count || 0;
            totalRevenue = salesResult[0]?.total || 0;

            // 🆕 v2.2.6: Cálculo paralelo: SUM(transactions.amount)
            const incomeResult = window.DBModule.query(
                'SELECT COUNT(*) as count, SUM(amount) as total FROM transactions WHERE negocio_id = ? AND type = "income" AND deleted_at IS NULL AND voided = 0',
                [negocioId]
            );
            totalIncomeFromTransactions = incomeResult[0]?.total || 0;
            const incomeCount = incomeResult[0]?.count || 0;

            // 🆕 v2.2.6: Diagnóstico detallado
            const diagnosticoSales = window.DBModule.query(`
                SELECT 
                    COUNT(*) as total_ventas,
                    SUM(total) as total_facturado,
                    SUM(CASE WHEN is_liberated = 1 THEN total ELSE 0 END) as total_liberadas,
                    SUM(CASE WHEN is_debt = 1 AND paid = 0 THEN total ELSE 0 END) as total_deudas,
                    SUM(CASE WHEN is_debt = 0 OR paid = 1 THEN total ELSE 0 END) as total_cobrado,
                    COUNT(CASE WHEN is_liberated = 1 THEN 1 END) as count_liberadas,
                    COUNT(CASE WHEN is_debt = 1 AND paid = 0 THEN 1 END) as count_deudas
                FROM sales 
                WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0
            `, [negocioId]);

            const diagnosticoTx = window.DBModule.query(`
                SELECT 
                    COUNT(*) as total_transacciones,
                    SUM(amount) as total_transacciones_amount,
                    SUM(CASE WHEN category = 'venta_liberada' THEN amount ELSE 0 END) as total_liberadas_tx,
                    SUM(CASE WHEN category = 'venta' THEN amount ELSE 0 END) as total_ventas_tx
                FROM transactions 
                WHERE negocio_id = ? AND type = 'income' AND deleted_at IS NULL AND voided = 0
            `, [negocioId]);

            _diagnosticoIngresos = {
                sales_total: totalRevenue,
                sales_count: totalSales,
                sales_liberadas: diagnosticoSales[0]?.total_liberadas || 0,
                sales_liberadas_count: diagnosticoSales[0]?.count_liberadas || 0,
                sales_deudas: diagnosticoSales[0]?.total_deudas || 0,
                sales_deudas_count: diagnosticoSales[0]?.count_deudas || 0,
                sales_cobrado: diagnosticoSales[0]?.total_cobrado || 0,
                transactions_total: totalIncomeFromTransactions,
                transactions_count: incomeCount,
                transactions_liberadas: diagnosticoTx[0]?.total_liberadas_tx || 0,
                transactions_ventas: diagnosticoTx[0]?.total_ventas_tx || 0,
                diferencia: totalRevenue - totalIncomeFromTransactions
            };

            console.log('💰 [N3] Diagnóstico de ingresos:');
            console.log('   📊 SUM(sales.total):', totalRevenue.toFixed(2), `(${totalSales} ventas)`);
            console.log('   📊 SUM(transactions.amount):', totalIncomeFromTransactions.toFixed(2), `(${incomeCount} transacciones)`);
            console.log('   📊 Diferencia:', (totalRevenue - totalIncomeFromTransactions).toFixed(2));
            console.log('   📊 Ventas liberadas (sales):', diagnosticoSales[0]?.total_liberadas?.toFixed(2) || 0, `(${diagnosticoSales[0]?.count_liberadas || 0} ventas)`);
            console.log('   📊 Deudas pendientes (sales):', diagnosticoSales[0]?.total_deudas?.toFixed(2) || 0, `(${diagnosticoSales[0]?.count_deudas || 0} ventas)`);
            console.log('   📊 Total cobrado (sales):', diagnosticoSales[0]?.total_cobrado?.toFixed(2) || 0);
        } catch (e) {
            console.warn('⚠️ Error obteniendo ventas:', e);
        }

        // ============================================================
        // VENTAS DE HOY
        // ============================================================
        let todaySalesCount = 0;
        let todayRevenue = 0;
        try {
            const hoyStr = hoyYYYYMMDD();
            const todasLasVentas = window.DBModule.query(
                `SELECT sale_date, total FROM sales WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0`,
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
        // VENTAS POR DÍA - SEGÚN MODO DEL GRÁFICO
        // ============================================================
        let dailySales = [];
        let isCurrentRange = true;
        try {
            const rango = calcularRangoGrafico(weekOffset, chartMode);
            const startDate = rango.startDate;
            const endDate = rango.endDate;
            isCurrentRange = rango.isCurrentRange;
            
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
        } catch (e) {
            console.warn('⚠️ Error obteniendo ventas diarias:', e);
        }

        // ============================================================
        // 🆕 CORRECCIONES #2 y #3: DÍAS SIN VENTAS
        // ============================================================
        let diasSinVentas = 0;
        let diasSinVentasDetalle = {};
        try {
            const diasSinVentasData = window.DBModule.query(
                `SELECT fecha, motivo, nota 
                 FROM dias_sin_ventas 
                 WHERE negocio_id = ? AND deleted_at IS NULL
                 ORDER BY fecha DESC`,
                [negocioId]
            );
            
            diasSinVentas = diasSinVentasData.length;
            
            for (const d of diasSinVentasData) {
                diasSinVentasDetalle[d.fecha] = {
                    motivo: d.motivo,
                    nota: d.nota || ''
                };
            }
            
            console.log(`📅 [Correcciones #2 y #3] Días sin ventas: ${diasSinVentas}`);
        } catch (e) {
            console.warn('⚠️ Error obteniendo días sin ventas:', e);
        }

        // ============================================================
        // DÍAS CON VENTAS, PROMEDIO, PRIMER DÍA
        // ============================================================
        let diasConVentas = 0;
        let promedioVentasDiarias = 0;
        let primerDiaVenta = null;
        
        try {
            const todasLasFechas = window.DBModule.query(
                `SELECT sale_date FROM sales WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0 ORDER BY sale_date ASC`,
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
        // 🆕 v2.2.5: + debtDetailsByClient (agrupación por cliente)
        // ============================================================
        let totalDebts = 0;
        let debtCount = 0;
        let debtDetails = [];
        let debtDetailsByClient = [];  // 🆕 v2.2.5
        try {
            const debtSales = window.DBModule.query(`
                SELECT id, product_name, total, buyer, sale_date, payment_method, quantity, is_debt, paid
                FROM sales 
                WHERE negocio_id = ? AND is_debt = 1 AND paid = 0 AND deleted_at IS NULL AND voided = 0
                ORDER BY sale_date ASC, id ASC
            `, [negocioId]);
            
            // Vista plana (compatibilidad, ya existía)
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
            
            // 🆕 v2.2.5: Vista agrupada por cliente
            const gruposPorCliente = {};
            for (const d of debtDetails) {
                const nombre = d.client_name;
                if (!gruposPorCliente[nombre]) {
                    gruposPorCliente[nombre] = {
                        client_name: nombre,
                        total: 0,
                        count: 0,
                        items: []
                    };
                }
                gruposPorCliente[nombre].total += d.remaining;
                gruposPorCliente[nombre].count += 1;
                gruposPorCliente[nombre].items.push({
                    id: d.id,
                    total: d.total,
                    remaining: d.remaining,
                    delivery_date: d.delivery_date,
                    product_name: d.product_name,
                    quantity: d.quantity,
                    payment_method: d.payment_method
                });
            }
            
            // Convertir a array y ordenar por total descendente
            debtDetailsByClient = Object.values(gruposPorCliente)
                .sort((a, b) => b.total - a.total);
            
            console.log(`💰 [Punto #5] Deudas: ${debtCount} ventas en ${debtDetailsByClient.length} cliente(s)`);
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
        // ============================================================
        let ordersTodayCount = 0;
        let ordersTomorrowCount = 0;
        let waitingListCount = 0;
        try {
            const hoyStr = hoyYYYYMMDD();
            const mananaStr = mananaYYYYMMDD();
            
            const conteoHoy = window.DBModule.contarPedidosYVentasFecha(hoyStr);
            ordersTodayCount = conteoHoy.pedidos;
            
            const conteoManana = window.DBModule.contarPedidosYVentasFecha(mananaStr);
            ordersTomorrowCount = conteoManana.pedidos;
            
            const waitingCount = window.DBModule.query(
                `SELECT COUNT(*) as count FROM waiting_list WHERE negocio_id = ? AND deleted_at IS NULL AND status = 'waiting'`,
                [negocioId]
            );
            waitingListCount = waitingCount[0]?.count || 0;
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
        // VENTAS LIBERADAS
        // ============================================================
        let releasedSales = { count: 0, total: 0 };
        try {
            const releasedResult = window.DBModule.query(`
                SELECT COUNT(*) as count, SUM(total) as total
                FROM sales
                WHERE negocio_id = ? AND is_liberated = 1 AND deleted_at IS NULL AND voided = 0
            `, [negocioId]);
            
            releasedSales = {
                count: releasedResult[0]?.count || 0,
                total: releasedResult[0]?.total || 0
            };
        } catch (e) {
            console.warn('⚠️ Error obteniendo ventas liberadas:', e);
        }

        // ============================================================
        // MEJOR Y PEOR DÍA DE VENTAS (histórico)
        // ============================================================
        let bestWorstDay = { best: null, worst: null };
        try {
            const todasLasVentas = window.DBModule.query(`
                SELECT sale_date, total FROM sales WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0
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
            }
        } catch (e) {
            console.warn('⚠️ Error obteniendo mejor/peor día:', e);
        }

        // ============================================================
        // VENTAS POR EMPLEADO (REGRESIÓN #5 CORREGIDA)
        // ============================================================
        let salesByEmployee = [];
        try {
            console.log('🔍 [REGRESIÓN #5] Consultando ventas por empleado...');
            
            const ventasPorUsuario = window.DBModule.query(`
                SELECT 
                    COALESCE(s.created_by, s.user_id) as vendedor_id,
                    COUNT(*) as count, 
                    SUM(s.total) as total,
                    u.name as user_name, 
                    u.username as user_username
                FROM sales s
                LEFT JOIN users u ON u.id = COALESCE(s.created_by, s.user_id)
                WHERE s.negocio_id = ? 
                  AND s.deleted_at IS NULL 
                  AND s.voided = 0
                GROUP BY COALESCE(s.created_by, s.user_id)
                ORDER BY total DESC
            `, [negocioId]);
            
            console.log('🔍 [REGRESIÓN #5] Resultado de query:', ventasPorUsuario);
            
            salesByEmployee = ventasPorUsuario.map(row => {
                const vendedorId = row.vendedor_id;
                const nombreFinal = row.user_name || row.user_username || `Usuario #${vendedorId}`;
                
                return {
                    user_id: vendedorId,
                    name: nombreFinal,
                    username: row.user_username || '',
                    count: row.count || 0,
                    total: row.total || 0
                };
            });
            
            console.log(`✅ [REGRESIÓN #5] ${salesByEmployee.length} empleado(s) con ventas:`, 
                salesByEmployee.map(e => `${e.name}: ${e.count} ventas ($${e.total.toFixed(2)})`));
            
            if (salesByEmployee.length === 0) {
                console.warn('⚠️ [REGRESIÓN #5] No se encontraron ventas por empleado. Ejecutando diagnóstico...');
                
                const diagnostico = window.DBModule.query(`
                    SELECT 
                        COUNT(*) as total_ventas,
                        COUNT(created_by) as con_created_by,
                        COUNT(user_id) as con_user_id,
                        COUNT(DISTINCT created_by) as vendedores_unicos_cb,
                        COUNT(DISTINCT user_id) as vendedores_unicos_uid
                    FROM sales 
                    WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0
                `, [negocioId]);
                
                console.log('🔍 [REGRESIÓN #5] Diagnóstico:', diagnostico[0]);
                
                if (diagnostico[0]?.total_ventas > 0) {
                    console.warn('⚠️ [REGRESIÓN #5] Hay ventas pero no se pudo asociar un vendedor');
                    
                    const fallback = window.DBModule.query(`
                        SELECT 
                            s.user_id as vendedor_id,
                            COUNT(*) as count, 
                            SUM(s.total) as total,
                            u.name as user_name, 
                            u.username as user_username
                        FROM sales s
                        LEFT JOIN users u ON u.id = s.user_id
                        WHERE s.negocio_id = ? 
                          AND s.deleted_at IS NULL 
                          AND s.voided = 0
                          AND s.user_id IS NOT NULL
                        GROUP BY s.user_id
                        ORDER BY total DESC
                    `, [negocioId]);
                    
                    if (fallback.length > 0) {
                        console.log('✅ [REGRESIÓN #5] Fallback exitoso:', fallback);
                        salesByEmployee = fallback.map(row => ({
                            user_id: row.vendedor_id,
                            name: row.user_name || row.user_username || `Usuario #${row.vendedor_id}`,
                            username: row.user_username || '',
                            count: row.count || 0,
                            total: row.total || 0
                        }));
                    }
                }
            }
            
        } catch (e) {
            console.error('❌ [REGRESIÓN #5] Error obteniendo ventas por empleado:', e);
            
            try {
                const fallback = window.DBModule.query(`
                    SELECT 
                        s.user_id as vendedor_id,
                        COUNT(*) as count, 
                        SUM(s.total) as total,
                        u.name as user_name, 
                        u.username as user_username
                    FROM sales s
                    LEFT JOIN users u ON u.id = s.user_id
                    WHERE s.negocio_id = ? 
                      AND s.deleted_at IS NULL 
                      AND s.voided = 0
                    GROUP BY s.user_id
                    ORDER BY total DESC
                `, [negocioId]);
                
                salesByEmployee = fallback.map(row => ({
                    user_id: row.vendedor_id,
                    name: row.user_name || row.user_username || `Usuario #${row.vendedor_id}`,
                    username: row.user_username || '',
                    count: row.count || 0,
                    total: row.total || 0
                }));
                
                console.log('✅ [REGRESIÓN #5] Fallback de emergencia aplicado:', salesByEmployee);
            } catch (e2) {
                console.error('❌ [REGRESIÓN #5] Fallback también falló:', e2);
            }
        }

        // ============================================================
        // 🆕 CORRECCIÓN N5: PROMEDIO DIARIO POR PRODUCTO
        // ============================================================
        let promedioProducto = null;
        try {
            const dashConfig = user.dashboard_config || window.DBModule.getUserDashboardConfig(user.id);
            const showProductoPromedio = dashConfig.show_producto_promedio === true;
            const productoPromedioId = dashConfig.producto_promedio_id || null;
            
            if (showProductoPromedio && productoPromedioId) {
                console.log(`📊 [N5] Calculando promedio para producto #${productoPromedioId}`);
                
                if (typeof window.DBModule.getPromedioDiarioProducto === 'function') {
                    const datos = window.DBModule.getPromedioDiarioProducto(productoPromedioId, negocioId);
                    const producto = window.DBModule.getProducto(productoPromedioId);
                    
                    promedioProducto = {
                        ...datos,
                        producto: producto ? {
                            id: producto.id,
                            nombre: producto.nombre,
                            precio_venta: producto.precio_venta,
                            unidad_venta: producto.unidad_venta
                        } : null,
                        configurado: true
                    };
                    
                    console.log(`✅ [N5] Promedio: $${promedioProducto.promedio.toFixed(2)}, Días: ${promedioProducto.dias_con_ventas}`);
                } else {
                    console.warn('⚠️ [N5] getPromedioDiarioProducto no disponible');
                    promedioProducto = {
                        configurado: true,
                        error: 'Función no disponible',
                        producto: null,
                        promedio: 0,
                        dias_con_ventas: 0,
                        total_vendido: 0,
                        total_unidades: 0,
                        mejor_dia: null
                    };
                }
            } else {
                console.log(`📊 [N5] Promedio de producto no configurado o inactivo`);
                promedioProducto = {
                    configurado: false,
                    producto: null,
                    promedio: 0,
                    dias_con_ventas: 0,
                    total_vendido: 0,
                    total_unidades: 0,
                    mejor_dia: null
                };
            }
        } catch (e) {
            console.warn('⚠️ [N5] Error calculando promedio del producto:', e);
            promedioProducto = {
                configurado: false,
                error: e.message,
                producto: null,
                promedio: 0,
                dias_con_ventas: 0,
                total_vendido: 0,
                total_unidades: 0,
                mejor_dia: null
            };
        }

        // ============================================================
        // RETORNAR OBJETO COMPLETO
        // ============================================================
        return {
            totalSales, totalRevenue, todaySalesCount, todayRevenue,
            // 🆕 v2.2.6: Diagnóstico de ingresos
            _diagnosticoIngresos,
            totalIncomeFromTransactions,
            pendingOrdersCount, 
            ordersTodayCount, 
            ordersTomorrowCount,
            waitingListCount,
            totalDebts, debtCount, debtDetails,
            // 🆕 v2.2.5: Agrupación de deudas por cliente
            debtDetailsByClient,
            topProducts, topClients, clientesDiferentes,
            diasConVentas, promedioVentasDiarias, primerDiaVenta,
            diasSinVentas,
            diasSinVentasDetalle,
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
            salesByEmployee: salesByEmployee,
            // 🆕 CORRECCIÓN N5: Promedio diario por producto
            promedioProducto: promedioProducto
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

console.log('📦 Dashboard Module cargado correctamente v2.2.7');
console.log('   🆕 v2.2.7 (011026) — Corrección N5:');
console.log('      ✅ Campo promedioProducto en getDashboardStats()');
console.log('      ✅ Lectura de show_producto_promedio y producto_promedio_id');
console.log('      ✅ Llamada a DBModule.getPromedioDiarioProducto()');
console.log('   🔄 Correcciones anteriores mantenidas:');
console.log('      • v2.2.6: Diagnóstico de ingresos (_diagnosticoIngresos)');
console.log('      • v2.2.5: Punto #5 — debtDetailsByClient');
console.log('      • v2.2.4: REGRESIÓN #5 — Ventas por empleado (COALESCE)');
console.log('      • v2.2.3: CORRECCIONES #2 y #3 — Días sin ventas');