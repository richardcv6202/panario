// ============================================================
// 📦 UI SETTINGS - Panario (Configuración y Herramientas)
// v2.3.0 (250926): CORRECCIONES FINALES
//   - ✅ CORRECCIÓN #8 (2/2): Modal de progreso en export/import
//     * REESCRITA COMPLETA la sección de backups
//     * Eliminado el reemplazo temporal de ModalModule.showConfirm
//     * Flujo lineal con await correcto
//     * Timeout para eliminación del input file (evita cancelar diálogo)
//     * Manejo de errores robusto en cada paso
//     * Los modales se apilan correctamente (confirmación → progreso)
//   - ✅ CORRECCIÓN #10: Algoritmo inteligente de bloques (regla amanecer)
//   - ✅ CORRECCIÓN #11: Guardar y cargar producto_id en producción
//   - ✅ CORRECCIÓN #14: Modal de eliminación por error mejorado
//   - ✅ CORRECCIÓN #6: Botón para restaurar estilos residuales
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
    return '2.3.0';
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
        if (window.DBModule && typeof window.DBModule.contarPedidosYVentasFecha === 'function') {
            return window.DBModule.contarPedidosYVentasFecha(fechaISO);
        }
    } catch (e) {
        console.warn('⚠️ Error delegando en DBModule.contarPedidosYVentasFecha:', e);
    }
    
    try {
        const negocioId = window.DBModule?.getNegocioIdActual?.();
        if (!negocioId || !fechaISO) {
            return { pedidos: 0, ventas: 0, disponibles: 0, cantidadProduccion: 0 };
        }
        
        const pedidosResult = window.DBModule.query(
            `SELECT COALESCE(SUM(oi.quantity), 0) as unidades
             FROM orders o
             INNER JOIN order_items oi ON oi.order_id = o.id
             INNER JOIN productos p ON p.id = oi.producto_id
             WHERE o.negocio_id = ? 
               AND DATE(o.delivery_date) = DATE(?)
               AND o.deleted_at IS NULL
               AND o.status NOT IN ('cancelled', 'waiting_bought')
               AND oi.deleted_at IS NULL
               AND p.capacidad_max_bloque IS NOT NULL 
               AND p.capacidad_max_bloque > 0`,
            [negocioId, fechaISO]
        );
        const pedidos = parseFloat(pedidosResult[0]?.unidades) || 0;
        
        const ventasResult = window.DBModule.query(
            `SELECT COALESCE(SUM(s.quantity), 0) as unidades
             FROM sales s
             INNER JOIN productos p ON p.id = s.producto_id
             WHERE s.negocio_id = ? 
               AND DATE(s.sale_date, "localtime") = DATE(?)
               AND s.deleted_at IS NULL 
               AND s.voided = 0
               AND (s.order_id IS NULL OR s.order_id = 0)
               AND p.capacidad_max_bloque IS NOT NULL 
               AND p.capacidad_max_bloque > 0`,
            [negocioId, fechaISO]
        );
        const ventas = parseFloat(ventasResult[0]?.unidades) || 0;
        
        const config = getProduccionConfig(fechaISO);
        const cantidadProduccion = parseFloat(config?.cantidad_produccion) || 0;
        
        const disponibles = cantidadProduccion > 0 
            ? Math.max(0, cantidadProduccion - pedidos - ventas)
            : null;
        
        return { pedidos, ventas, disponibles, cantidadProduccion, unidadesReservadas: pedidos + ventas };
    } catch (e) {
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
// HELPERS PARA PRODUCTOS
// ============================================================

function getTodosLosProductosParaDropdown() {
    try {
        if (typeof window.DBModule?.getProductos === 'function') {
            return window.DBModule.getProductos();
        }
    } catch (e) {
        console.warn('⚠️ Error obteniendo todos los productos:', e);
    }
    return [];
}

function getProductoDeProduccionUI(fechaISO) {
    try {
        if (typeof window.DBModule?.getProductoDeProduccion === 'function') {
            return window.DBModule.getProductoDeProduccion(fechaISO);
        }
    } catch (e) {
        console.warn('⚠️ Error en getProductoDeProduccionUI:', e);
    }
    return null;
}

function getProduccionConProductoUI(fechaISO) {
    try {
        if (typeof window.DBModule?.getProduccionConProducto === 'function') {
            return window.DBModule.getProduccionConProducto(fechaISO);
        }
    } catch (e) {
        console.warn('⚠️ Error en getProduccionConProductoUI:', e);
    }
    return null;
}

window.getTodosLosProductosParaDropdown = getTodosLosProductosParaDropdown;
window.getProductoDeProduccionUI = getProductoDeProduccionUI;
window.getProduccionConProductoUI = getProduccionConProductoUI;

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
        notas: prodConfig.notas || null,
        productoId: prodConfig.producto_id || null
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
// 🆕 CORRECCIÓN #10: HELPERS DEL ALGORITMO DE BLOQUES
// ============================================================

function _esBloqueDelAmanecer(horaFin, fechaVenta) {
    try {
        const finDate = horaFin instanceof Date ? horaFin : new Date(horaFin);
        const umbralAmanecer = new Date(fechaVenta + 'T09:00:00');
        return finDate <= umbralAmanecer;
    } catch (e) {
        console.warn('⚠️ Error en _esBloqueDelAmanecer:', e);
        return false;
    }
}

function _formatearMensajeBloque(bloque) {
    try {
        const fechaParaTexto = bloque.fechaBloqueReal || bloque.fecha;
        const fechaObj = new Date(fechaParaTexto + 'T00:00:00');
        const dia = String(fechaObj.getDate()).padStart(2, '0');
        const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
        return `${dia}/${mes} de ${bloque.horaInicioStr} a ${bloque.horaFinStr}`;
    } catch (e) {
        return `${bloque.horaInicioStr} a ${bloque.horaFinStr}`;
    }
}

window._esBloqueDelAmanecer = _esBloqueDelAmanecer;
window._formatearMensajeBloque = _formatearMensajeBloque;

// ============================================================
// 🆕 CORRECCIÓN #10: ALGORITMO INTELIGENTE DE BLOQUES
// ============================================================

function calcularBloquesIdeales(fechaVenta, cpd, cmpbc) {
    const LOG_PREFIX = '🧠 [calcularBloquesIdeales v2.3.0]';
    
    try {
        console.log(`${LOG_PREFIX} ========== INICIO ==========`);
        console.log(`${LOG_PREFIX} Fecha venta: ${fechaVenta}, CPD: ${cpd}, CMPBC: ${cmpbc}`);
        
        if (!fechaVenta) return { success: false, error: 'Falta la fecha de venta' };
        if (!cpd || cpd <= 0) return { success: false, error: 'La cantidad a producir debe ser mayor a 0' };
        if (!cmpbc || cmpbc <= 0) return { success: false, error: 'El CMPBC debe ser mayor a 0' };
        
        // PASO 1: RECOPILAR CANDIDATOS
        const candidatos = [];
        
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
                fechaBloqueReal: bloqueAyer.fechaBloqueReal
            });
        }
        
        if (candidatos.length === 0) {
            return { success: false, error: 'No hay bloques de corriente disponibles', candidatos: [] };
        }
        
        // PASO 2: CLASIFICAR
        const umbralIdeal = new Date(fechaVenta + 'T08:00:00');
        
        for (const c of candidatos) {
            const fin = c.horaFin instanceof Date ? c.horaFin : new Date(c.horaFin);
            c._finDate = fin;
            c._esAmanecer = _esBloqueDelAmanecer(fin, fechaVenta);
            c._esIdeal = fin <= umbralIdeal;
        }
        
        const amanecerValidos = candidatos.filter(c => c._esAmanecer);
        const restantes = candidatos.filter(c => !c._esAmanecer);
        
        // PASO 3: ORDENAR
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
        
        // PASO 4: CALCULAR
        const numBloquesNecesarios = Math.ceil(cpd / cmpbc);
        const capacidadTotal = candidatosOrdenados.length * cmpbc;
        
        if (numBloquesNecesarios > candidatosOrdenados.length) {
            return {
                success: false,
                error: `No es posible producir ${formatearCantidadProduccion(cpd)} unidades con solo ${candidatosOrdenados.length} bloque(s).`,
                detalle: `Máximo posible: ${formatearCantidadProduccion(capacidadTotal)} unidades`,
                candidatos: candidatosOrdenados,
                numBloquesNecesarios,
                capacidadTotal
            };
        }
        
        // PASO 5: DISTRIBUIR
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
                esAmanecer: candidato._esAmanecer
            });
            
            restante -= cantidad;
        }
        
        // PASO 7: MENSAJE
        let mensaje = '';
        if (asignacion.length === 1) {
            const unico = asignacion[0];
            const formatoFecha = _formatearMensajeBloque(unico);
            mensaje = unico.esAmanecer
                ? `Se horneará todo (${formatearCantidadProduccion(unico.cantidad)} uds) en el bloque del amanecer: ${formatoFecha}.`
                : `Se horneará todo (${formatearCantidadProduccion(unico.cantidad)} uds) en el bloque ${formatoFecha}.`;
        } else {
            const partes = asignacion.map((a, i) => {
                const formatoFecha = _formatearMensajeBloque(a);
                return a.esAmanecer
                    ? `${i + 1}º: ${formatearCantidadProduccion(a.cantidad)} uds en el bloque del amanecer (${formatoFecha})`
                    : `${i + 1}º: ${formatearCantidadProduccion(a.cantidad)} uds (${formatoFecha})`;
            });
            mensaje = `Se horneará en ${asignacion.length} bloques → ` + partes.join(' · ');
        }
        
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
    
    try {
        if (typeof window.DBModule === 'undefined' || typeof window.DBModule.getDB !== 'function') {
            results.push({ name: '1. DBModule disponible', status: 'error', message: 'NO está definido', detail: '' });
        } else {
            let dbOk = false;
            try { const db = window.DBModule.getDB(); dbOk = !!db; } catch (e) {}
            results.push({ name: '1. DBModule disponible', status: dbOk ? 'ok' : 'error', message: dbOk ? 'OK' : 'getDB() falla', detail: '' });
        }
    } catch (e) {
        results.push({ name: '1. DBModule disponible', status: 'error', message: 'Excepción: ' + e.message, detail: '' });
    }
    
    const funcs = [
        { name: '2. saveProduccion()', fn: 'saveProduccion' },
        { name: '3. getProduccionByFecha()', fn: 'getProduccionByFecha' },
        { name: '4. saveProduccionRango()', fn: 'saveProduccionRango' },
        { name: '5. getCMPBCProducto()', fn: 'getCMPBCProducto' },
        { name: '6. contarPedidosYVentasFecha()', fn: 'contarPedidosYVentasFecha' }
    ];
    
    for (const f of funcs) {
        try {
            if (typeof window.DBModule?.[f.fn] !== 'function') {
                results.push({ name: f.name + ' existe', status: 'warning', message: 'NO es función', detail: '' });
            } else {
                results.push({ name: f.name + ' existe', status: 'ok', message: 'Disponible', detail: '' });
            }
        } catch (e) {
            results.push({ name: f.name + ' existe', status: 'error', message: 'Excepción: ' + e.message, detail: '' });
        }
    }
    
    try {
        const db = window.DBModule.getDB();
        const pragma = db.exec('PRAGMA table_info(calendario_produccion)');
        if (pragma.length === 0 || !pragma[0].values) {
            results.push({ name: '7. Estructura calendario_produccion', status: 'error', message: 'No se pudo leer', detail: '' });
        } else {
            const cols = pragma[0].values.map(row => row[1]);
            const requeridas = ['id', 'negocio_id', 'fecha', 'hora_inicio', 'hora_fin', 'bloque_index', 'cantidad_produccion', 'producto_id'];
            const faltantes = requeridas.filter(c => !cols.includes(c));
            if (faltantes.length > 0) {
                results.push({ name: '7. Estructura', status: 'error', message: `Faltan: ${faltantes.join(', ')}`, detail: '' });
            } else {
                results.push({ name: '7. Estructura', status: 'ok', message: `OK (${cols.length} columnas)`, detail: '' });
            }
        }
    } catch (e) {
        results.push({ name: '7. Estructura', status: 'error', message: 'Excepción: ' + e.message, detail: '' });
    }
    
    try {
        const db = window.DBModule.getDB();
        const pragma = db.exec('PRAGMA table_info(productos)');
        const cols = pragma[0]?.values?.map(row => row[1]) || [];
        if (cols.includes('capacidad_max_bloque')) {
            results.push({ name: '8. CMPBC en productos', status: 'ok', message: 'OK', detail: '' });
        } else {
            results.push({ name: '8. CMPBC en productos', status: 'error', message: 'Falta columna', detail: '' });
        }
    } catch (e) {
        results.push({ name: '8. CMPBC en productos', status: 'error', message: 'Excepción: ' + e.message, detail: '' });
    }
    
    try {
        if (typeof window.calcularBloquesIdeales !== 'function') {
            results.push({ name: '9. Algoritmo bloques', status: 'error', message: 'NO es función', detail: '' });
        } else {
            results.push({ name: '9. Algoritmo bloques', status: 'ok', message: 'Disponible', detail: '' });
        }
    } catch (e) {
        results.push({ name: '9. Algoritmo bloques', status: 'error', message: 'Excepción: ' + e.message, detail: '' });
    }
    
    const okCount = results.filter(r => r.status === 'ok').length;
    const warnCount = results.filter(r => r.status === 'warning').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
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
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 640px; width: 100%; max-height: 92vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #8b5cf6;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">🔍</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #8b5cf6;">Diagnóstico de Producción</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">Verifica el estado del sistema</p>
                    </div>
                </div>
                <button onclick="closeProductionDiagnosticModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light);">✕</button>
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
// CONFIGURACIÓN DE CORRIENTE
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
        window.showToast(`✅ Patrón guardado: ${horasCorriente}h / ${horasApagon}h`, 'success');
        const cal = document.getElementById('corriente-calendario-content');
        if (cal && cal.style.display !== 'none') renderCorrienteCalendario();
    } else {
        window.showToast('❌ Error al guardar', 'error');
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
        window.showToast('❌ Error al guardar', 'error');
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
            <br>📌 Ciclo: ${config.horasCorriente}h / ${config.horasApagon}h
        `;
    }

    window.showToast('✅ Referencia guardada', 'success');
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
                <button onclick="closeCorrienteModal()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--text-light);">✕</button>
            </div>
            
            <div style="display: flex; gap: 3px; border-bottom: 2px solid var(--border-color); margin-bottom: 12px; flex-wrap: wrap;">
                <button id="tab-corriente-config" onclick="switchCorrienteTab('config')" class="btn primary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0;">⚙️ Config</button>
                <button id="tab-corriente-calendario" onclick="switchCorrienteTab('calendario')" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0; background: transparent; color: var(--text); border: none;">📅 Calendario</button>
                <button id="tab-corriente-reporte" onclick="switchCorrienteTab('reporte')" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0; background: transparent; color: var(--text); border: none;">📊 Reporte</button>
                <button id="tab-corriente-consultar" onclick="switchCorrienteTab('consultar')" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto; border-radius: 6px 6px 0 0; background: transparent; color: var(--text); border: none;">🔍 Fecha</button>
            </div>

            <div id="corriente-config-content" style="flex: 1; overflow-y: auto;">
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 10px;">
                    <h4 style="margin: 0 0 6px 0; font-size: 14px;">⚙️ Patrón</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <label style="font-size: 12px;">⏰ Corriente</label>
                            <input type="number" id="config-horas-corriente" value="${config.horasCorriente || 3}" min="0.5" max="24" step="0.5" style="width: 100%; padding: 6px 10px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text);">
                        </div>
                        <div>
                            <label style="font-size: 12px;">🌙 Apagón</label>
                            <input type="number" id="config-horas-apagon" value="${config.horasApagon || 12}" min="0.5" max="48" step="0.5" style="width: 100%; padding: 6px 10px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text);">
                        </div>
                    </div>
                    <button onclick="saveCorrientePattern()" class="btn primary" style="margin-top: 8px; padding: 4px 14px; font-size: 12px; width: auto;">💾 Guardar</button>
                </div>

                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <h4 style="margin: 0 0 6px 0; font-size: 14px;">📝 Referencia inicial</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                        <div>
                            <label style="font-size: 11px;">📅 Fecha</label>
                            <input type="date" id="config-fecha-ref" value="${config.fechaReferencia || new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                        <div>
                            <label style="font-size: 11px;">🟢 Inicio</label>
                            <input type="time" id="config-inicio-ref" value="${config.horaInicioReferencia || '10:00'}" style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                        </div>
                        <div>
                            <label style="font-size: 11px;">🔴 Fin</label>
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
                <br>📌 Ciclo: ${config.horasCorriente}h / ${config.horasApagon}h
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
// RENDER CALENDARIO DE CORRIENTE
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
// SHOW HORARIO DETALLE (CORRECCIÓN #11 COMPLETADA)
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
    
    let productoSeleccionado = null;
    try {
        if (prodConfig && prodConfig.producto_id) {
            if (typeof window.DBModule?.getProducto === 'function') {
                productoSeleccionado = window.DBModule.getProducto(prodConfig.producto_id);
            }
        }
    } catch (e) {}
    
    const dateObj = new Date(dateStr + 'T00:00:00');
    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    const diaSemana = diasSemana[dateObj.getDay()];
    const diaMes = dateObj.getDate();
    const mes = meses[dateObj.getMonth()];
    const anio = dateObj.getFullYear();
    
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
    
    let todosLosProductos = [];
    try {
        todosLosProductos = getTodosLosProductosParaDropdown();
    } catch (e) {}
    
    let produccionHtml = '';
    const hayBloquesDisponibles = (bloquesHoy && bloquesHoy.length > 0) || !!bloqueAyer;
    
    if (hayBloquesDisponibles) {
        const opcionesHoy = (bloquesHoy || []).map((b, i) => {
            const bloqueIndexHoy = i + 1;
            const isSelected = bloqueActual && !bloqueActual.esDiaAnterior && bloqueActual.bloqueIndex === bloqueIndexHoy;
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
        
        const opcionesProductos = todosLosProductos.map(p => {
            const isSelected = productoSeleccionado && productoSeleccionado.id === p.id;
            const tieneCMPBC = p.capacidad_max_bloque && parseFloat(p.capacidad_max_bloque) > 0;
            const cmpbcTexto = tieneCMPBC 
                ? `🏭 ${window.formatearCMPBC ? window.formatearCMPBC(p.capacidad_max_bloque) : p.capacidad_max_bloque}/bloque`
                : `— Sin CMPBC —`;
            return `<option value="${p.id}" data-cmpbc="${p.capacidad_max_bloque || ''}" data-nombre="${(p.nombre || '').replace(/"/g, '&quot;')}"${isSelected ? ' selected' : ''}>${p.nombre} (${cmpbcTexto})</option>`;
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
                        <small style="font-size: 10px; color: var(--text-light); display: block; margin-top: 2px;">💡 Acepta cualquier número: 6, 6.5, 6.123</small>
                    </div>
                </div>
                
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
                        <span>📋 Pedidos reservados:</span><strong>${formatearCantidadProduccion(conteo.pedidos)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                        <span>💰 Ventas directas:</span><strong>${formatearCantidadProduccion(conteo.ventas)}</strong>
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
            const esProduccionHoy = bloqueActual && !bloqueActual.esDiaAnterior && bloqueActual.bloqueIndex === bloqueIndexHoy;
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
// CALLBACK AL CAMBIAR EL PRODUCTO EN EL MODAL
// ============================================================

window.onProductoProduccionChange = function() {
    const productoSelect = document.getElementById('produccion-producto');
    const cmpbcInfo = document.getElementById('producto-cmpbc-info');
    const calculoContainer = document.getElementById('calculo-automatico-container');
    
    if (!productoSelect || !cmpbcInfo || !calculoContainer) return;
    
    const productoId = productoSelect.value;
    const selectedOption = productoSelect.options[productoSelect.selectedIndex];
    
    calculoContainer.innerHTML = '';
    
    if (!productoId) {
        cmpbcInfo.innerHTML = '';
        return;
    }
    
    const cmpbc = parseFloat(selectedOption?.dataset?.cmpbc);
    const nombreProducto = selectedOption?.dataset?.nombre || 'Producto';
    
    if (isNaN(cmpbc) || cmpbc <= 0) {
        cmpbcInfo.innerHTML = `<span style="color: #f59e0b;">⚠️ Este producto no tiene CMPBC configurado.</span>`;
        return;
    }
    
    cmpbcInfo.innerHTML = `✅ CMPBC: <strong>${window.formatearCMPBC ? window.formatearCMPBC(cmpbc) : cmpbc} unidades</strong> por bloque`;
    
    calculoContainer.innerHTML = `
        <button onclick="calcularYMostrarSugerencia('${window._horarioDetalleFechaActual}', ${cmpbc}, '${nombreProducto.replace(/'/g, "\\'")}')" 
                class="btn" 
                style="width: 100%; padding: 10px 14px; font-size: 13px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ✨ Calcular bloques automáticamente
        </button>
    `;
};

// ============================================================
// CALCULAR Y MOSTRAR SUGERENCIA
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
    
    showCalculoBloquesModal(resultado, fechaVenta, nombreProducto);
};

