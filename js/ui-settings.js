// ============================================================
// 📦 UI SETTINGS - Panario (Configuración y Herramientas)
// CORREGIDO: Botón "Hoy" del calendario, reporte PDF,
// origen del pago en gastos, reporte de gastos
// ACTUALIZADO: Backups diferenciados por rol + recarga con timestamp
// ACTUALIZADO: Funciones wrapper para Salva Diferencial
// ACTUALIZADO: Módulo de Usuarios (solo admin)
// CORREGIDO FASE 1 (160926):
//   - Exportar/Importar BD ahora usa reload(true) con ?refresh=
// CORREGIDO FASE 2 (160926):
//   - Modal de reporte de gastos unificado con el de pedidos
// CORREGIDO FASE 4B (170926):
//   - deleteUser() cierra el modal de usuarios ANTES del confirm
// CORREGIDO FASE A.3 (170926 v2):
//   - TODOS los flujos de export/import envueltos en try/catch/finally
// AÑADIDO FASE B (170926 v3):
//   - showCreateUserModal(), showEditUserModal(), showChangePasswordModal(),
//     handleToggleAdmin()
// AÑADIDO FASE E (180926):
//   - showHorarioDetalle() muestra el día de la semana completo
// AÑADIDO (180926 v2):
//   - showDeleteSelectorModal() ahora muestra en las ventas:
//     #ID, nombre del producto, total, método de pago, cliente, fecha, estado
// AÑADIDO FASE 1.3.4 (190926):
//   - importDatabaseFusionAction(): wrapper para la fusión
// 🆕 FASE 2.3 (200926 v4):
//   - NUEVA sección "⏰ Lista de espera" en Herramientas
//   - NUEVA sección "🚨 Cancelación global de pedidos" (solo admin)
// 🆕 FASE 6 (#11) (200926 v5):
//   - El bloque "ℹ️ Información" LEE la versión desde meta tag
// 🆕 FASE 7 (Entrega 5 - 200926 v6):
//   - NUEVA sección "🔄 Reprogramar pedidos por rango" (solo admin)
// 🆕 FASE 7.1 (210926 v7): FIX CRÍTICO - PRODUCCIÓN
//   - guardarProduccion() usa window.DBModule.saveProduccion()
//   - eliminarProduccion() usa window.DBModule.deleteProduccion()
//   - getProduccionConfig() usa window.DBModule.getProduccionByFecha()
// 🆕 FASE 7.2 (210926 v8): CANTIDAD DE PRODUCCIÓN CON DECIMALES
//   - formatearCantidadProduccion() nueva función helper
//   - Input de cantidad con step="0.1"
//   - guardarProduccion() usa parseFloat()
// 🆕 ENTREGA 6 (230926 v9): DIAGNÓSTICO DE PRODUCCIÓN
//   - ✅ NUEVO: showProductionDiagnosticModal()
//     * Botón discreto "🔍 Diagnóstico" en la sección de producción
//     * Ejecuta 6 tests de diagnóstico:
//       1. DBModule disponible
//       2. saveProduccion existe
//       3. getProduccionByFecha existe
//       4. Tabla calendario_produccion existe
//       5. Estructura de columnas correcta
//       6. Insert de prueba (con rollback)
//     * Muestra resultado visual (✅/❌/⚠️) por test
//     * Botón "📋 Copiar reporte" para pegar en el chat
//     * Botón "🧹 Limpiar caché y recargar"
//     * Muestra versión del meta tag, navegador, etc.
//   - ✅ NUEVO: runProductionDiagnostics() → ejecuta los tests
//   - ✅ NUEVO: renderDiagnosticResults() → muestra los resultados
//   - ✅ NUEVO: copyDiagnosticReport() → copia al portapapeles
//   - ✅ Logs detallados de cada paso en consola
//   - ✅ El modal es autosuficiente (no depende de otros módulos)
// ============================================================

// ============================================================
// 🆕 FASE 6: HELPER PARA OBTENER LA VERSIÓN DE LA APP
// ============================================================

/**
 * Devuelve la versión actual de la app leyéndola del <meta name="app-version">.
 * Si no existe, devuelve un fallback.
 */
function getAppVersion() {
    try {
        const meta = document.querySelector('meta[name="app-version"]');
        if (meta && meta.content) {
            return meta.content;
        }
    } catch (e) {
        console.warn('⚠️ Error leyendo app-version:', e);
    }
    return '2.1.11';
}

window.getAppVersion = getAppVersion;

// ============================================================
// 🆕 FASE 7: MOTIVOS PREDEFINIDOS PARA REPROGRAMACIÓN
// ============================================================

const MOTIVOS_REPROGRAMACION = [
    { value: 'Falta de insumos', label: '🛒 Falta de insumos' },
    { value: 'Apagón prolongado', label: '⚡ Apagón prolongado' },
    { value: 'Mantenimiento de equipos', label: '🔧 Mantenimiento de equipos' },
    { value: 'Fuerza mayor', label: '⚠️ Fuerza mayor' },
    { value: 'Problema de salud', label: '🏥 Problema de salud' },
    { value: 'Clima adverso', label: '🌧️ Clima adverso' },
    { value: 'Solicitud del cliente', label: '👤 Solicitud del cliente' },
    { value: 'Otro', label: '🔄 Otro' }
];

// ============================================================
// MÓDULO DE HORARIOS DE CORRIENTE
// ============================================================

function convertirA12Horas(hora24) {
    if (!hora24) return '';
    const [h, m] = hora24.split(':').map(Number);
    const periodo = h >= 12 ? 'PM' : 'AM';
    let hora12 = h % 12;
    if (hora12 === 0) hora12 = 12;
    return `${hora12}:${String(m).padStart(2, '0')} ${periodo}`;
}

function convertirA24Horas(hora12) {
    if (!hora12) return '';
    const match = hora12.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return hora12;
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const periodo = match[3].toUpperCase();
    if (periodo === 'PM' && h !== 12) h += 12;
    if (periodo === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ============================================================
// 🆕 FASE 7.2: HELPERS DE PRODUCCIÓN
// ============================================================

/**
 * Obtiene la configuración de producción para una fecha.
 */
function getProduccionConfig(fechaISO) {
    try {
        if (!fechaISO) {
            console.warn('⚠️ getProduccionConfig: falta fechaISO');
            return null;
        }
        
        if (!window.DBModule || typeof window.DBModule.getProduccionByFecha !== 'function') {
            console.warn('⚠️ getProduccionConfig: DBModule.getProduccionByFecha no disponible');
            return null;
        }
        
        return window.DBModule.getProduccionByFecha(fechaISO);
    } catch (e) {
        console.warn('⚠️ Error leyendo config de producción:', e);
        return null;
    }
}

/**
 * Cuenta pedidos y ventas con soporte para decimales.
 */
function contarPedidosYVentasFecha(fechaISO) {
    try {
        const negocioId = window.DBModule.getNegocioIdActual();
        if (!negocioId || !fechaISO) return { pedidos: 0, ventas: 0, disponibles: 0, cantidadProduccion: 0 };
        
        const pedidosResult = window.DBModule.query(
            `SELECT COUNT(*) as count FROM orders 
             WHERE negocio_id = ? 
               AND DATE(delivery_date) = DATE(?)
               AND deleted_at IS NULL
               AND status NOT IN ('cancelled', 'delivered', 'waiting_bought')`,
            [negocioId, fechaISO]
        );
        const pedidos = pedidosResult[0]?.count || 0;
        
        const ventasResult = window.DBModule.query(
            `SELECT COUNT(*) as count FROM sales 
             WHERE negocio_id = ? 
               AND DATE(sale_date, "localtime") = DATE(?)
               AND deleted_at IS NULL 
               AND voided = 0
               AND (order_id IS NULL OR order_id = 0)`,
            [negocioId, fechaISO]
        );
        const ventas = ventasResult[0]?.count || 0;
        
        const config = getProduccionConfig(fechaISO);
        const cantidadProduccion = parseFloat(config?.cantidad_produccion) || 0;
        
        const disponibles = cantidadProduccion > 0 
            ? Math.max(0, cantidadProduccion - pedidos - ventas)
            : null;
        
        return { pedidos, ventas, disponibles, cantidadProduccion };
    } catch (e) {
        console.warn('⚠️ Error contando pedidos/ventas:', e);
        return { pedidos: 0, ventas: 0, disponibles: 0, cantidadProduccion: 0 };
    }
}

/**
 * Formatea una cantidad de producción para mostrarla al usuario.
 */
function formatearCantidadProduccion(cantidad) {
    if (cantidad === null || cantidad === undefined) return '—';
    const num = parseFloat(cantidad);
    if (isNaN(num)) return '—';
    if (num === Math.floor(num)) return String(Math.floor(num));
    return num.toFixed(2).replace(/\.?0+$/, '');
}

window.getProduccionConfig = getProduccionConfig;
window.contarPedidosYVentasFecha = contarPedidosYVentasFecha;
window.formatearCantidadProduccion = formatearCantidadProduccion;

// ============================================================
// 🆕 ENTREGA 6: DIAGNÓSTICO DE PRODUCCIÓN
// ============================================================
// 
// Modal de diagnóstico temporal para identificar por qué el
// guardado de producción puede fallar en algunos dispositivos.
// 
// Ejecuta 6 tests y muestra el resultado visual:
//   1. DBModule está cargado
//   2. saveProduccion() existe
//   3. getProduccionByFecha() existe
//   4. La tabla calendario_produccion existe
//   5. La estructura de columnas es correcta
//   6. Se puede hacer un INSERT de prueba
// ============================================================

async function runProductionDiagnostics() {
    const results = [];
    
    console.log('🔍 ============================================');
    console.log('🔍 DIAGNÓSTICO DE PRODUCCIÓN - Iniciando...');
    console.log('🔍 ============================================');
    
    // ============================================================
    // TEST 1: DBModule disponible
    // ============================================================
    try {
        if (typeof window.DBModule === 'undefined') {
            results.push({
                name: '1. DBModule disponible',
                status: 'error',
                message: 'window.DBModule NO está definido',
                detail: 'El módulo db.js no se cargó correctamente.'
            });
        } else if (typeof window.DBModule.getDB !== 'function') {
            results.push({
                name: '1. DBModule disponible',
                status: 'error',
                message: 'window.DBModule existe pero no tiene getDB()',
                detail: 'El módulo db.js está incompleto o corrupto.'
            });
        } else {
            let dbOk = false;
            let dbState = '';
            try {
                const db = window.DBModule.getDB();
                dbOk = !!db;
                dbState = dbOk ? 'instancia válida' : 'null';
            } catch (e) {
                dbState = 'error: ' + e.message;
            }
            
            results.push({
                name: '1. DBModule disponible',
                status: dbOk ? 'ok' : 'error',
                message: dbOk ? 'DBModule OK y getDB() devuelve instancia' : 'getDB() falla',
                detail: 'Estado: ' + dbState
            });
        }
    } catch (e) {
        results.push({
            name: '1. DBModule disponible',
            status: 'error',
            message: 'Excepción: ' + e.message,
            detail: ''
        });
    }
    
    // ============================================================
    // TEST 2: saveProduccion existe
    // ============================================================
    try {
        if (typeof window.DBModule?.saveProduccion !== 'function') {
            results.push({
                name: '2. saveProduccion() existe',
                status: 'error',
                message: 'window.DBModule.saveProduccion NO es una función',
                detail: 'El método no está exportado desde db.js. Es posible que tengas una versión antigua.'
            });
        } else {
            results.push({
                name: '2. saveProduccion() existe',
                status: 'ok',
                message: 'window.DBModule.saveProduccion está disponible',
                detail: ''
            });
        }
    } catch (e) {
        results.push({
            name: '2. saveProduccion() existe',
            status: 'error',
            message: 'Excepción: ' + e.message,
            detail: ''
        });
    }
    
    // ============================================================
    // TEST 3: getProduccionByFecha existe
    // ============================================================
    try {
        if (typeof window.DBModule?.getProduccionByFecha !== 'function') {
            results.push({
                name: '3. getProduccionByFecha() existe',
                status: 'error',
                message: 'window.DBModule.getProduccionByFecha NO es una función',
                detail: 'El método no está exportado desde db.js.'
            });
        } else {
            results.push({
                name: '3. getProduccionByFecha() existe',
                status: 'ok',
                message: 'window.DBModule.getProduccionByFecha está disponible',
                detail: ''
            });
        }
    } catch (e) {
        results.push({
            name: '3. getProduccionByFecha() existe',
            status: 'error',
            message: 'Excepción: ' + e.message,
            detail: ''
        });
    }
    
    // ============================================================
    // TEST 4: Tabla calendario_produccion existe
    // ============================================================
    try {
        const db = window.DBModule.getDB();
        const check = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='calendario_produccion'`);
        
        if (check.length === 0 || check[0].values.length === 0) {
            results.push({
                name: '4. Tabla calendario_produccion existe',
                status: 'error',
                message: 'La tabla NO existe en la base de datos',
                detail: 'Posible causa: la migración falló. Revisa la consola al inicio.'
            });
        } else {
            results.push({
                name: '4. Tabla calendario_produccion existe',
                status: 'ok',
                message: 'La tabla existe',
                detail: ''
            });
        }
    } catch (e) {
        results.push({
            name: '4. Tabla calendario_produccion existe',
            status: 'error',
            message: 'Excepción: ' + e.message,
            detail: ''
        });
    }
    
    // ============================================================
    // TEST 5: Estructura de columnas correcta
    // ============================================================
    try {
        const db = window.DBModule.getDB();
        const pragma = db.exec('PRAGMA table_info(calendario_produccion)');
        
        if (pragma.length === 0 || !pragma[0].values) {
            results.push({
                name: '5. Estructura de columnas',
                status: 'error',
                message: 'No se pudo leer PRAGMA table_info',
                detail: ''
            });
        } else {
            const columnas = pragma[0].values.map(row => row[1]);
            const requeridas = ['id', 'negocio_id', 'fecha', 'hora_inicio', 'hora_fin', 
                                'bloque_index', 'cantidad_produccion', 'notas',
                                'created_by', 'modified_by', 'created_at', 'updated_at',
                                'deleted_at', 'uuid'];
            
            const faltantes = requeridas.filter(c => !columnas.includes(c));
            
            // Verificar el tipo de cantidad_produccion
            const cantidadCol = pragma[0].values.find(row => row[1] === 'cantidad_produccion');
            const tipoCantidad = cantidadCol ? String(cantidadCol[2]).toUpperCase() : 'desconocido';
            const esReal = tipoCantidad.includes('REAL') || tipoCantidad.includes('FLOAT') || 
                          tipoCantidad.includes('DOUBLE') || tipoCantidad.includes('NUMERIC');
            
            if (faltantes.length > 0) {
                results.push({
                    name: '5. Estructura de columnas',
                    status: 'error',
                    message: `Faltan ${faltantes.length} columnas: ${faltantes.join(', ')}`,
                    detail: `Columnas actuales: ${columnas.join(', ')}`
                });
            } else if (!esReal) {
                results.push({
                    name: '5. Estructura de columnas',
                    status: 'warning',
                    message: `cantidad_produccion es ${tipoCantidad}, no REAL`,
                    detail: 'No aceptará decimales. Actualiza a la versión 2.1.8+ para tener la migración automática.'
                });
            } else {
                results.push({
                    name: '5. Estructura de columnas',
                    status: 'ok',
                    message: `Todas las columnas presentes (${columnas.length}). cantidad_produccion = ${tipoCantidad}`,
                    detail: ''
                });
            }
        }
    } catch (e) {
        results.push({
            name: '5. Estructura de columnas',
            status: 'error',
            message: 'Excepción: ' + e.message,
            detail: ''
        });
    }
    
    // ============================================================
    // TEST 6: INSERT de prueba (con rollback)
    // ============================================================
    try {
        const fechaTest = '1900-01-01'; // Fecha muy antigua para no chocar
        const negocioId = window.DBModule.getNegocioIdActual();
        
        if (!negocioId) {
            results.push({
                name: '6. INSERT de prueba',
                status: 'warning',
                message: 'No hay negocioId para probar',
                detail: 'Inicia sesión y vuelve a intentar.'
            });
        } else {
            // Primero: intentar borrar si existe
            try {
                window.DBModule.execute(
                    `DELETE FROM calendario_produccion WHERE negocio_id = ? AND fecha = ?`,
                    [negocioId, fechaTest]
                );
            } catch (e) {}
            
            // Segundo: intentar insertar
            const uuid = 'test_' + Date.now();
            
            try {
                window.DBModule.execute(`
                    INSERT INTO calendario_produccion 
                    (negocio_id, fecha, hora_inicio, hora_fin, bloque_index, 
                     cantidad_produccion, notas, created_by, modified_by, uuid)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    negocioId, fechaTest, '10:00', '13:00', 1,
                    6.5, 'TEST DIAGNÓSTICO', null, null, uuid
                ]);
                
                // Verificar que se guardó
                const verif = window.DBModule.query(
                    `SELECT * FROM calendario_produccion WHERE uuid = ?`,
                    [uuid]
                );
                
                if (verif.length > 0 && parseFloat(verif[0].cantidad_produccion) === 6.5) {
                    results.push({
                        name: '6. INSERT de prueba',
                        status: 'ok',
                        message: 'INSERT funciona correctamente (con decimales)',
                        detail: 'Se guardó cantidad 6.5 y se leyó de vuelta correctamente.'
                    });
                } else if (verif.length > 0) {
                    results.push({
                        name: '6. INSERT de prueba',
                        status: 'warning',
                        message: 'INSERT funcionó pero la lectura no coincide',
                        detail: `Leído: ${verif[0].cantidad_produccion}, esperado: 6.5`
                    });
                } else {
                    results.push({
                        name: '6. INSERT de prueba',
                        status: 'warning',
                        message: 'INSERT sin error pero no se encontró al leer',
                        detail: 'Puede ser un problema de persistencia.'
                    });
                }
                
                // Limpiar el registro de prueba
                try {
                    window.DBModule.execute(
                        `DELETE FROM calendario_produccion WHERE uuid = ?`,
                        [uuid]
                    );
                } catch (e) {}
                
            } catch (insertErr) {
                results.push({
                    name: '6. INSERT de prueba',
                    status: 'error',
                    message: 'INSERT falló: ' + insertErr.message,
                    detail: 'Este es el error real que ves al guardar producción.'
                });
            }
        }
    } catch (e) {
        results.push({
            name: '6. INSERT de prueba',
            status: 'error',
            message: 'Excepción: ' + e.message,
            detail: ''
        });
    }
    
    // ============================================================
    // RESUMEN FINAL
    // ============================================================
    const okCount = results.filter(r => r.status === 'ok').length;
    const warnCount = results.filter(r => r.status === 'warning').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    console.log('🔍 ============================================');
    console.log(`🔍 RESULTADO: ${okCount} OK, ${warnCount} WARN, ${errorCount} ERROR`);
    console.log('🔍 ============================================');
    results.forEach(r => {
        const icon = r.status === 'ok' ? '✅' : r.status === 'warning' ? '⚠️' : '❌';
        console.log(`${icon} ${r.name}: ${r.message}`);
        if (r.detail) console.log(`   → ${r.detail}`);
    });
    console.log('🔍 ============================================');
    
    return {
        results,
        summary: { ok: okCount, warning: warnCount, error: errorCount, total: results.length }
    };
}

window.runProductionDiagnostics = runProductionDiagnostics;

// ============================================================
// 🆕 ENTREGA 6: MODAL DE DIAGNÓSTICO
// ============================================================

