// ============================================================
// 📦 UI SETTINGS - Panario (Configuración y Herramientas)
// CORREGIDO: Botón "Hoy" del calendario, reporte PDF,
// origen del pago en gastos, reporte de gastos
// ACTUALIZADO: Backups diferenciados por rol + recarga con timestamp
// ACTUALIZADO: Funciones wrapper para Salva Diferencial
// ACTUALIZADO: Módulo de Usuarios (solo admin)
// CORREGIDO FASE 1 (160926):
//   - Exportar/Importar BD ahora usa reload(true) con ?refresh=
//   - Salva Diferencial verifica existencia de funciones en DBModule
//   - Tras importar salva, se refresca la vista actual
// CORREGIDO FASE 2 (160926):
//   - Modal de reporte de gastos unificado con el de pedidos (Problema #6)
// CORREGIDO FASE 4B (170926):
//   - deleteUser() cierra el modal de usuarios ANTES del confirm (Problema #6)
//   - regenerarCodigoAction() mismo tratamiento
//   - showDeleteSelectorModal() cierra todos los modales antes de abrirse
//   - Todos los close*Modal() con timeout de seguridad
//   - showCorrienteModal() y showExpensesReportModal() cierran otros modales
// CORREGIDO FASE A.3 (170926 v2):
//   - TODOS los flujos de export/import envueltos en try/catch/finally
//   - closeProgressModal() garantizado en finally
//   - Verificación explícita de result.success antes de usar result.counts
//   - Timeout de seguridad en readSalvaFile
// AÑADIDO FASE B (170926 v3):
//   - showCreateUserModal(): admin crea usuario directamente
//   - showEditUserModal(): admin edita datos del usuario
//   - showChangePasswordModal(): admin cambia contraseña
//   - handleToggleAdmin(): promover/degradar admin
//   - Botones nuevos en showUsersModal() para todas las acciones
// AÑADIDO FASE E (180926):
//   - showHorarioDetalle() muestra el día de la semana completo
// AÑADIDO (180926 v2):
//   - showDeleteSelectorModal() ahora muestra en las ventas:
//     - #ID, nombre del producto, total, método de pago
//     - 👤 Cliente (buyer)
//     - 📅 Fecha
//     - Estado: 💳 Deuda / 🚀 Liberada / ✅ Pagada
//   - Colores de borde según estado de la venta
// AÑADIDO FASE 1.3.4 (190926):
//   - Bloque "Importar copia de seguridad" ahora tiene 3 botones:
//     * Importar copia (reemplaza todo)
//     * Importar solo datos (reemplaza datos)
//     * Fusionar bases de datos (NUEVO - merge por uuid)
//   - importDatabaseFusionAction(): wrapper para la fusión
//   - Modal de resultado con resumen detallado por tabla
// 🆕 FASE 2.3 (200926 v4):
//   - NUEVA sección "⏰ Lista de espera" en Herramientas
//     * Botón "⏰ Gestionar lista de espera" → abre modal de ui-orders.js
//     * Botón "📄 Reporte PDF" → genera reporte de lista
//     * Muestra contador actual de clientes en espera
//   - NUEVA sección "🚨 Cancelación global de pedidos" (solo admin)
//     * Modal con rango de fechas + causa + nota
//     * Doble confirmación
//     * Llama a OrdersModule.cancelarPedidosGlobalmente()
//     * Modal de resumen con cancelados/reiniciados/preservados
// 🆕 FASE 6 (#11) (200926 v5):
//   - El bloque "ℹ️ Información" ahora LEE la versión desde
//     <meta name="app-version"> del index.html
//   - Fallback a '2.1.5' si no se encuentra el meta
//   - Así, en futuras actualizaciones solo hay que cambiar el
//     index.html y este bloque se actualizará automáticamente
// ============================================================

// ============================================================
// 🆕 FASE 6: HELPER PARA OBTENER LA VERSIÓN DE LA APP
// ============================================================

/**
 * Devuelve la versión actual de la app leyéndola del <meta name="app-version">.
 * Si no existe, devuelve un fallback.
 * 
 * @returns {string} La versión, ej: "2.1.5"
 */
function getAppVersion() {
    try {
        const meta = document.querySelector('meta[name="app-version"]');
        if (meta && meta.content) {
            return meta.content;
        }
    } catch (e) {
        console.warn('⚠️ Error leyendo app-version:', e);
    }
    return '2.1.5'; // Fallback
}

window.getAppVersion = getAppVersion;

// ============================================================
// ⚡ MÓDULO DE HORARIOS DE CORRIENTE (PRODUCCIÓN)
// ============================================================

function convertirA12Horas(hora24) {
    if (!hora24) return '';
    const [h, m] = hora24.split(':').map(Number);
    const periodo = h >= 12 ? 'PM' : 'AM';
    let hora12 = h % 12;
    if (hora12 === 0) hora12 = 12;
    return `${hora12}:${String(m).padStart(2, '0')} ${periodo}`;
}

function convertirA24Horas(hora12) {
    if (!hora12) return '';
    const match = hora12.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return hora12;
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const periodo = match[3].toUpperCase();
    if (periodo === 'PM' && h !== 12) h += 12;
    if (periodo === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ============================================================
// FUNCIONES DEL MÓDULO DE CORRIENTE
// ============================================================

function saveCorrientePattern() {
    const horasCorriente = parseFloat(document.getElementById('config-horas-corriente').value);
    const horasApagon = parseFloat(document.getElementById('config-horas-apagon').value);

    if (isNaN(horasCorriente) || isNaN(horasApagon) || horasCorriente <= 0 || horasApagon <= 0) {
        window.showToast('⚠️ Ingresa valores válidos (mayores a 0)', 'error');
        return;
    }

    const config = window.CorrienteUtils.getConfig();
    config.horasCorriente = horasCorriente;
    config.horasApagon = horasApagon;
    
    const result = window.CorrienteUtils.saveConfig(config);
    
    if (result) {
        window.showToast(`✅ Patrón guardado: ${horasCorriente}h corriente / ${horasApagon}h apagón`, 'success');
        const calendarioContent = document.getElementById('corriente-calendario-content');
        if (calendarioContent && calendarioContent.style.display !== 'none') {
            renderCorrienteCalendario();
        }
    } else {
        window.showToast('❌ Error al guardar el patrón', 'error');
    }
}

function setCorrienteReference() {
    const fecha = document.getElementById('config-fecha-ref').value;
    let inicio = document.getElementById('config-inicio-ref').value;
    let fin = document.getElementById('config-fin-ref').value;

    if (!fecha || !inicio || !fin) {
        window.showToast('⚠️ Completa todos los campos', 'error');
        return;
    }

    const config = window.CorrienteUtils.getConfig();
    config.fechaReferencia = fecha;
    config.horaInicioReferencia = inicio;
    config.horaFinReferencia = fin;
    
    const result = window.CorrienteUtils.saveConfig(config);

    if (!result) {
        window.showToast('❌ Error al guardar la referencia', 'error');
        return;
    }

    const calendarioContent = document.getElementById('corriente-calendario-content');
    if (calendarioContent && calendarioContent.style.display !== 'none') {
        renderCorrienteCalendario();
    }

    const statusEl = document.getElementById('config-ref-status');
    if (statusEl) {
        const inicio12 = convertirA12Horas(inicio);
        const fin12 = convertirA12Horas(fin);
        const cruzaMedianoche = inicio >= fin;
        statusEl.innerHTML = `
            ✅ Referencia guardada: ${fecha} de ${inicio12} a ${fin12}
            ${cruzaMedianoche ? '<br>⚠️ El bloque cruza medianoche' : ''}
            <br>📌 Ciclo: ${config.horasCorriente}h corriente / ${config.horasApagon}h apagón
            <br>🔄 Total ciclo: ${config.horasCorriente + config.horasApagon} horas
            <br>💡 Los horarios se han recalculado para todas las fechas.
        `;
    }

    window.showToast('✅ Referencia guardada correctamente', 'success');
}

// ============================================================
// MOSTRAR MODAL PRINCIPAL DE CORRIENTE
// ============================================================

function showCorrienteModal() {
    if (window.ModalModule && window.ModalModule.cerrarTodosLosModales) {
        window.ModalModule.cerrarTodosLosModales();
    }
    
    const existingModal = document.getElementById('corriente-modal');
    if (existingModal) existingModal.remove();

    const config = window.CorrienteUtils.refreshConfig();

    const modal = document.createElement('div');
    modal.id = 'corriente-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999999; padding: 10px;
        animation: modalFadeIn 0.25s ease;
    `;

    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 16px 18px; max-width: 100%; width: 100%; max-height: 98vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color); overflow-y: auto; font-size: 14px; position: relative; z-index: 99999999;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap;">
                <h2 style="margin: 0; color: #f59e0b; font-size: 18px;">⚡ Horarios de Corriente</h2>
                <button onclick="closeCorrienteModal()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <p style="font-size: 13px; color: var(--text-light); margin-bottom: 12px;">
                Gestiona los horarios de corriente para planificar tu producción.
                <br><span style="color: #f59e0b;">💡 Los períodos con corriente = horarios de producción</span>
            </p>

            <div style="display: flex; gap: 3px; border-bottom: 2px solid var(--border-color); margin-bottom: 12px; flex-wrap: wrap; overflow-x: auto;">
                <button id="tab-corriente-config" onclick="switchCorrienteTab('config')" class="btn primary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0; background: var(--primary); color: #fff; border: none; white-space: nowrap;">
                    ⚙️ Config
                </button>
                <button id="tab-corriente-calendario" onclick="switchCorrienteTab('calendario')" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0; background: transparent; color: var(--text); border: none; white-space: nowrap;">
                    📅 Calendario
                </button>
                <button id="tab-corriente-reporte" onclick="switchCorrienteTab('reporte')" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0; background: transparent; color: var(--text); border: none; white-space: nowrap;">
                    📊 Reporte
                </button>
                <button id="tab-corriente-consultar" onclick="switchCorrienteTab('consultar')" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0; background: transparent; color: var(--text); border: none; white-space: nowrap;">
                    🔍 Fecha
                </button>
            </div>

            <div id="corriente-config-content" style="flex: 1; overflow-y: auto;">
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 10px;">
                    <h4 style="margin: 0 0 6px 0; font-size: 14px;">⚙️ Patrón</h4>
                    <p style="font-size: 12px; color: var(--text-light); margin-bottom: 8px;">Ej: 3h corriente / 12h apagón</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <label style="font-size: 12px; font-weight: 500;">⏰ Corriente</label>
                            <input type="number" id="config-horas-corriente" 
                                   value="${config.horasCorriente || 3}" 
                                   min="0.5" max="24" step="0.5"
                                   style="width: 100%; padding: 6px 10px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 14px;">
                        </div>
                        <div>
                            <label style="font-size: 12px; font-weight: 500;">🌙 Apagón</label>
                            <input type="number" id="config-horas-apagon" 
                                   value="${config.horasApagon || 12}" 
                                   min="0.5" max="48" step="0.5"
                                   style="width: 100%; padding: 6px 10px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 14px;">
                        </div>
                    </div>
                    <button onclick="saveCorrientePattern()" class="btn primary" style="margin-top: 8px; padding: 4px 14px; font-size: 12px; width: auto;">💾 Guardar</button>
                </div>

                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <h4 style="margin: 0 0 6px 0; font-size: 14px;">📝 Referencia inicial</h4>
                    <p style="font-size: 12px; color: var(--text-light); margin-bottom: 8px;">Ej: Hoy tuve corriente de 10:00 AM a 1:00 PM</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                        <div>
                            <label style="font-size: 11px; font-weight: 500;">📅 Fecha</label>
                            <input type="date" id="config-fecha-ref" 
                                   value="${config.fechaReferencia || new Date().toISOString().split('T')[0]}"
                                   style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                        <div>
                            <label style="font-size: 11px; font-weight: 500;">🟢 Inicio</label>
                            <input type="time" id="config-inicio-ref" value="${config.horaInicioReferencia || '10:00'}"
                                   style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                        <div>
                            <label style="font-size: 11px; font-weight: 500;">🔴 Fin</label>
                            <input type="time" id="config-fin-ref" value="${config.horaFinReferencia || '13:00'}"
                                   style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                    </div>
                    <button onclick="setCorrienteReference()" class="btn primary" style="margin-top: 8px; padding: 4px 14px; font-size: 12px; width: auto;">📌 Guardar referencia</button>
                    <div id="config-ref-status" style="margin-top: 6px; font-size: 12px; color: var(--text-light);"></div>
                </div>
            </div>

            <div id="corriente-calendario-content" style="flex: 1; overflow-y: auto; display: none;">
                <div style="display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap; align-items: center;">
                    <button onclick="changeCorrienteMonth(-1)" class="btn secondary" style="padding: 2px 10px; font-size: 12px; width: auto;">◀</button>
                    <span id="corriente-month-label" style="font-weight: 600; font-size: 14px; flex: 1; text-align: center;"></span>
                    <button onclick="changeCorrienteMonth(1)" class="btn secondary" style="padding: 2px 10px; font-size: 12px; width: auto;">▶</button>
                    <button onclick="irAHoyCorriente()" class="btn secondary" style="padding: 2px 10px; font-size: 12px; width: auto; background: #3b82f6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">🔄 Hoy</button>
                </div>
                <div id="corriente-calendario-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; font-size: 11px;"></div>
                <div style="display: flex; gap: 10px; margin-top: 8px; padding: 6px 10px; background: var(--bg); border-radius: 6px; flex-wrap: wrap; font-size: 11px;">
                    <span><span style="display: inline-block; width: 14px; height: 14px; background: #f59e0b; border-radius: 3px; vertical-align: middle;"></span> Corriente</span>
                    <span><span style="display: inline-block; width: 14px; height: 14px; background: #94a3b8; border-radius: 3px; vertical-align: middle;"></span> Sin corriente</span>
                    <span><span style="display: inline-block; width: 14px; height: 14px; background: #ef4444; border-radius: 3px; vertical-align: middle;"></span> Hoy</span>
                </div>
            </div>

            <div id="corriente-reporte-content" style="flex: 1; overflow-y: auto; display: none;">
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <h4 style="margin: 0 0 6px 0; font-size: 14px;">📊 Generar Reporte</h4>
                    <p style="font-size: 12px; color: var(--text-light); margin-bottom: 8px;">Selecciona el período para el reporte de horarios.</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <label style="font-size: 11px; font-weight: 500;">📅 Desde</label>
                            <input type="date" id="reporte-fecha-desde" 
                                   value="${new Date().toISOString().split('T')[0]}"
                                   style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                        <div>
                            <label style="font-size: 11px; font-weight: 500;">📅 Hasta</label>
                            <input type="date" id="reporte-fecha-hasta" 
                                   value="${new Date(Date.now() + 7*86400000).toISOString().split('T')[0]}"
                                   style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                    </div>
                    <div style="margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap;">
                        <button onclick="generarReportePDF('semana')" class="btn primary" style="padding: 6px 14px; font-size: 12px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 6px; cursor: pointer;">📄 Semanal</button>
                        <button onclick="generarReportePDF('mes')" class="btn primary" style="padding: 6px 14px; font-size: 12px; width: auto; background: #10b981; color: #fff; border: none; border-radius: 6px; cursor: pointer;">📄 Mensual</button>
                    </div>
                    <p style="font-size: 11px; color: var(--text-light); margin-top: 8px;">
                        💡 El reporte se abrirá en una nueva ventana. Puedes guardarlo como PDF desde el diálogo de impresión.
                    </p>
                </div>
            </div>

            <div id="corriente-consultar-content" style="flex: 1; overflow-y: auto; display: none;">
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <h4 style="margin: 0 0 6px 0; font-size: 14px;">🔍 Consultar fecha</h4>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end;">
                        <div style="flex: 1; min-width: 120px;">
                            <label style="font-size: 11px; font-weight: 500;">📅 Fecha</label>
                            <input type="date" id="consultar-fecha" 
                                   value="${new Date().toISOString().split('T')[0]}"
                                   style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                        <button onclick="consultarHorariosFecha()" class="btn primary" style="padding: 6px 14px; font-size: 12px; width: auto;">🔍 Consultar</button>
                    </div>
                    <div id="consultar-resultado" style="margin-top: 10px; padding: 10px; background: var(--bg-card); border-radius: 6px; border: 1px solid var(--border-color); min-height: 50px; font-size: 13px;">
                        <p style="color: var(--text-light); text-align: center; font-size: 12px;">Selecciona una fecha</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    window._corrienteMonthOffset = 0;

    window.closeCorrienteModal = function() {
        const modal = document.getElementById('corriente-modal');
        if (modal) {
            modal.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (modal.parentNode) modal.remove();
            }, 200);
            setTimeout(() => {
                const still = document.getElementById('corriente-modal');
                if (still && still.parentNode) still.remove();
            }, 500);
        }
    };

    window.switchCorrienteTab = function(tab) {
        const tabs = ['config', 'calendario', 'reporte', 'consultar'];
        const contents = ['corriente-config-content', 'corriente-calendario-content', 'corriente-reporte-content', 'corriente-consultar-content'];
        const btnIds = ['tab-corriente-config', 'tab-corriente-calendario', 'tab-corriente-reporte', 'tab-corriente-consultar'];

        for (let i = 0; i < tabs.length; i++) {
            const content = document.getElementById(contents[i]);
            const btn = document.getElementById(btnIds[i]);
            if (content) content.style.display = (tabs[i] === tab) ? 'block' : 'none';
            if (btn) {
                if (tabs[i] === tab) {
                    btn.className = 'btn primary';
                    btn.style.background = 'var(--primary)';
                    btn.style.color = '#fff';
                } else {
                    btn.className = 'btn secondary';
                    btn.style.background = 'transparent';
                    btn.style.color = 'var(--text)';
                }
            }
        }
        if (tab === 'calendario') renderCorrienteCalendario();
    };

    switchCorrienteTab('config');
    
    if (config.fechaReferencia) {
        const statusEl = document.getElementById('config-ref-status');
        if (statusEl) {
            const inicio12 = convertirA12Horas(config.horaInicioReferencia);
            const fin12 = convertirA12Horas(config.horaFinReferencia);
            statusEl.innerHTML = `
                ✅ Referencia guardada: ${config.fechaReferencia} de ${inicio12} a ${fin12}
                <br>📌 Ciclo: ${config.horasCorriente}h corriente / ${config.horasApagon}h apagón
                <br>🔄 Total ciclo: ${config.horasCorriente + config.horasApagon} horas
            `;
        }
    }
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeCorrienteModal();
    });
}

// ============================================================
// IR A HOY
// ============================================================

function irAHoyCorriente() {
    window._corrienteMonthOffset = 0;
    renderCorrienteCalendario();
    
    const hoy = new Date();
    const mesActual = hoy.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    window.showToast(`📅 Mostrando ${mesActual}`, 'info', 2000);
}

// ============================================================
// RENDER CALENDARIO
// ============================================================

function renderCorrienteCalendario() {
    const grid = document.getElementById('corriente-calendario-grid');
    const label = document.getElementById('corriente-month-label');
    if (!grid || !label) return;

    const config = window.CorrienteUtils.refreshConfig();

    if (!config.fechaReferencia || !config.horaInicioReferencia || !config.horaFinReferencia) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 30px 20px; color: var(--text-light);">
                <span style="font-size: 40px;">⚙️</span>
                <p style="font-size: 14px; margin-top: 8px;">No hay referencia configurada</p>
                <p style="font-size: 12px;">Ve a la pestaña <strong>Config</strong> y guarda una referencia inicial.</p>
            </div>
        `;
        label.textContent = '';
        return;
    }

    const today = new Date();
    const monthOffset = window._corrienteMonthOffset || 0;
    const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const monthName = targetDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    label.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    let html = weekDays.map(d => 
        `<div style="text-align: center; font-weight: 600; color: var(--text-label); padding: 3px; font-size: 10px;">${d}</div>`
    ).join('');

    for (let i = 0; i < firstDay; i++) {
        html += `<div style="padding: 3px;"></div>`;
    }

    const todayStr = window.CorrienteUtils.formatearFechaISO(new Date());
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        
        let bloques = [];
        try {
            bloques = window.CorrienteUtils.getBloques(dateStr);
        } catch (e) {}
        
        const tieneCorriente = bloques && bloques.length > 0;
        const numBloques = tieneCorriente ? bloques.length : 0;
        
        let bgColor = '#94a3b8';
        let labelColor = 'var(--text)';
        let bloquesInfo = '';
        
        if (isToday) {
            bgColor = '#ef4444';
            labelColor = '#fff';
        } else if (tieneCorriente) {
            bgColor = '#f59e0b';
            labelColor = '#fff';
            bloquesInfo = bloques.map(h => `${h.inicioStr}-${h.finStr}`).join(' ');
        }

        html += `
            <div style="text-align: center; padding: 6px 2px; background: ${bgColor}; border-radius: 4px; color: ${labelColor}; font-weight: ${isToday ? '700' : '400'}; cursor: ${tieneCorriente ? 'pointer' : 'default'}; font-size: 12px; position: relative; z-index: 1;" 
                 onclick="${tieneCorriente ? `showHorarioDetalle('${dateStr}')` : ''}"
                 title="${tieneCorriente ? `⚡ ${numBloques} bloque(s): ${bloquesInfo}` : 'Sin corriente'}">
                ${day}
                ${tieneCorriente ? `<span style="font-size: 8px; display: block; opacity: 0.9;">⚡${numBloques}</span>` : ''}
            </div>
        `;
    }

    grid.innerHTML = html;
}

