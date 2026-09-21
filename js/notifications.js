// ============================================================
// 📦 NOTIFICATIONS MODULE - Panario
// CORREGIDO: Sin duplicados, marcador de leídas, sonido configurable
// CORREGIDO FASE 1.4 (190926): 🔊 FIX DEFINITIVO DE SONIDO
//   - AudioContext SINGLETON (uno solo para toda la app)
//   - unlockAudio() en el primer gesto del usuario
//   - resume() automático antes de reproducir
//   - Fallback silencioso si el navegador bloquea
//   - Sin crear nuevos AudioContexts por cada sonido
//   - Eliminado emoji duplicado en el título de push
// 🆕 FASE 5 (#27) (200926 v2): ANIMACIÓN "PROBAR TODOS" LOS SONIDOS
//   - Overlay visual con icono grande, barra de progreso y contador
//   - Botón "⏹️ Detener" para abortar la secuencia
//   - Delay de 1.5s entre sonidos (configurable)
//   - Restaura el sonido configurado al finalizar
//   - Escape también cancela
//   - No modifica el soundId guardado del usuario
// 🆕 FASE 1.5 (220926 v3): FIX DEFINITIVO - SONIDO DESDE EL PRIMER CLIC
//   - 🔴 CAUSA RAÍZ: Los listeners de unlock se registraban DESPUÉS
//     del login, por lo que el primer gesto del usuario (login) no
//     contaba para desbloquear el AudioContext.
//   - ✅ SOLUCIÓN: Los listeners se registran INMEDIATAMENTE al
//     cargar el módulo (al final del archivo), NO cuando el usuario
//     hace login.
//   - ✅ Eventos ampliados: click, touchstart, touchend, keydown,
//     pointerdown, mousedown
//   - ✅ Reintentos automáticos: hasta MAX_UNLOCK_ATTEMPTS veces
//   - ✅ Sistema de "pending unlock": si el unlock falla, se reintenta
//     en el siguiente gesto sin intervención del usuario
//   - ✅ Detección temprana: se intenta unlock tan pronto como el
//     DOM esté listo (sin esperar gesto) — algunos navegadores lo
//     permiten si el usuario ya interactuó con el sitio antes
//   - ✅ Logs de diagnóstico claros en consola
//   - ✅ Compatibilidad con iOS Safari (usa webkitAudioContext)
//   - ✅ El sonido funciona INCLUSO si el usuario no ha hecho login
//     todavía (por ejemplo, en la pantalla de login)
// ============================================================

window.NotificationsModule = {};

// ============================================================
// VARIABLES GLOBALES
// ============================================================

let notificationCount = 0;
let notificationList = [];
let isProcessingNotification = false;
let notificationTimers = {};
const MAX_NOTIFICATIONS = 50;
const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    ORDER: 'order',
    DEBT: 'debt',
    STOCK: 'stock'
};

// 🆕 FASE 1.4: Configuración de sonido
const SOUND_CONFIG_KEY = 'panario_notification_sound_config';
const DEFAULT_SOUND_CONFIG = {
    enabled: true,
    soundId: 'beep'
};

// 🆕 FASE 1.4: Sonidos embutidos
const SOUNDS = {
    'silent': { name: '🔇 Silencio', freq: 0, duration: 0, emoji: '🔇' },
    'beep': { name: '🔔 Beep', freq: 800, duration: 0.15, emoji: '🔔' },
    'chime': { name: '🎵 Chime', freq: 1200, duration: 0.3, emoji: '🎵' },
    'pop': { name: '💧 Pop', freq: 600, duration: 0.1, emoji: '💧' },
    'alert': { name: '⚠️ Alert', freq: 400, duration: 0.25, emoji: '⚠️' },
    'success': { name: '✅ Success', freq: 1500, duration: 0.2, emoji: '✅' }
};

// 🆕 FASE 5 (#27): Estado de la prueba de sonidos
let _testAllSoundsAbort = false;
let _testAllSoundsOverlay = null;

// ============================================================
// 🆕 FASE 1.5: AUDIO CONTEXT SINGLETON (FIX DEFINITIVO)
// ============================================================
// 
// Un solo AudioContext reutilizado para toda la app.
// Se desbloquea con el PRIMER gesto del usuario (en cualquier
// parte de la app, incluso en el login).
// 
// Estrategia:
//   1. Registrar listeners de gesto INMEDIATAMENTE al cargar el módulo
//   2. Al primer gesto, intentar crear + resume() del AudioContext
//   3. Si falla, reintentar en el siguiente gesto
//   4. Si supera MAX_UNLOCK_ATTEMPTS, dejar de intentar (evitar spam)
// ============================================================

let _audioContext = null;
let _audioUnlocked = false;
let _audioUnlockAttempts = 0;
let _audioUnlockPending = false;
const MAX_UNLOCK_ATTEMPTS = 10;

/**
 * Obtiene (o crea) el AudioContext singleton.
 * NO llama a resume() automáticamente.
 */
