// ============================================================
// 📦 APP CONTROLLER - Panario
// v3.1.2 (011026): 🎯 CORRECCIÓN N5 — Tarjeta de promedio diario por producto
//   - ✅ NUEVO: función renderTarjetaProductoPromedio(promedioProducto)
//   - ✅ NUEVO: contenedor #dashboard-producto-promedio-container en el Dashboard
//   - ✅ NUEVO: dashConfig.show_producto_promedio y producto_promedio_id
//   - ✅ NUEVO: renderizado de la tarjeta en loadDashboardData()
//   - ✅ MANTENIDO: TODAS las correcciones anteriores:
//     * v3.1.1: FIX notificaciones en login fresco + sonido
//     * v3.1.0: Corrección #8 (Toggle HOY/MAÑANA producción)
//     * v3.0.9: Corrección #12 (bloque de producción resaltado)
//     * v3.0.8: Corrección #6 (título más pegado al header)
//     * v3.0.7: Punto #5 (deudas agrupadas por cliente)
//     * v3.0.6: QR del Dashboard respeta forzar_qr_admin
//     * v3.0.5: Fix CRÍTICO redeclaración dbReady
//     * v3.0.4: Regresiones #8 y #9 (exportar gráfico + cerrar sesión)
//     * v3.0.3: Regresión #5 (Ventas por empleado)
//     * v3.0.2: Correcciones #2 y #3 (motivo SV + tarjeta días sin ventas)
//     * v3.0.1: Fix MutationObserver (bucle infinito)
//     * v3.0.0: Corrección #5 (Top bar reforzada) + ?standalone=1
// ============================================================

let currentUser = null;

// ============================================================
// 🆕 v3.0.5: HELPER PARA VERIFICAR SI LA BD ESTÁ LISTA
// ============================================================

function isDbReady() {
    try {
        return !!(window.DBModule && typeof window.DBModule.getDB === 'function' && window.DBModule.getDB());
    } catch (e) {
        return false;
    }
}

// ============================================================
// 🆕 FASE 1.4: CONTROL DE DEBOUNCE PARA db-saved
// ============================================================

let _dbSavedDebounceTimer = null;
const DB_SAVED_DEBOUNCE_MS = 500;
let _dbSavedEventCount = 0;

// ============================================================
// 🆕 v3.0.0: CONTROL DE DEBOUNCE PARA FORZAR STICKY HEADER
// ============================================================

let _stickyHeaderDebounceTimer = null;
const STICKY_HEADER_DEBOUNCE_MS = 100;

// ============================================================
// 🆕 v3.0.0: ESTADO DE LOS WATCHERS DEL HEADER
// ============================================================

let _headerCleanupWatchersStarted = false;

/**
 * Refresca la vista actual con debounce.
 */
function debouncedRefreshCurrentView() {
    _dbSavedEventCount++;
    console.log(`🔄 [debounce] Evento db-saved #${_dbSavedEventCount} recibido (refrescando en ${DB_SAVED_DEBOUNCE_MS}ms)`);
    
    if (_dbSavedDebounceTimer) {
        clearTimeout(_dbSavedDebounceTimer);
    }
    
    _dbSavedDebounceTimer = setTimeout(() => {
        const eventCount = _dbSavedEventCount;
        _dbSavedEventCount = 0;
        _dbSavedDebounceTimer = null;
        
        console.log(`🔄 [debounce] Refrescando vista (después de ${eventCount} evento${eventCount > 1 ? 's' : ''})`);
        refreshCurrentView();
    }, DB_SAVED_DEBOUNCE_MS);
}

// ============================================================
// 🆕 v3.0.0: FORZAR STICKY HEADER (CORRECCIÓN #5)
// ============================================================

function forzarStickyHeader() {
    try {
        const header = document.querySelector('#appScreen > header');
        if (!header) return;
        
        header.style.setProperty('position', 'sticky', 'important');
        header.style.setProperty('top', '0', 'important');
        header.style.setProperty('z-index', '200', 'important');
        header.style.setProperty('transform', 'none', 'important');
        header.style.setProperty('will-change', 'auto', 'important');
        
        const targets = [
            document.documentElement,
            document.body,
            document.getElementById('appScreen'),
            document.getElementById('mainContent')
        ].filter(el => el);
        
        const propsAResetear = ['transform', 'will-change', 'isolation', 'filter', 'perspective', 'backface-visibility'];
        
        targets.forEach(el => {
            propsAResetear.forEach(prop => {
                if (el.style.getPropertyValue(prop)) {
                    el.style.removeProperty(prop);
                }
            });
        });
        
        if (!header._stickyForced) {
            console.log('🔧 [v3.1.2] forzarStickyHeader() aplicado al header');
            header._stickyForced = true;
        }
    } catch (e) {
        console.warn('⚠️ [v3.1.2] Error en forzarStickyHeader:', e);
    }
}

function _debouncedForzarSticky() {
    if (_stickyHeaderDebounceTimer) {
        clearTimeout(_stickyHeaderDebounceTimer);
    }
    _stickyHeaderDebounceTimer = setTimeout(() => {
        _stickyHeaderDebounceTimer = null;
        forzarStickyHeader();
        if (typeof window.limpiarEstilosResiduales === 'function') {
            window.limpiarEstilosResiduales();
        }
    }, STICKY_HEADER_DEBOUNCE_MS);
}

// ============================================================
// 🆕 v3.0.1: WATCHERS AMPLIADOS PARA EL HEADER (CORRECCIÓN #5)
// ============================================================

function startHeaderCleanupWatchers() {
    if (_headerCleanupWatchersStarted) {
        console.log('🔄 [v3.1.2] Watchers de header ya estaban activos');
        return;
    }
    
    try {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                _debouncedForzarSticky();
            }
        });
        
        window.addEventListener('pageshow', (e) => {
            _debouncedForzarSticky();
        });
        
        window.addEventListener('focus', () => {
            _debouncedForzarSticky();
        });
        
        window.addEventListener('resize', () => {
            _debouncedForzarSticky();
        });
        
        window.addEventListener('orientationchange', () => {
            setTimeout(_debouncedForzarSticky, 100);
        });
        
        document.addEventListener('scroll', () => {
            _debouncedForzarSticky();
        }, { capture: true, passive: true });
        
        document.addEventListener('resume', () => {
            _debouncedForzarSticky();
        }, false);
        
        let _lastInnerHeight = window.innerHeight;
        window.addEventListener('resize', () => {
            const newInnerHeight = window.innerHeight;
            if (Math.abs(newInnerHeight - _lastInnerHeight) > 20) {
                _lastInnerHeight = newInnerHeight;
            }
        });
        
        _headerCleanupWatchersStarted = true;
        console.log('🔄 [v3.1.2] Watchers de header activados');
        
    } catch (e) {
        console.warn('⚠️ [v3.1.2] Error activando watchers de header:', e);
    }
}

function stopHeaderCleanupWatchers() {
    _headerCleanupWatchersStarted = false;
    console.log('🛑 [v3.1.2] Watchers de header detenidos');
}

// ============================================================
// 🆕 HELPER: OBTENER NOMBRE DEL NEGOCIO ACTUAL
// ============================================================

function getNombreNegocio() {
    try {
        const user = window.AuthModule?.getCurrentUser();
        if (!user) return 'Panario';
        
        if (user.negocio && user.negocio.nombre) {
            return user.negocio.nombre;
        }
        
        if (user.negocio_id && window.DBModule) {
            const negocio = window.DBModule.getNegocio(user.negocio_id);
            if (negocio && negocio.nombre) {
                user.negocio = negocio;
                window.AuthModule.setCurrentUser(user);
                return negocio.nombre;
            }
        }
        
        if (user.business_name) {
            return user.business_name;
        }
        
        return 'Panario';
    } catch (e) {
        console.warn('⚠️ Error obteniendo nombre del negocio:', e);
        return 'Panario';
    }
}

function getInicialNegocio() {
    const nombre = getNombreNegocio();
    return nombre.charAt(0).toUpperCase() || '🍞';
}

window.getNombreNegocio = getNombreNegocio;
window.getInicialNegocio = getInicialNegocio;

// ============================================================
// 🆕 HELPER PARA OBTENER LA VERSIÓN
// ============================================================

function getAppVersion() {
    try {
        const meta = document.querySelector('meta[name="app-version"]');
        if (meta && meta.content) {
            return meta.content;
        }
    } catch (e) {
        console.warn('⚠️ Error leyendo app-version:', e);
    }
    return '3.1.2';
}

window.getAppVersion = getAppVersion;

// ============================================================
// 🔧 HELPERS DE FECHA
// ============================================================

