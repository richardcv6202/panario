// ============================================================
// 📦 REPORTS MODULE - Panario (Generación de Reportes)
// CORREGIDO: Reporte de pedidos funcional
// CORREGIDO FASE 2 (160926):
//   - generateOrdersReport() ahora procesa filtros client/product/onlyDebts (Problema #10)
//   - generateSalesReport() ahora acepta más filtros (Problema #7)
// AÑADIDO (180926 v4):
//   - Nombre del negocio en el encabezado y pie de TODOS los reportes
//   - getNombreNegocioReporte() helper local
// 🆕 FASE 2.2 (200926 v5):
//   - NUEVO: generateWaitingListReport() — reporte PDF de la lista de espera
//   - Muestra posición, cliente, teléfono, producto, cantidad, total,
//     fecha de entrega y notas
//   - Tarjetas resumen: total clientes, unidades, monto
//   - Compatible con el botón "📄 Reporte PDF" del modal de gestión
//     de lista de espera en ui-orders.js
// 🆕 FASE 5 (#20) (200926 v6):
//   - NUEVO: generateDiasSinVentasReport() — reporte PDF de días sin ventas
//   - Muestra: fecha, día de la semana, motivo (con color), nota
//   - Tarjetas resumen: total días, motivo más frecuente, rango
//   - Gráfico de distribución por motivo
//   - Compatible con el botón "📄 Reporte PDF" del modal de días sin ventas
//     en ui-sales.js
// ============================================================

window.ReportsModule = {};

// ============================================================
// 🆕 HELPER: OBTENER NOMBRE DEL NEGOCIO PARA REPORTES
// ============================================================

/**
 * Devuelve el nombre del negocio actual para usar en reportes.
 * Usa window.getNombreNegocio() si existe (definido en app.js).
 * Fallback: "Panario".
 * 
 * @returns {string} Nombre del negocio
 */
function getNombreNegocioReporte() {
    try {
        if (typeof window.getNombreNegocio === 'function') {
            return window.getNombreNegocio();
        }
        
        // Fallback: intentar obtener del usuario actual
        const user = window.AuthModule?.getCurrentUser();
        if (user) {
            if (user.negocio && user.negocio.nombre) return user.negocio.nombre;
            if (user.business_name) return user.business_name;
        }
        
        return 'Panario';
    } catch (e) {
        console.warn('⚠️ Error obteniendo nombre del negocio para reporte:', e);
        return 'Panario';
    }
}

// ============================================================
// MOTIVOS DE DÍAS SIN VENTAS (para el reporte)
// ============================================================

const MOTIVOS_REPORTE_DIAS_SIN_VENTAS = {
    'apagon':        { label: '⚡ Apagón',           color: '#f59e0b' },
    'falta_insumos': { label: '🛒 Falta de insumos', color: '#ef4444' },
    'feriado':       { label: '🎉 Feriado',          color: '#8b5cf6' },
    'vacaciones':    { label: '🏖️ Vacaciones',       color: '#06b6d4' },
    'enfermedad':    { label: '🏥 Enfermedad',       color: '#ef4444' },
    'mantenimiento': { label: '🔧 Mantenimiento',    color: '#3b82f6' },
    'clima':         { label: '🌧️ Mal clima',        color: '#3b82f6' },
    'otro':          { label: '🔄 Otro',             color: '#94a3b8' }
};

function _getMotivoDSV(value) {
    return MOTIVOS_REPORTE_DIAS_SIN_VENTAS[value] || MOTIVOS_REPORTE_DIAS_SIN_VENTAS['otro'];
}

// ============================================================
// REPORTE DE VENTAS (CON FILTROS AMPLIADOS - Problema #7)
// ============================================================

function generateSalesReport(filters = {}) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) {
        window.showToast('❌ No hay usuario autenticado', 'error');
        return;
    }

    try {
        let sql = `
            SELECT s.*, p.nombre as producto_nombre 
            FROM sales s
            LEFT JOIN productos p ON s.producto_id = p.id
            WHERE s.user_id = ? AND s.deleted_at IS NULL AND s.voided = 0
        `;
        let params = [user.id];

        // Filtros básicos
        if (filters.from_date) {
            sql += ' AND DATE(s.sale_date, "localtime") >= DATE(?)';
            params.push(filters.from_date);
        }
        if (filters.to_date) {
            sql += ' AND DATE(s.sale_date, "localtime") <= DATE(?)';
            params.push(filters.to_date);
        }
        if (filters.payment_method) {
            sql += ' AND s.payment_method = ?';
            params.push(filters.payment_method);
        }

        // Filtro por cliente
        if (filters.client) {
            sql += ' AND LOWER(s.buyer) LIKE LOWER(?)';
            params.push('%' + filters.client + '%');
        }

        // Filtro por producto
        if (filters.product) {
            sql += ' AND (LOWER(s.product_name) LIKE LOWER(?) OR LOWER(p.nombre) LIKE LOWER(?))';
            const productTerm = '%' + filters.product + '%';
            params.push(productTerm, productTerm);
        }

        // Solo ventas liberadas
        if (filters.is_liberated === true) {
            sql += ' AND s.is_liberated = 1';
        } else if (filters.is_liberated === false) {
            sql += ' AND s.is_liberated = 0';
        }

        // Solo deudas
        if (filters.is_debt === true) {
            sql += ' AND s.is_debt = 1 AND s.paid = 0';
        } else if (filters.is_debt === false) {
            sql += ' AND s.is_debt = 0';
        }

        // Filtro por sesión
        if (filters.session) {
            sql += ' AND s.session = ?';
            params.push(filters.session);
        }

        sql += ' ORDER BY s.sale_date ASC';

        const sales = window.DBModule.query(sql, params);

        const totalVentas = sales.length;
        const totalIngresos = sales.reduce((sum, s) => sum + s.total, 0);
        const totalDeudas = sales.filter(s => s.is_debt === 1 && s.paid === 0).reduce((sum, s) => sum + s.total, 0);
        const totalLiberadas = sales.filter(s => s.is_liberated === 1).reduce((sum, s) => sum + s.total, 0);
        const countLiberadas = sales.filter(s => s.is_liberated === 1).length;

        const paymentMethods = {};
        sales.forEach(s => {
            const method = s.payment_method || 'cash';
            if (!paymentMethods[method]) paymentMethods[method] = { count: 0, total: 0 };
            paymentMethods[method].count++;
            paymentMethods[method].total += s.total;
        });

        const products = {};
        sales.forEach(s => {
            const name = s.producto_nombre || s.product_name || 'Producto';
            if (!products[name]) products[name] = { count: 0, total: 0 };
            products[name].count++;
            products[name].total += s.total;
        });

        // Clientes con más compras (si no se filtró por cliente)
        const clients = {};
        if (!filters.client) {
            sales.forEach(s => {
                const buyer = s.buyer;
                if (buyer && buyer !== 'Cliente ocasional' && buyer !== 'Cliente sin nombre') {
                    if (!clients[buyer]) clients[buyer] = { count: 0, total: 0 };
                    clients[buyer].count++;
                    clients[buyer].total += s.total;
                }
            });
        }

        const html = generateSalesReportHTML(sales, totalVentas, totalIngresos, totalDeudas, totalLiberadas, countLiberadas, paymentMethods, products, clients, filters);
        return html;

    } catch (error) {
        console.error('Error generando reporte de ventas:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
        return null;
    }
}