function getAudioContext() {
    if (_audioContext) return _audioContext;
    
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            console.warn('🔇 AudioContext no soportado en este navegador');
            return null;
        }
        
        _audioContext = new AudioContextClass();
        console.log('🔊 AudioContext creado (estado inicial:', _audioContext.state, ')');
        return _audioContext;
        
    } catch (e) {
        console.warn('🔇 Error creando AudioContext:', e);
        return null;
    }
}

/**
 * 🆕 FASE 1.5: Intenta desbloquear el AudioContext.
 * 
 * @param {string} source - Origen del intento (para logs)
 * @returns {Promise<boolean>} true si quedó desbloqueado
 */
async function unlockAudio(source = 'unknown') {
    // Ya desbloqueado → OK
    if (_audioUnlocked && _audioContext && _audioContext.state === 'running') {
        return true;
    }
    
    // Demasiados intentos → detener para no spamear
    if (_audioUnlockAttempts >= MAX_UNLOCK_ATTEMPTS) {
        return false;
    }
    
    // Evitar intentos simultáneos
    if (_audioUnlockPending) {
        return false;
    }
    
    _audioUnlockPending = true;
    _audioUnlockAttempts++;
    
    try {
        const ctx = getAudioContext();
        if (!ctx) {
            _audioUnlockPending = false;
            return false;
        }
        
        // Si está suspendido, intentar resume
        if (ctx.state === 'suspended') {
            try {
                await ctx.resume();
            } catch (e) {
                // Silencioso: el navegador bloquea sin gesto
                _audioUnlockPending = false;
                return false;
            }
        }
        
        if (ctx.state === 'running') {
            _audioUnlocked = true;
            console.log(`🔊 AudioContext desbloqueado correctamente (intento #${_audioUnlockAttempts}, origen: ${source})`);
            
            // Reproducir un sonido muy corto para confirmar
            try {
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);
                oscillator.frequency.value = 1; // Prácticamente inaudible
                gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
                gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.01);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.01);
            } catch (e) {
                // Silencioso
            }
            
            _audioUnlockPending = false;
            return true;
        }
        
        _audioUnlockPending = false;
        return false;
        
    } catch (e) {
        _audioUnlockPending = false;
        return false;
    }
}

/**
 * 🆕 FASE 1.5: Configura los listeners de unlock.
 * Se llama INMEDIATAMENTE al cargar el módulo (al final del archivo).
 */
function setupAudioUnlockListeners() {
    const events = ['click', 'touchstart', 'touchend', 'keydown', 'pointerdown', 'mousedown'];
    
    let attemptsCount = 0;
    const maxEventAttempts = 30; // Después de 30 gestos, quitar listeners
    
    const unlockHandler = async (e) => {
        attemptsCount++;
        
        // Después de muchos intentos, quitar listeners
        if (attemptsCount > maxEventAttempts) {
            events.forEach(evt => {
                document.removeEventListener(evt, unlockHandler, true);
            });
            console.log('🔊 Listeners de unlock removidos (demasiados gestos sin éxito)');
            return;
        }
        
        const unlocked = await unlockAudio(`gesto (${e.type})`);
        
        if (unlocked) {
            // Una vez desbloqueado, quitar los listeners
            events.forEach(evt => {
                document.removeEventListener(evt, unlockHandler, true);
            });
            console.log('🔊 Listeners de unlock removidos (éxito)');
        }
    };
    
    events.forEach(evt => {
        document.addEventListener(evt, unlockHandler, true);
    });
    
    console.log('🔊 Listeners de desbloqueo de audio registrados (FASE 1.5)');
    console.log(`   📋 Eventos: ${events.join(', ')}`);
    
    // 🆕 FASE 1.5: Intentar unlock inmediato (algunos navegadores lo permiten)
    setTimeout(() => {
        unlockAudio('intento inicial').then(unlocked => {
            if (unlocked) {
                console.log('🔊 AudioContext desbloqueado en intento inicial');
            }
        });
    }, 500);
    
    // 🆕 FASE 1.5: Intentar unlock cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => unlockAudio('DOMContentLoaded'), 300);
        });
    } else {
        setTimeout(() => unlockAudio('readyState-complete'), 300);
    }
}

// ============================================================
// REGISTRAR LISTENERS AL CARGAR EL MÓDULO (CRÍTICO)
// ============================================================
// 
// ⚠️ IMPORTANTE: Esta llamada es la CLAVE del fix.
// Se ejecuta INMEDIATAMENTE al cargar el archivo, no cuando el
// usuario hace login. Así el primer gesto del usuario (aunque
// sea en el login) desbloquea el audio.
// ============================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAudioUnlockListeners);
} else {
    setupAudioUnlockListeners();
}

// ============================================================
// INICIALIZAR SISTEMA DE NOTIFICACIONES
// ============================================================