function fechaLocalYYYYMMDD(fechaUTC) {
    if (!fechaUTC) return null;
    
    if (fechaUTC instanceof Date) {
        if (isNaN(fechaUTC.getTime())) return null;
        const year = fechaUTC.getFullYear();
        const month = String(fechaUTC.getMonth() + 1).padStart(2, '0');
        const day = String(fechaUTC.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    if (typeof fechaUTC === 'string') {
        const str = fechaUTC.trim();
        
        const matchSoloFecha = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (matchSoloFecha) {
            return `${matchSoloFecha[1]}-${matchSoloFecha[2]}-${matchSoloFecha[3]}`;
        }
        
        const matchSinZ = str.match(/^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/);
        if (matchSinZ) {
            return `${matchSinZ[1]}-${matchSinZ[2]}-${matchSinZ[3]}`;
        }
        
        try {
            const d = new Date(str);
            if (isNaN(d.getTime())) return null;
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            return null;
        }
    }
    
    try {
        const d = new Date(fechaUTC);
        if (isNaN(d.getTime())) return null;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return null;
    }
}

function hoyYYYYMMDD() {
    return fechaLocalYYYYMMDD(new Date());
}

function mananaYYYYMMDD() {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    return fechaLocalYYYYMMDD(manana);
}

function formatearFechaConDiaSemana(date = new Date()) {
    if (!(date instanceof Date)) date = new Date(date);
    const diasAbrev = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const mesesAbrev = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sept', 'Oct', 'Nov', 'Dic'];
    return `${diasAbrev[date.getDay()]}, ${date.getDate()} de ${mesesAbrev[date.getMonth()]}.`;
}

function formatearFechaYYYYMMDD(fechaStr, opciones = {}) {
    if (!fechaStr) return '—';
    
    if (fechaStr instanceof Date) {
        return fechaStr.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    
    const match = String(fechaStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) {
        try {
            const date = new Date(fechaStr);
            if (isNaN(date.getTime())) return fechaStr;
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) {
            return fechaStr;
        }
    }
    
    const year = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    const day = parseInt(match[3]);
    
    const mesesCorto = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const mesesLargo = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    
    if (opciones.long) {
        const dateLocal = new Date(year, month, day);
        return `${diasSemana[dateLocal.getDay()]}, ${day} de ${mesesLargo[month]} de ${year}`;
    }
    
    return `${String(day).padStart(2, '0')} ${mesesCorto[month]} ${year}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    
    if (typeof dateStr === 'string') {
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|\s|$)/);
        if (match) {
            return formatearFechaYYYYMMDD(dateStr);
        }
    }
    
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

function formatearFechaInteligente(fecha, horaStr = null) {
    try {
        const date = fecha instanceof Date ? fecha : new Date(fecha);
        if (isNaN(date.getTime())) return '—';
        
        const fechaObj = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const hoy = new Date();
        const hoyMid = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        
        const diffMs = fechaObj.getTime() - hoyMid.getTime();
        const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
        
        const diasAbrev = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const dia = date.getDate();
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        
        let sufijoHora = horaStr ? `, ${horaStr}` : '';
        
        if (diffDias === 0) return `Hoy${sufijoHora}`;
        else if (diffDias === 1) return `Mañana ${dia}${sufijoHora}`;
        else if (diffDias === -1) return `Ayer${sufijoHora}`;
        else if (diffDias > 1 && diffDias <= 6) return `${diasAbrev[date.getDay()]} ${dia}${sufijoHora}`;
        else if (diffDias < -1 && diffDias >= -6) return `${diasAbrev[date.getDay()]} ${dia}${sufijoHora}`;
        else if (diffDias >= 7 || diffDias <= -7) return `${dia}/${mes}${sufijoHora}`;
        
        return `${diasAbrev[date.getDay()]} ${dia}${sufijoHora}`;
    } catch (e) {
        console.warn('⚠️ Error en formatearFechaInteligente:', e);
        return '—';
    }
}

window.fechaLocalYYYYMMDD = fechaLocalYYYYMMDD;
window.hoyYYYYMMDD = hoyYYYYMMDD;
window.mananaYYYYMMDD = mananaYYYYMMDD;
window.formatearFechaConDiaSemana = formatearFechaConDiaSemana;
window.formatearFechaYYYYMMDD = formatearFechaYYYYMMDD;
window.formatearFechaInteligente = formatearFechaInteligente;

// ============================================================
// HELPER: Cerrar todos los modales (respaldo si modal.js no cargó)
// ============================================================

function cerrarTodosLosModalesRespaldo() {
    const modalesACerrar = [
        'custom-modal', 'order-modal', 'order-view-modal', 'add-product-modal',
        'insumo-modal', 'recipe-modal', 'recipe-view-modal', 'producto-modal',
        'sale-modal', 'sale-view-modal', 'expense-modal', 'expense-view-modal',
        'corriente-modal', 'horario-detalle-modal', 'waiting-processing-modal',
        'multi-order-modal', 'multi-add-product-modal', 'notifications-modal',
        'help-menu-modal', 'readme-modal', 'credits-modal', 'faq-modal',
        'quickstart-modal', 'users-modal', 'delete-selector-modal',
        'sales-report-modal', 'orders-report-modal', 'expenses-report-modal',
        'recalcular-modal', 'compartir-modal', 'edit-bank-account-modal',
        'bank-accounts-modal', 'qr-view-modal',
        'tour-overlay', 'tour-highlight', 'tour-tooltip',
        'waiting-manager-modal', 'global-cancel-modal',
        'help-popover', 'ayuda-modal', 'dias-sin-ventas-modal',
        'dia-sin-venta-form-modal', 'reprogramar-modal',
        'debt-detail-modal'
    ];
    
    let cerrados = 0;
    for (const id of modalesACerrar) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 200);
            setTimeout(() => {
                const still = document.getElementById(id);
                if (still && still.parentNode) still.parentNode.removeChild(still);
            }, 400);
            cerrados++;
        }
    }
    
    window._modalResolve = null;
    window._modalResolved = false;
    
    console.log(`🔧 cerrarTodosLosModalesRespaldo(): ${cerrados} modales cerrados`);
    return cerrados;
}

// ============================================================
// 🆕 v3.0.0: ABRIR AYUDA DETALLADA (actualizado)
// ============================================================

function openDetailedHelp() {
    try {
        console.log('📖 openDetailedHelp() → delegando en HelpModule');
        
        if (window.HelpModule && typeof window.HelpModule.abrirAyudaDetallada === 'function') {
            window.HelpModule.abrirAyudaDetallada();
        } else {
            console.warn('⚠️ HelpModule no disponible, abriendo en pestaña nueva');
            window.open('./index.html?standalone=1', '_blank', 'noopener,noreferrer');
        }
    } catch (e) {
        console.warn('⚠️ Error abriendo ayuda detallada:', e);
        if (window.showToast) {
            window.showToast('❌ No se pudo abrir la ayuda detallada', 'error', 4000);
        }
    }
}

window.openDetailedHelp = openDetailedHelp;

// ============================================================
// 🆕 v2.2.3: NAVEGACIÓN CON FILTROS (Corrección #19)
// ============================================================

function navigateWithFilters(section, filters) {
    try {
        console.log(`🧭 navigateWithFilters('${section}',`, filters, `)`);
        
        if (section === 'orders') {
            window._pendingOrderFilters = filters || {};
        } else if (section === 'sales') {
            window._pendingSalesFilters = filters || {};
        }
        
        navigate(section);
    } catch (e) {
        console.error('❌ Error en navigateWithFilters:', e);
        navigate(section);
    }
}

window.navigateWithFilters = navigateWithFilters;

// ============================================================
// 🆕 v3.0.0: INICIALIZACIÓN CON DETECCIÓN DE ?standalone=1
// ============================================================

async function initApp() {
    try {
        const version = getAppVersion();
        console.log(`🚀 Iniciando Panario v${version}...`);
        
        if (typeof window.limpiarEstilosResiduales === 'function') {
            window.limpiarEstilosResiduales();
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        const standaloneParam = urlParams.get('standalone');
        
        if (standaloneParam === '1') {
            console.log('📖 [v3.1.2] Modo standalone detectado → renderizando SOLO la ayuda');
            
            setTimeout(() => {
                if (window.HelpModule && typeof window.HelpModule.renderAyudaStandalone === 'function') {
                    window.HelpModule.renderAyudaStandalone();
                    console.log('✅ [v3.1.2] Ayuda standalone renderizada');
                } else {
                    console.error('❌ [v3.1.2] HelpModule.renderAyudaStandalone no disponible');
                    document.body.innerHTML = `
                        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; font-family: system-ui, sans-serif;">
                            <div>
                                <div style="font-size: 64px; margin-bottom: 16px;">❌</div>
                                <h1 style="margin: 0 0 8px 0;">Error</h1>
                                <p style="color: #666;">No se pudo cargar el módulo de ayuda.</p>
                                <a href="./index.html" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #f5a623; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">← Volver a Panario</a>
                            </div>
                        </div>
                    `;
                }
            }, 300);
            
            return;
        }
        
        const refreshParam = urlParams.get('refresh');
        
        if (refreshParam) {
            console.log('🔄 Detectado parámetro refresh:', refreshParam);
            const cleanUrl = window.location.href.split('?')[0];
            window.history.replaceState({}, document.title, cleanUrl);
        }
        
        if (typeof window.initSqlJs === 'undefined') {
            console.error('❌ SQL.js no está cargado.');
            const errorEl = document.getElementById('loginError');
            if (errorEl) {
                errorEl.textContent = '❌ Error: SQL.js no cargado. Revisa la consola.';
            }
            return;
        }
        
        console.log('✅ SQL.js cargado correctamente');
        
        console.log('⏳ Inicializando base de datos...');
        await window.DBModule.initDB();
        console.log('✅ Base de datos lista');
        
        if (refreshParam) {
            console.log('🔄 Forzando recarga de BD después de importación...');
            if (window.DBModule.forceReloadFromStorage) {
                const result = window.DBModule.forceReloadFromStorage();
                if (result) {
                    console.log('✅ BD recargada correctamente tras importación');
                    setTimeout(() => {
                        window.showToast('✅ Datos importados correctamente', 'success', 4000);
                    }, 800);
                } else {
                    console.error('❌ No se pudo recargar la BD tras importación');
                    setTimeout(() => {
                        window.showToast('⚠️ No se pudo recargar la BD. Recarga manualmente.', 'warning', 6000);
                    }, 800);
                }
            }
        }

        await window.ThemeModule.initTheme();

        const user = window.AuthModule.getCurrentUser();
        if (user) {
            currentUser = user;
            // 🆕 v3.1.1: showApp() ahora se encarga de TODO (UI + notificaciones)
            showApp(user);
            
            if (window.RewardsModule) {
                setTimeout(() => {
                    window.RewardsModule.checkRewardsNotification();
                }, 3000);
            }
            
            const guiaDeshabilitada = localStorage.getItem('panario_guia_deshabilitada') === 'true';
            if (!guiaDeshabilitada) {
                const tourCompleted = localStorage.getItem('panario_tour_completed');
                if (!tourCompleted) {
                    setTimeout(() => {
                        if (window.HelpModule) {
                            window.HelpModule.showQuickStartGuide();
                        }
                    }, 2000);
                }
            }
        }
        
        const lastUser = window.AuthModule.getLastUser();
        if (lastUser) {
            const loginUserInput = document.getElementById('loginUser');
            if (loginUserInput) {
                loginUserInput.value = lastUser;
                const loginPassInput = document.getElementById('loginPass');
                if (loginPassInput) {
                    setTimeout(() => loginPassInput.focus(), 300);
                }
            }
        }
        
        setupEventListeners();
        createScrollButtons();
        setupDbSavedListener();
        
        startHeaderCleanupWatchers();
        forzarStickyHeader();
        
        setTimeout(adjustForSafeArea, 500);

        console.log(`✅ App inicializada correctamente (v${version})`);
        console.log(`   🔧 [v3.1.2] Corrección N5: tarjeta de promedio diario`);

    } catch (error) {
        console.error('❌ Error inicializando app:', error);
        const errorEl = document.getElementById('loginError');
        if (errorEl) {
            errorEl.textContent = '❌ Error al cargar la aplicación: ' + error.message;
        }
    }
}

// ============================================================
// FASE 1.4: LISTENER PARA 'db-saved' CON DEBOUNCE
// ============================================================

function setupDbSavedListener() {
    document.addEventListener('db-saved', function() {
        if (!window.AuthModule.getCurrentUser()) return;
        
        const currentSection = document.querySelector('.nav-item.active')?.dataset?.section;
        if (!currentSection || currentSection === 'profile') return;
        
        debouncedRefreshCurrentView();
    });
    
    console.log('🔄 [debounce] Listener db-saved registrado con debounce de', DB_SAVED_DEBOUNCE_MS, 'ms');
}

function refreshCurrentView() {
    const currentSection = document.querySelector('.nav-item.active')?.dataset?.section;
    if (!currentSection) return;
    
    console.log('🔄 Refrescando vista actual:', currentSection);
    
    switch(currentSection) {
        case 'dashboard':
            if (typeof window.renderDashboardView === 'function') {
                window.renderDashboardView();
            }
            break;
        case 'orders':
            if (typeof window.renderOrdersView === 'function') {
                window.renderOrdersView();
            }
            break;
        case 'insumos':
            if (typeof window.renderInsumosView === 'function') {
                window.renderInsumosView();
            }
            break;
        case 'recipes':
            if (typeof window.renderRecipesView === 'function') {
                window.renderRecipesView();
            }
            break;
        case 'productos':
            if (typeof window.renderProductosView === 'function') {
                window.renderProductosView();
            }
            break;
        case 'sales':
            if (typeof window.renderSalesView === 'function') {
                window.renderSalesView();
            }
            break;
        case 'settings':
            if (typeof window.renderSettingsView === 'function') {
                window.renderSettingsView();
            }
            break;
        default:
            console.log('ℹ️ Vista sin refresco específico:', currentSection);
    }
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');

    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    if (registerBtn) registerBtn.addEventListener('click', handleRegister);
    if (showRegisterBtn) showRegisterBtn.addEventListener('click', () => toggleAuthForms('register'));
    if (showLoginBtn) showLoginBtn.addEventListener('click', () => toggleAuthForms('login'));

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.section));
    });

    const loginPass = document.getElementById('loginPass');
    const regPass = document.getElementById('regPass');
    if (loginPass) loginPass.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    if (regPass) regPass.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleRegister();
    });

    document.addEventListener('click', function(e) {
        const menu = document.getElementById('userMenu');
        const userDisplay = document.getElementById('userDisplay');
        if (menu && userDisplay && !userDisplay.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = 'none';
        }
    });
    
    window.addEventListener('resize', adjustForSafeArea);
    window.addEventListener('orientationchange', function() {
        setTimeout(adjustForSafeArea, 300);
    });
}

// ============================================================
// AJUSTE DE SAFE AREA
// ============================================================

function adjustForSafeArea() {
    const main = document.getElementById('mainContent');
    const bottomNav = document.querySelector('.bottom-nav');
    if (!main) return;
    
    const navHeight = bottomNav ? bottomNav.offsetHeight : 68;
    
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isSamsung = userAgent.includes('samsung');
    const isAndroid = userAgent.includes('android');
    
    let extraPadding = 80;
    
    if (isSamsung) {
        extraPadding = 180;
    } else if (isAndroid) {
        const screenHeight = window.screen.height;
        const windowHeight = window.innerHeight;
        const diff = screenHeight - windowHeight;
        extraPadding = diff > 50 ? 140 : 80;
    }
    
    let safeBottom = 0;
    try {
        const computedStyle = window.getComputedStyle(document.documentElement);
        const safeAreaValue = computedStyle.getPropertyValue('--safe-area-inset-bottom');
        if (safeAreaValue && safeAreaValue !== '0px') {
            safeBottom = parseFloat(safeAreaValue) || 0;
        }
    } catch (e) {}
    
    const totalPadding = navHeight + extraPadding + safeBottom;
    main.style.paddingBottom = totalPadding + 'px';
    
    const scrollButtons = document.querySelector('.scroll-buttons');
    if (scrollButtons) {
        scrollButtons.style.bottom = (navHeight + 40 + safeBottom) + 'px';
    }
}

// ============================================================
// BOTONES FLOTANTES DE SCROLL
// ============================================================

function createScrollButtons() {
    if (document.querySelector('.scroll-buttons')) return;
    
    const container = document.createElement('div');
    container.className = 'scroll-buttons';
    container.innerHTML = `
        <button class="scroll-btn" onclick="scrollToTop()" title="Ir al inicio">⬆</button>
        <button class="scroll-btn" onclick="scrollToBottom()" title="Ir al final">⬇</button>
    `;
    document.body.appendChild(container);
    
    setTimeout(adjustForSafeArea, 100);
}

function scrollToTop() {
    const main = document.getElementById('mainContent');
    if (main) {
        main.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function scrollToBottom() {
    const main = document.getElementById('mainContent');
    if (main) {
        main.scrollTo({ top: main.scrollHeight, behavior: 'smooth' });
    } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
}

window.scrollToTop = scrollToTop;
window.scrollToBottom = scrollToBottom;
window.adjustForSafeArea = adjustForSafeArea;

// ============================================================
// AUTENTICACIÓN
// ============================================================

function toggleAuthForms(show) {
    const login = document.getElementById('loginForm');
    const register = document.getElementById('registerForm');
    
    if (!login || !register) return;
    
    if (show === 'register') {
        login.style.display = 'none';
        register.style.display = 'flex';
        const errorEl = document.getElementById('registerError');
        if (errorEl) errorEl.textContent = '';
    } else {
        login.style.display = 'flex';
        register.style.display = 'none';
        const errorEl = document.getElementById('loginError');
        if (errorEl) errorEl.textContent = '';
    }
}

async function handleLogin() {
    console.log('🔑 Intentando login...');
    
    if (!isDbReady()) {
        const errorEl = document.getElementById('loginError');
        if (errorEl) errorEl.textContent = '⏳ Esperando que la base de datos esté lista...';
        return;
    }

    const username = document.getElementById('loginUser');
    const password = document.getElementById('loginPass');
    const errorEl = document.getElementById('loginError');

    if (!username || !password || !errorEl) return;

    const userVal = username.value.trim();
    const passVal = password.value.trim();

    if (!userVal || !passVal) {
        errorEl.textContent = '⚠️ Completa todos los campos';
        return;
    }

    errorEl.textContent = '⏳ Iniciando sesión...';
    
    try {
        const result = await window.AuthModule.loginUser(userVal, passVal);
        
        if (result.success) {
            currentUser = result.user;
            window.AuthModule.setCurrentUser(result.user);
            await window.ThemeModule.initTheme();
            showApp(result.user);
        } else {
            errorEl.textContent = result.error || '❌ Error al iniciar sesión';
        }
    } catch (error) {
        console.error('❌ Error en login:', error);
        errorEl.textContent = '❌ Error al iniciar sesión: ' + error.message;
    }
}

async function handleRegister() {
    console.log('📝 Intentando registro...');
    
    if (!isDbReady()) {
        const errorEl = document.getElementById('registerError');
        if (errorEl) errorEl.textContent = '⏳ Esperando que la base de datos esté lista...';
        return;
    }

    const username = document.getElementById('regUser');
    const password = document.getElementById('regPass');
    const name = document.getElementById('regName');
    const business = document.getElementById('regBusiness');
    const codigo = document.getElementById('regCodigo');
    const errorEl = document.getElementById('registerError');

    if (!username || !password || !name || !errorEl) return;

    const modeRadio = document.querySelector('input[name="negocioMode"]:checked');
    const negocioMode = modeRadio ? modeRadio.value : 'crear';

    const userVal = username.value.trim();
    const passVal = password.value.trim();
    const nameVal = name.value.trim();
    const businessVal = business ? business.value.trim() : '';
    const codigoVal = codigo ? codigo.value.trim().toUpperCase() : '';

    if (!userVal || !passVal || !nameVal) {
        errorEl.textContent = '⚠️ Completa todos los campos obligatorios';
        return;
    }

    if (passVal.length < 4) {
        errorEl.textContent = '⚠️ La contraseña debe tener al menos 4 caracteres';
        return;
    }

    if (negocioMode === 'crear') {
        if (!businessVal) {
            errorEl.textContent = '⚠️ Ingresa el nombre del negocio';
            return;
        }
    } else if (negocioMode === 'unirse') {
        if (!codigoVal) {
            errorEl.textContent = '⚠️ Ingresa el código de invitación';
            return;
        }
        if (codigoVal.length !== 8) {
            errorEl.textContent = '⚠️ El código debe tener 8 caracteres';
            return;
        }
        const validacion = window.AuthModule.validarCodigoInvitacion(codigoVal);
        if (!validacion.valid) {
            errorEl.textContent = '❌ Código de invitación inválido';
            return;
        }
    }

    errorEl.textContent = '⏳ Creando cuenta...';
    
    try {
        const result = await window.AuthModule.registerUser(
            userVal, passVal, nameVal, businessVal,
            negocioMode, codigoVal
        );
        
        if (result.success) {
            let msg = '';
            if (negocioMode === 'crear') {
                msg = `✅ Negocio "${result.negocioNombre}" creado. Código: ${result.codigo}`;
            } else {
                msg = `✅ Te has unido al negocio "${result.negocioNombre}"`;
            }
            console.log(msg);
            
            errorEl.textContent = '✅ Cuenta creada. Iniciando sesión...';
            
            const loginResult = await window.AuthModule.loginUser(userVal, passVal);
            if (loginResult.success) {
                currentUser = loginResult.user;
                window.AuthModule.setCurrentUser(loginResult.user);
                await window.ThemeModule.initTheme();
                showApp(loginResult.user);
            }
        } else {
            errorEl.textContent = result.error || '❌ Error al crear cuenta';
        }
    } catch (error) {
        console.error('❌ Error en registro:', error);
        errorEl.textContent = '❌ Error al registrar: ' + error.message;
    }
}

// ============================================================
// CIERRE DE SESIÓN
// ============================================================

async function handleLogout() {
    const confirm = await window.ModalModule.showConfirm({
        title: 'Cerrar sesión',
        message: '¿Seguro que quieres cerrar sesión?',
        confirmText: 'Sí, cerrar sesión',
        cancelText: 'Cancelar',
        icon: '🚪',
        confirmColor: '#ef4444'
    });

    if (confirm) {
        const LOG_PREFIX = '🚪 [handleLogout v3.1.2]';
        console.log(`${LOG_PREFIX} Cerrando sesión...`);
        
        try {
            try {
                window.DBModule.saveDatabase();
                console.log(`${LOG_PREFIX} ✅ BD guardada`);
            } catch (e) {
                console.warn(`${LOG_PREFIX} ⚠️ Error guardando BD:`, e.message);
            }
            
            try {
                if (window.NotificationsModule && 
                    typeof window.NotificationsModule.cleanupNotificationsResources === 'function') {
                    const cleanupResult = window.NotificationsModule.cleanupNotificationsResources();
                    console.log(`${LOG_PREFIX} ✅ Recursos de notificaciones limpiados:`, cleanupResult);
                } else {
                    console.log(`${LOG_PREFIX} ℹ️ cleanupNotificationsResources no disponible, se omite`);
                }
            } catch (e) {
                console.warn(`${LOG_PREFIX} ⚠️ Error limpiando notificaciones:`, e.message);
            }
            
            try {
                sessionStorage.removeItem('panario_user');
                localStorage.removeItem('panario-theme');
                console.log(`${LOG_PREFIX} ✅ Sesión y tema limpiados`);
            } catch (e) {
                console.warn(`${LOG_PREFIX} ⚠️ Error limpiando storage:`, e.message);
            }
            
            currentUser = null;
            document.title = 'Panario - Panadería Artesanal';
            
            console.log(`${LOG_PREFIX} ✅ Todo limpio, recargando página...`);
            
            setTimeout(() => {
                window.location.reload(true);
            }, 200);
            
        } catch (e) {
            console.error(`${LOG_PREFIX} ❌ Error durante logout:`, e);
            setTimeout(() => {
                window.location.reload(true);
            }, 100);
        }
    }
}

// ============================================================
// MENÚ DE USUARIO
// ============================================================

function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

function updateUserMenuInfo(user) {
    if (!user) return;
    
    const userNameEl = document.getElementById('menuUserName');
    const userEmailEl = document.getElementById('menuUserEmail');
    const userNameDisplay = document.getElementById('userNameDisplay');
    
    if (userNameEl) userNameEl.textContent = user.name || user.username;
    if (userEmailEl) userEmailEl.textContent = user.email || 'Sin email configurado';
    if (userNameDisplay) userNameDisplay.textContent = user.name ? user.name.split(' ')[0] : user.username;
}

function updateTopBarAvatar(photoData) {
    const userDisplay = document.getElementById('userDisplay');
    if (!userDisplay) return;
    
    const user = window.AuthModule.getCurrentUser();
    if (!user) return;
    
    const displayName = user.name ? user.name.split(' ')[0] : user.username;
    
    if (photoData && photoData.startsWith('data:image')) {
        userDisplay.innerHTML = `
            <span style="display:inline-flex;align-items:center;gap:6px;">
                <span style="display:inline-block;width:24px;height:24px;border-radius:50%;overflow:hidden;vertical-align:middle;border:1px solid var(--border-color);">
                    <img src="${photoData}" style="width:100%;height:100%;object-fit:cover;">
                </span>
                <span id="userNameDisplay">${displayName}</span>
            </span>
        `;
    } else {
        userDisplay.innerHTML = `
            <span style="display:inline-flex;align-items:center;gap:6px;">
                <span style="font-size:18px;">👤</span>
                <span id="userNameDisplay">${displayName}</span>
            </span>
        `;
    }
}

// ============================================================
// MOSTRAR APP
// ============================================================
// 
// 🆕 v3.1.1: Esta función es el ÚNICO punto donde se arranca
// el sistema de notificaciones. Se llama tanto en login fresco
// (desde handleLogin/handleRegister) como en recarga con sesión
// activa (desde initApp).
// ============================================================

function showApp(user) {
    console.log('👤 Mostrando app para:', user.username);
    
    if (typeof window.limpiarEstilosResiduales === 'function') {
        window.limpiarEstilosResiduales();
    }
    
    const authScreen = document.getElementById('authScreen');
    const appScreen = document.getElementById('appScreen');
    const userDisplay = document.getElementById('userDisplay');
    const userNameDisplay = document.getElementById('userNameDisplay');
    
    if (authScreen) authScreen.classList.remove('active');
    if (appScreen) appScreen.classList.add('active');
    
    if (userNameDisplay) {
        userNameDisplay.textContent = user.name ? user.name.split(' ')[0] : user.username;
    }
    
    if (userDisplay) {
        if (user.photo && user.photo.startsWith('data:image')) {
            userDisplay.innerHTML = `
                <span style="display:inline-flex;align-items:center;gap:6px;">
                    <span style="display:inline-block;width:24px;height:24px;border-radius:50%;overflow:hidden;vertical-align:middle;border:1px solid var(--border-color);">
                        <img src="${user.photo}" style="width:100%;height:100%;object-fit:cover;">
                    </span>
                    <span id="userNameDisplay">${user.name ? user.name.split(' ')[0] : user.username}</span>
                </span>
            `;
        } else {
            userDisplay.innerHTML = `
                <span style="display:inline-flex;align-items:center;gap:6px;">
                    <span style="font-size:18px;">👤</span>
                    <span id="userNameDisplay">${user.name ? user.name.split(' ')[0] : user.username}</span>
                </span>
            `;
        }
    }
    
    updateUserMenuInfo(user);
    updateDocumentTitle();
    updateAppHeader();
    
    setTimeout(forzarStickyHeader, 100);
    
    // ============================================================
    // 🆕 v3.1.1: ARRANQUE DE NOTIFICACIONES (FIX)
    // ============================================================
    try {
        if (window.NotificationsModule) {
            if (typeof window.NotificationsModule.reinitAfterLogin === 'function') {
                window.NotificationsModule.reinitAfterLogin();
            }
            
            if (typeof window.NotificationsModule.startReminderSystem === 'function') {
                window.NotificationsModule.startReminderSystem();
                console.log('🔔 [v3.1.2] startReminderSystem() llamado desde showApp()');
            } else {
                console.warn('⚠️ [v3.1.2] NotificationsModule.startReminderSystem no disponible');
            }
            
            setTimeout(() => {
                if (typeof window.NotificationsModule.requestNotificationPermission === 'function') {
                    window.NotificationsModule.requestNotificationPermission();
                }
            }, 5000);
        } else {
            console.warn('⚠️ [v3.1.2] NotificationsModule no disponible');
        }
    } catch (e) {
        console.warn('⚠️ [v3.1.2] Error en inicialización de notificaciones:', e.message);
    }
    
    document.dispatchEvent(new CustomEvent('panario:logged-in'));
    
    navigate('dashboard');
    
    setTimeout(() => {
        if (typeof window.limpiarEstilosResiduales === 'function') {
            window.limpiarEstilosResiduales();
        }
        forzarStickyHeader();
    }, 200);
}

function updateDocumentTitle() {
    try {
        const nombreNegocio = getNombreNegocio();
        if (nombreNegocio && nombreNegocio !== 'Panario') {
            document.title = `${nombreNegocio} - Panario`;
        } else {
            document.title = 'Panario - Panadería Artesanal';
        }
        console.log('📑 Título actualizado:', document.title);
    } catch (e) {
        console.warn('⚠️ Error actualizando título:', e);
    }
}

function updateAppHeader() {
    try {
        const header = document.querySelector('#appScreen header h1');
        if (!header) return;
        
        const nombreNegocio = getNombreNegocio();
        
        if (nombreNegocio && nombreNegocio !== 'Panario') {
            const nombreMostrar = nombreNegocio.length > 20 
                ? nombreNegocio.substring(0, 18) + '…' 
                : nombreNegocio;
            
            header.innerHTML = `🍞 ${nombreMostrar}`;
            header.setAttribute('title', `Panario - ${nombreNegocio}`);
            header.style.cursor = 'default';
        } else {
            header.innerHTML = `🍞 Panario`;
            header.setAttribute('title', 'Panario - Panadería Artesanal');
        }
    } catch (e) {
        console.warn('⚠️ Error actualizando header:', e);
    }
}

window.updateDocumentTitle = updateDocumentTitle;
window.updateAppHeader = updateAppHeader;

// ============================================================
// NAVEGACIÓN
// ============================================================

function navigate(section) {
    console.log('🧭 Navegando a:', section);
    
    if (typeof window.limpiarEstilosResiduales === 'function') {
        window.limpiarEstilosResiduales();
    }
    
    forzarStickyHeader();
    
    if (window.HelpModule && window.HelpModule.cerrarPopoverAyuda) {
        try { window.HelpModule.cerrarPopoverAyuda(); } catch (e) {}
    }
    
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (btn) btn.classList.add('active');

    const main = document.getElementById('mainContent');
    if (!main) return;
    
    const user = window.AuthModule.getCurrentUser();
    
    const menu = document.getElementById('userMenu');
    if (menu) menu.style.display = 'none';
    
    switch(section) {
        case 'dashboard':
            renderDashboardView();
            break;
        case 'orders':
            if (typeof window.renderOrdersView === 'function') {
                window.renderOrdersView();
            } else {
                main.innerHTML = `<div class="card"><h2>📋 Pedidos</h2><p>Cargando módulo de pedidos...</p></div>`;
                if (!document.querySelector('script[src="js/ui-orders.js"]')) {
                    const script = document.createElement('script');
                    script.src = 'js/ui-orders.js';
                    script.onload = () => {
                        if (typeof window.renderOrdersView === 'function') window.renderOrdersView();
                    };
                    document.head.appendChild(script);
                }
            }
            break;
        case 'insumos':
            if (typeof window.renderInsumosView === 'function') {
                window.renderInsumosView();
            } else {
                main.innerHTML = `<div class="card"><h2>🛒 Insumos</h2><p>Cargando módulo de insumos...</p></div>`;
                if (!document.querySelector('script[src="js/ui-insumos.js"]')) {
                    const script = document.createElement('script');
                    script.src = 'js/ui-insumos.js';
                    script.onload = () => {
                        if (typeof window.renderInsumosView === 'function') window.renderInsumosView();
                    };
                    document.head.appendChild(script);
                }
            }
            break;
        case 'recipes':
            if (typeof window.renderRecipesView === 'function') {
                window.renderRecipesView();
            } else {
                main.innerHTML = `<div class="card"><h2>📖 Recetas</h2><p>Cargando módulo de recetas...</p></div>`;
                if (!document.querySelector('script[src="js/ui-recipes.js"]')) {
                    const script = document.createElement('script');
                    script.src = 'js/ui-recipes.js';
                    script.onload = () => {
                        if (typeof window.renderRecipesView === 'function') window.renderRecipesView();
                    };
                    document.head.appendChild(script);
                }
            }
            break;
        case 'productos':
            if (typeof window.renderProductosView === 'function') {
                window.renderProductosView();
            } else {
                main.innerHTML = `<div class="card"><h2>🏷️ Productos</h2><p>Cargando módulo de productos...</p></div>`;
                if (!document.querySelector('script[src="js/ui-productos.js"]')) {
                    const script = document.createElement('script');
                    script.src = 'js/ui-productos.js';
                    script.onload = () => {
                        if (typeof window.renderProductosView === 'function') window.renderProductosView();
                    };
                    document.head.appendChild(script);
                }
            }
            break;
        case 'sales':
            if (typeof window.renderSalesView === 'function') {
                window.renderSalesView();
            } else {
                main.innerHTML = `<div class="card"><h2>💰 Ventas</h2><p>Cargando módulo de ventas...</p></div>`;
                if (!document.querySelector('script[src="js/ui-sales.js"]')) {
                    const script = document.createElement('script');
                    script.src = 'js/ui-sales.js';
                    script.onload = () => {
                        if (typeof window.renderSalesView === 'function') window.renderSalesView();
                    };
                    document.head.appendChild(script);
                }
            }
            break;
        case 'settings':
            if (typeof window.renderSettingsView === 'function') {
                window.renderSettingsView();
            } else {
                main.innerHTML = `<div class="card"><h2>⚙️ Herramientas</h2><p>Cargando módulo de herramientas...</p></div>`;
                if (!document.querySelector('script[src="js/ui-settings.js"]')) {
                    const script = document.createElement('script');
                    script.src = 'js/ui-settings.js';
                    script.onload = () => {
                        if (typeof window.renderSettingsView === 'function') window.renderSettingsView();
                    };
                    document.head.appendChild(script);
                }
            }
            break;
        case 'profile':
            window.loadProfile(user);
            break;
        default:
            main.innerHTML = `<div class="card"><h2>🔧 En construcción</h2><p>Esta sección está en desarrollo.</p></div>`;
    }
    
    setTimeout(adjustForSafeArea, 300);
    
    setTimeout(() => {
        if (typeof window.limpiarEstilosResiduales === 'function') {
            window.limpiarEstilosResiduales();
        }
        forzarStickyHeader();
    }, 400);
}

// ============================================================
// HELPERS DE CORRIENTE
// ============================================================
// 
// 🆕 v3.1.0: CORRECCIÓN #8 - Toggle "Mostrar producción de HOY/MAÑANA"
// ============================================================

function renderTarjetaCorrienteHoy() {
    if (!window.CorrienteUtils) return '';
    
    try {
        const hoy = hoyYYYYMMDD();
        const manana = mananaYYYYMMDD();
        const resumen = window.CorrienteUtils.getResumen(hoy);
        
        if (!resumen.tieneCorriente) return '';
        
        let configGlobal = { mostrar_produccion_hoy: false };
        try {
            if (typeof window.getConfigGlobalNegocio === 'function') {
                configGlobal = window.getConfigGlobalNegocio();
            } else if (window.DBModule && typeof window.DBModule.getConfigGlobalNegocio === 'function') {
                configGlobal = window.DBModule.getConfigGlobalNegocio();
            }
        } catch (e) {
            console.warn('⚠️ [renderTarjetaCorrienteHoy v3.1.2] Error leyendo config global:', e);
        }
        
        const mostrarHoy = configGlobal.mostrar_produccion_hoy === true 
            || configGlobal.mostrar_produccion_hoy === 1;
        
        const fechaProduccion = mostrarHoy ? hoy : manana;
        const etiquetaProduccion = mostrarHoy ? 'HOY' : 'MAÑANA';
        
        console.log(`📅 [renderTarjetaCorrienteHoy v3.1.2] Mostrar producción de: ${etiquetaProduccion} (${fechaProduccion})`);
        
        let prodConfig = null;
        try {
            if (window.DBModule && typeof window.DBModule.getProduccionByFecha === 'function') {
                prodConfig = window.DBModule.getProduccionByFecha(fechaProduccion);
            }
        } catch (e) {
            console.warn('⚠️ [renderTarjetaCorrienteHoy v3.1.2] Error leyendo producción:', e);
        }
        
        const bloqueProduccion = prodConfig ? {
            bloqueIndex: parseInt(prodConfig.bloque_index) || null,
            esDiaAnterior: prodConfig.es_bloque_dia_anterior === 1,
            horaInicio: prodConfig.hora_inicio,
            horaFin: prodConfig.hora_fin
        } : null;
        
        const ahora = new Date();
        let proximoBloque = null;
        let bloqueActual = null;
        
        for (const b of resumen.bloques) {
            if (ahora >= b.inicio && ahora <= b.fin) {
                bloqueActual = b;
            } else if (ahora < b.inicio) {
                proximoBloque = b;
                break;
            }
        }
        
        let proximoBloqueGlobal = proximoBloque;
        if (!proximoBloque && !bloqueActual && window.CorrienteUtils.getProximoBloque) {
            try {
                proximoBloqueGlobal = window.CorrienteUtils.getProximoBloque(ahora);
            } catch (e) {
                console.warn('⚠️ Error buscando próximo bloque global:', e);
            }
        }
        
        const bloquesHTML = resumen.bloques.map((b, i) => {
            const texto = b.cruzaMedianoche
                ? `${b.inicioStr} → ${b.finStr} (${window.CorrienteUtils.getDiaSemana(b.fin, true).toLowerCase()})`
                : `${b.inicioStr} - ${b.finStr}`;
            
            const esActual = bloqueActual && b.inicio.getTime() === bloqueActual.inicio.getTime();
            
            const bloqueIndexHoy = i + 1;
            const esProduccion = mostrarHoy 
                && bloqueProduccion 
                && !bloqueProduccion.esDiaAnterior 
                && bloqueProduccion.bloqueIndex === bloqueIndexHoy;
            
            let fondo, borde, colorTexto, icono, badges = '';
            
            if (esProduccion) {
                fondo = '#10b98125';
                borde = '#10b981';
                colorTexto = '#10b981';
                icono = '🔨';
                badges += '<span style="font-size: 10px; color: #10b981; background: #10b98125; padding: 2px 8px; border-radius: 8px; margin-left: auto; font-weight: 700; border: 1px solid #10b981;">🔨 PRODUCCIÓN</span>';
            } else if (esActual) {
                fondo = '#10b98115';
                borde = '#10b981';
                colorTexto = '#10b981';
                icono = '🟢';
                badges += '<span style="font-size: 10px; color: #10b981; background: #10b98120; padding: 1px 6px; border-radius: 8px; margin-left: auto;">EN CURSO</span>';
            } else {
                fondo = '#f59e0b10';
                borde = '#f59e0b';
                colorTexto = '#f59e0b';
                icono = '⚡';
            }
            
            const borderStyle = esProduccion ? '2px solid' : '1px solid';
            
            return `
                <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: ${fondo}; border-radius: 6px; margin-bottom: 4px; border-left: 4px solid ${borde}; border: ${borderStyle} ${borde}40;">
                    <span style="font-size: 16px;">${icono}</span>
                    <span style="font-size: 13px; font-weight: 600; color: ${colorTexto};">${texto}</span>
                    ${badges}
                </div>
            `;
        }).join('');
        
        let bloqueAyerHTML = '';
        if (mostrarHoy && bloqueProduccion && bloqueProduccion.esDiaAnterior) {
            const textoAyer = `${bloqueProduccion.horaInicio} - ${bloqueProduccion.horaFin}`;
            bloqueAyerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #8b5cf615; border-radius: 6px; margin-bottom: 4px; border-left: 4px solid #8b5cf6; border: 2px dashed #8b5cf6;">
                    <span style="font-size: 16px;">🌙</span>
                    <div style="flex: 1;">
                        <span style="font-size: 13px; font-weight: 600; color: #8b5cf6;">${textoAyer}</span>
                        <div style="font-size: 10px; color: #8b5cf6; opacity: 0.8; margin-top: 2px;">Bloque del día anterior (producción para hoy)</div>
                    </div>
                    <span style="font-size: 10px; color: #8b5cf6; background: #8b5cf625; padding: 2px 8px; border-radius: 8px; font-weight: 700; border: 1px solid #8b5cf6;">🔨 PRODUCCIÓN</span>
                </div>
            `;
        }
        
        let estadoActualHTML = '';
        
        if (bloqueActual) {
            estadoActualHTML = `
                <div style="background: #10b98115; border: 1px solid #10b981; border-radius: 8px; padding: 6px 12px; margin-bottom: 8px; font-size: 12px; color: #10b981; text-align: center; font-weight: 600;">
                    ⚡ Corriente ACTIVA ahora
                </div>
            `;
        } else if (proximoBloqueGlobal) {
            const inicio = proximoBloqueGlobal.inicio;
            const horaStr = window.CorrienteUtils.formatearHora12h(inicio);
            const fechaInteligente = formatearFechaInteligente(inicio, horaStr);
            
            estadoActualHTML = `
                <div style="background: #f59e0b15; border: 1px solid #f59e0b; border-radius: 8px; padding: 6px 12px; margin-bottom: 8px; font-size: 12px; color: #f59e0b; text-align: center;">
                    ⏰ Próximo bloque: <strong>${fechaInteligente}</strong>
                </div>
            `;
        }
        
        const fechaConDia = formatearFechaConDiaSemana(new Date());
        
        let produccionResumenHTML = '';
        if (prodConfig) {
            const cantidadProd = parseFloat(prodConfig.cantidad_produccion) || 0;
            const productoNombre = prodConfig.producto_id && window.DBModule.getProducto 
                ? (window.DBModule.getProducto(prodConfig.producto_id)?.nombre || null)
                : null;
            
            let conteo = { pedidos: 0, ventas: 0, disponibles: null };
            try {
                if (typeof window.contarPedidosYVentasFecha === 'function') {
                    conteo = window.contarPedidosYVentasFecha(fechaProduccion);
                } else if (window.DBModule && typeof window.DBModule.contarPedidosYVentasFecha === 'function') {
                    conteo = window.DBModule.contarPedidosYVentasFecha(fechaProduccion);
                }
            } catch (e) {
                console.warn('⚠️ [renderTarjetaCorrienteHoy v3.1.2] Error en conteo:', e);
            }
            
            const fmt = (n) => (typeof window.formatearCantidadProduccion === 'function') 
                ? window.formatearCantidadProduccion(n) 
                : n;
            
            const colorEtiqueta = mostrarHoy ? '#10b981' : '#3b82f6';
            const bgEtiqueta = mostrarHoy ? '#10b98125' : '#3b82f625';
            const iconoEtiqueta = mostrarHoy ? '📅' : '📆';
            
            produccionResumenHTML = `
                <div style="background: linear-gradient(135deg, #10b98115 0%, #10b98108 100%); border: 2px solid #10b981; border-radius: 10px; padding: 10px 12px; margin-top: 10px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="font-size: 18px;">🔨</span>
                            <div>
                                <div style="font-weight: 700; font-size: 12px; color: #10b981; display: flex; align-items: center; gap: 6px;">
                                    Producción programada
                                    <span style="font-size: 10px; color: ${colorEtiqueta}; background: ${bgEtiqueta}; padding: 1px 8px; border-radius: 8px; font-weight: 700; border: 1px solid ${colorEtiqueta};">
                                        ${iconoEtiqueta} ${etiquetaProduccion}
                                    </span>
                                </div>
                                ${productoNombre ? `<div style="font-size: 10px; color: var(--text-light);">🏷️ ${productoNombre}</div>` : ''}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 18px; font-weight: 700; color: #10b981;">${fmt(cantidadProd)}</div>
                            <div style="font-size: 9px; color: var(--text-light);">unidades</div>
                        </div>
                    </div>
                    ${conteo.disponibles !== null ? `
                        <div style="display: flex; gap: 6px; font-size: 10px; padding-top: 6px; border-top: 1px solid #10b98130;">
                            <div style="flex: 1;"><span style="color: var(--text-light);">📋 Ped:</span> <strong style="color: #3b82f6;">${fmt(conteo.pedidos)}</strong></div>
                            <div style="flex: 1;"><span style="color: var(--text-light);">💰 Ven:</span> <strong style="color: #f59e0b;">${fmt(conteo.ventas)}</strong></div>
                            <div style="flex: 1;"><span style="color: var(--text-light);">✅ Disp:</span> <strong style="color: ${conteo.disponibles > 0 ? '#10b981' : '#ef4444'};">${fmt(conteo.disponibles)}</strong></div>
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        return `
            <div class="card" style="border-left: 4px solid #f59e0b; border: 2px solid #f59e0b; padding: 14px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                    <span style="font-size: 24px;">⚡</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 700; color: #f59e0b; font-size: 15px;">
                            Corriente hoy: 
                            <span style="color: #ef4444; background: #ef444415; padding: 2px 10px; border-radius: 8px; font-weight: 700; margin-left: 4px; display: inline-block;">
                                ${fechaConDia}
                            </span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-light); margin-top: 2px;">
                            ${resumen.numBloques} bloque${resumen.numBloques > 1 ? 's' : ''} · ${resumen.totalHoras.toFixed(1)}h total
                        </div>
                    </div>
                    <button onclick="showCorrienteModal()" class="btn secondary" style="padding: 4px 12px; font-size: 11px; width: auto;">
                        Ver detalle
                    </button>
                </div>
                ${estadoActualHTML}
                <div>${bloquesHTML}${bloqueAyerHTML}</div>
                ${produccionResumenHTML}
            </div>
        `;
    } catch (e) {
        console.warn('Error renderizando tarjeta de corriente:', e);
        return '';
    }
}

// ============================================================
// 🆕 v2.2.3: TARJETA DE PEDIDOS HOY / MAÑANA / LISTA DE ESPERA
// ============================================================

function renderTarjetaPedidosHoy(stats) {
    if (!stats) return '';
    
    const pedidosHoy = stats.ordersTodayCount || 0;
    const pedidosManana = (typeof stats.ordersTomorrowCount === 'number') 
        ? stats.ordersTomorrowCount 
        : null;
    const waiting = stats.waitingListCount || 0;
    
    if (pedidosHoy === 0 && waiting === 0 && (pedidosManana === 0 || pedidosManana === null)) {
        return '';
    }
    
    const pedidosMananaDisplay = (pedidosManana === null) 
        ? '—' 
        : pedidosManana;
    
    const hoyStr = hoyYYYYMMDD();
    const mananaStr = mananaYYYYMMDD();
    
    const filtrosHoy = JSON.stringify({ from_date: hoyStr, to_date: hoyStr });
    const filtrosManana = JSON.stringify({ from_date: mananaStr, to_date: mananaStr });
    const filtrosEspera = JSON.stringify({ status: 'waiting' });
    
    return `
        <div class="card" style="border-left: 4px solid #3b82f6; padding: 14px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                <span style="font-size: 22px;">📋</span>
                <div style="flex: 1;">
                    <div style="font-weight: 700; color: #3b82f6; font-size: 15px;">
                        Pedidos activos
                    </div>
                    <div style="font-size: 11px; color: var(--text-light); margin-top: 2px;">
                        Resumen de pedidos programados
                    </div>
                </div>
                <button onclick="window.navigate('orders')" class="btn secondary" style="padding: 4px 12px; font-size: 11px; width: auto;">
                    Ver todos
                </button>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                
                <div onclick='navigateWithFilters("orders", ${filtrosHoy})' 
                     style="background: #3b82f615; border: 1px solid #3b82f6; border-radius: 10px; padding: 12px 8px; text-align: center; min-height: 100px; display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;"
                     onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(59,130,246,0.25)';"
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                    <div style="font-size: 24px; line-height: 1; margin-bottom: 4px;">📋</div>
                    <div style="font-size: 26px; font-weight: 700; color: #3b82f6; line-height: 1.1;">${pedidosHoy}</div>
                    <div style="font-size: 11px; color: var(--text-light); margin-top: 4px; font-weight: 500;">Pedidos hoy</div>
                </div>
                
                <div onclick='navigateWithFilters("orders", ${filtrosManana})' 
                     style="background: #8b5cf615; border: 1px solid #8b5cf6; border-radius: 10px; padding: 12px 8px; text-align: center; min-height: 100px; display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;"
                     onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(139,92,246,0.25)';"
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                    <div style="font-size: 24px; line-height: 1; margin-bottom: 4px;">📅</div>
                    <div style="font-size: 26px; font-weight: 700; color: #8b5cf6; line-height: 1.1;">${pedidosMananaDisplay}</div>
                    <div style="font-size: 11px; color: var(--text-light); margin-top: 4px; font-weight: 500;">Pedidos mañana</div>
                </div>
                
                <div onclick='navigateWithFilters("orders", ${filtrosEspera})' 
                     style="background: #f59e0b15; border: 1px solid #f59e0b; border-radius: 10px; padding: 12px 8px; text-align: center; min-height: 100px; display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;"
                     onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(245,158,11,0.25)';"
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                    <div style="font-size: 24px; line-height: 1; margin-bottom: 4px;">⏰</div>
                    <div style="font-size: 26px; font-weight: 700; color: #f59e0b; line-height: 1.1;">${waiting}</div>
                    <div style="font-size: 11px; color: var(--text-light); margin-top: 4px; font-weight: 500;">En lista de espera</div>
                </div>
                
            </div>
            
            <style>
                @media (max-width: 500px) {
                    #dashboard-orders-today-container > div > div:last-child {
                        grid-template-columns: 1fr !important;
                    }
                }
            </style>
        </div>
    `;
}

// ============================================================
// 🆕 v3.1.2: TARJETA DE PROMEDIO DIARIO POR PRODUCTO (CORRECCIÓN N5)
// ============================================================

/**
 * Renderiza la tarjeta de promedio diario por producto.
 * @param {Object} promedioProducto - Datos de stats.promedioProducto
 * @returns {string} HTML de la tarjeta o '' si no aplica
 */
function renderTarjetaProductoPromedio(promedioProducto) {
    const LOG_PREFIX = '📊 [renderTarjetaProductoPromedio v3.1.2]';
    
    try {
        // Validaciones iniciales
        if (!promedioProducto) {
            console.log(`${LOG_PREFIX} ℹ️ Sin datos de promedio`);
            return '';
        }
        
        if (!promedioProducto.configurado) {
            console.log(`${LOG_PREFIX} ℹ️ Promedio no configurado (toggle OFF)`);
            return '';
        }
        
        if (!promedioProducto.producto) {
            // Toggle activo pero sin producto seleccionado
            return `
                <div class="card" style="border-left: 4px solid #06b6d4; padding: 14px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 28px;">📊</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 700; color: #06b6d4; font-size: 14px;">
                                Promedio diario por producto
                            </div>
                            <div style="font-size: 12px; color: var(--text-light); margin-top: 2px;">
                                ⚠️ Selecciona un producto en tu Perfil para ver este indicador
                            </div>
                        </div>
                        <button onclick="window.navigate('profile')" class="btn secondary" style="padding: 6px 12px; font-size: 11px; width: auto;">
                            ⚙️ Configurar
                        </button>
                    </div>
                </div>
            `;
        }
        
        const producto = promedioProducto.producto;
        const promedio = promedioProducto.promedio || 0;
        const diasConVentas = promedioProducto.dias_con_ventas || 0;
        const totalVendido = promedioProducto.total_vendido || 0;
        const totalUnidades = promedioProducto.total_unidades || 0;
        const mejorDia = promedioProducto.mejor_dia;
        
        // Formatear mejor día
        let mejorDiaHTML = '';
        if (mejorDia && mejorDia.fecha) {
            const fechaFormateada = formatearFechaYYYYMMDD(mejorDia.fecha);
            mejorDiaHTML = `
                <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 4px 0; border-bottom: 1px dashed var(--border-color);">
                    <span style="color: var(--text-light);">🏆 Mejor día:</span>
                    <span style="font-weight: 600; color: #10b981;">$${mejorDia.total.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 10px; padding: 2px 0;">
                    <span style="color: var(--text-light);"></span>
                    <span style="color: var(--text-light);">📅 ${fechaFormateada}</span>
                </div>
            `;
        }
        
        console.log(`${LOG_PREFIX} ✅ Renderizando para "${producto.nombre}" (promedio: $${promedio.toFixed(2)})`);
        
        return `
            <div class="card" style="border-left: 4px solid #06b6d4; padding: 14px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                    <span style="font-size: 28px;">📊</span>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 700; color: #06b6d4; font-size: 14px;">
                            Promedio diario
                        </div>
                        <div style="font-size: 12px; color: var(--text); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            🏷️ <strong>${producto.nombre}</strong>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 20px; font-weight: 700; color: #06b6d4;">
                            $${promedio.toFixed(2)}
                        </div>
                        <div style="font-size: 10px; color: var(--text-light);">
                            por día
                        </div>
                    </div>
                </div>
                
                <div style="background: var(--bg); border-radius: 8px; padding: 10px 12px; border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 4px 0; border-bottom: 1px dashed var(--border-color);">
                        <span style="color: var(--text-light);">📅 Días con ventas:</span>
                        <span style="font-weight: 600; color: #8b5cf6;">${diasConVentas}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 4px 0; border-bottom: 1px dashed var(--border-color);">
                        <span style="color: var(--text-light);">💰 Total facturado:</span>
                        <span style="font-weight: 600; color: #10b981;">$${totalVendido.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 4px 0; border-bottom: 1px dashed var(--border-color);">
                        <span style="color: var(--text-light);">📦 Total unidades:</span>
                        <span style="font-weight: 600; color: #f59e0b;">${totalUnidades}</span>
                    </div>
                    ${mejorDiaHTML}
                </div>
                
                <button onclick="window.navigate('profile')" class="btn secondary" style="margin-top: 10px; padding: 4px 12px; font-size: 11px; width: auto;">
                    ⚙️ Cambiar producto
                </button>
            </div>
        `;
        
    } catch (e) {
        console.error(`${LOG_PREFIX} ❌ Error:`, e);
        return '';
    }
}

window.renderTarjetaProductoPromedio = renderTarjetaProductoPromedio;

// ============================================================
// RENDER DASHBOARD VIEW
// ============================================================

function renderDashboardView() {
    const main = document.getElementById('mainContent');
    
    const user = window.AuthModule.getCurrentUser();
    let dashConfig = {
        show_corriente: true,
        show_top_clients: true,
        show_top_products: true,
        show_funds_analysis: true,
        show_payment_methods: true,
        show_quick_actions: true,
        show_bank_qr: false,
        show_orders_today: true,
        show_released_sales: true,
        show_best_worst_day: true,
        show_sales_by_employee: true,
        show_debts: true,
        show_rewards: true,
        show_producto_promedio: false,
        producto_promedio_id: null,
        chart_mode: 'last7'
    };
    
    if (user) {
        if (user.dashboard_config) {
            dashConfig = { ...dashConfig, ...user.dashboard_config };
            user.dashboard_config = dashConfig;
            window.AuthModule.setCurrentUser(user);
        } else {
            dashConfig = window.DBModule.getUserDashboardConfig(user.id);
            user.dashboard_config = dashConfig;
            window.AuthModule.setCurrentUser(user);
        }
    }

    if (!window._chartMode || window._chartModeSetByUser !== true) {
        window._chartMode = dashConfig.chart_mode || 'last7';
    }
    
    if (window._weekOffset === undefined) {
        window._weekOffset = 0;
    }

    const nombreNegocio = getNombreNegocio();
    const version = getAppVersion();
    
    console.log('📊 Renderizando dashboard v' + version, '| config:', dashConfig, '| chartMode:', window._chartMode, '| negocio:', nombreNegocio);
    
    const tarjetaCorriente = dashConfig.show_corriente ? renderTarjetaCorrienteHoy() : '';
    
    const CARD_STYLE_BASE = 'padding: 14px; text-align: center; min-height: 100px; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;';
    const CARD_VALUE_STYLE = 'font-size: 22px; font-weight: 700; line-height: 1.1;';
    const CARD_LABEL_STYLE = 'font-size: 11px; color: var(--text-light); margin-top: 4px;';
    const CARD_ICON_STYLE = 'font-size: 22px; margin-bottom: 4px; line-height: 1;';
    
    const GRID_STYLE = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 16px; align-items: stretch;';
    
    main.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; margin-top: 0; flex-wrap: wrap; gap: 8px;">
            <div>
                <h2 style="margin: 0; margin-top: 0;">📊 Panel de Control</h2>
                <div style="font-size: 13px; color: var(--primary); font-weight: 600; margin-top: 2px;">
                    🏢 ${nombreNegocio}
                </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="refreshDashboard()" class="btn secondary" style="padding: 6px 16px; font-size: 13px; width: auto;">
                    🔄 Actualizar
                </button>
                <button onclick="exportDashboardReport()" class="btn primary" style="padding: 6px 16px; font-size: 13px; width: auto;">
                    📥 Exportar
                </button>
            </div>
        </div>
        
        ${dashConfig.show_corriente ? `<div id="dashboard-corriente-container">${tarjetaCorriente}</div>` : ''}
        
        ${dashConfig.show_orders_today ? `<div id="dashboard-orders-today-container"></div>` : ''}
        
        ${dashConfig.show_producto_promedio ? `<div id="dashboard-producto-promedio-container"></div>` : ''}
        
        <div id="dashboard-stats" style="${GRID_STYLE}">
            <div class="card" style="${CARD_STYLE_BASE}">
                <div style="${CARD_LABEL_STYLE}">🛒 Ventas totales</div>
                <div style="${CARD_VALUE_STYLE} color: var(--primary);" id="stat-total-sales">-</div>
            </div>
            <div class="card" style="${CARD_STYLE_BASE}">
                <div style="${CARD_LABEL_STYLE}">💰 Ingresos</div>
                <div style="${CARD_VALUE_STYLE} color: #10b981;" id="stat-revenue">-</div>
            </div>
            <div class="card" style="${CARD_STYLE_BASE}">
                <div style="${CARD_LABEL_STYLE}">📤 Gastos</div>
                <div style="${CARD_VALUE_STYLE} color: #ef4444;" id="stat-expenses">-</div>
            </div>
            <div class="card" style="${CARD_STYLE_BASE}">
                <div style="${CARD_LABEL_STYLE}">📈 Ganancia</div>
                <div style="${CARD_VALUE_STYLE} color: #3b82f6;" id="stat-profit">-</div>
            </div>
            <div class="card" style="${CARD_STYLE_BASE}">
                <div style="${CARD_LABEL_STYLE}">📋 Pedidos pendientes</div>
                <div style="${CARD_VALUE_STYLE} color: #f59e0b;" id="stat-pending-orders">-</div>
            </div>
            ${dashConfig.show_debts ? `
            <div class="card" style="${CARD_STYLE_BASE}">
                <div style="${CARD_LABEL_STYLE}">💳 Deudas</div>
                <div style="${CARD_VALUE_STYLE} color: #ef4444;" id="stat-debts">-</div>
            </div>
            ` : ''}
            <div class="card" style="${CARD_STYLE_BASE} border-left: 4px solid #f59e0b;">
                <div style="${CARD_LABEL_STYLE}">📈 Ventas hoy</div>
                <div style="${CARD_VALUE_STYLE} color: #f59e0b; font-size: 18px;" id="stat-today-sales">-</div>
            </div>
            <div class="card" style="${CARD_STYLE_BASE} border-left: 4px solid #10b981;">
                <div style="${CARD_LABEL_STYLE}">💵 Fondo en caja</div>
                <div style="${CARD_VALUE_STYLE} color: #10b981;" id="stat-cash-balance">-</div>
            </div>
            <div class="card" style="${CARD_STYLE_BASE} border-left: 4px solid #3b82f6;">
                <div style="${CARD_LABEL_STYLE}">🏦 Fondo en banco</div>
                <div style="${CARD_VALUE_STYLE} color: #3b82f6;" id="stat-bank-balance">-</div>
            </div>
        </div>
        
        ${(dashConfig.show_released_sales || dashConfig.show_best_worst_day) ? `
        <div id="dashboard-new-stats" style="${GRID_STYLE}">
            
            ${dashConfig.show_released_sales ? `
            <div class="card" style="${CARD_STYLE_BASE} border-left: 4px solid #8b5cf6;">
                <div style="${CARD_ICON_STYLE}">🚀</div>
                <div style="${CARD_LABEL_STYLE}">Ventas liberadas</div>
                <div style="${CARD_VALUE_STYLE} color: #8b5cf6; font-size: 18px;" id="stat-released-sales">-</div>
                <div style="font-size: 11px; color: var(--text-light); margin-top: 2px;" id="stat-released-sales-count">-</div>
            </div>
            ` : ''}
            
            ${dashConfig.show_best_worst_day ? `
            <div class="card" style="${CARD_STYLE_BASE} border-left: 4px solid #f59e0b;">
                <div style="${CARD_ICON_STYLE}">🥇</div>
                <div style="${CARD_LABEL_STYLE}">Mejor día</div>
                <div style="${CARD_VALUE_STYLE} color: #f59e0b; font-size: 16px;" id="stat-best-day">-</div>
                <div style="font-size: 11px; color: var(--text-light); margin-top: 2px;" id="stat-best-day-date">-</div>
            </div>
            
            <div class="card" style="${CARD_STYLE_BASE} border-left: 4px solid #ef4444;">
                <div style="${CARD_ICON_STYLE}">📉</div>
                <div style="${CARD_LABEL_STYLE}">Peor día</div>
                <div style="${CARD_VALUE_STYLE} color: #ef4444; font-size: 16px;" id="stat-worst-day">-</div>
                <div style="font-size: 11px; color: var(--text-light); margin-top: 2px;" id="stat-worst-day-date">-</div>
            </div>
            ` : ''}
            
        </div>
        ` : ''}
        
        ${dashConfig.show_sales_by_employee ? `
        <div class="card" id="dashboard-employees-container" style="border-left: 4px solid #3b82f6; margin-bottom: 16px;">
            <h3 style="margin: 0 0 12px 0; font-size: 14px;">👥 Ventas por empleado</h3>
            <div id="sales-by-employee" style="font-size: 13px;">
                <div style="text-align: center; padding: 20px 0; color: var(--text-light);">Cargando...</div>
            </div>
        </div>
        ` : ''}
        
        <div id="dashboard-advanced-stats" style="${GRID_STYLE}">
            <div class="card" style="${CARD_STYLE_BASE} border-left: 4px solid #8b5cf6;">
                <div style="${CARD_ICON_STYLE}">📅</div>
                <div style="${CARD_LABEL_STYLE}">Días con ventas</div>
                <div style="${CARD_VALUE_STYLE} color: #8b5cf6;" id="stat-dias-ventas">-</div>
            </div>
            <div class="card" style="${CARD_STYLE_BASE} border-left: 4px solid #ef4444;">
                <div style="${CARD_ICON_STYLE}">📅</div>
                <div style="${CARD_LABEL_STYLE}">Días sin ventas</div>
                <div style="${CARD_VALUE_STYLE} color: #ef4444;" id="stat-dias-sin-ventas">-</div>
            </div>
            <div class="card" style="${CARD_STYLE_BASE} border-left: 4px solid #06b6d4;">
                <div style="${CARD_ICON_STYLE}">📊</div>
                <div style="${CARD_LABEL_STYLE}">Promedio diario</div>
                <div style="${CARD_VALUE_STYLE} color: #06b6d4; font-size: 18px;" id="stat-promedio-diario">-</div>
            </div>
            <div class="card" style="${CARD_STYLE_BASE} border-left: 4px solid #f472b6;">
                <div style="${CARD_ICON_STYLE}">🎂</div>
                <div style="${CARD_LABEL_STYLE}">Primer día venta</div>
                <div style="${CARD_VALUE_STYLE} color: #f472b6; font-size: 14px;" id="stat-primer-dia">-</div>
            </div>
            <div class="card" style="${CARD_STYLE_BASE} border-left: 4px solid #f59e0b;">
                <div style="${CARD_ICON_STYLE}">👥</div>
                <div style="${CARD_LABEL_STYLE}">Clientes diferentes</div>
                <div style="${CARD_VALUE_STYLE} color: #f59e0b;" id="stat-clientes-diferentes">-</div>
            </div>
        </div>
        
        <div class="card" style="padding: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 14px;">📈 Ventas diarias</h3>
                <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
                    <button onclick="changeWeek(-1)" class="btn secondary" style="padding: 4px 10px; font-size: 12px; width: auto;" title="Semana anterior">◀</button>
                    <span id="week-label" style="font-size: 12px; color: var(--text-light); min-width: 90px; text-align: center;">Últimos 7 días</span>
                    <button onclick="changeWeek(1)" class="btn secondary" style="padding: 4px 10px; font-size: 12px; width: auto;" title="Semana siguiente" id="btn-next-week">▶</button>
                </div>
            </div>
            
            <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap; margin-bottom: 12px;">
                <label style="font-size: 11px; color: var(--text-light);">📅 Ver:</label>
                <select id="chart-mode-selector" onchange="changeChartMode(this.value)" 
                        style="padding: 4px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-card); color: var(--text); font-size: 11px; cursor: pointer; flex: 1; min-width: 130px;">
                    <option value="last7">📅 Últimos 7 días</option>
                    <option value="dom-sab">📅 Semana Dom-Sáb</option>
                    <option value="lun-dom">📅 Semana Lun-Dom</option>
                </select>
                
                <label style="font-size: 11px; color: var(--text-light); margin-left: 4px;">Tipo:</label>
                <select id="chart-type-selector" style="padding: 4px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-card); color: var(--text); font-size: 11px; cursor: pointer; flex: 1; min-width: 100px;">
                    <option value="bar">📊 Barras</option>
                    <option value="line">📈 Línea</option>
                    <option value="pie">🥧 Pastel</option>
                </select>
                <button onclick="exportChartAsImage()" class="btn secondary" style="padding: 4px 8px; font-size: 11px; width: auto;" title="Exportar imagen">🖼️</button>
                <button onclick="exportChartAsPDF()" class="btn secondary" style="padding: 4px 8px; font-size: 11px; width: auto;" title="Exportar PDF">📄</button>
            </div>
            
            <div id="daily-sales-chart" style="width: 100%; overflow: hidden;">
                <div style="text-align: center; padding: 20px 0; color: var(--text-light); font-size: 13px;">Cargando...</div>
            </div>
        </div>
        
        ${dashConfig.show_top_clients ? `
        <div id="top-clients-container" class="card" style="border-left: 4px solid #8b5cf6; margin-bottom: 16px;">
            <h3 style="margin: 0 0 12px 0; font-size: 14px;">🏆 Mejores Clientes</h3>
            <div id="top-clients" style="font-size: 13px;">
                <div style="text-align: center; padding: 20px 0; color: var(--text-light);">Cargando...</div>
            </div>
        </div>
        ` : ''}
        
        ${dashConfig.show_top_products ? `
        <div class="card">
            <h3 style="margin: 0 0 12px 0; font-size: 14px;">🏷️ Productos más vendidos</h3>
            <div id="top-products" style="font-size: 13px;">
                <div style="text-align: center; padding: 20px 0; color: var(--text-light);">Cargando...</div>
            </div>
        </div>
        ` : ''}
        
        ${dashConfig.show_funds_analysis ? `
        <div id="funds-analysis" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; align-items: stretch;">
            <div class="card" style="border-left: 4px solid #10b981; display: flex; flex-direction: column; min-height: 220px; padding: 14px; height: 100%; box-sizing: border-box;">
                <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #10b981;">💵 Análisis de Efectivo</h4>
                <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 6px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; border-bottom: 1px dashed var(--border-color);">
                        <span style="color: var(--text-light);">💰 Ingresos:</span>
                        <span id="stat-cash-income" style="font-weight: 600; color: #10b981;">-</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; border-bottom: 1px dashed var(--border-color);">
                        <span style="color: var(--text-light);">📤 Gastos:</span>
                        <span id="stat-cash-expenses" style="font-weight: 600; color: #ef4444;">-</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; border-bottom: 1px dashed var(--border-color);">
                        <span style="color: var(--text-light);">💵 Saldo caja:</span>
                        <span id="stat-cash-balance-detail" style="font-weight: 700; color: #10b981;">-</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0;">
                        <span style="color: var(--text-light);">📊 Ventas vs Gastos:</span>
                        <span id="stat-cash-sales-vs-expenses" style="font-weight: 700; color: #f59e0b;">-</span>
                    </div>
                </div>
            </div>
            
            <div class="card" style="border-left: 4px solid #3b82f6; display: flex; flex-direction: column; min-height: 220px; padding: 14px; height: 100%; box-sizing: border-box;">
                <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #3b82f6;">🏦 Análisis de Banco</h4>
                <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 6px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; border-bottom: 1px dashed var(--border-color);">
                        <span style="color: var(--text-light);">💰 Ingresos:</span>
                        <span id="stat-bank-income" style="font-weight: 600; color: #10b981;">-</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; border-bottom: 1px dashed var(--border-color);">
                        <span style="color: var(--text-light);">📤 Gastos:</span>
                        <span id="stat-bank-expenses" style="font-weight: 600; color: #ef4444;">-</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; border-bottom: 1px dashed var(--border-color);">
                        <span style="color: var(--text-light);">🏦 Saldo banco:</span>
                        <span id="stat-bank-balance-detail" style="font-weight: 700; color: #3b82f6;">-</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0;">
                        <span style="color: var(--text-light);">📊 Ventas vs Gastos:</span>
                        <span id="stat-bank-sales-vs-expenses" style="font-weight: 700; color: #f59e0b;">-</span>
                    </div>
                </div>
            </div>
        </div>
        
        <style>
            @media (max-width: 600px) {
                #funds-analysis { grid-template-columns: 1fr !important; }
            }
        </style>
        ` : ''}
        
        ${dashConfig.show_bank_qr ? `
        <div class="card" style="border-left: 4px solid #3b82f6; margin-bottom: 16px;">
            <h3 style="margin: 0 0 12px 0; font-size: 14px;">🏦 QR de cuenta bancaria</h3>
            <div id="dashboard-bank-qr" style="font-size: 13px; text-align: center;">
                <div style="color: var(--text-light); font-size: 12px; padding: 10px;">Cargando...</div>
            </div>
        </div>
        ` : ''}
        
        ${dashConfig.show_rewards ? `<div id="dashboard-rewards-container"></div>` : ''}
        
        ${dashConfig.show_debts ? `
        <div class="card" style="border-left: 4px solid #ef4444;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px;">💳 Importes por cobrar (Deudas)</h3>
            <div id="debt-details" style="font-size: 13px;">
                <div style="text-align: center; padding: 20px 0; color: var(--text-light);">Cargando deudas...</div>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid var(--border-color); font-weight: 700; font-size: 15px; color: #ef4444;">
                <span>Total de deudas:</span>
                <span id="stat-debts-total">$0.00</span>
            </div>
            <button onclick="window.navigate('sales')" class="btn secondary" style="margin-top: 8px; padding: 4px 12px; font-size: 12px; width: auto;">
                👁️ Ver todas las deudas
            </button>
        </div>
        ` : ''}
        
        ${dashConfig.show_payment_methods ? `
        <div class="card">
            <h3 style="margin: 0 0 12px 0; font-size: 14px;">💳 Métodos de pago</h3>
            <div id="payment-methods" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px;">
                <div style="text-align: center; padding: 20px 0; color: var(--text-light); grid-column: 1 / -1;">Cargando...</div>
            </div>
        </div>
        ` : ''}
        
        ${dashConfig.show_quick_actions ? `
        <div id="quick-actions" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; margin-bottom: 40px;">
            <button onclick="window.navigate('orders')" class="btn primary" style="padding: 10px 20px; font-size: 14px; width: auto; flex: 1; min-width: 80px;">📋 Pedidos</button>
            <button onclick="window.navigate('sales')" class="btn secondary" style="padding: 10px 20px; font-size: 14px; width: auto; flex: 1; min-width: 80px;">💰 Ventas</button>
            <button onclick="window.navigate('insumos')" class="btn secondary" style="padding: 10px 20px; font-size: 14px; width: auto; flex: 1; min-width: 80px;">🛒 Insumos</button>
            <button onclick="window.navigate('productos')" class="btn secondary" style="padding: 10px 20px; font-size: 14px; width: auto; flex: 1; min-width: 80px;">🏷️ Productos</button>
            <button onclick="window.navigate('recipes')" class="btn secondary" style="padding: 10px 20px; font-size: 14px; width: auto; flex: 1; min-width: 80px;">📖 Recetas</button>
        </div>
        ` : ''}
    `;
    
    setTimeout(() => {
        const modeSelector = document.getElementById('chart-mode-selector');
        if (modeSelector) {
            modeSelector.value = window._chartMode || 'last7';
        }
    }, 50);
    
    setTimeout(() => {
        const chartSelector = document.getElementById('chart-type-selector');
        if (chartSelector && !chartSelector._listenerAdded) {
            chartSelector._listenerAdded = true;
            chartSelector.addEventListener('change', function(e) {
                e.preventDefault();
                e.stopPropagation();
                setTimeout(() => {
                    if (typeof window.renderChart === 'function') {
                        window.renderChart();
                    }
                }, 50);
            });
        }
    }, 100);
    
    loadDashboardData();
    setTimeout(adjustForSafeArea, 300);
    
    setTimeout(() => {
        if (typeof window.limpiarEstilosResiduales === 'function') {
            window.limpiarEstilosResiduales();
        }
        forzarStickyHeader();
    }, 400);
}

// ============================================================
// QR DE CUENTA BANCARIA EN DASHBOARD
// ============================================================

async function renderDashboardBankQR() {
    const container = document.getElementById('dashboard-bank-qr');
    if (!container) return;
    
    try {
        const user = window.AuthModule.getCurrentUser();
        if (!user) {
            console.warn('⚠️ [renderDashboardBankQR v3.1.2] No hay usuario autenticado');
            return;
        }
        
        let defaultAccount = null;
        
        if (typeof window.DBModule.getCuentaDefaultUsuario === 'function') {
            defaultAccount = window.DBModule.getCuentaDefaultUsuario(user.id);
            console.log(`🏦 [renderDashboardBankQR v3.1.2] getCuentaDefaultUsuario(${user.id}) →`,
                defaultAccount ? `${defaultAccount.bank} (id=${defaultAccount.id})` : 'null');
        } else {
            console.warn('⚠️ [renderDashboardBankQR v3.1.2] getCuentaDefaultUsuario no disponible, usando fallback');
            const accounts = window.DBModule.getBankAccountsParaUsuario();
            defaultAccount = accounts.find(acc => Number(acc.is_default) === 1);
            if (!defaultAccount && accounts.length > 0) {
                defaultAccount = accounts[0];
            }
        }
        
        if (!defaultAccount) {
            container.innerHTML = `
                <div style="padding: 20px; color: var(--text-light);">
                    <span style="font-size: 32px;">🏦</span>
                    <p style="margin-top: 8px; font-size: 13px;">No hay cuentas bancarias disponibles</p>
                    <button onclick="window.navigate('profile')" class="btn secondary" style="margin-top: 8px; padding: 6px 14px; font-size: 12px; width: auto;">
                        ➕ Agregar cuenta
                    </button>
                </div>
            `;
            return;
        }
        
        if (!defaultAccount.qr_code) {
            container.innerHTML = `
                <div style="padding: 20px; color: var(--text-light);">
                    <span style="font-size: 32px;">📷</span>
                    <p style="margin-top: 8px; font-size: 13px;">
                        La cuenta <strong>${defaultAccount.bank}</strong> no tiene QR
                    </p>
                    <button onclick="window.navigate('profile')" class="btn secondary" style="margin-top: 8px; padding: 6px 14px; font-size: 12px; width: auto;">
                        ➕ Agregar QR
                    </button>
                </div>
            `;
            return;
        }
        
        const ownerName = defaultAccount.owner_name || defaultAccount.owner || '';
        
        const config = window.DBModule.getConfigBancaria();
        const esForzadoPorAdmin = config.forzar_qr_admin && !user.is_admin;
        const esCuentaDelAdmin = user.is_admin || (defaultAccount.user_id === user.id);
        
        let badgeDefault = '';
        if (esForzadoPorAdmin) {
            badgeDefault = '<span style="font-size: 10px; background: #8b5cf620; color: #8b5cf6; padding: 1px 6px; border-radius: 8px; margin-left: 4px; font-weight: 600;">🔒 QR del admin</span>';
        } else if (Number(defaultAccount.is_default) === 1) {
            badgeDefault = '<span style="font-size: 10px; background: #10b98120; color: #10b981; padding: 1px 6px; border-radius: 8px; margin-left: 4px;">✅ Predeterminada</span>';
        }
        
        container.innerHTML = `
            <div style="margin-bottom: 8px; text-align: left;">
                <div style="font-weight: 600; font-size: 14px;">🏦 ${defaultAccount.bank}</div>
                ${ownerName ? `<div style="font-size: 12px; color: var(--text-light);">👤 Titular: <strong>${ownerName}</strong></div>` : ''}
                <div style="font-size: 12px; color: var(--text-light);">
                    📋 ${defaultAccount.account_number}
                    ${badgeDefault}
                </div>
                ${defaultAccount.phone ? `<div style="font-size: 12px; color: var(--text-light);">📞 ${defaultAccount.phone}</div>` : ''}
            </div>
            <div style="display: flex; justify-content: center; margin: 12px 0;">
                <img src="${defaultAccount.qr_code}" 
                     alt="QR de ${defaultAccount.bank}"
                     style="max-width: 220px; max-height: 220px; width: 100%; border-radius: 8px; border: 2px solid var(--border-color); padding: 4px; background: #fff; cursor: pointer;"
                     onclick="viewBankAccountQR(${defaultAccount.id})"
                     title="Toca para ampliar">
            </div>
            <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                <button onclick="viewBankAccountQR(${defaultAccount.id})" class="btn secondary" style="padding: 6px 14px; font-size: 12px; width: auto;">
                    🔍 Ampliar
                </button>
                <button onclick="downloadDashboardQR('${defaultAccount.bank}', '${defaultAccount.account_number}')" class="btn secondary" style="padding: 6px 14px; font-size: 12px; width: auto;">
                    📥 Descargar
                </button>
            </div>
            <div style="font-size: 11px; color: var(--text-light); margin-top: 8px; text-align: center;">
                💡 Toca la imagen para ampliar
            </div>
        `;
        
    } catch (error) {
        console.error('Error renderizando QR del dashboard:', error);
        container.innerHTML = `
            <div style="padding: 20px; color: #ef4444; font-size: 13px;">
                ❌ Error al cargar el QR
            </div>
        `;
    }
}

// ============================================================
// DESCARGAR QR DEL DASHBOARD
// ============================================================

async function downloadDashboardQR(bank, accountNumber) {
    try {
        const user = window.AuthModule.getCurrentUser();
        if (!user) {
            window.showToast('❌ No hay usuario autenticado', 'error');
            return;
        }
        
        let defaultAccount = null;
        
        if (typeof window.DBModule.getCuentaDefaultUsuario === 'function') {
            defaultAccount = window.DBModule.getCuentaDefaultUsuario(user.id);
        } else {
            const accounts = window.DBModule.getBankAccountsParaUsuario();
            defaultAccount = accounts.find(acc => Number(acc.is_default) === 1) || accounts[0];
        }
        
        if (!defaultAccount || !defaultAccount.qr_code) {
            window.showToast('❌ No hay QR para descargar', 'error');
            return;
        }
        
        const response = await fetch(defaultAccount.qr_code);
        const blob = await response.blob();
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `qr-${bank}-${accountNumber}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        window.showToast('✅ QR descargado correctamente', 'success');
        
    } catch (error) {
        console.error('Error descargando QR:', error);
        
        try {
            const user = window.AuthModule.getCurrentUser();
            let defaultAccount = null;
            
            if (user && typeof window.DBModule.getCuentaDefaultUsuario === 'function') {
                defaultAccount = window.DBModule.getCuentaDefaultUsuario(user.id);
            } else {
                const accounts = window.DBModule.getBankAccountsParaUsuario();
                defaultAccount = accounts.find(acc => Number(acc.is_default) === 1) || accounts[0];
            }
            
            if (defaultAccount && defaultAccount.qr_code) {
                const link = document.createElement('a');
                link.download = `qr-${bank}-${accountNumber}.png`;
                link.href = defaultAccount.qr_code;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.showToast('✅ QR descargado', 'success');
            }
        } catch (e2) {
            window.showToast('❌ Error al descargar QR: ' + error.message, 'error');
        }
    }
}

// ============================================================
// NAVEGACIÓN POR SEMANAS CON MODO CONFIGURABLE
// ============================================================

function changeChartMode(mode) {
    console.log('🔄 [FASE 4.2] Cambiando modo del gráfico a:', mode);
    
    const validModes = ['last7', 'dom-sab', 'lun-dom'];
    if (!validModes.includes(mode)) {
        console.warn('⚠️ Modo inválido:', mode, '- usando last7');
        mode = 'last7';
    }
    
    window._chartMode = mode;
    window._chartModeSetByUser = true;
    window._weekOffset = 0;
    
    try {
        const user = window.AuthModule.getCurrentUser();
        if (user) {
            const config = user.dashboard_config || window.DBModule.getUserDashboardConfig(user.id);
            config.chart_mode = mode;
            
            window.AuthModule.updateUserDashboardConfig(user.id, config).then(result => {
                if (result && result.success) {
                    console.log('✅ [FASE 4.2] Modo del gráfico guardado en BD:', mode);
                } else {
                    console.warn('⚠️ [FASE 4.2] No se pudo guardar el modo del gráfico:', result?.error);
                }
            }).catch(err => {
                console.warn('⚠️ [FASE 4.2] Error guardando el modo del gráfico:', err);
            });
        }
    } catch (e) {
        console.warn('⚠️ [FASE 4.2] Error actualizando dashboard_config:', e);
    }
    
    const selector = document.getElementById('chart-mode-selector');
    if (selector) selector.value = mode;
    
    reloadChartWithWeekOffset();
}

function changeWeek(delta) {
    if (window._weekOffset === undefined) window._weekOffset = 0;
    
    const nuevoOffset = window._weekOffset + delta;
    if (nuevoOffset > 0) return;
    
    window._weekOffset = nuevoOffset;
    
    updateChartModeUI();
    
    reloadChartWithWeekOffset();
}

function updateChartModeUI() {
    const label = document.getElementById('week-label');
    const btnNext = document.getElementById('btn-next-week');
    const selector = document.getElementById('chart-mode-selector');
    
    const mode = window._chartMode || 'last7';
    const offset = window._weekOffset || 0;
    
    if (selector) selector.value = mode;
    
    let labelText = '';
    if (mode === 'last7') {
        if (offset === 0) {
            labelText = 'Últimos 7 días';
        } else {
            labelText = `Hace ${Math.abs(offset)} sem.`;
        }
    } else if (mode === 'dom-sab') {
        labelText = offset === 0 ? 'Dom-Sáb (Actual)' : (offset === -1 ? 'Dom-Sáb (Anterior)' : `Hace ${Math.abs(offset)} sem.`);
    } else if (mode === 'lun-dom') {
        labelText = offset === 0 ? 'Lun-Dom (Actual)' : (offset === -1 ? 'Lun-Dom (Anterior)' : `Hace ${Math.abs(offset)} sem.`);
    }
    
    if (label) label.textContent = labelText;
    
    if (btnNext) {
        const isCurrent = offset >= 0;
        btnNext.disabled = isCurrent;
        btnNext.style.opacity = isCurrent ? '0.4' : '1';
        btnNext.style.cursor = isCurrent ? 'not-allowed' : 'pointer';
    }
}

async function reloadChartWithWeekOffset() {
    try {
        const stats = await window.DashboardModule.getDashboardStats({
            weekOffset: window._weekOffset || 0,
            chartMode: window._chartMode || 'last7'
        });
        
        if (stats && stats.dailySales) {
            window._dailySalesData = stats.dailySales;
            
            updateChartModeUI();
            
            renderChart();
        }
    } catch (e) {
        console.error('Error recargando gráfico:', e);
    }
}

window.changeWeek = changeWeek;
window.changeChartMode = changeChartMode;
window.reloadChartWithWeekOffset = reloadChartWithWeekOffset;
window.updateChartModeUI = updateChartModeUI;

// ============================================================
// RENDER CHART
// ============================================================

function renderChart() {
    const container = document.getElementById('daily-sales-chart');
    if (!container) return;
    
    const dailySales = window._dailySalesData || [];
    const chartSelector = document.getElementById('chart-type-selector');
    const chartType = chartSelector ? chartSelector.value : 'bar';
    
    if (!dailySales || dailySales.length === 0 || dailySales.every(d => d.total === 0)) {
        container.innerHTML = `<div style="text-align: center; padding: 20px 0; color: var(--text-light); width: 100%;">No hay ventas en el período seleccionado</div>`;
        return;
    }
    
    const totalSemana = dailySales.reduce((sum, d) => sum + d.total, 0);
    const diasConVentas = dailySales.filter(d => d.total > 0);
    const maxVenta = diasConVentas.length > 0 ? Math.max(...diasConVentas.map(d => d.total)) : 0;
    const minVenta = diasConVentas.length > 0 ? Math.min(...diasConVentas.map(d => d.total)) : 0;
    const fechaMayor = diasConVentas.find(d => d.total === maxVenta)?.date || null;
    const fechaMenor = diasConVentas.find(d => d.total === minVenta)?.date || null;
    
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const today = new Date().getDay();
    const maxValue = Math.max(...dailySales.map(d => d.total), 1);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f472b6'];
    
    container.style.padding = '0';
    container.style.width = '100%';
    container.style.overflow = 'hidden';
    container.style.pointerEvents = 'auto';
    
    const chartData = { dailySales, days, today, maxValue, colors, totalSemana, maxVenta, minVenta, fechaMayor, fechaMenor, diasConVentas };
    
    function formatearFechaCorta(fechaISO) {
        if (!fechaISO) return '—';
        const parts = fechaISO.split('-');
        if (parts.length !== 3) return '—';
        return `${parseInt(parts[2])}/${parseInt(parts[1])}`;
    }
    
    const headerHtml = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; padding: 8px 4px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="text-align: center; padding: 4px;">
                <div style="font-size: 10px; color: var(--text-light); margin-bottom: 2px;">📊 Total semana</div>
                <div style="font-size: 16px; font-weight: 700; color: var(--primary);">$${totalSemana.toFixed(2)}</div>
            </div>
            <div style="text-align: center; padding: 4px; border-left: 1px solid var(--border-color); border-right: 1px solid var(--border-color);">
                <div style="font-size: 10px; color: #10b981; margin-bottom: 2px;">🥇 Mayor venta</div>
                <div style="font-size: 16px; font-weight: 700; color: #10b981;">$${maxVenta.toFixed(2)}</div>
                <div style="font-size: 9px; color: var(--text-light);">${fechaMayor ? formatearFechaCorta(fechaMayor) : '—'}</div>
            </div>
            <div style="text-align: center; padding: 4px;">
                <div style="font-size: 10px; color: #ef4444; margin-bottom: 2px;">📉 Menor venta</div>
                <div style="font-size: 16px; font-weight: 700; color: #ef4444;">$${minVenta.toFixed(2)}</div>
                <div style="font-size: 9px; color: var(--text-light);">${fechaMenor ? formatearFechaCorta(fechaMenor) : '—'}</div>
            </div>
        </div>
    `;
    
    container.innerHTML = headerHtml;
    
    const chartContainer = document.createElement('div');
    chartContainer.id = 'chart-inner-container';
    chartContainer.style.width = '100%';
    container.appendChild(chartContainer);
    
    switch (chartType) {
        case 'bar': renderBarChart(chartContainer, chartData); break;
        case 'line': renderLineChart(chartContainer, chartData); break;
        case 'pie': renderPieChartCanvas(chartContainer, chartData); break;
        default: renderBarChart(chartContainer, chartData);
    }
}

// ============================================================
// 🆕 CORRECCIÓN #2: OBTENER MOTIVO DE DÍA SIN VENTAS
// ============================================================

function getMotivoSinVentas(fechaISO) {
    try {
        const detalle = window._diasSinVentasDetalle || {};
        const info = detalle[fechaISO];
        if (!info) return null;
        const motivo = info.motivo || '';
        if (!motivo) return null;
        return `SV. ${motivo}`;
    } catch (e) {
        return null;
    }
}

// ============================================================
// RENDER BAR CHART
// ============================================================

function renderBarChart(container, chartData) {
    const { dailySales, days, maxValue, colors, fechaMayor, fechaMenor, maxVenta, minVenta } = chartData;
    const todayISO = hoyYYYYMMDD();
    
    container.innerHTML = `
        <div style="display: flex; align-items: flex-end; gap: 4px; height: 200px; padding: 4px 0; width: 100%; box-sizing: border-box;">
            ${dailySales.map((d, i) => {
                const height = (d.total / maxValue) * 170;
                const parts = d.date.split('-');
                const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                const dayIndex = dateObj.getDay();
                const isToday = d.date === todayISO;
                const esMayor = d.date === fechaMayor && d.total > 0;
                const esMenor = d.date === fechaMenor && d.total > 0 && maxVenta !== minVenta;
                
                const motivoSV = d.total === 0 ? getMotivoSinVentas(d.date) : null;
                
                let color, bordeColor, etiqueta;
                if (d.total === 0) { color = '#e2e8f0'; bordeColor = '#e2e8f0'; etiqueta = ''; }
                else if (esMayor) { color = '#10b981'; bordeColor = '#059669'; etiqueta = '🥇'; }
                else if (esMenor) { color = '#ef4444'; bordeColor = '#dc2626'; etiqueta = '📉'; }
                else if (isToday) { color = '#f59e0b'; bordeColor = '#d97706'; etiqueta = '⭐'; }
                else { color = colors[i % colors.length]; bordeColor = color; etiqueta = ''; }
                
                return `
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; height: 100%; justify-content: flex-end; min-width: 0; position: relative;">
                        ${motivoSV ? `
                            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 40px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
                                <div style="writing-mode: vertical-rl; transform: rotate(180deg); font-size: 9px; font-weight: 700; color: #ef4444; letter-spacing: 1px; background: #fef2f2; padding: 4px 2px; border-radius: 4px; border: 1px solid #ef4444; max-height: 100%; overflow: hidden; text-overflow: ellipsis;">
                                    ${motivoSV}
                                </div>
                            </div>
                        ` : ''}
                        <div style="font-size: 8px; color: ${esMayor ? '#10b981' : (esMenor ? '#ef4444' : (isToday ? '#f59e0b' : 'var(--text-light)'))}; white-space: nowrap; font-weight: ${esMayor || esMenor || isToday ? '700' : '400'}; overflow: hidden; text-overflow: ellipsis; max-width: 100%; z-index: 1;">
                            ${etiqueta} ${d.total > 0 ? '$' + d.total.toFixed(0) : ''}
                        </div>
                        <div style="width: 100%; max-width: 100%; height: ${height}px; min-height: 3px; background: ${color}; border-radius: 3px 3px 0 0; transition: height 0.5s ease; box-sizing: border-box; border-top: 2px solid ${bordeColor};"></div>
                        <div style="font-size: 9px; color: ${isToday ? '#f59e0b' : 'var(--text-light)'}; white-space: nowrap; font-weight: ${isToday ? '700' : '400'}; overflow: hidden;">${days[dayIndex]}</div>
                        <div style="font-size: 8px; color: var(--text-light); white-space: nowrap; overflow: hidden;">${d.date.slice(8, 10)}/${d.date.slice(5, 7)}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ============================================================
// RENDER LINE CHART
// ============================================================

function renderLineChart(container, chartData) {
    const { dailySales, days, maxValue, fechaMayor, fechaMenor, maxVenta, minVenta } = chartData;
    const todayISO = hoyYYYYMMDD();
    
    const points = dailySales.map((d, i) => {
        const height = (d.total / maxValue) * 170;
        const parts = d.date.split('-');
        const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const dayIndex = dateObj.getDay();
        return { value: d.total, height: height, day: days[dayIndex], index: i, date: d.date, isToday: d.date === todayISO };
    });
    
    const totalPoints = points.length;
    const paddingLeft = 30;
    const paddingRight = 30;
    const chartHeight = 200;
    const chartWidth = Math.max(container.clientWidth || 600, 300);
    
    container.innerHTML = `
        <div style="position: relative; height: ${chartHeight + 10}px; width: 100%; overflow: visible;">
            <svg style="width: 100%; height: ${chartHeight + 10}px; overflow: visible;" viewBox="0 0 ${chartWidth} ${chartHeight + 10}" preserveAspectRatio="none">
                ${[0, 25, 50, 75, 100].map(pct => {
                    const y = chartHeight - 10 - (pct / 100) * 170;
                    return `
                        <line x1="${paddingLeft}" y1="${y}" x2="${chartWidth - paddingRight}" y2="${y}" stroke="var(--border-color)" stroke-width="0.5" stroke-dasharray="4,4"/>
                        <text x="${paddingLeft - 6}" y="${y + 4}" text-anchor="end" font-size="8" fill="var(--text-light)">${(maxValue * pct / 100).toFixed(0)}</text>
                    `;
                }).join('')}
                
                <line x1="${paddingLeft}" y1="${chartHeight - 10}" x2="${chartWidth - paddingRight}" y2="${chartHeight - 10}" stroke="var(--border-color)" stroke-width="1.5"/>
                
                <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.3"/>
                        <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0.02"/>
                    </linearGradient>
                </defs>
                
                <polygon points="${points.map((p, i) => {
                    const x = paddingLeft + (i / (totalPoints - 1)) * (chartWidth - paddingLeft - paddingRight);
                    const y = chartHeight - 10 - p.height;
                    return `${x},${y}`;
                }).join(' ')} ${chartWidth - paddingRight},${chartHeight - 10} ${paddingLeft},${chartHeight - 10}" fill="url(#lineGradient)"/>
                
                <polyline points="${points.map((p, i) => {
                    const x = paddingLeft + (i / (totalPoints - 1)) * (chartWidth - paddingLeft - paddingRight);
                    const y = chartHeight - 10 - p.height;
                    return `${x},${y}`;
                }).join(' ')}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                
                ${points.map((p, i) => {
                    const x = paddingLeft + (i / (totalPoints - 1)) * (chartWidth - paddingLeft - paddingRight);
                    const y = chartHeight - 10 - p.height;
                    const esMayor = p.date === fechaMayor && p.value > 0;
                    const esMenor = p.date === fechaMenor && p.value > 0 && maxVenta !== minVenta;
                    
                    const motivoSV = p.value === 0 ? getMotivoSinVentas(p.date) : null;
                    
                    let colorPunto, radioPunto, etiqueta;
                    if (p.value === 0) { colorPunto = '#e2e8f0'; radioPunto = 3; etiqueta = ''; }
                    else if (esMayor) { colorPunto = '#10b981'; radioPunto = 6; etiqueta = '🥇'; }
                    else if (esMenor) { colorPunto = '#ef4444'; radioPunto = 6; etiqueta = '📉'; }
                    else if (p.isToday) { colorPunto = '#f59e0b'; radioPunto = 5; etiqueta = '⭐'; }
                    else { colorPunto = '#3b82f6'; radioPunto = 3; etiqueta = ''; }
                    
                    return `
                        <circle cx="${x}" cy="${y}" r="${radioPunto}" fill="${colorPunto}" stroke="#fff" stroke-width="1.5"/>
                        ${etiqueta ? `<text x="${x}" y="${y - 10}" text-anchor="middle" font-size="10" fill="${colorPunto}">${etiqueta}</text>` : ''}
                        ${motivoSV ? `
                            <text x="${x}" y="${y - 15}" text-anchor="middle" font-size="7" fill="#ef4444" font-weight="700" transform="rotate(-90 ${x} ${y - 15})" style="letter-spacing: 0.5px;">${motivoSV}</text>
                        ` : ''}
                        <text x="${x}" y="${chartHeight + 5}" text-anchor="middle" font-size="9" fill="${p.isToday ? '#f59e0b' : 'var(--text-light)'}" font-weight="${p.isToday ? '700' : '400'}">${p.day}</text>
                    `;
                }).join('')}
            </svg>
        </div>
    `;
}

// ============================================================
// RENDER PIE CHART
// ============================================================

function renderPieChartCanvas(container, chartData) {
    const { dailySales, days, colors, fechaMayor, fechaMenor, maxVenta, minVenta } = chartData;
    const total = dailySales.reduce((sum, d) => sum + d.total, 0);
    
    if (total === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 30px 0; color: var(--text-light); font-size: 14px;">No hay datos para mostrar</div>`;
        return;
    }
    
    const containerWidth = container.clientWidth || 300;
    const containerHeight = 220;
    
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = '100%';
    canvas.style.height = containerHeight + 'px';
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    canvas.style.maxWidth = '100%';
    
    container.innerHTML = `
        <div id="pie-canvas-container" style="width: 100%; display: flex; justify-content: center;"></div>
    `;
    
    const canvasContainer = document.getElementById('pie-canvas-container');
    if (!canvasContainer) return;
    canvasContainer.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    const width = containerWidth;
    const height = containerHeight;
    const isSmallScreen = width < 400;
    
    let centerX, centerY, radius, legendX, legendSpacing;
    
    if (isSmallScreen) {
        centerX = width / 2; centerY = 90; radius = 65; legendX = 15; legendSpacing = 20;
    } else {
        centerX = width * 0.28; centerY = height / 2;
        radius = Math.min(height / 2 - 20, width * 0.22);
        legendX = width * 0.52; legendSpacing = 24;
    }
    
    let currentAngle = 0;
    let segments = [];
    
    dailySales.forEach((d, i) => {
        if (d.total === 0) return;
        const percentage = d.total / total;
        const angle = percentage * 2 * Math.PI;
        const parts = d.date.split('-');
        const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const dayIndex = dateObj.getDay();
        const esMayor = d.date === fechaMayor;
        const esMenor = d.date === fechaMenor && maxVenta !== minVenta;
        
        let color;
        if (esMayor) color = '#10b981';
        else if (esMenor) color = '#ef4444';
        else color = colors[i % colors.length];
        
        segments.push({
            day: `${days[dayIndex]} ${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`,
            value: d.total, percentage, startAngle: currentAngle,
            endAngle: currentAngle + angle, color, esMayor, esMenor
        });
        currentAngle += angle;
    });
    
    ctx.clearRect(0, 0, width, height);
    
    segments.forEach((seg) => {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, seg.startAngle, seg.endAngle);
        ctx.closePath();
        ctx.fillStyle = seg.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        const segmentAngle = seg.endAngle - seg.startAngle;
        if (segmentAngle > 0.3) {
            const midAngle = seg.startAngle + segmentAngle / 2;
            const textX = centerX + (radius * 0.65) * Math.cos(midAngle);
            const textY = centerY + (radius * 0.65) * Math.sin(midAngle);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 3;
            
            let texto = (seg.percentage * 100).toFixed(0) + '%';
            if (seg.esMayor) texto = '🥇' + texto;
            else if (seg.esMenor) texto = '📉' + texto;
            
            ctx.fillText(texto, textX, textY);
            ctx.shadowBlur = 0;
        }
    });
    
    const innerRadius = radius * 0.32;
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = 'var(--bg-card)';
    ctx.fill();
    ctx.strokeStyle = 'var(--border-color)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = 'var(--text)';
    ctx.font = `bold ${isSmallScreen ? 12 : 15}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$' + total.toFixed(0), centerX, centerY - 4);
    ctx.fillStyle = 'var(--text-light)';
    ctx.font = `${isSmallScreen ? 8 : 9}px sans-serif`;
    ctx.fillText('Total', centerX, centerY + 10);
    
    if (isSmallScreen) {
        const legendStartY = height - 50;
        ctx.fillStyle = 'var(--text-light)';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('📊 Distribución', centerX, legendStartY - 10);
        
        const cols = 2;
        const colWidth = width / cols - 10;
        
        segments.forEach((seg, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const itemX = 5 + col * (colWidth + 10);
            const itemY = legendStartY + row * 14;
            if (itemY + 10 > height) return;
            
            ctx.fillStyle = seg.color;
            ctx.fillRect(itemX, itemY + 3, 7, 7);
            ctx.fillStyle = 'var(--text)';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(seg.day, itemX + 10, itemY + 7);
        });
    } else {
        const legendStartY = 20;
        ctx.fillStyle = 'var(--text-light)';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('📊 Distribución', legendX, legendStartY);
        
        segments.forEach((seg, i) => {
            const itemY = legendStartY + 18 + i * legendSpacing;
            ctx.fillStyle = seg.color;
            ctx.fillRect(legendX, itemY, 12, 12);
            ctx.fillStyle = 'var(--text)';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(seg.day, legendX + 18, itemY + 6);
            ctx.fillStyle = 'var(--text)';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('$' + seg.value.toFixed(0), legendX + 130, itemY + 6);
        });
    }
}

// ============================================================
// CARGAR DATOS DEL DASHBOARD
// ============================================================

async function loadDashboardData() {
    try {
        console.log('📊 Cargando datos del dashboard...');
        
        const stats = await window.DashboardModule.getDashboardStats({
            weekOffset: window._weekOffset || 0,
            chartMode: window._chartMode || 'last7'
        });
        
        if (!stats) {
            console.warn('⚠️ No se pudieron obtener estadísticas');
            return;
        }

        window._dailySalesData = stats.dailySales || [];
        window._diasSinVentasDetalle = stats.diasSinVentasDetalle || {};
        window._debtDetailsByClient = stats.debtDetailsByClient || [];

        const elements = {
            'stat-total-sales': stats.totalSales || 0,
            'stat-revenue': '$' + (stats.totalRevenue || 0).toFixed(2),
            'stat-expenses': '$' + (stats.totalExpenses || 0).toFixed(2),
            'stat-profit': '$' + (stats.netProfit || 0).toFixed(2),
            'stat-pending-orders': stats.pendingOrdersCount || 0,
            'stat-debts': '$' + (stats.totalDebts || 0).toFixed(2),
            'stat-today-sales': '$' + (stats.todayRevenue || 0).toFixed(2) + ' (' + (stats.todaySalesCount || 0) + ' ventas)',
            'stat-cash-balance': '$' + (stats.cash?.balance || 0).toFixed(2),
            'stat-bank-balance': '$' + (stats.bank?.balance || 0).toFixed(2),
            'stat-cash-income': '$' + (stats.cash?.income || 0).toFixed(2),
            'stat-cash-expenses': '$' + (stats.cash?.expenses || 0).toFixed(2),
            'stat-cash-balance-detail': '$' + (stats.cash?.balance || 0).toFixed(2),
            'stat-cash-sales-vs-expenses': '$' + (stats.cash?.salesVsExpenses || 0).toFixed(2),
            'stat-bank-income': '$' + (stats.bank?.income || 0).toFixed(2),
            'stat-bank-expenses': '$' + (stats.bank?.expenses || 0).toFixed(2),
            'stat-bank-balance-detail': '$' + (stats.bank?.balance || 0).toFixed(2),
            'stat-bank-sales-vs-expenses': '$' + (stats.bank?.salesVsExpenses || 0).toFixed(2),
            'stat-dias-ventas': stats.diasConVentas || 0,
            'stat-dias-sin-ventas': stats.diasSinVentas || 0,
            'stat-promedio-diario': '$' + (stats.promedioVentasDiarias || 0).toFixed(2),
            'stat-primer-dia': stats.primerDiaVenta ? formatearFechaYYYYMMDD(stats.primerDiaVenta) : '—',
            'stat-clientes-diferentes': stats.clientesDiferentes || 0
        };
        
        if (stats.releasedSales) {
            elements['stat-released-sales'] = '$' + (stats.releasedSales.total || 0).toFixed(2);
            elements['stat-released-sales-count'] = (stats.releasedSales.count || 0) + ' ventas';
        }
        
        if (stats.bestWorstDay && stats.bestWorstDay.best) {
            elements['stat-best-day'] = '$' + (stats.bestWorstDay.best.total || 0).toFixed(2);
            elements['stat-best-day-date'] = formatearFechaYYYYMMDD(stats.bestWorstDay.best.date);
        }
        
        if (stats.bestWorstDay && stats.bestWorstDay.worst) {
            elements['stat-worst-day'] = '$' + (stats.bestWorstDay.worst.total || 0).toFixed(2);
            elements['stat-worst-day-date'] = formatearFechaYYYYMMDD(stats.bestWorstDay.worst.date);
        }

        for (const [id, value] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }

        const user = window.AuthModule.getCurrentUser();
        const dashConfig = {
            show_corriente: true,
            show_orders_today: true,
            show_top_clients: true,
            show_top_products: true,
            show_funds_analysis: true,
            show_payment_methods: true,
            show_quick_actions: true,
            show_bank_qr: false,
            show_released_sales: true,
            show_best_worst_day: true,
            show_sales_by_employee: true,
            show_debts: true,
            show_rewards: true,
            show_producto_promedio: false,
            producto_promedio_id: null,
            ...(user?.dashboard_config || {})
        };

        if (dashConfig.show_orders_today) {
            const ordersTodayContainer = document.getElementById('dashboard-orders-today-container');
            if (ordersTodayContainer) {
                ordersTodayContainer.innerHTML = renderTarjetaPedidosHoy(stats);
            }
        }

        // 🆕 CORRECCIÓN N5: Renderizar tarjeta de promedio diario
        if (dashConfig.show_producto_promedio) {
            const promedioContainer = document.getElementById('dashboard-producto-promedio-container');
            if (promedioContainer) {
                const promedioHtml = renderTarjetaProductoPromedio(stats.promedioProducto);
                promedioContainer.innerHTML = promedioHtml;
                console.log(`📊 [N5] Tarjeta de promedio renderizada: ${promedioHtml ? 'SÍ' : 'NO'}`);
            }
        }

        console.log('👥 [REGRESIÓN #5] Estado de salesByEmployee antes de renderizar:', {
            existe: Array.isArray(stats.salesByEmployee),
            cantidad: stats.salesByEmployee?.length || 0,
            contenido: stats.salesByEmployee
        });

        if (dashConfig.show_sales_by_employee !== false) {
            renderSalesByEmployee(stats.salesByEmployee || []);
        }

        if (dashConfig.show_debts !== false) {
            renderDebtDetails(stats.debtDetailsByClient || []);
            const debtTotalEl = document.getElementById('stat-debts-total');
            if (debtTotalEl) {
                debtTotalEl.textContent = '$' + (stats.totalDebts || 0).toFixed(2);
            }
        }
        
        updateChartModeUI();
        
        setTimeout(renderChart, 100);

        renderTopProducts(stats.topProducts || []);
        renderPaymentMethods(stats.paymentMethods || []);
        renderTopClients(stats.topClients || []);
        
        if (dashConfig.show_bank_qr) {
            renderDashboardBankQR();
        }
        
        if (dashConfig.show_rewards && window.RewardsModule && typeof window.RewardsModule.renderRewardsCard === 'function') {
            const rewardsContainer = document.getElementById('dashboard-rewards-container');
            if (rewardsContainer) {
                const rewardsHtml = window.RewardsModule.renderRewardsCard();
                rewardsContainer.innerHTML = rewardsHtml;
            }
        }

        console.log('✅ Dashboard actualizado correctamente (v' + getAppVersion() + ')');
        console.log('   💰 [Punto #5] Deudas: ' + (stats.debtCount || 0) + ' ventas en ' + (stats.debtDetailsByClient?.length || 0) + ' cliente(s)');
        console.log('   📊 [N5] Promedio producto: ' + (stats.promedioProducto?.configurado ? 'activo' : 'inactivo'));

    } catch (error) {
        console.error('❌ Error cargando dashboard:', error);
        window.showToast('❌ Error al cargar el dashboard: ' + error.message, 'error', 4000);
    }
}

// ============================================================
// RENDER DEUDAS AGRUPADAS POR CLIENTE
// ============================================================

function renderDebtDetails(debtDetailsByClient) {
    const container = document.getElementById('debt-details');
    if (!container) return;

    if (!debtDetailsByClient || debtDetailsByClient.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 10px 0; color: var(--text-light);">✅ No hay deudas pendientes</div>`;
        return;
    }

    const headerHtml = `
        <div style="display: grid; grid-template-columns: 2fr 1fr 1.2fr auto; gap: 8px; align-items: center; padding: 6px 0; border-bottom: 2px solid var(--border-color); font-size: 11px; font-weight: 700; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.3px;">
            <span style="text-align: left;">👤 Cliente</span>
            <span style="text-align: center;">📦 Compras</span>
            <span style="text-align: right;">💰 Importe</span>
            <span style="text-align: center; width: 30px;"></span>
        </div>
    `;

    const rowsHtml = debtDetailsByClient.map((grupo, idx) => {
        const nombreEscapado = String(grupo.client_name).replace(/'/g, "\\'");
        
        return `
            <div style="display: grid; grid-template-columns: 2fr 1fr 1.2fr auto; gap: 8px; align-items: center; padding: 8px 0; border-bottom: ${idx < debtDetailsByClient.length - 1 ? '1px solid var(--border-color)' : 'none'}; font-size: 13px;">
                <span style="text-align: left; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${grupo.client_name}">
                    ${grupo.client_name}
                </span>
                <span style="text-align: center; color: var(--text-light);">
                    ${grupo.count} ${grupo.count === 1 ? 'compra' : 'compras'}
                </span>
                <span style="text-align: right; color: #ef4444; font-weight: 700;">
                    $${grupo.total.toFixed(2)}
                </span>
                <button 
                    onclick="showDebtDetailModal('${nombreEscapado}')" 
                    class="btn secondary" 
                    style="padding: 4px 8px; font-size: 11px; width: auto; white-space: nowrap;"
                    title="Ver detalle de deudas de ${grupo.client_name}">
                    👁️ Detalle
                </button>
            </div>
        `;
    }).join('');

    container.innerHTML = headerHtml + rowsHtml;
}

