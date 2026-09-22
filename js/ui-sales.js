// ============================================================
// 📦 UI SALES - Panario (Ventas y Finanzas con ventas liberadas)
// CORREGIDO: Origen del pago en gastos + Reporte de gastos
// AÑADIDO: FASE 12 - Botón "🏆 Premios"
// CORREGIDO FASE 2 (160926): Reporte de ventas con filtros ampliados
// CORREGIDO FASE 4B (170926): 
//   - registerSalePayment() ahora desactiva is_debt = 0 al cobrar
// AÑADIDO FASE A.4 (170926 v2):
//   - renderAuditoriaHTML() helper compartido
//   - viewSale() muestra sección de Auditoría
//   - viewExpense() muestra sección de Auditoría
// AÑADIDO (180926): 
//   - Se muestra el #ID de cada venta en TODAS las vistas
// CORREGIDO FASE 1.1 (190926):
//   - loadSalesAndExpenses() ahora filtra por negocio_id (no user_id)
// CORREGIDO FASE 1.4 (190926 v2-v3): voidSale() con triple verificación
// 🆕 FIX 2 (190926 v4): normalizarFechaVenta() helper
// 🆕 FASE 3.5 (200926 v5): 5 tarjetas de alturas homogéneas
// 🆕 FASE 4.2 (#13) (200926 v6): INTERRUPTOR DE VENTAS LIBERADAS
// 🆕 FASE 5 (#20) (200926 v7): UI DE DÍAS SIN VENTAS
// 🆕 ENTREGA 2 (230926 v8): ANULAR VENTA + VENDEDOR
// 🆕 v2.1.12 (210926 v9): CORRECCIÓN #2 - BLOQUEO POR RECETAS NO COMPARTIDAS
//   - ✅ NUEVO helper local: checkSalePermission(saleOrId)
//   - ✅ NUEVO helper local: renderBadgeSoloLecturaVenta()
//   - ✅ loadSalesAndExpenses(): muestra badge "🔒 Solo lectura" en ventas
//     bloqueadas y NO las oculta (para que el usuario sepa que existen)
//   - ✅ renderSalesGroupedByDay(): oculta botones ✏️ y 🚫 en ventas bloqueadas
//     y muestra borde gris + opacidad reducida
//   - ✅ Vista de DEUDAS: filtra deudas bloqueadas (no las muestra para
//     que el usuario no-admin no intente cobrarlas). Muestra aviso con
//     contador de deudas ocultas.
//   - ✅ viewSale(): muestra aviso rojo "🔒 Solo lectura" y oculta los
//     botones ✏️ Editar y 🚫 Anular. Solo deja 🔄 Restaurar si estaba
//     anulada y Cerrar.
//   - ✅ showSaleForm(): bloquea si la venta está bloqueada (aviso)
//   - ✅ voidSale(): verifica permisos ANTES del confirm
//   - ✅ unvoidSale(): verifica permisos ANTES del confirm
//   - ✅ registerSalePayment(): verifica permisos ANTES del confirm
//   - ✅ Los GASTOS NO se ven afectados (no tienen receta)
//   - ✅ Los usuarios ADMIN ven todo normalmente sin cambios
// ============================================================

// ============================================================
// FIX 2: NORMALIZACIÓN DE FECHAS DE VENTA
// ============================================================

function normalizarFechaVenta(fechaInput) {
    if (!fechaInput) {
        return new Date().toISOString();
    }
    
    if (typeof fechaInput === 'string' && fechaInput.includes('T')) {
        return fechaInput;
    }
    
    const fechaStr = String(fechaInput).trim();
    
    const match = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
        console.warn('⚠️ [normalizarFechaVenta] Formato no reconocido:', fechaInput);
        return new Date().toISOString();
    }
    
    const hoyStr = new Date().toISOString().split('T')[0];
    if (fechaStr === hoyStr) {
        return new Date().toISOString();
    }
    
    return `${fechaStr}T12:00:00.000Z`;
}

// ============================================================
// 🆕 v2.1.12: HELPERS DE BLOQUEO POR RECETAS NO COMPARTIDAS
// ============================================================

/**
 * Verifica si el usuario actual puede procesar (editar, anular,
 * restaurar, cobrar) una venta.
 * 
 * Delega a SalesModule._puedeUsuarioActualProcesarVenta() si existe,
 * o a OrdersModule.puedeUsuarioActualProcesarVenta() como fallback.
 * 
 * @param {number|Object} saleOrId
 * @returns {Object} { puede, razon, recetaBloqueada }
 */
function checkSalePermission(saleOrId) {
    try {
        if (typeof window.SalesModule?._puedeUsuarioActualProcesarVenta === 'function') {
            return window.SalesModule._puedeUsuarioActualProcesarVenta(saleOrId);
        }
        if (typeof window.OrdersModule?.puedeUsuarioActualProcesarVenta === 'function') {
            return window.OrdersModule.puedeUsuarioActualProcesarVenta(saleOrId);
        }
        // Fallback: permitir
        return { puede: true, razon: '', recetaBloqueada: null };
    } catch (e) {
        console.warn('⚠️ Error verificando permisos de venta:', e);
        return { puede: true, razon: '', recetaBloqueada: null };
    }
}

/**
 * Renderiza el badge visual "🔒 Solo lectura" para ventas bloqueadas.
 */
function renderBadgeSoloLecturaVenta() {
    return `<span style="font-size: 10px; background: #94a3b820; color: #94a3b8; padding: 2px 8px; border-radius: 10px; font-weight: 600; border: 1px solid #94a3b8;">🔒 Solo lectura</span>`;
}

window.checkSalePermission = checkSalePermission;
window.renderBadgeSoloLecturaVenta = renderBadgeSoloLecturaVenta;

// ============================================================
// 🆕 FASE 1.4: HELPER PARA ESPERAR A QUE EL custom-modal SE CIERRE
// ============================================================

function waitForCustomModalRemoval(timeoutMs = 800) {
    return new Promise((resolve) => {
        const start = Date.now();
        const check = () => {
            const modal = document.getElementById('custom-modal');
            if (!modal || !modal.parentNode) {
                resolve(true);
                return;
            }
            if (Date.now() - start > timeoutMs) {
                console.warn('⚠️ Timeout esperando cierre de custom-modal, forzando...');
                if (modal.parentNode) modal.remove();
                window._modalResolve = null;
                window._modalResolved = false;
                resolve(false);
                return;
            }
            setTimeout(check, 30);
        };
        check();
    });
}

// ============================================================
// FASE A.4: HELPER DE AUDITORÍA
// ============================================================

