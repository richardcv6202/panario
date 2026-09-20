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
// AÑADIDO FASE 1.3.1 (190926):
//   - generateUuid(prefix) helper global
//   - ensureUuidColumns(db) migración de columnas uuid
//   - migrateUuids(db) relleno de UUIDs en registros existentes
//   - UUID_PREFIXES constante con 12 tablas críticas
//   - ensureUuidColumns() + migrateUuids() llamadas en initDB()
// CORREGIDO (190926 v2):
//   - ensureAuditColumns() faltaba en el archivo (bug de copia)
//   - Añadida definición completa antes de ensureUuidColumns()
// AÑADIDO FASE 1.3.3 (190926 v3):
//   - importDatabaseDataOnly() con MODO FUSIÓN por UUID
//   - fusionarTabla(): lógica genérica de fusión
//   - findDuplicateByData(): detecta duplicados sin uuid
//   - remapForeignKey(): re-mapea referencias entre tablas
//   - Soporta modo 'reemplazar' (comportamiento antiguo) y 'fusionar' (nuevo)
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
// FASE 1.3.1: CONSTANTES DE UUID
// ============================================================

const UUID_PREFIXES = {
    'orders':              'ord_',
    'order_items':         'oit_',
    'sales':               'sal_',
    'transactions':        'trx_',
    'products':            'prd_',
    'recipes':             'rec_',
    'recipe_ingredients':  'rin_',
    'receta_insumos':      'ris_',
    'insumos':             'ins_',
    'clients':             'cli_',
    'bank_accounts':       'bco_',
    'waiting_list':        'wl_'
};

// ============================================================
// FASE 1.3.3: ORDEN DE TABLAS POR DEPENDENCIAS
// ============================================================

/**
 * Orden en el que se fusionan las tablas.
 * Las tablas padre van primero para poder re-mapear las FK.
 */
const TABLAS_FUSION_ORDER = [
    'units',
    'clients',
    'insumos',
    'recipes',
    'recipe_ingredients',
    'receta_insumos',
    'productos',
    'bank_accounts',
    'corriente_config',
    'premios_config',
    'orders',
    'order_items',
    'payments',
    'waiting_list',
    'sales',
    'transactions',
    'inventory',
    'inventory_movements',
    'notifications'
];

/**
 * Mapa de dependencias: para cada tabla, qué columnas son FK
 * y a qué tabla apuntan.
 * 
 * Formato: { tabla: [{ col: 'order_id', target: 'orders' }, ...] }
 */
const TABLAS_FK_MAP = {
    'order_items': [
        { col: 'order_id', target: 'orders' },
        { col: 'producto_id', target: 'productos' },
        { col: 'receta_id', target: 'recipes' },
        { col: 'unit_id', target: 'units' }
    ],
    'recipe_ingredients': [
        { col: 'recipe_id', target: 'recipes' },
        { col: 'unit_id', target: 'units' }
    ],
    'receta_insumos': [
        { col: 'receta_id', target: 'recipes' },
        { col: 'insumo_id', target: 'insumos' }
    ],
    'productos': [
        { col: 'receta_id', target: 'recipes' }
    ],
    'orders': [
        { col: 'client_id', target: 'clients' }
    ],
    'payments': [
        { col: 'order_id', target: 'orders' }
    ],
    'waiting_list': [
        { col: 'order_id', target: 'orders' }
    ],
    'sales': [
        { col: 'order_id', target: 'orders' },
        { col: 'producto_id', target: 'productos' },
        { col: 'receta_id', target: 'recipes' },
        { col: 'unit_id', target: 'units' }
    ],
    'transactions': [
        { col: 'sale_id', target: 'sales' }
    ],
    'inventory_movements': [
        { col: 'inventory_id', target: 'inventory' },
        { col: 'transaction_id', target: 'transactions' },
        { col: 'sale_id', target: 'sales' }
    ],
    'notifications': [
        { col: 'order_id', target: 'orders' }
    ]
};

// ============================================================
// GENERADOR DE UUID
// ============================================================

function generateUuid(prefix) {
    const prefixStr = prefix || 'gen_';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).padEnd(6, '0');
    return `${prefixStr}${timestamp}_${random}`;
}

function generateUuidForTable(tableName) {
    const prefix = UUID_PREFIXES[tableName] || 'gen_';
    return generateUuid(prefix);
}

// ============================================================
// HELPERS
// ============================================================

function slugifyNombreNegocio(nombre) {
    if (!nombre || typeof nombre !== 'string') return 'panario';
    try {
        let slug = nombre
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/ñ/g, 'n')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
        return slug || 'panario';
    } catch (e) {
        return 'panario';
    }
}

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

function getPrefijoBackup() {
    const nombreNegocio = getNombreNegocioDB();
    const slug = slugifyNombreNegocio(nombreNegocio);
    return `panario_${slug}`;
}

function getCurrentUserId() {
    try {
        const user = window.AuthModule?.getCurrentUser();
        return user?.id || null;
    } catch (e) {
        return null;
    }
}

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
        await ensureNegociosTable(db);
        await ensureNegocioIdColumn(db);
        await migrateToMultiUser(db);
        await ensureNegocioIdInAllTables(db);
        await migrateNegocioIdToAllTables(db);
        await createNegocioIdIndexes(db);
        await ensureIsAdminColumn(db);
        await ensureAuditColumns(db);
        await ensureUuidColumns(db);
        await migrateUuids(db);
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
        'insumos', 'recipes', 'productos', 'orders', 'sales', 'transactions',
        'clients', 'waiting_list', 'bank_accounts', 'corriente_config', 'premios_config'
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
// FASE 1.3.1: MIGRACIÓN DE COLUMNAS UUID
// ============================================================

async function ensureUuidColumns(db) {
    const tables = Object.keys(UUID_PREFIXES);
    let totalAdded = 0;
    
    console.log(`🔧 FASE 1.3.1: Verificando columna uuid en ${tables.length} tablas...`);
    
    for (const table of tables) {
        try {
            const tableCheck = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
            if (tableCheck.length === 0 || tableCheck[0].values.length === 0) {
                console.warn(`⚠️ FASE 1.3.1: tabla ${table} no existe, omitiendo`);
                continue;
            }
            
            const columns = db.exec(`PRAGMA table_info(${table})`);
            const columnNames = columns[0]?.values?.map(row => row[1]) || [];
            
            if (!columnNames.includes('uuid')) {
                db.run(`ALTER TABLE ${table} ADD COLUMN uuid TEXT`);
                console.log(`✅ FASE 1.3.1: ${table}: columna uuid añadida`);
                totalAdded++;
            }
            
            try {
                db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_${table}_uuid ON ${table}(uuid) WHERE uuid IS NOT NULL`);
            } catch (e) {
                try {
                    db.run(`CREATE INDEX IF NOT EXISTS idx_${table}_uuid ON ${table}(uuid)`);
                } catch (e2) {}
            }
            
        } catch (error) {
            console.warn(`⚠️ FASE 1.3.1: Error procesando ${table}:`, error.message);
        }
    }
    
    console.log(`✅ FASE 1.3.1: Migración completada (${totalAdded} columnas uuid añadidas)`);
}

async function migrateUuids(db) {
    const tables = Object.keys(UUID_PREFIXES);
    let totalUpdated = 0;
    
    console.log(`🔄 FASE 1.3.1: Migrando UUIDs en registros existentes...`);
    
    for (const table of tables) {
        try {
            const tableCheck = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
            if (tableCheck.length === 0 || tableCheck[0].values.length === 0) continue;
            
            const columns = db.exec(`PRAGMA table_info(${table})`);
            const columnNames = columns[0]?.values?.map(row => row[1]) || [];
            if (!columnNames.includes('uuid')) continue;
            
            const countResult = db.exec(`SELECT COUNT(*) as count FROM ${table} WHERE uuid IS NULL`);
            const count = countResult[0]?.values?.[0]?.[0] || 0;
            
            if (count === 0) continue;
            
            console.log(`🔄 FASE 1.3.1: ${table}: ${count} registros sin UUID → generando...`);
            
            const idsResult = db.exec(`SELECT id FROM ${table} WHERE uuid IS NULL`);
            const ids = idsResult[0]?.values?.map(row => row[0]) || [];
            
            const prefix = UUID_PREFIXES[table] || 'gen_';
            let updated = 0;
            
            for (const id of ids) {
                try {
                    const uuid = generateUuid(prefix);
                    db.run(`UPDATE ${table} SET uuid = ? WHERE id = ?`, [uuid, id]);
                    updated++;
                } catch (e) {
                    console.warn(`⚠️ FASE 1.3.1: error actualizando ${table}#${id}:`, e.message);
                }
            }
            
            totalUpdated += updated;
            console.log(`✅ FASE 1.3.1: ${table}: ${updated} UUIDs generados`);
            
        } catch (error) {
            console.warn(`⚠️ FASE 1.3.1: Error migrando UUIDs en ${table}:`, error.message);
        }
    }
    
    console.log(`✅ FASE 1.3.1: Migración de UUIDs completada (${totalUpdated} registros actualizados)`);
}

// ============================================================
// FORZAR RECARGA
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
            try { db.close(); } catch (e) {}
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
    }
    return success;
}

// ============================================================
// VERIFICAR COLUMNAS
// ============================================================

