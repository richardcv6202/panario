// ============================================================
// PANARIO - Service Worker (PWA) v2.0.3
// Estrategia: Cache First + Network Fallback + Offline
// CORREGIDO FASE D.1 (170926):
//   - Timeout de red para no colgarse esperando respuestas lentas
//   - Fallback robusto a offline.html si no hay index en caché
//   - Mejor manejo de errores en peticiones de navegación
//   - Limpieza de cachés antiguos garantizada
// ACTUALIZADO v2.0.3 (180926):
//   - Nueva versión de caché fuerza reinstalación limpia
//   - Añadida librería qrcode.js a los assets críticos
//   - Añadido lib/qrcode.js al precache
//   - Añadido mensaje 'FORCE_UPDATE' para forzar actualización
// ============================================================

const CACHE_NAME = 'panario-v2.0.3';
const CACHE_STATIC = 'panario-static-v2.0.3';
const CACHE_DYNAMIC = 'panario-dynamic-v2.0.3';
const OFFLINE_URL = './offline.html';

// Timeout para peticiones de red (ms)
const NETWORK_TIMEOUT_MS = 5000;

// ============================================================
// RECURSOS CRÍTICOS PARA FUNCIONAMIENTO OFFLINE
// ============================================================
const CRITICAL_ASSETS = [
  // Página principal
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  
  // Estilos
  './css/style.css',
  
  // Librerías
  './lib/sql-wasm.js',
  './lib/sql-wasm.wasm',
  './lib/qrcode.js',
  
  // Módulos JS (orden de carga)
  './js/modal.js',
  './js/db.js',
  './js/auth.js',
  './js/theme.js',
  './js/profile.js',
  './js/notifications.js',
  './js/corriente-utils.js',
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
  './js/help.js',
  './js/app.js',
  
  // Iconos y favicon
  './favicon.ico',
  './favicon16.ico',
  './favicon32.ico',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-192.png',
  './assets/icon-maskable-512.png'
];

// ============================================================
// HELPER: Fetch con timeout
// ============================================================
function fetchWithTimeout(request, timeout = NETWORK_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Network timeout'));
    }, timeout);
    
    fetch(request)
      .then(response => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

// ============================================================
// INSTALACIÓN
// ============================================================
self.addEventListener('install', function(event) {
  console.log('🔧 SW Panario: Instalando versión', CACHE_NAME);
  
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(function(cache) {
        console.log('📦 SW Panario: Cacheando recursos críticos...');
        
        // Usar allSettled para que un fallo no rompa toda la instalación
        return Promise.allSettled(
          CRITICAL_ASSETS.map(function(asset) {
            return cache.add(asset).catch(function(err) {
              console.warn('⚠️ SW Panario: No se pudo cachear:', asset, err.message);
            });
          })
        );
      })
      .then(function() {
        console.log('✅ SW Panario: Instalación completada');
        return self.skipWaiting();
      })
  );
});

