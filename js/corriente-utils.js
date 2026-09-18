// ============================================================
// ⚡ CORRIENTE UTILS - Panario
// Módulo global para consultar horarios de corriente desde
// cualquier parte de la aplicación.
// ============================================================

window.CorrienteUtils = {};

// ============================================================
// CONSTANTES Y ESTADO INTERNO
// ============================================================

const CORRIENTE_STORAGE_KEY = 'panario_corriente_config';

const CORRIENTE_DEFAULT = {
    horasCorriente: 3,
    horasApagon: 12,
    fechaReferencia: null,
    horaInicioReferencia: null,
    horaFinReferencia: null
};

// Caché interna de configuración (evita leer la BD en cada llamada)
let _configCache = null;
let _configCacheUserId = null;

// ============================================================
// CARGA Y GUARDADO DE CONFIGURACIÓN
// ============================================================

/**
 * Fuerza la recarga de la configuración desde la BD.
 * Debe llamarse después de guardar cambios o al abrir el módulo.
 */
function refreshConfig() {
    _configCache = null;
    _configCacheUserId = null;
    return getConfig();
}

/**
 * Obtiene la configuración de corriente desde la BD del usuario actual.
 * Usa caché interna para evitar lecturas repetidas a la BD.
 */
function getConfig() {
    try {
        const user = window.AuthModule?.getCurrentUser();
        const currentUserId = user?.id || null;

        // Si la caché es válida para el usuario actual, devolverla
        if (_configCache && _configCacheUserId === currentUserId) {
            return _configCache;
        }

        let config = null;

        // Si hay usuario, intentar leer de BD
        if (currentUserId && window.DBModule) {
            try {
                const dbConfig = window.DBModule.query(
                    'SELECT * FROM corriente_config WHERE user_id = ? AND deleted_at IS NULL LIMIT 1',
                    [currentUserId]
                );
                
                if (dbConfig && dbConfig.length > 0) {
                    const cfg = dbConfig[0];
                    config = {
                        horasCorriente: parseFloat(cfg.horas_corriente) || CORRIENTE_DEFAULT.horasCorriente,
                        horasApagon: parseFloat(cfg.horas_apagon) || CORRIENTE_DEFAULT.horasApagon,
                        fechaReferencia: cfg.fecha_referencia || null,
                        horaInicioReferencia: cfg.hora_inicio_referencia || null,
                        horaFinReferencia: cfg.hora_fin_referencia || null
                    };
                }
            } catch (e) {
                console.warn('⚠️ Error leyendo config de corriente de BD:', e);
            }
            
            // Si no hay config en BD, intentar migrar desde localStorage
            if (!config) {
                const migrated = migrateFromLocalStorage(currentUserId);
                if (migrated) config = migrated;
            }
        }
        
        // Fallback: leer de localStorage
        if (!config) {
            config = loadFromLocalStorage();
        }
        
        // Guardar en caché
        _configCache = config;
        _configCacheUserId = currentUserId;
        
        return config;
        
    } catch (e) {
        console.warn('⚠️ Error leyendo config de corriente:', e);
        return { ...CORRIENTE_DEFAULT };
    }
}

/**
 * Guarda la configuración de corriente en la BD del usuario actual.
 */