async function ensureBankAccountsColumns(db) {
    try {
        const tableCheck = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='bank_accounts'`);
        if (tableCheck.length === 0 || tableCheck[0].values.length === 0) return;

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
                } catch (alterErr) {}
            }
        }
        console.log(`✅ bank_accounts verificada (${added} columnas añadidas)`);
    } catch (error) {
        console.error('❌ Error verificando bank_accounts:', error);
    }
}

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
    } catch (error) {}
}

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
    } catch (error) {}
}

async function ensureNegocioIdColumn(db) {
    try {
        const columns = db.exec('PRAGMA table_info(users)');
        const columnNames = columns[0]?.values?.map(row => row[1]) || [];
        if (!columnNames.includes('negocio_id')) {
            db.run('ALTER TABLE users ADD COLUMN negocio_id INTEGER');
        }
    } catch (error) {}
}

async function migrateToMultiUser(db) {
    try {
        const negociosCount = db.exec('SELECT COUNT(*) as count FROM negocios');
        const totalNegocios = negociosCount[0]?.values?.[0]?.[0] || 0;
        
        const usersSinNegocio = db.exec(`
            SELECT id, username, business_name 
            FROM users WHERE negocio_id IS NULL AND deleted_at IS NULL
        `);
        const usuariosSinNegocio = usersSinNegocio[0]?.values || [];
        if (usuariosSinNegocio.length === 0) return;
        
        let negocioId;
        if (totalNegocios === 0) {
            const businessName = usuariosSinNegocio[0][2] || 'Mi Negocio';
            const codigo = generarCodigoInvitacion();
            db.run(`INSERT INTO negocios (nombre, codigo_invitacion) VALUES (?, ?)`, [businessName, codigo]);
            const idResult = db.exec('SELECT last_insert_rowid() as id');
            negocioId = idResult[0]?.values?.[0]?.[0];
        } else {
            const firstNegocio = db.exec('SELECT id FROM negocios WHERE deleted_at IS NULL LIMIT 1');
            negocioId = firstNegocio[0]?.values?.[0]?.[0];
        }
        
        const adminCheck = db.exec(`SELECT COUNT(*) FROM users WHERE negocio_id = ? AND is_admin = 1 AND deleted_at IS NULL`, [negocioId]);
        const adminCount = adminCheck[0]?.values?.[0]?.[0] || 0;
        let isFirstUser = adminCount === 0;
        
        for (const user of usuariosSinNegocio) {
            db.run('UPDATE users SET negocio_id = ?, is_admin = ? WHERE id = ?', [negocioId, isFirstUser ? 1 : 0, user[0]]);
            isFirstUser = false;
        }
    } catch (error) {}
}

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
            for (const row of usersResult[0].values) usersMapping[row[0]] = row[1];
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
                    let negocioId = (userId && usersMapping[userId] !== undefined && usersMapping[userId] !== null)
                        ? usersMapping[userId] : defaultNegocioId;
                    if (negocioId) {
                        db.run(`UPDATE ${table} SET negocio_id = ? WHERE id = ?`, [negocioId, recordId]);
                    }
                }
            } catch (error) {}
        }
    } catch (error) {}
}

async function createNegocioIdIndexes(db) {
    const tables = [
        'insumos', 'recipes', 'productos', 'clients', 'orders',
        'sales', 'transactions', 'inventory', 'waiting_list',
        'notifications', 'bank_accounts', 'corriente_config'
    ];
    for (const table of tables) {
        try { db.run(`CREATE INDEX IF NOT EXISTS idx_${table}_negocio_id ON ${table}(negocio_id)`); } catch (error) {}
    }
}

async function ensureIsAdminColumn(db) {
    try {
        const columns = db.exec('PRAGMA table_info(users)');
        const columnNames = columns[0]?.values?.map(row => row[1]) || [];
        if (!columnNames.includes('is_admin')) {
            db.run('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
        }
    } catch (error) {}
}

// ============================================================
// NEGOCIOS
// ============================================================

function generarCodigoInvitacion() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = '';
    for (let i = 0; i < 8; i++) codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    return codigo;
}

function getNegocios() { return query('SELECT * FROM negocios WHERE deleted_at IS NULL ORDER BY nombre'); }

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
    const results = query('SELECT * FROM negocios WHERE codigo_invitacion = ? AND deleted_at IS NULL', [codigo.toUpperCase().trim()]);
    return results.length > 0 ? results[0] : null;
}

function saveNegocio(data) {
    try {
        if (data.id) {
            execute(`UPDATE negocios SET nombre = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [data.nombre, data.id]);
            return { success: true, id: data.id };
        } else {
            const codigo = data.codigo_invitacion || generarCodigoInvitacion();
            const result = execute(`INSERT INTO negocios (nombre, codigo_invitacion) VALUES (?, ?)`, [data.nombre, codigo]);
            return { success: true, id: result.lastId, codigo: codigo };
        }
    } catch (e) { return { success: false, error: e.message }; }
}

function regenerarCodigoInvitacion(negocioId) {
    try {
        let nuevoCodigo, intentos = 0;
        do {
            nuevoCodigo = generarCodigoInvitacion();
            intentos++;
        } while (getNegocioByCodigo(nuevoCodigo) && intentos < 10);
        
        execute(`UPDATE negocios SET codigo_invitacion = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [nuevoCodigo, negocioId]);
        return { success: true, codigo: nuevoCodigo };
    } catch (e) { return { success: false, error: e.message }; }
}

function validarCodigoInvitacion(codigo) { return codigo ? getNegocioByCodigo(codigo) : null; }

function contarUsuariosNegocio(negocioId) {
    const result = query('SELECT COUNT(*) as count FROM users WHERE negocio_id = ? AND deleted_at IS NULL', [negocioId]);
    return result[0]?.count || 0;
}

function getNegocioIdActual() {
    try {
        const user = window.AuthModule?.getCurrentUser();
        if (user && user.negocio_id) return user.negocio_id;
        if (user && user.id) {
            const result = query('SELECT negocio_id FROM users WHERE id = ?', [user.id]);
            if (result.length > 0 && result[0].negocio_id) return result[0].negocio_id;
        }
        const neg = query('SELECT id FROM negocios WHERE deleted_at IS NULL LIMIT 1');
        return neg.length > 0 ? neg[0].id : 1;
    } catch (e) { return 1; }
}

// ============================================================
// DASHBOARD CONFIG
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
            if (!columnNames.includes(col.name)) db.run(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
        }
    } catch (error) {}
}

function getUserDashboardConfig(userId) {
    const defaultConfig = {
        show_corriente: true, show_top_clients: true, show_top_products: true,
        show_funds_analysis: true, show_payment_methods: true, show_quick_actions: true,
        show_bank_qr: false, show_help_button: true, show_orders_today: true
    };
    try {
        const results = query(`SELECT dash_show_corriente, dash_show_top_clients, dash_show_top_products,
                    dash_show_funds_analysis, dash_show_payment_methods, dash_show_quick_actions,
                    dash_show_bank_qr, dash_show_help_button, dash_show_orders_today
             FROM users WHERE id = ?`, [userId]);
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
    } catch (e) { return defaultConfig; }
}

function updateUserDashboardConfig(userId, config) {
    try {
        execute(`UPDATE users SET dash_show_corriente = ?, dash_show_top_clients = ?,
                dash_show_top_products = ?, dash_show_funds_analysis = ?,
                dash_show_payment_methods = ?, dash_show_quick_actions = ?,
                dash_show_bank_qr = ?, dash_show_help_button = ?, dash_show_orders_today = ?
            WHERE id = ?`, [
            config.show_corriente ? 1 : 0, config.show_top_clients ? 1 : 0,
            config.show_top_products ? 1 : 0, config.show_funds_analysis ? 1 : 0,
            config.show_payment_methods ? 1 : 0, config.show_quick_actions ? 1 : 0,
            config.show_bank_qr ? 1 : 0, config.show_help_button ? 1 : 0,
            config.show_orders_today ? 1 : 0, userId
        ]);
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
}

// ============================================================
// SEMILLAS
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
                db.run(`INSERT INTO products (user_id, name, price, category, is_active) VALUES (?, ?, ?, ?, 1)`,
                    [userId, product.name, product.price, product.category]);
            }
        }
    } catch (error) {}
}

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
                db.run(`INSERT INTO insumos (user_id, nombre, unidad, costo_unitario, stock, stock_minimo) VALUES (?, ?, ?, ?, ?, ?)`,
                    [userId, insumo.nombre, insumo.unidad, insumo.costo_unitario, insumo.stock, insumo.stock_minimo]);
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
                db.run('INSERT INTO units (name, abbreviation, category) VALUES (?, ?, ?)',
                    [unit.name, unit.abbreviation, unit.category]);
            }
        }
    } catch (error) {}
}

// ============================================================
// CREAR TABLAS
// ============================================================

async function createAllTables(db) {
    try {
        db.run(`CREATE TABLE IF NOT EXISTS units (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, abbreviation TEXT NOT NULL,
            category TEXT DEFAULT 'other', created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME DEFAULT NULL)`);

        db.run(`CREATE TABLE IF NOT EXISTS negocios (
            id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL,
            codigo_invitacion TEXT UNIQUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL)`);

        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
            name TEXT, business_name TEXT, email TEXT, phone TEXT, photo TEXT,
            theme TEXT DEFAULT 'light', negocio_id INTEGER, is_admin INTEGER DEFAULT 0,
            dash_show_corriente INTEGER DEFAULT 1, dash_show_top_clients INTEGER DEFAULT 1,
            dash_show_top_products INTEGER DEFAULT 1, dash_show_funds_analysis INTEGER DEFAULT 1,
            dash_show_payment_methods INTEGER DEFAULT 1, dash_show_quick_actions INTEGER DEFAULT 1,
            dash_show_bank_qr INTEGER DEFAULT 0, dash_show_help_button INTEGER DEFAULT 1,
            dash_show_orders_today INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL,
            FOREIGN KEY (negocio_id) REFERENCES negocios(id))`);

        db.run(`CREATE TABLE IF NOT EXISTS recipes (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, negocio_id INTEGER,
            name TEXT NOT NULL, description TEXT, instructions TEXT, yield_units REAL,
            yield_unit_type TEXT, shared INTEGER DEFAULT 0, used_by_others INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME DEFAULT NULL, FOREIGN KEY (user_id) REFERENCES users(id))`);

        db.run(`CREATE TABLE IF NOT EXISTS recipe_ingredients (
            id INTEGER PRIMARY KEY AUTOINCREMENT, recipe_id INTEGER NOT NULL, ingredient_name TEXT NOT NULL,
            quantity REAL NOT NULL, unit TEXT NOT NULL, unit_id INTEGER, price REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL,
            FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
            FOREIGN KEY (unit_id) REFERENCES units(id))`);

        db.run(`CREATE TABLE IF NOT EXISTS insumos (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, negocio_id INTEGER,
            nombre TEXT NOT NULL, unidad TEXT NOT NULL, costo_unitario REAL NOT NULL DEFAULT 0,
            stock REAL NOT NULL DEFAULT 0, stock_minimo REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME DEFAULT NULL, FOREIGN KEY (user_id) REFERENCES users(id))`);

        db.run(`CREATE TABLE IF NOT EXISTS receta_insumos (
            id INTEGER PRIMARY KEY AUTOINCREMENT, receta_id INTEGER NOT NULL, insumo_id INTEGER NOT NULL,
            cantidad REAL NOT NULL, unidad TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME DEFAULT NULL, FOREIGN KEY (receta_id) REFERENCES recipes(id) ON DELETE CASCADE,
            FOREIGN KEY (insumo_id) REFERENCES insumos(id))`);

        db.run(`CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, negocio_id INTEGER,
            nombre TEXT NOT NULL, descripcion TEXT, precio_venta REAL NOT NULL DEFAULT 0,
            unidad_venta TEXT DEFAULT 'unidad', cantidad_por_unidad INTEGER DEFAULT 1, receta_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME DEFAULT NULL, FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (receta_id) REFERENCES recipes(id))`);

        db.run(`CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, negocio_id INTEGER,
            name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT, notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id))`);

        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, negocio_id INTEGER,
            client_id INTEGER, client_name TEXT NOT NULL, client_phone TEXT,
            order_date DATETIME DEFAULT CURRENT_TIMESTAMP, delivery_date DATETIME NOT NULL,
            status TEXT DEFAULT 'pending', priority TEXT DEFAULT 'normal', total REAL DEFAULT 0,
            notes TEXT, session TEXT, has_advance_payment INTEGER DEFAULT 0,
            advance_amount REAL DEFAULT 0, advance_payment_method TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME DEFAULT NULL, FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (client_id) REFERENCES clients(id))`);

        db.run(`CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, product_name TEXT NOT NULL,
            producto_id INTEGER, receta_id INTEGER, quantity REAL NOT NULL, unit_price REAL NOT NULL,
            subtotal REAL NOT NULL, unit_id INTEGER, notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY (producto_id) REFERENCES productos(id),
            FOREIGN KEY (receta_id) REFERENCES recipes(id),
            FOREIGN KEY (unit_id) REFERENCES units(id))`);

        db.run(`CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, amount REAL NOT NULL,
            payment_method TEXT NOT NULL, status TEXT DEFAULT 'pending',
            payment_date DATETIME DEFAULT CURRENT_TIMESTAMP, notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE)`);

        db.run(`CREATE TABLE IF NOT EXISTS waiting_list (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, negocio_id INTEGER,
            order_id INTEGER NOT NULL, position INTEGER NOT NULL, status TEXT DEFAULT 'waiting',
            client_name TEXT NOT NULL, client_phone TEXT, product_name TEXT NOT NULL,
            quantity REAL NOT NULL, notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            notified_at DATETIME, attended_at DATETIME, deleted_at DATETIME DEFAULT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            UNIQUE(user_id, order_id))`);

        db.run(`CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, negocio_id INTEGER,
            order_id INTEGER, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME DEFAULT NULL, FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (order_id) REFERENCES orders(id))`);

        db.run(`CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, negocio_id INTEGER,
            product_name TEXT NOT NULL, producto_id INTEGER, receta_id INTEGER, order_id INTEGER,
            quantity REAL NOT NULL, unit_price REAL NOT NULL, total REAL NOT NULL,
            payment_method TEXT NOT NULL, buyer TEXT, is_debt INTEGER DEFAULT 0, paid INTEGER DEFAULT 1,
            unit_id INTEGER, sale_date DATETIME DEFAULT CURRENT_TIMESTAMP, session TEXT,
            is_liberated INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME DEFAULT NULL, voided INTEGER DEFAULT 0, void_reason TEXT,
            voided_at DATETIME, from_waiting_list INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (producto_id) REFERENCES productos(id),
            FOREIGN KEY (receta_id) REFERENCES recipes(id),
            FOREIGN KEY (unit_id) REFERENCES units(id))`);

        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, negocio_id INTEGER,
            type TEXT NOT NULL, category TEXT, concept TEXT NOT NULL, amount REAL NOT NULL,
            payment_method TEXT NOT NULL, sale_id INTEGER,
            transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL,
            voided INTEGER DEFAULT 0, void_reason TEXT, voided_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (sale_id) REFERENCES sales(id))`);

        db.run(`CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, negocio_id INTEGER,
            product_name TEXT NOT NULL, quantity REAL NOT NULL DEFAULT 0, unit TEXT NOT NULL,
            unit_id INTEGER, cost REAL NOT NULL DEFAULT 0, min_stock REAL DEFAULT 0,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (unit_id) REFERENCES units(id),
            UNIQUE(user_id, product_name))`);

        db.run(`CREATE TABLE IF NOT EXISTS inventory_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, inventory_id INTEGER NOT NULL,
            type TEXT NOT NULL, quantity REAL NOT NULL, unit TEXT NOT NULL, cost REAL DEFAULT 0,
            concept TEXT, transaction_id INTEGER, sale_id INTEGER,
            movement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
            FOREIGN KEY (transaction_id) REFERENCES transactions(id),
            FOREIGN KEY (sale_id) REFERENCES sales(id))`);

        db.run(`CREATE TABLE IF NOT EXISTS bank_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, negocio_id INTEGER,
            bank TEXT NOT NULL, owner_name TEXT, account_number TEXT NOT NULL, phone TEXT,
            qr_code TEXT, is_default INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME DEFAULT NULL, FOREIGN KEY (user_id) REFERENCES users(id))`);

        db.run(`CREATE TABLE IF NOT EXISTS corriente_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE, negocio_id INTEGER,
            horas_corriente REAL DEFAULT 3, horas_apagon REAL DEFAULT 12, fecha_referencia TEXT,
            hora_inicio_referencia TEXT, hora_fin_referencia TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME DEFAULT NULL, FOREIGN KEY (user_id) REFERENCES users(id))`);

        db.run(`CREATE TABLE IF NOT EXISTS premios_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT, negocio_id INTEGER NOT NULL UNIQUE,
            activo INTEGER DEFAULT 1, premio_mensual TEXT, premio_anual TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME DEFAULT NULL, FOREIGN KEY (negocio_id) REFERENCES negocios(id))`);

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
        if (!columnNames.includes('is_liberated')) db.run('ALTER TABLE sales ADD COLUMN is_liberated INTEGER DEFAULT 0');
    } catch (error) {}
}

