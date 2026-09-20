// ============================================================
// 📦 REWARDS MODULE - Panario (Sistema de Premios)
// FASE 12: Mejor cliente del mes y del año
// 🆕 FASE 3.4 (200926 v2):
//   - Colores tipo medalla (Oro/Plata/Bronce) en tarjetas
//   - Mejor cliente del mes → 🥇 ORO (#ffd700)
//   - Mejor cliente del año → 🥈 PLATA (#c0c0c0)
//   - Top 5 del mes → 🥇🥈🥉 + tonos suaves
//   - Tarjeta de premios rediseñada con bordes de color
//   - Modal de configuración con vista previa mejorada
//   - Efecto hover en tarjetas
// 🆕 FASE 4.2 (#15) (200926 v3):
//   - NUEVO: Selector de cálculo del premio anual en el modal:
//     * 🎄 Navidad (24 dic) → rango: 1 ene - 24 dic del año actual
//     * 🎉 Fin de año (31 dic) → rango: 1 ene - 31 dic del año actual
//     * 🚀 Inicio de año (default) → rango: 1 ene - 31 dic del año actual
//   - renderRewardsCard() usa calcularMejorClienteDelAñoConConfig()
//   - checkRewardsNotification() respeta la configuración
//   - Vista previa en vivo del ganador según el modo elegido
//   - Compatibilidad total con configs antiguas (sin premio_anual_calculo)
// ============================================================

window.RewardsModule = {};

// ============================================================
// 🆕 FASE 3.4: CONSTANTES DE COLORES TIPO MEDALLA
// ============================================================

const MEDAL_COLORS = {
    gold:   { main: '#ffd700', dark: '#d4a017', bg: '#ffd70020', label: '🥇' },
    silver: { main: '#c0c0c0', dark: '#a0a0a0', bg: '#c0c0c020', label: '🥈' },
    bronze: { main: '#cd7f32', dark: '#a05a1a', bg: '#cd7f3220', label: '🥉' },
    soft:   { main: '#8b5cf6', dark: '#7c3aed', bg: '#8b5cf620', label: '🏅' }
};

// 🆕 FASE 4.2: Etiquetas y descripciones de los modos de cálculo anual
const CALCULO_ANUAL_LABELS = {
    'navidad':     { icon: '🎄', label: 'Navidad (24 dic)',  desc: 'Cuenta hasta el 24 de diciembre' },
    'fin_anio':    { icon: '🎉', label: 'Fin de año (31 dic)', desc: 'Cuenta hasta el 31 de diciembre' },
    'inicio_anio': { icon: '🚀', label: 'Inicio de año',      desc: 'Año completo (1 ene - 31 dic)' }
};

/**
 * Devuelve el color de medalla según la posición (0-based)
 */
function getMedalColor(posicion) {
    if (posicion === 0) return MEDAL_COLORS.gold;
    if (posicion === 1) return MEDAL_COLORS.silver;
    if (posicion === 2) return MEDAL_COLORS.bronze;
    return MEDAL_COLORS.soft;
}

/**
 * Devuelve el ícono de medalla según la posición (0-based)
 */
function getMedalIcon(posicion) {
    if (posicion === 0) return '🥇';
    if (posicion === 1) return '🥈';
    if (posicion === 2) return '🥉';
    return '🏅';
}

// ============================================================
// MODAL DE CONFIGURACIÓN DE PREMIOS
// ============================================================