function changeCorrienteMonth(delta) {
    window._corrienteMonthOffset = (window._corrienteMonthOffset || 0) + delta;
    renderCorrienteCalendario();
}

// ============================================================
// SHOW HORARIO DETALLE
// ============================================================

function showHorarioDetalle(dateStr) {
    const existing = document.getElementById('horario-detalle-modal');
    if (existing) existing.remove();

    const bloques = window.CorrienteUtils.getBloques(dateStr);
    
    const dateObj = new Date(dateStr + 'T00:00:00');
    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    const diaSemana = diasSemana[dateObj.getDay()];
    const diaMes = dateObj.getDate();
    const mes = meses[dateObj.getMonth()];
    const anio = dateObj.getFullYear();
    
    const fechaDisplay = `${diaSemana}, ${diaMes} de ${mes} de ${anio}`;

    const modal = document.createElement('div');
    modal.id = 'horario-detalle-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999999; padding: 20px;
        animation: modalFadeIn 0.25s ease;
    `;

    if (!bloques || bloques.length === 0) {
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 28px 32px; max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color); text-align: center;">
                <div style="font-size: 56px; margin-bottom: 12px;">🌙</div>
                <h2 style="margin: 0 0 8px 0; font-size: 18px; color: var(--text);">Sin corriente</h2>
                <p style="font-size: 14px; color: var(--text-light); margin-bottom: 20px; text-transform: capitalize;">📅 ${fechaDisplay}</p>
                <p style="font-size: 13px; color: var(--text-light); margin-bottom: 20px;">No hay corriente programada para este día.</p>
                <button onclick="closeHorarioDetalleModal()" class="btn secondary" style="padding: 10px 24px; font-size: 14px; width: auto;">Cerrar</button>
            </div>
        `;
    } else {
        let totalHoras = 0;
        bloques.forEach(b => { totalHoras += b.duracionHoras; });

        const bloquesHtml = bloques.map((h, i) => `
            <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--bg); border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 6px;">
                <span style="font-size: 18px; font-weight: 700; color: #f59e0b; min-width: 24px;">${i + 1}</span>
                <div style="flex: 1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span style="background: #10b98120; color: #10b981; padding: 3px 10px; border-radius: 10px; font-size: 13px; font-weight: 600;">🟢 ${h.inicioStr}</span>
                    <span style="color: var(--text-light); font-size: 12px;">→</span>
                    <span style="background: #ef444420; color: #ef4444; padding: 3px 10px; border-radius: 10px; font-size: 13px; font-weight: 600;">🔴 ${h.finStr}</span>
                    ${h.cruzaMedianoche ? '<span style="font-size: 10px; color: #f59e0b; background: #f59e0b20; padding: 1px 6px; border-radius: 8px;">cruza medianoche</span>' : ''}
                </div>
            </div>
        `).join('');

        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px 28px; max-width: 420px; width: 100%; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                    <span style="font-size: 32px;">⚡</span>
                    <div style="flex: 1;">
                        <h2 style="margin: 0; font-size: 17px; color: #f59e0b;">Horarios de Corriente</h2>
                        <p style="margin: 2px 0 0 0; font-size: 13px; color: var(--text-light); text-transform: capitalize;">📅 ${fechaDisplay}</p>
                    </div>
                    <button onclick="closeHorarioDetalleModal()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--text-light); padding: 0 4px; align-self: flex-start;">✕</button>
                </div>

                <div style="display: flex; gap: 8px; margin-bottom: 14px;">
                    <div style="flex: 1; background: #f59e0b20; padding: 8px 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${bloques.length}</div>
                        <div style="font-size: 11px; color: var(--text-light);">Bloque${bloques.length > 1 ? 's' : ''}</div>
                    </div>
                    <div style="flex: 1; background: #10b98120; padding: 8px 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 20px; font-weight: 700; color: #10b981;">${totalHoras.toFixed(1)}h</div>
                        <div style="font-size: 11px; color: var(--text-light);">Total corriente</div>
                    </div>
                </div>

                <div style="margin-bottom: 8px;">
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-label); margin-bottom: 6px;">📋 Bloques del día:</div>
                    ${bloquesHtml}
                </div>

                <div style="display: flex; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-color);">
                    <button onclick="closeHorarioDetalleModal()" class="btn secondary" style="padding: 10px 20px; font-size: 14px; width: auto; flex: 1;">Cerrar</button>
                </div>
            </div>
        `;
    }

    document.body.appendChild(modal);

    window.closeHorarioDetalleModal = function() {
        const m = document.getElementById('horario-detalle-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (m.parentNode) m.remove();
            }, 200);
            setTimeout(() => {
                const still = document.getElementById('horario-detalle-modal');
                if (still && still.parentNode) still.remove();
            }, 500);
        }
    };

    modal.addEventListener('click', function(e) {
        if (e.target === this) closeHorarioDetalleModal();
    });

    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeHorarioDetalleModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// ============================================================
// CONSULTAR HORARIOS
// ============================================================

function consultarHorariosFecha() {
    const fecha = document.getElementById('consultar-fecha').value;
    const resultado = document.getElementById('consultar-resultado');
    
    if (!fecha) {
        resultado.innerHTML = '<p style="color: var(--text-light); text-align: center; font-size: 12px;">⚠️ Selecciona una fecha</p>';
        return;
    }

    const bloques = window.CorrienteUtils.getBloques(fecha);
    
    const dateObj = new Date(fecha + 'T00:00:00');
    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    const diaSemana = diasSemana[dateObj.getDay()];
    const diaMes = dateObj.getDate();
    const mes = meses[dateObj.getMonth()];
    const anio = dateObj.getFullYear();
    
    const fechaDisplay = `${diaSemana}, ${diaMes} de ${mes} de ${anio}`;

    if (!bloques || bloques.length === 0) {
        resultado.innerHTML = `
            <div style="text-align: center; color: var(--text-light); font-size: 13px;">
                <span style="font-size: 28px;">🌙</span>
                <p style="text-transform: capitalize;">${fechaDisplay}: <strong style="color: #94a3b8;">Sin corriente</strong></p>
            </div>
        `;
        return;
    }

    let totalHoras = 0;
    let horariosHtml = bloques.map((h, i) => {
        totalHoras += h.duracionHoras;
        return `<div style="display: inline-block; background: #f59e0b20; color: #f59e0b; padding: 3px 10px; border-radius: 10px; margin: 2px; font-size: 12px;">🟢 ${h.inicioStr} - 🔴 ${h.finStr}</div>`;
    }).join(' ');

    resultado.innerHTML = `
        <div style="text-align: center; font-size: 13px;">
            <span style="font-size: 24px;">⚡</span>
            <h4 style="margin: 4px 0; font-size: 14px; text-transform: capitalize;">${fechaDisplay}</h4>
            <div style="margin: 6px 0;">${horariosHtml}</div>
            <p style="font-size: 12px; color: var(--text-light);">
                📦 ${bloques.length} bloque${bloques.length > 1 ? 's' : ''} | 
                ⏰ Total: <strong>${totalHoras.toFixed(1)} horas</strong>
            </p>
        </div>
    `;
}

// ============================================================
// GENERAR REPORTE PDF DE CORRIENTE
// ============================================================

function generarReportePDF(tipo) {
    const desde = document.getElementById('reporte-fecha-desde').value;
    const hasta = document.getElementById('reporte-fecha-hasta').value;

    if (!desde || !hasta) {
        window.showToast('⚠️ Selecciona un rango de fechas', 'error');
        return;
    }

    if (desde > hasta) {
        window.showToast('⚠️ La fecha "desde" debe ser anterior a "hasta"', 'error');
        return;
    }

    const startDate = new Date(desde + 'T00:00:00');
    const endDate = new Date(hasta + 'T00:00:00');
    const diffDays = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    let reportData = [];
    let totalHorasCorriente = 0;

    for (let i = 0; i < diffDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        const dateStr = window.CorrienteUtils.formatearFechaISO(currentDate);
        const bloques = window.CorrienteUtils.getBloques(dateStr);
        
        let horas = 0;
        let horariosStr = '🌙 Sin corriente';
        if (bloques && bloques.length > 0) {
            horariosStr = bloques.map(h => `${h.inicioStr} - ${h.finStr}`).join(' | ');
            horas = bloques.reduce((sum, h) => sum + h.duracionHoras, 0);
            totalHorasCorriente += horas;
        }

        reportData.push({
            fecha: dateStr,
            fechaDisplay: currentDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
            diaSemana: currentDate.toLocaleDateString('es-ES', { weekday: 'short' }),
            horarios: horariosStr,
            horas: horas,
            numBloques: bloques ? bloques.length : 0
        });
    }

    const config = window.CorrienteUtils.getConfig();

    const reportHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reporte de Corriente - Panario</title>
            <style>
                * { font-family: system-ui, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
                body { padding: 16px; background: #fff; font-size: 14px; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #f59e0b; padding-bottom: 12px; }
                .header h1 { color: #f59e0b; font-size: 22px; }
                .header p { color: #666; font-size: 13px; margin-top: 2px; }
                .summary { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; flex-wrap: wrap; }
                .summary-card { background: #f8f9fa; padding: 10px 16px; border-radius: 8px; text-align: center; border-left: 3px solid #f59e0b; flex: 1; min-width: 80px; }
                .summary-card .number { font-size: 20px; font-weight: 700; color: #f59e0b; }
                .summary-card .label { font-size: 10px; color: #666; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
                th { background: #f59e0b; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; }
                td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 11px; word-break: break-word; }
                tr:nth-child(even) { background: #fafafa; }
                .sin-corriente { color: #94a3b8; }
                .con-corriente { color: #f59e0b; font-weight: 600; }
                .bloques-badge { display: inline-block; background: #f59e0b20; padding: 1px 6px; border-radius: 8px; font-size: 10px; color: #f59e0b; }
                .footer { margin-top: 20px; text-align: center; color: #94a3b8; font-size: 10px; border-top: 1px solid #eee; padding-top: 12px; }
                .nota { margin-top: 12px; padding: 10px; background: #fef9e7; border-radius: 6px; border-left: 3px solid #f59e0b; font-size: 11px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>⚡ Reporte de Corriente</h1>
                <p>${tipo === 'semana' ? '📅 Semanal' : '📅 Mensual'} - ${new Date(desde).toLocaleDateString('es-ES')} al ${new Date(hasta).toLocaleDateString('es-ES')}</p>
                <p style="font-size: 11px; color: #94a3b8;">Patrón: ${config.horasCorriente || 3}h corriente / ${config.horasApagon || 12}h apagón</p>
            </div>

            <div class="summary">
                <div class="summary-card">
                    <div class="number">${diffDays}</div>
                    <div class="label">📅 Días</div>
                </div>
                <div class="summary-card">
                    <div class="number">${totalHorasCorriente.toFixed(1)}h</div>
                    <div class="label">⚡ Total corriente</div>
                </div>
                <div class="summary-card">
                    <div class="number">${(totalHorasCorriente / diffDays).toFixed(1)}h</div>
                    <div class="label">📊 Promedio/día</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th style="width: 40%;">Horario</th>
                        <th style="text-align: center;">#</th>
                        <th style="text-align: right;">Horas</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.map(row => `
                        <tr>
                            <td style="white-space: nowrap;">${row.fechaDisplay}<br><span style="font-size: 9px; color: #94a3b8;">${row.diaSemana}</span></td>
                            <td class="${row.horas > 0 ? 'con-corriente' : 'sin-corriente'}">${row.horarios}</td>
                            <td style="text-align: center;">${row.numBloques > 0 ? `<span class="bloques-badge">${row.numBloques}</span>` : '—'}</td>
                            <td style="text-align: right; font-weight: ${row.horas > 0 ? '700' : '400'}; color: ${row.horas > 0 ? '#f59e0b' : '#94a3b8'};">${row.horas > 0 ? row.horas.toFixed(1) + 'h' : '—'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="nota">
                💡 Los horarios se generan automáticamente basados en el patrón configurado.
                <br>🔄 Ciclo: ${config.horasCorriente || 3}h corriente / ${config.horasApagon || 12}h apagón
            </div>

            <div class="footer">
                Reporte generado desde Panario 🍞 - ${new Date().toLocaleString('es-ES')}
            </div>
        </body>
        </html>
    `;

    const win = window.open('', '_blank');
    if (!win) {
        window.showToast('❌ Permite ventanas emergentes', 'error');
        return;
    }

    win.document.write(reportHtml);
    win.document.close();
    win.print();

    window.showToast('✅ Reporte generado', 'success');
}

// ============================================================
// REPORTE DE GASTOS
// ============================================================

function showExpensesReportModal() {
    if (window.ModalModule && window.ModalModule.cerrarTodosLosModales) {
        window.ModalModule.cerrarTodosLosModales();
    }
    
    const existingModal = document.getElementById('expenses-report-modal');
    if (existingModal) existingModal.remove();

    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    const modal = document.createElement('div');
    modal.id = 'expenses-report-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999; padding: 20px;
    `;

    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="margin: 0;">📊 Reporte de Gastos</h2>
                <button onclick="closeExpensesReportModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <p style="font-size: 13px; color: var(--text-light); margin-bottom: 16px;">
                Configura los filtros y genera el reporte de gastos.
            </p>
            
            <form id="expenses-report-form" style="display: flex; flex-direction: column; gap: 12px;">
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">📅 Rango de fechas</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group">
                            <label style="font-size: 12px;">Desde</label>
                            <input type="date" id="report-expenses-from" value="${primerDia.toISOString().split('T')[0]}" class="input-field">
                        </div>
                        <div class="form-group">
                            <label style="font-size: 12px;">Hasta</label>
                            <input type="date" id="report-expenses-to" value="${ultimoDia.toISOString().split('T')[0]}" class="input-field">
                        </div>
                    </div>
                </div>
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">🔍 Filtros opcionales</div>
                    
                    <div class="form-group" style="margin-bottom: 8px;">
                        <label style="font-size: 12px;">📂 Categoría</label>
                        <select id="report-expenses-category" class="input-select">
                            <option value="">Todas las categorías</option>
                            <option value="insumos">🛒 Insumos</option>
                            <option value="materiales">📦 Materiales</option>
                            <option value="transporte">🚗 Transporte</option>
                            <option value="inversion">💼 Inversión</option>
                            <option value="otros">🔄 Otros</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 8px;">
                        <label style="font-size: 12px;">💳 Origen del pago</label>
                        <select id="report-expenses-origin" class="input-select">
                            <option value="">Todos los orígenes</option>
                            <option value="cash">💵 Efectivo</option>
                            <option value="transfer">🏦 Transferencia</option>
                            <option value="other">🔄 Otra</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label style="font-size: 12px;">📝 Concepto (búsqueda)</label>
                        <input type="text" id="report-expenses-search" placeholder="Ej: harina (opcional)" class="input-field">
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" style="flex: 1;">
                        📄 Generar Reporte
                    </button>
                    <button type="button" onclick="closeExpensesReportModal()" class="btn secondary" style="flex: 1;">
                        ❌ Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const form = document.getElementById('expenses-report-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        generateExpensesReportFromForm();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeExpensesReportModal();
    });
}