function initNotificationSystem() {
    const bell = document.getElementById('notification-bell');
    if (!bell) {
        console.warn('⚠️ No se encontró la campanita en el HTML');
        return;
    }
    
    console.log('🔔 Campanita encontrada en el HTML');
    loadNotificationsFromStorage();
    updateBellBadge();
    
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(120%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(120%); opacity: 0; }
            }
            @keyframes modalFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes modalSlideUp {
                from { opacity: 0; transform: translateY(30px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes modalFadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes bellRing {
                0% { transform: rotate(0deg); }
                20% { transform: rotate(15deg); }
                40% { transform: rotate(-15deg); }
                60% { transform: rotate(10deg); }
                80% { transform: rotate(-10deg); }
                100% { transform: rotate(0deg); }
            }
            @keyframes soundTestPulse {
                0% { transform: scale(1); opacity: 0.9; }
                50% { transform: scale(1.15); opacity: 1; }
                100% { transform: scale(1); opacity: 0.9; }
            }
        `;
        document.head.appendChild(style);
    }
    
    console.log('🔔 Sistema de notificaciones iniciado');
}

// ============================================================
// CONFIGURACIÓN DE SONIDO
// ============================================================

function getSoundConfig() {
    try {
        const saved = localStorage.getItem(SOUND_CONFIG_KEY);
        if (saved) {
            return { ...DEFAULT_SOUND_CONFIG, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.warn('Error leyendo config de sonido:', e);
    }
    return { ...DEFAULT_SOUND_CONFIG };
}

function setSoundConfig(config) {
    try {
        const merged = { ...DEFAULT_SOUND_CONFIG, ...config };
        localStorage.setItem(SOUND_CONFIG_KEY, JSON.stringify(merged));
        console.log('🔊 Config de sonido guardada:', merged);
        return { success: true, config: merged };
    } catch (e) {
        console.error('Error guardando config de sonido:', e);
        return { success: false, error: e.message };
    }
}

function getAvailableSounds() {
    return Object.entries(SOUNDS).map(([id, data]) => ({
        id,
        name: data.name,
        emoji: data.emoji
    }));
}

// ============================================================
// 🆕 FASE 1.5: REPRODUCIR SONIDO (CON REINTENTOS)
// ============================================================

/**
 * Reproduce un sonido por ID usando el AudioContext singleton.
 * 
 * @param {string} soundId - ID del sonido ('beep', 'chime', etc.)
 * @returns {Promise<boolean>} true si se reprodujo
 */
async function playSoundById(soundId) {
    const config = getSoundConfig();
    
    if (!config.enabled) {
        return false;
    }
    
    const sound = SOUNDS[soundId] || SOUNDS['beep'];
    if (!sound || sound.freq === 0) {
        return false;
    }
    
    try {
        // Obtener el AudioContext singleton
        const ctx = getAudioContext();
        if (!ctx) return false;
        
        // Si está suspendido, intentar resume
        if (ctx.state === 'suspended') {
            try {
                await ctx.resume();
            } catch (e) {
                // El navegador bloqueó el resume (sin gesto del usuario)
                // Intentar unlock en segundo plano (sin bloquear)
                unlockAudio('playSoundById-fallback');
                return false;
            }
        }
        
        // Si aún está suspendido después de resume, no podemos reproducir
        if (ctx.state !== 'running') {
            return false;
        }
        
        // Marcar como desbloqueado si llegamos aquí
        _audioUnlocked = true;
        
        // Crear oscilador y gain node (se destruyen al terminar)
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = sound.freq;
        oscillator.type = 'sine';
        
        // Fade in/out para evitar clicks
        const now = ctx.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, now + sound.duration);
        
        oscillator.start(now);
        oscillator.stop(now + sound.duration + 0.01);
        
        // Limpiar después de terminar
        oscillator.onended = () => {
            try {
                oscillator.disconnect();
                gainNode.disconnect();
            } catch (e) {}
        };
        
        return true;
        
    } catch (e) {
        // Silencioso: el navegador bloquea sin gesto
        return false;
    }
}

/**
 * Reproduce el sonido configurado según el tipo de notificación.
 */
async function playNotificationSound(type) {
    const config = getSoundConfig();
    if (!config.enabled) return;
    
    // Mapear tipo → sonido
    const soundMap = {
        [NOTIFICATION_TYPES.SUCCESS]: 'success',
        [NOTIFICATION_TYPES.ERROR]: 'alert',
        [NOTIFICATION_TYPES.WARNING]: 'alert',
        [NOTIFICATION_TYPES.INFO]: config.soundId,
        [NOTIFICATION_TYPES.ORDER]: 'chime',
        [NOTIFICATION_TYPES.DEBT]: 'alert',
        [NOTIFICATION_TYPES.STOCK]: 'pop'
    };
    
    const soundToPlay = soundMap[type] || config.soundId;
    await playSoundById(soundToPlay);
}

// ============================================================
// 🆕 FASE 5 (#27): ANIMACIÓN "PROBAR TODOS" LOS SONIDOS
// ============================================================

function _createTestAllSoundsOverlay() {
    const prev = document.getElementById('test-sounds-overlay');
    if (prev) prev.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'test-sounds-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483647;
        padding: 20px;
        animation: modalFadeIn 0.25s ease;
        isolation: isolate;
    `;
    
    overlay.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 32px 28px; max-width: 380px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color); text-align: center;">
            
            <div style="font-size: 12px; font-weight: 700; color: var(--text-light); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                🔊 Probando sonidos
            </div>
            
            <div id="test-sounds-counter" style="font-size: 13px; color: var(--primary); font-weight: 700; margin-bottom: 16px;">
                1 / 5
            </div>
            
            <div id="test-sounds-icon" style="font-size: 72px; margin-bottom: 12px; animation: soundTestPulse 1.2s ease-in-out infinite; display: inline-block;">
                🔔
            </div>
            
            <div id="test-sounds-name" style="font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 20px; min-height: 28px;">
                Beep
            </div>
            
            <div style="width: 100%; height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden; margin-bottom: 20px;">
                <div id="test-sounds-progress" style="height: 100%; width: 0%; background: linear-gradient(90deg, var(--primary), #f59e0b); border-radius: 3px; transition: width 0.4s ease;"></div>
            </div>
            
            <button id="test-sounds-stop" onclick="abortTestAllSounds()" 
                    class="btn secondary" 
                    style="padding: 10px 24px; font-size: 14px; width: auto;">
                ⏹️ Detener
            </button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    _testAllSoundsOverlay = overlay;
    
    return overlay;
}

function _updateTestAllSoundsOverlay(index, total, soundId) {
    const counter = document.getElementById('test-sounds-counter');
    const icon = document.getElementById('test-sounds-icon');
    const name = document.getElementById('test-sounds-name');
    const progress = document.getElementById('test-sounds-progress');
    
    const sound = SOUNDS[soundId] || SOUNDS['beep'];
    
    if (counter) counter.textContent = `${index} / ${total}`;
    if (icon) icon.textContent = sound.emoji || '🔔';
    if (name) name.textContent = sound.name || soundId;
    if (progress) progress.style.width = `${(index / total) * 100}%`;
}

function _removeTestAllSoundsOverlay() {
    const overlay = document.getElementById('test-sounds-overlay');
    if (overlay) {
        overlay.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => {
            if (overlay.parentNode) overlay.remove();
        }, 200);
    }
    _testAllSoundsOverlay = null;
}

