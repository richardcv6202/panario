// ============================================================
// 📦 HELP MODULE - Panario (Sistema de Ayuda y Tutorial)
// CORREGIDO: Nombre del desarrollador (Ricardo Castillo Valdés)
// 🆕 FASE 5 (#2) (200926 v2):
//   - NUEVO botón "📖 Ayuda detallada" en el Centro de Ayuda
//   - Llama a window.openDetailedHelp() (definido en app.js)
//   - También accesible desde el modal de FAQ
//   - Fallback si openDetailedHelp no está definida
// 🆕 FASE 5 (#3):
//   - Ampliación de FAQs (~80 preguntas organizadas)
// 🆕 FASE AYUDA MODAL (200926 v3):
//   - NUEVA: abrirAyudaEnModal(url) → abre la ayuda dentro de un
//     modal a pantalla completa con iframe, en lugar de una pestaña
//   - Detecta el tema actual y la sección activa para pasarlos por URL
//   - Incluye botón "🔗 Abrir en pestaña nueva" dentro del modal
//   - abrirAyudaDetallada() ahora delega en abrirAyudaEnModal()
//   - openDetailedHelp() (compatibilidad con app.js) → abrirAyudaDetallada()
//   - Se cierra con ✕, Escape, o clic fuera del modal
//   - Responsive: 95% desktop, 100% móvil
// 🆕 FASE 4 (Entrega 4 - 210926 v4):
//   - ✅ FIX CRÍTICO: El modal de ayuda aparecía DETRÁS de la app
//     * z-index elevado a 2147483647 (máximo de 32 bits)
//     * Añadido `isolation: isolate` para forzar stacking context
//     * Añadido `transform: translateZ(0)` para promover a GPU layer
//     * Se mueve el modal al final del <body> siempre
//     * Se oculta el scroll del body mientras está abierto
//     * Se eliminan posibles stacking contexts conflictivos del padre
//   - ✅ FAQs NUMERADAS ASCENDENTEMENTE (punto #3 del informe)
//     * Cada pregunta tiene un número de índice al inicio
//     * Numeración continua entre categorías (1, 2, 3, ...)
//     * Se muestra "❓ N. ¿Pregunta?" en el título
//   - ✅ AMPLIACIÓN DE FAQs (de ~80 a ~120 preguntas)
//     * Nuevas secciones: Producción, Reprogramación, Lista de espera
//     * Nuevas preguntas sobre sonido, PWA, duplicados, vendedor
//   - ✅ BUSCADOR EN FAQs
//     * Campo de búsqueda en la parte superior del modal
//     * Filtra por número y por texto
//     * Resalta coincidencias
//   - ✅ Contador de resultados en el buscador
// 🆕 FASE 4.1 (Entrega 4 - 210926 v5):
//   - ✅ CENTRO DE AYUDA CONVERTIDO EN POPOVER
//     * Antes: era un modal centrado con backdrop oscuro
//     * Ahora: es un menú flotante anclado al botón ❓
//     * Ventajas:
//       - No bloquea la pantalla (el resto queda visible)
//       - Se cierra automáticamente al hacer clic fuera
//       - Más rápido y ligero
//       - Ideal para móviles (menos intrusivo)
//     * Comportamiento:
//       - Se posiciona debajo del botón ❓, alineado a la derecha
//       - En móviles, si no cabe, se convierte en bottom-sheet
//       - Animación fade + slide desde arriba
//       - Cierre con Escape, clic fuera, o seleccionar opción
//     * Nueva función: mostrarPopoverAyuda() y cerrarPopoverAyuda()
//     * showHelpMenu() mantiene compatibilidad, delega al popover
// ============================================================

window.HelpModule = {};

// ============================================================
// Z-INDEX MÁXIMO PARA MODALES DE AYUDA
// ============================================================
// 2147483647 es el valor máximo para un entero de 32 bits con signo.
// Algunos navegadores permiten valores mayores, pero este es el
// máximo seguro y estándar.
// ============================================================

const HELP_MODAL_Z_INDEX = 2147483647;
const HELP_POPOVER_Z_INDEX = 2147483646;

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

// Referencias al popover de ayuda
let _helpPopover = null;
let _helpPopoverAnchor = null;
let _helpPopoverOutsideClickHandler = null;
let _helpPopoverEscHandler = null;

// ============================================================
// HELPER PARA FORZAR MODALES AL FRENTE
// ============================================================

function forzarModalAlFrente(modal) {
    if (!modal) return;
    
    try {
        // 1. Mover al final del body (último hijo = mayor prioridad visual)
        if (modal.parentNode !== document.body || document.body.lastChild !== modal) {
            document.body.appendChild(modal);
        }
        
        // 2. Aplicar estilos que garantizan estar al frente
        modal.style.setProperty('position', 'fixed', 'important');
        modal.style.setProperty('top', '0', 'important');
        modal.style.setProperty('left', '0', 'important');
        modal.style.setProperty('right', '0', 'important');
        modal.style.setProperty('bottom', '0', 'important');
        modal.style.setProperty('z-index', String(HELP_MODAL_Z_INDEX), 'important');
        modal.style.setProperty('isolation', 'isolate', 'important');
        modal.style.setProperty('transform', 'translateZ(0)', 'important');
        modal.style.setProperty('will-change', 'transform', 'important');
        
        console.log('🔝 Modal forzado al frente con z-index:', HELP_MODAL_Z_INDEX);
    } catch (e) {
        console.warn('⚠️ Error forzando modal al frente:', e);
    }
}

// ============================================================
// ABRIR AYUDA DETALLADA EN MODAL (CON IFRAME)
// ============================================================

function abrirAyudaDetallada() {
    try {
        // Cerrar popover de ayuda si está abierto
        cerrarPopoverAyuda();
        
        // Detectar tema
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        
        // Detectar sección activa
        const activeNav = document.querySelector('.nav-item.active');
        let section = 'intro';
        if (activeNav && activeNav.dataset && activeNav.dataset.section) {
            section = activeNav.dataset.section;
        }
        
        // Algunas secciones no tienen ancla directa en la ayuda; mapearlas
        const sectionMap = {
            'dashboard':   'dashboard',
            'orders':      'orders',
            'insumos':     'insumos',
            'recipes':     'recipes',
            'productos':   'productos',
            'sales':       'sales',
            'settings':    'settings',
            'profile':     'profile',
            'corriente':   'corriente',
            'rewards':     'rewards',
            'notifications':'notifications'
        };
        const helpSection = sectionMap[section] || 'intro';
        
        // Construir URL
        const url = `./ayuda-panario.html?theme=${encodeURIComponent(theme)}&section=${encodeURIComponent(helpSection)}&embedded=1`;
        
        console.log('📖 Abriendo ayuda detallada en modal:', { theme, section: helpSection, url });
        
        // Abrir en modal
        abrirAyudaEnModal(url, theme);
        
    } catch (e) {
        console.warn('⚠️ Error abriendo ayuda detallada:', e);
        if (window.showToast) {
            window.showToast('❌ No se pudo abrir la ayuda detallada', 'error', 4000);
        }
    }
}