function generateExpensesReportFromForm() {
    const filters = {
        from_date: document.getElementById('report-expenses-from')?.value || '',
        to_date: document.getElementById('report-expenses-to')?.value || '',
        category: document.getElementById('report-expenses-category')?.value || '',
        payment_method: document.getElementById('report-expenses-origin')?.value || '',
        search: document.getElementById('report-expenses-search')?.value?.trim() || ''
    };

    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) {
        window.showToast('❌ No hay negocio activo', 'error');
        return;
    }

    let sql = `SELECT * FROM transactions WHERE negocio_id = ? AND type = 'expense' 
        AND deleted_at IS NULL AND voided = 0`;
    let params = [negocioId];

    if (filters.from_date) { sql += ' AND DATE(transaction_date, "localtime") >= DATE(?)'; params.push(filters.from_date); }
    if (filters.to_date) { sql += ' AND DATE(transaction_date, "localtime") <= DATE(?)'; params.push(filters.to_date); }
    if (filters.category) { sql += ' AND category = ?'; params.push(filters.category); }
    if (filters.payment_method) { sql += ' AND payment_method = ?'; params.push(filters.payment_method); }
    if (filters.search) { sql += ' AND concept LIKE ?'; params.push('%' + filters.search + '%'); }
    sql += ' ORDER BY transaction_date DESC';

    const expenses = window.DBModule.query(sql, params);

    if (expenses.length === 0) {
        window.showToast('⚠️ No hay gastos en el período seleccionado', 'warning');
        return;
    }

    const totalGastos = expenses.reduce((sum, e) => sum + e.amount, 0);
    const porCategoria = {};
    const porOrigen = {};

    expenses.forEach(e => {
        const cat = e.category || 'otros';
        if (!porCategoria[cat]) porCategoria[cat] = { count: 0, total: 0 };
        porCategoria[cat].count++;
        porCategoria[cat].total += e.amount;

        const origen = e.payment_method || 'cash';
        if (!porOrigen[origen]) porOrigen[origen] = { count: 0, total: 0 };
        porOrigen[origen].count++;
        porOrigen[origen].total += e.amount;
    });

    const categoriaLabels = {
        'insumos': '🛒 Insumos', 'materiales': '📦 Materiales', 'transporte': '🚗 Transporte',
        'inversion': '💼 Inversión', 'otros': '🔄 Otros', 'gasto': '📤 General'
    };
    const origenLabels = { 'cash': '💵 Efectivo', 'transfer': '🏦 Transferencia', 'other': '🔄 Otra' };

    const periodo = filters.from_date && filters.to_date 
        ? `${new Date(filters.from_date).toLocaleDateString('es-ES')} al ${new Date(filters.to_date).toLocaleDateString('es-ES')}`
        : 'Todos los períodos';

    let filterDesc = [];
    if (filters.category) filterDesc.push(`📂 ${categoriaLabels[filters.category] || filters.category}`);
    if (filters.payment_method) filterDesc.push(`💳 ${origenLabels[filters.payment_method] || filters.payment_method}`);
    if (filters.search) filterDesc.push(`📝 "${filters.search}"`);

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reporte de Gastos - Panario</title>
            <style>
                * { font-family: system-ui, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
                body { padding: 20px; background: #fff; }
                .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #ef4444; padding-bottom: 15px; }
                .header h1 { color: #ef4444; font-size: 24px; }
                .header p { color: #666; font-size: 13px; margin-top: 4px; }
                .filters-info { background: #fee2e2; padding: 8px 12px; border-radius: 6px; margin-bottom: 15px; font-size: 12px; color: #991b1b; }
                .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 25px; }
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
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📤 Reporte de Gastos</h1>
                <p>${periodo}</p>
                <p style="font-size: 12px; color: #94a3b8;">Generado: ${new Date().toLocaleString('es-ES')}</p>
            </div>

            ${filterDesc.length > 0 ? `<div class="filters-info">🔍 <strong>Filtros:</strong> ${filterDesc.join(' · ')}</div>` : ''}

            <div class="summary">
                <div class="summary-card">
                    <div class="number">${expenses.length}</div>
                    <div class="label">📊 Total Gastos</div>
                </div>
                <div class="summary-card">
                    <div class="number">$${totalGastos.toFixed(2)}</div>
                    <div class="label">💰 Monto Total</div>
                </div>
                <div class="summary-card">
                    <div class="number">$${(totalGastos / expenses.length).toFixed(2)}</div>
                    <div class="label">📊 Promedio</div>
                </div>
            </div>

            <div class="section">
                <h3>📂 Desglose por Categoría</h3>
                <table>
                    <thead>
                        <tr><th>Categoría</th><th style="text-align: center;">Cantidad</th><th style="text-align: right;">Total</th><th style="text-align: right;">%</th></tr>
                    </thead>
                    <tbody>
                        ${Object.entries(porCategoria).sort((a, b) => b[1].total - a[1].total).map(([cat, data]) => `
                            <tr>
                                <td>${categoriaLabels[cat] || cat}</td>
                                <td style="text-align: center;">${data.count}</td>
                                <td style="text-align: right;">$${data.total.toFixed(2)}</td>
                                <td style="text-align: right;">${totalGastos > 0 ? ((data.total / totalGastos) * 100).toFixed(1) : 0}%</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="2" style="text-align: right;">TOTAL</td>
                            <td style="text-align: right;">$${totalGastos.toFixed(2)}</td>
                            <td style="text-align: right;">100%</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="section">
                <h3>💳 Desglose por Origen del Pago</h3>
                <table>
                    <thead>
                        <tr><th>Origen</th><th style="text-align: center;">Cantidad</th><th style="text-align: right;">Total</th><th style="text-align: right;">%</th></tr>
                    </thead>
                    <tbody>
                        ${Object.entries(porOrigen).sort((a, b) => b[1].total - a[1].total).map(([origen, data]) => `
                            <tr>
                                <td>${origenLabels[origen] || origen}</td>
                                <td style="text-align: center;">${data.count}</td>
                                <td style="text-align: right;">$${data.total.toFixed(2)}</td>
                                <td style="text-align: right;">${totalGastos > 0 ? ((data.total / totalGastos) * 100).toFixed(1) : 0}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="section">
                <h3>📋 Detalle de Gastos</h3>
                <table>
                    <thead>
                        <tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Origen</th><th style="text-align: right;">Monto</th></tr>
                    </thead>
                    <tbody>
                        ${expenses.slice(0, 100).map(e => `
                            <tr>
                                <td>${new Date(e.transaction_date).toLocaleDateString('es-ES')}</td>
                                <td>${e.concept}</td>
                                <td>${categoriaLabels[e.category] || e.category || '—'}</td>
                                <td>${origenLabels[e.payment_method] || e.payment_method || '—'}</td>
                                <td style="text-align: right; color: #ef4444; font-weight: 600;">-$${e.amount.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        ${expenses.length > 100 ? `<tr><td colspan="5" style="text-align: center; color: #94a3b8; font-size: 11px;">Mostrando 100 de ${expenses.length} gastos</td></tr>` : ''}
                    </tbody>
                </table>
            </div>

            <div class="footer">
                Reporte generado desde Panario 🍞 - ${new Date().toLocaleString('es-ES')}
            </div>
        </body>
        </html>
    `;

    if (window.ReportsModule) {
        window.ReportsModule.printReport(html);
    } else {
        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 500);
    }

    closeExpensesReportModal();
    window.showToast('✅ Reporte de gastos generado', 'success');
}

function closeExpensesReportModal() {
    const modal = document.getElementById('expenses-report-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
        setTimeout(() => {
            const still = document.getElementById('expenses-report-modal');
            if (still && still.parentNode) still.remove();
        }, 500);
    }
}

// ============================================================
// 🆕 FASE 2.3: LISTA DE ESPERA EN HERRAMIENTAS
// ============================================================

/**
 * Abre el modal de gestión de lista de espera desde Herramientas.
 * Reutiliza el modal definido en ui-orders.js.
 */
function showWaitingListFromSettings() {
    if (typeof window.showWaitingListManagerModal === 'function') {
        window.showWaitingListManagerModal();
    } else {
        window.showToast('⚠️ Módulo de lista de espera no disponible. Ve a Pedidos.', 'warning', 4000);
    }
}

/**
 * Genera el reporte PDF de la lista de espera desde Herramientas.
 */
async function reporteListaEsperaFromSettings() {
    if (typeof window.reporteListaEspera === 'function') {
        window.reporteListaEspera();
    } else if (window.ReportsModule && typeof window.ReportsModule.generateWaitingListReport === 'function') {
        try {
            window.showToast('⏳ Generando reporte...', 'info', 2000);
            const html = await window.ReportsModule.generateWaitingListReport();
            if (html) {
                window.ReportsModule.printReport(html);
                window.showToast('✅ Reporte generado', 'success', 3000);
            }
        } catch (error) {
            console.error('❌ Error generando reporte:', error);
            window.showToast('❌ Error: ' + error.message, 'error', 5000);
        }
    } else {
        window.showToast('⚠️ Módulo de reportes no disponible', 'warning', 4000);
    }
}

// ============================================================
// 🆕 FASE 2.3: CANCELACIÓN GLOBAL DE PEDIDOS (SOLO ADMIN)
// ============================================================

/**
 * Abre el modal de cancelación global de pedidos.
 * Solo accesible para admin.
 * 
 * Permite:
 *  - Seleccionar rango de fechas (desde/hasta)
 *  - Elegir causa principal (select)
 *  - Añadir nota adicional (opcional)
 *  - Doble confirmación
 *  - Ejecuta OrdersModule.cancelarPedidosGlobalmente()
 *  - Muestra resumen detallado
 */
function showGlobalCancelModal() {
    // Verificar permisos
    const user = window.AuthModule.getCurrentUser();
    if (!user || user.is_admin !== 1) {
        window.showToast('🔒 Solo el administrador puede cancelar pedidos globalmente', 'warning', 4000);
        return;
    }
    
    // Cerrar modales previos
    if (window.ModalModule && window.ModalModule.cerrarTodosLosModales) {
        window.ModalModule.cerrarTodosLosModales();
    }
    
    const existingModal = document.getElementById('global-cancel-modal');
    if (existingModal) existingModal.remove();
    
    const hoy = new Date();
    const en7dias = new Date(hoy);
    en7dias.setDate(en7dias.getDate() + 7);
    
    const modal = document.createElement('div');
    modal.id = 'global-cancel-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999999; padding: 15px;
        animation: modalFadeIn 0.25s ease;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 520px; width: 100%; max-height: 92vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: modalSlideUp 0.3s ease; border: 2px solid #dc2626;">
            
            <!-- HEADER -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #dc2626;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 32px;">🚨</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #dc2626;">Cancelación Global</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">Cancela pedidos por rango de fechas</p>
                    </div>
                </div>
                <button onclick="closeGlobalCancelModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <!-- ADVERTENCIA -->
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 12px; color: #991b1b; line-height: 1.6;">
                ⚠️ <strong>ATENCIÓN:</strong> Esta acción cancelará TODOS los pedidos 
                <strong>Pendientes, Confirmados, En producción y Listos</strong> dentro del rango de fechas.
                <br><br>
                ✅ Se repondrá el stock de los pedidos que lo tenían descontado.
                <br>
                ✅ Los pedidos ya ENTREGADOS no se ven afectados.
                <br>
                ✅ Las ventas ya creadas NO se modifican.
                <br>
                ⚠️ Los clientes en lista de espera con fecha posterior al rango se conservan.
            </div>
            
            <!-- FORMULARIO -->
            <form id="global-cancel-form" style="display: flex; flex-direction: column; gap: 14px;">
                
                <!-- RANGO DE FECHAS -->
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">
                        📅 Rango de fechas
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group">
                            <label style="font-size: 12px;">Desde</label>
                            <input type="date" id="global-cancel-from" 
                                   value="${hoy.toISOString().split('T')[0]}" 
                                   class="input-field" required>
                        </div>
                        <div class="form-group">
                            <label style="font-size: 12px;">Hasta</label>
                            <input type="date" id="global-cancel-to" 
                                   value="${en7dias.toISOString().split('T')[0]}" 
                                   class="input-field" required>
                        </div>
                    </div>
                </div>
                
                <!-- CAUSA -->
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">
                        📌 Causa principal
                    </div>
                    <select id="global-cancel-causa" class="input-select" required>
                        <option value="Falta de insumos">🛒 Falta de insumos</option>
                        <option value="Apagón prolongado">⚡ Apagón prolongado</option>
                        <option value="Mantenimiento de equipos">🔧 Mantenimiento de equipos</option>
                        <option value="Cierre temporal">🚪 Cierre temporal</option>
                        <option value="Problema de salud">🏥 Problema de salud</option>
                        <option value="Fuerza mayor">⚠️ Fuerza mayor</option>
                        <option value="Otro">🔄 Otro</option>
                    </select>
                </div>
                
                <!-- NOTA -->
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">
                        📝 Nota adicional (opcional)
                    </div>
                    <textarea id="global-cancel-nota" 
                              class="input-textarea" 
                              rows="2" 
                              placeholder="Ej: Se espera reanudar la próxima semana"></textarea>
                </div>
                
                <!-- BOTONES -->
                <div style="display: flex; gap: 8px; margin-top: 4px;">
                    <button type="submit" 
                            class="btn" 
                            style="flex: 1; padding: 12px; font-size: 14px; background: #dc2626; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">
                        🚨 CANCELAR PEDIDOS
                    </button>
                    <button type="button" 
                            onclick="closeGlobalCancelModal()" 
                            class="btn secondary" 
                            style="flex: 1; padding: 12px; font-size: 14px;">
                        ❌ Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    window._globalCancelModal = modal;
    
    // Submit
    const form = document.getElementById('global-cancel-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await executeGlobalCancel();
    });
    
    // Cierre con click fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeGlobalCancelModal();
    });
    
    // Cierre con Escape
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeGlobalCancelModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

/**
 * Cierra el modal de cancelación global.
 */
function closeGlobalCancelModal() {
    const modal = document.getElementById('global-cancel-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
        setTimeout(() => {
            const still = document.getElementById('global-cancel-modal');
            if (still && still.parentNode) still.remove();
        }, 500);
    }
    window._globalCancelModal = null;
}

/**
 * Ejecuta la cancelación global tras validar y confirmar.
 */
async function executeGlobalCancel() {
    const fechaDesde = document.getElementById('global-cancel-from')?.value;
    const fechaHasta = document.getElementById('global-cancel-to')?.value;
    const causa = document.getElementById('global-cancel-causa')?.value || '';
    const nota = document.getElementById('global-cancel-nota')?.value?.trim() || '';
    
    // Validaciones
    if (!fechaDesde || !fechaHasta) {
        window.showToast('⚠️ Debes especificar fecha desde y hasta', 'error');
        return;
    }
    
    if (fechaDesde > fechaHasta) {
        window.showToast('⚠️ La fecha "desde" debe ser anterior a "hasta"', 'error');
        return;
    }
    
    // Verificar que hay pedidos en ese rango
    const negocioId = window.DBModule.getNegocioIdActual();
    const pedidosEnRango = window.DBModule.query(`
        SELECT COUNT(*) as n FROM orders
        WHERE negocio_id = ? 
          AND deleted_at IS NULL
          AND status IN ('pending', 'confirmed', 'production', 'ready')
          AND DATE(delivery_date) >= DATE(?)
          AND DATE(delivery_date) <= DATE(?)
    `, [negocioId, fechaDesde, fechaHasta]);
    
    const count = pedidosEnRango[0]?.n || 0;
    
    if (count === 0) {
        window.showToast(`ℹ️ No hay pedidos cancelables en el rango ${fechaDesde} → ${fechaHasta}`, 'info', 5000);
        return;
    }
    
    // Confirmación 1
    const confirm1 = await window.ModalModule.showConfirm({
        title: '⚠️ Confirmar cancelación',
        message: `Se cancelarán ${count} pedido(s) entre el ${fechaDesde} y el ${fechaHasta}.\n\n📌 Causa: ${causa}\n${nota ? `📝 Nota: ${nota}\n\n` : ''}¿Continuar?`,
        confirmText: '⚠️ CONTINUAR',
        cancelText: '❌ Cancelar',
        icon: '⚠️',
        confirmColor: '#f59e0b'
    });
    
    if (!confirm1) return;
    
    // Confirmación 2 (última)
    const confirm2 = await window.ModalModule.showConfirm({
        title: '🚨 CONFIRMACIÓN FINAL',
        message: `Esta es la ÚLTIMA advertencia.\n\nSe cancelarán ${count} pedido(s).\nLos pedidos cancelados NO se pueden recuperar (aunque sí los datos quedan en el historial).\n\n¿Confirmas?`,
        confirmText: '🚨 SÍ, CANCELAR TODO',
        cancelText: '❌ NO, volver',
        icon: '🚨',
        confirmColor: '#dc2626'
    });
    
    if (!confirm2) {
        window.showToast('❌ Cancelación abortada', 'info', 2000);
        return;
    }
    
    // Cerrar el modal de cancelación global
    closeGlobalCancelModal();
    
    // Ejecutar
    try {
        window.showToast('⏳ Cancelando pedidos...', 'info', 3000);
        
        const result = await window.OrdersModule.cancelarPedidosGlobalmente(
            fechaDesde,
            fechaHasta,
            causa,
            nota
        );
        
        if (!result.success) {
            window.showToast('❌ Error: ' + (result.error || 'Desconocido'), 'error', 6000);
            return;
        }
        
        // Modal de resultado
        const erroresHtml = (result.errores && result.errores.length > 0)
            ? `\n\n⚠️ Hubo ${result.errores.length} error(es):\n${result.errores.slice(0, 5).join('\n')}`
            : '';
        
        const mensaje = `✅ Cancelación completada.\n\n` +
            `🚫 Pedidos cancelados: ${result.cancelados}\n` +
            `🔄 Items reiniciados de lista: ${result.reiniciados}\n` +
            `⏰ Items preservados de lista: ${result.preservados}\n\n` +
            `📌 Causa: ${result.notaFinal}${erroresHtml}`;
        
        await window.ModalModule.showAlert({
            title: '✅ Cancelación global exitosa',
            message: mensaje,
            icon: '✅',
            type: 'success',
            buttonText: '✅ Entendido'
        });
        
        window.showToast(`✅ ${result.cancelados} pedido(s) cancelado(s)`, 'success', 5000);
        
        // Refrescar vistas
        if (typeof window.refreshCurrentView === 'function') {
            setTimeout(window.refreshCurrentView, 500);
        }
        if (typeof window.loadDashboardData === 'function') {
            setTimeout(window.loadDashboardData, 800);
        }
        
    } catch (error) {
        console.error('❌ Error en cancelación global:', error);
        window.showToast('❌ Error: ' + error.message, 'error', 6000);
    }
}

// ============================================================
// RENDER SETTINGS VIEW - FUNCIÓN PRINCIPAL
// ============================================================

function renderSettingsView() {
    console.log('⚙️ renderSettingsView() ejecutado');
    
    const main = document.getElementById('mainContent');
    if (!main) {
        console.error('❌ mainContent no encontrado');
        return;
    }
    
    const user = window.AuthModule.getCurrentUser();
    const isAdmin = user && user.is_admin === 1;
    
    // 🆕 FASE 6: Leer la versión actual desde el meta del index.html
    const appVersion = getAppVersion();
    
    // Contar items en lista de espera (async)
    let waitingCount = 0;
    if (window.OrdersModule && window.OrdersModule.getWaitingListCount) {
        window.OrdersModule.getWaitingListCount().then(count => {
            waitingCount = count;
            const badge = document.getElementById('settings-waiting-count');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline-block' : 'none';
            }
        }).catch(() => {});
    }
    
    main.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h2 style="margin: 0;">⚙️ Herramientas</h2>
            <button onclick="window.navigate('dashboard')" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                ← Volver
            </button>
        </div>
        
        <div class="card" style="border-left: 4px solid ${isAdmin ? '#f59e0b' : '#3b82f6'}; background: ${isAdmin ? '#f59e0b10' : '#3b82f610'}; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 32px;">${isAdmin ? '👑' : '👤'}</span>
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 15px; color: ${isAdmin ? '#f59e0b' : '#3b82f6'};">
                        ${isAdmin ? 'Eres Administrador' : 'Eres Usuario'}
                    </div>
                    <div style="font-size: 12px; color: var(--text-light); margin-top: 2px;">
                        ${isAdmin 
                            ? 'Puedes crear e importar copias de seguridad completas y de datos.'
                            : 'Solo puedes crear e importar copias de datos (no afectan a los usuarios).'
                        }
                    </div>
                </div>
            </div>
        </div>
        
        ${isAdmin ? `
        <div class="card" style="border-left: 4px solid #f59e0b; border: 2px solid #f59e0b; background: linear-gradient(135deg, #f59e0b10 0%, #f59e0b05 100%);">
            <h3 style="margin: 0 0 8px 0; color: #f59e0b;">👥 Gestión de Usuarios</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Administra los usuarios de tu negocio, regenera el código de invitación y gestiona accesos.
            </p>
            <button onclick="showUsersModal()" class="btn primary" style="padding: 10px 16px; font-size: 14px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                👥 Gestionar Usuarios
            </button>
        </div>
        ` : ''}
        
        <!-- 🆕 FASE 2.3: LISTA DE ESPERA -->
        <div class="card" style="border-left: 4px solid #f59e0b; border: 2px solid #f59e0b;">
            <h3 style="margin: 0 0 8px 0; color: #f59e0b; display: flex; align-items: center; gap: 8px;">
                ⏰ Lista de Espera 
                <span id="settings-waiting-count" style="font-size: 12px; background: #f59e0b; color: #fff; padding: 2px 10px; border-radius: 12px; display: none; font-weight: 700;">0</span>
            </h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Gestiona los clientes en cola: procesar ventas, cancelar pedidos, limpiar la lista y generar reportes.
            </p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="showWaitingListFromSettings()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    ⏰ Gestionar lista de espera
                </button>
                <button onclick="reporteListaEsperaFromSettings()" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #3b82f6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📄 Reporte PDF
                </button>
            </div>
        </div>
        
        ${isAdmin ? `
        <!-- 🆕 FASE 2.3: CANCELACIÓN GLOBAL -->
        <div class="card" style="border-left: 4px solid #dc2626; border: 2px solid #dc2626;">
            <h3 style="margin: 0 0 8px 0; color: #dc2626;">🚨 Cancelación Global de Pedidos</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Cancela todos los pedidos en un rango de fechas. Útil para apagones prolongados, falta de insumos o cierres temporales.
                <br><strong style="color: #dc2626;">Solo administradores.</strong>
            </p>
            <button onclick="showGlobalCancelModal()" class="btn" style="padding: 10px 16px; font-size: 14px; width: auto; background: #dc2626; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">
                🚨 Cancelar pedidos por rango
            </button>
        </div>
        ` : ''}
        
        <div class="card" style="border-left: 4px solid #f59e0b; border: 2px solid #f59e0b;">
            <h3 style="margin: 0 0 8px 0; color: #f59e0b;">⚡ Horarios de Producción (Corriente)</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Gestiona los horarios de corriente eléctrica para planificar tu producción.
            </p>
            <button onclick="showCorrienteModal()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                ⚡ Gestionar Horarios
            </button>
        </div>
        
        <div class="card" style="border-left: 4px solid #ef4444; border: 2px solid #ef4444;">
            <h3 style="margin: 0 0 8px 0; color: #ef4444;">📊 Reporte de Gastos</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Genera un reporte parametrizable de todos los gastos por rango de fechas, categoría y origen del pago.
            </p>
            <button onclick="showExpensesReportModal()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #ef4444; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                📊 Generar Reporte de Gastos
            </button>
        </div>
        
        <div class="card" style="border-left: 4px solid #10b981; border: 2px solid #10b981;">
            <h3 style="margin: 0 0 8px 0; color: #10b981;">📤 Exportar copia de seguridad</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                ${isAdmin 
                    ? 'Como administrador, puedes crear dos tipos de copia: <strong>completa</strong> (incluye usuarios y negocio) o <strong>solo datos</strong> (solo datos operativos).'
                    : 'Puedes crear una copia de <strong>solo datos</strong> (insumos, recetas, productos, ventas, pedidos). Tus usuarios y el código de invitación no se incluyen.'
                }
            </p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${isAdmin ? `
                    <button onclick="exportDatabaseCompleteAction()" class="btn primary" style="padding: 10px 16px; font-size: 14px; width: auto; background: #10b981; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        📦 Copia completa (admin)
                    </button>
                ` : ''}
                <button onclick="exportDatabaseDataOnlyAction()" class="btn primary" style="padding: 10px 16px; font-size: 14px; width: auto; background: #3b82f6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📊 Copia de datos
                </button>
            </div>
        </div>
        
        <!-- 🆕 FASE 1.3.4: Bloque de importar con 3 modos -->
        <div class="card" style="border-left: 4px solid #f59e0b; border: 2px solid #f59e0b;">
            <h3 style="margin: 0 0 8px 0; color: #f59e0b;">📥 Importar copia de seguridad</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Elige cómo quieres importar el archivo <code>.db</code> de otro dispositivo:
                <br>• <strong>Importar copia:</strong> reemplaza TODOS los datos (incluye usuarios si eres admin).
                <br>• <strong>Importar solo datos:</strong> reemplaza los datos operativos, conserva usuarios.
                <br>• <strong>🔀 Fusionar:</strong> <span style="color: #8b5cf6; font-weight: 600;">combina</span> los datos del backup con los actuales. Los registros nuevos se añaden, los existentes se comparan por uuid (gana el más reciente).
            </p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="importDatabaseSmartAction()" class="btn primary" style="padding: 10px 16px; font-size: 14px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📥 Importar copia (detección automática)
                </button>
                <button onclick="importDatabaseDataOnlyFromFileAction()" class="btn secondary" style="padding: 10px 16px; font-size: 14px; width: auto; background: #3b82f6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📊 Importar solo datos (reemplaza)
                </button>
                <button onclick="importDatabaseFusionAction()" class="btn primary" style="padding: 10px 16px; font-size: 14px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    🔀 Fusionar bases de datos
                </button>
            </div>
            <p style="font-size: 12px; color: var(--text-light); margin-top: 8px;">
                💡 <strong>Recomendado:</strong> usa "🔀 Fusionar" para integrar cambios de otro dispositivo sin perder datos locales.
            </p>
        </div>
        
        <div class="card" style="border-left: 4px solid #8b5cf6; border: 2px solid #8b5cf6;">
            <h3 style="margin: 0 0 8px 0; color: #8b5cf6;">🧩 Salva diferencial (Recetas y Productos)</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Exporta o importa <strong>solo las recetas y productos</strong>. Esta salva NO afecta a ventas, pedidos, insumos, clientes ni transacciones.
            </p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="exportSalvaRecetasProductos()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📤 Exportar recetas y productos
                </button>
                <button onclick="importSalvaRecetasProductos()" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📥 Importar recetas y productos
                </button>
            </div>
            <p style="font-size: 12px; color: var(--text-light); margin-top: 8px;">
                💡 La exportación genera un archivo <strong>.json</strong> con nombre <code>panario_salva_recetas_productos_YYYY-MM-DD.json</code>
            </p>
        </div>
        
        <div class="card">
            <h3 style="margin: 0 0 8px 0;">👤 Recordar usuario</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                ${user ? `Último usuario: <strong>${user.username}</strong>` : 'No hay usuario recordado'}
            </p>
            <button onclick="clearLastUserAction()" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                🗑️ Olvidar último usuario
            </button>
        </div>
        
        <div class="card" style="border-left: 4px solid #ef4444;">
            <h3 style="margin: 0 0 8px 0;">🧹 Limpiar datos eliminados</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Elimina permanentemente todos los registros marcados como eliminados.
                <br><strong style="color: #ef4444;">⚠️ Esta acción no se puede deshacer.</strong>
            </p>
            <button onclick="cleanDeletedData()" class="btn danger" style="padding: 8px 16px; font-size: 14px; width: auto;">
                🗑️ Limpiar datos eliminados
            </button>
        </div>
        
        ${isAdmin ? `
        <div class="card" style="border-left: 4px solid #dc2626; border: 2px solid #dc2626; background: var(--bg);">
            <h3 style="margin: 0 0 8px 0; color: #dc2626;">🚨 Eliminación por error</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                <strong style="color: #dc2626;">⚠️ ¡ADVERTENCIA!</strong><br>
                Elimina <strong>PERMANENTEMENTE</strong> pedidos y ventas creados por error.
                <br><span style="color: #dc2626;">Los datos eliminados NO se pueden recuperar.</span>
            </p>
            <button onclick="showDeleteSelectorModal()" class="btn danger" style="padding: 10px 20px; font-size: 15px; width: auto; background: #dc2626; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                🗑️ SELECCIONAR Y ELIMINAR
            </button>
        </div>
        
        <div class="card" style="border-left: 4px solid #dc2626; border: 2px solid #dc2626; background: var(--bg);">
            <h3 style="margin: 0 0 8px 0; color: #dc2626;">🚨 Reiniciar Base de Datos</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                <strong style="color: #dc2626;">⚠️ ¡ADVERTENCIA!</strong><br>
                Elimina <strong>TODOS</strong> los datos de la aplicación.
                <br><span style="color: #10b981;">✅ Se conservan usuarios y temas.</span>
                <br><br>
                <strong style="color: #dc2626;">Contraseña: "panario"</strong>
            </p>
            <button onclick="resetDatabaseWithPassword()" class="btn danger" style="padding: 10px 20px; font-size: 15px; width: auto; background: #dc2626; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                🚨 REINICIAR BASE DE DATOS
            </button>
        </div>
        ` : ''}
        
        <div class="card">
            <h3 style="margin: 0 0 8px 0;">ℹ️ Información</h3>
            <p style="font-size: 14px; color: var(--text-light);">
                <strong>Panario</strong> - Tu panadería en orden<br>
                Versión: <span id="app-version-display">${appVersion}</span>
            </p>
            <p style="font-size: 12px; color: var(--text-light); margin-top: 8px;">
                🍞 Desarrollado por Ricardo Castillo Valdés
            </p>
        </div>
    `;
    
    console.log(`✅ renderSettingsView() completado (versión mostrada: ${appVersion})`);
}

// ============================================================
// 👥 MÓDULO DE USUARIOS (SOLO ADMIN) - FASE B AMPLIADO
// ============================================================

async function showUsersModal() {
    if (window.ModalModule && window.ModalModule.cerrarTodosLosModales) {
        window.ModalModule.cerrarTodosLosModales();
    }
    
    const existingModal = document.getElementById('users-modal');
    if (existingModal) existingModal.remove();
    
    const user = window.AuthModule.getCurrentUser();
    if (!user || user.is_admin !== 1) {
        window.showToast('⚠️ Solo el administrador puede gestionar usuarios', 'warning');
        return;
    }
    
    const negocioId = window.DBModule.getNegocioIdActual();
    const negocio = window.DBModule.getNegocio(negocioId);
    
    if (!negocio) {
        window.showToast('❌ No hay negocio activo', 'error');
        return;
    }
    
    const usuarios = window.DBModule.query(`
        SELECT id, username, name, email, phone, photo, is_admin, created_at
        FROM users WHERE negocio_id = ? AND deleted_at IS NULL
        ORDER BY is_admin DESC, created_at ASC`, [negocioId]);
    
    const modal = document.createElement('div');
    modal.id = 'users-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999999; padding: 15px;
        animation: modalFadeIn 0.25s ease;
    `;
    
    const usuariosHtml = usuarios.map(u => {
        const isCurrentUser = u.id === user.id;
        const isAdminUser = u.is_admin === 1;
        const avatar = u.photo && u.photo.startsWith('data:image')
            ? `<img src="${u.photo}" style="width: 100%; height: 100%; object-fit: cover;">`
            : `<span style="font-size: 20px;">${isAdminUser ? '👑' : '👤'}</span>`;
        
        const fechaRegistro = u.created_at 
            ? new Date(u.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';
        
        return `
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg); border-radius: 10px; margin-bottom: 6px; border-left: 4px solid ${isAdminUser ? '#f59e0b' : '#3b82f6'}; flex-wrap: wrap;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg-card); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; border: 2px solid ${isAdminUser ? '#f59e0b' : '#3b82f6'};">
                    ${avatar}
                </div>
                <div style="flex: 1; min-width: 150px;">
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="font-weight: 600; font-size: 14px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${u.name || u.username}
                        </span>
                        ${isAdminUser ? '<span style="font-size: 10px; background: #f59e0b20; color: #f59e0b; padding: 1px 6px; border-radius: 8px; font-weight: 600;">👑 ADMIN</span>' : ''}
                        ${isCurrentUser ? '<span style="font-size: 10px; background: #10b98120; color: #10b981; padding: 1px 6px; border-radius: 8px; font-weight: 600;">TÚ</span>' : ''}
                    </div>
                    <div style="font-size: 12px; color: var(--text-light); margin-top: 2px;">@${u.username}</div>
                    <div style="font-size: 11px; color: var(--text-light); margin-top: 2px;">
                        📅 ${fechaRegistro}
                        ${u.email ? ` · 📧 ${u.email}` : ''}
                        ${u.phone ? ` · 📞 ${u.phone}` : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 4px; flex-wrap: wrap; flex-shrink: 0;">
                    <button onclick="event.stopPropagation(); showEditUserModal(${u.id})" 
                            class="btn secondary" style="padding: 6px 10px; font-size: 12px; width: auto;" title="Editar datos">✏️</button>
                    <button onclick="event.stopPropagation(); showChangePasswordModal(${u.id}, '${u.username.replace(/'/g, "\\'")}')" 
                            class="btn secondary" style="padding: 6px 10px; font-size: 12px; width: auto;" title="Cambiar contraseña">🔑</button>
                    ${!isCurrentUser ? `
                        <button onclick="event.stopPropagation(); handleToggleAdmin(${u.id}, ${isAdminUser ? 'false' : 'true'}, '${u.username.replace(/'/g, "\\'")}')" 
                                class="btn secondary" style="padding: 6px 10px; font-size: 12px; width: auto; color: ${isAdminUser ? '#94a3b8' : '#f59e0b'}; border-color: ${isAdminUser ? '#94a3b8' : '#f59e0b'};" 
                                title="${isAdminUser ? 'Quitar admin' : 'Promover a admin'}">${isAdminUser ? '👤' : '👑'}</button>
                        <button onclick="event.stopPropagation(); deleteUser(${u.id}, '${u.username.replace(/'/g, "\\'")}')" 
                                class="btn secondary" style="padding: 6px 10px; font-size: 12px; width: auto; color: #ef4444; border-color: #ef4444;" 
                                title="Eliminar usuario">🗑️</button>
                    ` : `<span style="font-size: 11px; color: var(--text-light); padding: 6px 4px;">—</span>`}
                </div>
            </div>
        `;
    }).join('');
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 20px; max-width: 600px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color); overflow-y: auto;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">👥</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: var(--text);">Usuarios del Negocio</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">${negocio.nombre}</p>
                    </div>
                </div>
                <button onclick="closeUsersModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 100px; background: #f59e0b15; padding: 10px 12px; border-radius: 8px; text-align: center; border-left: 3px solid #f59e0b;">
                    <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${usuarios.length}</div>
                    <div style="font-size: 11px; color: var(--text-light);">Total usuarios</div>
                </div>
                <div style="flex: 1; min-width: 100px; background: #3b82f615; padding: 10px 12px; border-radius: 8px; text-align: center; border-left: 3px solid #3b82f6;">
                    <div style="font-size: 20px; font-weight: 700; color: #3b82f6;">${usuarios.filter(u => u.is_admin === 1).length}</div>
                    <div style="font-size: 11px; color: var(--text-light);">Administradores</div>
                </div>
                <div style="flex: 1; min-width: 100px; background: #10b98115; padding: 10px 12px; border-radius: 8px; text-align: center; border-left: 3px solid #10b981;">
                    <div style="font-size: 20px; font-weight: 700; color: #10b981;">${usuarios.filter(u => u.is_admin !== 1).length}</div>
                    <div style="font-size: 11px; color: var(--text-light);">Usuarios regulares</div>
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #f59e0b15 0%, #f59e0b05 100%); border: 2px solid #f59e0b; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <span style="font-size: 22px;">🔑</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 14px; color: #f59e0b;">Código de invitación</div>
                        <div style="font-size: 11px; color: var(--text-light);">Comparte este código para invitar usuarios</div>
                    </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 150px; background: var(--bg-card); padding: 10px 14px; border-radius: 8px; text-align: center; border: 1px solid var(--border-color);">
                        <span style="font-family: monospace; font-size: 20px; font-weight: 700; letter-spacing: 3px; color: #f59e0b;">
                            ${negocio.codigo_invitacion || '—'}
                        </span>
                    </div>
                    <button onclick="copiarCodigoInvitacion('${negocio.codigo_invitacion}')" 
                            class="btn primary" style="padding: 10px 16px; font-size: 13px; width: auto; background: #3b82f6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        📋 Copiar
                    </button>
                    <button onclick="regenerarCodigoAction()" 
                            class="btn primary" style="padding: 10px 16px; font-size: 13px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;" 
                            title="Regenerar código (invalida el anterior)">
                        🔄 Regenerar
                    </button>
                </div>
            </div>
            
            <div style="margin-bottom: 12px;">
                <button onclick="showCreateUserModal()" 
                        class="btn primary" 
                        style="width: 100%; padding: 12px; font-size: 14px; background: #10b981; color: #fff; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    ➕ Crear nuevo usuario directamente
                </button>
                <p style="font-size: 11px; color: var(--text-light); text-align: center; margin-top: 6px;">
                    💡 Alternativa: comparte el código de invitación para que se registren ellos mismos
                </p>
            </div>
            
            <div style="margin-bottom: 12px;">
                <div style="font-size: 13px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">
                    📋 Lista de usuarios (${usuarios.length})
                </div>
                <div style="max-height: 400px; overflow-y: auto; padding-right: 4px;">
                    ${usuariosHtml}
                </div>
            </div>
            
            <div style="display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid var(--border-color); justify-content: flex-end;">
                <button onclick="closeUsersModal()" class="btn secondary" style="padding: 10px 20px; font-size: 14px; width: auto;">Cerrar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    window.closeUsersModal = function() {
        const m = document.getElementById('users-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => { if (m.parentNode) m.remove(); }, 200);
            setTimeout(() => {
                const still = document.getElementById('users-modal');
                if (still && still.parentNode) still.remove();
            }, 500);
        }
    };
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeUsersModal();
    });
}