async function ensureCorrienteConfigTable(db) {
    try {
        const tableCheck = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='corriente_config'`);
        if (tableCheck.length === 0 || tableCheck[0].values.length === 0) {
            db.run(`CREATE TABLE IF NOT EXISTS corriente_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE, negocio_id INTEGER,
                horas_corriente REAL DEFAULT 3, horas_apagon REAL DEFAULT 12, fecha_referencia TEXT,
                hora_inicio_referencia TEXT, hora_fin_referencia TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL, FOREIGN KEY (user_id) REFERENCES users(id))`);
        }
    } catch (error) {}
}

async function ensureOrderIdColumn(db) {
    try {
        const salesColumns = db.exec('PRAGMA table_info(sales)');
        const salesColumnNames = salesColumns[0]?.values?.map(row => row[1]) || [];
        if (!salesColumnNames.includes('order_id')) db.run('ALTER TABLE sales ADD COLUMN order_id INTEGER');
        if (!salesColumnNames.includes('from_waiting_list')) db.run('ALTER TABLE sales ADD COLUMN from_waiting_list INTEGER DEFAULT 0');
        if (!salesColumnNames.includes('session')) db.run('ALTER TABLE sales ADD COLUMN session TEXT');
        
        const ordersColumns = db.exec('PRAGMA table_info(orders)');
        const ordersColumnNames = ordersColumns[0]?.values?.map(row => row[1]) || [];
        if (!ordersColumnNames.includes('session')) db.run('ALTER TABLE orders ADD COLUMN session TEXT');
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
            if (!columnNames.includes(col.name)) db.run(`ALTER TABLE waiting_list ADD COLUMN ${col.name} ${col.type}`);
        }
    } catch (error) {}
}

async function migrateToNewStructure(db) { console.log('✅ Migración verificada'); }

async function ensureSoftDeleteColumns(db) {
    try {
        const tables = [
            'users', 'units', 'recipes', 'recipe_ingredients', 'clients', 'products',
            'orders', 'order_items', 'payments', 'notifications', 'sales', 'transactions',
            'inventory', 'inventory_movements', 'insumos', 'receta_insumos',
            'waiting_list', 'bank_accounts', 'corriente_config', 'negocios', 'premios_config'
        ];
        for (const table of tables) {
            try {
                const tableCheck = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
                if (tableCheck.length === 0 || tableCheck[0].values.length === 0) continue;
                const columns = db.exec(`PRAGMA table_info(${table})`);
                const columnNames = columns[0]?.values?.map(row => row[1]) || [];
                if (!columnNames.includes('deleted_at')) db.run(`ALTER TABLE ${table} ADD COLUMN deleted_at DATETIME DEFAULT NULL`);
            } catch (e) {}
        }
    } catch (error) {}
}

async function ensureVoidColumns(db) {
    try {
        const salesColumns = db.exec('PRAGMA table_info(sales)');
        const salesColumnNames = salesColumns[0]?.values?.map(row => row[1]) || [];
        if (!salesColumnNames.includes('voided')) db.run('ALTER TABLE sales ADD COLUMN voided INTEGER DEFAULT 0');
        if (!salesColumnNames.includes('void_reason')) db.run('ALTER TABLE sales ADD COLUMN void_reason TEXT');
        if (!salesColumnNames.includes('voided_at')) db.run('ALTER TABLE sales ADD COLUMN voided_at DATETIME');
        
        const transColumns = db.exec('PRAGMA table_info(transactions)');
        const transColumnNames = transColumns[0]?.values?.map(row => row[1]) || [];
        if (!transColumnNames.includes('voided')) db.run('ALTER TABLE transactions ADD COLUMN voided INTEGER DEFAULT 0');
        if (!transColumnNames.includes('void_reason')) db.run('ALTER TABLE transactions ADD COLUMN void_reason TEXT');
        if (!transColumnNames.includes('voided_at')) db.run('ALTER TABLE transactions ADD COLUMN voided_at DATETIME');
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
            if (!columnNames.includes(col.name)) db.run(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
        }
    } catch (error) {}
}

// ============================================================
// PERSISTENCIA Y EJECUCIÓN
// ============================================================

function saveDatabase() {
    try {
        if (db) {
            const data = db.export();
            localStorage.setItem('panario_db_data', JSON.stringify(Array.from(data)));
        }
    } catch (e) { console.error('Error guardando base de datos:', e); }
}

setInterval(saveDatabase, 30000);
window.addEventListener('beforeunload', saveDatabase);

function getDB() {
    if (!db || !dbInitialized) throw new Error('Base de datos no inicializada.');
    return db;
}

function saveAndNotify() {
    saveDatabase();
    document.dispatchEvent(new CustomEvent('db-saved'));
}

function query(sql, params = []) {
    const db = getDB();
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) results.push(stmt.getAsObject());
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
// BACKUP META
// ============================================================

function writeBackupMeta(db, backupType) {
    try {
        db.run(`CREATE TABLE IF NOT EXISTS ${BACKUP_META_TABLE} (
            id INTEGER PRIMARY KEY AUTOINCREMENT, backup_type TEXT NOT NULL, backup_date TEXT NOT NULL,
            backup_version TEXT, backup_negocio_id INTEGER, backup_negocio_nombre TEXT,
            backup_user TEXT, backup_user_role TEXT)`);
        db.run(`DELETE FROM ${BACKUP_META_TABLE}`);
        
        const user = window.AuthModule?.getCurrentUser();
        const negocioId = getNegocioIdActual();
        const negocio = getNegocio(negocioId);
        
        db.run(`INSERT INTO ${BACKUP_META_TABLE} 
            (backup_type, backup_date, backup_version, backup_negocio_id, backup_negocio_nombre, backup_user, backup_user_role)
            VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            backupType, new Date().toISOString(), '2.0.3', negocioId,
            negocio?.nombre || 'Desconocido', user?.username || 'Desconocido',
            user?.is_admin === 1 ? 'admin' : 'user'
        ]);
        return true;
    } catch (e) { return false; }
}

function readBackupMeta(backupDb) {
    try {
        const tableCheck = backupDb.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${BACKUP_META_TABLE}'`);
        if (tableCheck.length === 0 || tableCheck[0].values.length === 0) return { exists: false, type: 'unknown' };
        const result = backupDb.exec(`SELECT * FROM ${BACKUP_META_TABLE} LIMIT 1`);
        if (result.length === 0 || !result[0].values || result[0].values.length === 0) return { exists: false, type: 'unknown' };
        
        const columns = result[0].columns;
        const values = result[0].values[0];
        const meta = {};
        columns.forEach((col, i) => { meta[col] = values[i]; });
        
        return {
            exists: true, type: meta.backup_type || 'unknown',
            date: meta.backup_date || null, version: meta.backup_version || null,
            negocioId: meta.backup_negocio_id || null, negocioNombre: meta.backup_negocio_nombre || null,
            user: meta.backup_user || null, userRole: meta.backup_user_role || null
        };
    } catch (e) { return { exists: false, type: 'unknown' }; }
}

// ============================================================
// BANK ACCOUNTS
// ============================================================

function getBankAccounts() {
    const negocioId = getNegocioIdActual();
    return query('SELECT * FROM bank_accounts WHERE negocio_id = ? AND deleted_at IS NULL ORDER BY is_default DESC, created_at DESC', [negocioId]);
}