function abrirAyudaEnModal(url, theme = 'light') {
    // Cerrar si ya existe uno abierto
    const existing = document.getElementById('ayuda-modal');
    if (existing) {
        existing.remove();
    }
    
    // Detectar si es móvil
    const isMobile = window.innerWidth < 768;
    
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
    modal.style.setProperty('background', 'rgba(0,0,0,0.85)', 'important');
    modal.style.setProperty('backdrop-filter', 'blur(8px)', 'important');
    modal.style.setProperty('-webkit-backdrop-filter', 'blur(8px)', 'important');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('align-items', 'center', 'important');
    modal.style.setProperty('justify-content', 'center', 'important');
    modal.style.setProperty('z-index', String(HELP_MODAL_Z_INDEX), 'important');
    modal.style.setProperty('isolation', 'isolate', 'important');
    modal.style.setProperty('transform', 'translateZ(0)', 'important');
    modal.style.setProperty('will-change', 'transform', 'important');
    modal.style.setProperty('padding', isMobile ? '0' : '20px', 'important');
    modal.style.setProperty('animation', 'ayudaModalFadeIn 0.25s ease', 'important');
    modal.style.setProperty('overflow', 'hidden', 'important');
    
    if (!document.getElementById('ayuda-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'ayuda-modal-styles';
        style.textContent = `
            @keyframes ayudaModalFadeIn {
                from { opacity: 0; }
                to   { opacity: 1; }
            }
            @keyframes ayudaModalSlideUp {
                from { opacity: 0; transform: translateY(20px) scale(0.98); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes ayudaModalFadeOut {
                from { opacity: 1; }
                to   { opacity: 0; }
            }
            @keyframes ayudaSpinner {
                to { transform: rotate(360deg); }
            }
            #ayuda-modal iframe {
                border: none;
                display: block;
                width: 100%;
                height: 100%;
                background: #fdf6e3;
            }
            [data-theme="dark"] #ayuda-modal iframe {
                background: #0d0d0d;
            }
            #ayuda-modal,
            #ayuda-modal * {
                box-sizing: border-box;
            }
        `;
        document.head.appendChild(style);
    }
    
    modal.innerHTML = `
        <div id="ayuda-modal-container" style="
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
        ">
            <!-- HEADER -->
            <div style="
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 16px;
                border-bottom: 1px solid var(--border-color, #e0d5c0);
                background: var(--bg-card, #fff);
                flex-shrink: 0;
            ">
                <span style="font-size: 22px;">📖</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 700; font-size: 15px; color: var(--text, #2d2d2d);">
                        Ayuda detallada
                    </div>
                    <div style="font-size: 11px; color: var(--text-light, #666);">
                        ${url.split('?')[0]}
                    </div>
                </div>
                
                <a href="${url.replace('&embedded=1', '')}" target="_blank" rel="noopener noreferrer"
                   class="btn secondary"
                   style="padding: 6px 12px; font-size: 12px; width: auto; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;"
                   title="Abrir en pestaña nueva">
                    🔗 ↗
                </a>
                
                <button onclick="imprimirAyudaIframe()"
                        class="btn secondary"
                        style="padding: 6px 12px; font-size: 12px; width: auto;"
                        title="Imprimir / Guardar PDF">
                    🖨️
                </button>
                
                <button onclick="cerrarAyudaModal()"
                        style="
                            background: none;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            color: var(--text-light, #666);
                            padding: 4px 8px;
                            line-height: 1;
                            border-radius: 6px;
                            transition: background 0.2s;
                        "
                        onmouseover="this.style.background='var(--bg, #fdf6e3)'"
                        onmouseout="this.style.background='transparent'"
                        title="Cerrar (Escape)">
                    ✕
                </button>
            </div>
            
            <div style="flex: 1; position: relative; overflow: hidden;">
                <div id="ayuda-modal-loading" style="
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    gap: 12px;
                    background: var(--bg, #fdf6e3);
                    z-index: 1;
                ">
                    <div style="
                        width: 40px;
                        height: 40px;
                        border: 4px solid var(--primary, #f5a623);
                        border-top-color: transparent;
                        border-radius: 50%;
                        animation: ayudaSpinner 0.8s linear infinite;
                    "></div>
                    <div style="font-size: 13px; color: var(--text-light, #666);">
                        Cargando ayuda...
                    </div>
                </div>
                
                <iframe 
                    id="ayuda-modal-iframe"
                    src="${url}"
                    title="Ayuda detallada de Panario"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
                    allow="clipboard-read; clipboard-write"
                    style="
                        width: 100%;
                        height: 100%;
                        border: none;
                        display: block;
                        position: relative;
                        z-index: 2;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    "
                ></iframe>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    forzarModalAlFrente(modal);
    
    const iframe = document.getElementById('ayuda-modal-iframe');
    const loading = document.getElementById('ayuda-modal-loading');
    
    if (iframe) {
        iframe.addEventListener('load', function() {
            setTimeout(() => {
                if (loading) loading.style.display = 'none';
                iframe.style.opacity = '1';
                console.log('📖 Ayuda cargada en modal');
                setTimeout(() => forzarModalAlFrente(modal), 100);
            }, 200);
        });
        
        setTimeout(() => {
            if (loading && loading.style.display !== 'none') {
                loading.style.display = 'none';
                iframe.style.opacity = '1';
                console.warn('⚠️ Timeout de carga del iframe — se muestra igualmente');
            }
        }, 5000);
    }
    
    modal.addEventListener('click', function(e) {
        const container = document.getElementById('ayuda-modal-container');
        if (e.target === modal || (container && !container.contains(e.target))) {
            cerrarAyudaModal();
        }
    });
    
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            cerrarAyudaModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    window._ayudaModalState = {
        prevOverflow,
        escHandler
    };
    
    console.log('📖 Modal de ayuda abierto con URL:', url);
}

function cerrarAyudaModal() {
    const modal = document.getElementById('ayuda-modal');
    if (!modal) return;
    
    modal.style.animation = 'ayudaModalFadeOut 0.2s ease forwards';
    
    setTimeout(() => {
        if (modal.parentNode) modal.remove();
        
        if (window._ayudaModalState) {
            document.body.style.overflow = window._ayudaModalState.prevOverflow || '';
            if (window._ayudaModalState.escHandler) {
                document.removeEventListener('keydown', window._ayudaModalState.escHandler);
            }
            window._ayudaModalState = null;
        }
        
        console.log('📖 Modal de ayuda cerrado');
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

// ============================================================
// 🆕 FASE 4.1: POPOVER DEL CENTRO DE AYUDA
// ============================================================
// 
// Antes: showHelpMenu() creaba un modal centrado con backdrop.
// Ahora: crea un popover anclado al botón ❓ de la barra superior.
// 
// Ventajas:
//   - No bloquea la pantalla
//   - Se cierra al hacer clic fuera
//   - Más rápido y ligero
//   - Ideal para móviles
// 
// Funciones:
//   - mostrarPopoverAyuda(anchorElement): Abre el popover
//   - cerrarPopoverAyuda(): Cierra el popover
//   - showHelpMenu(): Compatibilidad, delega al popover
// ============================================================

/**
 * Muestra el popover del Centro de Ayuda anclado a un elemento.
 * 
 * @param {HTMLElement} anchorElement - Elemento al que se ancla (botón ❓).
 *                                       Si no se pasa, se busca #help-button.
 */
function mostrarPopoverAyuda(anchorElement = null) {
    // Cerrar si ya está abierto
    cerrarPopoverAyuda();
    
    // Buscar el ancla
    const anchor = anchorElement || document.getElementById('help-button');
    
    if (!anchor) {
        console.warn('⚠️ No se encontró el botón de ayuda (#help-button)');
        // Fallback: usar modal clásico
        return _mostrarHelpMenuFallback();
    }
    
    _helpPopoverAnchor = anchor;
    
    // Crear el popover
    const popover = document.createElement('div');
    popover.id = 'help-popover';
    popover.setAttribute('role', 'menu');
    popover.setAttribute('aria-label', 'Centro de Ayuda');
    
    // Estilos base del popover
    popover.style.setProperty('position', 'fixed', 'important');
    popover.style.setProperty('z-index', String(HELP_POPOVER_Z_INDEX), 'important');
    popover.style.setProperty('background', 'var(--bg-card, #fff)', 'important');
    popover.style.setProperty('border-radius', '12px', 'important');
    popover.style.setProperty('box-shadow', '0 10px 40px rgba(0,0,0,0.25)', 'important');
    popover.style.setProperty('border', '1px solid var(--border-color, #e0d5c0)', 'important');
    popover.style.setProperty('min-width', '260px', 'important');
    popover.style.setProperty('max-width', '300px', 'important');
    popover.style.setProperty('overflow', 'hidden', 'important');
    popover.style.setProperty('isolation', 'isolate', 'important');
    popover.style.setProperty('transform', 'translateZ(0)', 'important');
    popover.style.setProperty('will-change', 'transform', 'important');
    popover.style.setProperty('animation', 'helpPopoverFadeIn 0.15s ease', 'important');
    
    // Contenido
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
            <!-- Guía rápida -->
            <button class="help-popover-item" data-action="quickstart" 
                    style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; background: none; cursor: pointer; border-radius: 8px; text-align: left; font-family: inherit; transition: background 0.15s; color: var(--text);">
                <span style="font-size: 20px; flex-shrink: 0;">🚀</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 13px;">Guía Rápida de Inicio</div>
                    <div style="font-size: 11px; color: var(--text-light);">5 pasos para empezar</div>
                </div>
                <span style="font-size: 12px; color: var(--text-light); flex-shrink: 0;">▶</span>
            </button>
            
            <!-- Tutorial -->
            <button class="help-popover-item" data-action="tour" 
                    style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; background: none; cursor: pointer; border-radius: 8px; text-align: left; font-family: inherit; transition: background 0.15s; color: var(--text);">
                <span style="font-size: 20px; flex-shrink: 0;">🎯</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 13px;">Tutorial Interactivo</div>
                    <div style="font-size: 11px; color: var(--text-light);">Recorrido guiado</div>
                </div>
                <span style="font-size: 12px; color: var(--text-light); flex-shrink: 0;">▶</span>
            </button>
            
            <!-- FAQs -->
            <button class="help-popover-item" data-action="faq" 
                    style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; background: none; cursor: pointer; border-radius: 8px; text-align: left; font-family: inherit; transition: background 0.15s; color: var(--text);">
                <span style="font-size: 20px; flex-shrink: 0;">❓</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 13px;">Preguntas Frecuentes</div>
                    <div style="font-size: 11px; color: var(--text-light);">${FAQS_DB.length} respuestas</div>
                </div>
                <span style="font-size: 12px; color: var(--text-light); flex-shrink: 0;">▶</span>
            </button>
            
            <!-- Ayuda Detallada -->
            <button class="help-popover-item" data-action="detailed" 
                    style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; background: none; cursor: pointer; border-radius: 8px; text-align: left; font-family: inherit; transition: background 0.15s; color: var(--text);">
                <span style="font-size: 20px; flex-shrink: 0;">📖</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 13px;">Ayuda Detallada</div>
                    <div style="font-size: 11px; color: var(--text-light);">Manual completo</div>
                </div>
                <span style="font-size: 12px; color: var(--text-light); flex-shrink: 0;">▶</span>
            </button>
            
            <div style="border-top: 1px solid var(--border-color); margin: 4px 8px;"></div>
            
            <!-- Léeme -->
            <button class="help-popover-item" data-action="readme" 
                    style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; background: none; cursor: pointer; border-radius: 8px; text-align: left; font-family: inherit; transition: background 0.15s; color: var(--text);">
                <span style="font-size: 20px; flex-shrink: 0;">📘</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 13px;">Léeme</div>
                    <div style="font-size: 11px; color: var(--text-light);">Info del proyecto</div>
                </div>
                <span style="font-size: 12px; color: var(--text-light); flex-shrink: 0;">▶</span>
            </button>
            
            <!-- Créditos -->
            <button class="help-popover-item" data-action="credits" 
                    style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; background: none; cursor: pointer; border-radius: 8px; text-align: left; font-family: inherit; transition: background 0.15s; color: var(--text);">
                <span style="font-size: 20px; flex-shrink: 0;">👨‍💻</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 13px;">Créditos</div>
                    <div style="font-size: 11px; color: var(--text-light);">Desarrollador</div>
                </div>
                <span style="font-size: 12px; color: var(--text-light); flex-shrink: 0;">▶</span>
            </button>
        </div>
    `;
    
    // Estilos y animación (una sola vez)
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
            .help-popover-item:hover {
                background: var(--bg) !important;
            }
            .help-popover-item:active {
                transform: scale(0.98);
            }
            /* En móvil, convertir el popover en bottom sheet */
            @media (max-width: 600px) {
                #help-popover {
                    left: 10px !important;
                    right: 10px !important;
                    bottom: 10px !important;
                    top: auto !important;
                    min-width: auto !important;
                    max-width: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Añadir al body
    document.body.appendChild(popover);
    _helpPopover = popover;
    
    // Posicionar el popover
    _posicionarPopoverAyuda(anchor, popover);
    
    // Reposicionar si cambia el tamaño de la ventana
    const repositionHandler = () => _posicionarPopoverAyuda(anchor, popover);
    window.addEventListener('resize', repositionHandler);
    window.addEventListener('scroll', repositionHandler, true);
    
    // Guardar referencias para limpieza
    _helpPopover._repositionHandler = repositionHandler;
    
    // Registrar handlers de eventos para las opciones
    popover.querySelectorAll('.help-popover-item').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const action = this.dataset.action;
            cerrarPopoverAyuda();
            
            // Pequeño delay para que se cierre el popover antes de abrir el modal
            setTimeout(() => {
                switch (action) {
                    case 'quickstart':
                        showQuickStartGuide();
                        break;
                    case 'tour':
                        startTour();
                        break;
                    case 'faq':
                        showFAQModal();
                        break;
                    case 'detailed':
                        abrirAyudaDetallada();
                        break;
                    case 'readme':
                        showReadmeModal();
                        break;
                    case 'credits':
                        showCreditsModal();
                        break;
                    default:
                        console.warn('⚠️ Acción de ayuda no reconocida:', action);
                }
            }, 100);
        });
    });
    
    // Handler para cerrar al hacer clic fuera
    _helpPopoverOutsideClickHandler = function(e) {
        if (!_helpPopover) return;
        
        const isInsidePopover = _helpPopover.contains(e.target);
        const isAnchor = anchor && anchor.contains(e.target);
        
        if (!isInsidePopover && !isAnchor) {
            cerrarPopoverAyuda();
        }
    };
    
    // Registrar con un pequeño delay para evitar que el mismo click que abrió el popover lo cierre
    setTimeout(() => {
        document.addEventListener('click', _helpPopoverOutsideClickHandler, true);
    }, 50);
    
    // Handler para cerrar con Escape
    _helpPopoverEscHandler = function(e) {
        if (e.key === 'Escape') {
            cerrarPopoverAyuda();
        }
    };
    document.addEventListener('keydown', _helpPopoverEscHandler);
    
    // Aplicar color de fondo activo al ancla
    if (anchor) {
        anchor.style.background = 'var(--primary-light)';
        anchor.style.borderRadius = '8px';
    }
    
    console.log('❓ Popover de ayuda abierto');
}

