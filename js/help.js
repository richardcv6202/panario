// ============================================================
// 📦 HELP MODULE - Panario (Sistema de Ayuda y Tutorial)
// CORREGIDO: Nombre del desarrollador (Ricardo Castillo Valdés)
// 🆕 FASE 5 (#2): NUEVO botón "📖 Ayuda detallada"
// 🆕 FASE 5 (#3): Ampliación de FAQs (~80 preguntas)
// 🆕 FASE AYUDA MODAL: NUEVA abrirAyudaEnModal(url)
// 🆕 FASE 4 (Entrega 4): FIX z-index + FAQs numeradas + buscador
// 🆕 FASE 4.1: CENTRO DE AYUDA CONVERTIDO EN POPOVER
// 🆕 ENTREGA 3: AYUDA DETALLADA EN MÓVIL (pestaña nueva)
// 🆕 v2.1.12: Popover móvil + FAQs código invitación + offline + nombre
// 🆕 v2.2.0: 55 FAQs nuevas (203 totales)
// 🆕 v2.2.2 (230926): FIX BUG #2 - Header deformado
//   - ✅ abrirAyudaEnModal() usa window.lockBodyScroll()
//   - ✅ cerrarAyudaModal() usa window.unlockBodyScroll() +
//     window.limpiarEstilosResiduales()
//   - ✅ Eliminada la manipulación directa de body.style.overflow
//   - ✅ Compatible con modal.js v2.0.9+
// 🆕 v2.2.3 (230926): FASE A - Fix modal de ayuda bloqueante y responsive
//   - ✅ NUEVO: Overlay bloqueante con pointer-events: auto que cubre el
//     100% de la pantalla y captura TODOS los clicks.
//   - ✅ NUEVO: Se oculta el header de la app (#appScreen header) con
//     visibility: hidden mientras el modal está abierto.
//   - ✅ NUEVO: Se oculta el bottom-nav también (por si acaso).
//   - ✅ NUEVO: Se añade `inert` al #appScreen (soporte moderno) para que
//     nada de la app reciba eventos.
//   - ✅ NUEVO: stopPropagation() en todos los botones del modal
//     (✕, Volver, tema, imprimir).
//   - ✅ NUEVO: Restaurar el header y el bottom-nav al cerrar el modal.
//   - ✅ NUEVO: Detección robusta de móvil para el modal.
//   - ✅ Sin cambios en otras funciones (popover, FAQ, tour, etc.)
// 🆕 v2.2.4 (230926): FAQs AMPLIADAS A 315 PREGUNTAS
//   - ✅ NUEVO: Total de FAQs = 315 (antes 203)
//   - ✅ NUEVO: Se añadieron 112 preguntas nuevas consolidadas del
//     documento "copia-resumen-de-faq-panario.pdf"
//   - ✅ NUEVO: Categorías nuevas:
//     * 🔒 Bloqueo por recetas (CORRECCIÓN #2)
//     * 📅 Excluir días de la semana (CORRECCIÓN #4)
//     * 🌙 Bloque del día anterior (CORRECCIÓN #6)
//     * 📆 Producción por rango (CORRECCIÓN #7)
//     * 🐛 Correcciones finales 220926
//     * 📄 Reportes y exportaciones
//     * 🔍 Auditoría y vendedor
//     * 🎨 PWA y pantalla completa
//   - ✅ Duplicados eliminados (consolidación de P43+P268, P72+P145, etc.)
//   - ✅ Estructura de categorías reorganizada por relevancia
//   - ✅ El buscador de FAQs sigue funcionando (filtra por número o texto)
// ============================================================

window.HelpModule = {};

// ============================================================
// Z-INDEX MÁXIMO PARA MODALES DE AYUDA
// ============================================================

const HELP_MODAL_Z_INDEX = 2147483647;
const HELP_POPOVER_Z_INDEX = 2147483646;
const IFRAME_LOAD_TIMEOUT_MS = 8000;

// ============================================================
// 🆕 v2.2.3: ESTADO GLOBAL DEL BLOQUEO DE LA APP
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
    {
        target: '#stat-total-sales',
        title: '📊 Dashboard',
        content: 'Aquí puedes ver todas las estadísticas clave de tu negocio: ventas, ingresos, gastos y ganancias.',
        position: 'bottom'
    },
    {
        target: '.nav-item[data-section="orders"]',
        title: '📋 Pedidos',
        content: 'Gestiona todos tus pedidos y reservas. Puedes crear nuevos pedidos y cambiar su estado.',
        position: 'top'
    },
    {
        target: '.nav-item[data-section="insumos"]',
        title: '🛒 Insumos',
        content: 'Controla tu inventario: harina, levadura, yogur y todos los insumos que usas para producir.',
        position: 'top'
    },
    {
        target: '.nav-item[data-section="recipes"]',
        title: '📖 Recetas',
        content: 'Crea y gestiona tus recetas (fórmulas). Asocia insumos y calcula costos automáticamente.',
        position: 'top'
    },
    {
        target: '.nav-item[data-section="productos"]',
        title: '🏷️ Productos',
        content: 'Define los productos que vendes. Cada producto puede tener una receta asociada.',
        position: 'top'
    },
    {
        target: '.nav-item[data-section="sales"]',
        title: '💰 Ventas',
        content: 'Registra tus ventas y gastos. El stock se descuenta automáticamente al vender.',
        position: 'top'
    },
    {
        target: '.nav-item[data-section="settings"]',
        title: '⚙️ Herramientas',
        content: 'Configura tu negocio, exporta/importa datos, gestiona horarios de corriente y más.',
        position: 'top'
    },
    {
        target: '#notification-bell',
        title: '🔔 Notificaciones',
        content: 'Recibe alertas de pedidos pendientes, deudas y recordatorios importantes.',
        position: 'bottom'
    }
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
        
        if (mobileRegex.test(ua)) {
            return true;
        }
        
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
// 🆕 v2.2.3: BLOQUEAR LA APP (ocultar header + bottom-nav + inert)
// ============================================================

