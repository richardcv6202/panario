// ============================================================
// 📦 UI DASHBOARD - Panario (Panel de Control)
// ============================================================

// Renderizar dashboard
async function renderDashboardView() {
    const main = document.getElementById('mainContent');
    
    main.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
            <h2 style="margin: 0;">📊 Panel de Control</h2>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="refreshDashboard()" class="btn secondary" style="padding: 6px 16px; font-size: 13px; width: auto;">
                    🔄 Actualizar
                </button>
                <button onclick="exportDashboardReport()" class="btn primary" style="padding: 6px 16px; font-size: 13px; width: auto;">
                    📥 Exportar Reporte
                </button>
            </div>
        </div>
        
        <!-- Tarjetas de estadísticas -->
        <div id="dashboard-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 16px;">
            <div class="card" style="padding: 14px; text-align: center;">
                <div style="font-size: 11px; color: var(--text-light);">🛒 Ventas totales</div>
                <div style="font-size: 22px; font-weight: 700; color: var(--primary);" id="stat-total-sales">-</div>
            </div>
            <div class="card" style="padding: 14px; text-align: center;">
                <div style="font-size: 11px; color: var(--text-light);">💰 Ingresos</div>
                <div style="font-size: 22px; font-weight: 700; color: #10b981;" id="stat-revenue">-</div>
            </div>
            <div class="card" style="padding: 14px; text-align: center;">
                <div style="font-size: 11px; color: var(--text-light);">📤 Gastos</div>
                <div style="font-size: 22px; font-weight: 700; color: #ef4444;" id="stat-expenses">-</div>
            </div>
            <div class="card" style="padding: 14px; text-align: center;">
                <div style="font-size: 11px; color: var(--text-light);">📈 Ganancia</div>
                <div style="font-size: 22px; font-weight: 700; color: #3b82f6;" id="stat-profit">-</div>
            </div>
            <div class="card" style="padding: 14px; text-align: center;">
                <div style="font-size: 11px; color: var(--text-light);">📋 Pedidos pendientes</div>
                <div style="font-size: 22px; font-weight: 700; color: #f59e0b;" id="stat-pending-orders">-</div>
            </div>
            <div class="card" style="padding: 14px; text-align: center;">
                <div style="font-size: 11px; color: var(--text-light);">💳 Deudas</div>
                <div style="font-size: 22px; font-weight: 700; color: #ef4444;" id="stat-debts">-</div>
            </div>
        </div>
        
        <!-- Gráficos -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div class="card">
                <h3 style="margin: 0 0 12px 0; font-size: 14px;">📈 Ventas diarias (últimos 7 días)</h3>
                <div id="daily-sales-chart" style="height: 200px; display: flex; align-items: flex-end; gap: 4px; padding-top: 8px;">
                    <div style="text-align: center; width: 100%; color: var(--text-light); font-size: 13px; padding: 20px 0;">
                        Cargando gráfico...
                    </div>
                </div>
            </div>
            <div class="card">
                <h3 style="margin: 0 0 12px 0; font-size: 14px;">🏷️ Productos más vendidos</h3>
                <div id="top-products" style="font-size: 13px;">
                    <div style="text-align: center; padding: 20px 0; color: var(--text-light);">
                        Cargando productos...
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Métodos de pago -->
        <div class="card">
            <h3 style="margin: 0 0 12px 0; font-size: 14px;">💳 Métodos de pago</h3>
            <div id="payment-methods" style="display: flex; gap: 16px; flex-wrap: wrap;">
                <div style="text-align: center; padding: 20px 0; color: var(--text-light); width: 100%;">
                    Cargando métodos de pago...
                </div>
            </div>
        </div>
        
        <!-- Acciones rápidas -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
            <button onclick="window.navigate('orders')" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                📋 Ver Pedidos
            </button>
            <button onclick="window.navigate('sales')" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                💰 Ver Ventas
            </button>
            <button onclick="window.showDebtsView()" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                💳 Ver Deudas
            </button>
            <button onclick="window.navigate('recipes')" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                📖 Ver Recetas
            </button>
        </div>
    `;
    
    // Cargar datos del dashboard
    await loadDashboardData();
}

// Cargar datos del dashboard
async function loadDashboardData() {
    try {
        const stats = await window.DashboardModule.getDashboardStats();
        if (!stats) {
            console.error('No se pudieron obtener estadísticas');
            return;
        }

        // Actualizar tarjetas
        document.getElementById('stat-total-sales').textContent = stats.totalSales;
        document.getElementById('stat-revenue').textContent = `$${stats.totalRevenue.toFixed(2)}`;
        document.getElementById('stat-expenses').textContent = `$${stats.totalExpenses.toFixed(2)}`;
        document.getElementById('stat-profit').textContent = `$${stats.netProfit.toFixed(2)}`;
        document.getElementById('stat-pending-orders').textContent = stats.pendingOrdersCount;
        document.getElementById('stat-debts').textContent = `$${stats.totalDebts.toFixed(2)}`;

        // Actualizar gráfico de ventas diarias
        renderDailySalesChart(stats.dailySales);

        // Actualizar productos más vendidos
        renderTopProducts(stats.topProducts);

        // Actualizar métodos de pago
        renderPaymentMethods(stats.paymentMethods);

    } catch (error) {
        console.error('Error cargando dashboard:', error);
        window.showToast('❌ Error cargando dashboard: ' + error.message, 'error');
    }
}

// Renderizar gráfico de ventas diarias
function renderDailySalesChart(dailySales) {
    const container = document.getElementById('daily-sales-chart');
    if (!container) return;

    if (!dailySales || dailySales.length === 0 || dailySales.every(d => d.total === 0)) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px 0; color: var(--text-light); width: 100%;">
                No hay ventas en los últimos 7 días
            </div>
        `;
        return;
    }

    const maxValue = Math.max(...dailySales.map(d => d.total), 1);
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const today = new Date().getDay();

    container.innerHTML = `
        <div style="display: flex; align-items: flex-end; gap: 6px; height: 180px; padding: 4px 0;">
            ${dailySales.map((d, i) => {
                const height = (d.total / maxValue) * 160;
                const dayIndex = (today - 6 + i + 7) % 7;
                return `
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end;">
                        <div style="font-size: 10px; color: var(--text-light);">$${d.total.toFixed(1)}</div>
                        <div style="width: 100%; height: ${height}px; min-height: 4px; background: ${d.total > 0 ? 'var(--primary)' : '#e2e8f0'}; border-radius: 4px 4px 0 0; transition: height 0.5s ease; position: relative;">
                            ${d.total > 0 ? `<div style="position: absolute; top: -16px; right: -2px; font-size: 8px; color: var(--primary);">●</div>` : ''}
                        </div>
                        <div style="font-size: 10px; color: var(--text-light);">${days[dayIndex]}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Renderizar productos más vendidos