/**
 * Prueba todos los sonidos con animación y delay.
 */
async function testAllSounds() {
    // Si ya hay una prueba en curso, abortarla y empezar de nuevo
    if (!_testAllSoundsAbort && _testAllSoundsOverlay) {
        abortTestAllSounds();
        await new Promise(r => setTimeout(r, 300));
    }
    
    _testAllSoundsAbort = false;
    
    const soundIds = Object.keys(SOUNDS).filter(id => id !== 'silent');
    const total = soundIds.length;
    
    // Guardar el sonido configurado por el usuario para restaurarlo al final
    const configOriginal = getSoundConfig();
    const soundIdOriginal = configOriginal.soundId || 'beep';
    
    // Desbloquear el audio primero
    await unlockAudio('testAllSounds');
    
    // Crear overlay
    _createTestAllSoundsOverlay();
    
    // Registrar handler de Escape
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            abortTestAllSounds();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    try {
        for (let i = 0; i < total; i++) {
            if (_testAllSoundsAbort) break;
            
            const soundId = soundIds[i];
            
            // Actualizar overlay
            _updateTestAllSoundsOverlay(i + 1, total, soundId);
            
            // Reproducir el sonido
            await playSoundById(soundId);
            
            // Esperar 1.5s entre sonidos (último solo espera 1s)
            const waitTime = (i === total - 1) ? 1000 : 1500;
            
            // Espera cancelable
            for (let elapsed = 0; elapsed < waitTime; elapsed += 100) {
                if (_testAllSoundsAbort) break;
                await new Promise(r => setTimeout(r, 100));
            }
        }
        
        // Si no se abortó, restaurar el sonido configurado
        if (!_testAllSoundsAbort) {
            _updateTestAllSoundsOverlay(total, total, soundIdOriginal);
            
            // Pequeña pausa y reproducir el sonido configurado
            await new Promise(r => setTimeout(r, 300));
            await playSoundById(soundIdOriginal);
            
            // Toast de finalización
            await new Promise(r => setTimeout(r, 800));
            _removeTestAllSoundsOverlay();
            
            window.showToast(
                `✅ Prueba completada · Sonido activo: ${SOUNDS[soundIdOriginal]?.name || soundIdOriginal}`,
                'success',
                3000
            );
        } else {
            // Se abortó: solo quitar overlay
            _removeTestAllSoundsOverlay();
        }
        
    } catch (e) {
        console.error('❌ Error en testAllSounds:', e);
        _removeTestAllSoundsOverlay();
        window.showToast('❌ Error al probar los sonidos', 'error', 4000);
    } finally {
        _testAllSoundsAbort = false;
        document.removeEventListener('keydown', escHandler);
    }
}

function abortTestAllSounds() {
    if (_testAllSoundsAbort) return;
    _testAllSoundsAbort = true;
    console.log('⏹️ Prueba de sonidos abortada por el usuario');
    _removeTestAllSoundsOverlay();
    window.showToast('⏹️ Prueba detenida', 'info', 2000);
}

// ============================================================
// GESTIÓN DE NOTIFICACIONES PERSISTENTES
// ============================================================

