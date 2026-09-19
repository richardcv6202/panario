// ============================================================
// 📦 DB MODULE - Panario
// CORREGIDO: Migración reforzada de owner_name
// ACTUALIZADO: Sistema de backups con marca de tipo y control de acceso
// CORREGIDO: Error "SQL.Database is not a constructor" al exportar
// AÑADIDO: forceReloadFromStorage() para recargar BD tras importar
// AÑADIDO: FASE 12 - Tabla premios_config + funciones de premios
// CORREGIDO FASE 1 (160926): 
//   - exportRecetasProductosSalva/importRecetasProductosSalva/readSalvaFile
//     ahora SÍ se exportan en window.DBModule
//   - reloadFromStorageAndNotify() para forzar recarga tras importaciones
//   - forceReloadFromStorage() ahora resetea dbInitialized correctamente
// CORREGIDO FASE A.3 (170926):
//   - exportDatabase() verifica sqlJsInstance y db antes de exportar
//   - downloadDatabase() devuelve SIEMPRE {success, error}
//   - importDatabase() / importDatabaseDataOnly() con try/catch/finally robusto
//   - importDatabaseFromFile() / importDatabaseDataOnlyFromFile() con timeout
// AÑADIDO FASE A.4 (170926 v2):
//   - ensureAuditColumns() para columnas created_by y modified_by
//   - getCurrentUserId() helper para auditoría
//   - Funciones de guardado ahora incluyen created_by/modified_by
//   - Función getUsuarioNombre(id) para mostrar nombre del creador
// AÑADIDO (180926 v4):
//   - slugifyNombreNegocio() helper
//   - downloadDatabase() incluye el nombre del negocio en el archivo
//   - exportRecetasProductosSalva() incluye el nombre del negocio en el archivo
// ============================================================

let db = null;
let dbInitialized = false;
let sqlJsInstance = null;

window.DBModule = {};

// ============================================================
// CONSTANTES DE BACKUP
// ============================================================

const BACKUP_META_TABLE = '_panario_meta';
const BACKUP_TYPE_COMPLETE = 'complete';
const BACKUP_TYPE_DATA_ONLY = 'data_only';

// ============================================================
// 🆕 v4 HELPER: SLUGIFY NOMBRE DEL NEGOCIO
// ============================================================

/**
 * Convierte el nombre del negocio en un slug válido para nombres de archivo.
 * 
 * Ejemplos:
 *   "Panadería La Esquina"  → "panaderia-la-esquina"
 *   "Pan de Casa"           → "pan-de-casa"
 *   "Ñoño & Cía."           → "nono-cia"
 *   ""                      → "panario"
 * 
 * @param {string} nombre - Nombre del negocio
 * @returns {string} Slug válido para nombre de archivo
 */
function slugifyNombreNegocio(nombre) {
    if (!nombre || typeof nombre !== 'string') return 'panario';
    
    try {
        // Normalizar: quitar acentos y diacríticos
        let slug = nombre
            .normalize('NFD')                       // Descomponer caracteres acentuados
            .replace(/[\u0300-\u036f]/g, '')        // Quitar los diacríticos
            .toLowerCase()                          // Todo minúsculas
            .replace(/ñ/g, 'n')                     // ñ → n (por si acaso)
            .replace(/[^a-z0-9\s-]/g, '')           // Solo letras, números, espacios y guiones
            .trim()                                 // Quitar espacios al inicio/fin
            .replace(/\s+/g, '-')                   // Espacios → guiones
            .replace(/-+/g, '-')                    // Múltiples guiones → uno
            .replace(/^-+|-+$/g, '');               // Quitar guiones al inicio/fin
        
        return slug || 'panario';
    } catch (e) {
        console.warn('⚠️ Error slugificando nombre:', e);
        return 'panario';
    }
}

/**
 * Obtiene el nombre actual del negocio (o 'panario' como fallback).
 */
function getNombreNegocioDB() {
    try {
        if (typeof window.getNombreNegocio === 'function') {
            return window.getNombreNegocio();
        }
        
        const user = window.AuthModule?.getCurrentUser();
        if (user) {
            if (user.negocio && user.negocio.nombre) return user.negocio.nombre;
            if (user.business_name) return user.business_name;
        }
        
        return 'Panario';
    } catch (e) {
        return 'Panario';
    }
}

/**
 * Devuelve el prefijo para nombres de archivo de backup.
 * Ejemplo: "panario_panaderia-la-esquina"
 */
function getPrefijoBackup() {
    const nombreNegocio = getNombreNegocioDB();
    const slug = slugifyNombreNegocio(nombreNegocio);
    return `panario_${slug}`;
}

// ============================================================
// 🆕 FASE A.4 - HELPER DE AUDITORÍA
// ============================================================

/**
 * Obtiene el ID del usuario actual para auditoría.
 * Devuelve null si no hay usuario.
 */
function getCurrentUserId() {
    try {
        const user = window.AuthModule?.getCurrentUser();
        return user?.id || null;
    } catch (e) {
        return null;
    }
}

/**
 * Obtiene el nombre del usuario a partir de su ID.
 * Útil para mostrar "Creado por: [nombre]".
 */
