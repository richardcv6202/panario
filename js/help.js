// ============================================================
// 📦 HELP MODULE - Panario (Sistema de Ayuda y Tutorial)
// v2.2.9 (250926): VERSIÓN FINAL CON 315+ FAQs LITERALES
//   - ✅ CORRECCIÓN #5: Ayuda detallada NO cierra la app
//   - ✅ CORRECCIÓN #12: Ayuda como módulo controlado vía postMessage
//   - ✅ CORRECCIÓN #16: Eliminar botón X flotante de la ayuda
//   - ✅ Listener de CLOSE_HELP robusto con cerrarAyudaModal()
//   - ✅ Listener de Escape detecta modal abierto
//   - ✅ 315+ FAQs literales (sin resumir) organizadas por categorías
//   - ✅ Nuevos grupos de FAQs para v2.2.9 (correcciones 230926)
// ============================================================

window.HelpModule = {};

// ============================================================
// Z-INDEX MÁXIMO PARA MODALES DE AYUDA
// ============================================================

const HELP_MODAL_Z_INDEX = 2147483647;
const HELP_POPOVER_Z_INDEX = 2147483646;
const IFRAME_LOAD_TIMEOUT_MS = 8000;

// ============================================================
// ESTADO GLOBAL DEL BLOQUEO DE LA APP
// ============================================================

let _helpAppBlockState = null;

// ============================================================
// RUTA DEL AVATAR DEL DESARROLLADOR
// ============================================================

const DEV_AVATAR_PATH = './assets/dev-avatar.png';
const DEV_AVATAR_FALLBACK_EMOJI = '👨‍💻';

// ============================================================
// CONFIGURACIÓN DEL TOUR
// ============================================================

const TOUR_STEPS = [
    { target: '#stat-total-sales', title: '📊 Dashboard', content: 'Aquí puedes ver todas las estadísticas clave de tu negocio: ventas, ingresos, gastos y ganancias.', position: 'bottom' },
    { target: '.nav-item[data-section="orders"]', title: '📋 Pedidos', content: 'Gestiona todos tus pedidos y reservas. Puedes crear nuevos pedidos y cambiar su estado.', position: 'top' },
    { target: '.nav-item[data-section="insumos"]', title: '🛒 Insumos', content: 'Controla tu inventario: harina, levadura, yogur y todos los insumos que usas para producir.', position: 'top' },
    { target: '.nav-item[data-section="recipes"]', title: '📖 Recetas', content: 'Crea y gestiona tus recetas (fórmulas). Asocia insumos y calcula costos automáticamente.', position: 'top' },
    { target: '.nav-item[data-section="productos"]', title: '🏷️ Productos', content: 'Define los productos que vendes. Cada producto puede tener una receta asociada.', position: 'top' },
    { target: '.nav-item[data-section="sales"]', title: '💰 Ventas', content: 'Registra tus ventas y gastos. El stock se descuenta automáticamente al vender.', position: 'top' },
    { target: '.nav-item[data-section="settings"]', title: '⚙️ Herramientas', content: 'Configura tu negocio, exporta/importa datos, gestiona horarios de corriente y más.', position: 'top' },
    { target: '#notification-bell', title: '🔔 Notificaciones', content: 'Recibe alertas de pedidos pendientes, deudas y recordatorios importantes.', position: 'bottom' }
];

// ============================================================
// VARIABLES DE ESTADO
// ============================================================

let currentStep = 0;
let isTourActive = false;
let tourOverlay = null;
let tourTooltip = null;
let tourHighlight = null;

let _helpPopover = null;
let _helpPopoverAnchor = null;
let _helpPopoverOutsideClickHandler = null;
let _helpPopoverEscHandler = null;

let _ayudaModalState = null;

// ============================================================
// DETECCIÓN DE MÓVIL
// ============================================================

function isMobileDevice() {
    try {
        const ua = navigator.userAgent || navigator.vendor || window.opera || '';
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
        if (mobileRegex.test(ua)) return true;
        const isSmallScreen = window.innerWidth < 768;
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const isCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        return isSmallScreen && (isTouchDevice || isCoarsePointer);
    } catch (e) {
        console.warn('⚠️ Error detectando dispositivo móvil:', e);
        return window.innerWidth < 768;
    }
}
window.isMobileDevice = isMobileDevice;

// ============================================================
// BLOQUEAR LA APP (ocultar header + bottom-nav + inert)
// ============================================================

function _bloquearAppMientrasAyuda() {
    try {
        if (_helpAppBlockState) return;
        const appScreen = document.getElementById('appScreen');
        const header = appScreen ? appScreen.querySelector('header') : document.querySelector('#appScreen > header');
        const bottomNav = document.querySelector('.bottom-nav');
        _helpAppBlockState = {
            appScreen: appScreen,
            appScreenOriginalVisibility: appScreen ? appScreen.style.visibility : '',
            header: header,
            headerOriginalVisibility: header ? header.style.visibility : '',
            bottomNav: bottomNav,
            bottomNavOriginalVisibility: bottomNav ? bottomNav.style.visibility : ''
        };
        if (header) header.style.setProperty('visibility', 'hidden', 'important');
        if (bottomNav) bottomNav.style.setProperty('visibility', 'hidden', 'important');
        if (appScreen && typeof appScreen.inert !== 'undefined') {
            try { appScreen.inert = true; } catch (e) {}
        }
        console.log('🔒 [help] App bloqueada visualmente (header + bottom-nav ocultos, inert activado)');
    } catch (e) {
        console.warn('⚠️ [help] Error en _bloquearAppMientrasAyuda:', e);
    }
}

function _restaurarAppTrasAyuda() {
    try {
        if (!_helpAppBlockState) return;
        const { appScreen, appScreenOriginalVisibility, header, headerOriginalVisibility, bottomNav, bottomNavOriginalVisibility } = _helpAppBlockState;
        if (header) {
            if (headerOriginalVisibility) header.style.visibility = headerOriginalVisibility;
            else header.style.removeProperty('visibility');
        }
        if (bottomNav) {
            if (bottomNavOriginalVisibility) bottomNav.style.visibility = bottomNavOriginalVisibility;
            else bottomNav.style.removeProperty('visibility');
        }
        if (appScreen) {
            try { appScreen.inert = false; } catch (e) {}
            if (appScreenOriginalVisibility) appScreen.style.visibility = appScreenOriginalVisibility;
            else appScreen.style.removeProperty('visibility');
        }
        _helpAppBlockState = null;
        console.log('🔓 [help] App restaurada tras cerrar el modal de ayuda');
    } catch (e) {
        console.warn('⚠️ [help] Error en _restaurarAppTrasAyuda:', e);
    }
}

// ============================================================
// HELPER PARA FORZAR MODALES AL FRENTE
// ============================================================

function forzarModalAlFrente(modal) {
    if (!modal) return;
    try {
        if (modal.parentNode !== document.body || document.body.lastChild !== modal) {
            document.body.appendChild(modal);
        }
        modal.style.setProperty('position', 'fixed', 'important');
        modal.style.setProperty('top', '0', 'important');
        modal.style.setProperty('left', '0', 'important');
        modal.style.setProperty('right', '0', 'important');
        modal.style.setProperty('bottom', '0', 'important');
        modal.style.setProperty('z-index', String(HELP_MODAL_Z_INDEX), 'important');
        modal.style.setProperty('isolation', 'isolate', 'important');
        console.log('🔝 Modal forzado al frente con z-index:', HELP_MODAL_Z_INDEX);
    } catch (e) {
        console.warn('⚠️ Error forzando modal al frente:', e);
    }
}

// ============================================================
// ABRIR AYUDA DETALLADA
// ============================================================

function abrirAyudaDetallada() {
    try {
        cerrarPopoverAyuda();
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        const activeNav = document.querySelector('.nav-item.active');
        let section = 'intro';
        if (activeNav && activeNav.dataset && activeNav.dataset.section) section = activeNav.dataset.section;
        const sectionMap = {
            'dashboard': 'dashboard', 'orders': 'orders', 'insumos': 'insumos',
            'recipes': 'recipes', 'productos': 'productos', 'sales': 'sales',
            'settings': 'settings', 'profile': 'profile', 'corriente': 'corriente',
            'produccion': 'produccion', 'rewards': 'rewards', 'notifications': 'notifications'
        };
        const helpSection = sectionMap[section] || 'intro';
        const baseUrl = `./ayuda-panario.html?theme=${encodeURIComponent(theme)}&section=${encodeURIComponent(helpSection)}`;
        const embeddedUrl = `${baseUrl}&embedded=1`;
        const isMobile = isMobileDevice();
        console.log('📖 Abriendo ayuda detallada:', { theme, section: helpSection, isMobile, baseUrl });
        if (isMobile) {
            console.log('📱 Dispositivo móvil detectado → abriendo en pestaña nueva');
            try {
                const win = window.open(baseUrl, '_blank', 'noopener,noreferrer');
                if (!win) {
                    console.warn('⚠️ Popup bloqueado, abriendo en misma pestaña');
                    window.location.href = baseUrl;
                } else {
                    window.showToast('📖 Abriendo ayuda en nueva pestaña...', 'info', 2500);
                }
            } catch (e) {
                console.warn('⚠️ Error abriendo en pestaña nueva, fallback a misma pestaña:', e);
                window.location.href = baseUrl;
            }
            return;
        }
        console.log('💻 Desktop detectado → abriendo en modal');
        abrirAyudaEnModal(embeddedUrl, theme, baseUrl);
    } catch (e) {
        console.warn('⚠️ Error abriendo ayuda detallada:', e);
        if (window.showToast) window.showToast('❌ No se pudo abrir la ayuda detallada', 'error', 4000);
    }
}

// ============================================================
// ABRIR AYUDA EN MODAL
// ============================================================

function abrirAyudaEnModal(embeddedUrl, theme = 'light', baseUrl = null) {
    if (!baseUrl) baseUrl = embeddedUrl.replace('&embedded=1', '');
    const existing = document.getElementById('ayuda-modal');
    if (existing) existing.remove();
    const isMobile = isMobileDevice();
    const modalWidth = isMobile ? '100vw' : '95vw';
    const modalHeight = isMobile ? '100vh' : '95vh';
    const modalRadius = isMobile ? '0' : '16px';
    const modal = document.createElement('div');
    modal.id = 'ayuda-modal';
    modal.style.setProperty('position', 'fixed', 'important');
    modal.style.setProperty('top', '0', 'important');
    modal.style.setProperty('left', '0', 'important');
    modal.style.setProperty('right', '0', 'important');
    modal.style.setProperty('bottom', '0', 'important');
    modal.style.setProperty('width', '100vw', 'important');
    modal.style.setProperty('height', '100vh', 'important');
    modal.style.setProperty('background', 'rgba(0,0,0,0.85)', 'important');
    modal.style.setProperty('backdrop-filter', 'blur(8px)', 'important');
    modal.style.setProperty('-webkit-backdrop-filter', 'blur(8px)', 'important');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('align-items', 'center', 'important');
    modal.style.setProperty('justify-content', 'center', 'important');
    modal.style.setProperty('z-index', String(HELP_MODAL_Z_INDEX), 'important');
    modal.style.setProperty('padding', isMobile ? '0' : '20px', 'important');
    modal.style.setProperty('animation', 'ayudaModalFadeIn 0.25s ease', 'important');
    modal.style.setProperty('overflow', 'hidden', 'important');
    modal.style.setProperty('pointer-events', 'auto', 'important');
    modal.style.setProperty('isolation', 'isolate', 'important');
    modal.style.setProperty('overscroll-behavior', 'contain', 'important');
    if (!document.getElementById('ayuda-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'ayuda-modal-styles';
        style.textContent = `
            @keyframes ayudaModalFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes ayudaModalSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes ayudaModalFadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes ayudaSpinner { to { transform: rotate(360deg); } }
            #ayuda-modal iframe { border: none; display: block; width: 100%; height: 100%; background: #fdf6e3; }
            [data-theme="dark"] #ayuda-modal iframe { background: #0d0d0d; }
            #ayuda-modal, #ayuda-modal * { box-sizing: border-box; }
        `;
        document.head.appendChild(style);
    }
    modal.innerHTML = `
        <div id="ayuda-modal-container" onclick="event.stopPropagation();" style="background: var(--bg-card, #fff); border-radius: ${modalRadius}; width: ${modalWidth}; height: ${modalHeight}; max-width: 1600px; max-height: 1200px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: ayudaModalSlideUp 0.3s ease; border: 1px solid var(--border-color, #e0d5c0); position: relative; z-index: 1; pointer-events: auto;">
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid var(--border-color, #e0d5c0); background: var(--bg-card, #fff); flex-shrink: 0; flex-wrap: wrap;" onclick="event.stopPropagation();">
                <span style="font-size: 22px;">📖</span>
                <div style="flex: 1; min-width: 120px;">
                    <div style="font-weight: 700; font-size: 15px; color: var(--text, #2d2d2d);">Ayuda detallada</div>
                    <div style="font-size: 11px; color: var(--text-light, #666); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${embeddedUrl.split('?')[0]}</div>
                </div>
                <a href="${baseUrl}" target="_blank" rel="noopener noreferrer" class="btn secondary" onclick="event.stopPropagation();" style="padding: 6px 12px; font-size: 12px; width: auto; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;" title="Abrir en pestaña nueva">🔗 ↗</a>
                <button onclick="event.stopPropagation(); imprimirAyudaIframe();" class="btn secondary" style="padding: 6px 12px; font-size: 12px; width: auto;" title="Imprimir / Guardar PDF">🖨️</button>
                <button onclick="event.stopPropagation(); cerrarAyudaModal();" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light, #666); padding: 4px 8px; line-height: 1; border-radius: 6px; transition: background 0.2s;" onmouseover="this.style.background='var(--bg, #fdf6e3)'" onmouseout="this.style.background='transparent'" title="Cerrar (Escape)">✕</button>
            </div>
            <div style="flex: 1; position: relative; overflow: hidden;">
                <div id="ayuda-modal-loading" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px; background: var(--bg, #fdf6e3); z-index: 1;">
                    <div style="width: 40px; height: 40px; border: 4px solid var(--primary, #f5a623); border-top-color: transparent; border-radius: 50%; animation: ayudaSpinner 0.8s linear infinite;"></div>
                    <div style="font-size: 13px; color: var(--text-light, #666);">Cargando ayuda...</div>
                    <div style="font-size: 11px; color: var(--text-light, #666); text-align: center; max-width: 300px; margin-top: 8px;">Si no carga en unos segundos, se abrirá en una pestaña nueva automáticamente.</div>
                </div>
                <iframe id="ayuda-modal-iframe" src="${embeddedUrl}" title="Ayuda detallada de Panario" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals" allow="clipboard-read; clipboard-write" style="width: 100%; height: 100%; border: none; display: block; position: relative; z-index: 2; opacity: 0; transition: opacity 0.3s ease;"></iframe>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    forzarModalAlFrente(modal);
    _bloquearAppMientrasAyuda();
    if (typeof window.lockBodyScroll === 'function') {
        window.lockBodyScroll();
    } else {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window._ayudaModalPrevOverflow = prevOverflow;
    }
    const iframe = document.getElementById('ayuda-modal-iframe');
    const loading = document.getElementById('ayuda-modal-loading');
    let iframeLoaded = false;
    let fallbackTriggered = false;
    if (iframe) {
        iframe.addEventListener('load', function() {
            iframeLoaded = true;
            setTimeout(() => {
                if (loading) loading.style.display = 'none';
                iframe.style.opacity = '1';
                console.log('📖 Ayuda cargada en modal');
                setTimeout(() => forzarModalAlFrente(modal), 100);
            }, 200);
        });
        iframe.addEventListener('error', function(e) {
            console.warn('⚠️ Error cargando iframe de ayuda:', e);
            if (!fallbackTriggered) {
                fallbackTriggered = true;
                ofrecerFallbackPestanaNueva(baseUrl, 'No se pudo cargar la ayuda en modal.');
            }
        });
        setTimeout(() => {
            if (!iframeLoaded && !fallbackTriggered) {
                console.warn(`⚠️ Timeout de iframe (${IFRAME_LOAD_TIMEOUT_MS}ms) — ofreciendo fallback`);
                fallbackTriggered = true;
                if (loading && loading.style.display !== 'none') {
                    loading.style.display = 'none';
                    iframe.style.opacity = '1';
                }
                ofrecerFallbackPestanaNueva(baseUrl, 'La ayuda tardó demasiado en cargar.');
            }
        }, IFRAME_LOAD_TIMEOUT_MS);
    }
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            e.stopPropagation();
            cerrarAyudaModal();
        }
    });
    modal.addEventListener('mousedown', function(e) { e.stopPropagation(); });
    modal.addEventListener('mouseup', function(e) { e.stopPropagation(); });
    modal.addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive: true });
    modal.addEventListener('touchend', function(e) { e.stopPropagation(); }, { passive: true });
    modal.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
    modal.addEventListener('wheel', function(e) { e.stopPropagation(); }, { passive: true });
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            e.stopPropagation();
            cerrarAyudaModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    window._ayudaModalState = { escHandler };
    console.log('📖 Modal de ayuda abierto con URL:', embeddedUrl);
    console.log('🔒 App bloqueada visualmente (header + bottom-nav ocultos)');
}

// ============================================================
// OFRECER FALLBACK A PESTAÑA NUEVA
// ============================================================

function ofrecerFallbackPestanaNueva(baseUrl, mensaje) {
    console.log('🔗 Ofreciendo fallback a pestaña nueva:', mensaje);
    const container = document.getElementById('ayuda-modal-container');
    if (!container) return;
    const fallbackId = 'ayuda-modal-fallback';
    let fallback = document.getElementById(fallbackId);
    if (!fallback) {
        fallback = document.createElement('div');
        fallback.id = fallbackId;
        fallback.style.cssText = `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--bg-card, #fff); border-radius: 16px; padding: 24px 28px; max-width: 400px; width: calc(100% - 40px); text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.4); border: 2px solid var(--primary, #f5a623); z-index: 10;`;
        fallback.innerHTML = `
            <div style="font-size: 56px; margin-bottom: 12px;">🔗</div>
            <h3 style="margin: 0 0 8px 0; font-size: 17px; color: var(--text, #2d2d2d);">Abrir en pestaña nueva</h3>
            <p style="font-size: 13px; color: var(--text-light, #666); margin-bottom: 16px; line-height: 1.5;">${mensaje || 'No se pudo cargar la ayuda en modal.'}<br>Ábrela en una pestaña nueva para verla correctamente.</p>
            <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                <a href="${baseUrl}" target="_blank" rel="noopener noreferrer" class="btn primary" style="padding: 10px 20px; font-size: 14px; width: auto; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; background: var(--primary, #f5a623); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">🔗 Abrir ayuda</a>
                <button onclick="event.stopPropagation(); cerrarAyudaModal()" class="btn secondary" style="padding: 10px 20px; font-size: 14px; width: auto; background: transparent; color: var(--text, #2d2d2d); border: 2px solid var(--border-color, #e0d5c0); border-radius: 8px; cursor: pointer; font-weight: 600;">❌ Cerrar</button>
            </div>
        `;
        const iframeWrapper = container.querySelector('div[style*="flex: 1"]');
        if (iframeWrapper) {
            iframeWrapper.style.position = 'relative';
            iframeWrapper.appendChild(fallback);
        } else {
            container.appendChild(fallback);
        }
    }
}

// ============================================================
// CERRAR AYUDA MODAL
// ============================================================

function cerrarAyudaModal() {
    const modal = document.getElementById('ayuda-modal');
    if (!modal) return;
    console.log('📖 [CORRECCIÓN #5] cerrarAyudaModal() llamado');
    modal.style.animation = 'ayudaModalFadeOut 0.2s ease forwards';
    setTimeout(() => {
        if (modal.parentNode) modal.remove();
        if (window._ayudaModalState) {
            if (window._ayudaModalState.escHandler) {
                document.removeEventListener('keydown', window._ayudaModalState.escHandler);
            }
            window._ayudaModalState = null;
        }
        _restaurarAppTrasAyuda();
        if (typeof window.unlockBodyScroll === 'function') {
            window.unlockBodyScroll();
        } else if (window._ayudaModalPrevOverflow !== undefined) {
            document.body.style.overflow = window._ayudaModalPrevOverflow || '';
            delete window._ayudaModalPrevOverflow;
        }
        if (typeof window.limpiarEstilosResiduales === 'function') {
            setTimeout(() => { window.limpiarEstilosResiduales(); }, 50);
        }
        console.log('📖 Modal de ayuda cerrado + app restaurada + estilos residuales limpiados');
    }, 200);
}

function imprimirAyudaIframe() {
    try {
        const iframe = document.getElementById('ayuda-modal-iframe');
        if (!iframe || !iframe.contentWindow) {
            window.showToast('⚠️ La ayuda aún no está lista', 'warning', 3000);
            return;
        }
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    } catch (e) {
        console.warn('⚠️ Error imprimiendo ayuda:', e);
        window.showToast('❌ No se pudo imprimir la ayuda', 'error', 4000);
    }
}

window.abrirAyudaDetallada = abrirAyudaDetallada;
window.abrirAyudaEnModal = abrirAyudaEnModal;
window.cerrarAyudaModal = cerrarAyudaModal;
window.imprimirAyudaIframe = imprimirAyudaIframe;
window.forzarModalAlFrente = forzarModalAlFrente;
window.ofrecerFallbackPestanaNueva = ofrecerFallbackPestanaNueva;
window._bloquearAppMientrasAyuda = _bloquearAppMientrasAyuda;
window._restaurarAppTrasAyuda = _restaurarAppTrasAyuda;

// ============================================================
// POPOVER DEL CENTRO DE AYUDA
// ============================================================