async function showProductionDiagnosticModal() {
    const existingModal = document.getElementById('production-diagnostic-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'production-diagnostic-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999999; padding: 15px;
        animation: modalFadeIn 0.25s ease;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 640px; width: 100%; max-height: 92vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #8b5cf6;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">🔍</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #8b5cf6;">Diagnóstico de Producción</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">Verifica por qué puede fallar el guardado</p>
                    </div>
                </div>
                <button onclick="closeProductionDiagnosticModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="background: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 12px; color: #1e40af;">
                💡 <strong>¿Qué hace esto?</strong><br>
                Ejecuta 6 comprobaciones técnicas sobre el sistema de producción. Si algo falla, podrás copiar el reporte y enviarlo al desarrollador.
            </div>
            
            <!-- INFO DEL ENTORNO -->
            <div style="background: var(--bg); border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; font-size: 11px;">
                <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                    <span style="color: var(--text-light);">📱 Versión app:</span>
                    <strong id="diag-app-version">${getAppVersion()}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                    <span style="color: var(--text-light);">🌐 Navegador:</span>
                    <strong id="diag-browser">${navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Otro'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                    <span style="color: var(--text-light);">🔗 Online:</span>
                    <strong id="diag-online">${navigator.onLine ? '✅ Sí' : '❌ No'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                    <span style="color: var(--text-light);">📅 Fecha:</span>
                    <strong>${new Date().toLocaleString('es-ES')}</strong>
                </div>
            </div>
            
            <!-- RESULTADOS -->
            <div id="diag-results-container">
                <div style="text-align: center; padding: 30px 20px;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #8b5cf6; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                    <p style="margin-top: 12px; font-size: 14px; color: var(--text-light);">Ejecutando diagnóstico...</p>
                </div>
            </div>
            
            <!-- BOTONES -->
            <div id="diag-buttons" style="display: none; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-color); flex-wrap: wrap;">
                <button onclick="copyDiagnosticReport()" 
                        class="btn primary"
                        style="flex: 1; min-width: 140px; padding: 10px 16px; font-size: 13px; background: #3b82f6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📋 Copiar reporte
                </button>
                <button onclick="clearCacheAndReload()" 
                        class="btn"
                        style="flex: 1; min-width: 140px; padding: 10px 16px; font-size: 13px; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    🧹 Limpiar caché y recargar
                </button>
                <button onclick="rerunDiagnostics()" 
                        class="btn secondary"
                        style="flex: 1; min-width: 100px; padding: 10px 16px; font-size: 13px;">
                    🔄 Re-ejecutar
                </button>
                <button onclick="closeProductionDiagnosticModal()" 
                        class="btn secondary"
                        style="flex: 1; min-width: 100px; padding: 10px 16px; font-size: 13px;">
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    // Añadir animación de spin si no existe
    if (!document.getElementById('diag-spin-style')) {
        const style = document.createElement('style');
        style.id = 'diag-spin-style';
        style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }
    
    document.body.appendChild(modal);
    
    window._lastDiagnosticResult = null;
    
    // Ejecutar diagnóstico tras breve delay
    setTimeout(async () => {
        const result = await runProductionDiagnostics();
        window._lastDiagnosticResult = result;
        renderDiagnosticResults(result);
    }, 300);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeProductionDiagnosticModal();
    });
    
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeProductionDiagnosticModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

function renderDiagnosticResults(result) {
    const container = document.getElementById('diag-results-container');
    const buttons = document.getElementById('diag-buttons');
    
    if (!container) return;
    
    const { results, summary } = result;
    
    // Colores y iconos por estado
    const statusConfig = {
        ok: { icon: '✅', color: '#10b981', bg: '#10b98115', border: '#10b981' },
        warning: { icon: '⚠️', color: '#f59e0b', bg: '#f59e0b15', border: '#f59e0b' },
        error: { icon: '❌', color: '#ef4444', bg: '#ef444415', border: '#ef4444' }
    };
    
    // Determinar color del resumen general
    let summaryColor = '#10b981';
    let summaryIcon = '✅';
    let summaryText = 'Todo funciona correctamente';
    
    if (summary.error > 0) {
        summaryColor = '#ef4444';
        summaryIcon = '❌';
        summaryText = `${summary.error} error(es) detectado(s)`;
    } else if (summary.warning > 0) {
        summaryColor = '#f59e0b';
        summaryIcon = '⚠️';
        summaryText = `${summary.warning} advertencia(s)`;
    }
    
    container.innerHTML = `
        <!-- RESUMEN -->
        <div style="background: ${summaryColor}15; border: 2px solid ${summaryColor}; border-radius: 10px; padding: 14px; margin-bottom: 14px; text-align: center;">
            <div style="font-size: 32px; margin-bottom: 4px;">${summaryIcon}</div>
            <div style="font-size: 16px; font-weight: 700; color: ${summaryColor}; margin-bottom: 4px;">
                ${summaryText}
            </div>
            <div style="font-size: 12px; color: var(--text-light);">
                ${summary.ok} OK · ${summary.warning} advertencias · ${summary.error} errores
            </div>
        </div>
        
        <!-- DETALLE POR TEST -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
            ${results.map(r => {
                const cfg = statusConfig[r.status] || statusConfig.error;
                return `
                    <div style="background: ${cfg.bg}; border-left: 4px solid ${cfg.border}; border-radius: 8px; padding: 10px 12px;">
                        <div style="display: flex; align-items: flex-start; gap: 8px;">
                            <span style="font-size: 18px; flex-shrink: 0;">${cfg.icon}</span>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 2px;">
                                    ${r.name}
                                </div>
                                <div style="font-size: 12px; color: ${cfg.color};">
                                    ${r.message}
                                </div>
                                ${r.detail ? `<div style="font-size: 11px; color: var(--text-light); margin-top: 4px; word-break: break-word;">${r.detail}</div>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    if (buttons) buttons.style.display = 'flex';
}

async function rerunDiagnostics() {
    const container = document.getElementById('diag-results-container');
    const buttons = document.getElementById('diag-buttons');
    
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px 20px;">
                <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #8b5cf6; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                <p style="margin-top: 12px; font-size: 14px; color: var(--text-light);">Re-ejecutando diagnóstico...</p>
            </div>
        `;
    }
    if (buttons) buttons.style.display = 'none';
    
    const result = await runProductionDiagnostics();
    window._lastDiagnosticResult = result;
    renderDiagnosticResults(result);
}

async function copyDiagnosticReport() {
    try {
        const result = window._lastDiagnosticResult;
        if (!result) {
            window.showToast('⚠️ No hay diagnóstico para copiar', 'warning');
            return;
        }
        
        const { results, summary } = result;
        
        const browser = navigator.userAgent.includes('Chrome') ? 'Chrome' :
                        navigator.userAgent.includes('Firefox') ? 'Firefox' :
                        navigator.userAgent.includes('Safari') ? 'Safari' : 'Otro';
        
        let report = '';
        report += '=========================================\n';
        report += '  🔍 DIAGNÓSTICO DE PRODUCCIÓN - PANARIO\n';
        report += '=========================================\n\n';
        report += `📱 Versión app: ${getAppVersion()}\n`;
        report += `🌐 Navegador: ${browser}\n`;
        report += `🔗 Online: ${navigator.onLine ? 'Sí' : 'No'}\n`;
        report += `📅 Fecha: ${new Date().toLocaleString('es-ES')}\n`;
        report += `🖥️ User-Agent: ${navigator.userAgent}\n\n`;
        report += '📊 RESUMEN\n';
        report += `   ${summary.ok} OK · ${summary.warning} advertencias · ${summary.error} errores\n\n`;
        report += '📋 DETALLE POR TEST\n';
        report += '-----------------------------------------\n';
        
        results.forEach(r => {
            const icon = r.status === 'ok' ? '✅' : r.status === 'warning' ? '⚠️' : '❌';
            report += `${icon} ${r.name}\n`;
            report += `   ${r.message}\n`;
            if (r.detail) report += `   → ${r.detail}\n`;
            report += '\n';
        });
        
        report += '=========================================\n';
        report += 'Fin del diagnóstico\n';
        report += '=========================================\n';
        
        // Copiar al portapapeles
        try {
            await navigator.clipboard.writeText(report);
            window.showToast('✅ Reporte copiado al portapapeles', 'success', 3000);
        } catch (e) {
            // Fallback para navegadores antiguos
            const textarea = document.createElement('textarea');
            textarea.value = report;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            window.showToast('✅ Reporte copiado al portapapeles', 'success', 3000);
        }
        
        console.log('📋 Reporte de diagnóstico:\n', report);
        
    } catch (e) {
        console.error('Error copiando reporte:', e);
        window.showToast('❌ Error al copiar el reporte', 'error', 4000);
    }
}

async function clearCacheAndReload() {
    const confirm = await window.ModalModule.showConfirm({
        title: '🧹 Limpiar caché y recargar',
        message: 'Se eliminarán:\n\n✅ Service Workers registrados\n✅ Cachés de la PWA\n❌ NO se borrarán tus datos\n\nLa app se recargará automáticamente.\n\n¿Continuar?',
        confirmText: '🧹 Sí, limpiar',
        cancelText: 'Cancelar',
        icon: '🧹',
        confirmColor: '#f59e0b'
    });
    
    if (!confirm) return;
    
    window.showToast('🧹 Limpiando caché...', 'info', 2000);
    
    try {
        // 1. Desregistrar SWs
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) {
                try { await reg.unregister(); } catch (e) {}
            }
            console.log(`🗑️ ${regs.length} Service Worker(s) desregistrados`);
        }
        
        // 2. Eliminar cachés
        if ('caches' in window) {
            const names = await caches.keys();
            for (const name of names) {
                try { await caches.delete(name); } catch (e) {}
            }
            console.log(`🗑️ ${names.length} caché(s) eliminadas`);
        }
        
        window.showToast('✅ Caché limpiada. Recargando...', 'success', 2000);
        
        setTimeout(() => {
            const url = new URL(window.location.href);
            url.searchParams.set('_reload', Date.now());
            window.location.replace(url.toString());
        }, 800);
        
    } catch (e) {
        console.error('Error limpiando caché:', e);
        window.showToast('❌ Error: ' + e.message, 'error', 4000);
    }
}

function closeProductionDiagnosticModal() {
    const modal = document.getElementById('production-diagnostic-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => {
            if (modal.parentNode) modal.remove();
        }, 200);
        setTimeout(() => {
            const still = document.getElementById('production-diagnostic-modal');
            if (still && still.parentNode) still.remove();
        }, 500);
    }
}

window.showProductionDiagnosticModal = showProductionDiagnosticModal;
window.closeProductionDiagnosticModal = closeProductionDiagnosticModal;
window.renderDiagnosticResults = renderDiagnosticResults;
window.rerunDiagnostics = rerunDiagnostics;
window.copyDiagnosticReport = copyDiagnosticReport;
window.clearCacheAndReload = clearCacheAndReload;

// ============================================================
// FUNCIONES DEL MÓDULO DE CORRIENTE
// ============================================================

function saveCorrientePattern() {
    const horasCorriente = parseFloat(document.getElementById('config-horas-corriente').value);
    const horasApagon = parseFloat(document.getElementById('config-horas-apagon').value);

    if (isNaN(horasCorriente) || isNaN(horasApagon) || horasCorriente <= 0 || horasApagon <= 0) {
        window.showToast('⚠️ Ingresa valores válidos (mayores a 0)', 'error');
        return;
    }

    const config = window.CorrienteUtils.getConfig();
    config.horasCorriente = horasCorriente;
    config.horasApagon = horasApagon;
    
    const result = window.CorrienteUtils.saveConfig(config);
    
    if (result) {
        window.showToast(`✅ Patrón guardado: ${horasCorriente}h corriente / ${horasApagon}h apagón`, 'success');
        const calendarioContent = document.getElementById('corriente-calendario-content');
        if (calendarioContent && calendarioContent.style.display !== 'none') {
            renderCorrienteCalendario();
        }
    } else {
        window.showToast('❌ Error al guardar el patrón', 'error');
    }
}

function setCorrienteReference() {
    const fecha = document.getElementById('config-fecha-ref').value;
    let inicio = document.getElementById('config-inicio-ref').value;
    let fin = document.getElementById('config-fin-ref').value;

    if (!fecha || !inicio || !fin) {
        window.showToast('⚠️ Completa todos los campos', 'error');
        return;
    }

    const config = window.CorrienteUtils.getConfig();
    config.fechaReferencia = fecha;
    config.horaInicioReferencia = inicio;
    config.horaFinReferencia = fin;
    
    const result = window.CorrienteUtils.saveConfig(config);

    if (!result) {
        window.showToast('❌ Error al guardar la referencia', 'error');
        return;
    }

    const calendarioContent = document.getElementById('corriente-calendario-content');
    if (calendarioContent && calendarioContent.style.display !== 'none') {
        renderCorrienteCalendario();
    }

    const statusEl = document.getElementById('config-ref-status');
    if (statusEl) {
        const inicio12 = convertirA12Horas(inicio);
        const fin12 = convertirA12Horas(fin);
        const cruzaMedianoche = inicio >= fin;
        statusEl.innerHTML = `
            ✅ Referencia guardada: ${fecha} de ${inicio12} a ${fin12}
            ${cruzaMedianoche ? '<br>⚠️ El bloque cruza medianoche' : ''}
            <br>📌 Ciclo: ${config.horasCorriente}h corriente / ${config.horasApagon}h apagón
            <br>🔄 Total ciclo: ${config.horasCorriente + config.horasApagon} horas
            <br>💡 Los horarios se han recalculado para todas las fechas.
        `;
    }

    window.showToast('✅ Referencia guardada correctamente', 'success');
}

// ============================================================
// MOSTRAR MODAL PRINCIPAL DE CORRIENTE
// ============================================================

function showCorrienteModal() {
    if (window.ModalModule && window.ModalModule.cerrarTodosLosModales) {
        window.ModalModule.cerrarTodosLosModales();
    }
    
    const existingModal = document.getElementById('corriente-modal');
    if (existingModal) existingModal.remove();

    const config = window.CorrienteUtils.refreshConfig();

    const modal = document.createElement('div');
    modal.id = 'corriente-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999999; padding: 10px;
        animation: modalFadeIn 0.25s ease;
    `;

    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 16px 18px; max-width: 100%; width: 100%; max-height: 98vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color); overflow-y: auto; font-size: 14px; position: relative; z-index: 99999999;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap;">
                <h2 style="margin: 0; color: #f59e0b; font-size: 18px;">⚡ Horarios de Corriente</h2>
                <button onclick="closeCorrienteModal()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <p style="font-size: 13px; color: var(--text-light); margin-bottom: 12px;">
                Gestiona los horarios de corriente para planificar tu producción.
                <br><span style="color: #f59e0b;">💡 Los períodos con corriente = horarios de producción</span>
            </p>

            <div style="display: flex; gap: 3px; border-bottom: 2px solid var(--border-color); margin-bottom: 12px; flex-wrap: wrap; overflow-x: auto;">
                <button id="tab-corriente-config" onclick="switchCorrienteTab('config')" class="btn primary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0; background: var(--primary); color: #fff; border: none; white-space: nowrap;">
                    ⚙️ Config
                </button>
                <button id="tab-corriente-calendario" onclick="switchCorrienteTab('calendario')" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0; background: transparent; color: var(--text); border: none; white-space: nowrap;">
                    📅 Calendario
                </button>
                <button id="tab-corriente-reporte" onclick="switchCorrienteTab('reporte')" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0; background: transparent; color: var(--text); border: none; white-space: nowrap;">
                    📊 Reporte
                </button>
                <button id="tab-corriente-consultar" onclick="switchCorrienteTab('consultar')" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0; background: transparent; color: var(--text); border: none; white-space: nowrap;">
                    🔍 Fecha
                </button>
            </div>

            <div id="corriente-config-content" style="flex: 1; overflow-y: auto;">
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 10px;">
                    <h4 style="margin: 0 0 6px 0; font-size: 14px;">⚙️ Patrón</h4>
                    <p style="font-size: 12px; color: var(--text-light); margin-bottom: 8px;">Ej: 3h corriente / 12h apagón</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <label style="font-size: 12px; font-weight: 500;">⏰ Corriente</label>
                            <input type="number" id="config-horas-corriente" 
                                   value="${config.horasCorriente || 3}" 
                                   min="0.5" max="24" step="0.5"
                                   style="width: 100%; padding: 6px 10px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 14px;">
                        </div>
                        <div>
                            <label style="font-size: 12px; font-weight: 500;">🌙 Apagón</label>
                            <input type="number" id="config-horas-apagon" 
                                   value="${config.horasApagon || 12}" 
                                   min="0.5" max="48" step="0.5"
                                   style="width: 100%; padding: 6px 10px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 14px;">
                        </div>
                    </div>
                    <button onclick="saveCorrientePattern()" class="btn primary" style="margin-top: 8px; padding: 4px 14px; font-size: 12px; width: auto;">💾 Guardar</button>
                </div>

                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <h4 style="margin: 0 0 6px 0; font-size: 14px;">📝 Referencia inicial</h4>
                    <p style="font-size: 12px; color: var(--text-light); margin-bottom: 8px;">Ej: Hoy tuve corriente de 10:00 AM a 1:00 PM</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                        <div>
                            <label style="font-size: 11px; font-weight: 500;">📅 Fecha</label>
                            <input type="date" id="config-fecha-ref" 
                                   value="${config.fechaReferencia || new Date().toISOString().split('T')[0]}"
                                   style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                        <div>
                            <label style="font-size: 11px; font-weight: 500;">🟢 Inicio</label>
                            <input type="time" id="config-inicio-ref" value="${config.horaInicioReferencia || '10:00'}"
                                   style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                        <div>
                            <label style="font-size: 11px; font-weight: 500;">🔴 Fin</label>
                            <input type="time" id="config-fin-ref" value="${config.horaFinReferencia || '13:00'}"
                                   style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                    </div>
                    <button onclick="setCorrienteReference()" class="btn primary" style="margin-top: 8px; padding: 4px 14px; font-size: 12px; width: auto;">📌 Guardar referencia</button>
                    <div id="config-ref-status" style="margin-top: 6px; font-size: 12px; color: var(--text-light);"></div>
                </div>
                
                <!-- 🆕 ENTREGA 6: Botón de diagnóstico -->
                <div style="margin-top: 12px; padding: 10px 12px; background: #8b5cf610; border: 1px dashed #8b5cf6; border-radius: 8px; text-align: center;">
                    <div style="font-size: 11px; color: #8b5cf6; margin-bottom: 6px;">
                        🔍 ¿Tienes problemas para guardar producción?
                    </div>
                    <button onclick="showProductionDiagnosticModal()" 
                            class="btn"
                            style="padding: 6px 14px; font-size: 12px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        🔍 Ejecutar diagnóstico
                    </button>
                </div>
            </div>

            <div id="corriente-calendario-content" style="flex: 1; overflow-y: auto; display: none;">
                <div style="display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap; align-items: center;">
                    <button onclick="changeCorrienteMonth(-1)" class="btn secondary" style="padding: 2px 10px; font-size: 12px; width: auto;">◀</button>
                    <span id="corriente-month-label" style="font-weight: 600; font-size: 14px; flex: 1; text-align: center;"></span>
                    <button onclick="changeCorrienteMonth(1)" class="btn secondary" style="padding: 2px 10px; font-size: 12px; width: auto;">▶</button>
                    <button onclick="irAHoyCorriente()" class="btn secondary" style="padding: 2px 10px; font-size: 12px; width: auto; background: #3b82f6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">🔄 Hoy</button>
                </div>
                <div id="corriente-calendario-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; font-size: 11px;"></div>
                <div style="display: flex; gap: 10px; margin-top: 8px; padding: 6px 10px; background: var(--bg); border-radius: 6px; flex-wrap: wrap; font-size: 11px;">
                    <span><span style="display: inline-block; width: 14px; height: 14px; background: #f59e0b; border-radius: 3px; vertical-align: middle;"></span> Corriente</span>
                    <span><span style="display: inline-block; width: 14px; height: 14px; background: #94a3b8; border-radius: 3px; vertical-align: middle;"></span> Sin corriente</span>
                    <span><span style="display: inline-block; width: 14px; height: 14px; background: #ef4444; border-radius: 3px; vertical-align: middle;"></span> Hoy</span>
                    <span style="margin-left: auto; color: #8b5cf6;">🔨 = Día con producción programada</span>
                </div>
            </div>

            <div id="corriente-reporte-content" style="flex: 1; overflow-y: auto; display: none;">
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <h4 style="margin: 0 0 6px 0; font-size: 14px;">📊 Generar Reporte</h4>
                    <p style="font-size: 12px; color: var(--text-light); margin-bottom: 8px;">Selecciona el período para el reporte de horarios.</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <label style="font-size: 11px; font-weight: 500;">📅 Desde</label>
                            <input type="date" id="reporte-fecha-desde" 
                                   value="${new Date().toISOString().split('T')[0]}"
                                   style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                        <div>
                            <label style="font-size: 11px; font-weight: 500;">📅 Hasta</label>
                            <input type="date" id="reporte-fecha-hasta" 
                                   value="${new Date(Date.now() + 7*86400000).toISOString().split('T')[0]}"
                                   style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                    </div>
                    <div style="margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap;">
                        <button onclick="generarReportePDF('semana')" class="btn primary" style="padding: 6px 14px; font-size: 12px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 6px; cursor: pointer;">📄 Semanal</button>
                        <button onclick="generarReportePDF('mes')" class="btn primary" style="padding: 6px 14px; font-size: 12px; width: auto; background: #10b981; color: #fff; border: none; border-radius: 6px; cursor: pointer;">📄 Mensual</button>
                    </div>
                    <p style="font-size: 11px; color: var(--text-light); margin-top: 8px;">
                        💡 El reporte se abrirá en una nueva ventana. Puedes guardarlo como PDF desde el diálogo de impresión.
                    </p>
                </div>
            </div>

            <div id="corriente-consultar-content" style="flex: 1; overflow-y: auto; display: none;">
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <h4 style="margin: 0 0 6px 0; font-size: 14px;">🔍 Consultar fecha</h4>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end;">
                        <div style="flex: 1; min-width: 120px;">
                            <label style="font-size: 11px; font-weight: 500;">📅 Fecha</label>
                            <input type="date" id="consultar-fecha" 
                                   value="${new Date().toISOString().split('T')[0]}"
                                   style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                        <button onclick="consultarHorariosFecha()" class="btn primary" style="padding: 6px 14px; font-size: 12px; width: auto;">🔍 Consultar</button>
                    </div>
                    <div id="consultar-resultado" style="margin-top: 10px; padding: 10px; background: var(--bg-card); border-radius: 6px; border: 1px solid var(--border-color); min-height: 50px; font-size: 13px;">
                        <p style="color: var(--text-light); text-align: center; font-size: 12px;">Selecciona una fecha</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    window._corrienteMonthOffset = 0;

    window.closeCorrienteModal = function() {
        const modal = document.getElementById('corriente-modal');
        if (modal) {
            modal.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (modal.parentNode) modal.remove();
            }, 200);
            setTimeout(() => {
                const still = document.getElementById('corriente-modal');
                if (still && still.parentNode) still.remove();
            }, 500);
        }
    };

    window.switchCorrienteTab = function(tab) {
        const tabs = ['config', 'calendario', 'reporte', 'consultar'];
        const contents = ['corriente-config-content', 'corriente-calendario-content', 'corriente-reporte-content', 'corriente-consultar-content'];
        const btnIds = ['tab-corriente-config', 'tab-corriente-calendario', 'tab-corriente-reporte', 'tab-corriente-consultar'];

        for (let i = 0; i < tabs.length; i++) {
            const content = document.getElementById(contents[i]);
            const btn = document.getElementById(btnIds[i]);
            if (content) content.style.display = (tabs[i] === tab) ? 'block' : 'none';
            if (btn) {
                if (tabs[i] === tab) {
                    btn.className = 'btn primary';
                    btn.style.background = 'var(--primary)';
                    btn.style.color = '#fff';
                } else {
                    btn.className = 'btn secondary';
                    btn.style.background = 'transparent';
                    btn.style.color = 'var(--text)';
                }
            }
        }
        if (tab === 'calendario') renderCorrienteCalendario();
    };

    switchCorrienteTab('config');
    
    if (config.fechaReferencia) {
        const statusEl = document.getElementById('config-ref-status');
        if (statusEl) {
            const inicio12 = convertirA12Horas(config.horaInicioReferencia);
            const fin12 = convertirA12Horas(config.horaFinReferencia);
            statusEl.innerHTML = `
                ✅ Referencia guardada: ${config.fechaReferencia} de ${inicio12} a ${fin12}
                <br>📌 Ciclo: ${config.horasCorriente}h corriente / ${config.horasApagon}h apagón
                <br>🔄 Total ciclo: ${config.horasCorriente + config.horasApagon} horas
            `;
        }
    }
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeCorrienteModal();
    });
}

// ============================================================
// IR A HOY
// ============================================================

function irAHoyCorriente() {
    window._corrienteMonthOffset = 0;
    renderCorrienteCalendario();
    
    const hoy = new Date();
    const mesActual = hoy.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    window.showToast(`📅 Mostrando ${mesActual}`, 'info', 2000);
}

// ============================================================
// RENDER CALENDARIO
// ============================================================

function renderCorrienteCalendario() {
    const grid = document.getElementById('corriente-calendario-grid');
    const label = document.getElementById('corriente-month-label');
    if (!grid || !label) return;

    const config = window.CorrienteUtils.refreshConfig();

    if (!config.fechaReferencia || !config.horaInicioReferencia || !config.horaFinReferencia) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 30px 20px; color: var(--text-light);">
                <span style="font-size: 40px;">⚙️</span>
                <p style="font-size: 14px; margin-top: 8px;">No hay referencia configurada</p>
                <p style="font-size: 12px;">Ve a la pestaña <strong>Config</strong> y guarda una referencia inicial.</p>
            </div>
        `;
        label.textContent = '';
        return;
    }

    const today = new Date();
    const monthOffset = window._corrienteMonthOffset || 0;
    const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const monthName = targetDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    label.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    let html = weekDays.map(d => 
        `<div style="text-align: center; font-weight: 600; color: var(--text-label); padding: 3px; font-size: 10px;">${d}</div>`
    ).join('');

    for (let i = 0; i < firstDay; i++) {
        html += `<div style="padding: 3px;"></div>`;
    }

    const todayStr = window.CorrienteUtils.formatearFechaISO(new Date());
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        
        let bloques = [];
        try {
            bloques = window.CorrienteUtils.getBloques(dateStr);
        } catch (e) {}
        
        const tieneCorriente = bloques && bloques.length > 0;
        const numBloques = tieneCorriente ? bloques.length : 0;
        
        const prodConfig = getProduccionConfig(dateStr);
        const tieneProduccion = !!prodConfig;
        
        let bgColor = '#94a3b8';
        let labelColor = 'var(--text)';
        let bloquesInfo = '';
        
        if (isToday) {
            bgColor = '#ef4444';
            labelColor = '#fff';
        } else if (tieneCorriente) {
            bgColor = '#f59e0b';
            labelColor = '#fff';
            bloquesInfo = bloques.map(h => `${h.inicioStr}-${h.finStr}`).join(' ');
        }

        const produccionIcon = tieneProduccion 
            ? `<span style="font-size: 9px; display: block; margin-top: 1px;">🔨</span>` 
            : '';
        
        const cantidadTooltip = tieneProduccion 
            ? formatearCantidadProduccion(prodConfig.cantidad_produccion) 
            : '';

        html += `
            <div style="text-align: center; padding: 6px 2px; background: ${bgColor}; border-radius: 4px; color: ${labelColor}; font-weight: ${isToday ? '700' : '400'}; cursor: ${tieneCorriente || tieneProduccion ? 'pointer' : 'default'}; font-size: 12px; position: relative; z-index: 1; border: ${tieneProduccion ? '2px solid #8b5cf6' : 'none'};" 
                 onclick="${tieneCorriente || tieneProduccion ? `showHorarioDetalle('${dateStr}')` : ''}"
                 title="${tieneCorriente ? `⚡ ${numBloques} bloque(s): ${bloquesInfo}` : 'Sin corriente'}${tieneProduccion ? ' · 🔨 Producción: ' + cantidadTooltip : ''}">
                ${day}
                ${tieneCorriente ? `<span style="font-size: 8px; display: block; opacity: 0.9;">⚡${numBloques}</span>` : ''}
                ${produccionIcon}
            </div>
        `;
    }

    grid.innerHTML = html;
}