// ============================================================
// MODAL DE CREAR USUARIO
// ============================================================

async function showCreateUserModal() {
    const existingModal = document.getElementById('create-user-modal');
    if (existingModal) existingModal.remove();
    
    const user = window.AuthModule.getCurrentUser();
    if (!user || user.is_admin !== 1) {
        window.showToast('⚠️ Solo el administrador puede crear usuarios', 'warning');
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'create-user-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999999; padding: 15px;
        animation: modalFadeIn 0.25s ease;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 480px; width: 100%; max-height: 95vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">➕</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #10b981;">Crear Nuevo Usuario</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">El usuario se agregará a tu negocio</p>
                    </div>
                </div>
                <button onclick="closeCreateUserModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="background: #fef9e7; border: 1px solid #f59e0b; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; font-size: 12px; color: #92400e;">
                💡 <strong>Contraseña temporal:</strong> Comparte la contraseña que asignes con el usuario. Podrá cambiarla luego desde su perfil.
            </div>
            
            <form id="create-user-form" style="display: flex; flex-direction: column; gap: 12px;">
                <div class="form-group">
                    <label>👤 Nombre de usuario (para login)</label>
                    <input type="text" id="create-user-username" placeholder="Ej: juan_perez" required
                           style="text-transform: lowercase;"
                           oninput="this.value = this.value.toLowerCase().replace(/[^a-z0-9_]/g, '')">
                    <small style="font-size: 11px; color: var(--text-light);">Solo letras minúsculas, números y guión bajo</small>
                </div>
                <div class="form-group">
                    <label>🔒 Contraseña temporal</label>
                    <input type="text" id="create-user-password" placeholder="Mínimo 4 caracteres" required minlength="4">
                    <small style="font-size: 11px; color: var(--text-light);">El usuario podrá cambiarla después</small>
                </div>
                <div class="form-group">
                    <label>📛 Nombre completo</label>
                    <input type="text" id="create-user-name" placeholder="Ej: Juan Pérez García" required>
                </div>
                <div class="form-group">
                    <label>📧 Email (opcional)</label>
                    <input type="email" id="create-user-email" placeholder="Ej: juan@email.com">
                </div>
                <div class="form-group">
                    <label>📞 Teléfono (opcional)</label>
                    <input type="tel" id="create-user-phone" placeholder="Ej: +53 5555 5555">
                </div>
                <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border-color);">
                    <span style="font-size: 20px;">👑</span>
                    <div style="flex: 1;">
                        <div style="font-size: 14px; font-weight: 600;">Rol de administrador</div>
                        <div style="font-size: 11px; color: var(--text-light); margin-top: 2px;">Los admins pueden gestionar usuarios y hacer copias completas</div>
                    </div>
                    <input type="checkbox" id="create-user-isadmin" style="width: 20px; height: 20px; cursor: pointer; accent-color: #f59e0b;">
                </div>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" style="flex: 1; background: #10b981; color: #fff; border: none; border-radius: 8px; padding: 12px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        ✅ Crear usuario
                    </button>
                    <button type="button" onclick="closeCreateUserModal()" class="btn secondary" style="flex: 1;">❌ Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => { document.getElementById('create-user-username')?.focus(); }, 100);
    
    const form = document.getElementById('create-user-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('create-user-username').value.trim();
        const password = document.getElementById('create-user-password').value.trim();
        const name = document.getElementById('create-user-name').value.trim();
        const email = document.getElementById('create-user-email').value.trim();
        const phone = document.getElementById('create-user-phone').value.trim();
        const isAdmin = document.getElementById('create-user-isadmin').checked;
        
        if (!username || !password || !name) {
            window.showToast('⚠️ Usuario, contraseña y nombre son obligatorios', 'error');
            return;
        }
        if (password.length < 4) {
            window.showToast('⚠️ La contraseña debe tener al menos 4 caracteres', 'error');
            return;
        }
        
        try {
            const result = await window.AuthModule.createUserAsAdmin({ username, password, name, email, phone, isAdmin });
            if (result.success) {
                window.showToast(`✅ Usuario "${username}" creado correctamente`, 'success', 4000);
                closeCreateUserModal();
                setTimeout(() => showUsersModal(), 500);
            } else {
                window.showToast('❌ ' + result.error, 'error', 5000);
            }
        } catch (error) {
            window.showToast('❌ Error: ' + error.message, 'error', 5000);
        }
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeCreateUserModal();
    });
    
    window.closeCreateUserModal = function() {
        const m = document.getElementById('create-user-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => { if (m.parentNode) m.remove(); }, 200);
            setTimeout(() => {
                const still = document.getElementById('create-user-modal');
                if (still && still.parentNode) still.remove();
            }, 500);
        }
    };
}