function mostrarPopoverAyuda(anchorElement = null) {
    cerrarPopoverAyuda();
    const anchor = anchorElement || document.getElementById('help-button');
    if (!anchor) {
        console.warn('⚠️ No se encontró el botón de ayuda (#help-button)');
        return _mostrarHelpMenuFallback();
    }
    _helpPopoverAnchor = anchor;
    const popover = document.createElement('div');
    popover.id = 'help-popover';
    popover.setAttribute('role', 'menu');
    popover.setAttribute('aria-label', 'Centro de Ayuda');
    popover.style.setProperty('position', 'fixed', 'important');
    popover.style.setProperty('z-index', String(HELP_POPOVER_Z_INDEX), 'important');
    popover.style.setProperty('background', 'var(--bg-card, #fff)', 'important');
    popover.style.setProperty('border-radius', '12px', 'important');
    popover.style.setProperty('box-shadow', '0 10px 40px rgba(0,0,0,0.25)', 'important');
    popover.style.setProperty('border', '1px solid var(--border-color, #e0d5c0)', 'important');
    popover.style.setProperty('min-width', '260px', 'important');
    popover.style.setProperty('max-width', '300px', 'important');
    popover.style.setProperty('overflow', 'hidden', 'important');
    popover.style.setProperty('animation', 'helpPopoverFadeIn 0.15s ease', 'important');
    popover.innerHTML = `
        <div style="padding: 10px 14px; border-bottom: 1px solid var(--border-color); background: linear-gradient(135deg, #f59e0b10 0%, #f59e0b05 100%);">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">❓</span>
                <div>
                    <div style="font-weight: 700; font-size: 14px; color: var(--text);">Centro de Ayuda</div>
                    <div style="font-size: 10px; color: var(--text-light); margin-top: 1px;">Elige una opción</div>
                </div>
            </div>
        </div>
        <div style="padding: 6px; max-height: 70vh; overflow-y: auto;">
            <button class="help-popover-item" data-action="quickstart" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; background: none; cursor: pointer; border-radius: 8px; text-align: left; font-family: inherit; transition: background 0.15s; color: var(--text);">
                <span style="font-size: 20px; flex-shrink: 0;">🚀</span>
                <div style="flex: 1; min-width: 0;"><div style="font-weight: 600; font-size: 13px;">Guía Rápida de Inicio</div><div style="font-size: 11px; color: var(--text-light);">5 pasos para empezar</div></div>
                <span style="font-size: 12px; color: var(--text-light); flex-shrink: 0;">▶</span>
            </button>
            <button class="help-popover-item" data-action="tour" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; background: none; cursor: pointer; border-radius: 8px; text-align: left; font-family: inherit; transition: background 0.15s; color: var(--text);">
                <span style="font-size: 20px; flex-shrink: 0;">🎯</span>
                <div style="flex: 1; min-width: 0;"><div style="font-weight: 600; font-size: 13px;">Tutorial Interactivo</div><div style="font-size: 11px; color: var(--text-light);">Recorrido guiado</div></div>
                <span style="font-size: 12px; color: var(--text-light); flex-shrink: 0;">▶</span>
            </button>
            <button class="help-popover-item" data-action="faq" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; background: none; cursor: pointer; border-radius: 8px; text-align: left; font-family: inherit; transition: background 0.15s; color: var(--text);">
                <span style="font-size: 20px; flex-shrink: 0;">❓</span>
                <div style="flex: 1; min-width: 0;"><div style="font-weight: 600; font-size: 13px;">Preguntas Frecuentes</div><div style="font-size: 11px; color: var(--text-light);">${FAQS_DB.length} respuestas</div></div>
                <span style="font-size: 12px; color: var(--text-light); flex-shrink: 0;">▶</span>
            </button>
            <button class="help-popover-item" data-action="detailed" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; background: none; cursor: pointer; border-radius: 8px; text-align: left; font-family: inherit; transition: background 0.15s; color: var(--text);">
                <span style="font-size: 20px; flex-shrink: 0;">📖</span>
                <div style="flex: 1; min-width: 0;"><div style="font-weight: 600; font-size: 13px;">Ayuda Detallada</div><div style="font-size: 11px; color: var(--text-light);">Manual completo</div></div>
                <span style="font-size: 12px; color: var(--text-light); flex-shrink: 0;">▶</span>
            </button>
            <div style="border-top: 1px solid var(--border-color); margin: 4px 8px;"></div>
            <button class="help-popover-item" data-action="readme" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; background: none; cursor: pointer; border-radius: 8px; text-align: left; font-family: inherit; transition: background 0.15s; color: var(--text);">
                <span style="font-size: 20px; flex-shrink: 0;">📘</span>
                <div style="flex: 1; min-width: 0;"><div style="font-weight: 600; font-size: 13px;">Léeme</div><div style="font-size: 11px; color: var(--text-light);">Info del proyecto</div></div>
                <span style="font-size: 12px; color: var(--text-light); flex-shrink: 0;">▶</span>
            </button>
            <button class="help-popover-item" data-action="credits" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; background: none; cursor: pointer; border-radius: 8px; text-align: left; font-family: inherit; transition: background 0.15s; color: var(--text);">
                <span style="font-size: 20px; flex-shrink: 0;">👨‍💻</span>
                <div style="flex: 1; min-width: 0;"><div style="font-weight: 600; font-size: 13px;">Créditos</div><div style="font-size: 11px; color: var(--text-light);">Desarrollador</div></div>
                <span style="font-size: 12px; color: var(--text-light); flex-shrink: 0;">▶</span>
            </button>
        </div>
    `;
    if (!document.getElementById('help-popover-styles')) {
        const style = document.createElement('style');
        style.id = 'help-popover-styles';
        style.textContent = `
            @keyframes helpPopoverFadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes helpPopoverFadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-8px); } }
            .help-popover-item:hover { background: var(--bg) !important; }
            .help-popover-item:active { transform: scale(0.98); }
            @media (max-width: 600px) {
                #help-popover { top: 60px !important; right: 10px !important; left: auto !important; bottom: auto !important; min-width: 240px !important; max-width: calc(100vw - 20px) !important; max-height: calc(100vh - 80px) !important; }
            }
        `;
        document.head.appendChild(style);
    }
    document.body.appendChild(popover);
    _helpPopover = popover;
    _posicionarPopoverAyuda(anchor, popover);
    const repositionHandler = () => _posicionarPopoverAyuda(anchor, popover);
    window.addEventListener('resize', repositionHandler);
    window.addEventListener('scroll', repositionHandler, true);
    _helpPopover._repositionHandler = repositionHandler;
    popover.querySelectorAll('.help-popover-item').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const action = this.dataset.action;
            cerrarPopoverAyuda();
            setTimeout(() => {
                switch (action) {
                    case 'quickstart': showQuickStartGuide(); break;
                    case 'tour': startTour(); break;
                    case 'faq': showFAQModal(); break;
                    case 'detailed': abrirAyudaDetallada(); break;
                    case 'readme': showReadmeModal(); break;
                    case 'credits': showCreditsModal(); break;
                    default: console.warn('⚠️ Acción de ayuda no reconocida:', action);
                }
            }, 100);
        });
    });
    _helpPopoverOutsideClickHandler = function(e) {
        if (!_helpPopover) return;
        const isInsidePopover = _helpPopover.contains(e.target);
        const isAnchor = anchor && anchor.contains(e.target);
        if (!isInsidePopover && !isAnchor) cerrarPopoverAyuda();
    };
    setTimeout(() => {
        document.addEventListener('click', _helpPopoverOutsideClickHandler, true);
    }, 50);
    _helpPopoverEscHandler = function(e) {
        if (e.key === 'Escape') cerrarPopoverAyuda();
    };
    document.addEventListener('keydown', _helpPopoverEscHandler);
    if (anchor) {
        anchor.style.background = 'var(--primary-light)';
        anchor.style.borderRadius = '8px';
    }
    console.log('❓ Popover de ayuda abierto');
}

function _posicionarPopoverAyuda(anchor, popover) {
    if (!anchor || !popover) return;
    try {
        const rect = anchor.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();
        const isMobile = window.innerWidth < 600;
        if (isMobile) return;
        const margin = 8;
        const popoverWidth = popoverRect.width || 260;
        const popoverHeight = popoverRect.height || 350;
        let top = rect.bottom + margin;
        if (top + popoverHeight > window.innerHeight - 10) top = rect.top - popoverHeight - margin;
        if (top < 10) top = 10;
        let left = rect.right - popoverWidth;
        if (left < 10) left = 10;
        if (left + popoverWidth > window.innerWidth - 10) left = window.innerWidth - popoverWidth - 10;
        popover.style.setProperty('top', top + 'px', 'important');
        popover.style.setProperty('left', left + 'px', 'important');
        popover.style.setProperty('right', 'auto', 'important');
        popover.style.setProperty('bottom', 'auto', 'important');
    } catch (e) {
        console.warn('⚠️ Error posicionando popover:', e);
        popover.style.setProperty('top', '70px', 'important');
        popover.style.setProperty('right', '20px', 'important');
        popover.style.setProperty('left', 'auto', 'important');
    }
}

function cerrarPopoverAyuda() {
    if (!_helpPopover) {
        if (_helpPopoverOutsideClickHandler) {
            document.removeEventListener('click', _helpPopoverOutsideClickHandler, true);
            _helpPopoverOutsideClickHandler = null;
        }
        if (_helpPopoverEscHandler) {
            document.removeEventListener('keydown', _helpPopoverEscHandler);
            _helpPopoverEscHandler = null;
        }
        return;
    }
    const popover = _helpPopover;
    popover.style.animation = 'helpPopoverFadeOut 0.15s ease forwards';
    if (_helpPopoverOutsideClickHandler) {
        document.removeEventListener('click', _helpPopoverOutsideClickHandler, true);
        _helpPopoverOutsideClickHandler = null;
    }
    if (_helpPopoverEscHandler) {
        document.removeEventListener('keydown', _helpPopoverEscHandler);
        _helpPopoverEscHandler = null;
    }
    if (popover._repositionHandler) {
        window.removeEventListener('resize', popover._repositionHandler);
        window.removeEventListener('scroll', popover._repositionHandler, true);
        popover._repositionHandler = null;
    }
    if (_helpPopoverAnchor) {
        _helpPopoverAnchor.style.background = '';
        _helpPopoverAnchor.style.borderRadius = '';
    }
    setTimeout(() => {
        if (popover.parentNode) popover.remove();
    }, 150);
    _helpPopover = null;
    _helpPopoverAnchor = null;
    console.log('❓ Popover de ayuda cerrado');
}

function _mostrarHelpMenuFallback() {
    console.warn('⚠️ Usando fallback: modal clásico de Centro de Ayuda');
    const existingModal = document.getElementById('help-menu-modal');
    if (existingModal) existingModal.remove();
    const modal = document.createElement('div');
    modal.id = 'help-menu-modal';
    modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: ${HELP_MODAL_Z_INDEX}; padding: 20px; animation: modalFadeIn 0.25s ease;`;
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 420px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px;"><span style="font-size: 28px;">❓</span><h2 style="margin: 0; font-size: 18px;">Centro de Ayuda</h2></div>
                <button onclick="closeHelpMenuFallback()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <button onclick="closeHelpMenuFallback(); showQuickStartGuide();" class="btn primary" style="padding: 10px; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; text-align: left;">🚀 Guía Rápida</button>
                <button onclick="closeHelpMenuFallback(); startTour();" class="btn primary" style="padding: 10px; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; text-align: left;">🎯 Tutorial</button>
                <button onclick="closeHelpMenuFallback(); showFAQModal();" class="btn primary" style="padding: 10px; background: #3b82f6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; text-align: left;">❓ Preguntas Frecuentes</button>
                <button onclick="closeHelpMenuFallback(); abrirAyudaDetallada();" class="btn primary" style="padding: 10px; background: #10b981; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; text-align: left;">📖 Ayuda Detallada</button>
                <button onclick="closeHelpMenuFallback(); showReadmeModal();" class="btn primary" style="padding: 10px; background: #0ea5e9; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; text-align: left;">📘 Léeme</button>
                <button onclick="closeHelpMenuFallback(); showCreditsModal();" class="btn primary" style="padding: 10px; background: #ec4899; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; text-align: left;">👨‍💻 Créditos</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    forzarModalAlFrente(modal);
    if (typeof window.lockBodyScroll === 'function') window.lockBodyScroll();
    else document.body.style.overflow = 'hidden';
    window.closeHelpMenuFallback = function() {
        const m = document.getElementById('help-menu-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (m.parentNode) m.remove();
                if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
                if (typeof window.limpiarEstilosResiduales === 'function') window.limpiarEstilosResiduales();
            }, 200);
        }
    };
    modal.addEventListener('click', function(e) { if (e.target === this) closeHelpMenuFallback(); });
}

function showHelpMenu() { mostrarPopoverAyuda(); }

// ============================================================
// MODAL LÉEME
// ============================================================

function showReadmeModal() {
    const existingModal = document.getElementById('readme-modal');
    if (existingModal) existingModal.remove();
    const modal = document.createElement('div');
    modal.id = 'readme-modal';
    modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: ${HELP_MODAL_Z_INDEX}; padding: 20px; animation: modalFadeIn 0.25s ease;`;
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #10b981;">
                <div style="display: flex; align-items: center; gap: 10px;"><span style="font-size: 28px;">📘</span><h2 style="margin: 0; font-size: 18px; color: #10b981;">Léeme</h2></div>
                <button onclick="closeReadmeModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            <div style="font-size: 14px; line-height: 1.7; color: var(--text);">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 64px;">🍞</div>
                    <h3 style="margin: 8px 0 4px 0; color: var(--primary); font-size: 22px;">Panario</h3>
                    <p style="color: var(--text-light); font-size: 13px; margin: 0;">Tu panadería en orden</p>
                </div>
                <h4 style="margin: 16px 0 8px 0; color: var(--text);">📋 Descripción</h4>
                <p style="color: var(--text-light); font-size: 13px;">Panario es una aplicación PWA (Progressive Web App) diseñada específicamente para la gestión integral de una panadería artesanal. Funciona completamente offline y todos tus datos se guardan localmente en tu dispositivo.</p>
                <h4 style="margin: 16px 0 8px 0; color: var(--text);">✨ Características principales</h4>
                <ul style="color: var(--text-light); font-size: 13px; padding-left: 20px; margin: 0;">
                    <li>🛒 <strong>Insumos:</strong> Control de compras, stock y costos</li>
                    <li>📖 <strong>Recetas:</strong> Fórmulas de producción con insumos</li>
                    <li>🏷️ <strong>Productos:</strong> Artículos para la venta con precios</li>
                    <li>💰 <strong>Ventas:</strong> Registro con descuento automático de stock</li>
                    <li>📋 <strong>Pedidos:</strong> Reservas y pedidos personalizados</li>
                    <li>⏰ <strong>Lista de espera:</strong> Gestión de clientes en cola</li>
                    <li>📊 <strong>Dashboard:</strong> Estadísticas y análisis del negocio</li>
                    <li>⚡ <strong>Corriente:</strong> Planificación según horarios eléctricos</li>
                    <li>🔨 <strong>Producción:</strong> Programación con algoritmo inteligente</li>
                    <li>🏭 <strong>CMPBC:</strong> Capacidad Máxima por Bloque</li>
                    <li>🏆 <strong>Premios:</strong> Sistema de fidelización</li>
                    <li>📅 <strong>Días sin ventas:</strong> Registro de inactividad</li>
                    <li>👥 <strong>Multiusuario:</strong> Varios usuarios por negocio</li>
                </ul>
                <h4 style="margin: 16px 0 8px 0; color: var(--text);">📱 Información técnica</h4>
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: var(--text-light);">Versión:</span><strong>2.2.9</strong></div>
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: var(--text-light);">Estado:</span><strong style="color: #10b981;">✅ Producción</strong></div>
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: var(--text-light);">Arquitectura:</span><strong>Cliente local (SQLite WASM)</strong></div>
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: var(--text-light);">Tecnología:</span><strong>HTML5 + CSS3 + JS (ES6+)</strong></div>
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: var(--text-light);">Persistencia:</span><strong>SQLite + localStorage</strong></div>
                </div>
                <h4 style="margin: 16px 0 8px 0; color: var(--text);">💾 Privacidad y seguridad</h4>
                <p style="color: var(--text-light); font-size: 13px;">✅ Todos tus datos se guardan <strong>localmente en tu dispositivo</strong>.<br>✅ No se envía información a ningún servidor externo.<br>✅ Puedes hacer copias de seguridad desde <strong>Herramientas</strong>.<br>✅ Funciona 100% offline.</p>
                <h4 style="margin: 16px 0 8px 0; color: var(--text);">🚀 Primeros pasos</h4>
                <ol style="color: var(--text-light); font-size: 13px; padding-left: 20px; margin: 0;">
                    <li>Registra tus <strong>insumos</strong> (harina, levadura, etc.)</li>
                    <li>Crea tus <strong>recetas</strong> asociando insumos</li>
                    <li>Define tus <strong>productos</strong> para la venta</li>
                    <li>Registra tus <strong>ventas</strong> y pedidos</li>
                    <li>Consulta el <strong>Dashboard</strong> para ver tus estadísticas</li>
                </ol>
            </div>
            <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-color); display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="closeReadmeModal(); abrirAyudaDetallada();" class="btn primary" style="flex: 1; padding: 10px 16px; font-size: 13px; background: #10b981; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">📖 Ver ayuda detallada</button>
                <button onclick="closeReadmeModal()" class="btn primary" style="flex: 1; padding: 10px 16px; font-size: 13px; background: #10b981; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Entendido</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    forzarModalAlFrente(modal);
    if (typeof window.lockBodyScroll === 'function') window.lockBodyScroll();
    window.closeReadmeModal = function() {
        const m = document.getElementById('readme-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (m.parentNode) m.remove();
                if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
                if (typeof window.limpiarEstilosResiduales === 'function') window.limpiarEstilosResiduales();
            }, 200);
        }
    };
    modal.addEventListener('click', function(e) { if (e.target === this) closeReadmeModal(); });
    const escHandler = function(e) { if (e.key === 'Escape') { closeReadmeModal(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
}

// ============================================================
// MODAL CRÉDITOS
// ============================================================

function showCreditsModal() {
    const existingModal = document.getElementById('credits-modal');
    if (existingModal) existingModal.remove();
    const modal = document.createElement('div');
    modal.id = 'credits-modal';
    modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: ${HELP_MODAL_Z_INDEX}; padding: 20px; animation: modalFadeIn 0.25s ease;`;
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 28px 24px; max-width: 420px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color); text-align: center;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 10px;"><span style="font-size: 28px;">👨‍💻</span><h2 style="margin: 0; font-size: 18px; color: #0ea5e9;">Créditos</h2></div>
                <button onclick="closeCreditsModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            <div style="margin-bottom: 20px;">
                <div id="dev-avatar-container" style="width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); display: inline-flex; align-items: center; justify-content: center; font-size: 48px; margin-bottom: 12px; overflow: hidden; border: 3px solid var(--primary);">
                    <img src="${DEV_AVATAR_PATH}" alt="Foto del desarrollador" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.style.display='none'; this.parentElement.innerHTML='${DEV_AVATAR_FALLBACK_EMOJI}'; this.parentElement.style.fontSize='48px';">
                </div>
                <h3 style="margin: 0; font-size: 20px; color: var(--text);">Ricardo Castillo Valdés</h3>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-light);">Desarrollador y Diseñador</p>
            </div>
            <div style="background: var(--bg); border-radius: 10px; padding: 16px; margin-bottom: 16px; text-align: left;">
                <div style="font-size: 12px; font-weight: 600; color: var(--text-label); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">📞 Información de contacto</div>
                <a href="https://wa.me/5355031725" target="_blank" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg-card); border-radius: 8px; text-decoration: none; color: var(--text); margin-bottom: 8px; border: 1px solid var(--border-color);">
                    <span style="font-size: 20px;">💬</span>
                    <div style="flex: 1;"><div style="font-size: 11px; color: var(--text-light);">WhatsApp</div><div style="font-size: 14px; font-weight: 600;">+53 55031725</div></div>
                    <span style="font-size: 14px; color: var(--primary);">→</span>
                </a>
                <a href="mailto:3sayricardo@gmail.com" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg-card); border-radius: 8px; text-decoration: none; color: var(--text); border: 1px solid var(--border-color);">
                    <span style="font-size: 20px;">📧</span>
                    <div style="flex: 1;"><div style="font-size: 11px; color: var(--text-light);">Email</div><div style="font-size: 14px; font-weight: 600; word-break: break-all;">3sayricardo@gmail.com</div></div>
                    <span style="font-size: 14px; color: var(--primary);">→</span>
                </a>
            </div>
            <div style="background: linear-gradient(135deg, #0ea5e915 0%, #0284c715 100%); border: 1px solid #0ea5e9; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
                <div style="font-size: 13px; font-weight: 600; color: #0ea5e9; margin-bottom: 4px;">🍞 Panario v2.2.9</div>
                <div style="font-size: 12px; color: var(--text-light);">"Tu panadería en orden"</div>
                <div style="font-size: 11px; color: var(--text-light); margin-top: 8px;">© 2026 Ricardo Castillo Valdés<br>Todos los derechos reservados</div>
            </div>
            <div style="font-size: 11px; color: var(--text-light); line-height: 1.6; margin-bottom: 16px;">Hecho con ❤️ para panaderos artesanales<br>Desarrollado en Cuba 🇨🇺</div>
            <button onclick="closeCreditsModal()" class="btn primary" style="padding: 10px 24px; font-size: 14px; width: auto; background: #0ea5e9; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Cerrar</button>
        </div>
    `;
    document.body.appendChild(modal);
    forzarModalAlFrente(modal);
    if (typeof window.lockBodyScroll === 'function') window.lockBodyScroll();
    window.closeCreditsModal = function() {
        const m = document.getElementById('credits-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (m.parentNode) m.remove();
                if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
                if (typeof window.limpiarEstilosResiduales === 'function') window.limpiarEstilosResiduales();
            }, 200);
        }
    };
    modal.addEventListener('click', function(e) { if (e.target === this) closeCreditsModal(); });
    const escHandler = function(e) { if (e.key === 'Escape') { closeCreditsModal(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
}

// ============================================================
// TOUR INTERACTIVO
// ============================================================

async function startTour() {
    if (isTourActive) return;
    const tourCompleted = localStorage.getItem('panario_tour_completed');
    if (tourCompleted === 'true') {
        const restart = await window.ModalModule.showConfirm({
            title: '🎯 Tutorial interactivo',
            message: 'Ya completaste el tutorial antes.\n\n¿Quieres volver a verlo?',
            confirmText: '✅ Sí, verlo',
            cancelText: '❌ No, cerrar',
            icon: '🎯',
            confirmColor: '#f59e0b'
        });
        if (!restart) return;
    }
    isTourActive = true;
    currentStep = 0;
    createOverlay();
    showStep(currentStep);
}

function createOverlay() {
    removeOverlay();
    tourOverlay = document.createElement('div');
    tourOverlay.id = 'tour-overlay';
    tourOverlay.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 2147483640; pointer-events: none; animation: modalFadeIn 0.3s ease;`;
    tourHighlight = document.createElement('div');
    tourHighlight.id = 'tour-highlight';
    tourHighlight.style.cssText = `position: fixed; border: 3px solid #f5a623; border-radius: 12px; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5); z-index: 2147483641; pointer-events: none; transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94); background: transparent;`;
    tourTooltip = document.createElement('div');
    tourTooltip.id = 'tour-tooltip';
    tourTooltip.style.cssText = `position: fixed; background: var(--bg-card); color: var(--text); border-radius: var(--radius); padding: 20px 24px; max-width: 340px; width: 90%; z-index: 2147483642; box-shadow: 0 20px 60px rgba(0,0,0,0.3); border: 1px solid var(--border-color); pointer-events: auto; animation: modalSlideUp 0.3s ease; font-size: 14px;`;
    document.body.appendChild(tourOverlay);
    document.body.appendChild(tourHighlight);
    document.body.appendChild(tourTooltip);
}

function showStep(index) {
    if (index >= TOUR_STEPS.length) { completeTour(); return; }
    const step = TOUR_STEPS[index];
    const target = document.querySelector(step.target);
    if (!target) { currentStep++; showStep(currentStep); return; }
    const rect = target.getBoundingClientRect();
    const padding = 12;
    tourHighlight.style.top = (rect.top - padding) + 'px';
    tourHighlight.style.left = (rect.left - padding) + 'px';
    tourHighlight.style.width = (rect.width + padding * 2) + 'px';
    tourHighlight.style.height = (rect.height + padding * 2) + 'px';
    tourHighlight.style.display = 'block';
    let tooltipTop, tooltipLeft;
    const tooltipWidth = Math.min(340, window.innerWidth - 40);
    const tooltipHeight = 200;
    const position = step.position || 'bottom';
    switch (position) {
        case 'bottom': tooltipTop = rect.bottom + 16; tooltipLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2); break;
        case 'top': tooltipTop = rect.top - tooltipHeight - 16; tooltipLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2); break;
        case 'left': tooltipTop = rect.top + (rect.height / 2) - (tooltipHeight / 2); tooltipLeft = rect.left - tooltipWidth - 16; break;
        case 'right': tooltipTop = rect.top + (rect.height / 2) - (tooltipHeight / 2); tooltipLeft = rect.right + 16; break;
        default: tooltipTop = rect.bottom + 16; tooltipLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);
    }
    if (tooltipTop + tooltipHeight > window.innerHeight - 20) tooltipTop = rect.top - tooltipHeight - 16;
    if (tooltipTop < 20) tooltipTop = 20;
    if (tooltipLeft < 20) tooltipLeft = 20;
    if (tooltipLeft + tooltipWidth > window.innerWidth - 20) tooltipLeft = window.innerWidth - tooltipWidth - 20;
    const isFirst = index === 0;
    const isLast = index === TOUR_STEPS.length - 1;
    tourTooltip.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 700; font-size: 16px; color: var(--primary);">${step.title}</span>
            <span style="font-size: 12px; color: var(--text-light);">${index + 1} / ${TOUR_STEPS.length}</span>
        </div>
        <p style="margin: 0 0 16px 0; line-height: 1.6; color: var(--text);">${step.content}</p>
        <div style="display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
            ${!isFirst ? `<button onclick="window.HelpModule.tourPrev()" class="btn secondary" style="padding: 6px 16px; font-size: 12px; width: auto;">◀ Anterior</button>` : ''}
            ${isLast ? `<button onclick="window.HelpModule.tourComplete()" class="btn primary" style="padding: 6px 16px; font-size: 12px; width: auto; background: #10b981; color: #fff; border: none; border-radius: 6px; cursor: pointer;">✅ Finalizar</button>` : `<button onclick="window.HelpModule.tourNext()" class="btn primary" style="padding: 6px 16px; font-size: 12px; width: auto; background: var(--primary); color: #fff; border: none; border-radius: 6px; cursor: pointer;">Siguiente ▶</button>`}
            <button onclick="window.HelpModule.tourSkip()" class="btn secondary" style="padding: 6px 16px; font-size: 12px; width: auto; color: #94a3b8; border-color: #94a3b8;">✕ Cerrar</button>
        </div>
    `;
    tourTooltip.style.top = tooltipTop + 'px';
    tourTooltip.style.left = tooltipLeft + 'px';
    tourTooltip.style.display = 'block';
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function tourNext() {
    if (currentStep < TOUR_STEPS.length - 1) { currentStep++; showStep(currentStep); }
    else completeTour();
}
function tourPrev() {
    if (currentStep > 0) { currentStep--; showStep(currentStep); }
}
async function tourSkip() {
    const confirmSkip = await window.ModalModule.showConfirm({
        title: '🎯 Cerrar tutorial',
        message: '¿Seguro que quieres cerrar el tutorial?\n\nPuedes volver a abrirlo desde el menú de Ayuda.',
        confirmText: '✅ Sí, cerrar',
        cancelText: '❌ Continuar tutorial',
        icon: '🎯',
        confirmColor: '#94a3b8'
    });
    if (confirmSkip) {
        removeOverlay();
        isTourActive = false;
        window.showToast('Tutorial cerrado. Puedes volver a abrirlo desde Ayuda.', 'info', 3000);
    }
}
function tourComplete() {
    localStorage.setItem('panario_tour_completed', 'true');
    removeOverlay();
    isTourActive = false;
    window.showToast('✅ ¡Tutorial completado!', 'success', 3000);
}
function removeOverlay() {
    const elements = ['tour-overlay', 'tour-highlight', 'tour-tooltip'];
    for (const id of elements) { const el = document.getElementById(id); if (el) el.remove(); }
}
function showContextualHelp(section) {
    const helpMessages = {
        'dashboard': '📊 El dashboard muestra todas las estadísticas clave de tu negocio. Puedes personalizar qué secciones ver desde tu Perfil.',
        'orders': '📋 Gestiona pedidos, reservas y lista de espera. Cambia estados y crea ventas automáticamente al entregar.',
        'insumos': '🛒 Controla tu inventario. Registra compras, costos y stock mínimo. Los insumos se descuentan al vender.',
        'recipes': '📖 Crea y gestiona recetas. Asocia insumos para calcular costos automáticamente. Puedes recalcular y compartir.',
        'productos': '🏷️ Define los productos que vendes. Cada producto puede tener una receta asociada y un CMPBC.',
        'sales': '💰 Registra ventas y gastos. El stock se descuenta automáticamente. Puedes gestionar deudas y ventas liberadas.',
        'settings': '⚙️ Configura tu negocio, exporta/importa datos, gestiona horarios de corriente y más.',
        'profile': '👤 Edita tu perfil, cambia tema, gestiona cuentas bancarias y configura tu Dashboard.'
    };
    const message = helpMessages[section] || 'ℹ️ Esta sección te ayuda a gestionar tu panadería.';
    window.showToast('💡 ' + message, 'info', 5000);
}

// ============================================================
// GUÍA RÁPIDA DE INICIO
// ============================================================

function showQuickStartGuide() {
    const existingModal = document.getElementById('quickstart-modal');
    if (existingModal) existingModal.remove();
    const modal = document.createElement('div');
    modal.id = 'quickstart-modal';
    modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: ${HELP_MODAL_Z_INDEX}; padding: 20px; animation: modalFadeIn 0.25s ease;`;
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 10px;"><span style="font-size: 28px;">🚀</span><h2 style="margin: 0; font-size: 18px; color: #8b5cf6;">Guía rápida de inicio</h2></div>
                <button onclick="closeQuickStartGuide()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="background: var(--bg); padding: 12px 16px; border-radius: 8px; border-left: 4px solid #f5a623;">
                    <div style="font-weight: 600; font-size: 14px;">📝 Paso 1: Registrar insumos</div>
                    <div style="font-size: 13px; color: var(--text-light); margin-top: 2px;">Ve a 🛒 Insumos y registra todo lo que compras: harina, levadura, yogur, etc.</div>
                </div>
                <div style="background: var(--bg); padding: 12px 16px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
                    <div style="font-weight: 600; font-size: 14px;">📖 Paso 2: Crear recetas</div>
                    <div style="font-size: 13px; color: var(--text-light); margin-top: 2px;">Ve a 📖 Recetas y crea tus fórmulas asociando los insumos que necesitas.</div>
                </div>
                <div style="background: var(--bg); padding: 12px 16px; border-radius: 8px; border-left: 4px solid #10b981;">
                    <div style="font-weight: 600; font-size: 14px;">🏷️ Paso 3: Crear productos</div>
                    <div style="font-size: 13px; color: var(--text-light); margin-top: 2px;">Ve a 🏷️ Productos y define lo que vendes. Opcionalmente define su CMPBC.</div>
                </div>
                <div style="background: var(--bg); padding: 12px 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                    <div style="font-weight: 600; font-size: 14px;">💰 Paso 4: Registrar ventas</div>
                    <div style="font-size: 13px; color: var(--text-light); margin-top: 2px;">Ve a 💰 Ventas y registra tus transacciones. El stock se descuenta automáticamente.</div>
                </div>
                <div style="background: var(--bg); padding: 12px 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    <div style="font-weight: 600; font-size: 14px;">📋 Paso 5: Gestionar pedidos</div>
                    <div style="font-size: 13px; color: var(--text-light); margin-top: 2px;">Ve a 📋 Pedidos para gestionar reservas, lista de espera y entregas.</div>
                </div>
            </div>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color); display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="closeQuickStartGuide(); startTour();" class="btn primary" style="padding: 8px 16px; font-size: 13px; width: auto; flex: 1; background: #8b5cf6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">🎯 Ver tutorial interactivo</button>
                <button onclick="closeQuickStartGuide()" class="btn secondary" style="padding: 8px 16px; font-size: 13px; width: auto; flex: 1;">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    forzarModalAlFrente(modal);
    if (typeof window.lockBodyScroll === 'function') window.lockBodyScroll();
    window.closeQuickStartGuide = function() {
        const m = document.getElementById('quickstart-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (m.parentNode) m.remove();
                if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
                if (typeof window.limpiarEstilosResiduales === 'function') window.limpiarEstilosResiduales();
            }, 200);
        }
    };
    modal.addEventListener('click', function(e) { if (e.target === this) closeQuickStartGuide(); });
}

