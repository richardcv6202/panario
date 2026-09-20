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
    'silent': { name: '🔇 Silencio', freq: 0, duration: 0 },
    'beep': { name: '🔔 Beep', freq: 800, duration: 0.15 },
    'chime': { name: '🎵 Chime', freq: 1200, duration: 0.3 },
    'pop': { name: '💧 Pop', freq: 600, duration: 0.1 },
    'alert': { name: '⚠️ Alert', freq: 400, duration: 0.25 },
    'success': { name: '✅ Success', freq: 1500, duration: 0.2 }
};

// ============================================================
// 🆕 FASE 1.4: AUDIO CONTEXT SINGLETON
// ============================================================
// Un solo AudioContext reutilizado para toda la app.
// Se desbloquea al primer gesto del usuario.
// ============================================================

let _audioContext = null;
let _audioUnlocked = false;
let _audioUnlockAttempts = 0;
const MAX_UNLOCK_ATTEMPTS = 5;

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
 * Desbloquea el AudioContext.
 * Debe llamarse en respuesta a un gesto del usuario (click, touch, key).
 * 
 * @returns {Promise<boolean>} true si quedó desbloqueado
 */
async function unlockAudio() {
    if (_audioUnlocked && _audioContext && _audioContext.state === 'running') {
        return true;
    }
    
    _audioUnlockAttempts++;
    if (_audioUnlockAttempts > MAX_UNLOCK_ATTEMPTS) {
        // No seguir intentando
        return false;
    }
    
    try {
        const ctx = getAudioContext();
        if (!ctx) return false;
        
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }
        
        if (ctx.state === 'running') {
            _audioUnlocked = true;
            console.log('🔊 AudioContext desbloqueado (intento #' + _audioUnlockAttempts + ')');
            return true;
        }
        
        return false;
        
    } catch (e) {
        // Silencioso: el navegador bloquea sin gesto
        return false;
    }
}

// ============================================================
// REGISTRAR UNLOCK EN EL PRIMER GESTO DEL USUARIO
// ============================================================

function setupAudioUnlockListeners() {
    const events = ['click', 'touchstart', 'keydown'];
    
    const unlockHandler = () => {
        unlockAudio().then(unlocked => {
            if (unlocked) {
                // Una vez desbloqueado, quitar los listeners
                events.forEach(evt => {
                    document.removeEventListener(evt, unlockHandler, true);
                });
            }
        });
    };
    
    events.forEach(evt => {
        document.addEventListener(evt, unlockHandler, true);
    });
    
    console.log('🔊 Listeners de desbloqueo de audio registrados');
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
    
    // 🆕 FASE 1.4: Registrar listeners de desbloqueo de audio
    setupAudioUnlockListeners();
    
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
        name: data.name
    }));
}

// ============================================================
// 🆕 FASE 1.4: REPRODUCIR SONIDO CON AUDIO CONTEXT SINGLETON
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
                // Salir silenciosamente
                return false;
            }
        }
        
        // Si aún está suspendido después de resume, no podemos reproducir
        if (ctx.state !== 'running') {
            return false;
        }
        
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

/**
 * 🆕 FASE 1.4: Prueba todos los sonidos con delay.
 * Ahora con promesas para secuenciar correctamente.
 */
async function testAllSounds() {
    const soundIds = Object.keys(SOUNDS).filter(id => id !== 'silent');
    
    // Desbloquear el audio primero
    await unlockAudio();
    
    window.showToast('🔊 Probando los ' + soundIds.length + ' sonidos...', 'info', 6000);
    
    for (let i = 0; i < soundIds.length; i++) {
        const soundId = soundIds[i];
        const soundName = SOUNDS[soundId].name;
        
        console.log(`🔊 Probando ${i + 1}/${soundIds.length}: ${soundName}`);
        window.showToast(`🔊 ${i + 1}/${soundIds.length}: ${soundName}`, 'info', 1400);
        
        await playSoundById(soundId);
        await new Promise(r => setTimeout(r, 1500));
    }
    
    // Restaurar el sonido configurado por el usuario
    const config = getSoundConfig();
    await playSoundById(config.soundId);
    
    window.showToast('✅ Sonidos probados. Vuelto a: ' + (SOUNDS[config.soundId]?.name || config.soundId), 'success', 3000);
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
        
        // 🆕 FASE 1.4: Enviar push si es importante (sin emoji duplicado)
        if (type === NOTIFICATION_TYPES.ERROR || type === NOTIFICATION_TYPES.WARNING) {
            // Limpiar título: no añadir emoji extra si ya lo tiene
            let pushTitle = message.split(' - ')[0] || 'Alerta';
            // Si no empieza con emoji, añadir uno
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

// ============================================================
// RESOLVER TODAS LAS NOTIFICACIONES PENDIENTES
// ============================================================

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

// ============================================================
// LIMPIAR TODAS LAS NOTIFICACIONES
// ============================================================

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
            // 🆕 FASE 1.4: Sin emoji duplicado en el título
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
// 🆕 FASE 1.4: Sin emoji duplicado en el título
// ============================================================

function sendPushNotification(title, body, icon = '🍞', data = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return false;
    }
    
    try {
        // 🆕 FASE 1.4: Limpiar emoji duplicado en el título
        // Si el título ya empieza con un emoji, no añadir otro
        let cleanTitle = title.trim();
        
        // Si el título no empieza con emoji, añadir el icono
        const startsWithEmoji = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/u.test(cleanTitle);
        if (!startsWithEmoji && icon && icon !== '🍞') {
            // El título ya viene con emoji desde addNotification, no añadir
        }
        
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
    SOUNDS,
    // 🆕 FASE 1.4
    unlockAudio,
    getAudioContext
};

window.showToast = function(message, type = 'info', duration = 8000) {
    window.NotificationsModule.addNotification(message, type, duration);
};

console.log('📦 Notifications Module v2.0.7 (FASE 1.4: AudioContext singleton + unlock)');