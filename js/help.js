// ============================================================
// 📦 HELP MODULE - Panario (Sistema de Ayuda y Tutorial)
// CORREGIDO: Nombre del desarrollador (Ricardo Castillo Valdés)
// ============================================================

window.HelpModule = {};

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

// ============================================================
// MENÚ PRINCIPAL DE AYUDA
// ============================================================

function showHelpMenu() {
    const existingModal = document.getElementById('help-menu-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'help-menu-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999; padding: 20px;
        animation: modalFadeIn 0.25s ease;
    `;

    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 400px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">❓</span>
                    <h2 style="margin: 0; font-size: 18px;">Centro de Ayuda</h2>
                </div>
                <button onclick="closeHelpMenu()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>

            <p style="font-size: 13px; color: var(--text-light); margin-bottom: 16px;">
                Selecciona una opción para obtener ayuda sobre Panario.
            </p>

            <div style="display: flex; flex-direction: column; gap: 8px;">
                <!-- Guía Rápida -->
                <button onclick="closeHelpMenu(); showQuickStartGuide();" 
                        style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #fff; border: none; border-radius: 10px; cursor: pointer; text-align: left; font-family: inherit; transition: transform 0.2s;">
                    <span style="font-size: 24px;">🚀</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 14px;">Guía Rápida de Inicio</div>
                        <div style="font-size: 11px; opacity: 0.9;">5 pasos para empezar</div>
                    </div>
                    <span style="font-size: 16px;">▶</span>
                </button>

                <!-- Tutorial Interactivo -->
                <button onclick="closeHelpMenu(); startTour();" 
                        style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #fff; border: none; border-radius: 10px; cursor: pointer; text-align: left; font-family: inherit; transition: transform 0.2s;">
                    <span style="font-size: 24px;">🎯</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 14px;">Tutorial Interactivo</div>
                        <div style="font-size: 11px; opacity: 0.9;">Recorrido guiado por la app</div>
                    </div>
                    <span style="font-size: 16px;">▶</span>
                </button>

                <!-- Preguntas Frecuentes -->
                <button onclick="closeHelpMenu(); showFAQModal();" 
                        style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #fff; border: none; border-radius: 10px; cursor: pointer; text-align: left; font-family: inherit; transition: transform 0.2s;">
                    <span style="font-size: 24px;">❓</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 14px;">Preguntas Frecuentes</div>
                        <div style="font-size: 11px; opacity: 0.9;">Respuestas a dudas comunes</div>
                    </div>
                    <span style="font-size: 16px;">▶</span>
                </button>

                <!-- Separador -->
                <div style="border-top: 1px solid var(--border-color); margin: 4px 0;"></div>

                <!-- Léeme -->
                <button onclick="closeHelpMenu(); showReadmeModal();" 
                        style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; border: none; border-radius: 10px; cursor: pointer; text-align: left; font-family: inherit; transition: transform 0.2s;">
                    <span style="font-size: 24px;">📖</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 14px;">Léeme</div>
                        <div style="font-size: 11px; opacity: 0.9;">Información del proyecto</div>
                    </div>
                    <span style="font-size: 16px;">▶</span>
                </button>

                <!-- Separador -->
                <div style="border-top: 1px solid var(--border-color); margin: 4px 0;"></div>

                <!-- Créditos -->
                <button onclick="closeHelpMenu(); showCreditsModal();" 
                        style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #fff; border: none; border-radius: 10px; cursor: pointer; text-align: left; font-family: inherit; transition: transform 0.2s;">
                    <span style="font-size: 24px;">👨‍💻</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 14px;">Créditos</div>
                        <div style="font-size: 11px; opacity: 0.9;">Desarrollador y contacto</div>
                    </div>
                    <span style="font-size: 16px;">▶</span>
                </button>
            </div>

            <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-color); text-align: center;">
                <button onclick="closeHelpMenu()" class="btn secondary" style="padding: 8px 20px; font-size: 13px; width: auto;">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    window.closeHelpMenu = function() {
        const m = document.getElementById('help-menu-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (m.parentNode) m.remove();
            }, 200);
        }
    };

    modal.addEventListener('click', function(e) {
        if (e.target === this) closeHelpMenu();
    });

    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeHelpMenu();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
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
        z-index: 999999; padding: 20px;
        animation: modalFadeIn 0.25s ease;
    `;

    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #10b981;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">📖</span>
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
                    <li>📊 <strong>Dashboard:</strong> Estadísticas y análisis del negocio</li>
                    <li>⚡ <strong>Corriente:</strong> Planificación según horarios eléctricos</li>
                    <li>🔔 <strong>Notificaciones:</strong> Alertas persistentes</li>
                    <li>👥 <strong>Multiusuario:</strong> Varios usuarios por negocio</li>
                </ul>

                <h4 style="margin: 16px 0 8px 0; color: var(--text);">📱 Información técnica</h4>
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                        <span style="color: var(--text-light);">Versión:</span>
                        <strong>2.0.2</strong>
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

            <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-color); text-align: center;">
                <button onclick="closeReadmeModal()" class="btn primary" style="padding: 10px 24px; font-size: 14px; width: auto; background: #10b981; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Entendido
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

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
// MODAL CRÉDITOS (CORREGIDO - Ricardo Castillo Valdés)
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
        z-index: 999999; padding: 20px;
        animation: modalFadeIn 0.25s ease;
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
                    🍞 Panario v2.0.2
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
        z-index: 999999;
        pointer-events: none;
        animation: modalFadeIn 0.3s ease;
    `;
    
    tourHighlight = document.createElement('div');
    tourHighlight.id = 'tour-highlight';
    tourHighlight.style.cssText = `
        position: fixed;
        border: 3px solid #f5a623;
        border-radius: 12px;
        box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);
        z-index: 9999999;
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
        z-index: 99999999;
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
        z-index: 999999; padding: 20px;
        animation: modalFadeIn 0.25s ease;
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
// MOSTRAR FAQ (AMPLIADA - 30+ preguntas)
// ============================================================