function getBankAccount(id) {
    const negocioId = getNegocioIdActual();
    const results = query('SELECT * FROM bank_accounts WHERE id = ? AND negocio_id = ? AND deleted_at IS NULL', [id, negocioId]);
    return results.length > 0 ? results[0] : null;
}

function getDefaultBankAccount() {
    const negocioId = getNegocioIdActual();
    const results = query(`SELECT * FROM bank_accounts WHERE negocio_id = ? AND deleted_at IS NULL 
         ORDER BY is_default DESC, created_at DESC LIMIT 1`, [negocioId]);
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
            execute(`UPDATE bank_accounts SET bank = ?, owner_name = ?, account_number = ?, phone = ?, 
                    qr_code = ?, is_default = ?, modified_by = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND negocio_id = ?`, [
                accountData.bank, accountData.owner_name || null, accountData.account_number,
                accountData.phone || null, accountData.qr_code || null,
                accountData.is_default ? 1 : 0, currentUserId, accountData.id, negocioId]);
            
            if (accountData.is_default) {
                execute('UPDATE bank_accounts SET is_default = 0 WHERE id != ? AND negocio_id = ?', [accountData.id, negocioId]);
            }
            return { success: true, id: accountData.id };
        } else {
            const result = execute(`INSERT INTO bank_accounts 
                (user_id, negocio_id, bank, owner_name, account_number, phone, qr_code, is_default, created_by, modified_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                user.id, negocioId, accountData.bank, accountData.owner_name || null,
                accountData.account_number, accountData.phone || null, accountData.qr_code || null,
                isFirst ? 1 : 0, currentUserId, currentUserId]);
            return { success: true, id: result.lastId };
        }
    } catch (e) { return { success: false, error: e.message }; }
}

function deleteBankAccount(id) {
    const negocioId = getNegocioIdActual();
    try {
        execute('UPDATE bank_accounts SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND negocio_id = ?', [id, negocioId]);
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
}

function setDefaultBankAccount(id) {
    const negocioId = getNegocioIdActual();
    try {
        execute('UPDATE bank_accounts SET is_default = 0 WHERE negocio_id = ?', [negocioId]);
        execute('UPDATE bank_accounts SET is_default = 1 WHERE id = ? AND negocio_id = ?', [id, negocioId]);
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
}

// ============================================================
// SALVA DIFERENCIAL
// ============================================================

function exportRecetasProductosSalva() {
    const negocioId = getNegocioIdActual();
    try {
        const recipes = query('SELECT * FROM recipes WHERE negocio_id = ? AND deleted_at IS NULL', [negocioId]);
        const recipeIds = recipes.map(r => r.id);
        let recipeIngredients = [];
        let recetaInsumos = [];
        if (recipeIds.length > 0) {
            const placeholders = recipeIds.map(() => '?').join(',');
            recipeIngredients = query(`SELECT * FROM recipe_ingredients WHERE recipe_id IN (${placeholders}) AND deleted_at IS NULL`, recipeIds);
            recetaInsumos = query(`SELECT * FROM receta_insumos WHERE receta_id IN (${placeholders}) AND deleted_at IS NULL`, recipeIds);
        }
        const productos = query('SELECT * FROM productos WHERE negocio_id = ? AND deleted_at IS NULL', [negocioId]);

        const salva = {
            _meta: {
                app: 'Panario', version: '2.0.3', type: 'salva_recetas_productos',
                exportDate: new Date().toISOString(), negocio_id: negocioId,
                negocio_nombre: getNombreNegocioDB(),
                counts: {
                    recipes: recipes.length, recipeIngredients: recipeIngredients.length,
                    recetaInsumos: recetaInsumos.length, productos: productos.length
                }
            },
            recipes, recipe_ingredients: recipeIngredients,
            receta_insumos: recetaInsumos, productos
        };

        const blob = new Blob([JSON.stringify(salva, null, 2)], { type: 'application/json;charset=utf-8' });
        const date = new Date().toISOString().split('T')[0];
        const filename = `${getPrefijoBackup()}_salva_recetas_productos_${date}.json`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return { success: true, filename, size: blob.size, sizeKB: (blob.size / 1024).toFixed(1), counts: salva._meta.counts };
    } catch (error) { return { success: false, error: error.message }; }
}

function importRecetasProductosSalva(salvaData, mode = 'merge') {
    const user = window.AuthModule?.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    const negocioId = getNegocioIdActual();
    const currentUserId = getCurrentUserId();

    try {
        if (!salvaData || !salvaData._meta || salvaData._meta.type !== 'salva_recetas_productos') {
            return { success: false, error: 'El archivo no es una salva válida' };
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
                    const existing = query('SELECT id FROM recipes WHERE negocio_id = ? AND name = ? AND deleted_at IS NULL', [negocioId, recipe.name]);
                    if (existing.length > 0) existingRecipe = existing[0];
                }
                let newRecipeId;
                if (existingRecipe) {
                    db.run(`UPDATE recipes SET description = ?, instructions = ?, yield_units = ?, 
                            yield_unit_type = ?, shared = ?, modified_by = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ? AND negocio_id = ?`, [
                        recipe.description || null, recipe.instructions || null,
                        recipe.yield_units || 1, recipe.yield_unit_type || 'unidades',
                        recipe.shared ? 1 : 0, currentUserId, existingRecipe.id, negocioId]);
                    newRecipeId = existingRecipe.id;
                    skipped.recipes++;
                } else {
                    db.run(`INSERT INTO recipes (user_id, negocio_id, name, description, instructions, 
                            yield_units, yield_unit_type, shared, created_by, modified_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                        user.id, negocioId, recipe.name, recipe.description || null,
                        recipe.instructions || null, recipe.yield_units || 1,
                        recipe.yield_unit_type || 'unidades', recipe.shared ? 1 : 0,
                        currentUserId, currentUserId]);
                    const idResult = db.exec('SELECT last_insert_rowid() as id');
                    newRecipeId = idResult[0]?.values?.[0]?.[0];
                    imported.recipes++;
                }
                if (newRecipeId) recipeIdMap[recipe.id] = newRecipeId;
            } catch (e) { errors.push(`Receta "${recipe.name}": ${e.message}`); }
        }

        for (const ing of (salvaData.recipe_ingredients || [])) {
            try {
                const newRecipeId = recipeIdMap[ing.recipe_id];
                if (!newRecipeId) continue;
                if (mode === 'merge') {
                    const exists = query(`SELECT id FROM recipe_ingredients 
                         WHERE recipe_id = ? AND ingredient_name = ? AND quantity = ? AND unit = ? AND deleted_at IS NULL`,
                        [newRecipeId, ing.ingredient_name, ing.quantity, ing.unit]);
                    if (exists.length > 0) continue;
                }
                db.run(`INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, price)
                    VALUES (?, ?, ?, ?, ?)`, [newRecipeId, ing.ingredient_name, ing.quantity, ing.unit || 'kg', ing.price || 0]);
                imported.recipeIngredients++;
            } catch (e) { errors.push(`Ingrediente "${ing.ingredient_name}": ${e.message}`); }
        }

        for (const ri of (salvaData.receta_insumos || [])) {
            try {
                const newRecipeId = recipeIdMap[ri.receta_id];
                if (!newRecipeId) continue;
                const insumoExists = query('SELECT id FROM insumos WHERE id = ? AND negocio_id = ? AND deleted_at IS NULL', [ri.insumo_id, negocioId]);
                if (insumoExists.length === 0) continue;
                if (mode === 'merge') {
                    const exists = query(`SELECT id FROM receta_insumos 
                         WHERE receta_id = ? AND insumo_id = ? AND cantidad = ? AND deleted_at IS NULL`,
                        [newRecipeId, ri.insumo_id, ri.cantidad]);
                    if (exists.length > 0) continue;
                }
                db.run(`INSERT INTO receta_insumos (receta_id, insumo_id, cantidad, unidad)
                    VALUES (?, ?, ?, ?)`, [newRecipeId, ri.insumo_id, ri.cantidad, ri.unidad || 'kg']);
                imported.recetaInsumos++;
            } catch (e) { errors.push(`Receta-insumo: ${e.message}`); }
        }

        for (const prod of (salvaData.productos || [])) {
            try {
                let existingProduct = null;
                if (mode === 'merge') {
                    const existing = query('SELECT id FROM productos WHERE negocio_id = ? AND nombre = ? AND deleted_at IS NULL', [negocioId, prod.nombre]);
                    if (existing.length > 0) existingProduct = existing[0];
                }
                let newRecetaId = null;
                if (prod.receta_id && recipeIdMap[prod.receta_id]) newRecetaId = recipeIdMap[prod.receta_id];

                if (existingProduct) {
                    db.run(`UPDATE productos SET descripcion = ?, precio_venta = ?, unidad_venta = ?,
                            cantidad_por_unidad = ?, receta_id = ?, modified_by = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ? AND negocio_id = ?`, [
                        prod.descripcion || null, prod.precio_venta || 0,
                        prod.unidad_venta || 'unidad', prod.cantidad_por_unidad || 1,
                        newRecetaId, currentUserId, existingProduct.id, negocioId]);
                    skipped.productos++;
                } else {
                    db.run(`INSERT INTO productos (user_id, negocio_id, nombre, descripcion, precio_venta, 
                            unidad_venta, cantidad_por_unidad, receta_id, created_by, modified_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                        user.id, negocioId, prod.nombre, prod.descripcion || null,
                        prod.precio_venta || 0, prod.unidad_venta || 'unidad',
                        prod.cantidad_por_unidad || 1, newRecetaId, currentUserId, currentUserId]);
                    imported.productos++;
                }
            } catch (e) { errors.push(`Producto "${prod.nombre}": ${e.message}`); }
        }

        saveDatabase();
        saveAndNotify();
        return { success: true, imported, skipped, errors, mode };
    } catch (error) { return { success: false, error: error.message }; }
}

function readSalvaFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try { resolve(JSON.parse(e.target.result)); } catch (err) { reject(new Error('El archivo no es un JSON válido')); }
        };
        reader.onerror = function() { reject(new Error('Error al leer el archivo')); };
        reader.readAsText(file);
    });
}

// ============================================================
// PRODUCTOS
// ============================================================

function getProductos() {
    const negocioId = getNegocioIdActual();
    return query('SELECT p.*, r.name as receta_nombre FROM productos p LEFT JOIN recipes r ON p.receta_id = r.id WHERE p.negocio_id = ? AND p.deleted_at IS NULL ORDER BY p.nombre', [negocioId]);
}

function getProducto(id) {
    const negocioId = getNegocioIdActual();
    const results = query('SELECT p.*, r.name as receta_nombre FROM productos p LEFT JOIN recipes r ON p.receta_id = r.id WHERE p.id = ? AND p.negocio_id = ? AND p.deleted_at IS NULL', [id, negocioId]);
    return results.length > 0 ? results[0] : null;
}

function saveProducto(productoData) {
    const user = window.AuthModule?.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    const negocioId = getNegocioIdActual();
    const currentUserId = getCurrentUserId();

    try {
        if (productoData.id) {
            execute(`UPDATE productos SET nombre = ?, descripcion = ?, precio_venta = ?, 
                    unidad_venta = ?, cantidad_por_unidad = ?, receta_id = ?, modified_by = ?
                WHERE id = ? AND negocio_id = ?`, [
                productoData.nombre, productoData.descripcion || null,
                productoData.precio_venta || 0, productoData.unidad_venta || 'unidad',
                productoData.cantidad_por_unidad || 1, productoData.receta_id || null,
                currentUserId, productoData.id, negocioId]);
            return { success: true, id: productoData.id };
        } else {
            const result = execute(`INSERT INTO productos 
                (user_id, negocio_id, nombre, descripcion, precio_venta, unidad_venta, cantidad_por_unidad, receta_id, created_by, modified_by, uuid)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                user.id, negocioId, productoData.nombre, productoData.descripcion || null,
                productoData.precio_venta || 0, productoData.unidad_venta || 'unidad',
                productoData.cantidad_por_unidad || 1, productoData.receta_id || null,
                currentUserId, currentUserId, generateUuidForTable('productos')]);
            return { success: true, id: result.lastId };
        }
    } catch (e) { return { success: false, error: e.message }; }
}