function generateSalesReportHTML(sales, totalVentas, totalIngresos, totalDeudas, totalLiberadas, countLiberadas, paymentMethods, products, clients, filters) {
    const nombreNegocio = getNombreNegocioReporte();
    
    const periodo = filters.from_date && filters.to_date ? 
        `${formatDateReport(filters.from_date)} al ${formatDateReport(filters.to_date)}` : 
        'Todos los períodos';

    let filterDesc = [];
    if (filters.client) filterDesc.push(`👤 Cliente: "${filters.client}"`);
    if (filters.product) filterDesc.push(`🏷️ Producto: "${filters.product}"`);
    if (filters.payment_method) filterDesc.push(`💳 Pago: ${filters.payment_method}`);
    if (filters.is_liberated === true) filterDesc.push('🚀 Solo liberadas');
    if (filters.is_debt === true) filterDesc.push('💳 Solo deudas');
    if (filters.session) filterDesc.push(`🕐 Sesión: ${filters.session}`);

    let productosHtml = '';
    const sortedProducts = Object.entries(products).sort((a, b) => b[1].total - a[1].total);
    sortedProducts.forEach(([name, data]) => {
        productosHtml += `
            <tr>
                <td>${name}</td>
                <td style="text-align: center;">${data.count}</td>
                <td style="text-align: right;">$${data.total.toFixed(2)}</td>
                <td style="text-align: right;">${totalIngresos > 0 ? ((data.total / totalIngresos) * 100).toFixed(1) : 0}%</td>
            </tr>
        `;
    });

    let clientsHtml = '';
    if (Object.keys(clients).length > 0) {
        const sortedClients = Object.entries(clients).sort((a, b) => b[1].total - a[1].total).slice(0, 20);
        sortedClients.forEach(([name, data]) => {
            clientsHtml += `
                <tr>
                    <td>${name}</td>
                    <td style="text-align: center;">${data.count}</td>
                    <td style="text-align: right;">$${data.total.toFixed(2)}</td>
                </tr>
            `;
        });
    }

    let paymentHtml = '';
    const paymentIcons = {
        'cash': '💵 Efectivo',
        'transfer': '🏦 Transferencia',
        'debt': '💳 Deuda',
        'other': '🔄 Otra'
    };
    Object.entries(paymentMethods).forEach(([method, data]) => {
        paymentHtml += `
            <tr>
                <td>${paymentIcons[method] || method}</td>
                <td style="text-align: center;">${data.count}</td>
                <td style="text-align: right;">$${data.total.toFixed(2)}</td>
                <td style="text-align: right;">${totalIngresos > 0 ? ((data.total / totalIngresos) * 100).toFixed(1) : 0}%</td>
            </tr>
        `;
    });

    const promedioVenta = totalVentas > 0 ? totalIngresos / totalVentas : 0;

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reporte de Ventas - ${nombreNegocio}</title>
            <style>
                * { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
                body { padding: 20px; background: #fff; font-size: 14px; }
                .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #f5a623; padding-bottom: 15px; }
                .header .negocio { color: #2d2d2d; font-size: 16px; font-weight: 700; margin-bottom: 4px; }
                .header h1 { color: #f5a623; font-size: 24px; }
                .header p { color: #666; font-size: 13px; margin-top: 2px; }
                .filters-info { background: #fef3d6; padding: 8px 12px; border-radius: 6px; margin-bottom: 15px; font-size: 12px; color: #92400e; }
                .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 25px; }
                .summary-card { background: #f8f9fa; padding: 12px 16px; border-radius: 8px; text-align: center; border-left: 4px solid #f5a623; }
                .summary-card .number { font-size: 22px; font-weight: 700; color: #f5a623; }
                .summary-card .label { font-size: 11px; color: #666; }
                .summary-card.liberadas { border-left-color: #8b5cf6; }
                .summary-card.liberadas .number { color: #8b5cf6; }
                .summary-card.deudas { border-left-color: #ef4444; }
                .summary-card.deudas .number { color: #ef4444; }
                .section { margin-top: 20px; }
                .section h3 { color: #333; margin-bottom: 10px; font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 6px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
                th { background: #f5a623; color: #fff; padding: 8px 10px; text-align: left; font-size: 12px; }
                td { padding: 6px 10px; border-bottom: 1px solid #eee; }
                tr:nth-child(even) { background: #fafafa; }
                .total-row { font-weight: 700; background: #f8f9fa; }
                .footer { margin-top: 25px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #eee; padding-top: 15px; }
                .footer .negocio { color: #666; font-weight: 600; font-size: 12px; margin-bottom: 4px; }
                .debt-highlight { color: #ef4444; font-weight: 600; }
                .liberated-highlight { color: #8b5cf6; font-weight: 600; }
                @media print {
                    body { padding: 10px; }
                    .summary-card { padding: 8px 12px; }
                    .summary-card .number { font-size: 18px; }
                    th, td { font-size: 11px; padding: 4px 8px; }
                }
                @media (max-width: 600px) {
                    body { padding: 10px; }
                    .header h1 { font-size: 18px; }
                    .summary { grid-template-columns: repeat(2, 1fr); gap: 8px; }
                    .summary-card .number { font-size: 16px; }
                    th, td { font-size: 10px; padding: 3px 6px; }
                    table { font-size: 11px; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="negocio">🏢 ${nombreNegocio}</div>
                <h1>📊 Reporte de Ventas</h1>
                <p>${periodo}</p>
                <p style="font-size: 12px; color: #94a3b8;">Generado: ${new Date().toLocaleString('es-ES')}</p>
            </div>

            ${filterDesc.length > 0 ? `<div class="filters-info">🔍 <strong>Filtros aplicados:</strong> ${filterDesc.join(' · ')}</div>` : ''}

            <div class="summary">
                <div class="summary-card">
                    <div class="number">${totalVentas}</div>
                    <div class="label">🛒 Total Ventas</div>
                </div>
                <div class="summary-card">
                    <div class="number">$${totalIngresos.toFixed(2)}</div>
                    <div class="label">💰 Total Ingresos</div>
                </div>
                <div class="summary-card">
                    <div class="number">$${promedioVenta.toFixed(2)}</div>
                    <div class="label">📊 Promedio por Venta</div>
                </div>
                ${countLiberadas > 0 ? `
                <div class="summary-card liberadas">
                    <div class="number">${countLiberadas}</div>
                    <div class="label">🚀 Ventas Liberadas ($${totalLiberadas.toFixed(2)})</div>
                </div>
                ` : ''}
                <div class="summary-card deudas">
                    <div class="number" style="color: #ef4444;">$${totalDeudas.toFixed(2)}</div>
                    <div class="label">💳 Deudas Pendientes</div>
                </div>
            </div>

            <div class="section">
                <h3>📦 Productos Más Vendidos</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th style="text-align: center;">Ventas</th>
                            <th style="text-align: right;">Total</th>
                            <th style="text-align: right;">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productosHtml || '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No hay datos</td></tr>'}
                    </tbody>
                </table>
            </div>

            ${clientsHtml ? `
            <div class="section">
                <h3>👥 Ventas por Cliente</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th style="text-align: center;">Compras</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${clientsHtml}
                    </tbody>
                </table>
            </div>
            ` : ''}

            <div class="section">
                <h3>💳 Métodos de Pago</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Método</th>
                            <th style="text-align: center;">Ventas</th>
                            <th style="text-align: right;">Total</th>
                            <th style="text-align: right;">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paymentHtml || '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No hay datos</td></tr>'}
                    </tbody>
                </table>
            </div>

            <div class="section">
                <h3>📋 Detalle de Ventas</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Producto</th>
                            <th>Cant.</th>
                            <th style="text-align: right;">Total</th>
                            <th>Método</th>
                            <th>Cliente</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sales.slice(0, 50).map(s => `
                            <tr>
                                <td>${new Date(s.sale_date).toLocaleDateString('es-ES')}</td>
                                <td>${s.producto_nombre || s.product_name || 'Producto'}${s.is_liberated === 1 ? ' 🚀' : ''}</td>
                                <td style="text-align: center;">${s.quantity}</td>
                                <td style="text-align: right; ${s.is_debt === 1 && s.paid === 0 ? 'color: #ef4444; font-weight: 600;' : ''}">$${s.total.toFixed(2)}</td>
                                <td>${s.payment_method}</td>
                                <td>${s.buyer || '—'}</td>
                            </tr>
                        `).join('')}
                        ${sales.length > 50 ? `<tr><td colspan="6" style="text-align: center; color: #94a3b8; font-size: 11px;">Mostrando 50 de ${sales.length} ventas</td></tr>` : ''}
                    </tbody>
                </table>
            </div>

            <div class="footer">
                <div class="negocio">🏢 ${nombreNegocio}</div>
                Reporte generado desde Panario 🍞 - ${new Date().toLocaleString('es-ES')}
            </div>
        </body>
        </html>
    `;
}

// ============================================================
// REPORTE DE PEDIDOS (CON FILTROS CORREGIDOS - Problema #10)
// ============================================================

function generateOrdersReport(filters = {}) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) {
        window.showToast('❌ No hay usuario autenticado', 'error');
        return;
    }

    try {
        let sql = `
            SELECT o.*
            FROM orders o
            WHERE o.user_id = ? AND o.deleted_at IS NULL
        `;
        let params = [user.id];

        if (filters.status) {
            sql += ' AND o.status = ?';
            params.push(filters.status);
        }
        if (filters.from_date) {
            sql += ' AND DATE(o.delivery_date, "localtime") >= DATE(?)';
            params.push(filters.from_date);
        }
        if (filters.to_date) {
            sql += ' AND DATE(o.delivery_date, "localtime") <= DATE(?)';
            params.push(filters.to_date);
        }

        // Filtro por cliente (búsqueda "contiene")
        if (filters.client) {
            sql += ' AND LOWER(o.client_name) LIKE LOWER(?)';
            params.push('%' + filters.client + '%');
        }

        // Filtro por producto
        if (filters.product) {
            sql += ` AND EXISTS (
                SELECT 1 FROM order_items oi 
                WHERE oi.order_id = o.id 
                  AND oi.deleted_at IS NULL
                  AND LOWER(oi.product_name) LIKE LOWER(?)
            )`;
            params.push('%' + filters.product + '%');
        }

        sql += ' ORDER BY o.delivery_date ASC';

        const orders = window.DBModule.query(sql, params);

        // Cargar items por separado para cada pedido
        let ordersWithItems = orders.map(order => {
            const items = window.DBModule.query(`
                SELECT oi.*, p.nombre as producto_nombre
                FROM order_items oi
                LEFT JOIN productos p ON oi.producto_id = p.id
                WHERE oi.order_id = ? AND oi.deleted_at IS NULL
            `, [order.id]);
            
            return {
                ...order,
                items: items,
                productos_nombres: items.map(i => i.producto_nombre || i.product_name).filter(Boolean).join(', ')
            };
        });

        // Filtro "solo con deuda pendiente"
        if (filters.onlyDebts) {
            ordersWithItems = ordersWithItems.filter(o => {
                const totalPaid = window.DBModule.query(
                    'SELECT SUM(amount) as total FROM payments WHERE order_id = ? AND deleted_at IS NULL',
                    [o.id]
                )[0]?.total || 0;
                return totalPaid < o.total;
            });
        }

        // Resumen por estado
        const statusCount = {};
        const statusLabels = {
            'pending': '⏳ Pendiente',
            'confirmed': '✅ Confirmado',
            'production': '🔨 Producción',
            'ready': '📦 Listo',
            'delivered': '🚚 Entregado',
            'cancelled': '❌ Cancelado',
            'waiting': '⏰ Lista de espera',
            'waiting_bought': '🔄 Compró lista espera'
        };
        ordersWithItems.forEach(o => {
            if (!statusCount[o.status]) statusCount[o.status] = 0;
            statusCount[o.status]++;
        });

        const totalPedidos = ordersWithItems.length;
        const totalEntregados = ordersWithItems.filter(o => o.status === 'delivered').length;
        const totalPendientes = ordersWithItems.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
        const totalCancelados = ordersWithItems.filter(o => o.status === 'cancelled').length;
        const totalEnEspera = ordersWithItems.filter(o => o.status === 'waiting' || o.status === 'waiting_bought').length;

        const html = generateOrdersReportHTML(ordersWithItems, totalPedidos, totalEntregados, totalPendientes, totalCancelados, totalEnEspera, statusCount, statusLabels, filters);
        return html;

    } catch (error) {
        console.error('Error generando reporte de pedidos:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
        return null;
    }
}

function generateOrdersReportHTML(orders, totalPedidos, totalEntregados, totalPendientes, totalCancelados, totalEnEspera, statusCount, statusLabels, filters) {
    const nombreNegocio = getNombreNegocioReporte();
    
    const periodo = filters.from_date && filters.to_date ? 
        `${formatDateReport(filters.from_date)} al ${formatDateReport(filters.to_date)}` : 
        'Todos los períodos';

    let filterDesc = [];
    if (filters.client) filterDesc.push(`👤 Cliente: "${filters.client}"`);
    if (filters.product) filterDesc.push(`🏷️ Producto: "${filters.product}"`);
    if (filters.status) filterDesc.push(`📌 Estado: ${statusLabels[filters.status] || filters.status}`);
    if (filters.onlyDebts) filterDesc.push('💳 Solo con deuda pendiente');

    let statusHtml = '';
    Object.entries(statusCount).forEach(([status, count]) => {
        statusHtml += `
            <tr>
                <td>${statusLabels[status] || status}</td>
                <td style="text-align: center;">${count}</td>
                <td style="text-align: right;">${totalPedidos > 0 ? ((count / totalPedidos) * 100).toFixed(1) : 0}%</td>
            </tr>
        `;
    });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reporte de Pedidos - ${nombreNegocio}</title>
            <style>
                * { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
                body { padding: 20px; background: #fff; font-size: 14px; }
                .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; }
                .header .negocio { color: #2d2d2d; font-size: 16px; font-weight: 700; margin-bottom: 4px; }
                .header h1 { color: #3b82f6; font-size: 24px; }
                .header p { color: #666; font-size: 13px; margin-top: 2px; }
                .filters-info { background: #dbeafe; padding: 8px 12px; border-radius: 6px; margin-bottom: 15px; font-size: 12px; color: #1e40af; }
                .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 25px; }
                .summary-card { background: #f8f9fa; padding: 12px 16px; border-radius: 8px; text-align: center; border-left: 4px solid #3b82f6; }
                .summary-card .number { font-size: 22px; font-weight: 700; color: #3b82f6; }
                .summary-card .label { font-size: 11px; color: #666; }
                .summary-card.entregados { border-left-color: #10b981; }
                .summary-card.entregados .number { color: #10b981; }
                .summary-card.pendientes { border-left-color: #f59e0b; }
                .summary-card.pendientes .number { color: #f59e0b; }
                .summary-card.cancelados { border-left-color: #ef4444; }
                .summary-card.cancelados .number { color: #ef4444; }
                .summary-card.espera { border-left-color: #8b5cf6; }
                .summary-card.espera .number { color: #8b5cf6; }
                .section { margin-top: 20px; }
                .section h3 { color: #333; margin-bottom: 10px; font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 6px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
                th { background: #3b82f6; color: #fff; padding: 8px 10px; text-align: left; font-size: 12px; }
                td { padding: 6px 10px; border-bottom: 1px solid #eee; }
                tr:nth-child(even) { background: #fafafa; }
                .footer { margin-top: 25px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #eee; padding-top: 15px; }
                .footer .negocio { color: #666; font-weight: 600; font-size: 12px; margin-bottom: 4px; }
                .status-badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 11px; }
                .status-pending { background: #f59e0b20; color: #f59e0b; }
                .status-delivered { background: #10b98120; color: #10b981; }
                .status-cancelled { background: #ef444420; color: #ef4444; }
                .status-waiting { background: #f59e0b20; color: #f59e0b; }
                .status-confirmed { background: #3b82f620; color: #3b82f6; }
                @media print {
                    body { padding: 10px; }
                    .summary-card { padding: 8px 12px; }
                    .summary-card .number { font-size: 18px; }
                    th, td { font-size: 11px; padding: 4px 8px; }
                }
                @media (max-width: 600px) {
                    body { padding: 10px; }
                    .header h1 { font-size: 18px; }
                    .summary { grid-template-columns: repeat(2, 1fr); gap: 8px; }
                    .summary-card .number { font-size: 16px; }
                    th, td { font-size: 10px; padding: 3px 6px; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="negocio">🏢 ${nombreNegocio}</div>
                <h1>📋 Reporte de Pedidos</h1>
                <p>${periodo}</p>
                <p style="font-size: 12px; color: #94a3b8;">Generado: ${new Date().toLocaleString('es-ES')}</p>
            </div>

            ${filterDesc.length > 0 ? `<div class="filters-info">🔍 <strong>Filtros aplicados:</strong> ${filterDesc.join(' · ')}</div>` : ''}

            <div class="summary">
                <div class="summary-card">
                    <div class="number">${totalPedidos}</div>
                    <div class="label">📋 Total Pedidos</div>
                </div>
                <div class="summary-card entregados">
                    <div class="number">${totalEntregados}</div>
                    <div class="label">🚚 Entregados</div>
                </div>
                <div class="summary-card pendientes">
                    <div class="number">${totalPendientes}</div>
                    <div class="label">⏳ Pendientes</div>
                </div>
                <div class="summary-card cancelados">
                    <div class="number">${totalCancelados}</div>
                    <div class="label">❌ Cancelados</div>
                </div>
                <div class="summary-card espera">
                    <div class="number">${totalEnEspera}</div>
                    <div class="label">⏰ En Lista de Espera</div>
                </div>
            </div>

            <div class="section">
                <h3>📊 Distribución por Estado</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Estado</th>
                            <th style="text-align: center;">Cantidad</th>
                            <th style="text-align: right;">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${statusHtml || '<tr><td colspan="3" style="text-align: center; color: #94a3b8;">No hay datos</td></tr>'}
                    </tbody>
                </table>
            </div>

            <div class="section">
                <h3>📋 Lista de Pedidos</h3>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Cliente</th>
                            <th>Fecha Entrega</th>
                            <th>Productos</th>
                            <th style="text-align: right;">Total</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.slice(0, 50).map(o => {
                            const statusClass = o.status === 'delivered' ? 'status-delivered' : 
                                              o.status === 'cancelled' ? 'status-cancelled' :
                                              o.status === 'pending' || o.status === 'waiting' ? 'status-pending' :
                                              o.status === 'confirmed' ? 'status-confirmed' : '';
                            return `
                                <tr>
                                    <td>${o.id}</td>
                                    <td>${o.client_name}</td>
                                    <td>${new Date(o.delivery_date).toLocaleDateString('es-ES')}</td>
                                    <td>${o.productos_nombres || '—'}</td>
                                    <td style="text-align: right;">$${o.total.toFixed(2)}</td>
                                    <td><span class="status-badge ${statusClass}">${statusLabels[o.status] || o.status}</span></td>
                                </tr>
                            `;
                        }).join('')}
                        ${orders.length > 50 ? `<tr><td colspan="6" style="text-align: center; color: #94a3b8; font-size: 11px;">Mostrando 50 de ${orders.length} pedidos</td></tr>` : ''}
                    </tbody>
                </table>
            </div>

            <div class="footer">
                <div class="negocio">🏢 ${nombreNegocio}</div>
                Reporte generado desde Panario 🍞 - ${new Date().toLocaleString('es-ES')}
            </div>
        </body>
        </html>
    `;
}

// ============================================================
// REPORTE DE INSUMOS
// ============================================================

function generateInsumosReport() {
    const user = window.AuthModule.getCurrentUser();
    if (!user) {
        window.showToast('❌ No hay usuario autenticado', 'error');
        return;
    }

    try {
        const insumos = window.DBModule.getInsumos();
        
        const totalInsumos = insumos.length;
        const totalValor = insumos.reduce((sum, i) => sum + (i.stock * i.costo_unitario), 0);
        const stockBajo = insumos.filter(i => i.stock <= i.stock_minimo).length;
        const sinStock = insumos.filter(i => i.stock <= 0).length;

        const html = generateInsumosReportHTML(insumos, totalInsumos, totalValor, stockBajo, sinStock);
        return html;

    } catch (error) {
        console.error('Error generando reporte de insumos:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
        return null;
    }
}

function generateInsumosReportHTML(insumos, totalInsumos, totalValor, stockBajo, sinStock) {
    const nombreNegocio = getNombreNegocioReporte();
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reporte de Insumos - ${nombreNegocio}</title>
            <style>
                * { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
                body { padding: 20px; background: #fff; font-size: 14px; }
                .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #10b981; padding-bottom: 15px; }
                .header .negocio { color: #2d2d2d; font-size: 16px; font-weight: 700; margin-bottom: 4px; }
                .header h1 { color: #10b981; font-size: 24px; }
                .header p { color: #666; font-size: 13px; margin-top: 2px; }
                .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 25px; }
                .summary-card { background: #f8f9fa; padding: 12px 16px; border-radius: 8px; text-align: center; border-left: 4px solid #10b981; }
                .summary-card .number { font-size: 22px; font-weight: 700; color: #10b981; }
                .summary-card .label { font-size: 11px; color: #666; }
                .summary-card.bajo { border-left-color: #f59e0b; }
                .summary-card.bajo .number { color: #f59e0b; }
                .summary-card.sin { border-left-color: #ef4444; }
                .summary-card.sin .number { color: #ef4444; }
                .section { margin-top: 20px; }
                .section h3 { color: #333; margin-bottom: 10px; font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 6px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
                th { background: #10b981; color: #fff; padding: 8px 10px; text-align: left; font-size: 12px; }
                td { padding: 6px 10px; border-bottom: 1px solid #eee; }
                tr:nth-child(even) { background: #fafafa; }
                .stock-bajo { color: #f59e0b; font-weight: 600; }
                .sin-stock { color: #ef4444; font-weight: 600; }
                .stock-ok { color: #10b981; }
                .footer { margin-top: 25px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #eee; padding-top: 15px; }
                .footer .negocio { color: #666; font-weight: 600; font-size: 12px; margin-bottom: 4px; }
                @media print {
                    body { padding: 10px; }
                    .summary-card { padding: 8px 12px; }
                    .summary-card .number { font-size: 18px; }
                    th, td { font-size: 11px; padding: 4px 8px; }
                }
                @media (max-width: 600px) {
                    body { padding: 10px; }
                    .header h1 { font-size: 18px; }
                    .summary { grid-template-columns: repeat(2, 1fr); gap: 8px; }
                    .summary-card .number { font-size: 16px; }
                    th, td { font-size: 10px; padding: 3px 6px; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="negocio">🏢 ${nombreNegocio}</div>
                <h1>🛒 Reporte de Insumos</h1>
                <p>Inventario actual</p>
                <p style="font-size: 12px; color: #94a3b8;">Generado: ${new Date().toLocaleString('es-ES')}</p>
            </div>

            <div class="summary">
                <div class="summary-card">
                    <div class="number">${totalInsumos}</div>
                    <div class="label">📦 Total Insumos</div>
                </div>
                <div class="summary-card">
                    <div class="number">$${totalValor.toFixed(2)}</div>
                    <div class="label">💰 Valor Total Inventario</div>
                </div>
                <div class="summary-card bajo">
                    <div class="number">${stockBajo}</div>
                    <div class="label">⚠️ Stock Bajo</div>
                </div>
                <div class="summary-card sin">
                    <div class="number">${sinStock}</div>
                    <div class="label">🚫 Sin Stock</div>
                </div>
            </div>

            <div class="section">
                <h3>📋 Lista de Insumos</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Insumo</th>
                            <th style="text-align: center;">Stock</th>
                            <th>Unidad</th>
                            <th style="text-align: right;">Costo Unit.</th>
                            <th style="text-align: right;">Valor Total</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${insumos.map(i => {
                            const estado = i.stock <= 0 ? '🚫 Sin stock' : 
                                          i.stock <= i.stock_minimo ? '⚠️ Stock bajo' : '✅ OK';
                            const estadoClass = i.stock <= 0 ? 'sin-stock' : 
                                              i.stock <= i.stock_minimo ? 'stock-bajo' : 'stock-ok';
                            return `
                                <tr>
                                    <td>${i.nombre}</td>
                                    <td style="text-align: center;">${i.stock}</td>
                                    <td>${i.unidad}</td>
                                    <td style="text-align: right;">$${i.costo_unitario.toFixed(2)}</td>
                                    <td style="text-align: right;">$${(i.stock * i.costo_unitario).toFixed(2)}</td>
                                    <td><span class="${estadoClass}">${estado}</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <div class="footer">
                <div class="negocio">🏢 ${nombreNegocio}</div>
                Reporte generado desde Panario 🍞 - ${new Date().toLocaleString('es-ES')}
            </div>
        </body>
        </html>
    `;
}

// ============================================================
// REPORTE DE DEUDAS
// ============================================================

function generateDebtsReport() {
    const user = window.AuthModule.getCurrentUser();
    if (!user) {
        window.showToast('❌ No hay usuario autenticado', 'error');
        return;
    }

    try {
        const debtSales = window.DBModule.query(`
            SELECT * FROM sales 
            WHERE user_id = ? AND is_debt = 1 AND paid = 0 AND deleted_at IS NULL AND voided = 0
            ORDER BY sale_date ASC
        `, [user.id]);

        const totalDebtSales = debtSales.reduce((sum, s) => sum + s.total, 0);

        const html = generateDebtsReportHTML(debtSales, totalDebtSales);
        return html;

    } catch (error) {
        console.error('Error generando reporte de deudas:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
        return null;
    }
}

function generateDebtsReportHTML(debtSales, totalDebtSales) {
    const nombreNegocio = getNombreNegocioReporte();
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reporte de Deudas - ${nombreNegocio}</title>
            <style>
                * { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
                body { padding: 20px; background: #fff; font-size: 14px; }
                .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #ef4444; padding-bottom: 15px; }
                .header .negocio { color: #2d2d2d; font-size: 16px; font-weight: 700; margin-bottom: 4px; }
                .header h1 { color: #ef4444; font-size: 24px; }
                .header p { color: #666; font-size: 13px; margin-top: 2px; }
                .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 25px; }
                .summary-card { background: #f8f9fa; padding: 12px 16px; border-radius: 8px; text-align: center; border-left: 4px solid #ef4444; }
                .summary-card .number { font-size: 22px; font-weight: 700; color: #ef4444; }
                .summary-card .label { font-size: 11px; color: #666; }
                .section { margin-top: 20px; }
                .section h3 { color: #333; margin-bottom: 10px; font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 6px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
                th { background: #ef4444; color: #fff; padding: 8px 10px; text-align: left; font-size: 12px; }
                td { padding: 6px 10px; border-bottom: 1px solid #eee; }
                tr:nth-child(even) { background: #fafafa; }
                .total-row { font-weight: 700; background: #fef2f2; }
                .footer { margin-top: 25px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #eee; padding-top: 15px; }
                .footer .negocio { color: #666; font-weight: 600; font-size: 12px; margin-bottom: 4px; }
                .debt-highlight { color: #ef4444; font-weight: 600; }
                @media print {
                    body { padding: 10px; }
                    .summary-card { padding: 8px 12px; }
                    .summary-card .number { font-size: 18px; }
                    th, td { font-size: 11px; padding: 4px 8px; }
                }
                @media (max-width: 600px) {
                    body { padding: 10px; }
                    .header h1 { font-size: 18px; }
                    .summary { grid-template-columns: repeat(2, 1fr); gap: 8px; }
                    .summary-card .number { font-size: 16px; }
                    th, td { font-size: 10px; padding: 3px 6px; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="negocio">🏢 ${nombreNegocio}</div>
                <h1>💳 Reporte de Deudas</h1>
                <p>Deudas pendientes de cobro (solo ventas)</p>
                <p style="font-size: 12px; color: #94a3b8;">Generado: ${new Date().toLocaleString('es-ES')}</p>
            </div>

            <div class="summary">
                <div class="summary-card">
                    <div class="number">${debtSales.length}</div>
                    <div class="label">👥 Total Deudores</div>
                </div>
                <div class="summary-card">
                    <div class="number">$${totalDebtSales.toFixed(2)}</div>
                    <div class="label">💰 Total Deudas</div>
                </div>
            </div>

            <div class="section">
                <h3>🛒 Deudas de Ventas</h3>
                ${debtSales.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Producto</th>
                                <th>Cliente</th>
                                <th style="text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${debtSales.map(s => `
                                <tr>
                                    <td>${new Date(s.sale_date).toLocaleDateString('es-ES')}</td>
                                    <td>${s.product_name}</td>
                                    <td>${s.buyer || '—'}</td>
                                    <td style="text-align: right;" class="debt-highlight">$${s.total.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="3" style="text-align: right;">TOTAL</td>
                                <td style="text-align: right;">$${totalDebtSales.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                ` : '<p style="color: #94a3b8; text-align: center;">No hay deudas pendientes</p>'}
            </div>

            <div class="footer">
                <div class="negocio">🏢 ${nombreNegocio}</div>
                Reporte generado desde Panario 🍞 - ${new Date().toLocaleString('es-ES')}
            </div>
        </body>
        </html>
    `;
}

// ============================================================
// REPORTE DE RECETAS
// ============================================================

async function generateRecipesReport() {
    const user = window.AuthModule.getCurrentUser();
    if (!user) {
        window.showToast('❌ No hay usuario autenticado', 'error');
        return null;
    }

    try {
        const recipesList = window.RecipesModule.getRecipes();
        const recipes = [];
        
        for (const r of recipesList) {
            const fullRecipe = await window.RecipesModule.getRecipe(r.id);
            if (fullRecipe) recipes.push(fullRecipe);
        }
        
        const nombreNegocio = getNombreNegocioReporte();
        
        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reporte de Recetas - ${nombreNegocio}</title>
                <style>
                    * { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
                    body { padding: 20px; background: #fff; font-size: 14px; }
                    .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #8b5cf6; padding-bottom: 15px; }
                    .header .negocio { color: #2d2d2d; font-size: 16px; font-weight: 700; margin-bottom: 4px; }
                    .header h1 { color: #8b5cf6; font-size: 24px; }
                    .header p { color: #666; font-size: 13px; margin-top: 2px; }
                    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 25px; }
                    .summary-card { background: #f8f9fa; padding: 12px 16px; border-radius: 8px; text-align: center; border-left: 4px solid #8b5cf6; }
                    .summary-card .number { font-size: 22px; font-weight: 700; color: #8b5cf6; }
                    .summary-card .label { font-size: 11px; color: #666; }
                    .section { margin-top: 20px; }
                    .section h3 { color: #333; margin-bottom: 10px; font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 6px; }
                    .recipe-card { border: 1px solid #eee; border-radius: 8px; padding: 12px; margin-bottom: 10px; background: #fafafa; }
                    .recipe-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
                    .recipe-name { font-size: 15px; font-weight: 600; margin: 0; }
                    .recipe-cost { font-size: 14px; font-weight: 700; color: #8b5cf6; }
                    .recipe-meta { margin-top: 8px; font-size: 13px; color: #666; }
                    .recipe-ingredients { margin-top: 6px; font-size: 12px; color: #666; background: #fff; padding: 6px 10px; border-radius: 4px; border: 1px solid #eee; }
                    .recipe-instructions { margin-top: 6px; font-size: 12px; color: #666; background: #fff; padding: 6px 10px; border-radius: 4px; border: 1px solid #eee; }
                    .shared-badge { display: inline-block; background: #3b82f620; color: #3b82f6; padding: 1px 8px; border-radius: 10px; font-size: 11px; margin-left: 6px; }
                    .fecha { font-size: 11px; color: #94a3b8; margin-top: 4px; }
                    .footer { margin-top: 25px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #eee; padding-top: 15px; }
                    .footer .negocio { color: #666; font-weight: 600; font-size: 12px; margin-bottom: 4px; }
                    @media print {
                        body { padding: 10px; }
                        .summary-card { padding: 8px 12px; }
                        .summary-card .number { font-size: 18px; }
                    }
                    @media (max-width: 600px) {
                        body { padding: 10px; }
                        .header h1 { font-size: 18px; }
                        .summary { grid-template-columns: repeat(2, 1fr); gap: 8px; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="negocio">🏢 ${nombreNegocio}</div>
                    <h1>📖 Reporte de Recetas</h1>
                    <p>${recipes.length} recetas registradas</p>
                    <p style="font-size: 12px; color: #94a3b8;">Generado: ${new Date().toLocaleString('es-ES')}</p>
                </div>

                <div class="summary">
                    <div class="summary-card">
                        <div class="number">${recipes.length}</div>
                        <div class="label">📖 Total Recetas</div>
                    </div>
                    <div class="summary-card">
                        <div class="number">${recipes.filter(r => r.shared === 1).length}</div>
                        <div class="label">🌐 Compartidas</div>
                    </div>
                    <div class="summary-card">
                        <div class="number">${recipes.filter(r => r.user_id === user.id).length}</div>
                        <div class="label">👤 Mis Recetas</div>
                    </div>
                </div>

                <div class="section">
                    <h3>📋 Lista de Recetas</h3>
                    ${recipes.map(recipe => {
                        const cost = window.RecipesModule.calculateRecipeCost(recipe) || { totalCost: 0, costPerUnit: 0 };
                        const isOwner = recipe.user_id === user.id;
                        const fechaCreacion = recipe.created_at 
                            ? new Date(recipe.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—';
                        
                        return `
                            <div class="recipe-card">
                                <div class="recipe-header">
                                    <div>
                                        <h4 class="recipe-name">
                                            ${recipe.name}
                                            ${recipe.shared ? '<span class="shared-badge">🌐 Compartida</span>' : ''}
                                        </h4>
                                        <div class="fecha">📅 ${fechaCreacion}</div>
                                        ${recipe.description ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #666;">${recipe.description}</p>` : ''}
                                    </div>
                                    <div style="text-align: right;">
                                        <div class="recipe-cost">$${(cost.totalCost || 0).toFixed(2)}</div>
                                        <div style="font-size: 12px; color: #666;">Costo total</div>
                                    </div>
                                </div>
                                <div class="recipe-meta">
                                    <strong>Rendimiento:</strong> ${recipe.yield_units || 1} ${recipe.yield_unit_type || 'unidades'} | 
                                    <strong>Costo por unidad:</strong> $${(cost.costPerUnit || 0).toFixed(2)}
                                </div>
                                ${recipe.receta_insumos && recipe.receta_insumos.length > 0 ? `
                                    <div class="recipe-ingredients">
                                        <strong>🧾 Insumos:</strong> ${recipe.receta_insumos.map(ri => `${ri.insumo_nombre || 'Insumo'}: ${ri.cantidad} ${ri.unidad}`).join(' | ')}
                                    </div>
                                ` : ''}
                                ${recipe.instructions ? `
                                    <div class="recipe-instructions">
                                        <strong>📋 Instrucciones:</strong> ${recipe.instructions}
                                    </div>
                                ` : ''}
                                <div style="margin-top: 4px; font-size: 11px; color: #94a3b8;">
                                    ${isOwner ? '👤 Propietario' : `👤 Creado por: ${recipe.creator_username || 'usuario'}`}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="footer">
                    <div class="negocio">🏢 ${nombreNegocio}</div>
                    Reporte generado desde Panario 🍞 - ${new Date().toLocaleString('es-ES')}
                </div>
            </body>
            </html>
        `;
        
        return html;

    } catch (error) {
        console.error('Error generando reporte de recetas:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
        return null;
    }
}

// ============================================================
// REPORTE DE LISTA DE ESPERA (FASE 2.2)
// ============================================================

/**
 * Genera el reporte PDF de la lista de espera actual.
 * 
 * Muestra:
 *  - Encabezado con nombre del negocio y fecha de generación
 *  - Tarjetas resumen: total clientes, unidades, monto
 *  - Tabla detallada: posición, cliente, teléfono, producto,
 *    cantidad, total, fecha de entrega, notas
 * 
 * @returns {Promise<string|null>} HTML del reporte o null si falla
 */
async function generateWaitingListReport() {
    try {
        // Verificar módulos
        if (!window.OrdersModule || typeof window.OrdersModule.getWaitingListWithDetails !== 'function') {
            window.showToast('⚠️ Módulo de pedidos no disponible', 'warning');
            return null;
        }
        
        // Obtener la lista actual
        const lista = await window.OrdersModule.getWaitingListWithDetails();
        
        if (!lista || lista.length === 0) {
            window.showToast('⚠️ La lista de espera está vacía', 'warning', 3000);
            return null;
        }
        
        const nombreNegocio = getNombreNegocioReporte();
        
        // Calcular totales
        const totalItems = lista.length;
        const totalCantidad = lista.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const totalMonto = lista.reduce((sum, item) => sum + (item.order_total || 0), 0);
        
        // HTML de las filas
        const filasHtml = lista.map((item, index) => {
            const posicion = item.position || (index + 1);
            const cliente = item.client_name || 'Cliente sin nombre';
            const telefono = item.client_phone || '—';
            const producto = item.product_name || 'Producto';
            const cantidad = item.quantity || 0;
            const total = item.order_total || 0;
            
            let fechaEntrega = '—';
            if (item.delivery_date) {
                try {
                    const fecha = new Date(item.delivery_date);
                    if (!isNaN(fecha.getTime())) {
                        fechaEntrega = fecha.toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                        });
                    }
                } catch (e) {
                    fechaEntrega = item.delivery_date.split('T')[0] || '—';
                }
            }
            
            const notas = item.notes ? item.notes.trim() : '';
            
            return `
                <tr>
                    <td style="text-align: center; font-weight: 700; color: #f59e0b;">#${posicion}</td>
                    <td>
                        <strong>${cliente}</strong>
                        ${notas ? `<br><span style="font-size: 11px; color: #94a3b8; font-style: italic;">📝 ${notas}</span>` : ''}
                    </td>
                    <td>${telefono}</td>
                    <td>${producto}</td>
                    <td style="text-align: center;">${cantidad}</td>
                    <td style="text-align: right; font-weight: 600; color: #f5a623;">$${total.toFixed(2)}</td>
                    <td style="text-align: center; font-size: 12px;">${fechaEntrega}</td>
                </tr>
            `;
        }).join('');
        
        // Construir HTML completo
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Lista de Espera - ${nombreNegocio}</title>
                <style>
                    * { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
                    body { padding: 20px; background: #fff; font-size: 14px; }
                    .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #f59e0b; padding-bottom: 15px; }
                    .header .negocio { color: #2d2d2d; font-size: 16px; font-weight: 700; margin-bottom: 4px; }
                    .header h1 { color: #f59e0b; font-size: 24px; }
                    .header p { color: #666; font-size: 13px; margin-top: 2px; }
                    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 25px; }
                    .summary-card { background: #f8f9fa; padding: 12px 16px; border-radius: 8px; text-align: center; border-left: 4px solid #f59e0b; }
                    .summary-card .number { font-size: 22px; font-weight: 700; color: #f59e0b; }
                    .summary-card .label { font-size: 11px; color: #666; }
                    .summary-card.unidades { border-left-color: #8b5cf6; }
                    .summary-card.unidades .number { color: #8b5cf6; }
                    .summary-card.monto { border-left-color: #10b981; }
                    .summary-card.monto .number { color: #10b981; }
                    .section { margin-top: 20px; }
                    .section h3 { color: #333; margin-bottom: 10px; font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 6px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
                    th { background: #f59e0b; color: #fff; padding: 8px 10px; text-align: left; font-size: 12px; }
                    td { padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
                    tr:nth-child(even) { background: #fafafa; }
                    .footer { margin-top: 25px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #eee; padding-top: 15px; }
                    .footer .negocio { color: #666; font-weight: 600; font-size: 12px; margin-bottom: 4px; }
                    .info-box { background: #fef9e7; border: 1px solid #f59e0b; border-radius: 8px; padding: 10px 14px; margin-bottom: 15px; font-size: 12px; color: #92400e; }
                    @media print {
                        body { padding: 10px; }
                        .summary-card { padding: 8px 12px; }
                        .summary-card .number { font-size: 18px; }
                        th, td { font-size: 11px; padding: 5px 8px; }
                        .info-box { display: none; }
                    }
                    @media (max-width: 600px) {
                        body { padding: 10px; }
                        .header h1 { font-size: 18px; }
                        .summary { grid-template-columns: repeat(2, 1fr); gap: 8px; }
                        .summary-card .number { font-size: 16px; }
                        th, td { font-size: 10px; padding: 4px 6px; }
                        table { font-size: 11px; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="negocio">🏢 ${nombreNegocio}</div>
                    <h1>⏰ Lista de Espera</h1>
                    <p>Clientes pendientes de atención</p>
                    <p style="font-size: 12px; color: #94a3b8;">Generado: ${new Date().toLocaleString('es-ES')}</p>
                </div>

                <div class="info-box">
                    💡 <strong>Lista de espera:</strong> Clientes que están aguardando disponibilidad de producto. Se atienden en orden de llegada (posición #1 primero).
                </div>

                <div class="summary">
                    <div class="summary-card">
                        <div class="number">${totalItems}</div>
                        <div class="label">👥 Clientes en espera</div>
                    </div>
                    <div class="summary-card unidades">
                        <div class="number">${totalCantidad}</div>
                        <div class="label">📦 Unidades solicitadas</div>
                    </div>
                    <div class="summary-card monto">
                        <div class="number">$${totalMonto.toFixed(2)}</div>
                        <div class="label">💰 Monto total</div>
                    </div>
                </div>

                <div class="section">
                    <h3>📋 Detalle de la lista (${totalItems} ${totalItems === 1 ? 'cliente' : 'clientes'})</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style="text-align: center; width: 50px;">#</th>
                                <th>Cliente</th>
                                <th style="width: 120px;">Teléfono</th>
                                <th>Producto</th>
                                <th style="text-align: center; width: 60px;">Cant.</th>
                                <th style="text-align: right; width: 90px;">Total</th>
                                <th style="text-align: center; width: 100px;">Entrega</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filasHtml}
                        </tbody>
                        <tfoot>
                            <tr style="background: #fef3d6; font-weight: 700;">
                                <td colspan="4" style="text-align: right; border-top: 2px solid #f59e0b;">TOTAL</td>
                                <td style="text-align: center; border-top: 2px solid #f59e0b;">${totalCantidad}</td>
                                <td style="text-align: right; color: #f59e0b; border-top: 2px solid #f59e0b;">$${totalMonto.toFixed(2)}</td>
                                <td style="border-top: 2px solid #f59e0b;"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div class="footer">
                    <div class="negocio">🏢 ${nombreNegocio}</div>
                    Reporte generado desde Panario 🍞 - ${new Date().toLocaleString('es-ES')}
                </div>
            </body>
            </html>
        `;
        
        return html;
        
    } catch (error) {
        console.error('❌ Error generando reporte de lista de espera:', error);
        window.showToast('❌ Error: ' + error.message, 'error', 5000);
        return null;
    }
}

// ============================================================
// 🆕 FASE 5 (#20): REPORTE DE DÍAS SIN VENTAS
// ============================================================

/**
 * Genera el reporte PDF de días sin ventas.
 * 
 * Muestra:
 *  - Encabezado con nombre del negocio
 *  - Tarjetas resumen: total días, motivo más frecuente, rango
 *  - Distribución por motivo
 *  - Tabla detallada: fecha, día de la semana, motivo, nota
 * 
 * @returns {Promise<string|null>} HTML del reporte o null si falla
 */
async function generateDiasSinVentasReport() {
    try {
        // Verificar módulo de BD
        if (!window.DBModule || typeof window.DBModule.getDiasSinVentas !== 'function') {
            window.showToast('⚠️ Módulo de base de datos no disponible', 'warning');
            return null;
        }
        
        // Obtener todos los días sin ventas
        const dias = window.DBModule.getDiasSinVentas();
        
        if (!dias || dias.length === 0) {
            window.showToast('⚠️ No hay días sin ventas registrados', 'warning', 3000);
            return null;
        }
        
        const nombreNegocio = getNombreNegocioReporte();
        
        // Calcular totales
        const totalDias = dias.length;
        
        // Contar por motivo
        const porMotivo = {};
        dias.forEach(d => {
            const motivo = d.motivo || 'otro';
            if (!porMotivo[motivo]) porMotivo[motivo] = 0;
            porMotivo[motivo]++;
        });
        
        // Motivo más frecuente
        let motivoFrecuente = null;
        let maxCount = 0;
        Object.entries(porMotivo).forEach(([motivo, count]) => {
            if (count > maxCount) {
                maxCount = count;
                motivoFrecuente = motivo;
            }
        });
        const motivoFrecuenteObj = motivoFrecuente ? _getMotivoDSV(motivoFrecuente) : null;
        
        // Rango de fechas
        const fechasOrdenadas = dias.map(d => d.fecha).sort();
        const fechaMin = fechasOrdenadas[0];
        const fechaMax = fechasOrdenadas[fechasOrdenadas.length - 1];
        
        // Nombre del día de la semana
        const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        
        function formatearFechaConDia(fechaStr) {
            if (!fechaStr) return '—';
            try {
                const parts = fechaStr.split('-');
                const fecha = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                return `${DIAS_SEMANA[fecha.getDay()]}, ${parseInt(parts[2])} ${MESES_CORTO[fecha.getMonth()]} ${parseInt(parts[0])}`;
            } catch (e) {
                return fechaStr;
            }
        }
        
        function formatearFechaCorta(fechaStr) {
            if (!fechaStr) return '—';
            try {
                const parts = fechaStr.split('-');
                return `${parseInt(parts[2])} ${MESES_CORTO[parseInt(parts[1]) - 1]} ${parseInt(parts[0])}`;
            } catch (e) {
                return fechaStr;
            }
        }
        
        // Filas de la tabla (ordenadas por fecha descendente)
        const filasHtml = dias.map(d => {
            const motivoObj = _getMotivoDSV(d.motivo);
            const fechaConDia = formatearFechaConDia(d.fecha);
            
            return `
                <tr>
                    <td style="white-space: nowrap;">${formatearFechaCorta(d.fecha)}</td>
                    <td style="font-size: 12px; color: #666;">${fechaConDia.split(',')[0]}</td>
                    <td>
                        <span style="display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 600; background: ${motivoObj.color}20; color: ${motivoObj.color};">
                            ${motivoObj.label}
                        </span>
                    </td>
                    <td style="font-size: 12px; color: #666; font-style: italic;">
                        ${d.nota ? d.nota : '—'}
                    </td>
                </tr>
            `;
        }).join('');
        
        // Distribución por motivo
        const motivosStatsHtml = Object.entries(porMotivo)
            .sort((a, b) => b[1] - a[1])
            .map(([motivo, count]) => {
                const obj = _getMotivoDSV(motivo);
                const porcentaje = ((count / totalDias) * 100).toFixed(1);
                return `
                    <tr>
                        <td>
                            <span style="display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 600; background: ${obj.color}20; color: ${obj.color};">
                                ${obj.label}
                            </span>
                        </td>
                        <td style="text-align: center;">${count}</td>
                        <td style="text-align: right;">${porcentaje}%</td>
                    </tr>
                `;
            }).join('');
        
        // Construir HTML completo
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Días sin Ventas - ${nombreNegocio}</title>
                <style>
                    * { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
                    body { padding: 20px; background: #fff; font-size: 14px; }
                    .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #06b6d4; padding-bottom: 15px; }
                    .header .negocio { color: #2d2d2d; font-size: 16px; font-weight: 700; margin-bottom: 4px; }
                    .header h1 { color: #06b6d4; font-size: 24px; }
                    .header p { color: #666; font-size: 13px; margin-top: 2px; }
                    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 25px; }
                    .summary-card { background: #f8f9fa; padding: 12px 16px; border-radius: 8px; text-align: center; border-left: 4px solid #06b6d4; }
                    .summary-card .number { font-size: 22px; font-weight: 700; color: #06b6d4; }
                    .summary-card .label { font-size: 11px; color: #666; }
                    .summary-card .sub { font-size: 10px; color: #94a3b8; margin-top: 4px; }
                    .section { margin-top: 20px; }
                    .section h3 { color: #333; margin-bottom: 10px; font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 6px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
                    th { background: #06b6d4; color: #fff; padding: 8px 10px; text-align: left; font-size: 12px; }
                    td { padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: middle; }
                    tr:nth-child(even) { background: #fafafa; }
                    .total-row { font-weight: 700; background: #ecfeff; }
                    .footer { margin-top: 25px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #eee; padding-top: 15px; }
                    .footer .negocio { color: #666; font-weight: 600; font-size: 12px; margin-bottom: 4px; }
                    .info-box { background: #ecfeff; border: 1px solid #06b6d4; border-radius: 8px; padding: 10px 14px; margin-bottom: 15px; font-size: 12px; color: #0e7490; }
                    @media print {
                        body { padding: 10px; }
                        .summary-card { padding: 8px 12px; }
                        .summary-card .number { font-size: 18px; }
                        th, td { font-size: 11px; padding: 4px 8px; }
                        .info-box { display: none; }
                    }
                    @media (max-width: 600px) {
                        body { padding: 10px; }
                        .header h1 { font-size: 18px; }
                        .summary { grid-template-columns: repeat(2, 1fr); gap: 8px; }
                        .summary-card .number { font-size: 16px; }
                        th, td { font-size: 10px; padding: 3px 6px; }
                        table { font-size: 11px; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="negocio">🏢 ${nombreNegocio}</div>
                    <h1>📅 Reporte de Días sin Ventas</h1>
                    <p>Días sin actividad registrados</p>
                    <p style="font-size: 12px; color: #94a3b8;">Generado: ${new Date().toLocaleString('es-ES')}</p>
                </div>

                <div class="info-box">
                    💡 <strong>¿Qué es esto?</strong> Estos son los días en los que <strong>no tuviste actividad</strong> (apagones, vacaciones, feriados, etc.). Registrarlos ayuda a entender mejor las estadísticas y a excluirlos de los cálculos de promedio.
                </div>

                <div class="summary">
                    <div class="summary-card">
                        <div class="number">${totalDias}</div>
                        <div class="label">📅 Total días</div>
                    </div>
                    ${motivoFrecuenteObj ? `
                    <div class="summary-card" style="border-left-color: ${motivoFrecuenteObj.color};">
                        <div class="number" style="color: ${motivoFrecuenteObj.color};">${motivoFrecuenteObj.label}</div>
                        <div class="label">📌 Motivo más frecuente (${maxCount})</div>
                    </div>
                    ` : ''}
                    <div class="summary-card">
                        <div class="number" style="font-size: 14px;">${formatearFechaCorta(fechaMin)}</div>
                        <div class="sub">→ ${formatearFechaCorta(fechaMax)}</div>
                        <div class="label">📅 Rango de fechas</div>
                    </div>
                </div>

                <div class="section">
                    <h3>📊 Distribución por Motivo</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Motivo</th>
                                <th style="text-align: center;">Cantidad</th>
                                <th style="text-align: right;">%</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${motivosStatsHtml}
                            <tr class="total-row">
                                <td style="text-align: right;">TOTAL</td>
                                <td style="text-align: center;">${totalDias}</td>
                                <td style="text-align: right;">100%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <h3>📋 Detalle de Días sin Ventas (${totalDias})</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 110px;">Fecha</th>
                                <th style="width: 90px;">Día</th>
                                <th style="width: 180px;">Motivo</th>
                                <th>Nota</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filasHtml}
                        </tbody>
                    </table>
                </div>

                <div class="footer">
                    <div class="negocio">🏢 ${nombreNegocio}</div>
                    Reporte generado desde Panario 🍞 - ${new Date().toLocaleString('es-ES')}
                </div>
            </body>
            </html>
        `;
        
        return html;
        
    } catch (error) {
        console.error('❌ Error generando reporte de días sin ventas:', error);
        window.showToast('❌ Error: ' + error.message, 'error', 5000);
        return null;
    }
}

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function formatDateReport(dateStr) {
    if (!dateStr) return '—';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

function printReport(html) {
    if (!html) {
        window.showToast('❌ No se pudo generar el reporte', 'error');
        return;
    }

    const win = window.open('', '_blank');
    if (!win) {
        window.showToast('❌ Permite ventanas emergentes', 'error');
        return;
    }

    win.document.write(html);
    win.document.close();
    setTimeout(() => {
        win.print();
    }, 500);
}

// ============================================================
// EXPORTACIÓN
// ============================================================

window.ReportsModule = {
    generateSalesReport: generateSalesReport,
    generateOrdersReport: generateOrdersReport,
    generateInsumosReport: generateInsumosReport,
    generateDebtsReport: generateDebtsReport,
    generateRecipesReport: generateRecipesReport,
    // 🆕 FASE 2.2
    generateWaitingListReport: generateWaitingListReport,
    // 🆕 FASE 5 (#20)
    generateDiasSinVentasReport: generateDiasSinVentasReport,
    printReport: printReport,
    // 🆕 Helper exportado
    getNombreNegocioReporte: getNombreNegocioReporte
};

console.log('📦 Reports Module cargado correctamente v2.1.1 (FASE 5 #20: reporte de días sin ventas)');