// ============================================================
// MODAL DE SUGERENCIA DE BLOQUES
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
                        ${b.esAmanecer ? '🌅 Bloque del amanecer' : '🔨 Bloque del día'}
                    </div>
                    <div style="font-size: 12px; color: var(--text-light); margin-top: 2px;">
                        🕐 ${b.horaInicioStr} - ${b.horaFinStr} · ${b.duracionHoras.toFixed(1)}h
                        ${b.esBloqueAyer ? `<br>📅 ${b.fechaBloqueReal}` : ''}
                    </div>
                </div>
                <div style="text-align: right; flex-shrink: 0;">
                    <div style="font-size: 18px; font-weight: 700; color: ${etiquetaColor};">
                        ${formatearCantidadProduccion(b.cantidad)}
                    </div>
                    <div style="font-size: 10px; color: var(--text-light);">unidades</div>
                </div>
            </div>
        `;
    }).join('');
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 22px; max-width: 580px; width: 100%; max-height: 95vh; overflow-y: auto; border: 2px solid #8b5cf6;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #8b5cf6;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">✨</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #8b5cf6;">Cálculo automático de bloques</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">${nombreProducto || 'Producto'}</p>
                    </div>
                </div>
                <button onclick="closeCalculoBloquesModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light);">✕</button>
            </div>
            
            <div style="background: var(--bg); border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; padding: 3px 0;">
                    <span style="color: var(--text-light);">📦 Cantidad total:</span>
                    <strong style="color: #3b82f6;">${formatearCantidadProduccion(resultado.cpd)} uds</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 3px 0;">
                    <span style="color: var(--text-light);">🏭 Capacidad por bloque:</span>
                    <strong style="color: #8b5cf6;">${formatearCantidadProduccion(resultado.cmpbc)} uds</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 3px 0; border-top: 1px solid var(--border-color); margin-top: 4px; padding-top: 6px;">
                    <span style="color: var(--text-light);">🔢 Bloques necesarios:</span>
                    <strong style="color: #10b981;">${resultado.numBloques}</strong>
                </div>
            </div>
            
            <div style="background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px;">
                <div style="font-size: 13px; font-weight: 700; color: #3b82f6; margin-bottom: 8px;">📋 Distribución sugerida</div>
                ${bloquesHtml}
            </div>
            
            <div style="background: linear-gradient(135deg, #8b5cf615 0%, #8b5cf608 100%); border-left: 4px solid #8b5cf6; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 13px;">
                💬 <strong>${resultado.mensaje}</strong>
            </div>
            
            ${resultado.usaBloqueAyer ? `
                <div style="background: #fef9e7; border-left: 3px solid #f59e0b; border-radius: 6px; padding: 8px 12px; margin-bottom: 14px; font-size: 11px; color: #92400e;">
                    ℹ️ Este cálculo usa el <strong>último bloque del día anterior</strong>.
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
}

window.showCalculoBloquesModal = showCalculoBloquesModal;

// ============================================================
// CONFIRMAR CÁLCULO DE BLOQUES
// ============================================================