function _bloquearAppMientrasAyuda() {
    try {
        if (_helpAppBlockState) {
            console.log('⚠️ [help] _bloquearAppMientrasAyuda: ya estaba bloqueado');
            return;
        }
        
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
        
        if (header) {
            header.style.setProperty('visibility', 'hidden', 'important');
        }
        
        if (bottomNav) {
            bottomNav.style.setProperty('visibility', 'hidden', 'important');
        }
        
        if (appScreen && typeof appScreen.inert !== 'undefined') {
            try {
                appScreen.inert = true;
            } catch (e) {}
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
            if (headerOriginalVisibility) {
                header.style.visibility = headerOriginalVisibility;
            } else {
                header.style.removeProperty('visibility');
            }
        }
        
        if (bottomNav) {
            if (bottomNavOriginalVisibility) {
                bottomNav.style.visibility = bottomNavOriginalVisibility;
            } else {
                bottomNav.style.removeProperty('visibility');
            }
        }
        
        if (appScreen) {
            try {
                appScreen.inert = false;
            } catch (e) {}
            
            if (appScreenOriginalVisibility) {
                appScreen.style.visibility = appScreenOriginalVisibility;
            } else {
                appScreen.style.removeProperty('visibility');
            }
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
        if (activeNav && activeNav.dataset && activeNav.dataset.section) {
            section = activeNav.dataset.section;
        }
        
        const sectionMap = {
            'dashboard':     'dashboard',
            'orders':        'orders',
            'insumos':       'insumos',
            'recipes':       'recipes',
            'productos':     'productos',
            'sales':         'sales',
            'settings':      'settings',
            'profile':       'profile',
            'corriente':     'corriente',
            'produccion':    'produccion',
            'rewards':       'rewards',
            'notifications': 'notifications'
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
        if (window.showToast) {
            window.showToast('❌ No se pudo abrir la ayuda detallada', 'error', 4000);
        }
    }
}

// ============================================================
// 🆕 v2.2.3: ABRIR AYUDA EN MODAL (CON BLOQUEO TOTAL DE LA APP)
// ============================================================

function abrirAyudaEnModal(embeddedUrl, theme = 'light', baseUrl = null) {
    if (!baseUrl) {
        baseUrl = embeddedUrl.replace('&embedded=1', '');
    }
    
    const existing = document.getElementById('ayuda-modal');
    if (existing) {
        existing.remove();
    }
    
    const isMobile = isMobileDevice();
    
    const modalWidth  = isMobile ? '100vw' : '95vw';
    const modalHeight = isMobile ? '100vh' : '95vh';
    const modalRadius = isMobile ? '0'    : '16px';
    
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
        <div id="ayuda-modal-container" 
             onclick="event.stopPropagation();"
             style="
            background: var(--bg-card, #fff);
            border-radius: ${modalRadius};
            width: ${modalWidth};
            height: ${modalHeight};
            max-width: 1600px;
            max-height: 1200px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            animation: ayudaModalSlideUp 0.3s ease;
            border: 1px solid var(--border-color, #e0d5c0);
            position: relative;
            z-index: 1;
            pointer-events: auto;
        ">
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid var(--border-color, #e0d5c0); background: var(--bg-card, #fff); flex-shrink: 0; flex-wrap: wrap;"
                 onclick="event.stopPropagation();">
                <span style="font-size: 22px;">📖</span>
                <div style="flex: 1; min-width: 120px;">
                    <div style="font-weight: 700; font-size: 15px; color: var(--text, #2d2d2d);">Ayuda detallada</div>
                    <div style="font-size: 11px; color: var(--text-light, #666); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${embeddedUrl.split('?')[0]}
                    </div>
                </div>
                
                <a href="${baseUrl}" target="_blank" rel="noopener noreferrer"
                   class="btn secondary"
                   onclick="event.stopPropagation();"
                   style="padding: 6px 12px; font-size: 12px; width: auto; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;"
                   title="Abrir en pestaña nueva">
                    🔗 ↗
                </a>
                
                <button onclick="event.stopPropagation(); imprimirAyudaIframe();" 
                        class="btn secondary" 
                        style="padding: 6px 12px; font-size: 12px; width: auto;" 
                        title="Imprimir / Guardar PDF">
                    🖨️
                </button>
                
                <button onclick="event.stopPropagation(); cerrarAyudaModal();" 
                        style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light, #666); padding: 4px 8px; line-height: 1; border-radius: 6px; transition: background 0.2s;" 
                        onmouseover="this.style.background='var(--bg, #fdf6e3)'" 
                        onmouseout="this.style.background='transparent'" 
                        title="Cerrar (Escape)">
                    ✕
                </button>
            </div>
            
            <div style="flex: 1; position: relative; overflow: hidden;">
                <div id="ayuda-modal-loading" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px; background: var(--bg, #fdf6e3); z-index: 1;">
                    <div style="width: 40px; height: 40px; border: 4px solid var(--primary, #f5a623); border-top-color: transparent; border-radius: 50%; animation: ayudaSpinner 0.8s linear infinite;"></div>
                    <div style="font-size: 13px; color: var(--text-light, #666);">Cargando ayuda...</div>
                    <div style="font-size: 11px; color: var(--text-light, #666); text-align: center; max-width: 300px; margin-top: 8px;">
                        Si no carga en unos segundos, se abrirá en una pestaña nueva automáticamente.
                    </div>
                </div>
                
                <iframe id="ayuda-modal-iframe" 
                        src="${embeddedUrl}" 
                        title="Ayuda detallada de Panario" 
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals" 
                        allow="clipboard-read; clipboard-write" 
                        style="width: 100%; height: 100%; border: none; display: block; position: relative; z-index: 2; opacity: 0; transition: opacity 0.3s ease;">
                </iframe>
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
            <p style="font-size: 13px; color: var(--text-light, #666); margin-bottom: 16px; line-height: 1.5;">
                ${mensaje || 'No se pudo cargar la ayuda en modal.'}<br>
                Ábrela en una pestaña nueva para verla correctamente.
            </p>
            <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                <a href="${baseUrl}" target="_blank" rel="noopener noreferrer" class="btn primary" style="padding: 10px 20px; font-size: 14px; width: auto; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; background: var(--primary, #f5a623); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    🔗 Abrir ayuda
                </a>
                <button onclick="event.stopPropagation(); cerrarAyudaModal()" class="btn secondary" style="padding: 10px 20px; font-size: 14px; width: auto; background: transparent; color: var(--text, #2d2d2d); border: 2px solid var(--border-color, #e0d5c0); border-radius: 8px; cursor: pointer; font-weight: 600;">
                    ❌ Cerrar
                </button>
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
// 🆕 v2.2.3: CERRAR AYUDA MODAL CON LIMPIEZA DE ESTILOS Y RESTAURACIÓN
// ============================================================

function cerrarAyudaModal() {
    const modal = document.getElementById('ayuda-modal');
    if (!modal) return;
    
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
            setTimeout(() => {
                window.limpiarEstilosResiduales();
            }, 50);
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
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 13px;">Guía Rápida de Inicio</div>
                    <div style="font-size: 11px; color: var(--text-light);">5 pasos para empezar</div>
                </div>
                <span style="font-size: 12px; color: var(--text-light); flex-shrink: 0;">▶</span>
            </button>
            
            <button class="help-popover-item" data-action="tour" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; background: none; cursor: pointer; border-radius: 8px; text-align: left; font-family: inherit; transition: background 0.15s; color: var(--text);">
                <span style="font-size: 20px; flex-shrink: 0;">🎯</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 13px;">Tutorial Interactivo</div>
                    <div style="font-size: 11px; color: var(--text-light);">Recorrido guiado</div>
                </div>
                <span style="font-size: 12px; color: var(--text-light); flex-shrink: 0;">▶</span>
            </button>
            
            <button class="help-popover-item" data-action="faq" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; background: none; cursor: pointer; border-radius: 8px; text-align: left; font-family: inherit; transition: background 0.15s; color: var(--text);">
                <span style="font-size: 20px; flex-shrink: 0;">❓</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 13px;">Preguntas Frecuentes</div>
                    <div style="font-size: 11px; color: var(--text-light);">${FAQS_DB.length} respuestas</div>
                </div>
                <span style="font-size: 12px; color: var(--text-light); flex-shrink: 0;">▶</span>
            </button>
            
            <button class="help-popover-item" data-action="detailed" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; background: none; cursor: pointer; border-radius: 8px; text-align: left; font-family: inherit; transition: background 0.15s; color: var(--text);">
                <span style="font-size: 20px; flex-shrink: 0;">📖</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 13px;">Ayuda Detallada</div>
                    <div style="font-size: 11px; color: var(--text-light);">Manual completo</div>
                </div>
                <span style="font-size: 12px; color: var(--text-light); flex-shrink: 0;">▶</span>
            </button>
            
            <div style="border-top: 1px solid var(--border-color); margin: 4px 8px;"></div>
            
            <button class="help-popover-item" data-action="readme" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; background: none; cursor: pointer; border-radius: 8px; text-align: left; font-family: inherit; transition: background 0.15s; color: var(--text);">
                <span style="font-size: 20px; flex-shrink: 0;">📘</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 13px;">Léeme</div>
                    <div style="font-size: 11px; color: var(--text-light);">Info del proyecto</div>
                </div>
                <span style="font-size: 12px; color: var(--text-light); flex-shrink: 0;">▶</span>
            </button>
            
            <button class="help-popover-item" data-action="credits" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; background: none; cursor: pointer; border-radius: 8px; text-align: left; font-family: inherit; transition: background 0.15s; color: var(--text);">
                <span style="font-size: 20px; flex-shrink: 0;">👨‍💻</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 13px;">Créditos</div>
                    <div style="font-size: 11px; color: var(--text-light);">Desarrollador</div>
                </div>
                <span style="font-size: 12px; color: var(--text-light); flex-shrink: 0;">▶</span>
            </button>
        </div>
    `;
    
    if (!document.getElementById('help-popover-styles')) {
        const style = document.createElement('style');
        style.id = 'help-popover-styles';
        style.textContent = `
            @keyframes helpPopoverFadeIn {
                from { opacity: 0; transform: translateY(-8px); }
                to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes helpPopoverFadeOut {
                from { opacity: 1; transform: translateY(0); }
                to   { opacity: 0; transform: translateY(-8px); }
            }
            .help-popover-item:hover { background: var(--bg) !important; }
            .help-popover-item:active { transform: scale(0.98); }
            
            @media (max-width: 600px) {
                #help-popover {
                    top: 60px !important;
                    right: 10px !important;
                    left: auto !important;
                    bottom: auto !important;
                    min-width: 240px !important;
                    max-width: calc(100vw - 20px) !important;
                    max-height: calc(100vh - 80px) !important;
                }
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
        if (!isInsidePopover && !isAnchor) {
            cerrarPopoverAyuda();
        }
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
        
        if (isMobile) {
            return;
        }
        
        const margin = 8;
        const popoverWidth = popoverRect.width || 260;
        const popoverHeight = popoverRect.height || 350;
        
        let top = rect.bottom + margin;
        
        if (top + popoverHeight > window.innerHeight - 10) {
            top = rect.top - popoverHeight - margin;
        }
        
        if (top < 10) top = 10;
        
        let left = rect.right - popoverWidth;
        
        if (left < 10) left = 10;
        if (left + popoverWidth > window.innerWidth - 10) {
            left = window.innerWidth - popoverWidth - 10;
        }
        
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
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">❓</span>
                    <h2 style="margin: 0; font-size: 18px;">Centro de Ayuda</h2>
                </div>
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
    
    if (typeof window.lockBodyScroll === 'function') {
        window.lockBodyScroll();
    } else {
        document.body.style.overflow = 'hidden';
    }
    
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
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeHelpMenuFallback();
    });
}

function showHelpMenu() {
    mostrarPopoverAyuda();
}

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
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">📘</span>
                    <h2 style="margin: 0; font-size: 18px; color: #10b981;">Léeme</h2>
                </div>
                <button onclick="closeReadmeModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>

            <div style="font-size: 14px; line-height: 1.7; color: var(--text);">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 64px;">🍞</div>
                    <h3 style="margin: 8px 0 4px 0; color: var(--primary); font-size: 22px;">Panario</h3>
                    <p style="color: var(--text-light); font-size: 13px; margin: 0;">Tu panadería en orden</p>
                </div>

                <h4 style="margin: 16px 0 8px 0; color: var(--text);">📋 Descripción</h4>
                <p style="color: var(--text-light); font-size: 13px;">
                    Panario es una aplicación PWA (Progressive Web App) diseñada específicamente para la gestión integral de una panadería artesanal. Funciona completamente offline y todos tus datos se guardan localmente en tu dispositivo.
                </p>

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
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                        <span style="color: var(--text-light);">Versión:</span>
                        <strong>2.2.1</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                        <span style="color: var(--text-light);">Estado:</span>
                        <strong style="color: #10b981;">✅ Producción</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                        <span style="color: var(--text-light);">Arquitectura:</span>
                        <strong>Cliente local (SQLite WASM)</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                        <span style="color: var(--text-light);">Tecnología:</span>
                        <strong>HTML5 + CSS3 + JS (ES6+)</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                        <span style="color: var(--text-light);">Persistencia:</span>
                        <strong>SQLite + localStorage</strong>
                    </div>
                </div>

                <h4 style="margin: 16px 0 8px 0; color: var(--text);">💾 Privacidad y seguridad</h4>
                <p style="color: var(--text-light); font-size: 13px;">
                    ✅ Todos tus datos se guardan <strong>localmente en tu dispositivo</strong>.<br>
                    ✅ No se envía información a ningún servidor externo.<br>
                    ✅ Puedes hacer copias de seguridad desde <strong>Herramientas</strong>.<br>
                    ✅ Funciona 100% offline.
                </p>

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
                <button onclick="closeReadmeModal(); abrirAyudaDetallada();" class="btn primary" style="flex: 1; padding: 10px 16px; font-size: 13px; background: #10b981; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📖 Ver ayuda detallada
                </button>
                <button onclick="closeReadmeModal()" class="btn primary" style="flex: 1; padding: 10px 16px; font-size: 13px; background: #10b981; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Entendido
                </button>
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

    modal.addEventListener('click', function(e) {
        if (e.target === this) closeReadmeModal();
    });

    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeReadmeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
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
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">👨‍💻</span>
                    <h2 style="margin: 0; font-size: 18px; color: #0ea5e9;">Créditos</h2>
                </div>
                <button onclick="closeCreditsModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>

            <div style="margin-bottom: 20px;">
                <div id="dev-avatar-container" style="width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); display: inline-flex; align-items: center; justify-content: center; font-size: 48px; margin-bottom: 12px; overflow: hidden; border: 3px solid var(--primary);">
                    <img 
                        src="${DEV_AVATAR_PATH}" 
                        alt="Foto del desarrollador"
                        style="width: 100%; height: 100%; object-fit: cover; display: block;"
                        onerror="this.style.display='none'; this.parentElement.innerHTML='${DEV_AVATAR_FALLBACK_EMOJI}'; this.parentElement.style.fontSize='48px';">
                </div>
                <h3 style="margin: 0; font-size: 20px; color: var(--text);">Ricardo Castillo Valdés</h3>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-light);">Desarrollador y Diseñador</p>
            </div>

            <div style="background: var(--bg); border-radius: 10px; padding: 16px; margin-bottom: 16px; text-align: left;">
                <div style="font-size: 12px; font-weight: 600; color: var(--text-label); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                    📞 Información de contacto
                </div>
                
                <a href="https://wa.me/5355031725" target="_blank" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg-card); border-radius: 8px; text-decoration: none; color: var(--text); margin-bottom: 8px; border: 1px solid var(--border-color);">
                    <span style="font-size: 20px;">💬</span>
                    <div style="flex: 1;">
                        <div style="font-size: 11px; color: var(--text-light);">WhatsApp</div>
                        <div style="font-size: 14px; font-weight: 600;">+53 55031725</div>
                    </div>
                    <span style="font-size: 14px; color: var(--primary);">→</span>
                </a>

                <a href="mailto:3sayricardo@gmail.com" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg-card); border-radius: 8px; text-decoration: none; color: var(--text); border: 1px solid var(--border-color);">
                    <span style="font-size: 20px;">📧</span>
                    <div style="flex: 1;">
                        <div style="font-size: 11px; color: var(--text-light);">Email</div>
                        <div style="font-size: 14px; font-weight: 600; word-break: break-all;">3sayricardo@gmail.com</div>
                    </div>
                    <span style="font-size: 14px; color: var(--primary);">→</span>
                </a>
            </div>

            <div style="background: linear-gradient(135deg, #0ea5e915 0%, #0284c715 100%); border: 1px solid #0ea5e9; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
                <div style="font-size: 13px; font-weight: 600; color: #0ea5e9; margin-bottom: 4px;">
                    🍞 Panario v2.2.1
                </div>
                <div style="font-size: 12px; color: var(--text-light);">
                    "Tu panadería en orden"
                </div>
                <div style="font-size: 11px; color: var(--text-light); margin-top: 8px;">
                    © 2026 Ricardo Castillo Valdés<br>
                    Todos los derechos reservados
                </div>
            </div>

            <div style="font-size: 11px; color: var(--text-light); line-height: 1.6; margin-bottom: 16px;">
                Hecho con ❤️ para panaderos artesanales<br>
                Desarrollado en Cuba 🇨🇺
            </div>

            <button onclick="closeCreditsModal()" class="btn primary" style="padding: 10px 24px; font-size: 14px; width: auto; background: #0ea5e9; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                Cerrar
            </button>
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

    modal.addEventListener('click', function(e) {
        if (e.target === this) closeCreditsModal();
    });

    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeCreditsModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// ============================================================
// INICIAR TOUR
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
    if (index >= TOUR_STEPS.length) {
        completeTour();
        return;
    }
    
    const step = TOUR_STEPS[index];
    const target = document.querySelector(step.target);
    
    if (!target) {
        currentStep++;
        showStep(currentStep);
        return;
    }
    
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
        case 'bottom':
            tooltipTop = rect.bottom + 16;
            tooltipLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            break;
        case 'top':
            tooltipTop = rect.top - tooltipHeight - 16;
            tooltipLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            break;
        case 'left':
            tooltipTop = rect.top + (rect.height / 2) - (tooltipHeight / 2);
            tooltipLeft = rect.left - tooltipWidth - 16;
            break;
        case 'right':
            tooltipTop = rect.top + (rect.height / 2) - (tooltipHeight / 2);
            tooltipLeft = rect.right + 16;
            break;
        default:
            tooltipTop = rect.bottom + 16;
            tooltipLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);
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
    if (currentStep < TOUR_STEPS.length - 1) {
        currentStep++;
        showStep(currentStep);
    } else {
        completeTour();
    }
}

function tourPrev() {
    if (currentStep > 0) {
        currentStep--;
        showStep(currentStep);
    }
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
    for (const id of elements) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
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
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">🚀</span>
                    <h2 style="margin: 0; font-size: 18px; color: #8b5cf6;">Guía rápida de inicio</h2>
                </div>
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
                <button onclick="closeQuickStartGuide(); startTour();" class="btn primary" style="padding: 8px 16px; font-size: 13px; width: auto; flex: 1; background: #8b5cf6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    🎯 Ver tutorial interactivo
                </button>
                <button onclick="closeQuickStartGuide()" class="btn secondary" style="padding: 8px 16px; font-size: 13px; width: auto; flex: 1;">
                    Cerrar
                </button>
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

    modal.addEventListener('click', function(e) {
        if (e.target === this) closeQuickStartGuide();
    });
}

function initHelpButton() {
    const profileCard = document.querySelector('#mainContent .card');
    if (!profileCard) return;
    
    const bankButton = profileCard.querySelector('button[onclick*="showBankAccountsModal"]');
    if (bankButton) {
        const helpContainer = document.createElement('div');
        helpContainer.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;';
        helpContainer.innerHTML = `
            <button onclick="window.HelpModule.showQuickStartGuide()" class="btn secondary" style="max-width: 100%; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; padding: 10px; cursor: pointer; font-weight: 600;">
                🚀 Guía rápida de inicio
            </button>
            <button onclick="window.HelpModule.startTour()" class="btn secondary" style="max-width: 100%; background: #f59e0b; color: #fff; border: none; border-radius: 8px; padding: 10px; cursor: pointer; font-weight: 600;">
                🎯 Tutorial interactivo
            </button>
            <button onclick="window.HelpModule.showFAQModal()" class="btn secondary" style="max-width: 100%; background: #3b82f6; color: #fff; border: none; border-radius: 8px; padding: 10px; cursor: pointer; font-weight: 600;">
                ❓ Preguntas frecuentes (FAQ)
            </button>
        `;
        bankButton.parentNode.insertBefore(helpContainer, bankButton);
    }
}

// ============================================================
// BASE DE DATOS DE FAQs NUMERADAS — 315 PREGUNTAS
// ============================================================
// v2.2.4: Ampliado de 203 a 315 preguntas.
// Consolidación del documento "copia-resumen-de-faq-panario.pdf".
// Duplicados eliminados y categorías reorganizadas.
// ============================================================

const FAQS_DB = [
    // ============================================================
    // 🏠 GENERALES (P1-P11)
    // ============================================================
    { cat: '🏠 Generales', q: '¿Qué es Panario?', a: 'Es una aplicación PWA para la gestión integral de una panadería artesanal. Permite gestionar insumos, recetas, productos, ventas, pedidos y finanzas.' },
    { cat: '🏠 Generales', q: '¿Por qué se llama "Panario"?', a: 'El nombre es un juego con "pan" y "diario" (de contabilidad). Es corto, original y describe perfectamente el propósito: llevar el diario contable de una panadería.\n\n📋 Otros nombres que se consideraron fueron:\n• PanConta (fusión directa de "pan" y "contabilidad")\n• HarinaBalance (evoca el ingrediente principal y el equilibrio financiero)\n• MasaYCuentas (rimado y amigable)\n• BakeryLedger (en inglés, pensando en expansión)\n\nFinalmente se eligió "Panario" por ser único, breve y fácil de recordar.' },
    { cat: '🏠 Generales', q: '¿Funciona sin conexión?', a: 'Sí, Panario funciona completamente offline. Todos tus datos están guardados localmente en tu dispositivo.' },
    { cat: '🏠 Generales', q: '¿Dónde se guardan mis datos?', a: 'En SQLite (base de datos local) y localStorage. Todo queda en tu dispositivo. Nada se envía a servidores externos.' },
    { cat: '🏠 Generales', q: '¿Cómo hago una copia de seguridad?', a: 'Ve a ⚙️ Herramientas y haz clic en "📥 Descargar copia de seguridad". Se descarga un archivo .db con todos tus datos.' },
    { cat: '🏠 Generales', q: '¿Cómo restauro una copia de seguridad?', a: 'En ⚙️ Herramientas, haz clic en "📤 Importar copia de seguridad" y selecciona el archivo .db. Se reemplazarán todos los datos actuales.' },
    { cat: '🏠 Generales', q: '¿Puedo exportar solo recetas y productos?', a: 'Sí. En Herramientas usa "🧩 Salva diferencial" para exportar/importar solo las recetas y productos, sin afectar al resto de la base de datos.' },
    { cat: '🏠 Generales', q: '¿Qué navegadores soporta Panario?', a: 'Chrome, Firefox, Edge, Safari (versiones recientes). Se recomienda Chrome para mejor rendimiento.' },
    { cat: '🏠 Generales', q: '¿Cómo instalo Panario en mi móvil?', a: 'Abre Panario en Chrome (con HTTPS), espera a que aparezca el ícono de instalación en la barra de direcciones (o usa el menú ⋮ → "Instalar aplicación"), y pulsa "Instalar". La app aparecerá en tu pantalla de inicio.' },
    { cat: '🏠 Generales', q: '¿Quién desarrolló Panario?', a: 'Panario fue desarrollado por Ricardo Castillo Valdés. Puedes contactarlo por WhatsApp (+53 55031725) o email (3sayricardo@gmail.com).' },
    { cat: '🏠 Generales', q: '¿Por qué no suenan las notificaciones?', a: 'Los navegadores modernos bloquean el audio hasta que el usuario interactúa con la página. Desde v2.1.10, el AudioContext se desbloquea automáticamente con el primer clic, toque o tecla. Después de ese gesto, todas las notificaciones sonarán correctamente.' },

    // ============================================================
    // 📊 DASHBOARD (P12-P23)
    // ============================================================
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
    { cat: '📊 Dashboard', q: '¿Qué significa "Pedidos mañana" en el Dashboard?', a: 'Es el número total de pedidos activos cuya fecha de entrega es mañana. Excluye cancelados, entregados y los que compraron por lista de espera.' },

    // ============================================================
    // 🛒 INSUMOS (P24-P29)
    // ============================================================
    { cat: '🛒 Insumos', q: '¿Qué es un insumo?', a: 'Es todo lo que compras para producir: harina, levadura, yogur, mantequilla, etc.' },
    { cat: '🛒 Insumos', q: '¿Cómo registro un insumo?', a: 'Ve a 🛒 Insumos → clic en "➕ Nuevo Insumo". Completa nombre, unidad, costo, stock y stock mínimo.' },
    { cat: '🛒 Insumos', q: '¿Los insumos se descuentan automáticamente?', a: 'Sí. Al vender un producto o confirmar un pedido, el stock de los insumos se descuenta según la receta asociada.' },
    { cat: '🛒 Insumos', q: '¿Qué es el stock mínimo?', a: 'Es la cantidad mínima que debe tener un insumo. Cuando el stock baja de ese nivel, aparece una alerta roja.' },
    { cat: '🛒 Insumos', q: '¿Puedo eliminar un insumo?', a: 'Sí, pero se aplica soft-delete. Puedes limpiarlo permanentemente desde Herramientas.' },
    { cat: '🛒 Insumos', q: '¿Los usuarios no-admin pueden editar insumos?', a: 'No. Solo los administradores pueden crear, editar o eliminar insumos. Los usuarios regulares tienen modo solo lectura.' },

    // ============================================================
    // 📖 RECETAS (P30-P38)
    // ============================================================
    { cat: '📖 Recetas', q: '¿Qué es una receta?', a: 'Es la fórmula de producción que indica qué insumos se necesitan y en qué cantidad. Ej: "Pan de Yogur" con harina, levadura y yogur.' },
    { cat: '📖 Recetas', q: '¿Cómo se calcula el costo de una receta?', a: 'La suma de (cantidad × costo_unitario) de todos los insumos asociados.' },
    { cat: '📖 Recetas', q: '¿Qué hace el botón "🔄 Recalcular"?', a: 'Permite ajustar una receta para un nuevo rendimiento usando regla de 3. Ej: receta para 33 panes → quiero 50 panes.' },
    { cat: '📖 Recetas', q: '¿Cómo comparto una receta?', a: 'En la vista de detalle de la receta, clic en "💬 Compartir". Puedes enviarla por WhatsApp, Messenger, Email o copiarla al portapapeles. Solo admin.' },
    { cat: '📖 Recetas', q: '¿Puedo duplicar una receta?', a: 'Sí. En la lista de recetas, clic en "📋 Duplicar". Se creará una copia con el nombre que elijas. Solo admin.' },
    { cat: '📖 Recetas', q: '¿Qué significa "receta compartida"?', a: 'Es una receta que otros usuarios del mismo negocio pueden ver y usar como plantilla.' },
    { cat: '📖 Recetas', q: '¿Por qué no puedo editar las recetas?', a: 'Las recetas son fórmulas críticas del negocio. Solo los administradores pueden crearlas, editarlas, duplicarlas o eliminarlas. Los usuarios regulares pueden verlas, recalcularlas, usarlas como plantilla y exportarlas en PDF (sin costos).' },
    { cat: '📖 Recetas', q: '¿Por qué no veo los costos de las recetas?', a: 'Los costos son información sensible del negocio. Solo los administradores los ven. Como usuario regular, ves los ingredientes y cantidades pero no los precios.' },
    { cat: '📖 Recetas', q: '¿Puedo recalcular una receta siendo usuario no-admin?', a: 'Sí. Puedes recalcular, pero solo podrás guardar el resultado como una receta nueva (no modificar la original).' },

    // ============================================================
    // 🏷️ PRODUCTOS (P39-P43)
    // ============================================================
    { cat: '🏷️ Productos', q: '¿Qué es un producto?', a: 'Es lo que vendes al cliente. Ej: "Jaba de Pan" con precio $550 y 10 panes por jaba.' },
    { cat: '🏷️ Productos', q: '¿Cómo asocio un producto a una receta?', a: 'Al crear/editar el producto, selecciona la receta en el desplegable "📋 Receta asociada".' },
    { cat: '🏷️ Productos', q: '¿Qué es "cantidad por unidad"?', a: 'Es cuántas unidades del producto contiene una unidad de venta. Ej: una jaba tiene 10 panes → cantidad_por_unidad = 10.' },
    { cat: '🏷️ Productos', q: '¿Cómo sé el margen de ganancia?', a: 'En la lista de productos, se muestra el margen calculado automáticamente: (precio - costo) / precio × 100.' },
    { cat: '🏷️ Productos', q: '¿Por qué antes no aparecían productos por defecto al crear una cuenta nueva?', a: 'Era un bug: el sistema intentaba insertar los productos por defecto en una tabla llamada `products` (en inglés) que no existía. La tabla real es `productos` (en español). Ahora el sistema inserta correctamente en `productos`, con las columnas correctas (nombre, precio_venta, unidad_venta, etc.). Si creas una cuenta nueva, verás los 18 productos por defecto cargados automáticamente.' },

    // ============================================================
    // 💰 VENTAS (P44-P55)
    // ============================================================
    { cat: '💰 Ventas', q: '¿Cómo registro una venta?', a: 'Ve a 💰 Ventas → clic en "➕ Nueva Venta". Selecciona el producto, cantidad, precio, método de pago y cliente.' },
    { cat: '💰 Ventas', q: '¿Qué es una "venta liberada"?', a: 'Es una venta sin cliente identificado, tipo "mostrador anónimo". Se agrupa visualmente y no permite deuda.' },
    { cat: '💰 Ventas', q: '¿Qué es una deuda?', a: 'Es una venta donde el cliente no pagó al momento. Se marca con is_debt = 1 y paid = 0.' },
    { cat: '💰 Ventas', q: '¿Cómo cobro una deuda?', a: 'En Ventas, ve al filtro "💳 Deudas", encuentra al cliente y haz clic en "💰 Cobrar".' },
    { cat: '💰 Ventas', q: '¿Puedo anular una venta?', a: 'Sí. En el detalle de la venta, clic en "🚫 Anular". Se repondrá el stock automáticamente. La venta queda marcada como "ANULADA" pero visible, y puede restaurarse.' },
    { cat: '💰 Ventas', q: '¿Qué diferencia hay entre "Anular" y "Eliminar" una venta?', a: '🚫 **Anular:** marca la venta como voided=1, repone el stock, y la fila permanece visible con estado "ANULADA". Se puede restaurar después.\n\n🗑️ **Eliminar:** solo está disponible en Herramientas → Eliminación por error. Borra permanentemente la venta, NO repone stock, y no se puede recuperar.' },
    { cat: '💰 Ventas', q: '¿Cómo restauro una venta anulada?', a: 'Ve al detalle de la venta anulada (borde gris) y pulsa "🔄 Restaurar". Se repondrá el stock descontado y la venta volverá a estado normal.' },
    { cat: '💰 Ventas', q: '¿Cómo edito el nombre del cliente?', a: 'Al editar una venta, el campo "👤 Comprador" es editable. Si la venta está vinculada a un pedido, se desvinculará.' },
    { cat: '💰 Ventas', q: '¿Para qué sirve registrar un día sin ventas?', a: 'Sirve para llevar un historial y entender mejor las estadísticas. Sin esta información, un día sin ventas parecería simplemente "un mal día" cuando en realidad no abriste.' },
    { cat: '💰 Ventas', q: '¿Qué motivos puedo usar para un día sin ventas?', a: 'Hay 8 predefinidos: ⚡ Apagón, 🛒 Falta de insumos, 🎉 Feriado, 🏖️ Vacaciones, 🏥 Enfermedad, 🔧 Mantenimiento, 🌧️ Mal clima, y 🔄 Otro.' },
    { cat: '💰 Ventas', q: '¿Cómo veo quién hizo cada venta?', a: 'En el detalle de la venta, en la sección de Auditoría, aparece "👤 Creado por: [nombre del vendedor]".' },
    { cat: '💰 Ventas', q: '¿En qué orden aparecen las ventas dentro de un mismo día?', a: 'Las ventas se ordenan por ID ascendente dentro de cada día. Es decir, la primera venta del día (#42) aparece primero, luego la #43, #44, etc.' },

    // ============================================================
    // 📋 PEDIDOS (P56-P72)
    // ============================================================
    { cat: '📋 Pedidos', q: '¿Cuál es la diferencia entre pedido y venta?', a: 'Un pedido es una solicitud de un cliente. Una venta es una transacción completada. Los pedidos no son deudas hasta que se entregan.' },
    { cat: '📋 Pedidos', q: '¿Qué estados tiene un pedido?', a: 'Pendiente, Confirmado, En producción, Listo, Entregado, Cancelado, En lista de espera, Compró por lista de espera.' },
    { cat: '📋 Pedidos', q: '¿Qué es la lista de espera?', a: 'Cuando la demanda supera la oferta, los clientes se ponen en cola. Al haber disponibilidad, se les atiende en orden.' },
    { cat: '📋 Pedidos', q: '¿Cómo funciona la reserva por período?', a: 'Permite crear múltiples pedidos a la vez para el mismo cliente. Elige el patrón: rango completo, días de la semana o días específicos.' },
    { cat: '📋 Pedidos', q: '¿Qué es la paridad en reservas?', a: 'Permite filtrar días pares o impares. Ej: "Solo pares" crea pedidos los días 2, 4, 6, 8, 10...' },
    { cat: '📋 Pedidos', q: '¿Cómo se cancelan pedidos automáticamente?', a: 'Los pedidos pendientes/confirmados con más de 48h sin procesar se cancelan automáticamente.' },
    { cat: '📋 Pedidos', q: '¿Qué es "sesión de recogida"?', a: 'Indica si el cliente recogerá el pedido en la mañana (10:00), tarde (15:00) o noche (19:00).' },
    { cat: '📋 Pedidos', q: '¿Cómo gestiono la lista de espera?', a: 'Ve a 📋 Pedidos → botón "⏰ Lista de espera" o a ⚙️ Herramientas → "⏰ Gestionar lista de espera".' },
    { cat: '📋 Pedidos', q: '¿Qué es la "cancelación global de pedidos"?', a: 'Es una herramienta de admin que cancela TODOS los pedidos en un rango de fechas.' },
    { cat: '📋 Pedidos', q: '¿Qué significa cada botón en la lista de espera?', a: '✅ Procesar → crea la venta. ❌ Cancelar → cancela el pedido y repone stock. 🗑️ Quitar → solo quita al cliente de la lista.' },
    { cat: '📋 Pedidos', q: '¿Qué diferencia hay entre "Cancelar" y "Quitar"?', a: 'Cancelar → cambia el estado del pedido a "cancelado" y repone stock. Quitar → solo elimina al cliente de la lista, el pedido vuelve a "pendiente".' },
    { cat: '📋 Pedidos', q: '¿En qué orden aparecen los pedidos en la lista?', a: 'Los pedidos se ordenan por fecha de entrega ascendente y, dentro de la misma fecha, por ID ascendente. El primer pedido creado para esa fecha aparece primero.' },
    { cat: '📋 Pedidos', q: '¿Puedo reprogramar solo los pedidos de un cliente?', a: 'Sí. En el modal de reprogramación hay un campo opcional "👤 Filtrar por cliente". Si lo rellenas, solo se reprograman los pedidos de ese cliente.' },
    { cat: '📋 Pedidos', q: '¿Qué pasa con la causa y nota al reprogramar?', a: 'La causa y la nota se añaden automáticamente al campo de notas de cada pedido afectado, precedido del texto "Reprogramado: ". Ej: `Reprogramado: 🔄 Falta de insumos | Se pospone una semana`.' },
    { cat: '📋 Pedidos', q: '¿Se puede deshacer una reprogramación?', a: 'No directamente. Deberás volver a reprogramar los pedidos a la fecha original o editar cada pedido manualmente.' },
    { cat: '📋 Pedidos', q: '¿Los pedidos entregados se pueden reprogramar?', a: 'No. Solo se reprograman pedidos en estado pendiente, confirmado, en producción o listo.' },
    { cat: '📋 Pedidos', q: '¿La reprogramación conserva la hora de entrega?', a: 'Sí. Solo cambia la fecha, la hora se mantiene igual que antes (por ejemplo, si era a las 10:00, sigue siendo a las 10:00).' },
    { cat: '📋 Pedidos', q: '¿Qué pasa si la fecha destino ya tiene pedidos?', a: 'Los pedidos reprogramados se añaden a los ya existentes. Se respeta el cupo de producción si está configurado.' },
    { cat: '📋 Pedidos', q: '¿Quién puede reprogramar pedidos?', a: 'Solo el administrador del negocio. Es una operación crítica que afecta a múltiples clientes a la vez.' },
    { cat: '📋 Pedidos', q: '¿La reprogramación afecta el stock?', a: 'No directamente. El stock ya fue descontado (o no) según el estado original del pedido. La reprogramación solo cambia la fecha.' },

    // ============================================================
    // ⚡ CORRIENTE (P73-P76)
    // ============================================================
    { cat: '⚡ Corriente', q: '¿Cómo funcionan los horarios de corriente?', a: 'Define el patrón (ej: 3h corriente / 12h apagón) y el sistema calcula automáticamente todos los bloques de cada día.' },
    { cat: '⚡ Corriente', q: '¿Qué necesito para configurar corriente?', a: 'Una fecha y hora de referencia donde conociste un bloque de corriente. Ej: "Hoy tuve corriente de 10:00 a 13:00".' },
    { cat: '⚡ Corriente', q: '¿Puedo descargar el reporte de corriente?', a: 'Sí. En Herramientas → ⚡ Gestionar Horarios → pestaña 📊 Reporte, elige semanal o mensual.' },
    { cat: '⚡ Corriente', q: '¿Por qué el calendario muestra algunos días sin corriente?', a: 'Porque según el patrón configurado, ese día no tiene bloques de corriente. Aparecen en gris.' },

    // ============================================================
    // 🏆 PREMIOS (P77-P80)
    // ============================================================
    { cat: '🏆 Premios', q: '¿Cómo funciona el sistema de premios?', a: 'Premia a tus mejores clientes. Se calcula automáticamente el cliente con mayor total gastado en el mes y en el año.' },
    { cat: '🏆 Premios', q: '¿Dónde configuro los premios?', a: 'Ve a 💰 Ventas → botón 🏆 Premios.' },
    { cat: '🏆 Premios', q: '¿Por qué hay tres opciones para calcular el premio anual?', a: 'Cada negocio es diferente. Puedes elegir entregar el premio en Navidad (24 dic), a fin de año (31 dic) o al inicio del siguiente año.' },
    { cat: '🏆 Premios', q: '¿Qué pasa si tengo el sistema de premios desactivado?', a: 'El selector de cálculo anual se guarda igualmente, pero no se muestra la tarjeta de premios en el Dashboard.' },

    // ============================================================
    // 🔔 NOTIFICACIONES Y AYUDA (P81-P90)
    // ============================================================
    { cat: '🔔 Notificaciones', q: '¿Puedo cambiar el sonido de las notificaciones?', a: 'Sí. Ve a tu Perfil → 🔔 Sonido de notificaciones. Puedes elegir entre 5 sonidos embutidos o desactivarlo.' },
    { cat: '🔔 Notificaciones', q: '¿Por qué no se repiten las notificaciones?', a: 'Una vez que abres el modal de notificaciones, se marcan como vistas y no se vuelven a mostrar.' },
    { cat: '🔔 Notificaciones', q: '¿Cómo abro el Centro de Ayuda?', a: 'Haz clic en el botón ❓ de la barra superior.' },
    { cat: '🔔 Notificaciones', q: '¿Qué es la "Ayuda detallada"?', a: 'Es un manual completo que se abre DENTRO de la app (en esta misma ventana).' },
    { cat: '🔔 Notificaciones', q: '¿Puedo volver a ver el tutorial?', a: 'Sí. Ve a Ayuda → Tutorial Interactivo.' },
    { cat: '🔔 Notificaciones', q: '¿Cómo contacto al desarrollador?', a: 'En Ayuda → Créditos. WhatsApp: +53 55031725, Email: 3sayricardo@gmail.com.' },
    { cat: '🔔 Notificaciones', q: '¿Por qué la ayuda se abre detrás de la app?', a: 'Era un bug de z-index. Ahora se corrigió y la ayuda se abre siempre al frente. Si aún lo ves detrás, recarga la página.' },
    { cat: '🔔 Notificaciones', q: '¿El Centro de Ayuda bloquea la pantalla?', a: 'No. Es un menú flotante que aparece debajo del botón ❓. Se cierra automáticamente al hacer clic fuera o presionar Escape.' },
    { cat: '🔔 Notificaciones', q: '¿Por qué en móvil la ayuda se abre en pestaña nueva?', a: 'En móvil, los iframes son problemáticos. Por eso la ayuda detallada se abre directamente en una pestaña nueva.' },
    { cat: '🔔 Notificaciones', q: '¿Por qué el header de la app desaparece cuando abro la ayuda detallada?', a: 'Es intencional. Para evitar que el header capture clicks del modal (bug anterior), ocultamos temporalmente el header y el bottom-nav de la app. Al cerrar la ayuda, se restauran automáticamente.' },

    // ============================================================
    // 👥 MULTIUSUARIO (P91-P95)
    // ============================================================
    { cat: '👥 Multiusuario', q: '¿Puedo tener varios usuarios en el mismo negocio?', a: 'Sí. Al registrarte puedes crear un negocio nuevo o unirte a uno existente con un código de invitación de 8 caracteres.' },
    { cat: '👥 Multiusuario', q: '¿Cómo comparto el código de invitación?', a: 'En tu Perfil, junto al nombre del negocio, verás el código con un botón "📋 Copiar".' },
    { cat: '👥 Multiusuario', q: '¿Quién es el administrador del negocio?', a: 'El primer usuario que crea el negocio es el administrador.' },
    { cat: '👥 Multiusuario', q: '¿Cómo promuevo a un usuario a admin?', a: 'Ve a ⚙️ Herramientas → 👥 Gestionar Usuarios → botón 👑 junto al usuario.' },
    { cat: '👥 Multiusuario', q: '¿Qué puede hacer un admin que un usuario no puede?', a: 'Crear/editar/eliminar insumos, recetas, productos. Gestionar usuarios. Hacer copias completas. Ver costos de recetas.' },

    // ============================================================
    // ⚙️ HERRAMIENTAS (P96-P99)
    // ============================================================
    { cat: '⚙️ Herramientas', q: '¿Qué hace "Reiniciar base de datos"?', a: 'Elimina TODOS los datos excepto usuarios y temas. Contraseña: "panario".' },
    { cat: '⚙️ Herramientas', q: '¿Qué diferencia hay entre "Limpiar datos eliminados" y "Eliminación por error"?', a: 'Ambas son destructivas. "Limpiar datos eliminados" borra todos los registros con soft-delete. "Eliminación por error" permite seleccionar pedidos o ventas específicos.' },
    { cat: '⚙️ Herramientas', q: '¿Cómo fusiono dos bases de datos?', a: 'Ve a ⚙️ Herramientas → 📥 Importar → 🔀 Fusionar bases de datos.' },
    { cat: '⚙️ Herramientas', q: '¿Qué pasa si importo datos duplicados?', a: 'El sistema evita duplicados al fusionar: compara por UUID y solo actualiza si el backup es más reciente.' },

    // ============================================================
    // 🔨 PRODUCCIÓN (P100-P112)
    // ============================================================
    { cat: '🔨 Producción', q: '¿Qué es el horario de producción?', a: 'Es el bloque de corriente que has marcado como el momento en que hornearás tu producción.' },
    { cat: '🔨 Producción', q: '¿Cómo defino el horario de producción para un día?', a: 'Ve a ⚙️ Herramientas → ⚡ Gestionar Horarios → 📅 Calendario.' },
    { cat: '🔨 Producción', q: '¿Qué significa "Pedidos: 5/50"?', a: 'Significa que hay 5 pedidos reservados para ese día y la producción programada es de 50 unidades.' },
    { cat: '🔨 Producción', q: '¿Por qué no puedo crear más pedidos para un día?', a: 'Porque la producción de ese día está completa.' },
    { cat: '🔨 Producción', q: '¿Cómo elimino la producción de un día?', a: 'Ve al día en el calendario, haz clic en el modal de detalle y pulsa el botón 🗑️.' },
    { cat: '🔨 Producción', q: '¿Las ventas directas afectan el cupo de pedidos?', a: 'Sí. Si vendes directamente sin pedido, esas unidades se descuentan del cupo disponible. El cálculo es: cantidad_produccion - pedidos - ventas_directas.' },
    { cat: '🔨 Producción', q: '¿Puedo vender más de la cantidad de producción?', a: 'Sí, las ventas directas no se bloquean. Solo los pedidos respetan el cupo de producción.' },
    { cat: '🔨 Producción', q: '¿Qué pasa si no defino producción para un día?', a: 'No hay límite de pedidos para ese día. La tarjeta no muestra el bloque de producción.' },
    { cat: '🔨 Producción', q: '¿Puedo producir cantidades que no sean enteras?', a: 'Sí. El campo "Cantidad a producir" acepta decimales. Por ejemplo:\n• 6.5 significa 6 jabas y media\n• 2.25 significa 2 jabas y cuarto\n• 0.5 significa media jaba\n\nEsto es útil cuando produces jabas de diferentes tamaños.' },
    { cat: '🔨 Producción', q: '¿Cómo se calcula la cantidad disponible si la producción es decimal?', a: 'La fórmula es: disponibles = cantidad_produccion - pedidos_reservados - ventas_directas.\n\nEjemplo: si produces 6.5 jabas, tienes 5 pedidos y 1 venta directa: 6.5 - 5 - 1 = 0.5 disponibles.' },
    { cat: '🔨 Producción', q: '¿Se puede guardar una cantidad con muchos decimales?', a: 'Sí, pero se recomienda usar máximo 2 decimales para mayor claridad. El sistema los mostrará formateados (ej: 6.33).' },
    { cat: '🔨 Producción', q: '¿Qué pasa si intento guardar cantidad 0 o negativa?', a: 'El sistema muestra un error: "⚠️ La cantidad a producir debe ser mayor a 0". Debes ingresar al menos 0.01.' },
    { cat: '🔨 Producción', q: '¿Por qué no puedo crear un pedido aunque la fecha tiene producción configurada?', a: 'Porque el día está completo. Opciones:\n• Elegir otra fecha\n• Pedirle al admin que aumente la producción del día' },

    // ============================================================
    // 🔄 REPROGRAMACIÓN (P113-P120)
    // ============================================================
    { cat: '🔄 Reprogramación', q: '¿Cómo reprogramo pedidos a otra fecha?', a: 'Ve a ⚙️ Herramientas → 🔄 Reprogramar Pedidos por Rango. Selecciona el rango de fechas origen, la fecha destino, la causa y confirma.' },
    { cat: '🔄 Reprogramación', q: '¿Puedo reprogramar solo los pedidos de un cliente?', a: 'Sí. En el modal de reprogramación hay un campo opcional de cliente.' },
    { cat: '🔄 Reprogramación', q: '¿Qué pasa con la causa y nota al reprogramar?', a: 'La causa y nota se añaden automáticamente al campo de notas de cada pedido.' },
    { cat: '🔄 Reprogramación', q: '¿Se puede deshacer una reprogramación?', a: 'No directamente. Deberás volver a reprogramar los pedidos a la fecha original.' },
    { cat: '🔄 Reprogramación', q: '¿Los pedidos entregados se pueden reprogramar?', a: 'No. Solo se reprograman pedidos en estado pendiente, confirmado, en producción o listo.' },
    { cat: '🔄 Reprogramación', q: '¿Qué pasa si la fecha destino ya tiene pedidos?', a: 'Los pedidos reprogramados se añaden a los ya existentes.' },
    { cat: '🔄 Reprogramación', q: '¿Quién puede reprogramar pedidos?', a: 'Solo el administrador del negocio.' },
    { cat: '🔄 Reprogramación', q: '¿La reprogramación afecta el stock?', a: 'No directamente. El stock ya fue descontado según el estado original del pedido.' },

    // ============================================================
    // 📱 PWA (P121-P126)
    // ============================================================
    { cat: '📱 PWA', q: '¿Por qué la app no funciona offline después de limpiar el caché?', a: 'Si limpias el caché de Chrome, se borran los archivos de la PWA. Abre Panario con conexión a internet una vez para que se vuelvan a cachear. En la versión 2.2.1, el Service Worker detecta esta situación y re-descarga todo automáticamente.' },
    { cat: '📱 PWA', q: '¿Cómo reinstalo la PWA correctamente?', a: 'Desinstala la PWA, limpia el caché del navegador, abre Panario online y vuelve a instalarla.' },
    { cat: '📱 PWA', q: '¿Qué hacer si veo "Sin conexión" pero tengo internet?', a: 'Es posible que el Service Worker tenga una versión antigua. Ve a offline.html y pulsa "Limpiar caché y recargar".' },
    { cat: '📱 PWA', q: '¿Por qué al instalar Panario desde Chrome no se abre a pantalla completa?', a: 'Chrome en Android no reconoce `display: "fullscreen"` como un modo instalable para generar un WebAPK. Solo acepta `standalone`. Se ha cambiado a `standalone` para que la instalación funcione correctamente.' },
    { cat: '📱 PWA', q: '¿Qué diferencia hay entre `standalone` y `fullscreen`?', a: '`standalone` abre la app en una ventana propia sin barra de direcciones, pero mantiene la barra de estado (hora, batería). `fullscreen` oculta también la barra de estado. `standalone` es más estable y es el modo que Chrome Android acepta para instalación completa.' },
    { cat: '📱 PWA', q: '¿Por qué al abrir desde WhatsApp funciona a pantalla completa?', a: 'Porque Android trata el enlace como un "App Link" (deep link). Android detecta que el enlace coincide con el `scope` y `start_url` de una PWA y la lanza en su contexto standalone. Esto no significa que la PWA esté instalada, solo que Android la está lanzando como app.' },

    // ============================================================
    // 🔀 DUPLICADOS (P127-P130)
    // ============================================================
    { cat: '🔀 Duplicados', q: '¿Cómo evito duplicados al importar?', a: 'Usa la opción "🔀 Fusionar bases de datos". El sistema compara por UUID.' },
    { cat: '🔀 Duplicados', q: '¿Qué pasa si importo datos que ya existen?', a: 'En modo fusión, los registros con mismo UUID se comparan por fecha de modificación. Gana el más reciente.' },
    { cat: '🔀 Duplicados', q: '¿Puedo importar la misma salva dos veces?', a: 'Sí, no habrá duplicados. El sistema detecta los registros ya importados.' },
    { cat: '🔀 Duplicados', q: '¿Cómo verifico si hay duplicados en mi base de datos?', a: 'Ve a ⚙️ Herramientas → 🚨 Eliminación por error.' },

    // ============================================================
    // 👤 VENDEDOR (P131-P133)
    // ============================================================
    { cat: '👤 Vendedor', q: '¿Cómo sé quién vendió cada producto?', a: 'En el detalle de cada venta, en la sección de Auditoría, aparece "👤 Creado por: [nombre del vendedor]".' },
    { cat: '👤 Vendedor', q: '¿Puedo filtrar ventas por vendedor?', a: 'Actualmente no hay filtro directo, pero puedes ver el ranking de ventas por empleado en el Dashboard.' },
    { cat: '👤 Vendedor', q: '¿Qué pasa si un usuario es eliminado?', a: 'Sus ventas se mantienen, pero el nombre del vendedor aparecerá como "Desconocido" en la auditoría.' },

    // ============================================================
    // 🔊 SONIDO (P134-P141)
    // ============================================================
    { cat: '🔊 Sonido', q: '¿Por qué no suenan las notificaciones la primera vez que abro la app?', a: 'Los navegadores modernos bloquean el audio hasta que el usuario interactúa con la página. Con la versión 2.1.10, el AudioContext se desbloquea automáticamente con el primer clic, toque o tecla que hagas en cualquier parte de la app (incluso en la pantalla de login).' },
    { cat: '🔊 Sonido', q: '¿Tengo que hacer algo especial para activar el sonido?', a: 'No. Simplemente interactúa con la app (clic, toque, o pulsa una tecla). El audio se desbloquea automáticamente en ese momento. Verás en la consola un mensaje: "🔊 AudioContext desbloqueado correctamente".' },
    { cat: '🔊 Sonido', q: '¿El sonido funciona si no he hecho login todavía?', a: 'Sí. Desde la versión 2.1.10, el audio se desbloquea con cualquier gesto, incluso en la pantalla de login.' },
    { cat: '🔊 Sonido', q: '¿Qué pasa si el navegador sigue bloqueando el audio?', a: 'El sistema reintenta hasta 10 veces. Si después de 10 gestos el navegador sigue bloqueando, se detiene para no spamear. En ese caso, verifica que no tengas el modo silencio activado o que el volumen del dispositivo esté subido.' },
    { cat: '🔊 Sonido', q: '¿Cómo puedo verificar si el audio está desbloqueado?', a: 'Abre la consola del navegador (F12) y busca estos mensajes:\n```\n🔊 AudioContext desbloqueado correctamente (intento #1, origen: gesto (click))\n🔊 Listeners de unlock removidos (éxito)\n```' },
    { cat: '🔊 Sonido', q: '¿El sonido funciona en iOS Safari?', a: 'Sí. iOS Safari requiere que el resume() del AudioContext se ejecute dentro de un gesto del usuario (click o touch). Nuestro sistema lo hace exactamente así: el primer toque en la pantalla desbloquea el audio.' },
    { cat: '🔊 Sonido', q: '¿Por qué a veces suena y a veces no?', a: 'Si el sonido funciona a veces y a veces no, puede ser por:\n• El volumen del dispositivo está bajo\n• Hay otras apps reproduciendo audio\n• El navegador cerró el AudioContext (raro)\n• Estás en modo "No molestar"\n\nEn esos casos, el sistema reintenta automáticamente.' },
    { cat: '🔊 Sonido', q: '¿El "Probar todos" cambia mi sonido configurado?', a: 'No. Al finalizar la prueba, se restaura automáticamente el sonido que tenías configurado. Además, si detienes la prueba con "⏹️ Detener", tampoco se modifica tu configuración.' },

    // ============================================================
    // 🔍 DIAGNÓSTICO (P142-P150)
    // ============================================================
    { cat: '🔍 Diagnóstico', q: '¿Qué es el "Diagnóstico de Producción"?', a: 'Es una herramienta técnica que verifica si el sistema de producción está correctamente configurado. Ejecuta 7 comprobaciones y muestra el resultado con iconos ✅/⚠️/❌.' },
    { cat: '🔍 Diagnóstico', q: '¿Cuándo debo usar el diagnóstico?', a: 'Cuando el guardado de producción no funciona, o cuando ves errores inesperados al intentar definir horarios de producción.' },
    { cat: '🔍 Diagnóstico', q: '¿Cómo accedo al diagnóstico?', a: 'Hay dos formas:\n• ⚙️ Herramientas → 🔍 Diagnóstico de Producción → "Ejecutar diagnóstico".\n• ⚙️ Herramientas → ⚡ Gestionar Horarios → pestaña Config → botón "🔍 Ejecutar diagnóstico".' },
    { cat: '🔍 Diagnóstico', q: '¿Qué significa cada test del diagnóstico?', a: '1. **DBModule disponible:** Verifica que el módulo de base de datos esté cargado.\n2. **saveProduccion() existe:** Comprueba que la función para guardar exista.\n3. **getProduccionByFecha() existe:** Comprueba que la función para leer exista.\n4. **saveProduccionRango() existe:** Verifica la función de rango (CORRECCIÓN #7).\n5. **getCMPBCProducto() existe:** Verifica la función CMPBC (ENTREGA B).\n6. **Estructura de calendario_produccion:** Valida que las columnas sean correctas y acepten decimales.\n7. **Columna CMPBC en productos:** Verifica que la columna `capacidad_max_bloque` exista.' },
    { cat: '🔍 Diagnóstico', q: '¿Qué hago si un test falla?', a: '• **Tests 1-3 fallan:** El módulo db.js no está cargado. Recarga la página. Si persiste, borra caché.\n• **Test 4 falla:** La migración de base de datos no se ejecutó. Abre la consola (F12) al inicio y busca errores.\n• **Test 5 falla:** Falta la funcionalidad CMPBC. Actualiza a la última versión.\n• **Test 6 falla:** Falta alguna columna o el tipo es incorrecto. Actualiza a la última versión.\n• **Test 7 falla:** Falta la columna CMPBC en productos. Actualiza a la última versión.' },
    { cat: '🔍 Diagnóstico', q: '¿Qué hace el botón "Copiar reporte"?', a: 'Copia al portapapeles un reporte completo con:\n• Info del entorno (versión, navegador, online).\n• Resumen de OK/advertencias/errores.\n• Detalle de cada test con su mensaje y detalle técnico.\n\nÚtil para pegar en WhatsApp o email al desarrollador.' },
    { cat: '🔍 Diagnóstico', q: '¿Puedo ejecutar el diagnóstico varias veces?', a: 'Sí. Pulsa "🔄 Re-ejecutar" dentro del modal o ciérralo y vuelve a abrirlo. Los tests son idempotentes (no dejan rastros).' },
    { cat: '🔍 Diagnóstico', q: '¿El diagnóstico envía datos a algún servidor?', a: 'No. Todo se ejecuta localmente en tu dispositivo. El reporte solo se copia al portapapeles si tú pulsas el botón.' },
    { cat: '🔍 Diagnóstico', q: '¿Puedo usar el diagnóstico en móvil?', a: 'Sí. Funciona igual en móvil y desktop. En móvil, el modal se adapta al tamaño de la pantalla.' },
    { cat: '🔍 Diagnóstico', q: '¿Qué hago si TODOS los tests pasan pero el guardado sigue fallando?', a: 'Significa que el problema no es técnico del código, sino probablemente de caché del navegador sirviendo archivos antiguos. Prueba:\n• "🧹 Limpiar caché y recargar" desde el mismo modal.\n• Abre DevTools (F12) → Application → Clear storage → Clear site data.\n• Recarga con Ctrl+Shift+R (Windows) o Cmd+Shift+R (Mac).' },

    // ============================================================
    // 🏭 CMPBC (P151-P170)
    // ============================================================
    { cat: '🏭 CMPBC', q: '¿Qué es el CMPBC?', a: 'Es la Capacidad Máxima de Producción por Bloque de Corriente. Indica cuántas unidades de un producto puedes producir en un solo bloque de corriente.' },
    { cat: '🏭 CMPBC', q: '¿Dónde configuro el CMPBC de un producto?', a: 'En 🏷️ Productos → Nuevo/Editar Producto. Hay un bloque morado con 🏭 Capacidad máx/bloque (solo Admin).' },
    { cat: '🏭 CMPBC', q: '¿Qué valor debo poner en el CMPBC?', a: 'El número máximo de unidades que puedes producir en UN bloque de corriente. Ej: si en 3 horas de corriente produces 7 jabas, pon 7.' },
    { cat: '🏭 CMPBC', q: '¿Puedo dejar el CMPBC vacío?', a: 'Sí. Si lo dejas vacío o en 0, el producto no tendrá cálculo automático de bloques.' },
    { cat: '🏭 CMPBC', q: '¿Por qué el campo CMPBC está en color morado?', a: 'Es el color distintivo de la función de producción automática.' },
    { cat: '🏭 CMPBC', q: '¿Puedo poner decimales en el CMPBC?', a: 'Sí. Acepta cualquier número real: 6, 6.5, 7.25, 0.5, etc.' },
    { cat: '🏭 CMPBC', q: '¿Qué pasa si cambio el CMPBC de un producto ya usado?', a: 'Los cálculos futuros usarán el nuevo valor. Las producciones ya guardadas conservan su distribución.' },
    { cat: '🏭 CMPBC', q: '¿Cómo sé si un producto tiene CMPBC configurado?', a: 'En la lista de productos, aparece un badge morado 🏭 X/bloque junto al nombre.' },
    { cat: '🏭 CMPBC', q: '¿El CMPBC es obligatorio?', a: 'No. Es opcional. Sin él, el sistema funciona como antes (producción manual).' },
    { cat: '🏭 CMPBC', q: '¿Cómo se relaciona el CMPBC con el modal de producción?', a: 'Al seleccionar un producto con CMPBC y escribir una cantidad, aparecerá el botón ✨ Calcular bloques automáticamente.' },
    { cat: '🏭 CMPBC', q: '¿Puedo eliminar el CMPBC de un producto?', a: 'Sí. Edita el producto y borra el valor del campo, o ponlo en 0. Se guardará como null.' },
    { cat: '🏭 CMPBC', q: '¿El CMPBC es por producto o global?', a: 'Por producto. Cada producto tiene su propia capacidad máxima por bloque.' },
    { cat: '🏭 CMPBC', q: '¿Qué significa bloques_usados en calendario_produccion?', a: 'Es el número de bloques de corriente que se usarán para producir la cantidad planificada (por ejemplo, 2 si necesitas dividir la producción).' },
    { cat: '🏭 CMPBC', q: '¿Qué contiene distribucion_bloques?', a: 'Es un JSON con la distribución por bloque. Ejemplo: `[{"bloque_index": 1, "cantidad": 7}, {"bloque_index": 3, "cantidad": 5.5}]`.' },
    { cat: '🏭 CMPBC', q: '¿Cómo consulto el CMPBC de un producto por consola?', a: 'window.DBModule.getCMPBCProducto(productoId) → devuelve el valor o null.' },
    { cat: '🏭 CMPBC', q: '¿Cómo obtengo todos los productos con CMPBC?', a: 'window.DBModule.getProductosConCMPBC() → devuelve un array.' },
    { cat: '🏭 CMPBC', q: '¿Puedo cambiar el CMPBC después de crear el producto?', a: 'Sí. Solo edita el producto desde ui-productos.js (Admin) y cambia el valor.' },
    { cat: '🏭 CMPBC', q: '¿Qué pasa con las producciones antiguas al migrar?', a: 'La migración añade las columnas con valores por defecto. No se pierden datos.' },
    { cat: '🏭 CMPBC', q: '¿Qué pasa si un producto no tiene CMPBC?', a: 'El sistema no podrá calcular automáticamente los bloques. Mostrará un aviso sugiriendo configurarlo.' },
    { cat: '🏭 CMPBC', q: '¿Cómo se ve el CMPBC en la lista de productos?', a: 'Si un producto tiene CMPBC definido, aparece un badge morado 🏭 7/bloque junto al nombre.' },
    { cat: '🏭 CMPBC', q: '¿Qué pasa si veo la columna CMPBC en blanco?', a: 'Significa que ese producto no tiene CMPBC configurado. Puedes editarlo y añadirlo cuando quieras.' },
    { cat: '🏭 CMPBC', q: '¿Cómo se calcula la cantidad a producir si tengo varios productos?', a: 'Cada producto tiene su propio CMPBC. El cálculo se hace por producto individual. Si produces varios productos el mismo día, cada uno se calcula por separado.' },

    // ============================================================
    // 🧠 ALGORITMO DE BLOQUES (P171-P185)
    // ============================================================
    { cat: '🧠 Algoritmo de bloques', q: '¿Cómo funciona el cálculo automático de bloques?', a: 'Selecciona un producto (con CMPBC), escribe la cantidad y pulsa "✨ Calcular bloques automáticamente". El sistema sugiere cómo distribuir la producción entre los bloques de corriente.' },
    { cat: '🧠 Algoritmo de bloques', q: '¿Qué reglas sigue el algoritmo?', a: 'Prioriza bloques al amanecer (antes de las 9 AM). Si el primero del día termina muy tarde, usa el último bloque del día anterior. El primer bloque lleva más cantidad.' },
    { cat: '🧠 Algoritmo de bloques', q: '¿Qué es la "tolerancia del amanecer"?', a: 'Los bloques que terminan entre las 8:00 y 9:00 AM también son válidos para producir el pan del desayuno.' },
    { cat: '🧠 Algoritmo de bloques', q: '¿Qué pasa si no hay suficientes bloques?', a: 'Muestra un error indicando cuántas unidades máximo puedes producir. Puedes aumentar el CMPBC, elegir otro producto o dividir la producción en varios días.' },
    { cat: '🧠 Algoritmo de bloques', q: '¿El sistema guarda la distribución sugerida?', a: 'Sí. Guarda en distribucion_bloques un JSON con el detalle de cada bloque usado (fecha, bloque, cantidad).' },
    { cat: '🧠 Algoritmo de bloques', q: '¿Puedo modificar la distribución manualmente?', a: 'Sí. Después de pulsar "Confirmar", puedes editar el bloque o la cantidad manualmente y volver a guardar.' },
    { cat: '🧠 Algoritmo de bloques', q: '¿Qué significa "Bloques: 2" en el modal?', a: 'Indica que la producción se distribuirá en 2 bloques de corriente. Ej: 7 unidades al amanecer + 5 unidades por la tarde.' },
    { cat: '🧠 Algoritmo de bloques', q: '¿Cómo se relaciona el CMPBC con el cálculo de bloques?', a: 'El CMPBC define cuántas unidades caben por bloque. El sistema divide cantidad_total / CMPBC para saber cuántos bloques necesita.' },
    { cat: '🧠 Algoritmo de bloques', q: '¿Qué pasa si un producto tiene CMPBC=0 o vacío?', a: 'No se puede calcular automáticamente. El botón ✨ no aparece. Puedes seguir configurando manualmente.' },
    { cat: '🧠 Algoritmo de bloques', q: '¿El algoritmo considera la producción ya programada?', a: 'No directamente, pero el sistema sobrescribe si ya había producción ese día. El modal de confirmación avisa.' },
    { cat: '🧠 Algoritmo de bloques', q: '¿Cómo se numeran los bloques del día anterior?', a: 'Se usa el indexEnDiaAnterior, que es la posición real del bloque en el día anterior. Ej: si es el 4º bloque del día anterior, bloque_index=4 con es_bloque_dia_anterior=1.' },
    { cat: '🧠 Algoritmo de bloques', q: '¿El modal de producción muestra la distribución guardada?', a: 'Sí, si un día tiene bloques_usados > 1, el reporte PDF de corriente muestra un badge "N bloques" y la app puede mostrar la distribución completa.' },
    { cat: '🧠 Algoritmo de bloques', q: '¿Puedo elegir un producto diferente al ya guardado?', a: 'Sí. Cambia el dropdown y vuelve a pulsar "✨ Calcular". El nuevo cálculo reemplazará la distribución anterior al confirmar.' },
    { cat: '🧠 Algoritmo de bloques', q: '¿El algoritmo prioriza el bloque de ayer o el de hoy?', a: 'Si el bloque de ayer termina antes de las 8 AM, tiene prioridad ALTA. Si no, se ordenan por cercanía al amanecer.' },
    { cat: '🧠 Algoritmo de bloques', q: '¿Qué pasa si el bloque de ayer cruza medianoche?', a: 'El algoritmo lo trata como válido si termina antes de las 9 AM del día de venta. Se muestra como "🌙 Último bloque del [fecha]".' },

    // ============================================================
    // 🌙 BLOQUE DEL DÍA ANTERIOR (CORRECCIÓN #6) — P186-P192
    // ============================================================
    { cat: '🌙 Bloque del día anterior', q: '¿Qué es el "bloque del día anterior"?', a: 'Es el último bloque de corriente del día previo al día de venta. Se usa cuando el primer bloque del día de venta comienza muy tarde (después de las 8 AM) y el pan debe estar listo antes del amanecer.' },
    { cat: '🌙 Bloque del día anterior', q: '¿Cómo se identifica un bloque del día anterior?', a: 'En la tarjeta del día en la lista de Pedidos, aparece un badge morado con el icono 🌙 y el texto "Prod. ayer: DD/MM de HH:MM a HH:MM". Ejemplo: "🌙 Prod. ayer: 23/09 de 5:00 PM a 8:00 PM".' },
    { cat: '🌙 Bloque del día anterior', q: '¿Por qué el texto dice "Prod. ayer: 23/09..." en lugar de solo las horas?', a: 'Porque "ayer" es una referencia relativa y puede ser ambigua. Ahora se muestra la fecha real del bloque (`fecha_bloque_real`) para que sepas exactamente a qué día corresponde. El formato es consistente con los demás días: `DD/MM de HH:MM a HH:MM`.' },
    { cat: '🌙 Bloque del día anterior', q: '¿Cómo se guarda un bloque del día anterior?', a: 'En el modal de producción del calendario, cuando seleccionas el bloque "🌙 Último bloque de ayer" y guardas, se marca `es_bloque_dia_anterior = 1` y se guarda `fecha_bloque_real` con la fecha real del bloque.' },
    { cat: '🌙 Bloque del día anterior', q: '¿El badge del día anterior es diferente al del día actual?', a: 'Sí. El día actual usa "🔨 Producción: 23/09 de 2:00 AM a 5:00 AM" (icono martillo). El día anterior usa "🌙 Prod. ayer: 23/09 de 5:00 PM a 8:00 PM" (icono luna + borde punteado morado).' },
    { cat: '🌙 Bloque del día anterior', q: '¿Puedo ver el bloque del día anterior en el detalle del pedido?', a: 'Sí. En la vista de detalle del pedido, si el bloque es del día anterior, aparece el badge con la fecha y un texto adicional: "📅 Bloque real: 2026-09-23".' },
    { cat: '🌙 Bloque del día anterior', q: '¿El bloque del día anterior afecta la fecha de entrega del pedido?', a: 'No. La fecha de entrega del pedido sigue siendo el día de venta. El bloque del día anterior es solo informativo, para saber cuándo se horneó el producto.' },

    // ============================================================
    // 📅 EXCLUIR DÍAS DE LA SEMANA (CORRECCIÓN #4) — P193-P197
    // ============================================================
    { cat: '📅 Excluir días', q: '¿Qué es la exclusión de días en la reserva por período?', a: 'Es una opción que permite excluir ciertos días de la semana (ej: domingos) al crear una reserva por período. Solo aplica cuando el patrón es "Rango completo".' },
    { cat: '📅 Excluir días', q: '¿Cómo excluyo los domingos de una reserva?', a: 'En el modal "Reserva por período", activa el checkbox 🚫 Excluir los domingos del rango. También puedes usar el botón "🚫 Excluir fines de semana" para excluir sábados y domingos a la vez.' },
    { cat: '📅 Excluir días', q: '¿Puedo excluir varios días a la vez?', a: 'Sí. Puedes marcar varios días de la semana en la sección "🚫 Excluir días de la semana" (Lun, Mar, Mié, Jue, Vie, Sáb, Dom).' },
    { cat: '📅 Excluir días', q: '¿La exclusión se combina con la paridad (pares/impares)?', a: 'Sí. Puedes combinar "Solo pares" con "Excluir domingos". El sistema primero aplica la paridad y luego excluye los días de la semana marcados.' },
    { cat: '📅 Excluir días', q: '¿La exclusión funciona en todos los tipos de patrón?', a: 'No. La exclusión solo aplica al patrón "Rango completo". En los patrones "Días de la semana" y "Días específicos" no tiene sentido, porque ya seleccionas exactamente qué días incluir.' },

    // ============================================================
    // 📆 PRODUCCIÓN POR RANGO (CORRECCIÓN #7) — P198-P202
    // ============================================================
    { cat: '📆 Producción por rango', q: '¿Qué es la producción por rango?', a: 'Es una herramienta que permite aplicar la misma producción a múltiples días a la vez. Útil para programar la producción de toda una semana o mes.' },
    { cat: '📆 Producción por rango', q: '¿Cómo accedo a la producción por rango?', a: 'En el modal de producción de un día (Calendario → clic en un día), pulsa el botón "📅 Aplicar a rango".' },
    { cat: '📆 Producción por rango', q: '¿Qué es "bloque relativo" vs "bloque fijo"?', a: '• **Relativo:** Cada día usa su bloque equivalente (ej: todos los días el primer bloque).\n• **Fijo:** Todos los días usan exactamente el mismo horario del día base.' },
    { cat: '📆 Producción por rango', q: '¿Puedo excluir días sin corriente?', a: 'Sí. En el modal de producción por rango, activa el checkbox "🌙 Excluir los días sin corriente". Los días sin corriente se omiten automáticamente.' },
    { cat: '📆 Producción por rango', q: '¿Qué pasa si un día del rango ya tiene producción?', a: 'Se sobrescribe. El sistema te avisa en la vista previa antes de confirmar: "⚠️ N día(s) del rango ya tienen producción programada. Serán sobrescritos."' },

    // ============================================================
    // 🔒 BLOQUEO POR RECETAS (CORRECCIÓN #2) — P203-P206
    // ============================================================
    { cat: '🔒 Bloqueo por recetas', q: '¿Por qué a veces no puedo editar un pedido o una venta?', a: 'Si el pedido o la venta usa una receta que NO te han compartido, verás un badge "🔒 Solo lectura" y no podrás editarlo, anularlo, cobrarlo ni eliminarlo.' },
    { cat: '🔒 Bloqueo por recetas', q: '¿Qué significa "🔒 Solo lectura"?', a: 'Significa que el registro (pedido o venta) usa una receta que no tienes permiso para usar. Puedes verlo, pero no procesarlo.' },
    { cat: '🔒 Bloqueo por recetas', q: '¿Quién puede levantar el bloqueo?', a: 'Solo el administrador. Debe compartir la receta asociada con el negocio para que el usuario regular pueda procesar el pedido o la venta.' },
    { cat: '🔒 Bloqueo por recetas', q: '¿El bloqueo afecta a los gastos?', a: 'No. Los gastos no tienen receta asociada, así que nunca se bloquean.' },

    // ============================================================
    // 📄 REPORTES Y EXPORTACIONES (P207-P216)
    // ============================================================
    { cat: '📄 Reportes', q: '¿En qué orden aparecen las ventas en el reporte PDF?', a: 'Se ordenan por fecha ascendente y, dentro de la misma fecha, por ID ascendente. La venta más antigua del día aparece primero.' },
    { cat: '📄 Reportes', q: '¿En qué orden aparecen los pedidos en el reporte PDF?', a: 'Igual: por fecha de entrega ascendente y luego por ID ascendente.' },
    { cat: '📄 Reportes', q: '¿Las deudas también se ordenan?', a: 'Sí. En el reporte de deudas, se ordenan por fecha de venta ascendente y luego por ID ascendente.' },
    { cat: '📄 Reportes', q: '¿Por qué añadieron la columna # en los reportes?', a: 'Para que puedas identificar rápidamente cada venta/pedido por su ID y relacionarlo con el módulo de Eliminación por Error o con la lista de la app.' },
    { cat: '📄 Reportes', q: '¿Puedo cambiar el orden de los reportes?', a: 'Actualmente no. Los reportes usan un orden fijo (fecha ASC + ID ASC) que refleja el orden cronológico real.' },
    { cat: '📄 Reportes', q: '¿Los reportes de insumos y recetas también se ordenan?', a: 'Los insumos se ordenan alfabéticamente por nombre. Las recetas también se ordenan por nombre y fecha de creación.' },
    { cat: '📄 Reportes', q: '¿Por qué el reporte de ventas muestra solo 100 filas?', a: 'Para que el PDF no se haga demasiado largo. Si necesitas ver más, filtra por un rango de fechas más específico o usa la exportación de la base de datos.' },
    { cat: '📄 Reportes', q: '¿Los reportes respetan el tema oscuro?', a: 'No. Los reportes PDF siempre se generan en fondo blanco con texto negro, para garantizar legibilidad al imprimir.' },
    { cat: '📄 Reportes', q: '¿Qué significa la columna 🚀 en el detalle de ventas?', a: 'Indica que esa venta es una venta liberada (sin cliente identificado).' },
    { cat: '📄 Reportes', q: '¿Puedo exportar el Dashboard a PDF?', a: 'Sí. En el Dashboard, pulsa "📥 Exportar" para descargar un reporte de texto con todas las estadísticas. También puedes exportar el gráfico como imagen (🖼️) o como PDF (📄).' },

    // ============================================================
    // 🔍 AUDITORÍA Y VENDEDOR (P217-P224)
    // ============================================================
    { cat: '🔍 Auditoría', q: '¿Cómo sé quién registró cada venta?', a: 'En el detalle de cada venta (pulsa 👁️ Ver), al final aparece la sección "🔍 Auditoría" con:\n• 👤 Creado por: nombre del vendedor.\n• 📅 Fecha: fecha y hora exactas.\n• ✏️ Modificado por: si alguien la editó después.' },
    { cat: '🔍 Auditoría', q: '¿Puedo cambiar el vendedor de una venta?', a: 'No directamente. El campo `created_by` se asigna al usuario que la creó y no se puede modificar. Si necesitas corregir esto, debes anular la venta y crear una nueva con el usuario correcto.' },
    { cat: '🔍 Auditoría', q: '¿Qué pasa si un vendedor es eliminado del negocio?', a: 'Sus ventas se mantienen en el sistema, pero en la sección de auditoría el nombre aparecerá como "Desconocido".' },
    { cat: '🔍 Auditoría', q: '¿Por qué el botón "Anular" ahora pide dos confirmaciones?', a: 'La primera confirmación ("¿Seguro que quieres anular esta venta?") evita anulaciones accidentales. La segunda (motivo) permite documentar por qué se anuló. Puedes dejar el motivo vacío: se guardará como "Anulación manual".' },
    { cat: '🔍 Auditoría', q: '¿Por qué a veces al anular una venta el modal de motivo se cierra solo?', a: 'Era un bug conocido (fix #22) que ocurría porque el modal de confirmación no se había eliminado del DOM antes de abrir el de motivo. En la versión actual (v2.2.1), el sistema espera correctamente a que cada modal se cierre antes de abrir el siguiente.' },
    { cat: '🔍 Auditoría', q: '¿Qué muestra el reporte copiado del diagnóstico?', a: 'Incluye:\n• Versión de la app\n• Navegador detectado\n• Estado online\n• Fecha y hora\n• User-Agent completo\n• Resumen (OK/WARN/ERROR)\n• Detalle de cada uno de los 7 tests\n• Mensaje de error exacto (si aplica)' },
    { cat: '🔍 Auditoría', q: '¿Cómo restauro una venta anulada?', a: 'Ve al detalle de la venta anulada (borde gris) y pulsa "🔄 Restaurar". Se repondrá el stock descontado y la venta volverá a estado normal.' },
    { cat: '🔍 Auditoría', q: '¿Por qué el contador de "Pedidos mañana" a veces no coincide con el total?', a: 'Porque excluye pedidos en estado cancelado, entregado o compró por lista de espera. El "total de pedidos" (en el Dashboard principal) sí los cuenta.' },

    // ============================================================
    // 🎉 v2.2.0 + v2.2.1 (P225-P244)
    // ============================================================
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿Por qué la versión saltó a v2.2.0?', a: 'Porque la Entrega B (CMPBC + algoritmo inteligente) es una funcionalidad mayor.' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿Qué pasa con el caché antiguo al actualizar?', a: 'El Service Worker detecta el cambio de versión y elimina automáticamente los cachés obsoletos.' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿Tengo que hacer algo especial para actualizar?', a: 'No. Solo recarga la app con conexión a internet. El SW se actualizará solo en 5-10 segundos.' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿La nueva versión es compatible con mis datos actuales?', a: 'Sí, totalmente. La migración es automática y no pierde datos.' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿Cómo sé que estoy en v2.2.1?', a: 'Ve a ⚙️ Herramientas → al final verás "Versión: 2.2.1". O en consola: window.getAppVersion()' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿Qué es el shortcut "Producción" de la PWA?', a: 'Es un acceso directo que añadí en v2.2.0 para que puedas ir directamente a la planificación de producción desde el icono de Panario en tu móvil.' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿Los shortcuts funcionan en iOS?', a: 'En iOS, los shortcuts de la PWA tienen soporte limitado. En Android funcionan correctamente.' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿Por qué hay 6 shortcuts ahora?', a: 'Antes había 5 (Inicio, Pedidos, Lista de espera, Ventas, Herramientas). Añadí "Producción" en v2.2.0.' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿La versión del manifest coincide con la app?', a: 'Sí. Desde v2.2.1, todos los archivos usan la misma versión.' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿Cómo veo la versión del manifest en el navegador?', a: 'En Chrome/Edge: DevTools (F12) → Application → Manifest.' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿Qué novedades trae la v2.2.0?', a: 'Incluye la Entrega B completa: CMPBC, algoritmo inteligente de bloques, dropdown de productos, y 6 shortcuts.' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿Cómo actualizo Panario a v2.2.1 si la tengo instalada?', a: 'Abre la app con internet. En 5-10 segundos aparecerá "✨ Actualización disponible".' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿Por qué cambiaron los shortcuts de la PWA?', a: 'Añadí "Producción" en v2.2.0 para acceso rápido al calendario de corriente.' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿Qué pasa con mis datos al actualizar a v2.2.1?', a: 'Nada. Tus datos se conservan intactos.' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿La versión del manifest y del sw.js deben coincidir?', a: 'Sí. Todos los archivos usan la misma versión.' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿Cómo sé si estoy corriendo la v2.2.1?', a: 'Ve a ⚙️ Herramientas → al final verás "Versión: 2.2.1".' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿La v2.2.0 rompe algo de las versiones anteriores?', a: 'No. La v2.2.0 es compatible con todos los datos de versiones anteriores.' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿Por qué la versión del caché cambió a panario-v2.2.1?', a: 'Para forzar una reinstalación limpia del Service Worker.' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿Qué hago si el navegador sigue sirviendo la versión antigua?', a: 'Limpia el caché del navegador y recarga con Ctrl+Shift+R.' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿Cuándo debo actualizar a v2.2.1?', a: 'Cuanto antes. Tiene mejoras de producción y compatibilidad con GitHub Pages.' },
    { cat: '🎉 v2.2.0 + v2.2.1', q: '¿El atajo de teclado Escape cierra la Ayuda Detallada?', a: 'Sí. Tanto en modal (desktop) como en pestaña nueva (móvil).' },

    // ============================================================
    // 🐛 CORRECCIONES FINALES 220926 (P245-P260)
    // ============================================================
    { cat: '🐛 Correcciones finales', q: '¿Por qué el modal de reprogramación aparecía con datos de la última operación?', a: 'Era un bug: al abrir el modal, se ejecutaba automáticamente `actualizarPreviewReprogramacion()`, que consultaba la BD con las fechas por defecto y mostraba los pedidos existentes. Ahora la vista previa se inicializa vacía y solo se rellena cuando el usuario introduce fechas válidas.' },
    { cat: '🐛 Correcciones finales', q: '¿Qué significa "Selecciona las fechas para ver la vista previa"?', a: 'Es un mensaje informativo (no un error). Significa que faltan datos por completar (fechas Desde, Hasta o Destino). Una vez completados, la vista previa mostrará los pedidos afectados.' },
    { cat: '🐛 Correcciones finales', q: '¿Por qué al cerrar la ayuda detallada antes se cerraba mi sesión?', a: 'Era un bug de z-index: el botón 🚪 (cerrar sesión) del header de la app estaba detrás del modal de ayuda, pero seguía capturando clicks. Al pulsar ✕ o "Volver a Panario", el click "atravesaba" el modal y activaba el botón de cerrar sesión. Desde v2.2.3 este bug está corregido.' },
    { cat: '🐛 Correcciones finales', q: '¿Por qué el header de la app desaparece cuando abro la ayuda detallada?', a: 'Es intencional. Para evitar que el header capture clicks del modal (bug anterior), ocultamos temporalmente el header y el bottom-nav de la app. Al cerrar la ayuda, se restauran automáticamente.' },
    { cat: '🐛 Correcciones finales', q: '¿Puedo hacer clic fuera del modal para cerrarlo?', a: 'Sí. Al hacer clic sobre el fondo oscuro (overlay) fuera del contenido del modal, la ayuda se cierra. Los clicks dentro del contenido (iframe, botones) no cierran el modal.' },
    { cat: '🐛 Correcciones finales', q: '¿Qué significa `inert` y por qué se usa?', a: '`inert` es un atributo HTML que hace que un elemento y todos sus descendientes ignoren eventos de usuario (clicks, teclado, focus, etc.). Lo usamos para bloquear completamente la app mientras el modal está abierto. Si el navegador no lo soporta, el bloqueo se hace con `visibility: hidden` en el header y el bottom-nav.' },
    { cat: '🐛 Correcciones finales', q: '¿Por qué el badge de "Prod. ayer" ahora muestra la fecha real (23/09)?', a: 'Antes el texto decía solo "5:00 PM - 8:00 PM", sin indicar a qué día correspondía el bloque. Eso era ambiguo porque "ayer" es una referencia relativa. Ahora muestra la fecha real (23/09) usando el campo `fecha_bloque_real` guardado en la base de datos. El formato es consistente con los demás días: `DD/MM de HH:MM a HH:MM`.' },
    { cat: '🐛 Correcciones finales', q: '¿Por qué los otros días muestran "🔨 Producción:" y el día anterior muestra "🌙 Prod. ayer:"?', a: 'Es una distinción visual intencional. El icono 🔨 (martillo) se usa para bloques de producción del día actual del pedido. El icono 🌙 (luna) se usa para bloques de producción que se hicieron el día anterior. Ambos tienen el mismo formato de fecha/hora.' },
    { cat: '🐛 Correcciones finales', q: '¿Qué significa "23/09 de 5:00 PM a 8:00 PM"?', a: 'Significa que el bloque de producción se ejecutará el **23 de septiembre de 5:00 PM a 8:00 PM**. La fecha es la del día real del bloque (que puede ser el día anterior al de entrega del pedido).' },
    { cat: '🐛 Correcciones finales', q: '¿Por qué el formato del badge del día anterior cambió?', a: 'Antes había una inconsistencia: los días normales usaban `DD/MM de HH:MM a HH:MM` pero el día anterior usaba `HH:MM - HH:MM` (sin fecha). Esto confundía porque no se sabía a qué día correspondía. Ahora **todos los bloques usan el mismo formato** con la fecha real del bloque.' },
    { cat: '🐛 Correcciones finales', q: '¿Puedo ver la fecha exacta del bloque de producción desde el detalle del pedido?', a: 'Sí. En la vista de detalle del pedido, la sección de producción muestra el badge con la fecha, y si es del día anterior, aparece un texto extra: "📅 Bloque real: 2026-09-23".' },
    { cat: '🐛 Correcciones finales', q: '¿Cómo sé si un bloque es del día anterior o del día actual?', a: 'El icono te lo indica:\n• 🔨 **Producción:** → Es un bloque del día actual del pedido.\n• 🌙 **Prod. ayer:** → Es un bloque del día anterior al de entrega.' },
    { cat: '🐛 Correcciones finales', q: '¿La fecha del bloque afecta la entrega del pedido?', a: 'No. La fecha del pedido sigue siendo la fecha de entrega al cliente. La fecha del bloque de producción es solo informativa, para saber cuándo se horneó el producto.' },
    { cat: '🐛 Correcciones finales', q: '¿Por qué un bloque de producción puede ser del día anterior?', a: 'Porque a veces el primer bloque de corriente del día de venta comienza muy tarde (después de las 8 AM). En ese caso, el algoritmo de producción usa el último bloque del día anterior para que el pan esté listo antes del amanecer.' },
    { cat: '🐛 Correcciones finales', q: '¿Por qué antes la versión mostrada en Herramientas era 2.1.11?', a: 'Era un fallback (valor por defecto) que se usaba si la aplicación no podía leer la versión desde el archivo `index.html`. Se ha actualizado a `2.2.1` para mantener la coherencia. Ahora, aunque falle la lectura, la versión mostrada será la correcta.' },
    { cat: '🐛 Correcciones finales', q: '¿Por qué la versión de la aplicación mostrada en Herramientas podría ser incorrecta?', a: 'Antes, si el archivo `index.html` no exponía la etiqueta `<meta name="app-version">`, el sistema usaba un valor por defecto (`2.1.11`). Se ha actualizado ese valor a `2.2.1` para garantizar coherencia incluso si la lectura de la etiqueta falla.' },

    // ============================================================
    // 📱 PWA Y PANTALLA COMPLETA (P261-P270)
    // ============================================================
    { cat: '📱 PWA y pantalla completa', q: '¿Por qué al instalar Panario desde Chrome no se abre a pantalla completa?', a: 'Chrome en Android no reconoce `display: "fullscreen"` como un modo instalable para generar un WebAPK. Solo acepta `standalone`. Se ha cambiado a `standalone` para que la instalación funcione correctamente.' },
    { cat: '📱 PWA y pantalla completa', q: '¿Qué diferencia hay entre `standalone` y `fullscreen`?', a: '`standalone` abre la app en una ventana propia sin barra de direcciones, pero mantiene la barra de estado (hora, batería). `fullscreen` oculta también la barra de estado. `standalone` es más estable y es el modo que Chrome Android acepta para instalación completa.' },
    { cat: '📱 PWA y pantalla completa', q: '¿Por qué al abrir desde WhatsApp funciona a pantalla completa?', a: 'Porque Android trata el enlace como un "App Link" (deep link). Android detecta que el enlace coincide con el `scope` y `start_url` de una PWA y la lanza en su contexto standalone.' },
    { cat: '📱 PWA y pantalla completa', q: '¿Cómo instalo Panario correctamente?', a: 'Abre Panario en Chrome (con HTTPS), espera a que aparezca el ícono de instalación en la barra de direcciones (o usa el menú ⋮ → "Instalar aplicación"), y pulsa "Instalar". La app aparecerá en tu pantalla de inicio.' },
    { cat: '📱 PWA y pantalla completa', q: '¿Por qué no veo el ícono de instalación en Chrome?', a: 'Puede ser por varias razones: (1) el manifest no cumple todos los requisitos, (2) el Service Worker no está controlando la página, (3) no es HTTPS, (4) el navegador aún no ha detectado la PWA como instalable. Abre DevTools → Application → Manifest y verifica que no haya errores.' },
    { cat: '📱 PWA y pantalla completa', q: '¿Cómo verifico que la PWA es instalable?', a: 'Abre DevTools (F12) → Application → Manifest. Debe mostrar `display: standalone`, `start_url: ./index.html` e íconos 192x192 y 512x512. En la sección "Installability" no debe haber errores.' },
    { cat: '📱 PWA y pantalla completa', q: '¿Qué es `display_override`?', a: 'Es un array que permite especificar una cadena de fallback para el modo de visualización. Ej: `["fullscreen", "standalone", "minimal-ui", "browser"]`. El navegador intentará aplicar el primero que soporte.' },
    { cat: '📱 PWA y pantalla completa', q: '¿Qué pasa con los usuarios que ya tienen la PWA instalada con `fullscreen`?', a: 'El cambio de `CACHE_NAME` a `panario-v2.2.1` fuerza la reinstalación limpia del Service Worker. Los usuarios que tengan la PWA antigua verán un aviso de "Actualización disponible". Sin embargo, es posible que necesiten desinstalar y reinstalar la PWA para que Chrome aplique el nuevo `display: standalone`.' },
    { cat: '📱 PWA y pantalla completa', q: '¿Por qué es importante el `start_url` y `scope` para la instalación?', a: 'Chrome usa `start_url` para saber qué página abrir al lanzar la PWA, y `scope` para saber qué URLs pertenecen a la app. Si no están configurados correctamente, Chrome puede no considerar la app como instalable.' },
    { cat: '📱 PWA y pantalla completa', q: '¿Cómo verifico que el Service Worker está controlando la página?', a: 'Abre DevTools (F12) → Application → Service Workers. Debe decir "activated and is running" y "This page is controlled by a service worker". Si no, recarga la página o espera unos segundos.' },

    // ============================================================
    // 🌐 OFFLINE Y SERVICE WORKER (P271-P285)
    // ============================================================
    { cat: '🌐 Offline y SW', q: '¿Qué es el Service Worker?', a: 'Es un script que corre en segundo plano y se encarga de cachear los archivos de la PWA para que funcione offline. También gestiona la actualización automática de la app.' },
    { cat: '🌐 Offline y SW', q: '¿Qué significa "CACHE_REPAIRED_START" en la consola?', a: 'Es un mensaje del Service Worker que indica que ha detectado que faltan archivos en el caché y está empezando a re-descargarlos. Verás CACHE_REPAIRED_END cuando termine. Esto es normal tras limpiar el caché.' },
    { cat: '🌐 Offline y SW', q: '¿Cómo puedo forzar la reparación del caché manualmente?', a: 'Desde la consola del navegador:\n```javascript\nnavigator.serviceWorker.controller.postMessage({ type: \'REPAIR_CACHE\' });\n```' },
    { cat: '🌐 Offline y SW', q: '¿Cada cuánto se verifica la integridad del caché?', a: 'El Service Worker verifica la integridad cada 15 minutos automáticamente. Si detecta que faltan assets, los re-descarga en background.' },
    { cat: '🌐 Offline y SW', q: '¿Qué pasa si el caché está corrupto al 50%?', a: 'Si la integridad baja del 80% (umbral configurable), el Service Worker considera el caché "corrupto" y re-descarga TODOS los assets críticos, no solo los que faltan.' },
    { cat: '🌐 Offline y SW', q: '¿Cómo sé si el Service Worker está funcionando?', a: 'Abre DevTools (F12) → Application → Service Workers. Debes ver `sw.js` con estado "activated and is running". En la consola verás: `📦 SW Panario v2.2.1 cargado correctamente`.' },
    { cat: '🌐 Offline y SW', q: '¿Qué hago si el Service Worker no se actualiza?', a: 'Ve a Application → Service Workers → marca "Update on reload" y recarga. O ejecuta en consola:\n```javascript\nnavigator.serviceWorker.getRegistration().then(r => r.update());\n```' },
    { cat: '🌐 Offline y SW', q: '¿La app funciona si nunca he abierto el caché?', a: 'No. La PWA necesita una primera apertura con conexión para cachear los assets. Después de eso, funciona offline.' },
    { cat: '🌐 Offline y SW', q: '¿Qué es la página "Sin conexión" de Panario?', a: 'Es una pantalla que se muestra cuando el Service Worker no puede servir la app desde caché ni desde red. Desde ahí puedes reintentar la conexión, limpiar el caché, o esperar a que el auto-retry detecte la reconexión.' },
    { cat: '🌐 Offline y SW', q: '¿Qué significa el indicador de conexión (punto rojo/verde)?', a: '🟢 **Verde:** Hay conexión al servidor.\n🔴 **Rojo parpadeante:** No hay conexión (o el servidor no responde).' },
    { cat: '🌐 Offline y SW', q: '¿Qué hace el botón "Reintentar conexión"?', a: 'Verifica si `navigator.onLine` es true y si el servidor responde (con un HEAD request). Si ambos son OK, recarga la app automáticamente.' },
    { cat: '🌐 Offline y SW', q: '¿Qué hace el botón "Limpiar caché y recargar"?', a: 'Desregistra todos los Service Workers, elimina todas las cachés, y recarga la página con un parámetro anti-caché. Útil si la app muestra datos obsoletos o no carga correctamente.' },
    { cat: '🌐 Offline y SW', q: '¿Qué es el auto-retry?', a: 'Es un mecanismo que reintenta la conexión automáticamente cada 5 segundos (máximo 12 intentos = 1 minuto). Si detecta reconexión, recarga la app sola.' },
    { cat: '🌐 Offline y SW', q: '¿Qué atajos de teclado hay en la página offline?', a: '• **R:** Reintentar conexión.\n• **Esc:** Ir al inicio (index.html).' },
    { cat: '🌐 Offline y SW', q: '¿La página offline funciona en modo oscuro?', a: 'Sí. Detecta la preferencia del sistema con `prefers-color-scheme: dark` y adapta los colores.' }
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
            faqHtml += `
                <div class="faq-category" data-category="${currentCat}" style="margin-top: 14px; margin-bottom: 8px; font-size: 13px; font-weight: 700; color: var(--primary); padding: 6px 10px; background: var(--primary-light); border-radius: 6px; border-left: 3px solid var(--primary);">
                    ${currentCat}
                </div>
            `;
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
                <div class="faq-content" style="display: none; margin-top: 8px; font-size: 13px; color: var(--text-light); padding-top: 8px; padding-left: 36px; border-top: 1px solid var(--border-color); line-height: 1.6; white-space: pre-line;">
                    ${f.a}
                </div>
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
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #3b82f6;">Preguntas Frecuentes</h2>
                        <p style="margin: 2px 0 0 0; font-size: 11px; color: var(--text-light);">${totalFaqs} preguntas numeradas</p>
                    </div>
                </div>
                <button onclick="closeFAQModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="margin-bottom: 12px; position: relative;">
                <input type="text" id="faq-search-input" placeholder="🔍 Buscar por número o texto..." oninput="filtrarFAQs(this.value)" style="width: 100%; padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 14px; background: var(--bg-input); color: var(--text); outline: none;">
                <div id="faq-search-count" style="font-size: 11px; color: var(--text-light); margin-top: 4px; display: none;"></div>
            </div>
            
            <p style="font-size: 12px; color: var(--text-light); margin-bottom: 12px;">
                📚 Haz clic en cada pregunta para ver la respuesta.
            </p>
            
            <div id="faq-list" style="display: flex; flex-direction: column; gap: 4px;">
                ${faqHtml}
            </div>
            
            <div id="faq-empty-message" style="display: none; text-align: center; padding: 40px 20px; color: var(--text-light);">
                <span style="font-size: 48px;">🔍</span>
                <p style="margin-top: 12px;">No se encontraron preguntas que coincidan</p>
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

    modal.addEventListener('click', function(e) {
        if (e.target === this) closeFAQModal();
    });

    setTimeout(() => {
        document.getElementById('faq-search-input')?.focus();
    }, 100);
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
                if (prev.classList.contains('faq-category')) {
                    visibleCategories.add(prev.dataset.category);
                    break;
                }
                prev = prev.previousElementSibling;
            }
        } else {
            item.style.display = 'none';
        }
    });
    
    categories.forEach(cat => {
        cat.style.display = visibleCategories.has(cat.dataset.category) ? '' : 'none';
    });
    
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
    
    if (emptyMsg) {
        emptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';
    }
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
// EXPORTACIÓN
// ============================================================