function getUsuarioNombre(userId) {
    if (!userId) return null;
    try {
        const result = query(
            'SELECT name, username FROM users WHERE id = ? AND deleted_at IS NULL',
            [userId]
        );
        if (result.length === 0) return null;
        return result[0].name || result[0].username || null;
    } catch (e) {
        return null;
    }
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

async function initDB() {
    if (db && dbInitialized) return db;

    console.log('🔄 Inicializando SQLite con SQL.js LOCAL...');
    
    try {
        if (typeof window.initSqlJs === 'undefined') {
            console.error('❌ SQL.js no está cargado localmente.');
            throw new Error('SQL.js no está disponible');
        }

        console.log('✅ SQL.js encontrado, inicializando...');
        
        const SQL = await window.initSqlJs({
            locateFile: file => `lib/${file}`
        });
        
        sqlJsInstance = SQL;

        let savedData = null;
        try {
            const saved = localStorage.getItem('panario_db_data');
            if (saved) {
                savedData = new Uint8Array(JSON.parse(saved));
                console.log('✅ Datos recuperados de localStorage');
            }
        } catch (e) {
            console.log('⚠️ No se encontraron datos guardados');
        }

        if (savedData) {
            db = new SQL.Database(savedData);
            console.log('✅ Base de datos restaurada desde localStorage');
        } else {
            db = new SQL.Database();
            console.log('✅ Nueva base de datos creada');
        }

        await createAllTables(db);
        await ensureUserTableColumns(db);
        await ensureSoftDeleteColumns(db);
        await ensureVoidColumns(db);
        await ensureOrderIdColumn(db);
        await ensureWaitingListColumns(db);
        await ensureBankAccountsColumns(db);
        await ensureCorrienteConfigTable(db);
        await ensureIsLiberatedColumn(db);
        await ensureDashboardColumns(db);
        await ensurePremiosConfigTable(db);
        // FASE 16.1
        await ensureNegociosTable(db);
        await ensureNegocioIdColumn(db);
        await migrateToMultiUser(db);
        // FASE 16.2
        await ensureNegocioIdInAllTables(db);
        await migrateNegocioIdToAllTables(db);
        await createNegocioIdIndexes(db);
        // FASE 16.3
        await ensureIsAdminColumn(db);
        // FASE A.4: Auditoría
        await ensureAuditColumns(db);
        // ---
        await migrateToNewStructure(db);
        await seedDefaultUnits(db);
        await seedDefaultProducts(db);
        await seedDefaultInsumos(db);
        
        saveDatabase();
        dbInitialized = true;
        console.log('✅ Base de datos inicializada correctamente');
        return db;
        
    } catch (error) {
        console.error('❌ Error fatal inicializando DB:', error);
        throw error;
    }
}

// ============================================================
// FASE A.4 - COLUMNAS DE AUDITORÍA
// ============================================================

async function ensureAuditColumns(db) {
    const tablesConAuditoria = [
        'insumos',
        'recipes',
        'productos',
        'orders',
        'sales',
        'transactions',
        'clients',
        'waiting_list',
        'bank_accounts',
        'corriente_config',
        'premios_config'
    ];
    
    let addedColumns = 0;
    
    for (const table of tablesConAuditoria) {
        try {
            const tableCheck = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
            if (tableCheck.length === 0 || tableCheck[0].values.length === 0) continue;
            
            const columns = db.exec(`PRAGMA table_info(${table})`);
            const columnNames = columns[0]?.values?.map(row => row[1]) || [];
            
            if (!columnNames.includes('created_by')) {
                try {
                    db.run(`ALTER TABLE ${table} ADD COLUMN created_by INTEGER`);
                    addedColumns++;
                } catch (e) {
                    console.warn(`⚠️ No se pudo añadir created_by a ${table}:`, e.message);
                }
            }
            
            if (!columnNames.includes('modified_by')) {
                try {
                    db.run(`ALTER TABLE ${table} ADD COLUMN modified_by INTEGER`);
                    addedColumns++;
                } catch (e) {
                    console.warn(`⚠️ No se pudo añadir modified_by a ${table}:`, e.message);
                }
            }
            
            try {
                db.run(`CREATE INDEX IF NOT EXISTS idx_${table}_created_by ON ${table}(created_by)`);
                db.run(`CREATE INDEX IF NOT EXISTS idx_${table}_modified_by ON ${table}(modified_by)`);
            } catch (e) {}
            
        } catch (error) {
            console.warn(`⚠️ Error auditando ${table}:`, error.message);
        }
    }
    
    console.log(`✅ FASE A.4: Auditoría verificada (${addedColumns} columnas añadidas)`);
}

// ============================================================
// FORZAR RECARGA DE LA BASE DE DATOS DESDE LOCALSTORAGE
// ============================================================

function forceReloadFromStorage() {
    try {
        console.log('🔄 Forzando recarga de BD desde localStorage...');
        
        const saved = localStorage.getItem('panario_db_data');
        if (!saved) {
            console.warn('⚠️ No hay datos en localStorage');
            return false;
        }
        
        if (db) {
            try { 
                db.close(); 
                console.log('🔒 BD anterior cerrada');
            } catch (e) {
                console.warn('⚠️ Error cerrando BD anterior:', e.message);
            }
        }
        
        dbInitialized = false;
        window.dbInitialized = false;
        window._dbInitialized = false;
        
        const savedData = new Uint8Array(JSON.parse(saved));
        
        if (!sqlJsInstance) {
            console.error('❌ sqlJsInstance no disponible');
            return false;
        }
        
        db = new sqlJsInstance.Database(savedData);
        dbInitialized = true;
        
        console.log('✅ BD recargada desde localStorage');
        return true;
    } catch (error) {
        console.error('❌ Error recargando BD:', error);
        return false;
    }
}

function reloadFromStorageAndNotify() {
    const success = forceReloadFromStorage();
    if (success) {
        saveAndNotify();
        console.log('✅ BD recargada y notificada a la UI');
    }
    return success;
}

// ============================================================
// VERIFICAR COLUMNAS DE BANK_ACCOUNTS
// ============================================================

async function ensureBankAccountsColumns(db) {
    try {
        console.log('🔍 Verificando columnas de bank_accounts...');
        
        const tableCheck = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='bank_accounts'`);
        if (tableCheck.length === 0 || tableCheck[0].values.length === 0) {
            return;
        }

        const columns = db.exec('PRAGMA table_info(bank_accounts)');
        const columnNames = columns[0]?.values?.map(row => row[1]) || [];

        const requiredColumns = [
            { name: 'qr_code', type: 'TEXT' },
            { name: 'is_default', type: 'INTEGER DEFAULT 0' },
            { name: 'phone', type: 'TEXT' },
            { name: 'owner_name', type: 'TEXT' },
            { name: 'updated_at', type: 'DATETIME' }
        ];
        
        let added = 0;
        for (const col of requiredColumns) {
            if (!columnNames.includes(col.name)) {
                try {
                    db.run(`ALTER TABLE bank_accounts ADD COLUMN ${col.name} ${col.type}`);
                    added++;
                } catch (alterErr) {
                    console.warn(`   ⚠️ Error agregando ${col.name}:`, alterErr.message);
                }
            }
        }
        
        const finalColumns = db.exec('PRAGMA table_info(bank_accounts)');
        const finalColumnNames = finalColumns[0]?.values?.map(row => row[1]) || [];
        
        if (finalColumnNames.includes('owner_name')) {
            console.log(`✅ Columna owner_name confirmada (${added} columnas añadidas)`);
        }
        
    } catch (error) {
        console.error('❌ Error verificando bank_accounts:', error);
    }
}

// ============================================================
// FASE 12 - TABLA PREMIOS_CONFIG
// ============================================================

async function ensurePremiosConfigTable(db) {
    try {
        db.run(`
            CREATE TABLE IF NOT EXISTS premios_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                negocio_id INTEGER NOT NULL UNIQUE,
                activo INTEGER DEFAULT 1,
                premio_mensual TEXT,
                premio_anual TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (negocio_id) REFERENCES negocios(id)
            )
        `);
        console.log('✅ Tabla premios_config verificada');
    } catch (error) {
        console.warn('⚠️ Error verificando tabla premios_config:', error);
    }
}

// ============================================================
// FASE 16.1 - TABLA NEGOCIOS
// ============================================================

async function ensureNegociosTable(db) {
    try {
        db.run(`
            CREATE TABLE IF NOT EXISTS negocios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                codigo_invitacion TEXT UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL
            )
        `);
        console.log('✅ Tabla negocios verificada');
    } catch (error) {
        console.warn('⚠️ Error verificando tabla negocios:', error);
    }
}

async function ensureNegocioIdColumn(db) {
    try {
        const columns = db.exec('PRAGMA table_info(users)');
        const columnNames = columns[0]?.values?.map(row => row[1]) || [];
        
        if (!columnNames.includes('negocio_id')) {
            db.run('ALTER TABLE users ADD COLUMN negocio_id INTEGER');
            console.log('✅ Columna negocio_id agregada a users');
        }
    } catch (error) {
        console.warn('⚠️ Error verificando columna negocio_id:', error);
    }
}

async function migrateToMultiUser(db) {
    try {
        const negociosCount = db.exec('SELECT COUNT(*) as count FROM negocios');
        const totalNegocios = negociosCount[0]?.values?.[0]?.[0] || 0;
        
        const usersSinNegocio = db.exec(`
            SELECT id, username, business_name 
            FROM users 
            WHERE negocio_id IS NULL AND deleted_at IS NULL
        `);
        
        const usuariosSinNegocio = usersSinNegocio[0]?.values || [];
        
        if (usuariosSinNegocio.length === 0) {
            console.log('✅ No hay usuarios sin negocio. Migración omitida.');
            return;
        }
        
        console.log(`📦 Migrando ${usuariosSinNegocio.length} usuario(s) a multiusuario...`);
        
        let negocioId;
        
        if (totalNegocios === 0) {
            const businessName = usuariosSinNegocio[0][2] || 'Mi Negocio';
            const codigo = generarCodigoInvitacion();
            
            db.run(`
                INSERT INTO negocios (nombre, codigo_invitacion)
                VALUES (?, ?)
            `, [businessName, codigo]);
            
            const idResult = db.exec('SELECT last_insert_rowid() as id');
            negocioId = idResult[0]?.values?.[0]?.[0];
            
            console.log(`✅ Negocio "${businessName}" creado (ID: ${negocioId}, Código: ${codigo})`);
        } else {
            const firstNegocio = db.exec('SELECT id FROM negocios WHERE deleted_at IS NULL LIMIT 1');
            negocioId = firstNegocio[0]?.values?.[0]?.[0];
            console.log(`✅ Usando negocio existente (ID: ${negocioId})`);
        }
        
        const adminCheck = db.exec(`
            SELECT COUNT(*) FROM users 
            WHERE negocio_id = ? AND is_admin = 1 AND deleted_at IS NULL
        `, [negocioId]);
        const adminCount = adminCheck[0]?.values?.[0]?.[0] || 0;
        
        let isFirstUser = adminCount === 0;
        
        for (const user of usuariosSinNegocio) {
            const isAdmin = isFirstUser ? 1 : 0;
            db.run('UPDATE users SET negocio_id = ?, is_admin = ? WHERE id = ?', [negocioId, isAdmin, user[0]]);
            isFirstUser = false;
        }
        
        console.log(`✅ Migración multiusuario completada`);
        
    } catch (error) {
        console.warn('⚠️ Error en migración multiusuario:', error);
    }
}

// ============================================================
// FASE 16.2 - NEGOCIO_ID EN TODAS LAS TABLAS
// ============================================================

async function ensureNegocioIdInAllTables(db) {
    const tables = [
        'insumos', 'recipes', 'productos', 'clients', 'orders',
        'sales', 'transactions', 'inventory', 'waiting_list',
        'notifications', 'bank_accounts', 'corriente_config'
    ];
    
    for (const table of tables) {
        try {
            const tableCheck = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
            if (tableCheck.length === 0 || tableCheck[0].values.length === 0) continue;
            
            const columns = db.exec(`PRAGMA table_info(${table})`);
            const columnNames = columns[0]?.values?.map(row => row[1]) || [];
            
            if (!columnNames.includes('negocio_id')) {
                db.run(`ALTER TABLE ${table} ADD COLUMN negocio_id INTEGER`);
            }
        } catch (error) {}
    }
}

async function migrateNegocioIdToAllTables(db) {
    try {
        const usersMapping = {};
        const usersResult = db.exec('SELECT id, negocio_id FROM users WHERE deleted_at IS NULL');
        if (usersResult.length > 0 && usersResult[0].values) {
            for (const row of usersResult[0].values) {
                usersMapping[row[0]] = row[1];
            }
        }
        
        const defaultNegocioResult = db.exec('SELECT id FROM negocios WHERE deleted_at IS NULL LIMIT 1');
        const defaultNegocioId = defaultNegocioResult[0]?.values?.[0]?.[0] || 1;
        
        const tablesWithUserId = [
            'insumos', 'recipes', 'productos', 'clients', 'orders',
            'sales', 'transactions', 'inventory', 'waiting_list',
            'notifications', 'bank_accounts', 'corriente_config'
        ];
        
        for (const table of tablesWithUserId) {
            try {
                const countResult = db.exec(`SELECT COUNT(*) FROM ${table} WHERE negocio_id IS NULL`);
                const totalSinNegocio = countResult[0]?.values?.[0]?.[0] || 0;
                
                if (totalSinNegocio === 0) continue;
                
                const records = db.exec(`SELECT id, user_id FROM ${table} WHERE negocio_id IS NULL`);
                const rows = records[0]?.values || [];
                
                for (const row of rows) {
                    const recordId = row[0];
                    const userId = row[1];
                    
                    let negocioId = null;
                    if (userId && usersMapping[userId] !== undefined && usersMapping[userId] !== null) {
                        negocioId = usersMapping[userId];
                    } else {
                        negocioId = defaultNegocioId;
                    }
                    
                    if (negocioId) {
                        db.run(`UPDATE ${table} SET negocio_id = ? WHERE id = ?`, [negocioId, recordId]);
                    }
                }
            } catch (error) {}
        }
        
        console.log('✅ FASE 16.2: Migración de negocio_id completada');
        
    } catch (error) {
        console.error('❌ Error en migración de negocio_id:', error);
    }
}

async function createNegocioIdIndexes(db) {
    const tables = [
        'insumos', 'recipes', 'productos', 'clients', 'orders',
        'sales', 'transactions', 'inventory', 'waiting_list',
        'notifications', 'bank_accounts', 'corriente_config'
    ];
    
    for (const table of tables) {
        try {
            db.run(`CREATE INDEX IF NOT EXISTS idx_${table}_negocio_id ON ${table}(negocio_id)`);
        } catch (error) {}
    }
}

// ============================================================
// FASE 16.3 - COLUMNA IS_ADMIN
// ============================================================

async function ensureIsAdminColumn(db) {
    try {
        const columns = db.exec('PRAGMA table_info(users)');
        const columnNames = columns[0]?.values?.map(row => row[1]) || [];
        
        if (!columnNames.includes('is_admin')) {
            db.run('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
            console.log('✅ Columna is_admin agregada');
        }
    } catch (error) {
        console.warn('⚠️ Error verificando columna is_admin:', error);
    }
}

// ============================================================
// NEGOCIOS - FUNCIONES
// ============================================================

function generarCodigoInvitacion() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = '';
    for (let i = 0; i < 8; i++) {
        codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return codigo;
}

function getNegocios() {
    return query('SELECT * FROM negocios WHERE deleted_at IS NULL ORDER BY nombre');
}

function getNegocio(id) {
    const results = query('SELECT * FROM negocios WHERE id = ? AND deleted_at IS NULL', [id]);
    return results.length > 0 ? results[0] : null;
}

function getNegocioByUser(userId) {
    const user = query('SELECT negocio_id FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
    if (user.length === 0 || !user[0].negocio_id) return null;
    return getNegocio(user[0].negocio_id);
}

function getNegocioByCodigo(codigo) {
    const results = query(
        'SELECT * FROM negocios WHERE codigo_invitacion = ? AND deleted_at IS NULL',
        [codigo.toUpperCase().trim()]
    );
    return results.length > 0 ? results[0] : null;
}

function saveNegocio(data) {
    try {
        if (data.id) {
            execute(`
                UPDATE negocios 
                SET nombre = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [data.nombre, data.id]);
            return { success: true, id: data.id };
        } else {
            const codigo = data.codigo_invitacion || generarCodigoInvitacion();
            const result = execute(`
                INSERT INTO negocios (nombre, codigo_invitacion)
                VALUES (?, ?)
            `, [data.nombre, codigo]);
            return { success: true, id: result.lastId, codigo: codigo };
        }
    } catch (e) {
        console.error('Error guardando negocio:', e);
        return { success: false, error: e.message };
    }
}