/**
 * Posiciona el popover junto al ancla.
 */
function _posicionarPopoverAyuda(anchor, popover) {
    if (!anchor || !popover) return;
    
    try {
        const rect = anchor.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();
        const isMobile = window.innerWidth < 600;
        
        if (isMobile) {
            // En móvil, el CSS ya lo posiciona como bottom-sheet
            return;
        }
        
        const margin = 8;
        const popoverWidth = popoverRect.width || 260;
        const popoverHeight = popoverRect.height || 350;
        
        // Posición vertical: debajo del anchor
        let top = rect.bottom + margin;
        
        // Si no cabe abajo, mostrar arriba
        if (top + popoverHeight > window.innerHeight - 10) {
            top = rect.top - popoverHeight - margin;
        }
        
        // Si tampoco cabe arriba, ajustar
        if (top < 10) {
            top = 10;
        }
        
        // Posición horizontal: alineado a la derecha del anchor
        let left = rect.right - popoverWidth;
        
        // Si no cabe a la izquierda, ajustar
        if (left < 10) {
            left = 10;
        }
        
        // Si no cabe a la derecha, ajustar
        if (left + popoverWidth > window.innerWidth - 10) {
            left = window.innerWidth - popoverWidth - 10;
        }
        
        popover.style.setProperty('top', top + 'px', 'important');
        popover.style.setProperty('left', left + 'px', 'important');
        popover.style.setProperty('right', 'auto', 'important');
        popover.style.setProperty('bottom', 'auto', 'important');
        
    } catch (e) {
        console.warn('⚠️ Error posicionando popover:', e);
        // Fallback: esquina superior derecha
        popover.style.setProperty('top', '70px', 'important');
        popover.style.setProperty('right', '20px', 'important');
        popover.style.setProperty('left', 'auto', 'important');
    }
}