/**
 * Muestra el modal de configuración de premios
 * 🆕 FASE 4.2: incluye selector de cálculo del premio anual
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
    const calculoActual = config.premio_anual_calculo || 'inicio_anio';
    
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
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 520px; width: 100%; max-height: 95vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            
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
            
            <!-- PREMIO MENSUAL (ORO) -->
            <div style="margin-bottom: 12px; padding: 12px 14px; background: linear-gradient(135deg, #ffd70015 0%, #ffd70005 100%); border-radius: 10px; border-left: 4px solid #ffd700;">
                <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #d4a017; margin-bottom: 6px;">
                    <span style="font-size: 18px;">🥇</span> Premio mensual (ORO)
                </label>
                <input type="text" id="rewards-premio-mensual" 
                       value="${config.premio_mensual || ''}"
                       placeholder="Ej: Media jaba de pan"
                       style="width: 100%; padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text); outline: none;">
                <small style="font-size: 11px; color: var(--text-light); display: block; margin-top: 4px;">
                    Se entrega al cliente que más compre durante el mes
                </small>
            </div>
            
            <!-- PREMIO ANUAL (PLATA) -->
            <div style="margin-bottom: 12px; padding: 12px 14px; background: linear-gradient(135deg, #c0c0c015 0%, #c0c0c005 100%); border-radius: 10px; border-left: 4px solid #c0c0c0;">
                <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #808080; margin-bottom: 6px;">
                    <span style="font-size: 18px;">🥈</span> Premio anual (PLATA)
                </label>
                <input type="text" id="rewards-premio-anual" 
                       value="${config.premio_anual || ''}"
                       placeholder="Ej: Jaba completa de pan"
                       style="width: 100%; padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text); outline: none;">
                <small style="font-size: 11px; color: var(--text-light); display: block; margin-top: 4px;">
                    Se entrega al cliente que más compre durante el año
                </small>
            </div>
            
            <!-- 🆕 FASE 4.2 (#15): SELECTOR DE CÁLCULO DEL PREMIO ANUAL -->
            <div style="margin-bottom: 16px; padding: 12px 14px; background: linear-gradient(135deg, #8b5cf615 0%, #8b5cf605 100%); border-radius: 10px; border-left: 4px solid #8b5cf6;">
                <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #8b5cf6; margin-bottom: 8px;">
                    <span style="font-size: 18px;">⚙️</span> ¿Cuándo se calcula el premio anual?
                </label>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    ${Object.entries(CALCULO_ANUAL_LABELS).map(([key, data]) => `
                        <label class="rewards-calculo-option" data-calculo="${key}"
                               style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; 
                                      background: var(--bg-card); border-radius: 8px; 
                                      border: 2px solid ${calculoActual === key ? '#8b5cf6' : 'var(--border-color)'}; 
                                      cursor: pointer; transition: all 0.2s;">
                            <input type="radio" name="rewards-calculo-anual" value="${key}" 
                                   ${calculoActual === key ? 'checked' : ''}
                                   onchange="onCalculoAnualChange(this.value)"
                                   style="width: 16px; height: 16px; cursor: pointer; accent-color: #8b5cf6;">
                            <div style="flex: 1;">
                                <div style="font-size: 13px; font-weight: 600;">
                                    ${data.icon} ${data.label}
                                </div>
                                <div style="font-size: 11px; color: var(--text-light); margin-top: 2px;">
                                    ${data.desc}
                                </div>
                            </div>
                        </label>
                    `).join('')}
                </div>
                <small style="font-size: 11px; color: var(--text-light); display: block; margin-top: 6px;">
                    💡 Elige cuándo quieres que se cierre el año para entregar el premio anual
                </small>
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
                • El <strong>ganador del año</strong> se calcula según el modo elegido arriba.<br>
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
    
    // Guardar el modo actual en una variable global para la vista previa
    window._rewardsCalculoPreview = calculoActual;
    
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
            setTimeout(() => {
                const still = document.getElementById('rewards-config-modal');
                if (still && still.parentNode) still.remove();
            }, 500);
        }
        window._rewardsCalculoPreview = null;
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
    
    /**
     * 🆕 FASE 4.2: Cambio del modo de cálculo anual
     * Actualiza la vista previa en vivo
     */
    window.onCalculoAnualChange = function(modo) {
        window._rewardsCalculoPreview = modo;
        
        // Actualizar estilos visuales de las opciones
        document.querySelectorAll('.rewards-calculo-option').forEach(label => {
            const radio = label.querySelector('input[type="radio"]');
            if (radio && radio.value === modo) {
                label.style.borderColor = '#8b5cf6';
                label.style.background = 'var(--bg)';
            } else {
                label.style.borderColor = 'var(--border-color)';
                label.style.background = 'var(--bg-card)';
            }
        });
        
        // Refrescar vista previa
        renderRewardsPreview();
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
// 🆕 FASE 3.4 + FASE 4.2: VISTA PREVIA DE GANADORES
// ============================================================

function renderRewardsPreview() {
    const container = document.getElementById('rewards-preview-ganadores');
    if (!container) return;
    
    try {
        const mejorMes = window.DBModule.calcularMejorClienteDelMes();
        
        // 🆕 FASE 4.2: Usar el modo seleccionado (preview) o el guardado
        const modoCalculo = window._rewardsCalculoPreview || 'inicio_anio';
        const mejorAnio = window.DBModule.calcularMejorClienteDelAñoConConfig 
            ? window.DBModule.calcularMejorClienteDelAñoConConfig(modoCalculo)
            : window.DBModule.calcularMejorClienteDelAño();
        
        const modoLabel = CALCULO_ANUAL_LABELS[modoCalculo] || CALCULO_ANUAL_LABELS['inicio_anio'];
        
        const renderGanador = (ganador, tipo, medal, extraInfo = '') => {
            if (!ganador) {
                return `
                    <div style="background: var(--bg-card); padding: 10px 12px; border-radius: 8px; font-size: 12px; color: var(--text-light); text-align: center; border-left: 3px solid var(--border-color);">
                        Sin datos suficientes para el ${tipo}
                    </div>
                `;
            }
            
            return `
                <div style="background: var(--bg-card); padding: 10px 12px; border-radius: 8px; display: flex; align-items: center; gap: 10px; border-left: 3px solid ${medal.main};">
                    <span style="font-size: 22px;">${medal.label}</span>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${ganador.buyer}
                        </div>
                        <div style="font-size: 11px; color: var(--text-light);">
                            ${ganador.compras} compras · $${ganador.total_gastado.toFixed(2)}
                        </div>
                        ${extraInfo ? `<div style="font-size: 10px; color: #8b5cf6; margin-top: 2px;">${extraInfo}</div>` : ''}
                    </div>
                </div>
            `;
        };
        
        // 🆕 FASE 4.2: Añadir info del modo en la tarjeta anual
        const infoAnual = `${modoLabel.icon} ${modoLabel.label}`;
        
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 6px;">
                ${renderGanador(mejorMes, 'mes', MEDAL_COLORS.gold)}
                ${renderGanador(mejorAnio, 'año', MEDAL_COLORS.silver, infoAnual)}
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
    
    // 🆕 FASE 4.2: Leer el modo de cálculo anual seleccionado
    let calculoAnual = 'inicio_anio';
    const radioSeleccionado = document.querySelector('input[name="rewards-calculo-anual"]:checked');
    if (radioSeleccionado) {
        calculoAnual = radioSeleccionado.value;
    }
    
    // Validar modo
    const modosValidos = ['navidad', 'fin_anio', 'inicio_anio'];
    if (!modosValidos.includes(calculoAnual)) {
        calculoAnual = 'inicio_anio';
    }
    
    const config = {
        activo,
        premio_mensual: premioMensual,
        premio_anual: premioAnual,
        premio_anual_calculo: calculoAnual,
        premio_anual_fecha: null  // Reservado para futuro
    };
    
    const result = window.DBModule.savePremiosConfig(config);
    
    if (result.success) {
        const modoLabel = CALCULO_ANUAL_LABELS[calculoAnual] || CALCULO_ANUAL_LABELS['inicio_anio'];
        window.showToast(`✅ Configuración guardada · Cálculo anual: ${modoLabel.icon} ${modoLabel.label}`, 'success', 4000);
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
// 🆕 FASE 3.4 + FASE 4.2: TARJETA DE PREMIOS EN EL DASHBOARD
// CON COLORES TIPO MEDALLA Y CÁLCULO ANUAL CONFIGURABLE
// ============================================================

/**
 * Renderiza la tarjeta de premios en el Dashboard.
 * 
 * 🆕 FASE 3.4: 
 *   - Mejor cliente del mes → 🥇 ORO
 *   - Mejor cliente del año → 🥈 PLATA
 *   - Top 5 → 🥇🥈🥉 + tonos suaves
 * 
 * 🆕 FASE 4.2:
 *   - El ganador anual respeta premio_anual_calculo
 */
function renderRewardsCard() {
    try {
        const config = window.DBModule.getPremiosConfig();
        
        if (!config || !config.activo) return '';
        
        const mejorMes = window.DBModule.calcularMejorClienteDelMes();
        
        // 🆕 FASE 4.2: Usar la configuración guardada para calcular el ganador anual
        const modoCalculo = config.premio_anual_calculo || 'inicio_anio';
        const mejorAnio = window.DBModule.calcularMejorClienteDelAñoConConfig 
            ? window.DBModule.calcularMejorClienteDelAñoConConfig(modoCalculo)
            : window.DBModule.calcularMejorClienteDelAño();
        
        const modoLabel = CALCULO_ANUAL_LABELS[modoCalculo] || CALCULO_ANUAL_LABELS['inicio_anio'];
        
        // ============================================================
        // Render de ganador individual con color de medalla
        // ============================================================
        const renderGanador = (ganador, tipo, medal, premio, extraInfo = '') => {
            if (!ganador) {
                return `
                    <div style="background: var(--bg); padding: 12px; border-radius: 10px; text-align: center; border-left: 4px solid var(--border-color);">
                        <div style="font-size: 28px; margin-bottom: 4px; opacity: 0.5;">${medal.label}</div>
                        <div style="font-size: 11px; color: var(--text-light);">
                            Sin datos para el ${tipo === 'mes' ? 'mes' : 'año'}
                        </div>
                    </div>
                `;
            }
            
            return `
                <div style="background: linear-gradient(135deg, ${medal.bg} 0%, transparent 100%); padding: 12px; border-radius: 10px; border-left: 4px solid ${medal.main}; transition: transform 0.2s, box-shadow 0.2s;"
                     onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';"
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                    <div style="font-size: 28px; text-align: center; margin-bottom: 4px;">${medal.label}</div>
                    <div style="font-size: 10px; color: ${medal.dark}; text-align: center; text-transform: uppercase; font-weight: 700; margin-bottom: 6px; letter-spacing: 0.5px;">
                        Mejor del ${tipo === 'mes' ? 'mes' : 'año'}
                    </div>
                    <div style="font-size: 14px; font-weight: 700; text-align: center; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text);">
                        ${ganador.buyer}
                    </div>
                    <div style="font-size: 11px; color: var(--text-light); text-align: center; margin-bottom: 6px;">
                        ${ganador.compras} compras · $${ganador.total_gastado.toFixed(2)}
                    </div>
                    ${extraInfo ? `
                        <div style="font-size: 10px; color: #8b5cf6; text-align: center; margin-bottom: 6px; font-weight: 600;">
                            ${extraInfo}
                        </div>
                    ` : ''}
                    ${premio ? `
                        <div style="background: ${medal.main}25; color: ${medal.dark}; padding: 4px 8px; border-radius: 8px; font-size: 11px; text-align: center; font-weight: 700; border: 1px solid ${medal.main}50;">
                            🎁 ${premio}
                        </div>
                    ` : ''}
                </div>
            `;
        };
        
        // ============================================================
        // Render de Top 5 del mes
        // ============================================================
        let top5Html = '';
        try {
            const top5 = getTop5ClientesDelMes();
            if (top5 && top5.length > 0) {
                top5Html = `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border-color);">
                        <div style="font-size: 11px; font-weight: 700; color: var(--text-light); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                            🏅 Top 5 del mes
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            ${top5.map((cliente, i) => {
                                const medal = getMedalColor(i);
                                const icon = getMedalIcon(i);
                                return `
                                    <div style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: ${medal.bg}; border-radius: 6px; border-left: 3px solid ${medal.main};">
                                        <span style="font-size: 14px; flex-shrink: 0;">${icon}</span>
                                        <span style="flex: 1; font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text);">
                                            ${cliente.buyer}
                                        </span>
                                        <span style="font-size: 11px; color: var(--text-light); flex-shrink: 0;">
                                            ${cliente.compras} compras
                                        </span>
                                        <span style="font-size: 12px; font-weight: 700; color: ${medal.dark}; flex-shrink: 0; min-width: 60px; text-align: right;">
                                            $${cliente.total_gastado.toFixed(2)}
                                        </span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
        } catch (e) {
            console.warn('⚠️ Error renderizando Top 5:', e);
        }
        
        // ============================================================
        // Tarjeta completa
        // ============================================================
        const infoAnualCard = `${modoLabel.icon} ${modoLabel.label}`;
        
        return `
            <div class="card" style="border-left: 4px solid #f59e0b; background: linear-gradient(135deg, #f59e0b08 0%, transparent 100%);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <h3 style="margin: 0; font-size: 14px; color: #f59e0b; display: flex; align-items: center; gap: 6px;">
                        🏆 Premios y Fidelización
                    </h3>
                    <button onclick="showRewardsConfigModal()" class="btn secondary" style="padding: 4px 12px; font-size: 11px; width: auto;">
                        ⚙️ Configurar
                    </button>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    ${renderGanador(mejorMes, 'mes', MEDAL_COLORS.gold, config.premio_mensual)}
                    ${renderGanador(mejorAnio, 'año', MEDAL_COLORS.silver, config.premio_anual, infoAnualCard)}
                </div>
                ${top5Html}
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
 * 
 * 🆕 FASE 4.2: La parte del premio anual respeta la configuración
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
                    `🥇 Ganador de ${mesNombre}: ${ganador.buyer} ($${ganador.total_gastado.toFixed(2)}) - Premio: ${config.premio_mensual || 'sin definir'}`,
                    'success',
                    15000
                );
            }
            
            // Toast inmediato
            window.showToast(
                `🥇 ¡Ganador de ${mesNombre}: ${ganador.buyer}! Entrégale: ${config.premio_mensual || 'el premio configurado'}`,
                'success',
                8000
            );
            
            localStorage.setItem(keyNotificacion, 'shown');
        } else {
            localStorage.setItem(keyNotificacion, 'no-data');
        }
        
        // 🆕 FASE 4.2: Notificación del premio anual si estamos en enero (días 1-5)
        // Y si el modo de cálculo es 'inicio_anio' o 'fin_anio'
        const modoCalculo = config.premio_anual_calculo || 'inicio_anio';
        
        if (now.getMonth() === 0 && dia <= 5 && modoCalculo !== 'navidad') {
            // Enero días 1-5 → notificar ganador del año anterior
            const yearAnterior = now.getFullYear() - 1;
            const ganadorAnual = window.DBModule.calcularMejorClienteDelAñoConConfig 
                ? window.DBModule.calcularMejorClienteDelAñoConConfig(modoCalculo, yearAnterior)
                : window.DBModule.calcularMejorClienteDelAño();
            
            if (ganadorAnual) {
                const keyAnual = `panario_rewards_anual_notified_${user.id}_${yearAnterior}`;
                if (!localStorage.getItem(keyAnual)) {
                    if (window.NotificationsModule) {
                        window.NotificationsModule.addNotification(
                            `🥈 Ganador del año ${yearAnterior}: ${ganadorAnual.buyer} ($${ganadorAnual.total_gastado.toFixed(2)}) - Premio: ${config.premio_anual || 'sin definir'}`,
                            'success',
                            15000
                        );
                    }
                    localStorage.setItem(keyAnual, 'shown');
                }
            }
        }
        
        // 🆕 FASE 4.2: Notificación del premio anual si es Navidad (días 25-31 de diciembre)
        if (modoCalculo === 'navidad' && now.getMonth() === 11 && dia >= 25) {
            const ganadorNavidad = window.DBModule.calcularMejorClienteDelAñoConConfig 
                ? window.DBModule.calcularMejorClienteDelAñoConConfig('navidad', now.getFullYear())
                : null;
            
            if (ganadorNavidad) {
                const keyNavidad = `panario_rewards_navidad_notified_${user.id}_${now.getFullYear()}`;
                if (!localStorage.getItem(keyNavidad)) {
                    if (window.NotificationsModule) {
                        window.NotificationsModule.addNotification(
                            `🎄 Ganador del año (Navidad): ${ganadorNavidad.buyer} ($${ganadorNavidad.total_gastado.toFixed(2)}) - Premio: ${config.premio_anual || 'sin definir'}`,
                            'success',
                            15000
                        );
                    }
                    window.showToast(
                        `🎄 ¡Ganador del año (Navidad): ${ganadorNavidad.buyer}!`,
                        'success',
                        8000
                    );
                    localStorage.setItem(keyNavidad, 'shown');
                }
            }
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
    getTop5ClientesDelMes,
    // 🆕 FASE 3.4: Helpers de medalla
    getMedalColor,
    getMedalIcon,
    MEDAL_COLORS,
    // 🆕 FASE 4.2: Constantes de cálculo anual
    CALCULO_ANUAL_LABELS
};

// Exponer funciones globalmente
window.showRewardsConfigModal = showRewardsConfigModal;
window.saveRewardsConfigAction = saveRewardsConfigAction;
window.renderRewardsCard = renderRewardsCard;
window.renderRewardsPreview = renderRewardsPreview;
window.checkRewardsNotification = checkRewardsNotification;
window.calcularGanadorMesEspecifico = calcularGanadorMesEspecifico;
window.getTop5ClientesDelMes = getTop5ClientesDelMes;
window.getMedalColor = getMedalColor;
window.getMedalIcon = getMedalIcon;

console.log('📦 Rewards Module cargado correctamente v2.1.1 (FASE 4.2: cálculo anual configurable)');