function regenerarCodigoInvitacion(negocioId) {
    try {
        let nuevoCodigo;
        let intentos = 0;
        do {
            nuevoCodigo = generarCodigoInvitacion();
            intentos++;
        } while (getNegocioByCodigo(nuevoCodigo) && intentos < 10);
        
        execute(`
            UPDATE negocios 
            SET codigo_invitacion = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [nuevoCodigo, negocioId]);
        
        return { success: true, codigo: nuevoCodigo };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function validarCodigoInvitacion(codigo) {
    if (!codigo) return null;
    return getNegocioByCodigo(codigo);
}

function contarUsuariosNegocio(negocioId) {
    const result = query(
        'SELECT COUNT(*) as count FROM users WHERE negocio_id = ? AND deleted_at IS NULL',
        [negocioId]
    );
    return result[0]?.count || 0;
}

function getNegocioIdActual() {
    try {
        const user = window.AuthModule?.getCurrentUser();
        
        if (user && user.negocio_id) {
            return user.negocio_id;
        }
        
        if (user && user.id) {
            const result = query('SELECT negocio_id FROM users WHERE id = ?', [user.id]);
            if (result.length > 0 && result[0].negocio_id) {
                return result[0].negocio_id;
            }
        }
        
        const neg = query('SELECT id FROM negocios WHERE deleted_at IS NULL LIMIT 1');
        return neg.length > 0 ? neg[0].id : 1;
    } catch (e) {
        console.warn('Error obteniendo negocio_id actual:', e);
        return 1;
    }
}

// ============================================================
// CONFIGURACIÓN DEL DASHBOARD
// ============================================================

async function ensureDashboardColumns(db) {
    try {
        const columns = db.exec('PRAGMA table_info(users)');
        const columnNames = columns[0]?.values?.map(row => row[1]) || [];
        
        const dashboardColumns = [
            { name: 'dash_show_corriente', type: 'INTEGER DEFAULT 1' },
            { name: 'dash_show_top_clients', type: 'INTEGER DEFAULT 1' },
            { name: 'dash_show_top_products', type: 'INTEGER DEFAULT 1' },
            { name: 'dash_show_funds_analysis', type: 'INTEGER DEFAULT 1' },
            { name: 'dash_show_payment_methods', type: 'INTEGER DEFAULT 1' },
            { name: 'dash_show_quick_actions', type: 'INTEGER DEFAULT 1' },
            { name: 'dash_show_bank_qr', type: 'INTEGER DEFAULT 0' },
            { name: 'dash_show_help_button', type: 'INTEGER DEFAULT 1' },
            { name: 'dash_show_orders_today', type: 'INTEGER DEFAULT 1' }
        ];
        
        for (const col of dashboardColumns) {
            if (!columnNames.includes(col.name)) {
                db.run(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
            }
        }
    } catch (error) {
        console.warn('⚠️ Error verificando columnas de dashboard:', error);
    }
}

function getUserDashboardConfig(userId) {
    const defaultConfig = {
        show_corriente: true,
        show_top_clients: true,
        show_top_products: true,
        show_funds_analysis: true,
        show_payment_methods: true,
        show_quick_actions: true,
        show_bank_qr: false,
        show_help_button: true,
        show_orders_today: true
    };
    
    try {
        const results = query(
            `SELECT dash_show_corriente, dash_show_top_clients, dash_show_top_products,
                    dash_show_funds_analysis, dash_show_payment_methods, dash_show_quick_actions,
                    dash_show_bank_qr, dash_show_help_button, dash_show_orders_today
             FROM users WHERE id = ?`,
            [userId]
        );
        
        if (results.length === 0) return defaultConfig;
        
        const row = results[0];
        return {
            show_corriente: row.dash_show_corriente !== 0,
            show_top_clients: row.dash_show_top_clients !== 0,
            show_top_products: row.dash_show_top_products !== 0,
            show_funds_analysis: row.dash_show_funds_analysis !== 0,
            show_payment_methods: row.dash_show_payment_methods !== 0,
            show_quick_actions: row.dash_show_quick_actions !== 0,
            show_bank_qr: row.dash_show_bank_qr === 1,
            show_help_button: row.dash_show_help_button !== 0,
            show_orders_today: row.dash_show_orders_today !== 0
        };
    } catch (e) {
        return defaultConfig;
    }
}

function updateUserDashboardConfig(userId, config) {
    try {
        execute(`
            UPDATE users 
            SET dash_show_corriente = ?,
                dash_show_top_clients = ?,
                dash_show_top_products = ?,
                dash_show_funds_analysis = ?,
                dash_show_payment_methods = ?,
                dash_show_quick_actions = ?,
                dash_show_bank_qr = ?,
                dash_show_help_button = ?,
                dash_show_orders_today = ?
            WHERE id = ?
        `, [
            config.show_corriente ? 1 : 0,
            config.show_top_clients ? 1 : 0,
            config.show_top_products ? 1 : 0,
            config.show_funds_analysis ? 1 : 0,
            config.show_payment_methods ? 1 : 0,
            config.show_quick_actions ? 1 : 0,
            config.show_bank_qr ? 1 : 0,
            config.show_help_button ? 1 : 0,
            config.show_orders_today ? 1 : 0,
            userId
        ]);
        
        return { success: true };
    } catch (e) {
        console.error('❌ Error guardando config del dashboard:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// SEMILLA DE PRODUCTOS POR DEFECTO
// ============================================================

async function seedDefaultProducts(db) {
    try {
        const count = db.exec('SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL');
        const existing = count[0]?.values?.[0]?.[0] || 0;
        
        if (existing === 0) {
            const defaultProducts = [
                { name: 'Pan Integral', price: 2.50, category: 'panes' },
                { name: 'Pan Blanco', price: 2.00, category: 'panes' },
                { name: 'Pan de Masa Madre', price: 3.50, category: 'panes' },
                { name: 'Pan de Centeno', price: 3.00, category: 'panes' },
                { name: 'Pan de Ajo', price: 2.50, category: 'panes' },
                { name: 'Pan de Semillas', price: 3.20, category: 'panes' },
                { name: 'Pan de Campo', price: 2.80, category: 'panes' },
                { name: 'Croissant', price: 1.50, category: 'dulces' },
                { name: 'Medialuna', price: 1.00, category: 'dulces' },
                { name: 'Factura', price: 1.20, category: 'dulces' },
                { name: 'Rosca', price: 4.00, category: 'dulces' },
                { name: 'Bizcocho', price: 2.00, category: 'dulces' },
                { name: 'Torta', price: 8.00, category: 'tortas' },
                { name: 'Pastel', price: 6.00, category: 'tortas' },
                { name: 'Galletas surtidas', price: 3.00, category: 'galletas' },
                { name: 'Pan de Hamburguesa', price: 1.50, category: 'panes' },
                { name: 'Pan de Hot Dog', price: 1.20, category: 'panes' },
                { name: 'Pan de Molde', price: 2.80, category: 'panes' }
            ];
            
            const userResult = db.exec('SELECT id FROM users LIMIT 1');
            const userId = userResult[0]?.values?.[0]?.[0] || 1;
            
            for (const product of defaultProducts) {
                db.run(`
                    INSERT INTO products (user_id, name, price, category, is_active)
                    VALUES (?, ?, ?, ?, 1)
                `, [userId, product.name, product.price, product.category]);
            }
        }
    } catch (error) {
        console.warn('⚠️ Error insertando productos por defecto:', error);
    }
}

// ============================================================
// SEMILLA DE INSUMOS POR DEFECTO
// ============================================================

async function seedDefaultInsumos(db) {
    try {
        const count = db.exec('SELECT COUNT(*) as count FROM insumos WHERE deleted_at IS NULL');
        const existing = count[0]?.values?.[0]?.[0] || 0;
        
        if (existing === 0) {
            const userResult = db.exec('SELECT id FROM users LIMIT 1');
            const userId = userResult[0]?.values?.[0]?.[0] || 1;
            
            const defaultInsumos = [
                { nombre: 'Harina de trigo', unidad: 'kg', costo_unitario: 1000, stock: 50, stock_minimo: 10 },
                { nombre: 'Levadura', unidad: 'kg', costo_unitario: 500, stock: 5, stock_minimo: 1 },
                { nombre: 'Sal', unidad: 'kg', costo_unitario: 200, stock: 10, stock_minimo: 2 },
                { nombre: 'Azúcar', unidad: 'kg', costo_unitario: 300, stock: 8, stock_minimo: 2 },
                { nombre: 'Yogur natural', unidad: 'L', costo_unitario: 200, stock: 10, stock_minimo: 2 },
                { nombre: 'Mantequilla', unidad: 'kg', costo_unitario: 800, stock: 5, stock_minimo: 1 },
                { nombre: 'Huevos', unidad: 'unid', costo_unitario: 30, stock: 60, stock_minimo: 12 }
            ];
            
            for (const insumo of defaultInsumos) {
                db.run(`
                    INSERT INTO insumos (user_id, nombre, unidad, costo_unitario, stock, stock_minimo)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [userId, insumo.nombre, insumo.unidad, insumo.costo_unitario, insumo.stock, insumo.stock_minimo]);
            }
        }
    } catch (error) {
        console.warn('⚠️ Error insertando insumos por defecto:', error);
    }
}

// ============================================================
// CREAR TABLAS
// ============================================================

async function createAllTables(db) {
    try {
        db.run(`
            CREATE TABLE IF NOT EXISTS units (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                abbreviation TEXT NOT NULL,
                category TEXT DEFAULT 'other',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS negocios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                codigo_invitacion TEXT UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT,
                business_name TEXT,
                email TEXT,
                phone TEXT,
                photo TEXT,
                theme TEXT DEFAULT 'light',
                negocio_id INTEGER,
                is_admin INTEGER DEFAULT 0,
                dash_show_corriente INTEGER DEFAULT 1,
                dash_show_top_clients INTEGER DEFAULT 1,
                dash_show_top_products INTEGER DEFAULT 1,
                dash_show_funds_analysis INTEGER DEFAULT 1,
                dash_show_payment_methods INTEGER DEFAULT 1,
                dash_show_quick_actions INTEGER DEFAULT 1,
                dash_show_bank_qr INTEGER DEFAULT 0,
                dash_show_help_button INTEGER DEFAULT 1,
                dash_show_orders_today INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (negocio_id) REFERENCES negocios(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS recipes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                negocio_id INTEGER,
                name TEXT NOT NULL,
                description TEXT,
                instructions TEXT,
                yield_units REAL,
                yield_unit_type TEXT,
                shared INTEGER DEFAULT 0,
                used_by_others INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS recipe_ingredients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recipe_id INTEGER NOT NULL,
                ingredient_name TEXT NOT NULL,
                quantity REAL NOT NULL,
                unit TEXT NOT NULL,
                unit_id INTEGER,
                price REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
                FOREIGN KEY (unit_id) REFERENCES units(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS insumos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                negocio_id INTEGER,
                nombre TEXT NOT NULL,
                unidad TEXT NOT NULL,
                costo_unitario REAL NOT NULL DEFAULT 0,
                stock REAL NOT NULL DEFAULT 0,
                stock_minimo REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS receta_insumos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receta_id INTEGER NOT NULL,
                insumo_id INTEGER NOT NULL,
                cantidad REAL NOT NULL,
                unidad TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (receta_id) REFERENCES recipes(id) ON DELETE CASCADE,
                FOREIGN KEY (insumo_id) REFERENCES insumos(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS productos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                negocio_id INTEGER,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                precio_venta REAL NOT NULL DEFAULT 0,
                unidad_venta TEXT DEFAULT 'unidad',
                cantidad_por_unidad INTEGER DEFAULT 1,
                receta_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (receta_id) REFERENCES recipes(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                negocio_id INTEGER,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                address TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                negocio_id INTEGER,
                client_id INTEGER,
                client_name TEXT NOT NULL,
                client_phone TEXT,
                order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                delivery_date DATETIME NOT NULL,
                status TEXT DEFAULT 'pending',
                priority TEXT DEFAULT 'normal',
                total REAL DEFAULT 0,
                notes TEXT,
                session TEXT,
                has_advance_payment INTEGER DEFAULT 0,
                advance_amount REAL DEFAULT 0,
                advance_payment_method TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (client_id) REFERENCES clients(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                producto_id INTEGER,
                receta_id INTEGER,
                quantity REAL NOT NULL,
                unit_price REAL NOT NULL,
                subtotal REAL NOT NULL,
                unit_id INTEGER,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (producto_id) REFERENCES productos(id),
                FOREIGN KEY (receta_id) REFERENCES recipes(id),
                FOREIGN KEY (unit_id) REFERENCES units(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                payment_method TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS waiting_list (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                negocio_id INTEGER,
                order_id INTEGER NOT NULL,
                position INTEGER NOT NULL,
                status TEXT DEFAULT 'waiting',
                client_name TEXT NOT NULL,
                client_phone TEXT,
                product_name TEXT NOT NULL,
                quantity REAL NOT NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                notified_at DATETIME,
                attended_at DATETIME,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                UNIQUE(user_id, order_id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                negocio_id INTEGER,
                order_id INTEGER,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (order_id) REFERENCES orders(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                negocio_id INTEGER,
                product_name TEXT NOT NULL,
                producto_id INTEGER,
                receta_id INTEGER,
                order_id INTEGER,
                quantity REAL NOT NULL,
                unit_price REAL NOT NULL,
                total REAL NOT NULL,
                payment_method TEXT NOT NULL,
                buyer TEXT,
                is_debt INTEGER DEFAULT 0,
                paid INTEGER DEFAULT 1,
                unit_id INTEGER,
                sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                session TEXT,
                is_liberated INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                voided INTEGER DEFAULT 0,
                void_reason TEXT,
                voided_at DATETIME,
                from_waiting_list INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (producto_id) REFERENCES productos(id),
                FOREIGN KEY (receta_id) REFERENCES recipes(id),
                FOREIGN KEY (unit_id) REFERENCES units(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                negocio_id INTEGER,
                type TEXT NOT NULL,
                category TEXT,
                concept TEXT NOT NULL,
                amount REAL NOT NULL,
                payment_method TEXT NOT NULL,
                sale_id INTEGER,
                transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                voided INTEGER DEFAULT 0,
                void_reason TEXT,
                voided_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (sale_id) REFERENCES sales(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                negocio_id INTEGER,
                product_name TEXT NOT NULL,
                quantity REAL NOT NULL DEFAULT 0,
                unit TEXT NOT NULL,
                unit_id INTEGER,
                cost REAL NOT NULL DEFAULT 0,
                min_stock REAL DEFAULT 0,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (unit_id) REFERENCES units(id),
                UNIQUE(user_id, product_name)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS inventory_movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                inventory_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                quantity REAL NOT NULL,
                unit TEXT NOT NULL,
                cost REAL DEFAULT 0,
                concept TEXT,
                transaction_id INTEGER,
                sale_id INTEGER,
                movement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
                FOREIGN KEY (transaction_id) REFERENCES transactions(id),
                FOREIGN KEY (sale_id) REFERENCES sales(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS bank_accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                negocio_id INTEGER,
                bank TEXT NOT NULL,
                owner_name TEXT,
                account_number TEXT NOT NULL,
                phone TEXT,
                qr_code TEXT,
                is_default INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS corriente_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                negocio_id INTEGER,
                horas_corriente REAL DEFAULT 3,
                horas_apagon REAL DEFAULT 12,
                fecha_referencia TEXT,
                hora_inicio_referencia TEXT,
                hora_fin_referencia TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS premios_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                negocio_id INTEGER NOT NULL UNIQUE,
                activo INTEGER DEFAULT 1,
                premio_mensual TEXT,
                premio_anual TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (negocio_id) REFERENCES negocios(id)
            )
        `);

        console.log('✅ Todas las tablas creadas/verificadas');
    } catch (error) {
        console.error('❌ Error creando tablas:', error);
        throw error;
    }
}

// ============================================================
// OTRAS VERIFICACIONES
// ============================================================

async function ensureIsLiberatedColumn(db) {
    try {
        const salesColumns = db.exec('PRAGMA table_info(sales)');
        const columnNames = salesColumns[0]?.values?.map(row => row[1]) || [];
        
        if (!columnNames.includes('is_liberated')) {
            db.run('ALTER TABLE sales ADD COLUMN is_liberated INTEGER DEFAULT 0');
        }
    } catch (error) {}
}