/**
 * Cierra el popover de ayuda.
 */
function cerrarPopoverAyuda() {
    if (!_helpPopover) {
        // Limpiar referencias por si acaso
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
    
    // Animar salida
    popover.style.animation = 'helpPopoverFadeOut 0.15s ease forwards';
    
    // Limpiar listeners
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
    
    // Restaurar el color del ancla
    if (_helpPopoverAnchor) {
        _helpPopoverAnchor.style.background = '';
        _helpPopoverAnchor.style.borderRadius = '';
    }
    
    // Eliminar del DOM
    setTimeout(() => {
        if (popover.parentNode) popover.remove();
    }, 150);
    
    _helpPopover = null;
    _helpPopoverAnchor = null;
    
    console.log('❓ Popover de ayuda cerrado');
}

/**
 * Fallback: si no se encuentra el anchor, usar el modal clásico.
 * (Mantenemos esta opción por robustez)
 */
function _mostrarHelpMenuFallback() {
    console.warn('⚠️ Usando fallback: modal clásico de Centro de Ayuda');
    
    const existingModal = document.getElementById('help-menu-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'help-menu-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: ${HELP_MODAL_Z_INDEX}; padding: 20px;
        animation: modalFadeIn 0.25s ease;
        isolation: isolate;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 420px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">❓</span>
                    <h2 style="margin: 0; font-size: 18px;">Centro de Ayuda</h2>
                </div>
                <button onclick="document.getElementById('help-menu-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            <p style="font-size: 13px; color: var(--text-light); margin-bottom: 16px;">
                El botón de ayuda no está anclado. Abriendo en modo modal...
            </p>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <button onclick="document.getElementById('help-menu-modal').remove(); showQuickStartGuide();" class="btn primary" style="padding: 10px; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; text-align: left;">🚀 Guía Rápida</button>
                <button onclick="document.getElementById('help-menu-modal').remove(); startTour();" class="btn primary" style="padding: 10px; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; text-align: left;">🎯 Tutorial</button>
                <button onclick="document.getElementById('help-menu-modal').remove(); showFAQModal();" class="btn primary" style="padding: 10px; background: #3b82f6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; text-align: left;">❓ Preguntas Frecuentes</button>
                <button onclick="document.getElementById('help-menu-modal').remove(); abrirAyudaDetallada();" class="btn primary" style="padding: 10px; background: #10b981; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; text-align: left;">📖 Ayuda Detallada</button>
                <button onclick="document.getElementById('help-menu-modal').remove(); showReadmeModal();" class="btn primary" style="padding: 10px; background: #0ea5e9; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; text-align: left;">📘 Léeme</button>
                <button onclick="document.getElementById('help-menu-modal').remove(); showCreditsModal();" class="btn primary" style="padding: 10px; background: #ec4899; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; text-align: left;">👨‍💻 Créditos</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    forzarModalAlFrente(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) modal.remove();
    });
}