function initHelpButton() {
    const profileCard = document.querySelector('#mainContent .card');
    if (!profileCard) return;
    const bankButton = profileCard.querySelector('button[onclick*="showBankAccountsModal"]');
    if (bankButton) {
        const helpContainer = document.createElement('div');
        helpContainer.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;';
        helpContainer.innerHTML = `
            <button onclick="window.HelpModule.showQuickStartGuide()" class="btn secondary" style="max-width: 100%; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; padding: 10px; cursor: pointer; font-weight: 600;">🚀 Guía rápida de inicio</button>
            <button onclick="window.HelpModule.startTour()" class="btn secondary" style="max-width: 100%; background: #f59e0b; color: #fff; border: none; border-radius: 8px; padding: 10px; cursor: pointer; font-weight: 600;">🎯 Tutorial interactivo</button>
            <button onclick="window.HelpModule.showFAQModal()" class="btn secondary" style="max-width: 100%; background: #3b82f6; color: #fff; border: none; border-radius: 8px; padding: 10px; cursor: pointer; font-weight: 600;">❓ Preguntas frecuentes (FAQ)</button>
        `;
        bankButton.parentNode.insertBefore(helpContainer, bankButton);
    }
}

// ============================================================
// BASE DE DATOS DE FAQs — 315+ PREGUNTAS LITERALES
// ============================================================