async function ensureCorrienteConfigTable(db) {
    try {
        const tableCheck = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='corriente_config'`);
        if (tableCheck.length === 0 || tableCheck[0].values.length === 0) {
            db.run(`
                CREATE TABLE IF NOT EXISTS corriente_config (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL UNIQUE,
                    negocio_id INTEGER,
                    horas_corriente REAL DEFAULT 3,
                    horas_apagon REAL DEFAULT 12,
                    fecha_referencia TEXT,
                    hora_inicio_referencia TEXT,
                    hora_fin_referencia TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    deleted_at DATETIME DEFAULT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `);
        }
    } catch (error) {}
}

async function ensureOrderIdColumn(db) {
    try {
        const salesColumns = db.exec('PRAGMA table_info(sales)');
        const salesColumnNames = salesColumns[0]?.values?.map(row => row[1]) || [];
        
        if (!salesColumnNames.includes('order_id')) {
            db.run('ALTER TABLE sales ADD COLUMN order_id INTEGER');
        }
        if (!salesColumnNames.includes('from_waiting_list')) {
            db.run('ALTER TABLE sales ADD COLUMN from_waiting_list INTEGER DEFAULT 0');
        }
        if (!salesColumnNames.includes('session')) {
            db.run('ALTER TABLE sales ADD COLUMN session TEXT');
        }
        
        const ordersColumns = db.exec('PRAGMA table_info(orders)');
        const ordersColumnNames = ordersColumns[0]?.values?.map(row => row[1]) || [];
        
        if (!ordersColumnNames.includes('session')) {
            db.run('ALTER TABLE orders ADD COLUMN session TEXT');
        }
    } catch (error) {}
}

async function ensureWaitingListColumns(db) {
    try {
        const tableCheck = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='waiting_list'`);
        if (tableCheck.length === 0 || tableCheck[0].values.length === 0) return;

        const columns = db.exec('PRAGMA table_info(waiting_list)');
        const columnNames = columns[0]?.values?.map(row => row[1]) || [];
        
        const requiredColumns = [
            { name: 'notified_at', type: 'DATETIME' },
            { name: 'attended_at', type: 'DATETIME' },
            { name: 'client_phone', type: 'TEXT' },
            { name: 'product_name', type: 'TEXT' },
            { name: 'quantity', type: 'REAL DEFAULT 1' },
            { name: 'notes', type: 'TEXT' }
        ];
        
        for (const col of requiredColumns) {
            if (!columnNames.includes(col.name)) {
                db.run(`ALTER TABLE waiting_list ADD COLUMN ${col.name} ${col.type}`);
            }
        }
    } catch (error) {}
}

async function migrateToNewStructure(db) {
    try {
        console.log('✅ Migración verificada');
    } catch (error) {}
}

async function ensureSoftDeleteColumns(db) {
    try {
        const tables = [
            'users', 'units', 'recipes', 'recipe_ingredients', 
            'clients', 'products', 'orders', 'order_items', 
            'payments', 'notifications', 'sales', 'transactions',
            'inventory', 'inventory_movements', 'insumos', 'receta_insumos',
            'waiting_list', 'bank_accounts', 'corriente_config', 'negocios',
            'premios_config'
        ];
        
        for (const table of tables) {
            try {
                const tableCheck = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
                if (tableCheck.length === 0 || tableCheck[0].values.length === 0) continue;
                
                const columns = db.exec(`PRAGMA table_info(${table})`);
                const columnNames = columns[0]?.values?.map(row => row[1]) || [];
                
                if (!columnNames.includes('deleted_at')) {
                    db.run(`ALTER TABLE ${table} ADD COLUMN deleted_at DATETIME DEFAULT NULL`);
                }
            } catch (e) {}
        }
    } catch (error) {}
}

async function ensureVoidColumns(db) {
    try {
        const salesColumns = db.exec('PRAGMA table_info(sales)');
        const salesColumnNames = salesColumns[0]?.values?.map(row => row[1]) || [];
        
        if (!salesColumnNames.includes('voided')) {
            db.run('ALTER TABLE sales ADD COLUMN voided INTEGER DEFAULT 0');
        }
        if (!salesColumnNames.includes('void_reason')) {
            db.run('ALTER TABLE sales ADD COLUMN void_reason TEXT');
        }
        if (!salesColumnNames.includes('voided_at')) {
            db.run('ALTER TABLE sales ADD COLUMN voided_at DATETIME');
        }
        
        const transColumns = db.exec('PRAGMA table_info(transactions)');
        const transColumnNames = transColumns[0]?.values?.map(row => row[1]) || [];
        
        if (!transColumnNames.includes('voided')) {
            db.run('ALTER TABLE transactions ADD COLUMN voided INTEGER DEFAULT 0');
        }
        if (!transColumnNames.includes('void_reason')) {
            db.run('ALTER TABLE transactions ADD COLUMN void_reason TEXT');
        }
        if (!transColumnNames.includes('voided_at')) {
            db.run('ALTER TABLE transactions ADD COLUMN voided_at DATETIME');
        }
    } catch (error) {}
}