// ============================================================
// MODAL CON DETALLE DE DEUDAS POR CLIENTE
// ============================================================

function showDebtDetailModal(clientName) {
    const LOG_PREFIX = '💳 [showDebtDetailModal v3.1.2]';
    console.log(`${LOG_PREFIX} Abriendo detalle de deudas para: ${clientName}`);
    
    try {
        const grupos = window._debtDetailsByClient || [];
        const grupo = grupos.find(g => g.client_name === clientName);
        
        if (!grupo) {
            console.warn(`${LOG_PREFIX} ⚠️ No se encontró el grupo para: ${clientName}`);
            window.showToast('⚠️ No se encontró el detalle de este cliente', 'warning', 3000);
            return;
        }
        
        const existing = document.getElementById('debt-detail-modal');
        if (existing) existing.remove();
        
        const itemsHtml = grupo.items.map(item => {
            const fechaFormateada = formatearFechaYYYYMMDD(item.delivery_date);
            return `
                <div style="display: grid; grid-template-columns: 2fr 1.2fr 1.2fr; gap: 8px; align-items: center; padding: 8px 10px; border-bottom: 1px solid var(--border-color); font-size: 13px;">
                    <span style="text-align: left; color: var(--text-light);">
                        ${item.product_name || 'Producto'}
                        ${item.quantity && item.quantity > 1 ? `<span style="font-size: 11px;">(x${item.quantity})</span>` : ''}
                    </span>
                    <span style="text-align: right; color: #ef4444; font-weight: 600;">
                        $${parseFloat(item.remaining || item.total || 0).toFixed(2)}
                    </span>
                    <span style="text-align: right; font-size: 11px; color: var(--text-light);">
                        📅 ${fechaFormateada}
                    </span>
                </div>
            `;
        }).join('');
        
        const modal = document.createElement('div');
        modal.id = 'debt-detail-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            z-index: 999999; padding: 20px;
            animation: modalFadeIn 0.25s ease;
        `;
        
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 20px 24px; max-width: 520px; width: 100%; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #ef4444;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">💳</span>
                        <div>
                            <h2 style="margin: 0; font-size: 16px; color: #ef4444;">Detalle de deudas</h2>
                            <div style="font-size: 13px; color: var(--text); margin-top: 2px; font-weight: 600;">
                                👤 ${grupo.client_name}
                            </div>
                        </div>
                    </div>
                    <button onclick="closeDebtDetailModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px; line-height: 1;">✕</button>
                </div>
                
                <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                    <div style="flex: 1; background: #ef444415; border-left: 3px solid #ef4444; padding: 8px 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 20px; font-weight: 700; color: #ef4444;">${grupo.count}</div>
                        <div style="font-size: 11px; color: var(--text-light);">Compra${grupo.count !== 1 ? 's' : ''}</div>
                    </div>
                    <div style="flex: 1; background: #ef444415; border-left: 3px solid #ef4444; padding: 8px 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 20px; font-weight: 700; color: #ef4444;">$${grupo.total.toFixed(2)}</div>
                        <div style="font-size: 11px; color: var(--text-light);">Total adeudado</div>
                    </div>
                </div>
                
                <div style="flex: 1; overflow-y: auto; max-height: 400px; padding-right: 4px;">
                    <div style="display: grid; grid-template-columns: 2fr 1.2fr 1.2fr; gap: 8px; align-items: center; padding: 6px 10px; border-bottom: 2px solid var(--border-color); font-size: 11px; font-weight: 700; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.3px;">
                        <span style="text-align: left;">📦 Producto</span>
                        <span style="text-align: right;">💰 Importe</span>
                        <span style="text-align: right;">📅 Fecha</span>
                    </div>
                    ${itemsHtml}
                </div>
                
                <div style="display: flex; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color); flex-wrap: wrap;">
                    <button onclick="window.navigate('sales')" class="btn primary" style="flex: 1; padding: 8px 16px; font-size: 13px; background: #10b981; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        💰 Ir a cobrar
                    </button>
                    <button onclick="closeDebtDetailModal()" class="btn secondary" style="flex: 1; padding: 8px 16px; font-size: 13px;">
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        window.closeDebtDetailModal = function() {
            const m = document.getElementById('debt-detail-modal');
            if (m) {
                m.style.animation = 'modalFadeOut 0.2s ease forwards';
                setTimeout(() => { if (m.parentNode) m.remove(); }, 200);
            }
        };
        
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeDebtDetailModal();
            }
        });
        
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                closeDebtDetailModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        console.log(`${LOG_PREFIX} ✅ Modal abierto (${grupo.count} deudas, total $${grupo.total.toFixed(2)})`);
        
    } catch (e) {
        console.error(`${LOG_PREFIX} ❌ Error:`, e);
        window.showToast('❌ Error abriendo detalle: ' + e.message, 'error', 4000);
    }
}

window.showDebtDetailModal = showDebtDetailModal;

// ============================================================
// RENDER VENTAS POR EMPLEADO
// ============================================================

function renderSalesByEmployee(salesByEmployee) {
    const LOG_PREFIX = '👥 [renderSalesByEmployee v3.1.2]';
    
    const container = document.getElementById('sales-by-employee');
    if (!container) {
        console.log(`${LOG_PREFIX} ⚠️ No existe el contenedor #sales-by-employee (posiblemente el toggle está desactivado)`);
        return;
    }
    
    console.log(`${LOG_PREFIX} Recibido:`, {
        esArray: Array.isArray(salesByEmployee),
        longitud: salesByEmployee?.length,
        contenido: salesByEmployee
    });
    
    if (!salesByEmployee || !Array.isArray(salesByEmployee) || salesByEmployee.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 12px 0; color: var(--text-light);">
                <div style="font-size: 24px; margin-bottom: 4px;">👥</div>
                <div style="font-size: 12px;">Sin datos de empleados</div>
                <div style="font-size: 10px; color: var(--text-light); margin-top: 4px; opacity: 0.7;">
                    (No hay ventas registradas o el vendedor no está asignado)
                </div>
            </div>
        `;
        console.log(`${LOG_PREFIX} ⚠️ Array vacío o inválido → mostrando "Sin datos"`);
        return;
    }
    
    const colors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'];
    const medals = ['🥇', '🥈', '🥉'];
    const totalVentas = salesByEmployee.reduce((sum, e) => sum + (e.total || 0), 0);
    
    console.log(`${LOG_PREFIX} Total ventas a mostrar: $${totalVentas.toFixed(2)}`);
    
    container.innerHTML = salesByEmployee.map((emp, i) => {
        const nombre = emp.name 
            || emp.user_name 
            || emp.username 
            || emp.user_username
            || (emp.user_id ? `Usuario #${emp.user_id}` : 'Usuario desconocido');
        
        const cantidad = emp.count || 0;
        const total = emp.total || 0;
        const porcentaje = totalVentas > 0 ? (total / totalVentas * 100) : 0;
        const medal = i < 3 ? medals[i] : `#${i + 1}`;
        const color = colors[i % colors.length];
        
        return `
            <div style="padding: 8px 0; border-bottom: ${i < salesByEmployee.length - 1 ? '1px solid var(--border-color)' : 'none'};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
                        <span style="font-size: 16px; flex-shrink: 0;">${medal}</span>
                        <span style="font-size: 13px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${nombre}
                        </span>
                    </div>
                    <div style="text-align: right; flex-shrink: 0; margin-left: 8px;">
                        <div style="font-size: 14px; font-weight: 700; color: ${color};">
                            $${total.toFixed(2)}
                        </div>
                        <div style="font-size: 10px; color: var(--text-light);">
                            ${cantidad} venta${cantidad !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>
                <div style="width: 100%; height: 4px; background: var(--border-color); border-radius: 2px; overflow: hidden;">
                    <div style="width: ${porcentaje}%; height: 100%; background: ${color}; border-radius: 2px; transition: width 0.5s ease;"></div>
                </div>
            </div>
        `;
    }).join('');
    
    console.log(`${LOG_PREFIX} ✅ ${salesByEmployee.length} empleado(s) renderizado(s)`);
}

