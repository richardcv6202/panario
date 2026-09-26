// ============================================================
// 📦 MODAL MODULE - Panario (Modales personalizados + progreso)
// CORREGIDO FASE A.2 (170926): z-index elevado + cierre limpio
// CORREGIDO FASE A.3 (170926 v2): auto-cierre de progreso a los 30s
// CORREGIDO FASE 1.4 (190926 v3): FIX DEFINITIVO - referencia única
// 🆕 v2.0.9 (230926 v4): FIX BUG #2 - Header deformado
//   - ✅ NUEVO: lockBodyScroll() / unlockBodyScroll() con stack LIFO
//   - ✅ NUEVO: limpiarEstilosResiduales() elimina transform/will-change
//     residuales del body/html/#appScreen que rompen position:sticky
//   - ✅ Se ejecuta automáticamente al cerrar cualquier modal
//   - ✅ cerrarTodosLosModales() ahora también limpia estilos residuales
//   - ✅ Compatibilidad total con código existente
// 🆕 v2.0.10 (230926 v5): FIX BUG #1 - Top bar se desconfigura
//   - ✅ REFORZADO: limpiarEstilosResiduales() ahora resetea MÁS
//     propiedades (transform, will-change, isolation, filter,
//     perspective, backface-visibility, contain, content-visibility)
//   - ✅ NUEVO: Listener global de 'visibilitychange' que limpia
//     estilos residuales cuando la app vuelve a primer plano
//   - ✅ NUEVO: Listener global de 'pageshow' (para bfcache)
//   - ✅ NUEVO: Listener global de 'resize' y 'orientationchange'
//   - ✅ NUEVO: Listener global de 'scroll' en el documento (con debounce)
//   - ✅ NUEVO: Listener de 'focus' en window
//   - ✅ NUEVO: Función startStyleCleanupWatchers() que registra
//     todos los listeners globales
//   - ✅ NUEVO: Función stopStyleCleanupWatchers() para limpiar
//   - ✅ La limpieza se ejecuta también cada vez que se abre un modal
//   - ✅ Se marca el body con clase 'modal-open' mientras hay un modal
//     abierto, para que las reglas CSS defensivas sepan cuándo resetear
// 🆕 v2.0.12 (250926 v6): 🎯 CORRECCIÓN #8 (240926) - RACE CONDITION FIX
//   - ✅ BUG RESUELTO: El modal de progreso se cerraba ANTES de mostrar
//     el estado final (✅ success / ❌ error), causando que el usuario
//     viera el modal desaparecer abruptamente sin ver el resultado.
//   - ✅ NUEVO: Sistema de "generación" del modal de progreso. Cada
//     showProgressModal() incrementa un contador _progressGeneration,
//     y cada timeout verifica que sigue siendo la misma generación.
//   - ✅ NUEVO: _clearAllProgressTimeouts() cancela TODOS los timeouts
//     pendientes (cierre, fallbacks, safety) de una sola vez.
//   - ✅ CAMBIO: showProgressSuccess() y showProgressError() ahora
//     cancelan TODOS los timeouts previos antes de programar su
//     propio cierre único a 2500/3000ms.
//   - ✅ CAMBIO: closeProgressModal() acepta un parámetro {force} para
//     forzar el cierre inmediato (ignorando el estado final visible).
//   - ✅ CAMBIO: Los fallbacks de 250/1000/2000ms se reemplazan por
//     UN SOLO fallback de seguridad a 1500ms (más simple, más limpio).
//   - ✅ NUEVO: Flag _progressHasFinalState que indica si el modal
//     está mostrando un success/error. Si es true y NO es forzado,
//     closeProgressModal() respeta el delay de cierre.
//   - ✅ NUEVO: Logs de diagnóstico con número de generación para
//     facilitar el diagnóstico de futuros bugs.
// ============================================================

window.ModalModule = {};

// ============================================================
// CONSTANTES
// ============================================================

const MODAL_Z_INDEX = 9999999999;
const PROGRESS_Z_INDEX = 9999999999;
const PROGRESS_SAFETY_TIMEOUT_MS = 30000;
const PROGRESS_SUCCESS_CLOSE_DELAY_MS = 2500;
const PROGRESS_ERROR_CLOSE_DELAY_MS = 3000;
const PROGRESS_FADE_OUT_MS = 250;
const PROGRESS_FALLBACK_MS = 1500;

// ============================================================
// 🆕 v2.0.9: STACK DE OVERFLOW DEL BODY (LIFO)
// ============================================================
// Guarda los valores previos de `overflow` del body para restaurarlos
// correctamente cuando se cierran modales en orden inverso.
// ============================================================

const _bodyOverflowStack = [];

// ============================================================
// 🆕 v2.0.9: REFERENCIA ÚNICA AL MODAL ACTUAL
// ============================================================

let _currentModal = null;
let _currentModalTimeoutId = null;

// ============================================================
// 🆕 v2.0.10: ESTADO DE LOS WATCHERS
// ============================================================

let _styleCleanupWatchersStarted = false;
let _styleCleanupDebounceTimer = null;