function deleteProducto(id) {
    const negocioId = getNegocioIdActual();
    try {
        execute('UPDATE productos SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND negocio_id = ?', [id, negocioId]);
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
}

// ============================================================
// INSUMOS
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
    const results = query('SELECT * FROM insumos WHERE negocio_id = ? AND LOWER(nombre) = LOWER(?) AND deleted_at IS NULL LIMIT 1', [negocioId, nombre]);
    return results.length > 0 ? results[0] : null;
}

function saveInsumo(insumoData) {
    const user = window.AuthModule?.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    const negocioId = getNegocioIdActual();
    const currentUserId = getCurrentUserId();

    try {
        if (insumoData.id) {
            execute(`UPDATE insumos SET nombre = ?, unidad = ?, costo_unitario = ?, stock = ?, 
                    stock_minimo = ?, modified_by = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND negocio_id = ?`, [
                insumoData.nombre, insumoData.unidad || 'kg',
                insumoData.costo_unitario || 0, insumoData.stock || 0,
                insumoData.stock_minimo || 0, currentUserId, insumoData.id, negocioId]);
            return { success: true, id: insumoData.id };
        } else {
            const result = execute(`INSERT INTO insumos 
                (user_id, negocio_id, nombre, unidad, costo_unitario, stock, stock_minimo, created_by, modified_by, uuid)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                user.id, negocioId, insumoData.nombre, insumoData.unidad || 'kg',
                insumoData.costo_unitario || 0, insumoData.stock || 0,
                insumoData.stock_minimo || 0, currentUserId, currentUserId,
                generateUuidForTable('insumos')]);
            return { success: true, id: result.lastId };
        }
    } catch (e) { return { success: false, error: e.message }; }
}

function deleteInsumo(id) {
    const negocioId = getNegocioIdActual();
    try {
        execute('UPDATE insumos SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND negocio_id = ?', [id, negocioId]);
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
}

function actualizarStockInsumo(id, cantidad) {
    const negocioId = getNegocioIdActual();
    const currentUserId = getCurrentUserId();
    try {
        const insumo = getInsumo(id);
        if (!insumo) return { success: false, error: 'Insumo no encontrado' };
        const nuevoStock = (insumo.stock || 0) + cantidad;
        if (nuevoStock < 0) return { success: false, error: 'Stock insuficiente' };
        execute(`UPDATE insumos SET stock = ?, modified_by = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND negocio_id = ?`, [nuevoStock, currentUserId, id, negocioId]);
        return { success: true, stock: nuevoStock };
    } catch (e) { return { success: false, error: e.message }; }
}

// ============================================================
// RECETA_INSUMOS
// ============================================================

function getRecetaInsumos(recetaId) {
    const negocioId = getNegocioIdActual();
    return query(`SELECT ri.*, i.nombre as insumo_nombre, i.unidad as insumo_unidad, i.costo_unitario
        FROM receta_insumos ri JOIN insumos i ON ri.insumo_id = i.id
        JOIN recipes r ON ri.receta_id = r.id
        WHERE ri.receta_id = ? AND ri.deleted_at IS NULL AND r.negocio_id = ?`, [recetaId, negocioId]);
}

function saveRecetaInsumo(data) {
    const user = window.AuthModule?.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    try {
        if (data.id) {
            execute(`UPDATE receta_insumos SET cantidad = ?, unidad = ? WHERE id = ? AND receta_id = ?`,
                [data.cantidad, data.unidad || 'kg', data.id, data.receta_id]);
            return { success: true, id: data.id };
        } else {
            const result = execute(`INSERT INTO receta_insumos (receta_id, insumo_id, cantidad, unidad, uuid)
                VALUES (?, ?, ?, ?, ?)`, [data.receta_id, data.insumo_id, data.cantidad, data.unidad || 'kg',
                generateUuidForTable('receta_insumos')]);
            return { success: true, id: result.lastId };
        }
    } catch (e) { return { success: false, error: e.message }; }
}

function deleteRecetaInsumo(id) {
    try {
        execute('DELETE FROM receta_insumos WHERE id = ?', [id]);
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
}

// ============================================================
// CALCULAR COSTO DE PRODUCTO
// ============================================================

function calcularCostoProducto(productoId) {
    try {
        const producto = getProducto(productoId);
        if (!producto) return { success: false, error: 'Producto no encontrado' };
        if (!producto.receta_id) return { success: true, costo_total: 0, costo_por_unidad: 0, costo_por_producto: 0 };
        
        const recetaInsumos = getRecetaInsumos(producto.receta_id);
        if (recetaInsumos.length === 0) return { success: true, costo_total: 0, costo_por_unidad: 0, costo_por_producto: 0 };
        
        let costoTotal = 0;
        for (const ri of recetaInsumos) costoTotal += ri.cantidad * (ri.costo_unitario || 0);
        
        const recipe = getDB().exec(`SELECT yield_units FROM recipes WHERE id = ${producto.receta_id}`);
        const rendimiento = recipe[0]?.values?.[0]?.[0] || 1;
        const costoPorUnidad = costoTotal / rendimiento;
        const costoPorProducto = costoPorUnidad * (producto.cantidad_por_unidad || 1);
        
        return { success: true, costo_total: costoTotal, costo_por_unidad: costoPorUnidad,
            costo_por_producto: costoPorProducto, rendimiento, insumos: recetaInsumos };
    } catch (e) { return { success: false, error: e.message }; }
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
    const results = query('SELECT * FROM inventory WHERE negocio_id = ? AND product_name = ? AND deleted_at IS NULL', [negocioId, productName]);
    return results.length > 0 ? results[0] : null;
}

function saveInventoryItem(itemData) {
    const user = window.AuthModule?.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    const negocioId = getNegocioIdActual();

    try {
        if (itemData.id) {
            execute(`UPDATE inventory SET product_name = ?, quantity = ?, unit = ?, unit_id = ?,
                    cost = ?, min_stock = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ? AND negocio_id = ?`, [
                itemData.product_name, itemData.quantity || 0, itemData.unit || 'kg',
                itemData.unit_id || null, itemData.cost || 0, itemData.min_stock || 0, itemData.id, negocioId]);
            return { success: true, id: itemData.id };
        } else {
            const existing = getInventoryItemByName(itemData.product_name);
            if (existing) {
                const newQuantity = (existing.quantity || 0) + (itemData.quantity || 0);
                execute(`UPDATE inventory SET quantity = ?, cost = ?, last_updated = CURRENT_TIMESTAMP
                    WHERE id = ? AND negocio_id = ?`, [newQuantity, itemData.cost || existing.cost || 0, existing.id, negocioId]);
                return { success: true, id: existing.id, updated: true };
            } else {
                const result = execute(`INSERT INTO inventory 
                    (user_id, negocio_id, product_name, quantity, unit, unit_id, cost, min_stock)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                    user.id, negocioId, itemData.product_name, itemData.quantity || 0,
                    itemData.unit || 'kg', itemData.unit_id || null, itemData.cost || 0, itemData.min_stock || 0]);
                return { success: true, id: result.lastId };
            }
        }
    } catch (e) { return { success: false, error: e.message }; }
}