window.confirmarCalculoBloques = async function(fechaVenta) {
    const state = window._calculoBloquesActual;
    if (!state || !state.resultado) return;
    
    const resultado = state.resultado;
    const bloquePrincipal = resultado.bloques[0];
    
    const distribucion = resultado.bloques.map(b => ({
        fecha: b.fecha,
        bloque_index: b.bloqueIndex,
        hora_inicio: b.horaInicioStr24,
        hora_fin: b.horaFinStr24,
        cantidad: b.cantidad,
        es_bloque_dia_anterior: b.esBloqueAyer ? 1 : 0,
        fecha_bloque_real: b.fechaBloqueReal
    }));
    
    let productoId = null;
    try {
        const productoSelect = document.getElementById('produccion-producto');
        if (productoSelect && productoSelect.value) {
            const parsed = parseInt(productoSelect.value);
            if (!isNaN(parsed) && parsed > 0) productoId = parsed;
        }
    } catch (e) {}
    
    const notas = document.getElementById('produccion-notas')?.value?.trim() || null;
    
    const dataGuardar = {
        fecha: fechaVenta,
        hora_inicio: bloquePrincipal.horaInicioStr24,
        hora_fin: bloquePrincipal.horaFinStr24,
        bloque_index: bloquePrincipal.bloqueIndex,
        cantidad_produccion: resultado.cpd,
        notas: notas,
        es_bloque_dia_anterior: bloquePrincipal.esBloqueAyer ? 1 : 0,
        fecha_bloque_real: bloquePrincipal.fechaBloqueReal,
        bloques_usados: resultado.numBloques,
        distribucion_bloques: JSON.stringify(distribucion),
        producto_id: productoId
    };
    
    const result = window.DBModule.saveProduccion(dataGuardar);
    
    if (result.success) {
        window.showToast(
            `✅ Producción guardada · ${resultado.numBloques} bloque${resultado.numBloques > 1 ? 's' : ''} · ${formatearCantidadProduccion(resultado.cpd)} uds`,
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
        window.showToast('❌ Error: ' + (result.error || 'Desconocido'), 'error', 6000);
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
        const productoSelectEl = document.getElementById('produccion-producto');
        
        if (!bloqueSelectEl || !cantidadEl || !notasEl) return true;
        
        const bloqueSelectValue = bloqueSelectEl.value || '';
        const cantidadActual = cantidadEl.value?.trim() || '';
        const notasActual = notasEl.value?.trim() || '';
        const productoActual = productoSelectEl ? (productoSelectEl.value || '') : '';
        
        const prodConfig = getProduccionConfig(fechaISO);
        
        const bloqueActualBD = prodConfig?.bloque_index || null;
        const esAyerBD = prodConfig?.es_bloque_dia_anterior === 1;
        const cantidadBD = prodConfig?.cantidad_produccion != null ? String(parseFloat(prodConfig.cantidad_produccion)) : '';
        const notasBD = prodConfig?.notas || '';
        const productoBD = prodConfig?.producto_id != null ? String(prodConfig.producto_id) : '';
        
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
            notasActual !== notasBD ||
            productoActual !== productoBD;
        
        if (!hayCambios) return true;
        
        if (!bloqueSelectValue) {
            if (cantidadActual) {
                const confirm = await window.ModalModule.showConfirm({
                    title: '⚠️ Cambios sin guardar',
                    message: `Has escrito una cantidad pero no has seleccionado un bloque.\n\n¿Descartar y continuar?`,
                    confirmText: '🗑️ Descartar',
                    cancelText: '↩️ Volver',
                    icon: '⚠️',
                    confirmColor: '#f59e0b'
                });
                return confirm;
            }
            return true;
        }
        
        const resultado = await ejecutarGuardadoProduccion(fechaISO, bloqueSelectValue, cantidadActual, notasActual, productoActual);
        
        if (resultado.success) {
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

async function ejecutarGuardadoProduccion(fechaISO, bloqueSelectValue, cantidadRaw, notas, productoRaw) {
    try {
        const cantidad = parseFloat(cantidadRaw);
        if (isNaN(cantidad) || cantidad <= 0) return { success: false, error: 'Cantidad no válida' };
        
        const match = bloqueSelectValue.match(/^(hoy|ayer)_(\d+)$/);
        if (!match) return { success: false, error: 'Bloque no válido' };
        
        const tipo = match[1];
        const index = parseInt(match[2]);
        
        let productoId = null;
        if (productoRaw !== undefined && productoRaw !== null && productoRaw !== '') {
            const parsed = parseInt(productoRaw);
            if (!isNaN(parsed) && parsed > 0) productoId = parsed;
        }
        
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
            fecha_bloque_real: fechaBloqueRealParaGuardar,
            producto_id: productoId
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
        window.showToast('❌ Error: función no disponible', 'error', 6000);
        return;
    }
    
    const bloqueSelectValue = document.getElementById('produccion-bloque')?.value || '';
    const cantidadRaw = document.getElementById('produccion-cantidad')?.value;
    const cantidad = parseFloat(cantidadRaw);
    const notas = document.getElementById('produccion-notas')?.value?.trim() || null;
    
    const productoSelect = document.getElementById('produccion-producto');
    const productoRaw = productoSelect ? productoSelect.value : '';
    
    if (!bloqueSelectValue) { window.showToast('⚠️ Selecciona un bloque', 'warning'); return; }
    if (isNaN(cantidad) || cantidad <= 0) { window.showToast('⚠️ Cantidad debe ser > 0', 'warning'); return; }
    
    ejecutarGuardadoProduccion(fechaISO, bloqueSelectValue, cantidadRaw, notas, productoRaw).then(result => {
        if (result.success) {
            const match = bloqueSelectValue.match(/^(hoy|ayer)_(\d+)$/);
            const esAyer = match && match[1] === 'ayer';
            const sufijo = esAyer ? ' en el bloque de ayer' : ` en el bloque ${match ? match[2] : '?'} de hoy`;
            const sufijoProducto = productoRaw ? ' · 🏷️ producto' : '';
            window.showToast(`✅ Producción guardada: ${formatearCantidadProduccion(cantidad)} uds${sufijo}${sufijoProducto}`, 'success', 4000);
            closeHorarioDetalleModal();
            setTimeout(() => { renderCorrienteCalendario(); showHorarioDetalle(fechaISO); }, 300);
        } else {
            window.showToast('❌ Error: ' + (result.error || 'Desconocido'), 'error', 6000);
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
// PRODUCCIÓN POR RANGO
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
    const productoSelectBase = document.getElementById('produccion-producto');
    const productoIdBase = productoSelectBase ? (productoSelectBase.value || '') : '';
    
    let productoNombreBase = '—';
    if (productoIdBase && productoSelectBase) {
        const selectedOption = productoSelectBase.options[productoSelectBase.selectedIndex];
        productoNombreBase = selectedOption?.textContent || '—';
    }
    
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
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 22px; max-width: 580px; width: 100%; max-height: 95vh; overflow-y: auto; border: 2px solid #3b82f6;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #3b82f6;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">📅</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #3b82f6;">Aplicar producción a un rango</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">Misma cantidad para varios días</p>
                    </div>
                </div>
                <button onclick="closeProduccionRangoModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light);">✕</button>
            </div>
            
            <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px; color: #1e40af;">
                💡 Se aplicará la misma cantidad a TODAS las fechas del rango.
                <br>Los días con producción existente serán <strong>sobrescritos</strong>.
                ${productoIdBase ? `<br>🏷️ <strong>Producto:</strong> ${productoNombreBase}` : '<br>🏷️ <strong>Producto:</strong> — Sin producto específico —'}
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
                        <label for="pr-excluir-domingos" style="font-size: 13px; cursor: pointer; font-weight: 600;">🚫 Excluir los domingos</label>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="pr-excluir-dias-sin-corriente" onchange="previewProduccionRango()" style="width: 16px; height: 16px; cursor: pointer; accent-color: #f59e0b;">
                        <label for="pr-excluir-dias-sin-corriente" style="font-size: 13px; cursor: pointer; font-weight: 600;">🌙 Excluir días sin corriente</label>
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
                        <label style="font-size: 12px;">📝 Notas</label>
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
                            <span style="font-size: 13px;">📌 <strong>Bloque fijo del día base</strong></span>
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
    
    window._prState = { fechaBase, bloqueInfoBase, bloqueSelectBase, productoIdBase };
    
    const form = document.getElementById('produccion-rango-form');
    form.addEventListener('submit', async (e) => { e.preventDefault(); await submitProduccionRango(); });
    
    modal.addEventListener('click', (e) => { if (e.target === modal) closeProduccionRangoModal(); });
    
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
        warningEl.innerHTML = `⚠️ <strong>Atención:</strong> ${produccionesAfectadas.length} día(s) del rango ya tienen producción. Serán <strong>sobrescritos</strong>.`;
        warningEl.style.display = 'block';
    }
    
    const bloqueInfoBase = window._prState?.bloqueInfoBase;
    const bloqueInfoTexto = bloqueInfoBase 
        ? `${bloqueInfoBase.inicioStr} - ${bloqueInfoBase.finStr} (${bloqueInfoBase.duracionHoras.toFixed(1)}h)`
        : 'Sin bloque definido';
    
    const productoIdBase = window._prState?.productoIdBase;
    let productoTexto = '— Sin producto específico —';
    if (productoIdBase) {
        const productoSelect = document.getElementById('produccion-producto');
        if (productoSelect) {
            const selectedOption = productoSelect.options[productoSelect.selectedIndex];
            productoTexto = selectedOption?.textContent || '—';
        }
    }
    
    let previewHtml = `
        <div style="background: var(--bg); border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; font-size: 11px;">
            <div style="display: flex; justify-content: space-between; padding: 2px 0;"><span>📅 Días afectados:</span><strong style="color: #3b82f6;">${fechas.length}</strong></div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;"><span>📦 Cantidad por día:</span><strong style="color: #10b981;">${formatearCantidadProduccion(cantidad)}</strong></div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;"><span>🔨 Bloque:</span><strong style="color: #8b5cf6;">${bloqueInfoTexto}</strong></div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;"><span>🎯 Modo:</span><strong style="color: #f59e0b;">${bloqueTipo === 'relativo' ? 'Relativo' : 'Fijo'}</strong></div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;"><span>🏷️ Producto:</span><strong style="color: #3b82f6;">${productoTexto}</strong></div>
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
            ? `<span style="background: #ef444420; color: #ef4444; font-size: 9px; padding: 1px 6px; border-radius: 6px; margin-left: 4px;">Ya: ${formatearCantidadProduccion(prodExistente.cantidad_produccion)}</span>` 
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
        previewHtml += `<div style="margin-top: 8px; padding: 6px 10px; background: #f59e0b15; border-left: 3px solid #f59e0b; border-radius: 6px; font-size: 11px; color: #92400e;">⚠️ ${fechasSinBloque} día(s) serán omitidos.</div>`;
    }
    
    container.innerHTML = previewHtml;
}

async function submitProduccionRango() {
    const inicio = document.getElementById('pr-fecha-inicio')?.value;
    const fin = document.getElementById('pr-fecha-fin')?.value;
    const cantidad = parseFloat(document.getElementById('pr-cantidad')?.value);
    const notas = document.getElementById('pr-notas')?.value?.trim() || null;
    const bloqueTipo = document.querySelector('input[name="pr-bloque-tipo"]:checked')?.value || 'relativo';
    
    if (!inicio || !fin) { window.showToast('⚠️ Especifica fecha inicio y fin', 'error'); return; }
    if (inicio > fin) { window.showToast('⚠️ La fecha "desde" debe ser anterior', 'error'); return; }
    if (isNaN(cantidad) || cantidad <= 0) { window.showToast('⚠️ Cantidad debe ser > 0', 'error'); return; }
    
    const fechas = getFechasDelRango();
    if (fechas.length === 0) { window.showToast('⚠️ El rango no genera fechas', 'warning'); return; }
    
    const bloqueInfoBase = window._prState?.bloqueInfoBase;
    const bloqueSelectBase = window._prState?.bloqueSelectBase || '';
    const productoIdBase = window._prState?.productoIdBase || '';
    const matchBase = bloqueSelectBase.match(/^(hoy|ayer)_(\d+)$/);
    const tipoBase = matchBase ? matchBase[1] : 'hoy';
    const indexBase = matchBase ? parseInt(matchBase[2]) : 1;
    const esBloqueAyerBase = tipoBase === 'ayer';
    
    let productoId = null;
    if (productoIdBase !== undefined && productoIdBase !== null && productoIdBase !== '') {
        const parsed = parseInt(productoIdBase);
        if (!isNaN(parsed) && parsed > 0) productoId = parsed;
    }
    
    let produccionesExistentes = { total: 0, fechas: [] };
    try {
        if (window.DBModule && typeof window.DBModule.contarProduccionEnRango === 'function') {
            produccionesExistentes = window.DBModule.contarProduccionEnRango(inicio, fin);
        }
    } catch (e) {}
    
    const fechasSet = new Set(fechas);
    const produccionesAfectadas = produccionesExistentes.fechas.filter(f => fechasSet.has(f));
    
    const confirm = await window.ModalModule.showConfirm({
        title: '📅 Aplicar a rango',
        message: `¿Aplicar producción a ${fechas.length} día(s)?\n\n📅 ${inicio} → ${fin}\n📦 ${formatearCantidadProduccion(cantidad)} por día\n${produccionesAfectadas.length > 0 ? `\n⚠️ Se sobrescribirán ${produccionesAfectadas.length} producción(es).\n` : ''}\n¿Confirmas?`,
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
                if (!bloqueEq) { fallidos.push(`${fecha}: sin bloque equivalente`); continue; }
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
                fecha_bloque_real: fechaBloqueRealGuardar,
                producto_id: productoId
            });
        } catch (e) { fallidos.push(`${fecha}: ${e.message}`); }
    }
    
    if (exitos.length === 0) {
        window.showToast('❌ No se pudo preparar ninguna fecha válida', 'error', 6000);
        return;
    }
    
    try {
        window.showToast(`⏳ Aplicando a ${exitos.length} día(s)...`, 'info', 3000);
        
        const grupos = {};
        for (const ex of exitos) {
            const key = `${ex.hora_inicio}|${ex.hora_fin}|${ex.bloque_index}|${ex.es_bloque_dia_anterior}|${ex.fecha_bloque_real}|${ex.producto_id || ''}`;
            if (!grupos[key]) {
                grupos[key] = {
                    hora_inicio: ex.hora_inicio, hora_fin: ex.hora_fin,
                    bloque_index: ex.bloque_index,
                    es_bloque_dia_anterior: ex.es_bloque_dia_anterior,
                    fecha_bloque_real: ex.fecha_bloque_real,
                    producto_id: ex.producto_id,
                    fechas: []
                };
            }
            grupos[key].fechas.push(ex.fecha);
        }
        
        let totalCreados = 0;
        let totalActualizados = 0;
        
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
                fecha_bloque_real: grupo.fecha_bloque_real,
                producto_id: grupo.producto_id
            });
            if (result.success) {
                totalCreados += result.creados || 0;
                totalActualizados += result.actualizados || 0;
            }
        }
        
        let msgFinal = `✅ Aplicado: ${totalCreados} nuevo(s)`;
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
                <div style="display: flex; justify-content: space-between;"><span>📋 Pedidos:</span><strong>${formatearCantidadProduccion(conteo.pedidos)}</strong></div>
                <div style="display: flex; justify-content: space-between;"><span>💰 Ventas:</span><strong>${formatearCantidadProduccion(conteo.ventas)}</strong></div>
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

window.consultarHorariosFecha = consultarHorariosFecha;

// ============================================================
// GENERAR REPORTE PDF DE CORRIENTE
// ============================================================

function generarReportePDF(tipo) {
    const desde = document.getElementById('reporte-fecha-desde').value;
    const hasta = document.getElementById('reporte-fecha-hasta').value;

    if (!desde || !hasta) { window.showToast('⚠️ Selecciona un rango', 'error'); return; }
    if (desde > hasta) { window.showToast('⚠️ Fecha "desde" debe ser anterior', 'error'); return; }

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
                💡 Los horarios se generan automáticamente.
                <br>🔄 Ciclo: ${config.horasCorriente || 3}h / ${config.horasApagon || 12}h
                <br>🌙 = Producción en bloque del día anterior
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

window.generarReportePDF = generarReportePDF;

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
                <button onclick="closeExpensesReportModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light);">✕</button>
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

window.showExpensesReportModal = showExpensesReportModal;
window.closeExpensesReportModal = closeExpensesReportModal;

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

window.showWaitingListFromSettings = showWaitingListFromSettings;
window.reporteListaEsperaFromSettings = reporteListaEsperaFromSettings;

// ============================================================
// CANCELACIÓN GLOBAL DE PEDIDOS
// ============================================================

function showGlobalCancelModal() {
    const user = window.AuthModule.getCurrentUser();
    if (!user || user.is_admin !== 1) {
        window.showToast('🔒 Solo el administrador', 'warning', 4000);
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
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 520px; width: 100%; max-height: 92vh; overflow-y: auto; border: 2px solid #dc2626;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #dc2626;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 32px;">🚨</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #dc2626;">Cancelación Global</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">Cancela pedidos por rango</p>
                    </div>
                </div>
                <button onclick="closeGlobalCancelModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light);">✕</button>
            </div>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 12px; color: #991b1b;">
                ⚠️ <strong>ATENCIÓN:</strong> Esta acción cancelará TODOS los pedidos activos en el rango. Se repondrá el stock.
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
    if (fechaDesde > fechaHasta) { window.showToast('⚠️ Fecha "desde" debe ser anterior', 'error'); return; }
    
    const negocioId = window.DBModule.getNegocioIdActual();
    const pedidosEnRango = window.DBModule.query(`
        SELECT COUNT(*) as n FROM orders
        WHERE negocio_id = ? AND deleted_at IS NULL
          AND status IN ('pending', 'confirmed', 'production', 'ready')
          AND DATE(delivery_date) >= DATE(?) AND DATE(delivery_date) <= DATE(?)
    `, [negocioId, fechaDesde, fechaHasta]);
    
    const count = pedidosEnRango[0]?.n || 0;
    if (count === 0) { window.showToast(`ℹ️ No hay pedidos cancelables`, 'info', 5000); return; }
    
    const confirm1 = await window.ModalModule.showConfirm({
        title: '⚠️ Confirmar cancelación',
        message: `Se cancelarán ${count} pedido(s).\n\n📌 Causa: ${causa}\n\n¿Continuar?`,
        confirmText: '⚠️ CONTINUAR', cancelText: '❌ Cancelar',
        icon: '⚠️', confirmColor: '#f59e0b'
    });
    if (!confirm1) return;
    
    const confirm2 = await window.ModalModule.showConfirm({
        title: '🚨 CONFIRMACIÓN FINAL',
        message: `ÚLTIMA advertencia.\n\nSe cancelarán ${count} pedido(s).\n\n¿Confirmas?`,
        confirmText: '🚨 SÍ, CANCELAR TODO', cancelText: '❌ NO',
        icon: '🚨', confirmColor: '#dc2626'
    });
    if (!confirm2) { window.showToast('❌ Cancelación abortada', 'info', 2000); return; }
    
    closeGlobalCancelModal();
    
    try {
        window.showToast('⏳ Cancelando pedidos...', 'info', 3000);
        const result = await window.OrdersModule.cancelarPedidosGlobalmente(fechaDesde, fechaHasta, causa, nota);
        
        if (!result.success) { window.showToast('❌ Error: ' + (result.error || 'Desconocido'), 'error', 6000); return; }
        
        await window.ModalModule.showAlert({
            title: '✅ Cancelación exitosa',
            message: `🚫 Pedidos cancelados: ${result.cancelados}\n🔄 Items reiniciados: ${result.reiniciados}\n⏰ Items preservados: ${result.preservados}`,
            icon: '✅', type: 'success'
        });
        
        window.showToast(`✅ ${result.cancelados} pedido(s) cancelado(s)`, 'success', 5000);
        
        if (typeof window.refreshCurrentView === 'function') setTimeout(window.refreshCurrentView, 500);
        if (typeof window.loadDashboardData === 'function') setTimeout(window.loadDashboardData, 800);
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error', 6000);
    }
}

window.showGlobalCancelModal = showGlobalCancelModal;
window.closeGlobalCancelModal = closeGlobalCancelModal;
window.executeGlobalCancel = executeGlobalCancel;

// ============================================================
// REPROGRAMAR PEDIDOS POR RANGO
// ============================================================

function showReprogramarPedidosModal() {
    const user = window.AuthModule.getCurrentUser();
    if (!user || user.is_admin !== 1) { window.showToast('🔒 Solo admin', 'warning', 4000); return; }
    
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
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 560px; width: 100%; max-height: 92vh; overflow-y: auto; border: 2px solid #8b5cf6;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #8b5cf6;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 32px;">🔄</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #8b5cf6;">Reprogramar Pedidos</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">Mueve pedidos de una fecha a otra</p>
                    </div>
                </div>
                <button onclick="closeReprogramarModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light);">✕</button>
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
                    <div style="text-align: center; color: var(--text-light); padding: 6px;">
                        ℹ️ Selecciona un rango y una fecha destino para ver la vista previa.
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px;">
                    <button type="submit" class="btn" style="flex: 1; padding: 12px; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">🔄 REPROGRAMAR</button>
                    <button type="button" onclick="closeReprogramarModal()" class="btn secondary" style="flex: 1; padding: 12px;">❌ Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const form = document.getElementById('reprogramar-form');
    form.addEventListener('submit', async (e) => { e.preventDefault(); await executeReprogramarPedidos(); });
    modal.addEventListener('click', (e) => { if (e.target === modal) closeReprogramarModal(); });
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
    if (fechaDesde > fechaHasta) { window.showToast('⚠️ Fecha "desde" debe ser anterior', 'error'); return; }
    if (fechaDestino >= fechaDesde && fechaDestino <= fechaHasta) { window.showToast('⚠️ Fecha destino no puede estar en rango', 'error'); return; }
    
    const negocioId = window.DBModule.getNegocioIdActual();
    let countSql = `SELECT COUNT(*) as n FROM orders WHERE negocio_id = ? AND deleted_at IS NULL AND status IN ('pending', 'confirmed', 'production', 'ready') AND DATE(delivery_date) >= DATE(?) AND DATE(delivery_date) <= DATE(?)`;
    let countParams = [negocioId, fechaDesde, fechaHasta];
    if (clienteFiltro) { countSql += ' AND LOWER(client_name) LIKE LOWER(?)'; countParams.push('%' + clienteFiltro + '%'); }
    
    const countResult = window.DBModule.query(countSql, countParams);
    const count = countResult[0]?.n || 0;
    
    if (count === 0) { window.showToast('ℹ️ No hay pedidos', 'info', 4000); return; }
    
    const confirm = await window.ModalModule.showConfirm({
        title: '🔄 Confirmar reprogramación',
        message: `Se moverán ${count} pedido(s) al ${fechaDestino}.\n\n¿Continuar?`,
        confirmText: '🔄 CONTINUAR', cancelText: '❌ Cancelar',
        icon: '🔄', confirmColor: '#8b5cf6'
    });
    if (!confirm) return;
    
    closeReprogramarModal();
    
    try {
        window.showToast('⏳ Reprogramando...', 'info', 3000);
        const result = await window.OrdersModule.reprogramarPedidosPorRango(fechaDesde, fechaHasta, fechaDestino, causa, nota, clienteFiltro);
        
        if (!result.success) { window.showToast('❌ Error: ' + (result.error || 'Desconocido'), 'error', 6000); return; }
        
        await window.ModalModule.showAlert({
            title: '✅ Reprogramación exitosa',
            message: `Se reprogramaron ${result.reprogramados} pedido(s).\n\n📅 Nueva fecha: ${fechaDestino}`,
            icon: '✅', type: 'success'
        });
        
        window.showToast(`✅ ${result.reprogramados} pedido(s) reprogramado(s)`, 'success', 5000);
        
        if (typeof window.refreshCurrentView === 'function') setTimeout(window.refreshCurrentView, 500);
        if (typeof window.loadDashboardData === 'function') setTimeout(window.loadDashboardData, 800);
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error', 6000);
    }
}

window.showReprogramarPedidosModal = showReprogramarPedidosModal;
window.closeReprogramarModal = closeReprogramarModal;
window.actualizarPreviewReprogramacion = actualizarPreviewReprogramacion;
window.executeReprogramarPedidos = executeReprogramarPedidos;

// ============================================================
// 🆕 CORRECCIÓN #8 (240926): BACKUPS - REESCRITURA COMPLETA
// ============================================================
// 
// PROBLEMA ANTERIOR:
//   Las funciones de exportar/importar reemplazaban temporalmente
//   ModalModule.showConfirm, lo cual era frágil. Además, el input
//   file se eliminaba demasiado pronto en móviles, cancelando el
//   diálogo de selección de archivo.
//
// SOLUCIÓN:
//   1. Eliminado el reemplazo temporal de showConfirm.
//   2. Flujo lineal con await: confirmar → mostrar progreso → ejecutar.
//   3. Input file con timeout de 5 minutos para no cancelar el diálogo.
//   4. Manejo de errores robusto en cada paso.
//   5. Modal de progreso se cierra garantizadamente con triple fallback.
// ============================================================

/**
 * 🆕 CORRECCIÓN #8: Abre un diálogo de selección de archivo de forma
 * robusta, esperando hasta 5 minutos antes de eliminar el input.
 * 
 * @param {string} accept - Tipos MIME aceptados (ej: ".db,.sqlite")
 * @returns {Promise<File|null>} - El archivo seleccionado o null
 */
function abrirSelectorArchivo(accept = '.db,.sqlite,.sqlite3') {
    const LOG_PREFIX = '📁 [abrirSelectorArchivo]';
    console.log(`${LOG_PREFIX} Abriendo selector de archivo...`);
    
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.style.position = 'fixed';
        input.style.top = '-1000px';
        input.style.left = '-1000px';
        input.style.opacity = '0';
        input.style.pointerEvents = 'none';
        
        let resolved = false;
        let timeoutId = null;
        
        const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            setTimeout(() => {
                if (input.parentNode) input.parentNode.removeChild(input);
                console.log(`${LOG_PREFIX} Input eliminado del DOM`);
            }, 2000);
        };
        
        input.onchange = (e) => {
            if (resolved) return;
            resolved = true;
            const file = e.target.files && e.target.files[0];
            console.log(`${LOG_PREFIX} Archivo seleccionado: ${file?.name || 'ninguno'}`);
            cleanup();
            resolve(file || null);
        };
        
        // Fallback: si el usuario cancela, el navegador no dispara onchange
        // en algunos casos, así que usamos focus como heurística
        window.addEventListener('focus', function onFocus() {
            window.removeEventListener('focus', onFocus);
            setTimeout(() => {
                if (resolved) return;
                if (input.files && input.files.length > 0) {
                    resolved = true;
                    const file = input.files[0];
                    console.log(`${LOG_PREFIX} Archivo detectado por focus: ${file.name}`);
                    cleanup();
                    resolve(file);
                } else {
                    resolved = true;
                    console.log(`${LOG_PREFIX} Cancelado por el usuario`);
                    cleanup();
                    resolve(null);
                }
            }, 500);
        }, { once: true });
        
        // Timeout de seguridad: 5 minutos
        timeoutId = setTimeout(() => {
            if (resolved) return;
            resolved = true;
            console.warn(`${LOG_PREFIX} Timeout de 5 minutos → sin archivo`);
            cleanup();
            resolve(null);
        }, 5 * 60 * 1000);
        
        document.body.appendChild(input);
        input.click();
    });
}

/**
 * 🆕 CORRECCIÓN #8: Exportar copia COMPLETA (admin)
 * Flujo: confirmar → progreso → ejecutar → cerrar progreso.
 */
async function exportDatabaseCompleteAction() {
    const LOG_PREFIX = '📦 [exportDatabaseComplete]';
    console.log(`${LOG_PREFIX} Iniciando...`);
    
    const user = window.AuthModule.getCurrentUser();
    if (!user || user.is_admin !== 1) {
        window.showToast('⚠️ Solo el administrador puede exportar la copia completa', 'warning', 4000);
        return;
    }
    
    // 1) Confirmar primero
    const confirm = await window.ModalModule.showConfirm({
        title: '📦 Exportar copia completa',
        message: 'Se exportará TODA la base de datos, incluyendo usuarios y negocios.\n\n' +
                 '💾 Guarda el archivo en un lugar seguro.\n\n' +
                 '¿Continuar?',
        confirmText: '✅ Exportar',
        cancelText: '❌ Cancelar',
        icon: '📦',
        confirmColor: '#10b981'
    });
    
    if (!confirm) {
        console.log(`${LOG_PREFIX} Cancelado por el usuario`);
        return;
    }
    
    // 2) Mostrar progreso
    let progress = null;
    try {
        progress = window.ModalModule.showProgressModal({
            title: 'Exportando copia completa',
            message: 'Preparando datos...',
            icon: '📦'
        });
    } catch (e) {
        console.warn(`${LOG_PREFIX} No se pudo mostrar modal:`, e);
    }
    
    // 3) Ejecutar exportación en el siguiente tick
    setTimeout(() => {
        try {
            if (progress) progress.update('Serializando base de datos...', 30);
            
            const result = window.DBModule.downloadDatabase(window.DBModule.BACKUP_TYPE_COMPLETE);
            
            if (result && result.success) {
                console.log(`${LOG_PREFIX} ✅ Completado:`, result.filename);
                if (progress) progress.update('Generando archivo...', 80);
                
                setTimeout(() => {
                    if (progress) {
                        progress.success(`✅ Copia completa exportada (${(result.size / 1024).toFixed(1)} KB)`);
                    }
                }, 300);
            } else {
                console.error(`${LOG_PREFIX} ❌ Error:`, result?.error);
                if (progress) {
                    progress.error(result?.error || 'Error al exportar');
                } else {
                    window.showToast('❌ Error: ' + (result?.error || 'Desconocido'), 'error', 5000);
                }
            }
        } catch (e) {
            console.error(`${LOG_PREFIX} ❌ Excepción:`, e);
            if (progress) {
                progress.error(e.message);
            } else {
                window.showToast('❌ Error: ' + e.message, 'error', 5000);
            }
        }
    }, 150);
}

/**
 * 🆕 CORRECCIÓN #8: Exportar copia SOLO DATOS (todos los usuarios)
 */
async function exportDatabaseDataOnlyAction() {
    const LOG_PREFIX = '📊 [exportDatabaseDataOnly]';
    console.log(`${LOG_PREFIX} Iniciando...`);
    
    // 1) Confirmar primero
    const confirm = await window.ModalModule.showConfirm({
        title: '📊 Exportar copia de datos',
        message: 'Se exportarán los datos operativos (ventas, pedidos, insumos, etc.)\n\n' +
                 '⚠️ NO se incluyen usuarios ni negocios.\n\n' +
                 '¿Continuar?',
        confirmText: '✅ Exportar',
        cancelText: '❌ Cancelar',
        icon: '📊',
        confirmColor: '#3b82f6'
    });
    
    if (!confirm) {
        console.log(`${LOG_PREFIX} Cancelado por el usuario`);
        return;
    }
    
    // 2) Mostrar progreso
    let progress = null;
    try {
        progress = window.ModalModule.showProgressModal({
            title: 'Exportando datos',
            message: 'Preparando datos operativos...',
            icon: '📊'
        });
    } catch (e) {
        console.warn(`${LOG_PREFIX} No se pudo mostrar modal:`, e);
    }
    
    // 3) Ejecutar
    setTimeout(() => {
        try {
            if (progress) progress.update('Serializando...', 30);
            
            const result = window.DBModule.downloadDatabase(window.DBModule.BACKUP_TYPE_DATA_ONLY);
            
            if (result && result.success) {
                console.log(`${LOG_PREFIX} ✅ Completado:`, result.filename);
                if (progress) progress.update('Generando archivo...', 80);
                
                setTimeout(() => {
                    if (progress) {
                        progress.success(`✅ Copia de datos exportada (${(result.size / 1024).toFixed(1)} KB)`);
                    }
                }, 300);
            } else {
                console.error(`${LOG_PREFIX} ❌ Error:`, result?.error);
                if (progress) {
                    progress.error(result?.error || 'Error al exportar');
                } else {
                    window.showToast('❌ Error: ' + (result?.error || 'Desconocido'), 'error', 5000);
                }
            }
        } catch (e) {
            console.error(`${LOG_PREFIX} ❌ Excepción:`, e);
            if (progress) {
                progress.error(e.message);
            } else {
                window.showToast('❌ Error: ' + e.message, 'error', 5000);
            }
        }
    }, 150);
}

/**
 * 🆕 CORRECCIÓN #8: Importar copia (detección automática)
 * Flujo: seleccionar archivo → confirmar → progreso → ejecutar.
 */
async function importDatabaseSmartAction() {
    const LOG_PREFIX = '📥 [importDatabaseSmart]';
    console.log(`${LOG_PREFIX} Iniciando...`);
    
    // 1) Seleccionar archivo (con timeout para no cancelar el diálogo)
    const file = await abrirSelectorArchivo('.db,.sqlite,.sqlite3');
    
    if (!file) {
        console.log(`${LOG_PREFIX} Sin archivo seleccionado`);
        return;
    }
    
    const user = window.AuthModule.getCurrentUser();
    const isAdmin = user && user.is_admin === 1;
    
    // 2) Confirmar
    const confirm = await window.ModalModule.showConfirm({
        title: '📥 Importar copia',
        message: `¿Importar "${file.name}"?\n\n` +
                 `⚠️ Esto REEMPLAZARÁ todos los datos actuales` +
                 `${isAdmin ? ' (incluyendo usuarios y negocios)' : ''}.\n\n` +
                 `💡 Haz una copia de seguridad antes si tienes datos importantes.`,
        confirmText: '📥 Importar',
        cancelText: '❌ Cancelar',
        icon: '⚠️',
        confirmColor: '#ef4444'
    });
    
    if (!confirm) {
        console.log(`${LOG_PREFIX} Cancelado por el usuario`);
        return;
    }
    
    // 3) Mostrar progreso
    let progress = null;
    try {
        progress = window.ModalModule.showProgressModal({
            title: 'Importando copia',
            message: 'Leyendo archivo...',
            icon: '📥'
        });
    } catch (e) {
        console.warn(`${LOG_PREFIX} No se pudo mostrar modal:`, e);
    }
    
    // 4) Ejecutar importación
    try {
        if (progress) progress.update('Validando archivo...', 20);
        
        const result = await window.DBModule.importDatabase(file);
        
        if (result && result.success) {
            console.log(`${LOG_PREFIX} ✅ Importación exitosa:`, result.tables?.length, 'tablas');
            if (progress) progress.update('Aplicando cambios...', 90);
            
            setTimeout(() => {
                if (progress) {
                    progress.success(`✅ Importados ${result.tables?.length || 0} tablas`);
                }
            }, 300);
            
            // Recargar tras breve pausa
            setTimeout(() => {
                const url = new URL(window.location.href);
                url.searchParams.set('refresh', Date.now());
                window.location.href = url.toString();
            }, 1800);
        } else {
            const errMsg = result?.error || 'Error desconocido';
            console.error(`${LOG_PREFIX} ❌ Error:`, errMsg);
            if (progress) {
                progress.error(errMsg);
            } else {
                window.showToast('❌ Error: ' + errMsg, 'error', 6000);
            }
        }
    } catch (e) {
        console.error(`${LOG_PREFIX} ❌ Excepción:`, e);
        if (progress) {
            progress.error(e.message);
        } else {
            window.showToast('❌ Error: ' + e.message, 'error', 6000);
        }
    }
}

/**
 * 🆕 CORRECCIÓN #8: Importar solo datos (reemplaza operativos)
 */
async function importDatabaseDataOnlyFromFileAction() {
    const LOG_PREFIX = '📊 [importDatabaseDataOnly]';
    console.log(`${LOG_PREFIX} Iniciando...`);
    
    const file = await abrirSelectorArchivo('.db,.sqlite,.sqlite3');
    if (!file) return;
    
    const confirm = await window.ModalModule.showConfirm({
        title: '📊 Importar solo datos',
        message: `¿Importar los DATOS de "${file.name}"?\n\n` +
                 `✅ Se reemplazarán los datos operativos.\n` +
                 `✅ Tus usuarios y código de invitación se CONSERVARÁN.\n\n` +
                 `¿Continuar?`,
        confirmText: '📊 Importar',
        cancelText: '❌ Cancelar',
        icon: '📊',
        confirmColor: '#3b82f6'
    });
    
    if (!confirm) return;
    
    let progress = null;
    try {
        progress = window.ModalModule.showProgressModal({
            title: 'Importando datos',
            message: 'Reemplazando datos operativos...',
            icon: '📊'
        });
    } catch (e) {}
    
    try {
        if (progress) progress.update('Validando archivo...', 20);
        
        const result = await window.DBModule.importDatabaseDataOnlyFromFile();
        
        if (result && result.success) {
            if (progress) progress.update('Aplicando cambios...', 90);
            setTimeout(() => {
                if (progress) progress.success(`✅ Datos importados`);
            }, 300);
            
            setTimeout(() => {
                const url = new URL(window.location.href);
                url.searchParams.set('refresh', Date.now());
                window.location.href = url.toString();
            }, 1800);
        } else {
            const errMsg = result?.error || 'Error desconocido';
            if (progress) progress.error(errMsg);
            else window.showToast('❌ Error: ' + errMsg, 'error', 6000);
        }
    } catch (e) {
        if (progress) progress.error(e.message);
        else window.showToast('❌ Error: ' + e.message, 'error', 6000);
    }
}

/**
 * 🆕 CORRECCIÓN #8: Fusionar bases de datos
 */
async function importDatabaseFusionAction() {
    const LOG_PREFIX = '🔀 [importDatabaseFusion]';
    console.log(`${LOG_PREFIX} Iniciando...`);
    
    const user = window.AuthModule.getCurrentUser();
    if (!user || user.is_admin !== 1) {
        window.showToast('⚠️ Solo el administrador puede fusionar', 'warning', 4000);
        return;
    }
    
    const file = await abrirSelectorArchivo('.db,.sqlite,.sqlite3');
    if (!file) return;
    
    const confirm = await window.ModalModule.showConfirm({
        title: '🔀 Fusionar bases de datos',
        message: `¿Fusionar los datos de "${file.name}" con los actuales?\n\n` +
                 `📥 Los registros NUEVOS se añadirán.\n` +
                 `🔄 Los existentes (mismo uuid) se comparan: gana el más reciente.\n` +
                 `✅ Tus usuarios y código se CONSERVAN.\n\n` +
                 `¿Continuar?`,
        confirmText: '🔀 Fusionar',
        cancelText: '❌ Cancelar',
        icon: '🔀',
        confirmColor: '#8b5cf6'
    });
    
    if (!confirm) return;
    
    let progress = null;
    try {
        progress = window.ModalModule.showProgressModal({
            title: 'Fusionando bases',
            message: 'Analizando registros...',
            icon: '🔀'
        });
    } catch (e) {}
    
    try {
        if (progress) progress.update('Comparando por UUID...', 30);
        
        const result = await window.DBModule.importDatabaseDataOnlyFromFile();
        
        if (result && result.success) {
            if (progress) progress.update('Consolidando cambios...', 90);
            setTimeout(() => {
                if (progress) {
                    const insertados = result.inserted || 0;
                    const actualizados = result.updated || 0;
                    const omitidos = result.skipped || 0;
                    progress.success(`✅ Fusión: +${insertados}, ~${actualizados}, =${omitidos}`);
                }
            }, 300);
            
            setTimeout(() => {
                const url = new URL(window.location.href);
                url.searchParams.set('refresh', Date.now());
                window.location.href = url.toString();
            }, 2200);
        } else {
            const errMsg = result?.error || 'Error desconocido';
            if (progress) progress.error(errMsg);
            else window.showToast('❌ Error: ' + errMsg, 'error', 6000);
        }
    } catch (e) {
        if (progress) progress.error(e.message);
        else window.showToast('❌ Error: ' + e.message, 'error', 6000);
    }
}

// Exponer las funciones globalmente
window.exportDatabaseCompleteAction = exportDatabaseCompleteAction;
window.exportDatabaseDataOnlyAction = exportDatabaseDataOnlyAction;
window.importDatabaseSmartAction = importDatabaseSmartAction;
window.importDatabaseDataOnlyFromFileAction = importDatabaseDataOnlyFromFileAction;
window.importDatabaseFusionAction = importDatabaseFusionAction;
window.abrirSelectorArchivo = abrirSelectorArchivo;

// ============================================================
// 🆕 CORRECCIÓN #6: BOTÓN PARA RESTAURAR ESTILOS RESIDUALES
// ============================================================

function restaurarEstilosAction() {
    const LOG_PREFIX = '🎨 [restaurarEstilos]';
    console.log(`${LOG_PREFIX} Restaurando estilos residuales...`);
    
    try {
        if (typeof window.limpiarEstilosResiduales === 'function') {
            const limpiados = window.limpiarEstilosResiduales();
            console.log(`${LOG_PREFIX} ✅ limpiarEstilosResiduales() ejecutado. Propiedades limpiadas: ${limpiados}`);
        } else {
            console.warn(`${LOG_PREFIX} ⚠️ limpiarEstilosResiduales no está disponible`);
        }
        
        const header = document.querySelector('#appScreen header');
        if (header) {
            header.style.removeProperty('transform');
            header.style.removeProperty('will-change');
            header.style.removeProperty('isolation');
            header.style.position = 'sticky';
            header.style.top = '0';
            header.style.zIndex = '200';
            console.log(`${LOG_PREFIX} Header restaurado`);
        }
        
        document.body.style.removeProperty('transform');
        document.body.style.removeProperty('will-change');
        document.body.style.removeProperty('isolation');
        document.body.style.removeProperty('overflow');
        
        document.documentElement.style.removeProperty('transform');
        document.documentElement.style.removeProperty('will-change');
        document.documentElement.style.removeProperty('overflow-x');
        
        window.showToast('✅ Estilos restaurados correctamente', 'success', 3000);
        
    } catch (e) {
        console.error(`${LOG_PREFIX} ❌ Error:`, e);
        window.showToast('❌ Error al restaurar: ' + e.message, 'error', 5000);
    }
}

window.restaurarEstilosAction = restaurarEstilosAction;

// ============================================================
// MÓDULO DE USUARIOS (SOLO ADMIN)
// ============================================================

async function showUsersModal() {
    const user = window.AuthModule.getCurrentUser();
    if (!user || user.is_admin !== 1) {
        window.showToast('🔒 Solo el administrador puede gestionar usuarios', 'warning', 4000);
        return;
    }
    
    const existingModal = document.getElementById('users-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'users-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999999; padding: 15px;
    `;
    
    document.body.appendChild(modal);
    window._usersModal = modal;
    
    await renderUsersContent();
    
    modal.addEventListener('click', (e) => { if (e.target === modal) closeUsersModal(); });
}

async function renderUsersContent() {
    const modal = document.getElementById('users-modal');
    if (!modal) return;
    
    try {
        const usuarios = window.AuthModule.getUsuariosDelNegocio();
        const negocio = window.AuthModule.getCurrentNegocio();
        const currentUser = window.AuthModule.getCurrentUser();
        
        const totalUsuarios = usuarios.length;
        const totalAdmins = usuarios.filter(u => u.is_admin === 1).length;
        
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 20px; max-width: 700px; width: 100%; max-height: 92vh; display: flex; flex-direction: column; border: 2px solid #f59e0b;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 2px solid #f59e0b;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 28px;">👥</span>
                        <div>
                            <h2 style="margin: 0; font-size: 18px; color: #f59e0b;">Gestión de Usuarios</h2>
                            <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">${negocio?.nombre || 'Negocio'}</p>
                        </div>
                    </div>
                    <button onclick="closeUsersModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light);">✕</button>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px;">
                    <div style="background: #f59e0b15; border-left: 3px solid #f59e0b; padding: 8px 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${totalUsuarios}</div>
                        <div style="font-size: 11px; color: var(--text-light);">👥 Total</div>
                    </div>
                    <div style="background: #8b5cf615; border-left: 3px solid #8b5cf6; padding: 8px 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 20px; font-weight: 700; color: #8b5cf6;">${totalAdmins}</div>
                        <div style="font-size: 11px; color: var(--text-light);">👑 Admins</div>
                    </div>
                    <div style="background: #3b82f615; border-left: 3px solid #3b82f6; padding: 8px 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 20px; font-weight: 700; color: #3b82f6;">${negocio?.codigo_invitacion || '—'}</div>
                        <div style="font-size: 11px; color: var(--text-light);">🔑 Código</div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
                    <button onclick="showCreateUserModal()" class="btn primary" style="padding: 6px 14px; font-size: 12px; width: auto; background: #10b981; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">➕ Crear usuario</button>
                    <button onclick="copiarCodigoInvitacion('${negocio?.codigo_invitacion || ''}')" class="btn secondary" style="padding: 6px 14px; font-size: 12px; width: auto;">📋 Copiar código</button>
                    <button onclick="regenerarCodigoInvitacionAction()" class="btn secondary" style="padding: 6px 14px; font-size: 12px; width: auto; color: #ef4444; border-color: #ef4444;">🔄 Regenerar código</button>
                </div>
                
                <div style="flex: 1; overflow-y: auto; max-height: 450px;">
                    ${usuarios.map(u => {
                        const esYo = u.id === currentUser.id;
                        const esAdmin = u.is_admin === 1;
                        return `
                            <div style="background: var(--bg); border-radius: 10px; padding: 12px; margin-bottom: 8px; border-left: 4px solid ${esAdmin ? '#f59e0b' : '#3b82f6'}; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-weight: 700; font-size: 14px;">
                                        ${esAdmin ? '👑 ' : '👤 '} ${u.name || u.username}
                                        ${esYo ? '<span style="font-size: 10px; background: #10b98120; color: #10b981; padding: 1px 6px; border-radius: 6px; margin-left: 6px;">TÚ</span>' : ''}
                                    </div>
                                    <div style="font-size: 12px; color: var(--text-light);">@${u.username}</div>
                                    ${u.email ? `<div style="font-size: 11px; color: var(--text-light);">📧 ${u.email}</div>` : ''}
                                </div>
                                ${!esYo ? `
                                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                                        <button onclick="showEditUserModal(${u.id})" class="btn secondary" style="padding: 4px 10px; font-size: 11px; width: auto;">✏️</button>
                                        <button onclick="showChangePasswordModal(${u.id})" class="btn secondary" style="padding: 4px 10px; font-size: 11px; width: auto;">🔒</button>
                                        <button onclick="handleToggleAdmin(${u.id}, ${esAdmin ? 0 : 1})" class="btn secondary" style="padding: 4px 10px; font-size: 11px; width: auto; color: ${esAdmin ? '#ef4444' : '#10b981'}; border-color: ${esAdmin ? '#ef4444' : '#10b981'};">${esAdmin ? '⬇️' : '👑'}</button>
                                        <button onclick="handleDeleteUser(${u.id})" class="btn secondary" style="padding: 4px 10px; font-size: 11px; width: auto; color: #ef4444; border-color: #ef4444;">🗑️</button>
                                    </div>
                                ` : `
                                    <div style="font-size: 11px; color: var(--text-light); font-style: italic;">(no puedes modificarte)</div>
                                `}
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div style="display: flex; justify-content: flex-end; padding-top: 12px; margin-top: 12px; border-top: 1px solid var(--border-color);">
                    <button onclick="closeUsersModal()" class="btn secondary" style="padding: 10px 20px; font-size: 14px; width: auto;">Cerrar</button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error renderizando usuarios:', error);
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 500px; width: 100%; text-align: center;">
                <span style="font-size: 48px;">❌</span>
                <h2 style="margin: 12px 0 8px;">Error</h2>
                <p style="color: var(--text-light); font-size: 13px;">${error.message}</p>
                <button onclick="closeUsersModal()" class="btn secondary" style="margin-top: 12px; padding: 8px 20px; width: auto;">Cerrar</button>
            </div>
        `;
    }
}

function closeUsersModal() {
    const modal = document.getElementById('users-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
    }
    window._usersModal = null;
}

async function regenerarCodigoInvitacionAction() {
    const confirm = await window.ModalModule.showConfirm({
        title: '🔄 Regenerar código',
        message: 'Se generará un nuevo código de invitación.\n\n⚠️ El código anterior dejará de funcionar.\n\n¿Continuar?',
        confirmText: '🔄 Regenerar', cancelText: 'Cancelar',
        icon: '🔄', confirmColor: '#f59e0b'
    });
    
    if (!confirm) return;
    
    try {
        const user = window.AuthModule.getCurrentUser();
        if (!user.negocio_id) { window.showToast('❌ No hay negocio', 'error'); return; }
        
        const result = window.DBModule.regenerarCodigoInvitacion(user.negocio_id);
        
        if (result.success) {
            window.showToast(`✅ Nuevo código: ${result.codigo}`, 'success', 5000);
            
            const negocio = window.DBModule.getNegocio(user.negocio_id);
            if (negocio) {
                user.negocio = negocio;
                window.AuthModule.setCurrentUser(user);
            }
            
            await renderUsersContent();
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
    } catch (e) {
        window.showToast('❌ Error: ' + e.message, 'error');
    }
}

function showCreateUserModal() {
    const modal = document.createElement('div');
    modal.id = 'create-user-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999999999; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 440px; width: 100%; max-height: 90vh; overflow-y: auto; border: 2px solid #10b981;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #10b981;">
                <h2 style="margin: 0; font-size: 18px; color: #10b981;">➕ Crear Usuario</h2>
                <button onclick="closeCreateUserModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light);">✕</button>
            </div>
            
            <form id="create-user-form" style="display: flex; flex-direction: column; gap: 12px;">
                <div class="form-group">
                    <label>👤 Usuario</label>
                    <input type="text" id="create-user-username" class="input-field" placeholder="nombre_usuario" required>
                </div>
                <div class="form-group">
                    <label>🔒 Contraseña</label>
                    <input type="password" id="create-user-password" class="input-field" placeholder="Mínimo 4 caracteres" required>
                </div>
                <div class="form-group">
                    <label>📛 Nombre completo</label>
                    <input type="text" id="create-user-name" class="input-field" placeholder="Nombre completo" required>
                </div>
                <div class="form-group">
                    <label>📧 Email (opcional)</label>
                    <input type="email" id="create-user-email" class="input-field" placeholder="correo@ejemplo.com">
                </div>
                <div class="form-group">
                    <label>📞 Teléfono (opcional)</label>
                    <input type="tel" id="create-user-phone" class="input-field" placeholder="+53 5555 5555">
                </div>
                <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border-color);">
                    <span style="font-size: 18px;">👑</span>
                    <span style="flex: 1; font-size: 13px;">Es administrador</span>
                    <input type="checkbox" id="create-user-is-admin" style="width: 20px; height: 20px; cursor: pointer; accent-color: #f59e0b;">
                </div>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" style="flex: 1; background: #10b981; color: #fff; border: none; border-radius: 8px; padding: 12px; cursor: pointer; font-weight: 600;">💾 Crear</button>
                    <button type="button" onclick="closeCreateUserModal()" class="btn secondary" style="flex: 1;">❌ Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const form = document.getElementById('create-user-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            username: document.getElementById('create-user-username').value.trim(),
            password: document.getElementById('create-user-password').value.trim(),
            name: document.getElementById('create-user-name').value.trim(),
            email: document.getElementById('create-user-email').value.trim(),
            phone: document.getElementById('create-user-phone').value.trim(),
            isAdmin: document.getElementById('create-user-is-admin').checked
        };
        
        try {
            const result = await window.AuthModule.createUserAsAdmin(data);
            
            if (result.success) {
                window.showToast(`✅ Usuario ${result.username} creado`, 'success');
                closeCreateUserModal();
                await renderUsersContent();
            } else {
                window.showToast('❌ ' + result.error, 'error');
            }
        } catch (e) {
            window.showToast('❌ Error: ' + e.message, 'error');
        }
    });
    
    modal.addEventListener('click', (e) => { if (e.target === modal) closeCreateUserModal(); });
}

function closeCreateUserModal() {
    const modal = document.getElementById('create-user-modal');
    if (modal) { modal.style.animation = 'modalFadeOut 0.2s ease forwards'; setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200); }
}

function showEditUserModal(userId) {
    const usuarios = window.AuthModule.getUsuariosDelNegocio();
    const targetUser = usuarios.find(u => u.id === userId);
    if (!targetUser) { window.showToast('❌ Usuario no encontrado', 'error'); return; }
    
    const modal = document.createElement('div');
    modal.id = 'edit-user-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999999999; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 440px; width: 100%; border: 2px solid #3b82f6;">
            <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #3b82f6;">✏️ Editar Usuario</h2>
            <form id="edit-user-form" style="display: flex; flex-direction: column; gap: 12px;">
                <div class="form-group">
                    <label>👤 Usuario (no editable)</label>
                    <input type="text" class="input-field" value="${targetUser.username}" disabled style="opacity: 0.6;">
                </div>
                <div class="form-group">
                    <label>📛 Nombre completo</label>
                    <input type="text" id="edit-user-name" class="input-field" value="${targetUser.name || ''}" required>
                </div>
                <div class="form-group">
                    <label>📧 Email</label>
                    <input type="email" id="edit-user-email" class="input-field" value="${targetUser.email || ''}">
                </div>
                <div class="form-group">
                    <label>📞 Teléfono</label>
                    <input type="tel" id="edit-user-phone" class="input-field" value="${targetUser.phone || ''}">
                </div>
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
        
        const data = {
            name: document.getElementById('edit-user-name').value.trim(),
            email: document.getElementById('edit-user-email').value.trim(),
            phone: document.getElementById('edit-user-phone').value.trim()
        };
        
        const result = await window.AuthModule.updateUserDataByAdmin(userId, data);
        
        if (result.success) {
            window.showToast('✅ Usuario actualizado', 'success');
            closeEditUserModal();
            await renderUsersContent();
        } else {
            window.showToast('❌ ' + result.error, 'error');
        }
    });
    
    modal.addEventListener('click', (e) => { if (e.target === modal) closeEditUserModal(); });
}

function closeEditUserModal() {
    const modal = document.getElementById('edit-user-modal');
    if (modal) { modal.style.animation = 'modalFadeOut 0.2s ease forwards'; setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200); }
}

function showChangePasswordModal(userId) {
    const modal = document.createElement('div');
    modal.id = 'change-password-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999999999; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 400px; width: 100%; border: 2px solid #f59e0b;">
            <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #f59e0b;">🔒 Cambiar Contraseña</h2>
            <form id="change-password-form" style="display: flex; flex-direction: column; gap: 12px;">
                <div class="form-group">
                    <label>Nueva contraseña</label>
                    <input type="password" id="change-password-new" class="input-field" placeholder="Mínimo 4 caracteres" required>
                </div>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" style="flex: 1; background: #f59e0b; color: #fff; border: none; border-radius: 8px; padding: 12px; cursor: pointer; font-weight: 600;">💾 Cambiar</button>
                    <button type="button" onclick="closeChangePasswordModal()" class="btn secondary" style="flex: 1;">❌ Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const form = document.getElementById('change-password-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('change-password-new').value.trim();
        
        const result = await window.AuthModule.updateUserPassword(userId, newPassword);
        
        if (result.success) {
            window.showToast('✅ Contraseña actualizada', 'success');
            closeChangePasswordModal();
        } else {
            window.showToast('❌ ' + result.error, 'error');
        }
    });
    
    modal.addEventListener('click', (e) => { if (e.target === modal) closeChangePasswordModal(); });
}

function closeChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) { modal.style.animation = 'modalFadeOut 0.2s ease forwards'; setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200); }
}