function saveConfig(config) {
    try {
        const user = window.AuthModule?.getCurrentUser();
        
        if (user && user.id && window.DBModule) {
            const existing = window.DBModule.query(
                'SELECT id FROM corriente_config WHERE user_id = ? LIMIT 1',
                [user.id]
            );
            
            const params = [
                config.horasCorriente || CORRIENTE_DEFAULT.horasCorriente,
                config.horasApagon || CORRIENTE_DEFAULT.horasApagon,
                config.fechaReferencia || null,
                config.horaInicioReferencia || null,
                config.horaFinReferencia || null
            ];
            
            if (existing && existing.length > 0) {
                window.DBModule.execute(`
                    UPDATE corriente_config 
                    SET horas_corriente = ?, horas_apagon = ?, 
                        fecha_referencia = ?, hora_inicio_referencia = ?, 
                        hora_fin_referencia = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                `, [...params, user.id]);
            } else {
                window.DBModule.execute(`
                    INSERT INTO corriente_config 
                    (user_id, horas_corriente, horas_apagon, fecha_referencia, 
                     hora_inicio_referencia, hora_fin_referencia)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [user.id, ...params]);
            }
            
            window.DBModule.saveDatabase();
            
            // Actualizar caché inmediatamente
            _configCache = { ...config };
            _configCacheUserId = user.id;
            
            return true;
        }
        
        // Fallback: guardar en localStorage
        const result = saveToLocalStorage(config);
        if (result) {
            _configCache = { ...config };
            _configCacheUserId = null;
        }
        return result;
        
    } catch (e) {
        console.error('❌ Error guardando config de corriente:', e);
        return false;
    }
}

/**
 * Migra la configuración desde localStorage a la BD del usuario.
 */
function migrateFromLocalStorage(userId) {
    try {
        const saved = localStorage.getItem(CORRIENTE_STORAGE_KEY);
        if (!saved) return null;
        
        const parsed = JSON.parse(saved);
        const config = {
            horasCorriente: parseFloat(parsed.horasCorriente) || CORRIENTE_DEFAULT.horasCorriente,
            horasApagon: parseFloat(parsed.horasApagon) || CORRIENTE_DEFAULT.horasApagon,
            fechaReferencia: parsed.fechaReferencia || null,
            horaInicioReferencia: parsed.horaInicioReferencia || null,
            horaFinReferencia: parsed.horaFinReferencia || null
        };
        
        // Solo migrar si tiene referencia válida
        if (config.fechaReferencia && config.horaInicioReferencia && config.horaFinReferencia) {
            console.log('📦 Migrando configuración de corriente a BD...');
            
            const existing = window.DBModule.query(
                'SELECT id FROM corriente_config WHERE user_id = ? LIMIT 1',
                [userId]
            );
            
            const params = [
                config.horasCorriente,
                config.horasApagon,
                config.fechaReferencia,
                config.horaInicioReferencia,
                config.horaFinReferencia
            ];
            
            if (existing && existing.length > 0) {
                window.DBModule.execute(`
                    UPDATE corriente_config 
                    SET horas_corriente = ?, horas_apagon = ?, 
                        fecha_referencia = ?, hora_inicio_referencia = ?, 
                        hora_fin_referencia = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                `, [...params, userId]);
            } else {
                window.DBModule.execute(`
                    INSERT INTO corriente_config 
                    (user_id, horas_corriente, horas_apagon, fecha_referencia, 
                     hora_inicio_referencia, hora_fin_referencia)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [userId, ...params]);
            }
            
            window.DBModule.saveDatabase();
            localStorage.removeItem(CORRIENTE_STORAGE_KEY);
            return config;
        }
        
        return null;
    } catch (e) {
        console.warn('⚠️ Error migrando config de corriente:', e);
        return null;
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem(CORRIENTE_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                horasCorriente: parseFloat(parsed.horasCorriente) || CORRIENTE_DEFAULT.horasCorriente,
                horasApagon: parseFloat(parsed.horasApagon) || CORRIENTE_DEFAULT.horasApagon,
                fechaReferencia: parsed.fechaReferencia || null,
                horaInicioReferencia: parsed.horaInicioReferencia || null,
                horaFinReferencia: parsed.horaFinReferencia || null
            };
        }
    } catch (e) {}
    return { ...CORRIENTE_DEFAULT };
}

function saveToLocalStorage(config) {
    try {
        localStorage.setItem(CORRIENTE_STORAGE_KEY, JSON.stringify(config));
        return true;
    } catch (e) {
        return false;
    }
}

// ============================================================
// UTILIDADES DE FORMATO
// ============================================================