// ============================================================
// RENDER MEJORES CLIENTES
// ============================================================

function renderTopClients(topClients) {
    const container = document.getElementById('top-clients');
    if (!container) return;

    if (!topClients || topClients.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 10px 0; color: var(--text-light);">No hay clientes registrados</div>`;
        return;
    }

    const colors = ['#3b82f6', '#10b981', '#f59e0b'];

    container.innerHTML = topClients.map((client, i) => `
        <div style="display: grid; grid-template-columns: 40px 1fr auto auto; gap: 12px; align-items: center; padding: 8px 0; border-bottom: ${i < topClients.length - 1 ? '1px solid var(--border-color)' : 'none'};">
            <span style="font-size: 18px; font-weight: 700; color: ${colors[i % colors.length]}; text-align: left;">#${i + 1}</span>
            <span style="font-size: 14px; font-weight: 600; text-align: left;">${client.buyer || 'Cliente'}</span>
            <span style="font-size: 13px; color: var(--text-light); text-align: right;">🛒 ${client.sales_count} compras</span>
            <span style="font-size: 15px; font-weight: 700; color: var(--primary); text-align: right; min-width: 80px;">$${client.total_spent.toFixed(2)}</span>
        </div>
    `).join('');
}

// ============================================================
// PRODUCTOS MÁS VENDIDOS
// ============================================================