function renderTopProducts(topProducts) {
    const container = document.getElementById('top-products');
    if (!container) return;

    if (!topProducts || topProducts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 10px 0; color: var(--text-light);">
                No hay productos registrados
            </div>
        `;
        return;
    }

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

    container.innerHTML = topProducts.map((p, i) => `
        <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid var(--border-color);">
            <span style="font-size: 11px; font-weight: 600; color: ${colors[i % colors.length]}; min-width: 24px;">#${i + 1}</span>
            <span style="flex: 1; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.product_name}</span>
            <span style="font-size: 12px; color: var(--text-light);">${p.sales_count} ventas</span>
            <span style="font-size: 13px; font-weight: 600; color: var(--primary);">$${p.total_revenue.toFixed(2)}</span>
        </div>
    `).join('');
}

// Renderizar métodos de pago
function renderPaymentMethods(paymentMethods) {
    const container = document.getElementById('payment-methods');
    if (!container) return;

    if (!paymentMethods || paymentMethods.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 10px 0; color: var(--text-light); width: 100%;">
                No hay métodos de pago registrados
            </div>
        `;
        return;
    }

    const icons = {
        'cash': '💵',
        'transfer': '🏦',
        'debt': '💳',
        'other': '🔄'
    };

    const colors = {
        'cash': '#10b981',
        'transfer': '#3b82f6',
        'debt': '#ef4444',
        'other': '#8b5cf6'
    };

    const total = paymentMethods.reduce((sum, p) => sum + p.total, 0);

    container.innerHTML = paymentMethods.map(p => {
        const percentage = total > 0 ? (p.total / total * 100) : 0;
        return `
            <div style="flex: 1; min-width: 80px; text-align: center; padding: 8px; background: var(--bg); border-radius: 8px;">
                <div style="font-size: 24px;">${icons[p.payment_method] || '💵'}</div>
                <div style="font-size: 13px; font-weight: 600; color: ${colors[p.payment_method] || '#94a3b8'};">
                    ${p.payment_method}
                </div>
                <div style="font-size: 14px; font-weight: 700;">$${p.total.toFixed(2)}</div>
                <div style="font-size: 11px; color: var(--text-light);">${p.count} ventas</div>
                <div style="width: 100%; height: 4px; background: #e2e8f0; border-radius: 2px; margin-top: 4px; overflow: hidden;">
                    <div style="width: ${percentage}%; height: 100%; background: ${colors[p.payment_method] || '#94a3b8'}; border-radius: 2px; transition: width 0.5s ease;"></div>
                </div>
            </div>
        `;
    }).join('');
}