async function handleToggleAdmin(userId, newIsAdmin) {
    const accion = newIsAdmin ? 'promover a administrador' : 'quitar admin';
    const confirm = await window.ModalModule.showConfirm({
        title: `👑 ${newIsAdmin ? 'Promover' : 'Degradar'} usuario`,
        message: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)}?`,
        confirmText: '✅ Sí',
        cancelText: 'Cancelar',
        icon: '👑',
        confirmColor: newIsAdmin ? '#f59e0b' : '#ef4444'
    });
    
    if (!confirm) return;
    
    const result = await window.AuthModule.toggleUserAdmin(userId, newIsAdmin);
    
    if (result.success) {
        window.showToast(`✅ Usuario ${newIsAdmin ? 'promovido' : 'degradado'}`, 'success');
        await renderUsersContent();
    } else {
        window.showToast('❌ ' + result.error, 'error');
    }
}

async function handleDeleteUser(userId) {
    const confirm = await window.ModalModule.showConfirm({
        title: '🗑️ Eliminar usuario',
        message: '¿Seguro que quieres eliminar este usuario?\n\n⚠️ Esta acción aplica soft-delete.',
        confirmText: '🗑️ Sí, eliminar',
        cancelText: 'Cancelar',
        icon: '🗑️',
        confirmColor: '#ef4444'
    });
    
    if (!confirm) return;
    
    const result = await window.AuthModule.deleteUserByAdmin(userId);
    
    if (result.success) {
        window.showToast(`✅ Usuario ${result.username} eliminado`, 'success');
        await renderUsersContent();
    } else {
        window.showToast('❌ ' + result.error, 'error');
    }
}

window.showUsersModal = showUsersModal;
window.closeUsersModal = closeUsersModal;
window.renderUsersContent = renderUsersContent;
window.regenerarCodigoInvitacionAction = regenerarCodigoInvitacionAction;
window.showCreateUserModal = showCreateUserModal;
window.closeCreateUserModal = closeCreateUserModal;
window.showEditUserModal = showEditUserModal;
window.closeEditUserModal = closeEditUserModal;
window.showChangePasswordModal = showChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.handleToggleAdmin = handleToggleAdmin;
window.handleDeleteUser = handleDeleteUser;

// ============================================================
// SALVA DIFERENCIAL
// ============================================================

function exportSalvaRecetasProductos() {
    try {
        const result = window.DBModule.exportRecetasProductosSalva();
        
        if (result.success) {
            window.showToast(`✅ Salva exportada: ${result.filename} (${result.sizeKB} KB)`, 'success', 5000);
        } else {
            window.showToast('❌ Error: ' + result.error, 'error', 5000);
        }
    } catch (e) {
        window.showToast('❌ Error: ' + e.message, 'error', 5000);
    }
}

async function importSalvaRecetasProductos() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const confirm = await window.ModalModule.showConfirm({
            title: '📥 Importar salva',
            message: `¿Importar "${file.name}"?\n\nSe importarán recetas y productos.`,
            confirmText: '📥 Importar', cancelText: 'Cancelar',
            icon: '🧩', confirmColor: '#8b5cf6'
        });
        
        if (!confirm) return;
        
        try {
            const salvaData = await window.DBModule.readSalvaFile(file);
            const result = window.DBModule.importRecetasProductosSalva(salvaData, 'merge');
            
            if (result.success) {
                const imported = result.imported;
                window.showToast(`✅ Salva importada: ${imported.recipes} recetas, ${imported.productos} productos`, 'success', 5000);
                setTimeout(() => window.location.reload(), 1500);
            } else {
                window.showToast('❌ Error: ' + result.error, 'error', 5000);
            }
        } catch (err) {
            window.showToast('❌ Error: ' + err.message, 'error', 5000);
        }
    };
    
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
}

window.exportSalvaRecetasProductos = exportSalvaRecetasProductos;
window.importSalvaRecetasProductos = importSalvaRecetasProductos;

// ============================================================
// LIMPIAR ÚLTIMO USUARIO
// ============================================================

function clearLastUserAction() {
    window.ModalModule.showConfirm({
        title: '🗑️ Olvidar usuario',
        message: '¿Olvidar el último usuario recordado?',
        confirmText: '🗑️ Sí',
        cancelText: 'Cancelar',
        icon: '🗑️',
        confirmColor: '#ef4444'
    }).then(confirm => {
        if (confirm) {
            window.AuthModule.clearLastUser();
            window.showToast('✅ Usuario olvidado', 'success');
        }
    });
}

window.clearLastUserAction = clearLastUserAction;

// ============================================================
// LIMPIAR DATOS ELIMINADOS
// ============================================================

async function cleanDeletedData() {
    const confirm = await window.ModalModule.showConfirm({
        title: '🧹 Limpiar datos eliminados',
        message: '¿Eliminar PERMANENTEMENTE todos los registros con soft-delete?\n\n⚠️ Esta acción no se puede deshacer.',
        confirmText: '🧹 Sí, limpiar',
        cancelText: 'Cancelar',
        icon: '🧹',
        confirmColor: '#ef4444'
    });
    
    if (!confirm) return;
    
    try {
        const negocioId = window.DBModule.getNegocioIdActual();
        const tablas = [
            'insumos', 'recipes', 'productos', 'orders', 'sales', 'transactions',
            'clients', 'waiting_list', 'bank_accounts', 'corriente_config',
            'premios_config', 'dias_sin_ventas', 'calendario_produccion'
        ];
        
        let totalLimpiados = 0;
        for (const tabla of tablas) {
            try {
                const result = window.DBModule.execute(`DELETE FROM ${tabla} WHERE negocio_id = ? AND deleted_at IS NOT NULL`, [negocioId]);
                totalLimpiados++;
            } catch (e) {
                console.warn(`⚠️ Error limpiando ${tabla}:`, e.message);
            }
        }
        
        window.showToast(`✅ ${totalLimpiados} tablas limpiadas`, 'success', 5000);
    } catch (e) {
        window.showToast('❌ Error: ' + e.message, 'error', 5000);
    }
}

window.cleanDeletedData = cleanDeletedData;

// ============================================================
// REINICIAR BASE DE DATOS
// ============================================================

async function resetDatabaseWithPassword() {
    const password = await window.ModalModule.showPrompt({
        title: '🚨 Reiniciar Base de Datos',
        message: 'Escribe "panario" para confirmar:',
        placeholder: 'Contraseña',
        icon: '🚨'
    });
    
    if (password !== 'panario') {
        window.showToast('❌ Contraseña incorrecta', 'error');
        return;
    }
    
    const confirm = await window.ModalModule.showConfirm({
        title: '⚠️ CONFIRMACIÓN FINAL',
        message: 'Se eliminarán TODOS los datos excepto usuarios y temas.\n\n¿Continuar?',
        confirmText: '🚨 SÍ, REINICIAR',
        cancelText: '❌ Cancelar',
        icon: '⚠️',
        confirmColor: '#dc2626'
    });
    
    if (!confirm) return;
    
    try {
        const negocioId = window.DBModule.getNegocioIdActual();
        const tablas = [
            'insumos', 'recipes', 'recipe_ingredients', 'receta_insumos', 'productos',
            'orders', 'order_items', 'payments', 'waiting_list', 'sales', 'transactions',
            'inventory', 'inventory_movements', 'clients', 'bank_accounts', 'corriente_config',
            'premios_config', 'dias_sin_ventas', 'calendario_produccion', 'notifications'
        ];
        
        for (const tabla of tablas) {
            try {
                window.DBModule.execute(`DELETE FROM ${tabla} WHERE negocio_id = ?`, [negocioId]);
            } catch (e) {}
        }
        
        window.showToast('✅ Base de datos reiniciada', 'success', 5000);
        setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
        window.showToast('❌ Error: ' + e.message, 'error', 5000);
    }
}

window.resetDatabaseWithPassword = resetDatabaseWithPassword;

// ============================================================
// 🆕 CORRECCIÓN #14: MODAL DE ELIMINACIÓN POR ERROR (MEJORADO)
// ============================================================

async function showDeleteSelectorModal() {
    const user = window.AuthModule.getCurrentUser();
    if (!user || user.is_admin !== 1) {
        window.showToast('🔒 Solo el administrador', 'warning', 4000);
        return;
    }
    
    if (window.ModalModule?.cerrarTodosLosModales) window.ModalModule.cerrarTodosLosModales();
    
    const existingModal = document.getElementById('delete-selector-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'delete-selector-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999999; padding: 15px;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 20px; max-width: 750px; width: 100%; max-height: 92vh; display: flex; flex-direction: column; border: 2px solid #dc2626;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 2px solid #dc2626;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">🚨</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #dc2626;">Eliminación por Error</h2>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">Elimina registros creados por error</p>
                    </div>
                </div>
                <button onclick="closeDeleteSelectorModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light);">✕</button>
            </div>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; font-size: 12px; color: #991b1b;">
                ⚠️ <strong>ADVERTENCIA:</strong> Los registros eliminados aquí se borran PERMANENTEMENTE de la base de datos. Esta acción NO se puede deshacer.
            </div>
            
            <div style="display: flex; gap: 6px; margin-bottom: 12px; background: var(--bg); padding: 6px; border-radius: 8px; border: 1px solid var(--border-color);">
                <button id="del-tab-pedidos" onclick="switchDeleteTab('pedidos')" class="btn primary" style="flex: 1; padding: 10px; font-size: 13px; border-radius: 6px;">📋 Pedidos</button>
                <button id="del-tab-ventas" onclick="switchDeleteTab('ventas')" class="btn secondary" style="flex: 1; padding: 10px; font-size: 13px; border-radius: 6px; background: transparent; color: var(--text); border: none;">💰 Ventas</button>
            </div>
            
            <div style="background: var(--bg); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 12px;">
                <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                    <div style="flex: 1; min-width: 100px;">
                        <label style="font-size: 11px; font-weight: 600;">📅 Desde</label>
                        <input type="date" id="del-filter-from" onchange="renderDeleteList()" style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                    </div>
                    <div style="flex: 1; min-width: 100px;">
                        <label style="font-size: 11px; font-weight: 600;">📅 Hasta</label>
                        <input type="date" id="del-filter-to" onchange="renderDeleteList()" style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                    </div>
                    <div style="flex: 2; min-width: 120px;">
                        <label style="font-size: 11px; font-weight: 600;">🔍 Buscar</label>
                        <input type="text" id="del-filter-search" oninput="renderDeleteList()" placeholder="Cliente, producto..." style="width: 100%; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 12px;">
                    </div>
                    <button onclick="clearDeleteFilters()" class="btn secondary" style="padding: 6px 10px; font-size: 11px; width: auto; margin-top: 14px;">🗑️</button>
                </div>
            </div>
            
            <div id="delete-list-container" style="flex: 1; overflow-y: auto; max-height: 400px; padding-right: 4px; margin-bottom: 12px;">
                <div style="text-align: center; padding: 40px; color: var(--text-light);">
                    <span style="font-size: 32px;">⏳</span>
                    <p style="font-size: 13px;">Cargando...</p>
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--border-color); flex-wrap: wrap; gap: 8px;">
                <div style="font-size: 12px; color: var(--text-light);">
                    Seleccionados: <strong id="del-selected-count" style="color: #dc2626;">0</strong>
                </div>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <button onclick="selectAllDeleteItems()" class="btn secondary" style="padding: 8px 14px; font-size: 12px; width: auto;">☑️ Todos</button>
                    <button onclick="deselectAllDeleteItems()" class="btn secondary" style="padding: 8px 14px; font-size: 12px; width: auto;">☐ Ninguno</button>
                    <button onclick="executeDeleteSelected()" class="btn" style="padding: 8px 16px; font-size: 13px; background: #dc2626; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">🗑️ ELIMINAR SELECCIONADOS</button>
                    <button onclick="closeDeleteSelectorModal()" class="btn secondary" style="padding: 8px 14px; font-size: 12px; width: auto;">❌ Cerrar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    window._deleteTab = 'pedidos';
    window._deleteSelection = new Set();
    
    await renderDeleteList();
    
    modal.addEventListener('click', (e) => { if (e.target === modal) closeDeleteSelectorModal(); });
}

function closeDeleteSelectorModal() {
    const modal = document.getElementById('delete-selector-modal');
    if (modal) { modal.style.animation = 'modalFadeOut 0.2s ease forwards'; setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200); }
    window._deleteTab = null;
    window._deleteSelection = null;
}

function switchDeleteTab(tab) {
    window._deleteTab = tab;
    window._deleteSelection.clear();
    
    const tabPedidos = document.getElementById('del-tab-pedidos');
    const tabVentas = document.getElementById('del-tab-ventas');
    
    if (tab === 'pedidos') {
        tabPedidos.className = 'btn primary';
        tabPedidos.style.background = 'var(--primary)';
        tabPedidos.style.color = '#fff';
        tabVentas.className = 'btn secondary';
        tabVentas.style.background = 'transparent';
        tabVentas.style.color = 'var(--text)';
    } else {
        tabVentas.className = 'btn primary';
        tabVentas.style.background = 'var(--primary)';
        tabVentas.style.color = '#fff';
        tabPedidos.className = 'btn secondary';
        tabPedidos.style.background = 'transparent';
        tabPedidos.style.color = 'var(--text)';
    }
    
    renderDeleteList();
}

function clearDeleteFilters() {
    document.getElementById('del-filter-from').value = '';
    document.getElementById('del-filter-to').value = '';
    document.getElementById('del-filter-search').value = '';
    renderDeleteList();
}

async function renderDeleteList() {
    const container = document.getElementById('delete-list-container');
    if (!container) return;
    
    const tab = window._deleteTab || 'pedidos';
    const negocioId = window.DBModule.getNegocioIdActual();
    
    const fromDate = document.getElementById('del-filter-from')?.value || '';
    const toDate = document.getElementById('del-filter-to')?.value || '';
    const search = document.getElementById('del-filter-search')?.value?.trim() || '';
    
    try {
        let items = [];
        
        if (tab === 'pedidos') {
            let sql = `SELECT o.id, o.client_name, o.total, o.status, o.delivery_date, o.created_at,
                       (SELECT GROUP_CONCAT(DISTINCT p.nombre) FROM order_items oi LEFT JOIN productos p ON oi.producto_id = p.id WHERE oi.order_id = o.id AND oi.deleted_at IS NULL) as productos
                       FROM orders o WHERE o.negocio_id = ? AND o.deleted_at IS NULL`;
            let params = [negocioId];
            
            if (fromDate) { sql += ' AND DATE(o.delivery_date) >= DATE(?)'; params.push(fromDate); }
            if (toDate) { sql += ' AND DATE(o.delivery_date) <= DATE(?)'; params.push(toDate); }
            if (search) { sql += ' AND (o.client_name LIKE ? OR o.id LIKE ?)'; params.push('%' + search + '%', '%' + search + '%'); }
            sql += ' ORDER BY o.delivery_date DESC, o.id DESC LIMIT 200';
            
            items = window.DBModule.query(sql, params);
        } else {
            let sql = `SELECT id, product_name, buyer, total, payment_method, sale_date, is_debt, paid, voided
                       FROM sales WHERE negocio_id = ? AND deleted_at IS NULL`;
            let params = [negocioId];
            
            if (fromDate) { sql += ' AND DATE(sale_date) >= DATE(?)'; params.push(fromDate); }
            if (toDate) { sql += ' AND DATE(sale_date) <= DATE(?)'; params.push(toDate); }
            if (search) { sql += ' AND (buyer LIKE ? OR product_name LIKE ? OR id LIKE ?)'; params.push('%' + search + '%', '%' + search + '%', '%' + search + '%'); }
            sql += ' ORDER BY sale_date DESC, id DESC LIMIT 200';
            
            items = window.DBModule.query(sql, params);
        }
        
        if (items.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-light);">
                    <span style="font-size: 48px;">📭</span>
                    <p style="font-size: 13px; margin-top: 8px;">No hay registros que coincidan</p>
                </div>
            `;
            updateDeleteSelectionCount();
            return;
        }
        
        if (tab === 'pedidos') {
            container.innerHTML = items.map(item => `
                <div style="background: var(--bg-card); border-radius: 8px; padding: 10px 12px; margin-bottom: 6px; border-left: 3px solid #3b82f6; display: flex; gap: 10px; align-items: flex-start;">
                    <input type="checkbox" class="del-checkbox" value="${item.id}" onchange="toggleDeleteSelection(${item.id})" ${window._deleteSelection.has(item.id) ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: #dc2626; margin-top: 3px; flex-shrink: 0;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                            <span style="font-weight: 700; font-size: 13px; color: #3b82f6;">#${item.id}</span>
                            <span style="font-weight: 600; font-size: 13px;">👤 ${item.client_name}</span>
                            <span style="font-size: 11px; background: #3b82f620; color: #3b82f6; padding: 1px 8px; border-radius: 10px;">${item.status}</span>
                        </div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 3px; font-size: 11px; color: var(--text-light);">
                            <span>📅 ${item.delivery_date?.split('T')[0] || '—'}</span>
                            ${item.productos ? `<span>📦 ${item.productos}</span>` : ''}
                            <span>💰 $${parseFloat(item.total || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            const paymentIcons = { 'cash': '💵', 'transfer': '🏦', 'debt': '💳', 'other': '🔄' };
            container.innerHTML = items.map(item => `
                <div style="background: var(--bg-card); border-radius: 8px; padding: 10px 12px; margin-bottom: 6px; border-left: 3px solid ${item.is_debt && !item.paid ? '#ef4444' : '#10b981'}; display: flex; gap: 10px; align-items: flex-start;">
                    <input type="checkbox" class="del-checkbox" value="${item.id}" onchange="toggleDeleteSelection(${item.id})" ${window._deleteSelection.has(item.id) ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: #dc2626; margin-top: 3px; flex-shrink: 0;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                            <span style="font-weight: 700; font-size: 13px; color: #10b981;">#${item.id}</span>
                            <span style="font-weight: 600; font-size: 13px;">👤 ${item.buyer || 'Cliente ocasional'}</span>
                            ${item.is_debt && !item.paid ? '<span style="font-size: 11px; background: #ef444420; color: #ef4444; padding: 1px 8px; border-radius: 10px;">DEUDA</span>' : ''}
                            ${item.voided === 1 ? '<span style="font-size: 11px; background: #94a3b820; color: #94a3b8; padding: 1px 8px; border-radius: 10px;">ANULADA</span>' : ''}
                        </div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 3px; font-size: 11px; color: var(--text-light);">
                            <span>📅 ${item.sale_date?.split('T')[0] || '—'}</span>
                            <span>📦 ${item.product_name}</span>
                            <span>${paymentIcons[item.payment_method] || '💵'} ${item.payment_method}</span>
                            <span>💰 $${parseFloat(item.total || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        
        updateDeleteSelectionCount();
        
    } catch (error) {
        console.error('Error renderizando lista de eliminación:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <span style="font-size: 32px;">❌</span>
                <p style="font-size: 13px;">Error: ${error.message}</p>
            </div>
        `;
    }
}

function toggleDeleteSelection(id) {
    if (window._deleteSelection.has(id)) {
        window._deleteSelection.delete(id);
    } else {
        window._deleteSelection.add(id);
    }
    updateDeleteSelectionCount();
}

function updateDeleteSelectionCount() {
    const el = document.getElementById('del-selected-count');
    if (el) el.textContent = window._deleteSelection.size;
}

function selectAllDeleteItems() {
    document.querySelectorAll('.del-checkbox').forEach(cb => {
        cb.checked = true;
        window._deleteSelection.add(parseInt(cb.value));
    });
    updateDeleteSelectionCount();
}

function deselectAllDeleteItems() {
    document.querySelectorAll('.del-checkbox').forEach(cb => {
        cb.checked = false;
    });
    window._deleteSelection.clear();
    updateDeleteSelectionCount();
}

async function executeDeleteSelected() {
    const selected = Array.from(window._deleteSelection);
    if (selected.length === 0) {
        window.showToast('⚠️ No hay registros seleccionados', 'warning');
        return;
    }
    
    const tab = window._deleteTab;
    const tipo = tab === 'pedidos' ? 'pedido(s)' : 'venta(s)';
    
    const confirm1 = await window.ModalModule.showConfirm({
        title: '🚨 Confirmar eliminación',
        message: `¿Eliminar PERMANENTEMENTE ${selected.length} ${tipo}?\n\n⚠️ Esta acción NO se puede deshacer.`,
        confirmText: '⚠️ CONTINUAR',
        cancelText: '❌ Cancelar',
        icon: '🚨',
        confirmColor: '#ef4444'
    });
    
    if (!confirm1) return;
    
    const confirm2 = await window.ModalModule.showConfirm({
        title: '🚨 ÚLTIMA ADVERTENCIA',
        message: `Se eliminarán ${selected.length} ${tipo} de la base de datos.\n\nNo hay vuelta atrás.\n\n¿Confirmas?`,
        confirmText: '🗑️ SÍ, ELIMINAR',
        cancelText: '❌ NO, cancelar',
        icon: '🚨',
        confirmColor: '#dc2626'
    });
    
    if (!confirm2) {
        window.showToast('❌ Eliminación cancelada', 'info', 2000);
        return;
    }
    
    try {
        window.showToast('⏳ Eliminando...', 'info', 2000);
        
        const tabla = tab === 'pedidos' ? 'orders' : 'sales';
        let eliminados = 0;
        
        for (const id of selected) {
            try {
                window.DBModule.execute(`DELETE FROM ${tabla} WHERE id = ?`, [id]);
                eliminados++;
            } catch (e) {
                console.warn(`⚠️ Error eliminando #${id}:`, e.message);
            }
        }
        
        if (tab === 'ventas') {
            for (const id of selected) {
                try {
                    window.DBModule.execute(`DELETE FROM transactions WHERE sale_id = ?`, [id]);
                } catch (e) {}
            }
        }
        
        if (tab === 'pedidos') {
            for (const id of selected) {
                try {
                    window.DBModule.execute(`DELETE FROM order_items WHERE order_id = ?`, [id]);
                    window.DBModule.execute(`DELETE FROM waiting_list WHERE order_id = ?`, [id]);
                } catch (e) {}
            }
        }
        
        window.DBModule.saveAndNotify();
        
        window.showToast(`✅ ${eliminados} registro(s) eliminado(s)`, 'success', 5000);
        
        window._deleteSelection.clear();
        await renderDeleteList();
        
        if (typeof window.loadDashboardData === 'function') setTimeout(window.loadDashboardData, 500);
        
    } catch (e) {
        window.showToast('❌ Error: ' + e.message, 'error', 5000);
    }
}

window.showDeleteSelectorModal = showDeleteSelectorModal;
window.closeDeleteSelectorModal = closeDeleteSelectorModal;
window.switchDeleteTab = switchDeleteTab;
window.clearDeleteFilters = clearDeleteFilters;
window.renderDeleteList = renderDeleteList;
window.toggleDeleteSelection = toggleDeleteSelection;
window.updateDeleteSelectionCount = updateDeleteSelectionCount;
window.selectAllDeleteItems = selectAllDeleteItems;
window.deselectAllDeleteItems = deselectAllDeleteItems;
window.executeDeleteSelected = executeDeleteSelected;

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
        <div class="card" style="border-left: 4px solid #f59e0b; border: 2px solid #f59e0b;">
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
                Cancela todos los pedidos en un rango de fechas. Útil para apagones, falta de insumos o cierres.
                <br><strong style="color: #dc2626;">Solo administradores.</strong>
            </p>
            <button onclick="showGlobalCancelModal()" class="btn" style="padding: 10px 16px; font-size: 14px; width: auto; background: #dc2626; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">
                🚨 Cancelar pedidos por rango
            </button>
        </div>
        
        <div class="card" style="border-left: 4px solid #8b5cf6; border: 2px solid #8b5cf6;">
            <h3 style="margin: 0 0 8px 0; color: #8b5cf6;">🔄 Reprogramar Pedidos por Rango</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Mueve todos los pedidos de un rango a una fecha destino.
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
                <br>🆕 Navega entre días con ◀ ▶ dentro del modal.
                <br>🆕 Acepta cualquier número decimal: 6, 6.5, 6.123.
                <br>🆕 Selecciona un producto y usa el cálculo automático de bloques (✨).
            </p>
            <button onclick="showCorrienteModal()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                ⚡ Gestionar Horarios
            </button>
        </div>
        
        <div class="card" style="border-left: 4px solid #8b5cf6; border: 2px dashed #8b5cf6;">
            <h3 style="margin: 0 0 8px 0; color: #8b5cf6;">🔍 Diagnóstico de Producción</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                ¿El guardado de producción no funciona? Ejecuta un diagnóstico técnico.
            </p>
            <button onclick="showProductionDiagnosticModal()" class="btn" style="padding: 8px 16px; font-size: 14px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                🔍 Ejecutar diagnóstico
            </button>
        </div>
        
        <div class="card" style="border-left: 4px solid #06b6d4; border: 2px solid #06b6d4;">
            <h3 style="margin: 0 0 8px 0; color: #06b6d4;">🎨 Restaurar Estilos</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Si la barra superior (header) se ve deformada o los modales no se muestran correctamente, usa este botón para restaurar los estilos.
            </p>
            <button onclick="restaurarEstilosAction()" class="btn" style="padding: 8px 16px; font-size: 14px; width: auto; background: #06b6d4; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                🎨 Restaurar estilos
            </button>
        </div>
        
        <div class="card" style="border-left: 4px solid #ef4444; border: 2px solid #ef4444;">
            <h3 style="margin: 0 0 8px 0; color: #ef4444;">📊 Reporte de Gastos</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Genera un reporte parametrizable de todos los gastos.
            </p>
            <button onclick="showExpensesReportModal()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #ef4444; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                📊 Generar Reporte de Gastos
            </button>
        </div>
        
        <div class="card" style="border-left: 4px solid #10b981; border: 2px solid #10b981;">
            <h3 style="margin: 0 0 8px 0; color: #10b981;">📤 Exportar copia de seguridad</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                ${isAdmin 
                    ? 'Como administrador, puedes crear dos tipos de copia: <strong>completa</strong> o <strong>solo datos</strong>.'
                    : 'Puedes crear una copia de <strong>solo datos</strong>.'
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
                Elige cómo importar el archivo <code>.db</code>:
                <br>• <strong>Importar copia:</strong> reemplaza TODOS los datos.
                <br>• <strong>Importar solo datos:</strong> reemplaza los datos operativos.
                <br>• <strong>🔀 Fusionar:</strong> combina los datos del backup.
            </p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="importDatabaseSmartAction()" class="btn primary" style="padding: 10px 16px; font-size: 14px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📥 Importar copia
                </button>
                <button onclick="importDatabaseDataOnlyFromFileAction()" class="btn secondary" style="padding: 10px 16px; font-size: 14px; width: auto; background: #3b82f6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📊 Importar solo datos
                </button>
                <button onclick="importDatabaseFusionAction()" class="btn primary" style="padding: 10px 16px; font-size: 14px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    🔀 Fusionar bases
                </button>
            </div>
        </div>
        
        <div class="card" style="border-left: 4px solid #8b5cf6; border: 2px solid #8b5cf6;">
            <h3 style="margin: 0 0 8px 0; color: #8b5cf6;">🧩 Salva diferencial (Recetas y Productos)</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                Exporta o importa <strong>solo las recetas y productos</strong>. No afecta ventas, pedidos, insumos ni clientes.
            </p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="exportSalvaRecetasProductos()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📤 Exportar
                </button>
                <button onclick="importSalvaRecetasProductos()" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📥 Importar
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
                Elimina permanentemente todos los registros con soft-delete.
                <br><strong style="color: #ef4444;">⚠️ Esta acción no se puede deshacer.</strong>
            </p>
            <button onclick="cleanDeletedData()" class="btn danger" style="padding: 8px 16px; font-size: 14px; width: auto;">
                🗑️ Limpiar datos eliminados
            </button>
        </div>
        
        ${isAdmin ? `
        <div class="card" style="border-left: 4px solid #dc2626; border: 2px solid #dc2626;">
            <h3 style="margin: 0 0 8px 0; color: #dc2626;">🚨 Eliminación por error</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                <strong style="color: #dc2626;">⚠️ ¡ADVERTENCIA!</strong><br>
                Elimina <strong>PERMANENTEMENTE</strong> pedidos y ventas creados por error.
                <br>Selector mejorado con tipo, ID, cliente, fecha, producto y precio.
            </p>
            <button onclick="showDeleteSelectorModal()" class="btn danger" style="padding: 10px 20px; font-size: 15px; width: auto; background: #dc2626; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                🗑️ SELECCIONAR Y ELIMINAR
            </button>
        </div>
        
        <div class="card" style="border-left: 4px solid #dc2626; border: 2px solid #dc2626;">
            <h3 style="margin: 0 0 8px 0; color: #dc2626;">🚨 Reiniciar Base de Datos</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">
                <strong style="color: #dc2626;">⚠️ ¡ADVERTENCIA!</strong><br>
                Elimina <strong>TODOS</strong> los datos. Se conservan usuarios y temas.
                <br><br><strong style="color: #dc2626;">Contraseña: "panario"</strong>
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
    
    console.log(`✅ renderSettingsView() completado (versión: ${appVersion})`);
}

// ============================================================
// EXPORTACIÓN FINAL
// ============================================================

window.renderSettingsView = renderSettingsView;
window.showCorrienteModal = showCorrienteModal;
window.irAHoyCorriente = irAHoyCorriente;
window.saveCorrientePattern = saveCorrientePattern;
window.setCorrienteReference = setCorrienteReference;
window.renderCorrienteCalendario = renderCorrienteCalendario;
window.changeCorrienteMonth = changeCorrienteMonth;
window.showHorarioDetalle = showHorarioDetalle;
window.closeHorarioDetalleModal = closeHorarioDetalleModal;
window.consultarHorariosFecha = consultarHorariosFecha;
window.generarReportePDF = generarReportePDF;
window.showProductionDiagnosticModal = showProductionDiagnosticModal;
window.closeProductionDiagnosticModal = closeProductionDiagnosticModal;
window.runProductionDiagnostics = runProductionDiagnostics;
window.renderDiagnosticResults = renderDiagnosticResults;
window.rerunDiagnostics = rerunDiagnostics;
window.calcularBloquesIdeales = calcularBloquesIdeales;
window.showCalculoBloquesModal = showCalculoBloquesModal;
window.confirmarCalculoBloques = confirmarCalculoBloques;
window.onProductoProduccionChange = onProductoProduccionChange;
window.calcularYMostrarSugerencia = calcularYMostrarSugerencia;
window.guardarProduccion = guardarProduccion;
window.eliminarProduccion = eliminarProduccion;
window.showProduccionRangoModal = showProduccionRangoModal;
window.closeProduccionRangoModal = closeProduccionRangoModal;
window.previewProduccionRango = previewProduccionRango;
window.submitProduccionRango = submitProduccionRango;
window.setRangoRapido = setRangoRapido;
window.setRangoMesActual = setRangoMesActual;
window.getFechasDelRango = getFechasDelRango;
window.navegarHorarioDetalle = navegarHorarioDetalle;
window.guardarProduccionAutoSiHayCambios = guardarProduccionAutoSiHayCambios;
window.ejecutarGuardadoProduccion = ejecutarGuardadoProduccion;
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

// 🆕 CORRECCIÓN #8 (240926): Backups - reescritura completa
window.exportDatabaseCompleteAction = exportDatabaseCompleteAction;
window.exportDatabaseDataOnlyAction = exportDatabaseDataOnlyAction;
window.importDatabaseSmartAction = importDatabaseSmartAction;
window.importDatabaseDataOnlyFromFileAction = importDatabaseDataOnlyFromFileAction;
window.importDatabaseFusionAction = importDatabaseFusionAction;
window.abrirSelectorArchivo = abrirSelectorArchivo;

window.restaurarEstilosAction = restaurarEstilosAction;
window.showUsersModal = showUsersModal;
window.closeUsersModal = closeUsersModal;
window.renderUsersContent = renderUsersContent;
window.regenerarCodigoInvitacionAction = regenerarCodigoInvitacionAction;
window.showCreateUserModal = showCreateUserModal;
window.closeCreateUserModal = closeCreateUserModal;
window.showEditUserModal = showEditUserModal;
window.closeEditUserModal = closeEditUserModal;
window.showChangePasswordModal = showChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.handleToggleAdmin = handleToggleAdmin;
window.handleDeleteUser = handleDeleteUser;
window.exportSalvaRecetasProductos = exportSalvaRecetasProductos;
window.importSalvaRecetasProductos = importSalvaRecetasProductos;
window.clearLastUserAction = clearLastUserAction;
window.cleanDeletedData = cleanDeletedData;
window.resetDatabaseWithPassword = resetDatabaseWithPassword;
window.showDeleteSelectorModal = showDeleteSelectorModal;
window.closeDeleteSelectorModal = closeDeleteSelectorModal;
window.switchDeleteTab = switchDeleteTab;
window.clearDeleteFilters = clearDeleteFilters;
window.renderDeleteList = renderDeleteList;
window.toggleDeleteSelection = toggleDeleteSelection;
window.updateDeleteSelectionCount = updateDeleteSelectionCount;
window.selectAllDeleteItems = selectAllDeleteItems;
window.deselectAllDeleteItems = deselectAllDeleteItems;
window.executeDeleteSelected = executeDeleteSelected;
window.getAppVersion = getAppVersion;
window.MOTIVOS_REPROGRAMACION = MOTIVOS_REPROGRAMACION;
window.getTodosLosProductosParaDropdown = getTodosLosProductosParaDropdown;
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
window._esBloqueDelAmanecer = _esBloqueDelAmanecer;
window._formatearMensajeBloque = _formatearMensajeBloque;
window.getProductoDeProduccionUI = getProductoDeProduccionUI;
window.getProduccionConProductoUI = getProduccionConProductoUI;

console.log('📦 UI Settings Module cargado correctamente v2.3.0');
console.log('   🆕 CORRECCIÓN #8 (240926) aplicada:');
console.log('      • exportDatabaseCompleteAction() → flujo lineal confirmar→progreso→ejecutar');
console.log('      • exportDatabaseDataOnlyAction() → flujo lineal');
console.log('      • importDatabaseSmartAction() → selección robusta de archivo');
console.log('      • importDatabaseDataOnlyFromFileAction() → flujo robusto');
console.log('      • importDatabaseFusionAction() → fusión sin reemplazo de showConfirm');
console.log('      • abrirSelectorArchivo() → input con timeout de 5 min');
console.log('      • Eliminado el reemplazo temporal de ModalModule.showConfirm');
console.log('      • Manejo de errores robusto en cada paso');