function showFAQModal() {
    const faqs = [
        // ============ GENERALES ============
        { q: '¿Qué es Panario?', a: 'Es una aplicación PWA para la gestión integral de una panadería artesanal. Permite gestionar insumos, recetas, productos, ventas, pedidos y finanzas.' },
        { q: '¿Funciona sin conexión?', a: 'Sí, Panario funciona completamente offline. Todos tus datos están guardados localmente en tu dispositivo.' },
        { q: '¿Dónde se guardan mis datos?', a: 'En SQLite (base de datos local) y localStorage. Todo queda en tu dispositivo. Nada se envía a servidores externos.' },
        { q: '¿Cómo hago una copia de seguridad?', a: 'Ve a ⚙️ Herramientas y haz clic en "📥 Descargar copia de seguridad". Se descarga un archivo .db con todos tus datos.' },
        { q: '¿Cómo restauro una copia de seguridad?', a: 'En ⚙️ Herramientas, haz clic en "📤 Importar copia de seguridad" y selecciona el archivo .db. Se reemplazarán todos los datos actuales.' },
        { q: '¿Puedo exportar solo recetas y productos?', a: 'Sí. En Herramientas usa "🧩 Salva diferencial" para exportar/importar solo las recetas y productos, sin afectar al resto de la base de datos.' },
        { q: '¿Qué navegadores soporta Panario?', a: 'Chrome, Firefox, Edge, Safari (versiones recientes). Se recomienda Chrome para mejor rendimiento.' },
        { q: '¿Cómo instalo Panario en mi móvil?', a: 'Abre Panario en el navegador y usa "Añadir a pantalla de inicio" o "Instalar aplicación".' },
        { q: '¿Quién desarrolló Panario?', a: 'Panario fue desarrollado por Ricardo Castillo Valdés. Puedes contactarlo por WhatsApp (+53 55031725) o email (3sayricardo@gmail.com).' },

        // ============ DASHBOARD ============
        { q: '¿Puedo personalizar qué veo en el Dashboard?', a: 'Sí. Ve a tu Perfil y en la sección "📊 Elementos visibles en el Dashboard" activa o desactiva las secciones que quieres ver.' },
        { q: '¿Qué significa "Días con ventas"?', a: 'Es el número de días únicos en los que registraste al menos una venta. No cuenta días sin actividad.' },
        { q: '¿Cómo se calcula el "Promedio diario"?', a: 'Se divide el total de ingresos entre los días con ventas. Ej: si vendiste $1000 en 5 días, el promedio es $200/día.' },
        { q: '¿Qué es "Clientes diferentes"?', a: 'Es la cantidad de clientes únicos que han comprado al menos una vez. No cuenta clientes repetidos.' },
        { q: '¿Por qué los pedidos pendientes no aparecen como deudas?', a: 'Porque un pedido es una solicitud, no una venta ejecutada. Solo se considera deuda cuando se ha completado la venta y el cliente no ha pagado.' },
        { q: '¿Cómo funcionan las flechas ◀▶ del gráfico?', a: 'Permiten navegar entre semanas. ◀ va a semanas anteriores, ▶ vuelve a la semana actual.' },
        { q: '¿Qué significan los colores del gráfico?', a: '🥇 Verde = día con mayor venta de la semana. 📉 Rojo = día con menor venta. ⭐ Amarillo = día actual.' },

        // ============ INSUMOS ============
        { q: '¿Qué es un insumo?', a: 'Es todo lo que compras para producir: harina, levadura, yogur, mantequilla, etc.' },
        { q: '¿Cómo registro un insumo?', a: 'Ve a 🛒 Insumos → clic en "➕ Nuevo Insumo". Completa nombre, unidad, costo, stock y stock mínimo.' },
        { q: '¿Los insumos se descuentan automáticamente?', a: 'Sí. Al vender un producto o confirmar un pedido, el stock de los insumos se descuenta según la receta asociada.' },
        { q: '¿Qué es el stock mínimo?', a: 'Es la cantidad mínima que debe tener un insumo. Cuando el stock baja de ese nivel, aparece una alerta roja.' },
        { q: '¿Puedo eliminar un insumo?', a: 'Sí, pero se aplica soft-delete. Puedes limpiarlo permanentemente desde Herramientas.' },

        // ============ RECETAS ============
        { q: '¿Qué es una receta?', a: 'Es la fórmula de producción que indica qué insumos se necesitan y en qué cantidad. Ej: "Pan de Yogur" con harina, levadura y yogur.' },
        { q: '¿Cómo se calcula el costo de una receta?', a: 'La suma de (cantidad × costo_unitario) de todos los insumos asociados.' },
        { q: '¿Qué hace el botón "🔄 Recalcular"?', a: 'Permite ajustar una receta para un nuevo rendimiento usando regla de 3. Ej: receta para 33 panes → quiero 50 panes.' },
        { q: '¿Cómo comparto una receta?', a: 'En la vista de detalle de la receta, clic en "💬 Compartir". Puedes enviarla por WhatsApp, Messenger, Email o copiarla al portapapeles.' },
        { q: '¿Puedo duplicar una receta?', a: 'Sí. En la lista de recetas, clic en "📋 Duplicar". Se creará una copia con el nombre que elijas.' },
        { q: '¿Qué significa "receta compartida"?', a: 'Es una receta que otros usuarios del mismo negocio pueden ver y usar como plantilla.' },

        // ============ PRODUCTOS ============
        { q: '¿Qué es un producto?', a: 'Es lo que vendes al cliente. Ej: "Jaba de Pan" con precio $550 y 10 panes por jaba.' },
        { q: '¿Cómo asocio un producto a una receta?', a: 'Al crear/editar el producto, selecciona la receta en el desplegable "📋 Receta asociada".' },
        { q: '¿Qué es "cantidad por unidad"?', a: 'Es cuántas unidades del producto contiene una unidad de venta. Ej: una jaba tiene 10 panes → cantidad_por_unidad = 10.' },
        { q: '¿Cómo sé el margen de ganancia?', a: 'En la lista de productos, se muestra el margen calculado automáticamente: (precio - costo) / precio × 100.' },

        // ============ VENTAS ============
        { q: '¿Cómo registro una venta?', a: 'Ve a 💰 Ventas → clic en "➕ Nueva Venta". Selecciona el producto, cantidad, precio, método de pago y cliente.' },
        { q: '¿Qué es una "venta liberada"?', a: 'Es una venta sin cliente identificado, tipo "mostrador anónimo". Se agrupa visualmente y no permite deuda.' },
        { q: '¿Qué es una deuda?', a: 'Es una venta donde el cliente no pagó al momento. Se marca con is_debt = 1 y paid = 0.' },
        { q: '¿Cómo cobro una deuda?', a: 'En Ventas, ve al filtro "💳 Deudas", encuentra al cliente y haz clic en "💰 Cobrar".' },
        { q: '¿Puedo anular una venta?', a: 'Sí. En el detalle de la venta, clic en "🚫 Anular". Se repondrá el stock automáticamente.' },
        { q: '¿Cómo edito el nombre del cliente?', a: 'Al editar una venta, el campo "👤 Comprador" es editable. Si la venta está vinculada a un pedido, se desvinculará.' },

        // ============ PEDIDOS ============
        { q: '¿Cuál es la diferencia entre pedido y venta?', a: 'Un pedido es una solicitud de un cliente. Una venta es una transacción completada. Los pedidos no son deudas hasta que se entregan.' },
        { q: '¿Qué estados tiene un pedido?', a: 'Pendiente, Confirmado, En producción, Listo, Entregado, Cancelado, En lista de espera, Compró por lista de espera.' },
        { q: '¿Qué es la lista de espera?', a: 'Cuando la demanda supera la oferta, los clientes se ponen en cola. Al haber disponibilidad, se les atiende en orden.' },
        { q: '¿Cómo funciona la reserva por período?', a: 'Permite crear múltiples pedidos a la vez para el mismo cliente. Elige el patrón: rango completo, días de la semana o días específicos.' },
        { q: '¿Qué es la paridad en reservas?', a: 'Permite filtrar días pares o impares. Ej: "Solo pares" crea pedidos los días 2, 4, 6, 8, 10...' },
        { q: '¿Cómo se cancelan pedidos automáticamente?', a: 'Los pedidos pendientes/confirmados con más de 48h sin procesar se cancelan automáticamente.' },
        { q: '¿Qué es "sesión de recogida"?', a: 'Indica si el cliente recogerá el pedido en la mañana (10:00), tarde (15:00) o noche (19:00).' },

        // ============ CORRIENTE ============
        { q: '¿Cómo funcionan los horarios de corriente?', a: 'Define el patrón (ej: 3h corriente / 12h apagón) y el sistema calcula automáticamente todos los bloques de cada día.' },
        { q: '¿Qué necesito para configurar corriente?', a: 'Una fecha y hora de referencia donde conociste un bloque de corriente. Ej: "Hoy tuve corriente de 10:00 a 13:00".' },
        { q: '¿Puedo descargar el reporte de corriente?', a: 'Sí. En Herramientas → ⚡ Gestionar Horarios → pestaña 📊 Reporte, elige semanal o mensual y se genera un PDF.' },
        { q: '¿Por qué el calendario muestra algunos días sin corriente?', a: 'Porque según el patrón configurado, ese día no tiene bloques de corriente. Aparecen en gris.' },

        // ============ AYUDA ============
        { q: '¿Cómo abro el Centro de Ayuda?', a: 'Haz clic en el botón ❓ de la barra superior. Se abrirá un menú con Guía Rápida, Tutorial, FAQ, Léeme y Créditos.' },
        { q: '¿Puedo volver a ver el tutorial?', a: 'Sí. Ve a Ayuda → Tutorial Interactivo. Si ya lo completaste, la app te preguntará si quieres volver a verlo.' },
        { q: '¿Cómo contacto al desarrollador?', a: 'En Ayuda → Créditos. WhatsApp: +53 55031725, Email: 3sayricardo@gmail.com.' }
    ];

    const existingModal = document.getElementById('faq-modal');
    if (existingModal) existingModal.remove();

    let faqHtml = faqs.map((f, i) => `
        <div style="background: var(--bg); padding: 10px 14px; border-radius: 6px; margin-bottom: 6px; cursor: pointer; border: 1px solid var(--border-color);" onclick="toggleFAQ(this)">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <span style="font-weight: 600; font-size: 13px; flex: 1;">❓ ${f.q}</span>
                <span class="faq-arrow" style="font-size: 16px; transition: transform 0.3s;">▶️</span>
            </div>
            <div class="faq-content" style="display: none; margin-top: 8px; font-size: 13px; color: var(--text-light); padding-top: 8px; border-top: 1px solid var(--border-color); line-height: 1.6;">
                ${f.a}
            </div>
        </div>
    `).join('');

    const modal = document.createElement('div');
    modal.id = 'faq-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999; padding: 20px;
        animation: modalFadeIn 0.25s ease;
    `;

    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 550px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #3b82f6;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">❓</span>
                    <h2 style="margin: 0; font-size: 18px; color: #3b82f6;">Preguntas Frecuentes</h2>
                </div>
                <button onclick="closeFAQModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <p style="font-size: 12px; color: var(--text-light); margin-bottom: 12px;">
                📚 ${faqs.length} preguntas organizadas para guiarte. Haz clic en cada una para ver la respuesta.
            </p>
            
            <div style="display: flex; flex-direction: column; gap: 4px;">
                ${faqHtml}
            </div>
            
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color); display: flex; gap: 8px;">
                <button onclick="closeFAQModal()" class="btn secondary" style="padding: 8px 16px; font-size: 13px; width: auto; flex: 1;">
                    Cerrar
                </button>
                <button onclick="closeFAQModal(); startTour();" class="btn primary" style="padding: 8px 16px; font-size: 13px; width: auto; flex: 1; background: #f59e0b; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    🎯 Tutorial
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    window.closeFAQModal = function() {
        const modal = document.getElementById('faq-modal');
        if (modal) {
            modal.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (modal.parentNode) modal.remove();
            }, 200);
        }
    };

    modal.addEventListener('click', function(e) {
        if (e.target === this) closeFAQModal();
    });
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
    toggleFAQ: toggleFAQ
};

// Hacerlas globales también para uso directo
window.showHelpMenu = showHelpMenu;
window.showReadmeModal = showReadmeModal;
window.showCreditsModal = showCreditsModal;
window.showFAQModal = showFAQModal;
window.showQuickStartGuide = showQuickStartGuide;
window.startTour = startTour;
window.showContextualHelp = showContextualHelp;

console.log('📦 Help Module cargado correctamente (con nombre corregido: Ricardo Castillo Valdés)');