// ============================================================
// 🆕 v2.0.12: ESTADO DEL MODAL DE PROGRESO
// ============================================================
// 
// _progressGeneration: contador que se incrementa cada vez que se
//   abre un nuevo modal de progreso. Permite que los timeouts
//   verifiquen que siguen siendo válidos (misma generación).
// 
// _progressCloseTimeoutId: timeout del cierre programado tras
//   mostrar success/error.
// 
// _progressFallbackTimeouts: array de timeouts de fallback (solo
//   debería haber uno a la vez).
// 
// _progressHasFinalState: true si el modal está mostrando el
//   estado final (✅ o ❌). Sirve para que closeProgressModal()
//   no cierre el modal si aún no se ha mostrado el resultado.
// ============================================================

let _progressGeneration = 0;
let _progressCloseTimeoutId = null;
let _progressFallbackTimeouts = [];
let _progressHasFinalState = false;

// ============================================================
// 🆕 v2.0.9: FUNCIONES DE BLOQUEO/DESBLOQUEO DEL SCROLL
// ============================================================

/**
 * Bloquea el scroll del body guardando el estado previo en un stack.
 * Cada llamada a lock debe emparejarse con un unlock.
 */
function lockBodyScroll() {
    if (!document.body) return;
    try {
        const prev = document.body.style.overflow || '';
        _bodyOverflowStack.push(prev);
        document.body.style.overflow = 'hidden';
        document.body.classList.add('modal-open');
        console.log(`🔒 Body scroll bloqueado (stack size: ${_bodyOverflowStack.length})`);
    } catch (e) {
        console.warn('⚠️ Error en lockBodyScroll:', e);
    }
}

/**
 * Restaura el scroll del body al estado previo (LIFO).
 */
function unlockBodyScroll() {
    if (!document.body) return;
    try {
        const prev = _bodyOverflowStack.pop();
        if (prev === undefined) {
            document.body.style.overflow = '';
            console.log('🔓 Body scroll liberado (stack estaba vacío)');
        } else {
            document.body.style.overflow = prev;
            console.log(`🔓 Body scroll liberado (stack size: ${_bodyOverflowStack.length})`);
        }
        
        if (_bodyOverflowStack.length === 0) {
            document.body.classList.remove('modal-open');
        }
    } catch (e) {
        console.warn('⚠️ Error en unlockBodyScroll:', e);
    }
}

/**
 * 🆕 v2.0.10: Limpia TODOS los estilos residuales que puedan haber
 * quedado en el body, html, #appScreen, main o cualquier ancestro
 * del header, y que rompan `position: sticky`.
 */
function limpiarEstilosResiduales() {
    try {
        const objetivos = [
            document.documentElement,
            document.body,
            document.getElementById('appScreen'),
            document.getElementById('mainContent'),
            document.getElementById('authScreen')
        ].filter(el => el);
        
        const propsAResetear = [
            'transform',
            'will-change',
            'isolation',
            'filter',
            '-webkit-filter',
            'perspective',
            '-webkit-perspective',
            'backface-visibility',
            '-webkit-backface-visibility',
            'content-visibility',
            'translate',
            'rotate',
            'scale',
            'offset-path',
            'offset-distance',
            'offset-rotate',
            'container-type',
            'container-name',
            'overflow-anchor',
            'view-transition-name'
        ];
        
        let limpiados = 0;
        
        objetivos.forEach(el => {
            if (!el || !el.style) return;
            
            propsAResetear.forEach(prop => {
                if (el.style.getPropertyValue(prop)) {
                    el.style.removeProperty(prop);
                    limpiados++;
                }
            });
            
            try {
                const containVal = el.style.getPropertyValue('contain');
                if (containVal && (containVal.includes('paint') || containVal === 'strict' || containVal === 'content')) {
                    el.style.removeProperty('contain');
                    limpiados++;
                }
            } catch (e) {}
        });
        
        if (document.body && document.body.style.overflow === 'hidden' && _bodyOverflowStack.length === 0) {
            document.body.style.overflow = '';
            document.body.classList.remove('modal-open');
            console.log('🔧 Body overflow huérfano limpiado');
            limpiados++;
        }
        
        if (document.body && _bodyOverflowStack.length === 0) {
            if (document.body.classList.contains('modal-open')) {
                document.body.classList.remove('modal-open');
                console.log('🔧 Clase modal-open huérfana removida');
            }
        }
        
        if (limpiados > 0) {
            console.log(`🧹 ${limpiados} propiedades residuales limpiadas`);
        }
        
        return limpiados;
        
    } catch (e) {
        console.warn('⚠️ Error en limpiarEstilosResiduales:', e);
        return 0;
    }
}

/**
 * Limpia modales huérfanos del DOM y llama a limpiarEstilosResiduales().
 */