function changeCorrienteMonth(delta) {
    window._corrienteMonthOffset = (window._corrienteMonthOffset || 0) + delta;
    renderCorrienteCalendario();
}

// ============================================================
// SHOW HORARIO DETALLE
// ============================================================

function showHorarioDetalle(dateStr) {
    const existing = document.getElementById('horario-detalle-modal');
    if (existing) existing.remove();

    const bloques = window.CorrienteUtils.getBloques(dateStr);
    const prodConfig = getProduccionConfig(dateStr);
    const conteo = contarPedidosYVentasFecha(dateStr);
    
    const dateObj = new Date(dateStr + 'T00:00:00');
    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    const diaSemana = diasSemana[dateObj.getDay()];
    const diaMes = dateObj.getDate();
    const mes = meses[dateObj.getMonth()];
    const anio = dateObj.getFullYear();
    
    const fechaDisplay = `${diaSemana}, ${diaMes} de ${mes} de ${anio}`;

    const modal = document.createElement('div');
    modal.id = 'horario-detalle-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999999; padding: 20px;
        animation: modalFadeIn 0.25s ease;
    `;

    let produccionHtml = '';
    
    if (bloques && bloques.length > 0) {
        const bloquesOptions = bloques.map((b, i) => {
            const selected = prodConfig && prodConfig.bloque_index === i + 1;
            return `<option value="${i + 1}" ${selected ? 'selected' : ''}>Bloque ${i + 1}: ${b.inicioStr} - ${b.finStr}</option>`;
        }).join('');
        
        const cantidadGuardada = prodConfig?.cantidad_produccion 
            ? formatearCantidadProduccion(prodConfig.cantidad_produccion) 
            : '';
        
        produccionHtml = `
            <div style="background: linear-gradient(135deg, #8b5cf615 0%, #8b5cf608 100%); border: 2px solid #8b5cf6; border-radius: 10px; padding: 12px 14px; margin-top: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                    <span style="font-size: 22px;">🔨</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 14px; color: #8b5cf6;">Horario de producción</div>
                        <div style="font-size: 11px; color: var(--text-light);">Define en qué bloque se horneará y cuánto se producirá</div>
                    </div>
                    ${prodConfig ? `<button onclick="eliminarProduccion('${dateStr}')" class="btn secondary" style="padding: 2px 10px; font-size: 11px; width: auto; color: #ef4444; border-color: #ef4444;">🗑️</button>` : ''}
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                    <div>
                        <label style="font-size: 11px; font-weight: 600; color: var(--text-label); display: block; margin-bottom: 2px;">🔨 Bloque de producción</label>
                        <select id="produccion-bloque" style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                            <option value="">— Sin especificar —</option>
                            ${bloquesOptions}
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 600; color: var(--text-label); display: block; margin-bottom: 2px;">📦 Cantidad a producir</label>
                        <input type="number" id="produccion-cantidad" 
                               value="${cantidadGuardada}" 
                               placeholder="Ej: 6.5"
                               min="0.01" 
                               step="0.1"
                               style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        <small style="font-size: 10px; color: var(--text-light); display: block; margin-top: 2px;">
                            💡 Acepta decimales: 6.5 = 6 jabas y media
                        </small>
                    </div>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <label style="font-size: 11px; font-weight: 600; color: var(--text-label); display: block; margin-bottom: 2px;">📝 Notas de producción (opcional)</label>
                    <input type="text" id="produccion-notas" 
                           value="${prodConfig?.notas || ''}" 
                           placeholder="Ej: Solo pan de yogur"
                           style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                </div>
                
                ${conteo.cantidadProduccion > 0 ? `
                <div style="background: var(--bg); border-radius: 6px; padding: 8px 10px; margin-bottom: 10px; font-size: 12px;">
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                        <span>📋 Pedidos reservados:</span><strong>${conteo.pedidos}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                        <span>💰 Ventas directas:</span><strong>${conteo.ventas}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-top: 1px solid var(--border-color); margin-top: 4px; padding-top: 4px;">
                        <span>✅ Disponibles:</span>
                        <strong style="color: ${conteo.disponibles > 0 ? '#10b981' : '#ef4444'};">
                            ${formatearCantidadProduccion(conteo.disponibles)} / ${formatearCantidadProduccion(conteo.cantidadProduccion)}
                        </strong>
                    </div>
                </div>
                ` : ''}
                
                <button onclick="guardarProduccion('${dateStr}')" class="btn primary" 
                        style="width: 100%; padding: 8px; font-size: 13px; background: #8b5cf6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    💾 Guardar producción
                </button>
            </div>
        `;
    }

    if (!bloques || bloques.length === 0) {
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 28px 32px; max-width: 440px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
                <div style="text-align: center; margin-bottom: 16px;">
                    <div style="font-size: 56px; margin-bottom: 12px;">🌙</div>
                    <h2 style="margin: 0 0 8px 0; font-size: 18px; color: var(--text);">Sin corriente</h2>
                    <p style="font-size: 14px; color: var(--text-light); text-transform: capitalize;">📅 ${fechaDisplay}</p>
                </div>
                <p style="font-size: 13px; color: var(--text-light); margin-bottom: 20px; text-align: center;">No hay corriente programada para este día.</p>
                ${produccionHtml}
                <div style="display: flex; gap: 8px; margin-top: 16px;">
                    <button onclick="closeHorarioDetalleModal()" class="btn secondary" style="padding: 10px 24px; font-size: 14px; width: auto; flex: 1;">Cerrar</button>
                </div>
            </div>
        `;
    } else {
        let totalHoras = 0;
        bloques.forEach(b => { totalHoras += b.duracionHoras; });

        const bloquesHtml = bloques.map((h, i) => {
            const esProduccion = prodConfig && prodConfig.bloque_index === i + 1;
            return `
                <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: ${esProduccion ? '#8b5cf620' : 'var(--bg)'}; border-radius: 8px; border-left: 4px solid ${esProduccion ? '#8b5cf6' : '#f59e0b'}; margin-bottom: 6px;">
                    <span style="font-size: 18px; font-weight: 700; color: ${esProduccion ? '#8b5cf6' : '#f59e0b'}; min-width: 24px;">${i + 1}</span>
                    <div style="flex: 1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span style="background: #10b98120; color: #10b981; padding: 3px 10px; border-radius: 10px; font-size: 13px; font-weight: 600;">🟢 ${h.inicioStr}</span>
                        <span style="color: var(--text-light); font-size: 12px;">→</span>
                        <span style="background: #ef444420; color: #ef4444; padding: 3px 10px; border-radius: 10px; font-size: 13px; font-weight: 600;">🔴 ${h.finStr}</span>
                        ${h.cruzaMedianoche ? '<span style="font-size: 10px; color: #f59e0b; background: #f59e0b20; padding: 1px 6px; border-radius: 8px;">cruza medianoche</span>' : ''}
                        ${esProduccion ? '<span style="font-size: 10px; color: #8b5cf6; background: #8b5cf620; padding: 1px 8px; border-radius: 8px; font-weight: 600;">🔨 PRODUCCIÓN</span>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px 28px; max-width: 460px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                    <span style="font-size: 32px;">⚡</span>
                    <div style="flex: 1;">
                        <h2 style="margin: 0; font-size: 17px; color: #f59e0b;">Horarios de Corriente</h2>
                        <p style="margin: 2px 0 0 0; font-size: 13px; color: var(--text-light); text-transform: capitalize;">📅 ${fechaDisplay}</p>
                    </div>
                    <button onclick="closeHorarioDetalleModal()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--text-light); padding: 0 4px; align-self: flex-start;">✕</button>
                </div>

                <div style="display: flex; gap: 8px; margin-bottom: 14px;">
                    <div style="flex: 1; background: #f59e0b20; padding: 8px 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${bloques.length}</div>
                        <div style="font-size: 11px; color: var(--text-light);">Bloque${bloques.length > 1 ? 's' : ''}</div>
                    </div>
                    <div style="flex: 1; background: #10b98120; padding: 8px 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 20px; font-weight: 700; color: #10b981;">${totalHoras.toFixed(1)}h</div>
                        <div style="font-size: 11px; color: var(--text-light);">Total corriente</div>
                    </div>
                </div>

                <div style="margin-bottom: 8px;">
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-label); margin-bottom: 6px;">📋 Bloques del día:</div>
                    ${bloquesHtml}
                </div>

                ${produccionHtml}

                <div style="display: flex; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-color);">
                    <button onclick="closeHorarioDetalleModal()" class="btn secondary" style="padding: 10px 20px; font-size: 14px; width: auto; flex: 1;">Cerrar</button>
                </div>
            </div>
        `;
    }

    document.body.appendChild(modal);

    window.closeHorarioDetalleModal = function() {
        const m = document.getElementById('horario-detalle-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (m.parentNode) m.remove();
            }, 200);
            setTimeout(() => {
                const still = document.getElementById('horario-detalle-modal');
                if (still && still.parentNode) still.remove();
            }, 500);
        }
    };

    modal.addEventListener('click', function(e) {
        if (e.target === this) closeHorarioDetalleModal();
    });

    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeHorarioDetalleModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// ============================================================
// GUARDAR PRODUCCIÓN CON DECIMALES
// ============================================================

function guardarProduccion(fechaISO) {
    console.log('💾 guardarProduccion() llamado para fecha:', fechaISO);
    
    if (!window.DBModule || typeof window.DBModule.saveProduccion !== 'function') {
        console.error('❌ DBModule.saveProduccion no está disponible');
        window.showToast('❌ Error crítico: función de guardado no disponible. Recarga la página.', 'error', 6000);
        return;
    }
    
    const bloqueIndex = parseInt(document.getElementById('produccion-bloque')?.value) || null;
    const cantidadRaw = document.getElementById('produccion-cantidad')?.value;
    const cantidad = parseFloat(cantidadRaw);
    const notas = document.getElementById('produccion-notas')?.value?.trim() || null;
    
    console.log('   → Datos del formulario:', { bloqueIndex, cantidadRaw, cantidad, notas });
    
    if (!bloqueIndex) {
        window.showToast('⚠️ Selecciona un bloque de producción', 'warning');
        return;
    }
    
    if (isNaN(cantidad) || cantidad <= 0) {
        window.showToast('⚠️ La cantidad a producir debe ser mayor a 0', 'warning');
        return;
    }
    
    const bloques = window.CorrienteUtils.getBloques(fechaISO);
    if (!bloques || bloques.length < bloqueIndex) {
        window.showToast('❌ Bloque no válido', 'error');
        return;
    }
    
    const bloque = bloques[bloqueIndex - 1];
    console.log('   → Bloque seleccionado:', bloque.inicioStr24, '-', bloque.finStr24);
    
    const data = {
        fecha: fechaISO,
        hora_inicio: bloque.inicioStr24,
        hora_fin: bloque.finStr24,
        bloque_index: bloqueIndex,
        cantidad_produccion: cantidad,
        notas: notas
    };
    
    console.log('   → Llamando a DBModule.saveProduccion...');
    
    const result = window.DBModule.saveProduccion(data);
    
    console.log('   → Resultado:', result);
    
    if (result.success) {
        const cantidadFormateada = formatearCantidadProduccion(cantidad);
        window.showToast(`✅ Producción guardada: ${cantidadFormateada} unidades en bloque ${bloqueIndex}`, 'success', 4000);
        
        closeHorarioDetalleModal();
        setTimeout(() => {
            renderCorrienteCalendario();
            showHorarioDetalle(fechaISO);
        }, 300);
    } else {
        const errorMsg = result.error || 'Error desconocido';
        console.error('❌ Error guardando producción:', errorMsg);
        window.showToast('❌ Error al guardar: ' + errorMsg, 'error', 6000);
    }
}

function eliminarProduccion(fechaISO) {
    window.ModalModule.showConfirm({
        title: '🗑️ Eliminar producción',
        message: `¿Eliminar la configuración de producción del ${fechaISO}?`,
        confirmText: '🗑️ Sí, eliminar',
        cancelText: 'Cancelar',
        icon: '🗑️',
        confirmColor: '#ef4444'
    }).then(confirm => {
        if (!confirm) return;
        
        if (!window.DBModule || typeof window.DBModule.deleteProduccion !== 'function') {
            window.showToast('❌ Error: función no disponible', 'error', 5000);
            return;
        }
        
        const result = window.DBModule.deleteProduccion(fechaISO);
        
        if (result.success) {
            window.showToast('✅ Producción eliminada', 'success');
            closeHorarioDetalleModal();
            setTimeout(renderCorrienteCalendario, 300);
        } else {
            window.showToast('❌ Error: ' + (result.error || 'Desconocido'), 'error', 5000);
        }
    });
}

window.guardarProduccion = guardarProduccion;
window.eliminarProduccion = eliminarProduccion;

// ============================================================
// CONSULTAR HORARIOS
// ============================================================

function consultarHorariosFecha() {
    const fecha = document.getElementById('consultar-fecha').value;
    const resultado = document.getElementById('consultar-resultado');
    
    if (!fecha) {
        resultado.innerHTML = '<p style="color: var(--text-light); text-align: center; font-size: 12px;">⚠️ Selecciona una fecha</p>';
        return;
    }

    const bloques = window.CorrienteUtils.getBloques(fecha);
    const prodConfig = getProduccionConfig(fecha);
    const conteo = contarPedidosYVentasFecha(fecha);
    
    const dateObj = new Date(fecha + 'T00:00:00');
    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    const diaSemana = diasSemana[dateObj.getDay()];
    const diaMes = dateObj.getDate();
    const mes = meses[dateObj.getMonth()];
    const anio = dateObj.getFullYear();
    
    const fechaDisplay = `${diaSemana}, ${diaMes} de ${mes} de ${anio}`;

    if (!bloques || bloques.length === 0) {
        resultado.innerHTML = `
            <div style="text-align: center; color: var(--text-light); font-size: 13px;">
                <span style="font-size: 28px;">🌙</span>
                <p style="text-transform: capitalize;">${fechaDisplay}: <strong style="color: #94a3b8;">Sin corriente</strong></p>
                ${prodConfig ? `<p style="font-size: 12px; color: #8b5cf6;">🔨 Producción: ${formatearCantidadProduccion(prodConfig.cantidad_produccion)} unidades</p>` : ''}
            </div>
        `;
        return;
    }

    let totalHoras = 0;
    let horariosHtml = bloques.map((h, i) => {
        totalHoras += h.duracionHoras;
        const esProduccion = prodConfig && prodConfig.bloque_index === i + 1;
        return `<div style="display: inline-block; background: ${esProduccion ? '#8b5cf620' : '#f59e0b20'}; color: ${esProduccion ? '#8b5cf6' : '#f59e0b'}; padding: 3px 10px; border-radius: 10px; margin: 2px; font-size: 12px; ${esProduccion ? 'border: 1px solid #8b5cf6;' : ''}">${esProduccion ? '🔨' : '🟢'} ${h.inicioStr} - 🔴 ${h.finStr}</div>`;
    }).join(' ');

    let produccionInfo = '';
    if (prodConfig) {
        produccionInfo = `
            <div style="background: linear-gradient(135deg, #8b5cf615 0%, #8b5cf608 100%); border: 1px solid #8b5cf6; border-radius: 6px; padding: 8px 10px; margin-top: 8px; font-size: 12px;">
                <div style="color: #8b5cf6; font-weight: 600; margin-bottom: 4px;">🔨 Producción programada</div>
                <div style="display: flex; justify-content: space-between;">
                    <span>📦 Cantidad:</span><strong>${formatearCantidadProduccion(prodConfig.cantidad_produccion)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>📋 Pedidos:</span><strong>${conteo.pedidos}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>💰 Ventas directas:</span><strong>${conteo.ventas}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-color); margin-top: 4px; padding-top: 4px;">
                    <span>✅ Disponibles:</span>
                    <strong style="color: ${conteo.disponibles > 0 ? '#10b981' : '#ef4444'};">
                        ${formatearCantidadProduccion(conteo.disponibles)} / ${formatearCantidadProduccion(conteo.cantidadProduccion)}
                    </strong>
                </div>
                ${prodConfig.notas ? `<div style="font-size: 11px; color: var(--text-light); margin-top: 4px;">📝 ${prodConfig.notas}</div>` : ''}
            </div>
        `;
    }

    resultado.innerHTML = `
        <div style="text-align: center; font-size: 13px;">
            <span style="font-size: 24px;">⚡</span>
            <h4 style="margin: 4px 0; font-size: 14px; text-transform: capitalize;">${fechaDisplay}</h4>
            <div style="margin: 6px 0;">${horariosHtml}</div>
            <p style="font-size: 12px; color: var(--text-light);">
                📦 ${bloques.length} bloque${bloques.length > 1 ? 's' : ''} | 
                ⏰ Total: <strong>${totalHoras.toFixed(1)} horas</strong>
            </p>
        </div>
        ${produccionInfo}
    `;
}

// ============================================================
// GENERAR REPORTE PDF DE CORRIENTE
// ============================================================