function deleteInventoryItem(id) {
    const negocioId = getNegocioIdActual();
    try {
        execute('UPDATE inventory SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND negocio_id = ?', [id, negocioId]);
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
}

// ============================================================
// UNIDADES
// ============================================================

function getUnits() { return query('SELECT * FROM units WHERE deleted_at IS NULL ORDER BY name'); }
function getUnitsByCategory(category) { return query('SELECT * FROM units WHERE category = ? AND deleted_at IS NULL ORDER BY name', [category]); }
function getUnit(id) {
    const results = query('SELECT * FROM units WHERE id = ? AND deleted_at IS NULL', [id]);
    return results.length > 0 ? results[0] : null;
}
function addUnit(name, abbreviation, category = 'other') {
    try {
        execute('INSERT INTO units (name, abbreviation, category) VALUES (?, ?, ?)', [name.trim(), abbreviation.trim(), category]);
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
}

// ============================================================
// CORRIENTE CONFIG
// ============================================================

function getCorrienteConfig() {
    const negocioId = getNegocioIdActual();
    const results = query('SELECT * FROM corriente_config WHERE negocio_id = ? AND deleted_at IS NULL LIMIT 1', [negocioId]);
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
            execute(`UPDATE corriente_config SET horas_corriente = ?, horas_apagon = ?, 
                    fecha_referencia = ?, hora_inicio_referencia = ?, hora_fin_referencia = ?, 
                    modified_by = ?, updated_at = CURRENT_TIMESTAMP WHERE negocio_id = ?`, [
                config.horasCorriente || 3, config.horasApagon || 12,
                config.fechaReferencia || null, config.horaInicioReferencia || null,
                config.horaFinReferencia || null, currentUserId, negocioId]);
        } else {
            execute(`INSERT INTO corriente_config 
                (user_id, negocio_id, horas_corriente, horas_apagon, fecha_referencia, 
                 hora_inicio_referencia, hora_fin_referencia, created_by, modified_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                user.id, negocioId, config.horasCorriente || 3, config.horasApagon || 12,
                config.fechaReferencia || null, config.horaInicioReferencia || null,
                config.horaFinReferencia || null, currentUserId, currentUserId]);
        }
        saveAndNotify();
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
}

// ============================================================
// WAITING LIST
// ============================================================

function getWaitingList() {
    const negocioId = getNegocioIdActual();
    return query(`SELECT w.*, o.total as order_total, o.delivery_date, o.client_name as order_client_name
        FROM waiting_list w JOIN orders o ON w.order_id = o.id
        WHERE w.negocio_id = ? AND w.deleted_at IS NULL AND w.status = 'waiting'
        ORDER BY w.position ASC`, [negocioId]);
}

function getWaitingListCount() {
    const negocioId = getNegocioIdActual();
    const result = query(`SELECT COUNT(*) as count FROM waiting_list 
        WHERE negocio_id = ? AND deleted_at IS NULL AND status = 'waiting'`, [negocioId]);
    return result[0]?.count || 0;
}

function getNextWaitingPosition() {
    const negocioId = getNegocioIdActual();
    const result = query(`SELECT MAX(position) as max_pos FROM waiting_list 
        WHERE negocio_id = ? AND deleted_at IS NULL AND status = 'waiting'`, [negocioId]);
    return (result[0]?.max_pos || 0) + 1;
}

function addToWaitingList(orderId) {
    const user = window.AuthModule?.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    const negocioId = getNegocioIdActual();
    const currentUserId = getCurrentUserId();

    try {
        const existing = query('SELECT id FROM waiting_list WHERE order_id = ? AND negocio_id = ? AND deleted_at IS NULL', [orderId, negocioId]);
        if (existing.length > 0) return { success: false, error: 'El pedido ya está en la lista de espera' };
        
        const position = getNextWaitingPosition();
        const result = execute(`INSERT INTO waiting_list 
            (user_id, negocio_id, order_id, position, status, client_name, client_phone, product_name, quantity, created_by, modified_by, uuid)
            SELECT ?, ?, o.id, ?, 'waiting', o.client_name, o.client_phone,
                COALESCE((SELECT GROUP_CONCAT(DISTINCT p.nombre) FROM order_items oi 
                    JOIN productos p ON oi.producto_id = p.id WHERE oi.order_id = o.id AND oi.deleted_at IS NULL), 'Producto'),
                COALESCE((SELECT SUM(quantity) FROM order_items WHERE order_id = o.id AND deleted_at IS NULL), 1),
                ?, ?, ?
            FROM orders o WHERE o.id = ? AND o.negocio_id = ?`, [
            user.id, negocioId, position, currentUserId, currentUserId,
            generateUuidForTable('waiting_list'), orderId, negocioId]);
        
        execute('UPDATE orders SET status = ? WHERE id = ? AND negocio_id = ?', ['waiting', orderId, negocioId]);
        return { success: true, id: result.lastId, position };
    } catch (e) { return { success: false, error: e.message }; }
}

function removeFromWaitingList(orderId) {
    const negocioId = getNegocioIdActual();
    try {
        execute('UPDATE waiting_list SET deleted_at = CURRENT_TIMESTAMP WHERE order_id = ? AND negocio_id = ? AND deleted_at IS NULL', [orderId, negocioId]);
        reindexWaitingList();
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
}

function reindexWaitingList() {
    const negocioId = getNegocioIdActual();
    try {
        const items = query(`SELECT id FROM waiting_list WHERE negocio_id = ? AND deleted_at IS NULL AND status = 'waiting' ORDER BY position ASC`, [negocioId]);
        let pos = 1;
        for (const item of items) {
            execute('UPDATE waiting_list SET position = ? WHERE id = ?', [pos, item.id]);
            pos++;
        }
    } catch (e) {}
}

function attendFromWaitingList(orderId) {
    const user = window.AuthModule?.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    const negocioId = getNegocioIdActual();
    try {
        const waitingItem = query(`SELECT * FROM waiting_list WHERE order_id = ? AND negocio_id = ? AND deleted_at IS NULL AND status = 'waiting'`, [orderId, negocioId]);
        if (waitingItem.length === 0) return { success: false, error: 'El pedido no está en la lista de espera' };
        
        execute(`UPDATE waiting_list SET status = 'attended', attended_at = CURRENT_TIMESTAMP, deleted_at = CURRENT_TIMESTAMP
            WHERE order_id = ? AND negocio_id = ?`, [orderId, negocioId]);
        execute('UPDATE orders SET status = ? WHERE id = ? AND negocio_id = ?', ['waiting_bought', orderId, negocioId]);
        reindexWaitingList();
        
        if (window.OrdersModule && window.OrdersModule.registrarVentaDesdePedido) {
            window.OrdersModule.registrarVentaDesdePedido(orderId);
        }
        return { success: true, message: 'Cliente atendido desde lista de espera' };
    } catch (e) { return { success: false, error: e.message }; }
}

function getWaitingListWithDetails(excludeOrderId = null) {
    const negocioId = getNegocioIdActual();
    let sql = `SELECT w.id as waiting_id, w.order_id, w.position, w.client_name,
            w.client_phone, w.product_name, w.quantity, w.notes,
            o.total as order_total, o.delivery_date
        FROM waiting_list w JOIN orders o ON w.order_id = o.id
        WHERE w.negocio_id = ? AND w.deleted_at IS NULL AND w.status = 'waiting' AND o.deleted_at IS NULL`;
    let params = [negocioId];
    if (excludeOrderId) { sql += ' AND w.order_id != ?'; params.push(excludeOrderId); }
    sql += ' ORDER BY w.position ASC';
    try { return query(sql, params); } catch (e) { return []; }
}

function atenderParcialmenteDeLista(orderId, cantidadAtendida, cantidadTotalOriginal) {
    const negocioId = getNegocioIdActual();
    try {
        const cantidadRestante = cantidadTotalOriginal - cantidadAtendida;
        if (cantidadRestante <= 0) return attendFromWaitingList(orderId);
        
        execute(`UPDATE waiting_list SET quantity = ?, updated_at = CURRENT_TIMESTAMP
            WHERE order_id = ? AND negocio_id = ? AND deleted_at IS NULL`, [cantidadRestante, orderId, negocioId]);
        
        const orderItems = query(`SELECT id, quantity, unit_price FROM order_items WHERE order_id = ? AND deleted_at IS NULL`, [orderId]);
        if (orderItems.length > 0) {
            const item = orderItems[0];
            const nuevaCantidad = item.quantity - cantidadAtendida;
            if (nuevaCantidad <= 0) {
                execute('UPDATE order_items SET deleted_at = CURRENT_TIMESTAMP WHERE order_id = ?', [orderId]);
            } else {
                execute(`UPDATE order_items SET quantity = ?, subtotal = ? * unit_price WHERE id = ?`, [nuevaCantidad, nuevaCantidad, item.id]);
            }
        }
        
        const nuevoTotal = query(`SELECT SUM(subtotal) as total FROM order_items WHERE order_id = ? AND deleted_at IS NULL`, [orderId]);
        execute(`UPDATE orders SET total = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND negocio_id = ?`, [nuevoTotal[0]?.total || 0, orderId, negocioId]);
        reindexWaitingList();
        return { success: true, message: `Atendido parcialmente (${cantidadAtendida} unidades)`, cantidadRestante };
    } catch (e) { return { success: false, error: e.message }; }
}

// ============================================================
// VENTAS - RESUMEN DIARIO
// ============================================================

function getDailySummary(negocioId, filters = {}) {
    let sql = `SELECT DATE(sale_date) as dia, COUNT(*) as total_ventas, SUM(total) as monto_total,
            SUM(CASE WHEN is_debt = 1 AND paid = 0 THEN 1 ELSE 0 END) as deudas_count,
            SUM(CASE WHEN is_liberated = 1 THEN 1 ELSE 0 END) as liberadas_count,
            SUM(CASE WHEN is_liberated = 1 THEN total ELSE 0 END) as liberadas_monto
        FROM sales WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0`;
    let params = [negocioId];
    if (filters.from_date) { sql += ' AND DATE(sale_date) >= DATE(?)'; params.push(filters.from_date); }
    if (filters.to_date) { sql += ' AND DATE(sale_date) <= DATE(?)'; params.push(filters.to_date); }
    sql += ' GROUP BY DATE(sale_date) ORDER BY dia DESC';
    return query(sql, params);
}

// ============================================================
// PREMIOS
// ============================================================

function getPremiosConfig() {
    const negocioId = getNegocioIdActual();
    try {
        const results = query('SELECT * FROM premios_config WHERE negocio_id = ? AND deleted_at IS NULL LIMIT 1', [negocioId]);
        if (results.length === 0) return { activo: false, premio_mensual: '', premio_anual: '' };
        return { ...results[0], activo: results[0].activo === 1 };
    } catch (e) { return { activo: false, premio_mensual: '', premio_anual: '' }; }
}

function savePremiosConfig(config) {
    const negocioId = getNegocioIdActual();
    const currentUserId = getCurrentUserId();
    try {
        const existing = query('SELECT id FROM premios_config WHERE negocio_id = ? LIMIT 1', [negocioId]);
        if (existing.length > 0) {
            execute(`UPDATE premios_config SET activo = ?, premio_mensual = ?, premio_anual = ?, 
                    modified_by = ?, updated_at = CURRENT_TIMESTAMP WHERE negocio_id = ?`, [
                config.activo ? 1 : 0, config.premio_mensual || '', config.premio_anual || '',
                currentUserId, negocioId]);
        } else {
            execute(`INSERT INTO premios_config (negocio_id, activo, premio_mensual, premio_anual, created_by, modified_by)
                VALUES (?, ?, ?, ?, ?, ?)`, [negocioId, config.activo ? 1 : 0, config.premio_mensual || '',
                config.premio_anual || '', currentUserId, currentUserId]);
        }
        saveAndNotify();
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
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
        
        const results = query(`SELECT buyer, COUNT(*) as compras, SUM(total) as total_gastado
            FROM sales WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0
              AND buyer IS NOT NULL AND buyer != '' AND buyer != 'Cliente sin nombre' AND buyer != 'Cliente ocasional'
              AND DATE(sale_date) >= DATE(?) AND DATE(sale_date) <= DATE(?)
            GROUP BY buyer ORDER BY total_gastado DESC LIMIT 1`, [negocioId, inicioMes, finMes]);
        
        if (results.length === 0) return null;
        return { buyer: results[0].buyer, compras: results[0].compras, total_gastado: results[0].total_gastado, periodo: `${month}/${year}` };
    } catch (e) { return null; }
}

function calcularMejorClienteDelAño() {
    const negocioId = getNegocioIdActual();
    try {
        const now = new Date();
        const year = now.getFullYear();
        const results = query(`SELECT buyer, COUNT(*) as compras, SUM(total) as total_gastado
            FROM sales WHERE negocio_id = ? AND deleted_at IS NULL AND voided = 0
              AND buyer IS NOT NULL AND buyer != '' AND buyer != 'Cliente sin nombre' AND buyer != 'Cliente ocasional'
              AND DATE(sale_date) >= DATE(?) AND DATE(sale_date) <= DATE(?)
            GROUP BY buyer ORDER BY total_gastado DESC LIMIT 1`, [negocioId, `${year}-01-01`, `${year}-12-31`]);
        
        if (results.length === 0) return null;
        return { buyer: results[0].buyer, compras: results[0].compras, total_gastado: results[0].total_gastado, periodo: `${year}` };
    } catch (e) { return null; }
}

// ============================================================
// EXPORTAR BASE DE DATOS
// ============================================================

function exportDatabase(backupType = BACKUP_TYPE_COMPLETE) {
    try {
        if (!sqlJsInstance) return { success: false, error: 'SQL.js no está inicializado.' };
        if (!db) return { success: false, error: 'Base de datos no inicializada.' };
        
        const dbData = db.export();
        const cloneDb = new sqlJsInstance.Database(dbData);
        writeBackupMeta(cloneDb, backupType);
        const finalData = cloneDb.export();
        cloneDb.close();
        
        return { success: true, data: Array.from(finalData), size: finalData.length,
            timestamp: new Date().toISOString(), backupType };
    } catch (error) { return { success: false, error: error.message }; }
}

function downloadDatabase(backupType = BACKUP_TYPE_COMPLETE) {
    try {
        const user = window.AuthModule?.getCurrentUser();
        if (backupType === BACKUP_TYPE_COMPLETE && user && user.is_admin !== 1) {
            if (window.showToast) window.showToast('⚠️ Solo el administrador puede crear una copia completa', 'warning', 5000);
            return { success: false, error: 'Solo el administrador puede crear una copia completa' };
        }
        
        const result = exportDatabase(backupType);
        if (!result.success) {
            if (window.showToast) window.showToast('❌ Error al exportar: ' + result.error, 'error', 5000);
            return { success: false, error: result.error };
        }

        const blob = new Blob([new Uint8Array(result.data)], { type: 'application/x-sqlite3' });
        const url = URL.createObjectURL(blob);
        const date = new Date().toISOString().split('T')[0];
        const sufijo = backupType === BACKUP_TYPE_COMPLETE ? 'completo' : 'datos';
        const filename = `${getPrefijoBackup()}_${sufijo}_${date}.db`;
        
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (window.showToast) {
            const tipoLabel = backupType === BACKUP_TYPE_COMPLETE ? 'completa' : 'solo datos';
            window.showToast(`✅ Copia de seguridad (${tipoLabel}) exportada (${(result.size / 1024).toFixed(1)} KB)`, 'success');
        }
        return { success: true, filename, size: result.size };
    } catch (error) {
        if (window.showToast) window.showToast('❌ Error: ' + error.message, 'error', 5000);
        return { success: false, error: error.message };
    }
}

// ============================================================
// IMPORTAR BASE DE DATOS - MODO COMPLETO (REEMPLAZA TODO)
// ============================================================

function importDatabase(file) {
    return new Promise((resolve, reject) => {
        try {
            const reader = new FileReader();
            
            reader.onload = async function(e) {
                let newDb = null;
                try {
                    const dataArray = new Uint8Array(e.target.result);
                    
                    if (dataArray.length === 0) { reject(new Error('El archivo está vacío')); return; }
                    const header = new TextDecoder().decode(dataArray.slice(0, 16));
                    if (!header.includes('SQLite')) { reject(new Error('No es un archivo SQLite válido')); return; }
                    if (!sqlJsInstance) { reject(new Error('SQL.js no está inicializado.')); return; }
                    
                    newDb = new sqlJsInstance.Database(dataArray);
                    const meta = readBackupMeta(newDb);
                    console.log('🔖 Marca del backup:', meta);
                    
                    const user = window.AuthModule?.getCurrentUser();
                    const isAdmin = user && user.is_admin === 1;
                    
                    if (meta.type === BACKUP_TYPE_COMPLETE && !isAdmin) {
                        newDb.close(); newDb = null;
                        reject(new Error('⚠️ Esta es una copia COMPLETA. Solo el administrador puede importarla.'));
                        return;
                    }
                    
                    if (meta.type === BACKUP_TYPE_DATA_ONLY) {
                        newDb.close(); newDb = null;
                        importDatabaseDataOnly(file).then(resolve).catch(reject);
                        return;
                    }
                    
                    if (meta.type === 'unknown' && !isAdmin) {
                        newDb.close(); newDb = null;
                        reject(new Error('⚠️ Esta copia no tiene marca de tipo. Solo el administrador puede importarla.'));
                        return;
                    }
                    
                    const tables = newDb.exec("SELECT name FROM sqlite_master WHERE type='table'");
                    const tableNames = tables[0]?.values?.map(row => row[0]) || [];
                    const requiredTables = ['users', 'recipes', 'sales', 'orders', 'clients', 'products'];
                    const missingTables = requiredTables.filter(t => !tableNames.includes(t));
                    
                    if (missingTables.length > 0) {
                        newDb.close(); newDb = null;
                        reject(new Error(`Faltan tablas: ${missingTables.join(', ')}`));
                        return;
                    }
                    
                    try { newDb.run(`DROP TABLE IF EXISTS ${BACKUP_META_TABLE}`); } catch (e) {}
                    
                    const exportData = newDb.export();
                    localStorage.setItem('panario_db_data', JSON.stringify(Array.from(exportData)));
                    
                    if (db) { try { db.close(); } catch (e) {} }
                    db = newDb;
                    newDb = null;
                    dbInitialized = true;
                    saveDatabase();
                    
                    resolve({ success: true, tables: tableNames, size: dataArray.length, meta });
                } catch (error) {
                    reject(error);
                } finally {
                    if (newDb) { try { newDb.close(); } catch (e) {} }
                }
            };
            
            reader.onerror = function() { reject(new Error('Error al leer el archivo')); };
            reader.readAsArrayBuffer(file);
        } catch (error) { reject(error); }
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
            if (!file) { resolve({ success: false, error: 'No se seleccionó archivo' }); return; }
            
            const user = window.AuthModule?.getCurrentUser();
            const isAdmin = user && user.is_admin === 1;
            
            const confirm = await window.ModalModule.showConfirm({
                title: '📥 Importar copia de seguridad',
                message: `¿Seguro que quieres importar "${file.name}"?\n\n⚠️ Esto reemplazará TODOS los datos actuales${isAdmin ? ' (incluyendo usuarios y negocios)' : ''}.`,
                confirmText: 'Sí, importar', cancelText: 'Cancelar',
                icon: '⚠️', confirmColor: '#ef4444'
            });
            
            if (!confirm) { resolve({ success: false, error: 'Cancelado' }); return; }
            
            try {
                const result = await window.DBModule.importDatabase(file);
                resolve(result);
            } catch (error) { resolve({ success: false, error: error.message }); }
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    });
}

// ============================================================
// 🆕 FASE 1.3.3: HELPERS DE FUSIÓN
// ============================================================

/**
 * Busca un duplicado por datos cuando el registro no tiene uuid.
 * 
 * @param {Object} db - Instancia de la BD local
 * @param {string} tabla - Nombre de la tabla
 * @param {Object} row - Objeto con los valores del registro de backup
 * @returns {number|null} ID del registro local si existe, null si no
 */
function findDuplicateByData(db, tabla, row) {
    try {
        // Columnas de comparación por tabla
        const comparadores = {
            'orders': { cols: ['client_name', 'delivery_date', 'total'], extra: ['deleted_at IS NULL'] },
            'sales': { cols: ['product_name', 'sale_date', 'total'], extra: ['deleted_at IS NULL'] },
            'transactions': { cols: ['concept', 'transaction_date', 'amount'], extra: ['deleted_at IS NULL'] },
            'recipes': { cols: ['name', 'yield_units'], extra: ['deleted_at IS NULL'] },
            'productos': { cols: ['nombre', 'precio_venta'], extra: ['deleted_at IS NULL'] },
            'insumos': { cols: ['nombre', 'unidad', 'costo_unitario'], extra: ['deleted_at IS NULL'] },
            'clients': { cols: ['name', 'phone'], extra: ['deleted_at IS NULL'] },
            'bank_accounts': { cols: ['bank', 'account_number'], extra: ['deleted_at IS NULL'] },
            'order_items': { cols: ['order_id', 'product_name', 'quantity', 'unit_price'], extra: ['deleted_at IS NULL'] }
        };
        
        const config = comparadores[tabla];
        if (!config) return null;  // No hay criterio de comparación
        
        // Construir WHERE
        const where = [];
        const params = [];
        for (const col of config.cols) {
            const val = row[col];
            if (val === undefined || val === null) return null;  // Sin datos para comparar
            where.push(`${col} = ?`);
            params.push(val);
        }
        for (const ex of (config.extra || [])) {
            where.push(ex);
        }
        
        const sql = `SELECT id FROM ${tabla} WHERE ${where.join(' AND ')} LIMIT 1`;
        const stmt = db.prepare(sql);
        stmt.bind(params);
        let result = null;
        if (stmt.step()) {
            result = stmt.getAsObject().id;
        }
        stmt.free();
        return result;
    } catch (e) {
        console.warn(`⚠️ Error buscando duplicado en ${tabla}:`, e.message);
        return null;
    }
}

/**
 * Compara dos fechas de modificación. Devuelve true si la primera es más reciente.
 * Si ambas están vacías o empatan, gana el local (devuelve false).
 */
function esBackupMasReciente(fechaBackup, fechaLocal) {
    // Si alguna está vacía, gana el local (conservador)
    if (!fechaBackup || !fechaLocal) return false;
    
    try {
        const b = new Date(fechaBackup).getTime();
        const l = new Date(fechaLocal).getTime();
        if (isNaN(b) || isNaN(l)) return false;
        return b > l;  // Solo si backup es estrictamente más reciente
    } catch (e) {
        return false;
    }
}

/**
 * Fusiona una tabla completa usando uuid y regla de última modificación.
 * 
 * @param {Object} localDb - Instancia de la BD local (destino)
 * @param {Object} backupDb - Instancia de la BD de backup (fuente)
 * @param {string} tabla - Nombre de la tabla
 * @param {number} negocioIdActual - ID del negocio actual
 * @param {Object} uuidMap - Mapa { uuid_backup: id_local } para re-mapear FK
 * @returns {Object} Estadísticas { inserted, updated, skipped, errors }
 */
function fusionarTabla(localDb, backupDb, tabla, negocioIdActual, uuidMap) {
    const stats = { inserted: 0, updated: 0, skipped: 0, errors: [] };
    
    try {
        // Verificar que la tabla existe en ambos lados
        const localCheck = localDb.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tabla}'`);
        if (localCheck.length === 0 || localCheck[0].values.length === 0) return stats;
        
        const backupCheck = backupDb.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tabla}'`);
        if (backupCheck.length === 0 || backupCheck[0].values.length === 0) return stats;
        
        // Columnas locales y de backup
        const localColsResult = localDb.exec(`PRAGMA table_info(${tabla})`);
        const localCols = localColsResult[0]?.values?.map(r => r[1]) || [];
        
        const backupColsResult = backupDb.exec(`PRAGMA table_info(${tabla})`);
        const backupCols = backupColsResult[0]?.values?.map(r => r[1]) || [];
        
        // Columnas comunes (excluir id)
        const colsComunes = localCols.filter(c => backupCols.includes(c) && c !== 'id');
        
        // ¿Tiene la tabla columna uuid?
        const tieneUuid = colsComunes.includes('uuid');
        
        // ¿Tiene columna de modificación?
        const colModificacion = colsComunes.includes('modified_at') ? 'modified_at' :
                                colsComunes.includes('updated_at') ? 'updated_at' : null;
        
        // Leer todas las filas del backup
        const backupRows = backupDb.exec(`SELECT * FROM ${tabla}`);
        if (backupRows.length === 0 || !backupRows[0].values) return stats;
        
        const backupColumns = backupRows[0].columns;
        const filasBackup = backupRows[0].values;
        
        // Detectar qué columna es la FK negocio_id
        const tieneNegocioId = localCols.includes('negocio_id');
        const idxNegocioIdLocal = localCols.indexOf('negocio_id');
        const idxNegocioIdBackup = backupColumns.indexOf('negocio_id');
        
        // Preparar consulta de búsqueda por uuid
        let sqlBuscarUuid = null;
        if (tieneUuid) {
            sqlBuscarUuid = `SELECT * FROM ${tabla} WHERE uuid = ? LIMIT 1`;
        }
        
        for (const fila of filasBackup) {
            try {
                // Construir objeto row a partir de la fila
                const row = {};
                backupColumns.forEach((col, i) => { row[col] = fila[i]; });
                
                const uuidBackup = tieneUuid ? row.uuid : null;
                let registroLocal = null;
                let idLocalExistente = null;
                
                // 1. Buscar por uuid si existe
                if (uuidBackup) {
                    const stmt = localDb.prepare(sqlBuscarUuid);
                    stmt.bind([uuidBackup]);
                    if (stmt.step()) {
                        registroLocal = stmt.getAsObject();
                        idLocalExistente = registroLocal.id;
                    }
                    stmt.free();
                }
                
                // 2. Si no tiene uuid o no se encontró, buscar por datos
                if (!idLocalExistente) {
                    const dupId = findDuplicateByData(localDb, tabla, row);
                    if (dupId) {
                        // Guardar mapeo uuid → id_local aunque no haya uuid en backup
                        if (uuidBackup) uuidMap[uuidBackup] = dupId;
                        stats.skipped++;
                        continue;
                    }
                }
                
                // 3. Decisión: insert o update
                if (idLocalExistente) {
                    // Existe → comparar fechas de modificación
                    const fechaBackup = colModificacion ? row[colModificacion] : null;
                    const fechaLocal = colModificacion ? registroLocal[colModificacion] : null;
                    
                    if (esBackupMasReciente(fechaBackup, fechaLocal)) {
                        // UPDATE
                        const colsUpdate = colsComunes.filter(c => 
                            c !== 'uuid' && c !== 'created_at' && c !== 'id' && c !== 'negocio_id'
                        );
                        const setClause = colsUpdate.map(c => `${c} = ?`).join(', ');
                        const valores = colsUpdate.map(c => row[c]);
                        
                        localDb.run(`UPDATE ${tabla} SET ${setClause} WHERE id = ?`, [...valores, idLocalExistente]);
                        
                        if (uuidBackup) uuidMap[uuidBackup] = idLocalExistente;
                        stats.updated++;
                    } else {
                        // Local gana → skip
                        if (uuidBackup) uuidMap[uuidBackup] = idLocalExistente;
                        stats.skipped++;
                    }
                } else {
                    // INSERT
                    const colsInsert = colsComunes.filter(c => c !== 'id');
                    const placeholders = colsInsert.map(() => '?').join(', ');
                    let valores = colsInsert.map(c => row[c]);
                    
                    // Forzar negocio_id actual
                    const idxNegocioIdInsert = colsInsert.indexOf('negocio_id');
                    if (idxNegocioIdInsert !== -1) {
                        valores[idxNegocioIdInsert] = negocioIdActual;
                    }
                    
                    // Generar uuid si la tabla lo requiere y no tiene
                    const idxUuid = colsInsert.indexOf('uuid');
                    if (idxUuid !== -1 && (!valores[idxUuid] || valores[idxUuid] === null)) {
                        valores[idxUuid] = generateUuidForTable(tabla);
                    }
                    
                    // Re-mapear FKs
                    const fks = TABLAS_FK_MAP[tabla] || [];
                    for (const fk of fks) {
                        const idxFk = colsInsert.indexOf(fk.col);
                        if (idxFk !== -1 && valores[idxFk] !== null && valores[idxFk] !== undefined) {
                            // El valor de la FK es un id del backup → buscar su uuid → luego el id local
                            const valorFk = valores[idxFk];
                            
                            // Buscar el uuid del registro referenciado en el backup
                            try {
                                const refBackup = backupDb.exec(`SELECT uuid FROM ${fk.target} WHERE id = ${valorFk} LIMIT 1`);
                                const uuidRef = refBackup[0]?.values?.[0]?.[0];
                                
                                if (uuidRef && uuidMap[uuidRef]) {
                                    valores[idxFk] = uuidMap[uuidRef];
                                } else {
                                    // No se encontró el mapeo → dejar null (huérfano)
                                    console.warn(`⚠️ FK ${fk.col} no mapeada para ${tabla}#${row.id} (valor backup: ${valorFk})`);
                                    valores[idxFk] = null;
                                }
                            } catch (e) {
                                valores[idxFk] = null;
                            }
                        }
                    }
                    
                    localDb.run(`INSERT INTO ${tabla} (${colsInsert.join(', ')}) VALUES (${placeholders})`, valores);
                    
                    // Obtener id insertado
                    const idRes = localDb.exec('SELECT last_insert_rowid() as id');
                    const idInsertado = idRes[0]?.values?.[0]?.[0];
                    
                    if (uuidBackup && idInsertado) {
                        uuidMap[uuidBackup] = idInsertado;
                    }
                    stats.inserted++;
                }
            } catch (err) {
                stats.errors.push(`${tabla} id=${row?.id}: ${err.message}`);
            }
        }
    } catch (e) {
        stats.errors.push(`Error general en ${tabla}: ${e.message}`);
    }
    
    return stats;
}