function loadNotificationsFromStorage() {
    try {
        const saved = localStorage.getItem('panario_notifications');
        if (saved) {
            const data = JSON.parse(saved);
            notificationList = data.list || [];
            notificationCount = notificationList.filter(n => !n.read).length;
            console.log(`🔔 ${notificationCount} notificaciones pendientes de ${notificationList.length} totales`);
        }
    } catch (e) {
        console.warn('Error cargando notificaciones:', e);
    }
}

function saveNotificationsToStorage() {
    try {
        localStorage.setItem('panario_notifications', JSON.stringify({
            list: notificationList,
            count: notificationCount
        }));
    } catch (e) {
        console.warn('Error guardando notificaciones:', e);
    }
}

function updateBellBadge() {
    const badge = document.getElementById('bell-badge');
    if (!badge) return;
    
    notificationCount = notificationList.filter(n => !n.read).length;
    
    if (notificationCount > 0) {
        badge.style.display = 'flex';
        badge.textContent = notificationCount > 99 ? '99+' : notificationCount;
        const bell = document.getElementById('notification-bell');
        if (bell) {
            bell.style.animation = 'none';
            setTimeout(() => {
                bell.style.animation = 'bellRing 0.5s ease';
            }, 10);
        }
    } else {
        badge.style.display = 'none';
    }
}

// ============================================================
// MOSTRAR TOAST - CON AGRUPACIÓN Y SONIDO CONFIGURABLE
// ============================================================

function showToast(message, type = 'info', duration = 8000) {
    if (isProcessingNotification) {
        console.log('⚠️ Notificación en proceso, ignorando...');
        return;
    }
    
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-width: 380px;
            width: 100%;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }
    
    const colors = {
        [NOTIFICATION_TYPES.SUCCESS]: '#10b981',
        [NOTIFICATION_TYPES.ERROR]: '#ef4444',
        [NOTIFICATION_TYPES.WARNING]: '#f59e0b',
        [NOTIFICATION_TYPES.INFO]: '#3b82f6',
        [NOTIFICATION_TYPES.ORDER]: '#8b5cf6',
        [NOTIFICATION_TYPES.DEBT]: '#ef4444',
        [NOTIFICATION_TYPES.STOCK]: '#f59e0b'
    };
    
    const icons = {
        [NOTIFICATION_TYPES.SUCCESS]: '✅',
        [NOTIFICATION_TYPES.ERROR]: '❌',
        [NOTIFICATION_TYPES.WARNING]: '⚠️',
        [NOTIFICATION_TYPES.INFO]: 'ℹ️',
        [NOTIFICATION_TYPES.ORDER]: '📋',
        [NOTIFICATION_TYPES.DEBT]: '💰',
        [NOTIFICATION_TYPES.STOCK]: '🛒'
    };
    
    // Verificar si ya existe una notificación similar (agrupación)
    const existingNotifications = container.querySelectorAll('.notification-item');
    let isDuplicate = false;
    existingNotifications.forEach(el => {
        const text = el.querySelector('.notification-text')?.textContent || '';
        if (text === message) {
            isDuplicate = true;
            const timeEl = el.querySelector('.notification-time');
            if (timeEl) {
                timeEl.textContent = 'Ahora';
            }
        }
    });
    
    if (isDuplicate) {
        console.log('🔔 Notificación duplicada, agrupada');
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification-item';
    notification.style.cssText = `
        background: var(--bg-card);
        color: var(--text);
        padding: 16px 20px;
        border-radius: 12px;
        border-left: 4px solid ${colors[type] || colors.info};
        box-shadow: 0 8px 30px rgba(0,0,0,0.2);
        animation: slideInRight 0.4s ease;
        pointer-events: auto;
        display: flex;
        align-items: flex-start;
        gap: 14px;
        font-size: 14px;
        backdrop-filter: blur(10px);
        border: 1px solid var(--border-color);
        background: var(--bg-card);
        min-width: 280px;
        position: relative;
    `;
    
    // Reproducir sonido configurado (async, no bloquea)
    playNotificationSound(type).catch(() => {});
    
    notification.innerHTML = `
        <span style="font-size: 22px; flex-shrink: 0;">${icons[type] || 'ℹ️'}</span>
        <div style="flex: 1; line-height: 1.5; word-break: break-word;">
            <div class="notification-text">${message}</div>
            <div class="notification-time" style="font-size: 10px; color: var(--text-light); margin-top: 2px;">Ahora</div>
        </div>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text-light); padding: 0 4px; flex-shrink: 0;">✕</button>
    `;
    
    container.appendChild(notification);
    
    if (duration > 0) {
        const timerId = setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, duration);
        notificationTimers[message] = timerId;
    }
}

// ============================================================
// AGREGAR NOTIFICACIÓN - CON MARCADOR DE ESTADO
// ============================================================