const FAQS_DB = [
    // 🏠 SECCIÓN 1: GENERALES (P1-P10)
    { cat: '🏠 Generales', q: '¿Qué es Panario?', a: 'Es una aplicación PWA para la gestión integral de una panadería artesanal. Permite gestionar insumos, recetas, productos, ventas, pedidos y finanzas.' },
    { cat: '🏠 Generales', q: '¿Funciona sin conexión?', a: 'Sí, Panario funciona completamente offline. Todos tus datos están guardados localmente en tu dispositivo.' },
    { cat: '🏠 Generales', q: '¿Dónde se guardan mis datos?', a: 'En SQLite (base de datos local) y localStorage. Todo queda en tu dispositivo. Nada se envía a servidores externos.' },
    { cat: '🏠 Generales', q: '¿Cómo hago una copia de seguridad?', a: 'Ve a ⚙️ Herramientas y haz clic en "📥 Descargar copia de seguridad". Se descarga un archivo .db con todos tus datos.' },
    { cat: '🏠 Generales', q: '¿Cómo restauro una copia de seguridad?', a: 'En ⚙️ Herramientas, haz clic en "📤 Importar copia de seguridad" y selecciona el archivo .db. Se reemplazarán todos los datos actuales.' },
    { cat: '🏠 Generales', q: '¿Puedo exportar solo recetas y productos?', a: 'Sí. En Herramientas usa "🧩 Salva diferencial" para exportar/importar solo las recetas y productos, sin afectar al resto de la base de datos.' },
    { cat: '🏠 Generales', q: '¿Qué navegadores soporta Panario?', a: 'Chrome, Firefox, Edge, Safari (versiones recientes). Se recomienda Chrome para mejor rendimiento.' },
    { cat: '🏠 Generales', q: '¿Cómo instalo Panario en mi móvil?', a: 'Abre Panario en el navegador y usa "Añadir a pantalla de inicio" o "Instalar aplicación".' },
    { cat: '🏠 Generales', q: '¿Quién desarrolló Panario?', a: 'Panario fue desarrollado por Ricardo Castillo Valdés. Puedes contactarlo por WhatsApp (+53 55031725) o email (3sayricardo@gmail.com).' },
    { cat: '🏠 Generales', q: '¿Por qué no suenan las notificaciones?', a: 'Los navegadores modernos bloquean el audio hasta que el usuario interactúa con la página. Haz clic en cualquier parte de la app y las notificaciones sonarán desde ese momento.' },

    // 📊 SECCIÓN 2: DASHBOARD (P11-P21)
    { cat: '📊 Dashboard', q: '¿Puedo personalizar qué veo en el Dashboard?', a: 'Sí. Ve a tu Perfil y en la sección "📊 Elementos visibles en el Dashboard" activa o desactiva las secciones que quieres ver.' },
    { cat: '📊 Dashboard', q: '¿Qué significa "Días con ventas"?', a: 'Es el número de días únicos en los que registraste al menos una venta. No cuenta días sin actividad.' },
    { cat: '📊 Dashboard', q: '¿Cómo se calcula el "Promedio diario"?', a: 'Se divide el total de ingresos entre los días con ventas. Ej: si vendiste $1000 en 5 días, el promedio es $200/día.' },
    { cat: '📊 Dashboard', q: '¿Qué es "Clientes diferentes"?', a: 'Es la cantidad de clientes únicos que han comprado al menos una vez. No cuenta clientes repetidos.' },
    { cat: '📊 Dashboard', q: '¿Por qué los pedidos pendientes no aparecen como deudas?', a: 'Porque un pedido es una solicitud, no una venta ejecutada. Solo se considera deuda cuando se ha completado la venta y el cliente no ha pagado.' },
    { cat: '📊 Dashboard', q: '¿Cómo funcionan las flechas ◀▶ del gráfico?', a: 'Permiten navegar entre semanas. ◀ va a semanas anteriores, ▶ vuelve a la semana actual.' },
    { cat: '📊 Dashboard', q: '¿Qué significan los colores del gráfico?', a: '🥇 Verde = día con mayor venta de la semana. 📉 Rojo = día con menor venta. ⭐ Amarillo = día actual.' },
    { cat: '📊 Dashboard', q: '¿Qué es el "modo del gráfico"?', a: 'Es la forma en que se agrupan los días. Puedes elegir "Últimos 7 días", "Semana Dom-Sáb" o "Semana Lun-Dom". Tu elección se guarda automáticamente.' },
    { cat: '📊 Dashboard', q: '¿Qué son las "Ventas liberadas"?', a: 'Son ventas sin cliente identificado (tipo "mostrador anónimo"). Se contabilizan en los totales pero se pueden ocultar del listado.' },
    { cat: '📊 Dashboard', q: '¿Qué es el "Mejor día" y el "Peor día"?', a: 'Son las fechas con mayor y menor facturación histórica de tu negocio. Sirven para identificar patrones de venta.' },
    { cat: '📊 Dashboard', q: '¿Qué son las "Ventas por empleado"?', a: 'Es un ranking de los usuarios de tu negocio según sus ventas registradas. Te permite evaluar el desempeño del equipo.' },

    // 🛒 SECCIÓN 3: INSUMOS (P22-P27)
    { cat: '🛒 Insumos', q: '¿Qué es un insumo?', a: 'Es todo lo que compras para producir: harina, levadura, yogur, mantequilla, etc.' },
    { cat: '🛒 Insumos', q: '¿Cómo registro un insumo?', a: 'Ve a 🛒 Insumos → clic en "➕ Nuevo Insumo". Completa nombre, unidad, costo, stock y stock mínimo.' },
    { cat: '🛒 Insumos', q: '¿Los insumos se descuentan automáticamente?', a: 'Sí. Al vender un producto o confirmar un pedido, el stock de los insumos se descuenta según la receta asociada.' },
    { cat: '🛒 Insumos', q: '¿Qué es el stock mínimo?', a: 'Es la cantidad mínima que debe tener un insumo. Cuando el stock baja de ese nivel, aparece una alerta roja.' },
    { cat: '🛒 Insumos', q: '¿Puedo eliminar un insumo?', a: 'Sí, pero se aplica soft-delete. Puedes limpiarlo permanentemente desde Herramientas.' },
    { cat: '🛒 Insumos', q: '¿Los usuarios no-admin pueden editar insumos?', a: 'No. Solo los administradores pueden crear, editar o eliminar insumos. Los usuarios regulares tienen modo solo lectura.' },

    // 📖 SECCIÓN 4: RECETAS (P28-P36)
    { cat: '📖 Recetas', q: '¿Qué es una receta?', a: 'Es la fórmula de producción que indica qué insumos se necesitan y en qué cantidad. Ej: "Pan de Yogur" con harina, levadura y yogur.' },
    { cat: '📖 Recetas', q: '¿Cómo se calcula el costo de una receta?', a: 'La suma de (cantidad × costo_unitario) de todos los insumos asociados.' },
    { cat: '📖 Recetas', q: '¿Qué hace el botón "🔄 Recalcular"?', a: 'Permite ajustar una receta para un nuevo rendimiento usando regla de 3. Ej: receta para 33 panes → quiero 50 panes.' },
    { cat: '📖 Recetas', q: '¿Cómo comparto una receta?', a: 'En la vista de detalle de la receta, clic en "💬 Compartir". Puedes enviarla por WhatsApp, Messenger, Email o copiarla al portapapeles. Solo admin.' },
    { cat: '📖 Recetas', q: '¿Puedo duplicar una receta?', a: 'Sí. En la lista de recetas, clic en "📋 Duplicar". Se creará una copia con el nombre que elijas. Solo admin.' },
    { cat: '📖 Recetas', q: '¿Qué significa "receta compartida"?', a: 'Es una receta que otros usuarios del mismo negocio pueden ver y usar como plantilla.' },
    { cat: '📖 Recetas', q: '¿Por qué no puedo editar las recetas?', a: 'Las recetas son fórmulas críticas del negocio. Solo los administradores pueden crearlas, editarlas, duplicarlas o eliminarlas. Los usuarios regulares pueden verlas, recalcularlas, usarlas como plantilla y exportarlas en PDF (sin costos).' },
    { cat: '📖 Recetas', q: '¿Por qué no veo los costos de las recetas?', a: 'Los costos son información sensible del negocio. Solo los administradores los ven. Como usuario regular, ves los ingredientes y cantidades pero no los precios.' },
    { cat: '📖 Recetas', q: '¿Puedo recalcular una receta siendo usuario no-admin?', a: 'Sí. Puedes recalcular, pero solo podrás guardar el resultado como una receta nueva (no modificar la original).' },

    // 🏷️ SECCIÓN 5: PRODUCTOS (P37-P40)
    { cat: '🏷️ Productos', q: '¿Qué es un producto?', a: 'Es lo que vendes al cliente. Ej: "Jaba de Pan" con precio $550 y 10 panes por jaba.' },
    { cat: '🏷️ Productos', q: '¿Cómo asocio un producto a una receta?', a: 'Al crear/editar el producto, selecciona la receta en el desplegable "📋 Receta asociada".' },
    { cat: '🏷️ Productos', q: '¿Qué es "cantidad por unidad"?', a: 'Es cuántas unidades del producto contiene una unidad de venta. Ej: una jaba tiene 10 panes → cantidad_por_unidad = 10.' },
    { cat: '🏷️ Productos', q: '¿Cómo sé el margen de ganancia?', a: 'En la lista de productos, se muestra el margen calculado automáticamente: (precio - costo) / precio × 100.' },

    // 💰 SECCIÓN 6: VENTAS (P41-P60)
    { cat: '💰 Ventas', q: '¿Cómo registro una venta?', a: 'Ve a 💰 Ventas → clic en "➕ Nueva Venta". Selecciona el producto, cantidad, precio, método de pago y cliente.' },
    { cat: '💰 Ventas', q: '¿Qué es una "venta liberada"?', a: 'Es una venta sin cliente identificado, tipo "mostrador anónimo". Se agrupa visualmente y no permite deuda.' },
    { cat: '💰 Ventas', q: '¿Qué es una deuda?', a: 'Es una venta donde el cliente no pagó al momento. Se marca con is_debt = 1 y paid = 0.' },
    { cat: '💰 Ventas', q: '¿Cómo cobro una deuda?', a: 'En Ventas, ve al filtro "💳 Deudas", encuentra al cliente y haz clic en "💰 Cobrar".' },
    { cat: '💰 Ventas', q: '¿Puedo anular una venta?', a: 'Sí. En el detalle de la venta, clic en "🚫 Anular". Se repondrá el stock automáticamente.' },
    { cat: '💰 Ventas', q: '¿Cómo edito el nombre del cliente?', a: 'Al editar una venta, el campo "👤 Comprador" es editable. Si la venta está vinculada a un pedido, se desvinculará.' },
    { cat: '💰 Ventas', q: '¿Para qué sirve registrar un día sin ventas?', a: 'Sirve para llevar un historial y entender mejor las estadísticas. Sin esta información, un día sin ventas parecería simplemente "un mal día" cuando en realidad no abriste.' },
    { cat: '💰 Ventas', q: '¿Qué motivos puedo usar para un día sin ventas?', a: 'Hay 8 predefinidos: ⚡ Apagón, 🛒 Falta de insumos, 🎉 Feriado, 🏖️ Vacaciones, 🏥 Enfermedad, 🔧 Mantenimiento, 🌧️ Mal clima, y 🔄 Otro.' },
    { cat: '💰 Ventas', q: '¿Cómo veo quién hizo cada venta?', a: 'En el detalle de la venta, en la sección de Auditoría, aparece "👤 Creado por: [nombre del vendedor]".' },
    { cat: '💰 Ventas', q: '¿Qué hago si veo ventas duplicadas?', a: 'Ve a ⚙️ Herramientas → 🚨 Eliminación por error. Selecciona las ventas duplicadas y elimínalas permanentemente.' },
    { cat: '💰 Ventas', q: '¿Cómo filtro las ventas por vendedor?', a: 'En el módulo de 💰 Ventas, verás un selector "👤 Vendedor" junto a los demás filtros. Selecciona un vendedor específico para ver solo sus ventas. El selector aparece solo si hay más de 1 usuario en el negocio.' },
    { cat: '💰 Ventas', q: '¿Por qué no veo el filtro de vendedor en Ventas?', a: 'Porque el filtro se oculta automáticamente si solo hay 1 usuario en el negocio. Si tienes más de un usuario y no ves el filtro, recarga la página (Ctrl+Shift+R) para asegurar que el código nuevo se cargó.' },
    { cat: '💰 Ventas', q: '¿El filtro de vendedor afecta los totales?', a: 'NO. Los totales (Ventas hoy, Ingresos totales, Gastos totales, Deudas, Ventas liberadas) se calculan siempre sobre todos los datos del negocio, independientemente del filtro aplicado. El filtro solo afecta a la lista de ventas mostrada.' },
    { cat: '💰 Ventas', q: '¿El filtro de vendedor aparece en el reporte PDF?', a: 'Sí. En el modal de 📊 Reporte de Ventas, si hay más de 1 usuario, aparece un selector "👤 Vendedor". Si seleccionas uno, el PDF solo muestra las ventas de ese vendedor, y en el header aparece "👤 Vendedor: Nombre".' },
    { cat: '💰 Ventas', q: '¿Qué diferencia hay entre "Ventas por empleado" del Dashboard y el filtro de vendedor?', a: 'Dashboard → Ventas por empleado: Ranking histórico de todos los vendedores. Muestra quién vendió más en total. No se puede filtrar.\n\nVentas → Filtro de vendedor: Filtro dinámico para ver solo las ventas de un vendedor específico en un rango de fechas. Es un filtro operativo.' },
    { cat: '💰 Ventas', q: '¿Puedo filtrar por varios vendedores a la vez?', a: 'No directamente. El selector permite elegir UN vendedor o "Todos". Si necesitas comparar varios, exporta el reporte PDF para cada uno y compáralos.' },
    { cat: '💰 Ventas', q: '¿El filtro de vendedor afecta las deudas?', a: 'Sí. Si estás en la vista "💳 Deudas" y aplicas un filtro de vendedor, solo verás las deudas generadas por ese vendedor. Las deudas ocultas (por recetas no compartidas) no se cuentan.' },
    { cat: '💰 Ventas', q: '¿Puedo guardar el filtro de vendedor como predeterminado?', a: 'No. El filtro se resetea al recargar la página. Si necesitas recordarlo, guarda el reporte PDF con el filtro aplicado.' },
    { cat: '💰 Ventas', q: '¿Cómo sé qué vendedor hizo cada venta?', a: 'En el detalle de cada venta (👁️ Ver), en la sección de 🔍 Auditoría, aparece "👤 Creado por: Nombre del vendedor". También en el reporte PDF de ventas.' },
    { cat: '💰 Ventas', q: '¿Qué diferencia hay entre "Anular" y "Eliminar por error"?', a: '🚫 Anular: Soft-delete. La venta queda visible con estado "ANULADA", se puede restaurar.\n\n🗑️ Eliminar por error: Hard-delete. La venta se borra PERMANENTEMENTE de la BD. No se puede restaurar.' },
    { cat: '💰 Ventas', q: '¿Los registros eliminados por error se pueden recuperar?', a: 'No directamente. Los registros eliminados por error se borran físicamente de la base de datos (DELETE). Si tienes una copia de seguridad previa, puedes restaurarla.' },
    { cat: '💰 Ventas', q: '¿Qué mejoras tiene el nuevo modal de eliminación por error?', a: 'El nuevo modal incluye:\n1. Selector de tipo (📋 Pedidos / 💰 Ventas) para filtrar el listado.\n2. Información ampliada: ID, cliente, fecha, producto, precio.\n3. Checkbox multi-selección con contador de seleccionados.\n4. Botones "Seleccionar todos" / "Deseleccionar todos".\n5. Filtros por fecha (Desde/Hasta) y búsqueda por cliente/producto.\n6. Doble confirmación antes de eliminar.\n7. Eliminación de registros asociados (order_items, waiting_list para pedidos; transactions para ventas).' },

    // 📋 SECCIÓN 7: PEDIDOS (P61-P100)
    { cat: '📋 Pedidos', q: '¿Cuál es la diferencia entre pedido y venta?', a: 'Un pedido es una solicitud de un cliente. Una venta es una transacción completada. Los pedidos no son deudas hasta que se entregan.' },
    { cat: '📋 Pedidos', q: '¿Qué estados tiene un pedido?', a: 'Pendiente, Confirmado, En producción, Listo, Entregado, Cancelado, En lista de espera, Compró por lista de espera.' },
    { cat: '📋 Pedidos', q: '¿Qué es la lista de espera?', a: 'Cuando la demanda supera la oferta, los clientes se ponen en cola. Al haber disponibilidad, se les atiende en orden.' },
    { cat: '📋 Pedidos', q: '¿Cómo funciona la reserva por período?', a: 'Permite crear múltiples pedidos a la vez para el mismo cliente. Elige el patrón: rango completo, días de la semana o días específicos.' },
    { cat: '📋 Pedidos', q: '¿Qué es la paridad en reservas?', a: 'Permite filtrar días pares o impares. Ej: "Solo pares" crea pedidos los días 2, 4, 6, 8, 10...' },
    { cat: '📋 Pedidos', q: '¿Cómo se cancelan pedidos automáticamente?', a: 'Los pedidos pendientes/confirmados con más de 48h sin procesar se cancelan automáticamente.' },
    { cat: '📋 Pedidos', q: '¿Qué es "sesión de recogida"?', a: 'Indica si el cliente recogerá el pedido en la mañana (10:00), tarde (15:00) o noche (19:00).' },
    { cat: '📋 Pedidos', q: '¿Cómo gestiono la lista de espera?', a: 'Ve a 📋 Pedidos → botón "⏰ Lista de espera" o a ⚙️ Herramientas → "⏰ Gestionar lista de espera". Desde ahí puedes procesar, cancelar, eliminar o limpiar la lista.' },
    { cat: '📋 Pedidos', q: '¿Qué es la "cancelación global de pedidos"?', a: 'Es una herramienta de admin que cancela TODOS los pedidos en un rango de fechas. Útil para apagones prolongados, falta de insumos o cierres temporales.' },
    { cat: '📋 Pedidos', q: '¿Por qué cambió el diseño de la lista de espera?', a: 'Se reestructuró para mostrar toda la información en columnas horizontales, haciendo visible el nombre del cliente, producto, cantidad, total y fecha de entrega de un vistazo.' },
    { cat: '📋 Pedidos', q: '¿Qué significa cada botón en la lista de espera?', a: '✅ Procesar → crea la venta. ❌ Cancelar → cancela el pedido y repone stock. 🗑️ Quitar → solo quita al cliente de la lista sin cancelar el pedido.' },
    { cat: '📋 Pedidos', q: '¿Qué diferencia hay entre "Cancelar" y "Quitar"?', a: 'Cancelar → cambia el estado del pedido a "cancelado" y repone stock. Quitar → solo elimina al cliente de la lista, el pedido vuelve a "pendiente".' },
    { cat: '📋 Pedidos', q: '¿Por qué los pedidos ahora aparecen ordenados por ID en la tarjeta expandida?', a: 'Antes podían aparecer en cualquier orden (por fecha de creación, por nombre de cliente, etc.). Desde v2.2.9, dentro de cada día, los pedidos se ordenan explícitamente por ID ascendente (el #10 primero, luego #11, luego #12). Esto facilita el seguimiento cronológico y la referencia cruzada con otros módulos.' },
    { cat: '📋 Pedidos', q: '¿El orden por ID afecta los filtros?', a: 'No. El orden por ID se aplica siempre, independientemente de los filtros activos. Si aplicas un filtro por estado o por fecha, dentro de cada grupo se mantiene el orden ascendente por ID.' },
    { cat: '📋 Pedidos', q: '¿Qué pasa cuando quito a un cliente de la lista de espera?', a: 'Desde v2.2.9, al quitar a un cliente (botón "🗑️ Quitar") o al cambiar su estado a cualquier otro (ej: confirmado), el sistema:\n1. Elimina al cliente de la lista de espera (soft-delete).\n2. Reindexa automáticamente las posiciones (si era el #3, el #4 pasa a #3, etc.).\n3. Actualiza el badge con la cantidad correcta.\n4. Si era el único cliente, la lista queda vacía y el badge desaparece.' },
    { cat: '📋 Pedidos', q: '¿Por qué antes el badge de lista de espera no se actualizaba?', a: 'Era un bug. El sistema eliminaba al cliente de la lista pero no refrescaba el badge en la vista principal. Ahora `updateOrderStatusAndReload()` refresca SIEMPRE el badge tras cualquier cambio de estado.' },
    { cat: '📋 Pedidos', q: '¿La reindexación funciona en móvil también?', a: 'Sí. La reindexación se ejecuta en el backend (`orders.js`) y es independiente del dispositivo. El badge se actualiza en la vista de Pedidos y en el modal de lista de espera.' },
    { cat: '📋 Pedidos', q: '¿Qué fecha toma una venta que se produce desde la lista de espera?', a: 'Desde v2.2.9, SIEMPRE toma la fecha del día actual (`new Date().toISOString()`), nunca la fecha futura del pedido original. Esto evita tener ventas con fechas futuras en los reportes.' },
    { cat: '📋 Pedidos', q: '¿Qué pasa con los pedidos normales (no de lista) entregados con retraso?', a: 'Si el pedido fue creado hace menos de 24h, la venta toma la fecha actual. Si fue creado hace más de 24h y tenía una fecha de entrega pasada, la venta usa esa fecha de entrega. Si la fecha de entrega era futura, usa la fecha actual.' },
    { cat: '📋 Pedidos', q: '¿Cómo verifico qué fecha tomó una venta generada desde lista?', a: 'Abre la consola (F12) y busca los logs `📅 [CORRECCIÓN #18]`. Verás el motivo por el cual se eligió la fecha. También puedes verificar directamente:\n```javascript\nconst venta = window.DBModule.query("SELECT id, sale_date FROM sales ORDER BY id DESC LIMIT 1");\nconsole.log(venta[0].sale_date); // Debe ser la fecha de hoy\n```' },
    { cat: '📋 Pedidos', q: '¿Cuál es la diferencia entre "Entregar (sin deuda)" y "Entregar (con deuda)"?', a: '✅ Entregar (sin deuda): Crea la venta con is_debt = 0 y paid = 1. El check "Es una deuda" queda desmarcado. El cliente paga al momento.\n\n🚚 Entregar (con deuda): Crea la venta con is_debt = 1 y paid = 0. El check "Es una deuda" queda marcado. El cliente paga después.' },
    { cat: '📋 Pedidos', q: '¿Dónde están los botones de entrega?', a: 'En el modal de detalle del pedido (👁️ Ver). Aparecen en la parte inferior, en un contenedor destacado con borde punteado verde.' },
    { cat: '📋 Pedidos', q: '¿Qué pasa si el pedido tenía pago adelantado y uso "Entregar (sin deuda)"?', a: 'Se ignora el saldo pendiente y la venta se marca como pagada completamente. Útil cuando el cliente decide pagar el resto al momento.' },
    { cat: '📋 Pedidos', q: '¿Puedo cambiar de opinión después de entregar?', a: 'No directamente. Una vez entregado, el pedido ya generó una venta. Si necesitas corregir el tipo de deuda, debes ir a 💰 Ventas, anular la venta y volver a crearla manualmente.' },
    { cat: '📋 Pedidos', q: '¿Por qué el botón "sin deuda" es verde y el "con deuda" es naranja?', a: 'Por convención visual: verde significa "todo en orden / pagado", naranja significa "pendiente / atención requerida".' },
    { cat: '📋 Pedidos', q: '¿Por qué a veces no puedo editar un pedido o una venta?', a: 'Porque el pedido o venta usa una receta que NO te han compartido. Verás un badge "🔒 Solo lectura" y no podrás editarlo, anularlo, cobrarlo ni eliminarlo.' },
    { cat: '📋 Pedidos', q: '¿Quién puede levantar el bloqueo?', a: 'Solo el administrador. Debe compartir la receta asociada con el negocio para que el usuario regular pueda procesar el pedido o venta.' },
    { cat: '📋 Pedidos', q: '¿El bloqueo afecta a los gastos?', a: 'No. Los gastos no tienen receta asociada, así que nunca se bloquean.' },
    { cat: '📋 Pedidos', q: '¿Cómo sé qué receta está bloqueando mi pedido?', a: 'En el detalle del pedido (👁️ Ver), aparece un aviso rojo con "🔒 Solo lectura" y el listado de recetas bloqueadas. También en la lista de pedidos aparece un badge "🔒 Solo lectura".' },
    { cat: '📋 Pedidos', q: '¿Cómo se calcula ahora la cantidad de pedidos disponibles en la tarjeta de fecha?', a: 'El cálculo ahora es unificado y correcto. La fórmula es: Disponibles = Cantidad a Producir - (Todos los Pedidos Válidos + Ventas Directas). Los pedidos válidos son todos excepto los cancelados. Las ventas directas son las que no provienen de un pedido.' },
    { cat: '📋 Pedidos', q: '¿Por qué un pedido que ya fue entregado sigue contando en el cupo del día?', a: 'Porque el cupo se define por la cantidad de pedidos comprometidos para ese día, sin importar si ya se entregaron o no. Una vez que se hace un pedido, ese cupo queda reservado. El cupo solo se libera si el pedido se cancela.' },
    { cat: '📋 Pedidos', q: '¿Las ventas directas afectan la cantidad de pedidos que puedo crear para un día?', a: 'Sí, ahora sí. Las ventas directas (como las ventas liberadas) se suman a los pedidos para calcular el cupo total. Si la producción es de 6 unidades y tienes 1 venta directa, solo podrás crear 5 pedidos más.' },
    { cat: '📋 Pedidos', q: '¿Qué pasa si cancelo un pedido? ¿Se libera el cupo?', a: 'Sí. Al cancelar un pedido, este deja de contar para el cupo del día, liberando automáticamente una unidad de producción para que puedas crear un nuevo pedido o registrar una venta directa.' },
    { cat: '📋 Pedidos', q: '¿Por qué el conteo en la tarjeta de pedidos y en el calendario de producción ahora coinciden?', a: 'Porque ambos usan la misma función de conteo unificada (contarPedidosYVentasFecha). Esto garantiza que no haya discrepancias y que la información que ves en la lista de pedidos sea la misma que la del calendario de producción.' },
    { cat: '📋 Pedidos', q: '¿Por qué el número de "Pedidos de hoy" en el Dashboard es diferente al de la lista de Pedidos?', a: 'Ya no debería ser diferente. A partir de la versión 2.2.2, ambos usan la misma función de conteo unificada. Si ves una discrepancia, asegúrate de haber recargado la página para obtener la última versión.' },
    { cat: '📋 Pedidos', q: '¿Un pedido que ya fue entregado sigue contando como "Pedido de hoy"?', a: 'Sí. El contador de "Pedidos de hoy" incluye todos los pedidos con fecha de entrega para hoy, excepto los cancelados. Un pedido entregado sigue siendo un pedido que se comprometió para ese día, por lo que se mantiene en el conteo.' },
    { cat: '📋 Pedidos', q: '¿Qué pasa si cancelo un pedido? ¿Se actualiza el Dashboard?', a: 'Sí. Al cancelar un pedido, este deja de contar para el cupo del día, por lo que el número en el Dashboard se actualizará automáticamente para reflejar la nueva cantidad de pedidos activos.' },
    { cat: '📋 Pedidos', q: '¿El contador de "Pedidos mañana" se actualiza automáticamente?', a: 'Sí. Se recalcula cada vez que abres el Dashboard o cuando ocurre un evento db-saved (creación, edición o eliminación de pedidos).' },
    { cat: '📋 Pedidos', q: '¿Por qué el badge de producción es clickeable?', a: 'Para que puedas editar rápidamente la producción de un día sin tener que ir al calendario en Herramientas. Al hacer clic en el badge morado (🔨 Producción: o 🌙 Prod. ayer:), se abre directamente el modal de configuración de producción para ese día.' },
    { cat: '📋 Pedidos', q: '¿Qué pasa si hago clic en el badge de producción?', a: 'Se abre el modal de configuración de producción (showHorarioDetalle) para el día correspondiente. Desde ahí puedes ver los detalles, cambiar la cantidad, cambiar el bloque, o eliminar la producción.' },
    { cat: '📋 Pedidos', q: '¿El clic en el badge expande la tarjeta del día?', a: 'No. El clic en el badge está aislado (event.stopPropagation()), por lo que la tarjeta del día no se expande ni se colapsa. Solo se abre el modal de producción.' },
    { cat: '📋 Pedidos', q: '¿Cómo sé que el badge es clickeable?', a: 'Al pasar el ratón sobre el badge, cambia de color (efecto hover) y el cursor se convierte en una mano (pointer). Además, aparece un tooltip: "Clic para configurar la producción del día".' },
    { cat: '📋 Pedidos', q: '¿Funciona también en móvil?', a: 'Sí. En móvil, al tocar el badge, se abre el modal de configuración de producción. El efecto hover no se aplica en móvil (porque no hay ratón), pero el cursor pointer y el tooltip sí funcionan.' },
    { cat: '📋 Pedidos', q: '¿Qué diferencia hay entre el badge del día actual y el del día anterior?', a: 'El icono te lo indica:\n\n🔨 Producción: → Es un bloque del día actual del pedido.\n\n🌙 Prod. ayer: → Es un bloque del día anterior al de entrega.\n\nAmbos tienen el mismo formato de fecha/hora: DD/MM de HH:MM a HH:MM.' },
    { cat: '📋 Pedidos', q: '¿El clic en el badge funciona si el pedido está bloqueado por recetas no compartidas?', a: 'Sí. El badge de producción es independiente del bloqueo por recetas. Puedes hacer clic en él incluso si el pedido está en modo solo-lectura, porque la configuración de producción no modifica el pedido en sí.' },
    { cat: '📋 Pedidos', q: '¿El clic en el badge abre el modal en la pestaña correcta?', a: 'Sí. Al abrir el modal de producción desde el badge, se muestra directamente el detalle del día seleccionado (no la pestaña de configuración general). Esto es porque showHorarioDetalle(fechaISO) abre el modal con la fecha específica.' },
    { cat: '📋 Pedidos', q: '¿Qué pasa si el día no tiene producción programada?', a: 'Si el día no tiene producción programada, no aparece el badge morado. Para programar producción, debes ir al calendario en Herramientas → Gestionar Horarios → Calendario, o hacer clic en un día con corriente.' },
    { cat: '📋 Pedidos', q: '¿Por qué el modal de producción no guardaba el producto?', a: 'Era un bug de la versión anterior (v2.2.2). El modal solo guardaba el bloque y la cantidad, pero no el producto_id. Esto causaba que al reabrir el modal, el producto seleccionado se perdiera. En la versión v2.2.9 (Corrección #11) esto está resuelto.' },
    { cat: '📋 Pedidos', q: '¿Qué pasa si el producto que guardé ya no tiene CMPBC?', a: 'En la versión v2.2.9, el dropdown de productos muestra TODOS los productos (con o sin CMPBC). Si un producto guardado ya no tiene CMPBC, se preselecciona igualmente, pero no aparece el botón "✨ Calcular bloques automáticamente". Puedes seguir guardando la producción manualmente.' },
    { cat: '📋 Pedidos', q: '¿Cómo sé si un producto tiene CMPBC configurado?', a: 'En el dropdown del modal de producción, los productos con CMPBC muestran el texto 🏭 X/bloque (ej: 🏭 7/bloque). Los productos sin CMPBC muestran — Sin CMPBC —.' },
    { cat: '📋 Pedidos', q: '¿Puedo guardar producción sin seleccionar un producto?', a: 'Sí. El dropdown tiene la opción — Sin producto específico — que guarda la producción con producto_id = NULL. Esto es útil si no necesitas vincular la producción a un producto concreto.' },
    { cat: '📋 Pedidos', q: '¿El producto se guarda al usar "Aplicar a rango"?', a: 'Sí. Desde v2.2.9, el producto seleccionado en el modal base se propaga a todas las fechas del rango. Si seleccionas "Jaba de Pan" en el día base, todas las fechas del rango se guardarán con ese mismo producto_id.' },
    { cat: '📋 Pedidos', q: '¿Cómo verifico que el producto se guardó correctamente?', a: 'Abre la consola del navegador (F12) y ejecuta:\n```javascript\nconst prod = window.DBModule.getProduccionByFecha(\'2026-09-25\');\nconsole.log(\'producto_id:\', prod?.producto_id);\n```\nDebe devolver el ID del producto que guardaste.' },
    { cat: '📋 Pedidos', q: '¿Qué pasa con las producciones antiguas que no tienen producto_id?', a: 'Las producciones antiguas tienen producto_id = NULL por defecto. Al reabrir el modal, el dropdown mostrará — Sin producto específico — y podrás asignarles un producto manualmente.' },
    { cat: '📋 Pedidos', q: '¿El diagnóstico de producción verifica el producto_id?', a: 'Sí. Desde v2.2.9, el diagnóstico tiene 9 tests (antes 8). El test #9 verifica que la columna producto_id exista en la tabla calendario_produccion.' },
    { cat: '📋 Pedidos', q: '¿Puedo cambiar el producto de una producción ya guardada?', a: 'Sí. Abre el modal de producción del día, cambia el producto en el dropdown, y pulsa "💾 Guardar solo este día". El producto_id se actualizará.' },
    { cat: '📋 Pedidos', q: '¿El producto se usa en el cálculo automático de bloques?', a: 'Sí. Cuando seleccionas un producto con CMPBC y pulsas "✨ Calcular bloques automáticamente", el sistema usa el CMPBC de ese producto para calcular la distribución. El producto_id se guarda junto con la distribución en distribucion_bloques' },

    // ⚡ SECCIÓN 8: CORRIENTE (P101-P104)
    { cat: '⚡ Corriente', q: '¿Cómo funcionan los horarios de corriente?', a: 'Define el patrón (ej: 3h corriente / 12h apagón) y el sistema calcula automáticamente todos los bloques de cada día.' },
    { cat: '⚡ Corriente', q: '¿Qué necesito para configurar corriente?', a: 'Una fecha y hora de referencia donde conociste un bloque de corriente. Ej: "Hoy tuve corriente de 10:00 a 13:00".' },
    { cat: '⚡ Corriente', q: '¿Puedo descargar el reporte de corriente?', a: 'Sí. En Herramientas → ⚡ Gestionar Horarios → pestaña 📊 Reporte, elige semanal o mensual y se genera un PDF.' },
    { cat: '⚡ Corriente', q: '¿Por qué el calendario muestra algunos días sin corriente?', a: 'Porque según el patrón configurado, ese día no tiene bloques de corriente. Aparecen en gris.' },

    // 🏆 SECCIÓN 9: PREMIOS (P105-P108)
    { cat: '🏆 Premios', q: '¿Cómo funciona el sistema de premios?', a: 'Premia a tus mejores clientes. Se calcula automáticamente el cliente con mayor total gastado en el mes y en el año.' },
    { cat: '🏆 Premios', q: '¿Dónde configuro los premios?', a: 'Ve a 💰 Ventas → botón 🏆 Premios. Ahí puedes activar/desactivar, editar los premios y elegir cuándo se calcula el premio anual.' },
    { cat: '🏆 Premios', q: '¿Por qué hay tres opciones para calcular el premio anual?', a: 'Cada negocio es diferente. Puedes elegir entregar el premio en Navidad (24 dic), a fin de año (31 dic) o al inicio del siguiente año (comportamiento por defecto).' },
    { cat: '🏆 Premios', q: '¿Qué pasa si tengo el sistema de premios desactivado?', a: 'El selector de cálculo anual se guarda igualmente, pero no se muestra la tarjeta de premios en el Dashboard ni se envían notificaciones.' },

    // 🔔 SECCIÓN 10: NOTIFICACIONES Y AYUDA (P109-P128)
    { cat: '🔔 Notificaciones', q: '¿Puedo cambiar el sonido de las notificaciones?', a: 'Sí. Ve a tu Perfil → 🔔 Sonido de notificaciones. Puedes elegir entre 5 sonidos embutidos o desactivarlo.' },
    { cat: '🔔 Notificaciones', q: '¿Por qué no se repiten las notificaciones?', a: 'Una vez que abres el modal de notificaciones, se marcan como vistas y no se vuelven a mostrar hasta que sean necesarias de nuevo.' },
    { cat: '🔔 Notificaciones', q: '¿Cómo abro el Centro de Ayuda?', a: 'Haz clic en el botón ❓ de la barra superior. Se abrirá un menú flotante con Guía Rápida, Tutorial, FAQ, Ayuda Detallada, Léeme y Créditos.' },
    { cat: '🔔 Notificaciones', q: '¿Qué es la "Ayuda detallada"?', a: 'Es un manual completo que se abre DENTRO de la app (en esta misma ventana), respetando tu tema actual y abriéndose en la sección del módulo donde estés.' },
    { cat: '🔔 Notificaciones', q: '¿Puedo volver a ver el tutorial?', a: 'Sí. Ve a Ayuda → Tutorial Interactivo. Si ya lo completaste, la app te preguntará si quieres volver a verlo.' },
    { cat: '🔔 Notificaciones', q: '¿Cómo contacto al desarrollador?', a: 'En Ayuda → Créditos. WhatsApp: +53 55031725, Email: 3sayricardo@gmail.com.' },
    { cat: '🔔 Notificaciones', q: '¿Por qué la ayuda se abre detrás de la app?', a: 'Era un bug de z-index. Ahora se corrigió y la ayuda se abre siempre al frente. Si aún lo ves detrás, recarga la página.' },
    { cat: '🔔 Notificaciones', q: '¿El Centro de Ayuda bloquea la pantalla?', a: 'No. El Centro de Ayuda ahora es un menú flotante que aparece debajo del botón ❓. Se cierra automáticamente al hacer clic fuera o presionar Escape.' },
    { cat: '🔔 Notificaciones', q: '¿Por qué no veo el botón de Ayuda Detallada?', a: 'Asegúrate de estar en la versión 2.2.9 o superior. El botón está en Ayuda → Centro de Ayuda → 📖 Ayuda Detallada.' },
    { cat: '🔔 Notificaciones', q: '¿Por qué antes la ayuda detallada cerraba la app?', a: 'Era un bug. El iframe de la ayuda ejecutaba `window.close()` cuando el usuario pulsaba "Volver a Panario". Como el iframe comparte el contexto de la pestaña padre, cerraba TODA la pestaña, incluyendo la app principal.' },
    { cat: '🔔 Notificaciones', q: '¿Cómo se corrigió el bug de la ayuda?', a: 'Desde v2.2.9, el iframe ya no ejecuta `window.close()`. En su lugar, envía un mensaje `postMessage({ type: \'CLOSE_HELP\' })` al padre (help.js). El padre recibe el mensaje y cierra el modal correctamente sin tocar la pestaña.' },
    { cat: '🔔 Notificaciones', q: '¿Por qué se eliminó el botón "✕" flotante de la ayuda?', a: 'Porque confundía al usuario (podía pensar que cerraba la app). El botón "← Volver a Panario" del header es suficiente. Además, el modal de ayuda de `help.js` ya tiene su propio botón ✕ en la esquina superior derecha del modal.' },
    { cat: '🔔 Notificaciones', q: '¿Cómo cierro la ayuda detallada ahora?', a: 'Tienes 3 formas:\n1. Botón "← Volver a Panario" (dentro del header de la ayuda).\n2. Tecla Escape.\n3. Clic fuera del modal (sobre el fondo oscuro, solo en desktop).' },
    { cat: '🔔 Notificaciones', q: '¿La ayuda se abre en móvil?', a: 'Sí. En móvil, la ayuda se abre en una pestaña nueva (no en iframe) por problemas de rendimiento. En desktop, se abre en un iframe dentro de un modal.' },
    { cat: '🔔 Notificaciones', q: '¿Qué mensajes aparecen en consola al cerrar la ayuda?', a: 'Verás:\n```\n📖 [CORRECCIÓN #5] Mensaje recibido del iframe: CLOSE_HELP (source: ayuda-panario-iframe)\n📖 [CORRECCIÓN #5] Cerrando modal de ayuda (SIN tocar la pestaña)\n📖 Modal de ayuda cerrado + app restaurada + estilos residuales limpiados\n```' },
    { cat: '🔔 Notificaciones', q: '¿Puedo imprimir la ayuda desde el modal?', a: 'Sí. En el header del modal hay un botón 🖨️ que abre el diálogo de impresión del iframe.' },
    { cat: '🔔 Notificaciones', q: '¿Qué es el modo "embedded" de la ayuda?', a: 'Es cuando la ayuda se carga dentro de un iframe (con `?embedded=1` en la URL). En este modo, el botón "← Volver a Panario" y el botón ✕ flotante se ocultan (porque el modal de `help.js` ya tiene su propio ✕). El cierre se maneja vía `postMessage`.' },
    { cat: '🔔 Notificaciones', q: '¿Por qué la app no funciona offline después de limpiar el caché?', a: 'Si limpias el caché de Chrome, se borran los archivos de la PWA. Abre Panario con conexión a internet una vez para que se vuelvan a cachear. En la versión 2.2.9, el Service Worker detecta esta situación y re-descarga todo automáticamente.' },
    { cat: '🔔 Notificaciones', q: '¿Qué significa "CACHE_REPAIRED_START" en la consola?', a: 'Es un mensaje del Service Worker que indica que ha detectado que faltan archivos en el caché y está empezando a re-descargarlos. Verás CACHE_REPAIRED_END cuando termine. Esto es normal tras limpiar el caché.' },
    { cat: '🔔 Notificaciones', q: '¿Cómo puedo forzar la reparación del caché manualmente?', a: 'Abre DevTools (F12) → pestaña Application → Service Workers → clic en el SW registrado → botón "Message" → escribe:\n```javascript\n{ type: \'REPAIR_CACHE\' }\n```\nO desde la consola:\n```javascript\nnavigator.serviceWorker.controller.postMessage({ type: \'REPAIR_CACHE\' });\n```' },
    { cat: '🔔 Notificaciones', q: '¿Cada cuánto se verifica la integridad del caché?', a: 'El Service Worker verifica la integridad cada 15 minutos automáticamente. Si detecta que faltan assets, los re-descarga en background.' },

    // 👥 SECCIÓN 11: MULTIUSUARIO (P129-P136)
    { cat: '👥 Multiusuario', q: '¿Puedo tener varios usuarios en el mismo negocio?', a: 'Sí. Al registrarte puedes crear un negocio nuevo o unirte a uno existente con un código de invitación de 8 caracteres.' },
    { cat: '👥 Multiusuario', q: '¿Cómo comparto el código de invitación?', a: 'En tu Perfil, junto al nombre del negocio, verás el código con un botón "📋 Copiar". Envíalo a quien quieras invitar.' },
    { cat: '👥 Multiusuario', q: '¿Quién es el administrador del negocio?', a: 'El primer usuario que crea el negocio es el administrador. Los siguientes usuarios que se unan tendrán rol de usuario regular.' },
    { cat: '👥 Multiusuario', q: '¿Cómo promuevo a un usuario a admin?', a: 'Ve a ⚙️ Herramientas → 👥 Gestionar Usuarios → botón 👑 junto al usuario.' },
    { cat: '👥 Multiusuario', q: '¿Qué puede hacer un admin que un usuario no puede?', a: 'Crear/editar/eliminar insumos, recetas, productos. Gestionar usuarios. Hacer copias completas. Ver costos de recetas. Cancelar/reprogramar pedidos globalmente.' },
    { cat: '👥 Multiusuario', q: '¿Necesito estar en la misma red WiFi para unirme a un negocio con el código de invitación?', a: 'No. El código de invitación NO requiere que estés en la misma red WiFi ni en la misma ubicación física.\n\n💡 ¿Cómo funciona?\n• El código es un identificador único del negocio que se guarda en la base de datos LOCAL del dispositivo donde se creó el negocio.\n• Para unirte, necesitas tener acceso a esa misma base de datos (por ejemplo, mediante una copia de seguridad exportada).\n• NO hay servidor central. Panario es 100% offline y local.\n\n⚠️ Importante: Si quieres que otra persona se una a tu negocio desde otro dispositivo, deben importar tu base de datos completa (copia de seguridad) primero. El código de invitación solo funciona dentro de la misma base de datos.' },
    { cat: '👥 Multiusuario', q: '¿Qué información contiene el código de invitación?', a: 'El código de invitación es un identificador de 8 caracteres alfanuméricos (ej: ABC12345) que se asigna automáticamente al crear un negocio.\n\n📋 ¿Qué contiene?\n• NO contiene información personal ni datos del negocio.\n• Solo es una referencia única que apunta al negocio dentro de la base de datos.\n• Se genera aleatoriamente usando mayúsculas y números (sin caracteres confusos como O/0 o I/1).\n\n🔒 Seguridad: El código es seguro porque solo funciona dentro de la base de datos local. Sin acceso a esa BD, el código no sirve de nada.' },
    { cat: '👥 Multiusuario', q: '¿Cómo se determina el código de invitación desde el entorno del invitado?', a: 'Cuando alguien intenta unirse con un código:\n\n1️⃣ El sistema busca el código en la base de datos LOCAL del dispositivo.\n2️⃣ Si lo encuentra, muestra una vista previa del negocio (nombre, número de usuarios).\n3️⃣ El nuevo usuario se asocia al negocio existente con rol de "usuario regular".\n4️⃣ Todos los datos operativos (insumos, recetas, productos, ventas) se comparten entre los usuarios del mismo negocio.\n\n💡 Caso de uso típico:\n• Ricardo crea el negocio "Panadería La Esquina" en su dispositivo.\n• Exporta la copia de seguridad y la comparte con María.\n• María importa la copia en su dispositivo.\n• María se registra con el código de invitación (o directamente se une al negocio existente).\n• Ambos ven los mismos datos y pueden trabajar en paralelo.' },

    // ⚙️ SECCIÓN 12: HERRAMIENTAS (P137-P145)
    { cat: '⚙️ Herramientas', q: '¿Qué hace "Reiniciar base de datos"?', a: 'Elimina TODOS los datos excepto usuarios y temas. Se conservan las cuentas de usuario para que puedas volver a entrar. Contraseña: "panario".' },
    { cat: '⚙️ Herramientas', q: '¿Qué diferencia hay entre "Limpiar datos eliminados" y "Eliminación por error"?', a: 'Ambas son destructivas. "Limpiar datos eliminados" borra todos los registros con soft-delete. "Eliminación por error" permite seleccionar pedidos o ventas específicos para eliminar permanentemente.' },
    { cat: '⚙️ Herramientas', q: '¿Cómo fusiono dos bases de datos?', a: 'Ve a ⚙️ Herramientas → 📥 Importar → 🔀 Fusionar bases de datos. Los registros nuevos se añaden, los existentes se comparan por UUID (gana el más reciente).' },
    { cat: '⚙️ Herramientas', q: '¿Qué pasa si importo datos duplicados?', a: 'El sistema evita duplicados al fusionar: compara por UUID y solo actualiza si el backup es más reciente. Los duplicados se omiten automáticamente.' },
    { cat: '⚙️ Herramientas', q: '¿Qué hace el botón "Restaurar estilos"?', a: 'Fuerza la limpieza de estilos residuales que pueden romper el `position: sticky` del header o causar problemas visuales en los modales. Elimina `transform`, `will-change`, `isolation`, `filter`, etc., de `html`, `body`, `#appScreen` y `header`.' },
    { cat: '⚙️ Herramientas', q: '¿Cuándo debo usar "Restaurar estilos"?', a: 'Úsalo si:\n• La barra superior (header) se ve deformada o mal posicionada.\n• Los modales aparecen descentrados.\n• El contenido se desplaza de forma rara.\n• Después de usar muchos modales seguidos.' },
    { cat: '⚙️ Herramientas', q: '¿Qué pasa si restauro los estilos con modales abiertos?', a: 'El botón está diseñado para usarse cuando NO hay modales abiertos. Si hay alguno, ciérralo primero. El sistema no hace nada destructivo, pero podría cerrar modales inesperadamente.' },
    { cat: '⚙️ Herramientas', q: '¿Por qué la barra de título (top bar) se deformaba antes?', a: 'Porque algunos modales o animaciones aplicaban transform a elementos ancestros del header, lo que rompía el position: sticky. Esto hacía que el header se comportara como relative y se desplazara hacia abajo.' },
    { cat: '⚙️ Herramientas', q: '¿Qué se ha hecho para solucionarlo?', a: 'Se han añadido reglas CSS defensivas que fuerzan position: sticky en el header y resetean cualquier transform residual. Además, se ha ampliado la función limpiarEstilosResiduales() para que se ejecute en más eventos (navegación, cambio de visibilidad, resize, orientación, focus, scroll) y limpie más propiedades.' },
    { cat: '⚙️ Herramientas', q: '¿Por qué la barra de título se deformaba al minimizar y restaurar la app?', a: 'Porque al minimizar, algunos navegadores móviles aplican transform al body o #appScreen para optimizar el rendimiento. Al restaurar, ese transform quedaba "huérfano" y rompía el sticky del header. Ahora, un listener de visibilitychange limpia esos estilos residuales al volver a primer plano.' },
    { cat: '⚙️ Herramientas', q: '¿La corrección afecta al rendimiento de la app?', a: 'No. La limpieza de estilos residuales es una operación muy ligera (solo resetea unas pocas propiedades CSS) y se ejecuta con debounce para evitar llamadas excesivas. No afecta al rendimiento general.' },

    // 🔨 SECCIÓN 13: PRODUCCIÓN (P146-P230)
    { cat: '🔨 Producción', q: '¿Qué es el horario de producción?', a: 'Es el bloque de corriente que has marcado como el momento en que hornearás tu producción. Se muestra en la tarjeta del pedido para saber cuándo estará listo el pan.' },
    { cat: '🔨 Producción', q: '¿Cómo defino el horario de producción para un día?', a: 'Ve a ⚙️ Herramientas → ⚡ Gestionar Horarios → 📅 Calendario. Haz clic en un día con corriente, selecciona el bloque y la cantidad a producir, y guarda.' },
    { cat: '🔨 Producción', q: '¿Qué significa "Pedidos: 5/50"?', a: 'Significa que hay 5 pedidos reservados para ese día y la producción programada es de 50 unidades. Aún quedan 45 cupos disponibles.' },
    { cat: '🔨 Producción', q: '¿Por qué no puedo crear más pedidos para un día?', a: 'Porque la producción de ese día está completa. El sistema bloquea la creación para evitar sobreventa. Cambia la fecha o aumenta la cantidad de producción.' },
    { cat: '🔨 Producción', q: '¿Cómo elimino la producción de un día?', a: 'Ve al día en el calendario, haz clic en el modal de detalle y pulsa el botón 🗑️ junto a la sección de producción.' },
    { cat: '🔨 Producción', q: '¿Las ventas directas afectan el cupo de pedidos?', a: 'Sí. Si vendes directamente sin pedido, esas unidades se descuentan del cupo disponible. El cálculo es: m - pedidos - ventas_directas.' },
    { cat: '🔨 Producción', q: '¿Puedo vender más de la cantidad de producción?', a: 'Sí, las ventas directas no se bloquean. Solo los pedidos respetan el cupo de producción.' },
    { cat: '🔨 Producción', q: '¿Qué pasa si no defino producción para un día?', a: 'No hay límite de pedidos para ese día. La tarjeta no muestra el bloque de producción.' },
    { cat: '🔨 Producción', q: '¿Cómo sé si un día tiene producción programada desde la lista de pedidos?', a: 'En la tarjeta de cada fecha (en la lista de pedidos) verás un bloque morado con:\n• 🔨 Horario de producción: dd/mm de hh:mm a hh:mm\n• 📋 Pedidos: n/m\n• 💰 Ventas directas: v (si las hay)\n• ✅ x disponibles  o  ⛔ COMPLETO' },
    { cat: '🔨 Producción', q: '¿Qué pasa con las reservas por período si algún día está completo?', a: 'En la vista previa de reserva por período, los días completos aparecen con ⛔ Completo (n/m) y se omiten automáticamente al crear. Solo se crean pedidos en los días con disponibilidad.' },
    { cat: '🔨 Producción', q: '¿Puedo producir cantidades que no sean enteras?', a: 'Sí. El campo "Cantidad a producir" acepta decimales. Por ejemplo:\n• 6.5 significa 6 jabas y media\n• 2.25 significa 2 jabas y cuarto\n• 0.5 significa media jaba\n\nEsto es útil cuando produces jabas de diferentes tamaños.' },
    { cat: '🔨 Producción', q: '¿Cómo se calcula la cantidad disponible si la producción es decimal?', a: 'La fórmula es: `disponibles = cantidad_produccion - pedidos_reservados - ventas_directas`\n\nEjemplo: si produces 6.5 jabas, tienes 5 pedidos y 1 venta directa: `6.5 - 5 - 1 = 0.5 disponibles`.' },
    { cat: '🔨 Producción', q: '¿Se puede guardar una cantidad con muchos decimales?', a: 'Sí, pero se recomienda usar máximo 2 decimales para mayor claridad. El sistema los mostrará formateados (ej: 6.33).' },
    { cat: '🔨 Producción', q: '¿Qué pasa si un pedido consume más de lo disponible?', a: 'El sistema bloquea la creación del pedido cuando `disponibles <= 0`. Muestra un modal informativo.' },
    { cat: '🔨 Producción', q: '¿Cómo veo la cantidad exacta que falta por producir?', a: 'En la tarjeta del día en el calendario, el tooltip muestra la cantidad formateada. En el modal de detalle hay una sección con: Pedidos, Ventas directas y Disponibles.' },
    { cat: '🔨 Producción', q: '¿Puedo cambiar una cantidad ya guardada de entero a decimal?', a: 'Sí. Simplemente abre el día, edita el input y guarda. No hay restricción para cambiar entre enteros y decimales.' },
    { cat: '🔨 Producción', q: '¿Los reportes muestran cantidades decimales?', a: 'Sí. El reporte de corriente y producción muestra las cantidades formateadas sin ceros innecesarios. Ejemplo:\n• 6.5 aparece como 6.5\n• 6.0 aparece como 6\n• 0.5 aparece como 0.5' },
    { cat: '🔨 Producción', q: '¿La cantidad decimal afecta el cálculo de premios o estadísticas?', a: 'No. Los premios se calculan por total gastado de clientes, no por unidades producidas.' },
    { cat: '🔨 Producción', q: '¿Qué pasa si intento guardar cantidad 0 o negativa?', a: 'El sistema muestra un error: "⚠️ La cantidad a producir debe ser mayor a 0". Debes ingresar al menos 0.01.' },
    { cat: '🔨 Producción', q: '¿Qué pasa con la migración de datos antiguos con cantidad entera?', a: 'Al iniciar la app, el sistema detecta automáticamente si la columna era INTEGER y la migra a REAL preservando todos los datos.' },
    { cat: '🔨 Producción', q: '¿Por qué no puedo crear un pedido aunque la fecha tiene producción configurada?', a: 'Porque el día está completo. Opciones:\n• Elegir otra fecha\n• Pedirle al admin que aumente la producción del día' },
    { cat: '🔨 Producción', q: '¿Cómo sé si un día tiene producción programada desde la lista de pedidos?', a: 'En la tarjeta de cada fecha verás un bloque morado con:\n• 🔨 Horario de producción: dd/mm de hh:mm a hh:mm\n• 📋 Pedidos: n/m\n• 💰 Ventas directas: v (si las hay)\n• ✅ x disponibles  o  ⛔ COMPLETO' },
    { cat: '🔨 Producción', q: '¿Qué significa "📋 Pedidos: 3/6.5"?', a: 'Significa:\n• 3: pedidos reservados para ese día\n• 6.5: producción total programada\n\nAún hay disponibles `6.5 - 3 = 3.5` cupos.' },
    { cat: '🔨 Producción', q: '¿Cuándo aparece "⛔ COMPLETO"?', a: 'Cuando `disponibles <= 0`, es decir, cuando los pedidos reservados + ventas directas alcanzan o superan la producción total del día.' },
    { cat: '🔨 Producción', q: '¿Por qué no puedo crear un pedido aunque la fecha tiene producción configurada?', a: 'Porque el día está completo. El sistema bloquea la creación y muestra un modal informativo.' },
    { cat: '🔨 Producción', q: '¿Puedo crear pedidos para un día sin producción configurada?', a: 'Sí. Los días sin producción no tienen límite de cupos. Solo se aplica la validación cuando hay configuración de producción.' },
    { cat: '🔨 Producción', q: '¿Qué pasa si edito un pedido y cambio la fecha a un día completo?', a: 'En modo edición, el sistema permite guardar aunque esté completo (para no bloquear la edición de otros campos). La validación estricta solo aplica a pedidos nuevos.' },
    { cat: '🔨 Producción', q: '¿Qué pasa con las reservas por período si algún día está completo?', a: 'Los días completos aparecen con "⛔ Completo (n/m)" y se omiten automáticamente al crear.' },
    { cat: '🔨 Producción', q: '¿Por qué el detalle del pedido muestra la producción del día?', a: 'Porque es útil para saber cuándo se horneará el pedido. En el detalle verás el horario de producción y los pedidos del día.' },
    { cat: '🔨 Producción', q: '¿Cómo veo cuántos cupos quedan en un día?', a: 'Tres formas:\n1. Tarjeta de fecha en la lista de pedidos: ✅ x disponibles\n2. Formulario de pedido: banner morado al seleccionar la fecha\n3. Modal de horario (Calendario → clic en día): sección "✅ Disponibles: x / m"' },
    { cat: '🔨 Producción', q: '¿Puedo producir más unidades que las programadas?', a: 'Sí, las ventas directas no respetan cupos. Solo los pedidos se bloquean cuando la producción está completa.' },
    { cat: '🔨 Producción', q: '¿Los decimales afectan el bloqueo?', a: 'Sí. Ejemplos:\n• Producción 6.5 con 0.5 disponibles → permite 1 pedido más\n• Producción 6.5 con 0 disponibles → bloquea\n• Producción 2.25 con 0.25 disponibles → permite 1 pedido más' },
    { cat: '🔨 Producción', q: '¿Qué pasa si reduzco la producción después de tener pedidos?', a: 'El sistema recalcula disponibles automáticamente. Si reduces la producción por debajo de los pedidos existentes, los nuevos pedidos se bloquearán. Los pedidos ya existentes no se cancelan.' },
    { cat: '🔨 Producción', q: '¿Los avisos de producción se muestran también en el Dashboard?', a: 'No directamente. El Dashboard muestra "Pedidos de hoy" y "Lista de espera". Para ver la producción detallada, ve al calendario de corriente o a la lista de pedidos.' },
    { cat: '🔨 Producción', q: '¿Puedo ver el historial de producción de días pasados?', a: 'Sí. En el calendario, navega a meses anteriores y haz clic en cualquier día. Los días con producción tienen un borde morado y el icono 🔨.' },
    { cat: '🔨 Producción', q: '¿Qué mejoras tiene el algoritmo de bloques en v2.2.9?', a: 'El algoritmo ahora respeta correctamente la regla del amanecer:\n• Un bloque es "del amanecer" si su hora de FIN es ≤ 9:00 AM del día de venta.\n• Un bloque que comienza a las 8:00 AM y termina a las 11:00 AM NO es del amanecer.\n• Si no hay bloques válidos al amanecer del día V, se usa el último bloque del día V-1.\n• El mensaje usa el formato `DD/MM de HH:MM a HH:MM` sin la palabra "ayer".' },
    { cat: '🔨 Producción', q: '¿Por qué antes el algoritmo elegía mal el bloque?', a: 'Porque solo verificaba la hora de INICIO del bloque, no la de FIN. Ahora verifica la hora de FIN.' },
    { cat: '🔨 Producción', q: '¿Qué es la "regla del amanecer" en el algoritmo de bloques?', a: 'Es la regla que determina si un bloque de corriente es válido para producir el pan que se venderá al amanecer del día siguiente. Un bloque es válido si termina antes de las 9:00 AM del día de venta. No importa cuándo empieza, sino cuándo termina.' },
    { cat: '🔨 Producción', q: '¿Por qué un bloque que comienza a las 8:00 AM no es válido para el amanecer?', a: 'Porque si comienza a las 8:00 AM y dura 3 horas, termina a las 11:00 AM. Para entonces, el desayuno ya pasó. El pan debe estar listo antes de las 9:00 AM para que los clientes lo compren al amanecer.' },
    { cat: '🔨 Producción', q: '¿Cuándo se usa el bloque del día anterior?', a: 'Se usa cuando el primer bloque del día de venta comienza demasiado tarde (después de las 8:00 AM) o cuando no hay bloques válidos para el amanecer. El algoritmo prioriza el último bloque del día anterior porque el pan horneado ahí estará listo mucho antes del desayuno.' },
    { cat: '🔨 Producción', q: '¿Por qué el mensaje ya no dice "ayer"?', a: 'Porque la palabra "ayer" es ambigua cuando se lee un mensaje sin contexto. Ahora el mensaje usa la fecha real del bloque en formato DD/MM de HH:MM a HH:MM. Ej: Producción: 23/09 de 5:00 PM a 8:00 PM.' },
    { cat: '🔨 Producción', q: '¿Cómo sé si un bloque es del día anterior o del día actual?', a: 'El algoritmo te lo indica con iconos:\n\n🌅 Bloque del amanecer: bloque que termina antes de las 9 AM del día de venta.\n\n🔨 Bloque del día: bloque que termina después de las 9 AM.\n\nSi el bloque es del día anterior, el icono sigue siendo 🌅 (si termina antes de las 9 AM), pero la fecha del bloque será del día anterior.' },
    { cat: '🔨 Producción', q: '¿El algoritmo prioriza el bloque de ayer o el de hoy?', a: 'Prioriza el bloque del día anterior si termina antes de las 9 AM del día de venta. Si no hay bloque del día anterior válido, usa los bloques del día actual que terminen antes de las 9 AM. Si no hay ninguno, usa los bloques restantes ordenados por hora de inicio.' },
    { cat: '🔨 Producción', q: '¿Qué pasa si el bloque del día anterior cruza medianoche?', a: 'Se considera válido si su hora de fin es <= 9:00 AM del día de venta. Por ejemplo, un bloque del 23/09 de 11:00 PM a 2:00 AM del 24/09 es válido porque termina a las 2:00 AM, antes de las 9:00 AM.' },
    { cat: '🔨 Producción', q: '¿Puedo modificar manualmente la distribución sugerida?', a: 'Sí. Después de confirmar el cálculo, puedes editar el bloque y la cantidad manualmente en el modal de producción y volver a guardar.' },
    { cat: '🔨 Producción', q: '¿El algoritmo considera la producción ya programada?', a: 'No directamente. El algoritmo calcula la distribución óptima basándose en los bloques disponibles y el CMPBC del producto. Si ya había producción programada para ese día, el sistema la sobrescribe (con confirmación previa).' },
    { cat: '🔨 Producción', q: '¿Cómo verifico que el algoritmo funciona correctamente?', a: 'Abre la consola del navegador (F12) y ejecuta:\n```javascript\nconst resultado = window.calcularBloquesIdeales(\'2026-09-24\', 12, 7);\nconsole.log(resultado.bloques.map(b => ({\n    cantidad: b.cantidad,\n    esAmanecer: b.esAmanecer,\n    esAyer: b.esBloqueAyer,\n    hora: `${b.horaInicioStr} - ${b.horaFinStr}`,\n    fecha: b.fechaBloqueReal\n})));\n```\nVerifica que los bloques marcados como esAmanecer: true terminen antes de las 9 AM del día de venta.' },
    { cat: '🔨 Producción', q: '¿Por qué el algoritmo a veces usa 2 bloques en lugar de 1?', a: 'Porque la cantidad a producir (CPD) supera la capacidad máxima de un solo bloque (CMPBC). El número de bloques se calcula como ceil(CPD / CMPBC). Ej: si CPD=12 y CMPBC=7, se necesitan 2 bloques: 7 + 5.' },
    { cat: '🔨 Producción', q: '¿Qué pasa si no hay suficientes bloques disponibles?', a: 'El algoritmo muestra un error indicando cuántas unidades máximo se pueden producir. Puedes:\n• Aumentar el CMPBC del producto.\n• Elegir otro producto con mayor CMPBC.\n• Dividir la producción en varios días.' },
    { cat: '🔨 Producción', q: '¿El algoritmo respeta el CMPBC individual de cada producto?', a: 'Sí. Cada producto tiene su propio CMPBC. El algoritmo usa el CMPBC del producto seleccionado en el dropdown para calcular la distribución.' },
    { cat: '🔨 Producción', q: '¿Cómo se guarda la distribución calculada?', a: 'Al confirmar el cálculo, se guarda en la tabla calendario_produccion:\n• bloques_usados: número de bloques usados.\n• distribucion_bloques: JSON con el detalle de cada bloque (fecha, bloque_index, hora_inicio, hora_fin, cantidad, es_bloque_dia_anterior, fecha_bloque_real).' },
    { cat: '🔨 Producción', q: '¿Puedo usar el cálculo automático si el producto no tiene CMPBC?', a: 'No. El botón "✨ Calcular bloques automáticamente" solo aparece si el producto seleccionado tiene CMPBC > 0. Si no tiene CMPBC, puedes seguir configurando la producción manualmente.' },
    { cat: '🔨 Producción', q: '¿Qué es el CMPBC?', a: 'Es la Capacidad Máxima de Producción por Bloque de Corriente. Indica cuántas unidades de un producto puedes producir en un solo bloque de corriente.' },
    { cat: '🔨 Producción', q: '¿Dónde configuro el CMPBC de un producto?', a: 'En 🏷️ Productos → Nuevo/Editar Producto. Hay un bloque morado con 🏭 Capacidad máx/bloque (solo Admin).' },
    { cat: '🔨 Producción', q: '¿Qué valor debo poner en el CMPBC?', a: 'El número máximo de unidades que puedes producir en UN bloque de corriente. Ej: si en 3 horas de corriente produces 7 jabas, pon 7.' },
    { cat: '🔨 Producción', q: '¿Puedo dejar el CMPBC vacío?', a: 'Sí. Si lo dejas vacío o en 0, el producto no tendrá cálculo automático de bloques. El sistema seguirá funcionando con producción manual.' },
    { cat: '🔨 Producción', q: '¿Cómo sé si un producto tiene CMPBC configurado?', a: 'En la lista de productos, aparece un badge morado 🏭 X/bloque junto al nombre.' },
    { cat: '🔨 Producción', q: '¿El CMPBC es obligatorio?', a: 'No. Es opcional. Sin él, el sistema funciona como antes (producción manual).' },
    { cat: '🔨 Producción', q: '¿Cómo se relaciona el CMPBC con el modal de producción?', a: 'En el modal de producción, al seleccionar un producto con CMPBC y escribir una cantidad, aparecerá el botón ✨ Calcular bloques automáticamente.' },
    { cat: '🔨 Producción', q: '¿El CMPBC es por producto o global?', a: 'Por producto. Cada producto tiene su propia capacidad máxima por bloque.' },
    { cat: '🔨 Producción', q: '¿Qué significa bloques_usados en calendario_produccion?', a: 'Es el número de bloques de corriente que se usarán para producir la cantidad planificada (por ejemplo, 2 si necesitas dividir la producción).' },
    { cat: '🔨 Producción', q: '¿Qué contiene distribucion_bloques?', a: 'Es un JSON con la distribución por bloque. Ejemplo: [{"bloque_index": 1, "cantidad": 7}, {"bloque_index": 3, "cantidad": 5.5}].' },
    { cat: '🔨 Producción', q: '¿Cómo consulto el CMPBC de un producto por consola?', a: 'window.DBModule.getCMPBCProducto(productoId) → devuelve el valor o null.' },
    { cat: '🔨 Producción', q: '¿Cómo obtengo todos los productos con CMPBC?', a: 'window.DBModule.getProductosConCMPBC() → devuelve un array con los productos que tienen CMPBC > 0.' },
    { cat: '🔨 Producción', q: '¿Puedo cambiar el CMPBC después de crear el producto?', a: 'Sí. Solo edita el producto desde ui-productos.js (Admin) y cambia el valor.' },
    { cat: '🔨 Producción', q: '¿Qué pasa con las producciones antiguas al migrar?', a: 'La migración añade las columnas con valores por defecto (bloques_usados=1, distribucion_bloques=NULL). No se pierden datos.' },
    { cat: '🔨 Producción', q: '¿Cómo funciona el cálculo automático de bloques?', a: 'Selecciona un producto (con CMPBC), escribe la cantidad y pulsa "✨ Calcular bloques automáticamente". El sistema sugiere cómo distribuir la producción entre los bloques de corriente.' },
    { cat: '🔨 Producción', q: '¿Qué reglas sigue el algoritmo?', a: 'Prioriza bloques al amanecer (antes de las 9 AM). Si el primero del día termina muy tarde, usa el último bloque del día anterior. El primer bloque lleva más cantidad.' },
    { cat: '🔨 Producción', q: '¿Qué es la "tolerancia del amanecer"?', a: 'Los bloques que terminan entre las 8:00 y 9:00 AM también son válidos para producir el pan del desayuno.' },
    { cat: '🔨 Producción', q: '¿Qué pasa si no hay suficientes bloques?', a: 'Muestra un error indicando cuántas unidades máximo puedes producir. Puedes aumentar el CMPBC, elegir otro producto o dividir la producción en varios días.' },
    { cat: '🔨 Producción', q: '¿El sistema guarda la distribución sugerida?', a: 'Sí. Guarda en distribucion_bloques un JSON con el detalle de cada bloque usado (fecha, bloque, cantidad).' },
    { cat: '🔨 Producción', q: '¿Puedo modificar la distribución manualmente?', a: 'Sí. Después de pulsar "Confirmar", puedes editar el bloque o la cantidad manualmente y volver a guardar.' },
    { cat: '🔨 Producción', q: '¿Qué significa "Bloques: 2" en el modal?', a: 'Indica que la producción se distribuirá en 2 bloques de corriente. Ej: 7 unidades al amanecer + 5 unidades por la tarde.' },
    { cat: '🔨 Producción', q: '¿Cómo se relaciona el CMPBC con el cálculo de bloques?', a: 'El CMPBC define cuántas unidades caben por bloque. El sistema divide cantidad_total / CMPBC para saber cuántos bloques necesita.' },
    { cat: '🔨 Producción', q: '¿Qué pasa si un producto tiene CMPBC=0 o vacío?', a: 'No se puede calcular automáticamente. El botón ✨ no aparece. Puedes seguir configurando manualmente.' },
    { cat: '🔨 Producción', q: '¿El algoritmo considera la producción ya programada?', a: 'No directamente, pero el sistema sobrescribe si ya había producción ese día. El modal de confirmación avisa.' },
    { cat: '🔨 Producción', q: '¿Cómo se numeran los bloques del día anterior?', a: 'Se usa el indexEnDiaAnterior, que es la posición real del bloque en el día anterior. Ej: si es el 4º bloque del día anterior, bloque_index=4 con es_bloque_dia_anterior=1.' },
    { cat: '🔨 Producción', q: '¿El modal de producción muestra la distribución guardada?', a: 'Sí, si un día tiene bloques_usados > 1, el reporte PDF de corriente muestra un badge "N bloques" y la app puede mostrar la distribución completa.' },
    { cat: '🔨 Producción', q: '¿Puedo elegir un producto diferente al ya guardado?', a: 'Sí. Cambia el dropdown y vuelve a pulsar "✨ Calcular". El nuevo cálculo reemplazará la distribución anterior al confirmar.' },
    { cat: '🔨 Producción', q: '¿El algoritmo prioriza el bloque de ayer o el de hoy?', a: 'Si el bloque de ayer termina antes de las 8 AM, tiene prioridad ALTA. Si no, se ordenan por cercanía al amanecer.' },
    { cat: '🔨 Producción', q: '¿Qué pasa si el bloque de ayer cruza medianoche?', a: 'El algoritmo lo trata como válido si termina antes de las 9 AM del día de venta. Se muestra como "🌙 Último bloque del [fecha]".' },

    // 🌙 SECCIÓN 14: BLOQUE DEL DÍA ANTERIOR (P231-P240)
    { cat: '🌙 Bloque día anterior', q: '¿Qué es el "bloque del día anterior"?', a: 'Es el último bloque de corriente del día anterior al de venta. Se usa cuando el primer bloque del día de venta comienza demasiado tarde para tener el pan listo al amanecer.' },
    { cat: '🌙 Bloque día anterior', q: '¿Cómo se guarda el bloque del día anterior?', a: 'Se guarda con `es_bloque_dia_anterior = 1` y `fecha_bloque_real` con la fecha real del bloque. Ej: si el pedido es para el 25/09 y se hornea el 24/09, `fecha_bloque_real = 24/09`.' },
    { cat: '🌙 Bloque día anterior', q: '¿Por qué el badge muestra "🌙 Prod. ayer" en lugar de la fecha?', a: 'El badge muestra el icono 🌙 y el texto "Prod. ayer: DD/MM de HH:MM a HH:MM". El "ayer" es solo un indicador visual rápido; el mensaje completo tiene la fecha real para evitar ambigüedad.' },
    { cat: '🌙 Bloque día anterior', q: '¿Qué pasa si el bloque del día anterior no existe?', a: 'Si no hay bloque del día anterior, el algoritmo usa los bloques del día actual que terminen antes de las 9 AM. Si no hay ninguno, usa los bloques restantes ordenados por hora de inicio.' },
    { cat: '🌙 Bloque día anterior', q: '¿El bloque del día anterior se muestra en el reporte PDF?', a: 'Sí. En el reporte PDF de corriente, los bloques del día anterior se marcan con el icono 🌙 y se muestra la fecha real del bloque.' },
    { cat: '🌙 Bloque día anterior', q: '¿Puedo eliminar un bloque del día anterior?', a: 'Sí. Abre el modal de producción del día (clic en el badge), pulsa el botón 🗑️ junto a la sección de producción. Se elimina el registro completo.' },
    { cat: '🌙 Bloque día anterior', q: '¿El bloque del día anterior afecta al stock?', a: 'No. El stock se descuenta al registrar la producción, sin importar si el bloque es del día anterior o del actual. Lo único que cambia es la fecha del bloque.' },
    { cat: '🌙 Bloque día anterior', q: '¿Cómo verifico si un bloque es del día anterior?', a: 'En la consola (F12), ejecuta:\n```javascript\nconst prod = window.DBModule.getProduccionByFecha(\'2026-09-25\');\nconsole.log(\'es_bloque_dia_anterior:\', prod?.es_bloque_dia_anterior);\nconsole.log(\'fecha_bloque_real:\', prod?.fecha_bloque_real);\n```' },
    { cat: '🌙 Bloque día anterior', q: '¿El algoritmo prioriza el bloque del día anterior o el del día actual?', a: 'Prioriza el bloque del día anterior si termina antes de las 8 AM (ideal) o antes de las 9 AM (tolerancia). Si no, usa los bloques del día actual.' },
    { cat: '🌙 Bloque día anterior', q: '¿Qué es "Último bloque de ayer" en la UI?', a: 'Es la etiqueta que se muestra en el modal de producción cuando el bloque seleccionado es del día anterior. El texto es "🌙 Último bloque de ayer: HH:MM - HH:MM".' },

    // 📅 SECCIÓN 15: EXCLUIR DÍAS DE LA SEMANA (P241-P245)
    { cat: '📅 Excluir días', q: '¿Qué es la exclusión de días de la semana en reservas?', a: 'Es una funcionalidad que permite excluir ciertos días de la semana al crear reservas por período. Por ejemplo, puedes crear una reserva para todo un mes pero excluyendo los domingos.' },
    { cat: '📅 Excluir días', q: '¿Dónde encuentro la opción de excluir días?', a: 'En el modal de "📅 Reserva por período", en la sección "🚫 Excluir días de la semana (opcional)".' },
    { cat: '📅 Excluir días', q: '¿Qué días puedo excluir?', a: 'Cualquier día de la semana: Lunes, Martes, Miércoles, Jueves, Viernes, Sábado y Domingo.' },
    { cat: '📅 Excluir días', q: '¿La exclusión se combina con la paridad?', a: 'Sí. Por ejemplo, puedes crear una reserva que incluya solo días pares y que además excluya los domingos. El sistema aplica ambas reglas.' },
    { cat: '📅 Excluir días', q: '¿La exclusión funciona en todos los tipos de patrón?', a: 'La exclusión solo se aplica al patrón de tipo "Rango completo". En los patrones "Días de la semana" y "Días específicos", el usuario ya selecciona qué días incluir, por lo que la exclusión no es necesaria.' },

    // 📆 SECCIÓN 16: PRODUCCIÓN POR RANGO (P246-P250)
    { cat: '📆 Producción por rango', q: '¿Qué es "Aplicar producción a rango"?', a: 'Es una funcionalidad que permite aplicar la misma configuración de producción (bloque + cantidad + producto) a múltiples fechas a la vez.' },
    { cat: '📆 Producción por rango', q: '¿Cómo accedo a "Aplicar a rango"?', a: 'En el modal de detalle de un día (showHorarioDetalle), pulsa el botón "📅 Aplicar a rango".' },
    { cat: '📆 Producción por rango', q: '¿Qué opciones de rango puedo elegir?', a: 'Puedes elegir fechas Desde/Hasta, o usar los atajos: 7 días, 14 días, 30 días o Mes completo.' },
    { cat: '📆 Producción por rango', q: '¿Puedo excluir domingos o días sin corriente?', a: 'Sí. En el modal de rango hay dos checkboxes:\n• 🚫 Excluir los domingos\n• 🌙 Excluir días sin corriente' },
    { cat: '📆 Producción por rango', q: '¿Qué es "Bloque relativo" vs "Bloque fijo"?', a: '• Bloque relativo: Cada día usa su bloque equivalente (ej: si el día base usó el bloque 2, cada día usa su bloque 2).\n• Bloque fijo: Usa el mismo horario exacto del día base para todos los días.' },

    // 🚚 SECCIÓN 17: BOTONES DE ENTREGA (P251-P260)
    { cat: '🚚 Botones de entrega', q: '¿Cuál es la diferencia entre "Entregar (sin deuda)" y "Entregar (con deuda)"?', a: '✅ Entregar (sin deuda): Crea la venta con is_debt = 0 y paid = 1. El check "Es una deuda" queda desmarcado. El cliente paga al momento.\n\n🚚 Entregar (con deuda): Crea la venta con is_debt = 1 y paid = 0. El check "Es una deuda" queda marcado. El cliente paga después.' },
    { cat: '🚚 Botones de entrega', q: '¿Dónde están los botones de entrega?', a: 'En el modal de detalle del pedido (👁️ Ver). Aparecen en la parte inferior, en un contenedor destacado con borde punteado verde.' },
    { cat: '🚚 Botones de entrega', q: '¿Qué pasa si el pedido tenía pago adelantado y uso "Entregar (sin deuda)"?', a: 'Se ignora el saldo pendiente y la venta se marca como pagada completamente. Útil cuando el cliente decide pagar el resto al momento.' },
    { cat: '🚚 Botones de entrega', q: '¿Puedo cambiar de opinión después de entregar?', a: 'No directamente. Una vez entregado, el pedido ya generó una venta. Si necesitas corregir el tipo de deuda, debes ir a 💰 Ventas, anular la venta y volver a crearla manualmente.' },
    { cat: '🚚 Botones de entrega', q: '¿Por qué el botón "sin deuda" es verde y el "con deuda" es naranja?', a: 'Por convención visual: verde significa "todo en orden / pagado", naranja significa "pendiente / atención requerida".' },
    { cat: '🚚 Botones de entrega', q: '¿Qué pasa internamente cuando uso "Entregar (sin deuda)"?', a: 'Se llama a OrdersModule.updateOrderStatus(orderId, \'delivered\', true), que internamente ejecuta registrarVentaDesdePedido(orderId, null, true). Esto crea la venta con is_debt = 0 y paid = 1, ignorando cualquier saldo pendiente del pedido.' },
    { cat: '🚚 Botones de entrega', q: '¿Qué pasa internamente cuando uso "Entregar (con deuda)"?', a: 'Se llama a OrdersModule.updateOrderStatus(orderId, \'delivered\', false), que internamente ejecuta registrarVentaDesdePedido(orderId, null, false). Esto crea la venta con is_debt = 1 y paid = 0 (si el pedido no tenía pago adelantado completo). Podrás cobrarla desde Ventas → Deudas.' },
    { cat: '🚚 Botones de entrega', q: '¿Qué pasa si el pedido tenía pago adelantado parcial y uso "Entregar (sin deuda)"?', a: 'Se ignora el saldo pendiente y la venta se marca como pagada completamente. Esto es útil cuando el cliente decide pagar el resto al momento de la entrega.' },
    { cat: '🚚 Botones de entrega', q: '¿Qué pasa si el pedido no tiene pago adelantado y uso "Entregar (sin deuda)"?', a: 'La venta se crea con is_debt = 0 y paid = 1. El check "Es una deuda" queda desmarcado en Ventas. Es como si el cliente hubiera pagado al momento.' },
    { cat: '🚚 Botones de entrega', q: '¿Qué pasa si el pedido no tiene pago adelantado y uso "Entregar (con deuda)"?', a: 'La venta se crea con is_debt = 1 y paid = 0. El check "Es una deuda" queda marcado. Debes ir a Ventas → Deudas para cobrarla.' },

    // 🔍 SECCIÓN 18: BLOQUEO POR RECETAS (P261-P270)
    { cat: '🔍 Bloqueo recetas', q: '¿Por qué a veces no puedo editar un pedido o una venta?', a: 'Porque el pedido o venta usa una receta que NO te han compartido. Verás un badge "🔒 Solo lectura" y no podrás editarlo, anularlo, cobrarlo ni eliminarlo.' },
    { cat: '🔍 Bloqueo recetas', q: '¿Quién puede levantar el bloqueo?', a: 'Solo el administrador. Debe compartir la receta asociada con el negocio para que el usuario regular pueda procesar el pedido o venta.' },
    { cat: '🔍 Bloqueo recetas', q: '¿El bloqueo afecta a los gastos?', a: 'No. Los gastos no tienen receta asociada, así que nunca se bloquean.' },
    { cat: '🔍 Bloqueo recetas', q: '¿Cómo sé qué receta está bloqueando mi pedido?', a: 'En el detalle del pedido (👁️ Ver), aparece un aviso rojo con "🔒 Solo lectura" y el listado de recetas bloqueadas. También en la lista de pedidos aparece un badge "🔒 Solo lectura".' },
    { cat: '🔍 Bloqueo recetas', q: '¿Cómo se implementó el bloqueo?', a: 'Se añadió una función `puedeUsuarioActualProcesarPedido(orderOrId)` que verifica si el usuario actual puede procesar un pedido. Si no es admin y el pedido usa recetas que no le han compartido, se bloquea la operación. Se aplica en `updateOrderStatus`, `registrarVentaDesdePedido`, `cancelarPedidoDesdeLista`, `procesarClienteDeLista`, `eliminarDeListaEspera` y `saveSale` (solo al editar).' },
    { cat: '🔍 Bloqueo recetas', q: '¿El bloqueo afecta a la lista de espera?', a: 'Sí. Los pedidos de la lista de espera que usan recetas no compartidas se filtran y no aparecen en la lista del usuario regular. El sistema muestra un aviso indicando cuántos pedidos están ocultos.' },
    { cat: '🔍 Bloqueo recetas', q: '¿Qué pasa si el admin comparte la receta después?', a: 'El bloqueo se levanta automáticamente. La caché de permisos se limpia cada vez que se edita una venta o pedido. Si recargas la página, los permisos se recalculan.' },
    { cat: '🔍 Bloqueo recetas', q: '¿Los pedidos bloqueados cuentan para el conteo de cupos?', a: 'Sí. El conteo de pedidos vs ventas se hace a nivel de base de datos, sin importar quién puede o no procesarlos. El bloqueo es solo visual y de permisos para el usuario regular.' },
    { cat: '🔍 Bloqueo recetas', q: '¿Qué pasa si el producto de un pedido no tiene receta asociada?', a: 'Si el producto no tiene receta asociada, no hay bloqueo. El pedido se puede procesar normalmente, incluso si el usuario no es admin.' },
    { cat: '🔍 Bloqueo recetas', q: '¿Cómo verifico qué pedidos están bloqueados para un usuario?', a: 'Puedes ejecutar en consola:\n```javascript\nconst bloqueados = window.OrdersModule.puedeUsuarioActualProcesarPedido(42);\nconsole.log(bloqueados);\n```\nEsto te devuelve un objeto con `puede: true/false`, `razon` y `recetasBloqueadas`.' },

    // 📄 SECCIÓN 19: REPORTES (P271-P285)
    { cat: '📄 Reportes', q: '¿Qué reportes puedo generar?', a: 'Panario genera reportes de:\n• 💰 Ventas\n• 📋 Pedidos\n• 🛒 Insumos\n• 💳 Deudas\n• 📖 Recetas\n• ⏰ Lista de espera\n• 📅 Días sin ventas\n• 📊 Gastos\n• ⚡ Corriente y producción' },
    { cat: '📄 Reportes', q: '¿Los reportes se pueden exportar a PDF?', a: 'Sí. Todos los reportes se abren en una pestaña nueva y se puede imprimir o guardar como PDF desde el diálogo de impresión del navegador.' },
    { cat: '📄 Reportes', q: '¿Los reportes respetan el tema oscuro?', a: 'No. Los reportes PDF siempre se generan en fondo blanco con texto negro, para garantizar legibilidad al imprimir. El tema de la app no afecta al PDF.' },
    { cat: '📄 Reportes', q: '¿En qué orden aparecen las ventas en el reporte PDF?', a: 'Se ordenan por fecha ascendente y, dentro de la misma fecha, por ID ascendente. La venta más antigua del día aparece primero.' },
    { cat: '📄 Reportes', q: '¿En qué orden aparecen los pedidos en el reporte PDF?', a: 'Igual: por fecha de entrega ascendente y luego por ID ascendente. El primer pedido creado para esa fecha aparece primero.' },
    { cat: '📄 Reportes', q: '¿Las deudas también se ordenan?', a: 'Sí. En el reporte de deudas, se ordenan por fecha de venta ascendente y luego por ID ascendente. La deuda más antigua aparece primero.' },
    { cat: '📄 Reportes', q: '¿Por qué añadieron la columna # en los reportes?', a: 'Para que puedas identificar rápidamente cada venta/pedido por su ID y relacionarlo con el módulo de Eliminación por Error o con la lista de la app.' },
    { cat: '📄 Reportes', q: '¿Puedo cambiar el orden de los reportes?', a: 'Actualmente no. Los reportes usan un orden fijo (fecha ASC + ID ASC) que refleja el orden cronológico real. Si necesitas otro orden, exporta a CSV o edita manualmente.' },
    { cat: '📄 Reportes', q: '¿Los reportes de insumos y recetas también se ordenan?', a: 'Los insumos se ordenan alfabéticamente por nombre (desde getInsumos()). Las recetas también se ordenan por nombre y fecha de creación.' },
    { cat: '📄 Reportes', q: '¿Puedo ver el número total de ventas/pedidos al final del reporte?', a: 'Sí. El reporte de ventas muestra el total de ventas, ingresos totales, promedio por venta, ventas liberadas y deudas pendientes. El reporte de pedidos muestra la distribución por estado.' },
    { cat: '📄 Reportes', q: '¿Por qué el reporte de ventas muestra solo 100 filas?', a: 'Para que el PDF no se haga demasiado largo. Si necesitas ver más, filtra por un rango de fechas más específico o usa la exportación de la base de datos.' },
    { cat: '📄 Reportes', q: '¿Qué significa la columna 🚀 en el detalle de ventas?', a: 'Indica que esa venta es una venta liberada (sin cliente identificado).' },
    { cat: '📄 Reportes', q: '¿Los reportes respetan el tema oscuro?', a: 'No. Los reportes PDF siempre se generan en fondo blanco con texto negro, para garantizar legibilidad al imprimir. El tema de la app no afecta al PDF.' },
    { cat: '📄 Reportes', q: '¿Puedo personalizar los filtros del reporte de ventas?', a: 'Sí. El modal de Reporte de Ventas permite filtrar por:\n• Rango de fechas\n• Cliente\n• Producto\n• Método de pago\n• Sesión\n• Vendedor (si hay más de 1 usuario)\n• Solo ventas liberadas\n• Solo deudas pendientes' },
    { cat: '📄 Reportes', q: '¿Puedo personalizar los filtros del reporte de pedidos?', a: 'Sí. El modal de Reporte de Pedidos permite filtrar por:\n• Rango de fechas\n• Cliente\n• Producto\n• Estado\n• Solo con deuda pendiente' },

    // 🔍 SECCIÓN 20: AUDITORÍA (P286-P295)
    { cat: '🔍 Auditoría', q: '¿Qué es la Auditoría?', a: 'Es una sección que muestra información sobre quién creó, modificó o eliminó un registro, con fechas exactas.' },
    { cat: '🔍 Auditoría', q: '¿Dónde veo la auditoría?', a: 'En el detalle de:\n• Ventas (👁️ Ver)\n• Gastos (👁️ Ver)\n• Pedidos (👁️ Ver)\n• Recetas (👁️ Ver)\n• Insumos (en la tarjeta)\n• Productos (en la tarjeta)' },
    { cat: '🔍 Auditoría', q: '¿Qué información muestra la auditoría?', a: '• 👤 Creado por: Nombre del usuario que creó el registro\n• 📅 Fecha: Fecha y hora de creación\n• ✏️ Modificado por: Nombre del usuario que modificó (si aplica)\n• 📅 Última modificación: Fecha y hora de la modificación (si aplica)' },
    { cat: '🔍 Auditoría', q: '¿Qué pasa si un usuario es eliminado?', a: 'Sus registros se mantienen, pero el nombre del usuario aparecerá como "Desconocido" en la auditoría.' },
    { cat: '🔍 Auditoría', q: '¿Cómo se implementó la auditoría?', a: 'Se añadieron columnas `created_by` y `modified_by` a todas las tablas críticas. El sistema las rellena automáticamente al crear o modificar registros.' },
    { cat: '🔍 Auditoría', q: '¿Puedo filtrar por usuario en la auditoría?', a: 'No directamente desde la UI. Pero puedes ver el nombre del creador en el detalle de cada registro.' },
    { cat: '🔍 Auditoría', q: '¿La auditoría se incluye en los reportes PDF?', a: 'No en todos. Los reportes de ventas y pedidos muestran el vendedor en el detalle, pero la auditoría completa está en el detalle de cada registro en la app.' },
    { cat: '🔍 Auditoría', q: '¿Se puede editar el campo created_by?', a: 'No. El campo `created_by` se asigna al crear el registro y no se puede modificar. Solo `modified_by` se actualiza al editar.' },
    { cat: '🔍 Auditoría', q: '¿Qué pasa si hay múltiples modificaciones?', a: 'Solo se guarda la última modificación (el último `modified_by` y `updated_at`). No hay historial completo de cambios.' },
    { cat: '🔍 Auditoría', q: '¿Cómo verifico la auditoría por consola?', a: '```javascript\nconst venta = window.DBModule.query("SELECT id, created_by, modified_by, created_at, updated_at FROM sales WHERE id = 42")[0];\nconsole.log(venta);\n```' },

    // 🎉 SECCIÓN 21: v2.2.0 + v2.2.1 + v2.2.9 (P296-P315)
    { cat: '🎉 Versiones', q: '¿Por qué la versión saltó a v2.2.0?', a: 'Porque la Entrega B (CMPBC + algoritmo inteligente de bloques) es una funcionalidad mayor que justifica un salto de versión. v2.1.x → v2.2.0.' },
    { cat: '🎉 Versiones', q: '¿Qué pasa con el caché antiguo al actualizar?', a: 'El Service Worker detecta el cambio de versión y elimina automáticamente los cachés obsoletos (panario-static-v2.1.11, etc.). Solo se conserva el caché nuevo.' },
    { cat: '🎉 Versiones', q: '¿Tengo que hacer algo especial para actualizar a v2.2.9?', a: 'No. Solo recarga la app con conexión a internet. El SW se actualizará solo en 5-10 segundos. Si no ves los cambios, limpia el caché y recarga con Ctrl+Shift+R.' },
    { cat: '🎉 Versiones', q: '¿La nueva versión es compatible con mis datos actuales?', a: 'Sí, totalmente. La migración es automática y no pierde datos. Tienes tu base de datos intacta.' },
    { cat: '🎉 Versiones', q: '¿Cómo sé que estoy en v2.2.9?', a: 'Ve a ⚙️ Herramientas → al final verás "Versión: 2.2.9". También puedes verificar en la consola: window.getAppVersion()' },
    { cat: '🎉 Versiones', q: '¿Qué es el shortcut "Producción" de la PWA?', a: 'Es un acceso directo que añadí en v2.2.0 para que puedas ir directamente a la planificación de producción desde el icono de Panario en tu móvil. Mantén pulsado el icono y verás las opciones.' },
    { cat: '🎉 Versiones', q: '¿Los shortcuts funcionan en iOS?', a: 'En iOS, los shortcuts de la PWA tienen soporte limitado. Solo funcionan si la PWA está instalada y depende de la versión de iOS. En Android funcionan correctamente.' },
    { cat: '🎉 Versiones', q: '¿Por qué hay 6 shortcuts ahora?', a: 'Antes había 5 (Inicio, Pedidos, Lista de espera, Ventas, Herramientas). Añadí "Producción" en v2.2.0 porque la nueva funcionalidad de CMPBC requiere acceso rápido al calendario de corriente.' },
    { cat: '🎉 Versiones', q: '¿La versión del manifest coincide con la app?', a: 'Sí. Desde v2.2.9, el manifest.json, el sw.js, el index.html y todos los archivos usan la misma versión: 2.2.9. Esto facilita el mantenimiento.' },
    { cat: '🎉 Versiones', q: '¿Cómo veo la versión del manifest en el navegador?', a: 'En Chrome/Edge: DevTools (F12) → Application → Manifest. Ahí verás el nombre, la descripción y los iconos. La versión no siempre se muestra visualmente, pero puedes verla con fetch(\'./manifest.json\').then(r => r.json())' },
    { cat: '🎉 Versiones', q: '¿Qué novedades trae la v2.2.0?', a: 'Incluye la Entrega B completa: capacidad máxima por bloque (CMPBC), algoritmo inteligente de bloques, dropdown de productos en el modal de producción, y 6 shortcuts en la PWA.' },
    { cat: '🎉 Versiones', q: '¿Cómo actualizo Panario a v2.2.9 si la tengo instalada?', a: 'Abre la app con internet. En 5-10 segundos aparecerá un diálogo "✨ Actualización disponible". Pulsa "🔄 Sí, actualizar" y la app se recargará con la nueva versión.' },
    { cat: '🎉 Versiones', q: '¿Por qué cambiaron los shortcuts de la PWA?', a: 'Añadí un shortcut "Producción" para que puedas acceder rápidamente al calendario de corriente y al algoritmo CMPBC. Ahora hay 6 shortcuts (antes 5).' },
    { cat: '🎉 Versiones', q: '¿Qué pasa con mis datos al actualizar a v2.2.9?', a: 'Nada. Tus datos (SQLite + localStorage) se conservan intactos. La migración de BD es automática e idempotente.' },
    { cat: '🎉 Versiones', q: '¿La versión del manifest y del sw.js deben coincidir?', a: 'Sí. En v2.2.9, el manifest.json, el sw.js, el index.html, el offline.html y los fallbacks de getAppVersion() usan todos 2.2.9. Esto garantiza coherencia.' },
    { cat: '🎉 Versiones', q: '¿Cómo sé si estoy corriendo la v2.2.9?', a: 'Ve a ⚙️ Herramientas → al final verás "Versión: 2.2.9". También puedes verificar en la consola: window.getAppVersion().' },
    { cat: '🎉 Versiones', q: '¿La v2.2.9 rompe algo de las versiones anteriores?', a: 'No. La v2.2.9 es compatible con todos los datos de versiones anteriores (v2.0.x, v2.1.x, v2.2.0). Solo añade funcionalidad nueva y correcciones.' },
    { cat: '🎉 Versiones', q: '¿Por qué la versión del caché cambió a panario-v2.2.9?', a: 'Para forzar una reinstalación limpia del Service Worker y garantizar que todos los assets actualizados se re-cachean correctamente.' },
    { cat: '🎉 Versiones', q: '¿Qué hago si el navegador sigue sirviendo la versión antigua?', a: 'Limpia el caché del navegador (o usa offline.html → "🧹 Limpiar caché y recargar") y recarga con Ctrl+Shift+R. Si persiste, desinstala la PWA y vuelve a instalarla.' },
    { cat: '🎉 Versiones', q: '¿Cuándo debo actualizar a v2.2.9?', a: 'Cuanto antes. La v2.2.9 tiene mejoras significativas: pantalla completa corregida, fallback de versión coherente, y correcciones importantes en producción y fechas.' },
    { cat: '🎉 Versiones', q: '¿Qué es el CMPBC y por qué es importante?', a: 'El CMPBC (Capacidad Máxima por Bloque de Corriente) es una funcionalidad introducida en v2.2.0 que permite calcular automáticamente cuántos bloques de corriente necesitas para producir una cantidad determinada.' },
    { cat: '🎉 Versiones', q: '¿Qué mejoras trae la v2.2.9 con respecto a v2.2.8?', a: 'La v2.2.9 incluye:\n• Corrección #11: Guardar producto_id en producción (db.js v2.2.7)\n• Corrección #17: Dos botones de entrega (sin/con deuda)\n• Corrección #19: Filtros al hacer clic en tarjetas del Dashboard\n• Optimizaciones de rendimiento\n• Mejoras en la gestión de errores' },
    { cat: '🎉 Versiones', q: '¿Por qué la versión del fallback de getAppVersion() cambió?', a: 'Antes, si el archivo index.html no exponía la etiqueta <meta name="app-version">, el sistema usaba un valor por defecto (2.1.11). Se ha actualizado ese valor a 2.2.9 para garantizar coherencia incluso si la lectura de la etiqueta falla.' },
    { cat: '🎉 Versiones', q: '¿Dónde se define la versión de la aplicación?', a: 'En dos lugares: (1) en index.html con <meta name="app-version" content="2.2.9"> (fuente principal), y (2) como fallback en app.js, ui-settings.js y db.js mediante la función getAppVersion().' },
    { cat: '🎉 Versiones', q: '¿Cómo sé si estoy usando la versión más reciente de Panario?', a: 'Ve a ⚙️ Herramientas → ℹ️ Información. La versión mostrada debe ser 2.2.9. También puedes verificarlo en la consola con getAppVersion().' },
    { cat: '🎉 Versiones', q: '¿Por qué antes no aparecían productos por defecto al crear una cuenta nueva?', a: 'Era un bug: el sistema intentaba insertar los productos por defecto en una tabla llamada products (en inglés) que no existía. La tabla real es productos (en español). Ahora el sistema inserta correctamente en productos, con las columnas correctas. Si creas una cuenta nueva, verás los 18 productos por defecto cargados automáticamente.' },
    { cat: '🎉 Versiones', q: '¿Qué pasa con los productos que ya tenía creados?', a: 'Nada. La semilla de productos por defecto solo se ejecuta si la tabla productos está completamente vacía (0 registros). Si ya tienes productos, tus datos se conservan y no se añade nada.' },
    { cat: '🎉 Versiones', q: '¿Puedo borrar los productos por defecto y empezar con una lista limpia?', a: 'Sí. Puedes eliminar los productos individualmente (soft-delete) o limpiar los datos eliminados desde Herramientas. Si borras TODOS los productos (soft-delete), el sistema no volverá a insertar los productos por defecto (porque el check es COUNT(*) WHERE deleted_at IS NULL).' },
    { cat: '🎉 Versiones', q: '¿Qué versión de la app se reporta en las copias de seguridad?', a: 'La versión 2.2.9. Se guarda en la tabla interna _panario_meta de cada archivo .db exportado, en el campo backup_version.' },
    { cat: '🎉 Versiones', q: '¿Qué significa el log 🌱 [seedDefaultProducts] ✅ 18 productos por defecto insertados?', a: 'Significa que, al inicializar la BD, se encontró la tabla productos vacía y se insertaron automáticamente los 18 productos de ejemplo. Es normal en la primera ejecución de una cuenta nueva.' },
    { cat: '🎉 Versiones', q: '¿Puedo desactivar la semilla de productos por defecto?', a: 'No está expuesto como opción de usuario. Es una conveniencia para que los nuevos usuarios tengan un catálogo inicial. Si no los quieres, elimínalos y el sistema no los volverá a insertar (porque ya no estará vacía la tabla).' },
    { cat: '🎉 Versiones', q: '¿Por qué a veces veo "Ya existen N productos. No se insertan por defecto"?', a: 'Porque el sistema detecta que ya tienes productos en la base de datos. Es correcto: la semilla solo se ejecuta si la tabla está vacía. Así evita duplicados.' },

    // 🐛 SECCIÓN 22: CORRECCIONES FINALES (P316-P397)
    { cat: '🐛 Correcciones', q: '¿Por qué el badge de producción ahora es clickeable?', a: 'Para que puedas editar rápidamente la producción de un día sin tener que ir al calendario en Herramientas. Al hacer clic sobre el badge morado (🔨 Producción: o 🌙 Prod. ayer:), se abre directamente el modal de configuración de producción para ese día.' },
    { cat: '🐛 Correcciones', q: '¿Qué pasa si hago clic en el badge de producción?', a: 'Se abre el modal de configuración de producción (showHorarioDetalle) para el día correspondiente. Desde ahí puedes ver los detalles, cambiar la cantidad, cambiar el bloque, o eliminar la producción.' },
    { cat: '🐛 Correcciones', q: '¿El clic en el badge expande la tarjeta del día?', a: 'No. El clic en el badge está aislado (event.stopPropagation()), por lo que la tarjeta del día no se expande ni se colapsa. Solo se abre el modal de producción.' },
    { cat: '🐛 Correcciones', q: '¿Cómo sé que el badge es clickeable?', a: 'Al pasar el ratón sobre el badge, cambia de color (efecto hover) y el cursor se convierte en una mano (pointer). Además, aparece un tooltip: "Clic para configurar la producción del día".' },
    { cat: '🐛 Correcciones', q: '¿Funciona también en móvil?', a: 'Sí. En móvil, al tocar el badge, se abre el modal de configuración de producción. El efecto hover no se aplica en móvil (porque no hay ratón), pero el cursor pointer y el tooltip sí funcionan.' },
    { cat: '🐛 Correcciones', q: '¿Qué diferencia hay entre el badge del día actual y el del día anterior?', a: 'El icono te lo indica:\n\n🔨 Producción: → Es un bloque del día actual del pedido.\n\n🌙 Prod. ayer: → Es un bloque del día anterior al de entrega.\n\nAmbos tienen el mismo formato de fecha/hora: DD/MM de HH:MM a HH:MM.' },
    { cat: '🐛 Correcciones', q: '¿El clic en el badge funciona si el pedido está bloqueado por recetas no compartidas?', a: 'Sí. El badge de producción es independiente del bloqueo por recetas. Puedes hacer clic en él incluso si el pedido está en modo solo-lectura.' },
    { cat: '🐛 Correcciones', q: '¿El clic en el badge abre el modal en la pestaña correcta?', a: 'Sí. Al abrir el modal de producción desde el badge, se muestra directamente el detalle del día seleccionado (no la pestaña de configuración general).' },
    { cat: '🐛 Correcciones', q: '¿Qué pasa si el día no tiene producción programada?', a: 'Si el día no tiene producción programada, no aparece el badge morado. Para programar producción, debes ir al calendario en Herramientas → Gestionar Horarios → Calendario.' },
    { cat: '🐛 Correcciones', q: '¿Por qué el modal de producción no guardaba el producto?', a: 'Era un bug de la versión anterior (v2.2.2). El modal solo guardaba el bloque y la cantidad, pero no el producto_id. Esto causaba que al reabrir el modal, el producto seleccionado se perdiera. En la versión v2.2.9 (Corrección #11) esto está resuelto.' },
    { cat: '🐛 Correcciones', q: '¿Qué pasa si el producto que guardé ya no tiene CMPBC?', a: 'En la versión v2.2.9, el dropdown de productos muestra TODOS los productos (con o sin CMPBC). Si un producto guardado ya no tiene CMPBC, se preselecciona igualmente, pero no aparece el botón "✨ Calcular bloques automáticamente".' },
    { cat: '🐛 Correcciones', q: '¿Cómo sé si un producto tiene CMPBC configurado?', a: 'En el dropdown del modal de producción, los productos con CMPBC muestran el texto 🏭 X/bloque (ej: 🏭 7/bloque). Los productos sin CMPBC muestran — Sin CMPBC —.' },
    { cat: '🐛 Correcciones', q: '¿Puedo guardar producción sin seleccionar un producto?', a: 'Sí. El dropdown tiene la opción — Sin producto específico — que guarda la producción con producto_id = NULL. Esto es útil si no necesitas vincular la producción a un producto concreto.' },
    { cat: '🐛 Correcciones', q: '¿El producto se guarda al usar "Aplicar a rango"?', a: 'Sí. Desde v2.2.9, el producto seleccionado en el modal base se propaga a todas las fechas del rango.' },
    { cat: '🐛 Correcciones', q: '¿Cómo verifico que el producto se guardó correctamente?', a: 'Abre la consola del navegador (F12) y ejecuta:\n```javascript\nconst prod = window.DBModule.getProduccionByFecha(\'2026-09-25\');\nconsole.log(\'producto_id:\', prod?.producto_id);\n```' },
    { cat: '🐛 Correcciones', q: '¿Qué pasa con las producciones antiguas que no tienen producto_id?', a: 'Las producciones antiguas tienen producto_id = NULL por defecto. Al reabrir el modal, el dropdown mostrará — Sin producto específico — y podrás asignarles un producto manualmente.' },
    { cat: '🐛 Correcciones', q: '¿El diagnóstico de producción verifica el producto_id?', a: 'Sí. Desde v2.2.9, el diagnóstico tiene 9 tests (antes 8). El test #9 verifica que la columna producto_id exista en la tabla calendario_produccion.' },
    { cat: '🐛 Correcciones', q: '¿Puedo cambiar el producto de una producción ya guardada?', a: 'Sí. Abre el modal de producción del día, cambia el producto en el dropdown, y pulsa "💾 Guardar solo este día".' },
    { cat: '🐛 Correcciones', q: '¿El producto se usa en el cálculo automático de bloques?', a: 'Sí. Cuando seleccionas un producto con CMPBC y pulsas "✨ Calcular bloques automáticamente", el sistema usa el CMPBC de ese producto para calcular la distribución.' },
    { cat: '🐛 Correcciones', q: '¿Por qué el contador de "Pedidos: 3/6" cambiaba al convertir un pedido en venta?', a: 'Era un bug: el conteo solo consideraba pedidos pendientes, así que al convertirlos en venta, "desaparecían" del cupo. Ahora el conteo incluye TODOS los pedidos (excepto cancelados), así que un pedido entregado sigue ocupando su cupo. El cupo solo se libera si el pedido se cancela.' },
    { cat: '🐛 Correcciones', q: '¿Qué significa "ventas directas" en el modal de producción?', a: 'Son las ventas que NO provienen de un pedido, como las ventas de mostrador. Se cuentan por separado para descontarlas del cupo disponible. Fórmula: disponibles = cantidad_produccion - pedidos - ventas_directas.' },
    { cat: '🐛 Correcciones', q: '¿Por qué el diagnóstico de producción ahora tiene 8 tests?', a: 'Se añadió un test para verificar que la nueva función de conteo unificado (contarPedidosYVentasFecha) esté disponible. Este test aparece como advertencia (⚠️) si no está, porque la app puede seguir funcionando con el fallback local.' },
    { cat: '🐛 Correcciones', q: '¿Por qué veo el mensaje 📊 [ui-settings] Delegando en DBModule.contarPedidosYVentasFecha(...) en la consola?', a: 'Es un log de diagnóstico que indica que la función local está usando la versión unificada de DBModule. Esto es correcto y garantiza que no haya discrepancias en el conteo. Puedes ignorarlo.' },
    { cat: '🐛 Correcciones', q: '¿Cómo se calcula ahora la cantidad de pedidos disponibles en la tarjeta de fecha?', a: 'El cálculo ahora es unificado y correcto. La fórmula es: Disponibles = Cantidad a Producir - (Todos los Pedidos Válidos + Ventas Directas). Los pedidos válidos son todos excepto los cancelados. Las ventas directas son las que no provienen de un pedido.' },
    { cat: '🐛 Correcciones', q: '¿Por qué un pedido que ya fue entregado sigue contando en el cupo del día?', a: 'Porque el cupo se define por la cantidad de pedidos comprometidos para ese día, sin importar si ya se entregaron o no. Una vez que se hace un pedido, ese cupo queda reservado. El cupo solo se libera si el pedido se cancela.' },
    { cat: '🐛 Correcciones', q: '¿Las ventas directas afectan la cantidad de pedidos que puedo crear para un día?', a: 'Sí, ahora sí. Las ventas directas (como las ventas liberadas) se suman a los pedidos para calcular el cupo total. Si la producción es de 6 unidades y tienes 1 venta directa, solo podrás crear 5 pedidos más.' },
    { cat: '🐛 Correcciones', q: '¿Qué pasa si cancelo un pedido? ¿Se libera el cupo?', a: 'Sí. Al cancelar un pedido, este deja de contar para el cupo del día, liberando automáticamente una unidad de producción para que puedas crear un nuevo pedido o registrar una venta directa.' },
    { cat: '🐛 Correcciones', q: '¿Por qué el conteo en la tarjeta de pedidos y en el calendario de producción ahora coinciden?', a: 'Porque ambos usan la misma función de conteo unificada (contarPedidosYVentasFecha). Esto garantiza que no haya discrepancias y que la información que ves en la lista de pedidos sea la misma que la del calendario de producción.' },
    { cat: '🐛 Correcciones', q: '¿Por qué el número de "Pedidos de hoy" en el Dashboard es diferente al de la lista de Pedidos?', a: 'Ya no debería ser diferente. A partir de la versión 2.2.2, ambos usan la misma función de conteo unificada. Si ves una discrepancia, asegúrate de haber recargado la página para obtener la última versión.' },
    { cat: '🐛 Correcciones', q: '¿Un pedido que ya fue entregado sigue contando como "Pedido de hoy"?', a: 'Sí. El contador de "Pedidos de hoy" incluye todos los pedidos con fecha de entrega para hoy, excepto los cancelados. Un pedido entregado sigue siendo un pedido que se comprometió para ese día, por lo que se mantiene en el conteo.' },
    { cat: '🐛 Correcciones', q: '¿Qué pasa si cancelo un pedido? ¿Se actualiza el Dashboard?', a: 'Sí. Al cancelar un pedido, este deja de contar para el cupo del día, por lo que el número en el Dashboard se actualizará automáticamente para reflejar la nueva cantidad de pedidos activos.' },
    { cat: '🐛 Correcciones', q: '¿El contador de "Pedidos mañana" se actualiza automáticamente?', a: 'Sí. Se recalcula cada vez que abres el Dashboard o cuando ocurre un evento db-saved (creación, edición o eliminación de pedidos).' },
    { cat: '🐛 Correcciones', q: '¿Por qué la barra de título (top bar) se deformaba antes?', a: 'Porque algunos modales o animaciones aplicaban transform a elementos ancestros del header, lo que rompía el position: sticky. Esto hacía que el header se comportara como relative y se desplazara hacia abajo.' },
    { cat: '🐛 Correcciones', q: '¿Qué se ha hecho para solucionarlo?', a: 'Se han añadido reglas CSS defensivas que fuerzan position: sticky en el header y resetean cualquier transform residual. Además, se ha ampliado la función limpiarEstilosResiduales() para que se ejecute en más eventos (navegación, cambio de visibilidad, resize, orientación, focus, scroll) y limpie más propiedades.' },
    { cat: '🐛 Correcciones', q: '¿Tengo que hacer algo especial para que funcione?', a: 'No. La corrección se aplica automáticamente. Solo asegúrate de tener la versión 2.2.9 o superior. Si ves que el problema persiste, limpia el caché del navegador y recarga con Ctrl+Shift+R.' },
    { cat: '🐛 Correcciones', q: '¿Por qué la barra de título se deformaba al minimizar y restaurar la app?', a: 'Porque al minimizar, algunos navegadores móviles aplican transform al body o #appScreen para optimizar el rendimiento. Al restaurar, ese transform quedaba "huérfano" y rompía el sticky del header. Ahora, un listener de visibilitychange limpia esos estilos residuales al volver a primer plano.' },
    { cat: '🐛 Correcciones', q: '¿La corrección afecta al rendimiento de la app?', a: 'No. La limpieza de estilos residuales es una operación muy ligera (solo resetea unas pocas propiedades CSS) y se ejecuta con debounce para evitar llamadas excesivas. No afecta al rendimiento general.' },
    { cat: '🐛 Correcciones', q: '¿Por qué el badge de producción es clickeable?', a: 'Para que puedas editar rápidamente la producción de un día sin tener que ir al calendario en Herramientas. Al hacer clic en el badge morado (🔨 Producción: o 🌙 Prod. ayer:), se abre directamente el modal de configuración de producción para ese día.' },
    { cat: '🐛 Correcciones', q: '¿Qué pasa si hago clic en el badge de producción?', a: 'Se abre el modal de configuración de producción (showHorarioDetalle) para el día correspondiente. Desde ahí puedes ver los detalles, cambiar la cantidad, cambiar el bloque, o eliminar la producción.' },
    { cat: '🐛 Correcciones', q: '¿El clic en el badge expande la tarjeta del día?', a: 'No. El clic en el badge está aislado (event.stopPropagation()), por lo que la tarjeta del día no se expande ni se colapsa. Solo se abre el modal de producción.' },
    { cat: '🐛 Correcciones', q: '¿Cómo sé que el badge es clickeable?', a: 'Al pasar el ratón sobre el badge, cambia de color (efecto hover) y el cursor se convierte en una mano (pointer). Además, aparece un tooltip: "Clic para editar la producción del día".' },
    { cat: '🐛 Correcciones', q: '¿Funciona también en móvil?', a: 'Sí. En móvil, al tocar el badge, se abre el modal de configuración de producción. El efecto hover no se aplica en móvil (porque no hay ratón), pero el cursor pointer y el tooltip sí funcionan.' },
    { cat: '🐛 Correcciones', q: '¿Cómo se calcula ahora la cantidad de pedidos disponibles en la tarjeta de fecha?', a: 'El cálculo ahora es unificado y correcto. La fórmula es: Disponibles = Cantidad a Producir - (Todos los Pedidos Válidos + Ventas Directas). Los pedidos válidos son todos excepto los cancelados.' },
    { cat: '🐛 Correcciones', q: '¿Por qué un pedido que ya fue entregado sigue contando en el cupo del día?', a: 'Porque el cupo se define por la cantidad de pedidos comprometidos para ese día, sin importar si ya se entregaron o no. Una vez que se hace un pedido, ese cupo queda reservado.' },
    { cat: '🐛 Correcciones', q: '¿Las ventas directas afectan la cantidad de pedidos que puedo crear para un día?', a: 'Sí, ahora sí. Las ventas directas (como las ventas liberadas) se suman a los pedidos para calcular el cupo total. Si la producción es de 6 unidades y tienes 1 venta directa, solo podrás crear 5 pedidos más.' },
    { cat: '🐛 Correcciones', q: '¿Qué pasa si cancelo un pedido? ¿Se libera el cupo?', a: 'Sí. Al cancelar un pedido, este deja de contar para el cupo del día, liberando automáticamente una unidad de producción para que puedas crear un nuevo pedido o registrar una venta directa.' },
    { cat: '🐛 Correcciones', q: '¿Por qué el conteo en la tarjeta de pedidos y en el calendario de producción ahora coinciden?', a: 'Porque ambos usan la misma función de conteo unificada (contarPedidosYVentasFecha). Esto garantiza que no haya discrepancias.' },
    { cat: '🐛 Correcciones', q: '¿Por qué el número de "Pedidos de hoy" en el Dashboard es diferente al de la lista de Pedidos?', a: 'Ya no debería ser diferente. A partir de la versión 2.2.2, ambos usan la misma función de conteo unificada.' },
    { cat: '🐛 Correcciones', q: '¿Un pedido que ya fue entregado sigue contando como "Pedido de hoy"?', a: 'Sí. El contador de "Pedidos de hoy" incluye todos los pedidos con fecha de entrega para hoy, excepto los cancelados.' },
    { cat: '🐛 Correcciones', q: '¿Qué pasa si cancelo un pedido? ¿Se actualiza el Dashboard?', a: 'Sí. Al cancelar un pedido, este deja de contar para el cupo del día, por lo que el número en el Dashboard se actualizará automáticamente.' },
    { cat: '🐛 Correcciones', q: '¿El contador de "Pedidos mañana" se actualiza automáticamente?', a: 'Sí. Se recalcula cada vez que abres el Dashboard o cuando ocurre un evento db-saved.' },

    // 🔧 SECCIÓN 23: PRODUCCIÓN Y BLOQUES (P398-P410)
    { cat: '🔧 Producción', q: '¿Qué mejoras tiene el algoritmo de bloques en v2.2.9?', a: 'El algoritmo ahora respeta correctamente la regla del amanecer:\n• Un bloque es "del amanecer" si su hora de FIN es ≤ 9:00 AM del día de venta.\n• Un bloque que comienza a las 8:00 AM y termina a las 11:00 AM NO es del amanecer.\n• Si no hay bloques válidos al amanecer del día V, se usa el último bloque del día V-1.\n• El mensaje usa el formato `DD/MM de HH:MM a HH:MM` sin la palabra "ayer".' },
    { cat: '🔧 Producción', q: '¿Por qué antes el algoritmo elegía mal el bloque?', a: 'Porque solo verificaba la hora de INICIO del bloque, no la de FIN. Ahora verifica la hora de FIN.' },
    { cat: '🔧 Producción', q: '¿El producto seleccionado en el modal de producción se guarda?', a: 'Sí. Desde v2.2.9, al guardar la producción se guarda el `producto_id` en la tabla `calendario_produccion`. Al reabrir el modal, el producto aparece preseleccionado.' },
    { cat: '🔧 Producción', q: '¿Qué pasa si el producto guardado luego se elimina?', a: 'El `producto_id` sigue en la BD, pero `getProductoDeProduccion()` devuelve `null` (porque el producto tiene soft-delete). La producción sigue existiendo, solo pierde la referencia al producto.' },
    { cat: '🔧 Producción', q: '¿El producto se propaga a todas las fechas del rango?', a: 'Sí. Al usar "📅 Aplicar a rango", el `producto_id` seleccionado en el modal base se propaga a TODAS las fechas del rango.' },
    { cat: '🔧 Producción', q: '¿Cómo verifico que el producto se guardó correctamente?', a: 'Abre la consola (F12) y ejecuta:\n```javascript\nconst prod = window.DBModule.getProduccionByFecha(\'2026-09-25\');\nconsole.log(\'producto_id:\', prod?.producto_id);\n```\nDebe devolver el ID del producto que guardaste.' },
    { cat: '🔧 Producción', q: '¿Qué significan los iconos en el badge de producción?', a: '🔨 `Producción: DD/MM de HH:MM a HH:MM` → Bloque del día actual del pedido.\n🌙 `Prod. ayer: DD/MM de HH:MM a HH:MM` → Bloque del día anterior.\nAmbos usan el mismo formato de fecha/hora, sin la palabra "ayer".' },
    { cat: '🔧 Producción', q: '¿El badge de producción es clickeable?', a: 'Sí. Al hacer clic sobre el badge morado, se abre directamente el modal de configuración de producción para ese día. La tarjeta del día NO se expande.' },
    { cat: '🔧 Producción', q: '¿Cómo interpreto "Pedidos: 3/6.5"?', a: 'Significa:\n• **3:** Pedidos reservados para ese día.\n• **6.5:** Producción total programada.\n• **Disponibles:** 6.5 - 3 = 3.5 cupos.' },
    { cat: '🔧 Producción', q: '¿Qué pasa si convierto un pedido en venta? ¿Baja el contador de pedidos?', a: 'NO. Desde v2.2.9, el conteo incluye TODOS los pedidos (excepto cancelados). Un pedido entregado sigue ocupando su cupo. El cupo solo se libera si el pedido se cancela.' },
    { cat: '🔧 Producción', q: '¿Por qué el contador ahora incluye ventas directas?', a: 'Porque las ventas directas (sin pedido) también consumen producción. La fórmula es: `disponibles = cantidad_produccion - pedidos_válidos - ventas_directas`.' },
    { cat: '🔧 Producción', q: '¿Qué es el "umbral ideal" del amanecer?', a: 'Es las 8:00 AM. El algoritmo prioriza los bloques que terminan antes de las 8 AM (ideal), pero también acepta los que terminan antes de las 9 AM (tolerancia).' },
    { cat: '🔧 Producción', q: '¿Por qué el algoritmo prioriza el bloque del día anterior?', a: 'Porque si el bloque del día anterior termina antes de las 8 AM (o antes de las 9 AM), el pan estará listo mucho antes del desayuno. Esto es especialmente útil cuando el primer bloque del día de venta comienza tarde (después de las 8 AM).' }
];

