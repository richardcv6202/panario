// ============================================================
// 📦 SERVICE WORKER - Panario
// v2.3.7 (290926): 🎯 CORRECCIÓN #15 (290926)
//   - ✅ SW_VERSION = '2.3.7'
//   - ✅ CACHE_NAME actualizado a panario-v2.3.7
//   - ✅ AÑADIDO: './js/faqs.js' a CRITICAL_ASSETS
//   - ✅ AÑADIDO: './js/help-detailed.js' a CRITICAL_ASSETS
//   - ✅ ELIMINADO: './ayuda-panario.html' (archivo obsoleto)
//   - ✅ MANTENIDO: Auto-reparación de caché (verificación cada 15 min)
//   - ✅ MANTENIDO: Umbral de integridad 80%
//   - ✅ MANTENIDO: Estrategias Cache First + Network First
//   - ✅ MANTENIDO: Notificación de nueva versión a clientes
//
// HISTORIAL:
// v2.3.6 (280926): Actualización de versión
// ============================================================

const SW_VERSION = '2.3.7';
const CACHE_NAME_STATIC = `panario-static-v${SW_VERSION}`;
const CACHE_NAME_DYNAMIC = `panario-dynamic-v${SW_VERSION}`;
const CACHE_NAME = `panario-v${SW_VERSION}`;

const INTEGRITY_THRESHOLD = 0.8;          // 80%
const INTEGRITY_CHECK_INTERVAL_MS = 15 * 60 * 1000;  // 15 minutos
const FETCH_TIMEOUT_MS = 8000;

// ============================================================
// ASSETS CRÍTICOS (precache obligatorio)
// ============================================================

const CRITICAL_ASSETS = [
    './',
    './index.html',
    './offline.html',
    './manifest.json',
    './favicon.ico',
    './favicon16.ico',
    './favicon32.ico',

    // CSS
    './css/style.css',

    // Librerías externas
    './lib/sql-wasm.js',
    './lib/sql-wasm.wasm',
    './lib/qrcode.js',

    // Módulos JS core
    './js/modal.js',
    './js/db.js',
    './js/auth.js',
    './js/theme.js',
    './js/profile.js',

    // Módulos auxiliares
    './js/notifications.js',
    './js/corriente-utils.js',

    // Módulos de lógica + UI
    './js/orders.js',
    './js/ui-orders.js',
    './js/ui-insumos.js',
    './js/recipes.js',
    './js/ui-recipes.js',
    './js/ui-productos.js',
    './js/sales.js',
    './js/ui-sales.js',
    './js/dashboard.js',
    './js/ui-settings.js',
    './js/reports.js',
    './js/rewards.js',

    // 🆕 v2.3.7: FAQs externas (debe ir ANTES de help.js)
    './js/faqs.js',

    // Help modules
    './js/help.js',
    './js/help-detailed.js',

    // Controlador principal
    './js/app.js',

    // Recursos (assets)
    './assets/icon-192.png',
    './assets/icon-512.png',
    './assets/icon-maskable-192.png',
    './assets/icon-maskable-512.png',
    './assets/dev-avatar.png'
];

// ============================================================
// INSTALL
// ============================================================

self.addEventListener('install', (event) => {
    console.log(`📦 SW Panario v${SW_VERSION}: install`);
    
    event.waitUntil(
        caches.open(CACHE_NAME_STATIC)
            .then((cache) => {
                console.log(`📦 SW: Precacheando ${CRITICAL_ASSETS.length} assets...`);
                return Promise.all(
                    CRITICAL_ASSETS.map((url) => {
                        return fetch(url, { cache: 'reload' })
                            .then((response) => {
                                if (!response.ok) {
                                    console.warn(`⚠️ SW: Fallo fetch ${url}: ${response.status}`);
                                    return null;
                                }
                                return cache.put(url, response);
                            })
                            .catch((err) => {
                                console.warn(`⚠️ SW: Error cacheando ${url}:`, err.message);
                                return null;
                            });
                    })
                );
            })
            .then(() => {
                console.log(`✅ SW Panario v${SW_VERSION}: install OK`);
                return self.skipWaiting();
            })
            .catch((err) => {
                console.error(`❌ SW: Error en install:`, err);
            })
    );
});

// ============================================================
// ACTIVATE
// ============================================================