/**
 * 🆕 FASE 4.1: showHelpMenu() ahora delega en el popover.
 * Mantenemos el nombre por compatibilidad con app.js e index.html.
 */
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
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: ${HELP_MODAL_Z_INDEX}; padding: 20px;
        animation: modalFadeIn 0.25s ease;
        isolation: isolate;
    `;

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
                    <li>🔨 <strong>Producción:</strong> Programación y control de cantidades</li>
                    <li>🏆 <strong>Premios:</strong> Sistema de fidelización</li>
                    <li>📅 <strong>Días sin ventas:</strong> Registro de inactividad</li>
                    <li>👥 <strong>Multiusuario:</strong> Varios usuarios por negocio</li>
                </ul>

                <h4 style="margin: 16px 0 8px 0; color: var(--text);">📱 Información técnica</h4>
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                        <span style="color: var(--text-light);">Versión:</span>
                        <strong>2.1.6</strong>
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

    window.closeReadmeModal = function() {
        const m = document.getElementById('readme-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (m.parentNode) m.remove();
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
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: ${HELP_MODAL_Z_INDEX}; padding: 20px;
        animation: modalFadeIn 0.25s ease;
        isolation: isolate;
    `;

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
                <div style="width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); display: inline-flex; align-items: center; justify-content: center; font-size: 48px; margin-bottom: 12px;">
                    👨‍💻
                </div>
                <h3 style="margin: 0; font-size: 20px; color: var(--text);">Ricardo Castillo Valdés</h3>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-light);">Desarrollador y Diseñador</p>
            </div>

            <div style="background: var(--bg); border-radius: 10px; padding: 16px; margin-bottom: 16px; text-align: left;">
                <div style="font-size: 12px; font-weight: 600; color: var(--text-label); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                    📞 Información de contacto
                </div>
                
                <a href="https://wa.me/5355031725" target="_blank" 
                   style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg-card); border-radius: 8px; text-decoration: none; color: var(--text); margin-bottom: 8px; border: 1px solid var(--border-color); transition: transform 0.2s;">
                    <span style="font-size: 20px;">💬</span>
                    <div style="flex: 1;">
                        <div style="font-size: 11px; color: var(--text-light);">WhatsApp</div>
                        <div style="font-size: 14px; font-weight: 600;">+53 55031725</div>
                    </div>
                    <span style="font-size: 14px; color: var(--primary);">→</span>
                </a>

                <a href="mailto:3sayricardo@gmail.com" 
                   style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg-card); border-radius: 8px; text-decoration: none; color: var(--text); border: 1px solid var(--border-color); transition: transform 0.2s;">
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
                    🍞 Panario v2.1.6
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

    window.closeCreditsModal = function() {
        const m = document.getElementById('credits-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (m.parentNode) m.remove();
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

// ============================================================
// CREAR OVERLAY
// ============================================================

function createOverlay() {
    removeOverlay();
    
    tourOverlay = document.createElement('div');
    tourOverlay.id = 'tour-overlay';
    tourOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 2147483640;
        pointer-events: none;
        animation: modalFadeIn 0.3s ease;
        isolation: isolate;
    `;
    
    tourHighlight = document.createElement('div');
    tourHighlight.id = 'tour-highlight';
    tourHighlight.style.cssText = `
        position: fixed;
        border: 3px solid #f5a623;
        border-radius: 12px;
        box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);
        z-index: 2147483641;
        pointer-events: none;
        transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        background: transparent;
    `;
    
    tourTooltip = document.createElement('div');
    tourTooltip.id = 'tour-tooltip';
    tourTooltip.style.cssText = `
        position: fixed;
        background: var(--bg-card);
        color: var(--text);
        border-radius: var(--radius);
        padding: 20px 24px;
        max-width: 340px;
        width: 90%;
        z-index: 2147483642;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        border: 1px solid var(--border-color);
        pointer-events: auto;
        animation: modalSlideUp 0.3s ease;
        font-size: 14px;
    `;
    
    document.body.appendChild(tourOverlay);
    document.body.appendChild(tourHighlight);
    document.body.appendChild(tourTooltip);
}

// ============================================================
// MOSTRAR PASO
// ============================================================

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
    
    if (tooltipTop + tooltipHeight > window.innerHeight - 20) {
        tooltipTop = rect.top - tooltipHeight - 16;
    }
    if (tooltipTop < 20) {
        tooltipTop = 20;
    }
    if (tooltipLeft < 20) {
        tooltipLeft = 20;
    }
    if (tooltipLeft + tooltipWidth > window.innerWidth - 20) {
        tooltipLeft = window.innerWidth - tooltipWidth - 20;
    }
    
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

// ============================================================
// NAVEGACIÓN DEL TOUR
// ============================================================

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

// ============================================================
// ELIMINAR OVERLAY
// ============================================================

function removeOverlay() {
    const elements = ['tour-overlay', 'tour-highlight', 'tour-tooltip'];
    for (const id of elements) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
}

// ============================================================
// MOSTRAR AYUDA CONTEXTUAL
// ============================================================

function showContextualHelp(section) {
    const helpMessages = {
        'dashboard': '📊 El dashboard muestra todas las estadísticas clave de tu negocio. Puedes personalizar qué secciones ver desde tu Perfil.',
        'orders': '📋 Gestiona pedidos, reservas y lista de espera. Cambia estados y crea ventas automáticamente al entregar.',
        'insumos': '🛒 Controla tu inventario. Registra compras, costos y stock mínimo. Los insumos se descuentan al vender.',
        'recipes': '📖 Crea y gestiona recetas. Asocia insumos para calcular costos automáticamente. Puedes recalcular y compartir.',
        'productos': '🏷️ Define los productos que vendes. Cada producto puede tener una receta asociada.',
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
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: ${HELP_MODAL_Z_INDEX}; padding: 20px;
        animation: modalFadeIn 0.25s ease;
        isolation: isolate;
    `;

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
                    <div style="font-size: 13px; color: var(--text-light); margin-top: 2px;">Ve a 🏷️ Productos y define lo que vendes, asociando cada producto a una receta.</div>
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

    window.closeQuickStartGuide = function() {
        const m = document.getElementById('quickstart-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (m.parentNode) m.remove();
            }, 200);
        }
    };

    modal.addEventListener('click', function(e) {
        if (e.target === this) closeQuickStartGuide();
    });
}

// ============================================================
// INICIALIZAR AYUDA EN EL PERFIL
// ============================================================

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
// BASE DE DATOS DE FAQs NUMERADAS
// ============================================================