function renderAuditoriaHTML(entity) {
    if (!entity) return '';
    
    const createdBy = entity.created_by || entity.user_id;
    const modifiedBy = entity.modified_by;
    const createdAt = entity.created_at;
    const updatedAt = entity.updated_at;
    
    if (!createdBy) return '';
    
    const nombreCreador = window.DBModule.getUsuarioNombre(createdBy) || 'Desconocido';
    const nombreModificador = modifiedBy ? (window.DBModule.getUsuarioNombre(modifiedBy) || 'Desconocido') : null;
    
    const fechaCreacion = createdAt 
        ? new Date(createdAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—';
    
    const fechaModificacion = updatedAt && updatedAt !== createdAt
        ? new Date(updatedAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : null;
    
    const fueModificado = modifiedBy && modifiedBy !== createdBy && fechaModificacion;
    const fueModificadoPorMismo = modifiedBy && modifiedBy === createdBy && fechaModificacion;
    
    let auditRows = `
        <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px;">
            <span style="color: var(--text-light);">👤 Creado por:</span>
            <span style="font-weight: 600; text-align: right;">${nombreCreador}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: var(--text-light); border-bottom: 1px dashed var(--border-color);">
            <span>📅 Fecha:</span>
            <span>${fechaCreacion}</span>
        </div>
    `;
    
    if (fueModificado) {
        auditRows += `
            <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; margin-top: 4px;">
                <span style="color: var(--text-light);">✏️ Modificado por:</span>
                <span style="font-weight: 600; text-align: right; color: #f59e0b;">${nombreModificador}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: var(--text-light);">
                <span>📅 Última modificación:</span>
                <span>${fechaModificacion}</span>
            </div>
        `;
    } else if (fueModificadoPorMismo) {
        auditRows += `
            <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: var(--text-light); margin-top: 4px;">
                <span>✏️ Modificado:</span>
                <span>${fechaModificacion}</span>
            </div>
        `;
    }
    
    return `
        <div style="background: var(--bg); border-radius: 8px; padding: 10px 12px; margin-top: 12px; border-left: 3px solid #94a3b8;">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-label); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                🔍 Auditoría
            </div>
            ${auditRows}
        </div>
    `;
}

// ============================================================
// 🆕 FASE 4.2 (#13): GESTIÓN DEL TOGGLE DE VENTAS LIBERADAS
// ============================================================

const SHOW_LIBERATED_KEY = 'panario_show_liberated_sales';

function getShowLiberatedSales() {
    try {
        const stored = localStorage.getItem(SHOW_LIBERATED_KEY);
        if (stored === null) return true;
        return stored === 'true';
    } catch (e) {
        return true;
    }
}

function setShowLiberatedSales(value) {
    try {
        localStorage.setItem(SHOW_LIBERATED_KEY, value ? 'true' : 'false');
    } catch (e) {
        console.warn('⚠️ Error guardando preferencia de liberadas:', e);
    }
}

function onShowLiberatedChange(checked) {
    setShowLiberatedSales(checked);
    updateShowLiberatedToggleVisual();
    loadSalesAndExpenses();
    
    window.showToast(
        checked ? '🚀 Mostrando ventas liberadas' : '🚀 Ventas liberadas ocultas',
        'info',
        2000
    );
}

function updateShowLiberatedToggleVisual() {
    const toggle = document.getElementById('toggle-liberadas-sales');
    const checkbox = document.getElementById('filter-show-liberated');
    const slider = document.getElementById('toggle-liberadas-sales-slider');
    const circle = document.getElementById('toggle-liberadas-sales-circle');
    const label = document.getElementById('toggle-liberadas-sales-label');
    
    if (!toggle || !checkbox || !slider || !circle || !label) return;
    
    if (checkbox.checked) {
        slider.style.background = '#8b5cf6';
        circle.style.left = '18px';
        label.style.color = '#8b5cf6';
        label.textContent = '🚀 Mostrando liberadas';
        toggle.style.background = '#8b5cf615';
        toggle.style.borderColor = '#8b5cf6';
    } else {
        slider.style.background = '#94a3b8';
        circle.style.left = '2px';
        label.style.color = '#94a3b8';
        label.textContent = '🚀 Ocultando liberadas';
        toggle.style.background = 'var(--bg)';
        toggle.style.borderColor = '#94a3b8';
    }
}

// ============================================================
// 🆕 FASE 5 (#20): CONSTANTES PARA DÍAS SIN VENTAS
// ============================================================

const MOTIVOS_DIAS_SIN_VENTAS = [
    { value: 'apagon', label: '⚡ Apagón', color: '#f59e0b' },
    { value: 'falta_insumos', label: '🛒 Falta de insumos', color: '#ef4444' },
    { value: 'feriado', label: '🎉 Feriado', color: '#8b5cf6' },
    { value: 'vacaciones', label: '🏖️ Vacaciones', color: '#06b6d4' },
    { value: 'enfermedad', label: '🏥 Enfermedad', color: '#ef4444' },
    { value: 'mantenimiento', label: '🔧 Mantenimiento', color: '#3b82f6' },
    { value: 'clima', label: '🌧️ Mal clima', color: '#3b82f6' },
    { value: 'otro', label: '🔄 Otro', color: '#94a3b8' }
];

function getMotivoDiaSinVenta(value) {
    return MOTIVOS_DIAS_SIN_VENTAS.find(m => m.value === value) || MOTIVOS_DIAS_SIN_VENTAS[MOTIVOS_DIAS_SIN_VENTAS.length - 1];
}

// ============================================================
// RENDER SALES VIEW
// ============================================================

function renderSalesView() {
    const main = document.getElementById('mainContent');
    
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const fechaInicioMes = primerDiaMes.toISOString().split('T')[0];
    const fechaFinMes = ultimoDiaMes.toISOString().split('T')[0];
    
    const showLiberated = getShowLiberatedSales();
    
    main.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
            <h2 style="margin: 0;">💰 Ventas y Finanzas</h2>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="showSaleForm()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                    ➕ Nueva Venta
                </button>
                <button onclick="showLiberatedSaleForm()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                    🚀 Venta liberada
                </button>
                <button onclick="showExpenseForm()" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                    📤 Registrar Gasto
                </button>
                <button onclick="showDiasSinVentasModal()" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #06b6d4; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📅 Días sin ventas
                </button>
                <button onclick="showBalanceView()" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                    📊 Balance
                </button>
                <button onclick="showSalesReportModal()" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                    📊 Reporte
                </button>
                <button onclick="showExpensesReportModal()" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #ef4444; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                    📊 Reporte Gastos
                </button>
                <button onclick="if(window.RewardsModule && window.RewardsModule.showRewardsConfigModal) window.RewardsModule.showRewardsConfigModal(); else window.showToast('❌ Módulo de premios no disponible', 'error');" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    🏆 Premios
                </button>
                <button onclick="window.navigate('dashboard')" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                    ← Regresar
                </button>
            </div>
        </div>
        
        <div id="sales-summary" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 16px; align-items: stretch;">
            
            <div class="card" style="padding: 14px; text-align: center; min-height: 90px; display: flex; flex-direction: column; justify-content: center; align-items: center; border-left: 4px solid var(--primary);">
                <div style="font-size: 20px; margin-bottom: 4px;">📈</div>
                <div style="font-size: 11px; color: var(--text-light);">Ventas hoy</div>
                <div style="font-size: 20px; font-weight: 700; color: var(--primary);" id="sales-today">$0.00</div>
            </div>
            
            <div class="card" style="padding: 14px; text-align: center; min-height: 90px; display: flex; flex-direction: column; justify-content: center; align-items: center; border-left: 4px solid #10b981;">
                <div style="font-size: 20px; margin-bottom: 4px;">💰</div>
                <div style="font-size: 11px; color: var(--text-light);">Ingresos totales</div>
                <div style="font-size: 20px; font-weight: 700; color: #10b981;" id="total-income">$0.00</div>
            </div>
            
            <div class="card" style="padding: 14px; text-align: center; min-height: 90px; display: flex; flex-direction: column; justify-content: center; align-items: center; border-left: 4px solid #ef4444;">
                <div style="font-size: 20px; margin-bottom: 4px;">📤</div>
                <div style="font-size: 11px; color: var(--text-light);">Gastos totales</div>
                <div style="font-size: 20px; font-weight: 700; color: #ef4444;" id="total-expenses">$0.00</div>
            </div>
            
            <div class="card" style="padding: 14px; text-align: center; min-height: 90px; display: flex; flex-direction: column; justify-content: center; align-items: center; border-left: 4px solid #ef4444;">
                <div style="font-size: 20px; margin-bottom: 4px;">💳</div>
                <div style="font-size: 11px; color: var(--text-light);">Deudas</div>
                <div style="font-size: 20px; font-weight: 700; color: #ef4444;" id="total-debts">$0.00</div>
            </div>
            
            <div class="card" style="padding: 14px; text-align: center; min-height: 90px; display: flex; flex-direction: column; justify-content: center; align-items: center; border-left: 4px solid #8b5cf6;">
                <div style="font-size: 20px; margin-bottom: 4px;">🚀</div>
                <div style="font-size: 11px; color: var(--text-light);">Ventas liberadas</div>
                <div style="font-size: 20px; font-weight: 700; color: #8b5cf6;" id="total-released">$0.00</div>
                <div style="font-size: 11px; color: var(--text-light); margin-top: 2px;" id="total-released-count">0 ventas</div>
            </div>
            
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; background: var(--bg-card); padding: 16px; border-radius: var(--radius); border: 1px solid var(--border-color);">
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
                <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                    <label style="font-weight: 600; font-size: 13px; color: var(--text-label);">📂 Mostrar:</label>
                    <div style="display: flex; gap: 4px; background: var(--bg); border-radius: 8px; padding: 4px; border: 1px solid var(--border-color); flex-wrap: wrap;">
                        <button id="filter-type-sales" onclick="setFilterType('sales')" class="btn primary" style="padding: 4px 16px; font-size: 12px; width: auto; border-radius: 6px; background: var(--primary); color: #fff;">
                            💰 Ventas
                        </button>
                        <button id="filter-type-expenses" onclick="setFilterType('expenses')" class="btn secondary" style="padding: 4px 16px; font-size: 12px; width: auto; border-radius: 6px; background: transparent; color: var(--text); border: none;">
                            📤 Gastos
                        </button>
                        <button id="filter-type-all" onclick="setFilterType('all')" class="btn secondary" style="padding: 4px 16px; font-size: 12px; width: auto; border-radius: 6px; background: transparent; color: var(--text); border: none;">
                            📊 Todo
                        </button>
                        <button id="filter-type-debts" onclick="setFilterType('debts')" class="btn secondary" style="padding: 4px 16px; font-size: 12px; width: auto; border-radius: 6px; background: transparent; color: var(--text); border: none;">
                            💳 Deudas
                        </button>
                    </div>
                </div>
                
                <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                    <label id="toggle-liberadas-sales" style="display: flex; align-items: center; gap: 10px; padding: 6px 14px; background: ${showLiberated ? '#8b5cf615' : 'var(--bg)'}; border-radius: 20px; border: 2px solid ${showLiberated ? '#8b5cf6' : '#94a3b8'}; cursor: pointer; transition: all 0.2s; user-select: none;">
                        <input type="checkbox" id="filter-show-liberated" ${showLiberated ? 'checked' : ''}
                               onchange="onShowLiberatedChange(this.checked)"
                               style="opacity: 0; width: 0; height: 0; position: absolute;">
                        <span id="toggle-liberadas-sales-slider" style="position: relative; display: inline-block; width: 36px; height: 20px; background: ${showLiberated ? '#8b5cf6' : '#94a3b8'}; border-radius: 20px; transition: 0.3s; flex-shrink: 0;">
                            <span id="toggle-liberadas-sales-circle" style="position: absolute; height: 16px; width: 16px; left: ${showLiberated ? '18px' : '2px'}; bottom: 2px; background: white; border-radius: 50%; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
                        </span>
                        <span id="toggle-liberadas-sales-label" style="font-size: 12px; font-weight: 600; color: ${showLiberated ? '#8b5cf6' : '#94a3b8'}; white-space: nowrap;">
                            ${showLiberated ? '🚀 Mostrando liberadas' : '🚀 Ocultando liberadas'}
                        </span>
                    </label>
                    
                    <label id="toggle-mes-sales" style="display: flex; align-items: center; gap: 10px; padding: 6px 14px; background: var(--primary-light); border-radius: 20px; border: 2px solid var(--primary); cursor: pointer; transition: all 0.2s; user-select: none;">
                        <input type="checkbox" id="filter-current-month-sales" checked 
                               onchange="onCurrentMonthChangeSales()"
                               style="opacity: 0; width: 0; height: 0; position: absolute;">
                        <span id="toggle-mes-sales-slider" style="position: relative; display: inline-block; width: 36px; height: 20px; background: var(--primary); border-radius: 20px; transition: 0.3s; flex-shrink: 0;">
                            <span id="toggle-mes-sales-circle" style="position: absolute; height: 16px; width: 16px; left: 18px; bottom: 2px; background: white; border-radius: 50%; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
                        </span>
                        <span id="toggle-mes-sales-label" style="font-size: 12px; font-weight: 600; color: var(--primary); white-space: nowrap;">
                            📅 Solo mes en curso
                        </span>
                    </label>
                </div>
            </div>
            
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                <div style="display: flex; align-items: center; gap: 4px;">
                    <label style="font-weight: 600; font-size: 12px; color: var(--text-label);">📅 Desde:</label>
                    <input type="date" id="filter-sales-from" value="${fechaInicioMes}" onchange="onSalesDateChange()" 
                           style="padding: 6px 10px; border: 2px solid var(--border-color); border-radius: 8px; background: var(--bg-card); color: var(--text); font-size: 13px;">
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <label style="font-weight: 600; font-size: 12px; color: var(--text-label);">📅 Hasta:</label>
                    <input type="date" id="filter-sales-to" value="${fechaFinMes}" onchange="onSalesDateChange()" 
                           style="padding: 6px 10px; border: 2px solid var(--border-color); border-radius: 8px; background: var(--bg-card); color: var(--text); font-size: 13px;">
                </div>
                <select id="filter-payment" onchange="loadSalesAndExpenses()" 
                        style="padding: 6px 10px; border: 2px solid var(--border-color); border-radius: 8px; background: var(--bg-card); color: var(--text); font-size: 13px;">
                    <option value="">Todos los pagos</option>
                    <option value="cash">💵 Efectivo</option>
                    <option value="transfer">🏦 Transferencia</option>
                    <option value="debt">💳 Deuda</option>
                    <option value="other">🔄 Otra</option>
                </select>
                
                <div style="display: flex; gap: 4px; align-items: center; flex: 1; min-width: 120px;">
                    <label style="font-weight: 600; font-size: 12px; color: var(--text-label);">🔍</label>
                    <input type="text" id="filter-sales-search" placeholder="Buscar producto o cliente..." 
                           style="flex: 1; padding: 6px 10px; border: 2px solid var(--border-color); border-radius: 8px; background: var(--bg-card); color: var(--text); font-size: 13px; min-width: 100px;"
                           oninput="loadSalesAndExpenses()">
                </div>
                
                <button onclick="clearFilters()" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto;">
                    🗑️ Limpiar filtros
                </button>
            </div>
            
            <div id="filter-category-container" style="display: none; gap: 4px; align-items: center;">
                <label style="font-weight: 600; font-size: 12px; color: var(--text-label);">📂 Categoría:</label>
                <select id="filter-expense-category" onchange="loadSalesAndExpenses()" 
                        style="padding: 6px 10px; border: 2px solid var(--border-color); border-radius: 8px; background: var(--bg-card); color: var(--text); font-size: 13px;">
                    <option value="">Todas las categorías</option>
                    <option value="inversion">💼 Inversión</option>
                    <option value="insumos">🛒 Insumos</option>
                    <option value="materiales">📦 Materiales</option>
                    <option value="transporte">🚗 Transporte</option>
                    <option value="otros">🔄 Otros</option>
                </select>
            </div>
        </div>
        
        <div id="transactions-list">
            <div class="card" style="text-align: center; padding: 40px;">
                <span style="font-size: 32px;">⏳</span>
                <p>Cargando transacciones...</p>
            </div>
        </div>
    `;
    
    window._currentFilterType = 'sales';
    loadSalesAndExpenses();
    updateSummary();
    
    setTimeout(() => updateMesToggleVisualSales(), 50);
    setTimeout(() => updateShowLiberatedToggleVisual(), 50);
    
    setTimeout(() => {
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.scrollTo({ top: 0, behavior: 'instant' });
        }
    }, 100);
}

window._currentFilterType = 'sales';

// ============================================================
// MANEJO DEL TOGGLE "SOLO MES EN CURSO" EN VENTAS
// ============================================================

function onCurrentMonthChangeSales() {
    const checkbox = document.getElementById('filter-current-month-sales');
    const fechaDesde = document.getElementById('filter-sales-from');
    const fechaHasta = document.getElementById('filter-sales-to');
    
    if (!checkbox || !fechaDesde || !fechaHasta) return;
    
    if (checkbox.checked) {
        const hoy = new Date();
        const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        fechaDesde.value = primerDia.toISOString().split('T')[0];
        fechaHasta.value = ultimoDia.toISOString().split('T')[0];
    }
    
    updateMesToggleVisualSales();
    loadSalesAndExpenses();
}

function updateMesToggleVisualSales() {
    const toggle = document.getElementById('toggle-mes-sales');
    const checkbox = document.getElementById('filter-current-month-sales');
    const slider = document.getElementById('toggle-mes-sales-slider');
    const circle = document.getElementById('toggle-mes-sales-circle');
    const label = document.getElementById('toggle-mes-sales-label');
    
    if (!toggle || !checkbox || !slider || !circle || !label) return;
    
    if (checkbox.checked) {
        slider.style.background = 'var(--primary)';
        circle.style.left = '18px';
        label.style.color = 'var(--primary)';
        label.textContent = '📅 Solo mes en curso';
        toggle.style.background = 'var(--primary-light)';
        toggle.style.borderColor = 'var(--primary)';
    } else {
        slider.style.background = '#94a3b8';
        circle.style.left = '2px';
        label.style.color = '#94a3b8';
        label.textContent = '📅 Todos los meses';
        toggle.style.background = 'var(--bg)';
        toggle.style.borderColor = '#94a3b8';
    }
}

function onSalesDateChange() {
    const checkbox = document.getElementById('filter-current-month-sales');
    if (checkbox) {
        checkbox.checked = false;
        updateMesToggleVisualSales();
    }
    loadSalesAndExpenses();
}

// ============================================================
// SET FILTER TYPE
// ============================================================

function setFilterType(type) {
    window._currentFilterType = type;
    
    const btnSales = document.getElementById('filter-type-sales');
    const btnExpenses = document.getElementById('filter-type-expenses');
    const btnAll = document.getElementById('filter-type-all');
    const btnDebts = document.getElementById('filter-type-debts');
    
    [btnSales, btnExpenses, btnAll, btnDebts].forEach(btn => {
        if (btn) {
            btn.style.background = 'transparent';
            btn.style.color = 'var(--text)';
            btn.className = 'btn secondary';
        }
    });
    
    if (type === 'sales' && btnSales) {
        btnSales.style.background = 'var(--primary)';
        btnSales.style.color = '#fff';
        btnSales.className = 'btn primary';
    } else if (type === 'expenses' && btnExpenses) {
        btnExpenses.style.background = '#ef4444';
        btnExpenses.style.color = '#fff';
        btnExpenses.className = 'btn primary';
    } else if (type === 'all' && btnAll) {
        btnAll.style.background = '#8b5cf6';
        btnAll.style.color = '#fff';
        btnAll.className = 'btn primary';
    } else if (type === 'debts' && btnDebts) {
        btnDebts.style.background = '#ef4444';
        btnDebts.style.color = '#fff';
        btnDebts.className = 'btn primary';
    }
    
    const categoryContainer = document.getElementById('filter-category-container');
    if (categoryContainer) {
        categoryContainer.style.display = (type === 'expenses' || type === 'all') ? 'flex' : 'none';
    }
    
    const toggleLiberadas = document.getElementById('toggle-liberadas-sales');
    if (toggleLiberadas) {
        toggleLiberadas.style.display = (type === 'sales' || type === 'all') ? 'flex' : 'none';
    }
    
    loadSalesAndExpenses();
}

function clearFilters() {
    document.getElementById('filter-sales-from').value = '';
    document.getElementById('filter-sales-to').value = '';
    document.getElementById('filter-payment').value = '';
    document.getElementById('filter-expense-category').value = '';
    document.getElementById('filter-sales-search').value = '';
    
    const checkbox = document.getElementById('filter-current-month-sales');
    if (checkbox) {
        checkbox.checked = false;
        updateMesToggleVisualSales();
    }
    
    loadSalesAndExpenses();
}

// ============================================================
// HELPERS DE CORRIENTE Y SESIÓN
// ============================================================

if (typeof window.formatearFechaLarga !== 'function') {
    window.formatearFechaLarga = function(dateStr) {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr.split('T')[0] + 'T00:00:00');
            const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
            const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
            return `${dias[date.getDay()]}, ${date.getDate()} ${meses[date.getMonth()]} ${date.getFullYear()}`;
        } catch (e) {
            return dateStr;
        }
    };
}

if (typeof window.getBadgeCorriente !== 'function') {
    window.getBadgeCorriente = function(fechaISO) {
        if (!window.CorrienteUtils) return '';
        try {
            const resumen = window.CorrienteUtils.getResumen(fechaISO);
            if (!resumen.tieneCorriente) return '';
            return `<span style="font-size: 11px; color: #f59e0b; background: #f59e0b20; padding: 1px 8px; border-radius: 10px; margin-left: 6px; font-weight: 600;">⚡ ${resumen.numBloques}</span>`;
        } catch (e) {
            return '';
        }
    };
}

if (typeof window.getBadgeSesion !== 'function') {
    window.getBadgeSesion = function(sesion) {
        if (!sesion || !window.CorrienteUtils) return '';
        const s = window.CorrienteUtils.getSesion(sesion);
        if (!s) return '';
        return `<span style="font-size: 11px; background: ${s.bg}; color: ${s.color}; padding: 2px 10px; border-radius: 10px; font-weight: 600;">${s.icon} ${s.label}</span>`;
    };
}

if (typeof window.getBannerCorrienteHTML !== 'function') {
    window.getBannerCorrienteHTML = function(fechaISO) {
        if (!window.CorrienteUtils) return '';
        try {
            const resumen = window.CorrienteUtils.getResumen(fechaISO);
            if (!resumen.tieneCorriente) return '';
            
            const bloquesHTML = resumen.bloques.map(b => {
                const texto = b.cruzaMedianoche
                    ? `${b.inicioStr} → ${b.finStr} (${window.CorrienteUtils.getDiaSemana(b.fin, true).toLowerCase()})`
                    : `${b.inicioStr} - ${b.finStr}`;
                return `<span style="display: inline-block; background: #f59e0b30; color: #f59e0b; padding: 3px 12px; border-radius: 12px; margin: 3px 4px 3px 0; font-size: 13px; font-weight: 600;">🟢 ${texto}</span>`;
            }).join('');
            
            return `
                <div style="background: linear-gradient(135deg, #f59e0b15 0%, #f59e0b08 100%); border: 2px solid #f59e0b; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                        <span style="font-size: 20px;">⚡</span>
                        <span style="font-weight: 700; color: #f59e0b; font-size: 14px;">Corriente disponible este día</span>
                        <span style="margin-left: auto; font-size: 12px; color: var(--text-light); font-weight: 600;">${resumen.numBloques} bloque${resumen.numBloques > 1 ? 's' : ''} · ${resumen.totalHoras.toFixed(1)}h</span>
                    </div>
                    <div>${bloquesHTML}</div>
                </div>
            `;
        } catch (e) {
            return '';
        }
    };
}

if (typeof window.getSeccionCorrienteHTML !== 'function') {
    window.getSeccionCorrienteHTML = function(fechaISO) {
        if (!window.CorrienteUtils) return '';
        try {
            const resumen = window.CorrienteUtils.getResumen(fechaISO);
            if (!resumen.tieneCorriente) return '';
            
            const bloquesHTML = resumen.bloques.map(b => {
                const texto = b.cruzaMedianoche
                    ? `${b.inicioStr} → ${b.finStr} (${window.CorrienteUtils.getDiaSemana(b.fin, true).toLowerCase()})`
                    : `${b.inicioStr} - ${b.finStr}`;
                return `
                    <div style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: #f59e0b10; border-radius: 6px; margin-bottom: 4px; border-left: 3px solid #f59e0b;">
                        <span style="font-size: 16px;">⚡</span>
                        <span style="font-size: 13px; font-weight: 600; color: #f59e0b;">${texto}</span>
                    </div>
                `;
            }).join('');
            
            return `
                <hr>
                <div style="margin: 10px 0;">
                    <div style="font-size: 13px; font-weight: 600; color: #f59e0b; margin-bottom: 6px;">
                        ⚡ Corriente del día (${resumen.numBloques} bloque${resumen.numBloques > 1 ? 's' : ''} · ${resumen.totalHoras.toFixed(1)}h)
                    </div>
                    ${bloquesHTML}
                </div>
            `;
        } catch (e) {
            return '';
        }
    };
}

// ============================================================
// 🆕 v2.1.12: LOAD SALES AND EXPENSES - CON VERIFICACIÓN DE PERMISOS
// ============================================================

async function loadSalesAndExpenses() {
    const container = document.getElementById('transactions-list');
    if (!container) return;
    
    const fromDate = document.getElementById('filter-sales-from')?.value || '';
    const toDate = document.getElementById('filter-sales-to')?.value || '';
    const payment = document.getElementById('filter-payment')?.value || '';
    const search = document.getElementById('filter-sales-search')?.value?.trim() || '';
    const filterType = window._currentFilterType || 'sales';
    
    const showLiberated = getShowLiberatedSales();
    
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) {
        container.innerHTML = `<div class="card" style="text-align: center; padding: 40px; color: #ef4444;">
            <span style="font-size: 32px;">❌</span>
            <p>Error: No hay negocio activo</p>
        </div>`;
        return;
    }
    
    try {
        // ============================================================
        // VISTA DE DEUDAS
        // 🆕 v2.1.12: Filtra deudas bloqueadas para no-admin
        // ============================================================
        if (filterType === 'debts') {
            let debtQuery = `
                SELECT * FROM sales 
                WHERE negocio_id = ? 
                AND is_debt = 1 
                AND paid = 0 
                AND deleted_at IS NULL 
                AND voided = 0
                ORDER BY sale_date ASC, id ASC
            `;
            let debtParams = [negocioId];
            
            const debtSales = window.DBModule.query(debtQuery, debtParams);
            
            if (debtSales.length === 0) {
                container.innerHTML = `
                    <div class="card" style="text-align: center; padding: 40px;">
                        <span style="font-size: 48px;">✅</span>
                        <p style="margin-top: 8px; color: var(--text-light);">No hay deudas pendientes</p>
                    </div>
                `;
                return;
            }
            
            // 🆕 v2.1.12: Separar deudas accesibles de las bloqueadas
            const deudasAccesibles = [];
            const deudasBloqueadas = [];
            
            debtSales.forEach(sale => {
                const permisos = checkSalePermission(sale.id);
                if (permisos.puede) {
                    deudasAccesibles.push(sale);
                } else {
                    deudasBloqueadas.push(sale);
                }
            });
            
            const paymentIcons = { 'cash': '💵', 'transfer': '🏦', 'debt': '💳', 'other': '🔄' };
            
            let html = '';
            
            // Aviso de deudas bloqueadas
            if (deudasBloqueadas.length > 0) {
                const totalBloqueado = deudasBloqueadas.reduce((sum, s) => sum + s.total, 0);
                html += `
                    <div style="background: #94a3b815; border-left: 4px solid #94a3b8; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; font-size: 13px; color: var(--text-light);">
                        <strong>🔒 ${deudasBloqueadas.length} deuda(s) oculta(s)</strong> — $${totalBloqueado.toFixed(2)}
                        <br><span style="font-size: 11px;">Usan recetas que no te han compartido.</span>
                    </div>
                `;
            }
            
            if (deudasAccesibles.length === 0) {
                html += `
                    <div class="card" style="text-align: center; padding: 40px;">
                        <span style="font-size: 48px;">🔒</span>
                        <p style="margin-top: 8px; color: var(--text-light);">No tienes deudas accesibles para gestionar</p>
                    </div>
                `;
                container.innerHTML = html;
                return;
            }
            
            html += `
                <div style="margin-bottom: 12px;">
                    <h4 style="margin: 0 0 8px 0; color: #ef4444;">💰 Deudas de Ventas (${deudasAccesibles.length})</h4>
            `;
            html += deudasAccesibles.map(sale => {
                const sesionBadge = sale.session ? getBadgeSesion(sale.session) : '';
                return `
                <div class="card" style="border-left: 4px solid #ef4444; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
                        <div>
                            <h3 style="margin: 0; font-size: 15px;">
                                🛒 <span style="color: var(--text-light); font-weight: 600;">#${sale.id}</span> ${sale.product_name}
                                <span style="font-size: 12px; color: #ef4444;"> 💳 (Deuda)</span>
                                ${sesionBadge}
                            </h3>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; font-size: 13px; color: var(--text-light);">
                                <span>📦 ${sale.quantity} unidades</span>
                                <span>👤 ${sale.buyer || 'Cliente sin nombre'}</span>
                                <span>📅 ${formatearFechaLarga(sale.sale_date)}</span>
                                <span>${paymentIcons[sale.payment_method] || '💵'} ${sale.payment_method}</span>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 18px; font-weight: 700; color: #ef4444;">
                                $${parseFloat(sale.total).toFixed(2)}
                            </div>
                            <div style="display: flex; gap: 4px; margin-top: 4px; justify-content: flex-end;">
                                <button onclick="viewSale(${sale.id})" class="btn secondary" style="padding: 2px 10px; font-size: 11px; width: auto;">
                                    👁️ Ver
                                </button>
                                <button onclick="registerSalePayment(${sale.id})" class="btn primary" style="padding: 2px 10px; font-size: 11px; width: auto; background: #10b981; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
                                    💰 Cobrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `}).join('');
            html += `</div>`;
            
            container.innerHTML = html;
            return;
        }
        
        // ============================================================
        // VISTA DE VENTAS / GASTOS / TODO
        // ============================================================
        let sales = [];
        let expenses = [];
        let allTransactions = [];
        
        if (filterType === 'sales' || filterType === 'all') {
            let query = `
                SELECT * FROM sales 
                WHERE negocio_id = ? 
                AND deleted_at IS NULL 
                AND voided = 0
            `;
            let params = [negocioId];
            
            if (fromDate) { query += ' AND DATE(sale_date, "localtime") >= DATE(?)'; params.push(fromDate); }
            if (toDate) { query += ' AND DATE(sale_date, "localtime") <= DATE(?)'; params.push(toDate); }
            if (payment) { query += ' AND payment_method = ?'; params.push(payment); }
            if (search) {
                query += ' AND (product_name LIKE ? OR buyer LIKE ?)';
                const searchTerm = '%' + search + '%';
                params.push(searchTerm, searchTerm);
            }
            
            if (!showLiberated) {
                query += ' AND is_liberated = 0';
            }
            
            query += ' ORDER BY sale_date DESC, id ASC';
            
            sales = window.DBModule.query(query, params);
        }
        
        if (filterType === 'expenses' || filterType === 'all') {
            let query = `
                SELECT * FROM transactions 
                WHERE negocio_id = ? 
                AND type = "expense" 
                AND deleted_at IS NULL 
                AND voided = 0
            `;
            let params = [negocioId];
            
            if (fromDate) { query += ' AND DATE(transaction_date, "localtime") >= DATE(?)'; params.push(fromDate); }
            if (toDate) { query += ' AND DATE(transaction_date, "localtime") <= DATE(?)'; params.push(toDate); }
            if (payment) { query += ' AND payment_method = ?'; params.push(payment); }
            if (search) { query += ' AND concept LIKE ?'; params.push('%' + search + '%'); }
            
            const category = document.getElementById('filter-expense-category')?.value || '';
            if (category) { query += ' AND category = ?'; params.push(category); }
            
            query += ' ORDER BY transaction_date DESC, id ASC';
            
            expenses = window.DBModule.query(query, params);
        }
        
        if (filterType === 'all') {
            allTransactions = [
                ...sales.map(s => ({ ...s, _type: 'sale' })),
                ...expenses.map(e => ({ ...e, _type: 'expense' }))
            ];
            allTransactions.sort((a, b) => {
                const dateA = new Date(a.sale_date || a.transaction_date);
                const dateB = new Date(b.sale_date || b.transaction_date);
                if (dateB - dateA !== 0) return dateB - dateA;
                return a.id - b.id;
            });
        }
        
        const totalItems = filterType === 'all' ? allTransactions.length : 
                          filterType === 'sales' ? sales.length : expenses.length;
        
        if (totalItems === 0) {
            const typeLabel = filterType === 'sales' ? 'ventas' : 
                             filterType === 'expenses' ? 'gastos' : 'transacciones';
            
            let mensajeExtra = '';
            if (!showLiberated && (filterType === 'sales' || filterType === 'all')) {
                mensajeExtra = `<p style="margin-top: 12px; font-size: 12px; color: #8b5cf6;">
                    🚀 Hay ventas liberadas ocultas. Activa el interruptor "Mostrando liberadas" para verlas.
                </p>`;
            }
            
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 40px;">
                    <span style="font-size: 48px;">📭</span>
                    <p style="margin-top: 8px; color: var(--text-light);">No hay ${typeLabel} registradas</p>
                    ${mensajeExtra}
                </div>
            `;
            return;
        }
        
        if (filterType === 'sales') {
            renderSalesGroupedByDay(container, sales);
            
            if (!showLiberated) {
                let checkQuery = `SELECT COUNT(*) as count FROM sales 
                    WHERE negocio_id = ? AND is_liberated = 1 
                    AND deleted_at IS NULL AND voided = 0`;
                let checkParams = [negocioId];
                if (fromDate) { checkQuery += ' AND DATE(sale_date, "localtime") >= DATE(?)'; checkParams.push(fromDate); }
                if (toDate) { checkQuery += ' AND DATE(sale_date, "localtime") <= DATE(?)'; checkParams.push(toDate); }
                
                try {
                    const checkResult = window.DBModule.query(checkQuery, checkParams);
                    const hiddenCount = checkResult[0]?.count || 0;
                    
                    if (hiddenCount > 0) {
                        const aviso = document.createElement('div');
                        aviso.style.cssText = 'margin-top: 12px; padding: 10px 14px; background: #8b5cf615; border-left: 4px solid #8b5cf6; border-radius: 8px; font-size: 13px; color: #8b5cf6; text-align: center;';
                        aviso.innerHTML = `🚀 <strong>${hiddenCount} venta${hiddenCount > 1 ? 's' : ''} liberada${hiddenCount > 1 ? 's' : ''} oculta${hiddenCount > 1 ? 's' : ''}</strong> — Activa el interruptor para verlas`;
                        container.appendChild(aviso);
                    }
                } catch (e) {
                    console.warn('⚠️ Error comprobando ventas liberadas ocultas:', e);
                }
            }
            
            return;
        }
        
        const paymentIcons = { 'cash': '💵', 'transfer': '🏦', 'debt': '💳', 'other': '🔄' };
        
        let html = '';
        
        if (filterType === 'expenses') {
            html = expenses.map(expense => {
                const isVoid = expense.voided === 1;
                return `
                    <div class="card" style="border-left: 4px solid ${isVoid ? '#94a3b8' : '#ef4444'}; opacity: ${isVoid ? 0.6 : 1};">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
                            <div>
                                <h3 style="margin: 0; font-size: 16px;">
                                    📤 ${expense.concept}
                                    ${isVoid ? '<span style="font-size: 12px; color: #94a3b8;"> 🚫 (ANULADO)</span>' : ''}
                                    <span style="font-size: 12px; color: var(--text-light);">(${expense.category || 'general'})</span>
                                </h3>
                                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; font-size: 13px; color: var(--text-light);">
                                    <span>${paymentIcons[expense.payment_method] || '💵'} ${expense.payment_method}</span>
                                    ${isVoid && expense.void_reason ? `<span>📝 ${expense.void_reason}</span>` : ''}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 18px; font-weight: 700; color: ${isVoid ? '#94a3b8' : '#ef4444'};">
                                    ${isVoid ? '🚫' : '-'}$${parseFloat(expense.amount).toFixed(2)}
                                </div>
                                <div style="font-size: 11px; color: var(--text-light);">
                                    ${formatearFechaLarga(expense.transaction_date)}
                                </div>
                                <div style="display: flex; gap: 4px; margin-top: 4px; justify-content: flex-end;">
                                    ${!isVoid ? `
                                        <button onclick="viewExpense(${expense.id})" class="btn secondary" style="padding: 2px 10px; font-size: 11px; width: auto;">
                                            👁️ Ver
                                        </button>
                                        <button onclick="showExpenseForm(${expense.id})" class="btn secondary" style="padding: 2px 10px; font-size: 11px; width: auto;">
                                            ✏️
                                        </button>
                                        <button onclick="voidExpense(${expense.id})" class="btn secondary" style="padding: 2px 10px; font-size: 11px; width: auto; color: #ef4444; border-color: #ef4444;">
                                            🚫
                                        </button>
                                    ` : `
                                        <button onclick="unvoidExpense(${expense.id})" class="btn secondary" style="padding: 2px 10px; font-size: 11px; width: auto; color: #10b981; border-color: #10b981;">
                                            🔄
                                        </button>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            html = allTransactions.map(item => {
                const isVoid = item.voided === 1;
                
                if (item._type === 'sale') {
                    // 🆕 v2.1.12: Verificar permisos
                    const permisos = checkSalePermission(item.id);
                    const bloqueado = !permisos.puede;
                    
                    const isDebt = item.is_debt === 1 && item.paid === 0;
                    const isLiberated = item.is_liberated === 1;
                    const sesionBadge = item.session ? getBadgeSesion(item.session) : '';
                    
                    let borderColor;
                    if (isVoid) borderColor = '#94a3b8';
                    else if (bloqueado) borderColor = '#94a3b8';
                    else if (isLiberated) borderColor = '#8b5cf6';
                    else if (isDebt) borderColor = '#ef4444';
                    else borderColor = '#10b981';
                    
                    const cardOpacity = (isVoid || bloqueado) ? 0.6 : 1;
                    
                    return `
                        <div class="card" style="border-left: 4px solid ${borderColor}; opacity: ${cardOpacity};">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
                                <div>
                                    <h3 style="margin: 0; font-size: 16px;">
                                        ${bloqueado ? '🔒' : '🛒'} <span style="color: var(--text-light); font-weight: 600;">#${item.id}</span> ${item.producto_nombre || item.product_name || 'Producto'}
                                        ${isVoid ? '<span style="font-size: 12px; color: #94a3b8;"> 🚫 (ANULADA)</span>' : ''}
                                        ${isLiberated && !isVoid && !bloqueado ? '<span style="font-size: 11px; color: #8b5cf6; background: #8b5cf620; padding: 0 8px; border-radius: 4px;">LIBERADA</span>' : ''}
                                        ${isDebt && !isVoid && !isLiberated && !bloqueado ? '<span style="font-size: 11px; color: #ef4444; background: #ef444420; padding: 0 8px; border-radius: 4px;">DEUDA</span>' : ''}
                                        ${!isVoid && !isDebt && !isLiberated && !bloqueado ? '<span style="font-size: 11px; color: #10b981; background: #10b98120; padding: 0 8px; border-radius: 4px;">INGRESO</span>' : ''}
                                        ${bloqueado ? renderBadgeSoloLecturaVenta() : ''}
                                        ${sesionBadge}
                                    </h3>
                                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; font-size: 13px; color: var(--text-light);">
                                        <span>📦 ${item.quantity} unidades</span>
                                        <span>${paymentIcons[item.payment_method] || '💵'} ${item.payment_method}</span>
                                        ${item.buyer ? `<span>👤 ${item.buyer}</span>` : ''}
                                    </div>
                                    ${bloqueado ? `<div style="margin-top: 4px; font-size: 11px; color: #94a3b8; font-style: italic;">🔒 ${permisos.razon}</div>` : ''}
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 18px; font-weight: 700; color: ${isVoid ? '#94a3b8' : (bloqueado ? '#94a3b8' : (isLiberated ? '#8b5cf6' : (isDebt ? '#ef4444' : '#10b981')))};">
                                        ${isVoid ? '🚫' : (isDebt ? '💳' : '+')}$${parseFloat(item.total).toFixed(2)}
                                    </div>
                                    <div style="font-size: 11px; color: var(--text-light);">
                                        ${formatearFechaLarga(item.sale_date)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    return `
                        <div class="card" style="border-left: 4px solid ${isVoid ? '#94a3b8' : '#ef4444'}; opacity: ${isVoid ? 0.6 : 1};">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
                                <div>
                                    <h3 style="margin: 0; font-size: 16px;">
                                        📤 ${item.concept}
                                        ${isVoid ? '<span style="font-size: 12px; color: #94a3b8;"> 🚫 (ANULADO)</span>' : ''}
                                        ${!isVoid ? '<span style="font-size: 11px; color: #ef4444; background: #ef444420; padding: 0 8px; border-radius: 4px;">GASTO</span>' : ''}
                                    </h3>
                                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; font-size: 13px; color: var(--text-light);">
                                        <span>${paymentIcons[item.payment_method] || '💵'} ${item.payment_method}</span>
                                        <span>${item.category || 'general'}</span>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 18px; font-weight: 700; color: ${isVoid ? '#94a3b8' : '#ef4444'};">
                                        ${isVoid ? '🚫' : '-'}$${parseFloat(item.amount).toFixed(2)}
                                    </div>
                                    <div style="font-size: 11px; color: var(--text-light);">
                                        ${formatearFechaLarga(item.transaction_date)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }).join('');
        }
        
        container.innerHTML = html;
        
        if (!showLiberated && filterType === 'all') {
            let checkQuery = `SELECT COUNT(*) as count FROM sales 
                WHERE negocio_id = ? AND is_liberated = 1 
                AND deleted_at IS NULL AND voided = 0`;
            let checkParams = [negocioId];
            if (fromDate) { checkQuery += ' AND DATE(sale_date, "localtime") >= DATE(?)'; checkParams.push(fromDate); }
            if (toDate) { checkQuery += ' AND DATE(sale_date, "localtime") <= DATE(?)'; checkParams.push(toDate); }
            
            try {
                const checkResult = window.DBModule.query(checkQuery, checkParams);
                const hiddenCount = checkResult[0]?.count || 0;
                
                if (hiddenCount > 0) {
                    const aviso = document.createElement('div');
                    aviso.style.cssText = 'margin-top: 12px; padding: 10px 14px; background: #8b5cf615; border-left: 4px solid #8b5cf6; border-radius: 8px; font-size: 13px; color: #8b5cf6; text-align: center;';
                    aviso.innerHTML = `🚀 <strong>${hiddenCount} venta${hiddenCount > 1 ? 's' : ''} liberada${hiddenCount > 1 ? 's' : ''} oculta${hiddenCount > 1 ? 's' : ''}</strong> — Activa el interruptor para verlas`;
                    container.appendChild(aviso);
                }
            } catch (e) {
                console.warn('⚠️ Error comprobando ventas liberadas ocultas:', e);
            }
        }
        
    } catch (error) {
        console.error('Error cargando transacciones:', error);
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 40px; color: #ef4444;">
                <span style="font-size: 32px;">❌</span>
                <p>Error cargando transacciones: ${error.message}</p>
            </div>
        `;
    }
}

// ============================================================
// 🆕 v2.1.12: RENDER SALES GROUPED BY DAY CON BLOQUEO
// ============================================================

function renderSalesGroupedByDay(container, sales) {
    const grouped = {};
    const today = new Date().toISOString().split('T')[0];
    
    sales.forEach(sale => {
        const date = sale.sale_date ? sale.sale_date.split('T')[0] : 'sin fecha';
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(sale);
    });
    
    Object.keys(grouped).forEach(date => {
        grouped[date].sort((a, b) => a.id - b.id);
    });
    
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    
    if (sortedDates.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 40px;">
                <span style="font-size: 48px;">📭</span>
                <p style="margin-top: 8px; color: var(--text-light);">No hay ventas registradas</p>
            </div>
        `;
        return;
    }
    
    const paymentIcons = { 'cash': '💵', 'transfer': '🏦', 'debt': '💳', 'other': '🔄' };
    
    let html = '';
    
    sortedDates.forEach((date, index) => {
        const daySales = grouped[date];
        const totalDay = daySales.reduce((sum, s) => sum + s.total, 0);
        const isToday = date === today;
        const isExpanded = isToday || index === 0;
        
        const deudasDelDia = daySales.filter(s => s.is_debt === 1 && s.paid === 0);
        const tieneDeudas = deudasDelDia.length > 0;
        
        const ventasLiberadas = daySales.filter(s => s.is_liberated === 1);
        const ventasNormales = daySales.filter(s => s.is_liberated !== 1);
        const totalLiberadas = ventasLiberadas.reduce((sum, s) => sum + s.total, 0);
        
        const fechaLarga = formatearFechaLarga(date);
        const badgeCorriente = getBadgeCorriente(date);
        
        // 🆕 v2.1.12: Contar ventas bloqueadas del día
        const bloqueadosDelDia = daySales.filter(s => !checkSalePermission(s.id).puede).length;
        const badgeBloqueados = bloqueadosDelDia > 0 
            ? `<span style="font-size: 11px; background: #94a3b820; color: #94a3b8; padding: 2px 8px; border-radius: 10px; font-weight: 600; border: 1px solid #94a3b8;">🔒 ${bloqueadosDelDia} bloqueada${bloqueadosDelDia > 1 ? 's' : ''}</span>`
            : '';
        
        const borderColor = tieneDeudas ? '#ef4444' : (isToday ? '#f59e0b' : '#10b981');
        
        const badgeDeuda = tieneDeudas 
            ? `<span style="font-size: 11px; background: #ef444420; color: #ef4444; padding: 2px 8px; border-radius: 10px; font-weight: 600;">💳 ${deudasDelDia.length} deuda${deudasDelDia.length > 1 ? 's' : ''}</span>` 
            : '';
        
        const sesiones = { manana: 0, tarde: 0, noche: 0 };
        daySales.forEach(s => { if (s.session && sesiones[s.session] !== undefined) sesiones[s.session]++; });
        const sesionesHTML = Object.entries(sesiones)
            .filter(([k, v]) => v > 0)
            .map(([k, v]) => {
                const s = window.CorrienteUtils.getSesion(k);
                return s ? `<span style="font-size: 10px; background: ${s.bg}; color: ${s.color}; padding: 1px 6px; border-radius: 8px;">${s.icon}${v}</span>` : '';
            }).join(' ');
        
        html += `
            <div class="card" style="padding: 8px 12px; margin-bottom: 8px; cursor: pointer; border-left: 4px solid ${borderColor};" 
                 onclick="toggleDaySales('day-${date}')">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <span style="font-size: 18px; transition: transform 0.3s;" id="arrow-day-${date}">
                            ${isExpanded ? '🔽' : '▶️'}
                        </span>
                        <span style="font-weight: 600; font-size: 15px;">
                            📅 ${fechaLarga}
                            ${isToday ? ' <span style="font-size: 11px; color: #f59e0b; background: #f59e0b20; padding: 1px 8px; border-radius: 10px;">HOY</span>' : ''}
                            ${badgeCorriente}
                            ${badgeDeuda}
                            ${badgeBloqueados}
                        </span>
                        <span style="font-size: 12px; color: var(--text-light);">
                            ${daySales.length} ${daySales.length === 1 ? 'venta' : 'ventas'}
                        </span>
                        ${sesionesHTML ? `<span style="display:flex; gap:3px;">${sesionesHTML}</span>` : ''}
                    </div>
                    <div style="font-weight: 700; color: var(--primary); font-size: 16px;">
                        $${totalDay.toFixed(2)}
                    </div>
                </div>
            </div>
            <div id="day-${date}" style="display: ${isExpanded ? 'block' : 'none'}; margin-bottom: 12px; padding-left: 8px;">
                
                ${ventasNormales.map(sale => {
                    const isVoid = sale.voided === 1;
                    const isDebt = sale.is_debt === 1 && sale.paid === 0;
                    
                    // 🆕 v2.1.12: Verificar permisos
                    const permisos = checkSalePermission(sale.id);
                    const bloqueado = !permisos.puede;
                    
                    const statusColor = (isVoid || bloqueado) ? '#94a3b8' : (isDebt ? '#ef4444' : '#10b981');
                    const statusLabel = isVoid ? '🚫 ANULADA' : (bloqueado ? '🔒 Solo lectura' : (isDebt ? '💳 Deuda' : '✅ Pagado'));
                    const sesionBadge = sale.session ? getBadgeSesion(sale.session) : '';
                    
                    return `
                        <div class="card" style="border-left: 4px solid ${statusColor}; padding: 12px 16px; margin-bottom: 6px; opacity: ${(isVoid || bloqueado) ? 0.65 : 1};">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
                                <div style="flex: 1;">
                                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                                        <span style="font-weight: 600; font-size: 15px;">
                                            ${bloqueado ? '🔒' : '🛒'} <span style="color: var(--text-light); font-weight: 600;">#${sale.id}</span> ${sale.product_name}
                                        </span>
                                        <span style="font-size: 11px; color: ${statusColor}; background: ${statusColor}20; padding: 1px 8px; border-radius: 10px;">${statusLabel}</span>
                                        ${sesionBadge}
                                    </div>
                                    <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 4px; font-size: 13px; color: var(--text-light);">
                                        <span>📦 ${sale.quantity} unidades</span>
                                        <span>💰 $${parseFloat(sale.unit_price).toFixed(2)} c/u</span>
                                        <span>${paymentIcons[sale.payment_method] || '💵'} ${sale.payment_method}</span>
                                        ${sale.buyer ? `<span>👤 ${sale.buyer}</span>` : ''}
                                    </div>
                                    ${bloqueado ? `<div style="margin-top: 4px; font-size: 11px; color: #94a3b8; font-style: italic;">🔒 ${permisos.razon}</div>` : ''}
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 17px; font-weight: 700; color: ${statusColor};">
                                        $${parseFloat(sale.total).toFixed(2)}
                                    </div>
                                    <div style="display: flex; gap: 4px; margin-top: 4px; justify-content: flex-end;">
                                        <button onclick="viewSale(${sale.id})" class="btn secondary" style="padding: 2px 10px; font-size: 11px; width: auto;">
                                            👁️ Ver
                                        </button>
                                        ${!isVoid && !bloqueado ? `
                                            <button onclick="showSaleForm(${sale.id})" class="btn secondary" style="padding: 2px 10px; font-size: 11px; width: auto;">
                                                ✏️
                                            </button>
                                            <button onclick="voidSale(${sale.id})" class="btn secondary" style="padding: 2px 10px; font-size: 11px; width: auto; color: #ef4444; border-color: #ef4444;">
                                                🚫
                                            </button>
                                        ` : ''}
                                        ${isVoid && !bloqueado ? `
                                            <button onclick="unvoidSale(${sale.id})" class="btn secondary" style="padding: 2px 10px; font-size: 11px; width: auto; color: #10b981; border-color: #10b981;">
                                                🔄
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
                
                ${ventasLiberadas.length > 0 ? `
                    <div class="card" style="border-left: 4px solid #8b5cf6; padding: 12px 16px; margin-bottom: 6px; background: linear-gradient(135deg, #8b5cf615 0%, #8b5cf608 100%); cursor: pointer;" onclick="toggleLiberadas('liberadas-${date}')">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 18px;">🚀</span>
                                <div>
                                    <div style="font-weight: 700; color: #8b5cf6; font-size: 14px;">
                                        Ventas liberadas
                                    </div>
                                    <div style="font-size: 12px; color: var(--text-light);">
                                        ${ventasLiberadas.length} venta${ventasLiberadas.length > 1 ? 's' : ''} · $${totalLiberadas.toFixed(2)}
                                    </div>
                                </div>
                            </div>
                            <span style="font-size: 14px;">▼</span>
                        </div>
                    </div>
                    <div id="liberadas-${date}" style="display: none; margin-bottom: 6px; padding-left: 8px;">
                        ${ventasLiberadas.map(sale => {
                            const isVoid = sale.voided === 1;
                            const sesionBadge = sale.session ? getBadgeSesion(sale.session) : '';
                            
                            // 🆕 v2.1.12: Verificar permisos
                            const permisos = checkSalePermission(sale.id);
                            const bloqueado = !permisos.puede;
                            
                            return `
                                <div class="card" style="border-left: 4px solid ${(isVoid || bloqueado) ? '#94a3b8' : '#8b5cf6'}; padding: 8px 14px; margin-bottom: 4px; opacity: ${(isVoid || bloqueado) ? 0.65 : 1};">
                                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                                        <div style="flex: 1;">
                                            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                                                <span style="font-size: 14px;">
                                                    ${bloqueado ? '🔒' : '🛒'} <span style="color: var(--text-light); font-weight: 600;">#${sale.id}</span> ${sale.product_name}
                                                </span>
                                                <span style="font-size: 11px; color: ${bloqueado ? '#94a3b8' : '#8b5cf6'}; background: ${bloqueado ? '#94a3b820' : '#8b5cf620'}; padding: 1px 6px; border-radius: 8px;">
                                                    ${bloqueado ? '🔒 Solo lectura' : '🚀 Liberada'}
                                                </span>
                                                ${sesionBadge}
                                            </div>
                                            <div style="display: flex; gap: 8px; margin-top: 2px; font-size: 12px; color: var(--text-light);">
                                                <span>📦 ${sale.quantity}</span>
                                                <span>${paymentIcons[sale.payment_method] || '💵'} ${sale.payment_method}</span>
                                            </div>
                                            ${bloqueado ? `<div style="margin-top: 2px; font-size: 10px; color: #94a3b8; font-style: italic;">🔒 ${permisos.razon}</div>` : ''}
                                        </div>
                                        <div style="display: flex; gap: 8px; align-items: center;">
                                            <span style="font-size: 15px; font-weight: 700; color: ${bloqueado ? '#94a3b8' : '#8b5cf6'};">$${parseFloat(sale.total).toFixed(2)}</span>
                                            <button onclick="viewSale(${sale.id})" class="btn secondary" style="padding: 2px 8px; font-size: 11px; width: auto;">👁️</button>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================================
// TOGGLE LIBERADAS
// ============================================================

function toggleLiberadas(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ============================================================
// TOGGLE DAY SALES
// ============================================================

function toggleDaySales(dayId) {
    const dayContent = document.getElementById(dayId);
    const arrow = document.getElementById('arrow-' + dayId);
    if (!dayContent) return;
    
    if (dayContent.style.display === 'none') {
        dayContent.style.display = 'block';
        if (arrow) arrow.textContent = '🔽';
    } else {
        dayContent.style.display = 'none';
        if (arrow) arrow.textContent = '▶️';
    }
}

// ============================================================
// ACTUALIZAR RESUMEN
// ============================================================

async function updateSummary() {
    try {
        const negocioId = window.DBModule.getNegocioIdActual();
        if (!negocioId) return;
        
        const today = new Date().toISOString().split('T')[0];
        
        const todaySales = window.DBModule.query(
            'SELECT SUM(total) as total FROM sales WHERE negocio_id = ? AND DATE(sale_date, "localtime") = DATE(?) AND deleted_at IS NULL AND voided = 0',
            [negocioId, today]
        );
        const todayTotal = todaySales[0]?.total || 0;
        const salesTodayEl = document.getElementById('sales-today');
        if (salesTodayEl) salesTodayEl.textContent = '$' + todayTotal.toFixed(2);
        
        const incomeResult = window.DBModule.query(
            'SELECT SUM(amount) as total FROM transactions WHERE negocio_id = ? AND type = "income" AND deleted_at IS NULL AND voided = 0',
            [negocioId]
        );
        const totalIncome = incomeResult[0]?.total || 0;
        const totalIncomeEl = document.getElementById('total-income');
        if (totalIncomeEl) totalIncomeEl.textContent = '$' + totalIncome.toFixed(2);
        
        const expenseResult = window.DBModule.query(
            'SELECT SUM(amount) as total FROM transactions WHERE negocio_id = ? AND type = "expense" AND deleted_at IS NULL AND voided = 0',
            [negocioId]
        );
        const totalExpenses = expenseResult[0]?.total || 0;
        const totalExpensesEl = document.getElementById('total-expenses');
        if (totalExpensesEl) totalExpensesEl.textContent = '$' + totalExpenses.toFixed(2);
        
        const debtsResult = window.DBModule.query(
            'SELECT SUM(total) as total FROM sales WHERE negocio_id = ? AND is_debt = 1 AND paid = 0 AND deleted_at IS NULL AND voided = 0',
            [negocioId]
        );
        const totalDebts = debtsResult[0]?.total || 0;
        const totalDebtsEl = document.getElementById('total-debts');
        if (totalDebtsEl) totalDebtsEl.textContent = '$' + totalDebts.toFixed(2);
        
        const releasedResult = window.DBModule.query(
            'SELECT COUNT(*) as count, SUM(total) as total FROM sales WHERE negocio_id = ? AND is_liberated = 1 AND deleted_at IS NULL AND voided = 0',
            [negocioId]
        );
        const releasedCount = releasedResult[0]?.count || 0;
        const releasedTotal = releasedResult[0]?.total || 0;
        
        const totalReleasedEl = document.getElementById('total-released');
        if (totalReleasedEl) totalReleasedEl.textContent = '$' + releasedTotal.toFixed(2);
        
        const totalReleasedCountEl = document.getElementById('total-released-count');
        if (totalReleasedCountEl) {
            totalReleasedCountEl.textContent = releasedCount + ' venta' + (releasedCount !== 1 ? 's' : '');
        }
        
    } catch (error) {
        console.error('Error actualizando resumen:', error);
    }
}

// ============================================================
// DÍAS SIN VENTAS — MODAL PRINCIPAL
// ============================================================

async function showDiasSinVentasModal() {
    const existingModal = document.getElementById('dias-sin-ventas-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'dias-sin-ventas-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999; padding: 15px;
        animation: modalFadeIn 0.25s ease;
    `;
    
    document.body.appendChild(modal);
    window._diasSinVentasModal = modal;
    
    await renderDiasSinVentasContent();
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeDiasSinVentasModal();
    });
    
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeDiasSinVentasModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

async function renderDiasSinVentasContent() {
    const modal = document.getElementById('dias-sin-ventas-modal');
    if (!modal) return;
    
    try {
        const fromDate = document.getElementById('dsv-filter-from')?.value || '';
        const toDate = document.getElementById('dsv-filter-to')?.value || '';
        const motivoFilter = document.getElementById('dsv-filter-motivo')?.value || '';
        
        const filters = {};
        if (fromDate) filters.from_date = fromDate;
        if (toDate) filters.to_date = toDate;
        if (motivoFilter) filters.motivo = motivoFilter;
        
        const dias = window.DBModule.getDiasSinVentas(filters);
        
        const todos = window.DBModule.getDiasSinVentas();
        const totalDias = todos.length;
        
        const porMotivo = {};
        todos.forEach(d => {
            porMotivo[d.motivo] = (porMotivo[d.motivo] || 0) + 1;
        });
        
        let listaHtml = '';
        if (dias.length === 0) {
            listaHtml = `
                <div style="text-align: center; padding: 40px 20px; color: var(--text-light);">
                    <span style="font-size: 56px;">📅</span>
                    <p style="margin-top: 12px; font-size: 15px; font-weight: 600;">No hay días sin ventas registrados</p>
                    <p style="font-size: 13px;">Registra los días en los que no tuviste actividad</p>
                </div>
            `;
        } else {
            listaHtml = dias.map(d => {
                const motivo = getMotivoDiaSinVenta(d.motivo);
                const fechaLarga = formatearFechaLarga(d.fecha);
                
                return `
                    <div style="background: var(--bg); border-radius: 10px; padding: 12px; margin-bottom: 8px; border-left: 4px solid ${motivo.color}; display: flex; align-items: flex-start; gap: 10px;">
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
                                <span style="font-weight: 700; font-size: 14px; color: var(--text);">📅 ${fechaLarga}</span>
                                <span style="font-size: 11px; background: ${motivo.color}20; color: ${motivo.color}; padding: 2px 8px; border-radius: 10px; font-weight: 600;">${motivo.label}</span>
                            </div>
                            ${d.nota ? `<div style="font-size: 12px; color: var(--text-light); font-style: italic;">📝 ${d.nota}</div>` : ''}
                        </div>
                        <div style="display: flex; gap: 4px; flex-shrink: 0;">
                            <button onclick="showDiaSinVentaForm(${d.id})" class="btn secondary" style="padding: 4px 10px; font-size: 11px; width: auto;" title="Editar">✏️</button>
                            <button onclick="confirmDeleteDiaSinVenta(${d.id}, '${fechaLarga.replace(/'/g, "\\'")}')" class="btn secondary" style="padding: 4px 10px; font-size: 11px; width: auto; color: #ef4444; border-color: #ef4444;" title="Eliminar">🗑️</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        let motivosStatsHtml = '';
        if (Object.keys(porMotivo).length > 0) {
            motivosStatsHtml = Object.entries(porMotivo)
                .sort((a, b) => b[1] - a[1])
                .map(([motivo, count]) => {
                    const m = getMotivoDiaSinVenta(motivo);
                    return `<span style="font-size: 11px; background: ${m.color}20; color: ${m.color}; padding: 2px 10px; border-radius: 10px; font-weight: 600;">${m.label}: ${count}</span>`;
                }).join(' ');
        }
        
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 20px; max-width: 650px; width: 100%; max-height: 92vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 1px solid var(--border-color);">
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 2px solid #06b6d4; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 28px;">📅</span>
                        <div>
                            <h2 style="margin: 0; font-size: 18px; color: #06b6d4;">Días sin ventas</h2>
                            <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">Registra los días sin actividad</p>
                        </div>
                    </div>
                    <button onclick="closeDiasSinVentasModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
                </div>
                
                <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;">
                    <div style="background: #06b6d415; border-left: 3px solid #06b6d4; padding: 8px 14px; border-radius: 8px;">
                        <span style="font-size: 18px; font-weight: 700; color: #06b6d4;">${totalDias}</span>
                        <span style="font-size: 11px; color: var(--text-light); margin-left: 4px;">días registrados</span>
                    </div>
                    ${motivosStatsHtml}
                </div>
                
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
                    <button onclick="showDiaSinVentaForm()" 
                            class="btn primary" 
                            style="padding: 8px 16px; font-size: 13px; width: auto; background: #06b6d4; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        ➕ Registrar día
                    </button>
                    <button onclick="reporteDiasSinVentas()" 
                            class="btn secondary" 
                            style="padding: 8px 16px; font-size: 13px; width: auto; background: #3b82f6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        📄 Reporte PDF
                    </button>
                    <button onclick="refrescarDiasSinVentas()" 
                            class="btn secondary" 
                            style="padding: 8px 16px; font-size: 13px; width: auto; margin-left: auto;">
                        🔄 Refrescar
                    </button>
                </div>
                
                <div style="background: var(--bg); padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end;">
                    <div style="flex: 1; min-width: 100px;">
                        <label style="font-size: 11px; font-weight: 600; color: var(--text-label); display: block; margin-bottom: 2px;">📅 Desde</label>
                        <input type="date" id="dsv-filter-from" value="${fromDate}" 
                               onchange="refrescarDiasSinVentas()"
                               style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                    </div>
                    <div style="flex: 1; min-width: 100px;">
                        <label style="font-size: 11px; font-weight: 600; color: var(--text-label); display: block; margin-bottom: 2px;">📅 Hasta</label>
                        <input type="date" id="dsv-filter-to" value="${toDate}" 
                               onchange="refrescarDiasSinVentas()"
                               style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                    </div>
                    <div style="flex: 1; min-width: 120px;">
                        <label style="font-size: 11px; font-weight: 600; color: var(--text-label); display: block; margin-bottom: 2px;">📌 Motivo</label>
                        <select id="dsv-filter-motivo" onchange="refrescarDiasSinVentas()"
                                style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-card); color: var(--text); font-size: 12px;">
                            <option value="">Todos los motivos</option>
                            ${MOTIVOS_DIAS_SIN_VENTAS.map(m => `
                                <option value="${m.value}" ${motivoFilter === m.value ? 'selected' : ''}>${m.label}</option>
                            `).join('')}
                        </select>
                    </div>
                    <button onclick="limpiarFiltrosDiasSinVentas()" 
                            class="btn secondary" 
                            style="padding: 6px 12px; font-size: 11px; width: auto;">
                        🗑️
                    </button>
                </div>
                
                <div style="flex: 1; overflow-y: auto; max-height: 400px; padding-right: 4px;">
                    ${listaHtml}
                </div>
                
                <div style="display: flex; justify-content: flex-end; padding-top: 12px; margin-top: 12px; border-top: 1px solid var(--border-color);">
                    <button onclick="closeDiasSinVentasModal()" class="btn secondary" style="padding: 10px 20px; font-size: 14px; width: auto;">
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('❌ Error renderizando días sin ventas:', error);
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 500px; width: 100%; text-align: center;">
                <span style="font-size: 48px;">❌</span>
                <h2 style="margin: 12px 0 8px;">Error</h2>
                <p style="color: var(--text-light); font-size: 13px;">${error.message}</p>
                <button onclick="closeDiasSinVentasModal()" class="btn secondary" style="margin-top: 12px; padding: 8px 20px; width: auto;">
                    Cerrar
                </button>
            </div>
        `;
    }
}

async function refrescarDiasSinVentas() {
    await renderDiasSinVentasContent();
}

function limpiarFiltrosDiasSinVentas() {
    const from = document.getElementById('dsv-filter-from');
    const to = document.getElementById('dsv-filter-to');
    const motivo = document.getElementById('dsv-filter-motivo');
    if (from) from.value = '';
    if (to) to.value = '';
    if (motivo) motivo.value = '';
    refrescarDiasSinVentas();
}

function closeDiasSinVentasModal() {
    const modal = document.getElementById('dias-sin-ventas-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
        setTimeout(() => {
            const still = document.getElementById('dias-sin-ventas-modal');
            if (still && still.parentNode) still.remove();
        }, 500);
    }
    window._diasSinVentasModal = null;
}

// ============================================================
// FORMULARIO DE DÍA SIN VENTA
// ============================================================

async function showDiaSinVentaForm(id = null) {
    const existingModal = document.getElementById('dia-sin-venta-form-modal');
    if (existingModal) existingModal.remove();
    
    const isEdit = id !== null && id !== undefined;
    let diaExistente = null;
    
    if (isEdit) {
        diaExistente = window.DBModule.getDiaSinVenta(id);
        if (!diaExistente) {
            window.showToast('❌ Día sin ventas no encontrado', 'error');
            return;
        }
    }
    
    const hoyStr = new Date().toISOString().split('T')[0];
    const fechaValue = diaExistente?.fecha || hoyStr;
    const motivoValue = diaExistente?.motivo || 'apagon';
    const notaValue = diaExistente?.nota || '';
    
    const modal = document.createElement('div');
    modal.id = 'dia-sin-venta-form-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999999; padding: 20px;
        animation: modalFadeIn 0.25s ease;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 440px; width: 100%; max-height: 92vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #06b6d4;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">📅</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #06b6d4;">
                            ${isEdit ? 'Editar día sin ventas' : 'Registrar día sin ventas'}
                        </h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">
                            ${isEdit ? 'Modifica los datos del día' : 'Añade un día sin actividad'}
                        </p>
                    </div>
                </div>
                <button onclick="closeDiaSinVentaForm()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="background: #06b6d415; border: 1px solid #06b6d4; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; font-size: 12px; color: #06b6d4;">
                💡 <strong>¿Para qué sirve?</strong><br>
                Registra los días en los que no vendiste (apagón, vacaciones, etc.) para llevar un historial y entender mejor tus estadísticas.
            </div>
            
            <form id="dia-sin-venta-form" style="display: flex; flex-direction: column; gap: 12px;">
                
                <div class="form-group">
                    <label>📅 Fecha <span style="color: #ef4444;">*</span></label>
                    <input type="date" id="dsv-fecha" value="${fechaValue}" required
                           style="width: 100%; padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text);">
                </div>
                
                <div class="form-group">
                    <label>📌 Motivo <span style="color: #ef4444;">*</span></label>
                    <select id="dsv-motivo" required
                            style="width: 100%; padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text);">
                        ${MOTIVOS_DIAS_SIN_VENTAS.map(m => `
                            <option value="${m.value}" ${motivoValue === m.value ? 'selected' : ''}>${m.label}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>📝 Nota (opcional)</label>
                    <textarea id="dsv-nota" rows="3" placeholder="Ej: Apagón programado de 8 horas"
                              style="width: 100%; padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text); font-family: inherit; resize: vertical;">${notaValue}</textarea>
                </div>
                
                <div id="dsv-warning" style="display: none; background: #fef9e7; border: 1px solid #f59e0b; border-radius: 8px; padding: 10px 12px; font-size: 12px; color: #92400e;"></div>
                
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" 
                            style="flex: 1; padding: 12px; font-size: 14px; background: #06b6d4; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        💾 ${isEdit ? 'Guardar cambios' : 'Registrar día'}
                    </button>
                    <button type="button" onclick="closeDiaSinVentaForm()" class="btn secondary" style="flex: 1;">
                        ❌ Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const fechaInput = document.getElementById('dsv-fecha');
    const warningEl = document.getElementById('dsv-warning');
    
    function verificarVentasEnFecha() {
        const fecha = fechaInput.value;
        if (!fecha) {
            warningEl.style.display = 'none';
            return;
        }
        
        try {
            const negocioId = window.DBModule.getNegocioIdActual();
            const ventasCount = window.DBModule.query(
                `SELECT COUNT(*) as count FROM sales 
                 WHERE negocio_id = ? AND DATE(sale_date, "localtime") = DATE(?) 
                 AND deleted_at IS NULL AND voided = 0`,
                [negocioId, fecha]
            );
            const count = ventasCount[0]?.count || 0;
            
            if (count > 0) {
                warningEl.innerHTML = `⚠️ <strong>Atención:</strong> Ya existen <strong>${count} venta(s)</strong> registradas en esa fecha. Si registras el día como "sin ventas", puede haber inconsistencias en las estadísticas. ¿Estás seguro?`;
                warningEl.style.display = 'block';
            } else {
                warningEl.style.display = 'none';
            }
        } catch (e) {
            warningEl.style.display = 'none';
        }
    }
    
    fechaInput.addEventListener('change', verificarVentasEnFecha);
    
    if (!isEdit) {
        setTimeout(verificarVentasEnFecha, 100);
    }
    
    const form = document.getElementById('dia-sin-venta-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitDiaSinVentaForm(isEdit ? id : null);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeDiaSinVentaForm();
    });
}

async function submitDiaSinVentaForm(id = null) {
    const fecha = document.getElementById('dsv-fecha')?.value;
    const motivo = document.getElementById('dsv-motivo')?.value;
    const nota = document.getElementById('dsv-nota')?.value?.trim() || '';
    
    if (!fecha) {
        window.showToast('⚠️ La fecha es obligatoria', 'error');
        return;
    }
    if (!motivo) {
        window.showToast('⚠️ El motivo es obligatorio', 'error');
        return;
    }
    
    if (!id) {
        const existente = window.DBModule.getDiaSinVentaByFecha(fecha);
        if (existente) {
            const confirm = await window.ModalModule.showConfirm({
                title: '⚠️ Ya existe',
                message: `Ya hay un día sin ventas registrado para el ${formatearFechaLarga(fecha)}.\n\n¿Quieres reemplazarlo?`,
                confirmText: 'Sí, reemplazar',
                cancelText: 'Cancelar',
                icon: '⚠️',
                confirmColor: '#f59e0b'
            });
            if (!confirm) return;
            id = existente.id;
        }
    }
    
    const data = {
        fecha: fecha,
        motivo: motivo,
        nota: nota || null
    };
    
    if (id) data.id = id;
    
    try {
        const result = window.DBModule.saveDiaSinVenta(data);
        
        if (result.success) {
            window.showToast(
                id ? '✅ Día sin ventas actualizado' : '✅ Día sin ventas registrado',
                'success'
            );
            
            closeDiaSinVentaForm();
            
            setTimeout(() => {
                if (document.getElementById('dias-sin-ventas-modal')) {
                    refrescarDiasSinVentas();
                }
            }, 300);
            
            if (typeof window.loadDashboardData === 'function') {
                setTimeout(window.loadDashboardData, 500);
            }
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('❌ Error guardando día sin ventas:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

function closeDiaSinVentaForm() {
    const modal = document.getElementById('dia-sin-venta-form-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
        setTimeout(() => {
            const still = document.getElementById('dia-sin-venta-form-modal');
            if (still && still.parentNode) still.remove();
        }, 500);
    }
}

async function confirmDeleteDiaSinVenta(id, fechaStr) {
    const confirm = await window.ModalModule.showConfirm({
        title: '🗑️ Eliminar día sin ventas',
        message: `¿Eliminar el día sin ventas del ${fechaStr}?\n\nEsta acción se puede deshacer solo desde "Limpiar datos eliminados".`,
        confirmText: '🗑️ Sí, eliminar',
        cancelText: '❌ Cancelar',
        icon: '🗑️',
        confirmColor: '#ef4444'
    });
    
    if (!confirm) return;
    
    try {
        const result = window.DBModule.deleteDiaSinVenta(id);
        
        if (result.success) {
            window.showToast('🗑️ Día sin ventas eliminado', 'success', 3000);
            
            setTimeout(() => {
                if (document.getElementById('dias-sin-ventas-modal')) {
                    refrescarDiasSinVentas();
                }
            }, 300);
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('❌ Error eliminando:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

async function reporteDiasSinVentas() {
    try {
        if (window.ReportsModule && typeof window.ReportsModule.generateDiasSinVentasReport === 'function') {
            window.showToast('⏳ Generando reporte...', 'info', 2000);
            
            const html = await window.ReportsModule.generateDiasSinVentasReport();
            
            if (html) {
                window.ReportsModule.printReport(html);
                window.showToast('✅ Reporte generado', 'success', 3000);
            } else {
                window.showToast('⚠️ No hay datos para el reporte', 'warning', 3000);
            }
        } else {
            window.showToast('⚠️ Módulo de reportes no disponible aún', 'warning', 4000);
        }
    } catch (error) {
        console.error('❌ Error generando reporte:', error);
        window.showToast('❌ Error: ' + error.message, 'error', 5000);
    }
}

// ============================================================
// FORMULARIO: VENTA LIBERADA
// ============================================================

async function showLiberatedSaleForm() {
    const existingModal = document.getElementById('liberated-sale-modal');
    if (existingModal) existingModal.remove();
    
    const productos = await window.DBModule.getProductos();
    
    const modal = document.createElement('div');
    modal.id = 'liberated-sale-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 420px; width: 100%; max-height: 90vh; overflow-y: auto; border: 2px solid #8b5cf6;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="margin: 0; color: #8b5cf6;">🚀 Venta liberada</h2>
                <button onclick="closeLiberatedSaleModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="background: #8b5cf615; border: 1px solid #8b5cf6; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; font-size: 13px; color: #8b5cf6;">
                💡 Venta sin cliente identificado. <strong>Pago obligatorio al momento</strong> (sin opción de deuda).
            </div>
            
            <form id="liberated-sale-form" style="display: flex; flex-direction: column; gap: 12px;">
                
                <div class="form-group">
                    <label>🏷️ Producto</label>
                    <select id="liberated-product" style="padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text); width: 100%;" required>
                        <option value="">Seleccionar producto...</option>
                        ${productos.map(p => `
                            <option value="${p.id}" data-precio="${p.precio_venta}" data-receta="${p.receta_id || ''}">
                                ${p.nombre} - $${p.precio_venta} (${p.unidad_venta})
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div class="form-group">
                        <label>📦 Cantidad</label>
                        <input type="number" id="liberated-quantity" value="1" step="0.1" min="0.1" required
                               style="width: 100%; padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text);">
                    </div>
                    <div class="form-group">
                        <label>💰 Precio unitario</label>
                        <input type="number" id="liberated-price" value="0" step="0.01" min="0" required
                               style="width: 100%; padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text);">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>💳 Método de pago</label>
                    <select id="liberated-payment" style="padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text); width: 100%;">
                        <option value="cash">💵 Efectivo</option>
                        <option value="transfer">🏦 Transferencia</option>
                        <option value="other">🔄 Otra</option>
                    </select>
                </div>
                
                <div style="text-align: right; font-size: 22px; font-weight: 700; color: #8b5cf6;">
                    Total: $<span id="liberated-total-display">0.00</span>
                </div>
                
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" style="flex: 1; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; padding: 12px; cursor: pointer; font-weight: 600;">
                        ✅ Guardar venta liberada
                    </button>
                    <button type="button" onclick="closeLiberatedSaleModal()" class="btn secondary" style="flex: 1;">
                        ❌ Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const select = document.getElementById('liberated-product');
    const priceInput = document.getElementById('liberated-price');
    const qtyInput = document.getElementById('liberated-quantity');
    const totalDisplay = document.getElementById('liberated-total-display');
    
    function updateTotal() {
        const qty = parseFloat(qtyInput?.value) || 0;
        const price = parseFloat(priceInput?.value) || 0;
        if (totalDisplay) totalDisplay.textContent = (qty * price).toFixed(2);
    }
    
    select.onchange = function() {
        const selected = this.options[this.selectedIndex];
        const precio = selected?.dataset?.precio || 0;
        if (priceInput) priceInput.value = precio;
        updateTotal();
    };
    
    qtyInput.addEventListener('input', updateTotal);
    priceInput.addEventListener('input', updateTotal);
    
    const form = document.getElementById('liberated-sale-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitLiberatedSale();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeLiberatedSaleModal();
    });
    
    updateTotal();
}

async function submitLiberatedSale() {
    const select = document.getElementById('liberated-product');
    const productoId = parseInt(select.value);
    const productName = select.options[select.selectedIndex]?.text?.split(' - ')[0] || '';
    const recetaId = select.options[select.selectedIndex]?.dataset?.receta || '';
    const quantity = parseFloat(document.getElementById('liberated-quantity').value) || 0;
    const unitPrice = parseFloat(document.getElementById('liberated-price').value) || 0;
    const paymentMethod = document.getElementById('liberated-payment').value;
    
    if (!productoId) {
        window.showToast('⚠️ Selecciona un producto', 'error');
        return;
    }
    if (quantity <= 0) {
        window.showToast('⚠️ La cantidad debe ser mayor a 0', 'error');
        return;
    }
    if (unitPrice <= 0) {
        window.showToast('⚠️ El precio debe ser mayor a 0', 'error');
        return;
    }
    
    const saleDateNormalizada = normalizarFechaVenta(new Date().toISOString().split('T')[0]);
    
    try {
        const result = await window.SalesModule.saveLiberatedSale({
            product_name: productName,
            producto_id: productoId,
            receta_id: recetaId || null,
            quantity: quantity,
            unit_price: unitPrice,
            payment_method: paymentMethod,
            sale_date: saleDateNormalizada
        });
        
        if (result.success) {
            closeLiberatedSaleModal();
            window.showToast('✅ Venta liberada registrada', 'success');
            loadSalesAndExpenses();
            updateSummary();
            if (typeof window.loadDashboardData === 'function') {
                setTimeout(window.loadDashboardData, 500);
            }
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

function closeLiberatedSaleModal() {
    const modal = document.getElementById('liberated-sale-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => {
            if (modal.parentNode) modal.remove();
        }, 200);
    }
}

// ============================================================
// FORMULARIO: NUEVA VENTA
// 🆕 v2.1.12: Bloquea si la venta está en modo solo-lectura
// ============================================================

async function showSaleForm(saleId = null) {
    const existingModal = document.getElementById('sale-modal');
    if (existingModal) existingModal.remove();
    
    const isEdit = !!saleId;
    
    // 🆕 v2.1.12: Verificar permisos ANTES de cargar
    if (isEdit) {
        const permisos = checkSalePermission(saleId);
        if (!permisos.puede) {
            await window.ModalModule.showAlert({
                title: '🔒 Venta bloqueada',
                message: `No puedes editar esta venta.\n\n${permisos.razon}\n\n💡 Pídele al administrador que comparta las recetas asociadas con el negocio.`,
                icon: '🔒',
                type: 'warning',
                buttonText: 'Entendido'
            });
            return;
        }
    }
    
    const loadData = async () => {
        let saleData = null;
        
        if (isEdit) {
            saleData = await window.SalesModule.getSale(saleId);
            if (!saleData) {
                window.showToast('❌ Venta no encontrada', 'error');
                return;
            }
        }
        
        const productos = await window.DBModule.getProductos();
        renderForm(saleData, productos);
    };
    
    const renderForm = (saleData, productos) => {
        const isDebtEdit = isEdit && saleData?.is_debt === 1 && saleData?.paid === 0;
        
        const modal = document.createElement('div');
        modal.id = 'sale-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            z-index: 99999; padding: 20px;
        `;
        
        let saleDateValue = new Date().toISOString().split('T')[0];
        if (saleData && saleData.sale_date) {
            saleDateValue = new Date(saleData.sale_date).toISOString().split('T')[0];
        }
        
        let warningHtml = '';
        if (isDebtEdit) {
            warningHtml = `
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; color: #dc2626; font-size: 13px;">
                    ⚠️ <strong>Edición de deuda</strong><br>
                    Puedes cambiar el <strong>nombre del cliente</strong>, el <strong>método de pago</strong> o marcar como <strong>pagada</strong>.
                </div>
            `;
        } else if (isEdit && saleData?.order_id) {
            warningHtml = `
                <div style="background: #fef9e7; border: 1px solid #f59e0b; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; color: #92400e; font-size: 13px;">
                    ⚠️ Esta venta está vinculada al <strong>pedido #${saleData.order_id}</strong>.<br>
                    Si cambias el nombre del cliente, se desvinculará del pedido.
                </div>
            `;
        }
        
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <h2 style="margin: 0 0 16px 0;">${isEdit ? (isDebtEdit ? '💰 Cobrar Deuda' : '✏️ Editar Venta') : '💰 Nueva Venta'}</h2>
                
                ${warningHtml}
                
                <form id="sale-form" style="display: flex; flex-direction: column; gap: 12px;">
                    ${isEdit ? `<input type="hidden" id="sale-id" value="${saleData.id}">` : ''}
                    
                    <div class="form-group">
                        <label>🏷️ Producto</label>
                        <select id="sale-product" style="padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text); width: 100%;" 
                                ${isDebtEdit ? 'disabled style="opacity: 0.6; cursor: not-allowed;"' : ''} required>
                            <option value="">Seleccionar producto...</option>
                            ${productos.map(p => `
                                <option value="${p.id}" data-precio="${p.precio_venta}" data-receta="${p.receta_id || ''}" ${saleData?.producto_id === p.id ? 'selected' : ''}>
                                    ${p.nombre} - $${p.precio_venta} (${p.unidad_venta})
                                </option>
                            `).join('')}
                        </select>
                        ${isDebtEdit ? `<input type="hidden" id="sale-product-hidden" value="${saleData.producto_id}">` : ''}
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group">
                            <label>📦 Cantidad</label>
                            <input type="number" id="sale-quantity" value="${saleData?.quantity || 1}" step="0.1" min="0.1" 
                                   ${isDebtEdit ? 'disabled style="opacity: 0.6; cursor: not-allowed;"' : ''} required>
                            ${isDebtEdit ? `<input type="hidden" id="sale-quantity-hidden" value="${saleData.quantity}">` : ''}
                        </div>
                        <div class="form-group">
                            <label>💰 Precio unitario</label>
                            <input type="number" id="sale-price" value="${saleData?.unit_price || 0}" step="0.01" min="0" 
                                   ${isDebtEdit ? 'disabled style="opacity: 0.6; cursor: not-allowed;"' : ''} required>
                            ${isDebtEdit ? `<input type="hidden" id="sale-price-hidden" value="${saleData.unit_price}">` : ''}
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group">
                            <label>💳 Método de pago</label>
                            <select id="sale-payment" style="padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text); width: 100%;">
                                <option value="cash" ${saleData?.payment_method === 'cash' ? 'selected' : ''}>💵 Efectivo</option>
                                <option value="transfer" ${saleData?.payment_method === 'transfer' ? 'selected' : ''}>🏦 Transferencia</option>
                                <option value="debt" ${saleData?.payment_method === 'debt' ? 'selected' : ''}>💳 Deuda</option>
                                <option value="other" ${saleData?.payment_method === 'other' ? 'selected' : ''}>🔄 Otra</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>👤 Comprador <span style="font-size: 10px; color: #10b981;">(editable)</span></label>
                            <input type="text" id="sale-buyer" value="${saleData?.buyer || ''}" placeholder="Nombre del comprador">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>📅 Fecha de venta</label>
                        <input type="date" id="sale-date" value="${saleDateValue}" 
                               ${isDebtEdit ? 'disabled style="opacity: 0.6; cursor: not-allowed;"' : ''}
                               onchange="onSaleDateChange()"
                               style="width: 100%; padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text);">
                        ${isDebtEdit ? `<input type="hidden" id="sale-date-hidden" value="${saleDateValue}">` : ''}
                    </div>
                    
                    <div id="sale-corriente-banner"></div>
                    
                    <div class="form-group">
                        <label>🕐 Sesión de la venta <span style="font-size: 11px; color: var(--text-light); font-weight: normal;">(opcional)</span></label>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            <label class="sesion-option-sale" style="flex: 1; min-width: 80px; padding: 8px 12px; border-radius: 8px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg); transition: all 0.2s;" onclick="selectSesionSale('')">
                                <input type="radio" name="sale-sesion" value="" ${!saleData?.session ? 'checked' : ''} style="display: none;">
                                <span style="font-size: 13px;">➖ Sin especificar</span>
                            </label>
                            <label class="sesion-option-sale" style="flex: 1; min-width: 80px; padding: 8px 12px; border-radius: 8px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg); transition: all 0.2s;" onclick="selectSesionSale('manana')">
                                <input type="radio" name="sale-sesion" value="manana" ${saleData?.session === 'manana' ? 'checked' : ''} style="display: none;">
                                <span style="font-size: 13px;">🌅 Mañana</span>
                            </label>
                            <label class="sesion-option-sale" style="flex: 1; min-width: 80px; padding: 8px 12px; border-radius: 8px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg); transition: all 0.2s;" onclick="selectSesionSale('tarde')">
                                <input type="radio" name="sale-sesion" value="tarde" ${saleData?.session === 'tarde' ? 'checked' : ''} style="display: none;">
                                <span style="font-size: 13px;">☀️ Tarde</span>
                            </label>
                            <label class="sesion-option-sale" style="flex: 1; min-width: 80px; padding: 8px 12px; border-radius: 8px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg); transition: all 0.2s;" onclick="selectSesionSale('noche')">
                                <input type="radio" name="sale-sesion" value="noche" ${saleData?.session === 'noche' ? 'checked' : ''} style="display: none;">
                                <span style="font-size: 13px;">🌙 Noche</span>
                            </label>
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border-color);">
                        <span style="font-size: 20px;">💳</span>
                        <span style="flex: 1; font-size: 14px; font-weight: 500;">Es una deuda</span>
                        <input type="checkbox" id="sale-is-debt" ${saleData?.is_debt ? 'checked' : ''} 
                               style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--primary);">
                    </div>
                    
                    <div style="text-align: right; font-size: 20px; font-weight: 700; color: var(--primary);">
                        Total: $<span id="sale-total-display">${saleData?.total || '0.00'}</span>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button type="submit" class="btn primary" style="flex: 1;">💾 Guardar</button>
                        <button type="button" onclick="window.closeSaleModal()" class="btn secondary" style="flex: 1;">❌ Cancelar</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        setTimeout(() => {
            onSaleDateChange();
            if (saleData?.session) {
                highlightSesionSelectionSale(saleData.session);
            } else {
                highlightSesionSelectionSale('');
            }
        }, 50);
        
        const select = document.getElementById('sale-product');
        const priceInput = document.getElementById('sale-price');
        const qtyInput = document.getElementById('sale-quantity');
        const totalDisplay = document.getElementById('sale-total-display');
        
        function updateTotal() {
            let qty = parseFloat(qtyInput?.value) || 0;
            let price = parseFloat(priceInput?.value) || 0;
            
            if (isDebtEdit) {
                qty = parseFloat(document.getElementById('sale-quantity-hidden')?.value) || 0;
                price = parseFloat(document.getElementById('sale-price-hidden')?.value) || 0;
            }
            
            if (totalDisplay) totalDisplay.textContent = (qty * price).toFixed(2);
        }
        
        if (!isDebtEdit) {
            select.onchange = function() {
                const selected = this.options[this.selectedIndex];
                const precio = selected?.dataset?.precio || 0;
                if (priceInput) priceInput.value = precio;
                updateTotal();
            };
            
            qtyInput.addEventListener('input', updateTotal);
            priceInput.addEventListener('input', updateTotal);
        }
        
        if (isDebtEdit) updateTotal();
        
        const form = document.getElementById('sale-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitSaleForm(isEdit, isDebtEdit);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) window.closeSaleModal();
        });
        
        updateTotal();
    };
    
    loadData();
}

// ============================================================
// MANEJO DE SESIÓN
// ============================================================

function selectSesionSale(sesion) {
    const radios = document.querySelectorAll('input[name="sale-sesion"]');
    radios.forEach(r => { r.checked = (r.value === sesion); });
    highlightSesionSelectionSale(sesion);
}

function highlightSesionSelectionSale(sesion) {
    const labels = document.querySelectorAll('.sesion-option-sale');
    const colors = {
        '': { border: 'var(--border-color)', bg: 'var(--bg)' },
        'manana': { border: '#10b981', bg: '#10b98115' },
        'tarde': { border: '#f59e0b', bg: '#f59e0b15' },
        'noche': { border: '#92400e', bg: '#92400e15' }
    };
    
    labels.forEach(label => {
        const radio = label.querySelector('input[name="sale-sesion"]');
        if (!radio) return;
        if (radio.value === sesion) {
            label.style.borderColor = colors[sesion]?.border || 'var(--border-color)';
            label.style.background = colors[sesion]?.bg || 'var(--bg)';
            label.style.fontWeight = '600';
        } else {
            label.style.borderColor = 'var(--border-color)';
            label.style.background = 'var(--bg)';
            label.style.fontWeight = 'normal';
        }
    });
}

function onSaleDateChange() {
    const dateInput = document.getElementById('sale-date');
    const bannerContainer = document.getElementById('sale-corriente-banner');
    if (!dateInput || !bannerContainer) return;
    
    const fechaISO = dateInput.value;
    if (!fechaISO) { bannerContainer.innerHTML = ''; return; }
    
    bannerContainer.innerHTML = getBannerCorrienteHTML(fechaISO);
}

// ============================================================
// ENVIAR FORMULARIO DE VENTA
// ============================================================

async function submitSaleForm(isEdit, isDebtEdit = false) {
    let productoId, quantity, unitPrice, buyer, saleDate;
    
    if (isDebtEdit) {
        productoId = parseInt(document.getElementById('sale-product-hidden')?.value) || 0;
        quantity = parseFloat(document.getElementById('sale-quantity-hidden')?.value) || 0;
        unitPrice = parseFloat(document.getElementById('sale-price-hidden')?.value) || 0;
        buyer = document.getElementById('sale-buyer')?.value?.trim() || '';
        saleDate = document.getElementById('sale-date-hidden')?.value || new Date().toISOString().split('T')[0];
    } else {
        productoId = parseInt(document.getElementById('sale-product').value);
        quantity = parseFloat(document.getElementById('sale-quantity').value) || 0;
        unitPrice = parseFloat(document.getElementById('sale-price').value) || 0;
        buyer = document.getElementById('sale-buyer').value.trim();
        saleDate = document.getElementById('sale-date').value || new Date().toISOString().split('T')[0];
    }
    
    const paymentMethod = document.getElementById('sale-payment').value;
    const isDebt = document.getElementById('sale-is-debt').checked;
    
    let session = '';
    const sesionRadio = document.querySelector('input[name="sale-sesion"]:checked');
    if (sesionRadio) session = sesionRadio.value || null;
    
    if (!productoId) { window.showToast('⚠️ Selecciona un producto', 'error'); return; }
    if (quantity <= 0) { window.showToast('⚠️ Cantidad debe ser > 0', 'error'); return; }
    if (unitPrice <= 0) { window.showToast('⚠️ Precio debe ser > 0', 'error'); return; }
    if (!saleDate) { window.showToast('⚠️ La fecha es obligatoria', 'error'); return; }
    
    const select = document.getElementById('sale-product');
    const selectedOption = select.options[select.selectedIndex];
    const productName = selectedOption?.text?.split(' - ')[0] || 'Producto';
    const recetaId = selectedOption?.dataset?.receta || null;
    
    const total = quantity * unitPrice;
    
    const saleDateNormalizada = normalizarFechaVenta(saleDate);
    
    console.log('📅 [submitSaleForm] Fecha original:', saleDate, '→ normalizada:', saleDateNormalizada);
    
    const saleData = {
        producto_id: productoId,
        product_name: productName,
        receta_id: recetaId,
        quantity: quantity,
        unit_price: unitPrice,
        total: total,
        payment_method: paymentMethod,
        buyer: buyer || null,
        is_debt: isDebt,
        paid: isDebt ? 0 : 1,
        sale_date: saleDateNormalizada,
        session: session
    };
    
    const idInput = document.getElementById('sale-id');
    if (idInput) saleData.id = parseInt(idInput.value);
    
    try {
        const result = await window.SalesModule.saveSale(saleData);
        if (result.success) {
            window.closeSaleModal();
            window.showToast(`✅ Venta ${isEdit ? 'actualizada' : 'registrada'} correctamente`, 'success');
            loadSalesAndExpenses();
            updateSummary();
            if (typeof window.loadDashboardData === 'function') {
                setTimeout(window.loadDashboardData, 500);
            }
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// VER VENTA
// 🆕 v2.1.12: Modo solo-lectura si el usuario no puede procesar
// ============================================================

async function viewSale(id) {
    try {
        const sale = await window.SalesModule.getSale(id);
        if (!sale) { window.showToast('❌ Venta no encontrada', 'error'); return; }
        
        // 🆕 v2.1.12: Verificar permisos
        const permisos = checkSalePermission(sale);
        const bloqueado = !permisos.puede;
        
        const modal = document.createElement('div');
        modal.id = 'sale-view-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            z-index: 99999; padding: 20px;
        `;
        
        const isVoid = sale.voided === 1;
        const isDebt = sale.is_debt === 1 && sale.paid === 0;
        const isLiberated = sale.is_liberated === 1;
        const fechaLarga = formatearFechaLarga(sale.sale_date);
        const sesionBadge = sale.session ? getBadgeSesion(sale.session) : '';
        const corrienteSection = getSeccionCorrienteHTML(sale.sale_date.split('T')[0]);
        
        const auditoriaSection = renderAuditoriaHTML(sale);
        
        let vendedorFallback = '';
        if (!auditoriaSection && sale.user_id) {
            const nombreVendedor = window.DBModule.getUsuarioNombre(sale.user_id) || 'Desconocido';
            vendedorFallback = `
                <div style="background: var(--bg); border-radius: 8px; padding: 10px 12px; margin-top: 12px; border-left: 3px solid #94a3b8;">
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-label); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                        🔍 Auditoría
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px;">
                        <span style="color: var(--text-light);">👤 Vendedor:</span>
                        <span style="font-weight: 600; text-align: right;">${nombreVendedor}</span>
                    </div>
                </div>
            `;
        }
        
        // 🆕 v2.1.12: Aviso de bloqueo
        let avisoBloqueo = '';
        if (bloqueado) {
            const recetaInfo = permisos.recetaBloqueada
                ? `• ${permisos.recetaBloqueada.nombre}`
                : '';
            
            avisoBloqueo = `
                <div style="background: #ef444415; border: 2px solid #ef4444; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px;">
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <span style="font-size: 24px; flex-shrink: 0;">🔒</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 700; color: #ef4444; font-size: 14px; margin-bottom: 4px;">
                                Solo lectura
                            </div>
                            <div style="font-size: 12px; color: var(--text); line-height: 1.5;">
                                ${permisos.razon}
                            </div>
                            ${recetaInfo ? `
                                <div style="margin-top: 8px; padding: 6px 10px; background: var(--bg-card); border-radius: 6px; font-size: 11px; color: var(--text-light);">
                                    <strong style="color: #ef4444;">Receta bloqueada:</strong><br>
                                    ${recetaInfo}
                                </div>
                            ` : ''}
                            <div style="margin-top: 8px; font-size: 11px; color: var(--text-light); font-style: italic;">
                                💡 Pídele al administrador que comparta la receta con el negocio para poder procesar esta venta.
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 450px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h2 style="margin: 0;">💰 Detalle de Venta #${sale.id} ${bloqueado ? '🔒' : ''}</h2>
                    <button onclick="window.closeSaleViewModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
                </div>
                
                ${avisoBloqueo}
                
                ${isVoid ? '<div style="background: #94a3b820; padding: 8px 12px; border-radius: 8px; color: #94a3b8; margin-bottom: 12px;">🚫 Venta ANULADA</div>' : ''}
                ${isLiberated ? '<div style="background: #8b5cf620; padding: 8px 12px; border-radius: 8px; color: #8b5cf6; margin-bottom: 12px;">🚀 Venta LIBERADA</div>' : ''}
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 14px;">
                    <div><strong>🛒 Producto:</strong></div>
                    <div>${sale.product_name}</div>
                    <div><strong>📦 Cantidad:</strong></div>
                    <div>${sale.quantity}</div>
                    <div><strong>💰 Precio unitario:</strong></div>
                    <div>$${parseFloat(sale.unit_price).toFixed(2)}</div>
                    <div><strong>💵 Total:</strong></div>
                    <div style="font-weight: 700; color: ${isVoid ? '#94a3b8' : (isDebt ? '#ef4444' : '#10b981')};">
                        $${parseFloat(sale.total).toFixed(2)}
                    </div>
                    <div><strong>💳 Método:</strong></div>
                    <div>${sale.payment_method}</div>
                    ${sale.buyer ? `<div><strong>👤 Comprador:</strong></div><div>${sale.buyer}</div>` : ''}
                    <div><strong>📅 Fecha:</strong></div>
                    <div>${fechaLarga}</div>
                    ${sale.session ? `<div><strong>🕐 Sesión:</strong></div><div>${sesionBadge}</div>` : ''}
                    ${isVoid && sale.void_reason ? `<div><strong>📝 Motivo:</strong></div><div>${sale.void_reason}</div>` : ''}
                </div>
                
                ${corrienteSection}
                
                ${auditoriaSection}
                ${vendedorFallback}
                
                <hr>
                
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${!bloqueado && !isVoid ? `
                        <button onclick="showSaleForm(${sale.id})" class="btn secondary" style="padding: 6px 16px; font-size: 13px; width: auto;">
                            ✏️ Editar
                        </button>
                        <button onclick="voidSale(${sale.id})" class="btn danger" style="padding: 6px 16px; font-size: 13px; width: auto;">
                            🚫 Anular
                        </button>
                    ` : ''}
                    ${!bloqueado && isVoid ? `
                        <button onclick="unvoidSale(${sale.id})" class="btn success" style="padding: 6px 16px; font-size: 13px; width: auto;">
                            🔄 Restaurar
                        </button>
                    ` : ''}
                    <button onclick="window.closeSaleViewModal()" class="btn secondary" style="padding: 6px 16px; font-size: 13px; width: auto;">
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) window.closeSaleViewModal();
        });
    } catch (error) {
        console.error('Error:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// 🆕 v2.1.12: ANULAR VENTA CON VERIFICACIÓN DE PERMISOS
// ============================================================

async function voidSale(id) {
    console.log('🚫 [voidSale] ========== INICIO ==========');
    console.log('🚫 [voidSale] Anulando venta #' + id);
    
    // 🆕 v2.1.12: Verificar permisos ANTES de todo
    const permisos = checkSalePermission(id);
    if (!permisos.puede) {
        console.warn('🔒 [voidSale] Bloqueado:', permisos.razon);
        window.showToast('🔒 ' + permisos.razon, 'error', 6000);
        return;
    }
    
    // PASO 0: Verificar que no haya modales huérfanos
    const modalHuerfano = document.getElementById('custom-modal');
    if (modalHuerfano) {
        console.warn('🚫 [voidSale] Modal huérfano detectado, eliminando...');
        modalHuerfano.remove();
        window._modalResolve = null;
        window._modalResolved = false;
        await new Promise(r => setTimeout(r, 200));
    }
    
    // PASO 1: Confirmación
    console.log('🚫 [voidSale] Paso 1: Mostrando confirmación...');
    
    let confirm = false;
    try {
        confirm = await window.ModalModule.showConfirm({
            title: 'Anular venta',
            message: '¿Seguro que quieres anular esta venta?\n\nEl stock se repondrá automáticamente.',
            confirmText: 'Sí, anular',
            cancelText: 'Cancelar',
            icon: '🚫',
            confirmColor: '#ef4444'
        });
    } catch (err) {
        console.error('🚫 [voidSale] Error en showConfirm:', err);
        window.showToast('❌ Error al mostrar confirmación', 'error', 5000);
        return;
    }
    
    console.log('🚫 [voidSale] Confirmación recibida:', confirm);
    
    if (!confirm) {
        console.log('🚫 [voidSale] Usuario canceló en el paso 1');
        window.showToast('❌ Anulación cancelada', 'info', 2000);
        return;
    }
    
    // PASO 2: Esperar a que el confirm-modal se elimine del DOM
    console.log('🚫 [voidSale] Paso 2: Esperando a que el confirm-modal se cierre...');
    
    await waitForCustomModalRemoval(800);
    
    for (let i = 0; i < 3; i++) {
        const stillThere = document.getElementById('custom-modal');
        if (!stillThere) {
            console.log(`🚫 [voidSale] Confirm-modal cerrado (verificación ${i + 1}/3)`);
            break;
        }
        console.warn(`🚫 [voidSale] Confirm-modal aún presente (verificación ${i + 1}/3), esperando 200ms más...`);
        await new Promise(r => setTimeout(r, 200));
        if (i === 2 && stillThere) {
            console.warn('🚫 [voidSale] Forzando eliminación del confirm-modal');
            stillThere.remove();
            window._modalResolve = null;
            window._modalResolved = false;
        }
    }
    
    await new Promise(r => setTimeout(r, 150));
    
    // PASO 3: Prompt de motivo
    console.log('🚫 [voidSale] Paso 3: Mostrando prompt de motivo...');
    
    let reason = null;
    try {
        reason = await window.ModalModule.showPrompt({
            title: 'Motivo de anulación',
            message: 'Escribe el motivo (opcional):',
            placeholder: 'Ej: Error en el registro',
            icon: '📝'
        });
    } catch (err) {
        console.error('🚫 [voidSale] Error en showPrompt:', err);
        reason = null;
    }
    
    console.log('🚫 [voidSale] Motivo recibido:', reason);
    
    const motivoFinal = (reason && String(reason).trim()) ? String(reason).trim() : 'Anulación manual';
    
    // PASO 4: Ejecutar la anulación
    console.log('🚫 [voidSale] Paso 4: Ejecutando anulación con motivo:', motivoFinal);
    
    try {
        const result = await window.SalesModule.voidSale(id, motivoFinal);
        
        console.log('🚫 [voidSale] Resultado:', result);
        
        if (result && result.success) {
            window.showToast('✅ Venta anulada correctamente', 'success', 3000);
            console.log('✅ [voidSale] Venta anulada correctamente');
            
            try {
                loadSalesAndExpenses();
                updateSummary();
                if (typeof window.loadDashboardData === 'function') {
                    setTimeout(window.loadDashboardData, 500);
                }
            } catch (e) {
                console.warn('🚫 [voidSale] Error refrescando vistas:', e);
            }
        } else {
            const errorMsg = (result && result.error) ? result.error : 'Desconocido';
            window.showToast('❌ Error: ' + errorMsg, 'error', 6000);
            console.error('❌ [voidSale] Error:', errorMsg);
        }
    } catch (error) {
        console.error('❌ [voidSale] Excepción:', error);
        window.showToast('❌ Error: ' + error.message, 'error', 6000);
    }
    
    console.log('🚫 [voidSale] ========== FIN ==========');
}

// ============================================================
// RESTAURAR VENTA
// 🆕 v2.1.12: Verifica permisos antes del confirm
// ============================================================

async function unvoidSale(id) {
    console.log('🔄 [unvoidSale] Iniciando restauración de venta #' + id);
    
    // 🆕 v2.1.12: Verificar permisos ANTES de todo
    const permisos = checkSalePermission(id);
    if (!permisos.puede) {
        console.warn('🔒 [unvoidSale] Bloqueado:', permisos.razon);
        window.showToast('🔒 ' + permisos.razon, 'error', 6000);
        return;
    }
    
    const modalHuerfano = document.getElementById('custom-modal');
    if (modalHuerfano) {
        modalHuerfano.remove();
        window._modalResolve = null;
        window._modalResolved = false;
        await new Promise(r => setTimeout(r, 200));
    }
    
    let confirm = false;
    try {
        confirm = await window.ModalModule.showConfirm({
            title: 'Restaurar venta',
            message: '¿Seguro que quieres restaurar esta venta anulada?',
            confirmText: 'Sí, restaurar',
            cancelText: 'Cancelar',
            icon: '🔄',
            confirmColor: '#10b981'
        });
    } catch (err) {
        console.error('🔄 [unvoidSale] Error en showConfirm:', err);
        return;
    }
    
    if (!confirm) {
        window.showToast('❌ Restauración cancelada', 'info', 2000);
        return;
    }
    
    await waitForCustomModalRemoval(800);
    await new Promise(r => setTimeout(r, 150));
    
    try {
        const result = await window.SalesModule.unvoidSale(id);
        if (result && result.success) {
            window.showToast('✅ Venta restaurada correctamente', 'success', 3000);
            loadSalesAndExpenses();
            updateSummary();
            if (typeof window.loadDashboardData === 'function') setTimeout(window.loadDashboardData, 500);
        } else {
            const errorMsg = (result && result.error) ? result.error : 'Desconocido';
            window.showToast('❌ Error: ' + errorMsg, 'error', 6000);
        }
    } catch (error) {
        console.error('❌ [unvoidSale] Excepción:', error);
        window.showToast('❌ Error: ' + error.message, 'error', 6000);
    }
}

// ============================================================
// COBRAR DEUDA
// 🆕 v2.1.12: Verifica permisos antes del confirm
// ============================================================

async function registerSalePayment(saleId) {
    try {
        const sale = await window.SalesModule.getSale(saleId);
        if (!sale) { window.showToast('❌ Venta no encontrada', 'error'); return; }
        if (sale.paid === 1) { window.showToast('✅ Ya está pagada', 'info'); return; }
        
        // 🆕 v2.1.12: Verificar permisos
        const permisos = checkSalePermission(sale);
        if (!permisos.puede) {
            console.warn('🔒 [registerSalePayment] Bloqueado:', permisos.razon);
            window.showToast('🔒 ' + permisos.razon, 'error', 6000);
            return;
        }
        
        const modalHuerfano = document.getElementById('custom-modal');
        if (modalHuerfano) {
            modalHuerfano.remove();
            window._modalResolve = null;
            window._modalResolved = false;
            await new Promise(r => setTimeout(r, 200));
        }
        
        const confirm = await window.ModalModule.showConfirm({
            title: '💰 Cobrar deuda',
            message: `¿Confirmas el cobro de $${sale.total.toFixed(2)} por "${sale.product_name}"?\n\n👤 Cliente: ${sale.buyer || 'Cliente sin nombre'}\n🆔 Venta: #${sale.id}`,
            confirmText: '✅ Cobrar',
            cancelText: 'Cancelar',
            icon: '💰',
            confirmColor: '#10b981'
        });
        
        if (!confirm) return;
        
        await waitForCustomModalRemoval(500);
        
        window.DBModule.execute(`
            UPDATE sales 
            SET paid = 1, 
                is_debt = 0,
                payment_method = "cash" 
            WHERE id = ?
        `, [saleId]);
        
        if (sale.order_id) {
            try {
                window.DBModule.execute(`
                    UPDATE orders 
                    SET has_advance_payment = 1,
                        advance_amount = COALESCE(advance_amount, 0) + ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [sale.total, sale.order_id]);
            } catch (e) {
                console.warn('⚠️ No se pudo actualizar el pedido asociado:', e.message);
            }
        }
        
        window.DBModule.saveAndNotify();
        
        window.showToast(`✅ Deuda de $${sale.total.toFixed(2)} cobrada`, 'success');
        
        loadSalesAndExpenses();
        updateSummary();
        if (typeof window.loadDashboardData === 'function') setTimeout(window.loadDashboardData, 500);
    } catch (error) {
        console.error('❌ Error cobrando deuda:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// GASTOS
// ============================================================

async function showExpenseForm(expenseId = null) {
    const existingModal = document.getElementById('expense-modal');
    if (existingModal) existingModal.remove();
    
    const isEdit = !!expenseId;
    let expenseData = null;
    
    if (isEdit) {
        expenseData = await window.SalesModule.getExpense(expenseId);
        if (!expenseData) { window.showToast('❌ Gasto no encontrado', 'error'); return; }
    }
    
    const modal = document.createElement('div');
    modal.id = 'expense-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999; padding: 20px;
    `;
    
    const today = new Date().toISOString().split('T')[0];
    const fechaActual = expenseData?.transaction_date ? new Date(expenseData.transaction_date).toISOString().split('T')[0] : today;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 450px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <h2 style="margin: 0 0 16px 0;">${isEdit ? '✏️ Editar Gasto' : '📤 Registrar Gasto'}</h2>
            
            <form id="expense-form" style="display: flex; flex-direction: column; gap: 12px;">
                ${isEdit ? `<input type="hidden" id="expense-id" value="${expenseData.id}">` : ''}
                
                <div class="form-group">
                    <label>📝 Concepto</label>
                    <input type="text" id="expense-concept" value="${expenseData?.concept || ''}" placeholder="Ej: Compra de harina" required>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div class="form-group">
                        <label>💰 Monto</label>
                        <input type="number" id="expense-amount" value="${expenseData?.amount || 0}" step="0.01" min="0.01" required>
                    </div>
                    <div class="form-group">
                        <label>📂 Categoría</label>
                        <select id="expense-category" style="padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text); width: 100%;">
                            <option value="insumos" ${expenseData?.category === 'insumos' ? 'selected' : ''}>🛒 Insumos</option>
                            <option value="materiales" ${expenseData?.category === 'materiales' ? 'selected' : ''}>📦 Materiales</option>
                            <option value="transporte" ${expenseData?.category === 'transporte' ? 'selected' : ''}>🚗 Transporte</option>
                            <option value="inversion" ${expenseData?.category === 'inversion' ? 'selected' : ''}>💼 Inversión</option>
                            <option value="otros" ${expenseData?.category === 'otros' ? 'selected' : ''}>🔄 Otros</option>
                        </select>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div class="form-group">
                        <label>💳 Origen del pago</label>
                        <select id="expense-payment" style="padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text); width: 100%;">
                            <option value="cash" ${expenseData?.payment_method === 'cash' ? 'selected' : ''}>💵 Efectivo</option>
                            <option value="transfer" ${expenseData?.payment_method === 'transfer' ? 'selected' : ''}>🏦 Transferencia</option>
                            <option value="other" ${expenseData?.payment_method === 'other' ? 'selected' : ''}>🔄 Otra</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>📅 Fecha</label>
                        <input type="date" id="expense-date" value="${fechaActual}" 
                               style="width: 100%; padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text);">
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" style="flex: 1;">💾 Guardar</button>
                    <button type="button" onclick="window.closeExpenseModal()" class="btn secondary" style="flex: 1;">❌ Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const form = document.getElementById('expense-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitExpenseForm(isEdit);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) window.closeExpenseModal();
    });
}

async function submitExpenseForm(isEdit) {
    const concept = document.getElementById('expense-concept').value.trim();
    const amount = parseFloat(document.getElementById('expense-amount').value) || 0;
    const category = document.getElementById('expense-category').value;
    const paymentMethod = document.getElementById('expense-payment').value;
    const expenseDate = document.getElementById('expense-date').value;
    
    if (!concept) { window.showToast('⚠️ El concepto es obligatorio', 'error'); return; }
    if (amount <= 0) { window.showToast('⚠️ El monto debe ser > 0', 'error'); return; }
    if (!expenseDate) { window.showToast('⚠️ La fecha es obligatoria', 'error'); return; }
    
    const expenseDateNormalizada = normalizarFechaVenta(expenseDate);
    
    const expenseData = {
        concept, amount, category, payment_method: paymentMethod,
        transaction_date: expenseDateNormalizada
    };
    
    const idInput = document.getElementById('expense-id');
    
    try {
        let result;
        if (idInput) {
            result = await window.SalesModule.updateExpense(parseInt(idInput.value), expenseData);
        } else {
            result = await window.SalesModule.registerExpense(expenseData);
        }
        
        if (result.success) {
            window.closeExpenseModal();
            window.showToast(`✅ Gasto ${isEdit ? 'actualizado' : 'registrado'}`, 'success');
            loadSalesAndExpenses();
            updateSummary();
            if (typeof window.loadDashboardData === 'function') setTimeout(window.loadDashboardData, 500);
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// VER GASTO
// ============================================================

async function viewExpense(id) {
    try {
        const expense = await window.SalesModule.getExpense(id);
        if (!expense) { window.showToast('❌ Gasto no encontrado', 'error'); return; }
        
        const isVoid = expense.voided === 1;
        const fechaLarga = formatearFechaLarga(expense.transaction_date);
        
        const paymentIcons = { 'cash': '💵 Efectivo', 'transfer': '🏦 Transferencia', 'other': '🔄 Otra' };
        
        const auditoriaSection = renderAuditoriaHTML(expense);
        
        const modal = document.createElement('div');
        modal.id = 'expense-view-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            z-index: 99999; padding: 20px;
        `;
        
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 450px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h2 style="margin: 0;">📤 Detalle de Gasto</h2>
                    <button onclick="window.closeExpenseViewModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
                </div>
                
                ${isVoid ? '<div style="background: #94a3b820; padding: 8px 12px; border-radius: 8px; color: #94a3b8; margin-bottom: 12px;">🚫 ANULADO</div>' : ''}
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 14px;">
                    <div><strong>📝 Concepto:</strong></div>
                    <div>${expense.concept}</div>
                    <div><strong>💰 Monto:</strong></div>
                    <div style="font-weight: 700; color: ${isVoid ? '#94a3b8' : '#ef4444'};">-$${parseFloat(expense.amount).toFixed(2)}</div>
                    <div><strong>📂 Categoría:</strong></div>
                    <div>${expense.category || 'general'}</div>
                    <div><strong>💳 Origen del pago:</strong></div>
                    <div>${paymentIcons[expense.payment_method] || expense.payment_method}</div>
                    <div><strong>📅 Fecha:</strong></div>
                    <div>${fechaLarga}</div>
                    ${isVoid && expense.void_reason ? `<div><strong>📝 Motivo:</strong></div><div>${expense.void_reason}</div>` : ''}
                </div>
                
                ${auditoriaSection}
                
                <hr>
                
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${!isVoid ? `
                        <button onclick="showExpenseForm(${expense.id})" class="btn secondary" style="padding: 6px 16px; font-size: 13px; width: auto;">✏️ Editar</button>
                        <button onclick="voidExpense(${expense.id})" class="btn danger" style="padding: 6px 16px; font-size: 13px; width: auto;">🚫 Anular</button>
                    ` : `
                        <button onclick="unvoidExpense(${expense.id})" class="btn success" style="padding: 6px 16px; font-size: 13px; width: auto;">🔄 Restaurar</button>
                    `}
                    <button onclick="window.closeExpenseViewModal()" class="btn secondary" style="padding: 6px 16px; font-size: 13px; width: auto;">Cerrar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) window.closeExpenseViewModal(); });
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// ANULAR GASTO
// ============================================================

async function voidExpense(id) {
    console.log('🚫 [voidExpense] Iniciando anulación de gasto #' + id);
    
    const modalHuerfano = document.getElementById('custom-modal');
    if (modalHuerfano) {
        modalHuerfano.remove();
        window._modalResolve = null;
        window._modalResolved = false;
        await new Promise(r => setTimeout(r, 200));
    }
    
    let confirm = false;
    try {
        confirm = await window.ModalModule.showConfirm({
            title: 'Anular gasto',
            message: '¿Seguro que quieres anular este gasto?',
            confirmText: 'Sí, anular', cancelText: 'Cancelar',
            icon: '🚫', confirmColor: '#ef4444'
        });
    } catch (err) {
        console.error('🚫 [voidExpense] Error en showConfirm:', err);
        return;
    }
    
    if (!confirm) {
        window.showToast('❌ Anulación cancelada', 'info', 2000);
        return;
    }
    
    await waitForCustomModalRemoval(800);
    await new Promise(r => setTimeout(r, 150));
    
    let reason = null;
    try {
        reason = await window.ModalModule.showPrompt({
            title: 'Motivo', message: 'Motivo (opcional):', icon: '📝'
        });
    } catch (err) {
        reason = null;
    }
    
    const motivoFinal = (reason && String(reason).trim()) ? String(reason).trim() : 'Anulación manual';
    
    try {
        const result = await window.SalesModule.voidExpense(id, motivoFinal);
        if (result && result.success) {
            window.showToast('✅ Gasto anulado', 'success', 3000);
            loadSalesAndExpenses(); updateSummary();
            if (typeof window.loadDashboardData === 'function') setTimeout(window.loadDashboardData, 500);
        } else {
            const errorMsg = (result && result.error) ? result.error : 'Desconocido';
            window.showToast('❌ Error: ' + errorMsg, 'error', 6000);
        }
    } catch (error) {
        console.error('❌ [voidExpense] Excepción:', error);
        window.showToast('❌ Error: ' + error.message, 'error', 6000);
    }
}

async function unvoidExpense(id) {
    const modalHuerfano = document.getElementById('custom-modal');
    if (modalHuerfano) {
        modalHuerfano.remove();
        window._modalResolve = null;
        window._modalResolved = false;
        await new Promise(r => setTimeout(r, 200));
    }
    
    let confirm = false;
    try {
        confirm = await window.ModalModule.showConfirm({
            title: 'Restaurar gasto', message: '¿Restaurar este gasto?',
            confirmText: 'Sí', cancelText: 'No', icon: '🔄', confirmColor: '#10b981'
        });
    } catch (err) {
        return;
    }
    
    if (!confirm) return;
    
    await waitForCustomModalRemoval(500);
    
    try {
        const result = await window.SalesModule.unvoidExpense(id);
        if (result && result.success) {
            window.showToast('✅ Gasto restaurado', 'success');
            loadSalesAndExpenses(); updateSummary();
            if (typeof window.loadDashboardData === 'function') setTimeout(window.loadDashboardData, 500);
        } else {
            const errorMsg = (result && result.error) ? result.error : 'Desconocido';
            window.showToast('❌ Error: ' + errorMsg, 'error', 6000);
        }
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// BALANCE
// ============================================================

async function showBalanceView() {
    const main = document.getElementById('mainContent');
    
    try {
        const balance = await window.SalesModule.getBalance();
        if (!balance) { main.innerHTML = `<div class="card"><p>Error al obtener balance</p></div>`; return; }
        
        main.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="margin: 0;">📊 Balance General</h2>
                <button onclick="renderSalesView()" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto;">← Volver</button>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                <div class="card" style="border-left: 4px solid #10b981;">
                    <h4 style="margin: 0 0 4px 0; font-size: 13px; color: var(--text-light);">💰 Ingresos totales</h4>
                    <div style="font-size: 24px; font-weight: 700; color: #10b981;">$${balance.totalIncome.toFixed(2)}</div>
                </div>
                <div class="card" style="border-left: 4px solid #ef4444;">
                    <h4 style="margin: 0 0 4px 0; font-size: 13px; color: var(--text-light);">📤 Gastos totales</h4>
                    <div style="font-size: 24px; font-weight: 700; color: #ef4444;">-$${balance.totalExpenses.toFixed(2)}</div>
                </div>
                <div class="card" style="border-left: 4px solid ${balance.netProfit >= 0 ? '#10b981' : '#ef4444'};">
                    <h4 style="margin: 0 0 4px 0; font-size: 13px; color: var(--text-light);">📈 Ganancia neta</h4>
                    <div style="font-size: 24px; font-weight: 700; color: ${balance.netProfit >= 0 ? '#10b981' : '#ef4444'};">
                        ${balance.netProfit >= 0 ? '+' : '-'}$${Math.abs(balance.netProfit).toFixed(2)}
                    </div>
                </div>
                <div class="card" style="border-left: 4px solid #f59e0b;">
                    <h4 style="margin: 0 0 4px 0; font-size: 13px; color: var(--text-light);">💼 Inversión inicial</h4>
                    <div style="font-size: 24px; font-weight: 700; color: #f59e0b;">$${balance.initialInvestment.toFixed(2)}</div>
                </div>
                <div class="card" style="border-left: 4px solid #8b5cf6;">
                    <h4 style="margin: 0 0 4px 0; font-size: 13px; color: var(--text-light);">🛒 Total ventas</h4>
                    <div style="font-size: 24px; font-weight: 700; color: #8b5cf6;">$${balance.totalSales.toFixed(2)}</div>
                </div>
                <div class="card" style="border-left: 4px solid #ef4444;">
                    <h4 style="margin: 0 0 4px 0; font-size: 13px; color: var(--text-light);">💳 Deudas</h4>
                    <div style="font-size: 24px; font-weight: 700; color: #ef4444;">$${balance.totalDebts.toFixed(2)}</div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px;">
                <div class="card" style="border-left: 4px solid #10b981;">
                    <h4 style="margin: 0 0 8px 0; font-size: 14px;">💵 Efectivo</h4>
                    <div style="display: flex; justify-content: space-between; font-size: 14px; padding: 2px 0;">
                        <span>💰 Ingresos:</span>
                        <span style="color: #10b981; font-weight: 600;">$${balance.cash.income.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 14px; padding: 2px 0;">
                        <span>📤 Gastos:</span>
                        <span style="color: #ef4444; font-weight: 600;">-$${balance.cash.expenses.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 14px; padding: 2px 0; border-top: 1px solid var(--border-color); margin-top: 4px; padding-top: 4px;">
                        <span><strong>💵 Saldo:</strong></span>
                        <span style="font-weight: 700; color: ${balance.cash.balance >= 0 ? '#10b981' : '#ef4444'};">$${balance.cash.balance.toFixed(2)}</span>
                    </div>
                </div>
                <div class="card" style="border-left: 4px solid #3b82f6;">
                    <h4 style="margin: 0 0 8px 0; font-size: 14px;">🏦 Banco</h4>
                    <div style="display: flex; justify-content: space-between; font-size: 14px; padding: 2px 0;">
                        <span>💰 Ingresos:</span>
                        <span style="color: #10b981; font-weight: 600;">$${balance.bank.income.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 14px; padding: 2px 0;">
                        <span>📤 Gastos:</span>
                        <span style="color: #ef4444; font-weight: 600;">-$${balance.bank.expenses.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 14px; padding: 2px 0; border-top: 1px solid var(--border-color); margin-top: 4px; padding-top: 4px;">
                        <span><strong>🏦 Saldo:</strong></span>
                        <span style="font-weight: 700; color: ${balance.bank.balance >= 0 ? '#10b981' : '#ef4444'};">$${balance.bank.balance.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error:', error);
        main.innerHTML = `<div class="card"><p>Error: ${error.message}</p></div>`;
    }
}

// ============================================================
// REPORTE DE VENTAS
// ============================================================

function showSalesReportModal() {
    const existingModal = document.getElementById('sales-report-modal');
    if (existingModal) existingModal.remove();
    
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    
    const modal = document.createElement('div');
    modal.id = 'sales-report-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="margin: 0;">📊 Reporte de Ventas</h2>
                <button onclick="closeSalesReportModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <p style="font-size: 13px; color: var(--text-light); margin-bottom: 16px;">
                Configura los filtros y genera el reporte de ventas.
            </p>
            
            <form id="sales-report-form" style="display: flex; flex-direction: column; gap: 12px;">
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">📅 Rango de fechas</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group">
                            <label style="font-size: 12px;">Desde</label>
                            <input type="date" id="report-sales-from" value="${primerDia.toISOString().split('T')[0]}" class="input-field">
                        </div>
                        <div class="form-group">
                            <label style="font-size: 12px;">Hasta</label>
                            <input type="date" id="report-sales-to" value="${ultimoDia.toISOString().split('T')[0]}" class="input-field">
                        </div>
                    </div>
                </div>
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">🔍 Filtros opcionales</div>
                    
                    <div class="form-group" style="margin-bottom: 8px;">
                        <label style="font-size: 12px;">👤 Cliente</label>
                        <input type="text" id="report-sales-client" placeholder="Ej: Juan Pérez (opcional)" class="input-field">
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 8px;">
                        <label style="font-size: 12px;">🏷️ Producto</label>
                        <input type="text" id="report-sales-product" placeholder="Ej: Jaba de Pan (opcional)" class="input-field">
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 8px;">
                        <label style="font-size: 12px;">💳 Método de pago</label>
                        <select id="report-sales-payment" class="input-select">
                            <option value="">Todos los métodos</option>
                            <option value="cash">💵 Efectivo</option>
                            <option value="transfer">🏦 Transferencia</option>
                            <option value="debt">💳 Deuda</option>
                            <option value="other">🔄 Otra</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 8px;">
                        <label style="font-size: 12px;">🕐 Sesión</label>
                        <select id="report-sales-session" class="input-select">
                            <option value="">Todas las sesiones</option>
                            <option value="manana">🌅 Mañana</option>
                            <option value="tarde">☀️ Tarde</option>
                            <option value="noche">🌙 Noche</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px;">
                        <label style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: var(--bg-card); border-radius: 6px; border: 1px solid var(--border-color); cursor: pointer;">
                            <input type="checkbox" id="report-sales-liberated" style="width: 16px; height: 16px; cursor: pointer; accent-color: #8b5cf6;">
                            <span style="font-size: 13px;">🚀 Solo ventas liberadas</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: var(--bg-card); border-radius: 6px; border: 1px solid var(--border-color); cursor: pointer;">
                            <input type="checkbox" id="report-sales-debts" style="width: 16px; height: 16px; cursor: pointer; accent-color: #ef4444;">
                            <span style="font-size: 13px;">💳 Solo deudas pendientes</span>
                        </label>
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" style="flex: 1;">
                        📄 Generar Reporte
                    </button>
                    <button type="button" onclick="closeSalesReportModal()" class="btn secondary" style="flex: 1;">
                        ❌ Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const form = document.getElementById('sales-report-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        generateSalesReportFromForm();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeSalesReportModal();
    });
}

function generateSalesReportFromForm() {
    const filters = {
        from_date: document.getElementById('report-sales-from')?.value || '',
        to_date: document.getElementById('report-sales-to')?.value || '',
        client: document.getElementById('report-sales-client')?.value?.trim() || '',
        product: document.getElementById('report-sales-product')?.value?.trim() || '',
        payment_method: document.getElementById('report-sales-payment')?.value || '',
        session: document.getElementById('report-sales-session')?.value || ''
    };
    
    if (document.getElementById('report-sales-liberated')?.checked) {
        filters.is_liberated = true;
    }
    if (document.getElementById('report-sales-debts')?.checked) {
        filters.is_debt = true;
    }
    
    if (window.ReportsModule) {
        const html = window.ReportsModule.generateSalesReport(filters);
        window.ReportsModule.printReport(html);
        closeSalesReportModal();
        window.showToast('✅ Reporte generado', 'success');
    } else {
        window.showToast('❌ Módulo de reportes no disponible', 'error');
    }
}

function closeSalesReportModal() {
    const modal = document.getElementById('sales-report-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
    }
}

// ============================================================
// CIERRE DE MODALES
// ============================================================

window.closeSaleModal = function() {
    const modal = document.getElementById('sale-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
    }
};

window.closeSaleViewModal = function() {
    const modal = document.getElementById('sale-view-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
    }
};

window.closeExpenseModal = function() {
    const modal = document.getElementById('expense-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
    }
};

window.closeExpenseViewModal = function() {
    const modal = document.getElementById('expense-view-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
    }
};

// ============================================================
// EXPORTACIÓN
// ============================================================

window.renderSalesView = renderSalesView;
window.loadSalesAndExpenses = loadSalesAndExpenses;
window.updateSummary = updateSummary;
window.setFilterType = setFilterType;
window.clearFilters = clearFilters;
window.showSaleForm = showSaleForm;
window.showLiberatedSaleForm = showLiberatedSaleForm;
window.submitLiberatedSale = submitLiberatedSale;
window.closeLiberatedSaleModal = closeLiberatedSaleModal;
window.viewSale = viewSale;
window.voidSale = voidSale;
window.unvoidSale = unvoidSale;
window.registerSalePayment = registerSalePayment;
window.showExpenseForm = showExpenseForm;
window.viewExpense = viewExpense;
window.voidExpense = voidExpense;
window.unvoidExpense = unvoidExpense;
window.showBalanceView = showBalanceView;
window.toggleDaySales = toggleDaySales;
window.toggleLiberadas = toggleLiberadas;
window.showSalesReportModal = showSalesReportModal;
window.generateSalesReportFromForm = generateSalesReportFromForm;
window.closeSalesReportModal = closeSalesReportModal;
window.onSaleDateChange = onSaleDateChange;
window.selectSesionSale = selectSesionSale;
window.highlightSesionSelectionSale = highlightSesionSelectionSale;
window.onCurrentMonthChangeSales = onCurrentMonthChangeSales;
window.updateMesToggleVisualSales = updateMesToggleVisualSales;
window.onSalesDateChange = onSalesDateChange;
window.renderAuditoriaHTML = renderAuditoriaHTML;
window.waitForCustomModalRemoval = waitForCustomModalRemoval;
window.normalizarFechaVenta = normalizarFechaVenta;
window.getShowLiberatedSales = getShowLiberatedSales;
window.setShowLiberatedSales = setShowLiberatedSales;
window.onShowLiberatedChange = onShowLiberatedChange;
window.updateShowLiberatedToggleVisual = updateShowLiberatedToggleVisual;
window.showDiasSinVentasModal = showDiasSinVentasModal;
window.closeDiasSinVentasModal = closeDiasSinVentasModal;
window.renderDiasSinVentasContent = renderDiasSinVentasContent;
window.refrescarDiasSinVentas = refrescarDiasSinVentas;
window.limpiarFiltrosDiasSinVentas = limpiarFiltrosDiasSinVentas;
window.showDiaSinVentaForm = showDiaSinVentaForm;
window.closeDiaSinVentaForm = closeDiaSinVentaForm;
window.submitDiaSinVentaForm = submitDiaSinVentaForm;
window.confirmDeleteDiaSinVenta = confirmDeleteDiaSinVenta;
window.reporteDiasSinVentas = reporteDiasSinVentas;
window.getMotivoDiaSinVenta = getMotivoDiaSinVenta;
window.MOTIVOS_DIAS_SIN_VENTAS = MOTIVOS_DIAS_SIN_VENTAS;

// 🆕 v2.1.12: Helpers de bloqueo
window.checkSalePermission = checkSalePermission;
window.renderBadgeSoloLecturaVenta = renderBadgeSoloLecturaVenta;

console.log('📦 UI Sales Module v2.1.12 (ENTREGA B: corrección #2 - bloqueo por recetas no compartidas)');
console.log('   ✅ checkSalePermission() y renderBadgeSoloLecturaVenta() añadidos');
console.log('   ✅ loadSalesAndExpenses(): badge 🔒 y filtro de deudas bloqueadas');
console.log('   ✅ renderSalesGroupedByDay(): oculta botones en ventas bloqueadas');
console.log('   ✅ viewSale(): modo solo-lectura con aviso explicativo');
console.log('   ✅ showSaleForm(): bloquea si la venta está bloqueada');
console.log('   ✅ voidSale()/unvoidSale()/registerSalePayment(): verifican permisos');
console.log('   ✅ Gastos NO se bloquean (no tienen receta)');