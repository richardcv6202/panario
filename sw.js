// ============================================================
// PANARIO - Service Worker (PWA) v2.2.1
// Estrategia: Cache First + Network Fallback + Offline + AUTO-REPARACIÓN
// HISTORIAL DE CAMBIOS:
//   v2.0.3 (180926):
//     - Nueva versión de caché fuerza reinstalación limpia
//     - Añadida librería qrcode.js a los assets críticos
//     - Añadido mensaje 'FORCE_UPDATE' para forzar actualización
//   v2.1.0 (200926):
//     - 🎯 Nueva versión mayor: incluye FASE 1 (UUID+fusión+fix fechas),
//       FASE 2 (lista de espera completa) y FASE 3 (Dashboard enriquecido
//       + toggles + medallas + alturas homogéneas).
//   v2.1.5 (200926 v2):
//     - 🎯 FASE 4.2, 5: interruptor liberadas, persistencia gráfico,
//       premios configurables, bloqueo recetas, botón ayuda detallada.
//   v2.1.10 (220926 v3):
//     - 🎯 FIX DEFINITIVO tras limpiar caché: auto-reparación.
//   v2.1.11 (230926 v4): ENTREGA 1 - MENSAJE 2 de 3
//     - ✅ REFUERZO: verificación de integridad MÁS agresiva
//     - ✅ NUEVO: detección de "caché corrupto" (no solo vacío)
//     - ✅ NUEVO: re-cacheo de ayuda-panario.html y offline.html
//       SIEMPRE que se detecte que faltan
//     - ✅ NUEVO: mensaje CACHE_REPAIRED_START y CACHE_REPAIRED_END
//       para que el cliente muestre un toast informativo
//     - ✅ NUEVO: timeout de red configurable (5s por defecto)
//     - ✅ NUEVO: función rellenarCache() con batches de 5
//     - ✅ NUEVO: verificación periódica cada 15 min (antes 30)
//     - ✅ NUEVO: fallback a index.html inline si TODO falla
//     - ✅ NUEVO: los assets críticos se re-descargan si el caché
//       tiene menos del 80% de ellos
//     - ✅ NUEVO: soporte para mensaje CHECK_INTEGRITY desde el cliente
//   v2.1.19 (221026 v5):
//     - ✅ ENTREGA B: CMPBC + algoritmo inteligente de bloques
//     - ✅ Nuevas migraciones automáticas de BD
//   v2.2.0 (230926 v6): 🎯 VERSIÓN MAYOR
//     - ✅ Nueva versión de caché fuerza reinstalación limpia
//     - ✅ Incluye todos los cambios de las Fases A, B, C, D, E, F
//     - ✅ Añadido soporte para el nuevo campo CMPBC
//     - ✅ Compatible con todas las versiones anteriores
//   v2.2.1 (230926 v7): 🔧 FIX PWA - Pantalla completa
//     - ✅ manifest.json ahora usa "display": "fullscreen"
//     - ✅ Se fuerza reinstalación limpia del caché para que
//       todos los usuarios obtengan el nuevo manifest
//     - ✅ Sin cambios funcionales, solo actualización de caché
//     - ✅ Compatible con todas las versiones anteriores
// ============================================================

const CACHE_NAME = 'panario-v2.2.1';
const CACHE_STATIC = 'panario-static-v2.2.1';
const CACHE_DYNAMIC = 'panario-dynamic-v2.2.1';
const OFFLINE_URL = './offline.html';

// Timeout para peticiones de red (ms)
const NETWORK_TIMEOUT_MS = 5000;

// Umbral de integridad: si menos del 80% de los assets críticos
// están en caché, se considera "corrupto" y se re-descarga todo.
const INTEGRITY_THRESHOLD = 0.8;

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
// VERIFICACIÓN DE INTEGRIDAD DEL CACHÉ
// ============================================================
// 
// Detecta cuándo los assets críticos NO están en caché.
// Esto ocurre cuando el usuario limpia el caché de Chrome
// manualmente, o cuando el caché se corrompe.
// 
// @returns {Promise<{ok: boolean, missing: string[], total: number, ratio: number}>}
// ============================================================

async function verificarIntegridadCache() {
  const missing = [];
  
  try {
    const cache = await caches.open(CACHE_STATIC);
    
    // Verificar cada asset crítico (en paralelo con Promise.all)
    const checks = CRITICAL_ASSETS.map(async (asset) => {
      try {
        const response = await cache.match(asset);
        if (!response) {
          missing.push(asset);
        }
      } catch (e) {
        missing.push(asset);
      }
    });
    
    await Promise.all(checks);
    
    const total = CRITICAL_ASSETS.length;
    const found = total - missing.length;
    const ratio = total > 0 ? found / total : 0;
    const ok = missing.length === 0;
    
    if (ok) {
      console.log(`✅ SW: Integridad del caché OK (${found}/${total} assets verificados)`);
    } else {
      console.warn(`⚠️ SW: Faltan ${missing.length}/${total} assets en el caché (integridad: ${(ratio * 100).toFixed(1)}%)`);
      if (missing.length <= 10) {
        console.warn('   📋 Assets faltantes:', missing.join(', '));
      } else {
        console.warn('   📋 Primeros 10 faltantes:', missing.slice(0, 10).join(', '), `... (+${missing.length - 10})`);
      }
    }
    
    return {
      ok: ok,
      missing: missing,
      total: total,
      found: found,
      ratio: ratio
    };
    
  } catch (error) {
    console.error('❌ SW: Error verificando integridad del caché:', error);
    return {
      ok: false,
      missing: CRITICAL_ASSETS,
      total: CRITICAL_ASSETS.length,
      found: 0,
      ratio: 0
    };
  }
}