self.addEventListener('activate', (event) => {
    console.log(`🔄 SW Panario v${SW_VERSION}: activate`);
    
    event.waitUntil(
        caches.keys()
            .then((keys) => {
                const promises = keys.map((key) => {
                    // Eliminar cachés de versiones anteriores
                    if (key.startsWith('panario-') && 
                        key !== CACHE_NAME_STATIC && 
                        key !== CACHE_NAME_DYNAMIC && 
                        key !== CACHE_NAME) {
                        console.log(`🗑️ SW: Eliminando caché antiguo: ${key}`);
                        return caches.delete(key);
                    }
                    return Promise.resolve();
                });
                return Promise.all(promises);
            })
            .then(() => {
                console.log(`✅ SW Panario v${SW_VERSION}: activate OK`);
                return self.clients.claim();
            })
            .then(() => {
                // Notificar a todos los clientes sobre la nueva versión
                return self.clients.matchAll({ type: 'window' })
                    .then((clients) => {
                        clients.forEach((client) => {
                            client.postMessage({
                                type: 'SW_ACTIVATED',
                                version: SW_VERSION
                            });
                        });
                    });
            })
    );
});

// ============================================================
// FETCH
// ============================================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Solo manejar peticiones del mismo origen
    if (url.origin !== self.location.origin) {
        return;
    }
    
    // Ignorar peticiones que no son GET
    if (request.method !== 'GET') {
        return;
    }
    
    // Ignorar peticiones a APIs externas
    if (url.pathname.includes('/api/')) {
        return;
    }
    
    // HTML → Network First
    if (request.headers.get('accept')?.includes('text/html') ||
        url.pathname.endsWith('.html') ||
        url.pathname === '/' ||
        url.pathname.endsWith('/index.html')) {
        event.respondWith(networkFirstStrategy(request));
        return;
    }
    
    // Resto → Cache First
    event.respondWith(cacheFirstStrategy(request));
});

// ============================================================
// ESTRATEGIA: Cache First
// ============================================================