// Refrescar dashboard
async function refreshDashboard() {
    window.showToast('🔄 Actualizando dashboard...', 'info', 1000);
    await loadDashboardData();
    window.showToast('✅ Dashboard actualizado', 'success', 1500);
}

// Exportar reporte (versión simple)
function exportDashboardReport() {
    // Obtener datos del dashboard
    window.DashboardModule.getDashboardStats().then(stats => {
        if (!stats) {
            window.showToast('❌ No se pudo generar el reporte', 'error');
            return;
        }

        // Crear texto del reporte
        const report = `
========================================
    📊 PANARIO - REPORTE DE NEGOCIO
========================================
Fecha: ${new Date().toLocaleString('es-ES')}
----------------------------------------

📈 RESUMEN GENERAL
  Ventas totales: ${stats.totalSales}
  Ingresos totales: $${stats.totalRevenue.toFixed(2)}
  Gastos totales: $${stats.totalExpenses.toFixed(2)}
  Ganancia neta: $${stats.netProfit.toFixed(2)}
  Pedidos pendientes: ${stats.pendingOrdersCount}
  Deudas pendientes: $${stats.totalDebts.toFixed(2)}
  Recetas guardadas: ${stats.totalRecipes}

📊 VENTAS RECIENTES (7 días)
${stats.dailySales.map(d => `  ${d.date}: $${d.total.toFixed(2)}`).join('\n')}

🏷️ PRODUCTOS MÁS VENDIDOS
${stats.topProducts.map((p, i) => `  ${i+1}. ${p.product_name}: ${p.sales_count} ventas - $${p.total_revenue.toFixed(2)}`).join('\n')}

💳 MÉTODOS DE PAGO
${stats.paymentMethods.map(p => `  ${p.payment_method}: $${p.total.toFixed(2)} (${p.count} ventas)`).join('\n')}

----------------------------------------
Reporte generado desde Panario 🍞
`;

        // Descargar como archivo de texto
        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-panario-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        window.showToast('✅ Reporte descargado', 'success', 2000);
    }).catch(error => {
        console.error('Error generando reporte:', error);
        window.showToast('❌ Error generando reporte', 'error');
    });
}

// Exportar funciones globales
window.renderDashboardView = renderDashboardView;
window.loadDashboardData = loadDashboardData;
window.refreshDashboard = refreshDashboard;
window.exportDashboardReport = exportDashboardReport;

console.log('📦 UI Dashboard Module cargado correctamente');