const FAQS_DB = [
    // ============ GENERALES ============
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

    // ============ DASHBOARD ============
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

    // ============ INSUMOS ============
    { cat: '🛒 Insumos', q: '¿Qué es un insumo?', a: 'Es todo lo que compras para producir: harina, levadura, yogur, mantequilla, etc.' },
    { cat: '🛒 Insumos', q: '¿Cómo registro un insumo?', a: 'Ve a 🛒 Insumos → clic en "➕ Nuevo Insumo". Completa nombre, unidad, costo, stock y stock mínimo.' },
    { cat: '🛒 Insumos', q: '¿Los insumos se descuentan automáticamente?', a: 'Sí. Al vender un producto o confirmar un pedido, el stock de los insumos se descuenta según la receta asociada.' },
    { cat: '🛒 Insumos', q: '¿Qué es el stock mínimo?', a: 'Es la cantidad mínima que debe tener un insumo. Cuando el stock baja de ese nivel, aparece una alerta roja.' },
    { cat: '🛒 Insumos', q: '¿Puedo eliminar un insumo?', a: 'Sí, pero se aplica soft-delete. Puedes limpiarlo permanentemente desde Herramientas.' },
    { cat: '🛒 Insumos', q: '¿Los usuarios no-admin pueden editar insumos?', a: 'No. Solo los administradores pueden crear, editar o eliminar insumos. Los usuarios regulares tienen modo solo lectura.' },

    // ============ RECETAS ============
    { cat: '📖 Recetas', q: '¿Qué es una receta?', a: 'Es la fórmula de producción que indica qué insumos se necesitan y en qué cantidad. Ej: "Pan de Yogur" con harina, levadura y yogur.' },
    { cat: '📖 Recetas', q: '¿Cómo se calcula el costo de una receta?', a: 'La suma de (cantidad × costo_unitario) de todos los insumos asociados.' },
    { cat: '📖 Recetas', q: '¿Qué hace el botón "🔄 Recalcular"?', a: 'Permite ajustar una receta para un nuevo rendimiento usando regla de 3. Ej: receta para 33 panes → quiero 50 panes.' },
    { cat: '📖 Recetas', q: '¿Cómo comparto una receta?', a: 'En la vista de detalle de la receta, clic en "💬 Compartir". Puedes enviarla por WhatsApp, Messenger, Email o copiarla al portapapeles. Solo admin.' },
    { cat: '📖 Recetas', q: '¿Puedo duplicar una receta?', a: 'Sí. En la lista de recetas, clic en "📋 Duplicar". Se creará una copia con el nombre que elijas. Solo admin.' },
    { cat: '📖 Recetas', q: '¿Qué significa "receta compartida"?', a: 'Es una receta que otros usuarios del mismo negocio pueden ver y usar como plantilla.' },
    { cat: '📖 Recetas', q: '¿Por qué no puedo editar las recetas?', a: 'Las recetas son fórmulas críticas del negocio. Solo los administradores pueden crearlas, editarlas, duplicarlas o eliminarlas. Los usuarios regulares pueden verlas, recalcularlas, usarlas como plantilla y exportarlas en PDF (sin costos).' },
    { cat: '📖 Recetas', q: '¿Por qué no veo los costos de las recetas?', a: 'Los costos son información sensible del negocio. Solo los administradores los ven. Como usuario regular, ves los ingredientes y cantidades pero no los precios.' },
    { cat: '📖 Recetas', q: '¿Puedo recalcular una receta siendo usuario no-admin?', a: 'Sí. Puedes recalcular, pero solo podrás guardar el resultado como una receta nueva (no modificar la original).' },

    // ============ PRODUCTOS ============
    { cat: '🏷️ Productos', q: '¿Qué es un producto?', a: 'Es lo que vendes al cliente. Ej: "Jaba de Pan" con precio $550 y 10 panes por jaba.' },
    { cat: '🏷️ Productos', q: '¿Cómo asocio un producto a una receta?', a: 'Al crear/editar el producto, selecciona la receta en el desplegable "📋 Receta asociada".' },
    { cat: '🏷️ Productos', q: '¿Qué es "cantidad por unidad"?', a: 'Es cuántas unidades del producto contiene una unidad de venta. Ej: una jaba tiene 10 panes → cantidad_por_unidad = 10.' },
    { cat: '🏷️ Productos', q: '¿Cómo sé el margen de ganancia?', a: 'En la lista de productos, se muestra el margen calculado automáticamente: (precio - costo) / precio × 100.' },

    // ============ VENTAS ============
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

    // ============ PEDIDOS ============
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
    { cat: '📋 Pedidos', q: '¿Cómo proceso varios clientes a la vez?', a: 'En la lista de espera, si hay suficiente stock, puedes seleccionar varios clientes con checkboxes y procesarlos juntos.' },
    { cat: '📋 Pedidos', q: '¿Qué diferencia hay entre "Cancelar" y "Quitar"?', a: 'Cancelar → cambia el estado del pedido a "cancelado" y repone stock. Quitar → solo elimina al cliente de la lista, el pedido vuelve a "pendiente".' },

    // ============ CORRIENTE ============
    { cat: '⚡ Corriente', q: '¿Cómo funcionan los horarios de corriente?', a: 'Define el patrón (ej: 3h corriente / 12h apagón) y el sistema calcula automáticamente todos los bloques de cada día.' },
    { cat: '⚡ Corriente', q: '¿Qué necesito para configurar corriente?', a: 'Una fecha y hora de referencia donde conociste un bloque de corriente. Ej: "Hoy tuve corriente de 10:00 a 13:00".' },
    { cat: '⚡ Corriente', q: '¿Puedo descargar el reporte de corriente?', a: 'Sí. En Herramientas → ⚡ Gestionar Horarios → pestaña 📊 Reporte, elige semanal o mensual y se genera un PDF.' },
    { cat: '⚡ Corriente', q: '¿Por qué el calendario muestra algunos días sin corriente?', a: 'Porque según el patrón configurado, ese día no tiene bloques de corriente. Aparecen en gris.' },

    // ============ PREMIOS ============
    { cat: '🏆 Premios', q: '¿Cómo funciona el sistema de premios?', a: 'Premia a tus mejores clientes. Se calcula automáticamente el cliente con mayor total gastado en el mes y en el año.' },
    { cat: '🏆 Premios', q: '¿Dónde configuro los premios?', a: 'Ve a 💰 Ventas → botón 🏆 Premios. Ahí puedes activar/desactivar, editar los premios y elegir cuándo se calcula el premio anual.' },
    { cat: '🏆 Premios', q: '¿Por qué hay tres opciones para calcular el premio anual?', a: 'Cada negocio es diferente. Puedes elegir entregar el premio en Navidad (24 dic), a fin de año (31 dic) o al inicio del siguiente año (comportamiento por defecto).' },
    { cat: '🏆 Premios', q: '¿Qué pasa si tengo el sistema de premios desactivado?', a: 'El selector de cálculo anual se guarda igualmente, pero no se muestra la tarjeta de premios en el Dashboard ni se envían notificaciones.' },

    // ============ NOTIFICACIONES Y AYUDA ============
    { cat: '🔔 Notificaciones', q: '¿Puedo cambiar el sonido de las notificaciones?', a: 'Sí. Ve a tu Perfil → 🔔 Sonido de notificaciones. Puedes elegir entre 5 sonidos embutidos o desactivarlo.' },
    { cat: '🔔 Notificaciones', q: '¿Por qué no se repiten las notificaciones?', a: 'Una vez que abres el modal de notificaciones, se marcan como vistas y no se vuelven a mostrar hasta que sean necesarias de nuevo.' },
    { cat: '🔔 Notificaciones', q: '¿Cómo abro el Centro de Ayuda?', a: 'Haz clic en el botón ❓ de la barra superior. Se abrirá un menú flotante con Guía Rápida, Tutorial, FAQ, Ayuda Detallada, Léeme y Créditos.' },
    { cat: '🔔 Notificaciones', q: '¿Qué es la "Ayuda detallada"?', a: 'Es un manual completo que se abre DENTRO de la app (en esta misma ventana), respetando tu tema actual y abriéndose en la sección del módulo donde estés.' },
    { cat: '🔔 Notificaciones', q: '¿Puedo volver a ver el tutorial?', a: 'Sí. Ve a Ayuda → Tutorial Interactivo. Si ya lo completaste, la app te preguntará si quieres volver a verlo.' },
    { cat: '🔔 Notificaciones', q: '¿Cómo contacto al desarrollador?', a: 'En Ayuda → Créditos. WhatsApp: +53 55031725, Email: 3sayricardo@gmail.com.' },
    { cat: '🔔 Notificaciones', q: '¿Por qué la ayuda se abre detrás de la app?', a: 'Era un bug de z-index. Ahora se corrigió y la ayuda se abre siempre al frente. Si aún lo ves detrás, recarga la página.' },
    { cat: '🔔 Notificaciones', q: '¿El Centro de Ayuda bloquea la pantalla?', a: 'No. El Centro de Ayuda ahora es un menú flotante que aparece debajo del botón ❓. Se cierra automáticamente al hacer clic fuera o presionar Escape.' },

    // ============ MULTIUSUARIO ============
    { cat: '👥 Multiusuario', q: '¿Puedo tener varios usuarios en el mismo negocio?', a: 'Sí. Al registrarte puedes crear un negocio nuevo o unirte a uno existente con un código de invitación de 8 caracteres.' },
    { cat: '👥 Multiusuario', q: '¿Cómo comparto el código de invitación?', a: 'En tu Perfil, junto al nombre del negocio, verás el código con un botón "📋 Copiar". Envíalo a quien quieras invitar.' },
    { cat: '👥 Multiusuario', q: '¿Quién es el administrador del negocio?', a: 'El primer usuario que crea el negocio es el administrador. Los siguientes usuarios que se unan tendrán rol de usuario regular.' },
    { cat: '👥 Multiusuario', q: '¿Cómo promuevo a un usuario a admin?', a: 'Ve a ⚙️ Herramientas → 👥 Gestionar Usuarios → botón 👑 junto al usuario.' },
    { cat: '👥 Multiusuario', q: '¿Qué puede hacer un admin que un usuario no puede?', a: 'Crear/editar/eliminar insumos, recetas, productos. Gestionar usuarios. Hacer copias completas. Ver costos de recetas. Cancelar/reprogramar pedidos globalmente.' },

    // ============ HERRAMIENTAS ============
    { cat: '⚙️ Herramientas', q: '¿Qué hace "Reiniciar base de datos"?', a: 'Elimina TODOS los datos excepto usuarios y temas. Se conservan las cuentas de usuario para que puedas volver a entrar. Contraseña: "panario".' },
    { cat: '⚙️ Herramientas', q: '¿Qué diferencia hay entre "Limpiar datos eliminados" y "Eliminación por error"?', a: 'Ambas son destructivas. "Limpiar datos eliminados" borra todos los registros con soft-delete. "Eliminación por error" permite seleccionar pedidos o ventas específicos para eliminar permanentemente.' },
    { cat: '⚙️ Herramientas', q: '¿Cómo fusiono dos bases de datos?', a: 'Ve a ⚙️ Herramientas → 📥 Importar → 🔀 Fusionar bases de datos. Los registros nuevos se añaden, los existentes se comparan por UUID (gana el más reciente).' },
    { cat: '⚙️ Herramientas', q: '¿Qué pasa si importo datos duplicados?', a: 'El sistema evita duplicados al fusionar: compara por UUID y solo actualiza si el backup es más reciente. Los duplicados se omiten automáticamente.' },

    // ============ PRODUCCIÓN ============
    { cat: '🔨 Producción', q: '¿Qué es el horario de producción?', a: 'Es el bloque de corriente que has marcado como el momento en que hornearás tu producción. Se muestra en la tarjeta del pedido para saber cuándo estará listo el pan.' },
    { cat: '🔨 Producción', q: '¿Cómo defino el horario de producción para un día?', a: 'Ve a ⚙️ Herramientas → ⚡ Gestionar Horarios → 📅 Calendario. Haz clic en un día con corriente, selecciona el bloque y la cantidad a producir, y guarda.' },
    { cat: '🔨 Producción', q: '¿Qué significa "Pedidos: 5/50"?', a: 'Significa que hay 5 pedidos reservados para ese día y la producción programada es de 50 unidades. Aún quedan 45 cupos disponibles.' },
    { cat: '🔨 Producción', q: '¿Por qué no puedo crear más pedidos para un día?', a: 'Porque la producción de ese día está completa. El sistema bloquea la creación para evitar sobreventa. Cambia la fecha o aumenta la cantidad de producción.' },
    { cat: '🔨 Producción', q: '¿Cómo elimino la producción de un día?', a: 'Ve al día en el calendario, haz clic en el modal de detalle y pulsa el botón 🗑️ junto a la sección de producción.' },
    { cat: '🔨 Producción', q: '¿Las ventas directas afectan el cupo de pedidos?', a: 'Sí. Si vendes directamente sin pedido, esas unidades se descuentan del cupo disponible. El cálculo es: m - pedidos - ventas_directas.' },
    { cat: '🔨 Producción', q: '¿Puedo vender más de la cantidad de producción?', a: 'Sí, las ventas directas no se bloquean. Solo los pedidos respetan el cupo de producción.' },
    { cat: '🔨 Producción', q: '¿Qué pasa si no defino producción para un día?', a: 'No hay límite de pedidos para ese día. La tarjeta no muestra el bloque de producción.' },

    // ============ REPROGRAMACIÓN ============
    { cat: '🔄 Reprogramación', q: '¿Cómo reprogramo pedidos a otra fecha?', a: 'Ve a ⚙️ Herramientas → 🔄 Reprogramar Pedidos por Rango. Selecciona el rango de fechas origen, la fecha destino, la causa y confirma.' },
    { cat: '🔄 Reprogramación', q: '¿Puedo reprogramar solo los pedidos de un cliente?', a: 'Sí. En el modal de reprogramación, hay un campo opcional de cliente. Si lo llenas, solo se reprograman los pedidos de ese cliente.' },
    { cat: '🔄 Reprogramación', q: '¿Qué pasa con la causa y nota al reprogramar?', a: 'La causa y nota se añaden automáticamente al campo de notas de cada pedido, para tener un historial de por qué se movió.' },
    { cat: '🔄 Reprogramación', q: '¿Se puede deshacer una reprogramación?', a: 'No directamente. Deberás volver a reprogramar los pedidos a la fecha original o editar cada pedido manualmente.' },
    { cat: '🔄 Reprogramación', q: '¿Los pedidos entregados se pueden reprogramar?', a: 'No. Solo se reprograman pedidos en estado pendiente, confirmado, en producción o listo.' },
    { cat: '🔄 Reprogramación', q: '¿Qué pasa si la fecha destino ya tiene pedidos?', a: 'Los pedidos reprogramados se añaden a los ya existentes. Se respeta el cupo de producción si está configurado.' },
    { cat: '🔄 Reprogramación', q: '¿Quién puede reprogramar pedidos?', a: 'Solo el administrador del negocio. Es una operación crítica que afecta a múltiples clientes a la vez.' },
    { cat: '🔄 Reprogramación', q: '¿La reprogramación afecta el stock?', a: 'No directamente. El stock ya fue descontado (o no) según el estado original del pedido. La reprogramación solo cambia la fecha.' },

    // ============ PWA ============
    { cat: '📱 PWA', q: '¿Por qué la app no funciona offline después de limpiar el caché?', a: 'Si limpias el caché de Chrome, se borran los archivos de la PWA. Abre Panario con conexión a internet una vez para que se vuelvan a cachear.' },
    { cat: '📱 PWA', q: '¿Cómo reinstalo la PWA correctamente?', a: 'Desinstala la PWA, limpia el caché del navegador, abre Panario online, espera a que cargue completamente y vuelve a instalarla.' },
    { cat: '📱 PWA', q: '¿Qué hacer si veo "Sin conexión" pero tengo internet?', a: 'Es posible que el Service Worker tenga una versión antigua. Ve a offline.html y pulsa "Limpiar caché y recargar".' },
    { cat: '📱 PWA', q: '¿Por qué la ayuda no se abre en el móvil?', a: 'En algunos navegadores móviles, los iframes requieren gesto del usuario. Toca el botón de ayuda manualmente en lugar de esperar que se abra sola.' },

    // ============ DUPLICADOS ============
    { cat: '🔀 Duplicados', q: '¿Cómo evito duplicados al importar?', a: 'Usa la opción "🔀 Fusionar bases de datos". El sistema compara por UUID y solo añade registros nuevos, actualizando los existentes solo si son más recientes.' },
    { cat: '🔀 Duplicados', q: '¿Qué pasa si importo datos que ya existen?', a: 'En modo fusión, los registros con mismo UUID se comparan por fecha de modificación. Gana el más reciente. Los duplicados sin UUID se detectan por datos clave.' },
    { cat: '🔀 Duplicados', q: '¿Puedo importar la misma salva dos veces?', a: 'Sí, no habrá duplicados. El sistema detecta los registros ya importados y los omite o actualiza según corresponda.' },
    { cat: '🔀 Duplicados', q: '¿Cómo verifico si hay duplicados en mi base de datos?', a: 'Ve a ⚙️ Herramientas → 🚨 Eliminación por error. Revisa la lista de pedidos y ventas. Si ves entradas idénticas, selecciónalas y elimínalas.' },

    // ============ VENDEDOR ============
    { cat: '👤 Vendedor', q: '¿Cómo sé quién vendió cada producto?', a: 'En el detalle de cada venta, en la sección de Auditoría, aparece "👤 Creado por: [nombre del vendedor]".' },
    { cat: '👤 Vendedor', q: '¿Puedo filtrar ventas por vendedor?', a: 'Actualmente no hay filtro directo, pero puedes ver el ranking de ventas por empleado en el Dashboard.' },
    { cat: '👤 Vendedor', q: '¿Qué pasa si un usuario es eliminado?', a: 'Sus ventas se mantienen, pero el nombre del vendedor aparecerá como "Desconocido" en la auditoría.' }
];