// ============================================================
// MODAL DE EDITAR USUARIO
// ============================================================

async function showEditUserModal(userId) {
    const existingModal = document.getElementById('edit-user-modal');
    if (existingModal) existingModal.remove();
    
    const currentUser = window.AuthModule.getCurrentUser();
    if (!currentUser || currentUser.is_admin !== 1) {
        window.showToast('⚠️ Solo el administrador puede editar usuarios', 'warning');
        return;
    }
    
    const targetUser = window.DBModule.query(
        'SELECT id, username, name, email, phone, is_admin FROM users WHERE id = ? AND deleted_at IS NULL',
        [userId]
    );
    
    if (targetUser.length === 0) {
        window.showToast('⚠️ Usuario no encontrado', 'warning');
        return;
    }
    
    const u = targetUser[0];
    
    const modal = document.createElement('div');
    modal.id = 'edit-user-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999999; padding: 15px;
        animation: modalFadeIn 0.25s ease;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 480px; width: 100%; max-height: 95vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">✏️</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #3b82f6;">Editar Usuario</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">@${u.username}</p>
                    </div>
                </div>
                <button onclick="closeEditUserModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <form id="edit-user-form" style="display: flex; flex-direction: column; gap: 12px;">
                <div class="form-group">
                    <label>📛 Nombre completo</label>
                    <input type="text" id="edit-user-name" value="${u.name || ''}" placeholder="Ej: Juan Pérez García" required>
                </div>
                <div class="form-group">
                    <label>📧 Email (opcional)</label>
                    <input type="email" id="edit-user-email" value="${u.email || ''}" placeholder="Ej: juan@email.com">
                </div>
                <div class="form-group">
                    <label>📞 Teléfono (opcional)</label>
                    <input type="tel" id="edit-user-phone" value="${u.phone || ''}" placeholder="Ej: +53 5555 5555">
                </div>
                <div style="background: var(--bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 12px; font-size: 12px; color: var(--text-light);">
                    ℹ️ El <strong>nombre de usuario (@${u.username})</strong> no se puede cambiar. Es el identificador de login.
                </div>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" style="flex: 1; background: #3b82f6; color: #fff; border: none; border-radius: 8px; padding: 12px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        💾 Guardar cambios
                    </button>
                    <button type="button" onclick="closeEditUserModal()" class="btn secondary" style="flex: 1;">❌ Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const form = document.getElementById('edit-user-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('edit-user-name').value.trim();
        const email = document.getElementById('edit-user-email').value.trim();
        const phone = document.getElementById('edit-user-phone').value.trim();
        
        if (!name) {
            window.showToast('⚠️ El nombre es obligatorio', 'error');
            return;
        }
        
        try {
            const result = await window.AuthModule.updateUserDataByAdmin(userId, { name, email, phone });
            if (result.success) {
                window.showToast(`✅ Usuario actualizado correctamente`, 'success', 3000);
                closeEditUserModal();
                setTimeout(() => showUsersModal(), 500);
            } else {
                window.showToast('❌ ' + result.error, 'error', 5000);
            }
        } catch (error) {
            window.showToast('❌ Error: ' + error.message, 'error', 5000);
        }
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeEditUserModal();
    });
    
    window.closeEditUserModal = function() {
        const m = document.getElementById('edit-user-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => { if (m.parentNode) m.remove(); }, 200);
            setTimeout(() => {
                const still = document.getElementById('edit-user-modal');
                if (still && still.parentNode) still.remove();
            }, 500);
        }
    };
}

// ============================================================
// MODAL DE CAMBIAR CONTRASEÑA
// ============================================================

