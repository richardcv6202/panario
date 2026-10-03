// ============================================================
// 📦 REWARDS MODULE - Panario (Sistema de Premios)
// FASE 12: Mejor cliente del mes y del año
// 🆕 FASE 3.4 (200926 v2):
//   - Colores tipo medalla (Oro/Plata/Bronce) en tarjetas
// 🆕 FASE 4.2 (#15) (200926 v3):
//   - NUEVO: Selector de cálculo del premio anual en el modal
// 🆕 v2.2.0 (011026 v4): 🎯 CORRECCIÓN N1 - HISTORIAL DE PREMIOS OTORGADOS
// 🆕 v2.3.0 (011026 v5): 🎯 CORRECCIÓN N2 - NUEVOS REQUISITOS DE PREMIOS
// 🆕 v2.4.0 (011026 v6): 🎯 CORRECCIONES N1-bis y N2-bis (011026)
//   - ✅ N1-bis: Excluir clientes con deuda de premios
//     * _getSQLExclusionDeudores() helper
//     * renderRewardsPreview() → 2 consultas
//     * calcularGanadorMesEspecifico() → 1 consulta
//     * getTop5ClientesDelMes() → 1 consulta
//     * checkRewardsNotification() → 2 consultas
//   - ✅ N2-bis: Interruptor para premios que no requieren entrega
//     * Nuevo toggle "premio_requiere_entrega" en el modal
//     * showPremioOtorgadoFormModal() respeta la config
//     * savePremioOtorgadoAction() fuerza entregado=1 si no requiere
//     * NO se incluye en premios_config (es un flag de UI en localStorage)
// ============================================================

window.RewardsModule = {};

// ============================================================
// 🆕 v2.4.0: HELPER DE EXCLUSIÓN DE DEUDORES (N1-bis)
// ============================================================

/**
 * Devuelve el fragmento SQL para excluir clientes con deuda pendiente.
 * Mismo helper que en db.js v2.6.0.
 * 
 * @param {number} negocioId - ID del negocio
 * @returns {string} Fragmento SQL para añadir a un WHERE (comienza con " AND ")
 */
function _getSQLExclusionDeudores(negocioId) {
    if (!negocioId) return '';
    const negocioIdSafe = parseInt(negocioId) || 0;
    return ` AND buyer NOT IN (
        SELECT DISTINCT buyer FROM sales 
        WHERE negocio_id = ${negocioIdSafe} 
          AND is_debt = 1 
          AND paid = 0 
          AND deleted_at IS NULL 
          AND voided = 0
          AND buyer IS NOT NULL 
          AND buyer != ''
    )`;
}

// ============================================================
// 🆕 v2.4.0: CONSTANTE PARA "PREMIO REQUIERE ENTREGA" (N2-bis)
// ============================================================

const PREMIO_REQUIERE_ENTREGA_KEY = 'panario_premio_requiere_entrega';

function getPremioRequiereEntrega() {
    try {
        const stored = localStorage.getItem(PREMIO_REQUIERE_ENTREGA_KEY);
        if (stored === null) return true; // default: sí requiere entrega
        return stored === 'true';
    } catch (e) {
        return true;
    }
}

function setPremioRequiereEntrega(value) {
    try {
        localStorage.setItem(PREMIO_REQUIERE_ENTREGA_KEY, value ? 'true' : 'false');
    } catch (e) {
        console.warn('⚠️ Error guardando preferencia de premio_requiere_entrega:', e);
    }
}

// ============================================================
// 🆕 FASE 3.4: CONSTANTES DE COLORES TIPO MEDALLA
// ============================================================

const MEDAL_COLORS = {
    gold:   { main: '#ffd700', dark: '#d4a017', bg: '#ffd70020', label: '🥇' },
    silver: { main: '#c0c0c0', dark: '#a0a0a0', bg: '#c0c0c020', label: '🥈' },
    bronze: { main: '#cd7f32', dark: '#a05a1a', bg: '#cd7f3220', label: '🥉' },
    soft:   { main: '#8b5cf6', dark: '#7c3aed', bg: '#8b5cf620', label: '🏅' },
    trophy: { main: '#f59e0b', dark: '#d97706', bg: '#f59e0b20', label: '🏆' }
};

const CALCULO_ANUAL_LABELS = {
    'navidad':     { icon: '🎄', label: 'Navidad (24 dic)',  desc: 'Cuenta hasta el 24 de diciembre' },
    'fin_anio':    { icon: '🎉', label: 'Fin de año (31 dic)', desc: 'Cuenta hasta el 31 de diciembre' },
    'inicio_anio': { icon: '🚀', label: 'Inicio de año',      desc: 'Año completo (1 ene - 31 dic)' }
};

const TIPOS_PREMIO = {
    'mensual':  { label: 'Mensual',  icon: '📅' },
    'anual':    { label: 'Anual',    icon: '🗓️' },
    'especial': { label: 'Especial', icon: '⭐' }
};

const CATEGORIAS_PREMIO = {
    'mejor_cliente':  { label: 'Mejor Cliente',  icon: '🥇' },
    'mas_frecuente':  { label: 'Más Frecuente',  icon: '🥈' },
    'anual':          { label: 'Anual',          icon: '🏆' },
    'otro':           { label: 'Otro',           icon: '🎁' }
};

function getMedalColor(posicion) {
    if (posicion === 0) return MEDAL_COLORS.gold;
    if (posicion === 1) return MEDAL_COLORS.silver;
    if (posicion === 2) return MEDAL_COLORS.bronze;
    return MEDAL_COLORS.soft;
}

function getMedalIcon(posicion) {
    if (posicion === 0) return '🥇';
    if (posicion === 1) return '🥈';
    if (posicion === 2) return '🥉';
    return '🏅';
}