function limpiarModalesHuerfanos() {
    try {
        const customModals = document.querySelectorAll('#custom-modal');
        customModals.forEach(m => { try { m.remove(); } catch (e) {} });
        
        const modalesConocidos = [
            'progress-modal', 'order-modal', 'order-view-modal',
            'add-product-modal', 'insumo-modal', 'recipe-modal',
            'recipe-view-modal', 'producto-modal', 'sale-modal',
            'sale-view-modal', 'expense-modal', 'expense-view-modal',
            'corriente-modal', 'horario-detalle-modal',
            'waiting-processing-modal', 'multi-order-modal',
            'multi-add-product-modal', 'notifications-modal',
            'help-menu-modal', 'readme-modal', 'credits-modal',
            'faq-modal', 'quickstart-modal', 'users-modal',
            'delete-selector-modal', 'sales-report-modal',
            'orders-report-modal', 'expenses-report-modal',
            'recalcular-modal', 'compartir-modal',
            'edit-bank-account-modal', 'bank-accounts-modal',
            'qr-view-modal', 'tour-overlay', 'tour-highlight',
            'tour-tooltip', 'liberated-sale-modal',
            'edit-user-modal', 'create-user-modal',
            'change-password-modal', 'ayuda-modal',
            'help-popover', 'global-cancel-modal',
            'reprogramar-modal', 'production-diagnostic-modal',
            'dias-sin-ventas-modal', 'dia-sin-venta-form-modal',
            'produccion-rango-modal', 'calculo-bloques-modal',
            'waiting-manager-modal'
        ];
        
        let limpiados = 0;
        for (const id of modalesConocidos) {
            const modales = document.querySelectorAll(`#${id}`);
            modales.forEach(m => { try { m.remove(); limpiados++; } catch (e) {} });
        }
        
        if (customModals.length > 0 || limpiados > 0) {
            console.log(`🧹 Modal: Limpieza inicial — ${customModals.length} custom-modal(s) + ${limpiados} otros modales eliminados`);
        }
        
        window._modalResolve = null;
        window._modalResolved = false;
        _currentModal = null;
        
        limpiarEstilosResiduales();
        
        return customModals.length + limpiados;
    } catch (e) {
        console.warn('⚠️ Error en limpiarModalesHuerfanos:', e);
        return 0;
    }
}

// Ejecutar limpieza al cargar el módulo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(limpiarModalesHuerfanos, 100));
} else {
    setTimeout(limpiarModalesHuerfanos, 100);
}

// ============================================================
// 🆕 v2.0.10: WATCHERS GLOBALES PARA LIMPIEZA AUTOMÁTICA
// ============================================================

function _debouncedLimpiarEstilos(delay = 150) {
    if (_styleCleanupDebounceTimer) {
        clearTimeout(_styleCleanupDebounceTimer);
    }
    _styleCleanupDebounceTimer = setTimeout(() => {
        _styleCleanupDebounceTimer = null;
        limpiarEstilosResiduales();
    }, delay);
}

function startStyleCleanupWatchers() {
    if (_styleCleanupWatchersStarted) {
        console.log('🔄 [Modal] Watchers de limpieza ya estaban activos');
        return;
    }
    
    try {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('👁️ [Modal] App vuelve a primer plano → limpiando estilos');
                _debouncedLimpiarEstilos(100);
            }
        });
        
        window.addEventListener('pageshow', (e) => {
            if (e.persisted) {
                console.log('📄 [Modal] Página restaurada desde bfcache → limpiando estilos');
                _debouncedLimpiarEstilos(100);
            }
        });
        
        window.addEventListener('resize', () => {
            _debouncedLimpiarEstilos(200);
        });
        
        window.addEventListener('orientationchange', () => {
            console.log('📱 [Modal] Cambio de orientación → limpiando estilos');
            _debouncedLimpiarEstilos(300);
        });
        
        window.addEventListener('focus', () => {
            _debouncedLimpiarEstilos(150);
        });
        
        document.addEventListener('scroll', () => {
            _debouncedLimpiarEstilos(250);
        }, { capture: true, passive: true });
        
        _styleCleanupWatchersStarted = true;
        console.log('🔄 [Modal] Watchers de limpieza de estilos activados (visibilitychange, pageshow, resize, orientationchange, focus, scroll)');
        
    } catch (e) {
        console.warn('⚠️ Error activando watchers de limpieza:', e);
    }
}

function stopStyleCleanupWatchers() {
    _styleCleanupWatchersStarted = false;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(startStyleCleanupWatchers, 200);
    });
} else {
    setTimeout(startStyleCleanupWatchers, 200);
}

// ============================================================
// FUNCIONES PRINCIPALES
// ============================================================

function showConfirm(options) {
    return new Promise((resolve) => {
        console.log('📦 Modal: showConfirm llamado', options);
        
        limpiarEstilosResiduales();
        
        if (_currentModal) {
            closeCurrentModalImmediate();
        }
        
        const {
            title = 'Confirmar',
            message = '¿Estás seguro?',
            confirmText = 'Sí',
            cancelText = 'Cancelar',
            confirmColor = 'var(--primary)',
            icon = '❓'
        } = options;

        const modal = createModal({
            title: title,
            icon: icon,
            body: `<p style="font-size: 16px; color: var(--text); line-height: 1.8; white-space: pre-wrap; max-height: 300px; overflow-y: auto;">${message}</p>`,
            footer: `
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px;">
                    <button class="btn secondary" onclick="window.ModalModule.closeModalAndResolve(false)" style="flex: 0 1 auto; padding: 10px 24px; font-size: 14px; width: auto; border-radius: 8px;">
                        ${cancelText}
                    </button>
                    <button class="btn primary" onclick="window.ModalModule.closeModalAndResolve(true)" style="flex: 0 1 auto; padding: 10px 24px; font-size: 14px; width: auto; border-radius: 8px; background: ${confirmColor}; border: none; color: #fff; cursor: pointer; font-weight: 600;">
                        ${confirmText}
                    </button>
                </div>
            `
        });

        window._modalResolve = resolve;
        window._modalResolved = false;

        document.body.appendChild(modal);
        _currentModal = modal;
        
        lockBodyScroll();
    });
}

