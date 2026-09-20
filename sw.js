// ============================================================
// PANARIO - Service Worker (PWA) v2.1.6
// Estrategia: Cache First + Network Fallback + Offline
// HISTORIAL DE CAMBIOS:
//   v2.0.3 (180926):
//     - Nueva versión de caché fuerza reinstalación limpia
//     - Añadida librería qrcode.js a los assets críticos
//     - Añadido mensaje 'FORCE_UPDATE' para forzar actualización
//   v2.1.0 (200926):
//     - 🎯 Nueva versión mayor: incluye FASE 1 (UUID+fusión+fix fechas),
//       FASE 2 (lista de espera completa) y FASE 3 (Dashboard enriquecido
//       + toggles + medallas + alturas homogéneas).
//     - CACHE_NAME nuevo fuerza descarga limpia en móviles con v2.0.3
//     - Precache COMPLETO con todos los módulos JS
//     - Timeout de red ajustado a 5s
//   v2.1.5 (200926 v2):
//     - 🎯 FASE 4.2 (#13, #14, #15, #21): interruptor ventas liberadas,
//       persistencia del gráfico, cálculo anual configurable,
//       bloqueo de recetas a no-admin.
//     - 🎯 FASE 5 (#2, #3, #19, #20, #27): botón Ayuda Detallada,
//       FAQs ampliadas, logo → dashboard, días sin ventas,
//       animación "Probar todos" los sonidos.
//     - CACHE_NAME nuevo (panario-v2.1.5) fuerza reinstalación limpia
//       y descarga de los nuevos archivos JS en todos los dispositivos.
//   v2.1.6 (200926 v3):
//     - 🎯 FASE AYUDA MODAL: la ayuda detallada ahora se abre DENTRO
//       de la app en un modal con iframe, en lugar de una pestaña nueva.
//     - `ayuda-panario.html` acepta parámetros ?theme, ?section, ?embedded
//       para heredar el tema y abrirse en el módulo contextual.
//     - `help.js` incluye `abrirAyudaEnModal()` con botón "abrir en pestaña
//       nueva" como opción secundaria.
//     - `app.js` delega `openDetailedHelp()` a `HelpModule.abrirAyudaDetallada()`.
//     - `ui-settings.js` muestra la versión dinámica desde `<meta app-version>`.
//     - CACHE_NAME nuevo (panario-v2.1.6) fuerza reinstalación limpia
//       y descarga de los nuevos archivos JS en todos los dispositivos.
// ============================================================

const CACHE_NAME = 'panario-v2.1.6';
const CACHE_STATIC = 'panario-static-v2.1.6';
const CACHE_DYNAMIC = 'panario-dynamic-v2.1.6';
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
  './ayuda-panario.html',
  
  // Estilos
  './css/style.css',
  
  // Librerías
  './lib/sql-wasm.js',
  './lib/sql-wasm.wasm',
  './lib/qrcode.js',
  
  // Módulos JS - ORDEN DE CARGA SEGÚN index.html
  // Base
  './js/modal.js',
  './js/db.js',
  './js/auth.js',
  './js/theme.js',
  './js/profile.js',
  
  // Notificaciones
  './js/notifications.js',
  
  // Corriente (utilidades compartidas)
  './js/corriente-utils.js',
  
  // Pedidos
  './js/orders.js',
  './js/ui-orders.js',
  
  // Insumos
  './js/ui-insumos.js',
  
  // Recetas
  './js/recipes.js',
  './js/ui-recipes.js',
  
  // Productos
  './js/ui-productos.js',
  
  // Ventas
  './js/sales.js',
  './js/ui-sales.js',
  
  // Dashboard
  './js/dashboard.js',
  
  // Herramientas
  './js/ui-settings.js',
  
  // Reportes
  './js/reports.js',
  
  // Premios
  './js/rewards.js',
  
  // Ayuda
  './js/help.js',
  
  // Controlador principal (siempre al final)
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
        console.log('📦 SW Panario: Cacheando', CRITICAL_ASSETS.length, 'recursos críticos...');
        
        return Promise.allSettled(
          CRITICAL_ASSETS.map(function(asset) {
            return cache.add(asset).catch(function(err) {
              console.warn('⚠️ SW Panario: No se pudo cachear:', asset, err.message);
            });
          })
        );
      })
      .then(function() {
        console.log('✅ SW Panario: Instalación completada (v2.1.6)');
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.error('❌ SW Panario: Error en instalación:', error);
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
  // 2. RECURSOS ESTÁTICOS (CSS, JS, IMÁGENES): Cache First
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
            .catch(function() {});
          
          return cachedResponse;
        }
        
        return fetchWithTimeout(request, NETWORK_TIMEOUT_MS)
          .then(function(networkResponse) {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_DYNAMIC).then(function(cache) {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(function() {
            if (request.destination === 'image') {
              return new Response('', { status: 404, statusText: 'Image not found' });
            }
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
  
  if (event.data.type === 'SKIP_WAITING') {
    console.log('⏭️ SW Panario: skipWaiting solicitado');
    self.skipWaiting();
  }
  
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
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('./index.html');
        }
      })
  );
});

console.log('📦 SW Panario v2.1.6 cargado correctamente');
console.log('   📋 Assets precacheados:', CRITICAL_ASSETS.length);
console.log('   🎯 CACHE_NAME:', CACHE_NAME);