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
// 🆕 FASE 7.2 (210926 v8): CANTIDAD DE PRODUCCIÓN CON DECIMALES
// 🆕 ENTREGA 6 (230926 v9): DIAGNÓSTICO DE PRODUCCIÓN
// 🆕 CORRECCIÓN #6 (211026 v10): ÚLTIMO BLOQUE DEL DÍA ANTERIOR
// 🆕 CORRECCIÓN #7 (211026 v11): PRODUCCIÓN POR RANGO DE FECHAS
// 🆕 ENTREGA A - CORRECCIONES 220926 (221026 v12):
//   - ✅ CORRECCIÓN #1: Botones ◀ ▶ de navegación entre días
//   - ✅ CORRECCIÓN #2.A: Input de cantidad acepta CUALQUIER número real
//   - ✅ GUARDADO AUTOMÁTICO al cambiar de día
// 🆕 RESTAURACIÓN COMPLETA (221026 v13):
//   - ✅ renderSettingsView() COMPLETA: restaurar TODAS las secciones
// 🆕 ENTREGA B (221026 v14): ALGORITMO INTELIGENTE DE BLOQUES
//   - ✅ NUEVO dropdown "🏷️ Producto a producir" en modal producción
//   - ✅ NUEVO botón "✨ Calcular bloques automáticamente"
//   - ✅ NUEVA función calcularBloquesIdeales(fechaVenta, cpd, cmpbc)
//   - ✅ NUEVO modal showCalculoBloquesModal() con vista previa
//   - ✅ GUARDA bloques_usados y distribucion_bloques (JSON)
//   - ✅ Muestra el CMPBC del producto seleccionado
//   - ✅ Si el producto no tiene CMPBC → avisa
// 🆕 v2.2.1 (230926 v15): CORRECCIONES FINALES 220926
//   - ✅ getAppVersion() fallback actualizado de '2.1.19' a '2.2.1'
//   - ✅ CORRECCIÓN FINAL #1: El modal de reprogramación ahora limpia
//     la vista previa al abrirse. Antes mostraba las últimas operaciones
//     con pedidos; ahora se inicializa vacío y solo se rellena cuando
//     el usuario introduce fechas válidas.
//   - ✅ renderSettingsView() sigue completo y funcional
// ============================================================

// ============================================================
// HELPER PARA OBTENER LA VERSIÓN DE LA APP
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
    return '2.2.1'; // 🆕 Fallback actualizado a 2.2.1
}

window.getAppVersion = getAppVersion;

// ============================================================
// MOTIVOS PREDEFINIDOS PARA REPROGRAMACIÓN
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
// HELPERS DE HORA
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
// HELPERS DE PRODUCCIÓN
// ============================================================

function getProduccionConfig(fechaISO) {
    try {
        if (!fechaISO) return null;
        if (!window.DBModule || typeof window.DBModule.getProduccionByFecha !== 'function') return null;
        return window.DBModule.getProduccionByFecha(fechaISO);
    } catch (e) {
        console.warn('⚠️ Error leyendo config de producción:', e);
        return null;
    }
}

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
// HELPERS PARA BLOQUE DEL DÍA ANTERIOR
// ============================================================

function esMismaFechaISO(fecha1, fecha2) {
    if (!fecha1 || !fecha2) return false;
    const f1 = String(fecha1).substring(0, 10);
    const f2 = String(fecha2).substring(0, 10);
    return f1 === f2;
}

function esBloqueDelDiaAnterior(prodConfig, fechaVentaISO) {
    if (!prodConfig) return false;
    if (prodConfig.es_bloque_dia_anterior === 1) return true;
    if (prodConfig.fecha_bloque_real && fechaVentaISO) {
        return !esMismaFechaISO(prodConfig.fecha_bloque_real, fechaVentaISO);
    }
    return false;
}

function getBloqueSeleccionadoActual(prodConfig, fechaVentaISO) {
    if (!prodConfig) return null;
    const esDiaAnterior = esBloqueDelDiaAnterior(prodConfig, fechaVentaISO);
    return {
        bloqueIndex: parseInt(prodConfig.bloque_index) || null,
        esDiaAnterior: esDiaAnterior,
        fechaBloqueReal: prodConfig.fecha_bloque_real || (esDiaAnterior ? null : fechaVentaISO),
        cantidad: prodConfig.cantidad_produccion || null,
        notas: prodConfig.notas || null
    };
}

window.esMismaFechaISO = esMismaFechaISO;
window.esBloqueDelDiaAnterior = esBloqueDelDiaAnterior;
window.getBloqueSeleccionadoActual = getBloqueSeleccionadoActual;

// ============================================================
// HELPERS PARA NAVEGACIÓN ENTRE DÍAS (Corrección #1)
// ============================================================

