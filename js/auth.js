// ============================================================
// 📦 AUTH MODULE - Panario (Con recordar usuario, config dashboard
// y FASE 16: Multiusuario completo)
// AÑADIDO FASE B (170926):
//   - createUserAsAdmin(): admin crea usuario directamente
//   - updateUserPassword(): admin o propio usuario cambia contraseña
//   - toggleUserAdmin(): promover/quitar admin a un usuario
//   - deleteUserByAdmin(): eliminar usuario del negocio
//   - changeOwnPassword(): usuario cambia su propia contraseña
// 🆕 v2.3.4 (260926): 🎯 CORRECCIÓN #17 (240926) - CONFIGURACIONES INDIVIDUALES
//   - ✅ loginUser() ahora carga la configuración de sonido y guía
//     rápida del usuario desde la BD (por user_id).
//   - ✅ Las nuevas columnas sound_enabled, sound_id y
//     guia_rapida_activa se cargan al hacer login y se incluyen
//     en el objeto user.
//   - ✅ getUserSoundConfig() y getUserGuiaRapidaActiva() pueden
//     consultarse después del login.
//   - ✅ Retrocompatible: si las columnas no existen, se usan
//     valores por defecto.
// 🆕 v2.3.5 (280926): 🎯 SESIÓN 7 - MARCAR PRIMER ADMIN (is_first_admin)
//   - ✅ registerUser(): si es el PRIMER usuario del negocio, se marca
//     con is_first_admin = 1. Los siguientes usuarios -> is_first_admin = 0.
//   - ✅ createUserAsAdmin(): los nuevos usuarios creados por admin
//     SIEMPRE se marcan con is_first_admin = 0.
//   - ✅ loginUser(): carga is_first_admin en el objeto user.
//   - ✅ getUsuariosDelNegocio(): incluye is_first_admin en la consulta.
//   - ✅ Migración automática: si un negocio tiene usuarios pero
//     ninguno es is_first_admin, se marca al más antiguo.
//   - ✅ Retrocompatible: si la columna no existe, se asume 0.
// ============================================================

window.AuthModule = {};

const LAST_USER_KEY = 'panario_last_user';

// ============================================================
// 🆕 v2.3.5: HELPERS INTERNOS PARA is_first_admin
// ============================================================

/**
 * 🆕 v2.3.5: Verifica si el negocio tiene al menos un usuario
 * marcado como is_first_admin. Si no lo tiene y hay usuarios,
 * marca al más antiguo. Idempotente.
 */
async function _ensureFirstAdminOfNegocio(negocioId) {
    if (!negocioId) return;
    try {
        const db = window.DBModule.getDB();
        if (!db) return;
        
        // 1. Verificar si ya existe un is_first_admin
        const existing = window.DBModule.query(
            `SELECT id FROM users 
             WHERE negocio_id = ? AND is_first_admin = 1 AND deleted_at IS NULL 
             LIMIT 1`,
            [negocioId]
        );
        
        if (existing && existing.length > 0) {
            return; // Ya hay uno marcado, no hacer nada
        }
        
        // 2. Buscar el usuario más antiguo del negocio
        const oldest = window.DBModule.query(
            `SELECT id, username FROM users 
             WHERE negocio_id = ? AND deleted_at IS NULL 
             ORDER BY created_at ASC, id ASC 
             LIMIT 1`,
            [negocioId]
        );
        
        if (oldest && oldest.length > 0) {
            const userId = oldest[0].id;
            window.DBModule.execute(
                `UPDATE users SET is_first_admin = 1 WHERE id = ?`,
                [userId]
            );
            console.log(`👑 [v2.3.5] Migración: usuario "${oldest[0].username}" (#${userId}) marcado como primer admin del negocio #${negocioId}`);
        }
    } catch (e) {
        console.warn('⚠️ [v2.3.5] Error en _ensureFirstAdminOfNegocio:', e);
    }
}

// ============================================================
// REGISTRO
// ============================================================