function renderTopProducts(topProducts) {
    const container = document.getElementById('top-products');
    if (!container) return;

    if (!topProducts || topProducts.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 10px 0; color: var(--text-light);">No hay productos registrados</div>`;
        return;
    }

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

    container.innerHTML = topProducts.map((p, i) => `
        <div style="display: grid; grid-template-columns: 30px 1fr auto auto; gap: 8px; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-color);">
            <span style="font-size: 11px; font-weight: 600; color: ${colors[i % colors.length]}; text-align: left;">#${i + 1}</span>
            <span style="font-size: 13px; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.product_name}</span>
            <span style="font-size: 12px; color: var(--text-light); text-align: right; min-width: 70px;">${p.sales_count} ventas</span>
            <span style="font-size: 13px; font-weight: 600; color: var(--primary); text-align: right; min-width: 70px;">$${p.total_revenue.toFixed(2)}</span>
        </div>
    `).join('');
}

// ============================================================
// MÉTODOS DE PAGO
// ============================================================

function renderPaymentMethods(paymentMethods) {
    const container = document.getElementById('payment-methods');
    if (!container) return;

    if (!paymentMethods || paymentMethods.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 10px 0; color: var(--text-light); grid-column: 1 / -1;">No hay métodos de pago registrados</div>`;
        return;
    }

    const icons = { 'cash': '💵', 'transfer': '🏦', 'debt': '💳', 'other': '🔄' };
    const labels = { 'cash': 'Efectivo', 'transfer': 'Transferencia', 'debt': 'Deuda', 'other': 'Otra' };
    const colors = { 'cash': '#10b981', 'transfer': '#3b82f6', 'debt': '#ef4444', 'other': '#8b5cf6' };

    const allMethods = ['cash', 'transfer', 'debt', 'other'];
    const existingMethods = paymentMethods.map(p => p.payment_method);
    
    for (const method of allMethods) {
        if (!existingMethods.includes(method)) {
            paymentMethods.push({ payment_method: method, count: 0, total: 0 });
        }
    }

    const total = paymentMethods.reduce((sum, p) => sum + p.total, 0);

    container.innerHTML = paymentMethods.map(p => {
        const percentage = total > 0 ? (p.total / total * 100) : 0;
        const hasData = p.total > 0;
        return `
            <div style="text-align: center; padding: 12px 8px; background: var(--bg); border-radius: 8px; border: 1px solid ${hasData ? colors[p.payment_method] : 'var(--border-color)'}; opacity: ${hasData ? 1 : 0.5};">
                <div style="font-size: 28px;">${icons[p.payment_method] || '💵'}</div>
                <div style="font-size: 14px; font-weight: 600; color: ${hasData ? colors[p.payment_method] : 'var(--text-light)'}; margin-top: 4px;">${labels[p.payment_method] || p.payment_method}</div>
                <div style="font-size: 16px; font-weight: 700; color: ${hasData ? 'var(--text)' : 'var(--text-light)'};">$${p.total.toFixed(2)}</div>
                <div style="font-size: 11px; color: var(--text-light);">${p.count} ventas</div>
                <div style="width: 100%; height: 4px; background: #e2e8f0; border-radius: 2px; margin-top: 6px; overflow: hidden;">
                    <div style="width: ${percentage}%; height: 100%; background: ${hasData ? colors[p.payment_method] : '#e2e8f0'}; border-radius: 2px; transition: width 0.5s ease;"></div>
                </div>
                <div style="font-size: 10px; color: var(--text-light); margin-top: 2px;">${percentage.toFixed(1)}%</div>
            </div>
        `;
    }).join('');
}

