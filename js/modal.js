// ============================================================
// 📦 MODAL MODULE - Panario (Modales personalizados + progreso)
// CORREGIDO FASE A.2 (170926):
//   - z-index elevado a 9999999999 (superior a ui-orders.js)
//   - closeModalAndResolve() ahora fuerza el cierre limpio
//   - closeProgressModal() con timeout de seguridad
//   - createModal() cierra con tecla Escape
//   - Nueva función cerrarTodosLosModales() para casos de bloqueo
// CORREGIDO FASE A.3 (170926 v2):
//   - showProgressModal() ahora tiene AUTO-CIERRE DE SEGURIDAD a los 30s
//   - Si nadie llama a success/error/close en 30s, se cierra solo
//   - Se puede cancelar el auto-cierre llamando a success/error/close
// ============================================================

window.ModalModule = {};

// ============================================================
// CONSTANTES
// ============================================================

const MODAL_Z_INDEX = 9999999999;       // Superior a cualquier modal de módulo
const PROGRESS_Z_INDEX = 9999999999;    // Superior a cualquier modal de módulo
const PROGRESS_SAFETY_TIMEOUT_MS = 30000; // 30 segundos

// ============================================================
// FUNCIONES PRINCIPALES
// ============================================================

/**
 * Muestra un modal de confirmación
 */
function showConfirm(options) {
    return new Promise((resolve) => {
        console.log('📦 Modal: showConfirm llamado', options);
        
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
    });
}

/**
 * Muestra un modal de alerta
 */
function showAlert(options) {
    return new Promise((resolve) => {
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
    });
}

/**
 * Muestra un modal de prompt (para entrada de texto)
 */