// ============================================================
// 🆕 FASE 1.3.3: IMPORTAR SOLO DATOS CON FUSIÓN INTELIGENTE
// ============================================================

function importDatabaseDataOnly(file) {
    return new Promise((resolve, reject) => {
        try {
            const reader = new FileReader();
            
            reader.onload = async function(e) {
                let backupDb = null;
                try {
                    const dataArray = new Uint8Array(e.target.result);
                    
                    if (dataArray.length === 0) { reject(new Error('El archivo está vacío')); return; }
                    const header = new TextDecoder().decode(dataArray.slice(0, 16));
                    if (!header.includes('SQLite')) { reject(new Error('No es un archivo SQLite válido')); return; }
                    if (!sqlJsInstance) { reject(new Error('SQL.js no está inicializado.')); return; }
                    
                    backupDb = new sqlJsInstance.Database(dataArray);
                    const meta = readBackupMeta(backupDb);
                    console.log('🔖 Marca del backup (fusión):', meta);
                    
                    if (meta.type === BACKUP_TYPE_COMPLETE) {
                        const user = window.AuthModule?.getCurrentUser();
                        const isAdmin = user && user.is_admin === 1;
                        if (!isAdmin) {
                            backupDb.close(); backupDb = null;
                            reject(new Error('⚠️ Esta es una copia COMPLETA. Solo el administrador puede importarla.'));
                            return;
                        }
                    }
                    
                    const tablesResult = backupDb.exec("SELECT name FROM sqlite_master WHERE type='table'");
                    const backupTables = tablesResult[0]?.values?.map(row => row[0]) || [];
                    
                    const requiredTables = ['insumos', 'recipes', 'productos', 'sales', 'orders'];
                    const missingTables = requiredTables.filter(t => !backupTables.includes(t));
                    if (missingTables.length > 0) {
                        backupDb.close(); backupDb = null;
                        reject(new Error(`Faltan tablas obligatorias: ${missingTables.join(', ')}`));
                        return;
                    }
                    
                    const negocioIdActual = getNegocioIdActual();
                    console.log('🔍 Negocio actual:', negocioIdActual);
                    
                    const localDb = getDB();
                    
                    // Mapa global de uuid → id_local para re-mapear FKs
                    const uuidMap = {};
                    
                    // Estadísticas globales
                    const stats = {
                        inserted: 0,
                        updated: 0,
                        skipped: 0,
                        errors: [],
                        porTabla: {}
                    };
                    
                    localDb.run('BEGIN TRANSACTION');
                    
                    try {
                        // Fusionar cada tabla en orden de dependencias
                        for (const tabla of TABLAS_FUSION_ORDER) {
                            if (!backupTables.includes(tabla)) continue;
                            
                            console.log(`🔄 Fusionando tabla: ${tabla}...`);
                            
                            const tablaStats = fusionarTabla(
                                localDb, backupDb, tabla, negocioIdActual, uuidMap
                            );
                            
                            stats.porTabla[tabla] = {
                                inserted: tablaStats.inserted,
                                updated: tablaStats.updated,
                                skipped: tablaStats.skipped
                            };
                            stats.inserted += tablaStats.inserted;
                            stats.updated += tablaStats.updated;
                            stats.skipped += tablaStats.skipped;
                            stats.errors.push(...tablaStats.errors);
                            
                            console.log(`   ✅ ${tabla}: +${tablaStats.inserted} nuevos, ~${tablaStats.updated} actualizados, =${tablaStats.skipped} sin cambios`);
                        }
                        
                        localDb.run('COMMIT');
                        console.log('✅ Fusión completada');
                        
                    } catch (err) {
                        localDb.run('ROLLBACK');
                        reject(err);
                        return;
                    }
                    
                    saveDatabase();
                    saveAndNotify();
                    
                    resolve({
                        success: true,
                        modo: 'fusionar',
                        inserted: stats.inserted,
                        updated: stats.updated,
                        skipped: stats.skipped,
                        porTabla: stats.porTabla,
                        errores: stats.errors.length > 0 ? stats.errors : null,
                        meta
                    });
                    
                } catch (error) {
                    reject(error);
                } finally {
                    if (backupDb) { try { backupDb.close(); } catch (e) {} }
                }
            };
            
            reader.onerror = function() { reject(new Error('Error al leer el archivo')); };
            reader.readAsArrayBuffer(file);
        } catch (error) { reject(error); }
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
            if (!file) { resolve({ success: false, error: 'No se seleccionó archivo' }); return; }
            
            const confirm = await window.ModalModule.showConfirm({
                title: '🔀 Fusionar bases de datos',
                message: `¿Fusionar los datos de "${file.name}" con los actuales?\n\n` +
                         `📥 Los registros NUEVOS se añadirán.\n` +
                         `🔄 Los registros existentes (mismo uuid) se compararán: gana el más reciente.\n` +
                         `✅ Tus usuarios y código de invitación se CONSERVARÁN.\n\n` +
                         `⚠️ Los pedidos y ventas se fusionarán por uuid. No se pierden datos.`,
                confirmText: '🔀 Fusionar', cancelText: 'Cancelar',
                icon: '🔀', confirmColor: '#8b5cf6'
            });
            
            if (!confirm) { resolve({ success: false, error: 'Cancelado' }); return; }
            
            try {
                const result = await importDatabaseDataOnly(file);
                resolve(result);
            } catch (error) { resolve({ success: false, error: error.message }); }
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    });
}