async function registerUser(username, password, name, business, negocioMode = 'crear', codigoInvitacion = '') {
    const db = window.DBModule.getDB();
    try {
        const normalizedUsername = username.trim().toLowerCase();
        
        let negocioId = null;
        let negocioNombre = '';
        let isAdmin = 0;
        let isFirstAdmin = 0;  // 🆕 v2.3.5
        let codigoFinal = '';
        
        // ============================================================
        // MODO: UNIRSE A NEGOCIO EXISTENTE
        // ============================================================
        if (negocioMode === 'unirse') {
            const codigoLimpio = (codigoInvitacion || '').trim().toUpperCase();
            
            if (!codigoLimpio) {
                return { success: false, error: '⚠️ Debes ingresar el código de invitación.' };
            }
            
            const negocio = window.DBModule.getNegocioByCodigo(codigoLimpio);
            
            if (!negocio) {
                return { success: false, error: '❌ Código de invitación inválido. Verifica e intenta de nuevo.' };
            }
            
            negocioId = negocio.id;
            negocioNombre = negocio.nombre;
            isAdmin = 0;
            isFirstAdmin = 0;  // 🆕 v2.3.5: los que se unen nunca son first_admin
            codigoFinal = negocio.codigo_invitacion;
            
            console.log(`🔗 Usuario se une al negocio: "${negocioNombre}" (ID: ${negocioId})`);
        }
        
        // ============================================================
        // MODO: CREAR NEGOCIO NUEVO (por defecto)
        // ============================================================
        else {
            if (!business || !business.trim()) {
                return { success: false, error: '⚠️ Debes ingresar el nombre del negocio.' };
            }
            
            const negocioResult = window.DBModule.saveNegocio({
                nombre: business.trim()
            });
            
            if (!negocioResult.success) {
                return { success: false, error: '❌ Error al crear el negocio: ' + negocioResult.error };
            }
            
            negocioId = negocioResult.id;
            negocioNombre = business.trim();
            isAdmin = 1;
            isFirstAdmin = 1;  // 🆕 v2.3.5: el que crea el negocio ES el primer admin
            codigoFinal = negocioResult.codigo;
            
            console.log(`🏢 Negocio creado: "${negocioNombre}" (ID: ${negocioId}, Código: ${codigoFinal})`);
            console.log(`👑 [v2.3.5] Usuario "${normalizedUsername}" será el PRIMER ADMIN del negocio #${negocioId}`);
        }
        
        // ============================================================
        // INSERTAR USUARIO
        // 🆕 v2.3.5: Incluye is_first_admin
        // ============================================================
        const stmt = db.prepare(`
            INSERT INTO users (username, password, name, business_name, theme, negocio_id, is_admin, is_first_admin) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
            normalizedUsername,
            password,
            name,
            negocioNombre,
            'light',
            negocioId,
            isAdmin,
            isFirstAdmin
        ]);
        stmt.step();
        stmt.free();
        
        window.DBModule.saveDatabase();
        
        return { 
            success: true, 
            negocioId: negocioId, 
            negocioNombre: negocioNombre,
            codigo: codigoFinal,
            isAdmin: isAdmin,
            isFirstAdmin: isFirstAdmin,  // 🆕 v2.3.5
            mode: negocioMode
        };
        
    } catch (e) {
        if (e.message && e.message.includes('UNIQUE')) {
            return { success: false, error: '⚠️ El usuario ya existe. Elige otro nombre.' };
        }
        console.error('Error en registro:', e);
        return { success: false, error: '❌ Error al registrar: ' + e.message };
    }
}

// ============================================================
// LOGIN
// 🆕 v2.3.5: Carga is_first_admin (con migración automática)
// ============================================================

async function loginUser(username, password) {
    const db = window.DBModule.getDB();
    try {
        const normalizedUsername = username.trim().toLowerCase();
        
        await window.DBModule.ensureUserTableColumns(db);
        await window.DBModule.ensureDashboardColumns(db);
        await window.DBModule.ensureNegocioIdColumn(db);
        await window.DBModule.ensureIsAdminColumn(db);
        // 🆕 v2.3.5: Asegurar columna is_first_admin
        if (typeof window.DBModule.ensureIsFirstAdminColumn === 'function') {
            await window.DBModule.ensureIsFirstAdminColumn(db);
        }
        // 🆕 CORRECCIÓN #17: Asegurar que las columnas de preferencias existen
        if (typeof window.DBModule.ensureUserPreferencesColumns === 'function') {
            await window.DBModule.ensureUserPreferencesColumns(db);
        }
        
        const stmt = db.prepare('SELECT * FROM users WHERE LOWER(username) = ?');
        stmt.bind([normalizedUsername]);
        let result = null;
        if (stmt.step()) {
            result = stmt.getAsObject();
        }
        stmt.free();
        
        if (result) {
            if (result.password === password) {
                if (!result.theme) {
                    result.theme = 'light';
                    const updateStmt = db.prepare('UPDATE users SET theme = ? WHERE id = ?');
                    updateStmt.bind(['light', result.id]);
                    updateStmt.step();
                    updateStmt.free();
                    window.DBModule.saveDatabase();
                }
                
                // Cargar configuración del dashboard
                const dashConfig = window.DBModule.getUserDashboardConfig(result.id);
                result.dashboard_config = dashConfig;
                
                // 🆕 CORRECCIÓN #17: Cargar configuración de sonido y guía rápida
                try {
                    if (typeof window.DBModule.getUserSoundConfig === 'function') {
                        const soundConfig = window.DBModule.getUserSoundConfig(result.id);
                        result.sound_enabled = soundConfig.enabled ? 1 : 0;
                        result.sound_id = soundConfig.soundId;
                        console.log(`🔊 Usuario ${result.username}: sonido=${soundConfig.soundId}, enabled=${soundConfig.enabled}`);
                    }
                } catch (e) {
                    console.warn('⚠️ Error cargando config de sonido:', e);
                    result.sound_enabled = 1;
                    result.sound_id = 'beep';
                }
                
                try {
                    if (typeof window.DBModule.getUserGuiaRapidaActiva === 'function') {
                        const guiaActiva = window.DBModule.getUserGuiaRapidaActiva(result.id);
                        result.guia_rapida_activa = guiaActiva ? 1 : 0;
                        console.log(`🚀 Usuario ${result.username}: guía rápida=${guiaActiva}`);
                    }
                } catch (e) {
                    console.warn('⚠️ Error cargando guía rápida:', e);
                    result.guia_rapida_activa = 1;
                }
                
                // Cargar negocio del usuario
                if (result.negocio_id) {
                    const negocio = window.DBModule.getNegocio(result.negocio_id);
                    result.negocio = negocio;
                    
                    // 🆕 v2.3.5: Migración automática de is_first_admin
                    // Si el negocio no tiene ningún is_first_admin, marcar al más antiguo.
                    if (result.is_first_admin === undefined || result.is_first_admin === null) {
                        result.is_first_admin = 0;
                    }
                    await _ensureFirstAdminOfNegocio(result.negocio_id);
                    
                    // 🆕 v2.3.5: Re-leer is_first_admin del usuario (por si la migración lo afectó)
                    try {
                        const fresh = window.DBModule.query(
                            'SELECT is_first_admin FROM users WHERE id = ?',
                            [result.id]
                        );
                        if (fresh && fresh.length > 0 && fresh[0].is_first_admin !== undefined) {
                            result.is_first_admin = Number(fresh[0].is_first_admin) || 0;
                        }
                    } catch (e) {
                        console.warn('⚠️ Error re-leyendo is_first_admin:', e);
                    }
                    
                    console.log(`🏢 Usuario ${result.username} pertenece al negocio: "${negocio?.nombre || 'N/A'}" ${result.is_admin ? '(ADMIN)' : ''} ${result.is_first_admin ? '(PRIMER ADMIN)' : ''}`);
                } else {
                    await window.DBModule.migrateToMultiUser(db);
                    const userUpdated = window.DBModule.query('SELECT negocio_id, is_admin, is_first_admin FROM users WHERE id = ?', [result.id]);
                    if (userUpdated.length > 0 && userUpdated[0].negocio_id) {
                        result.negocio_id = userUpdated[0].negocio_id;
                        result.is_admin = userUpdated[0].is_admin;
                        result.is_first_admin = Number(userUpdated[0].is_first_admin) || 0;
                        result.negocio = window.DBModule.getNegocio(result.negocio_id);
                    }
                }
                
                saveLastUser(result.username);
                return { success: true, user: result };
            } else {
                return { success: false, error: '❌ Usuario o contraseña incorrectos' };
            }
        }
        return { success: false, error: '❌ Usuario o contraseña incorrectos' };
    } catch (e) {
        console.error('Error en login:', e);
        return { success: false, error: '❌ Error al iniciar sesión: ' + e.message };
    }
}

// ============================================================
// RECORDAR ÚLTIMO USUARIO
// ============================================================

function saveLastUser(username) {
    try {
        localStorage.setItem(LAST_USER_KEY, username);
    } catch (e) {
        console.error('Error guardando último usuario:', e);
    }
}

function getLastUser() {
    try {
        return localStorage.getItem(LAST_USER_KEY) || '';
    } catch (e) {
        console.error('Error obteniendo último usuario:', e);
        return '';
    }
}

function clearLastUser() {
    try {
        localStorage.removeItem(LAST_USER_KEY);
    } catch (e) {
        console.error('Error eliminando último usuario:', e);
    }
}

// ============================================================
// SESIÓN
// ============================================================

function setCurrentUser(user) {
    try {
        sessionStorage.setItem('panario_user', JSON.stringify(user));
    } catch (e) {
        console.error('Error guardando usuario:', e);
    }
}

function getCurrentUser() {
    try {
        const data = sessionStorage.getItem('panario_user');
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Error obteniendo usuario:', e);
        return null;
    }
}

function logout() {
    try {
        sessionStorage.removeItem('panario_user');
        localStorage.removeItem('panario-theme');
        console.log('🚪 Sesión cerrada correctamente');
        return true;
    } catch (e) {
        console.error('Error cerrando sesión:', e);
        return false;
    }
}

// ============================================================
// PERFIL
// ============================================================

async function updateUserProfile(userData) {
    const db = window.DBModule.getDB();
    try {
        const stmt = db.prepare(`
            UPDATE users 
            SET name = ?, business_name = ?, email = ?, phone = ?, 
                photo = ?, theme = ?
            WHERE id = ?
        `);
        stmt.bind([
            userData.name || null,
            userData.business_name || null,
            userData.email || null,
            userData.phone || null,
            userData.photo || null,
            userData.theme || 'light',
            userData.id
        ]);
        stmt.step();
        stmt.free();
        window.DBModule.saveDatabase();
        
        const current = getCurrentUser();
        if (current && current.id === userData.id) {
            setCurrentUser({ ...current, ...userData });
        }
        
        return { success: true };
    } catch (e) {
        console.error('Error actualizando perfil:', e);
        return { success: false, error: e.message };
    }
}

async function updateUserTheme(userId, theme) {
    const db = window.DBModule.getDB();
    try {
        const stmt = db.prepare('UPDATE users SET theme = ? WHERE id = ?');
        stmt.bind([theme, userId]);
        stmt.step();
        stmt.free();
        window.DBModule.saveDatabase();
        
        const current = getCurrentUser();
        if (current && current.id === userId) {
            current.theme = theme;
            setCurrentUser(current);
        }
        
        return { success: true };
    } catch (e) {
        console.error('Error actualizando tema:', e);
        return { success: false, error: e.message };
    }
}

async function getUserTheme(userId) {
    const db = window.DBModule.getDB();
    try {
        const stmt = db.prepare('SELECT theme FROM users WHERE id = ?');
        stmt.bind([userId]);
        let result = null;
        if (stmt.step()) {
            result = stmt.getAsObject();
        }
        stmt.free();
        return result?.theme || 'light';
    } catch (e) {
        console.error('Error obteniendo tema:', e);
        return 'light';
    }
}

async function updateUserPhoto(userId, photoData) {
    const db = window.DBModule.getDB();
    try {
        const stmt = db.prepare('UPDATE users SET photo = ? WHERE id = ?');
        stmt.bind([photoData, userId]);
        stmt.step();
        stmt.free();
        window.DBModule.saveDatabase();
        
        const current = getCurrentUser();
        if (current && current.id === userId) {
            current.photo = photoData;
            setCurrentUser(current);
        }
        
        return { success: true };
    } catch (e) {
        console.error('Error actualizando foto:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// CONFIGURACIÓN DEL DASHBOARD
// ============================================================

async function updateUserDashboardConfig(userId, config) {
    try {
        const result = window.DBModule.updateUserDashboardConfig(userId, config);
        
        if (result.success) {
            const current = getCurrentUser();
            if (current && current.id === userId) {
                current.dashboard_config = { ...config };
                setCurrentUser(current);
            }
        }
        
        return result;
    } catch (e) {
        console.error('Error actualizando config del dashboard:', e);
        return { success: false, error: e.message };
    }
}

function getUserDashboardConfig(userId) {
    return window.DBModule.getUserDashboardConfig(userId);
}

// ============================================================
// 🆕 CORRECCIÓN #17: SONIDO Y GUÍA RÁPIDA
// ============================================================

/**
 * 🆕 CORRECCIÓN #17: Obtiene la configuración de sonido del usuario actual.
 * Delegado a DBModule.
 */
function getUserSoundConfig(userId) {
    const uid = userId || (getCurrentUser()?.id);
    if (!uid) return { enabled: true, soundId: 'beep' };
    
    if (window.DBModule && typeof window.DBModule.getUserSoundConfig === 'function') {
        return window.DBModule.getUserSoundConfig(uid);
    }
    return { enabled: true, soundId: 'beep' };
}

/**
 * 🆕 CORRECCIÓN #17: Actualiza la configuración de sonido del usuario.
 * Delegado a DBModule.
 */
async function updateUserSoundConfig(userId, config) {
    if (!userId) return { success: false, error: 'No hay usuario' };
    
    if (window.DBModule && typeof window.DBModule.updateUserSoundConfig === 'function') {
        const result = window.DBModule.updateUserSoundConfig(userId, config);
        
        if (result.success) {
            const current = getCurrentUser();
            if (current && current.id === userId) {
                current.sound_enabled = config.enabled ? 1 : 0;
                current.sound_id = config.soundId;
                setCurrentUser(current);
            }
        }
        
        return result;
    }
    return { success: false, error: 'Función no disponible' };
}

/**
 * 🆕 CORRECCIÓN #17: Obtiene si la guía rápida está activa.
 * Delegado a DBModule.
 */
function getUserGuiaRapidaActiva(userId) {
    const uid = userId || (getCurrentUser()?.id);
    if (!uid) return true;
    
    if (window.DBModule && typeof window.DBModule.getUserGuiaRapidaActiva === 'function') {
        return window.DBModule.getUserGuiaRapidaActiva(uid);
    }
    return true;
}

/**
 * 🆕 CORRECCIÓN #17: Actualiza la preferencia de guía rápida.
 * Delegado a DBModule.
 */
async function updateUserGuiaRapida(userId, activa) {
    if (!userId) return { success: false, error: 'No hay usuario' };
    
    if (window.DBModule && typeof window.DBModule.updateUserGuiaRapida === 'function') {
        const result = window.DBModule.updateUserGuiaRapida(userId, activa);
        
        if (result.success) {
            const current = getCurrentUser();
            if (current && current.id === userId) {
                current.guia_rapida_activa = activa ? 1 : 0;
                setCurrentUser(current);
            }
        }
        
        return result;
    }
    return { success: false, error: 'Función no disponible' };
}

// ============================================================
// NEGOCIO DEL USUARIO
// ============================================================

function getCurrentNegocio() {
    const user = getCurrentUser();
    if (!user || !user.negocio_id) return null;
    return window.DBModule.getNegocio(user.negocio_id);
}

async function updateNegocioNombre(nuevoNombre) {
    try {
        const user = getCurrentUser();
        if (!user || !user.negocio_id) {
            return { success: false, error: 'El usuario no tiene negocio asignado' };
        }
        
        const result = window.DBModule.saveNegocio({
            id: user.negocio_id,
            nombre: nuevoNombre
        });
        
        if (result.success) {
            const current = getCurrentUser();
            if (current && current.negocio) {
                current.negocio.nombre = nuevoNombre;
                setCurrentUser(current);
            }
        }
        
        return result;
    } catch (e) {
        console.error('Error actualizando nombre del negocio:', e);
        return { success: false, error: e.message };
    }
}

function validarCodigoInvitacion(codigo) {
    if (!codigo || !codigo.trim()) {
        return { valid: false, error: 'Código vacío' };
    }
    
    const negocio = window.DBModule.getNegocioByCodigo(codigo.trim().toUpperCase());
    
    if (!negocio) {
        return { valid: false, error: 'Código no encontrado' };
    }
    
    const usuariosCount = window.DBModule.contarUsuariosNegocio(negocio.id);
    
    return {
        valid: true,
        negocio: {
            id: negocio.id,
            nombre: negocio.nombre,
            codigo: negocio.codigo_invitacion
        },
        usuarios: usuariosCount
    };
}

function isCurrentUserAdmin() {
    const user = getCurrentUser();
    return user && user.is_admin === 1;
}

// ============================================================
// 🆕 v2.3.5: VERIFICAR SI EL USUARIO ACTUAL ES EL PRIMER ADMIN
// ============================================================

/**
 * 🆕 v2.3.5: Devuelve true si el usuario actual es el primer admin
 * del negocio (is_first_admin = 1).
 */
function isCurrentUserFirstAdmin() {
    const user = getCurrentUser();
    return user && Number(user.is_first_admin) === 1;
}

// ============================================================
// 🆕 v2.3.5: OBTENER USUARIOS DEL NEGOCIO (con is_first_admin)
// ============================================================

function getUsuariosDelNegocio() {
    const user = getCurrentUser();
    if (!user || !user.negocio_id) return [];
    
    try {
        return window.DBModule.query(
            `SELECT id, username, name, email, phone, photo, is_admin, is_first_admin, created_at 
             FROM users 
             WHERE negocio_id = ? AND deleted_at IS NULL 
             ORDER BY is_first_admin DESC, is_admin DESC, created_at ASC`,
            [user.negocio_id]
        );
    } catch (e) {
        console.error('Error obteniendo usuarios del negocio:', e);
        return [];
    }
}

function contarUsuariosDelNegocio() {
    const user = getCurrentUser();
    if (!user || !user.negocio_id) return 0;
    return window.DBModule.contarUsuariosNegocio(user.negocio_id);
}

// ============================================================
// 🆕 FASE B: GESTIÓN DE USUARIOS POR ADMIN
// 🆕 v2.3.5: Los nuevos usuarios siempre is_first_admin = 0
// ============================================================

async function createUserAsAdmin(data) {
    const admin = getCurrentUser();
    if (!admin) return { success: false, error: 'No hay usuario autenticado' };
    if (admin.is_admin !== 1) return { success: false, error: 'Solo el administrador puede crear usuarios' };
    if (!admin.negocio_id) return { success: false, error: 'No hay negocio activo' };
    
    const username = (data.username || '').trim().toLowerCase();
    const password = (data.password || '').trim();
    const name = (data.name || '').trim();
    const email = (data.email || '').trim() || null;
    const phone = (data.phone || '').trim() || null;
    const isAdmin = data.isAdmin ? 1 : 0;
    
    if (!username) return { success: false, error: '⚠️ El nombre de usuario es obligatorio' };
    if (!password || password.length < 4) return { success: false, error: '⚠️ La contraseña debe tener al menos 4 caracteres' };
    if (!name) return { success: false, error: '⚠️ El nombre completo es obligatorio' };
    
    const db = window.DBModule.getDB();
    
    try {
        const existing = window.DBModule.query(
            'SELECT id FROM users WHERE LOWER(username) = ?',
            [username]
        );
        
        if (existing.length > 0) {
            return { success: false, error: '⚠️ El usuario ya existe. Elige otro nombre.' };
        }
        
        // 🆕 v2.3.5: Los usuarios creados por admin SIEMPRE tienen is_first_admin = 0
        const stmt = db.prepare(`
            INSERT INTO users (username, password, name, email, phone, theme, negocio_id, is_admin, is_first_admin) 
            VALUES (?, ?, ?, ?, ?, 'light', ?, ?, 0)
        `);
        stmt.bind([
            username,
            password,
            name,
            email,
            phone,
            admin.negocio_id,
            isAdmin
        ]);
        stmt.step();
        stmt.free();
        
        window.DBModule.saveAndNotify();
        
        const newUser = window.DBModule.query(
            'SELECT id FROM users WHERE LOWER(username) = ?',
            [username]
        );
        
        console.log(`✅ FASE B: Usuario "${username}" creado por admin ${admin.username} (is_first_admin = 0)`);
        
        return { 
            success: true, 
            userId: newUser[0]?.id,
            username: username,
            isAdmin: isAdmin,
            isFirstAdmin: 0
        };
        
    } catch (e) {
        console.error('Error creando usuario:', e);
        return { success: false, error: '❌ Error al crear usuario: ' + e.message };
    }
}

async function updateUserPassword(userId, newPassword) {
    const currentUser = getCurrentUser();
    if (!currentUser) return { success: false, error: 'No hay usuario autenticado' };
    
    const password = (newPassword || '').trim();
    if (!password || password.length < 4) {
        return { success: false, error: '⚠️ La contraseña debe tener al menos 4 caracteres' };
    }
    
    const isOwnUser = currentUser.id === userId;
    const isAdmin = currentUser.is_admin === 1;
    
    if (!isOwnUser && !isAdmin) {
        return { success: false, error: '⚠️ No tienes permiso para cambiar esta contraseña' };
    }
    
    const db = window.DBModule.getDB();
    
    try {
        if (!isOwnUser && isAdmin) {
            const targetUser = window.DBModule.query(
                'SELECT negocio_id FROM users WHERE id = ? AND deleted_at IS NULL',
                [userId]
            );
            
            if (targetUser.length === 0) {
                return { success: false, error: '⚠️ Usuario no encontrado' };
            }
            
            if (targetUser[0].negocio_id !== currentUser.negocio_id) {
                return { success: false, error: '⚠️ El usuario no pertenece a tu negocio' };
            }
        }
        
        const stmt = db.prepare('UPDATE users SET password = ? WHERE id = ?');
        stmt.bind([password, userId]);
        stmt.step();
        stmt.free();
        
        window.DBModule.saveAndNotify();
        
        console.log(`✅ FASE B: Contraseña actualizada para usuario #${userId} por ${currentUser.username}`);
        
        return { success: true };
        
    } catch (e) {
        console.error('Error actualizando contraseña:', e);
        return { success: false, error: '❌ Error al actualizar contraseña: ' + e.message };
    }
}

async function toggleUserAdmin(userId, isAdmin) {
    const currentUser = getCurrentUser();
    if (!currentUser) return { success: false, error: 'No hay usuario autenticado' };
    if (currentUser.is_admin !== 1) return { success: false, error: '⚠️ Solo el administrador puede cambiar roles' };
    if (currentUser.id === userId) {
        return { success: false, error: '⚠️ No puedes cambiar tu propio rol' };
    }
    
    const db = window.DBModule.getDB();
    
    try {
        const targetUser = window.DBModule.query(
            'SELECT id, is_admin, negocio_id, is_first_admin FROM users WHERE id = ? AND deleted_at IS NULL',
            [userId]
        );
        
        if (targetUser.length === 0) {
            return { success: false, error: '⚠️ Usuario no encontrado' };
        }
        
        if (targetUser[0].negocio_id !== currentUser.negocio_id) {
            return { success: false, error: '⚠️ El usuario no pertenece a tu negocio' };
        }
        
        // 🆕 v2.3.5: No se puede degradar al primer admin (is_first_admin)
        if (!isAdmin && Number(targetUser[0].is_first_admin) === 1) {
            return { success: false, error: '⚠️ No puedes degradar al primer administrador del negocio' };
        }
        
        const newAdminValue = isAdmin ? 1 : 0;
        
        if (!isAdmin && targetUser[0].is_admin === 1) {
            const adminCount = window.DBModule.query(
                'SELECT COUNT(*) as count FROM users WHERE negocio_id = ? AND is_admin = 1 AND deleted_at IS NULL',
                [currentUser.negocio_id]
            );
            
            if ((adminCount[0]?.count || 0) <= 1) {
                return { success: false, error: '⚠️ No puedes quitar admin al último administrador' };
            }
        }
        
        const stmt = db.prepare('UPDATE users SET is_admin = ? WHERE id = ?');
        stmt.bind([newAdminValue, userId]);
        stmt.step();
        stmt.free();
        
        window.DBModule.saveAndNotify();
        
        console.log(`✅ FASE B: Usuario #${userId} ${isAdmin ? 'promovido a admin' : 'degradado a usuario'} por ${currentUser.username}`);
        
        return { success: true, isAdmin: newAdminValue === 1 };
        
    } catch (e) {
        console.error('Error cambiando rol:', e);
        return { success: false, error: '❌ Error al cambiar rol: ' + e.message };
    }
}

async function deleteUserByAdmin(userId) {
    const currentUser = getCurrentUser();
    if (!currentUser) return { success: false, error: 'No hay usuario autenticado' };
    if (currentUser.is_admin !== 1) return { success: false, error: '⚠️ Solo el administrador puede eliminar usuarios' };
    if (currentUser.id === userId) return { success: false, error: '⚠️ No puedes eliminar tu propio usuario' };
    
    const db = window.DBModule.getDB();
    
    try {
        const targetUser = window.DBModule.query(
            'SELECT id, is_admin, username, negocio_id, is_first_admin FROM users WHERE id = ? AND deleted_at IS NULL',
            [userId]
        );
        
        if (targetUser.length === 0) {
            return { success: false, error: '⚠️ Usuario no encontrado' };
        }
        
        if (targetUser[0].negocio_id !== currentUser.negocio_id) {
            return { success: false, error: '⚠️ El usuario no pertenece a tu negocio' };
        }
        
        // 🆕 v2.3.5: No se puede eliminar al primer admin
        if (Number(targetUser[0].is_first_admin) === 1) {
            return { success: false, error: '⚠️ No puedes eliminar al primer administrador del negocio' };
        }
        
        if (targetUser[0].is_admin === 1) {
            const adminCount = window.DBModule.query(
                'SELECT COUNT(*) as count FROM users WHERE negocio_id = ? AND is_admin = 1 AND deleted_at IS NULL',
                [currentUser.negocio_id]
            );
            
            if ((adminCount[0]?.count || 0) <= 1) {
                return { success: false, error: '⚠️ No puedes eliminar al último administrador' };
            }
        }
        
        const stmt = db.prepare('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?');
        stmt.bind([userId]);
        stmt.step();
        stmt.free();
        
        window.DBModule.saveAndNotify();
        
        console.log(`✅ FASE B: Usuario "${targetUser[0].username}" eliminado por ${currentUser.username}`);
        
        return { success: true, username: targetUser[0].username };
        
    } catch (e) {
        console.error('Error eliminando usuario:', e);
        return { success: false, error: '❌ Error al eliminar usuario: ' + e.message };
    }
}

async function updateUserDataByAdmin(userId, data) {
    const currentUser = getCurrentUser();
    if (!currentUser) return { success: false, error: 'No hay usuario autenticado' };
    if (currentUser.is_admin !== 1) return { success: false, error: '⚠️ Solo el administrador puede editar usuarios' };
    
    const db = window.DBModule.getDB();
    
    try {
        const targetUser = window.DBModule.query(
            'SELECT negocio_id FROM users WHERE id = ? AND deleted_at IS NULL',
            [userId]
        );
        
        if (targetUser.length === 0) {
            return { success: false, error: '⚠️ Usuario no encontrado' };
        }
        
        if (targetUser[0].negocio_id !== currentUser.negocio_id) {
            return { success: false, error: '⚠️ El usuario no pertenece a tu negocio' };
        }
        
        const name = (data.name || '').trim() || null;
        const email = (data.email || '').trim() || null;
        const phone = (data.phone || '').trim() || null;
        
        if (!name) {
            return { success: false, error: '⚠️ El nombre es obligatorio' };
        }
        
        const stmt = db.prepare('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?');
        stmt.bind([name, email, phone, userId]);
        stmt.step();
        stmt.free();
        
        window.DBModule.saveAndNotify();
        
        return { success: true };
        
    } catch (e) {
        console.error('Error actualizando usuario:', e);
        return { success: false, error: '❌ Error al actualizar: ' + e.message };
    }
}

// ============================================================
// VALIDACIÓN
// ============================================================

async function userExists(username) {
    const db = window.DBModule.getDB();
    try {
        const normalizedUsername = username.trim().toLowerCase();
        const stmt = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?');
        stmt.bind([normalizedUsername]);
        let result = null;
        if (stmt.step()) {
            result = stmt.getAsObject();
        }
        stmt.free();
        return !!result;
    } catch (e) {
        console.error('Error verificando usuario:', e);
        return false;
    }
}

// ============================================================
// EXPORTACIÓN
// ============================================================

window.AuthModule = {
    registerUser,
    loginUser,
    setCurrentUser,
    getCurrentUser,
    logout,
    updateUserProfile,
    updateUserTheme,
    getUserTheme,
    updateUserPhoto,
    updateUserDashboardConfig,
    getUserDashboardConfig,
    // 🆕 CORRECCIÓN #17: Sonido y guía rápida
    getUserSoundConfig,
    updateUserSoundConfig,
    getUserGuiaRapidaActiva,
    updateUserGuiaRapida,
    // Fin corrección #17
    getCurrentNegocio,
    updateNegocioNombre,
    validarCodigoInvitacion,
    isCurrentUserAdmin,
    // 🆕 v2.3.5: Primer admin
    isCurrentUserFirstAdmin,
    getUsuariosDelNegocio,
    contarUsuariosDelNegocio,
    userExists,
    saveLastUser,
    getLastUser,
    clearLastUser,
    // 🆕 FASE B: Gestión de usuarios por admin
    createUserAsAdmin,
    updateUserPassword,
    toggleUserAdmin,
    deleteUserByAdmin,
    updateUserDataByAdmin
};

console.log('📦 Auth Module cargado correctamente v2.3.5 (SESIÓN 7: marcar primer admin)');
console.log('   🆕 Novedades v2.3.5:');
console.log('      • registerUser(): marca is_first_admin=1 al primer usuario del negocio');
console.log('      • createUserAsAdmin(): siempre is_first_admin=0');
console.log('      • loginUser(): carga is_first_admin (con migración automática)');
console.log('      • getUsuariosDelNegocio(): incluye is_first_admin');
console.log('      • NUEVA función: isCurrentUserFirstAdmin()');
console.log('      • Migración automática: _ensureFirstAdminOfNegocio()');
console.log('      • Protecciones: no degradar/eliminar al primer admin');
console.log('   🔄 Correcciones anteriores mantenidas:');
console.log('      • v2.3.4: Preferencias individuales (sonido + guía rápida)');
console.log('      • FASE B: gestión completa de usuarios por admin');