function addNotification(message, type = 'info', duration = 8000) {
    if (isProcessingNotification) {
        console.log('⚠️ Notificación en proceso, ignorando...');
        return null;
    }
    
    isProcessingNotification = true;
    
    try {
        console.log(`🔔 Nueva notificación: ${message} (${type})`);
        
        showToast(message, type, duration);
        
        // Verificar si ya existe una notificación idéntica
        const existingIndex = notificationList.findIndex(n => 
            n.message === message && !n.resolved && !n.read
        );
        
        if (existingIndex !== -1) {
            notificationList[existingIndex].timestamp = new Date().toISOString();
            console.log('🔔 Notificación duplicada detectada, actualizando timestamp');
            saveNotificationsToStorage();
            return notificationList[existingIndex].id;
        }
        
        const notification = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            message: message,
            type: type,
            timestamp: new Date().toISOString(),
            read: false,
            resolved: false,
            viewed_at: null,
            resolved_at: null
        };
        
        // Enviar push si es importante (sin emoji duplicado)
        if (type === NOTIFICATION_TYPES.ERROR || type === NOTIFICATION_TYPES.WARNING) {
            let pushTitle = message.split(' - ')[0] || 'Alerta';
            if (!/^[\u{1F300}-\u{1F9FF}]/u.test(pushTitle)) {
                pushTitle = '📢 ' + pushTitle;
            }
            sendPushNotification(pushTitle, message);
        }
        
        notificationList.unshift(notification);
        if (notificationList.length > MAX_NOTIFICATIONS) {
            notificationList = notificationList.slice(0, MAX_NOTIFICATIONS);
        }
        
        notificationCount = notificationList.filter(n => !n.read).length;
        saveNotificationsToStorage();
        updateBellBadge();
        
        console.log(`🔔 Notificaciones pendientes: ${notificationCount}`);
        return notification.id;
        
    } finally {
        isProcessingNotification = false;
    }
}

// ============================================================
// MOSTRAR MODAL DE NOTIFICACIONES - MARCA COMO VISTAS
// ============================================================