function showAlert(options) {
    return new Promise((resolve) => {
        limpiarEstilosResiduales();
        
        if (_currentModal) {
            closeCurrentModalImmediate();
        }
        
        const {
            title = 'Aviso',
            message = '',
            buttonText = 'Aceptar',
            icon = 'ℹ️',
            type = 'info'
        } = options;

        const colors = {
            info: 'var(--primary)',
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b'
        };

        const modal = createModal({
            title: title,
            icon: icon,
            body: `<p style="font-size: 16px; color: var(--text); line-height: 1.8; white-space: pre-wrap; max-height: 300px; overflow-y: auto;">${message}</p>`,
            footer: `
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px;">
                    <button class="btn primary" onclick="window.ModalModule.closeModalAndResolve(true)" style="flex: 0 1 auto; padding: 10px 24px; font-size: 14px; width: auto; border-radius: 8px; background: ${colors[type] || colors.info}; border: none; color: #fff; cursor: pointer; font-weight: 600;">
                        ${buttonText}
                    </button>
                </div>
            `
        });

        window._modalResolve = resolve;
        window._modalResolved = false;

        document.body.appendChild(modal);
        _currentModal = modal;
        lockBodyScroll();
    });
}

function showPrompt(options) {
    return new Promise((resolve) => {
        limpiarEstilosResiduales();
        
        if (_currentModal) {
            closeCurrentModalImmediate();
        }
        
        const {
            title = 'Ingresar dato',
            message = '',
            placeholder = '',
            defaultValue = '',
            confirmText = 'Aceptar',
            cancelText = 'Cancelar',
            icon = '✏️',
            inputType = 'text'
        } = options;

        const inputTypeAttr = inputType === 'password' ? 'password' : 'text';
        const inputValue = inputType === 'password' ? '' : defaultValue;

        const modal = createModal({
            title: title,
            icon: icon,
            body: `
                ${message ? `<p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px; white-space: pre-wrap;">${message}</p>` : ''}
                <input type="${inputTypeAttr}" id="modal-input" value="${inputValue}" placeholder="${placeholder}" 
                       style="width: 100%; padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text); outline: none; transition: border-color 0.2s;"
                       autocomplete="off">
            `,
            footer: `
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px;">
                    <button class="btn secondary" onclick="window.ModalModule.closeModalAndResolve(null)" style="flex: 0 1 auto; padding: 10px 24px; font-size: 14px; width: auto; border-radius: 8px;">
                        ${cancelText}
                    </button>
                    <button class="btn primary" onclick="window.ModalModule.confirmPromptAndResolve()" style="flex: 0 1 auto; padding: 10px 24px; font-size: 14px; width: auto; border-radius: 8px; background: var(--primary); border: none; color: #fff; cursor: pointer; font-weight: 600;">
                        ${confirmText}
                    </button>
                </div>
            `
        });

        window._modalResolve = resolve;
        window._modalResolved = false;

        document.body.appendChild(modal);
        _currentModal = modal;
        lockBodyScroll();

        setTimeout(() => {
            const input = document.getElementById('modal-input');
            if (input) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        window.ModalModule.confirmPromptAndResolve();
                    }
                });
                input.focus();
                if (inputType !== 'password') {
                    input.select();
                }
            }
        }, 100);
    });
}

// ============================================================
// MODAL DE PROGRESO — v2.0.12 (CORRECCIÓN #8: RACE CONDITION FIX)
// ============================================================
// 
// 🎯 BUG RESUELTO:
//   Antes, el modal de progreso se cerraba ANTES de mostrar el
//   estado final (✅ success / ❌ error). El usuario veía el modal
//   desaparecer abruptamente en lugar de ver el resultado.
// 
// 🛠️ SOLUCIÓN:
//   1. Sistema de "generación" — cada showProgressModal() incrementa
//      _progressGeneration. Los timeouts verifican que la generación
//      no ha cambiado antes de ejecutarse.
//   2. _clearAllProgressTimeouts() — cancela TODOS los timeouts
//      pendientes (cierre, fallbacks, safety) de una sola vez.
//   3. showProgressSuccess/Error() cancelan TODOS los timeouts
//      previos y programan su propio cierre único.
//   4. closeProgressModal() respeta el delay si hay un estado final
//      visible, a menos que se llame con {force: true}.
//   5. Un solo fallback de seguridad (1500ms) en lugar de tres.
// ============================================================

/**
 * 🆕 v2.0.12: Cancela TODOS los timeouts pendientes del modal de progreso.
 */
function _clearAllProgressTimeouts() {
    if (_progressCloseTimeoutId) {
        clearTimeout(_progressCloseTimeoutId);
        _progressCloseTimeoutId = null;
    }
    _progressFallbackTimeouts.forEach(id => clearTimeout(id));
    _progressFallbackTimeouts = [];
    if (window._progressSafetyTimeout) {
        clearTimeout(window._progressSafetyTimeout);
        window._progressSafetyTimeout = null;
    }
}

function showProgressModal(options = {}) {
    const LOG_PREFIX = '⏳ [ProgressModal]';
    console.log(`${LOG_PREFIX} showProgressModal() llamado con:`, options);

    const {
        title = 'Procesando',
        message = 'Por favor, espera...',
        icon = '⏳'
    } = options;

    // 🆕 v2.0.12: Nueva generación + resetear estado
    _progressGeneration++;
    _progressHasFinalState = false;
    const currentGeneration = _progressGeneration;
    console.log(`${LOG_PREFIX} Nueva generación: ${currentGeneration}`);

    // 🆕 v2.0.12: Cancelar TODOS los timeouts previos
    _clearAllProgressTimeouts();

    // Eliminar cualquier instancia previa
    const existing = document.getElementById('progress-modal');
    if (existing) {
        console.log(`${LOG_PREFIX} Eliminando modal de progreso previo`);
        try { existing.remove(); } catch (e) {}
    }

    // Eliminar cualquier modal de confirmación pendiente para evitar conflictos de z-index
    try {
        const customModal = document.getElementById('custom-modal');
        if (customModal) {
            console.log(`${LOG_PREFIX} Eliminando custom-modal pendiente para evitar conflicto`);
            customModal.remove();
            window._modalResolve = null;
            window._modalResolved = false;
        }
    } catch (e) {}

    const modal = document.createElement('div');
    modal.id = 'progress-modal';
    modal.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: rgba(0,0,0,0.7);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 2147483647 !important;
        padding: 20px;
        animation: modalFadeIn 0.25s ease;
        isolation: isolate;
        pointer-events: auto;
    `;

    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 32px 28px; max-width: 380px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color); text-align: center;">
            <div id="progress-icon" style="font-size: 64px; margin-bottom: 16px; animation: hourglassFlip 1.5s ease-in-out infinite; display: inline-block;">
                ${icon}
            </div>
            
            <h2 id="progress-title" style="margin: 0 0 8px 0; font-size: 20px; color: var(--text);">
                ${title}
            </h2>
            
            <p id="progress-message" style="margin: 0 0 20px 0; font-size: 14px; color: var(--text-light); line-height: 1.5; min-height: 20px;">
                ${message}
            </p>
            
            <div id="progress-bar-container" style="width: 100%; height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden; margin-bottom: 12px; position: relative;">
                <div id="progress-bar" style="position: absolute; height: 100%; width: 40%; background: linear-gradient(90deg, var(--primary), #f59e0b, var(--primary)); border-radius: 3px; animation: progressSlide 1.5s ease-in-out infinite;"></div>
            </div>
            
            <div id="progress-percent" style="font-size: 12px; color: var(--text-light); font-weight: 600; min-height: 16px;"></div>
            
            <div id="progress-success" style="display: none; margin-top: 16px;">
                <div style="font-size: 56px; margin-bottom: 8px; animation: successPop 0.5s ease;">✅</div>
                <div id="progress-success-message" style="font-size: 14px; color: #10b981; font-weight: 600;"></div>
            </div>
            
            <div id="progress-error" style="display: none; margin-top: 16px;">
                <div style="font-size: 56px; margin-bottom: 8px; animation: errorShake 0.5s ease;">❌</div>
                <div id="progress-error-message" style="font-size: 14px; color: #ef4444; font-weight: 600;"></div>
            </div>
            
            <button onclick="window.ModalModule.closeProgressModal({force: true})" 
                    style="margin-top: 16px; padding: 6px 16px; font-size: 12px; background: transparent; color: var(--text-light); border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer;">
                ✕ Cerrar
            </button>
        </div>
    `;

    document.body.appendChild(modal);
    window._progressModal = modal;
    
    try {
        lockBodyScroll();
    } catch (e) {
        console.warn(`${LOG_PREFIX} Error en lockBodyScroll:`, e);
    }

    console.log(`${LOG_PREFIX} Modal creado y añadido al DOM (gen ${currentGeneration})`);

    // 🆕 v2.0.12: Timeout de seguridad con verificación de generación
    window._progressSafetyTimeout = setTimeout(() => {
        if (currentGeneration !== _progressGeneration) {
            console.log(`${LOG_PREFIX} Safety timeout ignorado (gen cambió: ${currentGeneration} → ${_progressGeneration})`);
            return;
        }
        console.warn(`${LOG_PREFIX} Timeout de seguridad alcanzado (30s). Cerrando automáticamente.`);
        const stillThere = document.getElementById('progress-modal');
        if (stillThere) {
            closeProgressModal({ force: true });
            if (window.showToast) {
                window.showToast('⚠️ La operación tardó demasiado. Modal cerrado por seguridad.', 'warning', 5000);
            }
        }
    }, PROGRESS_SAFETY_TIMEOUT_MS);

    return {
        modal: modal,
        update: (newMessage, newPercent) => updateProgressModal(newMessage, newPercent),
        success: (successMessage) => showProgressSuccess(successMessage),
        error: (errorMessage) => showProgressError(errorMessage),
        close: () => closeProgressModal({ force: true })
    };
}

function updateProgressModal(message, percent = null) {
    const LOG_PREFIX = '⏳ [ProgressModal]';
    
    const messageEl = document.getElementById('progress-message');
    const percentEl = document.getElementById('progress-percent');
    
    if (messageEl && message) {
        messageEl.textContent = message;
    }
    
    if (percentEl && percent !== null) {
        percentEl.textContent = `${percent}%`;
        
        const bar = document.getElementById('progress-bar');
        if (bar) {
            bar.style.animation = 'none';
            bar.style.width = `${percent}%`;
            bar.style.transition = 'width 0.3s ease';
        }
    }
    
    console.log(`${LOG_PREFIX} update: ${message || '(sin cambio)'} ${percent !== null ? percent + '%' : ''} (gen ${_progressGeneration})`);
}

function showProgressSuccess(message = 'Operación completada') {
    const LOG_PREFIX = '⏳ [ProgressModal]';
    console.log(`${LOG_PREFIX} showProgressSuccess(): ${message} (gen ${_progressGeneration})`);
    
    // 🆕 v2.0.12: Cancelar TODOS los timeouts previos (incluidos fallbacks)
    _clearAllProgressTimeouts();
    
    // 🆕 v2.0.12: Marcar que hay un estado final visible
    _progressHasFinalState = true;
    const currentGeneration = _progressGeneration;
    
    const iconEl = document.getElementById('progress-icon');
    const titleEl = document.getElementById('progress-title');
    const messageEl = document.getElementById('progress-message');
    const barContainer = document.getElementById('progress-bar-container');
    const successEl = document.getElementById('progress-success');
    const successMsgEl = document.getElementById('progress-success-message');
    const percentEl = document.getElementById('progress-percent');
    
    if (iconEl) { iconEl.style.animation = 'none'; iconEl.style.display = 'none'; }
    if (titleEl) titleEl.textContent = '✅ Completado';
    if (messageEl) messageEl.style.display = 'none';
    if (barContainer) barContainer.style.display = 'none';
    if (percentEl) percentEl.style.display = 'none';
    if (successEl) successEl.style.display = 'block';
    if (successMsgEl) successMsgEl.textContent = message;
    
    console.log(`${LOG_PREFIX} Estado ✅ visible. Cerrando en ${PROGRESS_SUCCESS_CLOSE_DELAY_MS}ms`);
    
    // 🆕 v2.0.12: Programar cierre ÚNICO con verificación de generación
    _progressCloseTimeoutId = setTimeout(() => {
        if (currentGeneration !== _progressGeneration) {
            console.log(`${LOG_PREFIX} Cierre de success ignorado (gen cambió: ${currentGeneration} → ${_progressGeneration})`);
            return;
        }
        console.log(`${LOG_PREFIX} Cerrando modal tras success (gen ${currentGeneration})`);
        closeProgressModal({ force: true });
    }, PROGRESS_SUCCESS_CLOSE_DELAY_MS);
}

function showProgressError(message = 'Ocurrió un error') {
    const LOG_PREFIX = '⏳ [ProgressModal]';
    console.log(`${LOG_PREFIX} showProgressError(): ${message} (gen ${_progressGeneration})`);
    
    // 🆕 v2.0.12: Cancelar TODOS los timeouts previos (incluidos fallbacks)
    _clearAllProgressTimeouts();
    
    // 🆕 v2.0.12: Marcar que hay un estado final visible
    _progressHasFinalState = true;
    const currentGeneration = _progressGeneration;
    
    const iconEl = document.getElementById('progress-icon');
    const titleEl = document.getElementById('progress-title');
    const messageEl = document.getElementById('progress-message');
    const barContainer = document.getElementById('progress-bar-container');
    const errorEl = document.getElementById('progress-error');
    const errorMsgEl = document.getElementById('progress-error-message');
    const percentEl = document.getElementById('progress-percent');
    
    if (iconEl) { iconEl.style.animation = 'none'; iconEl.style.display = 'none'; }
    if (titleEl) titleEl.textContent = '❌ Error';
    if (messageEl) messageEl.style.display = 'none';
    if (barContainer) barContainer.style.display = 'none';
    if (percentEl) percentEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'block';
    if (errorMsgEl) errorMsgEl.textContent = message;
    
    console.log(`${LOG_PREFIX} Estado ❌ visible. Cerrando en ${PROGRESS_ERROR_CLOSE_DELAY_MS}ms`);
    
    // 🆕 v2.0.12: Programar cierre ÚNICO con verificación de generación
    _progressCloseTimeoutId = setTimeout(() => {
        if (currentGeneration !== _progressGeneration) {
            console.log(`${LOG_PREFIX} Cierre de error ignorado (gen cambió: ${currentGeneration} → ${_progressGeneration})`);
            return;
        }
        console.log(`${LOG_PREFIX} Cerrando modal tras error (gen ${currentGeneration})`);
        closeProgressModal({ force: true });
    }, PROGRESS_ERROR_CLOSE_DELAY_MS);
}

function closeProgressModal(options = {}) {
    const LOG_PREFIX = '⏳ [ProgressModal]';
    const { force = false } = options;
    
    console.log(`${LOG_PREFIX} closeProgressModal() llamado (force: ${force}, hasFinalState: ${_progressHasFinalState}, gen ${_progressGeneration})`);
    
    // 🆕 v2.0.12: Si hay un estado final visible y NO es forzado, respetar el delay
    if (_progressHasFinalState && !force) {
        console.log(`${LOG_PREFIX} Estado final visible, respetando delay. No se cierra ahora.`);
        return;
    }
    
    // 🆕 v2.0.12: Cancelar todos los timeouts pendientes
    _clearAllProgressTimeouts();
    
    const modal = document.getElementById('progress-modal');
    if (!modal) {
        console.log(`${LOG_PREFIX} No hay modal de progreso abierto`);
        try { unlockBodyScroll(); } catch (e) {}
        return;
    }
    
    const currentGeneration = _progressGeneration;
    
    modal.style.animation = 'modalFadeOut 0.25s ease forwards';
    
    // 🆕 v2.0.12: Cierre principal tras fade-out
    _progressCloseTimeoutId = setTimeout(() => {
        if (currentGeneration !== _progressGeneration) {
            console.log(`${LOG_PREFIX} Cierre ignorado (gen cambió)`);
            return;
        }
        const stillThere = document.getElementById('progress-modal');
        if (stillThere && stillThere.parentNode) {
            stillThere.remove();
            window._progressModal = null;
            console.log(`${LOG_PREFIX} Modal eliminado del DOM (gen ${currentGeneration})`);
        }
    }, PROGRESS_FADE_OUT_MS);
    
    // 🆕 v2.0.12: UN SOLO fallback de seguridad (1500ms)
    _progressFallbackTimeouts.push(setTimeout(() => {
        if (currentGeneration !== _progressGeneration) {
            console.log(`${LOG_PREFIX} Fallback ignorado (gen cambió)`);
            return;
        }
        const stillThere = document.getElementById('progress-modal');
        if (stillThere && stillThere.parentNode) {
            stillThere.remove();
            window._progressModal = null;
            console.warn(`${LOG_PREFIX} Modal forzado a cerrar en fallback (gen ${currentGeneration})`);
        }
    }, PROGRESS_FALLBACK_MS));
    
    try {
        unlockBodyScroll();
    } catch (e) {}
    
    try {
        limpiarEstilosResiduales();
    } catch (e) {}
}

// ============================================================
// CIERRE INMEDIATO DEL MODAL ACTUAL
// ============================================================

function closeCurrentModalImmediate() {
    if (!_currentModal) return;
    
    try {
        if (_currentModalTimeoutId) {
            clearTimeout(_currentModalTimeoutId);
            _currentModalTimeoutId = null;
        }
        
        if (_currentModal.parentNode) {
            _currentModal.remove();
        }
        
        _currentModal = null;
        
        window._modalResolve = null;
        window._modalResolved = false;
        
        unlockBodyScroll();
        limpiarEstilosResiduales();
        
    } catch (e) {
        console.warn('⚠️ Error en closeCurrentModalImmediate:', e);
    }
}

// ============================================================
// FUNCIÓN DE CIERRE CON RESOLUCIÓN
// ============================================================

function closeModalAndResolve(value) {
    console.log('📦 Modal: closeModalAndResolve llamado con valor:', value);
    
    if (window._modalResolved) {
        console.log('📦 Modal: ya resuelto, ignorando');
        return;
    }
    
    const resolveFn = window._modalResolve;
    const resolved = value;
    const modalToClose = _currentModal;
    
    window._modalResolved = true;
    
    if (modalToClose) {
        closeModalByReference(modalToClose);
    }
    
    _currentModal = null;
    
    if (resolveFn) {
        console.log('📦 Modal: resolviendo con:', resolved);
        try {
            resolveFn(resolved);
        } catch (e) {
            console.warn('⚠️ Error resolviendo promesa del modal:', e);
        }
        window._modalResolve = null;
    }
    
    unlockBodyScroll();
    limpiarEstilosResiduales();
}

function closeModalByReference(modal) {
    if (!modal || !modal.parentNode) return;
    
    try {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        
        const modalRef = modal;
        
        setTimeout(() => {
            if (modalRef && modalRef.parentNode) {
                modalRef.remove();
            }
        }, 200);
        
        setTimeout(() => {
            if (modalRef && modalRef.parentNode) {
                modalRef.remove();
            }
            limpiarEstilosResiduales();
        }, 500);
        
    } catch (e) {
        console.warn('⚠️ Error en closeModalByReference:', e);
    }
}

// ============================================================
// FUNCIONES INTERNAS DE CREACIÓN
// ============================================================

function createModal(options) {
    const { title, icon, body, footer } = options;

    const huerfanos = document.querySelectorAll('#custom-modal');
    huerfanos.forEach(m => { try { m.remove(); } catch (e) {} });

    const overlay = document.createElement('div');
    overlay.id = 'custom-modal';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: ${MODAL_Z_INDEX};
        padding: 20px;
        animation: modalFadeIn 0.25s ease;
    `;

    if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
            @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes modalSlideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes modalFadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes hourglassFlip { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(180deg); } }
            @keyframes progressSlide { 0% { left: -40%; } 100% { left: 100%; } }
            @keyframes successPop { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
            @keyframes errorShake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }
        `;
        document.head.appendChild(style);
    }

    overlay.addEventListener('click', function(e) {
        if (e.target === this) {
            closeModalAndResolve(false);
        }
    });

    overlay.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 28px 32px; max-width: 440px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <span style="font-size: 28px; font-family: 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif;">${icon || '📌'}</span>
                <h2 style="margin: 0; font-size: 20px; color: var(--text);">${title}</h2>
                <button onclick="window.ModalModule.closeModalAndResolve(false)" style="margin-left: auto; background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px; transition: color 0.2s;" onmouseover="this.style.color='var(--text)'" onmouseout="this.style.color='var(--text-light)'">
                    ✕
                </button>
            </div>
            <div style="margin-bottom: 20px;">
                ${body}
            </div>
            ${footer}
        </div>
    `;

    setTimeout(() => {
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                closeModalAndResolve(false);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }, 50);

    return overlay;
}

function closeModal() {
    closeCurrentModalImmediate();
}

function confirmPromptAndResolve() {
    const input = document.getElementById('modal-input');
    const value = input ? input.value : '';
    closeModalAndResolve(value);
}

// ============================================================
// CERRAR TODOS LOS MODALES
// ============================================================

function cerrarTodosLosModales() {
    const modalesACerrar = [
        'custom-modal',
        'order-modal',
        'order-view-modal',
        'add-product-modal',
        'insumo-modal',
        'recipe-modal',
        'recipe-view-modal',
        'producto-modal',
        'sale-modal',
        'sale-view-modal',
        'expense-modal',
        'expense-view-modal',
        'corriente-modal',
        'horario-detalle-modal',
        'waiting-processing-modal',
        'multi-order-modal',
        'multi-add-product-modal',
        'notifications-modal',
        'help-menu-modal',
        'readme-modal',
        'credits-modal',
        'faq-modal',
        'quickstart-modal',
        'users-modal',
        'delete-selector-modal',
        'sales-report-modal',
        'orders-report-modal',
        'expenses-report-modal',
        'recalcular-modal',
        'compartir-modal',
        'edit-bank-account-modal',
        'bank-accounts-modal',
        'qr-view-modal',
        'tour-overlay',
        'tour-highlight',
        'tour-tooltip',
        'liberated-sale-modal',
        'edit-user-modal',
        'create-user-modal',
        'change-password-modal',
        'ayuda-modal',
        'help-popover',
        'global-cancel-modal',
        'reprogramar-modal',
        'production-diagnostic-modal',
        'dias-sin-ventas-modal',
        'dia-sin-venta-form-modal',
        'produccion-rango-modal',
        'calculo-bloques-modal',
        'waiting-manager-modal',
        'progress-modal'
    ];
    
    let cerrados = 0;
    
    for (const id of modalesACerrar) {
        const modales = document.querySelectorAll(`#${id}`);
        modales.forEach(modal => {
            try {
                modal.remove();
                cerrados++;
            } catch (e) {}
        });
    }
    
    window._modalResolve = null;
    window._modalResolved = false;
    _currentModal = null;
    
    if (window._currentModalTimeoutId) {
        clearTimeout(window._currentModalTimeoutId);
        window._currentModalTimeoutId = null;
    }
    
    // 🆕 v2.0.12: Limpiar timeouts del modal de progreso
    _clearAllProgressTimeouts();
    _progressHasFinalState = false;
    
    _bodyOverflowStack.length = 0;
    if (document.body) {
        document.body.style.overflow = '';
        document.body.classList.remove('modal-open');
    }
    limpiarEstilosResiduales();
    
    console.log(`🔧 cerrarTodosLosModales(): ${cerrados} modales cerrados, stack limpiado, estilos residuales limpiados`);
    
    return cerrados;
}

function cerrarTodosYLimpiar() {
    return cerrarTodosLosModales();
}

// ============================================================
// EXPORTACIÓN
// ============================================================

window.ModalModule = {
    showConfirm,
    showAlert,
    showPrompt,
    showProgressModal,
    updateProgressModal,
    showProgressSuccess,
    showProgressError,
    closeProgressModal,
    closeModal,
    closeModalAndResolve,
    confirmPromptAndResolve,
    cerrarTodosLosModales,
    cerrarTodosYLimpiar,
    limpiarModalesHuerfanos,
    closeCurrentModalImmediate,
    lockBodyScroll,
    unlockBodyScroll,
    limpiarEstilosResiduales,
    startStyleCleanupWatchers,
    stopStyleCleanupWatchers
};

// Para compatibilidad con código existente
window.customConfirm = showConfirm;
window.customAlert = showAlert;
window.customPrompt = showPrompt;
window.showProgressModal = showProgressModal;
window.updateProgressModal = updateProgressModal;
window.closeProgressModal = closeProgressModal;
window.cerrarTodosLosModales = cerrarTodosLosModales;
window.cerrarTodosYLimpiar = cerrarTodosYLimpiar;
window.limpiarModalesHuerfanos = limpiarModalesHuerfanos;

window.lockBodyScroll = lockBodyScroll;
window.unlockBodyScroll = unlockBodyScroll;
window.limpiarEstilosResiduales = limpiarEstilosResiduales;

window.startStyleCleanupWatchers = startStyleCleanupWatchers;
window.stopStyleCleanupWatchers = stopStyleCleanupWatchers;

console.log('📦 Modal Module v2.0.12 (CORRECCIÓN #8: race condition del modal de progreso RESUELTA)');
console.log('   🆕 Novedades v2.0.12:');
console.log('      • Sistema de "generación" del modal de progreso');
console.log('      • _clearAllProgressTimeouts() cancela TODOS los timeouts pendientes');
console.log('      • showProgressSuccess/Error() cancelan timeouts previos');
console.log('      • closeProgressModal({force: true}) para cierre forzado');
console.log('      • _progressHasFinalState evita cierre prematuro');
console.log('      • Un solo fallback de seguridad (1500ms)');
console.log('      • Logs de diagnóstico con número de generación');
console.log('   ✅ Watchers de limpieza activos:');
console.log('      • visibilitychange, pageshow, resize, orientationchange, focus, scroll');