async function showChangePasswordModal(userId, username) {
    const existingModal = document.getElementById('change-password-modal');
    if (existingModal) existingModal.remove();
    
    const currentUser = window.AuthModule.getCurrentUser();
    if (!currentUser) return;
    
    const isOwnUser = currentUser.id === userId;
    const isAdmin = currentUser.is_admin === 1;
    
    if (!isOwnUser && !isAdmin) {
        window.showToast('⚠️ No tienes permiso para cambiar esta contraseña', 'warning');
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'change-password-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999999; padding: 15px;
        animation: modalFadeIn 0.25s ease;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 440px; width: 100%; max-height: 95vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">🔑</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #f59e0b;">Cambiar Contraseña</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">@${username}</p>
                    </div>
                </div>
                <button onclick="closeChangePasswordModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="background: #fef9e7; border: 1px solid #f59e0b; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; font-size: 12px; color: #92400e;">
                💡 <strong>Contraseña temporal:</strong> Comparte la nueva contraseña con el usuario por un canal seguro.
            </div>
            
            <form id="change-password-form" style="display: flex; flex-direction: column; gap: 12px;">
                <div class="form-group">
                    <label>🔒 Nueva contraseña</label>
                    <input type="text" id="change-pass-new" placeholder="Mínimo 4 caracteres" required minlength="4">
                </div>
                <div class="form-group">
                    <label>🔒 Confirmar contraseña</label>
                    <input type="text" id="change-pass-confirm" placeholder="Repite la contraseña" required minlength="4">
                </div>
                <div id="change-pass-error" style="display: none; background: #ef444420; color: #ef4444; padding: 8px 12px; border-radius: 6px; font-size: 13px;"></div>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" style="flex: 1; background: #f59e0b; color: #fff; border: none; border-radius: 8px; padding: 12px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        🔑 Cambiar contraseña
                    </button>
                    <button type="button" onclick="closeChangePasswordModal()" class="btn secondary" style="flex: 1;">❌ Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => { document.getElementById('change-pass-new')?.focus(); }, 100);
    
    const form = document.getElementById('change-password-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newPass = document.getElementById('change-pass-new').value.trim();
        const confirmPass = document.getElementById('change-pass-confirm').value.trim();
        const errorEl = document.getElementById('change-pass-error');
        
        errorEl.style.display = 'none';
        errorEl.textContent = '';
        
        if (newPass.length < 4) {
            errorEl.textContent = '⚠️ La contraseña debe tener al menos 4 caracteres';
            errorEl.style.display = 'block';
            return;
        }
        if (newPass !== confirmPass) {
            errorEl.textContent = '⚠️ Las contraseñas no coinciden';
            errorEl.style.display = 'block';
            return;
        }
        
        try {
            const result = await window.AuthModule.updateUserPassword(userId, newPass);
            if (result.success) {
                window.showToast(`✅ Contraseña actualizada para @${username}`, 'success', 4000);
                closeChangePasswordModal();
                if (document.getElementById('users-modal')) {
                    // Modal de usuarios sigue abierto
                } else {
                    setTimeout(() => showUsersModal(), 500);
                }
            } else {
                errorEl.textContent = '❌ ' + result.error;
                errorEl.style.display = 'block';
            }
        } catch (error) {
            errorEl.textContent = '❌ Error: ' + error.message;
            errorEl.style.display = 'block';
        }
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeChangePasswordModal();
    });
    
    window.closeChangePasswordModal = function() {
        const m = document.getElementById('change-password-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => { if (m.parentNode) m.remove(); }, 200);
            setTimeout(() => {
                const still = document.getElementById('change-password-modal');
                if (still && still.parentNode) still.remove();
            }, 500);
        }
    };
}

// ============================================================
// TOGGLE ADMIN
// ============================================================

async function handleToggleAdmin(userId, promoteToAdmin, username) {
    const existingConfirm = document.getElementById('custom-modal');
    if (existingConfirm) existingConfirm.remove();
    
    const action = promoteToAdmin ? 'promover a ADMIN' : 'quitar rol de ADMIN';
    const icon = promoteToAdmin ? '👑' : '👤';
    
    const confirm = await window.ModalModule.showConfirm({
        title: promoteToAdmin ? '👑 Promover a admin' : '👤 Quitar admin',
        message: `¿Seguro que quieres ${action} al usuario "@${username}"?\n\n${
            promoteToAdmin 
                ? '✅ Podrá gestionar usuarios y hacer copias completas.'
                : '⚠️ Perderá acceso a la gestión de usuarios y a copias completas.'
        }\n\n¿Continuar?`,
        confirmText: promoteToAdmin ? '👑 Sí, promover' : '👤 Sí, quitar admin',
        cancelText: '❌ Cancelar', icon: icon,
        confirmColor: promoteToAdmin ? '#f59e0b' : '#94a3b8'
    });
    
    if (!confirm) return;
    
    try {
        const result = await window.AuthModule.toggleUserAdmin(userId, promoteToAdmin);
        if (result.success) {
            window.showToast(promoteToAdmin 
                ? `✅ @${username} es ahora ADMIN` 
                : `✅ @${username} ya no es admin`, 'success', 4000);
            setTimeout(() => showUsersModal(), 500);
        } else {
            window.showToast('❌ ' + result.error, 'error', 5000);
            setTimeout(() => showUsersModal(), 500);
        }
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error', 5000);
        setTimeout(() => showUsersModal(), 500);
    }
}

// ============================================================
// ELIMINAR USUARIO
// ============================================================

async function deleteUser(userId, username) {
    const currentUser = window.AuthModule.getCurrentUser();
    if (userId === currentUser.id) {
        window.showToast('⚠️ No puedes eliminar tu propio usuario', 'warning');
        return;
    }
    
    closeUsersModal();
    await new Promise(r => setTimeout(r, 250));
    
    const confirm = await window.ModalModule.showConfirm({
        title: '🗑️ Eliminar usuario',
        message: `¿Eliminar al usuario "@${username}"?\n\n⚠️ El usuario perderá acceso a Panario inmediatamente.\n\n✅ Los datos que creó (ventas, pedidos, etc.) se mantienen.\n\n¿Continuar?`,
        confirmText: '🗑️ Sí, eliminar', cancelText: '❌ Cancelar',
        icon: '🗑️', confirmColor: '#ef4444'
    });
    
    if (!confirm) {
        setTimeout(() => showUsersModal(), 300);
        return;
    }
    
    try {
        const result = await window.AuthModule.deleteUserByAdmin(userId);
        if (result.success) {
            window.showToast(`✅ Usuario "@${username}" eliminado`, 'success', 3000);
            setTimeout(() => showUsersModal(), 800);
        } else {
            window.showToast('❌ ' + result.error, 'error', 5000);
            setTimeout(() => showUsersModal(), 500);
        }
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error', 5000);
        setTimeout(() => showUsersModal(), 500);
    }
}

// ============================================================
// REGENERAR CÓDIGO
// ============================================================

async function regenerarCodigoAction() {
    closeUsersModal();
    await new Promise(r => setTimeout(r, 250));
    
    const confirm = await window.ModalModule.showConfirm({
        title: '🔄 Regenerar código',
        message: `¿Regenerar el código de invitación?\n\n⚠️ El código actual dejará de funcionar inmediatamente.\nLos usuarios ya registrados NO se ven afectados.\n\n¿Continuar?`,
        confirmText: '🔄 Sí, regenerar', cancelText: '❌ Cancelar',
        icon: '🔄', confirmColor: '#f59e0b'
    });
    
    if (!confirm) {
        setTimeout(() => showUsersModal(), 300);
        return;
    }
    
    const negocioId = window.DBModule.getNegocioIdActual();
    const result = window.DBModule.regenerarCodigoInvitacion(negocioId);
    
    if (result.success) {
        window.showToast(`✅ Nuevo código: ${result.codigo}`, 'success', 5000);
        setTimeout(() => showUsersModal(), 500);
    } else {
        window.showToast('❌ Error al regenerar: ' + (result.error || 'Desconocido'), 'error', 5000);
        setTimeout(() => showUsersModal(), 500);
    }
}

// ============================================================
// SALVA DIFERENCIAL
// ============================================================

async function exportSalvaRecetasProductos() {
    if (typeof window.DBModule.exportRecetasProductosSalva !== 'function') {
        window.showToast('❌ Error: función de exportación no disponible. Recarga la página.', 'error', 6000);
        return;
    }
    
    let progress = null;
    try {
        progress = window.ModalModule.showProgressModal({
            title: 'Exportando salva', message: 'Preparando recetas y productos...', icon: '🧩'
        });
        
        progress.update('Recopilando datos...', 30);
        await new Promise(r => setTimeout(r, 300));
        progress.update('Empaquetando JSON...', 70);
        await new Promise(r => setTimeout(r, 300));
        
        const result = window.DBModule.exportRecetasProductosSalva();
        
        if (result && result.success) {
            const counts = result.counts || { recipes: 0, productos: 0 };
            progress.success(`Salva exportada: ${counts.recipes} recetas, ${counts.productos} productos`);
            window.showToast(`✅ Salva exportada (${result.sizeKB || 0} KB)`, 'success', 3000);
        } else {
            const errorMsg = (result && result.error) ? result.error : 'Error desconocido';
            progress.error(errorMsg);
            window.showToast('❌ Error al exportar salva: ' + errorMsg, 'error', 5000);
        }
    } catch (error) {
        if (progress) { try { progress.error(error.message); } catch (e) {} }
        window.showToast('❌ Error: ' + (error.message || 'Error desconocido'), 'error', 5000);
    } finally {
        setTimeout(() => {
            const stillThere = document.getElementById('progress-modal');
            if (stillThere) { try { window.ModalModule.closeProgressModal(); } catch (e) {} }
        }, 4000);
    }
}