// ============================================================
// REFRESCAR Y EXPORTAR DASHBOARD
// ============================================================

async function refreshDashboard() {
    window.showToast('🔄 Actualizando dashboard...', 'info', 1000);
    await loadDashboardData();
    window.showToast('✅ Dashboard actualizado', 'success', 1500);
}

function exportDashboardReport() {
    window.DashboardModule.getDashboardStats().then(stats => {
        if (!stats) {
            window.showToast('❌ No se pudo generar el reporte', 'error');
            return;
        }

        const nombreNegocio = getNombreNegocio();
        const version = getAppVersion();

        const report = `
========================================
    📊 PANARIO - REPORTE DE NEGOCIO
========================================
Negocio: ${nombreNegocio}
Versión: ${version}
Fecha: ${new Date().toLocaleString('es-ES')}
----------------------------------------

📈 RESUMEN GENERAL
  Ventas totales: ${stats.totalSales}
  Ingresos totales: $${stats.totalRevenue.toFixed(2)}
  Gastos totales: $${stats.totalExpenses.toFixed(2)}
  Ganancia neta: $${stats.netProfit.toFixed(2)}
  Pedidos pendientes: ${stats.pendingOrdersCount}
  Deudas pendientes: $${stats.totalDebts.toFixed(2)}

📅 PEDIDOS
  Pedidos HOY: ${stats.ordersTodayCount || 0}
  Pedidos MAÑANA: ${stats.ordersTomorrowCount || 0}
  En lista de espera: ${stats.waitingListCount || 0}

📊 ESTADÍSTICAS AVANZADAS
  Días con ventas: ${stats.diasConVentas}
  Días sin ventas: ${stats.diasSinVentas || 0}
  Promedio diario: $${stats.promedioVentasDiarias.toFixed(2)}
  Primer día de venta: ${stats.primerDiaVenta || '—'}
  Clientes diferentes: ${stats.clientesDiferentes}

🚀 VENTAS LIBERADAS
  Cantidad: ${stats.releasedSales?.count || 0}
  Importe: $${(stats.releasedSales?.total || 0).toFixed(2)}

🥇 MEJOR Y PEOR DÍA
  Mejor día: ${stats.bestWorstDay?.best?.date || '—'} - $${(stats.bestWorstDay?.best?.total || 0).toFixed(2)}
  Peor día: ${stats.bestWorstDay?.worst?.date || '—'} - $${(stats.bestWorstDay?.worst?.total || 0).toFixed(2)}

👥 VENTAS POR EMPLEADO
${stats.salesByEmployee && stats.salesByEmployee.length > 0 
  ? stats.salesByEmployee.map((e, i) => `  ${i+1}. ${e.name}: ${e.count} ventas - $${e.total.toFixed(2)}`).join('\n') 
  : '  Sin datos'}

💵 FONDOS
  Efectivo en caja: $${stats.cash.balance.toFixed(2)}
  Banco: $${stats.bank.balance.toFixed(2)}

🏆 MEJORES CLIENTES
${stats.topClients && stats.topClients.length > 0 ? stats.topClients.map((c, i) => `  ${i+1}. ${c.buyer || 'Cliente'}: ${c.sales_count} compras - $${c.total_spent.toFixed(2)}`).join('\n') : '  No hay clientes registrados'}

📊 MÉTODOS DE PAGO
${stats.paymentMethods.map(p => `  ${p.payment_method}: $${p.total.toFixed(2)} (${p.count} ventas)`).join('\n')}

🏷️ PRODUCTOS MÁS VENDIDOS
${stats.topProducts.map((p, i) => `  ${i+1}. ${p.product_name}: ${p.sales_count} ventas - $${p.total_revenue.toFixed(2)}`).join('\n')}

----------------------------------------
Reporte generado desde Panario 🍞 v${version}
${nombreNegocio}
`;

        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-${nombreNegocio.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        window.showToast('✅ Reporte descargado', 'success', 2000);
    }).catch(error => {
        console.error('Error generando reporte:', error);
        window.showToast('❌ Error generando reporte', 'error');
    });
}

// ============================================================
// EXPORTAR GRÁFICOS
// ============================================================

function exportChartAsImage() {
    const LOG_PREFIX = '🖼️ [exportChartAsImage v3.1.2]';
    console.log(`${LOG_PREFIX} Iniciando exportación de gráfico como imagen...`);
    
    const container = document.getElementById('daily-sales-chart');
    if (!container) {
        console.error(`${LOG_PREFIX} ❌ No existe #daily-sales-chart`);
        window.showToast('❌ No hay gráfico para exportar', 'error');
        return;
    }
    
    try {
        const canvas = container.querySelector('canvas');
        if (canvas) {
            console.log(`${LOG_PREFIX} ✅ Canvas encontrado (gráfico pastel)`);
            const imageData = canvas.toDataURL('image/png');
            downloadImage(imageData, 'grafico-ventas-panario.png');
            return;
        }
        console.log(`${LOG_PREFIX} ℹ️ No hay canvas, buscando SVG...`);
        
        const svg = container.querySelector('svg');
        if (svg) {
            console.log(`${LOG_PREFIX} ✅ SVG encontrado (gráfico línea)`);
            const svgData = new XMLSerializer().serializeToString(svg);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            
            const img = new Image();
            img.onload = function() {
                try {
                    const canvas2 = document.createElement('canvas');
                    const dpr = window.devicePixelRatio || 1;
                    canvas2.width = (svg.clientWidth || 600) * dpr;
                    canvas2.height = (svg.clientHeight || 300) * dpr;
                    const ctx = canvas2.getContext('2d');
                    ctx.scale(dpr, dpr);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas2.width, canvas2.height);
                    ctx.drawImage(img, 0, 0, svg.clientWidth || 600, svg.clientHeight || 300);
                    
                    const dataUrl = canvas2.toDataURL('image/png');
                    URL.revokeObjectURL(url);
                    downloadImage(dataUrl, 'grafico-ventas-panario.png');
                } catch (e) {
                    console.error(`${LOG_PREFIX} ❌ Error convirtiendo SVG a PNG:`, e);
                    URL.revokeObjectURL(url);
                    window.showToast('❌ Error al convertir SVG', 'error');
                }
            };
            img.onerror = function() {
                console.error(`${LOG_PREFIX} ❌ Error cargando SVG como imagen`);
                URL.revokeObjectURL(url);
                window.showToast('⚠️ No se pudo exportar el SVG', 'warning');
            };
            img.src = url;
            return;
        }
        console.log(`${LOG_PREFIX} ℹ️ No hay SVG, usando fallback HTML/CSS (gráfico barras)`);
        
        const dailySales = window._dailySalesData || [];
        if (dailySales.length === 0) {
            console.warn(`${LOG_PREFIX} ⚠️ No hay datos en window._dailySalesData`);
            window.showToast('⚠️ No hay datos para exportar', 'warning');
            return;
        }
        
        console.log(`${LOG_PREFIX} ✅ Generando canvas manual con ${dailySales.length} días`);
        
        const canvas3 = document.createElement('canvas');
        const dpr = window.devicePixelRatio || 1;
        const width = container.clientWidth || 600;
        const height = 300;
        canvas3.width = width * dpr;
        canvas3.height = height * dpr;
        const ctx = canvas3.getContext('2d');
        ctx.scale(dpr, dpr);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#2d2d2d';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📈 Ventas diarias', width / 2, 25);
        
        const maxValue = Math.max(...dailySales.map(d => d.total), 1);
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const todayISO = hoyYYYYMMDD();
        
        const diasConVentas = dailySales.filter(d => d.total > 0);
        const maxVenta = diasConVentas.length > 0 ? Math.max(...diasConVentas.map(d => d.total)) : 0;
        const minVenta = diasConVentas.length > 0 ? Math.min(...diasConVentas.map(d => d.total)) : 0;
        const fechaMayor = diasConVentas.find(d => d.total === maxVenta)?.date || null;
        const fechaMenor = diasConVentas.find(d => d.total === minVenta)?.date || null;
        
        const paddingLeft = 40;
        const paddingRight = 20;
        const paddingTop = 50;
        const paddingBottom = 40;
        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;
        const barWidth = chartWidth / dailySales.length - 8;
        
        dailySales.forEach((d, i) => {
            const x = paddingLeft + i * (chartWidth / dailySales.length) + 4;
            const barHeight = (d.total / maxValue) * chartHeight;
            const y = paddingTop + chartHeight - barHeight;
            
            let color;
            if (d.total === 0) color = '#e2e8f0';
            else if (d.date === fechaMayor) color = '#10b981';
            else if (d.date === fechaMenor && maxVenta !== minVenta) color = '#ef4444';
            else if (d.date === todayISO) color = '#f59e0b';
            else color = '#3b82f6';
            
            ctx.fillStyle = color;
            ctx.fillRect(x, y, barWidth, barHeight);
            
            if (d.total > 0) {
                ctx.fillStyle = '#2d2d2d';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('$' + d.total.toFixed(0), x + barWidth / 2, y - 5);
            }
            
            const parts = d.date.split('-');
            const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            ctx.fillStyle = d.date === todayISO ? '#f59e0b' : '#666';
            ctx.font = d.date === todayISO ? 'bold 10px sans-serif' : '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(days[dateObj.getDay()], x + barWidth / 2, height - 20);
        });
        
        const totalSemana = dailySales.reduce((sum, d) => sum + d.total, 0);
        ctx.fillStyle = '#f5a623';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Total: $' + totalSemana.toFixed(0), width - paddingRight, 25);
        
        const dataUrl = canvas3.toDataURL('image/png');
        console.log(`${LOG_PREFIX} ✅ Canvas generado (${dataUrl.length} chars)`);
        downloadImage(dataUrl, 'grafico-ventas-panario.png');
        
    } catch (error) {
        console.error(`${LOG_PREFIX} ❌ Error:`, error);
        window.showToast('❌ Error al exportar: ' + error.message, 'error');
    }
}