function generarReportePDF(tipo) {
    const desde = document.getElementById('reporte-fecha-desde').value;
    const hasta = document.getElementById('reporte-fecha-hasta').value;

    if (!desde || !hasta) {
        window.showToast('⚠️ Selecciona un rango de fechas', 'error');
        return;
    }

    if (desde > hasta) {
        window.showToast('⚠️ La fecha "desde" debe ser anterior a "hasta"', 'error');
        return;
    }

    const startDate = new Date(desde + 'T00:00:00');
    const endDate = new Date(hasta + 'T00:00:00');
    const diffDays = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    let reportData = [];
    let totalHorasCorriente = 0;

    for (let i = 0; i < diffDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        const dateStr = window.CorrienteUtils.formatearFechaISO(currentDate);
        const bloques = window.CorrienteUtils.getBloques(dateStr);
        const prodConfig = getProduccionConfig(dateStr);
        
        let horas = 0;
        let horariosStr = '🌙 Sin corriente';
        if (bloques && bloques.length > 0) {
            horariosStr = bloques.map(h => `${h.inicioStr} - ${h.finStr}`).join(' | ');
            horas = bloques.reduce((sum, h) => sum + h.duracionHoras, 0);
            totalHorasCorriente += horas;
        }

        reportData.push({
            fecha: dateStr,
            fechaDisplay: currentDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
            diaSemana: currentDate.toLocaleDateString('es-ES', { weekday: 'short' }),
            horarios: horariosStr,
            horas: horas,
            numBloques: bloques ? bloques.length : 0,
            produccion: prodConfig ? formatearCantidadProduccion(prodConfig.cantidad_produccion) : null,
            bloqueProduccion: prodConfig ? prodConfig.bloque_index : null
        });
    }

    const config = window.CorrienteUtils.getConfig();

    const reportHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reporte de Corriente - Panario</title>
            <style>
                * { font-family: system-ui, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
                body { padding: 16px; background: #fff; font-size: 14px; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #f59e0b; padding-bottom: 12px; }
                .header h1 { color: #f59e0b; font-size: 22px; }
                .header p { color: #666; font-size: 13px; margin-top: 2px; }
                .summary { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; flex-wrap: wrap; }
                .summary-card { background: #f8f9fa; padding: 10px 16px; border-radius: 8px; text-align: center; border-left: 3px solid #f59e0b; flex: 1; min-width: 80px; }
                .summary-card .number { font-size: 20px; font-weight: 700; color: #f59e0b; }
                .summary-card .label { font-size: 10px; color: #666; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
                th { background: #f59e0b; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; }
                td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 11px; word-break: break-word; }
                tr:nth-child(even) { background: #fafafa; }
                .sin-corriente { color: #94a3b8; }
                .con-corriente { color: #f59e0b; font-weight: 600; }
                .bloques-badge { display: inline-block; background: #f59e0b20; padding: 1px 6px; border-radius: 8px; font-size: 10px; color: #f59e0b; }
                .produccion-badge { display: inline-block; background: #8b5cf620; padding: 1px 6px; border-radius: 8px; font-size: 10px; color: #8b5cf6; font-weight: 600; }
                .footer { margin-top: 20px; text-align: center; color: #94a3b8; font-size: 10px; border-top: 1px solid #eee; padding-top: 12px; }
                .nota { margin-top: 12px; padding: 10px; background: #fef9e7; border-radius: 6px; border-left: 3px solid #f59e0b; font-size: 11px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>⚡ Reporte de Corriente y Producción</h1>
                <p>${tipo === 'semana' ? '📅 Semanal' : '📅 Mensual'} - ${new Date(desde).toLocaleDateString('es-ES')} al ${new Date(hasta).toLocaleDateString('es-ES')}</p>
                <p style="font-size: 11px; color: #94a3b8;">Patrón: ${config.horasCorriente || 3}h corriente / ${config.horasApagon || 12}h apagón</p>
            </div>

            <div class="summary">
                <div class="summary-card">
                    <div class="number">${diffDays}</div>
                    <div class="label">📅 Días</div>
                </div>
                <div class="summary-card">
                    <div class="number">${totalHorasCorriente.toFixed(1)}h</div>
                    <div class="label">⚡ Total corriente</div>
                </div>
                <div class="summary-card">
                    <div class="number">${(totalHorasCorriente / diffDays).toFixed(1)}h</div>
                    <div class="label">📊 Promedio/día</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th style="width: 35%;">Horario</th>
                        <th style="text-align: center;">#</th>
                        <th style="text-align: right;">Horas</th>
                        <th style="text-align: center;">🔨</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.map(row => `
                        <tr>
                            <td style="white-space: nowrap;">${row.fechaDisplay}<br><span style="font-size: 9px; color: #94a3b8;">${row.diaSemana}</span></td>
                            <td class="${row.horas > 0 ? 'con-corriente' : 'sin-corriente'}">${row.horarios}</td>
                            <td style="text-align: center;">${row.numBloques > 0 ? `<span class="bloques-badge">${row.numBloques}</span>` : '—'}</td>
                            <td style="text-align: right; font-weight: ${row.horas > 0 ? '700' : '400'}; color: ${row.horas > 0 ? '#f59e0b' : '#94a3b8'};">${row.horas > 0 ? row.horas.toFixed(1) + 'h' : '—'}</td>
                            <td style="text-align: center;">
                                ${row.produccion ? `<span class="produccion-badge">${row.produccion}</span>` : '—'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="nota">
                💡 Los horarios se generan automáticamente basados en el patrón configurado.
                <br>🔄 Ciclo: ${config.horasCorriente || 3}h corriente / ${config.horasApagon || 12}h apagón
                <br>🔨 = Día con producción programada (bloque seleccionado)
            </div>

            <div class="footer">
                Reporte generado desde Panario 🍞 - ${new Date().toLocaleString('es-ES')}
            </div>
        </body>
        </html>
    `;

    const win = window.open('', '_blank');
    if (!win) {
        window.showToast('❌ Permite ventanas emergentes', 'error');
        return;
    }

    win.document.write(reportHtml);
    win.document.close();
    win.print();

    window.showToast('✅ Reporte generado', 'success');
}

// ============================================================
// REPORTE DE GASTOS
// ============================================================

function showExpensesReportModal() {
    if (window.ModalModule && window.ModalModule.cerrarTodosLosModales) {
        window.ModalModule.cerrarTodosLosModales();
    }
    
    const existingModal = document.getElementById('expenses-report-modal');
    if (existingModal) existingModal.remove();

    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    const modal = document.createElement('div');
    modal.id = 'expenses-report-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999; padding: 20px;
    `;

    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="margin: 0;">📊 Reporte de Gastos</h2>
                <button onclick="closeExpensesReportModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <p style="font-size: 13px; color: var(--text-light); margin-bottom: 16px;">
                Configura los filtros y genera el reporte de gastos.
            </p>
            
            <form id="expenses-report-form" style="display: flex; flex-direction: column; gap: 12px;">
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">📅 Rango de fechas</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group">
                            <label style="font-size: 12px;">Desde</label>
                            <input type="date" id="report-expenses-from" value="${primerDia.toISOString().split('T')[0]}" class="input-field">
                        </div>
                        <div class="form-group">
                            <label style="font-size: 12px;">Hasta</label>
                            <input type="date" id="report-expenses-to" value="${ultimoDia.toISOString().split('T')[0]}" class="input-field">
                        </div>
                    </div>
                </div>
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">🔍 Filtros opcionales</div>
                    
                    <div class="form-group" style="margin-bottom: 8px;">
                        <label style="font-size: 12px;">📂 Categoría</label>
                        <select id="report-expenses-category" class="input-select">
                            <option value="">Todas las categorías</option>
                            <option value="insumos">🛒 Insumos</option>
                            <option value="materiales">📦 Materiales</option>
                            <option value="transporte">🚗 Transporte</option>
                            <option value="inversion">💼 Inversión</option>
                            <option value="otros">🔄 Otros</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 8px;">
                        <label style="font-size: 12px;">💳 Origen del pago</label>
                        <select id="report-expenses-origin" class="input-select">
                            <option value="">Todos los orígenes</option>
                            <option value="cash">💵 Efectivo</option>
                            <option value="transfer">🏦 Transferencia</option>
                            <option value="other">🔄 Otra</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label style="font-size: 12px;">📝 Concepto (búsqueda)</label>
                        <input type="text" id="report-expenses-search" placeholder="Ej: harina (opcional)" class="input-field">
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" style="flex: 1;">
                        📄 Generar Reporte
                    </button>
                    <button type="button" onclick="closeExpensesReportModal()" class="btn secondary" style="flex: 1;">
                        ❌ Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const form = document.getElementById('expenses-report-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        generateExpensesReportFromForm();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeExpensesReportModal();
    });
}

function generateExpensesReportFromForm() {
    const filters = {
        from_date: document.getElementById('report-expenses-from')?.value || '',
        to_date: document.getElementById('report-expenses-to')?.value || '',
        category: document.getElementById('report-expenses-category')?.value || '',
        payment_method: document.getElementById('report-expenses-origin')?.value || '',
        search: document.getElementById('report-expenses-search')?.value?.trim() || ''
    };

    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) {
        window.showToast('❌ No hay negocio activo', 'error');
        return;
    }

    let sql = `SELECT * FROM transactions WHERE negocio_id = ? AND type = 'expense' 
        AND deleted_at IS NULL AND voided = 0`;
    let params = [negocioId];

    if (filters.from_date) { sql += ' AND DATE(transaction_date, "localtime") >= DATE(?)'; params.push(filters.from_date); }
    if (filters.to_date) { sql += ' AND DATE(transaction_date, "localtime") <= DATE(?)'; params.push(filters.to_date); }
    if (filters.category) { sql += ' AND category = ?'; params.push(filters.category); }
    if (filters.payment_method) { sql += ' AND payment_method = ?'; params.push(filters.payment_method); }
    if (filters.search) { sql += ' AND concept LIKE ?'; params.push('%' + filters.search + '%'); }
    sql += ' ORDER BY transaction_date DESC, id ASC';

    const expenses = window.DBModule.query(sql, params);

    if (expenses.length === 0) {
        window.showToast('⚠️ No hay gastos en el período seleccionado', 'warning');
        return;
    }

    const totalGastos = expenses.reduce((sum, e) => sum + e.amount, 0);
    const porCategoria = {};
    const porOrigen = {};

    expenses.forEach(e => {
        const cat = e.category || 'otros';
        if (!porCategoria[cat]) porCategoria[cat] = { count: 0, total: 0 };
        porCategoria[cat].count++;
        porCategoria[cat].total += e.amount;

        const origen = e.payment_method || 'cash';
        if (!porOrigen[origen]) porOrigen[origen] = { count: 0, total: 0 };
        porOrigen[origen].count++;
        porOrigen[origen].total += e.amount;
    });

    const categoriaLabels = {
        'insumos': '🛒 Insumos', 'materiales': '📦 Materiales', 'transporte': '🚗 Transporte',
        'inversion': '💼 Inversión', 'otros': '🔄 Otros', 'gasto': '📤 General'
    };
    const origenLabels = { 'cash': '💵 Efectivo', 'transfer': '🏦 Transferencia', 'other': '🔄 Otra' };

    const periodo = filters.from_date && filters.to_date 
        ? `${new Date(filters.from_date).toLocaleDateString('es-ES')} al ${new Date(filters.to_date).toLocaleDateString('es-ES')}`
        : 'Todos los períodos';

    let filterDesc = [];
    if (filters.category) filterDesc.push(`📂 ${categoriaLabels[filters.category] || filters.category}`);
    if (filters.payment_method) filterDesc.push(`💳 ${origenLabels[filters.payment_method] || filters.payment_method}`);
    if (filters.search) filterDesc.push(`📝 "${filters.search}"`);

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reporte de Gastos - Panario</title>
            <style>
                * { font-family: system-ui, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
                body { padding: 20px; background: #fff; }
                .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #ef4444; padding-bottom: 15px; }
                .header h1 { color: #ef4444; font-size: 24px; }
                .header p { color: #666; font-size: 13px; margin-top: 4px; }
                .filters-info { background: #fee2e2; padding: 8px 12px; border-radius: 6px; margin-bottom: 15px; font-size: 12px; color: #991b1b; }
                .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 25px; }
                .summary-card { background: #f8f9fa; padding: 12px 16px; border-radius: 8px; text-align: center; border-left: 4px solid #ef4444; }
                .summary-card .number { font-size: 22px; font-weight: 700; color: #ef4444; }
                .summary-card .label { font-size: 11px; color: #666; }
                .section { margin-top: 20px; }
                .section h3 { color: #333; margin-bottom: 10px; font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 6px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
                th { background: #ef4444; color: #fff; padding: 8px 10px; text-align: left; font-size: 12px; }
                td { padding: 6px 10px; border-bottom: 1px solid #eee; }
                tr:nth-child(even) { background: #fafafa; }
                .total-row { font-weight: 700; background: #fef2f2; }
                .footer { margin-top: 25px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #eee; padding-top: 15px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📤 Reporte de Gastos</h1>
                <p>${periodo}</p>
                <p style="font-size: 12px; color: #94a3b8;">Generado: ${new Date().toLocaleString('es-ES')}</p>
            </div>

            ${filterDesc.length > 0 ? `<div class="filters-info">🔍 <strong>Filtros:</strong> ${filterDesc.join(' · ')}</div>` : ''}

            <div class="summary">
                <div class="summary-card">
                    <div class="number">${expenses.length}</div>
                    <div class="label">📊 Total Gastos</div>
                </div>
                <div class="summary-card">
                    <div class="number">$${totalGastos.toFixed(2)}</div>
                    <div class="label">💰 Monto Total</div>
                </div>
                <div class="summary-card">
                    <div class="number">$${(totalGastos / expenses.length).toFixed(2)}</div>
                    <div class="label">📊 Promedio</div>
                </div>
            </div>

            <div class="section">
                <h3>📂 Desglose por Categoría</h3>
                <table>
                    <thead>
                        <tr><th>Categoría</th><th style="text-align: center;">Cantidad</th><th style="text-align: right;">Total</th><th style="text-align: right;">%</th></tr>
                    </thead>
                    <tbody>
                        ${Object.entries(porCategoria).sort((a, b) => b[1].total - a[1].total).map(([cat, data]) => `
                            <tr>
                                <td>${categoriaLabels[cat] || cat}</td>
                                <td style="text-align: center;">${data.count}</td>
                                <td style="text-align: right;">$${data.total.toFixed(2)}</td>
                                <td style="text-align: right;">${totalGastos > 0 ? ((data.total / totalGastos) * 100).toFixed(1) : 0}%</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="2" style="text-align: right;">TOTAL</td>
                            <td style="text-align: right;">$${totalGastos.toFixed(2)}</td>
                            <td style="text-align: right;">100%</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="section">
                <h3>💳 Desglose por Origen del Pago</h3>
                <table>
                    <thead>
                        <tr><th>Origen</th><th style="text-align: center;">Cantidad</th><th style="text-align: right;">Total</th><th style="text-align: right;">%</th></tr>
                    </thead>
                    <tbody>
                        ${Object.entries(porOrigen).sort((a, b) => b[1].total - a[1].total).map(([origen, data]) => `
                            <tr>
                                <td>${origenLabels[origen] || origen}</td>
                                <td style="text-align: center;">${data.count}</td>
                                <td style="text-align: right;">$${data.total.toFixed(2)}</td>
                                <td style="text-align: right;">${totalGastos > 0 ? ((data.total / totalGastos) * 100).toFixed(1) : 0}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="section">
                <h3>📋 Detalle de Gastos</h3>
                <table>
                    <thead>
                        <tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Origen</th><th style="text-align: right;">Monto</th></tr>
                    </thead>
                    <tbody>
                        ${expenses.slice(0, 100).map(e => `
                            <tr>
                                <td>${new Date(e.transaction_date).toLocaleDateString('es-ES')}</td>
                                <td>${e.concept}</td>
                                <td>${categoriaLabels[e.category] || e.category || '—'}</td>
                                <td>${origenLabels[e.payment_method] || e.payment_method || '—'}</td>
                                <td style="text-align: right; color: #ef4444; font-weight: 600;">-$${e.amount.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        ${expenses.length > 100 ? `<tr><td colspan="5" style="text-align: center; color: #94a3b8; font-size: 11px;">Mostrando 100 de ${expenses.length} gastos</td></tr>` : ''}
                    </tbody>
                </table>
            </div>

            <div class="footer">
                Reporte generado desde Panario 🍞 - ${new Date().toLocaleString('es-ES')}
            </div>
        </body>
        </html>
    `;

    if (window.ReportsModule) {
        window.ReportsModule.printReport(html);
    } else {
        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 500);
    }

    closeExpensesReportModal();
    window.showToast('✅ Reporte de gastos generado', 'success');
}

function closeExpensesReportModal() {
    const modal = document.getElementById('expenses-report-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
        setTimeout(() => {
            const still = document.getElementById('expenses-report-modal');
            if (still && still.parentNode) still.remove();
        }, 500);
    }
}

// ============================================================
// LISTA DE ESPERA EN HERRAMIENTAS
// ============================================================

function showWaitingListFromSettings() {
    if (typeof window.showWaitingListManagerModal === 'function') {
        window.showWaitingListManagerModal();
    } else {
        window.showToast('⚠️ Módulo de lista de espera no disponible. Ve a Pedidos.', 'warning', 4000);
    }
}

async function reporteListaEsperaFromSettings() {
    if (typeof window.reporteListaEspera === 'function') {
        window.reporteListaEspera();
    } else if (window.ReportsModule && typeof window.ReportsModule.generateWaitingListReport === 'function') {
        try {
            window.showToast('⏳ Generando reporte...', 'info', 2000);
            const html = await window.ReportsModule.generateWaitingListReport();
            if (html) {
                window.ReportsModule.printReport(html);
                window.showToast('✅ Reporte generado', 'success', 3000);
            }
        } catch (error) {
            console.error('❌ Error generando reporte:', error);
            window.showToast('❌ Error: ' + error.message, 'error', 5000);
        }
    } else {
        window.showToast('⚠️ Módulo de reportes no disponible', 'warning', 4000);
    }
}

// ============================================================
// CANCELACIÓN GLOBAL DE PEDIDOS (SOLO ADMIN)
// ============================================================

function showGlobalCancelModal() {
    const user = window.AuthModule.getCurrentUser();
    if (!user || user.is_admin !== 1) {
        window.showToast('🔒 Solo el administrador puede cancelar pedidos globalmente', 'warning', 4000);
        return;
    }
    
    if (window.ModalModule && window.ModalModule.cerrarTodosLosModales) {
        window.ModalModule.cerrarTodosLosModales();
    }
    
    const existingModal = document.getElementById('global-cancel-modal');
    if (existingModal) existingModal.remove();
    
    const hoy = new Date();
    const en7dias = new Date(hoy);
    en7dias.setDate(en7dias.getDate() + 7);
    
    const modal = document.createElement('div');
    modal.id = 'global-cancel-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999999; padding: 15px;
        animation: modalFadeIn 0.25s ease;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 520px; width: 100%; max-height: 92vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: modalSlideUp 0.3s ease; border: 2px solid #dc2626;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #dc2626;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 32px;">🚨</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #dc2626;">Cancelación Global</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">Cancela pedidos por rango de fechas</p>
                    </div>
                </div>
                <button onclick="closeGlobalCancelModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 12px; color: #991b1b; line-height: 1.6;">
                ⚠️ <strong>ATENCIÓN:</strong> Esta acción cancelará TODOS los pedidos 
                <strong>Pendientes, Confirmados, En producción y Listos</strong> dentro del rango de fechas.
                <br><br>
                ✅ Se repondrá el stock de los pedidos que lo tenían descontado.
                <br>
                ✅ Los pedidos ya ENTREGADOS no se ven afectados.
                <br>
                ✅ Las ventas ya creadas NO se modifican.
                <br>
                ⚠️ Los clientes en lista de espera con fecha posterior al rango se conservan.
            </div>
            
            <form id="global-cancel-form" style="display: flex; flex-direction: column; gap: 14px;">
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">
                        📅 Rango de fechas
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group">
                            <label style="font-size: 12px;">Desde</label>
                            <input type="date" id="global-cancel-from" 
                                   value="${hoy.toISOString().split('T')[0]}" 
                                   class="input-field" required>
                        </div>
                        <div class="form-group">
                            <label style="font-size: 12px;">Hasta</label>
                            <input type="date" id="global-cancel-to" 
                                   value="${en7dias.toISOString().split('T')[0]}" 
                                   class="input-field" required>
                        </div>
                    </div>
                </div>
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">
                        📌 Causa principal
                    </div>
                    <select id="global-cancel-causa" class="input-select" required>
                        <option value="Falta de insumos">🛒 Falta de insumos</option>
                        <option value="Apagón prolongado">⚡ Apagón prolongado</option>
                        <option value="Mantenimiento de equipos">🔧 Mantenimiento de equipos</option>
                        <option value="Cierre temporal">🚪 Cierre temporal</option>
                        <option value="Problema de salud">🏥 Problema de salud</option>
                        <option value="Fuerza mayor">⚠️ Fuerza mayor</option>
                        <option value="Otro">🔄 Otro</option>
                    </select>
                </div>
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">
                        📝 Nota adicional (opcional)
                    </div>
                    <textarea id="global-cancel-nota" 
                              class="input-textarea" 
                              rows="2" 
                              placeholder="Ej: Se espera reanudar la próxima semana"></textarea>
                </div>
                
                <div style="display: flex; gap: 8px; margin-top: 4px;">
                    <button type="submit" 
                            class="btn" 
                            style="flex: 1; padding: 12px; font-size: 14px; background: #dc2626; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">
                        🚨 CANCELAR PEDIDOS
                    </button>
                    <button type="button" 
                            onclick="closeGlobalCancelModal()" 
                            class="btn secondary" 
                            style="flex: 1; padding: 12px; font-size: 14px;">
                        ❌ Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    window._globalCancelModal = modal;
    
    const form = document.getElementById('global-cancel-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await executeGlobalCancel();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeGlobalCancelModal();
    });
    
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeGlobalCancelModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

function closeGlobalCancelModal() {
    const modal = document.getElementById('global-cancel-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
        setTimeout(() => {
            const still = document.getElementById('global-cancel-modal');
            if (still && still.parentNode) still.remove();
        }, 500);
    }
    window._globalCancelModal = null;
}

async function executeGlobalCancel() {
    const fechaDesde = document.getElementById('global-cancel-from')?.value;
    const fechaHasta = document.getElementById('global-cancel-to')?.value;
    const causa = document.getElementById('global-cancel-causa')?.value || '';
    const nota = document.getElementById('global-cancel-nota')?.value?.trim() || '';
    
    if (!fechaDesde || !fechaHasta) {
        window.showToast('⚠️ Debes especificar fecha desde y hasta', 'error');
        return;
    }
    
    if (fechaDesde > fechaHasta) {
        window.showToast('⚠️ La fecha "desde" debe ser anterior a "hasta"', 'error');
        return;
    }
    
    const negocioId = window.DBModule.getNegocioIdActual();
    const pedidosEnRango = window.DBModule.query(`
        SELECT COUNT(*) as n FROM orders
        WHERE negocio_id = ? 
          AND deleted_at IS NULL
          AND status IN ('pending', 'confirmed', 'production', 'ready')
          AND DATE(delivery_date) >= DATE(?)
          AND DATE(delivery_date) <= DATE(?)
    `, [negocioId, fechaDesde, fechaHasta]);
    
    const count = pedidosEnRango[0]?.n || 0;
    
    if (count === 0) {
        window.showToast(`ℹ️ No hay pedidos cancelables en el rango ${fechaDesde} → ${fechaHasta}`, 'info', 5000);
        return;
    }
    
    const confirm1 = await window.ModalModule.showConfirm({
        title: '⚠️ Confirmar cancelación',
        message: `Se cancelarán ${count} pedido(s) entre el ${fechaDesde} y el ${fechaHasta}.\n\n📌 Causa: ${causa}\n${nota ? `📝 Nota: ${nota}\n\n` : ''}¿Continuar?`,
        confirmText: '⚠️ CONTINUAR',
        cancelText: '❌ Cancelar',
        icon: '⚠️',
        confirmColor: '#f59e0b'
    });
    
    if (!confirm1) return;
    
    const confirm2 = await window.ModalModule.showConfirm({
        title: '🚨 CONFIRMACIÓN FINAL',
        message: `Esta es la ÚLTIMA advertencia.\n\nSe cancelarán ${count} pedido(s).\nLos pedidos cancelados NO se pueden recuperar (aunque sí los datos quedan en el historial).\n\n¿Confirmas?`,
        confirmText: '🚨 SÍ, CANCELAR TODO',
        cancelText: '❌ NO, volver',
        icon: '🚨',
        confirmColor: '#dc2626'
    });
    
    if (!confirm2) {
        window.showToast('❌ Cancelación abortada', 'info', 2000);
        return;
    }
    
    closeGlobalCancelModal();
    
    try {
        window.showToast('⏳ Cancelando pedidos...', 'info', 3000);
        
        const result = await window.OrdersModule.cancelarPedidosGlobalmente(
            fechaDesde, fechaHasta, causa, nota
        );
        
        if (!result.success) {
            window.showToast('❌ Error: ' + (result.error || 'Desconocido'), 'error', 6000);
            return;
        }
        
        const erroresHtml = (result.errores && result.errores.length > 0)
            ? `\n\n⚠️ Hubo ${result.errores.length} error(es):\n${result.errores.slice(0, 5).join('\n')}`
            : '';
        
        const mensaje = `✅ Cancelación completada.\n\n` +
            `🚫 Pedidos cancelados: ${result.cancelados}\n` +
            `🔄 Items reiniciados de lista: ${result.reiniciados}\n` +
            `⏰ Items preservados de lista: ${result.preservados}\n\n` +
            `📌 Causa: ${result.notaFinal}${erroresHtml}`;
        
        await window.ModalModule.showAlert({
            title: '✅ Cancelación global exitosa',
            message: mensaje,
            icon: '✅', type: 'success', buttonText: '✅ Entendido'
        });
        
        window.showToast(`✅ ${result.cancelados} pedido(s) cancelado(s)`, 'success', 5000);
        
        if (typeof window.refreshCurrentView === 'function') {
            setTimeout(window.refreshCurrentView, 500);
        }
        if (typeof window.loadDashboardData === 'function') {
            setTimeout(window.loadDashboardData, 800);
        }
        
    } catch (error) {
        console.error('❌ Error en cancelación global:', error);
        window.showToast('❌ Error: ' + error.message, 'error', 6000);
    }
}

// ============================================================
// REPROGRAMAR PEDIDOS POR RANGO (SOLO ADMIN)
// ============================================================

function showReprogramarPedidosModal() {
    const user = window.AuthModule.getCurrentUser();
    if (!user || user.is_admin !== 1) {
        window.showToast('🔒 Solo el administrador puede reprogramar pedidos', 'warning', 4000);
        return;
    }
    
    if (window.ModalModule && window.ModalModule.cerrarTodosLosModales) {
        window.ModalModule.cerrarTodosLosModales();
    }
    
    const existingModal = document.getElementById('reprogramar-modal');
    if (existingModal) existingModal.remove();
    
    const hoy = new Date();
    const en7dias = new Date(hoy);
    en7dias.setDate(en7dias.getDate() + 7);
    const en14dias = new Date(hoy);
    en14dias.setDate(en14dias.getDate() + 14);
    
    const modal = document.createElement('div');
    modal.id = 'reprogramar-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999999; padding: 15px;
        animation: modalFadeIn 0.25s ease;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 560px; width: 100%; max-height: 92vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: modalSlideUp 0.3s ease; border: 2px solid #8b5cf6;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #8b5cf6;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 32px;">🔄</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #8b5cf6;">Reprogramar Pedidos</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">Mueve pedidos de una fecha a otra</p>
                    </div>
                </div>
                <button onclick="closeReprogramarModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="background: #f5f3ff; border: 1px solid #c4b5fd; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 12px; color: #5b21b6; line-height: 1.6;">
                💡 <strong>¿Cómo funciona?</strong><br>
                Los pedidos en el rango de fechas de origen se moverán a la fecha destino.
                <br>La causa y nota se añadirán al campo de notas de cada pedido.
                <br>Solo se reprograman pedidos <strong>pendientes, confirmados, en producción o listos</strong>.
            </div>
            
            <form id="reprogramar-form" style="display: flex; flex-direction: column; gap: 14px;">
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">
                        📅 Rango de fechas ORIGEN
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group">
                            <label style="font-size: 12px;">Desde</label>
                            <input type="date" id="reprogramar-from" 
                                   value="${hoy.toISOString().split('T')[0]}" 
                                   class="input-field" required
                                   onchange="actualizarPreviewReprogramacion()">
                        </div>
                        <div class="form-group">
                            <label style="font-size: 12px;">Hasta</label>
                            <input type="date" id="reprogramar-to" 
                                   value="${en7dias.toISOString().split('T')[0]}" 
                                   class="input-field" required
                                   onchange="actualizarPreviewReprogramacion()">
                        </div>
                    </div>
                </div>
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">
                        👤 Filtrar por cliente (opcional)
                    </div>
                    <input type="text" id="reprogramar-cliente" 
                           class="input-field" 
                           placeholder="Dejar vacío para todos los clientes"
                           oninput="actualizarPreviewReprogramacion()">
                    <small style="font-size: 11px; color: var(--text-light); display: block; margin-top: 4px;">
                        Si se especifica, solo se reprograman los pedidos de ese cliente
                    </small>
                </div>
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid #10b981;">
                    <div style="font-size: 13px; font-weight: 600; color: #10b981; margin-bottom: 8px;">
                        🎯 Fecha DESTINO
                    </div>
                    <div class="form-group">
                        <input type="date" id="reprogramar-destino" 
                               value="${en14dias.toISOString().split('T')[0]}" 
                               class="input-field" required
                               onchange="actualizarPreviewReprogramacion()">
                    </div>
                </div>
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">
                        📌 Causa de la reprogramación
                    </div>
                    <select id="reprogramar-causa" class="input-select" required>
                        ${MOTIVOS_REPROGRAMACION.map(m => 
                            `<option value="${m.value}">${m.label}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">
                        📝 Nota adicional (opcional)
                    </div>
                    <textarea id="reprogramar-nota" 
                              class="input-textarea" 
                              rows="2" 
                              placeholder="Ej: Se pospone por mantenimiento del horno"></textarea>
                </div>
                
                <div id="reprogramar-preview" style="background: #f0f9ff; padding: 12px; border-radius: 8px; border: 2px solid #3b82f6; font-size: 12px;">
                    <div style="text-align: center; color: var(--text-light);">
                        Cargando vista previa...
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px; margin-top: 4px;">
                    <button type="submit" 
                            class="btn" 
                            style="flex: 1; padding: 12px; font-size: 14px; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">
                        🔄 REPROGRAMAR PEDIDOS
                    </button>
                    <button type="button" 
                            onclick="closeReprogramarModal()" 
                            class="btn secondary" 
                            style="flex: 1; padding: 12px; font-size: 14px;">
                        ❌ Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    window._reprogramarModal = modal;
    
    const form = document.getElementById('reprogramar-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await executeReprogramarPedidos();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeReprogramarModal();
    });
    
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeReprogramarModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    setTimeout(actualizarPreviewReprogramacion, 100);
}

function closeReprogramarModal() {
    const modal = document.getElementById('reprogramar-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
        setTimeout(() => {
            const still = document.getElementById('reprogramar-modal');
            if (still && still.parentNode) still.remove();
        }, 500);
    }
    window._reprogramarModal = null;
}

function actualizarPreviewReprogramacion() {
    const preview = document.getElementById('reprogramar-preview');
    if (!preview) return;
    
    const fromDate = document.getElementById('reprogramar-from')?.value;
    const toDate = document.getElementById('reprogramar-to')?.value;
    const cliente = document.getElementById('reprogramar-cliente')?.value?.trim() || '';
    const destinoDate = document.getElementById('reprogramar-destino')?.value;
    
    if (!fromDate || !toDate || !destinoDate) {
        preview.innerHTML = '<div style="text-align: center; color: var(--text-light);">Selecciona las fechas</div>';
        return;
    }
    
    if (fromDate > toDate) {
        preview.innerHTML = '<div style="text-align: center; color: #ef4444;">⚠️ La fecha "desde" debe ser anterior a "hasta"</div>';
        return;
    }
    
    if (destinoDate >= fromDate && destinoDate <= toDate) {
        preview.innerHTML = '<div style="text-align: center; color: #f59e0b;">⚠️ La fecha destino está dentro del rango origen</div>';
        return;
    }
    
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) {
        preview.innerHTML = '<div style="text-align: center; color: #ef4444;">❌ No hay negocio activo</div>';
        return;
    }
    
    let sql = `
        SELECT id, client_name, total, status, delivery_date
        FROM orders
        WHERE negocio_id = ? 
          AND deleted_at IS NULL
          AND status IN ('pending', 'confirmed', 'production', 'ready')
          AND DATE(delivery_date) >= DATE(?)
          AND DATE(delivery_date) <= DATE(?)
    `;
    let params = [negocioId, fromDate, toDate];
    
    if (cliente) {
        sql += ' AND LOWER(client_name) LIKE LOWER(?)';
        params.push('%' + cliente + '%');
    }
    
    sql += ' ORDER BY delivery_date ASC, id ASC';
    
    const pedidos = window.DBModule.query(sql, params);
    
    if (pedidos.length === 0) {
        preview.innerHTML = '<div style="text-align: center; color: var(--text-light);">📭 No hay pedidos en el rango especificado</div>';
        return;
    }
    
    const totalMonto = pedidos.reduce((sum, p) => sum + (p.total || 0), 0);
    
    preview.innerHTML = `
        <div style="margin-bottom: 8px;">
            <strong style="color: #3b82f6;">📋 Vista previa (${pedidos.length} pedido${pedidos.length > 1 ? 's' : ''})</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 3px 0;">
            <span>📅 Fecha destino:</span>
            <strong>${destinoDate}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 3px 0;">
            <span>💰 Monto total:</span>
            <strong style="color: #10b981;">$${totalMonto.toFixed(2)}</strong>
        </div>
        ${cliente ? `
            <div style="display: flex; justify-content: space-between; padding: 3px 0;">
                <span>👤 Cliente filtrado:</span>
                <strong>${cliente}</strong>
            </div>
        ` : ''}
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #93c5fd; max-height: 120px; overflow-y: auto;">
            ${pedidos.slice(0, 10).map(p => `
                <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; color: var(--text-light);">
                    <span>#${p.id} - ${p.client_name}</span>
                    <span>📅 ${p.delivery_date.split('T')[0]} → ${destinoDate}</span>
                </div>
            `).join('')}
            ${pedidos.length > 10 ? `<div style="text-align: center; font-size: 11px; color: var(--text-light); padding: 4px;">... y ${pedidos.length - 10} más</div>` : ''}
        </div>
    `;
}

async function executeReprogramarPedidos() {
    const fechaDesde = document.getElementById('reprogramar-from')?.value;
    const fechaHasta = document.getElementById('reprogramar-to')?.value;
    const clienteFiltro = document.getElementById('reprogramar-cliente')?.value?.trim() || '';
    const fechaDestino = document.getElementById('reprogramar-destino')?.value;
    const causa = document.getElementById('reprogramar-causa')?.value || '';
    const nota = document.getElementById('reprogramar-nota')?.value?.trim() || '';
    
    if (!fechaDesde || !fechaHasta || !fechaDestino) {
        window.showToast('⚠️ Debes completar todas las fechas', 'error');
        return;
    }
    
    if (fechaDesde > fechaHasta) {
        window.showToast('⚠️ La fecha "desde" debe ser anterior a "hasta"', 'error');
        return;
    }
    
    if (fechaDestino >= fechaDesde && fechaDestino <= fechaHasta) {
        window.showToast('⚠️ La fecha destino no puede estar dentro del rango origen', 'error');
        return;
    }
    
    const negocioId = window.DBModule.getNegocioIdActual();
    let countSql = `SELECT COUNT(*) as n FROM orders 
        WHERE negocio_id = ? AND deleted_at IS NULL
          AND status IN ('pending', 'confirmed', 'production', 'ready')
          AND DATE(delivery_date) >= DATE(?)
          AND DATE(delivery_date) <= DATE(?)`;
    let countParams = [negocioId, fechaDesde, fechaHasta];
    
    if (clienteFiltro) {
        countSql += ' AND LOWER(client_name) LIKE LOWER(?)';
        countParams.push('%' + clienteFiltro + '%');
    }
    
    const countResult = window.DBModule.query(countSql, countParams);
    const count = countResult[0]?.n || 0;
    
    if (count === 0) {
        window.showToast('ℹ️ No hay pedidos para reprogramar', 'info', 4000);
        return;
    }
    
    const confirm1 = await window.ModalModule.showConfirm({
        title: '🔄 Confirmar reprogramación',
        message: `Se moverán ${count} pedido(s) desde el rango:\n📅 ${fechaDesde} → ${fechaHasta}\n\nHacia:\n🎯 ${fechaDestino}\n\n📌 Causa: ${causa}\n${nota ? `📝 Nota: ${nota}\n` : ''}${clienteFiltro ? `👤 Cliente: ${clienteFiltro}\n` : ''}\n¿Continuar?`,
        confirmText: '🔄 CONTINUAR',
        cancelText: '❌ Cancelar',
        icon: '🔄',
        confirmColor: '#8b5cf6'
    });
    
    if (!confirm1) return;
    
    closeReprogramarModal();
    
    try {
        window.showToast('⏳ Reprogramando pedidos...', 'info', 3000);
        
        const result = await window.OrdersModule.reprogramarPedidosPorRango(
            fechaDesde, fechaHasta, fechaDestino, causa, nota, clienteFiltro
        );
        
        if (!result.success) {
            window.showToast('❌ Error: ' + (result.error || 'Desconocido'), 'error', 6000);
            return;
        }
        
        await window.ModalModule.showAlert({
            title: '✅ Reprogramación exitosa',
            message: `Se reprogramaron ${result.reprogramados} pedido(s).\n\n` +
                     `📅 Nueva fecha: ${fechaDestino}\n` +
                     `📌 Causa: ${causa}\n` +
                     `${result.errores && result.errores.length > 0 ? `\n⚠️ ${result.errores.length} error(es).` : ''}`,
            icon: '✅', type: 'success', buttonText: '✅ Entendido'
        });
        
        window.showToast(`✅ ${result.reprogramados} pedido(s) reprogramado(s)`, 'success', 5000);
        
        if (typeof window.refreshCurrentView === 'function') {
            setTimeout(window.refreshCurrentView, 500);
        }
        if (typeof window.loadDashboardData === 'function') {
            setTimeout(window.loadDashboardData, 800);
        }
        
    } catch (error) {
        console.error('❌ Error en reprogramación:', error);
        window.showToast('❌ Error: ' + error.message, 'error', 6000);
    }
}

window.showReprogramarPedidosModal = showReprogramarPedidosModal;
window.closeReprogramarModal = closeReprogramarModal;
window.actualizarPreviewReprogramacion = actualizarPreviewReprogramacion;
window.executeReprogramarPedidos = executeReprogramarPedidos;

// ============================================================
// RENDER SETTINGS VIEW - FUNCIÓN PRINCIPAL
// ============================================================

function renderSettingsView() {
    console.log('⚙️ renderSettingsView() ejecutado');
    
    const main = document.getElementById('mainContent');
    if (!main) {
        console.error('❌ mainContent no encontrado');
        return;
    }
    
    const user = window.AuthModule.getCurrentUser();
    const isAdmin = user && user.is_admin === 1;
    
    const appVersion = getAppVersion();
    
    let waitingCount = 0;
    if (window.OrdersModule && window.OrdersModule.getWaitingListCount) {
        window.OrdersModule.getWaitingListCount().then(count => {
            waitingCount = count;
            const badge = document.getElementById('settings-waiting-count');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline-block' : 'none';
            }
        }).catch(() => {});
    }
    
    main.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h2 style="margin: 0;">⚙️ Herramientas</h2>
            <button onclick="window.navigate('dashboard')" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                ← Volver
            </button>
        </div>
        
        <div class="card" style="border-left: 4px solid ${isAdmin ? '#f59e0b' : '#3b82f6'}; background: ${isAdmin ? '#f59e0b10' : '#3b82f610'}; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 32px;">${isAdmin ? '👑' : '👤'}</span>
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 15px; color: ${isAdmin ? '#f59e0b' : '#3b82f6'};">
                        ${isAdmin ? 'Eres Administrador' : 'Eres Usuario'}
                    </div>
                    <div style="font-size: 12px; color: var(--text-light); margin-top: 2px;">
                        ${isAdmin 
                            ? 'Puedes crear e importar copias de seguridad completas y de datos.'
                            : 'Solo puedes crear e importar copias de datos (no afectan a los usuarios).'
                        }
                    </div>
                </div>
            </div>
        </div>
        
        ${isAdmin ? `
        <div class="card" style="border-left: 4px solid #f59e0b; border: 2px solid #f59e0b; background: linear-gradient(135deg, #f59e0b10 0%, #f59e0b05 100%);">
            <h3 style="margin: 0 0 8px 0; color: #f59e0b;">👥 Gestión de Usuarios</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Administra los usuarios de tu negocio, regenera el código de invitación y gestiona accesos.
            </p>
            <button onclick="showUsersModal()" class="btn primary" style="padding: 10px 16px; font-size: 14px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                👥 Gestionar Usuarios
            </button>
        </div>
        ` : ''}
        
        <div class="card" style="border-left: 4px solid #f59e0b; border: 2px solid #f59e0b;">
            <h3 style="margin: 0 0 8px 0; color: #f59e0b; display: flex; align-items: center; gap: 8px;">
                ⏰ Lista de Espera 
                <span id="settings-waiting-count" style="font-size: 12px; background: #f59e0b; color: #fff; padding: 2px 10px; border-radius: 12px; display: none; font-weight: 700;">0</span>
            </h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Gestiona los clientes en cola: procesar ventas, cancelar pedidos, limpiar la lista y generar reportes.
            </p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="showWaitingListFromSettings()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    ⏰ Gestionar lista de espera
                </button>
                <button onclick="reporteListaEsperaFromSettings()" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #3b82f6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📄 Reporte PDF
                </button>
            </div>
        </div>
        
        ${isAdmin ? `
        <div class="card" style="border-left: 4px solid #dc2626; border: 2px solid #dc2626;">
            <h3 style="margin: 0 0 8px 0; color: #dc2626;">🚨 Cancelación Global de Pedidos</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Cancela todos los pedidos en un rango de fechas. Útil para apagones prolongados, falta de insumos o cierres temporales.
                <br><strong style="color: #dc2626;">Solo administradores.</strong>
            </p>
            <button onclick="showGlobalCancelModal()" class="btn" style="padding: 10px 16px; font-size: 14px; width: auto; background: #dc2626; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">
                🚨 Cancelar pedidos por rango
            </button>
        </div>
        
        <div class="card" style="border-left: 4px solid #8b5cf6; border: 2px solid #8b5cf6; background: linear-gradient(135deg, #8b5cf610 0%, #8b5cf605 100%);">
            <h3 style="margin: 0 0 8px 0; color: #8b5cf6;">🔄 Reprogramar Pedidos por Rango</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Mueve todos los pedidos de un rango de fechas a una fecha destino. La causa y nota se añaden automáticamente a cada pedido.
                <br><strong style="color: #8b5cf6;">Solo administradores.</strong>
            </p>
            <button onclick="showReprogramarPedidosModal()" class="btn" style="padding: 10px 16px; font-size: 14px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">
                🔄 Reprogramar pedidos por rango
            </button>
        </div>
        ` : ''}
        
        <div class="card" style="border-left: 4px solid #f59e0b; border: 2px solid #f59e0b;">
            <h3 style="margin: 0 0 8px 0; color: #f59e0b;">⚡ Horarios de Producción (Corriente)</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Gestiona los horarios de corriente eléctrica para planificar tu producción.
                <br>🆕 Ahora puedes marcar el bloque de producción y la cantidad a producir (acepta decimales: 6.5 = 6 jabas y media).
            </p>
            <button onclick="showCorrienteModal()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                ⚡ Gestionar Horarios
            </button>
        </div>
        
        <!-- 🆕 ENTREGA 6: Botón de diagnóstico destacado -->
        <div class="card" style="border-left: 4px solid #8b5cf6; border: 2px dashed #8b5cf6; background: linear-gradient(135deg, #8b5cf608 0%, #8b5cf604 100%);">
            <h3 style="margin: 0 0 8px 0; color: #8b5cf6;">🔍 Diagnóstico de Producción</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                ¿El guardado de producción no funciona? Ejecuta un diagnóstico técnico para identificar el problema.
                <br>Muestra 6 comprobaciones y permite copiar el reporte.
            </p>
            <button onclick="showProductionDiagnosticModal()" class="btn" style="padding: 8px 16px; font-size: 14px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                🔍 Ejecutar diagnóstico
            </button>
        </div>
        
        <div class="card" style="border-left: 4px solid #ef4444; border: 2px solid #ef4444;">
            <h3 style="margin: 0 0 8px 0; color: #ef4444;">📊 Reporte de Gastos</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Genera un reporte parametrizable de todos los gastos por rango de fechas, categoría y origen del pago.
            </p>
            <button onclick="showExpensesReportModal()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #ef4444; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                📊 Generar Reporte de Gastos
            </button>
        </div>
        
        <div class="card" style="border-left: 4px solid #10b981; border: 2px solid #10b981;">
            <h3 style="margin: 0 0 8px 0; color: #10b981;">📤 Exportar copia de seguridad</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                ${isAdmin 
                    ? 'Como administrador, puedes crear dos tipos de copia: <strong>completa</strong> (incluye usuarios y negocio) o <strong>solo datos</strong> (solo datos operativos).'
                    : 'Puedes crear una copia de <strong>solo datos</strong> (insumos, recetas, productos, ventas, pedidos). Tus usuarios y el código de invitación no se incluyen.'
                }
            </p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${isAdmin ? `
                    <button onclick="exportDatabaseCompleteAction()" class="btn primary" style="padding: 10px 16px; font-size: 14px; width: auto; background: #10b981; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        📦 Copia completa (admin)
                    </button>
                ` : ''}
                <button onclick="exportDatabaseDataOnlyAction()" class="btn primary" style="padding: 10px 16px; font-size: 14px; width: auto; background: #3b82f6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📊 Copia de datos
                </button>
            </div>
        </div>
        
        <div class="card" style="border-left: 4px solid #f59e0b; border: 2px solid #f59e0b;">
            <h3 style="margin: 0 0 8px 0; color: #f59e0b;">📥 Importar copia de seguridad</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Elige cómo quieres importar el archivo <code>.db</code> de otro dispositivo:
                <br>• <strong>Importar copia:</strong> reemplaza TODOS los datos (incluye usuarios si eres admin).
                <br>• <strong>Importar solo datos:</strong> reemplaza los datos operativos, conserva usuarios.
                <br>• <strong>🔀 Fusionar:</strong> <span style="color: #8b5cf6; font-weight: 600;">combina</span> los datos del backup con los actuales.
            </p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="importDatabaseSmartAction()" class="btn primary" style="padding: 10px 16px; font-size: 14px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📥 Importar copia (detección automática)
                </button>
                <button onclick="importDatabaseDataOnlyFromFileAction()" class="btn secondary" style="padding: 10px 16px; font-size: 14px; width: auto; background: #3b82f6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📊 Importar solo datos (reemplaza)
                </button>
                <button onclick="importDatabaseFusionAction()" class="btn primary" style="padding: 10px 16px; font-size: 14px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    🔀 Fusionar bases de datos
                </button>
            </div>
            <p style="font-size: 12px; color: var(--text-light); margin-top: 8px;">
                💡 <strong>Recomendado:</strong> usa "🔀 Fusionar" para integrar cambios de otro dispositivo sin perder datos locales.
            </p>
        </div>
        
        <div class="card" style="border-left: 4px solid #8b5cf6; border: 2px solid #8b5cf6;">
            <h3 style="margin: 0 0 8px 0; color: #8b5cf6;">🧩 Salva diferencial (Recetas y Productos)</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Exporta o importa <strong>solo las recetas y productos</strong>. Esta salva NO afecta a ventas, pedidos, insumos, clientes ni transacciones.
            </p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="exportSalvaRecetasProductos()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📤 Exportar recetas y productos
                </button>
                <button onclick="importSalvaRecetasProductos()" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📥 Importar recetas y productos
                </button>
            </div>
        </div>
        
        <div class="card">
            <h3 style="margin: 0 0 8px 0;">👤 Recordar usuario</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                ${user ? `Último usuario: <strong>${user.username}</strong>` : 'No hay usuario recordado'}
            </p>
            <button onclick="clearLastUserAction()" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                🗑️ Olvidar último usuario
            </button>
        </div>
        
        <div class="card" style="border-left: 4px solid #ef4444;">
            <h3 style="margin: 0 0 8px 0;">🧹 Limpiar datos eliminados</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Elimina permanentemente todos los registros marcados como eliminados.
                <br><strong style="color: #ef4444;">⚠️ Esta acción no se puede deshacer.</strong>
            </p>
            <button onclick="cleanDeletedData()" class="btn danger" style="padding: 8px 16px; font-size: 14px; width: auto;">
                🗑️ Limpiar datos eliminados
            </button>
        </div>
        
        ${isAdmin ? `
        <div class="card" style="border-left: 4px solid #dc2626; border: 2px solid #dc2626; background: var(--bg);">
            <h3 style="margin: 0 0 8px 0; color: #dc2626;">🚨 Eliminación por error</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                <strong style="color: #dc2626;">⚠️ ¡ADVERTENCIA!</strong><br>
                Elimina <strong>PERMANENTEMENTE</strong> pedidos y ventas creados por error.
                <br><span style="color: #dc2626;">Los datos eliminados NO se pueden recuperar.</span>
            </p>
            <button onclick="showDeleteSelectorModal()" class="btn danger" style="padding: 10px 20px; font-size: 15px; width: auto; background: #dc2626; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                🗑️ SELECCIONAR Y ELIMINAR
            </button>
        </div>
        
        <div class="card" style="border-left: 4px solid #dc2626; border: 2px solid #dc2626; background: var(--bg);">
            <h3 style="margin: 0 0 8px 0; color: #dc2626;">🚨 Reiniciar Base de Datos</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                <strong style="color: #dc2626;">⚠️ ¡ADVERTENCIA!</strong><br>
                Elimina <strong>TODOS</strong> los datos de la aplicación.
                <br><span style="color: #10b981;">✅ Se conservan usuarios y temas.</span>
                <br><br>
                <strong style="color: #dc2626;">Contraseña: "panario"</strong>
            </p>
            <button onclick="resetDatabaseWithPassword()" class="btn danger" style="padding: 10px 20px; font-size: 15px; width: auto; background: #dc2626; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                🚨 REINICIAR BASE DE DATOS
            </button>
        </div>
        ` : ''}
        
        <div class="card">
            <h3 style="margin: 0 0 8px 0;">ℹ️ Información</h3>
            <p style="font-size: 14px; color: var(--text-light);">
                <strong>Panario</strong> - Tu panadería en orden<br>
                Versión: <span id="app-version-display">${appVersion}</span>
            </p>
            <p style="font-size: 12px; color: var(--text-light); margin-top: 8px;">
                🍞 Desarrollado por Ricardo Castillo Valdés
            </p>
        </div>
    `;
    
    console.log(`✅ renderSettingsView() completado (versión mostrada: ${appVersion})`);
}

// ============================================================
// MÓDULO DE USUARIOS (SOLO ADMIN)
// ============================================================

async function showUsersModal() {
    if (window.ModalModule && window.ModalModule.cerrarTodosLosModales) {
        window.ModalModule.cerrarTodosLosModales();
    }
    
    const existingModal = document.getElementById('users-modal');
    if (existingModal) existingModal.remove();
    
    const user = window.AuthModule.getCurrentUser();
    if (!user || user.is_admin !== 1) {
        window.showToast('⚠️ Solo el administrador puede gestionar usuarios', 'warning');
        return;
    }
    
    const negocioId = window.DBModule.getNegocioIdActual();
    const negocio = window.DBModule.getNegocio(negocioId);
    
    if (!negocio) {
        window.showToast('❌ No hay negocio activo', 'error');
        return;
    }
    
    const usuarios = window.DBModule.query(`
        SELECT id, username, name, email, phone, photo, is_admin, created_at
        FROM users WHERE negocio_id = ? AND deleted_at IS NULL
        ORDER BY is_admin DESC, created_at ASC`, [negocioId]);
    
    const modal = document.createElement('div');
    modal.id = 'users-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999999; padding: 15px;
        animation: modalFadeIn 0.25s ease;
    `;
    
    const usuariosHtml = usuarios.map(u => {
        const isCurrentUser = u.id === user.id;
        const isAdminUser = u.is_admin === 1;
        const avatar = u.photo && u.photo.startsWith('data:image')
            ? `<img src="${u.photo}" style="width: 100%; height: 100%; object-fit: cover;">`
            : `<span style="font-size: 20px;">${isAdminUser ? '👑' : '👤'}</span>`;
        
        const fechaRegistro = u.created_at 
            ? new Date(u.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';
        
        return `
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg); border-radius: 10px; margin-bottom: 6px; border-left: 4px solid ${isAdminUser ? '#f59e0b' : '#3b82f6'}; flex-wrap: wrap;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg-card); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; border: 2px solid ${isAdminUser ? '#f59e0b' : '#3b82f6'};">
                    ${avatar}
                </div>
                <div style="flex: 1; min-width: 150px;">
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="font-weight: 600; font-size: 14px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${u.name || u.username}
                        </span>
                        ${isAdminUser ? '<span style="font-size: 10px; background: #f59e0b20; color: #f59e0b; padding: 1px 6px; border-radius: 8px; font-weight: 600;">👑 ADMIN</span>' : ''}
                        ${isCurrentUser ? '<span style="font-size: 10px; background: #10b98120; color: #10b981; padding: 1px 6px; border-radius: 8px; font-weight: 600;">TÚ</span>' : ''}
                    </div>
                    <div style="font-size: 12px; color: var(--text-light); margin-top: 2px;">@${u.username}</div>
                    <div style="font-size: 11px; color: var(--text-light); margin-top: 2px;">
                        📅 ${fechaRegistro}
                        ${u.email ? ` · 📧 ${u.email}` : ''}
                        ${u.phone ? ` · 📞 ${u.phone}` : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 4px; flex-wrap: wrap; flex-shrink: 0;">
                    <button onclick="event.stopPropagation(); showEditUserModal(${u.id})" 
                            class="btn secondary" style="padding: 6px 10px; font-size: 12px; width: auto;" title="Editar datos">✏️</button>
                    <button onclick="event.stopPropagation(); showChangePasswordModal(${u.id}, '${u.username.replace(/'/g, "\\'")}')" 
                            class="btn secondary" style="padding: 6px 10px; font-size: 12px; width: auto;" title="Cambiar contraseña">🔑</button>
                    ${!isCurrentUser ? `
                        <button onclick="event.stopPropagation(); handleToggleAdmin(${u.id}, ${isAdminUser ? 'false' : 'true'}, '${u.username.replace(/'/g, "\\'")}')" 
                                class="btn secondary" style="padding: 6px 10px; font-size: 12px; width: auto; color: ${isAdminUser ? '#94a3b8' : '#f59e0b'}; border-color: ${isAdminUser ? '#94a3b8' : '#f59e0b'};" 
                                title="${isAdminUser ? 'Quitar admin' : 'Promover a admin'}">${isAdminUser ? '👤' : '👑'}</button>
                        <button onclick="event.stopPropagation(); deleteUser(${u.id}, '${u.username.replace(/'/g, "\\'")}')" 
                                class="btn secondary" style="padding: 6px 10px; font-size: 12px; width: auto; color: #ef4444; border-color: #ef4444;" 
                                title="Eliminar usuario">🗑️</button>
                    ` : `<span style="font-size: 11px; color: var(--text-light); padding: 6px 4px;">—</span>`}
                </div>
            </div>
        `;
    }).join('');
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 20px; max-width: 600px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color); overflow-y: auto;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">👥</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: var(--text);">Usuarios del Negocio</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">${negocio.nombre}</p>
                    </div>
                </div>
                <button onclick="closeUsersModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 100px; background: #f59e0b15; padding: 10px 12px; border-radius: 8px; text-align: center; border-left: 3px solid #f59e0b;">
                    <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${usuarios.length}</div>
                    <div style="font-size: 11px; color: var(--text-light);">Total usuarios</div>
                </div>
                <div style="flex: 1; min-width: 100px; background: #3b82f615; padding: 10px 12px; border-radius: 8px; text-align: center; border-left: 3px solid #3b82f6;">
                    <div style="font-size: 20px; font-weight: 700; color: #3b82f6;">${usuarios.filter(u => u.is_admin === 1).length}</div>
                    <div style="font-size: 11px; color: var(--text-light);">Administradores</div>
                </div>
                <div style="flex: 1; min-width: 100px; background: #10b98115; padding: 10px 12px; border-radius: 8px; text-align: center; border-left: 3px solid #10b981;">
                    <div style="font-size: 20px; font-weight: 700; color: #10b981;">${usuarios.filter(u => u.is_admin !== 1).length}</div>
                    <div style="font-size: 11px; color: var(--text-light);">Usuarios regulares</div>
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #f59e0b15 0%, #f59e0b05 100%); border: 2px solid #f59e0b; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <span style="font-size: 22px;">🔑</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 14px; color: #f59e0b;">Código de invitación</div>
                        <div style="font-size: 11px; color: var(--text-light);">Comparte este código para invitar usuarios</div>
                    </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 150px; background: var(--bg-card); padding: 10px 14px; border-radius: 8px; text-align: center; border: 1px solid var(--border-color);">
                        <span style="font-family: monospace; font-size: 20px; font-weight: 700; letter-spacing: 3px; color: #f59e0b;">
                            ${negocio.codigo_invitacion || '—'}
                        </span>
                    </div>
                    <button onclick="copiarCodigoInvitacion('${negocio.codigo_invitacion}')" 
                            class="btn primary" style="padding: 10px 16px; font-size: 13px; width: auto; background: #3b82f6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        📋 Copiar
                    </button>
                    <button onclick="regenerarCodigoAction()" 
                            class="btn primary" style="padding: 10px 16px; font-size: 13px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;" 
                            title="Regenerar código (invalida el anterior)">
                        🔄 Regenerar
                    </button>
                </div>
            </div>
            
            <div style="margin-bottom: 12px;">
                <button onclick="showCreateUserModal()" 
                        class="btn primary" 
                        style="width: 100%; padding: 12px; font-size: 14px; background: #10b981; color: #fff; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    ➕ Crear nuevo usuario directamente
                </button>
                <p style="font-size: 11px; color: var(--text-light); text-align: center; margin-top: 6px;">
                    💡 Alternativa: comparte el código de invitación para que se registren ellos mismos
                </p>
            </div>
            
            <div style="margin-bottom: 12px;">
                <div style="font-size: 13px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">
                    📋 Lista de usuarios (${usuarios.length})
                </div>
                <div style="max-height: 400px; overflow-y: auto; padding-right: 4px;">
                    ${usuariosHtml}
                </div>
            </div>
            
            <div style="display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid var(--border-color); justify-content: flex-end;">
                <button onclick="closeUsersModal()" class="btn secondary" style="padding: 10px 20px; font-size: 14px; width: auto;">Cerrar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    window.closeUsersModal = function() {
        const m = document.getElementById('users-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => { if (m.parentNode) m.remove(); }, 200);
            setTimeout(() => {
                const still = document.getElementById('users-modal');
                if (still && still.parentNode) still.remove();
            }, 500);
        }
    };
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeUsersModal();
    });
}

// ============================================================
// MODAL DE CREAR USUARIO
// ============================================================

async function showCreateUserModal() {
    const existingModal = document.getElementById('create-user-modal');
    if (existingModal) existingModal.remove();
    
    const user = window.AuthModule.getCurrentUser();
    if (!user || user.is_admin !== 1) {
        window.showToast('⚠️ Solo el administrador puede crear usuarios', 'warning');
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'create-user-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999999; padding: 15px;
        animation: modalFadeIn 0.25s ease;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 480px; width: 100%; max-height: 95vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">➕</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #10b981;">Crear Nuevo Usuario</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">El usuario se agregará a tu negocio</p>
                    </div>
                </div>
                <button onclick="closeCreateUserModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="background: #fef9e7; border: 1px solid #f59e0b; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; font-size: 12px; color: #92400e;">
                💡 <strong>Contraseña temporal:</strong> Comparte la contraseña que asignes con el usuario. Podrá cambiarla luego desde su perfil.
            </div>
            
            <form id="create-user-form" style="display: flex; flex-direction: column; gap: 12px;">
                <div class="form-group">
                    <label>👤 Nombre de usuario (para login)</label>
                    <input type="text" id="create-user-username" placeholder="Ej: juan_perez" required
                           style="text-transform: lowercase;"
                           oninput="this.value = this.value.toLowerCase().replace(/[^a-z0-9_]/g, '')">
                    <small style="font-size: 11px; color: var(--text-light);">Solo letras minúsculas, números y guión bajo</small>
                </div>
                <div class="form-group">
                    <label>🔒 Contraseña temporal</label>
                    <input type="text" id="create-user-password" placeholder="Mínimo 4 caracteres" required minlength="4">
                    <small style="font-size: 11px; color: var(--text-light);">El usuario podrá cambiarla después</small>
                </div>
                <div class="form-group">
                    <label>📛 Nombre completo</label>
                    <input type="text" id="create-user-name" placeholder="Ej: Juan Pérez García" required>
                </div>
                <div class="form-group">
                    <label>📧 Email (opcional)</label>
                    <input type="email" id="create-user-email" placeholder="Ej: juan@email.com">
                </div>
                <div class="form-group">
                    <label>📞 Teléfono (opcional)</label>
                    <input type="tel" id="create-user-phone" placeholder="Ej: +53 5555 5555">
                </div>
                <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border-color);">
                    <span style="font-size: 20px;">👑</span>
                    <div style="flex: 1;">
                        <div style="font-size: 14px; font-weight: 600;">Rol de administrador</div>
                        <div style="font-size: 11px; color: var(--text-light); margin-top: 2px;">Los admins pueden gestionar usuarios y hacer copias completas</div>
                    </div>
                    <input type="checkbox" id="create-user-isadmin" style="width: 20px; height: 20px; cursor: pointer; accent-color: #f59e0b;">
                </div>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" style="flex: 1; background: #10b981; color: #fff; border: none; border-radius: 8px; padding: 12px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        ✅ Crear usuario
                    </button>
                    <button type="button" onclick="closeCreateUserModal()" class="btn secondary" style="flex: 1;">❌ Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => { document.getElementById('create-user-username')?.focus(); }, 100);
    
    const form = document.getElementById('create-user-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('create-user-username').value.trim();
        const password = document.getElementById('create-user-password').value.trim();
        const name = document.getElementById('create-user-name').value.trim();
        const email = document.getElementById('create-user-email').value.trim();
        const phone = document.getElementById('create-user-phone').value.trim();
        const isAdmin = document.getElementById('create-user-isadmin').checked;
        
        if (!username || !password || !name) {
            window.showToast('⚠️ Usuario, contraseña y nombre son obligatorios', 'error');
            return;
        }
        if (password.length < 4) {
            window.showToast('⚠️ La contraseña debe tener al menos 4 caracteres', 'error');
            return;
        }
        
        try {
            const result = await window.AuthModule.createUserAsAdmin({ username, password, name, email, phone, isAdmin });
            if (result.success) {
                window.showToast(`✅ Usuario "${username}" creado correctamente`, 'success', 4000);
                closeCreateUserModal();
                setTimeout(() => showUsersModal(), 500);
            } else {
                window.showToast('❌ ' + result.error, 'error', 5000);
            }
        } catch (error) {
            window.showToast('❌ Error: ' + error.message, 'error', 5000);
        }
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeCreateUserModal();
    });
    
    window.closeCreateUserModal = function() {
        const m = document.getElementById('create-user-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => { if (m.parentNode) m.remove(); }, 200);
            setTimeout(() => {
                const still = document.getElementById('create-user-modal');
                if (still && still.parentNode) still.remove();
            }, 500);
        }
    };
}

// ============================================================
// MODAL DE EDITAR USUARIO
// ============================================================

async function showEditUserModal(userId) {
    const existingModal = document.getElementById('edit-user-modal');
    if (existingModal) existingModal.remove();
    
    const currentUser = window.AuthModule.getCurrentUser();
    if (!currentUser || currentUser.is_admin !== 1) {
        window.showToast('⚠️ Solo el administrador puede editar usuarios', 'warning');
        return;
    }
    
    const targetUser = window.DBModule.query(
        'SELECT id, username, name, email, phone, is_admin FROM users WHERE id = ? AND deleted_at IS NULL',
        [userId]
    );
    
    if (targetUser.length === 0) {
        window.showToast('⚠️ Usuario no encontrado', 'warning');
        return;
    }
    
    const u = targetUser[0];
    
    const modal = document.createElement('div');
    modal.id = 'edit-user-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999999; padding: 15px;
        animation: modalFadeIn 0.25s ease;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 480px; width: 100%; max-height: 95vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">✏️</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #3b82f6;">Editar Usuario</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">@${u.username}</p>
                    </div>
                </div>
                <button onclick="closeEditUserModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <form id="edit-user-form" style="display: flex; flex-direction: column; gap: 12px;">
                <div class="form-group">
                    <label>📛 Nombre completo</label>
                    <input type="text" id="edit-user-name" value="${u.name || ''}" placeholder="Ej: Juan Pérez García" required>
                </div>
                <div class="form-group">
                    <label>📧 Email (opcional)</label>
                    <input type="email" id="edit-user-email" value="${u.email || ''}" placeholder="Ej: juan@email.com">
                </div>
                <div class="form-group">
                    <label>📞 Teléfono (opcional)</label>
                    <input type="tel" id="edit-user-phone" value="${u.phone || ''}" placeholder="Ej: +53 5555 5555">
                </div>
                <div style="background: var(--bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 12px; font-size: 12px; color: var(--text-light);">
                    ℹ️ El <strong>nombre de usuario (@${u.username})</strong> no se puede cambiar. Es el identificador de login.
                </div>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" style="flex: 1; background: #3b82f6; color: #fff; border: none; border-radius: 8px; padding: 12px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        💾 Guardar cambios
                    </button>
                    <button type="button" onclick="closeEditUserModal()" class="btn secondary" style="flex: 1;">❌ Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const form = document.getElementById('edit-user-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('edit-user-name').value.trim();
        const email = document.getElementById('edit-user-email').value.trim();
        const phone = document.getElementById('edit-user-phone').value.trim();
        
        if (!name) {
            window.showToast('⚠️ El nombre es obligatorio', 'error');
            return;
        }
        
        try {
            const result = await window.AuthModule.updateUserDataByAdmin(userId, { name, email, phone });
            if (result.success) {
                window.showToast(`✅ Usuario actualizado correctamente`, 'success', 3000);
                closeEditUserModal();
                setTimeout(() => showUsersModal(), 500);
            } else {
                window.showToast('❌ ' + result.error, 'error', 5000);
            }
        } catch (error) {
            window.showToast('❌ Error: ' + error.message, 'error', 5000);
        }
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeEditUserModal();
    });
    
    window.closeEditUserModal = function() {
        const m = document.getElementById('edit-user-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => { if (m.parentNode) m.remove(); }, 200);
            setTimeout(() => {
                const still = document.getElementById('edit-user-modal');
                if (still && still.parentNode) still.remove();
            }, 500);
        }
    };
}

// ============================================================
// MODAL DE CAMBIAR CONTRASEÑA
// ============================================================

async function showChangePasswordModal(userId, username) {
    const existingModal = document.getElementById('change-password-modal');
    if (existingModal) existingModal.remove();
    
    const currentUser = window.AuthModule.getCurrentUser();
    if (!currentUser) return;
    
    const isOwnUser = currentUser.id === userId;
    const isAdmin = currentUser.is_admin === 1;
    
    if (!isOwnUser && !isAdmin) {
        window.showToast('⚠️ No tienes permiso para cambiar esta contraseña', 'warning');
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'change-password-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999999; padding: 15px;
        animation: modalFadeIn 0.25s ease;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 440px; width: 100%; max-height: 95vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">🔑</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #f59e0b;">Cambiar Contraseña</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">@${username}</p>
                    </div>
                </div>
                <button onclick="closeChangePasswordModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="background: #fef9e7; border: 1px solid #f59e0b; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; font-size: 12px; color: #92400e;">
                💡 <strong>Contraseña temporal:</strong> Comparte la nueva contraseña con el usuario por un canal seguro.
            </div>
            
            <form id="change-password-form" style="display: flex; flex-direction: column; gap: 12px;">
                <div class="form-group">
                    <label>🔒 Nueva contraseña</label>
                    <input type="text" id="change-pass-new" placeholder="Mínimo 4 caracteres" required minlength="4">
                </div>
                <div class="form-group">
                    <label>🔒 Confirmar contraseña</label>
                    <input type="text" id="change-pass-confirm" placeholder="Repite la contraseña" required minlength="4">
                </div>
                <div id="change-pass-error" style="display: none; background: #ef444420; color: #ef4444; padding: 8px 12px; border-radius: 6px; font-size: 13px;"></div>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" style="flex: 1; background: #f59e0b; color: #fff; border: none; border-radius: 8px; padding: 12px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        🔑 Cambiar contraseña
                    </button>
                    <button type="button" onclick="closeChangePasswordModal()" class="btn secondary" style="flex: 1;">❌ Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => { document.getElementById('change-pass-new')?.focus(); }, 100);
    
    const form = document.getElementById('change-password-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newPass = document.getElementById('change-pass-new').value.trim();
        const confirmPass = document.getElementById('change-pass-confirm').value.trim();
        const errorEl = document.getElementById('change-pass-error');
        
        errorEl.style.display = 'none';
        errorEl.textContent = '';
        
        if (newPass.length < 4) {
            errorEl.textContent = '⚠️ La contraseña debe tener al menos 4 caracteres';
            errorEl.style.display = 'block';
            return;
        }
        if (newPass !== confirmPass) {
            errorEl.textContent = '⚠️ Las contraseñas no coinciden';
            errorEl.style.display = 'block';
            return;
        }
        
        try {
            const result = await window.AuthModule.updateUserPassword(userId, newPass);
            if (result.success) {
                window.showToast(`✅ Contraseña actualizada para @${username}`, 'success', 4000);
                closeChangePasswordModal();
            } else {
                errorEl.textContent = '❌ ' + result.error;
                errorEl.style.display = 'block';
            }
        } catch (error) {
            errorEl.textContent = '❌ Error: ' + error.message;
            errorEl.style.display = 'block';
        }
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeChangePasswordModal();
    });
    
    window.closeChangePasswordModal = function() {
        const m = document.getElementById('change-password-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => { if (m.parentNode) m.remove(); }, 200);
            setTimeout(() => {
                const still = document.getElementById('change-password-modal');
                if (still && still.parentNode) still.remove();
            }, 500);
        }
    };
}

// ============================================================
// TOGGLE ADMIN
// ============================================================

async function handleToggleAdmin(userId, promoteToAdmin, username) {
    const existingConfirm = document.getElementById('custom-modal');
    if (existingConfirm) existingConfirm.remove();
    
    const action = promoteToAdmin ? 'promover a ADMIN' : 'quitar rol de ADMIN';
    const icon = promoteToAdmin ? '👑' : '👤';
    
    const confirm = await window.ModalModule.showConfirm({
        title: promoteToAdmin ? '👑 Promover a admin' : '👤 Quitar admin',
        message: `¿Seguro que quieres ${action} al usuario "@${username}"?\n\n${
            promoteToAdmin 
                ? '✅ Podrá gestionar usuarios y hacer copias completas.'
                : '⚠️ Perderá acceso a la gestión de usuarios y a copias completas.'
        }\n\n¿Continuar?`,
        confirmText: promoteToAdmin ? '👑 Sí, promover' : '👤 Sí, quitar admin',
        cancelText: '❌ Cancelar', icon: icon,
        confirmColor: promoteToAdmin ? '#f59e0b' : '#94a3b8'
    });
    
    if (!confirm) return;
    
    try {
        const result = await window.AuthModule.toggleUserAdmin(userId, promoteToAdmin);
        if (result.success) {
            window.showToast(promoteToAdmin 
                ? `✅ @${username} es ahora ADMIN` 
                : `✅ @${username} ya no es admin`, 'success', 4000);
            setTimeout(() => showUsersModal(), 500);
        } else {
            window.showToast('❌ ' + result.error, 'error', 5000);
            setTimeout(() => showUsersModal(), 500);
        }
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error', 5000);
        setTimeout(() => showUsersModal(), 500);
    }
}

// ============================================================
// ELIMINAR USUARIO
// ============================================================

async function deleteUser(userId, username) {
    const currentUser = window.AuthModule.getCurrentUser();
    if (userId === currentUser.id) {
        window.showToast('⚠️ No puedes eliminar tu propio usuario', 'warning');
        return;
    }
    
    closeUsersModal();
    await new Promise(r => setTimeout(r, 250));
    
    const confirm = await window.ModalModule.showConfirm({
        title: '🗑️ Eliminar usuario',
        message: `¿Eliminar al usuario "@${username}"?\n\n⚠️ El usuario perderá acceso a Panario inmediatamente.\n\n✅ Los datos que creó (ventas, pedidos, etc.) se mantienen.\n\n¿Continuar?`,
        confirmText: '🗑️ Sí, eliminar', cancelText: '❌ Cancelar',
        icon: '🗑️', confirmColor: '#ef4444'
    });
    
    if (!confirm) {
        setTimeout(() => showUsersModal(), 300);
        return;
    }
    
    try {
        const result = await window.AuthModule.deleteUserByAdmin(userId);
        if (result.success) {
            window.showToast(`✅ Usuario "@${username}" eliminado`, 'success', 3000);
            setTimeout(() => showUsersModal(), 800);
        } else {
            window.showToast('❌ ' + result.error, 'error', 5000);
            setTimeout(() => showUsersModal(), 500);
        }
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error', 5000);
        setTimeout(() => showUsersModal(), 500);
    }
}

// ============================================================
// REGENERAR CÓDIGO
// ============================================================

async function regenerarCodigoAction() {
    closeUsersModal();
    await new Promise(r => setTimeout(r, 250));
    
    const confirm = await window.ModalModule.showConfirm({
        title: '🔄 Regenerar código',
        message: `¿Regenerar el código de invitación?\n\n⚠️ El código actual dejará de funcionar inmediatamente.\nLos usuarios ya registrados NO se ven afectados.\n\n¿Continuar?`,
        confirmText: '🔄 Sí, regenerar', cancelText: '❌ Cancelar',
        icon: '🔄', confirmColor: '#f59e0b'
    });
    
    if (!confirm) {
        setTimeout(() => showUsersModal(), 300);
        return;
    }
    
    const negocioId = window.DBModule.getNegocioIdActual();
    const result = window.DBModule.regenerarCodigoInvitacion(negocioId);
    
    if (result.success) {
        window.showToast(`✅ Nuevo código: ${result.codigo}`, 'success', 5000);
        setTimeout(() => showUsersModal(), 500);
    } else {
        window.showToast('❌ Error al regenerar: ' + (result.error || 'Desconocido'), 'error', 5000);
        setTimeout(() => showUsersModal(), 500);
    }
}

// ============================================================
// SALVA DIFERENCIAL
// ============================================================

async function exportSalvaRecetasProductos() {
    if (typeof window.DBModule.exportRecetasProductosSalva !== 'function') {
        window.showToast('❌ Error: función de exportación no disponible. Recarga la página.', 'error', 6000);
        return;
    }
    
    let progress = null;
    try {
        progress = window.ModalModule.showProgressModal({
            title: 'Exportando salva', message: 'Preparando recetas y productos...', icon: '🧩'
        });
        
        progress.update('Recopilando datos...', 30);
        await new Promise(r => setTimeout(r, 300));
        progress.update('Empaquetando JSON...', 70);
        await new Promise(r => setTimeout(r, 300));
        
        const result = window.DBModule.exportRecetasProductosSalva();
        
        if (result && result.success) {
            const counts = result.counts || { recipes: 0, productos: 0 };
            progress.success(`Salva exportada: ${counts.recipes} recetas, ${counts.productos} productos`);
            window.showToast(`✅ Salva exportada (${result.sizeKB || 0} KB)`, 'success', 3000);
        } else {
            const errorMsg = (result && result.error) ? result.error : 'Error desconocido';
            progress.error(errorMsg);
            window.showToast('❌ Error al exportar salva: ' + errorMsg, 'error', 5000);
        }
    } catch (error) {
        if (progress) { try { progress.error(error.message); } catch (e) {} }
        window.showToast('❌ Error: ' + (error.message || 'Error desconocido'), 'error', 5000);
    } finally {
        setTimeout(() => {
            const stillThere = document.getElementById('progress-modal');
            if (stillThere) { try { window.ModalModule.closeProgressModal(); } catch (e) {} }
        }, 4000);
    }
}

async function importSalvaRecetasProductos() {
    if (typeof window.DBModule.importRecetasProductosSalva !== 'function') {
        window.showToast('❌ Error: función de importación no disponible. Recarga la página.', 'error', 6000);
        return;
    }
    if (typeof window.DBModule.readSalvaFile !== 'function') {
        window.showToast('❌ Error: función de lectura no disponible. Recarga la página.', 'error', 6000);
        return;
    }
    
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        
        input.onchange = async function(e) {
            const file = e.target.files[0];
            if (!file) { window.showToast('⚠️ No se seleccionó archivo', 'warning'); return; }
            
            try {
                const salvaData = await window.DBModule.readSalvaFile(file);
                
                if (!salvaData._meta || salvaData._meta.type !== 'salva_recetas_productos') {
                    await window.ModalModule.showAlert({
                        title: '❌ Archivo inválido',
                        message: 'El archivo no es una salva válida de recetas y productos.',
                        icon: '❌', type: 'error'
                    });
                    return;
                }
                
                const meta = salvaData._meta;
                const counts = meta.counts || {};
                const resumen = `
📅 Fecha: ${new Date(meta.exportDate).toLocaleString('es-ES')}
📖 Recetas: ${counts.recipes || 0}
🧾 Ingredientes: ${counts.recipeIngredients || 0}
🔗 Receta-Insumos: ${counts.recetaInsumos || 0}
🏷️ Productos: ${counts.productos || 0}
                `.trim();
                
                const modo = await window.ModalModule.showPrompt({
                    title: '📥 Importar salva',
                    message: `${resumen}\n\nElige el modo:\n• Escribe "fusionar" para añadir/actualizar\n• Escribe "reemplazar" para reemplazar todo`,
                    placeholder: 'fusionar o reemplazar',
                    defaultValue: 'fusionar', icon: '📥', inputType: 'text'
                });
                
                if (modo === null || modo === undefined) {
                    window.showToast('❌ Importación cancelada', 'info', 2000);
                    return;
                }
                
                const modoLimpio = String(modo).trim().toLowerCase();
                if (modoLimpio !== 'fusionar' && modoLimpio !== 'reemplazar') {
                    await window.ModalModule.showAlert({
                        title: '⚠️ Modo inválido',
                        message: 'Debes escribir "fusionar" o "reemplazar".',
                        icon: '⚠️', type: 'warning'
                    });
                    return;
                }
                
                const confirmMsg = modoLimpio === 'reemplazar'
                    ? `⚠️ ¿REEMPLAZAR todas las recetas y productos actuales?`
                    : `¿FUSIONAR las recetas y productos del archivo con los actuales?`;
                
                const confirm = await window.ModalModule.showConfirm({
                    title: modoLimpio === 'reemplazar' ? '⚠️ Reemplazar datos' : '📥 Fusionar datos',
                    message: confirmMsg,
                    confirmText: modoLimpio === 'reemplazar' ? '⚠️ SÍ, REEMPLAZAR' : '✅ SÍ, FUSIONAR',
                    cancelText: '❌ Cancelar', icon: modoLimpio === 'reemplazar' ? '⚠️' : '📥',
                    confirmColor: modoLimpio === 'reemplazar' ? '#ef4444' : '#10b981'
                });
                
                if (!confirm) { window.showToast('❌ Importación cancelada', 'info', 2000); return; }
                
                let progress = null;
                try {
                    progress = window.ModalModule.showProgressModal({
                        title: 'Importando salva', message: 'Iniciando importación...', icon: '⏳'
                    });
                    
                    await new Promise(r => setTimeout(r, 200));
                    progress.update('Validando archivo...', 10);
                    await new Promise(r => setTimeout(r, 200));
                    progress.update('Importando recetas...', 30);
                    await new Promise(r => setTimeout(r, 200));
                    progress.update('Importando ingredientes...', 50);
                    await new Promise(r => setTimeout(r, 200));
                    progress.update('Importando productos...', 70);
                    await new Promise(r => setTimeout(r, 200));
                    
                    const result = window.DBModule.importRecetasProductosSalva(salvaData, modoLimpio);
                    
                    progress.update('Finalizando...', 95);
                    await new Promise(r => setTimeout(r, 300));
                    
                    if (result && result.success) {
                        const imported = result.imported || {};
                        const skipped = result.skipped || {};
                        let msg = `${imported.recipes || 0} recetas, ${imported.productos || 0} productos`;
                        if ((skipped.recipes || 0) + (skipped.productos || 0) > 0) {
                            msg += ` (${(skipped.recipes || 0) + (skipped.productos || 0)} actualizados)`;
                        }
                        progress.success(`Importación completada: ${msg}`);
                        window.showToast('✅ Salva importada correctamente', 'success', 3000);
                        
                        setTimeout(() => {
                            if (typeof window.refreshCurrentView === 'function') {
                                window.refreshCurrentView();
                            } else if (typeof window.renderSettingsView === 'function') {
                                window.renderSettingsView();
                            }
                        }, 2000);
                    } else {
                        const errorMsg = (result && result.error) ? result.error : 'Error al importar';
                        progress.error(errorMsg);
                        window.showToast('❌ Error: ' + errorMsg, 'error', 5000);
                    }
                } catch (innerError) {
                    if (progress) { try { progress.error(innerError.message); } catch (e) {} }
                    try {
                        if (window.ModalModule && window.ModalModule.closeProgressModal) {
                            window.ModalModule.closeProgressModal();
                        }
                    } catch (e) {}
                    await window.ModalModule.showAlert({
                        title: '❌ Error al importar',
                        message: innerError.message || 'Error desconocido',
                        icon: '❌', type: 'error'
                    });
                } finally {
                    setTimeout(() => {
                        const stillThere = document.getElementById('progress-modal');
                        if (stillThere) { try { window.ModalModule.closeProgressModal(); } catch (e) {} }
                    }, 5000);
                }
            } catch (error) {
                try {
                    if (window.ModalModule && window.ModalModule.closeProgressModal) {
                        window.ModalModule.closeProgressModal();
                    }
                } catch (e) {}
                await window.ModalModule.showAlert({
                    title: '❌ Error al importar',
                    message: error.message || 'Error desconocido',
                    icon: '❌', type: 'error'
                });
            }
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// ACCIONES DE BACKUP
// ============================================================

async function exportDatabaseCompleteAction() {
    let progress = null;
    try {
        progress = window.ModalModule.showProgressModal({
            title: 'Exportando copia completa', message: 'Preparando copia de seguridad completa...', icon: '📦'
        });
        progress.update('Recopilando datos...', 30);
        await new Promise(r => setTimeout(r, 300));
        progress.update('Incluyendo usuarios y negocios...', 60);
        await new Promise(r => setTimeout(r, 300));
        progress.update('Generando archivo .db...', 90);
        await new Promise(r => setTimeout(r, 300));
        
        const result = window.DBModule.downloadDatabase('complete');
        
        if (result && result.success) {
            progress.success('Copia completa exportada correctamente');
            window.showToast('✅ Copia completa exportada', 'success', 3000);
        } else {
            const errorMsg = (result && result.error) ? result.error : 'No se pudo exportar';
            progress.error(errorMsg);
        }
    } catch (error) {
        if (progress) { try { progress.error(error.message); } catch (e) {} }
    } finally {
        setTimeout(() => {
            const stillThere = document.getElementById('progress-modal');
            if (stillThere) { try { window.ModalModule.closeProgressModal(); } catch (e) {} }
        }, 5000);
    }
}

async function exportDatabaseDataOnlyAction() {
    let progress = null;
    try {
        progress = window.ModalModule.showProgressModal({
            title: 'Exportando copia de datos', message: 'Preparando copia de datos operativos...', icon: '📊'
        });
        progress.update('Recopilando datos operativos...', 30);
        await new Promise(r => setTimeout(r, 300));
        progress.update('Excluyendo usuarios y negocios...', 60);
        await new Promise(r => setTimeout(r, 300));
        progress.update('Generando archivo .db...', 90);
        await new Promise(r => setTimeout(r, 300));
        
        const result = window.DBModule.downloadDatabase('data_only');
        
        if (result && result.success) {
            progress.success('Copia de datos exportada correctamente');
            window.showToast('✅ Copia de datos exportada', 'success', 3000);
        } else {
            const errorMsg = (result && result.error) ? result.error : 'No se pudo exportar';
            progress.error(errorMsg);
        }
    } catch (error) {
        if (progress) { try { progress.error(error.message); } catch (e) {} }
    } finally {
        setTimeout(() => {
            const stillThere = document.getElementById('progress-modal');
            if (stillThere) { try { window.ModalModule.closeProgressModal(); } catch (e) {} }
        }, 5000);
    }
}

async function importDatabaseSmartAction() {
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.db,.sqlite,.sqlite3';
        input.style.display = 'none';
        
        input.onchange = async function(e) {
            const file = e.target.files[0];
            if (!file) { window.showToast('⚠️ No se seleccionó archivo', 'warning'); return; }
            
            let backupType = 'unknown';
            let backupMeta = null;
            
            try {
                const arrayBuffer = await file.arrayBuffer();
                const dataArray = new Uint8Array(arrayBuffer);
                const SQL = await window.initSqlJs({ locateFile: file => `lib/${file}` });
                const tempDb = new SQL.Database(dataArray);
                
                const tableCheck = tempDb.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='_panario_meta'`);
                if (tableCheck.length > 0 && tableCheck[0].values.length > 0) {
                    const result = tempDb.exec(`SELECT * FROM _panario_meta LIMIT 1`);
                    if (result.length > 0 && result[0].values && result[0].values.length > 0) {
                        const columns = result[0].columns;
                        const values = result[0].values[0];
                        const meta = {};
                        columns.forEach((col, i) => { meta[col] = values[i]; });
                        backupMeta = meta;
                        backupType = meta.backup_type || 'unknown';
                    }
                }
                tempDb.close();
            } catch (error) {
                window.showToast('❌ Error al leer el archivo', 'error');
                return;
            }
            
            const user = window.AuthModule.getCurrentUser();
            const isAdmin = user && user.is_admin === 1;
            
            let infoMsg = `📄 Archivo: ${file.name}\n\n`;
            infoMsg += `🔖 Tipo detectado: ${
                backupType === 'complete' ? '📦 Copia COMPLETA' :
                backupType === 'data_only' ? '📊 Copia de DATOS' :
                '⚠️ Sin marca (antiguo)'
            }\n`;
            
            if (backupMeta) {
                infoMsg += `📅 Fecha: ${new Date(backupMeta.backup_date).toLocaleString('es-ES')}\n`;
                infoMsg += `🏢 Negocio: ${backupMeta.backup_negocio_nombre || 'Desconocido'}\n`;
                infoMsg += `👤 Creado por: ${backupMeta.backup_user || 'Desconocido'}\n`;
            }
            
            infoMsg += `\n`;
            
            let action = '';
            let confirmText = '';
            
            if (backupType === 'complete') {
                if (isAdmin) {
                    action = 'complete';
                    infoMsg += `⚠️ Esto reemplazará TODA la base de datos, incluyendo usuarios y negocios.\n\n¿Continuar?`;
                    confirmText = '⚠️ Sí, importar completa';
                } else {
                    infoMsg += `❌ Esta es una copia COMPLETA. Solo el administrador puede importarla.`;
                    confirmText = '📊 Importar como datos';
                    action = 'data_only';
                }
            } else if (backupType === 'data_only') {
                action = 'data_only';
                infoMsg += `✅ Esta copia conserva los usuarios y el código de invitación actuales.\n\n¿Continuar?`;
                confirmText = '📊 Sí, importar datos';
            } else {
                if (isAdmin) {
                    action = 'complete';
                    infoMsg += `⚠️ Copia sin marca. Se tratará como COMPLETA.\n\n¿Continuar?`;
                    confirmText = '⚠️ Sí, importar como completa';
                } else {
                    infoMsg += `❌ Copia sin marca. Solo el administrador puede importarla.`;
                    confirmText = '📊 Intentar como datos';
                    action = 'data_only';
                }
            }
            
            const confirm = await window.ModalModule.showConfirm({
                title: '📥 Importar copia de seguridad',
                message: infoMsg, confirmText, cancelText: '❌ Cancelar',
                icon: backupType === 'complete' ? '📦' : '📊',
                confirmColor: action === 'complete' ? '#ef4444' : '#10b981'
            });
            
            if (!confirm) { window.showToast('❌ Importación cancelada', 'info', 2000); return; }
            
            try {
                let result;
                if (action === 'complete') {
                    result = await window.DBModule.importDatabase(file);
                } else {
                    result = await window.DBModule.importDatabaseDataOnly(file);
                }
                
                if (result && result.success) {
                    if (action === 'complete') {
                        await window.ModalModule.showAlert({
                            title: '✅ Copia completa importada',
                            message: `Se restauraron TODOS los datos.\n\n🔄 La página se recargará.`,
                            icon: '✅', type: 'success'
                        });
                        window.showToast('✅ Copia completa importada. Recargando...', 'success', 3000);
                        setTimeout(() => {
                            const url = window.location.href.split('?')[0];
                            window.location.href = url + '?refresh=' + Date.now();
                            setTimeout(() => window.location.reload(true), 100);
                        }, 500);
                    } else {
                        const registros = result.registrosRestaurados || 0;
                        const tablas = result.tablasRestauradas || 0;
                        await window.ModalModule.showAlert({
                            title: '✅ Datos importados',
                            message: `Se restauraron ${tablas} tablas con ${registros} registros.\n\n✅ Usuarios conservados.\n🔄 La página se recargará.`,
                            icon: '✅', type: 'success'
                        });
                        setTimeout(() => {
                            const url = window.location.href.split('?')[0];
                            window.location.href = url + '?refresh=' + Date.now();
                            setTimeout(() => window.location.reload(true), 100);
                        }, 500);
                    }
                } else {
                    const errorMsg = (result && result.error) ? result.error : 'Error desconocido';
                    window.showToast('❌ Error: ' + errorMsg, 'error', 5000);
                }
            } catch (error) {
                window.showToast('❌ ' + (error.message || 'Error desconocido'), 'error', 5000);
            }
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

async function importDatabaseDataOnlyFromFileAction() {
    try {
        const result = await window.DBModule.importDatabaseDataOnlyFromFile();
        
        if (result && result.success) {
            const registros = result.registrosRestaurados || 0;
            const tablas = result.tablasRestauradas || 0;
            await window.ModalModule.showAlert({
                title: '✅ Importación exitosa',
                message: `Se restauraron ${tablas} tablas con ${registros} registros.\n\n✅ Usuarios conservados.\n🔄 La página se recargará.`,
                icon: '✅', type: 'success'
            });
            window.showToast(`✅ Datos importados: ${tablas} tablas, ${registros} registros`, 'success', 5000);
            setTimeout(() => {
                const url = window.location.href.split('?')[0];
                window.location.href = url + '?refresh=' + Date.now();
                setTimeout(() => window.location.reload(true), 100);
            }, 500);
        } else if (result && result.error && result.error !== 'Cancelado') {
            window.showToast('❌ ' + result.error, 'error', 5000);
        }
    } catch (error) {
        window.showToast('❌ ' + (error.message || 'Error desconocido'), 'error');
    }
}

// ============================================================
// FUSIONAR BASES DE DATOS
// ============================================================

async function importDatabaseFusionAction() {
    console.log('🔀 [importDatabaseFusionAction] Iniciando fusión...');
    
    if (typeof window.DBModule.importDatabaseDataOnlyFromFile !== 'function') {
        window.showToast('❌ Error: función de fusión no disponible. Recarga la página.', 'error', 6000);
        console.error('❌ window.DBModule.importDatabaseDataOnlyFromFile no es una función');
        return;
    }
    
    try {
        const result = await window.DBModule.importDatabaseDataOnlyFromFile();
        
        if (!result) {
            window.showToast('❌ Resultado vacío de la fusión', 'error', 4000);
            return;
        }
        
        if (result.success === false && result.error === 'Cancelado') {
            console.log('🔀 [Fusion] Cancelado por el usuario');
            return;
        }
        
        if (!result.success) {
            window.showToast('❌ ' + (result.error || 'Error desconocido'), 'error', 6000);
            return;
        }
        
        console.log('🔀 [Fusion] Resultado:', result);
        
        const inserted = result.inserted || 0;
        const updated = result.updated || 0;
        const skipped = result.skipped || 0;
        const porTabla = result.porTabla || {};
        
        let tablaDetalle = '';
        const tablasConCambios = Object.entries(porTabla)
            .filter(([_, s]) => (s.inserted + s.updated) > 0)
            .sort((a, b) => (b[1].inserted + b[1].updated) - (a[1].inserted + a[1].updated));
        
        if (tablasConCambios.length > 0) {
            tablaDetalle = '\n\n📊 Detalle por tabla:\n' + tablasConCambios.map(([tabla, s]) => {
                let linea = `  • ${tabla}:`;
                if (s.inserted > 0) linea += ` +${s.inserted} nuevos`;
                if (s.updated > 0) linea += ` ~${s.updated} actualizados`;
                if (s.skipped > 0) linea += ` =${s.skipped} sin cambios`;
                return linea;
            }).join('\n');
        }
        
        let mensaje = `✅ Fusión completada correctamente.\n\n`;
        mensaje += `📥 Registros NUEVOS añadidos: ${inserted}\n`;
        mensaje += `🔄 Registros ACTUALIZADOS: ${updated}\n`;
        mensaje += `⏭️ Registros SIN cambios: ${skipped}\n`;
        mensaje += `📊 Total procesados: ${inserted + updated + skipped}`;
        
        if (tablaDetalle) {
            mensaje += tablaDetalle;
        }
        
        if (result.errores && result.errores.length > 0) {
            mensaje += `\n\n⚠️ Hubo ${result.errores.length} error(es) durante la fusión.`;
            console.warn('⚠️ Errores de fusión:', result.errores);
        }
        
        mensaje += `\n\n💡 Tus datos locales se han enriquecido con los del backup.`;
        
        await window.ModalModule.showAlert({
            title: '🔀 Fusión completada',
            message: mensaje,
            icon: '🔀', type: 'success', buttonText: '✅ Entendido'
        });
        
        window.showToast(`✅ Fusión completada: +${inserted} nuevos, ~${updated} actualizados`, 'success', 5000);
        
        setTimeout(() => {
            if (typeof window.refreshCurrentView === 'function') {
                window.refreshCurrentView();
            } else if (typeof window.renderSettingsView === 'function') {
                window.renderSettingsView();
            }
        }, 1500);
        
    } catch (error) {
        console.error('❌ [Fusion] Error:', error);
        window.showToast('❌ Error en fusión: ' + (error.message || 'Desconocido'), 'error', 6000);
    }
}

// ============================================================
// OLVIDAR ÚLTIMO USUARIO
// ============================================================

async function clearLastUserAction() {
    if (window.ModalModule && window.ModalModule.cerrarTodosLosModales) {
        window.ModalModule.cerrarTodosLosModales();
    }
    
    const confirm = await window.ModalModule.showConfirm({
        title: 'Olvidar usuario',
        message: '¿Seguro que quieres olvidar el último usuario guardado?',
        confirmText: 'Sí, olvidar', cancelText: 'Cancelar',
        icon: '🗑️', confirmColor: '#ef4444'
    });
    
    if (confirm) {
        window.AuthModule.clearLastUser();
        window.showToast('✅ Último usuario olvidado', 'success');
        renderSettingsView();
    }
}

// ============================================================
// LIMPIAR DATOS ELIMINADOS
// ============================================================

async function cleanDeletedData() {
    if (window.ModalModule && window.ModalModule.cerrarTodosLosModales) {
        window.ModalModule.cerrarTodosLosModales();
    }
    
    const confirm = await window.ModalModule.showConfirm({
        title: '🧹 Limpiar datos eliminados',
        message: '¿Eliminar permanentemente todos los registros marcados como eliminados?\n\n⚠️ No se puede deshacer.',
        confirmText: 'Sí, limpiar', cancelText: 'Cancelar',
        icon: '⚠️', confirmColor: '#ef4444'
    });
    
    if (!confirm) return;
    
    let progress = null;
    try {
        progress = window.ModalModule.showProgressModal({
            title: 'Limpiando datos', message: 'Eliminando registros...', icon: '🧹'
        });
        
        const tables = ['sales', 'transactions', 'orders', 'order_items', 'payments', 
            'recipes', 'recipe_ingredients', 'clients', 'products', 'dias_sin_ventas', 'calendario_produccion'];
        let deletedCount = 0;
        const totalTables = tables.length;
        
        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            const percent = Math.round(((i + 1) / totalTables) * 90);
            progress.update(`Limpiando ${table}...`, percent);
            
            const checkResult = window.DBModule.query(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
            if (checkResult.length === 0) continue;
            
            const columns = window.DBModule.query(`PRAGMA table_info(${table})`);
            const hasDeletedAt = columns.some(col => col.name === 'deleted_at');
            if (!hasDeletedAt) continue;
            
            const countResult = window.DBModule.query(`SELECT COUNT(*) as count FROM ${table} WHERE deleted_at IS NOT NULL`);
            const count = countResult[0]?.count || 0;
            
            if (count > 0) {
                window.DBModule.execute(`DELETE FROM ${table} WHERE deleted_at IS NOT NULL`);
                deletedCount += count;
            }
            await new Promise(r => setTimeout(r, 100));
        }
        
        progress.update('Guardando cambios...', 95);
        window.DBModule.saveDatabase();
        await new Promise(r => setTimeout(r, 200));
        
        progress.success(`${deletedCount} registros eliminados permanentemente`);
        window.showToast(`✅ ${deletedCount} registros eliminados`, 'success', 3000);
        setTimeout(() => renderSettingsView(), 2500);
        
    } catch (error) {
        if (progress) { try { progress.error(error.message); } catch (e) {} }
    } finally {
        setTimeout(() => {
            const stillThere = document.getElementById('progress-modal');
            if (stillThere) { try { window.ModalModule.closeProgressModal(); } catch (e) {} }
        }, 5000);
    }
}

// ============================================================
// REINICIAR BASE DE DATOS
// ============================================================

async function resetDatabaseWithPassword() {
    if (window.ModalModule && window.ModalModule.cerrarTodosLosModales) {
        window.ModalModule.cerrarTodosLosModales();
    }
    
    const password = await window.ModalModule.showPrompt({
        title: '🔒 Verificación',
        message: 'Escribe la contraseña de seguridad:',
        placeholder: 'Contraseña', icon: '🔒', inputType: 'password'
    });
    
    if (password === null || password === undefined) {
        window.showToast('❌ Operación cancelada', 'info', 2000);
        return;
    }
    
    if (String(password).trim() !== 'panario') {
        await window.ModalModule.showAlert({
            title: '❌ Contraseña incorrecta',
            message: 'La contraseña es: "panario"',
            icon: '❌', type: 'error'
        });
        return;
    }
    
    const confirm = await window.ModalModule.showConfirm({
        title: '⚠️ ¡ADVERTENCIA!',
        message: 'Se eliminarán TODOS los datos.\n✅ Se conservan usuarios.\n\n¿Seguro?',
        confirmText: '⚠️ SÍ, REINICIAR', cancelText: '❌ Cancelar',
        icon: '🚨', confirmColor: '#dc2626'
    });
    
    if (!confirm) return;
    
    let progress = null;
    try {
        progress = window.ModalModule.showProgressModal({
            title: 'Reiniciando base de datos', message: 'Eliminando todos los datos...', icon: '🚨'
        });
        
        const db = window.DBModule.getDB();
        const users = window.DBModule.query('SELECT * FROM users WHERE deleted_at IS NULL');
        const tables = ['inventory_movements', 'inventory', 'order_items', 'payments', 'orders',
            'recipe_ingredients', 'recipes', 'sales', 'transactions', 'clients', 'products',
            'notifications', 'units', 'corriente_config', 'dias_sin_ventas', 'calendario_produccion'];
        
        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            const percent = Math.round(((i + 1) / tables.length) * 80);
            progress.update(`Eliminando ${table}...`, percent);
            try { db.run(`DELETE FROM ${table}`); } catch (e) {}
            await new Promise(r => setTimeout(r, 80));
        }
        
        progress.update('Guardando cambios...', 90);
        window.DBModule.saveDatabase();
        await new Promise(r => setTimeout(r, 300));
        
        progress.success(`Base de datos reiniciada. ${users.length} usuario(s) conservado(s)`);
        window.showToast('✅ Base de datos reiniciada', 'success', 2000);
        setTimeout(() => window.location.reload(true), 3000);
        
    } catch (error) {
        if (progress) { try { progress.error(error.message); } catch (e) {} }
    } finally {
        setTimeout(() => {
            const stillThere = document.getElementById('progress-modal');
            if (stillThere) { try { window.ModalModule.closeProgressModal(); } catch (e) {} }
        }, 5000);
    }
}

// ============================================================
// ELIMINACIÓN POR ERROR
// ============================================================

async function showDeleteSelectorModal() {
    if (window.ModalModule && window.ModalModule.cerrarTodosLosModales) {
        window.ModalModule.cerrarTodosLosModales();
    }
    
    const existingModal = document.getElementById('delete-selector-modal');
    if (existingModal) existingModal.remove();

    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) {
        window.showToast('❌ No hay negocio activo', 'error');
        return;
    }

    try {
        const orders = window.DBModule.query(`
            SELECT id, client_name, total, status, delivery_date, created_at
            FROM orders WHERE negocio_id = ? AND deleted_at IS NULL
              AND status != 'delivered' AND status != 'cancelled'
            ORDER BY created_at DESC`, [negocioId]);

        const sales = window.DBModule.query(`
            SELECT id, product_name, total, payment_method, sale_date, created_at,
                   buyer, is_debt, paid, is_liberated, session
            FROM sales WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0
            ORDER BY created_at DESC`, [negocioId]);

        const modal = document.createElement('div');
        modal.id = 'delete-selector-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            z-index: 999999998; padding: 10px;
            animation: modalFadeIn 0.25s ease;
        `;

        const statusColors = { 'pending': '#f59e0b', 'confirmed': '#3b82f6', 'production': '#8b5cf6', 'ready': '#10b981' };
        const statusLabels = { 'pending': '⏳ Pendiente', 'confirmed': '✅ Confirmado', 'production': '🔨 Producción', 'ready': '📦 Listo' };
        const paymentIcons = { 'cash': '💵', 'transfer': '🏦', 'debt': '💳', 'other': '🔄' };

        function formatearFechaVenta(dateStr) {
            if (!dateStr) return '—';
            try {
                const date = new Date(dateStr.split('T')[0] + 'T00:00:00');
                const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
                const dia = String(date.getDate()).padStart(2, '0');
                const mes = String(date.getMonth() + 1).padStart(2, '0');
                return `${dia}/${mes} ${dias[date.getDay()]}`;
            } catch (e) { return dateStr; }
        }

        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 16px 18px; max-width: 100%; width: 100%; max-height: 95vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color); overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h2 style="margin: 0; color: #dc2626; font-size: 18px;">🚨 Eliminación por error</h2>
                    <button onclick="closeDeleteSelectorModal()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
                </div>
                
                <p style="font-size: 13px; color: var(--text-light); margin-bottom: 12px;">
                    Selecciona los pedidos y/o ventas para <strong style="color: #dc2626;">ELIMINAR PERMANENTEMENTE</strong>.
                    <br><span style="color: #dc2626;">⚠️ Esta acción NO se puede deshacer.</span>
                </p>

                <div style="display: flex; gap: 10px; flex-wrap: wrap; background: var(--bg); padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; border: 1px solid var(--border-color); font-size: 13px;">
                    <span>📋 Pedidos: <strong id="selected-orders-count">0</strong></span>
                    <span>💰 Ventas: <strong id="selected-sales-count">0</strong></span>
                    <span style="color: #dc2626;">🗑️ Total: <strong id="selected-total">0</strong></span>
                </div>

                <div style="display: flex; gap: 3px; border-bottom: 2px solid var(--border-color); margin-bottom: 10px;">
                    <button id="tab-delete-orders" onclick="switchDeleteTab('orders')" class="btn primary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0; background: var(--primary); color: #fff; border: none;">
                        📋 Pedidos (${orders.length})
                    </button>
                    <button id="tab-delete-sales" onclick="switchDeleteTab('sales')" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0; background: transparent; color: var(--text); border: none;">
                        💰 Ventas (${sales.length})
                    </button>
                </div>

                <div id="delete-orders-content" style="flex: 1; overflow-y: auto; max-height: 250px; padding-right: 4px;">
                    ${orders.length === 0 ? `<div style="text-align: center; padding: 20px; color: var(--text-light);">
                        <span style="font-size: 28px;">📭</span><p>No hay pedidos pendientes</p>
                    </div>` : `
                        <div style="display: flex; flex-direction: column; gap: 3px;">
                            ${orders.map(order => `
                                <div style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: var(--bg); border-radius: 4px; border-left: 3px solid ${statusColors[order.status] || '#94a3b8'}; font-size: 12px;">
                                    <input type="checkbox" class="delete-order-checkbox" data-id="${order.id}" style="width: 16px; height: 16px; cursor: pointer; accent-color: #dc2626;">
                                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                        <strong>#${order.id}</strong> ${order.client_name}
                                    </span>
                                    <span style="font-weight: 600;">$${parseFloat(order.total).toFixed(2)}</span>
                                    <span style="font-size: 10px; color: ${statusColors[order.status] || '#94a3b8'};">${statusLabels[order.status] || order.status}</span>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

                <div id="delete-sales-content" style="flex: 1; overflow-y: auto; max-height: 300px; padding-right: 4px; display: none;">
                    ${sales.length === 0 ? `<div style="text-align: center; padding: 20px; color: var(--text-light);">
                        <span style="font-size: 28px;">📭</span><p>No hay ventas para eliminar</p>
                    </div>` : `
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            ${sales.map(sale => {
                                const isDebt = sale.is_debt === 1 && sale.paid === 0;
                                const isLiberated = sale.is_liberated === 1;
                                const borderColor = isDebt ? '#ef4444' : (isLiberated ? '#8b5cf6' : '#10b981');
                                
                                let estadoBadge = '';
                                if (isDebt) estadoBadge = '<span style="font-size: 10px; background: #ef444420; color: #ef4444; padding: 1px 6px; border-radius: 8px; font-weight: 600;">💳 Deuda</span>';
                                else if (isLiberated) estadoBadge = '<span style="font-size: 10px; background: #8b5cf620; color: #8b5cf6; padding: 1px 6px; border-radius: 8px; font-weight: 600;">🚀 Liberada</span>';
                                else estadoBadge = '<span style="font-size: 10px; background: #10b98120; color: #10b981; padding: 1px 6px; border-radius: 8px; font-weight: 600;">✅ Pagada</span>';
                                
                                const cliente = sale.buyer && sale.buyer.trim() ? sale.buyer : (isLiberated ? 'Cliente ocasional' : 'Sin nombre');
                                
                                return `
                                    <div style="display: flex; align-items: flex-start; gap: 8px; padding: 6px 8px; background: var(--bg); border-radius: 4px; border-left: 3px solid ${borderColor}; font-size: 12px;">
                                        <input type="checkbox" class="delete-sale-checkbox" data-id="${sale.id}" style="width: 16px; height: 16px; cursor: pointer; accent-color: #dc2626; margin-top: 2px; flex-shrink: 0;">
                                        <div style="flex: 1; min-width: 0;">
                                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 2px;">
                                                <strong style="color: var(--text-light);">#${sale.id}</strong>
                                                <span style="font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;">
                                                    ${sale.product_name}
                                                </span>
                                                ${estadoBadge}
                                            </div>
                                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; color: var(--text-light); font-size: 11px;">
                                                <span>👤 ${cliente}</span>
                                                <span>📅 ${formatearFechaVenta(sale.sale_date)}</span>
                                            </div>
                                        </div>
                                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0;">
                                            <span style="font-weight: 700; color: var(--primary);">$${parseFloat(sale.total).toFixed(2)}</span>
                                            <span style="font-size: 14px;">${paymentIcons[sale.payment_method] || '💵'}</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>

                <div style="display: flex; gap: 6px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border-color); flex-wrap: wrap;">
                    <button onclick="selectAllDeleteItems()" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto;">✅ Todos</button>
                    <button onclick="deselectAllDeleteItems()" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto;">❌ Ninguno</button>
                    <button onclick="confirmDeleteSelected()" class="btn danger" style="padding: 6px 16px; font-size: 13px; width: auto; background: #dc2626; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; margin-left: auto;">
                        🗑️ ELIMINAR
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        window._deleteSelectedOrders = new Set();
        window._deleteSelectedSales = new Set();

        window.closeDeleteSelectorModal = function() {
            const m = document.getElementById('delete-selector-modal');
            if (m) {
                m.style.animation = 'modalFadeOut 0.2s ease forwards';
                setTimeout(() => { if (m.parentNode) m.remove(); }, 200);
                setTimeout(() => {
                    const still = document.getElementById('delete-selector-modal');
                    if (still && still.parentNode) still.remove();
                }, 500);
            }
        };

        window.switchDeleteTab = function(tab) {
            const ordersContent = document.getElementById('delete-orders-content');
            const salesContent = document.getElementById('delete-sales-content');
            const tabOrders = document.getElementById('tab-delete-orders');
            const tabSales = document.getElementById('tab-delete-sales');

            if (tab === 'orders') {
                ordersContent.style.display = 'block';
                salesContent.style.display = 'none';
                tabOrders.className = 'btn primary';
                tabOrders.style.background = 'var(--primary)';
                tabOrders.style.color = '#fff';
                tabSales.className = 'btn secondary';
                tabSales.style.background = 'transparent';
                tabSales.style.color = 'var(--text)';
            } else {
                ordersContent.style.display = 'none';
                salesContent.style.display = 'block';
                tabSales.className = 'btn primary';
                tabSales.style.background = '#10b981';
                tabSales.style.color = '#fff';
                tabOrders.className = 'btn secondary';
                tabOrders.style.background = 'transparent';
                tabOrders.style.color = 'var(--text)';
            }
        };

        document.querySelectorAll('.delete-order-checkbox').forEach(cb => {
            cb.addEventListener('change', function() {
                const id = parseInt(this.dataset.id);
                if (this.checked) window._deleteSelectedOrders.add(id);
                else window._deleteSelectedOrders.delete(id);
                updateDeleteSelectionCount();
            });
        });

        document.querySelectorAll('.delete-sale-checkbox').forEach(cb => {
            cb.addEventListener('change', function() {
                const id = parseInt(this.dataset.id);
                if (this.checked) window._deleteSelectedSales.add(id);
                else window._deleteSelectedSales.delete(id);
                updateDeleteSelectionCount();
            });
        });

        window.updateDeleteSelectionCount = function() {
            const orderCount = window._deleteSelectedOrders.size;
            const saleCount = window._deleteSelectedSales.size;
            document.getElementById('selected-orders-count').textContent = orderCount;
            document.getElementById('selected-sales-count').textContent = saleCount;
            document.getElementById('selected-total').textContent = orderCount + saleCount;
        };

        window.selectAllDeleteItems = function() {
            document.querySelectorAll('.delete-order-checkbox').forEach(cb => {
                cb.checked = true;
                window._deleteSelectedOrders.add(parseInt(cb.dataset.id));
            });
            document.querySelectorAll('.delete-sale-checkbox').forEach(cb => {
                cb.checked = true;
                window._deleteSelectedSales.add(parseInt(cb.dataset.id));
            });
            updateDeleteSelectionCount();
        };

        window.deselectAllDeleteItems = function() {
            document.querySelectorAll('.delete-order-checkbox').forEach(cb => { cb.checked = false; });
            document.querySelectorAll('.delete-sale-checkbox').forEach(cb => { cb.checked = false; });
            window._deleteSelectedOrders.clear();
            window._deleteSelectedSales.clear();
            updateDeleteSelectionCount();
        };

        window.confirmDeleteSelected = async function() {
            const orderIds = Array.from(window._deleteSelectedOrders);
            const saleIds = Array.from(window._deleteSelectedSales);

            if (orderIds.length === 0 && saleIds.length === 0) {
                window.showToast('⚠️ No has seleccionado nada', 'warning');
                return;
            }

            closeDeleteSelectorModal();
            await new Promise(r => setTimeout(r, 250));

            const confirm = await window.ModalModule.showConfirm({
                title: '⚠️ ¿Eliminar permanentemente?',
                message: `Eliminarás:\n\n📋 ${orderIds.length} pedido${orderIds.length !== 1 ? 's' : ''}\n💰 ${saleIds.length} venta${saleIds.length !== 1 ? 's' : ''}\n\n⚠️ NO se puede deshacer.`,
                confirmText: `🗑️ ELIMINAR`, cancelText: '❌ Cancelar',
                icon: '🚨', confirmColor: '#dc2626'
            });

            if (!confirm) {
                setTimeout(() => showDeleteSelectorModal(), 300);
                return;
            }

            try {
                window.showToast('⏳ Eliminando...', 'info', 2000);
                const db = window.DBModule.getDB();
                let deletedOrders = 0;
                let deletedSales = 0;

                for (const orderId of orderIds) {
                    const orderCheck = window.DBModule.query('SELECT id, status FROM orders WHERE id = ? AND deleted_at IS NULL', [orderId]);
                    if (orderCheck.length === 0) continue;
                    const order = orderCheck[0];
                    if (order.status === 'delivered' || order.status === 'cancelled') continue;
                    db.run('DELETE FROM order_items WHERE order_id = ?', [orderId]);
                    db.run('DELETE FROM payments WHERE order_id = ?', [orderId]);
                    db.run('DELETE FROM orders WHERE id = ?', [orderId]);
                    deletedOrders++;
                }

                for (const saleId of saleIds) {
                    const saleCheck = window.DBModule.query('SELECT id FROM sales WHERE id = ? AND deleted_at IS NULL', [saleId]);
                    if (saleCheck.length === 0) continue;
                    db.run('DELETE FROM transactions WHERE sale_id = ?', [saleId]);
                    db.run('DELETE FROM sales WHERE id = ?', [saleId]);
                    deletedSales++;
                }

                window.DBModule.saveDatabase();

                await window.ModalModule.showAlert({
                    title: '✅ Registros eliminados',
                    message: `📋 ${deletedOrders} pedidos\n💰 ${deletedSales} ventas`,
                    icon: '✅', type: 'success'
                });

                renderSettingsView();
            } catch (error) {
                window.showToast('❌ Error: ' + error.message, 'error');
                setTimeout(() => showDeleteSelectorModal(), 300);
            }
        };

        updateDeleteSelectionCount();

        modal.addEventListener('click', function(e) {
            if (e.target === this) closeDeleteSelectorModal();
        });

    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// EXPORTACIÓN
// ============================================================

window.renderSettingsView = renderSettingsView;
window.exportDatabaseAction = exportDatabaseCompleteAction;
window.importDatabaseAction = importDatabaseSmartAction;
window.clearLastUserAction = clearLastUserAction;
window.cleanDeletedData = cleanDeletedData;
window.resetDatabaseWithPassword = resetDatabaseWithPassword;
window.showDeleteSelectorModal = showDeleteSelectorModal;
window.showCorrienteModal = showCorrienteModal;
window.irAHoyCorriente = irAHoyCorriente;
window.showExpensesReportModal = showExpensesReportModal;
window.closeExpensesReportModal = closeExpensesReportModal;
window.generateExpensesReportFromForm = generateExpensesReportFromForm;
window.exportDatabaseCompleteAction = exportDatabaseCompleteAction;
window.exportDatabaseDataOnlyAction = exportDatabaseDataOnlyAction;
window.importDatabaseSmartAction = importDatabaseSmartAction;
window.importDatabaseDataOnlyFromFileAction = importDatabaseDataOnlyFromFileAction;
window.importDatabaseFusionAction = importDatabaseFusionAction;
window.exportSalvaRecetasProductos = exportSalvaRecetasProductos;
window.importSalvaRecetasProductos = importSalvaRecetasProductos;
window.showUsersModal = showUsersModal;
window.regenerarCodigoAction = regenerarCodigoAction;
window.deleteUser = deleteUser;
window.showCreateUserModal = showCreateUserModal;
window.showEditUserModal = showEditUserModal;
window.showChangePasswordModal = showChangePasswordModal;
window.handleToggleAdmin = handleToggleAdmin;
window.showWaitingListFromSettings = showWaitingListFromSettings;
window.reporteListaEsperaFromSettings = reporteListaEsperaFromSettings;
window.showGlobalCancelModal = showGlobalCancelModal;
window.closeGlobalCancelModal = closeGlobalCancelModal;
window.executeGlobalCancel = executeGlobalCancel;
window.showReprogramarPedidosModal = showReprogramarPedidosModal;
window.closeReprogramarModal = closeReprogramarModal;
window.actualizarPreviewReprogramacion = actualizarPreviewReprogramacion;
window.executeReprogramarPedidos = executeReprogramarPedidos;
window.getProduccionConfig = getProduccionConfig;
window.contarPedidosYVentasFecha = contarPedidosYVentasFecha;
window.formatearCantidadProduccion = formatearCantidadProduccion;
window.guardarProduccion = guardarProduccion;
window.eliminarProduccion = eliminarProduccion;
window.MOTIVOS_REPROGRAMACION = MOTIVOS_REPROGRAMACION;
window.getAppVersion = getAppVersion;
// 🆕 ENTREGA 6
window.showProductionDiagnosticModal = showProductionDiagnosticModal;
window.closeProductionDiagnosticModal = closeProductionDiagnosticModal;
window.runProductionDiagnostics = runProductionDiagnostics;
window.renderDiagnosticResults = renderDiagnosticResults;
window.rerunDiagnostics = rerunDiagnostics;
window.copyDiagnosticReport = copyDiagnosticReport;
window.clearCacheAndReload = clearCacheAndReload;

console.log('📦 UI Settings Module cargado correctamente v2.1.9 (ENTREGA 6: diagnóstico de producción)');