function showPrompt(options) {
    return new Promise((resolve) => {
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
// 🆕 MODAL DE PROGRESO (CON RELOJ DE ARENA)
// CORREGIDO FASE A.3: añadido AUTO-CIERRE DE SEGURIDAD
// ============================================================

function showProgressModal(options = {}) {
    const {
        title = 'Procesando',
        message = 'Por favor, espera...',
        icon = '⏳'
    } = options;

    const existing = document.getElementById('progress-modal');
    if (existing) existing.remove();

    // 🔧 FASE A.3: Limpiar timeout anterior si existe
    if (window._progressSafetyTimeout) {
        clearTimeout(window._progressSafetyTimeout);
        window._progressSafetyTimeout = null;
    }

    const modal = document.createElement('div');
    modal.id = 'progress-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: ${PROGRESS_Z_INDEX};
        padding: 20px;
        animation: modalFadeIn 0.25s ease;
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
            
            <div style="width: 100%; height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden; margin-bottom: 12px; position: relative;">
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
            
            <button onclick="window.ModalModule.closeProgressModal()" 
                    style="margin-top: 16px; padding: 6px 16px; font-size: 12px; background: transparent; color: var(--text-light); border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer;">
                ✕ Cerrar
            </button>
        </div>
    `;

    document.body.appendChild(modal);
    window._progressModal = modal;

    // 🔧 FASE A.3: AUTO-CIERRE DE SEGURIDAD a los 30 segundos
    // Si nadie llama a success/error/close, se cierra solo para no bloquear la app
    window._progressSafetyTimeout = setTimeout(() => {
        console.warn('⚠️ Progress modal: timeout de seguridad alcanzado (30s). Cerrando automáticamente.');
        const stillThere = document.getElementById('progress-modal');
        if (stillThere) {
            closeProgressModal();
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
        close: () => closeProgressModal()
    };
}

function updateProgressModal(message, percent = null) {
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
}

function showProgressSuccess(message = 'Operación completada') {
    // 🔧 FASE A.3: Cancelar el timeout de seguridad
    if (window._progressSafetyTimeout) {
        clearTimeout(window._progressSafetyTimeout);
        window._progressSafetyTimeout = null;
    }
    
    const iconEl = document.getElementById('progress-icon');
    const titleEl = document.getElementById('progress-title');
    const messageEl = document.getElementById('progress-message');
    const barContainer = document.querySelector('#progress-modal > div > div[style*="height: 6px"]');
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
    
    setTimeout(() => {
        closeProgressModal();
    }, 2500);
}

function showProgressError(message = 'Ocurrió un error') {
    // 🔧 FASE A.3: Cancelar el timeout de seguridad
    if (window._progressSafetyTimeout) {
        clearTimeout(window._progressSafetyTimeout);
        window._progressSafetyTimeout = null;
    }
    
    const iconEl = document.getElementById('progress-icon');
    const titleEl = document.getElementById('progress-title');
    const messageEl = document.getElementById('progress-message');
    const barContainer = document.querySelector('#progress-modal > div > div[style*="height: 6px"]');
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
    
    setTimeout(() => {
        closeProgressModal();
    }, 3000);
}

/**
 * Cierra el modal de progreso.
 * CORREGIDO: añadido timeout de seguridad para forzar el cierre.
 */
function closeProgressModal() {
    // 🔧 FASE A.3: Cancelar el timeout de seguridad
    if (window._progressSafetyTimeout) {
        clearTimeout(window._progressSafetyTimeout);
        window._progressSafetyTimeout = null;
    }
    
    const modal = document.getElementById('progress-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.25s ease forwards';
        
        // 🔧 FIX: Timeout de seguridad por si la animación falla
        setTimeout(() => {
            if (modal.parentNode) modal.remove();
            window._progressModal = null;
        }, 250);
        
        // 🔧 FIX: Forzar remoción tras 1s por si algo se quedó colgado
        setTimeout(() => {
            const stillThere = document.getElementById('progress-modal');
            if (stillThere && stillThere.parentNode) {
                stillThere.remove();
                window._progressModal = null;
                console.warn('⚠️ Progress modal forzado a cerrar (timeout seguridad)');
            }
        }, 1000);
    }
}

// ============================================================
// 🆕 CERRAR TODOS LOS MODALES (para casos de bloqueo)
// ============================================================

/**
 * Cierra TODOS los modales abiertos de la app.
 * Útil cuando la UI se queda bloqueada con modales fantasma.
 * 
 * NO cierra el progress modal (ese se cierra solo).
 * NO resuelve promesas pendientes (las deja colgadas intencionalmente
 * para que el siguiente showConfirm no se confunda).
 */
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
        'tour-tooltip'
    ];
    
    let cerrados = 0;
    
    for (const id of modalesACerrar) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (modal.parentNode) modal.remove();
            }, 200);
            // Forzar remoción inmediata también
            setTimeout(() => {
                const still = document.getElementById(id);
                if (still && still.parentNode) still.remove();
            }, 400);
            cerrados++;
        }
    }
    
    // Limpiar el estado de resolución de promesas
    window._modalResolve = null;
    window._modalResolved = false;
    
    console.log(`🔧 cerrarTodosLosModales(): ${cerrados} modales cerrados`);
    
    return cerrados;
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
    
    window._modalResolved = true;
    
    closeModal();
    
    if (resolveFn) {
        console.log('📦 Modal: resolviendo con:', resolved);
        try {
            resolveFn(resolved);
        } catch (e) {
            console.warn('⚠️ Error resolviendo promesa del modal:', e);
        }
        window._modalResolve = null;
    } else {
        console.log('📦 Modal: no hay función resolve');
    }
}

// ============================================================
// FUNCIONES INTERNAS DE CREACIÓN Y CIERRE
// ============================================================

function createModal(options) {
    const { title, icon, body, footer } = options;

    const existing = document.getElementById('custom-modal');
    if (existing) existing.remove();

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

    // 🔧 FIX: Cerrar con Escape
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
    const modal = document.getElementById('custom-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 200);
        
        // 🔧 FIX: Timeout de seguridad
        setTimeout(() => {
            const still = document.getElementById('custom-modal');
            if (still && still.parentNode) still.remove();
        }, 500);
    }
}

function confirmPromptAndResolve() {
    const input = document.getElementById('modal-input');
    const value = input ? input.value : '';
    closeModalAndResolve(value);
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
    cerrarTodosLosModales  // 🆕
};

// Para compatibilidad con código existente
window.customConfirm = showConfirm;
window.customAlert = showAlert;
window.customPrompt = showPrompt;
window.showProgressModal = showProgressModal;
window.updateProgressModal = updateProgressModal;
window.closeProgressModal = closeProgressModal;
window.cerrarTodosLosModales = cerrarTodosLosModales;  // 🆕

console.log('📦 Modal Module cargado correctamente v6 (FASE A.3: auto-cierre 30s en progress)');