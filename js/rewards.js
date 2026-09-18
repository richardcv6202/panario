// ============================================================
// 📦 REWARDS MODULE - Panario (Sistema de Premios)
// FASE 12: Mejor cliente del mes y del año
// ============================================================

window.RewardsModule = {};

// ============================================================
// MODAL DE CONFIGURACIÓN DE PREMIOS
// ============================================================

/**
 * Muestra el modal de configuración de premios
 */
async function showRewardsConfigModal() {
    const existingModal = document.getElementById('rewards-config-modal');
    if (existingModal) existingModal.remove();
    
    const user = window.AuthModule.getCurrentUser();
    if (!user) {
        window.showToast('❌ No hay usuario autenticado', 'error');
        return;
    }
    
    const config = window.DBModule.getPremiosConfig();
    
    const modal = document.createElement('div');
    modal.id = 'rewards-config-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999999; padding: 15px;
        animation: modalFadeIn 0.25s ease;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 480px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            
            <!-- HEADER -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">🏆</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #f59e0b;">Sistema de Premios</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">Fideliza a tus mejores clientes</p>
                    </div>
                </div>
                <button onclick="closeRewardsConfigModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <!-- TOGGLE ACTIVO -->
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg); border-radius: 10px; border: 2px solid ${config.activo ? '#10b981' : 'var(--border-color)'}; margin-bottom: 16px;">
                <span style="font-size: 24px;">🎁</span>
                <div style="flex: 1;">
                    <div style="font-size: 14px; font-weight: 600;">Activar sistema de premios</div>
                    <div style="font-size: 11px; color: var(--text-light); margin-top: 2px;">
                        Muestra los premios en el Dashboard y notifica a los ganadores
                    </div>
                </div>
                <label style="position: relative; display: inline-block; width: 50px; height: 26px; cursor: pointer; flex-shrink: 0;">
                    <input type="checkbox" id="rewards-toggle-activo" 
                           ${config.activo ? 'checked' : ''}
                           onchange="toggleRewardsActive(this.checked)"
                           style="opacity: 0; width: 0; height: 0;">
                    <span id="rewards-toggle-slider" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; 
                          background-color: ${config.activo ? '#10b981' : '#94a3b8'}; 
                          border-radius: 26px; transition: 0.3s;">
                        <span id="rewards-toggle-circle" style="position: absolute; height: 18px; width: 18px; 
                              left: ${config.activo ? '28px' : '4px'}; bottom: 4px; 
                              background-color: white; border-radius: 50%; transition: 0.3s; 
                              box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
                    </span>
                </label>
            </div>
            
            <!-- PREMIO MENSUAL -->
            <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-label); margin-bottom: 6px;">
                    🥇 Premio mensual
                </label>
                <input type="text" id="rewards-premio-mensual" 
                       value="${config.premio_mensual || ''}"
                       placeholder="Ej: Media jaba de pan"
                       style="width: 100%; padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text); outline: none;">
                <small style="font-size: 11px; color: var(--text-light);">Se entrega al cliente que más compre durante el mes</small>
            </div>
            
            <!-- PREMIO ANUAL -->
            <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-label); margin-bottom: 6px;">
                    🏆 Premio anual
                </label>
                <input type="text" id="rewards-premio-anual" 
                       value="${config.premio_anual || ''}"
                       placeholder="Ej: Jaba completa de pan"
                       style="width: 100%; padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text); outline: none;">
                <small style="font-size: 11px; color: var(--text-light);">Se entrega al cliente que más compre durante el año</small>
            </div>
            
            <!-- VISTA PREVIA -->
            <div style="background: linear-gradient(135deg, #f59e0b15 0%, #f59e0b05 100%); border: 2px solid #f59e0b; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
                <div style="font-size: 12px; font-weight: 700; color: #f59e0b; margin-bottom: 10px;">
                    👁️ Vista previa de ganadores actuales
                </div>
                <div id="rewards-preview-ganadores">
                    <div style="text-align: center; padding: 10px; color: var(--text-light); font-size: 12px;">
                        Cargando...
                    </div>
                </div>
            </div>
            
            <!-- INFORMACIÓN -->
            <div style="background: #3b82f615; border-left: 3px solid #3b82f6; padding: 10px 12px; border-radius: 6px; margin-bottom: 16px; font-size: 12px; color: var(--text-light);">
                💡 <strong>¿Cómo funciona?</strong><br>
                • El <strong>ganador del mes</strong> se calcula automáticamente al inicio del siguiente mes.<br>
                • El <strong>ganador del año</strong> se calcula al finalizar el año.<br>
                • Solo se cuentan las ventas con cliente identificado (no liberadas).
            </div>
            
            <!-- BOTONES -->
            <div style="display: flex; gap: 8px;">
                <button onclick="saveRewardsConfigAction()" class="btn primary" style="flex: 1; background: #f59e0b; color: #fff; border: none; border-radius: 8px; padding: 12px; cursor: pointer; font-weight: 600; font-size: 14px;">
                    💾 Guardar
                </button>
                <button onclick="closeRewardsConfigModal()" class="btn secondary" style="flex: 1; padding: 12px; font-size: 14px;">
                    ❌ Cancelar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cargar vista previa
    setTimeout(() => {
        renderRewardsPreview();
    }, 100);
    
    // Funciones de cierre
    window.closeRewardsConfigModal = function() {
        const m = document.getElementById('rewards-config-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (m.parentNode) m.remove();
            }, 200);
        }
    };
    
    window.toggleRewardsActive = function(activo) {
        const slider = document.getElementById('rewards-toggle-slider');
        const circle = document.getElementById('rewards-toggle-circle');
        const container = document.getElementById('rewards-toggle-activo').parentElement.parentElement;
        
        if (slider && circle) {
            if (activo) {
                slider.style.backgroundColor = '#10b981';
                circle.style.left = '28px';
                if (container) container.style.borderColor = '#10b981';
            } else {
                slider.style.backgroundColor = '#94a3b8';
                circle.style.left = '4px';
                if (container) container.style.borderColor = 'var(--border-color)';
            }
        }
    };
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeRewardsConfigModal();
    });
    
    // Cerrar con Escape
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeRewardsConfigModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// ============================================================
// VISTA PREVIA DE GANADORES
// ============================================================