function downloadImage(dataUrl, filename) {
    try {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.showToast('✅ Gráfico exportado como imagen', 'success');
    } catch (error) {
        console.error('Error descargando imagen:', error);
        window.showToast('❌ Error al descargar imagen', 'error');
    }
}

function exportChartAsPDF() {
    const LOG_PREFIX = '📄 [exportChartAsPDF v3.1.2]';
    console.log(`${LOG_PREFIX} Iniciando exportación de gráfico como PDF...`);
    
    const container = document.getElementById('daily-sales-chart');
    if (!container) {
        console.error(`${LOG_PREFIX} ❌ No existe #daily-sales-chart`);
        window.showToast('❌ No hay gráfico para exportar', 'error');
        return;
    }
    
    try {
        let imageSrc = '';
        const nombreNegocio = getNombreNegocio();
        
        const canvas = container.querySelector('canvas');
        if (canvas) {
            console.log(`${LOG_PREFIX} ✅ Canvas encontrado (gráfico pastel)`);
            imageSrc = canvas.toDataURL('image/png');
        } else {
            console.log(`${LOG_PREFIX} ℹ️ Generando canvas manual desde datos`);
            const dailySales = window._dailySalesData || [];
            if (dailySales.length === 0) {
                console.warn(`${LOG_PREFIX} ⚠️ No hay datos para exportar`);
                window.showToast('⚠️ No hay datos para exportar', 'warning');
                return;
            }
            
            const canvas2 = document.createElement('canvas');
            const dpr = window.devicePixelRatio || 1;
            const width = 700;
            const height = 350;
            canvas2.width = width * dpr;
            canvas2.height = height * dpr;
            const ctx = canvas2.getContext('2d');
            ctx.scale(dpr, dpr);
            
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            
            ctx.fillStyle = '#2d2d2d';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('📈 Ventas diarias - ' + nombreNegocio, width / 2, 30);
            
            ctx.fillStyle = '#666';
            ctx.font = '11px sans-serif';
            ctx.fillText('Generado: ' + new Date().toLocaleString('es-ES'), width / 2, 48);
            
            const maxValue = Math.max(...dailySales.map(d => d.total), 1);
            const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            const todayISO = hoyYYYYMMDD();
            
            const diasConVentas = dailySales.filter(d => d.total > 0);
            const maxVenta = diasConVentas.length > 0 ? Math.max(...diasConVentas.map(d => d.total)) : 0;
            const minVenta = diasConVentas.length > 0 ? Math.min(...diasConVentas.map(d => d.total)) : 0;
            const fechaMayor = diasConVentas.find(d => d.total === maxVenta)?.date || null;
            const fechaMenor = diasConVentas.find(d => d.total === minVenta)?.date || null;
            
            const paddingLeft = 50;
            const paddingRight = 30;
            const paddingTop = 70;
            const paddingBottom = 50;
            const chartWidth = width - paddingLeft - paddingRight;
            const chartHeight = height - paddingTop - paddingBottom;
            const barWidth = chartWidth / dailySales.length - 10;
            
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 0.5;
            ctx.setLineDash([4, 4]);
            for (let pct = 0; pct <= 100; pct += 25) {
                const y = paddingTop + chartHeight - (pct / 100) * chartHeight;
                ctx.beginPath();
                ctx.moveTo(paddingLeft, y);
                ctx.lineTo(width - paddingRight, y);
                ctx.stroke();
                
                ctx.fillStyle = '#999';
                ctx.font = '9px sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText('$' + (maxValue * pct / 100).toFixed(0), paddingLeft - 5, y + 3);
            }
            ctx.setLineDash([]);
            
            dailySales.forEach((d, i) => {
                const x = paddingLeft + i * (chartWidth / dailySales.length) + 5;
                const barHeight = (d.total / maxValue) * chartHeight;
                const y = paddingTop + chartHeight - barHeight;
                
                let color;
                if (d.total === 0) color = '#e2e8f0';
                else if (d.date === fechaMayor) color = '#10b981';
                else if (d.date === fechaMenor && maxVenta !== minVenta) color = '#ef4444';
                else if (d.date === todayISO) color = '#f59e0b';
                else color = '#3b82f6';
                
                ctx.fillStyle = color;
                ctx.fillRect(x, y, barWidth, barHeight);
                
                if (d.total > 0) {
                    ctx.fillStyle = '#2d2d2d';
                    ctx.font = 'bold 9px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('$' + d.total.toFixed(0), x + barWidth / 2, y - 4);
                }
                
                const parts = d.date.split('-');
                const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                ctx.fillStyle = d.date === todayISO ? '#f59e0b' : '#666';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(days[dateObj.getDay()], x + barWidth / 2, height - 25);
                
                ctx.fillStyle = '#999';
                ctx.font = '8px sans-serif';
                ctx.fillText(d.date.slice(8, 10) + '/' + d.date.slice(5, 7), x + barWidth / 2, height - 12);
            });
            
            const totalSemana = dailySales.reduce((sum, d) => sum + d.total, 0);
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(0, height - 35, width, 35);
            
            ctx.fillStyle = '#f5a623';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('📊 Total: $' + totalSemana.toFixed(0), 15, height - 14);
            
            ctx.fillStyle = '#10b981';
            ctx.textAlign = 'center';
            ctx.fillText('🥇 Mayor: $' + maxVenta.toFixed(0), width / 2, height - 14);
            
            ctx.fillStyle = '#ef4444';
            ctx.textAlign = 'right';
            ctx.fillText('📉 Menor: $' + minVenta.toFixed(0), width - 15, height - 14);
            
            imageSrc = canvas2.toDataURL('image/png');
            console.log(`${LOG_PREFIX} ✅ Canvas manual generado (${imageSrc.length} chars)`);
        }
        
        if (imageSrc) {
            generatePDFWithImage(imageSrc);
        } else {
            console.warn(`${LOG_PREFIX} ⚠️ No se pudo generar la imagen`);
        }
        
    } catch (error) {
        console.error(`${LOG_PREFIX} ❌ Error:`, error);
        window.showToast('❌ Error al exportar: ' + error.message, 'error');
    }
}