// ============================================================
// MOSTRAR FAQ CON NUMERACIÓN Y BUSCADOR
// ============================================================

function showFAQModal() {
    const existingModal = document.getElementById('faq-modal');
    if (existingModal) existingModal.remove();

    const faqsNumeradas = FAQS_DB.map((f, i) => ({
        ...f,
        num: i + 1
    }));

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
                <div class="faq-content" style="display: none; margin-top: 8px; font-size: 13px; color: var(--text-light); padding-top: 8px; padding-left: 36px; border-top: 1px solid var(--border-color); line-height: 1.6;">
                    ${f.a}
                </div>
            </div>
        `;
    });

    const totalFaqs = FAQS_DB.length;

    const modal = document.createElement('div');
    modal.id = 'faq-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: ${HELP_MODAL_Z_INDEX}; padding: 20px;
        animation: modalFadeIn 0.25s ease;
        isolation: isolate;
    `;

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
                <input type="text" 
                       id="faq-search-input"
                       placeholder="🔍 Buscar por número o texto..."
                       oninput="filtrarFAQs(this.value)"
                       style="width: 100%; padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 14px; background: var(--bg-input); color: var(--text); outline: none;">
                <div id="faq-search-count" style="font-size: 11px; color: var(--text-light); margin-top: 4px; display: none;"></div>
            </div>
            
            <p style="font-size: 12px; color: var(--text-light); margin-bottom: 12px;">
                📚 Haz clic en cada pregunta para ver la respuesta. Usa el buscador para filtrar.
            </p>
            
            <div id="faq-list" style="display: flex; flex-direction: column; gap: 4px;">
                ${faqHtml}
            </div>
            
            <div id="faq-empty-message" style="display: none; text-align: center; padding: 40px 20px; color: var(--text-light);">
                <span style="font-size: 48px;">🔍</span>
                <p style="margin-top: 12px;">No se encontraron preguntas que coincidan</p>
            </div>
            
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color); display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="closeFAQModal()" class="btn secondary" style="padding: 8px 16px; font-size: 13px; width: auto; flex: 1;">
                    Cerrar
                </button>
                <button onclick="closeFAQModal(); abrirAyudaDetallada();" class="btn primary" style="padding: 8px 16px; font-size: 13px; width: auto; flex: 1; background: #10b981; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    📖 Ayuda detallada
                </button>
                <button onclick="closeFAQModal(); startTour();" class="btn primary" style="padding: 8px 16px; font-size: 13px; width: auto; flex: 1; background: #f59e0b; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    🎯 Tutorial
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    forzarModalAlFrente(modal);

    window.closeFAQModal = function() {
        const m = document.getElementById('faq-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (m.parentNode) m.remove();
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
    FAQS_DB: FAQS_DB
};

// Hacerlas globales también para uso directo
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

console.log('📦 Help Module cargado correctamente v2.1.8 (FASE 4.1: Centro de Ayuda como popover)');
console.log('📚 FAQs cargadas:', FAQS_DB.length);