async function ensureUserTableColumns(db) {
    try {
        const columns = db.exec('PRAGMA table_info(users)');
        const columnNames = columns[0]?.values?.map(row => row[1]) || [];
        
        const requiredColumns = [
            { name: 'theme', type: 'TEXT DEFAULT "light"' },
            { name: 'photo', type: 'TEXT' }
        ];
        
        for (const col of requiredColumns) {
            if (!columnNames.includes(col.name)) {
                db.run(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
            }
        }
    } catch (error) {}
}

async function seedDefaultUnits(db) {
    try {
        const count = db.exec('SELECT COUNT(*) as count FROM units WHERE deleted_at IS NULL');
        const existing = count[0]?.values?.[0]?.[0] || 0;
        
        if (existing === 0) {
            const defaultUnits = [
                { name: 'Kilogramo', abbreviation: 'kg', category: 'weight' },
                { name: 'Gramo', abbreviation: 'g', category: 'weight' },
                { name: 'Litro', abbreviation: 'L', category: 'volume' },
                { name: 'Mililitro', abbreviation: 'mL', category: 'volume' },
                { name: 'Unidad', abbreviation: 'unid', category: 'count' },
                { name: 'Docena', abbreviation: 'doc', category: 'count' },
                { name: 'Cucharada', abbreviation: 'cda', category: 'volume' },
                { name: 'Cucharadita', abbreviation: 'cdta', category: 'volume' },
                { name: 'Taza', abbreviation: 'tza', category: 'volume' },
                { name: 'Pieza', abbreviation: 'pz', category: 'count' },
                { name: 'Paquete', abbreviation: 'pqt', category: 'count' },
                { name: 'Botella', abbreviation: 'bot', category: 'count' }
            ];
            
            for (const unit of defaultUnits) {
                db.run(
                    'INSERT INTO units (name, abbreviation, category) VALUES (?, ?, ?)',
                    [unit.name, unit.abbreviation, unit.category]
                );
            }
        }
    } catch (error) {}
}

// ============================================================
// PERSISTENCIA
// ============================================================

function saveDatabase() {
    try {
        if (db) {
            const data = db.export();
            const array = Array.from(data);
            localStorage.setItem('panario_db_data', JSON.stringify(array));
        }
    } catch (e) {
        console.error('Error guardando base de datos:', e);
    }
}

setInterval(saveDatabase, 30000);
window.addEventListener('beforeunload', saveDatabase);

function getDB() { 
    if (!db || !dbInitialized) {
        throw new Error('Base de datos no inicializada.');
    }
    return db; 
}

function saveAndNotify() {
    saveDatabase();
    document.dispatchEvent(new CustomEvent('db-saved'));
}

// ============================================================
// CONSULTAS Y EJECUCIÓN
// ============================================================

function query(sql, params = []) {
    const db = getDB();
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

function execute(sql, params = []) {
    const db = getDB();
    db.run(sql, params);
    
    let lastId = null;
    try {
        const result = db.exec('SELECT last_insert_rowid() as id');
        if (result && result.length > 0 && result[0].values && result[0].values.length > 0) {
            lastId = result[0].values[0][0];
        }
    } catch (e) {}
    
    saveAndNotify();
    return { success: true, lastId: lastId };
}

// ============================================================
// BACKUP META - MARCA DE TIPO DE BACKUP
// ============================================================

function writeBackupMeta(db, backupType) {
    try {
        db.run(`
            CREATE TABLE IF NOT EXISTS ${BACKUP_META_TABLE} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                backup_type TEXT NOT NULL,
                backup_date TEXT NOT NULL,
                backup_version TEXT,
                backup_negocio_id INTEGER,
                backup_negocio_nombre TEXT,
                backup_user TEXT,
                backup_user_role TEXT
            )
        `);
        
        db.run(`DELETE FROM ${BACKUP_META_TABLE}`);
        
        const user = window.AuthModule?.getCurrentUser();
        const negocioId = getNegocioIdActual();
        const negocio = getNegocio(negocioId);
        
        db.run(`
            INSERT INTO ${BACKUP_META_TABLE} 
            (backup_type, backup_date, backup_version, backup_negocio_id, backup_negocio_nombre, backup_user, backup_user_role)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            backupType,
            new Date().toISOString(),
            '2.0.3',
            negocioId,
            negocio?.nombre || 'Desconocido',
            user?.username || 'Desconocido',
            user?.is_admin === 1 ? 'admin' : 'user'
        ]);
        
        return true;
    } catch (e) {
        console.error('❌ Error escribiendo marca de backup:', e);
        return false;
    }
}

function readBackupMeta(backupDb) {
    try {
        const tableCheck = backupDb.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${BACKUP_META_TABLE}'`);
        
        if (tableCheck.length === 0 || tableCheck[0].values.length === 0) {
            return { exists: false, type: 'unknown' };
        }
        
        const result = backupDb.exec(`SELECT * FROM ${BACKUP_META_TABLE} LIMIT 1`);
        if (result.length === 0 || !result[0].values || result[0].values.length === 0) {
            return { exists: false, type: 'unknown' };
        }
        
        const columns = result[0].columns;
        const values = result[0].values[0];
        
        const meta = {};
        columns.forEach((col, i) => {
            meta[col] = values[i];
        });
        
        return {
            exists: true,
            type: meta.backup_type || 'unknown',
            date: meta.backup_date || null,
            version: meta.backup_version || null,
            negocioId: meta.backup_negocio_id || null,
            negocioNombre: meta.backup_negocio_nombre || null,
            user: meta.backup_user || null,
            userRole: meta.backup_user_role || null
        };
    } catch (e) {
        return { exists: false, type: 'unknown' };
    }
}

// ============================================================
// BANK ACCOUNTS - CON AUDITORÍA
// ============================================================

function getBankAccounts() {
    const negocioId = getNegocioIdActual();
    return query(
        'SELECT * FROM bank_accounts WHERE negocio_id = ? AND deleted_at IS NULL ORDER BY is_default DESC, created_at DESC',
        [negocioId]
    );
}

function getBankAccount(id) {
    const negocioId = getNegocioIdActual();
    const results = query(
        'SELECT * FROM bank_accounts WHERE id = ? AND negocio_id = ? AND deleted_at IS NULL',
        [id, negocioId]
    );
    return results.length > 0 ? results[0] : null;
}

function getDefaultBankAccount() {
    const negocioId = getNegocioIdActual();
    const results = query(
        `SELECT * FROM bank_accounts 
         WHERE negocio_id = ? AND deleted_at IS NULL 
         ORDER BY is_default DESC, created_at DESC 
         LIMIT 1`,
        [negocioId]
    );
    return results.length > 0 ? results[0] : null;
}

function saveBankAccount(accountData) {
    const user = window.AuthModule?.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    const negocioId = getNegocioIdActual();
    const currentUserId = getCurrentUserId();

    try {
        const existing = getBankAccounts();
        const isFirst = existing.length === 0;
        
        if (accountData.id) {
            execute(`
                UPDATE bank_accounts 
                SET bank = ?, owner_name = ?, account_number = ?, phone = ?, qr_code = ?,
                    is_default = ?, modified_by = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND negocio_id = ?
            `, [
                accountData.bank,
                accountData.owner_name || null,
                accountData.account_number,
                accountData.phone || null,
                accountData.qr_code || null,
                accountData.is_default ? 1 : 0,
                currentUserId,
                accountData.id,
                negocioId
            ]);
            
            if (accountData.is_default) {
                execute('UPDATE bank_accounts SET is_default = 0 WHERE id != ? AND negocio_id = ?', [accountData.id, negocioId]);
            }
            
            return { success: true, id: accountData.id };
        } else {
            const result = execute(`
                INSERT INTO bank_accounts (user_id, negocio_id, bank, owner_name, account_number, phone, qr_code, is_default, created_by, modified_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                user.id,
                negocioId,
                accountData.bank,
                accountData.owner_name || null,
                accountData.account_number,
                accountData.phone || null,
                accountData.qr_code || null,
                isFirst ? 1 : 0,
                currentUserId,
                currentUserId
            ]);
            
            return { success: true, id: result.lastId };
        }
    } catch (e) {
        console.error('❌ Error en saveBankAccount:', e);
        return { success: false, error: e.message };
    }
}

function deleteBankAccount(id) {
    const negocioId = getNegocioIdActual();
    try {
        execute('UPDATE bank_accounts SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND negocio_id = ?', [id, negocioId]);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function setDefaultBankAccount(id) {
    const negocioId = getNegocioIdActual();
    try {
        execute('UPDATE bank_accounts SET is_default = 0 WHERE negocio_id = ?', [negocioId]);
        execute('UPDATE bank_accounts SET is_default = 1 WHERE id = ? AND negocio_id = ?', [id, negocioId]);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================================
// SALVA DIFERENCIAL (RECETAS Y PRODUCTOS)
// 🆕 v4: El nombre del archivo incluye el negocio
// ============================================================

function exportRecetasProductosSalva() {
    const negocioId = getNegocioIdActual();

    try {
        const recipes = query(
            'SELECT * FROM recipes WHERE negocio_id = ? AND deleted_at IS NULL',
            [negocioId]
        );

        const recipeIds = recipes.map(r => r.id);
        let recipeIngredients = [];
        if (recipeIds.length > 0) {
            const placeholders = recipeIds.map(() => '?').join(',');
            recipeIngredients = query(
                `SELECT * FROM recipe_ingredients WHERE recipe_id IN (${placeholders}) AND deleted_at IS NULL`,
                recipeIds
            );
        }

        let recetaInsumos = [];
        if (recipeIds.length > 0) {
            const placeholders = recipeIds.map(() => '?').join(',');
            recetaInsumos = query(
                `SELECT * FROM receta_insumos WHERE receta_id IN (${placeholders}) AND deleted_at IS NULL`,
                recipeIds
            );
        }

        const productos = query(
            'SELECT * FROM productos WHERE negocio_id = ? AND deleted_at IS NULL',
            [negocioId]
        );

        const salva = {
            _meta: {
                app: 'Panario',
                version: '2.0.3',
                type: 'salva_recetas_productos',
                exportDate: new Date().toISOString(),
                negocio_id: negocioId,
                negocio_nombre: getNombreNegocioDB(),
                counts: {
                    recipes: recipes.length,
                    recipeIngredients: recipeIngredients.length,
                    recetaInsumos: recetaInsumos.length,
                    productos: productos.length
                }
            },
            recipes: recipes,
            recipe_ingredients: recipeIngredients,
            receta_insumos: recetaInsumos,
            productos: productos
        };

        const jsonStr = JSON.stringify(salva, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });

        const date = new Date().toISOString().split('T')[0];
        // 🆕 v4: Incluir slug del negocio en el nombre del archivo
        const prefijo = getPrefijoBackup();
        const filename = `${prefijo}_salva_recetas_productos_${date}.json`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const sizeKB = (blob.size / 1024).toFixed(1);

        return {
            success: true,
            filename: filename,
            size: blob.size,
            sizeKB: sizeKB,
            counts: salva._meta.counts
        };

    } catch (error) {
        console.error('❌ Error exportando salva:', error);
        return { success: false, error: error.message };
    }
}

function importRecetasProductosSalva(salvaData, mode = 'merge') {
    const user = window.AuthModule?.getCurrentUser();
    if (!user) {
        return { success: false, error: 'No hay usuario autenticado' };
    }
    const negocioId = getNegocioIdActual();
    const currentUserId = getCurrentUserId();

    try {
        if (!salvaData || !salvaData._meta || salvaData._meta.type !== 'salva_recetas_productos') {
            return { success: false, error: 'El archivo no es una salva válida de recetas y productos' };
        }

        const db = getDB();
        const imported = { recipes: 0, recipeIngredients: 0, recetaInsumos: 0, productos: 0 };
        const skipped = { recipes: 0, productos: 0 };
        const errors = [];

        if (mode === 'replace') {
            db.run('UPDATE productos SET deleted_at = CURRENT_TIMESTAMP WHERE negocio_id = ? AND deleted_at IS NULL', [negocioId]);
            db.run('UPDATE recipes SET deleted_at = CURRENT_TIMESTAMP WHERE negocio_id = ? AND deleted_at IS NULL', [negocioId]);
            db.run(`DELETE FROM receta_insumos WHERE receta_id IN (SELECT id FROM recipes WHERE negocio_id = ?)`, [negocioId]);
            db.run(`DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes WHERE negocio_id = ?)`, [negocioId]);
        }

        const recipeIdMap = {};

        for (const recipe of (salvaData.recipes || [])) {
            try {
                let existingRecipe = null;
                
                if (mode === 'merge') {
                    const existing = query(
                        'SELECT id FROM recipes WHERE negocio_id = ? AND name = ? AND deleted_at IS NULL',
                        [negocioId, recipe.name]
                    );
                    if (existing.length > 0) existingRecipe = existing[0];
                }

                let newRecipeId;

                if (existingRecipe) {
                    db.run(`
                        UPDATE recipes 
                        SET description = ?, instructions = ?, yield_units = ?, 
                            yield_unit_type = ?, shared = ?, modified_by = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ? AND negocio_id = ?
                    `, [
                        recipe.description || null, recipe.instructions || null,
                        recipe.yield_units || 1, recipe.yield_unit_type || 'unidades',
                        recipe.shared ? 1 : 0, currentUserId, existingRecipe.id, negocioId
                    ]);
                    newRecipeId = existingRecipe.id;
                    skipped.recipes++;
                } else {
                    db.run(`
                        INSERT INTO recipes (user_id, negocio_id, name, description, instructions, 
                            yield_units, yield_unit_type, shared, created_by, modified_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        user.id, negocioId, recipe.name,
                        recipe.description || null, recipe.instructions || null,
                        recipe.yield_units || 1, recipe.yield_unit_type || 'unidades',
                        recipe.shared ? 1 : 0, currentUserId, currentUserId
                    ]);
                    
                    const idResult = db.exec('SELECT last_insert_rowid() as id');
                    newRecipeId = idResult[0]?.values?.[0]?.[0];
                    imported.recipes++;
                }

                if (newRecipeId) recipeIdMap[recipe.id] = newRecipeId;

            } catch (e) {
                errors.push(`Receta "${recipe.name}": ${e.message}`);
            }
        }

        for (const ing of (salvaData.recipe_ingredients || [])) {
            try {
                const newRecipeId = recipeIdMap[ing.recipe_id];
                if (!newRecipeId) continue;

                if (mode === 'merge') {
                    const exists = query(
                        `SELECT id FROM recipe_ingredients 
                         WHERE recipe_id = ? AND ingredient_name = ? AND quantity = ? AND unit = ? AND deleted_at IS NULL`,
                        [newRecipeId, ing.ingredient_name, ing.quantity, ing.unit]
                    );
                    if (exists.length > 0) continue;
                }

                db.run(`
                    INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, price)
                    VALUES (?, ?, ?, ?, ?)
                `, [newRecipeId, ing.ingredient_name, ing.quantity, ing.unit || 'kg', ing.price || 0]);
                imported.recipeIngredients++;

            } catch (e) {
                errors.push(`Ingrediente "${ing.ingredient_name}": ${e.message}`);
            }
        }

        for (const ri of (salvaData.receta_insumos || [])) {
            try {
                const newRecipeId = recipeIdMap[ri.receta_id];
                if (!newRecipeId) continue;

                const insumoExists = query(
                    'SELECT id FROM insumos WHERE id = ? AND negocio_id = ? AND deleted_at IS NULL',
                    [ri.insumo_id, negocioId]
                );

                if (insumoExists.length === 0) continue;

                if (mode === 'merge') {
                    const exists = query(
                        `SELECT id FROM receta_insumos 
                         WHERE receta_id = ? AND insumo_id = ? AND cantidad = ? AND deleted_at IS NULL`,
                        [newRecipeId, ri.insumo_id, ri.cantidad]
                    );
                    if (exists.length > 0) continue;
                }

                db.run(`
                    INSERT INTO receta_insumos (receta_id, insumo_id, cantidad, unidad)
                    VALUES (?, ?, ?, ?)
                `, [newRecipeId, ri.insumo_id, ri.cantidad, ri.unidad || 'kg']);
                imported.recetaInsumos++;

            } catch (e) {
                errors.push(`Receta-insumo: ${e.message}`);
            }
        }

        for (const prod of (salvaData.productos || [])) {
            try {
                let existingProduct = null;
                
                if (mode === 'merge') {
                    const existing = query(
                        'SELECT id FROM productos WHERE negocio_id = ? AND nombre = ? AND deleted_at IS NULL',
                        [negocioId, prod.nombre]
                    );
                    if (existing.length > 0) existingProduct = existing[0];
                }

                let newRecetaId = null;
                if (prod.receta_id && recipeIdMap[prod.receta_id]) {
                    newRecetaId = recipeIdMap[prod.receta_id];
                }

                if (existingProduct) {
                    db.run(`
                        UPDATE productos 
                        SET descripcion = ?, precio_venta = ?, unidad_venta = ?,
                            cantidad_por_unidad = ?, receta_id = ?, modified_by = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ? AND negocio_id = ?
                    `, [
                        prod.descripcion || null, prod.precio_venta || 0,
                        prod.unidad_venta || 'unidad', prod.cantidad_por_unidad || 1,
                        newRecetaId, currentUserId, existingProduct.id, negocioId
                    ]);
                    skipped.productos++;
                } else {
                    db.run(`
                        INSERT INTO productos (user_id, negocio_id, nombre, descripcion, precio_venta, 
                            unidad_venta, cantidad_por_unidad, receta_id, created_by, modified_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        user.id, negocioId, prod.nombre,
                        prod.descripcion || null, prod.precio_venta || 0,
                        prod.unidad_venta || 'unidad', prod.cantidad_por_unidad || 1,
                        newRecetaId, currentUserId, currentUserId
                    ]);
                    imported.productos++;
                }

            } catch (e) {
                errors.push(`Producto "${prod.nombre}": ${e.message}`);
            }
        }

        saveDatabase();
        saveAndNotify();

        return { success: true, imported: imported, skipped: skipped, errors: errors, mode: mode };

    } catch (error) {
        console.error('❌ Error importando salva:', error);
        return { success: false, error: error.message };
    }
}

function readSalvaFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                const data = JSON.parse(content);
                resolve(data);
            } catch (err) {
                reject(new Error('El archivo no es un JSON válido'));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Error al leer el archivo'));
        };
        
        reader.readAsText(file);
    });
}

// ============================================================
// PRODUCTOS (POR NEGOCIO) - CON AUDITORÍA
// ============================================================

function getProductos() {
    const negocioId = getNegocioIdActual();
    return query(
        'SELECT p.*, r.name as receta_nombre FROM productos p LEFT JOIN recipes r ON p.receta_id = r.id WHERE p.negocio_id = ? AND p.deleted_at IS NULL ORDER BY p.nombre',
        [negocioId]
    );
}

function getProducto(id) {
    const negocioId = getNegocioIdActual();
    const results = query(
        'SELECT p.*, r.name as receta_nombre FROM productos p LEFT JOIN recipes r ON p.receta_id = r.id WHERE p.id = ? AND p.negocio_id = ? AND p.deleted_at IS NULL',
        [id, negocioId]
    );
    return results.length > 0 ? results[0] : null;
}

function saveProducto(productoData) {
    const user = window.AuthModule?.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    const negocioId = getNegocioIdActual();
    const currentUserId = getCurrentUserId();

    try {
        if (productoData.id) {
            execute(`
                UPDATE productos 
                SET nombre = ?, descripcion = ?, precio_venta = ?, 
                    unidad_venta = ?, cantidad_por_unidad = ?, receta_id = ?,
                    modified_by = ?
                WHERE id = ? AND negocio_id = ?
            `, [
                productoData.nombre, productoData.descripcion || null,
                productoData.precio_venta || 0, productoData.unidad_venta || 'unidad',
                productoData.cantidad_por_unidad || 1, productoData.receta_id || null,
                currentUserId,
                productoData.id, negocioId
            ]);
            return { success: true, id: productoData.id };
        } else {
            const result = execute(`
                INSERT INTO productos (user_id, negocio_id, nombre, descripcion, precio_venta, unidad_venta, cantidad_por_unidad, receta_id, created_by, modified_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                user.id, negocioId, productoData.nombre, productoData.descripcion || null,
                productoData.precio_venta || 0, productoData.unidad_venta || 'unidad',
                productoData.cantidad_por_unidad || 1, productoData.receta_id || null,
                currentUserId, currentUserId
            ]);
            return { success: true, id: result.lastId };
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function deleteProducto(id) {
    const negocioId = getNegocioIdActual();
    try {
        execute('UPDATE productos SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND negocio_id = ?', [id, negocioId]);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================================
// INSUMOS (POR NEGOCIO) - CON AUDITORÍA
// ============================================================

function getInsumos() {
    const negocioId = getNegocioIdActual();
    return query('SELECT * FROM insumos WHERE negocio_id = ? AND deleted_at IS NULL ORDER BY nombre', [negocioId]);
}

function getInsumo(id) {
    const negocioId = getNegocioIdActual();
    const results = query('SELECT * FROM insumos WHERE id = ? AND negocio_id = ? AND deleted_at IS NULL', [id, negocioId]);
    return results.length > 0 ? results[0] : null;
}

function getInsumoByName(nombre) {
    const negocioId = getNegocioIdActual();
    const results = query(
        'SELECT * FROM insumos WHERE negocio_id = ? AND LOWER(nombre) = LOWER(?) AND deleted_at IS NULL LIMIT 1',
        [negocioId, nombre]
    );
    return results.length > 0 ? results[0] : null;
}

function saveInsumo(insumoData) {
    const user = window.AuthModule?.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    const negocioId = getNegocioIdActual();
    const currentUserId = getCurrentUserId();

    try {
        if (insumoData.id) {
            execute(`
                UPDATE insumos 
                SET nombre = ?, unidad = ?, costo_unitario = ?, stock = ?, stock_minimo = ?,
                    modified_by = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND negocio_id = ?
            `, [
                insumoData.nombre, insumoData.unidad || 'kg',
                insumoData.costo_unitario || 0, insumoData.stock || 0,
                insumoData.stock_minimo || 0, currentUserId,
                insumoData.id, negocioId
            ]);
            return { success: true, id: insumoData.id };
        } else {
            const result = execute(`
                INSERT INTO insumos (user_id, negocio_id, nombre, unidad, costo_unitario, stock, stock_minimo, created_by, modified_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                user.id, negocioId, insumoData.nombre, insumoData.unidad || 'kg',
                insumoData.costo_unitario || 0, insumoData.stock || 0,
                insumoData.stock_minimo || 0, currentUserId, currentUserId
            ]);
            return { success: true, id: result.lastId };
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function deleteInsumo(id) {
    const negocioId = getNegocioIdActual();
    try {
        execute('UPDATE insumos SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND negocio_id = ?', [id, negocioId]);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function actualizarStockInsumo(id, cantidad) {
    const negocioId = getNegocioIdActual();
    const currentUserId = getCurrentUserId();

    try {
        const insumo = getInsumo(id);
        if (!insumo) return { success: false, error: 'Insumo no encontrado' };
        
        const nuevoStock = (insumo.stock || 0) + cantidad;
        if (nuevoStock < 0) return { success: false, error: 'Stock insuficiente' };
        
        execute(`
            UPDATE insumos SET stock = ?, modified_by = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND negocio_id = ?
        `, [nuevoStock, currentUserId, id, negocioId]);
        
        return { success: true, stock: nuevoStock };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================================
// RECETA_INSUMOS
// ============================================================

function getRecetaInsumos(recetaId) {
    const negocioId = getNegocioIdActual();
    return query(`
        SELECT ri.*, i.nombre as insumo_nombre, i.unidad as insumo_unidad, i.costo_unitario
        FROM receta_insumos ri
        JOIN insumos i ON ri.insumo_id = i.id
        JOIN recipes r ON ri.receta_id = r.id
        WHERE ri.receta_id = ? AND ri.deleted_at IS NULL AND r.negocio_id = ?
    `, [recetaId, negocioId]);
}

function saveRecetaInsumo(data) {
    const user = window.AuthModule?.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    try {
        if (data.id) {
            execute(`
                UPDATE receta_insumos SET cantidad = ?, unidad = ?
                WHERE id = ? AND receta_id = ?
            `, [data.cantidad, data.unidad || 'kg', data.id, data.receta_id]);
            return { success: true, id: data.id };
        } else {
            const result = execute(`
                INSERT INTO receta_insumos (receta_id, insumo_id, cantidad, unidad)
                VALUES (?, ?, ?, ?)
            `, [data.receta_id, data.insumo_id, data.cantidad, data.unidad || 'kg']);
            return { success: true, id: result.lastId };
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function deleteRecetaInsumo(id) {
    try {
        execute('DELETE FROM receta_insumos WHERE id = ?', [id]);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================================
// CALCULAR COSTO DE PRODUCTO
// ============================================================

function calcularCostoProducto(productoId) {
    const negocioId = getNegocioIdActual();

    try {
        const producto = getProducto(productoId);
        if (!producto) return { success: false, error: 'Producto no encontrado' };
        
        if (!producto.receta_id) {
            return { success: true, costo_total: 0, costo_por_unidad: 0, costo_por_producto: 0 };
        }
        
        const recetaInsumos = getRecetaInsumos(producto.receta_id);
        if (recetaInsumos.length === 0) {
            return { success: true, costo_total: 0, costo_por_unidad: 0, costo_por_producto: 0 };
        }
        
        let costoTotal = 0;
        for (const ri of recetaInsumos) {
            costoTotal += ri.cantidad * (ri.costo_unitario || 0);
        }
        
        const recipe = getDB().exec(`SELECT yield_units FROM recipes WHERE id = ${producto.receta_id}`);
        const rendimiento = recipe[0]?.values?.[0]?.[0] || 1;
        
        const costoPorUnidad = costoTotal / rendimiento;
        const costoPorProducto = costoPorUnidad * (producto.cantidad_por_unidad || 1);
        
        return {
            success: true, costo_total: costoTotal, costo_por_unidad: costoPorUnidad,
            costo_por_producto: costoPorProducto, rendimiento: rendimiento,
            insumos: recetaInsumos
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================================
// INVENTARIO
// ============================================================

function getInventory() {
    const negocioId = getNegocioIdActual();
    return query('SELECT * FROM inventory WHERE negocio_id = ? AND deleted_at IS NULL ORDER BY product_name', [negocioId]);
}

function getInventoryItem(id) {
    const negocioId = getNegocioIdActual();
    const results = query('SELECT * FROM inventory WHERE id = ? AND negocio_id = ? AND deleted_at IS NULL', [id, negocioId]);
    return results.length > 0 ? results[0] : null;
}

function getInventoryItemByName(productName) {
    const negocioId = getNegocioIdActual();
    const results = query(
        'SELECT * FROM inventory WHERE negocio_id = ? AND product_name = ? AND deleted_at IS NULL',
        [negocioId, productName]
    );
    return results.length > 0 ? results[0] : null;
}

function saveInventoryItem(itemData) {
    const user = window.AuthModule?.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    const negocioId = getNegocioIdActual();

    try {
        if (itemData.id) {
            execute(`
                UPDATE inventory 
                SET product_name = ?, quantity = ?, unit = ?, unit_id = ?,
                    cost = ?, min_stock = ?, last_updated = CURRENT_TIMESTAMP
                WHERE id = ? AND negocio_id = ?
            `, [
                itemData.product_name, itemData.quantity || 0, itemData.unit || 'kg',
                itemData.unit_id || null, itemData.cost || 0, itemData.min_stock || 0,
                itemData.id, negocioId
            ]);
            return { success: true, id: itemData.id };
        } else {
            const existing = getInventoryItemByName(itemData.product_name);
            if (existing) {
                const newQuantity = (existing.quantity || 0) + (itemData.quantity || 0);
                execute(`
                    UPDATE inventory SET quantity = ?, cost = ?, last_updated = CURRENT_TIMESTAMP
                    WHERE id = ? AND negocio_id = ?
                `, [newQuantity, itemData.cost || existing.cost || 0, existing.id, negocioId]);
                return { success: true, id: existing.id, updated: true };
            } else {
                const result = execute(`
                    INSERT INTO inventory (user_id, negocio_id, product_name, quantity, unit, unit_id, cost, min_stock)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    user.id, negocioId, itemData.product_name, itemData.quantity || 0,
                    itemData.unit || 'kg', itemData.unit_id || null,
                    itemData.cost || 0, itemData.min_stock || 0
                ]);
                return { success: true, id: result.lastId };
            }
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function deleteInventoryItem(id) {
    const negocioId = getNegocioIdActual();
    try {
        execute('UPDATE inventory SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND negocio_id = ?', [id, negocioId]);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================================
// UNIDADES
// ============================================================

function getUnits() {
    return query('SELECT * FROM units WHERE deleted_at IS NULL ORDER BY name');
}

function getUnitsByCategory(category) {
    return query('SELECT * FROM units WHERE category = ? AND deleted_at IS NULL ORDER BY name', [category]);
}

function getUnit(id) {
    const results = query('SELECT * FROM units WHERE id = ? AND deleted_at IS NULL', [id]);
    return results.length > 0 ? results[0] : null;
}

function addUnit(name, abbreviation, category = 'other') {
    try {
        execute('INSERT INTO units (name, abbreviation, category) VALUES (?, ?, ?)',
            [name.trim(), abbreviation.trim(), category]);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================================
// CORRIENTE CONFIG - CON AUDITORÍA
// ============================================================

function getCorrienteConfig() {
    const negocioId = getNegocioIdActual();
    const results = query(
        'SELECT * FROM corriente_config WHERE negocio_id = ? AND deleted_at IS NULL LIMIT 1',
        [negocioId]
    );
    return results.length > 0 ? results[0] : null;
}

function saveCorrienteConfig(config) {
    const user = window.AuthModule?.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    const negocioId = getNegocioIdActual();
    const currentUserId = getCurrentUserId();

    try {
        const existing = getCorrienteConfig();
        
        if (existing) {
            execute(`
                UPDATE corriente_config 
                SET horas_corriente = ?, horas_apagon = ?, 
                    fecha_referencia = ?, hora_inicio_referencia = ?, 
                    hora_fin_referencia = ?, modified_by = ?, updated_at = CURRENT_TIMESTAMP
                WHERE negocio_id = ?
            `, [
                config.horasCorriente || 3, config.horasApagon || 12,
                config.fechaReferencia || null, config.horaInicioReferencia || null,
                config.horaFinReferencia || null, currentUserId, negocioId
            ]);
        } else {
            execute(`
                INSERT INTO corriente_config 
                (user_id, negocio_id, horas_corriente, horas_apagon, fecha_referencia, 
                 hora_inicio_referencia, hora_fin_referencia, created_by, modified_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                user.id, negocioId, config.horasCorriente || 3, config.horasApagon || 12,
                config.fechaReferencia || null, config.horaInicioReferencia || null,
                config.horaFinReferencia || null, currentUserId, currentUserId
            ]);
        }
        
        saveAndNotify();
        return { success: true };
    } catch (e) {
        console.error('Error guardando config de corriente:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// WAITING LIST
// ============================================================

function getWaitingList() {
    const negocioId = getNegocioIdActual();
    return query(`
        SELECT w.*, o.total as order_total, o.delivery_date, o.client_name as order_client_name
        FROM waiting_list w
        JOIN orders o ON w.order_id = o.id
        WHERE w.negocio_id = ? AND w.deleted_at IS NULL AND w.status = 'waiting'
        ORDER BY w.position ASC
    `, [negocioId]);
}

function getWaitingListCount() {
    const negocioId = getNegocioIdActual();
    const result = query(`
        SELECT COUNT(*) as count 
        FROM waiting_list 
        WHERE negocio_id = ? AND deleted_at IS NULL AND status = 'waiting'
    `, [negocioId]);
    return result[0]?.count || 0;
}

function getNextWaitingPosition() {
    const negocioId = getNegocioIdActual();
    const result = query(`
        SELECT MAX(position) as max_pos 
        FROM waiting_list 
        WHERE negocio_id = ? AND deleted_at IS NULL AND status = 'waiting'
    `, [negocioId]);
    return (result[0]?.max_pos || 0) + 1;
}

function addToWaitingList(orderId) {
    const user = window.AuthModule?.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    const negocioId = getNegocioIdActual();
    const currentUserId = getCurrentUserId();

    try {
        const existing = query(`
            SELECT id FROM waiting_list WHERE order_id = ? AND negocio_id = ? AND deleted_at IS NULL
        `, [orderId, negocioId]);
        
        if (existing.length > 0) {
            return { success: false, error: 'El pedido ya está en la lista de espera' };
        }

        const position = getNextWaitingPosition();

        const result = execute(`
            INSERT INTO waiting_list (user_id, negocio_id, order_id, position, status, client_name, client_phone, product_name, quantity, created_by, modified_by)
            SELECT ?, ?, o.id, ?, 'waiting', o.client_name, o.client_phone,
                COALESCE((SELECT GROUP_CONCAT(DISTINCT p.nombre) FROM order_items oi JOIN productos p ON oi.producto_id = p.id WHERE oi.order_id = o.id AND oi.deleted_at IS NULL), 'Producto'),
                COALESCE((SELECT SUM(quantity) FROM order_items WHERE order_id = o.id AND deleted_at IS NULL), 1),
                ?, ?
            FROM orders o WHERE o.id = ? AND o.negocio_id = ?
        `, [user.id, negocioId, position, currentUserId, currentUserId, orderId, negocioId]);

        execute('UPDATE orders SET status = ? WHERE id = ? AND negocio_id = ?', ['waiting', orderId, negocioId]);

        return { success: true, id: result.lastId, position: position };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function removeFromWaitingList(orderId) {
    const negocioId = getNegocioIdActual();
    try {
        execute('UPDATE waiting_list SET deleted_at = CURRENT_TIMESTAMP WHERE order_id = ? AND negocio_id = ? AND deleted_at IS NULL', [orderId, negocioId]);
        reindexWaitingList();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function reindexWaitingList() {
    const negocioId = getNegocioIdActual();

    try {
        const items = query(`
            SELECT id FROM waiting_list 
            WHERE negocio_id = ? AND deleted_at IS NULL AND status = 'waiting'
            ORDER BY position ASC
        `, [negocioId]);

        let pos = 1;
        for (const item of items) {
            execute('UPDATE waiting_list SET position = ? WHERE id = ?', [pos, item.id]);
            pos++;
        }
    } catch (e) {
        console.error('Error reindexando:', e);
    }
}

function attendFromWaitingList(orderId) {
    const user = window.AuthModule?.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    const negocioId = getNegocioIdActual();

    try {
        const waitingItem = query(`
            SELECT * FROM waiting_list 
            WHERE order_id = ? AND negocio_id = ? AND deleted_at IS NULL AND status = 'waiting'
        `, [orderId, negocioId]);

        if (waitingItem.length === 0) {
            return { success: false, error: 'El pedido no está en la lista de espera' };
        }

        execute(`
            UPDATE waiting_list 
            SET status = 'attended', attended_at = CURRENT_TIMESTAMP, deleted_at = CURRENT_TIMESTAMP
            WHERE order_id = ? AND negocio_id = ?
        `, [orderId, negocioId]);

        execute('UPDATE orders SET status = ? WHERE id = ? AND negocio_id = ?', ['waiting_bought', orderId, negocioId]);

        reindexWaitingList();

        if (window.OrdersModule && window.OrdersModule.registrarVentaDesdePedido) {
            window.OrdersModule.registrarVentaDesdePedido(orderId);
        }

        return { success: true, message: 'Cliente atendido desde lista de espera' };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function getWaitingListWithDetails(excludeOrderId = null) {
    const negocioId = getNegocioIdActual();

    let sql = `
        SELECT 
            w.id as waiting_id, w.order_id, w.position, w.client_name,
            w.client_phone, w.product_name, w.quantity, w.notes,
            o.total as order_total, o.delivery_date
        FROM waiting_list w
        JOIN orders o ON w.order_id = o.id
        WHERE w.negocio_id = ? AND w.deleted_at IS NULL AND w.status = 'waiting' AND o.deleted_at IS NULL
    `;
    let params = [negocioId];

    if (excludeOrderId) { sql += ' AND w.order_id != ?'; params.push(excludeOrderId); }

    sql += ' ORDER BY w.position ASC';

    try {
        return query(sql, params);
    } catch (e) {
        return [];
    }
}

function atenderParcialmenteDeLista(orderId, cantidadAtendida, cantidadTotalOriginal) {
    const negocioId = getNegocioIdActual();

    try {
        const cantidadRestante = cantidadTotalOriginal - cantidadAtendida;
        
        if (cantidadRestante <= 0) {
            return attendFromWaitingList(orderId);
        }
        
        execute(`
            UPDATE waiting_list SET quantity = ?, updated_at = CURRENT_TIMESTAMP
            WHERE order_id = ? AND negocio_id = ? AND deleted_at IS NULL
        `, [cantidadRestante, orderId, negocioId]);

        const orderItems = query(`
            SELECT id, quantity, unit_price FROM order_items 
            WHERE order_id = ? AND deleted_at IS NULL
        `, [orderId]);

        if (orderItems.length > 0) {
            const item = orderItems[0];
            const nuevaCantidad = item.quantity - cantidadAtendida;
            
            if (nuevaCantidad <= 0) {
                execute('UPDATE order_items SET deleted_at = CURRENT_TIMESTAMP WHERE order_id = ?', [orderId]);
            } else {
                execute(`
                    UPDATE order_items SET quantity = ?, subtotal = ? * unit_price WHERE id = ?
                `, [nuevaCantidad, nuevaCantidad, item.id]);
            }
        }

        const nuevoTotal = query(`
            SELECT SUM(subtotal) as total FROM order_items 
            WHERE order_id = ? AND deleted_at IS NULL
        `, [orderId]);
        
        execute(`
            UPDATE orders SET total = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND negocio_id = ?
        `, [nuevoTotal[0]?.total || 0, orderId, negocioId]);

        reindexWaitingList();

        return { success: true, message: `Atendido parcialmente (${cantidadAtendida} unidades)`, cantidadRestante: cantidadRestante };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================================
// VENTAS - RESUMEN DIARIO
// ============================================================

function getDailySummary(negocioId, filters = {}) {
    let sql = `
        SELECT 
            DATE(sale_date) as dia,
            COUNT(*) as total_ventas,
            SUM(total) as monto_total,
            SUM(CASE WHEN is_debt = 1 AND paid = 0 THEN 1 ELSE 0 END) as deudas_count,
            SUM(CASE WHEN is_liberated = 1 THEN 1 ELSE 0 END) as liberadas_count,
            SUM(CASE WHEN is_liberated = 1 THEN total ELSE 0 END) as liberadas_monto
        FROM sales
        WHERE negocio_id = ? 
          AND deleted_at IS NULL 
          AND voided = 0
    `;
    let params = [negocioId];
    
    if (filters.from_date) {
        sql += ' AND DATE(sale_date) >= DATE(?)';
        params.push(filters.from_date);
    }
    if (filters.to_date) {
        sql += ' AND DATE(sale_date) <= DATE(?)';
        params.push(filters.to_date);
    }
    
    sql += ' GROUP BY DATE(sale_date) ORDER BY dia DESC';
    
    return query(sql, params);
}

// ============================================================
// FASE 12 - PREMIOS (CONFIGURACIÓN Y CÁLCULOS) - CON AUDITORÍA
// ============================================================

function getPremiosConfig() {
    const negocioId = getNegocioIdActual();
    try {
        const results = query(
            'SELECT * FROM premios_config WHERE negocio_id = ? AND deleted_at IS NULL LIMIT 1',
            [negocioId]
        );
        if (results.length === 0) {
            return {
                activo: false,
                premio_mensual: '',
                premio_anual: ''
            };
        }
        return {
            ...results[0],
            activo: results[0].activo === 1
        };
    } catch (e) {
        console.warn('Error obteniendo config de premios:', e);
        return { activo: false, premio_mensual: '', premio_anual: '' };
    }
}

function savePremiosConfig(config) {
    const negocioId = getNegocioIdActual();
    const currentUserId = getCurrentUserId();
    try {
        const existing = query(
            'SELECT id FROM premios_config WHERE negocio_id = ? LIMIT 1',
            [negocioId]
        );
        
        if (existing.length > 0) {
            execute(`
                UPDATE premios_config 
                SET activo = ?, premio_mensual = ?, premio_anual = ?, modified_by = ?, updated_at = CURRENT_TIMESTAMP
                WHERE negocio_id = ?
            `, [
                config.activo ? 1 : 0,
                config.premio_mensual || '',
                config.premio_anual || '',
                currentUserId,
                negocioId
            ]);
        } else {
            execute(`
                INSERT INTO premios_config (negocio_id, activo, premio_mensual, premio_anual, created_by, modified_by)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                negocioId,
                config.activo ? 1 : 0,
                config.premio_mensual || '',
                config.premio_anual || '',
                currentUserId,
                currentUserId
            ]);
        }
        saveAndNotify();
        return { success: true };
    } catch (e) {
        console.error('Error guardando config de premios:', e);
        return { success: false, error: e.message };
    }
}

function calcularMejorClienteDelMes() {
    const negocioId = getNegocioIdActual();
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const inicioMes = `${year}-${month}-01`;
        const ultimoDia = new Date(year, now.getMonth() + 1, 0).getDate();
        const finMes = `${year}-${month}-${String(ultimoDia).padStart(2, '0')}`;
        
        const results = query(`
            SELECT 
                buyer,
                COUNT(*) as compras,
                SUM(total) as total_gastado
            FROM sales
            WHERE negocio_id = ?
              AND deleted_at IS NULL
              AND voided = 0
              AND buyer IS NOT NULL
              AND buyer != ''
              AND buyer != 'Cliente sin nombre'
              AND buyer != 'Cliente ocasional'
              AND DATE(sale_date) >= DATE(?)
              AND DATE(sale_date) <= DATE(?)
            GROUP BY buyer
            ORDER BY total_gastado DESC
            LIMIT 1
        `, [negocioId, inicioMes, finMes]);
        
        if (results.length === 0) return null;
        return {
            buyer: results[0].buyer,
            compras: results[0].compras,
            total_gastado: results[0].total_gastado,
            periodo: `${month}/${year}`
        };
    } catch (e) {
        console.warn('Error calculando mejor cliente del mes:', e);
        return null;
    }
}

function calcularMejorClienteDelAño() {
    const negocioId = getNegocioIdActual();
    try {
        const now = new Date();
        const year = now.getFullYear();
        const inicioAnio = `${year}-01-01`;
        const finAnio = `${year}-12-31`;
        
        const results = query(`
            SELECT 
                buyer,
                COUNT(*) as compras,
                SUM(total) as total_gastado
            FROM sales
            WHERE negocio_id = ?
              AND deleted_at IS NULL
              AND voided = 0
              AND buyer IS NOT NULL
              AND buyer != ''
              AND buyer != 'Cliente sin nombre'
              AND buyer != 'Cliente ocasional'
              AND DATE(sale_date) >= DATE(?)
              AND DATE(sale_date) <= DATE(?)
            GROUP BY buyer
            ORDER BY total_gastado DESC
            LIMIT 1
        `, [negocioId, inicioAnio, finAnio]);
        
        if (results.length === 0) return null;
        return {
            buyer: results[0].buyer,
            compras: results[0].compras,
            total_gastado: results[0].total_gastado,
            periodo: `${year}`
        };
    } catch (e) {
        console.warn('Error calculando mejor cliente del año:', e);
        return null;
    }
}

// ============================================================
// EXPORTAR E IMPORTAR BASE DE DATOS
// 🆕 v4: El nombre del archivo incluye el negocio
// ============================================================

function exportDatabase(backupType = BACKUP_TYPE_COMPLETE) {
    try {
        if (!sqlJsInstance) {
            console.error('❌ sqlJsInstance no está inicializado');
            return { success: false, error: 'SQL.js no está inicializado. Recarga la página e intenta de nuevo.' };
        }
        
        if (!db) {
            console.error('❌ db no está inicializado');
            return { success: false, error: 'Base de datos no inicializada. Recarga la página e intenta de nuevo.' };
        }
        
        const dbData = db.export();
        const cloneDb = new sqlJsInstance.Database(dbData);
        
        writeBackupMeta(cloneDb, backupType);
        
        const finalData = cloneDb.export();
        cloneDb.close();
        
        const array = Array.from(finalData);
        return { 
            success: true, 
            data: array, 
            size: array.length, 
            timestamp: new Date().toISOString(),
            backupType: backupType
        };
    } catch (error) {
        console.error('❌ Error exportando BD:', error);
        return { success: false, error: error.message || 'Error desconocido al exportar' };
    }
}

function downloadDatabase(backupType = BACKUP_TYPE_COMPLETE) {
    try {
        const user = window.AuthModule?.getCurrentUser();
        
        if (backupType === BACKUP_TYPE_COMPLETE && user && user.is_admin !== 1) {
            if (window.showToast) {
                window.showToast('⚠️ Solo el administrador puede crear una copia de seguridad completa', 'warning', 5000);
            }
            return { success: false, error: 'Solo el administrador puede crear una copia completa' };
        }
        
        const result = exportDatabase(backupType);
        if (!result.success) {
            if (window.showToast) {
                window.showToast('❌ Error al exportar: ' + result.error, 'error', 5000);
            }
            return { success: false, error: result.error };
        }

        const dataArray = new Uint8Array(result.data);
        const blob = new Blob([dataArray], { type: 'application/x-sqlite3' });
        const url = URL.createObjectURL(blob);
        
        const date = new Date().toISOString().split('T')[0];
        // 🆕 v4: Usar prefijo con slug del negocio
        const prefijo = getPrefijoBackup();
        const sufijo = backupType === BACKUP_TYPE_COMPLETE ? 'completo' : 'datos';
        const filename = `${prefijo}_${sufijo}_${date}.db`;
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        const tipoLabel = backupType === BACKUP_TYPE_COMPLETE ? 'completa' : 'solo datos';
        if (window.showToast) {
            window.showToast(`✅ Copia de seguridad (${tipoLabel}) exportada (${(result.size / 1024).toFixed(1)} KB)`, 'success');
        }
        return { success: true, filename: filename, size: result.size };
    } catch (error) {
        console.error('❌ Error descargando BD:', error);
        if (window.showToast) {
            window.showToast('❌ Error: ' + error.message, 'error', 5000);
        }
        return { success: false, error: error.message };
    }
}

function importDatabase(file) {
    return new Promise((resolve, reject) => {
        try {
            const reader = new FileReader();
            
            reader.onload = async function(e) {
                let newDb = null;
                try {
                    const arrayBuffer = e.target.result;
                    const dataArray = new Uint8Array(arrayBuffer);
                    
                    if (dataArray.length === 0) { 
                        reject(new Error('El archivo está vacío')); 
                        return; 
                    }
                    
                    const header = new TextDecoder().decode(dataArray.slice(0, 16));
                    if (!header.includes('SQLite')) { 
                        reject(new Error('No es un archivo SQLite válido')); 
                        return; 
                    }
                    
                    if (!sqlJsInstance) {
                        reject(new Error('SQL.js no está inicializado. Recarga la página e intenta de nuevo.'));
                        return;
                    }
                    
                    newDb = new sqlJsInstance.Database(dataArray);
                    
                    const meta = readBackupMeta(newDb);
                    console.log('🔖 Marca del backup:', meta);
                    
                    const user = window.AuthModule?.getCurrentUser();
                    const isAdmin = user && user.is_admin === 1;
                    
                    if (meta.type === BACKUP_TYPE_COMPLETE && !isAdmin) {
                        newDb.close();
                        newDb = null;
                        reject(new Error('⚠️ Esta es una copia de seguridad COMPLETA. Solo el administrador puede importarla.'));
                        return;
                    }
                    
                    if (meta.type === BACKUP_TYPE_DATA_ONLY) {
                        newDb.close();
                        newDb = null;
                        importDatabaseDataOnly(file).then(resolve).catch(reject);
                        return;
                    }
                    
                    if (meta.type === 'unknown' && !isAdmin) {
                        newDb.close();
                        newDb = null;
                        reject(new Error('⚠️ Esta copia de seguridad no tiene marca de tipo. Solo el administrador puede importarla.'));
                        return;
                    }
                    
                    const tables = newDb.exec("SELECT name FROM sqlite_master WHERE type='table'");
                    const tableNames = tables[0]?.values?.map(row => row[0]) || [];
                    
                    const requiredTables = ['users', 'recipes', 'sales', 'orders', 'clients', 'products'];
                    const missingTables = requiredTables.filter(t => !tableNames.includes(t));
                    
                    if (missingTables.length > 0) {
                        newDb.close();
                        newDb = null;
                        reject(new Error(`Faltan tablas: ${missingTables.join(', ')}`)); 
                        return;
                    }
                    
                    try {
                        newDb.run(`DROP TABLE IF EXISTS ${BACKUP_META_TABLE}`);
                    } catch (e) {}
                    
                    const exportData = newDb.export();
                    const array = Array.from(exportData);
                    localStorage.setItem('panario_db_data', JSON.stringify(array));
                    
                    if (db) {
                        try { db.close(); } catch (e) {}
                    }
                    
                    db = newDb;
                    newDb = null;
                    dbInitialized = true;
                    saveDatabase();
                    
                    console.log('✅ Backup completo importado correctamente');
                    resolve({ success: true, tables: tableNames, size: dataArray.length, meta: meta });
                } catch (error) {
                    reject(error);
                } finally {
                    if (newDb) {
                        try { newDb.close(); } catch (e) {}
                    }
                }
            };
            
            reader.onerror = function() { reject(new Error('Error al leer el archivo')); };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            reject(error);
        }
    });
}

function importDatabaseFromFile() {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.db,.sqlite,.sqlite3';
        input.style.display = 'none';
        
        input.onchange = async function(e) {
            const file = e.target.files[0];
            if (!file) { 
                resolve({ success: false, error: 'No se seleccionó archivo' }); 
                return; 
            }
            
            const user = window.AuthModule?.getCurrentUser();
            const isAdmin = user && user.is_admin === 1;
            
            const confirm = await window.ModalModule.showConfirm({
                title: '📥 Importar copia de seguridad',
                message: `¿Seguro que quieres importar "${file.name}"?\n\n⚠️ Esto reemplazará TODOS los datos actuales${isAdmin ? ' (incluyendo usuarios y negocios)' : ''}.`,
                confirmText: 'Sí, importar',
                cancelText: 'Cancelar',
                icon: '⚠️',
                confirmColor: '#ef4444'
            });
            
            if (!confirm) { 
                resolve({ success: false, error: 'Cancelado' }); 
                return; 
            }
            
            try {
                const result = await window.DBModule.importDatabase(file);
                resolve(result);
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    });
}

function importDatabaseDataOnly(file) {
    return new Promise((resolve, reject) => {
        try {
            const reader = new FileReader();
            
            reader.onload = async function(e) {
                let backupDb = null;
                try {
                    const arrayBuffer = e.target.result;
                    const dataArray = new Uint8Array(arrayBuffer);
                    
                    if (dataArray.length === 0) {
                        reject(new Error('El archivo está vacío'));
                        return;
                    }
                    
                    const header = new TextDecoder().decode(dataArray.slice(0, 16));
                    if (!header.includes('SQLite')) {
                        reject(new Error('No es un archivo SQLite válido'));
                        return;
                    }
                    
                    if (!sqlJsInstance) {
                        reject(new Error('SQL.js no está inicializado. Recarga la página e intenta de nuevo.'));
                        return;
                    }
                    
                    backupDb = new sqlJsInstance.Database(dataArray);
                    
                    const meta = readBackupMeta(backupDb);
                    console.log('🔖 Marca del backup (solo datos):', meta);
                    
                    if (meta.type === BACKUP_TYPE_COMPLETE) {
                        const user = window.AuthModule?.getCurrentUser();
                        const isAdmin = user && user.is_admin === 1;
                        
                        if (!isAdmin) {
                            backupDb.close();
                            backupDb = null;
                            reject(new Error('⚠️ Esta es una copia de seguridad COMPLETA. Solo el administrador puede importarla como completa.'));
                            return;
                        }
                    }
                    
                    const tablesResult = backupDb.exec("SELECT name FROM sqlite_master WHERE type='table'");
                    const backupTables = tablesResult[0]?.values?.map(row => row[0]) || [];
                    
                    const requiredTables = ['insumos', 'recipes', 'productos', 'sales', 'orders'];
                    const missingTables = requiredTables.filter(t => !backupTables.includes(t));
                    
                    if (missingTables.length > 0) {
                        backupDb.close();
                        backupDb = null;
                        reject(new Error(`Faltan tablas obligatorias: ${missingTables.join(', ')}`));
                        return;
                    }
                    
                    const negocioIdActual = getNegocioIdActual();
                    console.log('🔍 Negocio actual:', negocioIdActual);
                    
                    const tablasImportar = [
                        'insumos', 'recipes', 'recipe_ingredients', 'receta_insumos',
                        'productos', 'clients', 'orders', 'order_items', 'payments',
                        'sales', 'transactions', 'waiting_list', 'notifications',
                        'corriente_config', 'bank_accounts', 'inventory',
                        'inventory_movements', 'units', 'premios_config'
                    ];
                    
                    const db = getDB();
                    let tablasRestauradas = 0;
                    let registrosRestaurados = 0;
                    const errores = [];
                    
                    db.run('BEGIN TRANSACTION');
                    
                    try {
                        for (const tabla of tablasImportar) {
                            try {
                                const tableCheck = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tabla}'`);
                                if (tableCheck.length === 0 || tableCheck[0].values.length === 0) continue;
                                
                                const columnsCheck = db.exec(`PRAGMA table_info(${tabla})`);
                                const columnas = columnsCheck[0]?.values?.map(row => row[1]) || [];
                                
                                if (columnas.includes('negocio_id')) {
                                    db.run(`DELETE FROM ${tabla} WHERE negocio_id = ?`, [negocioIdActual]);
                                } else {
                                    db.run(`DELETE FROM ${tabla}`);
                                }
                            } catch (err) {}
                        }
                        
                        for (const tabla of tablasImportar) {
                            try {
                                if (!backupTables.includes(tabla)) continue;
                                
                                const tableCheck = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tabla}'`);
                                if (tableCheck.length === 0 || tableCheck[0].values.length === 0) continue;
                                
                                const currentColsResult = db.exec(`PRAGMA table_info(${tabla})`);
                                const currentColumns = currentColsResult[0]?.values?.map(row => row[1]) || [];
                                
                                const backupColsResult = backupDb.exec(`PRAGMA table_info(${tabla})`);
                                const backupColumns = backupColsResult[0]?.values?.map(row => row[1]) || [];
                                
                                const columnasComunes = currentColumns.filter(col => backupColumns.includes(col));
                                
                                if (columnasComunes.length === 0) continue;
                                
                                const dataResult = backupDb.exec(`SELECT * FROM ${tabla}`);
                                if (dataResult.length === 0 || !dataResult[0].values) continue;
                                
                                const columnasBackup = dataResult[0].columns;
                                const filas = dataResult[0].values;
                                
                                const columnasAImportar = columnasComunes.filter(col => columnasBackup.indexOf(col) !== -1);
                                
                                const placeholders = columnasAImportar.map(() => '?').join(', ');
                                const insertSQL = `INSERT INTO ${tabla} (${columnasAImportar.join(', ')}) VALUES (${placeholders})`;
                                
                                let insertados = 0;
                                
                                for (const fila of filas) {
                                    try {
                                        let valores = columnasAImportar.map(col => {
                                            const idx = columnasBackup.indexOf(col);
                                            return idx !== -1 ? fila[idx] : null;
                                        });
                                        
                                        const idxNegocioId = columnasAImportar.indexOf('negocio_id');
                                        if (idxNegocioId !== -1) {
                                            valores[idxNegocioId] = negocioIdActual;
                                        }
                                        
                                        db.run(insertSQL, valores);
                                        insertados++;
                                    } catch (err) {}
                                }
                                
                                tablasRestauradas++;
                                registrosRestaurados += insertados;
                                console.log(`✅ ${tabla}: ${insertados} registros restaurados`);
                                
                            } catch (err) {
                                errores.push(`${tabla}: ${err.message}`);
                            }
                        }
                        
                        db.run('COMMIT');
                        console.log('✅ Transacción confirmada');
                        
                    } catch (err) {
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                    }
                    
                    saveDatabase();
                    saveAndNotify();
                    
                    resolve({
                        success: true,
                        tablasRestauradas,
                        registrosRestaurados,
                        errores: errores.length > 0 ? errores : null,
                        meta: meta
                    });
                    
                } catch (error) {
                    reject(error);
                } finally {
                    if (backupDb) {
                        try { backupDb.close(); } catch (e) {}
                    }
                }
            };
            
            reader.onerror = function() {
                reject(new Error('Error al leer el archivo'));
            };
            
            reader.readAsArrayBuffer(file);
        } catch (error) {
            reject(error);
        }
    });
}

function importDatabaseDataOnlyFromFile() {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.db,.sqlite,.sqlite3';
        input.style.display = 'none';
        
        input.onchange = async function(e) {
            const file = e.target.files[0];
            if (!file) {
                resolve({ success: false, error: 'No se seleccionó archivo' });
                return;
            }
            
            const confirm = await window.ModalModule.showConfirm({
                title: '📊 Restaurar solo datos',
                message: `¿Restaurar SOLO los datos operativos (insumos, recetas, productos, ventas, pedidos) desde "${file.name}"?\n\n⚠️ Los datos actuales del negocio serán REEMPLAZADOS.\n\n✅ Tus usuarios y el código de invitación se CONSERVARÁN.`,
                confirmText: 'Sí, restaurar datos',
                cancelText: 'Cancelar',
                icon: '📊',
                confirmColor: '#f59e0b'
            });
            
            if (!confirm) {
                resolve({ success: false, error: 'Cancelado' });
                return;
            }
            
            try {
                const result = await importDatabaseDataOnly(file);
                resolve(result);
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    });
}

// ============================================================
// EXPORTACIÓN
// ============================================================

window.DBModule = {
    initDB, getDB, saveDatabase, saveAndNotify, query, execute,
    forceReloadFromStorage,
    reloadFromStorageAndNotify,
    ensureUserTableColumns, ensureSoftDeleteColumns, ensureVoidColumns,
    ensureOrderIdColumn, ensureWaitingListColumns, ensureBankAccountsColumns,
    ensureCorrienteConfigTable, ensureIsLiberatedColumn, ensureDashboardColumns,
    ensurePremiosConfigTable,
    // FASE A.4
    ensureAuditColumns, getCurrentUserId, getUsuarioNombre,
    // 🆕 v4
    slugifyNombreNegocio, getNombreNegocioDB, getPrefijoBackup,
    ensureNegociosTable, ensureNegocioIdColumn, migrateToMultiUser,
    ensureNegocioIdInAllTables, migrateNegocioIdToAllTables, createNegocioIdIndexes,
    ensureIsAdminColumn,
    migrateToNewStructure,
    getNegocios, getNegocio, getNegocioByUser, getNegocioByCodigo, saveNegocio,
    generarCodigoInvitacion, regenerarCodigoInvitacion,
    validarCodigoInvitacion, contarUsuariosNegocio, getNegocioIdActual,
    getUnits, getUnitsByCategory, getUnit, addUnit,
    getProductos, getProducto, saveProducto, deleteProducto, calcularCostoProducto,
    getInsumos, getInsumo, getInsumoByName, saveInsumo, deleteInsumo, actualizarStockInsumo,
    getRecetaInsumos, saveRecetaInsumo, deleteRecetaInsumo,
    getCorrienteConfig, saveCorrienteConfig,
    getUserDashboardConfig, updateUserDashboardConfig,
    getInventory, getInventoryItem, getInventoryItemByName, saveInventoryItem,
    deleteInventoryItem,
    getWaitingList, getWaitingListCount, getNextWaitingPosition,
    addToWaitingList, removeFromWaitingList, reindexWaitingList,
    attendFromWaitingList, getWaitingListWithDetails, atenderParcialmenteDeLista,
    getBankAccounts, getBankAccount, getDefaultBankAccount, saveBankAccount, deleteBankAccount, setDefaultBankAccount,
    getDailySummary,
    // FASE 12 - Premios
    getPremiosConfig,
    savePremiosConfig,
    calcularMejorClienteDelMes,
    calcularMejorClienteDelAño,
    // Exportación/Importación con marca de tipo
    exportDatabase, downloadDatabase, importDatabase, importDatabaseFromFile,
    importDatabaseDataOnly, importDatabaseDataOnlyFromFile,
    // Salva diferencial
    exportRecetasProductosSalva,
    importRecetasProductosSalva,
    readSalvaFile,
    // Constantes de backup
    BACKUP_TYPE_COMPLETE,
    BACKUP_TYPE_DATA_ONLY
};

console.log('📦 DB Module cargado correctamente v2.0.5 (nombre del negocio en archivos de backup)');