// ============================================================
// RELLENAR CACHÉ FALTANTE
// ============================================================
// 
// Descarga los assets faltantes y los guarda en caché.
// Se ejecuta en background sin bloquear.
// 
// @param {string[]} assetsToFill - Lista de assets a descargar.
//                                   Si es null, descarga TODOS.
// @returns {Promise<{downloaded: number, failed: number, total: number}>}
// ============================================================

async function rellenarCache(assetsToFill = null) {
  try {
    const assets = assetsToFill || CRITICAL_ASSETS;
    
    if (assets.length === 0) {
      console.log('✅ SW: No hay assets que rellenar');
      return { downloaded: 0, failed: 0, total: 0 };
    }
    
    console.log(`🔄 SW: Rellenando caché con ${assets.length} assets...`);
    
    // Notificar al cliente que empieza la reparación
    notifyClients({
      type: 'CACHE_REPAIRED_START',
      total: assets.length
    });
    
    const cache = await caches.open(CACHE_STATIC);
    let downloaded = 0;
    let failed = 0;
    
    // Descargar en paralelo (máximo 5 a la vez para no saturar)
    const batches = [];
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < assets.length; i += BATCH_SIZE) {
      batches.push(assets.slice(i, i + BATCH_SIZE));
    }
    
    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(async (asset) => {
          try {
            const response = await fetch(asset, { cache: 'no-store' });
            if (response && response.ok) {
              await cache.put(asset, response.clone());
              downloaded++;
            } else {
              failed++;
            }
          } catch (e) {
            failed++;
          }
        })
      );
    }
    
    console.log(`✅ SW: Caché rellenado (${downloaded} descargados, ${failed} fallidos)`);
    
    // Notificar al cliente que terminó la reparación
    notifyClients({
      type: 'CACHE_REPAIRED_END',
      downloaded: downloaded,
      failed: failed,
      total: assets.length
    });
    
    return { downloaded, failed, total: assets.length };
    
  } catch (error) {
    console.error('❌ SW: Error rellenando caché:', error);
    return { downloaded: 0, failed: assetsToFill?.length || 0, total: 0 };
  }
}

// ============================================================
// REPARAR CACHÉ SI ESTÁ CORRUPTO
// ============================================================
// 
// Verifica la integridad y, si está por debajo del umbral,
// rellena el caché faltante.
// 
// @returns {Promise<boolean>} - true si se reparó algo
// ============================================================

async function repararCacheSiNecesario() {
  try {
    const integrity = await verificarIntegridadCache();
    
    // Si está OK, no hacer nada
    if (integrity.ok) {
      return false;
    }
    
    // Si está por debajo del umbral, rellenar TODO
    // (no solo lo que falta, porque puede estar corrupto)
    if (integrity.ratio < INTEGRITY_THRESHOLD) {
      console.warn(`🔧 SW: Caché corrupto (${(integrity.ratio * 100).toFixed(1)}% < ${INTEGRITY_THRESHOLD * 100}%). Re-descargando TODO...`);
      await rellenarCache(CRITICAL_ASSETS);
      return true;
    }
    
    // Si está por encima del umbral pero faltan algunos, rellenar solo esos
    console.log(`🔧 SW: Caché incompleto pero funcional. Rellenando ${integrity.missing.length} assets...`);
    await rellenarCache(integrity.missing);
    return true;
    
  } catch (error) {
    console.error('❌ SW: Error reparando caché:', error);
    return false;
  }
}

// ============================================================
// NOTIFICAR A TODOS LOS CLIENTES
// ============================================================