function sumarDiasISO(fechaISO, delta) {
    try {
        const parts = String(fechaISO).split('-').map(Number);
        if (parts.length !== 3) return fechaISO;
        const fecha = new Date(parts[0], parts[1] - 1, parts[2]);
        fecha.setDate(fecha.getDate() + delta);
        const y = fecha.getFullYear();
        const m = String(fecha.getMonth() + 1).padStart(2, '0');
        const d = String(fecha.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    } catch (e) {
        console.warn('⚠️ Error sumando días a', fechaISO, e);
        return fechaISO;
    }
}

function getDiaSemanaCorto(fechaISO) {
    try {
        const parts = String(fechaISO).split('-').map(Number);
        const fecha = new Date(parts[0], parts[1] - 1, parts[2]);
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return dias[fecha.getDay()];
    } catch (e) {
        return '';
    }
}

function getMesCorto(fechaISO) {
    try {
        const parts = String(fechaISO).split('-').map(Number);
        const fecha = new Date(parts[0], parts[1] - 1, parts[2]);
        const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        return meses[fecha.getMonth()];
    } catch (e) {
        return '';
    }
}

function getFechaCortaConDia(fechaISO) {
    try {
        const parts = String(fechaISO).split('-').map(Number);
        const dia = getDiaSemanaCorto(fechaISO);
        const numDia = parts[2];
        const mes = getMesCorto(fechaISO);
        return `${dia}, ${numDia} ${mes}`;
    } catch (e) {
        return fechaISO;
    }
}

function esHoyISO(fechaISO) {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}` === fechaISO;
}

window.sumarDiasISO = sumarDiasISO;
window.getDiaSemanaCorto = getDiaSemanaCorto;
window.getFechaCortaConDia = getFechaCortaConDia;
window.esHoyISO = esHoyISO;

// ============================================================
// 🆕 ENTREGA B: ALGORITMO INTELIGENTE DE BLOQUES
// ============================================================

/**
 * 🆕 ENTREGA B: Calcula los bloques ideales para producir una
 * cantidad `cpd` de un producto con capacidad máxima `cmpbc`,
 * de modo que el pan esté listo ANTES de las 8:00 AM del día
 * de venta (o lo más cerca posible).
 * 
 * Reglas (según correcciones 220926):
 *   - P1: Bloques que cierran entre 8:00 y 9:00 AM son válidos (tolerancia).
 *   - P2: Un bloque pertenece al día en que EMPIEZA.
 *   - P3: El CMPBC es por producto individual.
 *   - P4: Si CPD > CMPBC × bloques disponibles → error.
 *   - P5: El primer bloque lleva más (min(CPD, CMPBC)).
 *   - P6: El usuario puede sobrescribir el cálculo.
 * 
 * @param {string} fechaVenta - Fecha ISO YYYY-MM-DD
 * @param {number} cpd - Cantidad a producir
 * @param {number} cmpbc - Capacidad máxima por bloque
 * @returns {object} - { success, bloques, numBloques, mensaje, capacidadTotal, ... }
 */
function calcularBloquesIdeales(fechaVenta, cpd, cmpbc) {
    const LOG_PREFIX = '🧠 [calcularBloquesIdeales]';
    
    try {
        console.log(`${LOG_PREFIX} ========== INICIO ==========`);
        console.log(`${LOG_PREFIX} Fecha venta: ${fechaVenta}`);
        console.log(`${LOG_PREFIX} CPD: ${cpd}`);
        console.log(`${LOG_PREFIX} CMPBC: ${cmpbc}`);
        
        if (!fechaVenta) {
            return { success: false, error: 'Falta la fecha de venta' };
        }
        if (!cpd || cpd <= 0) {
            return { success: false, error: 'La cantidad a producir debe ser mayor a 0' };
        }
        if (!cmpbc || cmpbc <= 0) {
            return { success: false, error: 'El CMPBC debe ser mayor a 0' };
        }
        
        // ============================================================
        // PASO 1: Recopilar bloques candidatos
        // ============================================================
        const candidatos = [];
        
        // A) Bloques del día V
        const bloquesHoy = window.CorrienteUtils.getBloques(fechaVenta);
        if (bloquesHoy && bloquesHoy.length > 0) {
            for (let i = 0; i < bloquesHoy.length; i++) {
                const b = bloquesHoy[i];
                candidatos.push({
                    fecha: fechaVenta,
                    bloqueIndex: i + 1,
                    horaInicio: b.inicio,
                    horaFin: b.fin,
                    horaInicioStr: b.inicioStr,
                    horaFinStr: b.finStr,
                    horaInicioStr24: b.inicioStr24,
                    horaFinStr24: b.finStr24,
                    duracionHoras: b.duracionHoras,
                    esBloqueAyer: false,
                    fechaBloqueReal: fechaVenta
                });
            }
        }
        
        // B) Último bloque del día anterior
        const bloqueAyer = window.CorrienteUtils.getUltimoBloqueDiaAnterior(fechaVenta);
        if (bloqueAyer) {
            candidatos.push({
                fecha: bloqueAyer.fechaBloqueReal,
                bloqueIndex: bloqueAyer.indexEnDiaAnterior,
                horaInicio: bloqueAyer.inicio,
                horaFin: bloqueAyer.fin,
                horaInicioStr: bloqueAyer.inicioStr,
                horaFinStr: bloqueAyer.finStr,
                horaInicioStr24: bloqueAyer.inicioStr24,
                horaFinStr24: bloqueAyer.finStr24,
                duracionHoras: bloqueAyer.duracionHoras,
                esBloqueAyer: true,
                fechaBloqueReal: bloqueAyer.fechaBloqueReal,
                etiquetaAyer: `🌙 Último bloque del ${bloqueAyer.fechaBloqueReal}`
            });
        }
        
        if (candidatos.length === 0) {
            return {
                success: false,
                error: 'No hay bloques de corriente disponibles para esta fecha',
                candidatos: []
            };
        }
        
        console.log(`${LOG_PREFIX} Candidatos encontrados: ${candidatos.length}`);
        
        // ============================================================
        // PASO 2: Clasificar por "cercanía al amanecer"
        // ============================================================
        const umbralAmanecer = new Date(fechaVenta + 'T09:00:00');
        const umbralIdeal = new Date(fechaVenta + 'T08:00:00');
        
        for (const c of candidatos) {
            const fin = c.horaFin instanceof Date ? c.horaFin : new Date(c.horaFin);
            c._finDate = fin;
            c._esAmanecer = fin <= umbralAmanecer;
            c._esIdeal = fin <= umbralIdeal;
        }
        
        // ============================================================
        // PASO 3: Ordenar candidatos
        // ============================================================
        const amanecerValidos = candidatos.filter(c => c._esAmanecer);
        const restantes = candidatos.filter(c => !c._esAmanecer);
        
        amanecerValidos.sort((a, b) => {
            const aEsAyer = a.esBloqueAyer ? 1 : 0;
            const bEsAyer = b.esBloqueAyer ? 1 : 0;
            if (aEsAyer !== bEsAyer) return bEsAyer - aEsAyer;
            
            const diffA = Math.abs(a._finDate.getTime() - umbralIdeal.getTime());
            const diffB = Math.abs(b._finDate.getTime() - umbralIdeal.getTime());
            return diffA - diffB;
        });
        
        restantes.sort((a, b) => {
            const aIni = a.horaInicio instanceof Date ? a.horaInicio : new Date(a.horaInicio);
            const bIni = b.horaInicio instanceof Date ? b.horaInicio : new Date(b.horaInicio);
            return aIni - bIni;
        });
        
        const candidatosOrdenados = [...amanecerValidos, ...restantes];
        
        // ============================================================
        // PASO 4: Calcular cuántos bloques se necesitan
        // ============================================================
        const numBloquesNecesarios = Math.ceil(cpd / cmpbc);
        const capacidadTotal = candidatosOrdenados.length * cmpbc;
        
        // P4: Si no hay suficientes bloques → error
        if (numBloquesNecesarios > candidatosOrdenados.length) {
            return {
                success: false,
                error: `No es posible producir ${formatearCantidadProduccion(cpd)} unidades con solo ${candidatosOrdenados.length} bloque(s) disponible(s).`,
                detalle: `Máximo posible: ${formatearCantidadProduccion(capacidadTotal)} unidades (CMPBC: ${formatearCantidadProduccion(cmpbc)} × ${candidatosOrdenados.length} bloques)`,
                candidatos: candidatosOrdenados,
                numBloquesNecesarios,
                capacidadTotal,
                cpd,
                cmpbc
            };
        }
        
        // ============================================================
        // PASO 5: Distribuir (el primero lleva más) — P5
        // ============================================================
        const asignacion = [];
        let restante = cpd;
        
        for (let i = 0; i < numBloquesNecesarios; i++) {
            const cantidad = Math.min(restante, cmpbc);
            const candidato = candidatosOrdenados[i];
            
            asignacion.push({
                fecha: candidato.fecha,
                bloqueIndex: candidato.bloqueIndex,
                horaInicio: candidato.horaInicio,
                horaFin: candidato.horaFin,
                horaInicioStr: candidato.horaInicioStr,
                horaFinStr: candidato.horaFinStr,
                horaInicioStr24: candidato.horaInicioStr24,
                horaFinStr24: candidato.horaFinStr24,
                duracionHoras: candidato.duracionHoras,
                cantidad: cantidad,
                esBloqueAyer: candidato.esBloqueAyer,
                fechaBloqueReal: candidato.fechaBloqueReal,
                esAmanecer: candidato._esAmanecer,
                etiqueta: candidato.esBloqueAyer
                    ? `🌙 Ayer ${candidato.horaInicioStr} - ${candidato.horaFinStr}`
                    : `🔨 Hoy ${candidato.horaInicioStr} - ${candidato.horaFinStr}`
            });
            
            restante -= cantidad;
        }
        
        // ============================================================
        // PASO 6: Generar mensaje descriptivo
        // ============================================================
        let mensaje = '';
        
        if (asignacion.length === 1) {
            const unico = asignacion[0];
            if (unico.esBloqueAyer) {
                mensaje = `Se horneará todo (${formatearCantidadProduccion(unico.cantidad)} uds) en el último bloque de ayer: ${unico.horaInicioStr} - ${unico.horaFinStr}.`;
            } else if (unico.esAmanecer) {
                mensaje = `Se horneará todo (${formatearCantidadProduccion(unico.cantidad)} uds) al amanecer: ${unico.horaInicioStr} - ${unico.horaFinStr}.`;
            } else {
                mensaje = `Se horneará todo (${formatearCantidadProduccion(unico.cantidad)} uds) en el bloque ${unico.horaInicioStr} - ${unico.horaFinStr}.`;
            }
        } else {
            const partes = asignacion.map((a, i) => {
                const num = i + 1;
                if (a.esBloqueAyer) {
                    return `${num}º: ${formatearCantidadProduccion(a.cantidad)} uds en el último bloque de ayer (${a.horaInicioStr} - ${a.horaFinStr})`;
                } else if (a.esAmanecer) {
                    return `${num}º: ${formatearCantidadProduccion(a.cantidad)} uds al amanecer (${a.horaInicioStr} - ${a.horaFinStr})`;
                } else {
                    return `${num}º: ${formatearCantidadProduccion(a.cantidad)} uds (${a.horaInicioStr} - ${a.horaFinStr})`;
                }
            });
            mensaje = `Se horneará en ${asignacion.length} bloques → ` + partes.join(' · ');
        }
        
        console.log(`${LOG_PREFIX} ✅ Cálculo exitoso`);
        console.log(`${LOG_PREFIX} ========== FIN ==========`);
        
        return {
            success: true,
            bloques: asignacion,
            numBloques: asignacion.length,
            cantidadPorBloque: asignacion.map(a => a.cantidad),
            mensaje: mensaje,
            capacidadTotal: capacidadTotal,
            cpd: cpd,
            cmpbc: cmpbc,
            usaBloqueAyer: asignacion.some(a => a.esBloqueAyer),
            usaSoloAmanecer: asignacion.every(a => a.esAmanecer)
        };
        
    } catch (e) {
        console.error(`${LOG_PREFIX} ❌ Error:`, e);
        return { success: false, error: e.message };
    }
}

window.calcularBloquesIdeales = calcularBloquesIdeales;

// ============================================================
// DIAGNÓSTICO DE PRODUCCIÓN
// ============================================================

async function runProductionDiagnostics() {
    const results = [];
    
    console.log('🔍 ============================================');
    console.log('🔍 DIAGNÓSTICO DE PRODUCCIÓN - Iniciando...');
    console.log('🔍 ============================================');
    
    try {
        if (typeof window.DBModule === 'undefined') {
            results.push({ name: '1. DBModule disponible', status: 'error', message: 'window.DBModule NO está definido', detail: '' });
        } else if (typeof window.DBModule.getDB !== 'function') {
            results.push({ name: '1. DBModule disponible', status: 'error', message: 'window.DBModule existe pero no tiene getDB()', detail: '' });
        } else {
            let dbOk = false;
            try { const db = window.DBModule.getDB(); dbOk = !!db; } catch (e) {}
            results.push({
                name: '1. DBModule disponible',
                status: dbOk ? 'ok' : 'error',
                message: dbOk ? 'DBModule OK y getDB() devuelve instancia' : 'getDB() falla',
                detail: ''
            });
        }
    } catch (e) {
        results.push({ name: '1. DBModule disponible', status: 'error', message: 'Excepción: ' + e.message, detail: '' });
    }
    
    try {
        if (typeof window.DBModule?.saveProduccion !== 'function') {
            results.push({ name: '2. saveProduccion() existe', status: 'error', message: 'NO es una función', detail: '' });
        } else {
            results.push({ name: '2. saveProduccion() existe', status: 'ok', message: 'Disponible', detail: '' });
        }
    } catch (e) {
        results.push({ name: '2. saveProduccion() existe', status: 'error', message: 'Excepción: ' + e.message, detail: '' });
    }
    
    try {
        if (typeof window.DBModule?.getProduccionByFecha !== 'function') {
            results.push({ name: '3. getProduccionByFecha() existe', status: 'error', message: 'NO es una función', detail: '' });
        } else {
            results.push({ name: '3. getProduccionByFecha() existe', status: 'ok', message: 'Disponible', detail: '' });
        }
    } catch (e) {
        results.push({ name: '3. getProduccionByFecha() existe', status: 'error', message: 'Excepción: ' + e.message, detail: '' });
    }
    
    try {
        if (typeof window.DBModule?.saveProduccionRango !== 'function') {
            results.push({ name: '4. saveProduccionRango() existe', status: 'error', message: 'NO es una función', detail: 'CORRECCIÓN #7 no disponible.' });
        } else {
            results.push({ name: '4. saveProduccionRango() existe', status: 'ok', message: 'Disponible (CORRECCIÓN #7)', detail: '' });
        }
    } catch (e) {
        results.push({ name: '4. saveProduccionRango() existe', status: 'error', message: 'Excepción: ' + e.message, detail: '' });
    }
    
    // 🆕 ENTREGA B: Test de CMPBC
    try {
        if (typeof window.DBModule?.getCMPBCProducto !== 'function') {
            results.push({ name: '5. getCMPBCProducto() existe', status: 'error', message: 'NO es una función', detail: 'ENTREGA B no disponible.' });
        } else {
            results.push({ name: '5. getCMPBCProducto() existe', status: 'ok', message: 'Disponible (ENTREGA B)', detail: '' });
        }
    } catch (e) {
        results.push({ name: '5. getCMPBCProducto() existe', status: 'error', message: 'Excepción: ' + e.message, detail: '' });
    }
    
    try {
        const db = window.DBModule.getDB();
        const pragma = db.exec('PRAGMA table_info(calendario_produccion)');
        
        if (pragma.length === 0 || !pragma[0].values) {
            results.push({ name: '6. Estructura calendario_produccion', status: 'error', message: 'No se pudo leer PRAGMA table_info', detail: '' });
        } else {
            const columnas = pragma[0].values.map(row => row[1]);
            const requeridas = ['id', 'negocio_id', 'fecha', 'hora_inicio', 'hora_fin', 'bloque_index', 'cantidad_produccion', 'notas', 'es_bloque_dia_anterior', 'fecha_bloque_real', 'bloques_usados', 'distribucion_bloques'];
            const faltantes = requeridas.filter(c => !columnas.includes(c));
            
            if (faltantes.length > 0) {
                results.push({ name: '6. Estructura calendario_produccion', status: 'error', message: `Faltan: ${faltantes.join(', ')}`, detail: '' });
            } else {
                results.push({ name: '6. Estructura calendario_produccion', status: 'ok', message: `OK (${columnas.length} columnas)`, detail: 'Incluye bloques_usados + distribucion_bloques' });
            }
        }
    } catch (e) {
        results.push({ name: '6. Estructura calendario_produccion', status: 'error', message: 'Excepción: ' + e.message, detail: '' });
    }
    
    // 🆕 ENTREGA B: Test de columna CMPBC en productos
    try {
        const db = window.DBModule.getDB();
        const pragma = db.exec('PRAGMA table_info(productos)');
        
        if (pragma.length === 0 || !pragma[0].values) {
            results.push({ name: '7. Columna CMPBC en productos', status: 'error', message: 'No se pudo leer', detail: '' });
        } else {
            const columnas = pragma[0].values.map(row => row[1]);
            if (columnas.includes('capacidad_max_bloque')) {
                results.push({ name: '7. Columna CMPBC en productos', status: 'ok', message: 'OK', detail: 'capacidad_max_bloque existe' });
            } else {
                results.push({ name: '7. Columna CMPBC en productos', status: 'error', message: 'Falta capacidad_max_bloque', detail: '' });
            }
        }
    } catch (e) {
        results.push({ name: '7. Columna CMPBC en productos', status: 'error', message: 'Excepción: ' + e.message, detail: '' });
    }
    
    const okCount = results.filter(r => r.status === 'ok').length;
    const warnCount = results.filter(r => r.status === 'warning').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    console.log(`🔍 RESULTADO: ${okCount} OK, ${warnCount} WARN, ${errorCount} ERROR`);
    
    return { results, summary: { ok: okCount, warning: warnCount, error: errorCount, total: results.length } };
}

window.runProductionDiagnostics = runProductionDiagnostics;

// ============================================================
// MODAL DE DIAGNÓSTICO
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
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 640px; width: 100%; max-height: 92vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #8b5cf6;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">🔍</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #8b5cf6;">Diagnóstico de Producción</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">Verifica el estado del sistema</p>
                    </div>
                </div>
                <button onclick="closeProductionDiagnosticModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="background: var(--bg); border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; font-size: 11px;">
                <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                    <span style="color: var(--text-light);">📱 Versión app:</span>
                    <strong>${getAppVersion()}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                    <span style="color: var(--text-light);">📅 Fecha:</span>
                    <strong>${new Date().toLocaleString('es-ES')}</strong>
                </div>
            </div>
            
            <div id="diag-results-container">
                <div style="text-align: center; padding: 30px 20px;">
                    <p style="font-size: 14px; color: var(--text-light);">Ejecutando diagnóstico...</p>
                </div>
            </div>
            
            <div id="diag-buttons" style="display: none; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-color); flex-wrap: wrap;">
                <button onclick="rerunDiagnostics()" class="btn secondary" style="flex: 1; min-width: 100px; padding: 10px 16px; font-size: 13px;">🔄 Re-ejecutar</button>
                <button onclick="closeProductionDiagnosticModal()" class="btn secondary" style="flex: 1; min-width: 100px; padding: 10px 16px; font-size: 13px;">Cerrar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(async () => {
        const result = await runProductionDiagnostics();
        renderDiagnosticResults(result);
    }, 200);
    
    modal.addEventListener('click', (e) => { if (e.target === modal) closeProductionDiagnosticModal(); });
}

function renderDiagnosticResults(result) {
    const container = document.getElementById('diag-results-container');
    const buttons = document.getElementById('diag-buttons');
    if (!container) return;
    
    const { results, summary } = result;
    
    const cfg = {
        ok: { icon: '✅', color: '#10b981', bg: '#10b98115' },
        warning: { icon: '⚠️', color: '#f59e0b', bg: '#f59e0b15' },
        error: { icon: '❌', color: '#ef4444', bg: '#ef444415' }
    };
    
    let summaryColor = '#10b981';
    if (summary.error > 0) summaryColor = '#ef4444';
    else if (summary.warning > 0) summaryColor = '#f59e0b';
    
    container.innerHTML = `
        <div style="background: ${summaryColor}15; border: 2px solid ${summaryColor}; border-radius: 10px; padding: 14px; margin-bottom: 14px; text-align: center;">
            <div style="font-size: 16px; font-weight: 700; color: ${summaryColor};">
                ${summary.ok} OK · ${summary.warning} advertencias · ${summary.error} errores
            </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
            ${results.map(r => {
                const c = cfg[r.status] || cfg.error;
                return `
                    <div style="background: ${c.bg}; border-left: 4px solid ${c.color}; border-radius: 8px; padding: 10px 12px;">
                        <div style="font-size: 13px; font-weight: 600;">${c.icon} ${r.name}</div>
                        <div style="font-size: 12px; color: ${c.color}; margin-top: 2px;">${r.message}</div>
                        ${r.detail ? `<div style="font-size: 11px; color: var(--text-light); margin-top: 4px;">${r.detail}</div>` : ''}
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
    if (container) container.innerHTML = '<div style="text-align: center; padding: 30px 20px;"><p style="color: var(--text-light);">Re-ejecutando...</p></div>';
    if (buttons) buttons.style.display = 'none';
    const result = await runProductionDiagnostics();
    renderDiagnosticResults(result);
}

function closeProductionDiagnosticModal() {
    const modal = document.getElementById('production-diagnostic-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
    }
}

window.showProductionDiagnosticModal = showProductionDiagnosticModal;
window.closeProductionDiagnosticModal = closeProductionDiagnosticModal;
window.renderDiagnosticResults = renderDiagnosticResults;
window.rerunDiagnostics = rerunDiagnostics;

// ============================================================
// MÓDULO DE CORRIENTE — CONFIGURACIÓN
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
        const cal = document.getElementById('corriente-calendario-content');
        if (cal && cal.style.display !== 'none') renderCorrienteCalendario();
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

    const cal = document.getElementById('corriente-calendario-content');
    if (cal && cal.style.display !== 'none') renderCorrienteCalendario();

    const statusEl = document.getElementById('config-ref-status');
    if (statusEl) {
        const inicio12 = convertirA12Horas(inicio);
        const fin12 = convertirA12Horas(fin);
        const cruzaMedianoche = inicio >= fin;
        statusEl.innerHTML = `
            ✅ Referencia guardada: ${fecha} de ${inicio12} a ${fin12}
            ${cruzaMedianoche ? '<br>⚠️ El bloque cruza medianoche' : ''}
            <br>📌 Ciclo: ${config.horasCorriente}h corriente / ${config.horasApagon}h apagón
        `;
    }

    window.showToast('✅ Referencia guardada correctamente', 'success');
}

// ============================================================
// MODAL PRINCIPAL DE CORRIENTE
// ============================================================

function showCorrienteModal() {
    if (window.ModalModule?.cerrarTodosLosModales) window.ModalModule.cerrarTodosLosModales();
    
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
    `;

    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 16px 18px; max-width: 100%; width: 100%; max-height: 98vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.4); border: 1px solid var(--border-color); overflow-y: auto; font-size: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap;">
                <h2 style="margin: 0; color: #f59e0b; font-size: 18px;">⚡ Horarios de Corriente</h2>
                <button onclick="closeCorrienteModal()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="display: flex; gap: 3px; border-bottom: 2px solid var(--border-color); margin-bottom: 12px; flex-wrap: wrap;">
                <button id="tab-corriente-config" onclick="switchCorrienteTab('config')" class="btn primary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0; background: var(--primary); color: #fff; border: none;">⚙️ Config</button>
                <button id="tab-corriente-calendario" onclick="switchCorrienteTab('calendario')" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0; background: transparent; color: var(--text); border: none;">📅 Calendario</button>
                <button id="tab-corriente-reporte" onclick="switchCorrienteTab('reporte')" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0; background: transparent; color: var(--text); border: none;">📊 Reporte</button>
                <button id="tab-corriente-consultar" onclick="switchCorrienteTab('consultar')" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0; background: transparent; color: var(--text); border: none;">🔍 Fecha</button>
            </div>

            <div id="corriente-config-content" style="flex: 1; overflow-y: auto;">
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 10px;">
                    <h4 style="margin: 0 0 6px 0; font-size: 14px;">⚙️ Patrón</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <label style="font-size: 12px; font-weight: 500;">⏰ Corriente</label>
                            <input type="number" id="config-horas-corriente" value="${config.horasCorriente || 3}" min="0.5" max="24" step="0.5" style="width: 100%; padding: 6px 10px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 14px;">
                        </div>
                        <div>
                            <label style="font-size: 12px; font-weight: 500;">🌙 Apagón</label>
                            <input type="number" id="config-horas-apagon" value="${config.horasApagon || 12}" min="0.5" max="48" step="0.5" style="width: 100%; padding: 6px 10px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 14px;">
                        </div>
                    </div>
                    <button onclick="saveCorrientePattern()" class="btn primary" style="margin-top: 8px; padding: 4px 14px; font-size: 12px; width: auto;">💾 Guardar</button>
                </div>

                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <h4 style="margin: 0 0 6px 0; font-size: 14px;">📝 Referencia inicial</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                        <div>
                            <label style="font-size: 11px; font-weight: 500;">📅 Fecha</label>
                            <input type="date" id="config-fecha-ref" value="${config.fechaReferencia || new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                        <div>
                            <label style="font-size: 11px; font-weight: 500;">🟢 Inicio</label>
                            <input type="time" id="config-inicio-ref" value="${config.horaInicioReferencia || '10:00'}" style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                        <div>
                            <label style="font-size: 11px; font-weight: 500;">🔴 Fin</label>
                            <input type="time" id="config-fin-ref" value="${config.horaFinReferencia || '13:00'}" style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                    </div>
                    <button onclick="setCorrienteReference()" class="btn primary" style="margin-top: 8px; padding: 4px 14px; font-size: 12px; width: auto;">📌 Guardar referencia</button>
                    <div id="config-ref-status" style="margin-top: 6px; font-size: 12px; color: var(--text-light);"></div>
                </div>
                
                <div style="margin-top: 12px; padding: 10px 12px; background: #8b5cf610; border: 1px dashed #8b5cf6; border-radius: 8px; text-align: center;">
                    <button onclick="showProductionDiagnosticModal()" class="btn" style="padding: 6px 14px; font-size: 12px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">🔍 Ejecutar diagnóstico</button>
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
            </div>

            <div id="corriente-reporte-content" style="flex: 1; overflow-y: auto; display: none;">
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <label style="font-size: 11px;">📅 Desde</label>
                            <input type="date" id="reporte-fecha-desde" value="${new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                        <div>
                            <label style="font-size: 11px;">📅 Hasta</label>
                            <input type="date" id="reporte-fecha-hasta" value="${new Date(Date.now() + 7*86400000).toISOString().split('T')[0]}" style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                    </div>
                    <div style="margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap;">
                        <button onclick="generarReportePDF('semana')" class="btn primary" style="padding: 6px 14px; font-size: 12px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 6px; cursor: pointer;">📄 Semanal</button>
                        <button onclick="generarReportePDF('mes')" class="btn primary" style="padding: 6px 14px; font-size: 12px; width: auto; background: #10b981; color: #fff; border: none; border-radius: 6px; cursor: pointer;">📄 Mensual</button>
                    </div>
                </div>
            </div>

            <div id="corriente-consultar-content" style="flex: 1; overflow-y: auto; display: none;">
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end;">
                        <div style="flex: 1; min-width: 120px;">
                            <label style="font-size: 11px;">📅 Fecha</label>
                            <input type="date" id="consultar-fecha" value="${new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                        <button onclick="consultarHorariosFecha()" class="btn primary" style="padding: 6px 14px; font-size: 12px; width: auto;">🔍 Consultar</button>
                    </div>
                    <div id="consultar-resultado" style="margin-top: 10px; padding: 10px; background: var(--bg-card); border-radius: 6px; border: 1px solid var(--border-color); min-height: 50px; font-size: 13px;"></div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    window._corrienteMonthOffset = 0;

    window.closeCorrienteModal = function() {
        const m = document.getElementById('corriente-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => { if (m.parentNode) m.remove(); }, 200);
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
            `;
        }
    }
    
    modal.addEventListener('click', function(e) { if (e.target === this) closeCorrienteModal(); });
}

function irAHoyCorriente() {
    window._corrienteMonthOffset = 0;
    renderCorrienteCalendario();
    window.showToast('📅 Mostrando mes actual', 'info', 1500);
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
        try { bloques = window.CorrienteUtils.getBloques(dateStr); } catch (e) {}
        
        const tieneCorriente = bloques && bloques.length > 0;
        const numBloques = tieneCorriente ? bloques.length : 0;
        
        const prodConfig = getProduccionConfig(dateStr);
        const tieneProduccion = !!prodConfig;
        
        let bgColor = '#94a3b8';
        let labelColor = 'var(--text)';
        
        if (isToday) { bgColor = '#ef4444'; labelColor = '#fff'; }
        else if (tieneCorriente) { bgColor = '#f59e0b'; labelColor = '#fff'; }

        const produccionIcon = tieneProduccion ? `<span style="font-size: 9px; display: block; margin-top: 1px;">🔨</span>` : '';
        
        html += `
            <div style="text-align: center; padding: 6px 2px; background: ${bgColor}; border-radius: 4px; color: ${labelColor}; font-weight: ${isToday ? '700' : '400'}; cursor: ${tieneCorriente || tieneProduccion ? 'pointer' : 'default'}; font-size: 12px; border: ${tieneProduccion ? '2px solid #8b5cf6' : 'none'};" 
                 onclick="${tieneCorriente || tieneProduccion ? `showHorarioDetalle('${dateStr}')` : ''}">
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

window._horarioDetalleFechaActual = null;

function showHorarioDetalle(dateStr) {
    window._horarioDetalleFechaActual = dateStr;
    
    const existing = document.getElementById('horario-detalle-modal');
    if (existing) existing.remove();

    const bloquesHoy = window.CorrienteUtils.getBloques(dateStr);
    const bloqueAyer = window.CorrienteUtils.getUltimoBloqueDiaAnterior(dateStr);
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
    
    const fechaAnterior = sumarDiasISO(dateStr, -1);
    const fechaSiguiente = sumarDiasISO(dateStr, 1);
    const fechaActualCorta = getFechaCortaConDia(dateStr);
    const esHoy = esHoyISO(dateStr);

    const modal = document.createElement('div');
    modal.id = 'horario-detalle-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999999; padding: 20px;
    `;

    const bloqueActual = getBloqueSeleccionadoActual(prodConfig, dateStr);
    
    // 🆕 ENTREGA B: Cargar productos con CMPBC para el dropdown
    let productosConCMPBC = [];
    try {
        if (typeof window.DBModule?.getProductosConCMPBC === 'function') {
            productosConCMPBC = window.DBModule.getProductosConCMPBC();
        }
    } catch (e) {
        console.warn('⚠️ Error cargando productos con CMPBC:', e);
    }
    
    // Determinar el producto seleccionado (si la producción tiene uno guardado)
    let productoSeleccionado = null;
    try {
        if (prodConfig && prodConfig.producto_id) {
            productoSeleccionado = window.DBModule.getProducto(prodConfig.producto_id);
        }
    } catch (e) {}
    
    let produccionHtml = '';
    
    const hayBloquesDisponibles = (bloquesHoy && bloquesHoy.length > 0) || !!bloqueAyer;
    
    if (hayBloquesDisponibles) {
        const opcionesHoy = (bloquesHoy || []).map((b, i) => {
            const bloqueIndexHoy = i + 1;
            const isSelected = bloqueActual && 
                              !bloqueActual.esDiaAnterior && 
                              bloqueActual.bloqueIndex === bloqueIndexHoy;
            const label = `🔨 Hoy — ${b.inicioStr} a ${b.finStr} (${b.duracionHoras.toFixed(1)}h)`;
            return `<option value="hoy_${bloqueIndexHoy}"${isSelected ? ' selected' : ''}>${label}</option>`;
        }).join('');
        
        const opcionAyer = bloqueAyer ? (() => {
            const isSelected = bloqueActual && bloqueActual.esDiaAnterior;
            const label = `🌙 Último bloque de ayer — ${bloqueAyer.inicioStr} a ${bloqueAyer.finStr} (${bloqueAyer.duracionHoras.toFixed(1)}h)`;
            return `<option value="ayer_${bloqueAyer.indexEnDiaAnterior}"${isSelected ? ' selected' : ''}>${label}</option>`;
        })() : '';
        
        const cantidadGuardada = prodConfig?.cantidad_produccion 
            ? formatearCantidadProduccion(prodConfig.cantidad_produccion) 
            : '';
        
        const avisoBloqueAyer = (bloqueActual && bloqueActual.esDiaAnterior)
            ? `<div style="background: #8b5cf620; border-left: 3px solid #8b5cf6; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; font-size: 11px; color: #8b5cf6;">
                   🌙 <strong>Producción programada para el bloque de ayer.</strong>
                   <br>La venta y entrega se harán el <strong>${diaMes}/${String(mes).substring(0, 3)}</strong>.
               </div>`
            : '';
        
        // 🆕 ENTREGA B: Dropdown de productos + CMPBC
        const opcionesProductos = productosConCMPBC.map(p => {
            const isSelected = productoSeleccionado && productoSeleccionado.id === p.id;
            return `<option value="${p.id}" data-cmpbc="${p.capacidad_max_bloque}"${isSelected ? ' selected' : ''}>${p.nombre} (🏭 ${window.formatearCMPBC ? window.formatearCMPBC(p.capacidad_max_bloque) : p.capacidad_max_bloque}/bloque)</option>`;
        }).join('');
        
        const bloqueProductoHTML = `
            <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px;">
                <label style="font-size: 12px; font-weight: 600; color: #3b82f6; display: block; margin-bottom: 6px;">
                    🏷️ Producto a producir
                </label>
                <select id="produccion-producto" 
                        onchange="onProductoProduccionChange()"
                        style="width: 100%; padding: 8px 10px; border: 2px solid #3b82f6; border-radius: 8px; background: var(--bg-input); color: var(--text); font-size: 13px;">
                    <option value="">— Sin producto específico —</option>
                    ${opcionesProductos}
                </select>
                <div id="producto-cmpbc-info" style="margin-top: 6px; font-size: 11px; color: #3b82f6; min-height: 16px;"></div>
                ${productosConCMPBC.length === 0 ? `
                    <div style="margin-top: 6px; padding: 6px 10px; background: #fef9e7; border-left: 3px solid #f59e0b; border-radius: 6px; font-size: 11px; color: #92400e;">
                        ⚠️ Ningún producto tiene CMPBC configurado. Ve a 🏷️ Productos para definirlo.
                    </div>
                ` : ''}
            </div>
        `;
        
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
                
                ${avisoBloqueAyer}
                
                ${bloqueProductoHTML}
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                    <div>
                        <label style="font-size: 11px; font-weight: 600; color: var(--text-label); display: block; margin-bottom: 2px;">🔨 Bloque de producción</label>
                        <select id="produccion-bloque" style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                            <option value="">— Sin especificar —</option>
                            ${opcionesHoy}
                            ${opcionAyer}
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 600; color: var(--text-label); display: block; margin-bottom: 2px;">📦 Cantidad a producir</label>
                        <input type="number" id="produccion-cantidad" 
                               value="${cantidadGuardada}" 
                               placeholder="Ej: 6.5"
                               min="0.01" 
                               step="any"
                               style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        <small style="font-size: 10px; color: var(--text-light); display: block; margin-top: 2px;">
                            💡 Acepta cualquier número: 6, 6.5, 6.123
                        </small>
                    </div>
                </div>
                
                <!-- 🆕 ENTREGA B: Botón de cálculo automático -->
                <div id="calculo-automatico-container" style="margin-bottom: 10px;"></div>
                
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
                
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <button onclick="guardarProduccion('${dateStr}')" class="btn primary" 
                            style="flex: 2; padding: 8px; font-size: 13px; background: #8b5cf6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        💾 Guardar solo este día
                    </button>
                    <button onclick="showProduccionRangoModal('${dateStr}')" class="btn" 
                            style="flex: 1; padding: 8px; font-size: 13px; background: #3b82f6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; min-width: 130px;">
                        📅 Aplicar a rango
                    </button>
                </div>
            </div>
        `;
    }

    const headerNavegacion = `
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
            <button onclick="navegarHorarioDetalle('${fechaAnterior}')" 
                    class="btn secondary" 
                    style="padding: 6px 10px; font-size: 16px; width: auto; flex-shrink: 0;"
                    title="Día anterior (${getFechaCortaConDia(fechaAnterior)})">
                ◀
            </button>
            <div style="flex: 1; text-align: center; min-width: 0;">
                <div style="font-size: 15px; font-weight: 700; color: #f59e0b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    📅 ${fechaActualCorta}
                </div>
                <div style="font-size: 10px; color: var(--text-light); margin-top: 1px;">
                    ${esHoy ? '⭐ HOY' : `${diaSemana}, ${diaMes} ${mes.substring(0,3)} ${anio}`}
                </div>
            </div>
            <button onclick="navegarHorarioDetalle('${fechaSiguiente}')" 
                    class="btn secondary" 
                    style="padding: 6px 10px; font-size: 16px; width: auto; flex-shrink: 0;"
                    title="Día siguiente (${getFechaCortaConDia(fechaSiguiente)})">
                ▶
            </button>
            <button onclick="closeHorarioDetalleModal()" 
                    style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--text-light); padding: 0 4px; flex-shrink: 0;">
                ✕
            </button>
        </div>
    `;

    if (!bloquesHoy || bloquesHoy.length === 0) {
        const sinCorrienteMsg = bloqueAyer 
            ? `<p style="font-size: 13px; color: var(--text-light); margin-bottom: 12px; text-align: center;">
                  No hay corriente programada para este día.<br>
                  <span style="color: #8b5cf6;">🌙 Puedes usar el último bloque de ayer si lo necesitas.</span>
               </p>`
            : `<p style="font-size: 13px; color: var(--text-light); margin-bottom: 20px; text-align: center;">No hay corriente programada para este día.</p>`;
        
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 20px 24px; max-width: 480px; width: 100%; max-height: 92vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); border: 1px solid var(--border-color);">
                ${headerNavegacion}
                <div style="text-align: center; margin-bottom: 16px;">
                    <div style="font-size: 56px; margin-bottom: 12px;">🌙</div>
                    <h2 style="margin: 0 0 8px 0; font-size: 18px; color: var(--text);">Sin corriente</h2>
                </div>
                ${sinCorrienteMsg}
                ${produccionHtml}
                <div style="display: flex; gap: 8px; margin-top: 16px;">
                    <button onclick="closeHorarioDetalleModal()" class="btn secondary" style="padding: 10px 24px; font-size: 14px; width: auto; flex: 1;">Cerrar</button>
                </div>
            </div>
        `;
    } else {
        let totalHoras = 0;
        bloquesHoy.forEach(b => { totalHoras += b.duracionHoras; });

        const bloquesHtml = bloquesHoy.map((h, i) => {
            const bloqueIndexHoy = i + 1;
            const esProduccionHoy = bloqueActual && 
                                    !bloqueActual.esDiaAnterior && 
                                    bloqueActual.bloqueIndex === bloqueIndexHoy;
            return `
                <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: ${esProduccionHoy ? '#8b5cf620' : 'var(--bg)'}; border-radius: 8px; border-left: 4px solid ${esProduccionHoy ? '#8b5cf6' : '#f59e0b'}; margin-bottom: 6px;">
                    <span style="font-size: 18px; font-weight: 700; color: ${esProduccionHoy ? '#8b5cf6' : '#f59e0b'}; min-width: 24px;">${i + 1}</span>
                    <div style="flex: 1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span style="background: #10b98120; color: #10b981; padding: 3px 10px; border-radius: 10px; font-size: 13px; font-weight: 600;">🟢 ${h.inicioStr}</span>
                        <span style="color: var(--text-light); font-size: 12px;">→</span>
                        <span style="background: #ef444420; color: #ef4444; padding: 3px 10px; border-radius: 10px; font-size: 13px; font-weight: 600;">🔴 ${h.finStr}</span>
                        ${h.cruzaMedianoche ? '<span style="font-size: 10px; color: #f59e0b; background: #f59e0b20; padding: 1px 6px; border-radius: 8px;">cruza medianoche</span>' : ''}
                        ${esProduccionHoy ? '<span style="font-size: 10px; color: #8b5cf6; background: #8b5cf620; padding: 1px 8px; border-radius: 8px; font-weight: 600;">🔨 PRODUCCIÓN</span>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        let bloqueAyerHtml = '';
        if (bloqueAyer) {
            const esProduccionAyer = bloqueActual && bloqueActual.esDiaAnterior;
            bloqueAyerHtml = `
                <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--border-color);">
                    <div style="font-size: 11px; font-weight: 600; color: var(--text-label); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                        🌙 Del día anterior
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: ${esProduccionAyer ? '#8b5cf620' : '#8b5cf608'}; border-radius: 8px; border-left: 4px solid #8b5cf6; border: 1px dashed #8b5cf6;">
                        <span style="font-size: 18px;">🌙</span>
                        <div style="flex: 1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span style="font-size: 12px; font-weight: 600; color: #8b5cf6;">Último bloque de ayer</span>
                            <span style="background: #10b98120; color: #10b981; padding: 3px 10px; border-radius: 10px; font-size: 12px; font-weight: 600;">🟢 ${bloqueAyer.inicioStr}</span>
                            <span style="color: var(--text-light); font-size: 12px;">→</span>
                            <span style="background: #ef444420; color: #ef4444; padding: 3px 10px; border-radius: 10px; font-size: 12px; font-weight: 600;">🔴 ${bloqueAyer.finStr}</span>
                            ${esProduccionAyer ? '<span style="font-size: 10px; color: #8b5cf6; background: #8b5cf620; padding: 1px 8px; border-radius: 8px; font-weight: 600;">🔨 PRODUCCIÓN</span>' : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 20px 24px; max-width: 500px; width: 100%; max-height: 92vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); border: 1px solid var(--border-color);">
                ${headerNavegacion}

                <div style="display: flex; gap: 8px; margin-bottom: 14px;">
                    <div style="flex: 1; background: #f59e0b20; padding: 8px 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${bloquesHoy.length}</div>
                        <div style="font-size: 11px; color: var(--text-light);">Bloque${bloquesHoy.length > 1 ? 's' : ''} hoy</div>
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

                ${bloqueAyerHtml}
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
            setTimeout(() => { if (m.parentNode) m.remove(); }, 200);
        }
        window._horarioDetalleFechaActual = null;
    };

    // 🆕 ENTREGA B: Inicializar el botón de cálculo automático
    setTimeout(() => {
        if (typeof window.onProductoProduccionChange === 'function') {
            window.onProductoProduccionChange();
        }
    }, 100);

    modal.addEventListener('click', function(e) {
        if (e.target === this) closeHorarioDetalleModal();
    });

    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeHorarioDetalleModal();
            document.removeEventListener('keydown', escHandler);
        }
        if (e.key === 'ArrowLeft') navegarHorarioDetalle(fechaAnterior);
        if (e.key === 'ArrowRight') navegarHorarioDetalle(fechaSiguiente);
    };
    document.addEventListener('keydown', escHandler);
}

// ============================================================
// 🆕 ENTREGA B: CALLBACK AL CAMBIAR EL PRODUCTO EN EL MODAL
// ============================================================

window.onProductoProduccionChange = function() {
    const productoSelect = document.getElementById('produccion-producto');
    const cmpbcInfo = document.getElementById('producto-cmpbc-info');
    const calculoContainer = document.getElementById('calculo-automatico-container');
    
    if (!productoSelect || !cmpbcInfo || !calculoContainer) return;
    
    const productoId = productoSelect.value;
    const selectedOption = productoSelect.options[productoSelect.selectedIndex];
    
    // Limpiar contenedor
    calculoContainer.innerHTML = '';
    
    if (!productoId) {
        cmpbcInfo.innerHTML = '';
        return;
    }
    
    const cmpbc = parseFloat(selectedOption?.dataset?.cmpbc);
    const nombreProducto = selectedOption?.textContent?.split(' (')[0] || 'Producto';
    
    if (isNaN(cmpbc) || cmpbc <= 0) {
        cmpbcInfo.innerHTML = `
            <span style="color: #f59e0b;">⚠️ Este producto no tiene CMPBC configurado. Edítalo en 🏷️ Productos para usar el cálculo automático.</span>
        `;
        return;
    }
    
    cmpbcInfo.innerHTML = `
        ✅ CMPBC: <strong>${window.formatearCMPBC ? window.formatearCMPBC(cmpbc) : cmpbc} unidades</strong> por bloque
    `;
    
    // 🆕 Mostrar el botón de cálculo automático
    calculoContainer.innerHTML = `
        <button onclick="calcularYMostrarSugerencia('${window._horarioDetalleFechaActual}', ${cmpbc}, '${nombreProducto.replace(/'/g, "\\'")}')" 
                class="btn" 
                style="width: 100%; padding: 10px 14px; font-size: 13px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ✨ Calcular bloques automáticamente
        </button>
    `;
};

// ============================================================
// 🆕 ENTREGA B: CALCULAR Y MOSTRAR SUGERENCIA
// ============================================================

window.calcularYMostrarSugerencia = function(fechaVenta, cmpbc, nombreProducto) {
    const cantidadInput = document.getElementById('produccion-cantidad');
    if (!cantidadInput) return;
    
    const cpd = parseFloat(cantidadInput.value);
    if (isNaN(cpd) || cpd <= 0) {
        window.showToast('⚠️ Primero escribe la cantidad a producir', 'warning', 3000);
        return;
    }
    
    if (!fechaVenta) {
        window.showToast('⚠️ Fecha no válida', 'error', 3000);
        return;
    }
    
    console.log(`🧠 Calculando bloques para ${fechaVenta}, CPD=${cpd}, CMPBC=${cmpbc}`);
    
    const resultado = calcularBloquesIdeales(fechaVenta, cpd, cmpbc);
    
    if (!resultado.success) {
        window.ModalModule.showAlert({
            title: '❌ No se puede calcular',
            message: resultado.error + (resultado.detalle ? `\n\n${resultado.detalle}` : ''),
            icon: '❌',
            type: 'error',
            buttonText: 'Entendido'
        });
        return;
    }
    
    // Mostrar el modal de sugerencia
    showCalculoBloquesModal(resultado, fechaVenta, nombreProducto);
};

// ============================================================
// 🆕 ENTREGA B: MODAL DE SUGERENCIA DE BLOQUES
// ============================================================

function showCalculoBloquesModal(resultado, fechaVenta, nombreProducto) {
    const existing = document.getElementById('calculo-bloques-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'calculo-bloques-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999999999; padding: 15px;
    `;
    
    const bloquesHtml = resultado.bloques.map((b, i) => {
        const numero = i + 1;
        const icono = i === 0 ? '🥇' : (i === 1 ? '🥈' : `#${numero}`);
        const etiquetaColor = b.esBloqueAyer ? '#8b5cf6' : (b.esAmanecer ? '#10b981' : '#f59e0b');
        const etiquetaFondo = b.esBloqueAyer ? '#8b5cf620' : (b.esAmanecer ? '#10b98120' : '#f59e0b20');
        
        return `
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: ${etiquetaFondo}; border-left: 4px solid ${etiquetaColor}; border-radius: 8px; margin-bottom: 6px;">
                <span style="font-size: 20px; flex-shrink: 0;">${icono}</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 13px; font-weight: 700; color: ${etiquetaColor};">
                        ${b.esBloqueAyer ? '🌙 Bloque del día anterior' : (b.esAmanecer ? '🌅 Bloque al amanecer' : '🔨 Bloque del día')}
                    </div>
                    <div style="font-size: 12px; color: var(--text-light); margin-top: 2px;">
                        🕐 ${b.horaInicioStr} - ${b.horaFinStr} · ${b.duracionHoras.toFixed(1)}h
                        ${b.esBloqueAyer ? `<br>📅 ${b.fechaBloqueReal}` : ''}
                    </div>
                </div>
                <div style="text-align: right; flex-shrink: 0;">
                    <div style="font-size: 18px; font-weight: 700; color: ${etiquetaColor};">
                        ${window.formatearCMPBC ? window.formatearCMPBC(b.cantidad) : b.cantidad}
                    </div>
                    <div style="font-size: 10px; color: var(--text-light);">unidades</div>
                </div>
            </div>
        `;
    }).join('');
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 22px; max-width: 580px; width: 100%; max-height: 95vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 2px solid #8b5cf6;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #8b5cf6;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">✨</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #8b5cf6;">Cálculo automático de bloques</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">${nombreProducto || 'Producto'}</p>
                    </div>
                </div>
                <button onclick="closeCalculoBloquesModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="background: var(--bg); border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; padding: 3px 0;">
                    <span style="color: var(--text-light);">📦 Cantidad total:</span>
                    <strong style="color: #3b82f6;">${window.formatearCMPBC ? window.formatearCMPBC(resultado.cpd) : resultado.cpd} uds</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 3px 0;">
                    <span style="color: var(--text-light);">🏭 Capacidad por bloque:</span>
                    <strong style="color: #8b5cf6;">${window.formatearCMPBC ? window.formatearCMPBC(resultado.cmpbc) : resultado.cmpbc} uds</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 3px 0; border-top: 1px solid var(--border-color); margin-top: 4px; padding-top: 6px;">
                    <span style="color: var(--text-light);">🔢 Bloques necesarios:</span>
                    <strong style="color: #10b981;">${resultado.numBloques}</strong>
                </div>
            </div>
            
            <div style="background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px;">
                <div style="font-size: 13px; font-weight: 700; color: #3b82f6; margin-bottom: 8px;">
                    📋 Distribución sugerida
                </div>
                ${bloquesHtml}
            </div>
            
            <div style="background: linear-gradient(135deg, #8b5cf615 0%, #8b5cf608 100%); border-left: 4px solid #8b5cf6; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 13px; color: var(--text);">
                💬 <strong>${resultado.mensaje}</strong>
            </div>
            
            ${resultado.usaBloqueAyer ? `
                <div style="background: #fef9e7; border-left: 3px solid #f59e0b; border-radius: 6px; padding: 8px 12px; margin-bottom: 14px; font-size: 11px; color: #92400e;">
                    ℹ️ Este cálculo usa el <strong>último bloque del día anterior</strong>. Asegúrate de que la producción realmente se puede hacer en ese bloque.
                </div>
            ` : ''}
            
            <div style="display: flex; gap: 8px; margin-top: 4px;">
                <button onclick="confirmarCalculoBloques('${fechaVenta}')" class="btn primary" 
                        style="flex: 2; padding: 12px; font-size: 14px; background: #10b981; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">
                    ✅ Confirmar y usar
                </button>
                <button onclick="closeCalculoBloquesModal()" class="btn secondary" 
                        style="flex: 1; padding: 12px; font-size: 14px;">
                    ❌ Cancelar
                </button>
            </div>
            
            <div style="text-align: center; margin-top: 10px; font-size: 11px; color: var(--text-light);">
                💡 Puedes ajustar el bloque y la cantidad manualmente si lo prefieres.
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    window._calculoBloquesActual = { resultado, fechaVenta, nombreProducto };
    
    window.closeCalculoBloquesModal = function() {
        const m = document.getElementById('calculo-bloques-modal');
        if (m) {
            m.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => { if (m.parentNode) m.remove(); }, 200);
        }
        window._calculoBloquesActual = null;
    };
    
    modal.addEventListener('click', (e) => { if (e.target === modal) closeCalculoBloquesModal(); });
    
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeCalculoBloquesModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

window.showCalculoBloquesModal = showCalculoBloquesModal;

// ============================================================
// 🆕 ENTREGA B: CONFIRMAR CÁLCULO DE BLOQUES
// ============================================================

window.confirmarCalculoBloques = async function(fechaVenta) {
    const state = window._calculoBloquesActual;
    if (!state || !state.resultado) return;
    
    const resultado = state.resultado;
    
    // Determinar el bloque principal (el primero, que es el "ancla")
    const bloquePrincipal = resultado.bloques[0];
    
    // Preparar la distribución como JSON
    const distribucion = resultado.bloques.map(b => ({
        fecha: b.fecha,
        bloque_index: b.bloqueIndex,
        hora_inicio: b.horaInicioStr24,
        hora_fin: b.horaFinStr24,
        cantidad: b.cantidad,
        es_bloque_dia_anterior: b.esBloqueAyer ? 1 : 0,
        fecha_bloque_real: b.fechaBloqueReal
    }));
    
    // Guardar la producción con el bloque principal
    // y la distribución completa en `distribucion_bloques`
    const dataGuardar = {
        fecha: fechaVenta,
        hora_inicio: bloquePrincipal.horaInicioStr24,
        hora_fin: bloquePrincipal.horaFinStr24,
        bloque_index: bloquePrincipal.bloqueIndex,
        cantidad_produccion: resultado.cpd,
        notas: null,
        es_bloque_dia_anterior: bloquePrincipal.esBloqueAyer ? 1 : 0,
        fecha_bloque_real: bloquePrincipal.fechaBloqueReal,
        bloques_usados: resultado.numBloques,
        distribucion_bloques: JSON.stringify(distribucion)
    };
    
    console.log('💾 Guardando producción con distribución:', dataGuardar);
    
    const result = window.DBModule.saveProduccion(dataGuardar);
    
    if (result.success) {
        window.showToast(
            `✅ Producción guardada · ${resultado.numBloques} bloque${resultado.numBloques > 1 ? 's' : ''} · ${window.formatearCMPBC ? window.formatearCMPBC(resultado.cpd) : resultado.cpd} uds`,
            'success',
            5000
        );
        
        closeCalculoBloquesModal();
        closeHorarioDetalleModal();
        
        setTimeout(() => {
            renderCorrienteCalendario();
            showHorarioDetalle(fechaVenta);
        }, 300);
    } else {
        window.showToast('❌ Error al guardar: ' + (result.error || 'Desconocido'), 'error', 6000);
    }
};

// ============================================================
// NAVEGAR HORARIO DETALLE
// ============================================================

async function navegarHorarioDetalle(nuevaFecha) {
    const fechaActual = window._horarioDetalleFechaActual;
    if (nuevaFecha === fechaActual) return;
    
    const hoy = new Date();
    const limiteInferior = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 60);
    const limiteSuperior = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 60);
    
    const partes = String(nuevaFecha).split('-').map(Number);
    const fechaObj = new Date(partes[0], partes[1] - 1, partes[2]);
    
    if (fechaObj < limiteInferior || fechaObj > limiteSuperior) {
        window.showToast('⚠️ Solo puedes navegar ±60 días desde hoy', 'warning', 3000);
        return;
    }
    
    const teniaCambios = await guardarProduccionAutoSiHayCambios(fechaActual);
    if (teniaCambios === false) return;
    
    showHorarioDetalle(nuevaFecha);
}

async function guardarProduccionAutoSiHayCambios(fechaISO) {
    try {
        const bloqueSelectEl = document.getElementById('produccion-bloque');
        const cantidadEl = document.getElementById('produccion-cantidad');
        const notasEl = document.getElementById('produccion-notas');
        
        if (!bloqueSelectEl || !cantidadEl || !notasEl) return true;
        
        const bloqueSelectValue = bloqueSelectEl.value || '';
        const cantidadActual = cantidadEl.value?.trim() || '';
        const notasActual = notasEl.value?.trim() || '';
        
        const prodConfig = getProduccionConfig(fechaISO);
        
        const bloqueActualBD = prodConfig?.bloque_index || null;
        const esAyerBD = prodConfig?.es_bloque_dia_anterior === 1;
        const cantidadBD = prodConfig?.cantidad_produccion != null 
            ? String(parseFloat(prodConfig.cantidad_produccion)) 
            : '';
        const notasBD = prodConfig?.notas || '';
        
        let bloqueActualSelect = null;
        let esAyerSelect = false;
        if (bloqueSelectValue) {
            const m = bloqueSelectValue.match(/^(hoy|ayer)_(\d+)$/);
            if (m) {
                bloqueActualSelect = parseInt(m[2]);
                esAyerSelect = (m[1] === 'ayer');
            }
        }
        
        const hayCambios = 
            bloqueActualSelect !== bloqueActualBD ||
            esAyerSelect !== esAyerBD ||
            cantidadActual !== cantidadBD ||
            notasActual !== notasBD;
        
        if (!hayCambios) return true;
        
        console.log(`💾 [Navegación] Guardando cambios para ${fechaISO}...`);
        
        if (!bloqueSelectValue) {
            if (cantidadActual) {
                const confirm = await window.ModalModule.showConfirm({
                    title: '⚠️ Cambios sin guardar',
                    message: `Has escrito una cantidad (${cantidadActual}) pero no has seleccionado un bloque.\n\n¿Descartar y continuar navegando?`,
                    confirmText: '🗑️ Descartar y continuar',
                    cancelText: '↩️ Volver al formulario',
                    icon: '⚠️',
                    confirmColor: '#f59e0b'
                });
                return confirm;
            }
            return true;
        }
        
        const resultado = await ejecutarGuardadoProduccion(fechaISO, bloqueSelectValue, cantidadActual, notasActual);
        
        if (resultado.success) {
            console.log(`✅ [Navegación] Cambios guardados`);
            return true;
        } else {
            window.showToast(`❌ No se pudieron guardar: ${resultado.error}`, 'error', 4000);
            return false;
        }
    } catch (e) {
        console.error('❌ Error en guardarProduccionAutoSiHayCambios:', e);
        return true;
    }
}

async function ejecutarGuardadoProduccion(fechaISO, bloqueSelectValue, cantidadRaw, notas) {
    try {
        const cantidad = parseFloat(cantidadRaw);
        if (isNaN(cantidad) || cantidad <= 0) return { success: false, error: 'Cantidad no válida' };
        
        const match = bloqueSelectValue.match(/^(hoy|ayer)_(\d+)$/);
        if (!match) return { success: false, error: 'Bloque no válido' };
        
        const tipo = match[1];
        const index = parseInt(match[2]);
        
        let esBloqueDiaAnterior = false;
        let bloqueIndexParaGuardar = null;
        let bloqueDataParaGuardar = null;
        let fechaBloqueRealParaGuardar = null;
        
        if (tipo === 'hoy') {
            const bloquesHoy = window.CorrienteUtils.getBloques(fechaISO);
            if (!bloquesHoy || bloquesHoy.length < index) return { success: false, error: 'Bloque no encontrado' };
            bloqueDataParaGuardar = bloquesHoy[index - 1];
            bloqueIndexParaGuardar = index;
            fechaBloqueRealParaGuardar = fechaISO;
        } else {
            const bloqueAyer = window.CorrienteUtils.getUltimoBloqueDiaAnterior(fechaISO);
            if (!bloqueAyer) return { success: false, error: 'No hay bloque de ayer' };
            bloqueDataParaGuardar = bloqueAyer;
            bloqueIndexParaGuardar = bloqueAyer.indexEnDiaAnterior;
            esBloqueDiaAnterior = true;
            fechaBloqueRealParaGuardar = bloqueAyer.fechaBloqueReal;
        }
        
        const data = {
            fecha: fechaISO,
            hora_inicio: bloqueDataParaGuardar.inicioStr24,
            hora_fin: bloqueDataParaGuardar.finStr24,
            bloque_index: bloqueIndexParaGuardar,
            cantidad_produccion: cantidad,
            notas: notas || null,
            es_bloque_dia_anterior: esBloqueDiaAnterior ? 1 : 0,
            fecha_bloque_real: fechaBloqueRealParaGuardar
        };
        
        const result = window.DBModule.saveProduccion(data);
        return result.success ? { success: true } : { success: false, error: result.error || 'Error desconocido' };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

window.navegarHorarioDetalle = navegarHorarioDetalle;
window.guardarProduccionAutoSiHayCambios = guardarProduccionAutoSiHayCambios;
window.ejecutarGuardadoProduccion = ejecutarGuardadoProduccion;

// ============================================================
// GUARDAR PRODUCCIÓN (manual)
// ============================================================

function guardarProduccion(fechaISO) {
    if (!window.DBModule || typeof window.DBModule.saveProduccion !== 'function') {
        window.showToast('❌ Error: función de guardado no disponible', 'error', 6000);
        return;
    }
    
    const bloqueSelectValue = document.getElementById('produccion-bloque')?.value || '';
    const cantidadRaw = document.getElementById('produccion-cantidad')?.value;
    const cantidad = parseFloat(cantidadRaw);
    const notas = document.getElementById('produccion-notas')?.value?.trim() || null;
    
    // 🆕 ENTREGA B: Incluir el producto_id si está seleccionado (aunque no está
    // en el esquema actual, lo dejamos preparado para futuras versiones)
    const productoSelect = document.getElementById('produccion-producto');
    const productoId = productoSelect ? parseInt(productoSelect.value) : null;
    
    if (!bloqueSelectValue) { window.showToast('⚠️ Selecciona un bloque de producción', 'warning'); return; }
    if (isNaN(cantidad) || cantidad <= 0) { window.showToast('⚠️ La cantidad debe ser mayor a 0', 'warning'); return; }
    
    ejecutarGuardadoProduccion(fechaISO, bloqueSelectValue, cantidadRaw, notas).then(result => {
        if (result.success) {
            const match = bloqueSelectValue.match(/^(hoy|ayer)_(\d+)$/);
            const esAyer = match && match[1] === 'ayer';
            const sufijo = esAyer ? ' en el último bloque de ayer' : ` en el bloque ${match ? match[2] : '?'} de hoy`;
            window.showToast(`✅ Producción guardada: ${formatearCantidadProduccion(cantidad)} unidades${sufijo}`, 'success', 4000);
            closeHorarioDetalleModal();
            setTimeout(() => { renderCorrienteCalendario(); showHorarioDetalle(fechaISO); }, 300);
        } else {
            window.showToast('❌ Error al guardar: ' + (result.error || 'Desconocido'), 'error', 6000);
        }
    });
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
            window.showToast('❌ Función no disponible', 'error');
            return;
        }
        const result = window.DBModule.deleteProduccion(fechaISO);
        if (result.success) {
            window.showToast('✅ Producción eliminada', 'success');
            closeHorarioDetalleModal();
            setTimeout(renderCorrienteCalendario, 300);
        } else {
            window.showToast('❌ Error: ' + (result.error || 'Desconocido'), 'error');
        }
    });
}

window.guardarProduccion = guardarProduccion;
window.eliminarProduccion = eliminarProduccion;

// ============================================================
// PRODUCCIÓN POR RANGO (CORRECCIÓN #7)
// ============================================================

function showProduccionRangoModal(fechaBase) {
    const existing = document.getElementById('produccion-rango-modal');
    if (existing) existing.remove();
    
    if (!window.DBModule || typeof window.DBModule.saveProduccionRango !== 'function') {
        window.showToast('❌ Función no disponible. Recarga la página.', 'error', 6000);
        return;
    }
    
    const cantidadBase = document.getElementById('produccion-cantidad')?.value || '';
    const notasBase = document.getElementById('produccion-notas')?.value?.trim() || '';
    const bloqueSelectBase = document.getElementById('produccion-bloque')?.value || '';
    
    const fechaInicioDefault = fechaBase;
    const fechaFinDefaultObj = new Date(fechaBase + 'T00:00:00');
    fechaFinDefaultObj.setDate(fechaFinDefaultObj.getDate() + 6);
    const fechaFinDefault = window.CorrienteUtils.formatearFechaISO(fechaFinDefaultObj);
    
    let bloqueInfoBase = null;
    if (bloqueSelectBase) {
        const match = bloqueSelectBase.match(/^(hoy|ayer)_(\d+)$/);
        if (match) {
            const tipo = match[1];
            const idx = parseInt(match[2]);
            if (tipo === 'hoy') {
                const bloques = window.CorrienteUtils.getBloques(fechaBase);
                bloqueInfoBase = bloques[idx - 1] || null;
            } else {
                bloqueInfoBase = window.CorrienteUtils.getUltimoBloqueDiaAnterior(fechaBase);
            }
        }
    }
    
    const modal = document.createElement('div');
    modal.id = 'produccion-rango-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999999999; padding: 15px;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 22px; max-width: 580px; width: 100%; max-height: 95vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 2px solid #3b82f6;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #3b82f6;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">📅</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #3b82f6;">Aplicar producción a un rango</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">Misma cantidad para varios días</p>
                    </div>
                </div>
                <button onclick="closeProduccionRangoModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px; color: #1e40af;">
                💡 Se aplicará la misma cantidad a TODAS las fechas del rango.
                <br>Los días con producción existente serán <strong>sobrescritos</strong>.
            </div>
            
            <form id="produccion-rango-form" style="display: flex; flex-direction: column; gap: 12px;">
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">📅 Rango de fechas</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div><label style="font-size: 12px;">Desde</label>
                            <input type="date" id="pr-fecha-inicio" class="input-field" value="${fechaInicioDefault}" required onchange="previewProduccionRango()">
                        </div>
                        <div><label style="font-size: 12px;">Hasta</label>
                            <input type="date" id="pr-fecha-fin" class="input-field" value="${fechaFinDefault}" required onchange="previewProduccionRango()">
                        </div>
                    </div>
                    <div style="display: flex; gap: 4px; margin-top: 8px; flex-wrap: wrap;">
                        <button type="button" onclick="setRangoRapido(7)" class="btn secondary" style="padding: 4px 10px; font-size: 11px; width: auto;">7 días</button>
                        <button type="button" onclick="setRangoRapido(14)" class="btn secondary" style="padding: 4px 10px; font-size: 11px; width: auto;">14 días</button>
                        <button type="button" onclick="setRangoRapido(30)" class="btn secondary" style="padding: 4px 10px; font-size: 11px; width: auto;">30 días</button>
                        <button type="button" onclick="setRangoMesActual()" class="btn secondary" style="padding: 4px 10px; font-size: 11px; width: auto;">Mes completo</button>
                    </div>
                </div>
                
                <div style="background: #fef9e7; padding: 10px 12px; border-radius: 8px; border: 1px solid #f59e0b;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                        <input type="checkbox" id="pr-excluir-domingos" onchange="previewProduccionRango()" style="width: 16px; height: 16px; cursor: pointer; accent-color: #f59e0b;">
                        <label for="pr-excluir-domingos" style="font-size: 13px; cursor: pointer; font-weight: 600;">🚫 Excluir los domingos del rango</label>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="pr-excluir-dias-sin-corriente" onchange="previewProduccionRango()" style="width: 16px; height: 16px; cursor: pointer; accent-color: #f59e0b;">
                        <label for="pr-excluir-dias-sin-corriente" style="font-size: 13px; cursor: pointer; font-weight: 600;">🌙 Excluir los días sin corriente</label>
                    </div>
                </div>
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">📦 Producción</div>
                    <div class="form-group" style="margin-bottom: 8px;">
                        <label style="font-size: 12px;">Cantidad a producir (por día)</label>
                        <input type="number" id="pr-cantidad" class="input-field" value="${cantidadBase}" placeholder="Ej: 6.5" min="0.01" step="any" required onchange="previewProduccionRango()">
                        <small style="font-size: 11px; color: var(--text-light);">Acepta cualquier número: 6, 6.5, 6.123</small>
                    </div>
                    <div class="form-group">
                        <label style="font-size: 12px;">📝 Notas (se aplicarán a todos los días)</label>
                        <input type="text" id="pr-notas" class="input-field" value="${notasBase}" placeholder="Ej: Producción semanal">
                    </div>
                </div>
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">🔨 Bloque de producción</div>
                    <div style="font-size: 12px; color: var(--text-light); margin-bottom: 8px;">
                        ${bloqueInfoBase ? `📌 Bloque seleccionado: <strong>${bloqueInfoBase.inicioStr} - ${bloqueInfoBase.finStr}</strong>` : '📌 No hay bloque seleccionado'}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <label style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #eff6ff; border: 1px solid #3b82f6; border-radius: 6px; cursor: pointer;">
                            <input type="radio" name="pr-bloque-tipo" value="relativo" checked onchange="previewProduccionRango()">
                            <span style="font-size: 13px;">🔁 <strong>Mismo bloque relativo</strong> — Cada día usa su bloque equivalente</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer;">
                            <input type="radio" name="pr-bloque-tipo" value="fijo" onchange="previewProduccionRango()">
                            <span style="font-size: 13px;">📌 <strong>Bloque fijo del día base</strong> — Mismas horas exactas</span>
                        </label>
                    </div>
                </div>
                
                <div style="background: #f0f9ff; padding: 12px; border-radius: 8px; border: 2px solid #3b82f6;">
                    <div style="font-size: 13px; font-weight: 600; color: #3b82f6; margin-bottom: 8px;">📋 Vista previa</div>
                    <div id="pr-preview-container" style="font-size: 12px; max-height: 250px; overflow-y: auto;">
                        <div style="text-align: center; color: var(--text-light); padding: 12px;">Configurando...</div>
                    </div>
                </div>
                
                <div id="pr-warning" style="display: none; background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 10px 12px; font-size: 12px; color: #991b1b;"></div>
                
                <div style="display: flex; gap: 8px; margin-top: 4px;">
                    <button type="submit" class="btn primary" style="flex: 2; padding: 12px; font-size: 14px; background: #3b82f6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">✅ Aplicar a todo el rango</button>
                    <button type="button" onclick="closeProduccionRangoModal()" class="btn secondary" style="flex: 1; padding: 12px; font-size: 14px;">❌ Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    window._prState = { fechaBase, bloqueInfoBase, bloqueSelectBase };
    
    const form = document.getElementById('produccion-rango-form');
    form.addEventListener('submit', async (e) => { e.preventDefault(); await submitProduccionRango(); });
    
    modal.addEventListener('click', (e) => { if (e.target === modal) closeProduccionRangoModal(); });
    
    const escHandler = function(e) {
        if (e.key === 'Escape') { closeProduccionRangoModal(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);
    
    setTimeout(previewProduccionRango, 100);
}

function closeProduccionRangoModal() {
    const modal = document.getElementById('produccion-rango-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
    }
    window._prState = null;
}

function setRangoRapido(dias) {
    const inicio = document.getElementById('pr-fecha-inicio');
    const fin = document.getElementById('pr-fecha-fin');
    if (!inicio || !fin) return;
    const fechaBase = window._prState?.fechaBase || new Date().toISOString().split('T')[0];
    const finObj = new Date(fechaBase + 'T00:00:00');
    finObj.setDate(finObj.getDate() + (dias - 1));
    inicio.value = fechaBase;
    fin.value = window.CorrienteUtils.formatearFechaISO(finObj);
    previewProduccionRango();
}

function setRangoMesActual() {
    const inicio = document.getElementById('pr-fecha-inicio');
    const fin = document.getElementById('pr-fecha-fin');
    if (!inicio || !fin) return;
    const fechaBase = window._prState?.fechaBase || new Date().toISOString().split('T')[0];
    const [y, m] = fechaBase.split('-').map(Number);
    inicio.value = window.CorrienteUtils.formatearFechaISO(new Date(y, m - 1, 1));
    fin.value = window.CorrienteUtils.formatearFechaISO(new Date(y, m, 0));
    previewProduccionRango();
}

function getFechasDelRango() {
    const inicio = document.getElementById('pr-fecha-inicio')?.value;
    const fin = document.getElementById('pr-fecha-fin')?.value;
    const excluirDomingos = document.getElementById('pr-excluir-domingos')?.checked || false;
    const excluirSinCorriente = document.getElementById('pr-excluir-dias-sin-corriente')?.checked || false;
    
    if (!inicio || !fin || inicio > fin) return [];
    
    const fechas = [];
    const cursor = new Date(inicio + 'T00:00:00');
    const finObj = new Date(fin + 'T00:00:00');
    let iteraciones = 0;
    
    while (cursor <= finObj && iteraciones < 400) {
        const fechaStr = window.CorrienteUtils.formatearFechaISO(cursor);
        const diaSemana = cursor.getDay();
        
        let incluir = true;
        if (excluirDomingos && diaSemana === 0) incluir = false;
        if (incluir && excluirSinCorriente) {
            const bloques = window.CorrienteUtils.getBloques(fechaStr);
            if (!bloques || bloques.length === 0) incluir = false;
        }
        
        if (incluir) fechas.push(fechaStr);
        cursor.setDate(cursor.getDate() + 1);
        iteraciones++;
    }
    
    return fechas;
}

async function previewProduccionRango() {
    const container = document.getElementById('pr-preview-container');
    const warningEl = document.getElementById('pr-warning');
    if (!container) return;
    
    const fechas = getFechasDelRango();
    const cantidad = parseFloat(document.getElementById('pr-cantidad')?.value);
    const bloqueTipo = document.querySelector('input[name="pr-bloque-tipo"]:checked')?.value || 'relativo';
    
    if (warningEl) warningEl.style.display = 'none';
    
    if (fechas.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #ef4444; padding: 12px;">⚠️ El rango no genera ninguna fecha</div>';
        return;
    }
    
    if (isNaN(cantidad) || cantidad <= 0) {
        container.innerHTML = '<div style="text-align: center; color: #f59e0b; padding: 12px;">⚠️ Ingresa una cantidad válida mayor a 0</div>';
        return;
    }
    
    let produccionesExistentes = { total: 0, fechas: [] };
    try {
        const inicio = document.getElementById('pr-fecha-inicio').value;
        const fin = document.getElementById('pr-fecha-fin').value;
        if (window.DBModule && typeof window.DBModule.contarProduccionEnRango === 'function') {
            produccionesExistentes = window.DBModule.contarProduccionEnRango(inicio, fin);
        }
    } catch (e) {}
    
    const fechasSet = new Set(fechas);
    const produccionesAfectadas = produccionesExistentes.fechas.filter(f => fechasSet.has(f));
    
    if (warningEl && produccionesAfectadas.length > 0) {
        warningEl.innerHTML = `⚠️ <strong>Atención:</strong> ${produccionesAfectadas.length} día(s) del rango ya tienen producción programada. Serán <strong>sobrescritos</strong>.`;
        warningEl.style.display = 'block';
    }
    
    const bloqueInfoBase = window._prState?.bloqueInfoBase;
    const bloqueInfoTexto = bloqueInfoBase 
        ? `${bloqueInfoBase.inicioStr} - ${bloqueInfoBase.finStr} (${bloqueInfoBase.duracionHoras.toFixed(1)}h)`
        : 'Sin bloque definido';
    
    let previewHtml = `
        <div style="background: var(--bg); border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; font-size: 11px;">
            <div style="display: flex; justify-content: space-between; padding: 2px 0;"><span>📅 Días afectados:</span><strong style="color: #3b82f6;">${fechas.length}</strong></div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;"><span>📦 Cantidad por día:</span><strong style="color: #10b981;">${formatearCantidadProduccion(cantidad)}</strong></div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;"><span>🔨 Bloque:</span><strong style="color: #8b5cf6;">${bloqueInfoTexto}</strong></div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;"><span>🎯 Modo:</span><strong style="color: #f59e0b;">${bloqueTipo === 'relativo' ? 'Relativo' : 'Fijo'}</strong></div>
            ${produccionesAfectadas.length > 0 ? `<div style="display: flex; justify-content: space-between; padding: 2px 0; border-top: 1px dashed #ef4444; margin-top: 4px; padding-top: 4px;"><span style="color: #ef4444;">⚠️ A sobrescribir:</span><strong style="color: #ef4444;">${produccionesAfectadas.length} día(s)</strong></div>` : ''}
        </div>
        <div style="font-size: 11px; font-weight: 600; margin-bottom: 4px;">📋 Detalle (${fechas.length}):</div>
        <div style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px;">
    `;
    
    let fechasSinBloque = 0;
    
    for (const fecha of fechas) {
        const fechaObj = new Date(fecha + 'T00:00:00');
        const diaSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][fechaObj.getDay()];
        const diaMes = String(fechaObj.getDate()).padStart(2, '0');
        const mes = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][fechaObj.getMonth()];
        
        let infoBloque = '';
        let colorBorde = '#10b981';
        let bgColor = '#10b98110';
        let icono = '✅';
        
        const bloques = window.CorrienteUtils.getBloques(fecha);
        const tieneCorriente = bloques && bloques.length > 0;
        const prodExistente = getProduccionConfig(fecha);
        
        if (!tieneCorriente) {
            colorBorde = '#94a3b8';
            bgColor = '#94a3b810';
            icono = '🌙';
            infoBloque = '<span style="color: #94a3b8; font-size: 10px;">Sin corriente</span>';
            fechasSinBloque++;
        } else {
            let bloqueObj = null;
            
            if (bloqueTipo === 'relativo' && bloqueInfoBase) {
                const bloqueIndexBase = window._prState?.bloqueSelectBase?.match(/^(hoy|ayer)_(\d+)$/);
                if (bloqueIndexBase) {
                    const idxBase = parseInt(bloqueIndexBase[2]);
                    if (bloqueIndexBase[1] === 'ayer') {
                        bloqueObj = window.CorrienteUtils.getUltimoBloqueDiaAnterior(fecha);
                    } else {
                        bloqueObj = bloques[idxBase - 1] || null;
                    }
                }
            } else if (bloqueInfoBase) {
                const bloqueEq = bloques.find(b => b.inicioStr === bloqueInfoBase.inicioStr && b.finStr === bloqueInfoBase.finStr);
                bloqueObj = bloqueEq || bloques[0] || null;
            }
            
            if (bloqueObj) {
                infoBloque = `<span style="color: #8b5cf6; font-size: 10px;">🔨 ${bloqueObj.inicioStr} - ${bloqueObj.finStr}</span>`;
            } else {
                colorBorde = '#f59e0b';
                bgColor = '#f59e0b10';
                icono = '⚠️';
                infoBloque = '<span style="color: #f59e0b; font-size: 10px;">Sin bloque equivalente</span>';
                fechasSinBloque++;
            }
        }
        
        const prodBadge = prodExistente 
            ? `<span style="background: #ef444420; color: #ef4444; font-size: 9px; padding: 1px 6px; border-radius: 6px; margin-left: 4px;">Ya tiene: ${formatearCantidadProduccion(prodExistente.cantidad_produccion)}</span>` 
            : '';
        
        previewHtml += `
            <div style="display: flex; align-items: center; gap: 6px; padding: 4px 8px; background: ${bgColor}; border-left: 3px solid ${colorBorde}; border-radius: 4px; font-size: 11px;">
                <span>${icono}</span>
                <span style="font-weight: 600; min-width: 60px;">${diaSemana} ${diaMes} ${mes}</span>
                <span style="flex: 1;">${infoBloque}</span>
                ${prodBadge}
            </div>
        `;
    }
    
    previewHtml += '</div>';
    
    if (fechasSinBloque > 0) {
        previewHtml += `<div style="margin-top: 8px; padding: 6px 10px; background: #f59e0b15; border-left: 3px solid #f59e0b; border-radius: 6px; font-size: 11px; color: #92400e;">⚠️ ${fechasSinBloque} día(s) serán omitidos por no tener bloque equivalente.</div>`;
    }
    
    container.innerHTML = previewHtml;
}

async function submitProduccionRango() {
    const inicio = document.getElementById('pr-fecha-inicio')?.value;
    const fin = document.getElementById('pr-fecha-fin')?.value;
    const cantidad = parseFloat(document.getElementById('pr-cantidad')?.value);
    const notas = document.getElementById('pr-notas')?.value?.trim() || null;
    const bloqueTipo = document.querySelector('input[name="pr-bloque-tipo"]:checked')?.value || 'relativo';
    
    if (!inicio || !fin) { window.showToast('⚠️ Debes especificar fecha inicio y fin', 'error'); return; }
    if (inicio > fin) { window.showToast('⚠️ La fecha "desde" debe ser anterior a "hasta"', 'error'); return; }
    if (isNaN(cantidad) || cantidad <= 0) { window.showToast('⚠️ La cantidad debe ser mayor a 0', 'error'); return; }
    
    const fechas = getFechasDelRango();
    if (fechas.length === 0) { window.showToast('⚠️ El rango no genera fechas válidas', 'warning'); return; }
    
    const bloqueInfoBase = window._prState?.bloqueInfoBase;
    const bloqueSelectBase = window._prState?.bloqueSelectBase || '';
    const matchBase = bloqueSelectBase.match(/^(hoy|ayer)_(\d+)$/);
    const tipoBase = matchBase ? matchBase[1] : 'hoy';
    const indexBase = matchBase ? parseInt(matchBase[2]) : 1;
    const esBloqueAyerBase = tipoBase === 'ayer';
    
    let produccionesExistentes = { total: 0, fechas: [] };
    try {
        if (window.DBModule && typeof window.DBModule.contarProduccionEnRango === 'function') {
            produccionesExistentes = window.DBModule.contarProduccionEnRango(inicio, fin);
        }
    } catch (e) {}
    
    const fechasSet = new Set(fechas);
    const produccionesAfectadas = produccionesExistentes.fechas.filter(f => fechasSet.has(f));
    
    const msgConfirm = `¿Aplicar producción a ${fechas.length} día(s)?\n\n📅 Rango: ${inicio} → ${fin}\n📦 Cantidad por día: ${formatearCantidadProduccion(cantidad)}\n🔨 Bloque: ${bloqueInfoBase ? `${bloqueInfoBase.inicioStr} - ${bloqueInfoBase.finStr}` : 'según cada día'}\n🎯 Modo: ${bloqueTipo === 'relativo' ? 'Relativo' : 'Fijo'}\n${notas ? `📝 Notas: ${notas}\n` : ''}${produccionesAfectadas.length > 0 ? `\n⚠️ Se sobrescribirán ${produccionesAfectadas.length} producción(es).\n` : ''}\n¿Confirmas?`;
    
    const confirm = await window.ModalModule.showConfirm({
        title: '📅 Aplicar a rango',
        message: msgConfirm,
        confirmText: `✅ SÍ, APLICAR A ${fechas.length} DÍAS`,
        cancelText: '❌ Cancelar',
        icon: '📅',
        confirmColor: '#3b82f6'
    });
    
    if (!confirm) return;
    
    const exitos = [];
    const fallidos = [];
    
    for (const fecha of fechas) {
        try {
            let bloqueParaFecha = null;
            let esBloqueAyerFecha = false;
            
            if (bloqueTipo === 'relativo') {
                if (esBloqueAyerBase) {
                    const bloqueAyer = window.CorrienteUtils.getUltimoBloqueDiaAnterior(fecha);
                    if (!bloqueAyer) { fallidos.push(`${fecha}: sin bloque de ayer`); continue; }
                    bloqueParaFecha = bloqueAyer;
                    esBloqueAyerFecha = true;
                } else {
                    const bloques = window.CorrienteUtils.getBloques(fecha);
                    if (!bloques || bloques.length < indexBase) { fallidos.push(`${fecha}: sin bloque ${indexBase}`); continue; }
                    bloqueParaFecha = bloques[indexBase - 1];
                }
            } else {
                if (!bloqueInfoBase) { fallidos.push(`${fecha}: sin bloque base`); continue; }
                const bloques = window.CorrienteUtils.getBloques(fecha);
                if (!bloques || bloques.length === 0) { fallidos.push(`${fecha}: sin corriente`); continue; }
                const bloqueEq = bloques.find(b => b.inicioStr24 === bloqueInfoBase.inicioStr24 && b.finStr24 === bloqueInfoBase.finStr24);
                if (!bloqueEq) { fallidos.push(`${fecha}: sin bloque en horario ${bloqueInfoBase.inicioStr24}-${bloqueInfoBase.finStr24}`); continue; }
                bloqueParaFecha = bloqueEq;
            }
            
            if (!bloqueParaFecha) { fallidos.push(`${fecha}: sin bloque`); continue; }
            
            let bloqueIndexGuardar;
            let fechaBloqueRealGuardar;
            
            if (esBloqueAyerFecha) {
                bloqueIndexGuardar = bloqueParaFecha.indexEnDiaAnterior;
                fechaBloqueRealGuardar = bloqueParaFecha.fechaBloqueReal;
            } else {
                const bloquesDia = window.CorrienteUtils.getBloques(fecha);
                bloqueIndexGuardar = bloquesDia.indexOf(bloqueParaFecha) + 1;
                fechaBloqueRealGuardar = fecha;
            }
            
            exitos.push({
                fecha,
                hora_inicio: bloqueParaFecha.inicioStr24,
                hora_fin: bloqueParaFecha.finStr24,
                bloque_index: bloqueIndexGuardar,
                cantidad_produccion: cantidad,
                notas: notas,
                es_bloque_dia_anterior: esBloqueAyerFecha ? 1 : 0,
                fecha_bloque_real: fechaBloqueRealGuardar
            });
        } catch (e) { fallidos.push(`${fecha}: ${e.message}`); }
    }
    
    if (exitos.length === 0) {
        window.showToast('❌ No se pudo preparar ninguna fecha válida', 'error', 6000);
        return;
    }
    
    try {
        window.showToast(`⏳ Aplicando producción a ${exitos.length} día(s)...`, 'info', 3000);
        
        const grupos = {};
        for (const ex of exitos) {
            const key = `${ex.hora_inicio}|${ex.hora_fin}|${ex.bloque_index}|${ex.es_bloque_dia_anterior}|${ex.fecha_bloque_real}`;
            if (!grupos[key]) {
                grupos[key] = {
                    hora_inicio: ex.hora_inicio, hora_fin: ex.hora_fin,
                    bloque_index: ex.bloque_index,
                    es_bloque_dia_anterior: ex.es_bloque_dia_anterior,
                    fecha_bloque_real: ex.fecha_bloque_real,
                    fechas: []
                };
            }
            grupos[key].fechas.push(ex.fecha);
        }
        
        let totalCreados = 0;
        let totalActualizados = 0;
        const errores = [];
        
        for (const key in grupos) {
            const grupo = grupos[key];
            const result = window.DBModule.saveProduccionRango({
                fechas: grupo.fechas,
                hora_inicio: grupo.hora_inicio,
                hora_fin: grupo.hora_fin,
                bloque_index: grupo.bloque_index,
                cantidad_produccion: cantidad,
                notas: notas,
                es_bloque_dia_anterior: grupo.es_bloque_dia_anterior,
                fecha_bloque_real: grupo.fecha_bloque_real
            });
            if (result.success) {
                totalCreados += result.creados || 0;
                totalActualizados += result.actualizados || 0;
            } else {
                errores.push(result.error || 'Error desconocido');
            }
        }
        
        if (errores.length > 0) window.showToast(`⚠️ Algunos grupos fallaron: ${errores.length}`, 'warning', 5000);
        
        let msgFinal = `✅ Producción aplicada: ${totalCreados} nuevo(s)`;
        if (totalActualizados > 0) msgFinal += `, ${totalActualizados} actualizado(s)`;
        if (fallidos.length > 0) msgFinal += ` · ${fallidos.length} omitido(s)`;
        window.showToast(msgFinal, 'success', 6000);
        
        closeProduccionRangoModal();
        closeHorarioDetalleModal();
        
        setTimeout(() => {
            renderCorrienteCalendario();
            if (exitos.length > 0) showHorarioDetalle(exitos[0].fecha);
        }, 500);
        
        if (typeof window.loadDashboardData === 'function') setTimeout(window.loadDashboardData, 1000);
        
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error', 6000);
    }
}

window.showProduccionRangoModal = showProduccionRangoModal;
window.closeProduccionRangoModal = closeProduccionRangoModal;
window.previewProduccionRango = previewProduccionRango;
window.submitProduccionRango = submitProduccionRango;
window.setRangoRapido = setRangoRapido;
window.setRangoMesActual = setRangoMesActual;
window.getFechasDelRango = getFechasDelRango;

// ============================================================
// CONSULTAR HORARIOS
// ============================================================

function consultarHorariosFecha() {
    const fecha = document.getElementById('consultar-fecha').value;
    const resultado = document.getElementById('consultar-resultado');
    if (!fecha || !resultado) return;

    const bloques = window.CorrienteUtils.getBloques(fecha);
    const bloqueAyer = window.CorrienteUtils.getUltimoBloqueDiaAnterior(fecha);
    const prodConfig = getProduccionConfig(fecha);
    const conteo = contarPedidosYVentasFecha(fecha);
    
    const dateObj = new Date(fecha + 'T00:00:00');
    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const fechaDisplay = `${diasSemana[dateObj.getDay()]}, ${dateObj.getDate()} de ${meses[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;

    if (!bloques || bloques.length === 0) {
        resultado.innerHTML = `
            <div style="text-align: center; color: var(--text-light); font-size: 13px;">
                <span style="font-size: 28px;">🌙</span>
                <p style="text-transform: capitalize;">${fechaDisplay}: <strong>Sin corriente</strong></p>
                ${bloqueAyer ? `<p style="font-size: 11px; color: #8b5cf6;">🌙 Último bloque de ayer: ${bloqueAyer.inicioStr} - ${bloqueAyer.finStr}</p>` : ''}
                ${prodConfig ? `<p style="font-size: 12px; color: #8b5cf6;">🔨 Producción: ${formatearCantidadProduccion(prodConfig.cantidad_produccion)} unidades</p>` : ''}
            </div>
        `;
        return;
    }

    let totalHoras = 0;
    let horariosHtml = bloques.map((h, i) => {
        totalHoras += h.duracionHoras;
        const esProd = prodConfig && prodConfig.bloque_index === (i + 1) && prodConfig.es_bloque_dia_anterior !== 1;
        return `<div style="display: inline-block; background: ${esProd ? '#8b5cf620' : '#f59e0b20'}; color: ${esProd ? '#8b5cf6' : '#f59e0b'}; padding: 3px 10px; border-radius: 10px; margin: 2px; font-size: 12px;">${esProd ? '🔨' : '🟢'} ${h.inicioStr} - 🔴 ${h.finStr}</div>`;
    }).join(' ');

    let produccionInfo = '';
    if (prodConfig) {
        const esAyer = prodConfig.es_bloque_dia_anterior === 1;
        produccionInfo = `
            <div style="background: #8b5cf615; border: 1px solid #8b5cf6; border-radius: 6px; padding: 8px 10px; margin-top: 8px; font-size: 12px;">
                <div style="color: #8b5cf6; font-weight: 600; margin-bottom: 4px;">🔨 Producción programada${esAyer ? ' 🌙' : ''}</div>
                <div style="display: flex; justify-content: space-between;"><span>📦 Cantidad:</span><strong>${formatearCantidadProduccion(prodConfig.cantidad_produccion)}</strong></div>
                <div style="display: flex; justify-content: space-between;"><span>📋 Pedidos:</span><strong>${conteo.pedidos}</strong></div>
                <div style="display: flex; justify-content: space-between;"><span>💰 Ventas:</span><strong>${conteo.ventas}</strong></div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-color); margin-top: 4px; padding-top: 4px;">
                    <span>✅ Disponibles:</span>
                    <strong style="color: ${conteo.disponibles > 0 ? '#10b981' : '#ef4444'};">${formatearCantidadProduccion(conteo.disponibles)} / ${formatearCantidadProduccion(conteo.cantidadProduccion)}</strong>
                </div>
            </div>
        `;
    }

    resultado.innerHTML = `
        <div style="text-align: center; font-size: 13px;">
            <h4 style="margin: 4px 0; font-size: 14px; text-transform: capitalize;">${fechaDisplay}</h4>
            <div style="margin: 6px 0;">${horariosHtml}</div>
            <p style="font-size: 12px; color: var(--text-light);">📦 ${bloques.length} bloque(s) | ⏰ Total: <strong>${totalHoras.toFixed(1)} horas</strong></p>
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

    if (!desde || !hasta) { window.showToast('⚠️ Selecciona un rango de fechas', 'error'); return; }
    if (desde > hasta) { window.showToast('⚠️ La fecha "desde" debe ser anterior a "hasta"', 'error'); return; }

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
        const bloqueAyer = window.CorrienteUtils.getUltimoBloqueDiaAnterior(dateStr);
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
            bloqueAyerTexto: bloqueAyer ? `${bloqueAyer.inicioStr} - ${bloqueAyer.finStr}` : null,
            produccion: prodConfig ? formatearCantidadProduccion(prodConfig.cantidad_produccion) : null,
            esBloqueAyer: prodConfig ? (prodConfig.es_bloque_dia_anterior === 1) : false,
            bloquesUsados: prodConfig ? (prodConfig.bloques_usados || 1) : 0
        });
    }

    const config = window.CorrienteUtils.getConfig();

    const reportHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
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
                td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
                tr:nth-child(even) { background: #fafafa; }
                .sin-corriente { color: #94a3b8; }
                .con-corriente { color: #f59e0b; font-weight: 600; }
                .bloques-badge { display: inline-block; background: #f59e0b20; padding: 1px 6px; border-radius: 8px; font-size: 10px; color: #f59e0b; }
                .produccion-badge { display: inline-block; background: #8b5cf620; padding: 1px 6px; border-radius: 8px; font-size: 10px; color: #8b5cf6; font-weight: 600; }
                .produccion-badge-ayer { display: inline-block; background: #8b5cf640; padding: 1px 6px; border-radius: 8px; font-size: 10px; color: #7c3aed; font-weight: 600; border: 1px dashed #8b5cf6; }
                .multi-bloque { display: inline-block; background: #10b98120; padding: 1px 6px; border-radius: 8px; font-size: 9px; color: #10b981; font-weight: 600; margin-left: 4px; }
                .ayer-info { display: block; font-size: 9px; color: #8b5cf6; margin-top: 1px; }
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
                            <td class="${row.horas > 0 ? 'con-corriente' : 'sin-corriente'}">
                                ${row.horarios}
                                ${row.bloqueAyerTexto ? `<span class="ayer-info">🌙 Último bloque de ayer: ${row.bloqueAyerTexto}</span>` : ''}
                            </td>
                            <td style="text-align: center;">${row.numBloques > 0 ? `<span class="bloques-badge">${row.numBloques}</span>` : '—'}</td>
                            <td style="text-align: right; font-weight: ${row.horas > 0 ? '700' : '400'}; color: ${row.horas > 0 ? '#f59e0b' : '#94a3b8'};">${row.horas > 0 ? row.horas.toFixed(1) + 'h' : '—'}</td>
                            <td style="text-align: center;">
                                ${row.produccion 
                                    ? `<span class="${row.esBloqueAyer ? 'produccion-badge-ayer' : 'produccion-badge'}">${row.produccion}${row.esBloqueAyer ? ' 🌙' : ''}</span>${row.bloquesUsados > 1 ? `<span class="multi-bloque">${row.bloquesUsados} bloques</span>` : ''}` 
                                    : '—'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="nota">
                💡 Los horarios se generan automáticamente basados en el patrón configurado.
                <br>🔄 Ciclo: ${config.horasCorriente || 3}h corriente / ${config.horasApagon || 12}h apagón
                <br>🔨 = Día con producción programada
                <br>🌙 = Producción programada en el último bloque del día anterior
                <br>🔢 = Día con múltiples bloques de producción (ver tooltip en la app)
            </div>

            <div class="footer">
                Reporte generado desde Panario 🍞 - ${new Date().toLocaleString('es-ES')}
            </div>
        </body>
        </html>
    `;

    const win = window.open('', '_blank');
    if (!win) { window.showToast('❌ Permite ventanas emergentes', 'error'); return; }

    win.document.write(reportHtml);
    win.document.close();
    win.print();

    window.showToast('✅ Reporte generado', 'success');
}

// ============================================================
// REPORTE DE GASTOS
// ============================================================

function showExpensesReportModal() {
    if (window.ModalModule?.cerrarTodosLosModales) window.ModalModule.cerrarTodosLosModales();
    
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
            
            <form id="expenses-report-form" style="display: flex; flex-direction: column; gap: 12px;">
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 12px; font-weight: 600; margin-bottom: 8px;">📅 Rango de fechas</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div><label style="font-size: 12px;">Desde</label><input type="date" id="report-expenses-from" value="${primerDia.toISOString().split('T')[0]}" class="input-field"></div>
                        <div><label style="font-size: 12px;">Hasta</label><input type="date" id="report-expenses-to" value="${ultimoDia.toISOString().split('T')[0]}" class="input-field"></div>
                    </div>
                </div>
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 12px; font-weight: 600; margin-bottom: 8px;">🔍 Filtros opcionales</div>
                    <div class="form-group" style="margin-bottom: 8px;">
                        <label style="font-size: 12px;">📂 Categoría</label>
                        <select id="report-expenses-category" class="input-select">
                            <option value="">Todas</option>
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
                            <option value="">Todos</option>
                            <option value="cash">💵 Efectivo</option>
                            <option value="transfer">🏦 Transferencia</option>
                            <option value="other">🔄 Otra</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label style="font-size: 12px;">📝 Concepto</label>
                        <input type="text" id="report-expenses-search" placeholder="Ej: harina" class="input-field">
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" style="flex: 1;">📄 Generar Reporte</button>
                    <button type="button" onclick="closeExpensesReportModal()" class="btn secondary" style="flex: 1;">❌ Cancelar</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    const form = document.getElementById('expenses-report-form');
    form.addEventListener('submit', async (e) => { e.preventDefault(); generateExpensesReportFromForm(); });
    modal.addEventListener('click', (e) => { if (e.target === modal) closeExpensesReportModal(); });
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
    if (!negocioId) { window.showToast('❌ No hay negocio activo', 'error'); return; }

    let sql = `SELECT * FROM transactions WHERE negocio_id = ? AND type = 'expense' AND deleted_at IS NULL AND voided = 0`;
    let params = [negocioId];

    if (filters.from_date) { sql += ' AND DATE(transaction_date, "localtime") >= DATE(?)'; params.push(filters.from_date); }
    if (filters.to_date) { sql += ' AND DATE(transaction_date, "localtime") <= DATE(?)'; params.push(filters.to_date); }
    if (filters.category) { sql += ' AND category = ?'; params.push(filters.category); }
    if (filters.payment_method) { sql += ' AND payment_method = ?'; params.push(filters.payment_method); }
    if (filters.search) { sql += ' AND concept LIKE ?'; params.push('%' + filters.search + '%'); }
    sql += ' ORDER BY transaction_date DESC, id ASC';

    const expenses = window.DBModule.query(sql, params);

    if (expenses.length === 0) { window.showToast('⚠️ No hay gastos en el período', 'warning'); return; }

    const totalGastos = expenses.reduce((sum, e) => sum + e.amount, 0);
    const porCategoria = {};
    const porOrigen = {};

    expenses.forEach(e => {
        const cat = e.category || 'otros';
        if (!porCategoria[cat]) porCategoria[cat] = { count: 0, total: 0 };
        porCategoria[cat].count++; porCategoria[cat].total += e.amount;
        const origen = e.payment_method || 'cash';
        if (!porOrigen[origen]) porOrigen[origen] = { count: 0, total: 0 };
        porOrigen[origen].count++; porOrigen[origen].total += e.amount;
    });

    const categoriaLabels = { 'insumos': '🛒 Insumos', 'materiales': '📦 Materiales', 'transporte': '🚗 Transporte', 'inversion': '💼 Inversión', 'otros': '🔄 Otros', 'gasto': '📤 General' };
    const origenLabels = { 'cash': '💵 Efectivo', 'transfer': '🏦 Transferencia', 'other': '🔄 Otra' };
    const periodo = filters.from_date && filters.to_date ? `${new Date(filters.from_date).toLocaleDateString('es-ES')} al ${new Date(filters.to_date).toLocaleDateString('es-ES')}` : 'Todos los períodos';

    const html = `
        <!DOCTYPE html>
        <html><head><meta charset="UTF-8"><title>Reporte de Gastos</title>
        <style>
            * { font-family: system-ui, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
            body { padding: 20px; background: #fff; }
            .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #ef4444; padding-bottom: 15px; }
            .header h1 { color: #ef4444; font-size: 24px; }
            .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 25px; }
            .summary-card { background: #f8f9fa; padding: 12px 16px; border-radius: 8px; text-align: center; border-left: 4px solid #ef4444; }
            .summary-card .number { font-size: 22px; font-weight: 700; color: #ef4444; }
            .summary-card .label { font-size: 11px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th { background: #ef4444; color: #fff; padding: 8px 10px; text-align: left; font-size: 12px; }
            td { padding: 6px 10px; border-bottom: 1px solid #eee; }
            tr:nth-child(even) { background: #fafafa; }
            .footer { margin-top: 25px; text-align: center; color: #94a3b8; font-size: 11px; }
        </style></head><body>
        <div class="header"><h1>📤 Reporte de Gastos</h1><p>${periodo}</p></div>
        <div class="summary">
            <div class="summary-card"><div class="number">${expenses.length}</div><div class="label">📊 Total Gastos</div></div>
            <div class="summary-card"><div class="number">$${totalGastos.toFixed(2)}</div><div class="label">💰 Monto Total</div></div>
        </div>
        <h3>📂 Desglose por Categoría</h3>
        <table><thead><tr><th>Categoría</th><th>Cantidad</th><th>Total</th></tr></thead>
        <tbody>${Object.entries(porCategoria).map(([cat, data]) => `<tr><td>${categoriaLabels[cat] || cat}</td><td>${data.count}</td><td>$${data.total.toFixed(2)}</td></tr>`).join('')}</tbody></table>
        <h3 style="margin-top:20px;">📋 Detalle</h3>
        <table><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Monto</th></tr></thead>
        <tbody>${expenses.slice(0, 100).map(e => `<tr><td>${new Date(e.transaction_date).toLocaleDateString('es-ES')}</td><td>${e.concept}</td><td>${categoriaLabels[e.category] || e.category || '—'}</td><td style="color: #ef4444;">-$${e.amount.toFixed(2)}</td></tr>`).join('')}</tbody></table>
        <div class="footer">Reporte generado desde Panario 🍞 - ${new Date().toLocaleString('es-ES')}</div>
        </body></html>
    `;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500); }
    closeExpensesReportModal();
    window.showToast('✅ Reporte de gastos generado', 'success');
}

function closeExpensesReportModal() {
    const modal = document.getElementById('expenses-report-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
    }
}

// ============================================================
// LISTA DE ESPERA EN HERRAMIENTAS
// ============================================================

function showWaitingListFromSettings() {
    if (typeof window.showWaitingListManagerModal === 'function') {
        window.showWaitingListManagerModal();
    } else {
        window.showToast('⚠️ Módulo de lista de espera no disponible', 'warning', 4000);
    }
}

async function reporteListaEsperaFromSettings() {
    if (typeof window.reporteListaEspera === 'function') {
        window.reporteListaEspera();
    } else if (window.ReportsModule && typeof window.ReportsModule.generateWaitingListReport === 'function') {
        try {
            window.showToast('⏳ Generando reporte...', 'info', 2000);
            const html = await window.ReportsModule.generateWaitingListReport();
            if (html) { window.ReportsModule.printReport(html); window.showToast('✅ Reporte generado', 'success', 3000); }
        } catch (error) {
            window.showToast('❌ Error: ' + error.message, 'error', 5000);
        }
    }
}

// ============================================================
// CANCELACIÓN GLOBAL DE PEDIDOS
// ============================================================

function showGlobalCancelModal() {
    const user = window.AuthModule.getCurrentUser();
    if (!user || user.is_admin !== 1) {
        window.showToast('🔒 Solo el administrador puede cancelar pedidos globalmente', 'warning', 4000);
        return;
    }
    
    if (window.ModalModule?.cerrarTodosLosModales) window.ModalModule.cerrarTodosLosModales();
    
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
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 520px; width: 100%; max-height: 92vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 2px solid #dc2626;">
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
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 12px; color: #991b1b;">
                ⚠️ <strong>ATENCIÓN:</strong> Esta acción cancelará TODOS los pedidos <strong>Pendientes, Confirmados, En producción y Listos</strong> dentro del rango de fechas.
                <br>✅ Se repondrá el stock. ✅ Los ENTREGADOS no se ven afectados.
            </div>
            
            <form id="global-cancel-form" style="display: flex; flex-direction: column; gap: 14px;">
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">📅 Rango de fechas</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group"><label style="font-size: 12px;">Desde</label><input type="date" id="global-cancel-from" value="${hoy.toISOString().split('T')[0]}" class="input-field" required></div>
                        <div class="form-group"><label style="font-size: 12px;">Hasta</label><input type="date" id="global-cancel-to" value="${en7dias.toISOString().split('T')[0]}" class="input-field" required></div>
                    </div>
                </div>
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">📌 Causa</div>
                    <select id="global-cancel-causa" class="input-select" required>
                        <option value="Falta de insumos">🛒 Falta de insumos</option>
                        <option value="Apagón prolongado">⚡ Apagón prolongado</option>
                        <option value="Mantenimiento de equipos">🔧 Mantenimiento</option>
                        <option value="Cierre temporal">🚪 Cierre temporal</option>
                        <option value="Problema de salud">🏥 Problema de salud</option>
                        <option value="Fuerza mayor">⚠️ Fuerza mayor</option>
                        <option value="Otro">🔄 Otro</option>
                    </select>
                </div>
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">📝 Nota (opcional)</div>
                    <textarea id="global-cancel-nota" class="input-textarea" rows="2" placeholder="Ej: Se reanuda próxima semana"></textarea>
                </div>
                
                <div style="display: flex; gap: 8px;">
                    <button type="submit" class="btn" style="flex: 1; padding: 12px; background: #dc2626; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">🚨 CANCELAR PEDIDOS</button>
                    <button type="button" onclick="closeGlobalCancelModal()" class="btn secondary" style="flex: 1; padding: 12px;">❌ Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const form = document.getElementById('global-cancel-form');
    form.addEventListener('submit', async (e) => { e.preventDefault(); await executeGlobalCancel(); });
    
    modal.addEventListener('click', (e) => { if (e.target === modal) closeGlobalCancelModal(); });
}

function closeGlobalCancelModal() {
    const modal = document.getElementById('global-cancel-modal');
    if (modal) { modal.style.animation = 'modalFadeOut 0.2s ease forwards'; setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200); }
}

async function executeGlobalCancel() {
    const fechaDesde = document.getElementById('global-cancel-from')?.value;
    const fechaHasta = document.getElementById('global-cancel-to')?.value;
    const causa = document.getElementById('global-cancel-causa')?.value || '';
    const nota = document.getElementById('global-cancel-nota')?.value?.trim() || '';
    
    if (!fechaDesde || !fechaHasta) { window.showToast('⚠️ Especifica fecha desde y hasta', 'error'); return; }
    if (fechaDesde > fechaHasta) { window.showToast('⚠️ Fecha "desde" debe ser anterior a "hasta"', 'error'); return; }
    
    const negocioId = window.DBModule.getNegocioIdActual();
    const pedidosEnRango = window.DBModule.query(`
        SELECT COUNT(*) as n FROM orders
        WHERE negocio_id = ? AND deleted_at IS NULL
          AND status IN ('pending', 'confirmed', 'production', 'ready')
          AND DATE(delivery_date) >= DATE(?) AND DATE(delivery_date) <= DATE(?)
    `, [negocioId, fechaDesde, fechaHasta]);
    
    const count = pedidosEnRango[0]?.n || 0;
    if (count === 0) { window.showToast(`ℹ️ No hay pedidos cancelables en el rango`, 'info', 5000); return; }
    
    const confirm1 = await window.ModalModule.showConfirm({
        title: '⚠️ Confirmar cancelación',
        message: `Se cancelarán ${count} pedido(s) entre ${fechaDesde} y ${fechaHasta}.\n\n📌 Causa: ${causa}\n${nota ? `📝 Nota: ${nota}\n\n` : ''}¿Continuar?`,
        confirmText: '⚠️ CONTINUAR', cancelText: '❌ Cancelar',
        icon: '⚠️', confirmColor: '#f59e0b'
    });
    if (!confirm1) return;
    
    const confirm2 = await window.ModalModule.showConfirm({
        title: '🚨 CONFIRMACIÓN FINAL',
        message: `ÚLTIMA advertencia.\n\nSe cancelarán ${count} pedido(s).\n\n¿Confirmas?`,
        confirmText: '🚨 SÍ, CANCELAR TODO', cancelText: '❌ NO, volver',
        icon: '🚨', confirmColor: '#dc2626'
    });
    if (!confirm2) { window.showToast('❌ Cancelación abortada', 'info', 2000); return; }
    
    closeGlobalCancelModal();
    
    try {
        window.showToast('⏳ Cancelando pedidos...', 'info', 3000);
        const result = await window.OrdersModule.cancelarPedidosGlobalmente(fechaDesde, fechaHasta, causa, nota);
        
        if (!result.success) { window.showToast('❌ Error: ' + (result.error || 'Desconocido'), 'error', 6000); return; }
        
        await window.ModalModule.showAlert({
            title: '✅ Cancelación global exitosa',
            message: `✅ Cancelación completada.\n\n🚫 Pedidos cancelados: ${result.cancelados}\n🔄 Items reiniciados: ${result.reiniciados}\n⏰ Items preservados: ${result.preservados}\n\n📌 Causa: ${result.notaFinal}`,
            icon: '✅', type: 'success'
        });
        
        window.showToast(`✅ ${result.cancelados} pedido(s) cancelado(s)`, 'success', 5000);
        
        if (typeof window.refreshCurrentView === 'function') setTimeout(window.refreshCurrentView, 500);
        if (typeof window.loadDashboardData === 'function') setTimeout(window.loadDashboardData, 800);
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error', 6000);
    }
}

// ============================================================
// REPROGRAMAR PEDIDOS POR RANGO
// 🆕 v2.2.1: CORRECCIÓN FINAL #1 - Vista previa se limpia al abrir
// ============================================================

function showReprogramarPedidosModal() {
    const user = window.AuthModule.getCurrentUser();
    if (!user || user.is_admin !== 1) { window.showToast('🔒 Solo el administrador', 'warning', 4000); return; }
    
    if (window.ModalModule?.cerrarTodosLosModales) window.ModalModule.cerrarTodosLosModales();
    
    const existingModal = document.getElementById('reprogramar-modal');
    if (existingModal) existingModal.remove();
    
    const hoy = new Date();
    const en7dias = new Date(hoy); en7dias.setDate(en7dias.getDate() + 7);
    const en14dias = new Date(hoy); en14dias.setDate(en14dias.getDate() + 14);
    
    const modal = document.createElement('div');
    modal.id = 'reprogramar-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999999; padding: 15px;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 560px; width: 100%; max-height: 92vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 2px solid #8b5cf6;">
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
            
            <div style="background: #f5f3ff; border: 1px solid #c4b5fd; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 12px; color: #5b21b6;">
                💡 Los pedidos en el rango de origen se moverán a la fecha destino. La causa y nota se añadirán a cada pedido.
            </div>
            
            <form id="reprogramar-form" style="display: flex; flex-direction: column; gap: 14px;">
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">📅 Rango ORIGEN</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group"><label style="font-size: 12px;">Desde</label><input type="date" id="reprogramar-from" value="${hoy.toISOString().split('T')[0]}" class="input-field" required onchange="actualizarPreviewReprogramacion()"></div>
                        <div class="form-group"><label style="font-size: 12px;">Hasta</label><input type="date" id="reprogramar-to" value="${en7dias.toISOString().split('T')[0]}" class="input-field" required onchange="actualizarPreviewReprogramacion()"></div>
                    </div>
                </div>
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">👤 Filtrar por cliente (opcional)</div>
                    <input type="text" id="reprogramar-cliente" class="input-field" placeholder="Dejar vacío para todos" oninput="actualizarPreviewReprogramacion()">
                </div>
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid #10b981;">
                    <div style="font-size: 13px; font-weight: 600; color: #10b981; margin-bottom: 8px;">🎯 Fecha DESTINO</div>
                    <input type="date" id="reprogramar-destino" value="${en14dias.toISOString().split('T')[0]}" class="input-field" required onchange="actualizarPreviewReprogramacion()">
                </div>
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">📌 Causa</div>
                    <select id="reprogramar-causa" class="input-select" required>
                        ${MOTIVOS_REPROGRAMACION.map(m => `<option value="${m.value}">${m.label}</option>`).join('')}
                    </select>
                </div>
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">📝 Nota (opcional)</div>
                    <textarea id="reprogramar-nota" class="input-textarea" rows="2" placeholder="Ej: Se pospone"></textarea>
                </div>
                
                <div id="reprogramar-preview" style="background: #f0f9ff; padding: 12px; border-radius: 8px; border: 2px solid #3b82f6; font-size: 12px;">
                    <div style="text-align: center; color: var(--text-light);">Cargando vista previa...</div>
                </div>
                
                <div style="display: flex; gap: 8px;">
                    <button type="submit" class="btn" style="flex: 1; padding: 12px; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">🔄 REPROGRAMAR</button>
                    <button type="button" onclick="closeReprogramarModal()" class="btn secondary" style="flex: 1; padding: 12px;">❌ Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 🆕 CORRECCIÓN FINAL #1: Inicializar la vista previa VACÍA
    // en lugar de mostrar el resultado de la última operación.
    const previewEl = document.getElementById('reprogramar-preview');
    if (previewEl) {
        previewEl.innerHTML = `
            <div style="text-align: center; color: var(--text-light); padding: 6px;">
                ℹ️ Selecciona un rango de fechas y una fecha destino para ver la vista previa.
            </div>
        `;
    }
    
    const form = document.getElementById('reprogramar-form');
    form.addEventListener('submit', async (e) => { e.preventDefault(); await executeReprogramarPedidos(); });
    modal.addEventListener('click', (e) => { if (e.target === modal) closeReprogramarModal(); });
    
    // 🆕 CORRECCIÓN FINAL #1: NO llamar a actualizarPreviewReprogramacion() automáticamente
    // al abrir el modal. La vista previa queda vacía hasta que el usuario cambia fechas.
    // (Antes había: setTimeout(actualizarPreviewReprogramacion, 100);)
}

function closeReprogramarModal() {
    const modal = document.getElementById('reprogramar-modal');
    if (modal) { modal.style.animation = 'modalFadeOut 0.2s ease forwards'; setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200); }
}

function actualizarPreviewReprogramacion() {
    const preview = document.getElementById('reprogramar-preview');
    if (!preview) return;
    
    const fromDate = document.getElementById('reprogramar-from')?.value;
    const toDate = document.getElementById('reprogramar-to')?.value;
    const cliente = document.getElementById('reprogramar-cliente')?.value?.trim() || '';
    const destinoDate = document.getElementById('reprogramar-destino')?.value;
    
    // 🆕 CORRECCIÓN FINAL #1: Si faltan datos, mostrar mensaje informativo (no error)
    if (!fromDate || !toDate || !destinoDate) { 
        preview.innerHTML = '<div style="text-align: center; color: var(--text-light); padding: 6px;">ℹ️ Selecciona las fechas para ver la vista previa</div>'; 
        return; 
    }
    if (fromDate > toDate) { preview.innerHTML = '<div style="text-align: center; color: #ef4444;">⚠️ La fecha "desde" debe ser anterior a "hasta"</div>'; return; }
    if (destinoDate >= fromDate && destinoDate <= toDate) { preview.innerHTML = '<div style="text-align: center; color: #f59e0b;">⚠️ La fecha destino está dentro del rango origen</div>'; return; }
    
    const negocioId = window.DBModule.getNegocioIdActual();
    let sql = `SELECT id, client_name, total, status, delivery_date FROM orders WHERE negocio_id = ? AND deleted_at IS NULL AND status IN ('pending', 'confirmed', 'production', 'ready') AND DATE(delivery_date) >= DATE(?) AND DATE(delivery_date) <= DATE(?)`;
    let params = [negocioId, fromDate, toDate];
    if (cliente) { sql += ' AND LOWER(client_name) LIKE LOWER(?)'; params.push('%' + cliente + '%'); }
    sql += ' ORDER BY delivery_date ASC, id ASC';
    
    const pedidos = window.DBModule.query(sql, params);
    
    if (pedidos.length === 0) { preview.innerHTML = '<div style="text-align: center; color: var(--text-light);">📭 No hay pedidos en el rango</div>'; return; }
    
    const totalMonto = pedidos.reduce((sum, p) => sum + (p.total || 0), 0);
    
    preview.innerHTML = `
        <div style="margin-bottom: 8px;"><strong style="color: #3b82f6;">📋 Vista previa (${pedidos.length} pedido${pedidos.length > 1 ? 's' : ''})</strong></div>
        <div style="display: flex; justify-content: space-between; padding: 3px 0;"><span>📅 Fecha destino:</span><strong>${destinoDate}</strong></div>
        <div style="display: flex; justify-content: space-between; padding: 3px 0;"><span>💰 Monto total:</span><strong style="color: #10b981;">$${totalMonto.toFixed(2)}</strong></div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #93c5fd; max-height: 120px; overflow-y: auto;">
            ${pedidos.slice(0, 10).map(p => `<div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; color: var(--text-light);"><span>#${p.id} - ${p.client_name}</span><span>📅 ${p.delivery_date.split('T')[0]} → ${destinoDate}</span></div>`).join('')}
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
    
    if (!fechaDesde || !fechaHasta || !fechaDestino) { window.showToast('⚠️ Completa todas las fechas', 'error'); return; }
    if (fechaDesde > fechaHasta) { window.showToast('⚠️ Fecha "desde" debe ser anterior a "hasta"', 'error'); return; }
    if (fechaDestino >= fechaDesde && fechaDestino <= fechaHasta) { window.showToast('⚠️ Fecha destino no puede estar en rango origen', 'error'); return; }
    
    const negocioId = window.DBModule.getNegocioIdActual();
    let countSql = `SELECT COUNT(*) as n FROM orders WHERE negocio_id = ? AND deleted_at IS NULL AND status IN ('pending', 'confirmed', 'production', 'ready') AND DATE(delivery_date) >= DATE(?) AND DATE(delivery_date) <= DATE(?)`;
    let countParams = [negocioId, fechaDesde, fechaHasta];
    if (clienteFiltro) { countSql += ' AND LOWER(client_name) LIKE LOWER(?)'; countParams.push('%' + clienteFiltro + '%'); }
    
    const countResult = window.DBModule.query(countSql, countParams);
    const count = countResult[0]?.n || 0;
    
    if (count === 0) { window.showToast('ℹ️ No hay pedidos para reprogramar', 'info', 4000); return; }
    
    const confirm1 = await window.ModalModule.showConfirm({
        title: '🔄 Confirmar reprogramación',
        message: `Se moverán ${count} pedido(s):\n📅 ${fechaDesde} → ${fechaHasta}\n\nHacia:\n🎯 ${fechaDestino}\n\n📌 Causa: ${causa}\n${nota ? `📝 Nota: ${nota}\n` : ''}\n¿Continuar?`,
        confirmText: '🔄 CONTINUAR', cancelText: '❌ Cancelar',
        icon: '🔄', confirmColor: '#8b5cf6'
    });
    if (!confirm1) return;
    
    closeReprogramarModal();
    
    try {
        window.showToast('⏳ Reprogramando...', 'info', 3000);
        const result = await window.OrdersModule.reprogramarPedidosPorRango(fechaDesde, fechaHasta, fechaDestino, causa, nota, clienteFiltro);
        
        if (!result.success) { window.showToast('❌ Error: ' + (result.error || 'Desconocido'), 'error', 6000); return; }
        
        await window.ModalModule.showAlert({
            title: '✅ Reprogramación exitosa',
            message: `Se reprogramaron ${result.reprogramados} pedido(s).\n\n📅 Nueva fecha: ${fechaDestino}\n📌 Causa: ${causa}`,
            icon: '✅', type: 'success'
        });
        
        window.showToast(`✅ ${result.reprogramados} pedido(s) reprogramado(s)`, 'success', 5000);
        
        if (typeof window.refreshCurrentView === 'function') setTimeout(window.refreshCurrentView, 500);
        if (typeof window.loadDashboardData === 'function') setTimeout(window.loadDashboardData, 800);
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error', 6000);
    }
}

// ============================================================
// RENDER SETTINGS VIEW - COMPLETA
// ============================================================

function renderSettingsView() {
    console.log('⚙️ renderSettingsView() ejecutado');
    
    const main = document.getElementById('mainContent');
    if (!main) { console.error('❌ mainContent no encontrado'); return; }
    
    const user = window.AuthModule.getCurrentUser();
    const isAdmin = user && user.is_admin === 1;
    const appVersion = getAppVersion();
    
    if (window.OrdersModule && window.OrdersModule.getWaitingListCount) {
        window.OrdersModule.getWaitingListCount().then(count => {
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
            <button onclick="window.navigate('dashboard')" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto;">← Volver</button>
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
                <br>🆕 <strong>Navega entre días con ◀ ▶</strong> dentro del modal sin cerrarlo.
                <br>🆕 Acepta <strong>cualquier número decimal</strong>: 6, 6.5, 6.123.
                <br>🆕 Selecciona un <strong>producto</strong> y usa el <strong>cálculo automático de bloques</strong> (✨).
                <br>🆕 Programa la producción en el <strong>último bloque de ayer</strong>.
                <br>🆕 Aplica la misma producción a un <strong>rango de fechas</strong>.
            </p>
            <button onclick="showCorrienteModal()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                ⚡ Gestionar Horarios
            </button>
        </div>
        
        <div class="card" style="border-left: 4px solid #8b5cf6; border: 2px dashed #8b5cf6; background: linear-gradient(135deg, #8b5cf608 0%, #8b5cf604 100%);">
            <h3 style="margin: 0 0 8px 0; color: #8b5cf6;">🔍 Diagnóstico de Producción</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                ¿El guardado de producción no funciona? Ejecuta un diagnóstico técnico para identificar el problema.
                <br>Verifica las 7 comprobaciones clave del sistema (incluye CMPBC).
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
                <br>• <strong>🔀 Fusionar:</strong> <span style="color: #8b5cf6; font-weight: 600;">combina</span> los datos del backup con los actuales. Los registros nuevos se añaden, los existentes se comparan por uuid (gana el más reciente).
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
                <br>💡 La exportación genera un archivo <code>.json</code> con nombre <code>panario_salva_recetas_productos_YYYY-MM-DD.json</code>.
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
    if (window.ModalModule?.cerrarTodosLosModales) window.ModalModule.cerrarTodosLosModales();
    
    const existingModal = document.getElementById('users-modal');
    if (existingModal) existingModal.remove();
    
    const user = window.AuthModule.getCurrentUser();
    if (!user || user.is_admin !== 1) { window.showToast('⚠️ Solo admin', 'warning'); return; }
    
    const negocioId = window.DBModule.getNegocioIdActual();
    const negocio = window.DBModule.getNegocio(negocioId);
    if (!negocio) { window.showToast('❌ No hay negocio activo', 'error'); return; }
    
    const usuarios = window.DBModule.query(`SELECT id, username, name, email, phone, photo, is_admin, created_at FROM users WHERE negocio_id = ? AND deleted_at IS NULL ORDER BY is_admin DESC, created_at ASC`, [negocioId]);
    
    const modal = document.createElement('div');
    modal.id = 'users-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999999; padding: 15px;
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
                <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg-card); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; border: 2px solid ${isAdminUser ? '#f59e0b' : '#3b82f6'};">${avatar}</div>
                <div style="flex: 1; min-width: 150px;">
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="font-weight: 600; font-size: 14px;">${u.name || u.username}</span>
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
                    <button onclick="event.stopPropagation(); showEditUserModal(${u.id})" class="btn secondary" style="padding: 6px 10px; font-size: 12px; width: auto;">✏️</button>
                    <button onclick="event.stopPropagation(); showChangePasswordModal(${u.id}, '${u.username.replace(/'/g, "\\'")}')" class="btn secondary" style="padding: 6px 10px; font-size: 12px; width: auto;">🔑</button>
                    ${!isCurrentUser ? `
                        <button onclick="event.stopPropagation(); handleToggleAdmin(${u.id}, ${isAdminUser ? 'false' : 'true'}, '${u.username.replace(/'/g, "\\'")}')" class="btn secondary" style="padding: 6px 10px; font-size: 12px; width: auto; color: ${isAdminUser ? '#94a3b8' : '#f59e0b'}; border-color: ${isAdminUser ? '#94a3b8' : '#f59e0b'};">${isAdminUser ? '👤' : '👑'}</button>
                        <button onclick="event.stopPropagation(); deleteUser(${u.id}, '${u.username.replace(/'/g, "\\'")}')" class="btn secondary" style="padding: 6px 10px; font-size: 12px; width: auto; color: #ef4444; border-color: #ef4444;">🗑️</button>
                    ` : `<span style="font-size: 11px; color: var(--text-light); padding: 6px 4px;">—</span>`}
                </div>
            </div>
        `;
    }).join('');
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 20px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">👥</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px;">Usuarios del Negocio</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">${negocio.nombre}</p>
                    </div>
                </div>
                <button onclick="closeUsersModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 100px; background: #f59e0b15; padding: 10px 12px; border-radius: 8px; text-align: center; border-left: 3px solid #f59e0b;">
                    <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${usuarios.length}</div>
                    <div style="font-size: 11px; color: var(--text-light);">Total</div>
                </div>
                <div style="flex: 1; min-width: 100px; background: #3b82f615; padding: 10px 12px; border-radius: 8px; text-align: center; border-left: 3px solid #3b82f6;">
                    <div style="font-size: 20px; font-weight: 700; color: #3b82f6;">${usuarios.filter(u => u.is_admin === 1).length}</div>
                    <div style="font-size: 11px; color: var(--text-light);">Admins</div>
                </div>
                <div style="flex: 1; min-width: 100px; background: #10b98115; padding: 10px 12px; border-radius: 8px; text-align: center; border-left: 3px solid #10b981;">
                    <div style="font-size: 20px; font-weight: 700; color: #10b981;">${usuarios.filter(u => u.is_admin !== 1).length}</div>
                    <div style="font-size: 11px; color: var(--text-light);">Regulares</div>
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #f59e0b15 0%, #f59e0b05 100%); border: 2px solid #f59e0b; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
                <div style="font-weight: 700; font-size: 14px; color: #f59e0b; margin-bottom: 8px;">🔑 Código de invitación</div>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 150px; background: var(--bg-card); padding: 10px 14px; border-radius: 8px; text-align: center; border: 1px solid var(--border-color);">
                        <span style="font-family: monospace; font-size: 20px; font-weight: 700; letter-spacing: 3px; color: #f59e0b;">${negocio.codigo_invitacion || '—'}</span>
                    </div>
                    <button onclick="copiarCodigoInvitacion('${negocio.codigo_invitacion}')" class="btn primary" style="padding: 10px 16px; font-size: 13px; width: auto; background: #3b82f6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">📋 Copiar</button>
                    <button onclick="regenerarCodigoAction()" class="btn primary" style="padding: 10px 16px; font-size: 13px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">🔄 Regenerar</button>
                </div>
            </div>
            
            <button onclick="showCreateUserModal()" class="btn primary" style="width: 100%; padding: 12px; font-size: 14px; background: #10b981; color: #fff; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; margin-bottom: 12px;">➕ Crear nuevo usuario directamente</button>
            
            <div style="max-height: 400px; overflow-y: auto; padding-right: 4px; margin-bottom: 12px;">
                ${usuariosHtml}
            </div>
            
            <div style="display: flex; justify-content: flex-end; padding-top: 12px; border-top: 1px solid var(--border-color);">
                <button onclick="closeUsersModal()" class="btn secondary" style="padding: 10px 20px; font-size: 14px; width: auto;">Cerrar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    window.closeUsersModal = function() {
        const m = document.getElementById('users-modal');
        if (m) { m.style.animation = 'modalFadeOut 0.2s ease forwards'; setTimeout(() => { if (m.parentNode) m.remove(); }, 200); }
    };
    
    modal.addEventListener('click', function(e) { if (e.target === this) closeUsersModal(); });
}

// ============================================================
// RESTO DE FUNCIONES DE USUARIOS
// ============================================================

async function showCreateUserModal() {
    const user = window.AuthModule.getCurrentUser();
    if (!user || user.is_admin !== 1) { window.showToast('⚠️ Solo admin', 'warning'); return; }
    
    const existingModal = document.getElementById('create-user-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'create-user-modal';
    modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 999999999; padding: 15px;`;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 480px; width: 100%; max-height: 95vh; overflow-y: auto; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                <h2 style="margin: 0; font-size: 18px; color: #10b981;">➕ Crear Nuevo Usuario</h2>
                <button onclick="closeCreateUserModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            <form id="create-user-form" style="display: flex; flex-direction: column; gap: 12px;">
                <div class="form-group"><label>👤 Nombre de usuario</label><input type="text" id="create-user-username" placeholder="Ej: juan_perez" required oninput="this.value = this.value.toLowerCase().replace(/[^a-z0-9_]/g, '')"></div>
                <div class="form-group"><label>🔒 Contraseña temporal</label><input type="text" id="create-user-password" placeholder="Mínimo 4 caracteres" required minlength="4"></div>
                <div class="form-group"><label>📛 Nombre completo</label><input type="text" id="create-user-name" placeholder="Ej: Juan Pérez" required></div>
                <div class="form-group"><label>📧 Email (opcional)</label><input type="email" id="create-user-email"></div>
                <div class="form-group"><label>📞 Teléfono (opcional)</label><input type="tel" id="create-user-phone"></div>
                <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border-color);">
                    <span style="font-size: 20px;">👑</span>
                    <span style="flex: 1; font-size: 14px;">Rol de administrador</span>
                    <input type="checkbox" id="create-user-isadmin" style="width: 20px; height: 20px;">
                </div>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" style="flex: 1; background: #10b981; color: #fff; border: none; border-radius: 8px; padding: 12px; cursor: pointer; font-weight: 600;">✅ Crear usuario</button>
                    <button type="button" onclick="closeCreateUserModal()" class="btn secondary" style="flex: 1;">❌ Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const form = document.getElementById('create-user-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('create-user-username').value.trim();
        const password = document.getElementById('create-user-password').value.trim();
        const name = document.getElementById('create-user-name').value.trim();
        const email = document.getElementById('create-user-email').value.trim();
        const phone = document.getElementById('create-user-phone').value.trim();
        const isAdmin = document.getElementById('create-user-isadmin').checked;
        
        if (!username || !password || !name) { window.showToast('⚠️ Completa los campos obligatorios', 'error'); return; }
        if (password.length < 4) { window.showToast('⚠️ Contraseña mínimo 4 caracteres', 'error'); return; }
        
        try {
            const result = await window.AuthModule.createUserAsAdmin({ username, password, name, email, phone, isAdmin });
            if (result.success) {
                window.showToast(`✅ Usuario "${username}" creado`, 'success', 4000);
                closeCreateUserModal();
                setTimeout(() => showUsersModal(), 500);
            } else {
                window.showToast('❌ ' + result.error, 'error', 5000);
            }
        } catch (error) {
            window.showToast('❌ Error: ' + error.message, 'error', 5000);
        }
    });
    
    modal.addEventListener('click', (e) => { if (e.target === modal) closeCreateUserModal(); });
    
    window.closeCreateUserModal = function() {
        const m = document.getElementById('create-user-modal');
        if (m) { m.style.animation = 'modalFadeOut 0.2s ease forwards'; setTimeout(() => { if (m.parentNode) m.remove(); }, 200); }
    };
}

async function showEditUserModal(userId) {
    const currentUser = window.AuthModule.getCurrentUser();
    if (!currentUser || currentUser.is_admin !== 1) { window.showToast('⚠️ Solo admin', 'warning'); return; }
    
    const targetUser = window.DBModule.query('SELECT id, username, name, email, phone FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
    if (targetUser.length === 0) { window.showToast('⚠️ Usuario no encontrado', 'warning'); return; }
    const u = targetUser[0];
    
    const existingModal = document.getElementById('edit-user-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'edit-user-modal';
    modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 999999999; padding: 15px;`;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 480px; width: 100%; max-height: 95vh; overflow-y: auto; border: 1px solid var(--border-color);">
            <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #3b82f6;">✏️ Editar Usuario @${u.username}</h2>
            <form id="edit-user-form" style="display: flex; flex-direction: column; gap: 12px;">
                <div class="form-group"><label>📛 Nombre completo</label><input type="text" id="edit-user-name" value="${u.name || ''}" required></div>
                <div class="form-group"><label>📧 Email</label><input type="email" id="edit-user-email" value="${u.email || ''}"></div>
                <div class="form-group"><label>📞 Teléfono</label><input type="tel" id="edit-user-phone" value="${u.phone || ''}"></div>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" style="flex: 1; background: #3b82f6; color: #fff; border: none; border-radius: 8px; padding: 12px; cursor: pointer; font-weight: 600;">💾 Guardar</button>
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
        
        if (!name) { window.showToast('⚠️ Nombre obligatorio', 'error'); return; }
        
        try {
            const result = await window.AuthModule.updateUserDataByAdmin(userId, { name, email, phone });
            if (result.success) {
                window.showToast('✅ Usuario actualizado', 'success', 3000);
                closeEditUserModal();
                setTimeout(() => showUsersModal(), 500);
            } else {
                window.showToast('❌ ' + result.error, 'error', 5000);
            }
        } catch (error) {
            window.showToast('❌ Error: ' + error.message, 'error', 5000);
        }
    });
    
    modal.addEventListener('click', (e) => { if (e.target === modal) closeEditUserModal(); });
    
    window.closeEditUserModal = function() {
        const m = document.getElementById('edit-user-modal');
        if (m) { m.style.animation = 'modalFadeOut 0.2s ease forwards'; setTimeout(() => { if (m.parentNode) m.remove(); }, 200); }
    };
}

async function showChangePasswordModal(userId, username) {
    const currentUser = window.AuthModule.getCurrentUser();
    if (!currentUser) return;
    const isOwnUser = currentUser.id === userId;
    const isAdmin = currentUser.is_admin === 1;
    if (!isOwnUser && !isAdmin) { window.showToast('⚠️ Sin permiso', 'warning'); return; }
    
    const existingModal = document.getElementById('change-password-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'change-password-modal';
    modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 999999999; padding: 15px;`;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 440px; width: 100%; border: 1px solid var(--border-color);">
            <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #f59e0b;">🔑 Cambiar Contraseña @${username}</h2>
            <form id="change-password-form" style="display: flex; flex-direction: column; gap: 12px;">
                <div class="form-group"><label>🔒 Nueva contraseña</label><input type="text" id="change-pass-new" required minlength="4"></div>
                <div class="form-group"><label>🔒 Confirmar</label><input type="text" id="change-pass-confirm" required minlength="4"></div>
                <div id="change-pass-error" style="display: none; background: #ef444420; color: #ef4444; padding: 8px 12px; border-radius: 6px; font-size: 13px;"></div>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" style="flex: 1; background: #f59e0b; color: #fff; border: none; border-radius: 8px; padding: 12px; cursor: pointer; font-weight: 600;">🔑 Cambiar</button>
                    <button type="button" onclick="closeChangePasswordModal()" class="btn secondary" style="flex: 1;">❌ Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const form = document.getElementById('change-password-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPass = document.getElementById('change-pass-new').value.trim();
        const confirmPass = document.getElementById('change-pass-confirm').value.trim();
        const errorEl = document.getElementById('change-pass-error');
        errorEl.style.display = 'none';
        
        if (newPass.length < 4) { errorEl.textContent = '⚠️ Mínimo 4 caracteres'; errorEl.style.display = 'block'; return; }
        if (newPass !== confirmPass) { errorEl.textContent = '⚠️ No coinciden'; errorEl.style.display = 'block'; return; }
        
        try {
            const result = await window.AuthModule.updateUserPassword(userId, newPass);
            if (result.success) {
                window.showToast('✅ Contraseña actualizada', 'success', 4000);
                closeChangePasswordModal();
            } else {
                errorEl.textContent = '❌ ' + result.error;
                errorEl.style.display = 'block';
            }
        } catch (error) {
            errorEl.textContent = '❌ ' + error.message;
            errorEl.style.display = 'block';
        }
    });
    
    modal.addEventListener('click', (e) => { if (e.target === modal) closeChangePasswordModal(); });
    
    window.closeChangePasswordModal = function() {
        const m = document.getElementById('change-password-modal');
        if (m) { m.style.animation = 'modalFadeOut 0.2s ease forwards'; setTimeout(() => { if (m.parentNode) m.remove(); }, 200); }
    };
}

async function handleToggleAdmin(userId, promoteToAdmin, username) {
    const confirm = await window.ModalModule.showConfirm({
        title: promoteToAdmin ? '👑 Promover a admin' : '👤 Quitar admin',
        message: `¿Seguro que quieres ${promoteToAdmin ? 'promover' : 'quitar admin'} a "@${username}"?`,
        confirmText: promoteToAdmin ? '👑 Sí, promover' : '👤 Sí, quitar',
        cancelText: '❌ Cancelar',
        icon: promoteToAdmin ? '👑' : '👤',
        confirmColor: promoteToAdmin ? '#f59e0b' : '#94a3b8'
    });
    if (!confirm) return;
    
    try {
        const result = await window.AuthModule.toggleUserAdmin(userId, promoteToAdmin);
        if (result.success) {
            window.showToast(promoteToAdmin ? `✅ @${username} es ADMIN` : `✅ @${username} ya no es admin`, 'success', 4000);
            setTimeout(() => showUsersModal(), 500);
        } else {
            window.showToast('❌ ' + result.error, 'error', 5000);
            setTimeout(() => showUsersModal(), 500);
        }
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error', 5000);
    }
}

async function deleteUser(userId, username) {
    const currentUser = window.AuthModule.getCurrentUser();
    if (userId === currentUser.id) { window.showToast('⚠️ No puedes eliminarte a ti mismo', 'warning'); return; }
    
    closeUsersModal();
    await new Promise(r => setTimeout(r, 250));
    
    const confirm = await window.ModalModule.showConfirm({
        title: '🗑️ Eliminar usuario',
        message: `¿Eliminar a "@${username}"?\n\n⚠️ Perderá acceso a Panario.\n✅ Los datos que creó se mantienen.`,
        confirmText: '🗑️ Sí, eliminar', cancelText: '❌ Cancelar',
        icon: '🗑️', confirmColor: '#ef4444'
    });
    
    if (!confirm) { setTimeout(() => showUsersModal(), 300); return; }
    
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

async function regenerarCodigoAction() {
    closeUsersModal();
    await new Promise(r => setTimeout(r, 250));
    
    const confirm = await window.ModalModule.showConfirm({
        title: '🔄 Regenerar código',
        message: '¿Regenerar el código de invitación?\n\n⚠️ El código actual dejará de funcionar.',
        confirmText: '🔄 Sí, regenerar', cancelText: '❌ Cancelar',
        icon: '🔄', confirmColor: '#f59e0b'
    });
    
    if (!confirm) { setTimeout(() => showUsersModal(), 300); return; }
    
    const negocioId = window.DBModule.getNegocioIdActual();
    const result = window.DBModule.regenerarCodigoInvitacion(negocioId);
    
    if (result.success) {
        window.showToast(`✅ Nuevo código: ${result.codigo}`, 'success', 5000);
        setTimeout(() => showUsersModal(), 500);
    } else {
        window.showToast('❌ Error: ' + (result.error || 'Desconocido'), 'error', 5000);
        setTimeout(() => showUsersModal(), 500);
    }
}

// ============================================================
// SALVA DIFERENCIAL
// ============================================================

async function exportSalvaRecetasProductos() {
    if (typeof window.DBModule.exportRecetasProductosSalva !== 'function') {
        window.showToast('❌ Función no disponible', 'error', 6000);
        return;
    }
    
    let progress = null;
    try {
        progress = window.ModalModule.showProgressModal({ title: 'Exportando salva', message: 'Preparando...', icon: '🧩' });
        progress.update('Recopilando...', 30);
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
        }
    } catch (error) {
        if (progress) { try { progress.error(error.message); } catch (e) {} }
    } finally {
        setTimeout(() => {
            const stillThere = document.getElementById('progress-modal');
            if (stillThere) { try { window.ModalModule.closeProgressModal(); } catch (e) {} }
        }, 4000);
    }
}

async function importSalvaRecetasProductos() {
    if (typeof window.DBModule.importRecetasProductosSalva !== 'function' || typeof window.DBModule.readSalvaFile !== 'function') {
        window.showToast('❌ Función no disponible', 'error', 6000);
        return;
    }
    
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        
        input.onchange = async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const salvaData = await window.DBModule.readSalvaFile(file);
                if (!salvaData._meta || salvaData._meta.type !== 'salva_recetas_productos') {
                    await window.ModalModule.showAlert({ title: '❌ Archivo inválido', message: 'No es una salva válida.', icon: '❌', type: 'error' });
                    return;
                }
                
                const counts = salvaData._meta.counts || {};
                const resumen = `📖 Recetas: ${counts.recipes || 0}\n🏷️ Productos: ${counts.productos || 0}`;
                
                const modo = await window.ModalModule.showPrompt({
                    title: '📥 Importar salva',
                    message: `${resumen}\n\nEscribe "fusionar" o "reemplazar":`,
                    defaultValue: 'fusionar',
                    icon: '📥'
                });
                
                if (!modo) return;
                const modoLimpio = String(modo).trim().toLowerCase();
                if (modoLimpio !== 'fusionar' && modoLimpio !== 'reemplazar') return;
                
                const confirm = await window.ModalModule.showConfirm({
                    title: modoLimpio === 'reemplazar' ? '⚠️ Reemplazar' : '📥 Fusionar',
                    message: modoLimpio === 'reemplazar' ? '¿REEMPLAZAR todas las recetas y productos?' : '¿FUSIONAR con los actuales?',
                    confirmText: modoLimpio === 'reemplazar' ? '⚠️ SÍ, REEMPLAZAR' : '✅ SÍ, FUSIONAR',
                    cancelText: '❌ Cancelar',
                    icon: modoLimpio === 'reemplazar' ? '⚠️' : '📥',
                    confirmColor: modoLimpio === 'reemplazar' ? '#ef4444' : '#10b981'
                });
                if (!confirm) return;
                
                const result = window.DBModule.importRecetasProductosSalva(salvaData, modoLimpio);
                
                if (result && result.success) {
                    window.showToast('✅ Salva importada correctamente', 'success', 3000);
                    setTimeout(() => { if (typeof window.refreshCurrentView === 'function') window.refreshCurrentView(); }, 2000);
                } else {
                    window.showToast('❌ ' + (result.error || 'Error'), 'error', 5000);
                }
            } catch (error) {
                window.showToast('❌ ' + error.message, 'error', 5000);
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
        progress = window.ModalModule.showProgressModal({ title: 'Exportando copia completa', message: 'Preparando...', icon: '📦' });
        progress.update('Recopilando...', 30);
        await new Promise(r => setTimeout(r, 300));
        progress.update('Incluyendo usuarios...', 60);
        await new Promise(r => setTimeout(r, 300));
        progress.update('Generando .db...', 90);
        await new Promise(r => setTimeout(r, 300));
        
        const result = window.DBModule.downloadDatabase('complete');
        if (result && result.success) {
            progress.success('Copia completa exportada');
            window.showToast('✅ Copia completa exportada', 'success', 3000);
        } else {
            progress.error((result && result.error) ? result.error : 'No se pudo exportar');
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
        progress = window.ModalModule.showProgressModal({ title: 'Exportando copia de datos', message: 'Preparando...', icon: '📊' });
        progress.update('Recopilando datos...', 30);
        await new Promise(r => setTimeout(r, 300));
        progress.update('Excluyendo usuarios...', 60);
        await new Promise(r => setTimeout(r, 300));
        progress.update('Generando .db...', 90);
        await new Promise(r => setTimeout(r, 300));
        
        const result = window.DBModule.downloadDatabase('data_only');
        if (result && result.success) {
            progress.success('Copia de datos exportada');
            window.showToast('✅ Copia de datos exportada', 'success', 3000);
        } else {
            progress.error((result && result.error) ? result.error : 'No se pudo exportar');
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
            if (!file) return;
            
            const user = window.AuthModule.getCurrentUser();
            const isAdmin = user && user.is_admin === 1;
            
            const confirm = await window.ModalModule.showConfirm({
                title: '📥 Importar copia',
                message: `¿Importar "${file.name}"?\n\n⚠️ Reemplazará TODOS los datos${isAdmin ? ' (incluyendo usuarios)' : ''}.`,
                confirmText: 'Sí, importar',
                cancelText: 'Cancelar',
                icon: '⚠️',
                confirmColor: '#ef4444'
            });
            
            if (!confirm) return;
            
            try {
                const result = await window.DBModule.importDatabase(file);
                if (result.success) {
                    window.showToast('✅ Copia importada. Recargando...', 'success', 3000);
                    setTimeout(() => {
                        const url = window.location.href.split('?')[0];
                        window.location.href = url + '?refresh=' + Date.now();
                        setTimeout(() => window.location.reload(true), 100);
                    }, 500);
                } else {
                    window.showToast('❌ ' + (result.error || 'Error'), 'error', 5000);
                }
            } catch (error) {
                window.showToast('❌ ' + error.message, 'error', 5000);
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
            window.showToast('✅ Datos importados. Recargando...', 'success', 5000);
            setTimeout(() => {
                const url = window.location.href.split('?')[0];
                window.location.href = url + '?refresh=' + Date.now();
                setTimeout(() => window.location.reload(true), 100);
            }, 500);
        } else if (result && result.error && result.error !== 'Cancelado') {
            window.showToast('❌ ' + result.error, 'error', 5000);
        }
    } catch (error) {
        window.showToast('❌ ' + error.message, 'error');
    }
}

async function importDatabaseFusionAction() {
    if (typeof window.DBModule.importDatabaseDataOnlyFromFile !== 'function') {
        window.showToast('❌ Función no disponible', 'error', 6000);
        return;
    }
    
    try {
        const result = await window.DBModule.importDatabaseDataOnlyFromFile();
        if (!result) return;
        if (result.success === false && result.error === 'Cancelado') return;
        if (!result.success) { window.showToast('❌ ' + (result.error || 'Error'), 'error', 6000); return; }
        
        const inserted = result.inserted || 0;
        const updated = result.updated || 0;
        const skipped = result.skipped || 0;
        
        await window.ModalModule.showAlert({
            title: '🔀 Fusión completada',
            message: `✅ Fusión completada.\n\n📥 Nuevos: ${inserted}\n🔄 Actualizados: ${updated}\n⏭️ Sin cambios: ${skipped}`,
            icon: '🔀', type: 'success'
        });
        
        window.showToast(`✅ Fusión: +${inserted} nuevos, ~${updated} actualizados`, 'success', 5000);
        
        setTimeout(() => {
            if (typeof window.refreshCurrentView === 'function') window.refreshCurrentView();
            else if (typeof window.renderSettingsView === 'function') window.renderSettingsView();
        }, 1500);
    } catch (error) {
        window.showToast('❌ Error: ' + (error.message || 'Desconocido'), 'error', 6000);
    }
}

async function clearLastUserAction() {
    const confirm = await window.ModalModule.showConfirm({
        title: 'Olvidar usuario',
        message: '¿Olvidar el último usuario guardado?',
        confirmText: 'Sí, olvidar', cancelText: 'Cancelar',
        icon: '🗑️', confirmColor: '#ef4444'
    });
    if (confirm) {
        window.AuthModule.clearLastUser();
        window.showToast('✅ Último usuario olvidado', 'success');
        renderSettingsView();
    }
}

async function cleanDeletedData() {
    const confirm = await window.ModalModule.showConfirm({
        title: '🧹 Limpiar datos eliminados',
        message: '¿Eliminar permanentemente todos los registros marcados como eliminados?\n\n⚠️ No se puede deshacer.',
        confirmText: 'Sí, limpiar', cancelText: 'Cancelar',
        icon: '⚠️', confirmColor: '#ef4444'
    });
    if (!confirm) return;
    
    let progress = null;
    try {
        progress = window.ModalModule.showProgressModal({ title: 'Limpiando', message: 'Eliminando...', icon: '🧹' });
        
        const tables = ['sales', 'transactions', 'orders', 'order_items', 'payments', 'recipes', 'recipe_ingredients', 'clients', 'products', 'dias_sin_ventas', 'calendario_produccion'];
        let deletedCount = 0;
        
        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            progress.update(`Limpiando ${table}...`, Math.round(((i + 1) / tables.length) * 90));
            
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
        
        progress.update('Guardando...', 95);
        window.DBModule.saveDatabase();
        await new Promise(r => setTimeout(r, 200));
        
        progress.success(`${deletedCount} registros eliminados`);
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

async function resetDatabaseWithPassword() {
    const password = await window.ModalModule.showPrompt({
        title: '🔒 Verificación',
        message: 'Escribe la contraseña de seguridad:',
        placeholder: 'Contraseña', icon: '🔒', inputType: 'password'
    });
    
    if (password === null || password === undefined) { window.showToast('❌ Cancelado', 'info', 2000); return; }
    if (String(password).trim() !== 'panario') {
        await window.ModalModule.showAlert({ title: '❌ Contraseña incorrecta', message: 'La contraseña es: "panario"', icon: '❌', type: 'error' });
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
        progress = window.ModalModule.showProgressModal({ title: 'Reiniciando', message: 'Eliminando datos...', icon: '🚨' });
        
        const db = window.DBModule.getDB();
        const users = window.DBModule.query('SELECT * FROM users WHERE deleted_at IS NULL');
        const tables = ['inventory_movements', 'inventory', 'order_items', 'payments', 'orders', 'recipe_ingredients', 'recipes', 'sales', 'transactions', 'clients', 'products', 'notifications', 'units', 'corriente_config', 'dias_sin_ventas', 'calendario_produccion'];
        
        for (let i = 0; i < tables.length; i++) {
            progress.update(`Eliminando ${tables[i]}...`, Math.round(((i + 1) / tables.length) * 80));
            try { db.run(`DELETE FROM ${tables[i]}`); } catch (e) {}
            await new Promise(r => setTimeout(r, 80));
        }
        
        progress.update('Guardando...', 90);
        window.DBModule.saveDatabase();
        await new Promise(r => setTimeout(r, 300));
        
        progress.success(`BD reiniciada. ${users.length} usuario(s) conservado(s)`);
        window.showToast('✅ BD reiniciada', 'success', 2000);
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

async function showDeleteSelectorModal() {
    const existingModal = document.getElementById('delete-selector-modal');
    if (existingModal) existingModal.remove();
    
    const negocioId = window.DBModule.getNegocioIdActual();
    if (!negocioId) { window.showToast('❌ No hay negocio activo', 'error'); return; }
    
    const orders = window.DBModule.query(`SELECT id, client_name, total, status FROM orders WHERE negocio_id = ? AND deleted_at IS NULL AND status != 'delivered' AND status != 'cancelled' ORDER BY created_at DESC`, [negocioId]);
    const sales = window.DBModule.query(`SELECT id, product_name, total, payment_method, sale_date, buyer FROM sales WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0 ORDER BY created_at DESC`, [negocioId]);
    
    const modal = document.createElement('div');
    modal.id = 'delete-selector-modal';
    modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 999999998; padding: 10px;`;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 16px 18px; max-width: 100%; width: 100%; max-height: 95vh; overflow-y: auto; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h2 style="margin: 0; color: #dc2626; font-size: 18px;">🚨 Eliminación por error</h2>
                <button onclick="closeDeleteSelectorModal()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--text-light);">✕</button>
            </div>
            
            <p style="font-size: 13px; color: var(--text-light); margin-bottom: 12px;">
                Selecciona pedidos y ventas para eliminar <strong style="color: #dc2626;">PERMANENTEMENTE</strong>.
            </p>
            
            <div style="background: var(--bg); padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 13px;">
                📋 Pedidos: <strong id="selected-orders-count">0</strong> · 💰 Ventas: <strong id="selected-sales-count">0</strong> · 🗑️ Total: <strong id="selected-total">0</strong>
            </div>
            
            <div style="margin-bottom: 12px;">
                <div style="font-size: 13px; font-weight: 600; margin-bottom: 6px;">📋 Pedidos (${orders.length})</div>
                <div style="max-height: 200px; overflow-y: auto;">
                    ${orders.map(o => `
                        <div style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: var(--bg); border-radius: 4px; margin-bottom: 3px; font-size: 12px;">
                            <input type="checkbox" class="delete-order-checkbox" data-id="${o.id}">
                            <span style="flex: 1;">#${o.id} - ${o.client_name}</span>
                            <span>$${parseFloat(o.total).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div style="margin-bottom: 12px;">
                <div style="font-size: 13px; font-weight: 600; margin-bottom: 6px;">💰 Ventas (${sales.length})</div>
                <div style="max-height: 200px; overflow-y: auto;">
                    ${sales.map(s => `
                        <div style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: var(--bg); border-radius: 4px; margin-bottom: 3px; font-size: 12px;">
                            <input type="checkbox" class="delete-sale-checkbox" data-id="${s.id}">
                            <span style="flex: 1;">#${s.id} - ${s.product_name}</span>
                            <span>$${parseFloat(s.total).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div style="display: flex; gap: 6px; justify-content: flex-end;">
                <button onclick="selectAllDeleteItems()" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto;">✅ Todos</button>
                <button onclick="deselectAllDeleteItems()" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto;">❌ Ninguno</button>
                <button onclick="confirmDeleteSelected()" class="btn danger" style="padding: 6px 16px; font-size: 13px; width: auto; background: #dc2626; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">🗑️ ELIMINAR</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    window._deleteSelectedOrders = new Set();
    window._deleteSelectedSales = new Set();
    
    window.closeDeleteSelectorModal = function() {
        const m = document.getElementById('delete-selector-modal');
        if (m) { m.style.animation = 'modalFadeOut 0.2s ease forwards'; setTimeout(() => { if (m.parentNode) m.remove(); }, 200); }
    };
    
    document.querySelectorAll('.delete-order-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
            const id = parseInt(this.dataset.id);
            if (this.checked) window._deleteSelectedOrders.add(id); else window._deleteSelectedOrders.delete(id);
            updateDeleteSelectionCount();
        });
    });
    
    document.querySelectorAll('.delete-sale-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
            const id = parseInt(this.dataset.id);
            if (this.checked) window._deleteSelectedSales.add(id); else window._deleteSelectedSales.delete(id);
            updateDeleteSelectionCount();
        });
    });
    
    window.updateDeleteSelectionCount = function() {
        document.getElementById('selected-orders-count').textContent = window._deleteSelectedOrders.size;
        document.getElementById('selected-sales-count').textContent = window._deleteSelectedSales.size;
        document.getElementById('selected-total').textContent = window._deleteSelectedOrders.size + window._deleteSelectedSales.size;
    };
    
    window.selectAllDeleteItems = function() {
        document.querySelectorAll('.delete-order-checkbox').forEach(cb => { cb.checked = true; window._deleteSelectedOrders.add(parseInt(cb.dataset.id)); });
        document.querySelectorAll('.delete-sale-checkbox').forEach(cb => { cb.checked = true; window._deleteSelectedSales.add(parseInt(cb.dataset.id)); });
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
        
        if (orderIds.length === 0 && saleIds.length === 0) { window.showToast('⚠️ Nada seleccionado', 'warning'); return; }
        
        closeDeleteSelectorModal();
        await new Promise(r => setTimeout(r, 250));
        
        const confirm = await window.ModalModule.showConfirm({
            title: '⚠️ ¿Eliminar permanentemente?',
            message: `Eliminarás:\n📋 ${orderIds.length} pedidos\n💰 ${saleIds.length} ventas\n\n⚠️ NO se puede deshacer.`,
            confirmText: '🗑️ ELIMINAR', cancelText: '❌ Cancelar',
            icon: '🚨', confirmColor: '#dc2626'
        });
        if (!confirm) return;
        
        try {
            const db = window.DBModule.getDB();
            for (const orderId of orderIds) {
                db.run('DELETE FROM order_items WHERE order_id = ?', [orderId]);
                db.run('DELETE FROM payments WHERE order_id = ?', [orderId]);
                db.run('DELETE FROM orders WHERE id = ?', [orderId]);
            }
            for (const saleId of saleIds) {
                db.run('DELETE FROM transactions WHERE sale_id = ?', [saleId]);
                db.run('DELETE FROM sales WHERE id = ?', [saleId]);
            }
            window.DBModule.saveDatabase();
            
            await window.ModalModule.showAlert({
                title: '✅ Eliminados',
                message: `📋 ${orderIds.length} pedidos\n💰 ${saleIds.length} ventas`,
                icon: '✅', type: 'success'
            });
            renderSettingsView();
        } catch (error) {
            window.showToast('❌ Error: ' + error.message, 'error');
        }
    };
    
    modal.addEventListener('click', function(e) { if (e.target === this) closeDeleteSelectorModal(); });
}

// ============================================================
// EXPORTACIÓN FINAL
// ============================================================

window.renderSettingsView = renderSettingsView;
window.showCorrienteModal = showCorrienteModal;
window.irAHoyCorriente = irAHoyCorriente;
window.showProductionDiagnosticModal = showProductionDiagnosticModal;
window.closeProductionDiagnosticModal = closeProductionDiagnosticModal;
window.runProductionDiagnostics = runProductionDiagnostics;
window.renderDiagnosticResults = renderDiagnosticResults;
window.rerunDiagnostics = rerunDiagnostics;
window.showHorarioDetalle = showHorarioDetalle;
window.navegarHorarioDetalle = navegarHorarioDetalle;
window.guardarProduccion = guardarProduccion;
window.eliminarProduccion = eliminarProduccion;
window.showProduccionRangoModal = showProduccionRangoModal;
window.closeProduccionRangoModal = closeProduccionRangoModal;
window.previewProduccionRango = previewProduccionRango;
window.submitProduccionRango = submitProduccionRango;
window.setRangoRapido = setRangoRapido;
window.setRangoMesActual = setRangoMesActual;
window.getFechasDelRango = getFechasDelRango;
window.getProduccionConfig = getProduccionConfig;
window.contarPedidosYVentasFecha = contarPedidosYVentasFecha;
window.formatearCantidadProduccion = formatearCantidadProduccion;
window.esMismaFechaISO = esMismaFechaISO;
window.esBloqueDelDiaAnterior = esBloqueDelDiaAnterior;
window.getBloqueSeleccionadoActual = getBloqueSeleccionadoActual;
window.sumarDiasISO = sumarDiasISO;
window.getDiaSemanaCorto = getDiaSemanaCorto;
window.getFechaCortaConDia = getFechaCortaConDia;
window.esHoyISO = esHoyISO;
window.getAppVersion = getAppVersion;
window.MOTIVOS_REPROGRAMACION = MOTIVOS_REPROGRAMACION;
window.showUsersModal = showUsersModal;
window.showCreateUserModal = showCreateUserModal;
window.showEditUserModal = showEditUserModal;
window.showChangePasswordModal = showChangePasswordModal;
window.handleToggleAdmin = handleToggleAdmin;
window.deleteUser = deleteUser;
window.regenerarCodigoAction = regenerarCodigoAction;
window.exportSalvaRecetasProductos = exportSalvaRecetasProductos;
window.importSalvaRecetasProductos = importSalvaRecetasProductos;
window.exportDatabaseCompleteAction = exportDatabaseCompleteAction;
window.exportDatabaseDataOnlyAction = exportDatabaseDataOnlyAction;
window.importDatabaseSmartAction = importDatabaseSmartAction;
window.importDatabaseDataOnlyFromFileAction = importDatabaseDataOnlyFromFileAction;
window.importDatabaseFusionAction = importDatabaseFusionAction;
window.clearLastUserAction = clearLastUserAction;
window.cleanDeletedData = cleanDeletedData;
window.resetDatabaseWithPassword = resetDatabaseWithPassword;
window.showDeleteSelectorModal = showDeleteSelectorModal;
window.showExpensesReportModal = showExpensesReportModal;
window.closeExpensesReportModal = closeExpensesReportModal;
window.generateExpensesReportFromForm = generateExpensesReportFromForm;
window.showWaitingListFromSettings = showWaitingListFromSettings;
window.reporteListaEsperaFromSettings = reporteListaEsperaFromSettings;
window.showGlobalCancelModal = showGlobalCancelModal;
window.closeGlobalCancelModal = closeGlobalCancelModal;
window.executeGlobalCancel = executeGlobalCancel;
window.showReprogramarPedidosModal = showReprogramarPedidosModal;
window.closeReprogramarModal = closeReprogramarModal;
window.actualizarPreviewReprogramacion = actualizarPreviewReprogramacion;
window.executeReprogramarPedidos = executeReprogramarPedidos;
// 🆕 ENTREGA B
window.calcularBloquesIdeales = calcularBloquesIdeales;
window.showCalculoBloquesModal = showCalculoBloquesModal;
window.confirmarCalculoBloques = confirmarCalculoBloques;
window.onProductoProduccionChange = onProductoProduccionChange;
window.calcularYMostrarSugerencia = calcularYMostrarSugerencia;

console.log('📦 UI Settings Module cargado correctamente v2.2.1 (CORRECCIONES FINALES 220926)');
console.log('   🆕 Novedades v2.2.1:');
console.log('      • getAppVersion() fallback actualizado a 2.2.1');
console.log('      • CORRECCIÓN FINAL #1: modal de reprogramación limpia la vista previa al abrirse');
console.log('      • La vista previa solo se rellena cuando el usuario introduce fechas válidas');