// ============================================================
// MODAL DE CONFIGURACIÓN DE PREMIOS
// 🆕 v2.3.0: Ampliado con N2 (dos categorías + exclusión + anual por victorias)
// 🆕 v2.4.0: Añadido toggle "premio_requiere_entrega" (N2-bis)
// ============================================================

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
    const requiereEntrega = getPremioRequiereEntrega();  // 🆕 N2-bis
    
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
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 600px; width: 100%; max-height: 95vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            
            <!-- HEADER -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">🏆</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #f59e0b;">Sistema de Premios</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">Configura las 2 categorías y el premio anual</p>
                    </div>
                </div>
                <button onclick="closeRewardsConfigModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <!-- TOGGLE GENERAL ACTIVO -->
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
            
            <!-- 🆕 N2-bis: TOGGLE PREMIO REQUIERE ENTREGA -->
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: linear-gradient(135deg, #06b6d415 0%, #06b6d405 100%); border-radius: 10px; border-left: 4px solid #06b6d4; margin-bottom: 16px;">
                <span style="font-size: 22px;">📦</span>
                <div style="flex: 1;">
                    <div style="font-size: 13px; font-weight: 600;">El premio requiere entrega física</div>
                    <div style="font-size: 11px; color: var(--text-light); margin-top: 2px;">
                        Si está <strong>ACTIVO</strong>: los premios quedan pendientes hasta que los entregues.<br>
                        Si está <strong>INACTIVO</strong>: los premios se marcan como entregados automáticamente (útil para estímulos morales o reconocimientos verbales).
                    </div>
                </div>
                <label style="position: relative; display: inline-block; width: 50px; height: 26px; cursor: pointer; flex-shrink: 0;">
                    <input type="checkbox" id="rewards-toggle-requiere-entrega" 
                           ${requiereEntrega ? 'checked' : ''}
                           onchange="togglePremioRequiereEntrega(this.checked)"
                           style="opacity: 0; width: 0; height: 0;">
                    <span id="rewards-toggle-requiere-entrega-slider" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; 
                          background-color: ${requiereEntrega ? '#06b6d4' : '#94a3b8'}; 
                          border-radius: 26px; transition: 0.3s;">
                        <span id="rewards-toggle-requiere-entrega-circle" style="position: absolute; height: 18px; width: 18px; 
                              left: ${requiereEntrega ? '28px' : '4px'}; bottom: 4px; 
                              background-color: white; border-radius: 50%; transition: 0.3s; 
                              box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
                    </span>
                </label>
            </div>
            
            <!-- ═══════════════════════════════════════════════════ -->
            <!-- 🆕 N2: CATEGORÍA 1 - MEJOR CLIENTE (ORO) -->
            <!-- ═══════════════════════════════════════════════════ -->
            <div style="margin-bottom: 12px; padding: 12px 14px; background: linear-gradient(135deg, #ffd70015 0%, #ffd70005 100%); border-radius: 10px; border-left: 4px solid #ffd700;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">🥇</span>
                        <div>
                            <div style="font-size: 14px; font-weight: 700; color: #d4a017;">Mejor Cliente</div>
                            <div style="font-size: 11px; color: var(--text-light);">Mayor gasto del mes</div>
                        </div>
                    </div>
                    <label style="position: relative; display: inline-block; width: 44px; height: 24px; cursor: pointer; flex-shrink: 0;">
                        <input type="checkbox" id="rewards-activo-mejor-cliente" 
                               ${config.activo_mejor_cliente ? 'checked' : ''}
                               style="opacity: 0; width: 0; height: 0;">
                        <span id="rewards-toggle-mejor-cliente" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; 
                              background-color: ${config.activo_mejor_cliente ? '#10b981' : '#94a3b8'}; 
                              border-radius: 24px; transition: 0.3s;">
                            <span style="position: absolute; height: 16px; width: 16px; 
                                  left: ${config.activo_mejor_cliente ? '24px' : '4px'}; bottom: 4px; 
                                  background-color: white; border-radius: 50%; transition: 0.3s;"></span>
                        </span>
                    </label>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                    <div>
                        <label style="font-size: 11px; font-weight: 600; color: var(--text); display: block; margin-bottom: 3px;">
                            📊 Mínimo de compras
                        </label>
                        <input type="number" id="rewards-min-mejor-cliente" 
                               value="${config.min_compras_mejor_cliente || 4}"
                               min="1" step="1"
                               style="width: 100%; padding: 8px 10px; border: 2px solid var(--border-color); border-radius: 6px; font-size: 13px; background: var(--bg-input); color: var(--text); outline: none;">
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 600; color: var(--text); display: block; margin-bottom: 3px;">
                            💰 Valor del premio
                        </label>
                        <input type="number" id="rewards-valor-mejor-cliente" 
                               value="${config.premio_mejor_cliente_valor || 0}"
                               min="0" step="0.01"
                               style="width: 100%; padding: 8px 10px; border: 2px solid var(--border-color); border-radius: 6px; font-size: 13px; background: var(--bg-input); color: var(--text); outline: none;">
                    </div>
                </div>
                
                <div>
                    <label style="font-size: 11px; font-weight: 600; color: var(--text); display: block; margin-bottom: 3px;">
                        🎁 Descripción del premio
                    </label>
                    <input type="text" id="rewards-texto-mejor-cliente" 
                           value="${config.premio_mejor_cliente_texto || ''}"
                           placeholder="Ej: Media jaba de pan"
                           style="width: 100%; padding: 8px 10px; border: 2px solid var(--border-color); border-radius: 6px; font-size: 13px; background: var(--bg-input); color: var(--text); outline: none;">
                </div>
            </div>
            
            <!-- ═══════════════════════════════════════════════════ -->
            <!-- 🆕 N2: CATEGORÍA 2 - MÁS FRECUENTE (PLATA) -->
            <!-- ═══════════════════════════════════════════════════ -->
            <div style="margin-bottom: 12px; padding: 12px 14px; background: linear-gradient(135deg, #c0c0c015 0%, #c0c0c005 100%); border-radius: 10px; border-left: 4px solid #c0c0c0;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">🥈</span>
                        <div>
                            <div style="font-size: 14px; font-weight: 700; color: #808080;">Más Frecuente</div>
                            <div style="font-size: 11px; color: var(--text-light);">Más compras del mes</div>
                        </div>
                    </div>
                    <label style="position: relative; display: inline-block; width: 44px; height: 24px; cursor: pointer; flex-shrink: 0;">
                        <input type="checkbox" id="rewards-activo-mas-frecuente" 
                               ${config.activo_mas_frecuente ? 'checked' : ''}
                               style="opacity: 0; width: 0; height: 0;">
                        <span id="rewards-toggle-mas-frecuente" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; 
                              background-color: ${config.activo_mas_frecuente ? '#10b981' : '#94a3b8'}; 
                              border-radius: 24px; transition: 0.3s;">
                            <span style="position: absolute; height: 16px; width: 16px; 
                                  left: ${config.activo_mas_frecuente ? '24px' : '4px'}; bottom: 4px; 
                                  background-color: white; border-radius: 50%; transition: 0.3s;"></span>
                        </span>
                    </label>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                    <div>
                        <label style="font-size: 11px; font-weight: 600; color: var(--text); display: block; margin-bottom: 3px;">
                            📊 Mínimo de compras
                        </label>
                        <input type="number" id="rewards-min-mas-frecuente" 
                               value="${config.min_compras_mas_frecuente || 6}"
                               min="1" step="1"
                               style="width: 100%; padding: 8px 10px; border: 2px solid var(--border-color); border-radius: 6px; font-size: 13px; background: var(--bg-input); color: var(--text); outline: none;">
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 600; color: var(--text); display: block; margin-bottom: 3px;">
                            💰 Valor del premio
                        </label>
                        <input type="number" id="rewards-valor-mas-frecuente" 
                               value="${config.premio_mas_frecuente_valor || 0}"
                               min="0" step="0.01"
                               style="width: 100%; padding: 8px 10px; border: 2px solid var(--border-color); border-radius: 6px; font-size: 13px; background: var(--bg-input); color: var(--text); outline: none;">
                    </div>
                </div>
                
                <div>
                    <label style="font-size: 11px; font-weight: 600; color: var(--text); display: block; margin-bottom: 3px;">
                        🎁 Descripción del premio
                    </label>
                    <input type="text" id="rewards-texto-mas-frecuente" 
                           value="${config.premio_mas_frecuente_texto || ''}"
                           placeholder="Ej: 1 pan gratis"
                           style="width: 100%; padding: 8px 10px; border: 2px solid var(--border-color); border-radius: 6px; font-size: 13px; background: var(--bg-input); color: var(--text); outline: none;">
                </div>
            </div>
            
            <!-- 🆕 N2: EXCLUSIÓN DEL GANADOR ANTERIOR -->
            <div style="margin-bottom: 12px; padding: 12px 14px; background: linear-gradient(135deg, #8b5cf615 0%, #8b5cf605 100%); border-radius: 10px; border-left: 4px solid #8b5cf6;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 22px;">🔄</span>
                    <div style="flex: 1;">
                        <div style="font-size: 13px; font-weight: 600;">Excluir ganador del mes anterior</div>
                        <div style="font-size: 11px; color: var(--text-light); margin-top: 2px;">
                            Si un cliente ya ganó "Más Frecuente" el mes pasado, no puede volver a ganar ese premio este mes (evita monopolio)
                        </div>
                    </div>
                    <label style="position: relative; display: inline-block; width: 44px; height: 24px; cursor: pointer; flex-shrink: 0;">
                        <input type="checkbox" id="rewards-excluir-anterior" 
                               ${config.excluir_ganador_anterior ? 'checked' : ''}
                               style="opacity: 0; width: 0; height: 0;">
                        <span id="rewards-toggle-excluir" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; 
                              background-color: ${config.excluir_ganador_anterior ? '#8b5cf6' : '#94a3b8'}; 
                              border-radius: 24px; transition: 0.3s;">
                            <span style="position: absolute; height: 16px; width: 16px; 
                                  left: ${config.excluir_ganador_anterior ? '24px' : '4px'}; bottom: 4px; 
                                  background-color: white; border-radius: 50%; transition: 0.3s;"></span>
                        </span>
                    </label>
                </div>
            </div>
            
            <!-- ═══════════════════════════════════════════════════ -->
            <!-- 🏆 PREMIO ANUAL (por victorias) -->
            <!-- ═══════════════════════════════════════════════════ -->
            <div style="margin-bottom: 12px; padding: 12px 14px; background: linear-gradient(135deg, #f59e0b15 0%, #f59e0b05 100%); border-radius: 10px; border-left: 4px solid #f59e0b;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                    <span style="font-size: 20px;">🏆</span>
                    <div>
                        <div style="font-size: 14px; font-weight: 700; color: #d97706;">Premio Anual</div>
                        <div style="font-size: 11px; color: var(--text-light);">
                            Al que <strong>más veces ganó</strong> durante el año (desempate por mayor gasto)
                        </div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                    <div>
                        <label style="font-size: 11px; font-weight: 600; color: var(--text); display: block; margin-bottom: 3px;">
                            💰 Valor del premio anual
                        </label>
                        <input type="number" id="rewards-valor-anual" 
                               value="${config.premio_anual_valor || 0}"
                               min="0" step="0.01"
                               style="width: 100%; padding: 8px 10px; border: 2px solid var(--border-color); border-radius: 6px; font-size: 13px; background: var(--bg-input); color: var(--text); outline: none;">
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 600; color: var(--text); display: block; margin-bottom: 3px;">
                            ⚙️ Cálculo del premio anual
                        </label>
                        <select id="rewards-calculo-anual" style="width: 100%; padding: 8px 10px; border: 2px solid var(--border-color); border-radius: 6px; font-size: 13px; background: var(--bg-input); color: var(--text); outline: none;">
                            ${Object.entries(CALCULO_ANUAL_LABELS).map(([key, data]) => `
                                <option value="${key}" ${calculoActual === key ? 'selected' : ''}>${data.icon} ${data.label}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                
                <div>
                    <label style="font-size: 11px; font-weight: 600; color: var(--text); display: block; margin-bottom: 3px;">
                        🎁 Descripción del premio anual
                    </label>
                    <input type="text" id="rewards-texto-anual" 
                           value="${config.premio_anual_texto || config.premio_anual || ''}"
                           placeholder="Ej: Jaba completa de pan"
                           style="width: 100%; padding: 8px 10px; border: 2px solid var(--border-color); border-radius: 6px; font-size: 13px; background: var(--bg-input); color: var(--text); outline: none;">
                </div>
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
                • Los ganadores del mes se calculan automáticamente al inicio del siguiente mes.<br>
                • El ganador anual se calcula al cierre del año según el modo elegido.<br>
                • Solo se cuentan las ventas con cliente identificado (no liberadas).<br>
                • <strong>Los clientes con deuda pendiente quedan excluidos automáticamente.</strong>
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
    
    window._rewardsCalculoPreview = calculoActual;
    
    setTimeout(() => {
        renderRewardsPreview();
    }, 100);
    
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
        const circle = slider?.querySelector('span');
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
    
    // 🆕 N2-bis: Toggle "premio requiere entrega"
    window.togglePremioRequiereEntrega = function(requiere) {
        const slider = document.getElementById('rewards-toggle-requiere-entrega-slider');
        const circle = document.getElementById('rewards-toggle-requiere-entrega-circle');
        
        if (slider && circle) {
            if (requiere) {
                slider.style.backgroundColor = '#06b6d4';
                circle.style.left = '28px';
            } else {
                slider.style.backgroundColor = '#94a3b8';
                circle.style.left = '4px';
            }
        }
        setPremioRequiereEntrega(requiere);
    };
    
    window.onCalculoAnualChange = function(modo) {
        window._rewardsCalculoPreview = modo;
        renderRewardsPreview();
    };
    
    const selectCalculo = document.getElementById('rewards-calculo-anual');
    if (selectCalculo) {
        selectCalculo.addEventListener('change', function() {
            window._rewardsCalculoPreview = this.value;
            renderRewardsPreview();
        });
    }
    
    const setupToggle = (inputId, toggleId, color = '#10b981') => {
        const input = document.getElementById(inputId);
        const toggle = document.getElementById(toggleId);
        if (!input || !toggle) return;
        
        const circle = toggle.querySelector('span');
        
        const updateVisual = () => {
            if (input.checked) {
                toggle.style.backgroundColor = color;
                if (circle) circle.style.left = '24px';
            } else {
                toggle.style.backgroundColor = '#94a3b8';
                if (circle) circle.style.left = '4px';
            }
        };
        
        input.addEventListener('change', updateVisual);
        updateVisual();
    };
    
    setupToggle('rewards-activo-mejor-cliente', 'rewards-toggle-mejor-cliente', '#10b981');
    setupToggle('rewards-activo-mas-frecuente', 'rewards-toggle-mas-frecuente', '#10b981');
    setupToggle('rewards-excluir-anterior', 'rewards-toggle-excluir', '#8b5cf6');
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeRewardsConfigModal();
    });
    
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeRewardsConfigModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// ============================================================
// 🆕 v2.3.0 + v2.4.0: VISTA PREVIA DE GANADORES (N2 + N1-bis)
// ============================================================

function renderRewardsPreview() {
    const container = document.getElementById('rewards-preview-ganadores');
    if (!container) return;
    
    try {
        const activoMejorCliente = document.getElementById('rewards-activo-mejor-cliente')?.checked !== false;
        const activoMasFrecuente = document.getElementById('rewards-activo-mas-frecuente')?.checked !== false;
        const excluirAnterior = document.getElementById('rewards-excluir-anterior')?.checked !== false;
        const minMejorCliente = parseInt(document.getElementById('rewards-min-mejor-cliente')?.value) || 4;
        const minMasFrecuente = parseInt(document.getElementById('rewards-min-mas-frecuente')?.value) || 6;
        const modoCalculo = document.getElementById('rewards-calculo-anual')?.value || window._rewardsCalculoPreview || 'inicio_anio';
        
        const configPreview = {
            ...window.DBModule.getPremiosConfig(),
            activo: true,
            activo_mejor_cliente: activoMejorCliente,
            activo_mas_frecuente: activoMasFrecuente,
            min_compras_mejor_cliente: minMejorCliente,
            min_compras_mas_frecuente: minMasFrecuente,
            excluir_ganador_anterior: excluirAnterior
        };
        
        const negocioId = window.DBModule.getNegocioIdActual();
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const inicioMes = `${year}-${month}-01`;
        const ultimoDia = new Date(year, now.getMonth() + 1, 0).getDate();
        const finMes = `${year}-${month}-${String(ultimoDia).padStart(2, '0')}`;
        
        // 🆕 N1-bis: Exclusión de deudores
        const exclusion = _getSQLExclusionDeudores(negocioId);
        
        let mejorCliente = null;
        let masFrecuente = null;
        
        if (activoMejorCliente) {
            const r = window.DBModule.query(`SELECT buyer, COUNT(*) as compras, SUM(total) as total_gastado
                FROM sales WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0
                  AND buyer IS NOT NULL AND buyer != '' AND buyer != 'Cliente sin nombre' AND buyer != 'Cliente ocasional'
                  AND DATE(sale_date) >= DATE(?) AND DATE(sale_date) <= DATE(?)
                  ${exclusion}
                GROUP BY buyer HAVING COUNT(*) >= ? ORDER BY total_gastado DESC LIMIT 1`,
                [negocioId, inicioMes, finMes, minMejorCliente]);
            if (r.length > 0) mejorCliente = r[0];
        }
        
        if (activoMasFrecuente) {
            const r = window.DBModule.query(`SELECT buyer, COUNT(*) as compras, SUM(total) as total_gastado
                FROM sales WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0
                  AND buyer IS NOT NULL AND buyer != '' AND buyer != 'Cliente sin nombre' AND buyer != 'Cliente ocasional'
                  AND DATE(sale_date) >= DATE(?) AND DATE(sale_date) <= DATE(?)
                  ${exclusion}
                GROUP BY buyer HAVING COUNT(*) >= ? ORDER BY compras DESC, total_gastado DESC LIMIT 1`,
                [negocioId, inicioMes, finMes, minMasFrecuente]);
            if (r.length > 0) masFrecuente = r[0];
        }
        
        const anioParaAnual = now.getMonth() === 0 ? year - 1 : year;
        const ganadorAnual = window.DBModule.calcularGanadorAnualPorVictorias 
            ? window.DBModule.calcularGanadorAnualPorVictorias(anioParaAnual)
            : null;
        
        const renderGanador = (ganador, tipo, medal, extraInfo = '') => {
            if (!ganador) {
                return `
                    <div style="background: var(--bg-card); padding: 8px 10px; border-radius: 8px; font-size: 11px; color: var(--text-light); text-align: center; border-left: 3px solid var(--border-color);">
                        Sin datos para ${tipo}
                    </div>
                `;
            }
            
            const compras = ganador.compras || 0;
            const total = parseFloat(ganador.total_gastado) || 0;
            
            return `
                <div style="background: var(--bg-card); padding: 8px 10px; border-radius: 8px; display: flex; align-items: center; gap: 8px; border-left: 3px solid ${medal.main};">
                    <span style="font-size: 20px;">${medal.label}</span>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${ganador.buyer}
                        </div>
                        <div style="font-size: 10px; color: var(--text-light);">
                            ${compras} compras · $${total.toFixed(2)}
                        </div>
                        ${extraInfo ? `<div style="font-size: 9px; color: #8b5cf6; margin-top: 2px;">${extraInfo}</div>` : ''}
                    </div>
                </div>
            `;
        };
        
        const modoLabel = CALCULO_ANUAL_LABELS[modoCalculo] || CALCULO_ANUAL_LABELS['inicio_anio'];
        
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 5px;">
                ${activoMejorCliente ? renderGanador(mejorCliente, 'Mejor Cliente', MEDAL_COLORS.gold, `Mín: ${minMejorCliente} compras`) : ''}
                ${activoMasFrecuente ? renderGanador(masFrecuente, 'Más Frecuente', MEDAL_COLORS.silver, `Mín: ${minMasFrecuente} compras`) : ''}
                ${ganadorAnual ? renderGanador(ganadorAnual, 'Premio Anual', MEDAL_COLORS.trophy, `${modoLabel.icon} ${ganadorAnual.victorias} victorias`) : ''}
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
// 🆕 v2.3.0: Guarda TODOS los campos N2
// 🆕 v2.4.0: El toggle "premio_requiere_entrega" se guarda en localStorage
// ============================================================

async function saveRewardsConfigAction() {
    try {
        const activo = document.getElementById('rewards-toggle-activo')?.checked || false;
        const activoMejorCliente = document.getElementById('rewards-activo-mejor-cliente')?.checked !== false;
        const activoMasFrecuente = document.getElementById('rewards-activo-mas-frecuente')?.checked !== false;
        const excluirAnterior = document.getElementById('rewards-excluir-anterior')?.checked !== false;
        
        const minMejorCliente = parseInt(document.getElementById('rewards-min-mejor-cliente')?.value) || 4;
        const minMasFrecuente = parseInt(document.getElementById('rewards-min-mas-frecuente')?.value) || 6;
        
        const valorMejorCliente = parseFloat(document.getElementById('rewards-valor-mejor-cliente')?.value) || 0;
        const valorMasFrecuente = parseFloat(document.getElementById('rewards-valor-mas-frecuente')?.value) || 0;
        const valorAnual = parseFloat(document.getElementById('rewards-valor-anual')?.value) || 0;
        
        const textoMejorCliente = document.getElementById('rewards-texto-mejor-cliente')?.value.trim() || '';
        const textoMasFrecuente = document.getElementById('rewards-texto-mas-frecuente')?.value.trim() || '';
        const textoAnual = document.getElementById('rewards-texto-anual')?.value.trim() || '';
        
        const calculoAnual = document.getElementById('rewards-calculo-anual')?.value || 'inicio_anio';
        
        // 🆕 N2-bis: Ya está guardado en localStorage por togglePremioRequiereEntrega()
        // Pero por seguridad, lo volvemos a guardar
        const requiereEntrega = document.getElementById('rewards-toggle-requiere-entrega')?.checked !== false;
        setPremioRequiereEntrega(requiereEntrega);
        
        if (minMejorCliente < 1) {
            window.showToast('❌ El mínimo de compras de Mejor Cliente debe ser al menos 1', 'error');
            return;
        }
        if (minMasFrecuente < 1) {
            window.showToast('❌ El mínimo de compras de Más Frecuente debe ser al menos 1', 'error');
            return;
        }
        
        if (activo && !activoMejorCliente && !activoMasFrecuente) {
            window.showToast('❌ Debes activar al menos una categoría (Mejor Cliente o Más Frecuente)', 'error');
            return;
        }
        
        const modosValidos = ['navidad', 'fin_anio', 'inicio_anio'];
        const calculoFinal = modosValidos.includes(calculoAnual) ? calculoAnual : 'inicio_anio';
        
        const config = {
            activo,
            activo_mejor_cliente: activoMejorCliente,
            activo_mas_frecuente: activoMasFrecuente,
            min_compras_mejor_cliente: minMejorCliente,
            min_compras_mas_frecuente: minMasFrecuente,
            premio_mejor_cliente_texto: textoMejorCliente,
            premio_mejor_cliente_valor: valorMejorCliente,
            premio_mas_frecuente_texto: textoMasFrecuente,
            premio_mas_frecuente_valor: valorMasFrecuente,
            premio_anual_texto: textoAnual,
            premio_anual_valor: valorAnual,
            excluir_ganador_anterior: excluirAnterior,
            premio_anual_calculo: calculoFinal,
            premio_anual_fecha: null,
            premio_mensual: textoMejorCliente || '',
            premio_anual: textoAnual || ''
        };
        
        const result = window.DBModule.savePremiosConfig(config);
        
        if (result.success) {
            window.showToast('✅ Configuración de premios guardada', 'success', 3500);
            closeRewardsConfigModal();
            
            setTimeout(() => {
                const currentSection = document.querySelector('.nav-item.active')?.dataset?.section;
                if (currentSection === 'dashboard' && typeof window.renderDashboardView === 'function') {
                    window.renderDashboardView();
                }
            }, 300);
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
    } catch (e) {
        console.error('Error guardando configuración de premios:', e);
        window.showToast('❌ Error inesperado: ' + e.message, 'error');
    }
}

// ============================================================
// 🆕 v2.2.0: CORRECCIÓN N1 - HISTORIAL DE PREMIOS OTORGADOS
// 🆕 v2.4.0: showPremioOtorgadoFormModal() respeta premio_requiere_entrega
// ============================================================

function showHistorialPremiosModal() {
    const existingModal = document.getElementById('historial-premios-modal');
    if (existingModal) existingModal.remove();
    
    const user = window.AuthModule.getCurrentUser();
    if (!user) {
        window.showToast('❌ No hay usuario autenticado', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'historial-premios-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999999; padding: 15px;
        animation: modalFadeIn 0.25s ease;
    `;
    
    const anioActual = new Date().getFullYear();
    const aniosDisponibles = [];
    for (let a = anioActual; a >= anioActual - 5; a--) {
        aniosDisponibles.push(a);
    }
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 20px; max-width: 900px; width: 100%; max-height: 95vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            
            <!-- HEADER -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color); flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">📜</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #8b5cf6;">Historial de Premios Otorgados</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">Registro de todos los premios entregados</p>
                    </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button onclick="showPremioOtorgadoFormModal()" class="btn primary" style="background: #10b981; color: #fff; border: none; border-radius: 8px; padding: 8px 14px; cursor: pointer; font-weight: 600; font-size: 13px; white-space: nowrap;">
                        ➕ Registrar premio
                    </button>
                    <button onclick="closeHistorialPremiosModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
                </div>
            </div>
            
            <!-- FILTROS -->
            <div style="background: var(--bg); border-radius: 10px; padding: 12px; margin-bottom: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px;">
                <div>
                    <label style="font-size: 11px; color: var(--text-light); display: block; margin-bottom: 4px;">Año</label>
                    <select id="filtro-historial-anio" onchange="renderHistorialPremios()" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 13px;">
                        <option value="">Todos</option>
                        ${aniosDisponibles.map(a => `<option value="${a}">${a}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size: 11px; color: var(--text-light); display: block; margin-bottom: 4px;">Tipo</label>
                    <select id="filtro-historial-tipo" onchange="renderHistorialPremios()" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 13px;">
                        <option value="">Todos</option>
                        ${Object.entries(TIPOS_PREMIO).map(([key, data]) => `<option value="${key}">${data.icon} ${data.label}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size: 11px; color: var(--text-light); display: block; margin-bottom: 4px;">Categoría</label>
                    <select id="filtro-historial-categoria" onchange="renderHistorialPremios()" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 13px;">
                        <option value="">Todas</option>
                        ${Object.entries(CATEGORIAS_PREMIO).map(([key, data]) => `<option value="${key}">${data.icon} ${data.label}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size: 11px; color: var(--text-light); display: block; margin-bottom: 4px;">Cliente</label>
                    <input type="text" id="filtro-historial-cliente" oninput="renderHistorialPremios()" placeholder="Buscar..." style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 13px;">
                </div>
                <div>
                    <label style="font-size: 11px; color: var(--text-light); display: block; margin-bottom: 4px;">Estado</label>
                    <select id="filtro-historial-entregado" onchange="renderHistorialPremios()" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 13px;">
                        <option value="">Todos</option>
                        <option value="1">✅ Entregados</option>
                        <option value="0">⏳ Pendientes</option>
                    </select>
                </div>
            </div>
            
            <!-- LISTADO -->
            <div id="historial-premios-listado">
                <div style="text-align: center; padding: 20px; color: var(--text-light); font-size: 13px;">
                    Cargando...
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    window.closeHistorialPremiosModal = function() {
        const m = document.getElementById('historial-premios-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (m.parentNode) m.remove();
            }, 200);
            setTimeout(() => {
                const still = document.getElementById('historial-premios-modal');
                if (still && still.parentNode) still.remove();
            }, 500);
        }
    };
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeHistorialPremiosModal();
    });
    
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeHistorialPremiosModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    setTimeout(() => {
        renderHistorialPremios();
    }, 100);
}

function renderHistorialPremios() {
    const container = document.getElementById('historial-premios-listado');
    if (!container) return;
    
    try {
        const filtros = {
            anio: document.getElementById('filtro-historial-anio')?.value || null,
            tipo_premio: document.getElementById('filtro-historial-tipo')?.value || null,
            categoria: document.getElementById('filtro-historial-categoria')?.value || null,
            client_name: document.getElementById('filtro-historial-cliente')?.value.trim() || null,
            entregado: document.getElementById('filtro-historial-entregado')?.value !== '' 
                ? document.getElementById('filtro-historial-entregado').value 
                : null
        };
        
        Object.keys(filtros).forEach(k => {
            if (filtros[k] === '' || filtros[k] === null || filtros[k] === undefined) {
                delete filtros[k];
            }
        });
        
        const premios = window.DBModule.getPremiosOtorgados(filtros);
        
        if (!premios || premios.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--text-light);">
                    <div style="font-size: 48px; margin-bottom: 10px; opacity: 0.5;">📭</div>
                    <div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">No hay premios registrados</div>
                    <div style="font-size: 12px;">Usa el botón "➕ Registrar premio" para añadir uno</div>
                </div>
            `;
            return;
        }
        
        const totalPremios = premios.length;
        const entregados = premios.filter(p => p.entregado === 1).length;
        const pendientes = totalPremios - entregados;
        const valorTotal = premios.reduce((sum, p) => sum + (parseFloat(p.valor_pesos) || 0), 0);
        
        const renderFila = (premio) => {
            const tipo = TIPOS_PREMIO[premio.tipo_premio] || TIPOS_PREMIO['especial'];
            const cat = CATEGORIAS_PREMIO[premio.categoria] || CATEGORIAS_PREMIO['otro'];
            const entregado = premio.entregado === 1;
            
            return `
                <div style="background: var(--bg); border-radius: 10px; padding: 12px; margin-bottom: 8px; border-left: 4px solid ${entregado ? '#10b981' : '#f59e0b'}; display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 200px;">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px; flex-wrap: wrap;">
                                <span style="font-size: 16px;">${tipo.icon}</span>
                                <span style="font-size: 14px; font-weight: 700; color: var(--text);">${premio.client_name}</span>
                                <span style="font-size: 11px; background: ${entregado ? '#10b98120' : '#f59e0b20'}; color: ${entregado ? '#10b981' : '#f59e0b'}; padding: 2px 8px; border-radius: 10px; font-weight: 600;">
                                    ${entregado ? '✅ Entregado' : '⏳ Pendiente'}
                                </span>
                            </div>
                            <div style="font-size: 12px; color: var(--text-light); display: flex; flex-wrap: wrap; gap: 8px;">
                                <span>${cat.icon} ${cat.label}</span>
                                <span>📅 ${premio.fecha_otorgamiento}</span>
                                ${premio.periodo ? `<span>📆 ${premio.periodo}</span>` : ''}
                                ${premio.valor_pesos > 0 ? `<span>💰 $${parseFloat(premio.valor_pesos).toFixed(2)}</span>` : ''}
                            </div>
                            ${premio.descripcion_premio ? `
                                <div style="font-size: 12px; color: var(--text); margin-top: 6px; padding: 6px 10px; background: var(--bg-card); border-radius: 6px;">
                                    🎁 ${premio.descripcion_premio}
                                </div>
                            ` : ''}
                            ${premio.notas ? `
                                <div style="font-size: 11px; color: var(--text-light); margin-top: 4px; font-style: italic;">
                                    📝 ${premio.notas}
                                </div>
                            ` : ''}
                        </div>
                        <div style="display: flex; gap: 4px; flex-shrink: 0;">
                            <button onclick="toggleEntregadoPremioAction(${premio.id}, ${entregado ? 0 : 1})" 
                                    title="${entregado ? 'Marcar como pendiente' : 'Marcar como entregado'}"
                                    style="background: ${entregado ? '#f59e0b20' : '#10b98120'}; color: ${entregado ? '#f59e0b' : '#10b981'}; border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 14px;">
                                ${entregado ? '⏳' : '✅'}
                            </button>
                            <button onclick="showPremioOtorgadoFormModal(${premio.id})" 
                                    title="Editar"
                                    style="background: #3b82f620; color: #3b82f6; border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 14px;">
                                ✏️
                            </button>
                            <button onclick="deletePremioOtorgadoAction(${premio.id})" 
                                    title="Eliminar"
                                    style="background: #ef444420; color: #ef4444; border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 14px;">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        };
        
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-bottom: 16px;">
                <div style="background: linear-gradient(135deg, #8b5cf615 0%, #8b5cf605 100%); border-radius: 8px; padding: 10px; text-align: center; border-left: 3px solid #8b5cf6;">
                    <div style="font-size: 20px; font-weight: 700; color: #8b5cf6;">${totalPremios}</div>
                    <div style="font-size: 11px; color: var(--text-light);">Total premios</div>
                </div>
                <div style="background: linear-gradient(135deg, #10b98115 0%, #10b98105 100%); border-radius: 8px; padding: 10px; text-align: center; border-left: 3px solid #10b981;">
                    <div style="font-size: 20px; font-weight: 700; color: #10b981;">${entregados}</div>
                    <div style="font-size: 11px; color: var(--text-light);">Entregados</div>
                </div>
                <div style="background: linear-gradient(135deg, #f59e0b15 0%, #f59e0b05 100%); border-radius: 8px; padding: 10px; text-align: center; border-left: 3px solid #f59e0b;">
                    <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${pendientes}</div>
                    <div style="font-size: 11px; color: var(--text-light);">Pendientes</div>
                </div>
                <div style="background: linear-gradient(135deg, #3b82f615 0%, #3b82f605 100%); border-radius: 8px; padding: 10px; text-align: center; border-left: 3px solid #3b82f6;">
                    <div style="font-size: 20px; font-weight: 700; color: #3b82f6;">$${valorTotal.toFixed(2)}</div>
                    <div style="font-size: 11px; color: var(--text-light);">Valor total</div>
                </div>
            </div>
            
            <div>
                ${premios.map(renderFila).join('')}
            </div>
        `;
        
    } catch (e) {
        console.error('Error renderizando historial de premios:', e);
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #ef4444; font-size: 13px;">
                ❌ Error al cargar el historial
            </div>
        `;
    }
}

function showPremioOtorgadoFormModal(premioId = null) {
    const existingModal = document.getElementById('premio-otorgado-form-modal');
    if (existingModal) existingModal.remove();
    
    let premio = null;
    if (premioId) {
        premio = window.DBModule.getPremioOtorgado(premioId);
        if (!premio) {
            window.showToast('❌ Premio no encontrado', 'error');
            return;
        }
    }
    
    const esEdicion = !!premio;
    const hoy = new Date().toISOString().split('T')[0];
    const requiereEntrega = getPremioRequiereEntrega();  // 🆕 N2-bis
    const entregadoInicial = requiereEntrega ? (premio?.entregado === 1) : true;
    
    const modal = document.createElement('div');
    modal.id = 'premio-otorgado-form-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 100000000; padding: 15px;
        animation: modalFadeIn 0.25s ease;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 20px; max-width: 520px; width: 100%; max-height: 95vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">${esEdicion ? '✏️' : '🎁'}</span>
                    <div>
                        <h2 style="margin: 0; font-size: 17px; color: #10b981;">${esEdicion ? 'Editar Premio' : 'Registrar Premio Otorgado'}</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">${esEdicion ? 'Modifica los datos del premio' : 'Registra un premio entregado a un cliente'}</p>
                    </div>
                </div>
                <button onclick="closePremioOtorgadoFormModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            ${!requiereEntrega ? `
                <div style="background: #06b6d415; border: 1px solid #06b6d4; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; font-size: 12px; color: #06b6d4;">
                    💡 <strong>Premio sin entrega física</strong><br>
                    Según tu configuración, este premio se marcará como <strong>ENTREGADO automáticamente</strong> (no queda pendiente).
                </div>
            ` : ''}
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
                
                <div>
                    <label style="font-size: 12px; font-weight: 600; color: var(--text); display: block; margin-bottom: 4px;">
                        👤 Nombre del cliente <span style="color: #ef4444;">*</span>
                    </label>
                    <input type="text" id="premio-form-cliente" 
                           value="${premio?.client_name || ''}"
                           placeholder="Ej: Juan Pérez"
                           style="width: 100%; padding: 10px 12px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-input); color: var(--text); outline: none;">
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <label style="font-size: 12px; font-weight: 600; color: var(--text); display: block; margin-bottom: 4px;">
                            📋 Tipo <span style="color: #ef4444;">*</span>
                        </label>
                        <select id="premio-form-tipo" style="width: 100%; padding: 10px 12px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-input); color: var(--text); outline: none;">
                            ${Object.entries(TIPOS_PREMIO).map(([key, data]) => `
                                <option value="${key}" ${premio?.tipo_premio === key ? 'selected' : ''}>${data.icon} ${data.label}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 12px; font-weight: 600; color: var(--text); display: block; margin-bottom: 4px;">
                            🏆 Categoría <span style="color: #ef4444;">*</span>
                        </label>
                        <select id="premio-form-categoria" style="width: 100%; padding: 10px 12px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-input); color: var(--text); outline: none;">
                            ${Object.entries(CATEGORIAS_PREMIO).map(([key, data]) => `
                                <option value="${key}" ${premio?.categoria === key ? 'selected' : ''}>${data.icon} ${data.label}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                
                <div>
                    <label style="font-size: 12px; font-weight: 600; color: var(--text); display: block; margin-bottom: 4px;">
                        🎁 Descripción del premio
                    </label>
                    <input type="text" id="premio-form-descripcion" 
                           value="${premio?.descripcion_premio || ''}"
                           placeholder="Ej: Media jaba de pan"
                           style="width: 100%; padding: 10px 12px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-input); color: var(--text); outline: none;">
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <label style="font-size: 12px; font-weight: 600; color: var(--text); display: block; margin-bottom: 4px;">
                            📅 Fecha de otorgamiento <span style="color: #ef4444;">*</span>
                        </label>
                        <input type="date" id="premio-form-fecha" 
                               value="${premio?.fecha_otorgamiento || hoy}"
                               style="width: 100%; padding: 10px 12px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-input); color: var(--text); outline: none;">
                    </div>
                    <div>
                        <label style="font-size: 12px; font-weight: 600; color: var(--text); display: block; margin-bottom: 4px;">
                            📆 Período
                        </label>
                        <input type="text" id="premio-form-periodo" 
                               value="${premio?.periodo || ''}"
                               placeholder="Ej: Enero 2026"
                               style="width: 100%; padding: 10px 12px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-input); color: var(--text); outline: none;">
                    </div>
                </div>
                
                <div>
                    <label style="font-size: 12px; font-weight: 600; color: var(--text); display: block; margin-bottom: 4px;">
                        💰 Valor en pesos (opcional)
                    </label>
                    <input type="number" id="premio-form-valor" 
                           value="${premio?.valor_pesos || ''}"
                           placeholder="0.00" step="0.01" min="0"
                           style="width: 100%; padding: 10px 12px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-input); color: var(--text); outline: none;">
                </div>
                
                <div>
                    <label style="font-size: 12px; font-weight: 600; color: var(--text); display: block; margin-bottom: 4px;">
                        📝 Notas (opcional)
                    </label>
                    <textarea id="premio-form-notas" 
                              placeholder="Observaciones adicionales..."
                              rows="2"
                              style="width: 100%; padding: 10px 12px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-input); color: var(--text); outline: none; resize: vertical; font-family: inherit;">${premio?.notas || ''}</textarea>
                </div>
                
                <div style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg); border-radius: 8px; border: 2px solid ${entregadoInicial ? '#10b981' : 'var(--border-color)'}; ${!requiereEntrega ? 'opacity: 0.6;' : ''}">
                    <input type="checkbox" id="premio-form-entregado" 
                           ${entregadoInicial ? 'checked' : ''}
                           ${!requiereEntrega ? 'disabled' : ''}
                           style="width: 18px; height: 18px; cursor: ${requiereEntrega ? 'pointer' : 'not-allowed'}; accent-color: #10b981;">
                    <label for="premio-form-entregado" style="font-size: 13px; font-weight: 600; cursor: ${requiereEntrega ? 'pointer' : 'not-allowed'}; flex: 1;">
                        ✅ Premio ya entregado al cliente
                        ${!requiereEntrega ? '<span style="font-size: 11px; color: #06b6d4; font-weight: normal;"> (forzado por configuración)</span>' : ''}
                    </label>
                </div>
            </div>
            
            <div style="display: flex; gap: 8px; margin-top: 16px;">
                <button onclick="savePremioOtorgadoAction(${premioId || 'null'})" class="btn primary" style="flex: 1; background: #10b981; color: #fff; border: none; border-radius: 8px; padding: 12px; cursor: pointer; font-weight: 600; font-size: 14px;">
                    💾 ${esEdicion ? 'Guardar cambios' : 'Registrar premio'}
                </button>
                <button onclick="closePremioOtorgadoFormModal()" class="btn secondary" style="flex: 1; padding: 12px; font-size: 14px;">
                    ❌ Cancelar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    window.closePremioOtorgadoFormModal = function() {
        const m = document.getElementById('premio-otorgado-form-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (m.parentNode) m.remove();
            }, 200);
            setTimeout(() => {
                const still = document.getElementById('premio-otorgado-form-modal');
                if (still && still.parentNode) still.remove();
            }, 500);
        }
    };
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) closePremioOtorgadoFormModal();
    });
    
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closePremioOtorgadoFormModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

function savePremioOtorgadoAction(premioId = null) {
    try {
        const clientName = document.getElementById('premio-form-cliente')?.value.trim();
        const tipoPremio = document.getElementById('premio-form-tipo')?.value;
        const categoria = document.getElementById('premio-form-categoria')?.value;
        const descripcion = document.getElementById('premio-form-descripcion')?.value.trim();
        const fechaOtorgamiento = document.getElementById('premio-form-fecha')?.value;
        const periodo = document.getElementById('premio-form-periodo')?.value.trim();
        const valorPesos = parseFloat(document.getElementById('premio-form-valor')?.value) || 0;
        const notas = document.getElementById('premio-form-notas')?.value.trim();
        
        // 🆕 N2-bis: Respetar premio_requiere_entrega
        const requiereEntrega = getPremioRequiereEntrega();
        let entregado = requiereEntrega 
            ? (document.getElementById('premio-form-entregado')?.checked ? 1 : 0)
            : 1;  // Si no requiere entrega, forzar entregado=1
        
        if (!clientName) {
            window.showToast('❌ El nombre del cliente es obligatorio', 'error');
            return;
        }
        if (!fechaOtorgamiento) {
            window.showToast('❌ La fecha de otorgamiento es obligatoria', 'error');
            return;
        }
        
        const data = {
            id: premioId || null,
            client_name: clientName,
            tipo_premio: tipoPremio,
            categoria: categoria,
            descripcion_premio: descripcion || null,
            fecha_otorgamiento: fechaOtorgamiento,
            periodo: periodo || null,
            valor_pesos: valorPesos,
            notas: notas || null,
            entregado: entregado
        };
        
        const result = window.DBModule.savePremioOtorgado(data);
        
        if (result.success) {
            window.showToast(
                result.updated ? '✅ Premio actualizado correctamente' : '✅ Premio registrado correctamente',
                'success',
                3000
            );
            closePremioOtorgadoFormModal();
            
            setTimeout(() => {
                if (document.getElementById('historial-premios-modal')) {
                    renderHistorialPremios();
                }
            }, 200);
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
        
    } catch (e) {
        console.error('Error guardando premio otorgado:', e);
        window.showToast('❌ Error inesperado: ' + e.message, 'error');
    }
}

async function deletePremioOtorgadoAction(premioId) {
    try {
        const premio = window.DBModule.getPremioOtorgado(premioId);
        if (!premio) {
            window.showToast('❌ Premio no encontrado', 'error');
            return;
        }
        
        const confirm = await window.ModalModule.showConfirm({
            title: '🗑️ Eliminar premio',
            message: `¿Seguro que quieres eliminar el premio otorgado a "${premio.client_name}"?\n\n📅 Fecha: ${premio.fecha_otorgamiento}\n🎁 ${premio.descripcion_premio || 'Sin descripción'}`,
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar',
            icon: '⚠️',
            confirmColor: '#ef4444'
        });
        
        if (!confirm) return;
        
        const result = window.DBModule.deletePremioOtorgado(premioId);
        
        if (result.success) {
            window.showToast('✅ Premio eliminado', 'success', 3000);
            renderHistorialPremios();
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
        
    } catch (e) {
        console.error('Error eliminando premio:', e);
        window.showToast('❌ Error inesperado: ' + e.message, 'error');
    }
}

function toggleEntregadoPremioAction(premioId, entregado) {
    try {
        const premio = window.DBModule.getPremioOtorgado(premioId);
        if (!premio) {
            window.showToast('❌ Premio no encontrado', 'error');
            return;
        }
        
        const data = {
            id: premioId,
            client_name: premio.client_name,
            tipo_premio: premio.tipo_premio,
            categoria: premio.categoria,
            descripcion_premio: premio.descripcion_premio,
            fecha_otorgamiento: premio.fecha_otorgamiento,
            periodo: premio.periodo,
            valor_pesos: premio.valor_pesos,
            notas: premio.notas,
            entregado: entregado
        };
        
        const result = window.DBModule.savePremioOtorgado(data);
        
        if (result.success) {
            window.showToast(
                entregado === 1 ? '✅ Premio marcado como entregado' : '⏳ Premio marcado como pendiente',
                'success',
                2500
            );
            renderHistorialPremios();
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
        
    } catch (e) {
        console.error('Error cambiando estado de entrega:', e);
        window.showToast('❌ Error inesperado: ' + e.message, 'error');
    }
}

// ============================================================
// 🆕 v2.3.0: TARJETA DE PREMIOS EN EL DASHBOARD (N2)
// ============================================================

function renderRewardsCard() {
    try {
        const config = window.DBModule.getPremiosConfig();
        
        if (!config || !config.activo) return '';
        
        const ganadoresMes = window.DBModule.calcularGanadoresDelMes 
            ? window.DBModule.calcularGanadoresDelMes()
            : { mejor_cliente: null, mas_frecuente: null };
        
        const now = new Date();
        const anioParaAnual = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const ganadorAnual = window.DBModule.calcularGanadorAnualPorVictorias 
            ? window.DBModule.calcularGanadorAnualPorVictorias(anioParaAnual)
            : window.DBModule.calcularMejorClienteDelAñoConConfig 
                ? window.DBModule.calcularMejorClienteDelAñoConConfig(config.premio_anual_calculo || 'inicio_anio')
                : window.DBModule.calcularMejorClienteDelAño();
        
        const modoCalculo = config.premio_anual_calculo || 'inicio_anio';
        const modoLabel = CALCULO_ANUAL_LABELS[modoCalculo] || CALCULO_ANUAL_LABELS['inicio_anio'];
        
        const renderGanador = (ganador, tipoLabel, medal, premioTexto, extraInfo = '') => {
            if (!ganador) {
                return `
                    <div style="background: var(--bg); padding: 12px; border-radius: 10px; text-align: center; border-left: 4px solid var(--border-color);">
                        <div style="font-size: 28px; margin-bottom: 4px; opacity: 0.5;">${medal.label}</div>
                        <div style="font-size: 11px; color: var(--text-light);">
                            Sin datos para ${tipoLabel}
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
                        ${tipoLabel}
                    </div>
                    <div style="font-size: 14px; font-weight: 700; text-align: center; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text);">
                        ${ganador.buyer}
                    </div>
                    <div style="font-size: 11px; color: var(--text-light); text-align: center; margin-bottom: 6px;">
                        ${ganador.compras} compras · $${parseFloat(ganador.total_gastado).toFixed(2)}
                    </div>
                    ${extraInfo ? `
                        <div style="font-size: 10px; color: #8b5cf6; text-align: center; margin-bottom: 6px; font-weight: 600;">
                            ${extraInfo}
                        </div>
                    ` : ''}
                    ${premioTexto ? `
                        <div style="background: ${medal.main}25; color: ${medal.dark}; padding: 4px 8px; border-radius: 8px; font-size: 11px; text-align: center; font-weight: 700; border: 1px solid ${medal.main}50;">
                            🎁 ${premioTexto}
                        </div>
                    ` : ''}
                </div>
            `;
        };
        
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
                                            $${parseFloat(cliente.total_gastado).toFixed(2)}
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
        
        const activoMejorCliente = config.activo_mejor_cliente;
        const activoMasFrecuente = config.activo_mas_frecuente;
        
        let ganadoresHtml = '';
        if (activoMejorCliente && activoMasFrecuente) {
            ganadoresHtml = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    ${renderGanador(ganadoresMes.mejor_cliente, 'Mejor del mes', MEDAL_COLORS.gold, config.premio_mejor_cliente_texto)}
                    ${renderGanador(ganadoresMes.mas_frecuente, 'Más frecuente', MEDAL_COLORS.silver, config.premio_mas_frecuente_texto)}
                </div>
            `;
        } else if (activoMejorCliente) {
            ganadoresHtml = renderGanador(ganadoresMes.mejor_cliente, 'Mejor del mes', MEDAL_COLORS.gold, config.premio_mejor_cliente_texto);
        } else if (activoMasFrecuente) {
            ganadoresHtml = renderGanador(ganadoresMes.mas_frecuente, 'Más frecuente', MEDAL_COLORS.silver, config.premio_mas_frecuente_texto);
        }
        
        const infoAnualCard = ganadorAnual 
            ? `${modoLabel.icon} ${ganadorAnual.victorias} victoria${ganadorAnual.victorias !== 1 ? 's' : ''}`
            : `${modoLabel.icon} ${modoLabel.label}`;
        
        return `
            <div class="card" style="border-left: 4px solid #f59e0b; background: linear-gradient(135deg, #f59e0b08 0%, transparent 100%);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <h3 style="margin: 0; font-size: 14px; color: #f59e0b; display: flex; align-items: center; gap: 6px;">
                        🏆 Premios y Fidelización
                    </h3>
                    <div style="display: flex; gap: 6px;">
                        <button onclick="showHistorialPremiosModal()" class="btn secondary" style="padding: 4px 12px; font-size: 11px; width: auto;">
                            📜 Historial
                        </button>
                        <button onclick="showRewardsConfigModal()" class="btn secondary" style="padding: 4px 12px; font-size: 11px; width: auto;">
                            ⚙️ Configurar
                        </button>
                    </div>
                </div>
                ${ganadoresHtml}
                
                <!-- Ganador Anual -->
                <div style="margin-top: 10px;">
                    ${ganadorAnual ? `
                        <div style="background: linear-gradient(135deg, ${MEDAL_COLORS.trophy.bg} 0%, transparent 100%); padding: 10px 12px; border-radius: 10px; border-left: 4px solid ${MEDAL_COLORS.trophy.main}; display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 26px;">🏆</span>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 10px; color: ${MEDAL_COLORS.trophy.dark}; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">
                                    Premio Anual ${anioParaAnual}
                                </div>
                                <div style="font-size: 14px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    ${ganadorAnual.buyer}
                                </div>
                                <div style="font-size: 11px; color: var(--text-light);">
                                    ${infoAnualCard} · ${ganadorAnual.compras} compras · $${parseFloat(ganadorAnual.total_gastado).toFixed(2)}
                                </div>
                                ${config.premio_anual_texto ? `
                                    <div style="background: ${MEDAL_COLORS.trophy.main}25; color: ${MEDAL_COLORS.trophy.dark}; padding: 3px 8px; border-radius: 6px; font-size: 11px; display: inline-block; margin-top: 4px; font-weight: 700; border: 1px solid ${MEDAL_COLORS.trophy.main}50;">
                                        🎁 ${config.premio_anual_texto}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : `
                        <div style="background: var(--bg); padding: 12px; border-radius: 10px; text-align: center; border-left: 4px solid var(--border-color);">
                            <div style="font-size: 24px; margin-bottom: 4px; opacity: 0.5;">🏆</div>
                            <div style="font-size: 11px; color: var(--text-light);">
                                Sin datos suficientes para el premio anual ${anioParaAnual}
                            </div>
                        </div>
                    `}
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
// 🆕 v2.3.0: Notifica a ambos ganadores
// 🆕 v2.4.0: N1-bis - Excluye deudores en las consultas
// ============================================================

async function checkRewardsNotification() {
    try {
        const config = window.DBModule.getPremiosConfig();
        if (!config || !config.activo) return;
        
        const user = window.AuthModule.getCurrentUser();
        if (!user) return;
        
        const now = new Date();
        const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const keyNotificacion = `panario_rewards_notified_${user.id}_${mesActual}`;
        
        if (localStorage.getItem(keyNotificacion)) return;
        
        const dia = now.getDate();
        if (dia > 5) {
            localStorage.setItem(keyNotificacion, 'skipped');
            return;
        }
        
        const mesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const year = mesAnterior.getFullYear();
        const monthStr = String(mesAnterior.getMonth() + 1).padStart(2, '0');
        const mesNombre = mesAnterior.toLocaleDateString('es-ES', { month: 'long' });
        
        const negocioId = window.DBModule.getNegocioIdActual();
        const inicioMes = `${year}-${monthStr}-01`;
        const ultimoDia = new Date(year, mesAnterior.getMonth() + 1, 0).getDate();
        const finMes = `${year}-${monthStr}-${String(ultimoDia).padStart(2, '0')}`;
        
        // 🆕 N1-bis: Exclusión de deudores
        const exclusion = _getSQLExclusionDeudores(negocioId);
        
        const notificacionesEnviadas = [];
        
        // 🥇 Mejor Cliente
        if (config.activo_mejor_cliente) {
            const minCompras = config.min_compras_mejor_cliente || 4;
            const results = window.DBModule.query(`
                SELECT buyer, COUNT(*) as compras, SUM(total) as total_gastado
                FROM sales
                WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0
                  AND buyer IS NOT NULL AND buyer != '' AND buyer != 'Cliente sin nombre' AND buyer != 'Cliente ocasional'
                  AND DATE(sale_date) >= DATE(?) AND DATE(sale_date) <= DATE(?)
                  ${exclusion}
                GROUP BY buyer HAVING COUNT(*) >= ?
                ORDER BY total_gastado DESC LIMIT 1
            `, [negocioId, inicioMes, finMes, minCompras]);
            
            if (results.length > 0) {
                const ganador = results[0];
                const premio = config.premio_mejor_cliente_texto || 'sin definir';
                
                if (window.NotificationsModule) {
                    window.NotificationsModule.addNotification(
                        `🥇 Mejor Cliente de ${mesNombre}: ${ganador.buyer} ($${parseFloat(ganador.total_gastado).toFixed(2)}) - Premio: ${premio}`,
                        'success',
                        15000
                    );
                }
                notificacionesEnviadas.push(`🥇 ${ganador.buyer}`);
            }
        }
        
        // 🥈 Más Frecuente
        if (config.activo_mas_frecuente) {
            const minCompras = config.min_compras_mas_frecuente || 6;
            const results = window.DBModule.query(`
                SELECT buyer, COUNT(*) as compras, SUM(total) as total_gastado
                FROM sales
                WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0
                  AND buyer IS NOT NULL AND buyer != '' AND buyer != 'Cliente sin nombre' AND buyer != 'Cliente ocasional'
                  AND DATE(sale_date) >= DATE(?) AND DATE(sale_date) <= DATE(?)
                  ${exclusion}
                GROUP BY buyer HAVING COUNT(*) >= ?
                ORDER BY compras DESC, total_gastado DESC LIMIT 1
            `, [negocioId, inicioMes, finMes, minCompras]);
            
            if (results.length > 0) {
                const ganador = results[0];
                const premio = config.premio_mas_frecuente_texto || 'sin definir';
                
                if (window.NotificationsModule) {
                    window.NotificationsModule.addNotification(
                        `🥈 Más Frecuente de ${mesNombre}: ${ganador.buyer} (${ganador.compras} compras) - Premio: ${premio}`,
                        'success',
                        15000
                    );
                }
                notificacionesEnviadas.push(`🥈 ${ganador.buyer}`);
            }
        }
        
        if (notificacionesEnviadas.length > 0) {
            window.showToast(
                `🏆 Ganadores de ${mesNombre}: ${notificacionesEnviadas.join(' · ')}`,
                'success',
                8000
            );
        }
        
        localStorage.setItem(keyNotificacion, notificacionesEnviadas.length > 0 ? 'shown' : 'no-data');
        
        // 🏆 Premio anual
        const modoCalculo = config.premio_anual_calculo || 'inicio_anio';
        
        const debeNotificarAnual = 
            (now.getMonth() === 0 && dia <= 5 && modoCalculo !== 'navidad') ||
            (modoCalculo === 'navidad' && now.getMonth() === 11 && dia >= 25);
        
        if (debeNotificarAnual) {
            const anioAnual = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
            const ganadorAnual = window.DBModule.calcularGanadorAnualPorVictorias 
                ? window.DBModule.calcularGanadorAnualPorVictorias(anioAnual)
                : null;
            
            if (ganadorAnual) {
                const keyAnual = `panario_rewards_anual_notified_${user.id}_${anioAnual}`;
                if (!localStorage.getItem(keyAnual)) {
                    const premioAnual = config.premio_anual_texto || config.premio_anual || 'sin definir';
                    
                    if (window.NotificationsModule) {
                        window.NotificationsModule.addNotification(
                            `🏆 Ganador del año ${anioAnual}: ${ganadorAnual.buyer} (${ganadorAnual.victorias} victorias, $${parseFloat(ganadorAnual.total_gastado).toFixed(2)}) - Premio: ${premioAnual}`,
                            'success',
                            15000
                        );
                    }
                    window.showToast(
                        `🏆 ¡Ganador del año ${anioAnual}: ${ganadorAnual.buyer}! (${ganadorAnual.victorias} victorias)`,
                        'success',
                        8000
                    );
                    localStorage.setItem(keyAnual, 'shown');
                }
            }
        }
        
    } catch (e) {
        console.warn('Error verificando notificación de premios:', e);
    }
}

// ============================================================
// FUNCIONES AUXILIARES
// 🆕 v2.4.0: N1-bis - Excluye deudores
// ============================================================

function calcularGanadorMesEspecifico(year, month) {
    const negocioId = window.DBModule.getNegocioIdActual();
    try {
        const monthStr = String(month).padStart(2, '0');
        const inicioMes = `${year}-${monthStr}-01`;
        const ultimoDia = new Date(year, month, 0).getDate();
        const finMes = `${year}-${monthStr}-${String(ultimoDia).padStart(2, '0')}`;
        
        // 🆕 N1-bis: Exclusión de deudores
        const exclusion = _getSQLExclusionDeudores(negocioId);
        
        const results = window.DBModule.query(`
            SELECT buyer, COUNT(*) as compras, SUM(total) as total_gastado
            FROM sales
            WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0
              AND buyer IS NOT NULL AND buyer != '' AND buyer != 'Cliente sin nombre' AND buyer != 'Cliente ocasional'
              AND DATE(sale_date) >= DATE(?) AND DATE(sale_date) <= DATE(?)
              ${exclusion}
            GROUP BY buyer ORDER BY total_gastado DESC LIMIT 1
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

function getTop5ClientesDelMes() {
    const negocioId = window.DBModule.getNegocioIdActual();
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const inicioMes = `${year}-${month}-01`;
        const ultimoDia = new Date(year, now.getMonth() + 1, 0).getDate();
        const finMes = `${year}-${month}-${String(ultimoDia).padStart(2, '0')}`;
        
        // 🆕 N1-bis: Exclusión de deudores
        const exclusion = _getSQLExclusionDeudores(negocioId);
        
        return window.DBModule.query(`
            SELECT buyer, COUNT(*) as compras, SUM(total) as total_gastado
            FROM sales
            WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0
              AND buyer IS NOT NULL AND buyer != '' AND buyer != 'Cliente sin nombre' AND buyer != 'Cliente ocasional'
              AND DATE(sale_date) >= DATE(?) AND DATE(sale_date) <= DATE(?)
              ${exclusion}
            GROUP BY buyer ORDER BY total_gastado DESC LIMIT 5
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
    getMedalColor,
    getMedalIcon,
    MEDAL_COLORS,
    CALCULO_ANUAL_LABELS,
    TIPOS_PREMIO,
    CATEGORIAS_PREMIO,
    // N1: Historial
    showHistorialPremiosModal,
    renderHistorialPremios,
    showPremioOtorgadoFormModal,
    savePremioOtorgadoAction,
    deletePremioOtorgadoAction,
    toggleEntregadoPremioAction,
    // N2-bis: Premio requiere entrega
    getPremioRequiereEntrega,
    setPremioRequiereEntrega
};

window.showRewardsConfigModal = showRewardsConfigModal;
window.saveRewardsConfigAction = saveRewardsConfigAction;
window.renderRewardsCard = renderRewardsCard;
window.renderRewardsPreview = renderRewardsPreview;
window.checkRewardsNotification = checkRewardsNotification;
window.calcularGanadorMesEspecifico = calcularGanadorMesEspecifico;
window.getTop5ClientesDelMes = getTop5ClientesDelMes;
window.getMedalColor = getMedalColor;
window.getMedalIcon = getMedalIcon;
window.showHistorialPremiosModal = showHistorialPremiosModal;
window.renderHistorialPremios = renderHistorialPremios;
window.showPremioOtorgadoFormModal = showPremioOtorgadoFormModal;
window.savePremioOtorgadoAction = savePremioOtorgadoAction;
window.deletePremioOtorgadoAction = deletePremioOtorgadoAction;
window.toggleEntregadoPremioAction = toggleEntregadoPremioAction;
window.getPremioRequiereEntrega = getPremioRequiereEntrega;
window.setPremioRequiereEntrega = setPremioRequiereEntrega;

console.log('📦 Rewards Module cargado correctamente v2.4.0');
console.log('   🆕 CORRECCIÓN N1-bis (011026):');
console.log('      ✅ _getSQLExclusionDeudores() helper');
console.log('      ✅ renderRewardsPreview() excluye deudores');
console.log('      ✅ calcularGanadorMesEspecifico() excluye deudores');
console.log('      ✅ getTop5ClientesDelMes() excluye deudores');
console.log('      ✅ checkRewardsNotification() excluye deudores');
console.log('   🆕 CORRECCIÓN N2-bis (011026):');
console.log('      ✅ Toggle "premio_requiere_entrega" en el modal');
console.log('      ✅ showPremioOtorgadoFormModal() respeta la config');
console.log('      ✅ savePremioOtorgadoAction() fuerza entregado=1 si no requiere');
console.log('   🆕 CORRECCIÓN N2 (v2.3.0) mantenida:');
console.log('      ✅ Modal con toggles por categoría');
console.log('      ✅ renderRewardsCard() muestra 3 ganadores');
console.log('   🆕 CORRECCIÓN N1 (v2.2.0) mantenida:');
console.log('      ✅ Historial de premios otorgados');