function showNotificationsModal() {
    console.log('🔔 Abriendo modal de notificaciones');
    
    const now = new Date().toISOString();
    notificationList.forEach(n => {
        if (!n.read) {
            n.read = true;
            n.viewed_at = now;
        }
    });
    notificationCount = 0;
    saveNotificationsToStorage();
    updateBellBadge();
    
    const modal = document.createElement('div');
    modal.id = 'notifications-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        padding: 20px;
        animation: modalFadeIn 0.25s ease;
    `;
    
    const hasNotifications = notificationList.length > 0;
    const pendingCount = notificationList.filter(n => !n.resolved).length;
    const resolvedCount = notificationList.filter(n => n.resolved).length;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 28px 32px; max-width: 520px; width: 100%; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: modalSlideUp 0.3s ease; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="margin: 0; font-size: 20px;">🔔 Notificaciones ${notificationList.length > 0 ? `(${notificationList.length})` : ''}</h2>
                <button onclick="closeNotificationsModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            ${pendingCount > 0 ? `
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; font-size: 13px; color: #dc2626; display: flex; justify-content: space-between; align-items: center;">
                    <span>⚠️ ${pendingCount} notificaciones pendientes de resolver</span>
                    <button onclick="resolveAllPendingNotifications()" class="btn success" style="padding: 4px 12px; font-size: 11px; width: auto; background: #10b981; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        ✅ Resolver todas
                    </button>
                </div>
            ` : (resolvedCount > 0 ? `
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; font-size: 13px; color: #16a34a;">
                    ✅ Todas las notificaciones están resueltas
                </div>
            ` : '')}
            
            <div style="flex: 1; overflow-y: auto; max-height: 400px; padding-right: 4px;">
                ${hasNotifications ? notificationList.map(n => `
                    <div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-bottom: 1px solid var(--border-color); font-size: 14px; transition: background 0.2s; ${n.resolved ? 'opacity: 0.5;' : ''}" 
                         onmouseover="this.style.background='var(--bg)'" 
                         onmouseout="this.style.background='transparent'">
                        <span style="font-size: 20px; flex-shrink: 0;">${getTypeIcon(n.type)}</span>
                        <span style="flex: 1; line-height: 1.5;">
                            ${n.message}
                            ${n.resolved ? '<span style="font-size: 11px; color: #10b981; margin-left: 8px;">✅ Resuelta</span>' : ''}
                            ${n.viewed_at && !n.resolved ? '<span style="font-size: 11px; color: #3b82f6; margin-left: 8px;">👁️ Vista</span>' : ''}
                        </span>
                        <span style="font-size: 11px; color: var(--text-light); flex-shrink: 0; white-space: nowrap;">${formatTimestamp(n.timestamp)}</span>
                    </div>
                `).join('') : `
                    <div style="text-align: center; padding: 40px 20px; color: var(--text-light);">
                        <span style="font-size: 48px; display: block; margin-bottom: 12px;">📭</span>
                        <p style="font-size: 16px;">No hay notificaciones</p>
                    </div>
                `}
            </div>
            
            <div style="display: flex; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color); flex-wrap: wrap;">
                ${hasNotifications ? `
                    <button onclick="clearAllNotifications()" class="btn danger" style="padding: 8px 20px; font-size: 13px; width: auto; background: #ef4444; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        🗑️ Limpiar todo
                    </button>
                ` : ''}
                <button onclick="closeNotificationsModal()" class="btn secondary" style="padding: 8px 20px; font-size: 13px; width: auto; margin-left: auto; border: 2px solid var(--border-color); background: transparent; color: var(--text); border-radius: 8px; cursor: pointer;">
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    window.closeNotificationsModal = function() {
        const modal = document.getElementById('notifications-modal');
        if (modal) {
            modal.style.animation = 'modalFadeOut 0.2s ease forwards';
            setTimeout(() => {
                if (modal.parentNode) modal.remove();
            }, 200);
        }
    };
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeNotificationsModal();
        }
    });
}

function resolveAllPendingNotifications() {
    window.ModalModule.showConfirm({
        title: 'Resolver notificaciones',
        message: '¿Seguro que quieres marcar todas las notificaciones como resueltas?',
        confirmText: 'Sí, resolver todas',
        cancelText: 'Cancelar',
        icon: '✅',
        confirmColor: '#10b981'
    }).then(confirm => {
        if (confirm) {
            const now = new Date().toISOString();
            let count = 0;
            notificationList.forEach(n => {
                if (!n.resolved) {
                    n.resolved = true;
                    n.resolved_at = now;
                    count++;
                }
            });
            if (count > 0) {
                saveNotificationsToStorage();
                updateBellBadge();
                closeNotificationsModal();
                showToast(`✅ ${count} notificaciones resueltas`, 'success', 3000);
                setTimeout(showNotificationsModal, 500);
            }
        }
    });
}

function clearAllNotifications() {
    window.ModalModule.showConfirm({
        title: 'Limpiar notificaciones',
        message: '¿Seguro que quieres eliminar todas las notificaciones?',
        confirmText: 'Sí, limpiar',
        cancelText: 'Cancelar',
        icon: '🗑️',
        confirmColor: '#ef4444'
    }).then(confirm => {
        if (confirm) {
            notificationList = [];
            notificationCount = 0;
            saveNotificationsToStorage();
            updateBellBadge();
            closeNotificationsModal();
            showToast('🗑️ Notificaciones limpiadas', 'info', 3000);
        }
    });
}

// ============================================================
// UTILIDADES
// ============================================================

function getTypeIcon(type) {
    const icons = {
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️',
        'order': '📋',
        'debt': '💰',
        'stock': '🛒'
    };
    return icons[type] || 'ℹ️';
}

function formatTimestamp(timestamp) {
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = Math.floor((now - date) / 60000);
        if (diff < 1) return 'Ahora';
        if (diff < 60) return `Hace ${diff} min`;
        if (diff < 1440) return `Hace ${Math.floor(diff / 60)}h`;
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    } catch (e) {
        return '';
    }
}

// ============================================================
// SOLICITAR PERMISO PARA NOTIFICACIONES PUSH
// ============================================================

async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('🔔 Notificaciones no soportadas en este navegador');
        return false;
    }
    
    if (Notification.permission === 'granted') {
        console.log('✅ Permiso de notificaciones ya concedido');
        return true;
    }
    
    if (Notification.permission === 'denied') {
        console.log('❌ Permiso de notificaciones denegado');
        return false;
    }
    
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('✅ Permiso de notificaciones concedido');
            sendPushNotification(
                '🍞 Panario',
                'Las notificaciones están activadas. Recibirás alertas de pedidos y deudas.'
            );
            return true;
        } else {
            console.log('❌ Permiso de notificaciones denegado');
            return false;
        }
    } catch (e) {
        console.error('Error solicitando permiso:', e);
        return false;
    }
}

// ============================================================
// ENVIAR NOTIFICACIÓN PUSH
// ============================================================

function sendPushNotification(title, body, icon = '🍞', data = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return false;
    }
    
    try {
        let cleanTitle = title.trim();
        
        const notification = new Notification(cleanTitle, {
            body: body,
            icon: icon,
            vibrate: [200, 100, 200, 100, 200],
            requireInteraction: true,
            silent: false,
            tag: 'panario-notification-' + Date.now(),
            data: data,
            actions: [
                { action: 'view', title: '👁️ Ver' },
                { action: 'dismiss', title: '✕ Cerrar' }
            ]
        });
        
        notification.onclick = function() {
            window.focus();
            this.close();
            if (this.data && this.data.section) {
                window.navigate(this.data.section);
            }
        };
        
        notification.onaction = function(event) {
            if (event.action === 'view') {
                window.focus();
                this.close();
                if (this.data && this.data.section) {
                    window.navigate(this.data.section);
                }
            } else {
                this.close();
            }
        };
        
        setTimeout(() => notification.close(), 30000);
        return true;
    } catch (e) {
        console.error('Error enviando notificación push:', e);
        return false;
    }
}

// ============================================================
// WHATSAPP Y EMAIL
// ============================================================

function sendWhatsAppReminder(phone, message) {
    if (!phone) {
        addNotification('⚠️ No hay número de teléfono para enviar WhatsApp', 'warning');
        return false;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 8) {
        addNotification('⚠️ Número de teléfono inválido', 'warning');
        return false;
    }
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    addNotification('📱 Abriendo WhatsApp...', 'info', 3000);
    return true;
}

function sendEmailReminder(email, subject, body) {
    if (!email) {
        addNotification('⚠️ No hay email para enviar recordatorio', 'warning');
        return false;
    }
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
    addNotification('📧 Abriendo cliente de email...', 'info', 3000);
    return true;
}

// ============================================================
// VERIFICAR PEDIDOS PENDIENTES - CON MARCADOR DE ESTADO
// ============================================================

async function checkPendingOrders() {
    const user = window.AuthModule?.getCurrentUser();
    if (!user) return;
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        
        const todayOrders = window.DBModule.query(`
            SELECT * FROM orders 
            WHERE user_id = ? 
            AND DATE(delivery_date) = DATE(?)
            AND status NOT IN ('delivered', 'cancelled')
        `, [user.id, today]);
        
        const tomorrowOrders = window.DBModule.query(`
            SELECT * FROM orders 
            WHERE user_id = ? 
            AND DATE(delivery_date) = DATE(?)
            AND status NOT IN ('delivered', 'cancelled')
        `, [user.id, tomorrow]);
        
        for (const order of todayOrders) {
            const msg = `🔔 Pedido #${order.id} - ${order.client_name} - ENTREGA HOY`;
            addNotification(msg, NOTIFICATION_TYPES.ORDER, 10000);
            sendPushNotification(
                '📦 Pedido para hoy',
                `${order.client_name} - Pedido #${order.id}`,
                '🍞',
                { section: 'orders', orderId: order.id }
            );
        }
        
        for (const order of tomorrowOrders) {
            const msg = `📅 Pedido #${order.id} - ${order.client_name} - ENTREGA MAÑANA`;
            addNotification(msg, NOTIFICATION_TYPES.INFO, 10000);
            sendPushNotification(
                '📋 Pedido para mañana',
                `${order.client_name} - Pedido #${order.id}`,
                '🍞',
                { section: 'orders', orderId: order.id }
            );
        }
        
        const debts = await window.OrdersModule?.getDebts() || [];
        if (debts.length > 0) {
            const totalDebt = debts.reduce((sum, d) => sum + (d.remaining || 0), 0);
            if (totalDebt > 0) {
                const debtMsg = `💰 Tienes $${totalDebt.toFixed(2)} en deudas pendientes (${debts.length} clientes)`;
                addNotification(debtMsg, NOTIFICATION_TYPES.DEBT, 10000);
                sendPushNotification(
                    '💳 Deudas pendientes',
                    `Total: $${totalDebt.toFixed(2)} - ${debts.length} clientes`,
                    '💳',
                    { section: 'sales' }
                );
            }
        }
        
        const insumos = window.DBModule.getInsumos();
        const lowStockItems = insumos.filter(i => i.stock <= i.stock_minimo && i.stock > 0);
        const noStockItems = insumos.filter(i => i.stock <= 0);
        
        if (lowStockItems.length > 0) {
            const msg = `⚠️ ${lowStockItems.length} insumos con stock bajo: ${lowStockItems.map(i => i.nombre).join(', ')}`;
            addNotification(msg, NOTIFICATION_TYPES.STOCK, 10000);
        }
        
        if (noStockItems.length > 0) {
            const msg = `🚫 ${noStockItems.length} insumos sin stock: ${noStockItems.map(i => i.nombre).join(', ')}`;
            addNotification(msg, NOTIFICATION_TYPES.ERROR, 10000);
            sendPushNotification(
                '🚫 Insumos sin stock',
                `${noStockItems.length} insumos agotados`,
                '🚫',
                { section: 'insumos' }
            );
        }
        
    } catch (error) {
        console.error('Error verificando pedidos:', error);
    }
}