function renderRewardsPreview() {
    const container = document.getElementById('rewards-preview-ganadores');
    if (!container) return;
    
    try {
        const mejorMes = window.DBModule.calcularMejorClienteDelMes();
        const mejorAnio = window.DBModule.calcularMejorClienteDelAño();
        
        const renderGanador = (ganador, tipo) => {
            if (!ganador) {
                return `
                    <div style="background: var(--bg-card); padding: 10px 12px; border-radius: 8px; font-size: 12px; color: var(--text-light); text-align: center;">
                        Sin datos suficientes para el ${tipo}
                    </div>
                `;
            }
            return `
                <div style="background: var(--bg-card); padding: 10px 12px; border-radius: 8px; display: flex; align-items: center; gap: 10px; border-left: 3px solid #f59e0b;">
                    <span style="font-size: 22px;">${tipo === 'mes' ? '🥇' : '🏆'}</span>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${ganador.buyer}
                        </div>
                        <div style="font-size: 11px; color: var(--text-light);">
                            ${ganador.compras} compras · $${ganador.total_gastado.toFixed(2)}
                        </div>
                    </div>
                </div>
            `;
        };
        
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 6px;">
                ${renderGanador(mejorMes, 'mes')}
                ${renderGanador(mejorAnio, 'año')}
            </div>
        `;
    } catch (e) {
        console.warn('Error renderizando preview:', e);
        container.innerHTML = `
            <div style="text-align: center; padding: 10px; color: #ef4444; font-size: 12px;">
                ❌ Error al calcular ganadores
            </div>
        `;
    }
}

// ============================================================
// GUARDAR CONFIGURACIÓN
// ============================================================

async function saveRewardsConfigAction() {
    const activo = document.getElementById('rewards-toggle-activo').checked;
    const premioMensual = document.getElementById('rewards-premio-mensual').value.trim();
    const premioAnual = document.getElementById('rewards-premio-anual').value.trim();
    
    const config = {
        activo,
        premio_mensual: premioMensual,
        premio_anual: premioAnual
    };
    
    const result = window.DBModule.savePremiosConfig(config);
    
    if (result.success) {
        window.showToast('✅ Configuración de premios guardada', 'success');
        closeRewardsConfigModal();
        
        // Refrescar Dashboard si estamos en él
        setTimeout(() => {
            const currentSection = document.querySelector('.nav-item.active')?.dataset?.section;
            if (currentSection === 'dashboard' && typeof window.renderDashboardView === 'function') {
                window.renderDashboardView();
            }
        }, 300);
    } else {
        window.showToast('❌ Error: ' + result.error, 'error');
    }
}

// ============================================================
// TARJETA DE PREMIOS EN EL DASHBOARD
// ============================================================

/**
 * Renderiza la tarjeta de premios en el Dashboard
 */
function renderRewardsCard() {
    try {
        const config = window.DBModule.getPremiosConfig();
        
        if (!config || !config.activo) return '';
        
        const mejorMes = window.DBModule.calcularMejorClienteDelMes();
        const mejorAnio = window.DBModule.calcularMejorClienteDelAño();
        
        const renderGanador = (ganador, tipo, premio) => {
            if (!ganador) {
                return `
                    <div style="background: var(--bg); padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; margin-bottom: 4px;">${tipo === 'mes' ? '🥇' : '🏆'}</div>
                        <div style="font-size: 11px; color: var(--text-light);">
                            Sin datos para el ${tipo === 'mes' ? 'mes' : 'año'}
                        </div>
                    </div>
                `;
            }
            return `
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    <div style="font-size: 24px; text-align: center; margin-bottom: 4px;">${tipo === 'mes' ? '🥇' : '🏆'}</div>
                    <div style="font-size: 10px; color: var(--text-light); text-align: center; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">
                        Mejor cliente del ${tipo === 'mes' ? 'mes' : 'año'}
                    </div>
                    <div style="font-size: 14px; font-weight: 700; text-align: center; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${ganador.buyer}
                    </div>
                    <div style="font-size: 11px; color: var(--text-light); text-align: center; margin-bottom: 6px;">
                        ${ganador.compras} compras · $${ganador.total_gastado.toFixed(2)}
                    </div>
                    ${premio ? `
                        <div style="background: #f59e0b20; color: #f59e0b; padding: 4px 8px; border-radius: 8px; font-size: 11px; text-align: center; font-weight: 600;">
                            🎁 ${premio}
                        </div>
                    ` : ''}
                </div>
            `;
        };
        
        return `
            <div class="card" style="border-left: 4px solid #f59e0b;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <h3 style="margin: 0; font-size: 14px; color: #f59e0b;">🏆 Premios y Fidelización</h3>
                    <button onclick="showRewardsConfigModal()" class="btn secondary" style="padding: 4px 12px; font-size: 11px; width: auto;">
                        ⚙️ Configurar
                    </button>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    ${renderGanador(mejorMes, 'mes', config.premio_mensual)}
                    ${renderGanador(mejorAnio, 'año', config.premio_anual)}
                </div>
            </div>
        `;
    } catch (e) {
        console.warn('Error renderizando tarjeta de premios:', e);
        return '';
    }
}

// ============================================================
// NOTIFICACIÓN AUTOMÁTICA AL INICIO DEL MES
// ============================================================

/**
 * Verifica si el usuario debe recibir notificación de premio
 * (Se ejecuta al inicio del mes, días 1-5)
 */
async function checkRewardsNotification() {
    try {
        const config = window.DBModule.getPremiosConfig();
        if (!config || !config.activo) return;
        
        const user = window.AuthModule.getCurrentUser();
        if (!user) return;
        
        // Verificar si ya se mostró este mes
        const now = new Date();
        const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const keyNotificacion = `panario_rewards_notified_${user.id}_${mesActual}`;
        
        if (localStorage.getItem(keyNotificacion)) return;
        
        // Solo mostrar en los primeros 5 días del mes
        const dia = now.getDate();
        if (dia > 5) {
            localStorage.setItem(keyNotificacion, 'skipped');
            return;
        }
        
        // Calcular ganador del mes ANTERIOR
        const mesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const year = mesAnterior.getFullYear();
        const month = String(mesAnterior.getMonth() + 1).padStart(2, '0');
        const inicioMes = `${year}-${month}-01`;
        const ultimoDia = new Date(year, mesAnterior.getMonth() + 1, 0).getDate();
        const finMes = `${year}-${month}-${String(ultimoDia).padStart(2, '0')}`;
        
        const negocioId = window.DBModule.getNegocioIdActual();
        const results = window.DBModule.query(`
            SELECT buyer, COUNT(*) as compras, SUM(total) as total_gastado
            FROM sales
            WHERE negocio_id = ?
              AND deleted_at IS NULL
              AND voided = 0
              AND buyer IS NOT NULL
              AND buyer != ''
              AND buyer != 'Cliente sin nombre'
              AND buyer != 'Cliente ocasional'
              AND DATE(sale_date) >= DATE(?)
              AND DATE(sale_date) <= DATE(?)
            GROUP BY buyer
            ORDER BY total_gastado DESC
            LIMIT 1
        `, [negocioId, inicioMes, finMes]);
        
        if (results.length > 0) {
            const ganador = results[0];
            const mesNombre = mesAnterior.toLocaleDateString('es-ES', { month: 'long' });
            
            // Notificación persistente
            if (window.NotificationsModule) {
                window.NotificationsModule.addNotification(
                    `🏆 Ganador de ${mesNombre}: ${ganador.buyer} ($${ganador.total_gastado.toFixed(2)}) - Premio: ${config.premio_mensual || 'sin definir'}`,
                    'success',
                    15000
                );
            }
            
            // Toast inmediato
            window.showToast(
                `🏆 ¡Ganador de ${mesNombre}: ${ganador.buyer}! Entrégale: ${config.premio_mensual || 'el premio configurado'}`,
                'success',
                8000
            );
            
            localStorage.setItem(keyNotificacion, 'shown');
        } else {
            localStorage.setItem(keyNotificacion, 'no-data');
        }
        
    } catch (e) {
        console.warn('Error verificando notificación de premios:', e);
    }
}

// ============================================================
// FUNCIÓN AUXILIAR: CALCULAR GANADOR DE UN MES ESPECÍFICO
// ============================================================

/**
 * Calcula el ganador de un mes específico (útil para reportes)
 */
function calcularGanadorMesEspecifico(year, month) {
    const negocioId = window.DBModule.getNegocioIdActual();
    try {
        const monthStr = String(month).padStart(2, '0');
        const inicioMes = `${year}-${monthStr}-01`;
        const ultimoDia = new Date(year, month, 0).getDate();
        const finMes = `${year}-${monthStr}-${String(ultimoDia).padStart(2, '0')}`;
        
        const results = window.DBModule.query(`
            SELECT buyer, COUNT(*) as compras, SUM(total) as total_gastado
            FROM sales
            WHERE negocio_id = ?
              AND deleted_at IS NULL
              AND voided = 0
              AND buyer IS NOT NULL
              AND buyer != ''
              AND buyer != 'Cliente sin nombre'
              AND buyer != 'Cliente ocasional'
              AND DATE(sale_date) >= DATE(?)
              AND DATE(sale_date) <= DATE(?)
            GROUP BY buyer
            ORDER BY total_gastado DESC
            LIMIT 1
        `, [negocioId, inicioMes, finMes]);
        
        if (results.length === 0) return null;
        return {
            buyer: results[0].buyer,
            compras: results[0].compras,
            total_gastado: results[0].total_gastado,
            periodo: `${monthStr}/${year}`
        };
    } catch (e) {
        console.warn('Error calculando ganador de mes específico:', e);
        return null;
    }
}

// ============================================================
// FUNCIÓN AUXILIAR: TOP 5 CLIENTES DEL MES
// ============================================================

/**
 * Obtiene el Top 5 de clientes del mes actual
 */
function getTop5ClientesDelMes() {
    const negocioId = window.DBModule.getNegocioIdActual();
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const inicioMes = `${year}-${month}-01`;
        const ultimoDia = new Date(year, now.getMonth() + 1, 0).getDate();
        const finMes = `${year}-${month}-${String(ultimoDia).padStart(2, '0')}`;
        
        return window.DBModule.query(`
            SELECT buyer, COUNT(*) as compras, SUM(total) as total_gastado
            FROM sales
            WHERE negocio_id = ?
              AND deleted_at IS NULL
              AND voided = 0
              AND buyer IS NOT NULL
              AND buyer != ''
              AND buyer != 'Cliente sin nombre'
              AND buyer != 'Cliente ocasional'
              AND DATE(sale_date) >= DATE(?)
              AND DATE(sale_date) <= DATE(?)
            GROUP BY buyer
            ORDER BY total_gastado DESC
            LIMIT 5
        `, [negocioId, inicioMes, finMes]);
    } catch (e) {
        return [];
    }
}

// ============================================================
// EXPORTACIÓN
// ============================================================

window.RewardsModule = {
    showRewardsConfigModal,
    saveRewardsConfigAction,
    renderRewardsCard,
    renderRewardsPreview,
    checkRewardsNotification,
    calcularGanadorMesEspecifico,
    getTop5ClientesDelMes
};

// Exponer funciones globalmente
window.showRewardsConfigModal = showRewardsConfigModal;
window.saveRewardsConfigAction = saveRewardsConfigAction;
window.renderRewardsCard = renderRewardsCard;
window.renderRewardsPreview = renderRewardsPreview;
window.checkRewardsNotification = checkRewardsNotification;
window.calcularGanadorMesEspecifico = calcularGanadorMesEspecifico;
window.getTop5ClientesDelMes = getTop5ClientesDelMes;

console.log('📦 Rewards Module cargado correctamente (FASE 12)');