// ============================================================
// MOSTRAR FAQ CON NUMERACIÓN Y BUSCADOR
// ============================================================

function showFAQModal() {
    const existingModal = document.getElementById('faq-modal');
    if (existingModal) existingModal.remove();
    const faqsNumeradas = FAQS_DB.map((f, i) => ({ ...f, num: i + 1 }));
    let faqHtml = '';
    let currentCat = '';
    faqsNumeradas.forEach(f => {
        if (f.cat !== currentCat) {
            currentCat = f.cat;
            faqHtml += `<div class="faq-category" data-category="${currentCat}" style="margin-top: 14px; margin-bottom: 8px; font-size: 13px; font-weight: 700; color: var(--primary); padding: 6px 10px; background: var(--primary-light); border-radius: 6px; border-left: 3px solid var(--primary);">${currentCat}</div>`;
        }
        faqHtml += `
            <div class="faq-item-container" data-num="${f.num}" data-q="${f.q.toLowerCase()}" data-a="${f.a.toLowerCase()}" style="background: var(--bg); padding: 10px 14px; border-radius: 6px; margin-bottom: 6px; cursor: pointer; border: 1px solid var(--border-color);" onclick="toggleFAQ(this)">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                    <span style="font-weight: 600; font-size: 13px; flex: 1; display: flex; gap: 8px; align-items: baseline;">
                        <span style="color: var(--primary); font-weight: 700; min-width: 28px; text-align: right;">${f.num}.</span>
                        <span>${f.q}</span>
                    </span>
                    <span class="faq-arrow" style="font-size: 16px; transition: transform 0.3s; flex-shrink: 0;">▶️</span>
                </div>
                <div class="faq-content" style="display: none; margin-top: 8px; font-size: 13px; color: var(--text-light); padding-top: 8px; padding-left: 36px; border-top: 1px solid var(--border-color); line-height: 1.6; white-space: pre-line;">${f.a}</div>
            </div>
        `;
    });
    const totalFaqs = FAQS_DB.length;
    const modal = document.createElement('div');
    modal.id = 'faq-modal';
    modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: ${HELP_MODAL_Z_INDEX}; padding: 20px; animation: modalFadeIn 0.25s ease;`;
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #3b82f6;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">❓</span>
                    <div><h2 style="margin: 0; font-size: 18px; color: #3b82f6;">Preguntas Frecuentes</h2><p style="margin: 2px 0 0 0; font-size: 11px; color: var(--text-light);">${totalFaqs} preguntas numeradas</p></div>
                </div>
                <button onclick="closeFAQModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            <div style="margin-bottom: 12px; position: relative;">
                <input type="text" id="faq-search-input" placeholder="🔍 Buscar por número o texto..." oninput="filtrarFAQs(this.value)" style="width: 100%; padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 14px; background: var(--bg-input); color: var(--text); outline: none;">
                <div id="faq-search-count" style="font-size: 11px; color: var(--text-light); margin-top: 4px; display: none;"></div>
            </div>
            <p style="font-size: 12px; color: var(--text-light); margin-bottom: 12px;">📚 Haz clic en cada pregunta para ver la respuesta.</p>
            <div id="faq-list" style="display: flex; flex-direction: column; gap: 4px;">${faqHtml}</div>
            <div id="faq-empty-message" style="display: none; text-align: center; padding: 40px 20px; color: var(--text-light);">
                <span style="font-size: 48px;">🔍</span><p style="margin-top: 12px;">No se encontraron preguntas que coincidan</p>
            </div>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color); display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="closeFAQModal()" class="btn secondary" style="padding: 8px 16px; font-size: 13px; width: auto; flex: 1;">Cerrar</button>
                <button onclick="closeFAQModal(); abrirAyudaDetallada();" class="btn primary" style="padding: 8px 16px; font-size: 13px; width: auto; flex: 1; background: #10b981; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">📖 Ayuda detallada</button>
                <button onclick="closeFAQModal(); startTour();" class="btn primary" style="padding: 8px 16px; font-size: 13px; width: auto; flex: 1; background: #f59e0b; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">🎯 Tutorial</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    forzarModalAlFrente(modal);
    if (typeof window.lockBodyScroll === 'function') window.lockBodyScroll();
    window.closeFAQModal = function() {
        const m = document.getElementById('faq-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (m.parentNode) m.remove();
                if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
                if (typeof window.limpiarEstilosResiduales === 'function') window.limpiarEstilosResiduales();
            }, 200);
        }
    };
    modal.addEventListener('click', function(e) { if (e.target === this) closeFAQModal(); });
    setTimeout(() => { document.getElementById('faq-search-input')?.focus(); }, 100);
}

function filtrarFAQs(query) {
    const q = String(query || '').trim().toLowerCase();
    const items = document.querySelectorAll('.faq-item-container');
    const categories = document.querySelectorAll('.faq-category');
    const emptyMsg = document.getElementById('faq-empty-message');
    const countEl = document.getElementById('faq-search-count');
    if (!q) {
        items.forEach(item => item.style.display = '');
        categories.forEach(cat => cat.style.display = '');
        if (emptyMsg) emptyMsg.style.display = 'none';
        if (countEl) countEl.style.display = 'none';
        return;
    }
    let visibleCount = 0;
    const visibleCategories = new Set();
    items.forEach(item => {
        const num = item.dataset.num || '';
        const qText = item.dataset.q || '';
        const aText = item.dataset.a || '';
        const matches = num === q || num.startsWith(q) || qText.includes(q) || aText.includes(q);
        if (matches) {
            item.style.display = '';
            visibleCount++;
            let prev = item.previousElementSibling;
            while (prev) {
                if (prev.classList.contains('faq-category')) { visibleCategories.add(prev.dataset.category); break; }
                prev = prev.previousElementSibling;
            }
        } else { item.style.display = 'none'; }
    });
    categories.forEach(cat => { cat.style.display = visibleCategories.has(cat.dataset.category) ? '' : 'none'; });
    if (countEl) {
        if (visibleCount > 0) {
            countEl.textContent = `✅ ${visibleCount} resultado${visibleCount !== 1 ? 's' : ''} encontrado${visibleCount !== 1 ? 's' : ''}`;
            countEl.style.color = '#10b981';
            countEl.style.display = 'block';
        } else {
            countEl.textContent = '⚠️ Sin resultados';
            countEl.style.color = '#f59e0b';
            countEl.style.display = 'block';
        }
    }
    if (emptyMsg) emptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';
}

function toggleFAQ(element) {
    const content = element.querySelector('.faq-content');
    const arrow = element.querySelector('.faq-arrow');
    if (content) {
        if (content.style.display === 'none') {
            content.style.display = 'block';
            if (arrow) arrow.textContent = '🔽';
        } else {
            content.style.display = 'none';
            if (arrow) arrow.textContent = '▶️';
        }
    }
}

// ============================================================
// LISTENER DE MENSAJES DEL IFRAME (CORRECCIÓN #5 + #12)
// ============================================================

function initParentMessageListener() {
    window.addEventListener('message', function(event) {
        if (!event.data || typeof event.data !== 'object') return;
        const tipo = event.data.type;
        const source = event.data.source || 'unknown';
        console.log(`📖 [CORRECCIÓN #5] Mensaje recibido del iframe: ${tipo} (source: ${source})`);
        if (tipo === 'CLOSE_HELP') {
            console.log('📖 [CORRECCIÓN #5] Cerrando modal de ayuda (SIN tocar la pestaña)');
            const modal = document.getElementById('ayuda-modal');
            if (!modal) {
                console.warn('⚠️ [CORRECCIÓN #5] No hay modal de ayuda abierto');
                return;
            }
            if (typeof cerrarAyudaModal === 'function') {
                cerrarAyudaModal();
            } else {
                console.warn('⚠️ [CORRECCIÓN #5] cerrarAyudaModal no está disponible, usando fallback');
                try {
                    modal.remove();
                    if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
                    if (typeof window._restaurarAppTrasAyuda === 'function') window._restaurarAppTrasAyuda();
                } catch (e) { console.error('❌ Error en fallback de cierre:', e); }
            }
        }
        if (tipo === 'PONG') console.log('📖 [CORRECCIÓN #5] Iframe está vivo (PONG recibido)');
        if (tipo === 'NAVIGATE' && event.data.section) console.log('📖 [CORRECCIÓN #5] Navegando a sección:', event.data.section);
    });
}