// ============================================================
// EXPORTACIÓN FINAL
// ============================================================

window.DBModule = {
    initDB, getDB, saveDatabase, saveAndNotify, query, execute,
    forceReloadFromStorage, reloadFromStorageAndNotify,
    ensureUserTableColumns, ensureSoftDeleteColumns, ensureVoidColumns,
    ensureOrderIdColumn, ensureWaitingListColumns, ensureBankAccountsColumns,
    ensureCorrienteConfigTable, ensureIsLiberatedColumn, ensureDashboardColumns,
    ensurePremiosConfigTable,
    ensureAuditColumns, getCurrentUserId, getUsuarioNombre,
    slugifyNombreNegocio, getNombreNegocioDB, getPrefijoBackup,
    ensureNegociosTable, ensureNegocioIdColumn, migrateToMultiUser,
    ensureNegocioIdInAllTables, migrateNegocioIdToAllTables, createNegocioIdIndexes,
    ensureIsAdminColumn,
    generateUuid, generateUuidForTable, ensureUuidColumns, migrateUuids,
    UUID_PREFIXES,
    // FASE 1.3.3
    TABLAS_FUSION_ORDER, TABLAS_FK_MAP, fusionarTabla, findDuplicateByData,
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
    getPremiosConfig, savePremiosConfig,
    calcularMejorClienteDelMes, calcularMejorClienteDelAño,
    exportDatabase, downloadDatabase, importDatabase, importDatabaseFromFile,
    importDatabaseDataOnly, importDatabaseDataOnlyFromFile,
    exportRecetasProductosSalva, importRecetasProductosSalva, readSalvaFile,
    BACKUP_TYPE_COMPLETE, BACKUP_TYPE_DATA_ONLY
};

console.log('📦 DB Module cargado correctamente v2.0.6 (FASE 1.3.1 + FASE 1.3.3: fusión inteligente por UUID)');