async function cacheFirstStrategy(request) {
    try {
        const cached = await caches.match(request);
        if (cached) {
            // Re-cachear en background para mantener actualizado
            revalidateCache(request);
            return cached;
        }
        
        const response = await fetchWithTimeout(request, FETCH_TIMEOUT_MS);
        
        if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME_STATIC);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (err) {
        console.warn('⚠️ SW: cacheFirst error, intentando caché:', err.message);
        const cached = await caches.match(request);
        if (cached) return cached;
        
        // Si es HTML, devolver offline.html
        if (request.headers.get('accept')?.includes('text/html')) {
            const offlinePage = await caches.match('./offline.html');
            if (offlinePage) return offlinePage;
        }
        
        return new Response('Recurso no disponible offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }
}

// ============================================================
// ESTRATEGIA: Network First
// ============================================================

async function networkFirstStrategy(request) {
    try {
        const response = await fetchWithTimeout(request, FETCH_TIMEOUT_MS);
        
        if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME_DYNAMIC);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (err) {
        console.warn('⚠️ SW: networkFirst error, usando caché:', err.message);
        
        const cached = await caches.match(request);
        if (cached) return cached;
        
        // Buscar index.html en caché
        const indexCached = await caches.match('./index.html');
        if (indexCached) return indexCached;
        
        // Devolver offline.html
        const offlinePage = await caches.match('./offline.html');
        if (offlinePage) return offlinePage;
        
        return new Response('Sin conexión', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }
}

// ============================================================
// FETCH CON TIMEOUT
// ============================================================

function fetchWithTimeout(request, timeout) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Timeout de ${timeout}ms`));
        }, timeout);
        
        fetch(request)
            .then((response) => {
                clearTimeout(timer);
                resolve(response);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
    });
}

// ============================================================
// REVALIDAR CACHÉ EN BACKGROUND
// ============================================================

async function revalidateCache(request) {
    try {
        const response = await fetchWithTimeout(request, FETCH_TIMEOUT_MS);
        if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME_STATIC);
            await cache.put(request, response);
        }
    } catch (err) {
        // Silencioso: si falla, se mantiene la versión cacheada
    }
}

// ============================================================
// VERIFICACIÓN DE INTEGRIDAD DEL CACHÉ
// ============================================================

async function verificarIntegridadCache() {
    try {
        const cache = await caches.open(CACHE_NAME_STATIC);
        
        let presentes = 0;
        const faltantes = [];
        
        for (const url of CRITICAL_ASSETS) {
            const cached = await cache.match(url);
            if (cached) {
                presentes++;
            } else {
                faltantes.push(url);
            }
        }
        
        const integridad = presentes / CRITICAL_ASSETS.length;
        console.log(`🔍 SW: Integridad del caché: ${(integridad * 100).toFixed(1)}% (${presentes}/${CRITICAL_ASSETS.length})`);
        
        return { integridad, presentes, faltantes };
    } catch (err) {
        console.error('❌ SW: Error verificando integridad:', err);
        return { integridad: 0, presentes: 0, faltantes: CRITICAL_ASSETS };
    }
}

// ============================================================
// RELLENAR CACHÉ
// ============================================================

async function rellenarCache(urls) {
    const cache = await caches.open(CACHE_NAME_STATIC);
    let ok = 0;
    let fallidos = 0;
    
    for (const url of urls) {
        try {
            const response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
            if (response && response.ok) {
                await cache.put(url, response);
                ok++;
            } else {
                fallidos++;
            }
        } catch (err) {
            fallidos++;
        }
    }
    
    return { ok, fallidos };
}

// ============================================================
// REPARAR CACHÉ SI ES NECESARIO
// ============================================================

async function repararCacheSiNecesario() {
    const { integridad, faltantes } = await verificarIntegridadCache();
    
    if (integridad >= INTEGRITY_THRESHOLD) {
        return { reparado: false, integridad };
    }
    
    console.log(`🔧 SW: Iniciando reparación de caché (${faltantes.length} faltantes)...`);
    
    if (integridad < 0.5) {
        // Caché muy corrupto: re-descargar TODO
        console.log(`🔧 SW: Caché muy corrupto (${(integridad * 100).toFixed(1)}%), re-descargando TODO...`);
        await caches.delete(CACHE_NAME_STATIC);
        await caches.open(CACHE_NAME_STATIC);
        const result = await rellenarCache(CRITICAL_ASSETS);
        console.log(`✅ SW: Caché reparado completo (${result.ok} OK, ${result.fallidos} fallidos)`);
    } else {
        // Caché parcialmente corrupto: re-descargar solo lo faltante
        const result = await rellenarCache(faltantes);
        console.log(`✅ SW: Caché reparado parcial (${result.ok} OK, ${result.fallidos} fallidos)`);
    }
    
    return { reparado: true, integridad };
}

// ============================================================
// VERIFICACIÓN PERIÓDICA
// ============================================================

setInterval(() => {
    console.log('🔍 SW: Verificación periódica de integridad...');
    repararCacheSiNecesario();
}, INTEGRITY_CHECK_INTERVAL_MS);

// ============================================================
// MENSAJES DESDE EL CLIENTE
// ============================================================

self.addEventListener('message', (event) => {
    const data = event.data;
    
    if (!data || !data.type) return;
    
    switch (data.type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
        
        case 'CHECK_INTEGRITY':
            verificarIntegridadCache().then((result) => {
                event.source.postMessage({
                    type: 'INTEGRITY_RESULT',
                    ...result
                });
            });
            break;
        
        case 'REPAIR_CACHE':
            repararCacheSiNecesario().then((result) => {
                event.source.postMessage({
                    type: 'REPAIR_RESULT',
                    ...result
                });
            });
            break;
        
        case 'GET_VERSION':
            event.source.postMessage({
                type: 'VERSION',
                version: SW_VERSION
            });
            break;
        
        default:
            console.log('📩 SW: Mensaje desconocido:', data.type);
    }
});

// ============================================================
// PUSH NOTIFICATIONS
// ============================================================

self.addEventListener('push', (event) => {
    let data = { title: 'Panario', body: 'Nueva notificación' };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (err) {
            data.body = event.data.text();
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: './assets/icon-192.png',
            badge: './assets/icon-192.png',
            vibrate: [200, 100, 200],
            data: data
        })
    );
});

// ============================================================
// NOTIFICATION CLICK
// ============================================================

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clients) => {
                // Si ya hay una ventana abierta, enfocarla
                for (const client of clients) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Si no, abrir una nueva
                if (self.clients.openWindow) {
                    return self.clients.openWindow('./index.html');
                }
            })
    );
});

// ============================================================
// LOG INICIAL
// ============================================================

console.log(`📦 SW Panario v${SW_VERSION} cargado correctamente`);
console.log(`   📦 Assets precacheados: ${CRITICAL_ASSETS.length}`);
console.log(`   📦 CACHE_NAME: ${CACHE_NAME}`);
console.log(`   🆕 FAQs externas incluidas: ./js/faqs.js`);
console.log(`   🆕 Help detailed incluidas: ./js/help-detailed.js`);
console.log(`   🗑️ Archivo obsoleto eliminado: ./ayuda-panario.html`);
console.log(`   🔧 Auto-reparación de caché activada`);
console.log(`   ⏰ Verificación periódica cada 15 minutos`);
console.log(`   ⚙️ Umbral de integridad: ${INTEGRITY_THRESHOLD * 100}%`);