// ============================================================
// LISTENER DE ESCAPE (CORRECCIÓN #5 + #12)
// ============================================================

function initEscapeKey() {
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const enIframe = (window.self !== window.top);
            const modalAyuda = document.getElementById('ayuda-modal');
            if (modalAyuda) {
                console.log('📖 [CORRECCIÓN #5] Escape pulsado con modal de ayuda abierto → cerrando modal');
                e.preventDefault();
                e.stopPropagation();
                if (typeof cerrarAyudaModal === 'function') cerrarAyudaModal();
                return;
            }
            if (!enIframe) {
                console.log('📖 [CORRECCIÓN #5] Escape pulsado sin modal abierto → ignorando');
            } else {
                try { window.parent.postMessage({ type: 'CLOSE_HELP' }, '*'); } catch (e) {}
            }
        }
    });
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    initParentMessageListener();
    initEscapeKey();
    console.log('📦 Help Module cargado correctamente v2.2.9');
});

if (document.readyState !== 'loading') {
    initParentMessageListener();
    initEscapeKey();
    console.log('📦 Help Module cargado correctamente v2.2.9 (inmediato)');
}

// ============================================================
// EXPORTACIÓN
// ============================================================

window.HelpModule = {
    showHelpMenu, mostrarPopoverAyuda, cerrarPopoverAyuda,
    showReadmeModal, showCreditsModal,
    startTour, tourNext, tourPrev, tourSkip, tourComplete,
    showContextualHelp, showQuickStartGuide, showFAQModal,
    initHelpButton, toggleFAQ, filtrarFAQs,
    abrirAyudaDetallada, abrirAyudaEnModal, cerrarAyudaModal,
    imprimirAyudaIframe, forzarModalAlFrente,
    ofrecerFallbackPestanaNueva, isMobileDevice,
    FAQS_DB, DEV_AVATAR_PATH,
    _bloquearAppMientrasAyuda, _restaurarAppTrasAyuda,
    initParentMessageListener, initEscapeKey
};

