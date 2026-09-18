// ============================================================
// 📦 AUTH MODULE - Panario (Con recordar usuario, config dashboard
// y FASE 16: Multiusuario completo)
// AÑADIDO FASE B (170926):
//   - createUserAsAdmin(): admin crea usuario directamente
//   - updateUserPassword(): admin o propio usuario cambia contraseña
//   - toggleUserAdmin(): promover/quitar admin a un usuario
//   - deleteUserByAdmin(): eliminar usuario del negocio
//   - changeOwnPassword(): usuario cambia su propia contraseña
// ============================================================

window.AuthModule = {};

const LAST_USER_KEY = 'panario_last_user';

// ============================================================
// REGISTRO
// ============================================================

/**
 * Registra un nuevo usuario.
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña
 * @param {string} name - Nombre completo
 * @param {string} business - Nombre del negocio (si crea uno nuevo)
 * @param {string} negocioMode - 'crear' | 'unirse' (por defecto 'crear')
 * @param {string} codigoInvitacion - Código de invitación (solo si negocioMode='unirse')
 */
async function registerUser(username, password, name, business, negocioMode = 'crear', codigoInvitacion = '') {
    const db = window.DBModule.getDB();
    try {
        const normalizedUsername = username.trim().toLowerCase();
        
        let negocioId = null;
        let negocioNombre = '';
        let isAdmin = 0;
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
            codigoFinal = negocioResult.codigo;
            
            console.log(`🏢 Negocio creado: "${negocioNombre}" (ID: ${negocioId}, Código: ${codigoFinal})`);
        }
        
        // ============================================================
        // INSERTAR USUARIO
        // ============================================================
        const stmt = db.prepare(`
            INSERT INTO users (username, password, name, business_name, theme, negocio_id, is_admin) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
            normalizedUsername,
            password,
            name,
            negocioNombre,
            'light',
            negocioId,
            isAdmin
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
// ============================================================

async function loginUser(username, password) {
    const db = window.DBModule.getDB();
    try {
        const normalizedUsername = username.trim().toLowerCase();
        
        await window.DBModule.ensureUserTableColumns(db);
        await window.DBModule.ensureDashboardColumns(db);
        await window.DBModule.ensureNegocioIdColumn(db);
        await window.DBModule.ensureIsAdminColumn(db);
        
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
                
                // Cargar negocio del usuario
                if (result.negocio_id) {
                    const negocio = window.DBModule.getNegocio(result.negocio_id);
                    result.negocio = negocio;
                    console.log(`🏢 Usuario ${result.username} pertenece al negocio: "${negocio?.nombre || 'N/A'}" ${result.is_admin ? '(ADMIN)' : ''}`);
                } else {
                    await window.DBModule.migrateToMultiUser(db);
                    const userUpdated = window.DBModule.query('SELECT negocio_id, is_admin FROM users WHERE id = ?', [result.id]);
                    if (userUpdated.length > 0 && userUpdated[0].negocio_id) {
                        result.negocio_id = userUpdated[0].negocio_id;
                        result.is_admin = userUpdated[0].is_admin;
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

function getUsuariosDelNegocio() {
    const user = getCurrentUser();
    if (!user || !user.negocio_id) return [];
    
    try {
        return window.DBModule.query(
            `SELECT id, username, name, email, phone, photo, is_admin, created_at 
             FROM users 
             WHERE negocio_id = ? AND deleted_at IS NULL 
             ORDER BY is_admin DESC, created_at ASC`,
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
// ============================================================

/**
 * 🆕 FASE B: El admin crea un usuario directamente en su negocio.
 * No requiere código de invitación.
 * 
 * @param {object} data - { username, password, name, email, phone, isAdmin }
 * @returns {object} { success, userId, error }
 */
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
        // Verificar que el username no exista
        const existing = window.DBModule.query(
            'SELECT id FROM users WHERE LOWER(username) = ?',
            [username]
        );
        
        if (existing.length > 0) {
            return { success: false, error: '⚠️ El usuario ya existe. Elige otro nombre.' };
        }
        
        // Insertar usuario
        const stmt = db.prepare(`
            INSERT INTO users (username, password, name, email, phone, theme, negocio_id, is_admin) 
            VALUES (?, ?, ?, ?, ?, 'light', ?, ?)
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
        
        // Obtener el ID del nuevo usuario
        const newUser = window.DBModule.query(
            'SELECT id FROM users WHERE LOWER(username) = ?',
            [username]
        );
        
        console.log(`✅ FASE B: Usuario "${username}" creado por admin ${admin.username}`);
        
        return { 
            success: true, 
            userId: newUser[0]?.id,
            username: username,
            isAdmin: isAdmin
        };
        
    } catch (e) {
        console.error('Error creando usuario:', e);
        return { success: false, error: '❌ Error al crear usuario: ' + e.message };
    }
}