async function notifyClients(message) {
  try {
    const clients = await self.clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    });
    
    clients.forEach(client => {
      try {
        client.postMessage(message);
      } catch (e) {
        // Silencioso
      }
    });
  } catch (e) {
    console.warn('⚠️ SW: Error notificando clientes:', e);
  }
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
        console.log('✅ SW Panario: Instalación completada (v2.2.1)');
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
      .then(async function() {
        // Reparar caché si es necesario tras activar
        try {
          const repaired = await repararCacheSiNecesario();
          if (repaired) {
            console.log('🔧 SW: Caché reparado tras activación');
          }
        } catch (e) {
          console.warn('⚠️ SW: Error en reparación post-activación:', e);
        }
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
  // 1. PETICIONES DE NAVEGACIÓN (HTML)
  //    Network First con fallback a caché, con auto-reparación.
  // ============================================================
  if (request.mode === 'navigate' || isHtmlRequest(request)) {
    event.respondWith(
      fetchWithTimeout(request, NETWORK_TIMEOUT_MS)
        .then(function(response) {
          if (response && response.status === 200) {
            // Guardar copia en caché dinámico
            const responseClone = response.clone();
            caches.open(CACHE_DYNAMIC).then(function(cache) {
              cache.put(request, responseClone).catch(() => {});
            });
            
            // Verificar integridad en background
            repararCacheSiNecesario().catch(() => {});
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
                          
                          // Último recurso: HTML inline mínimo
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
  // 2. RECURSOS ESTÁTICOS (CSS, JS, IMÁGENES)
  //    Cache First con re-cacheo en background.
  // ============================================================
  event.respondWith(
    caches.match(request)
      .then(function(cachedResponse) {
        if (cachedResponse) {
          // Servir desde caché
          // Re-cachear en background (stale-while-revalidate)
          fetch(request)
            .then(function(networkResponse) {
              if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_STATIC).then(function(cache) {
                  cache.put(request, responseClone).catch(() => {});
                });
              }
            })
            .catch(function() {});
          
          return cachedResponse;
        }
        
        // No está en caché → descargar
        return fetchWithTimeout(request, NETWORK_TIMEOUT_MS)
          .then(function(networkResponse) {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_DYNAMIC).then(function(cache) {
                cache.put(request, responseClone).catch(() => {});
              });
            }
            return networkResponse;
          })
          .catch(function() {
            // Si es imagen, devolver 404 vacío
            if (request.destination === 'image') {
              return new Response('', { status: 404, statusText: 'Image not found' });
            }
            // Si es otro recurso, devolver offline.html
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
  
  console.log('📩 SW: Mensaje recibido:', event.data.type);
  
  // ============================================================
  // SKIP_WAITING: Saltar al siguiente SW en espera
  // ============================================================
  if (event.data.type === 'SKIP_WAITING') {
    console.log('⏭️ SW Panario: skipWaiting solicitado');
    self.skipWaiting();
  }
  
  // ============================================================
  // CLEAR_CACHE: Limpiar todas las cachés
  // ============================================================
  if (event.data.type === 'CLEAR_CACHE') {
    console.log('🗑️ SW Panario: Limpiando todas las cachés...');
    event.waitUntil(
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            return caches.delete(cacheName);
          })
        );
      }).then(function() {
        console.log('✅ SW Panario: Todas las cachés eliminadas');
      })
    );
  }
  
  // ============================================================
  // FORCE_UPDATE: Forzar actualización completa
  // ============================================================
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
  
  // ============================================================
  // REPAIR_CACHE: Rellenar caché faltante
  // ============================================================
  if (event.data.type === 'REPAIR_CACHE') {
    console.log('🔧 SW Panario: Reparando caché a petición del cliente...');
    event.waitUntil(
      repararCacheSiNecesario()
        .then(repaired => {
          console.log('✅ SW Panario: Reparación completada. Reparado:', repaired);
        })
        .catch(e => {
          console.error('❌ SW Panario: Error en reparación:', e);
        })
    );
  }
  
  // ============================================================
  // CHECK_INTEGRITY: Verificar integridad
  // ============================================================
  if (event.data.type === 'CHECK_INTEGRITY') {
    console.log('🔍 SW Panario: Verificando integridad del caché...');
    event.waitUntil(
      verificarIntegridadCache().then(integrity => {
        // Responder al cliente si hay un MessageChannel
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            type: 'INTEGRITY_RESULT',
            ...integrity
          });
        }
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

// ============================================================
// SINCRONIZACIÓN PERIÓDICA DE INTEGRIDAD
// ============================================================
// 
// Cada 15 minutos, verifica que el caché siga íntegro.
// Si falta algo, lo descarga en background.
// ============================================================

setInterval(async function() {
  try {
    const integrity = await verificarIntegridadCache();
    if (!integrity.ok) {
      console.log('🔄 SW: Verificación periódica detectó caché incompleto. Rellenando...');
      await repararCacheSiNecesario();
    }
  } catch (e) {
    // Silencioso
  }
}, 15 * 60 * 1000); // 15 minutos

console.log('📦 SW Panario v2.2.1 cargado correctamente');
console.log('   📋 Assets precacheados:', CRITICAL_ASSETS.length);
console.log('   🎯 CACHE_NAME:', CACHE_NAME);
console.log('   🔧 Auto-reparación de caché activada');
console.log('   ⏱️ Verificación periódica cada 15 minutos');
console.log('   🛡️ Umbral de integridad:', (INTEGRITY_THRESHOLD * 100) + '%');
console.log('   🎉 v2.2.1: manifest con fullscreen + caché renovado');