function formatearFecha(date) {
    if (!(date instanceof Date)) date = new Date(date);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

function formatearFechaISO(date) {
    if (!(date instanceof Date)) date = new Date(date);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${y}-${m}-${d}`;
}

function formatearHora12h(date) {
    if (!(date instanceof Date)) date = new Date(date);
    let h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, '0');
    const periodo = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}:${m} ${periodo}`;
}

function formatearHora24h(date) {
    if (!(date instanceof Date)) date = new Date(date);
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

function getDiaSemana(date, short = false) {
    if (!(date instanceof Date)) date = new Date(date);
    const dias = short 
        ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
        : ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[date.getDay()];
}

function getMesNombre(date) {
    if (!(date instanceof Date)) date = new Date(date);
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return meses[date.getMonth()];
}

// ============================================================
// ALGORITMO CORE - PORTADO DE PYTHON
// ============================================================

function calcularBloques(fechaReferencia, horaInicio, horaFin, hcc, hsc, fechaObjetivo) {
    if (!fechaObjetivo) fechaObjetivo = fechaReferencia;
    
    // 🔧 FIX: Asegurar que hcc y hsc son números (por si vienen como string de la BD)
    hcc = parseFloat(hcc) || 3;
    hsc = parseFloat(hsc) || 12;
    
    const [refAnio, refMes, refDia] = fechaReferencia.split('-').map(Number);
    const [hIni, mIni] = horaInicio.split(':').map(Number);
    const [hFin, mFin] = horaFin.split(':').map(Number);
    
    let fhicc = new Date(refAnio, refMes - 1, refDia, hIni, mIni, 0, 0);
    let fhfcc = new Date(refAnio, refMes - 1, refDia, hFin, mFin, 0, 0);
    
    // Si la hora fin <= hora inicio, el bloque cruza medianoche
    if (fhfcc <= fhicc) {
        fhfcc.setDate(fhfcc.getDate() + 1);
    }
    
    const duracionMs = fhfcc.getTime() - fhicc.getTime();
    const cicloMs = (hcc + hsc) * 60 * 60 * 1000;
    
    const [objAnio, objMes, objDia] = fechaObjetivo.split('-').map(Number);
    const inicioDia = new Date(objAnio, objMes - 1, objDia, 0, 0, 0, 0);
    const finDia = new Date(objAnio, objMes - 1, objDia, 23, 59, 59, 999);
    
    // Empezar 500 ciclos atrás para cubrir fechas pasadas
    const MAX_CICLOS_ATRAS = 500;
    let cursorMs = fhicc.getTime() - (cicloMs * MAX_CICLOS_ATRAS);
    
    const bloques = [];
    
    // 🔧 FIX CRÍTICO: Se eliminó el límite de MAX_BLOQUES = 100.
    // Ahora usamos un límite de seguridad muy alto (5000 iteraciones)
    // que cubre 500 ciclos atrás + ~10 ciclos hasta cubrir el día objetivo.
    // 5000 iteraciones × 15h = 75,000 horas ≈ 8.5 años de cobertura,
    // más que suficiente para cualquier consulta razonable.
    const MAX_ITERACIONES_SEGURIDAD = 5000;
    let iteraciones = 0;
    
    while (cursorMs <= finDia.getTime() && iteraciones < MAX_ITERACIONES_SEGURIDAD) {
        const bloqueInicio = new Date(cursorMs);
        const bloqueFin = new Date(cursorMs + duracionMs);
        
        if (bloqueFin.getTime() >= inicioDia.getTime() && 
            bloqueInicio.getTime() <= finDia.getTime()) {
            bloques.push({
                inicio: bloqueInicio,
                fin: bloqueFin,
                cruzaMedianoche: formatearFechaISO(bloqueInicio) !== formatearFechaISO(bloqueFin)
            });
        }
        
        cursorMs += cicloMs;
        iteraciones++;
    }
    
    return bloques;
}

// ============================================================
// API PÚBLICA
// ============================================================

function getBloques(fecha) {
    const dateStr = fecha instanceof Date ? formatearFechaISO(fecha) : fecha;
    const config = getConfig();
    
    if (!config.fechaReferencia || !config.horaInicioReferencia || !config.horaFinReferencia) {
        return [];
    }
    
    const bloquesRaw = calcularBloques(
        config.fechaReferencia,
        config.horaInicioReferencia,
        config.horaFinReferencia,
        config.horasCorriente,
        config.horasApagon,
        dateStr
    );
    
    return bloquesRaw.map((b, i) => ({
        ...b,
        index: i + 1,
        inicioStr: formatearHora12h(b.inicio),
        finStr: formatearHora12h(b.fin),
        inicioStr24: formatearHora24h(b.inicio),
        finStr24: formatearHora24h(b.fin),
        texto: b.cruzaMedianoche
            ? `${formatearHora12h(b.inicio)} → ${formatearFecha(b.fin)} ${formatearHora12h(b.fin)}`
            : `${formatearHora12h(b.inicio)} - ${formatearHora12h(b.fin)}`,
        textoCorto: b.cruzaMedianoche
            ? `${formatearHora12h(b.inicio)} → ${formatearHora12h(b.fin)} (${getDiaSemana(b.fin, true)})`
            : `${formatearHora12h(b.inicio)} - ${formatearHora12h(b.fin)}`,
        duracionHoras: (b.fin.getTime() - b.inicio.getTime()) / (1000 * 60 * 60)
    }));
}

function tieneCorriente(fecha) {
    return getBloques(fecha).length > 0;
}

function getBloquesTexto(fecha, separador = ' | ') {
    const bloques = getBloques(fecha);
    if (bloques.length === 0) return '🌙 Sin corriente';
    return bloques.map(b => `🟢 ${b.textoCorto}`).join(separador);
}

function getBadge(fecha) {
    const bloques = getBloques(fecha);
    if (bloques.length === 0) return { icon: '🌙', texto: 'Sin corriente', color: '#94a3b8' };
    return { 
        icon: '⚡', 
        texto: `${bloques.length} bloque${bloques.length > 1 ? 's' : ''}`, 
        color: '#f59e0b' 
    };
}

function getProximoBloque(desde = new Date()) {
    const config = getConfig();
    if (!config.fechaReferencia) return null;
    
    for (let i = 0; i < 60; i++) {
        const fecha = new Date(desde);
        fecha.setDate(fecha.getDate() + i);
        const fechaStr = formatearFechaISO(fecha);
        const bloques = getBloques(fechaStr);
        
        for (const b of bloques) {
            if (b.fin > desde) {
                return b;
            }
        }
    }
    return null;
}

function getEstadoCorriente(fecha, hora = null) {
    const bloques = getBloques(fecha);
    
    if (bloques.length === 0) {
        return { estado: 'sin_corriente', bloque: null, texto: '🌙 Sin corriente' };
    }
    
    let momento;
    if (hora) {
        const dateStr = fecha instanceof Date ? formatearFechaISO(fecha) : fecha;
        const [h, m] = hora.split(':').map(Number);
        const [y, mo, d] = dateStr.split('-').map(Number);
        momento = new Date(y, mo - 1, d, h, m, 0, 0);
    } else {
        momento = new Date();
    }
    
    for (const b of bloques) {
        if (momento >= b.inicio && momento <= b.fin) {
            return { estado: 'dentro', bloque: b, texto: `⚡ Dentro del bloque: ${b.textoCorto}` };
        }
    }
    
    return { estado: 'fuera', bloque: null, texto: '🌙 Fuera de bloque de corriente' };
}

function estaEnBloque(fecha, hora = null) {
    return getEstadoCorriente(fecha, hora).estado === 'dentro';
}

function getResumen(fecha) {
    const bloques = getBloques(fecha);
    const totalHoras = bloques.reduce((sum, b) => sum + b.duracionHoras, 0);
    
    return {
        fecha: fecha instanceof Date ? formatearFecha(fecha) : fecha,
        fechaISO: fecha instanceof Date ? formatearFechaISO(fecha) : fecha,
        diaSemana: getDiaSemana(fecha instanceof Date ? fecha : new Date(fecha + 'T00:00:00')),
        tieneCorriente: bloques.length > 0,
        bloques: bloques,
        numBloques: bloques.length,
        totalHoras: totalHoras,
        primerBloque: bloques[0] || null,
        ultimoBloque: bloques[bloques.length - 1] || null
    };
}

function getTextoDetallado(fecha, compacto = false) {
    const bloques = getBloques(fecha);
    
    if (bloques.length === 0) {
        return { tipo: 'sin', texto: '🌙 Sin corriente', icon: '🌙' };
    }
    
    if (compacto) {
        const textos = bloques.map(b => b.textoCorto).join(' · ');
        return { tipo: 'con', texto: `⚡ ${textos}`, icon: '⚡', bloques };
    }
    
    const textos = bloques.map(b => `   🟢 ${b.texto}`).join('\n');
    return { 
        tipo: 'con', 
        texto: `⚡ Corriente del día:\n${textos}`,
        icon: '⚡',
        bloques
    };
}

// ============================================================
// SESIONES
// ============================================================

const SESIONES = {
    'manana': { id: 'manana', label: 'Mañana', icon: '🌅', color: '#10b981', bg: '#10b98120' },
    'tarde':  { id: 'tarde',  label: 'Tarde',  icon: '☀️', color: '#f59e0b', bg: '#f59e0b20' },
    'noche':  { id: 'noche',  label: 'Noche',  icon: '🌙', color: '#92400e', bg: '#92400e20' }
};

function getSesion(id) {
    return SESIONES[id] || null;
}

function getSesionLabel(id) {
    const s = SESIONES[id];
    return s ? `${s.icon} ${s.label}` : '';
}

// ============================================================
// EXPORTACIÓN
// ============================================================

window.CorrienteUtils = {
    // Configuración
    getConfig,
    saveConfig,
    refreshConfig,
    
    // Consultas
    getBloques,
    tieneCorriente,
    getBloquesTexto,
    getBadge,
    getProximoBloque,
    getEstadoCorriente,
    estaEnBloque,
    getResumen,
    getTextoDetallado,
    
    // Utilidades
    formatearFecha,
    formatearFechaISO,
    formatearHora12h,
    formatearHora24h,
    getDiaSemana,
    getMesNombre,
    
    // Sesiones
    getSesion,
    getSesionLabel,
    SESIONES
};

console.log('📦 Corriente Utils Module cargado correctamente (con fix MAX_BLOQUES)');