/**
 * 🆕 FASE B: Actualiza la contraseña de un usuario.
 * El admin puede cambiar la de cualquier usuario de su negocio.
 * Un usuario normal solo puede cambiar la suya propia.
 * 
 * @param {number} userId - ID del usuario
 * @param {string} newPassword - Nueva contraseña
 * @returns {object} { success, error }
 */
async function updateUserPassword(userId, newPassword) {
    const currentUser = getCurrentUser();
    if (!currentUser) return { success: false, error: 'No hay usuario autenticado' };
    
    const password = (newPassword || '').trim();
    if (!password || password.length < 4) {
        return { success: false, error: '⚠️ La contraseña debe tener al menos 4 caracteres' };
    }
    
    // Verificar permisos
    const isOwnUser = currentUser.id === userId;
    const isAdmin = currentUser.is_admin === 1;
    
    if (!isOwnUser && !isAdmin) {
        return { success: false, error: '⚠️ No tienes permiso para cambiar esta contraseña' };
    }
    
    const db = window.DBModule.getDB();
    
    try {
        // Si es admin pero no es su propio usuario, verificar que sea del mismo negocio
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

/**
 * 🆕 FASE B: Cambiar el rol de admin de un usuario.
 * Solo el admin puede hacerlo.
 * No se puede quitar admin al último admin del negocio.
 * 
 * @param {number} userId - ID del usuario
 * @param {boolean} isAdmin - true para promover, false para degradar
 * @returns {object} { success, error }
 */
async function toggleUserAdmin(userId, isAdmin) {
    const currentUser = getCurrentUser();
    if (!currentUser) return { success: false, error: 'No hay usuario autenticado' };
    if (currentUser.is_admin !== 1) return { success: false, error: '⚠️ Solo el administrador puede cambiar roles' };
    if (currentUser.id === userId) {
        return { success: false, error: '⚠️ No puedes cambiar tu propio rol' };
    }
    
    const db = window.DBModule.getDB();
    
    try {
        // Verificar que el usuario sea del mismo negocio
        const targetUser = window.DBModule.query(
            'SELECT id, is_admin, negocio_id FROM users WHERE id = ? AND deleted_at IS NULL',
            [userId]
        );
        
        if (targetUser.length === 0) {
            return { success: false, error: '⚠️ Usuario no encontrado' };
        }
        
        if (targetUser[0].negocio_id !== currentUser.negocio_id) {
            return { success: false, error: '⚠️ El usuario no pertenece a tu negocio' };
        }
        
        const newAdminValue = isAdmin ? 1 : 0;
        
        // Si estamos degradando a un admin, verificar que no sea el último
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

/**
 * 🆕 FASE B: Eliminar un usuario (soft-delete).
 * Solo el admin puede hacerlo. No puede eliminarse a sí mismo.
 * No puede eliminar al último admin.
 * 
 * @param {number} userId - ID del usuario
 * @returns {object} { success, error }
 */
async function deleteUserByAdmin(userId) {
    const currentUser = getCurrentUser();
    if (!currentUser) return { success: false, error: 'No hay usuario autenticado' };
    if (currentUser.is_admin !== 1) return { success: false, error: '⚠️ Solo el administrador puede eliminar usuarios' };
    if (currentUser.id === userId) return { success: false, error: '⚠️ No puedes eliminar tu propio usuario' };
    
    const db = window.DBModule.getDB();
    
    try {
        const targetUser = window.DBModule.query(
            'SELECT id, is_admin, username, negocio_id FROM users WHERE id = ? AND deleted_at IS NULL',
            [userId]
        );
        
        if (targetUser.length === 0) {
            return { success: false, error: '⚠️ Usuario no encontrado' };
        }
        
        if (targetUser[0].negocio_id !== currentUser.negocio_id) {
            return { success: false, error: '⚠️ El usuario no pertenece a tu negocio' };
        }
        
        // No permitir eliminar al último admin
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

/**
 * 🆕 FASE B: Actualiza los datos de un usuario (nombre, email, teléfono).
 * El admin puede editar cualquier usuario de su negocio.
 * 
 * @param {number} userId - ID del usuario
 * @param {object} data - { name, email, phone }
 * @returns {object} { success, error }
 */
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
    getCurrentNegocio,
    updateNegocioNombre,
    validarCodigoInvitacion,
    isCurrentUserAdmin,
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

console.log('📦 Auth Module cargado correctamente v2.0.2 (FASE 16 + FASE B: gestión completa de usuarios)');