async function importSalvaRecetasProductos() {
    if (typeof window.DBModule.importRecetasProductosSalva !== 'function') {
        window.showToast('❌ Error: función de importación no disponible. Recarga la página.', 'error', 6000);
        return;
    }
    if (typeof window.DBModule.readSalvaFile !== 'function') {
        window.showToast('❌ Error: función de lectura no disponible. Recarga la página.', 'error', 6000);
        return;
    }
    
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        
        input.onchange = async function(e) {
            const file = e.target.files[0];
            if (!file) { window.showToast('⚠️ No se seleccionó archivo', 'warning'); return; }
            
            try {
                const salvaData = await window.DBModule.readSalvaFile(file);
                
                if (!salvaData._meta || salvaData._meta.type !== 'salva_recetas_productos') {
                    await window.ModalModule.showAlert({
                        title: '❌ Archivo inválido',
                        message: 'El archivo no es una salva válida de recetas y productos.',
                        icon: '❌', type: 'error'
                    });
                    return;
                }
                
                const meta = salvaData._meta;
                const counts = meta.counts || {};
                const resumen = `
📅 Fecha: ${new Date(meta.exportDate).toLocaleString('es-ES')}
📖 Recetas: ${counts.recipes || 0}
🧾 Ingredientes: ${counts.recipeIngredients || 0}
🔗 Receta-Insumos: ${counts.recetaInsumos || 0}
🏷️ Productos: ${counts.productos || 0}
                `.trim();
                
                const modo = await window.ModalModule.showPrompt({
                    title: '📥 Importar salva',
                    message: `${resumen}\n\nElige el modo:\n• Escribe "fusionar" para añadir/actualizar\n• Escribe "reemplazar" para reemplazar todo`,
                    placeholder: 'fusionar o reemplazar',
                    defaultValue: 'fusionar', icon: '📥', inputType: 'text'
                });
                
                if (modo === null || modo === undefined) {
                    window.showToast('❌ Importación cancelada', 'info', 2000);
                    return;
                }
                
                const modoLimpio = String(modo).trim().toLowerCase();
                if (modoLimpio !== 'fusionar' && modoLimpio !== 'reemplazar') {
                    await window.ModalModule.showAlert({
                        title: '⚠️ Modo inválido',
                        message: 'Debes escribir "fusionar" o "reemplazar".',
                        icon: '⚠️', type: 'warning'
                    });
                    return;
                }
                
                const confirmMsg = modoLimpio === 'reemplazar'
                    ? `⚠️ ¿REEMPLAZAR todas las recetas y productos actuales?`
                    : `¿FUSIONAR las recetas y productos del archivo con los actuales?`;
                
                const confirm = await window.ModalModule.showConfirm({
                    title: modoLimpio === 'reemplazar' ? '⚠️ Reemplazar datos' : '📥 Fusionar datos',
                    message: confirmMsg,
                    confirmText: modoLimpio === 'reemplazar' ? '⚠️ SÍ, REEMPLAZAR' : '✅ SÍ, FUSIONAR',
                    cancelText: '❌ Cancelar', icon: modoLimpio === 'reemplazar' ? '⚠️' : '📥',
                    confirmColor: modoLimpio === 'reemplazar' ? '#ef4444' : '#10b981'
                });
                
                if (!confirm) { window.showToast('❌ Importación cancelada', 'info', 2000); return; }
                
                let progress = null;
                try {
                    progress = window.ModalModule.showProgressModal({
                        title: 'Importando salva', message: 'Iniciando importación...', icon: '⏳'
                    });
                    
                    await new Promise(r => setTimeout(r, 200));
                    progress.update('Validando archivo...', 10);
                    await new Promise(r => setTimeout(r, 200));
                    progress.update('Importando recetas...', 30);
                    await new Promise(r => setTimeout(r, 200));
                    progress.update('Importando ingredientes...', 50);
                    await new Promise(r => setTimeout(r, 200));
                    progress.update('Importando productos...', 70);
                    await new Promise(r => setTimeout(r, 200));
                    
                    const result = window.DBModule.importRecetasProductosSalva(salvaData, modoLimpio);
                    
                    progress.update('Finalizando...', 95);
                    await new Promise(r => setTimeout(r, 300));
                    
                    if (result && result.success) {
                        const imported = result.imported || {};
                        const skipped = result.skipped || {};
                        let msg = `${imported.recipes || 0} recetas, ${imported.productos || 0} productos`;
                        if ((skipped.recipes || 0) + (skipped.productos || 0) > 0) {
                            msg += ` (${(skipped.recipes || 0) + (skipped.productos || 0)} actualizados)`;
                        }
                        progress.success(`Importación completada: ${msg}`);
                        window.showToast('✅ Salva importada correctamente', 'success', 3000);
                        
                        setTimeout(() => {
                            if (typeof window.refreshCurrentView === 'function') {
                                window.refreshCurrentView();
                            } else if (typeof window.renderSettingsView === 'function') {
                                window.renderSettingsView();
                            }
                        }, 2000);
                    } else {
                        const errorMsg = (result && result.error) ? result.error : 'Error al importar';
                        progress.error(errorMsg);
                        window.showToast('❌ Error: ' + errorMsg, 'error', 5000);
                    }
                } catch (innerError) {
                    if (progress) { try { progress.error(innerError.message); } catch (e) {} }
                    try {
                        if (window.ModalModule && window.ModalModule.closeProgressModal) {
                            window.ModalModule.closeProgressModal();
                        }
                    } catch (e) {}
                    await window.ModalModule.showAlert({
                        title: '❌ Error al importar',
                        message: innerError.message || 'Error desconocido',
                        icon: '❌', type: 'error'
                    });
                } finally {
                    setTimeout(() => {
                        const stillThere = document.getElementById('progress-modal');
                        if (stillThere) { try { window.ModalModule.closeProgressModal(); } catch (e) {} }
                    }, 5000);
                }
            } catch (error) {
                try {
                    if (window.ModalModule && window.ModalModule.closeProgressModal) {
                        window.ModalModule.closeProgressModal();
                    }
                } catch (e) {}
                await window.ModalModule.showAlert({
                    title: '❌ Error al importar',
                    message: error.message || 'Error desconocido',
                    icon: '❌', type: 'error'
                });
            }
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// ACCIONES DE BACKUP
// ============================================================

async function exportDatabaseCompleteAction() {
    let progress = null;
    try {
        progress = window.ModalModule.showProgressModal({
            title: 'Exportando copia completa', message: 'Preparando copia de seguridad completa...', icon: '📦'
        });
        progress.update('Recopilando datos...', 30);
        await new Promise(r => setTimeout(r, 300));
        progress.update('Incluyendo usuarios y negocios...', 60);
        await new Promise(r => setTimeout(r, 300));
        progress.update('Generando archivo .db...', 90);
        await new Promise(r => setTimeout(r, 300));
        
        const result = window.DBModule.downloadDatabase('complete');
        
        if (result && result.success) {
            progress.success('Copia completa exportada correctamente');
            window.showToast('✅ Copia completa exportada', 'success', 3000);
        } else {
            const errorMsg = (result && result.error) ? result.error : 'No se pudo exportar';
            progress.error(errorMsg);
        }
    } catch (error) {
        if (progress) { try { progress.error(error.message); } catch (e) {} }
    } finally {
        setTimeout(() => {
            const stillThere = document.getElementById('progress-modal');
            if (stillThere) { try { window.ModalModule.closeProgressModal(); } catch (e) {} }
        }, 5000);
    }
}

async function exportDatabaseDataOnlyAction() {
    let progress = null;
    try {
        progress = window.ModalModule.showProgressModal({
            title: 'Exportando copia de datos', message: 'Preparando copia de datos operativos...', icon: '📊'
        });
        progress.update('Recopilando datos operativos...', 30);
        await new Promise(r => setTimeout(r, 300));
        progress.update('Excluyendo usuarios y negocios...', 60);
        await new Promise(r => setTimeout(r, 300));
        progress.update('Generando archivo .db...', 90);
        await new Promise(r => setTimeout(r, 300));
        
        const result = window.DBModule.downloadDatabase('data_only');
        
        if (result && result.success) {
            progress.success('Copia de datos exportada correctamente');
            window.showToast('✅ Copia de datos exportada', 'success', 3000);
        } else {
            const errorMsg = (result && result.error) ? result.error : 'No se pudo exportar';
            progress.error(errorMsg);
        }
    } catch (error) {
        if (progress) { try { progress.error(error.message); } catch (e) {} }
    } finally {
        setTimeout(() => {
            const stillThere = document.getElementById('progress-modal');
            if (stillThere) { try { window.ModalModule.closeProgressModal(); } catch (e) {} }
        }, 5000);
    }
}

async function importDatabaseSmartAction() {
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.db,.sqlite,.sqlite3';
        input.style.display = 'none';
        
        input.onchange = async function(e) {
            const file = e.target.files[0];
            if (!file) { window.showToast('⚠️ No se seleccionó archivo', 'warning'); return; }
            
            let backupType = 'unknown';
            let backupMeta = null;
            
            try {
                const arrayBuffer = await file.arrayBuffer();
                const dataArray = new Uint8Array(arrayBuffer);
                const SQL = await window.initSqlJs({ locateFile: file => `lib/${file}` });
                const tempDb = new SQL.Database(dataArray);
                
                const tableCheck = tempDb.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='_panario_meta'`);
                if (tableCheck.length > 0 && tableCheck[0].values.length > 0) {
                    const result = tempDb.exec(`SELECT * FROM _panario_meta LIMIT 1`);
                    if (result.length > 0 && result[0].values && result[0].values.length > 0) {
                        const columns = result[0].columns;
                        const values = result[0].values[0];
                        const meta = {};
                        columns.forEach((col, i) => { meta[col] = values[i]; });
                        backupMeta = meta;
                        backupType = meta.backup_type || 'unknown';
                    }
                }
                tempDb.close();
            } catch (error) {
                window.showToast('❌ Error al leer el archivo', 'error');
                return;
            }
            
            const user = window.AuthModule.getCurrentUser();
            const isAdmin = user && user.is_admin === 1;
            
            let infoMsg = `📄 Archivo: ${file.name}\n\n`;
            infoMsg += `🔖 Tipo detectado: ${
                backupType === 'complete' ? '📦 Copia COMPLETA' :
                backupType === 'data_only' ? '📊 Copia de DATOS' :
                '⚠️ Sin marca (antiguo)'
            }\n`;
            
            if (backupMeta) {
                infoMsg += `📅 Fecha: ${new Date(backupMeta.backup_date).toLocaleString('es-ES')}\n`;
                infoMsg += `🏢 Negocio: ${backupMeta.backup_negocio_nombre || 'Desconocido'}\n`;
                infoMsg += `👤 Creado por: ${backupMeta.backup_user || 'Desconocido'}\n`;
            }
            
            infoMsg += `\n`;
            
            let action = '';
            let confirmText = '';
            
            if (backupType === 'complete') {
                if (isAdmin) {
                    action = 'complete';
                    infoMsg += `⚠️ Esto reemplazará TODA la base de datos, incluyendo usuarios y negocios.\n\n¿Continuar?`;
                    confirmText = '⚠️ Sí, importar completa';
                } else {
                    infoMsg += `❌ Esta es una copia COMPLETA. Solo el administrador puede importarla.`;
                    confirmText = '📊 Importar como datos';
                    action = 'data_only';
                }
            } else if (backupType === 'data_only') {
                action = 'data_only';
                infoMsg += `✅ Esta copia conserva los usuarios y el código de invitación actuales.\n\n¿Continuar?`;
                confirmText = '📊 Sí, importar datos';
            } else {
                if (isAdmin) {
                    action = 'complete';
                    infoMsg += `⚠️ Copia sin marca. Se tratará como COMPLETA.\n\n¿Continuar?`;
                    confirmText = '⚠️ Sí, importar como completa';
                } else {
                    infoMsg += `❌ Copia sin marca. Solo el administrador puede importarla.`;
                    confirmText = '📊 Intentar como datos';
                    action = 'data_only';
                }
            }
            
            const confirm = await window.ModalModule.showConfirm({
                title: '📥 Importar copia de seguridad',
                message: infoMsg, confirmText, cancelText: '❌ Cancelar',
                icon: backupType === 'complete' ? '📦' : '📊',
                confirmColor: action === 'complete' ? '#ef4444' : '#10b981'
            });
            
            if (!confirm) { window.showToast('❌ Importación cancelada', 'info', 2000); return; }
            
            try {
                let result;
                if (action === 'complete') {
                    result = await window.DBModule.importDatabase(file);
                } else {
                    result = await window.DBModule.importDatabaseDataOnly(file);
                }
                
                if (result && result.success) {
                    if (action === 'complete') {
                        await window.ModalModule.showAlert({
                            title: '✅ Copia completa importada',
                            message: `Se restauraron TODOS los datos.\n\n🔄 La página se recargará.`,
                            icon: '✅', type: 'success'
                        });
                        window.showToast('✅ Copia completa importada. Recargando...', 'success', 3000);
                        setTimeout(() => {
                            const url = window.location.href.split('?')[0];
                            window.location.href = url + '?refresh=' + Date.now();
                            setTimeout(() => window.location.reload(true), 100);
                        }, 500);
                    } else {
                        const registros = result.registrosRestaurados || 0;
                        const tablas = result.tablasRestauradas || 0;
                        await window.ModalModule.showAlert({
                            title: '✅ Datos importados',
                            message: `Se restauraron ${tablas} tablas con ${registros} registros.\n\n✅ Usuarios conservados.\n🔄 La página se recargará.`,
                            icon: '✅', type: 'success'
                        });
                        setTimeout(() => {
                            const url = window.location.href.split('?')[0];
                            window.location.href = url + '?refresh=' + Date.now();
                            setTimeout(() => window.location.reload(true), 100);
                        }, 500);
                    }
                } else {
                    const errorMsg = (result && result.error) ? result.error : 'Error desconocido';
                    window.showToast('❌ Error: ' + errorMsg, 'error', 5000);
                }
            } catch (error) {
                window.showToast('❌ ' + (error.message || 'Error desconocido'), 'error', 5000);
            }
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

async function importDatabaseDataOnlyFromFileAction() {
    try {
        const result = await window.DBModule.importDatabaseDataOnlyFromFile();
        
        if (result && result.success) {
            const registros = result.registrosRestaurados || 0;
            const tablas = result.tablasRestauradas || 0;
            await window.ModalModule.showAlert({
                title: '✅ Importación exitosa',
                message: `Se restauraron ${tablas} tablas con ${registros} registros.\n\n✅ Usuarios conservados.\n🔄 La página se recargará.`,
                icon: '✅', type: 'success'
            });
            window.showToast(`✅ Datos importados: ${tablas} tablas, ${registros} registros`, 'success', 5000);
            setTimeout(() => {
                const url = window.location.href.split('?')[0];
                window.location.href = url + '?refresh=' + Date.now();
                setTimeout(() => window.location.reload(true), 100);
            }, 500);
        } else if (result && result.error && result.error !== 'Cancelado') {
            window.showToast('❌ ' + result.error, 'error', 5000);
        }
    } catch (error) {
        window.showToast('❌ ' + (error.message || 'Error desconocido'), 'error');
    }
}

// ============================================================
// 🆕 FASE 1.3.4: FUSIONAR BASES DE DATOS
// ============================================================

/**
 * Acción: fusionar la base de datos de un archivo .db con la actual.
 * Usa importDatabaseDataOnlyFromFile() de db.js (que ya implementa la fusión).
 */
async function importDatabaseFusionAction() {
    console.log('🔀 [importDatabaseFusionAction] Iniciando fusión...');
    
    // Verificar que la función existe en DBModule
    if (typeof window.DBModule.importDatabaseDataOnlyFromFile !== 'function') {
        window.showToast('❌ Error: función de fusión no disponible. Recarga la página.', 'error', 6000);
        console.error('❌ window.DBModule.importDatabaseDataOnlyFromFile no es una función');
        return;
    }
    
    try {
        // La propia función de db.js muestra el confirm con el mensaje adecuado
        const result = await window.DBModule.importDatabaseDataOnlyFromFile();
        
        if (!result) {
            window.showToast('❌ Resultado vacío de la fusión', 'error', 4000);
            return;
        }
        
        // Si el usuario canceló, no hacemos nada más
        if (result.success === false && result.error === 'Cancelado') {
            console.log('🔀 [Fusion] Cancelado por el usuario');
            return;
        }
        
        // Si hubo error
        if (!result.success) {
            window.showToast('❌ ' + (result.error || 'Error desconocido'), 'error', 6000);
            return;
        }
        
        // ✅ Fusión exitosa → mostrar resumen detallado
        console.log('🔀 [Fusion] Resultado:', result);
        
        const inserted = result.inserted || 0;
        const updated = result.updated || 0;
        const skipped = result.skipped || 0;
        const porTabla = result.porTabla || {};
        
        // Construir lista de tablas con cambios
        let tablaDetalle = '';
        const tablasConCambios = Object.entries(porTabla)
            .filter(([_, s]) => (s.inserted + s.updated) > 0)
            .sort((a, b) => (b[1].inserted + b[1].updated) - (a[1].inserted + a[1].updated));
        
        if (tablasConCambios.length > 0) {
            tablaDetalle = '\n\n📊 Detalle por tabla:\n' + tablasConCambios.map(([tabla, s]) => {
                let linea = `  • ${tabla}:`;
                if (s.inserted > 0) linea += ` +${s.inserted} nuevos`;
                if (s.updated > 0) linea += ` ~${s.updated} actualizados`;
                if (s.skipped > 0) linea += ` =${s.skipped} sin cambios`;
                return linea;
            }).join('\n');
        }
        
        // Resumen final
        let mensaje = `✅ Fusión completada correctamente.\n\n`;
        mensaje += `📥 Registros NUEVOS añadidos: ${inserted}\n`;
        mensaje += `🔄 Registros ACTUALIZADOS: ${updated}\n`;
        mensaje += `⏭️ Registros SIN cambios: ${skipped}\n`;
        mensaje += `📊 Total procesados: ${inserted + updated + skipped}`;
        
        if (tablaDetalle) {
            mensaje += tablaDetalle;
        }
        
        if (result.errores && result.errores.length > 0) {
            mensaje += `\n\n⚠️ Hubo ${result.errores.length} error(es) durante la fusión.`;
            console.warn('⚠️ Errores de fusión:', result.errores);
        }
        
        mensaje += `\n\n💡 Tus datos locales se han enriquecido con los del backup.`;
        mensaje += `\n📤 Si quieres compartir el resultado, exporta una nueva copia desde "Exportar copia de seguridad".`;
        
        await window.ModalModule.showAlert({
            title: '🔀 Fusión completada',
            message: mensaje,
            icon: '🔀',
            type: 'success',
            buttonText: '✅ Entendido'
        });
        
        window.showToast(`✅ Fusión completada: +${inserted} nuevos, ~${updated} actualizados`, 'success', 5000);
        
        // Refrescar la vista actual (por si acaso)
        setTimeout(() => {
            if (typeof window.refreshCurrentView === 'function') {
                window.refreshCurrentView();
            } else if (typeof window.renderSettingsView === 'function') {
                window.renderSettingsView();
            }
        }, 1500);
        
    } catch (error) {
        console.error('❌ [Fusion] Error:', error);
        window.showToast('❌ Error en fusión: ' + (error.message || 'Desconocido'), 'error', 6000);
    }
}

// ============================================================
// OLVIDAR ÚLTIMO USUARIO
// ============================================================

async function clearLastUserAction() {
    if (window.ModalModule && window.ModalModule.cerrarTodosLosModales) {
        window.ModalModule.cerrarTodosLosModales();
    }
    
    const confirm = await window.ModalModule.showConfirm({
        title: 'Olvidar usuario',
        message: '¿Seguro que quieres olvidar el último usuario guardado?',
        confirmText: 'Sí, olvidar', cancelText: 'Cancelar',
        icon: '🗑️', confirmColor: '#ef4444'
    });
    
    if (confirm) {
        window.AuthModule.clearLastUser();
        window.showToast('✅ Último usuario olvidado', 'success');
        renderSettingsView();
    }
}

// ============================================================
// LIMPIAR DATOS ELIMINADOS
// ============================================================

async function cleanDeletedData() {
    if (window.ModalModule && window.ModalModule.cerrarTodosLosModales) {
        window.ModalModule.cerrarTodosLosModales();
    }
    
    const confirm = await window.ModalModule.showConfirm({
        title: '🧹 Limpiar datos eliminados',
        message: '¿Eliminar permanentemente todos los registros marcados como eliminados?\n\n⚠️ No se puede deshacer.',
        confirmText: 'Sí, limpiar', cancelText: 'Cancelar',
        icon: '⚠️', confirmColor: '#ef4444'
    });
    
    if (!confirm) return;
    
    let progress = null;
    try {
        progress = window.ModalModule.showProgressModal({
            title: 'Limpiando datos', message: 'Eliminando registros...', icon: '🧹'
        });
        
        const tables = ['sales', 'transactions', 'orders', 'order_items', 'payments', 
            'recipes', 'recipe_ingredients', 'clients', 'products', 'dias_sin_ventas'];
        let deletedCount = 0;
        const totalTables = tables.length;
        
        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            const percent = Math.round(((i + 1) / totalTables) * 90);
            progress.update(`Limpiando ${table}...`, percent);
            
            const checkResult = window.DBModule.query(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
            if (checkResult.length === 0) continue;
            
            const columns = window.DBModule.query(`PRAGMA table_info(${table})`);
            const hasDeletedAt = columns.some(col => col.name === 'deleted_at');
            if (!hasDeletedAt) continue;
            
            const countResult = window.DBModule.query(`SELECT COUNT(*) as count FROM ${table} WHERE deleted_at IS NOT NULL`);
            const count = countResult[0]?.count || 0;
            
            if (count > 0) {
                window.DBModule.execute(`DELETE FROM ${table} WHERE deleted_at IS NOT NULL`);
                deletedCount += count;
            }
            await new Promise(r => setTimeout(r, 100));
        }
        
        progress.update('Guardando cambios...', 95);
        window.DBModule.saveDatabase();
        await new Promise(r => setTimeout(r, 200));
        
        progress.success(`${deletedCount} registros eliminados permanentemente`);
        window.showToast(`✅ ${deletedCount} registros eliminados`, 'success', 3000);
        setTimeout(() => renderSettingsView(), 2500);
        
    } catch (error) {
        if (progress) { try { progress.error(error.message); } catch (e) {} }
    } finally {
        setTimeout(() => {
            const stillThere = document.getElementById('progress-modal');
            if (stillThere) { try { window.ModalModule.closeProgressModal(); } catch (e) {} }
        }, 5000);
    }
}

// ============================================================
// REINICIAR BASE DE DATOS
// ============================================================

async function resetDatabaseWithPassword() {
    if (window.ModalModule && window.ModalModule.cerrarTodosLosModales) {
        window.ModalModule.cerrarTodosLosModales();
    }
    
    const password = await window.ModalModule.showPrompt({
        title: '🔒 Verificación',
        message: 'Escribe la contraseña de seguridad:',
        placeholder: 'Contraseña', icon: '🔒', inputType: 'password'
    });
    
    if (password === null || password === undefined) {
        window.showToast('❌ Operación cancelada', 'info', 2000);
        return;
    }
    
    if (String(password).trim() !== 'panario') {
        await window.ModalModule.showAlert({
            title: '❌ Contraseña incorrecta',
            message: 'La contraseña es: "panario"',
            icon: '❌', type: 'error'
        });
        return;
    }
    
    const confirm = await window.ModalModule.showConfirm({
        title: '⚠️ ¡ADVERTENCIA!',
        message: 'Se eliminarán TODOS los datos.\n✅ Se conservan usuarios.\n\n¿Seguro?',
        confirmText: '⚠️ SÍ, REINICIAR', cancelText: '❌ Cancelar',
        icon: '🚨', confirmColor: '#dc2626'
    });
    
    if (!confirm) return;
    
    let progress = null;
    try {
        progress = window.ModalModule.showProgressModal({
            title: 'Reiniciando base de datos', message: 'Eliminando todos los datos...', icon: '🚨'
        });
        
        const db = window.DBModule.getDB();
        const users = window.DBModule.query('SELECT * FROM users WHERE deleted_at IS NULL');
        const tables = ['inventory_movements', 'inventory', 'order_items', 'payments', 'orders',
            'recipe_ingredients', 'recipes', 'sales', 'transactions', 'clients', 'products',
            'notifications', 'units', 'corriente_config', 'dias_sin_ventas'];
        
        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            const percent = Math.round(((i + 1) / tables.length) * 80);
            progress.update(`Eliminando ${table}...`, percent);
            try { db.run(`DELETE FROM ${table}`); } catch (e) {}
            await new Promise(r => setTimeout(r, 80));
        }
        
        progress.update('Guardando cambios...', 90);
        window.DBModule.saveDatabase();
        await new Promise(r => setTimeout(r, 300));
        
        progress.success(`Base de datos reiniciada. ${users.length} usuario(s) conservado(s)`);
        window.showToast('✅ Base de datos reiniciada', 'success', 2000);
        setTimeout(() => window.location.reload(true), 3000);
        
    } catch (error) {
        if (progress) { try { progress.error(error.message); } catch (e) {} }
    } finally {
        setTimeout(() => {
            const stillThere = document.getElementById('progress-modal');
            if (stillThere) { try { window.ModalModule.closeProgressModal(); } catch (e) {} }
        }, 5000);
    }
}

// ============================================================
// ELIMINACIÓN POR ERROR
// ============================================================

async function showDeleteSelectorModal() {
    if (window.ModalModule && window.ModalModule.cerrarTodosLosModales) {
        window.ModalModule.cerrarTodosLosModales();
    }
    
    const existingModal = document.getElementById('delete-selector-modal');
    if (existingModal) existingModal.remove();

    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) {
        window.showToast('❌ No hay negocio activo', 'error');
        return;
    }

    try {
        const orders = window.DBModule.query(`
            SELECT id, client_name, total, status, delivery_date, created_at
            FROM orders WHERE negocio_id = ? AND deleted_at IS NULL
              AND status != 'delivered' AND status != 'cancelled'
            ORDER BY created_at DESC`, [negocioId]);

        const sales = window.DBModule.query(`
            SELECT id, product_name, total, payment_method, sale_date, created_at,
                   buyer, is_debt, paid, is_liberated, session
            FROM sales WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0
            ORDER BY created_at DESC`, [negocioId]);

        const modal = document.createElement('div');
        modal.id = 'delete-selector-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            z-index: 999999998; padding: 10px;
            animation: modalFadeIn 0.25s ease;
        `;

        const statusColors = { 'pending': '#f59e0b', 'confirmed': '#3b82f6', 'production': '#8b5cf6', 'ready': '#10b981' };
        const statusLabels = { 'pending': '⏳ Pendiente', 'confirmed': '✅ Confirmado', 'production': '🔨 Producción', 'ready': '📦 Listo' };
        const paymentIcons = { 'cash': '💵', 'transfer': '🏦', 'debt': '💳', 'other': '🔄' };

        function formatearFechaVenta(dateStr) {
            if (!dateStr) return '—';
            try {
                const date = new Date(dateStr.split('T')[0] + 'T00:00:00');
                const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
                const dia = String(date.getDate()).padStart(2, '0');
                const mes = String(date.getMonth() + 1).padStart(2, '0');
                return `${dia}/${mes} ${dias[date.getDay()]}`;
            } catch (e) { return dateStr; }
        }

        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 16px 18px; max-width: 100%; width: 100%; max-height: 95vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color); overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h2 style="margin: 0; color: #dc2626; font-size: 18px;">🚨 Eliminación por error</h2>
                    <button onclick="closeDeleteSelectorModal()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
                </div>
                
                <p style="font-size: 13px; color: var(--text-light); margin-bottom: 12px;">
                    Selecciona los pedidos y/o ventas para <strong style="color: #dc2626;">ELIMINAR PERMANENTEMENTE</strong>.
                    <br><span style="color: #dc2626;">⚠️ Esta acción NO se puede deshacer.</span>
                </p>

                <div style="display: flex; gap: 10px; flex-wrap: wrap; background: var(--bg); padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; border: 1px solid var(--border-color); font-size: 13px;">
                    <span>📋 Pedidos: <strong id="selected-orders-count">0</strong></span>
                    <span>💰 Ventas: <strong id="selected-sales-count">0</strong></span>
                    <span style="color: #dc2626;">🗑️ Total: <strong id="selected-total">0</strong></span>
                </div>

                <div style="display: flex; gap: 3px; border-bottom: 2px solid var(--border-color); margin-bottom: 10px;">
                    <button id="tab-delete-orders" onclick="switchDeleteTab('orders')" class="btn primary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0; background: var(--primary); color: #fff; border: none;">
                        📋 Pedidos (${orders.length})
                    </button>
                    <button id="tab-delete-sales" onclick="switchDeleteTab('sales')" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0; background: transparent; color: var(--text); border: none;">
                        💰 Ventas (${sales.length})
                    </button>
                </div>

                <div id="delete-orders-content" style="flex: 1; overflow-y: auto; max-height: 250px; padding-right: 4px;">
                    ${orders.length === 0 ? `<div style="text-align: center; padding: 20px; color: var(--text-light);">
                        <span style="font-size: 28px;">📭</span><p>No hay pedidos pendientes</p>
                    </div>` : `
                        <div style="display: flex; flex-direction: column; gap: 3px;">
                            ${orders.map(order => `
                                <div style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: var(--bg); border-radius: 4px; border-left: 3px solid ${statusColors[order.status] || '#94a3b8'}; font-size: 12px;">
                                    <input type="checkbox" class="delete-order-checkbox" data-id="${order.id}" style="width: 16px; height: 16px; cursor: pointer; accent-color: #dc2626;">
                                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                        <strong>#${order.id}</strong> ${order.client_name}
                                    </span>
                                    <span style="font-weight: 600;">$${parseFloat(order.total).toFixed(2)}</span>
                                    <span style="font-size: 10px; color: ${statusColors[order.status] || '#94a3b8'};">${statusLabels[order.status] || order.status}</span>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

                <div id="delete-sales-content" style="flex: 1; overflow-y: auto; max-height: 300px; padding-right: 4px; display: none;">
                    ${sales.length === 0 ? `<div style="text-align: center; padding: 20px; color: var(--text-light);">
                        <span style="font-size: 28px;">📭</span><p>No hay ventas para eliminar</p>
                    </div>` : `
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            ${sales.map(sale => {
                                const isDebt = sale.is_debt === 1 && sale.paid === 0;
                                const isLiberated = sale.is_liberated === 1;
                                const borderColor = isDebt ? '#ef4444' : (isLiberated ? '#8b5cf6' : '#10b981');
                                
                                let estadoBadge = '';
                                if (isDebt) estadoBadge = '<span style="font-size: 10px; background: #ef444420; color: #ef4444; padding: 1px 6px; border-radius: 8px; font-weight: 600;">💳 Deuda</span>';
                                else if (isLiberated) estadoBadge = '<span style="font-size: 10px; background: #8b5cf620; color: #8b5cf6; padding: 1px 6px; border-radius: 8px; font-weight: 600;">🚀 Liberada</span>';
                                else estadoBadge = '<span style="font-size: 10px; background: #10b98120; color: #10b981; padding: 1px 6px; border-radius: 8px; font-weight: 600;">✅ Pagada</span>';
                                
                                const cliente = sale.buyer && sale.buyer.trim() ? sale.buyer : (isLiberated ? 'Cliente ocasional' : 'Sin nombre');
                                
                                return `
                                    <div style="display: flex; align-items: flex-start; gap: 8px; padding: 6px 8px; background: var(--bg); border-radius: 4px; border-left: 3px solid ${borderColor}; font-size: 12px;">
                                        <input type="checkbox" class="delete-sale-checkbox" data-id="${sale.id}" style="width: 16px; height: 16px; cursor: pointer; accent-color: #dc2626; margin-top: 2px; flex-shrink: 0;">
                                        <div style="flex: 1; min-width: 0;">
                                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 2px;">
                                                <strong style="color: var(--text-light);">#${sale.id}</strong>
                                                <span style="font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;">
                                                    ${sale.product_name}
                                                </span>
                                                ${estadoBadge}
                                            </div>
                                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; color: var(--text-light); font-size: 11px;">
                                                <span>👤 ${cliente}</span>
                                                <span>📅 ${formatearFechaVenta(sale.sale_date)}</span>
                                            </div>
                                        </div>
                                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0;">
                                            <span style="font-weight: 700; color: var(--primary);">$${parseFloat(sale.total).toFixed(2)}</span>
                                            <span style="font-size: 14px;">${paymentIcons[sale.payment_method] || '💵'}</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>

                <div style="display: flex; gap: 6px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border-color); flex-wrap: wrap;">
                    <button onclick="selectAllDeleteItems()" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto;">✅ Todos</button>
                    <button onclick="deselectAllDeleteItems()" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto;">❌ Ninguno</button>
                    <button onclick="confirmDeleteSelected()" class="btn danger" style="padding: 6px 16px; font-size: 13px; width: auto; background: #dc2626; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; margin-left: auto;">
                        🗑️ ELIMINAR
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        window._deleteSelectedOrders = new Set();
        window._deleteSelectedSales = new Set();

        window.closeDeleteSelectorModal = function() {
            const m = document.getElementById('delete-selector-modal');
            if (m) {
                m.style.animation = 'modalFadeOut 0.2s ease forwards';
                setTimeout(() => { if (m.parentNode) m.remove(); }, 200);
                setTimeout(() => {
                    const still = document.getElementById('delete-selector-modal');
                    if (still && still.parentNode) still.remove();
                }, 500);
            }
        };

        window.switchDeleteTab = function(tab) {
            const ordersContent = document.getElementById('delete-orders-content');
            const salesContent = document.getElementById('delete-sales-content');
            const tabOrders = document.getElementById('tab-delete-orders');
            const tabSales = document.getElementById('tab-delete-sales');

            if (tab === 'orders') {
                ordersContent.style.display = 'block';
                salesContent.style.display = 'none';
                tabOrders.className = 'btn primary';
                tabOrders.style.background = 'var(--primary)';
                tabOrders.style.color = '#fff';
                tabSales.className = 'btn secondary';
                tabSales.style.background = 'transparent';
                tabSales.style.color = 'var(--text)';
            } else {
                ordersContent.style.display = 'none';
                salesContent.style.display = 'block';
                tabSales.className = 'btn primary';
                tabSales.style.background = '#10b981';
                tabSales.style.color = '#fff';
                tabOrders.className = 'btn secondary';
                tabOrders.style.background = 'transparent';
                tabOrders.style.color = 'var(--text)';
            }
        };

        document.querySelectorAll('.delete-order-checkbox').forEach(cb => {
            cb.addEventListener('change', function() {
                const id = parseInt(this.dataset.id);
                if (this.checked) window._deleteSelectedOrders.add(id);
                else window._deleteSelectedOrders.delete(id);
                updateDeleteSelectionCount();
            });
        });

        document.querySelectorAll('.delete-sale-checkbox').forEach(cb => {
            cb.addEventListener('change', function() {
                const id = parseInt(this.dataset.id);
                if (this.checked) window._deleteSelectedSales.add(id);
                else window._deleteSelectedSales.delete(id);
                updateDeleteSelectionCount();
            });
        });

        window.updateDeleteSelectionCount = function() {
            const orderCount = window._deleteSelectedOrders.size;
            const saleCount = window._deleteSelectedSales.size;
            document.getElementById('selected-orders-count').textContent = orderCount;
            document.getElementById('selected-sales-count').textContent = saleCount;
            document.getElementById('selected-total').textContent = orderCount + saleCount;
        };

        window.selectAllDeleteItems = function() {
            document.querySelectorAll('.delete-order-checkbox').forEach(cb => {
                cb.checked = true;
                window._deleteSelectedOrders.add(parseInt(cb.dataset.id));
            });
            document.querySelectorAll('.delete-sale-checkbox').forEach(cb => {
                cb.checked = true;
                window._deleteSelectedSales.add(parseInt(cb.dataset.id));
            });
            updateDeleteSelectionCount();
        };

        window.deselectAllDeleteItems = function() {
            document.querySelectorAll('.delete-order-checkbox').forEach(cb => { cb.checked = false; });
            document.querySelectorAll('.delete-sale-checkbox').forEach(cb => { cb.checked = false; });
            window._deleteSelectedOrders.clear();
            window._deleteSelectedSales.clear();
            updateDeleteSelectionCount();
        };

        window.confirmDeleteSelected = async function() {
            const orderIds = Array.from(window._deleteSelectedOrders);
            const saleIds = Array.from(window._deleteSelectedSales);

            if (orderIds.length === 0 && saleIds.length === 0) {
                window.showToast('⚠️ No has seleccionado nada', 'warning');
                return;
            }

            closeDeleteSelectorModal();
            await new Promise(r => setTimeout(r, 250));

            const confirm = await window.ModalModule.showConfirm({
                title: '⚠️ ¿Eliminar permanentemente?',
                message: `Eliminarás:\n\n📋 ${orderIds.length} pedido${orderIds.length !== 1 ? 's' : ''}\n💰 ${saleIds.length} venta${saleIds.length !== 1 ? 's' : ''}\n\n⚠️ NO se puede deshacer.`,
                confirmText: `🗑️ ELIMINAR`, cancelText: '❌ Cancelar',
                icon: '🚨', confirmColor: '#dc2626'
            });

            if (!confirm) {
                setTimeout(() => showDeleteSelectorModal(), 300);
                return;
            }

            try {
                window.showToast('⏳ Eliminando...', 'info', 2000);
                const db = window.DBModule.getDB();
                let deletedOrders = 0;
                let deletedSales = 0;

                for (const orderId of orderIds) {
                    const orderCheck = window.DBModule.query('SELECT id, status FROM orders WHERE id = ? AND deleted_at IS NULL', [orderId]);
                    if (orderCheck.length === 0) continue;
                    const order = orderCheck[0];
                    if (order.status === 'delivered' || order.status === 'cancelled') continue;
                    db.run('DELETE FROM order_items WHERE order_id = ?', [orderId]);
                    db.run('DELETE FROM payments WHERE order_id = ?', [orderId]);
                    db.run('DELETE FROM orders WHERE id = ?', [orderId]);
                    deletedOrders++;
                }

                for (const saleId of saleIds) {
                    const saleCheck = window.DBModule.query('SELECT id FROM sales WHERE id = ? AND deleted_at IS NULL', [saleId]);
                    if (saleCheck.length === 0) continue;
                    db.run('DELETE FROM transactions WHERE sale_id = ?', [saleId]);
                    db.run('DELETE FROM sales WHERE id = ?', [saleId]);
                    deletedSales++;
                }

                window.DBModule.saveDatabase();

                await window.ModalModule.showAlert({
                    title: '✅ Registros eliminados',
                    message: `📋 ${deletedOrders} pedidos\n💰 ${deletedSales} ventas`,
                    icon: '✅', type: 'success'
                });

                renderSettingsView();
            } catch (error) {
                window.showToast('❌ Error: ' + error.message, 'error');
                setTimeout(() => showDeleteSelectorModal(), 300);
            }
        };

        updateDeleteSelectionCount();

        modal.addEventListener('click', function(e) {
            if (e.target === this) closeDeleteSelectorModal();
        });

    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// EXPORTACIÓN
// ============================================================

window.renderSettingsView = renderSettingsView;
window.exportDatabaseAction = exportDatabaseCompleteAction;
window.importDatabaseAction = importDatabaseSmartAction;
window.clearLastUserAction = clearLastUserAction;
window.cleanDeletedData = cleanDeletedData;
window.resetDatabaseWithPassword = resetDatabaseWithPassword;
window.showDeleteSelectorModal = showDeleteSelectorModal;
window.showCorrienteModal = showCorrienteModal;
window.irAHoyCorriente = irAHoyCorriente;
window.showExpensesReportModal = showExpensesReportModal;
window.closeExpensesReportModal = closeExpensesReportModal;
window.generateExpensesReportFromForm = generateExpensesReportFromForm;
window.exportDatabaseCompleteAction = exportDatabaseCompleteAction;
window.exportDatabaseDataOnlyAction = exportDatabaseDataOnlyAction;
window.importDatabaseSmartAction = importDatabaseSmartAction;
window.importDatabaseDataOnlyFromFileAction = importDatabaseDataOnlyFromFileAction;
// 🆕 FASE 1.3.4
window.importDatabaseFusionAction = importDatabaseFusionAction;
window.exportSalvaRecetasProductos = exportSalvaRecetasProductos;
window.importSalvaRecetasProductos = importSalvaRecetasProductos;
window.showUsersModal = showUsersModal;
window.regenerarCodigoAction = regenerarCodigoAction;
window.deleteUser = deleteUser;
window.showCreateUserModal = showCreateUserModal;
window.showEditUserModal = showEditUserModal;
window.showChangePasswordModal = showChangePasswordModal;
window.handleToggleAdmin = handleToggleAdmin;
// 🆕 FASE 2.3
window.showWaitingListFromSettings = showWaitingListFromSettings;
window.reporteListaEsperaFromSettings = reporteListaEsperaFromSettings;
window.showGlobalCancelModal = showGlobalCancelModal;
window.closeGlobalCancelModal = closeGlobalCancelModal;
window.executeGlobalCancel = executeGlobalCancel;
// 🆕 FASE 6
window.getAppVersion = getAppVersion;

console.log('📦 UI Settings Module cargado correctamente v2.1.5 (FASE 6: versión dinámica desde meta)');