window.showHelpMenu = showHelpMenu;
window.mostrarPopoverAyuda = mostrarPopoverAyuda;
window.cerrarPopoverAyuda = cerrarPopoverAyuda;
window.showReadmeModal = showReadmeModal;
window.showCreditsModal = showCreditsModal;
window.showFAQModal = showFAQModal;
window.showQuickStartGuide = showQuickStartGuide;
window.startTour = startTour;
window.showContextualHelp = showContextualHelp;
window.abrirAyudaDetallada = abrirAyudaDetallada;
window.abrirAyudaEnModal = abrirAyudaEnModal;
window.cerrarAyudaModal = cerrarAyudaModal;
window.imprimirAyudaIframe = imprimirAyudaIframe;
window.filtrarFAQs = filtrarFAQs;
window.forzarModalAlFrente = forzarModalAlFrente;
window.ofrecerFallbackPestanaNueva = ofrecerFallbackPestanaNueva;
window.isMobileDevice = isMobileDevice;
window._bloquearAppMientrasAyuda = _bloquearAppMientrasAyuda;
window._restaurarAppTrasAyuda = _restaurarAppTrasAyuda;
window.closeHelpMenuFallback = window.closeHelpMenuFallback || (() => {});

console.log('📦 Help Module cargado correctamente v2.2.9');
console.log('📚 FAQs cargadas:', FAQS_DB.length);
console.log('🆕 v2.2.9:');
console.log('   ✅ CORRECCIÓN #5: Ayuda detallada NO cierra la app');
console.log('   ✅ CORRECCIÓN #12: Ayuda como módulo controlado vía postMessage');
console.log('   ✅ CORRECCIÓN #16: Eliminado botón X flotante');
console.log('   ✅ Listener de CLOSE_HELP robusto con cerrarAyudaModal()');
console.log('   ✅ Listener de Escape detecta modal abierto');