// ============================================================
// ACTIVACIÓN
// ============================================================
self.addEventListener('activate', function(event) {
  console.log('🚀 SW Panario: Activando versión', CACHE_NAME);
  
  event.waitUntil(
    caches.keys()
      .then(function(cacheNames) {
        return Promise.all(
          cacheNames
            .filter(function(cacheName) {
              // Eliminar TODOS los cachés que no sean los actuales
              return cacheName !== CACHE_STATIC && 
                     cacheName !== CACHE_DYNAMIC && 
                     cacheName !== CACHE_NAME;
            })
            .map(function(cacheName) {
              console.log('🗑️ SW Panario: Eliminando caché obsoleto:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(function() {
        console.log('✅ SW Panario: Activado y controlando clientes');
        return self.clients.claim();
      })
  );
});

// ============================================================
// FETCH - ESTRATEGIAS DE CACHE
// ============================================================
self.addEventListener('fetch', function(event) {
  const request = event.request;
  const url = new URL(request.url);
  
  // Ignorar peticiones que no sean GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignorar dominios externos
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Ignorar peticiones de extensiones de navegador
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return;
  }
  
  // ============================================================
  // 1. PETICIONES DE NAVEGACIÓN (HTML): Network First con fallback
  // ============================================================
  if (request.mode === 'navigate' || isHtmlRequest(request)) {
    event.respondWith(
      fetchWithTimeout(request, NETWORK_TIMEOUT_MS)
        .then(function(response) {
          // Guardar copia en caché
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_DYNAMIC).then(function(cache) {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(function(error) {
          console.log('📡 SW Panario: Red no disponible, buscando en caché...', error.message);
          
          return caches.match(request)
            .then(function(cachedResponse) {
              if (cachedResponse) {
                console.log('📦 SW Panario: Sirviendo HTML desde caché:', request.url);
                return cachedResponse;
              }
              
              return caches.match('./index.html')
                .then(function(indexResponse) {
                  if (indexResponse) {
                    console.log('📦 SW Panario: Sirviendo index.html desde caché');
                    return indexResponse;
                  }
                  
                  return caches.match('./')
                    .then(function(rootResponse) {
                      if (rootResponse) {
                        console.log('📦 SW Panario: Sirviendo ./ desde caché');
                        return rootResponse;
                      }
                      
                      console.log('📡 SW Panario: Sirviendo offline.html');
                      return caches.match(OFFLINE_URL)
                        .then(function(offlineResponse) {
                          if (offlineResponse) {
                            return offlineResponse;
                          }
                          
                          return new Response(
                            '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Sin conexión</title></head><body style="font-family: system-ui; text-align: center; padding: 40px;"><h1>📡 Sin conexión</h1><p>Panario funciona offline, pero no se pudo cargar la app.</p><button onclick="location.reload()" style="padding: 12px 24px; font-size: 16px; background: #f5a623; color: white; border: none; border-radius: 8px; cursor: pointer;">🔄 Reintentar</button></body></html>',
                            { 
                              status: 503, 
                              statusText: 'Service Unavailable',
                              headers: { 'Content-Type': 'text/html; charset=utf-8' }
                            }
                          );
                        });
                    });
                });
            });
        })
    );
    return;
  }
  
  // ============================================================
  // 2. RECURSOS ESTÁTICOS (CSS, JS, IMÁGENES, FUENTES): Cache First
  // ============================================================
  event.respondWith(
    caches.match(request)
      .then(function(cachedResponse) {
        if (cachedResponse) {
          // Actualizar en segundo plano (stale-while-revalidate)
          fetch(request)
            .then(function(networkResponse) {
              if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_STATIC).then(function(cache) {
                  cache.put(request, responseClone);
                });
              }
            })
            .catch(function() {
              // Silenciar error de red si ya tenemos caché
            });
          
          return cachedResponse;
        }
        
        // No está en caché: buscar en red con timeout
        return fetchWithTimeout(request, NETWORK_TIMEOUT_MS)
          .then(function(networkResponse) {
            // Guardar en caché para futuras peticiones
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_DYNAMIC).then(function(cache) {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(function() {
            // Si falla y es una imagen, devolver un placeholder transparente
            if (request.destination === 'image') {
              return new Response('', { status: 404, statusText: 'Image not found' });
            }
            // Si es otro recurso, intentar offline.html como último recurso
            return caches.match(OFFLINE_URL).then(function(offlineResponse) {
              if (offlineResponse) return offlineResponse;
              return new Response('', { status: 404, statusText: 'Not found' });
            });
          });
      })
  );
});

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function isHtmlRequest(request) {
  const url = new URL(request.url);
  return (
    (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/') ||
    url.pathname === ''
  );
}

// ============================================================
// MENSAJES DESDE EL CLIENTE
// ============================================================
self.addEventListener('message', function(event) {
  if (!event.data) return;
  
  // Forzar skipWaiting
  if (event.data.type === 'SKIP_WAITING') {
    console.log('⏭️ SW Panario: skipWaiting solicitado por el cliente');
    self.skipWaiting();
  }
  
  // Limpiar todas las cachés
  if (event.data.type === 'CLEAR_CACHE') {
    console.log('🗑️ SW Panario: Limpiando todas las cachés...');
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('✅ SW Panario: Todas las cachés eliminadas');
    });
  }
  
  // Forzar actualización completa
  if (event.data.type === 'FORCE_UPDATE') {
    console.log('🔄 SW Panario: Forzando actualización completa...');
    event.waitUntil(
      caches.keys()
        .then(function(cacheNames) {
          return Promise.all(
            cacheNames.map(function(cacheName) {
              return caches.delete(cacheName);
            })
          );
        })
        .then(function() {
          return self.registration.update();
        })
    );
  }
});

// ============================================================
// NOTIFICACIONES PUSH
// ============================================================
self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'Nueva notificación de Panario',
      icon: './assets/icon-192.png',
      badge: './assets/icon-192.png',
      vibrate: [200, 100, 200],
      data: data.data || {},
      actions: [
        { action: 'open', title: '👁️ Abrir' },
        { action: 'close', title: '✕ Cerrar' }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || '🍞 Panario', options)
    );
  } catch (e) {
    console.error('Error procesando push:', e);
  }
});

// ============================================================
// CLICK EN NOTIFICACIÓN
// ============================================================
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'close') return;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow('./index.html');
        }
      })
  );
});

console.log('📦 SW Panario v2.0.3 cargado correctamente (versión nueva, con qrcode.js)');