window.HelpModule = {
    showHelpMenu,
    mostrarPopoverAyuda,
    cerrarPopoverAyuda,
    showReadmeModal,
    showCreditsModal,
    startTour: startTour,
    tourNext: tourNext,
    tourPrev: tourPrev,
    tourSkip: tourSkip,
    tourComplete: tourComplete,
    showContextualHelp: showContextualHelp,
    showQuickStartGuide: showQuickStartGuide,
    showFAQModal: showFAQModal,
    initHelpButton: initHelpButton,
    toggleFAQ: toggleFAQ,
    filtrarFAQs: filtrarFAQs,
    abrirAyudaDetallada: abrirAyudaDetallada,
    abrirAyudaEnModal: abrirAyudaEnModal,
    cerrarAyudaModal: cerrarAyudaModal,
    imprimirAyudaIframe: imprimirAyudaIframe,
    forzarModalAlFrente: forzarModalAlFrente,
    ofrecerFallbackPestanaNueva: ofrecerFallbackPestanaNueva,
    isMobileDevice: isMobileDevice,
    FAQS_DB: FAQS_DB,
    DEV_AVATAR_PATH: DEV_AVATAR_PATH,
    _bloquearAppMientrasAyuda: _bloquearAppMientrasAyuda,
    _restaurarAppTrasAyuda: _restaurarAppTrasAyuda
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

console.log('📦 Help Module cargado correctamente v2.2.4 (FAQs ampliadas a 315)');
console.log('📚 FAQs cargadas:', FAQS_DB.length);
console.log('🆕 v2.2.4:');
console.log('   ✅ Total FAQs: 315 (antes 203)');
console.log('   ✅ Nuevas categorías: Bloqueo por recetas, Excluir días, Bloque del día anterior, Producción por rango, Correcciones finales, Reportes, Auditoría, PWA y pantalla completa, Offline y SW');
console.log('   ✅ Duplicados eliminados y consolidados');
console.log('   ✅ El buscador de FAQs filtra por número o texto');