function generatePDFWithImage(imageSrc) {
    const today = new Date().toLocaleDateString('es-ES');
    const nombreNegocio = getNombreNegocio();
    const version = getAppVersion();
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Gráfico de Ventas - ${nombreNegocio}</title>
            <style>
                * { font-family: system-ui, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
                body { padding: 30px; background: #fff; text-align: center; }
                .header { margin-bottom: 20px; border-bottom: 3px solid #f5a623; padding-bottom: 15px; }
                .header h1 { color: #f5a623; font-size: 24px; }
                .header .negocio { color: #2d2d2d; font-size: 18px; font-weight: 600; margin-top: 4px; }
                .header p { color: #666; font-size: 14px; margin-top: 4px; }
                .chart-container { margin: 20px auto; max-width: 100%; }
                .chart-container img { max-width: 100%; height: auto; border-radius: 8px; }
                .footer { margin-top: 20px; color: #94a3b8; font-size: 12px; border-top: 1px solid #eee; padding-top: 15px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 Gráfico de Ventas Diarias</h1>
                <div class="negocio">🏢 ${nombreNegocio}</div>
                <p>${today}</p>
            </div>
            <div class="chart-container">
                <img src="${imageSrc}" alt="Gráfico de Ventas">
            </div>
            <div class="footer">
                Reporte generado desde Panario 🍞 v${version} - ${new Date().toLocaleString('es-ES')}
            </div>
        </body>
        </html>
    `;
    
    const win = window.open('', '_blank');
    if (!win) {
        console.error('❌ [generatePDFWithImage] Ventana emergente bloqueada');
        window.showToast('❌ Permite ventanas emergentes', 'error');
        return;
    }
    
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
        win.print();
    }, 500);
}

// ============================================================
// SELECCIÓN DE MODO DE NEGOCIO EN REGISTRO
// ============================================================

function selectNegocioMode(mode) {
    const labels = document.querySelectorAll('.negocio-mode-option');
    labels.forEach(label => {
        const radio = label.querySelector('input[type="radio"]');
        if (radio.value === mode) {
            radio.checked = true;
            label.style.borderColor = 'var(--primary)';
            label.style.background = 'var(--primary-light)';
        } else {
            radio.checked = false;
            label.style.borderColor = 'var(--border-color)';
            label.style.background = 'var(--bg)';
        }
    });
    
    const nameGroup = document.getElementById('negocio-name-group');
    const codeGroup = document.getElementById('negocio-code-group');
    
    if (mode === 'unirse') {
        if (nameGroup) nameGroup.style.display = 'none';
        if (codeGroup) codeGroup.style.display = 'block';
    } else {
        if (nameGroup) nameGroup.style.display = 'block';
        if (codeGroup) codeGroup.style.display = 'none';
        const preview = document.getElementById('negocio-preview');
        if (preview) preview.innerHTML = '';
    }
}

function previewNegocio(codigo) {
    const preview = document.getElementById('negocio-preview');
    if (!preview) return;
    
    const limpio = codigo.trim().toUpperCase();
    
    if (limpio.length === 0) {
        preview.innerHTML = '';
        return;
    }
    
    if (limpio.length < 8) {
        preview.innerHTML = `<span style="color: var(--text-light);">Escribe los ${8 - limpio.length} caracteres restantes...</span>`;
        return;
    }
    
    const result = window.AuthModule.validarCodigoInvitacion(limpio);
    
    if (result.valid) {
        preview.innerHTML = `
            <div style="background: #10b98120; border-left: 3px solid #10b981; padding: 6px 10px; border-radius: 6px; color: #10b981;">
                ✅ Negocio encontrado: <strong>${result.negocio.nombre}</strong>
                <br><span style="font-size: 11px; color: var(--text-light);">${result.usuarios} usuario(s) registrado(s)</span>
            </div>
        `;
    } else {
        preview.innerHTML = `
            <div style="background: #ef444420; border-left: 3px solid #ef4444; padding: 6px 10px; border-radius: 6px; color: #ef4444;">
                ❌ Código no válido. Verifica e intenta de nuevo.
            </div>
        `;
    }
}

// ============================================================
// EXPORTACIÓN
// ============================================================

window.Panario = { initApp, navigate, handleLogin, handleRegister };

window.navigate = navigate;
window.navigateWithFilters = navigateWithFilters;
window.initApp = initApp;
window.loadDashboardData = loadDashboardData;
window.refreshDashboard = refreshDashboard;
window.exportDashboardReport = exportDashboardReport;
window.updateTopBarAvatar = updateTopBarAvatar;
window.toggleUserMenu = toggleUserMenu;
window.handleLogout = handleLogout;
window.renderDashboardView = renderDashboardView;
window.renderDashboardBankQR = renderDashboardBankQR;
window.downloadDashboardQR = downloadDashboardQR;
window.scrollToTop = scrollToTop;
window.scrollToBottom = scrollToBottom;
window.adjustForSafeArea = adjustForSafeArea;
window.formatDate = formatDate;
window.formatearFechaYYYYMMDD = formatearFechaYYYYMMDD;
window.renderChart = renderChart;
window.exportChartAsImage = exportChartAsImage;
window.exportChartAsPDF = exportChartAsPDF;
window.changeWeek = changeWeek;
window.changeChartMode = changeChartMode;
window.reloadChartWithWeekOffset = reloadChartWithWeekOffset;
window.updateChartModeUI = updateChartModeUI;
window.renderTarjetaCorrienteHoy = renderTarjetaCorrienteHoy;
window.renderTarjetaPedidosHoy = renderTarjetaPedidosHoy;
window.renderTarjetaProductoPromedio = renderTarjetaProductoPromedio; // 🆕 N5
window.selectNegocioMode = selectNegocioMode;
window.previewNegocio = previewNegocio;
window.refreshCurrentView = refreshCurrentView;
window.setupDbSavedListener = setupDbSavedListener;
window.fechaLocalYYYYMMDD = fechaLocalYYYYMMDD;
window.hoyYYYYMMDD = hoyYYYYMMDD;
window.mananaYYYYMMDD = mananaYYYYMMDD;
window.formatearFechaConDiaSemana = formatearFechaConDiaSemana;
window.cerrarTodosLosModalesRespaldo = cerrarTodosLosModalesRespaldo;
window.getNombreNegocio = getNombreNegocio;
window.getInicialNegocio = getInicialNegocio;
window.updateDocumentTitle = updateDocumentTitle;
window.updateAppHeader = updateAppHeader;
window.debouncedRefreshCurrentView = debouncedRefreshCurrentView;
window.formatearFechaInteligente = formatearFechaInteligente;
window.renderSalesByEmployee = renderSalesByEmployee;
window.openDetailedHelp = openDetailedHelp;
window.getAppVersion = getAppVersion;
window.renderDebtDetails = renderDebtDetails;
window.showDebtDetailModal = showDebtDetailModal;

window.isDbReady = isDbReady;
window.forzarStickyHeader = forzarStickyHeader;
window.startHeaderCleanupWatchers = startHeaderCleanupWatchers;
window.stopHeaderCleanupWatchers = stopHeaderCleanupWatchers;
window.getMotivoSinVentas = getMotivoSinVentas;

console.log('📦 App Controller v' + getAppVersion() + ' (v3.1.2: Corrección N5 - tarjeta de promedio diario)');

// ============================================================
// INICIALIZACIÓN AUTOMÁTICA
// ============================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

setTimeout(() => {
    if (!window._appStarted) {
        window._appStarted = true;
        initApp();
    }
}, 500);