// ============================================================
// INICIAR SISTEMA DE RECORDATORIOS
// ============================================================

function startReminderSystem() {
    initNotificationSystem();
    setInterval(checkPendingOrders, 300000);
    setTimeout(checkPendingOrders, 3000);
    console.log('🔔 Sistema de recordatorios iniciado');
}

// ============================================================
// EXPORTAR FUNCIONES
// ============================================================

window.NotificationsModule = {
    addNotification,
    showToast,
    showNotificationsModal,
    clearAllNotifications,
    resolveAllPendingNotifications,
    requestNotificationPermission,
    sendPushNotification,
    sendWhatsAppReminder,
    sendEmailReminder,
    checkPendingOrders,
    startReminderSystem,
    initNotificationSystem,
    playNotificationSound,
    getSoundConfig,
    setSoundConfig,
    getAvailableSounds,
    playSoundById,
    testAllSounds,
    abortTestAllSounds,
    SOUNDS,
    // 🆕 FASE 1.5
    unlockAudio,
    getAudioContext,
    setupAudioUnlockListeners
};

window.showToast = function(message, type = 'info', duration = 8000) {
    window.NotificationsModule.addNotification(message, type, duration);
};

window.testAllSounds = testAllSounds;
window.abortTestAllSounds = abortTestAllSounds;

console.log('📦 Notifications Module v2.1.10 (FASE 1.5: fix definitivo - sonido desde el primer clic)');
console.log('   🔊 AudioContext singleton listo');
console.log('   🎯 Listeners de unlock registrados al cargar el módulo');