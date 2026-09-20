// ============================================================
// 📦 PROFILE MODULE - Panario
// CORREGIDO: Sonido de notificaciones configurable
// ACTUALIZADO: Toggles para Dashboard (sin botón de Ayuda)
// AÑADIDO FASE D.3 (170926):
//   - Botón "✨ Generar QR" en el modal de cuentas bancarias
//   - Genera QR dinámicamente con banco + titular + cuenta + teléfono
//   - Mantiene la opción "📁 Subir imagen" para usar QR de otras apps
//   - Vista previa en vivo del QR generado
//   - Guarda el QR como data:image/png;base64 en la columna qr_code
// CORREGIDO FASE 1.3.4 FIX (200926):
//   - closeEditBankAccountModal ahora está DEFINIDA GLOBALMENTE
//     al principio del archivo (antes estaba dentro de editBankAccount()
//     y fallaba si se invocaba antes de abrir ese modal)
//   - Eliminada la definición duplicada al final de editBankAccount()
// ============================================================

// ============================================================
// 🆕 FIX 1.3.4: DEFINICIÓN GLOBAL TEMPRANA
// ============================================================
// Esta función estaba declarada dentro de editBankAccount() (scope local).
// Eso causaba "Uncaught ReferenceError: closeEditBankAccountModal is not defined"
// si se invocaba desde el HTML del modal antes de que editBankAccount() se
// hubiera ejecutado al menos una vez.
// 
// SOLUCIÓN: definirla globalmente al principio del archivo, para que exista
// siempre. La versión duplicada al final de editBankAccount() se ha eliminado.
// ============================================================

window.closeEditBankAccountModal = function() {
    const m = document.getElementById('edit-bank-account-modal');
    if (m) {
        m.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => {
            if (m.parentNode) m.remove();
        }, 200);
        setTimeout(() => {
            const still = document.getElementById('edit-bank-account-modal');
            if (still && still.parentNode) still.remove();
        }, 500);
    }
};

// ============================================================
// CARGA DEL PERFIL
// ============================================================

function loadProfile(user) {
    const main = document.getElementById('mainContent');
    
    if (!user) {
        user = window.AuthModule.getCurrentUser();
    }
    
    if (!user) {
        main.innerHTML = `
            <div class="card">
                <h2>👤 Perfil</h2>
                <p>❌ No hay usuario autenticado.</p>
            </div>
        `;
        return;
    }
    
    let avatarHtml = '';
    if (user.photo && user.photo.startsWith('data:image')) {
        avatarHtml = `<img src="${user.photo}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    } else {
        avatarHtml = `<span style="font-size: 48px; line-height: 1; font-family: 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif;">👤</span>`;
    }
    
    const themeStatus = user.theme === 'dark' ? '🌙 Oscuro' : '☀️ Claro';
    const themeIcon = user.theme === 'dark' ? '☀️' : '🌙';
    const themeAction = user.theme === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro';
    
    const guiaDeshabilitada = localStorage.getItem('panario_guia_deshabilitada') === 'true';
    const dashConfig = user.dashboard_config || window.DBModule.getUserDashboardConfig(user.id);
    
    const soundConfig = window.NotificationsModule?.getSoundConfig() || { enabled: true, soundId: 'beep' };
    const availableSounds = window.NotificationsModule?.getAvailableSounds() || [];
    
    main.innerHTML = `
        <div class="card">
            <h2>👤 Mi Perfil</h2>
            
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                <div id="profile-avatar-display" onclick="document.getElementById('profile-photo-input').click()" 
                     style="width: 80px; height: 80px; border-radius: 50%; background: var(--bg); 
                            border: 3px solid var(--primary); display: flex; align-items: center; 
                            justify-content: center; cursor: pointer; overflow: hidden; flex-shrink: 0;">
                    ${avatarHtml}
                </div>
                <div>
                    <div style="font-weight: 600; font-size: 18px;">${user.name || user.username}</div>
                    <div style="font-size: 13px; color: var(--text-light);">@${user.username}</div>
                    <div style="font-size: 12px; color: var(--text-light); margin-top: 2px;">
                        <span style="background: var(--bg); padding: 2px 10px; border-radius: 12px;">${themeStatus}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-light); margin-top: 4px;">
                        <span style="cursor: pointer; color: var(--primary);" onclick="document.getElementById('profile-photo-input').click()">
                            📷 Cambiar foto
                        </span>
                    </div>
                    <input type="file" id="profile-photo-input" accept="image/*" style="display:none;" 
                           onchange="handlePhotoUpload(event, ${user.id})">
                </div>
            </div>
            
            <hr>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div>
                    <label style="font-weight: 600; color: var(--text-light); font-size: 13px;">Usuario:</label>
                    <p style="font-size: 16px; margin-top: 2px;"><strong>${user.username}</strong></p>
                </div>
                
                <div>
                    <label style="font-weight: 600; color: var(--text-light); font-size: 13px;">Nombre completo:</label>
                    <p style="font-size: 16px; margin-top: 2px;">${user.name || '—'}</p>
                </div>
                
                <div>
                    <label style="font-weight: 600; color: var(--text-light); font-size: 13px;">Negocio:</label>
                    <p style="font-size: 16px; margin-top: 2px;">
                        ${user.business_name || '—'}
                        ${user.negocio ? `<span style="font-size: 11px; background: #8b5cf620; color: #8b5cf6; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">🏢 ${user.negocio.nombre}</span>` : ''}
                    </p>
                    ${user.negocio ? `
                        <div style="font-size: 11px; color: var(--text-light); margin-top: 4px;">
                            🔑 Código de invitación: <strong style="color: #f59e0b; cursor: pointer;" onclick="copiarCodigoInvitacion('${user.negocio.codigo_invitacion}')">${user.negocio.codigo_invitacion}</strong>
                            <span style="cursor: pointer; color: var(--primary); margin-left: 4px;" onclick="copiarCodigoInvitacion('${user.negocio.codigo_invitacion}')">📋 Copiar</span>
                            <button onclick="editarNombreNegocio()" class="btn secondary" style="padding: 1px 8px; font-size: 10px; width: auto; margin-left: 6px;">✏️ Editar</button>
                        </div>
                    ` : ''}
                </div>
                
                <div>
                    <label style="font-weight: 600; color: var(--text-light); font-size: 13px;">Email:</label>
                    <p style="font-size: 16px; margin-top: 2px;">${user.email || '—'}</p>
                </div>
                
                <div>
                    <label style="font-weight: 600; color: var(--text-light); font-size: 13px;">Teléfono:</label>
                    <p style="font-size: 16px; margin-top: 2px;">${user.phone || '—'}</p>
                </div>
                
                <div>
                    <label style="font-weight: 600; color: var(--text-light); font-size: 13px;">Tema:</label>
                    <p style="font-size: 16px; margin-top: 2px;">
                        ${themeStatus}
                        <button onclick="toggleUserTheme()" class="btn secondary" style="padding: 2px 12px; font-size: 12px; width: auto; margin-left: 8px;">
                            ${themeIcon} ${themeAction}
                        </button>
                    </p>
                </div>
                
                <div>
                    <label style="font-weight: 600; color: var(--text-light); font-size: 13px;">Fecha de registro:</label>
                    <p style="font-size: 16px; margin-top: 2px;">${user.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : '—'}</p>
                </div>
            </div>
            
            <hr>
            
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 16px;">
                <span style="font-size: 20px;">🚀</span>
                <div style="flex: 1;">
                    <div style="font-size: 14px; font-weight: 600;">Mostrar Guía rápida al inicio</div>
                    <div style="font-size: 11px; color: var(--text-light); margin-top: 2px;">
                        Muestra la guía de 5 pasos al abrir la app
                    </div>
                </div>
                <label style="position: relative; display: inline-block; width: 50px; height: 26px; cursor: pointer; flex-shrink: 0;">
                    <input type="checkbox" id="toggle-guia-rapida" 
                           ${!guiaDeshabilitada ? 'checked' : ''}
                           onchange="toggleGuiaRapida(this.checked)"
                           style="opacity: 0; width: 0; height: 0;">
                    <span id="toggle-guia-slider" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; 
                          background-color: ${!guiaDeshabilitada ? '#10b981' : '#94a3b8'}; 
                          border-radius: 26px; transition: 0.3s;">
                        <span style="position: absolute; height: 18px; width: 18px; 
                              left: ${!guiaDeshabilitada ? '28px' : '4px'}; bottom: 4px; 
                              background-color: white; border-radius: 50%; transition: 0.3s; 
                              box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
                    </span>
                </label>
            </div>
            
            <hr>
            
            <!-- SECCIÓN DE SONIDO DE NOTIFICACIONES -->
            <div style="background: var(--bg); padding: 14px 16px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <span style="font-size: 20px;">🔔</span>
                    <div style="flex: 1;">
                        <div style="font-size: 14px; font-weight: 600;">Sonido de notificaciones</div>
                        <div style="font-size: 11px; color: var(--text-light); margin-top: 2px;">
                            Elige el sonido que se reproduce al recibir alertas
                        </div>
                    </div>
                    <label style="position: relative; display: inline-block; width: 50px; height: 26px; cursor: pointer; flex-shrink: 0;">
                        <input type="checkbox" id="toggle-sound-enabled" 
                               ${soundConfig.enabled ? 'checked' : ''}
                               onchange="toggleNotificationSound(this.checked)"
                               style="opacity: 0; width: 0; height: 0;">
                        <span id="toggle-sound-slider" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; 
                              background-color: ${soundConfig.enabled ? '#10b981' : '#94a3b8'}; 
                              border-radius: 26px; transition: 0.3s;">
                            <span style="position: absolute; height: 18px; width: 18px; 
                                  left: ${soundConfig.enabled ? '28px' : '4px'}; bottom: 4px; 
                                  background-color: white; border-radius: 50%; transition: 0.3s; 
                                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
                        </span>
                    </label>
                </div>
                
                <div id="sound-options-container" style="display: flex; flex-direction: column; gap: 6px; opacity: ${soundConfig.enabled ? '1' : '0.5'}; pointer-events: ${soundConfig.enabled ? 'auto' : 'none'};">
                    ${availableSounds.map(sound => `
                        <div class="sound-option" data-sound-id="${sound.id}" 
                             onclick="selectNotificationSound('${sound.id}')"
                             style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--bg-card); border-radius: 6px; border: 2px solid ${soundConfig.soundId === sound.id ? 'var(--primary)' : 'var(--border-color)'}; cursor: pointer; transition: all 0.2s;">
                            <input type="radio" name="sound-option-radio" value="${sound.id}" 
                                   ${soundConfig.soundId === sound.id ? 'checked' : ''}
                                   style="width: 16px; height: 16px; cursor: pointer; accent-color: var(--primary);">
                            <span style="flex: 1; font-size: 13px;">${sound.name}</span>
                            <button type="button" 
                                    onclick="event.stopPropagation(); testSingleSound('${sound.id}')"
                                    style="background: var(--primary); color: #fff; border: none; border-radius: 6px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-weight: 600;">
                                🔊 Probar
                            </button>
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top: 8px; display: flex; justify-content: flex-end;">
                    <button type="button" onclick="testAllNotificationSounds()" 
                            class="btn secondary" 
                            style="padding: 4px 12px; font-size: 11px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 6px; cursor: pointer;">
                        🔊 Probar todos
                    </button>
                </div>
            </div>
            
            <hr>
            
            <div style="background: var(--bg); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <span style="font-size: 20px;">📊</span>
                    <div style="flex: 1;">
                        <div style="font-size: 14px; font-weight: 600;">Elementos visibles en el Dashboard</div>
                        <div style="font-size: 11px; color: var(--text-light); margin-top: 2px;">
                            Activa o desactiva las secciones que quieres ver
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${renderDashboardToggle('show_corriente', '⚡ Horario de corriente hoy', 'Muestra los bloques de corriente del día actual', dashConfig.show_corriente)}
                    ${renderDashboardToggle('show_top_clients', '🏆 Mejores clientes', 'Ranking de los 3 clientes que más compran', dashConfig.show_top_clients)}
                    ${renderDashboardToggle('show_top_products', '🏷️ Productos más vendidos', 'Top 5 de productos con más ventas', dashConfig.show_top_products)}
                    ${renderDashboardToggle('show_funds_analysis', '💵 Análisis de efectivo y banco', 'Saldos y movimientos por método de pago', dashConfig.show_funds_analysis)}
                    ${renderDashboardToggle('show_payment_methods', '💳 Métodos de pago', 'Distribución de ventas por método de pago', dashConfig.show_payment_methods)}
                    ${renderDashboardToggle('show_quick_actions', '🔗 Botones de acción rápida', 'Accesos directos a Pedidos, Ventas, Insumos, etc.', dashConfig.show_quick_actions)}
                    ${renderDashboardToggle('show_bank_qr', '🏦 QR de cuenta bancaria', 'Muestra el QR de tu cuenta bancaria predeterminada', dashConfig.show_bank_qr)}
                    ${renderDashboardToggle('show_orders_today', '📋 Pedidos de hoy', 'Muestra la tarjeta de pedidos del día y lista de espera', dashConfig.show_orders_today)}
                </div>
            </div>
            
            <hr>
            
            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
                <button onclick="showBankAccountsModal()" class="btn primary" style="max-width: 100%; background: #3b82f6; color: #fff; border: none; border-radius: 8px; padding: 10px; cursor: pointer; font-weight: 600;">
                    🏦 Datos Bancarios
                </button>
            </div>
            
            <hr>
            
            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
                <div style="font-weight: 600; color: var(--text-light); font-size: 13px; margin-bottom: 4px;">❓ Ayuda y Tutoriales</div>
                
                <button onclick="showQuickStartGuide()" class="btn secondary" style="max-width: 100%; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; padding: 10px; cursor: pointer; font-weight: 600;">
                    🚀 Guía rápida de inicio
                </button>
                
                <button onclick="startInteractiveTour()" class="btn secondary" style="max-width: 100%; background: #f59e0b; color: #fff; border: none; border-radius: 8px; padding: 10px; cursor: pointer; font-weight: 600;">
                    🎯 Tutorial interactivo
                </button>
                
                <button onclick="showFAQModal()" class="btn secondary" style="max-width: 100%; background: #3b82f6; color: #fff; border: none; border-radius: 8px; padding: 10px; cursor: pointer; font-weight: 600;">
                    ❓ Preguntas frecuentes (FAQ)
                </button>
            </div>
            
            <hr>
            
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button id="editProfileBtn" class="btn primary" style="max-width: 100%;">
                    ✏️ Editar perfil
                </button>
                <button id="logoutBtn" class="btn secondary" style="max-width: 100%; color: #ef4444; border-color: #ef4444;">
                    🚪 Cerrar sesión
                </button>
            </div>
        </div>
        
        <div id="editProfileModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); justify-content: center; align-items: center; z-index: 1000; padding: 20px;">
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 400px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <h2>✏️ Editar perfil</h2>
                <form id="editProfileForm" style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;">
                    <div class="form-group">
                        <label>Nombre completo</label>
                        <input type="text" id="editName" value="${user.name || ''}" placeholder="Tu nombre">
                    </div>
                    <div class="form-group">
                        <label>Negocio</label>
                        <input type="text" id="editBusiness" value="${user.business_name || ''}" placeholder="Nombre del negocio">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="editEmail" value="${user.email || ''}" placeholder="correo@ejemplo.com">
                    </div>
                    <div class="form-group">
                        <label>Teléfono</label>
                        <input type="tel" id="editPhone" value="${user.phone || ''}" placeholder="+34 600 000 000">
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 8px;">
                        <button type="submit" class="btn primary" style="flex: 1;">💾 Guardar</button>
                        <button type="button" id="cancelEditBtn" class="btn secondary" style="flex: 1;">Cancelar</button>
                    </div>
                    <div id="editError" class="error"></div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('logoutBtn').addEventListener('click', function() {
        if (typeof window.handleLogout === 'function') {
            window.handleLogout();
        } else {
            window.ModalModule.showConfirm({
                title: 'Cerrar sesión',
                message: '¿Seguro que quieres cerrar sesión?',
                confirmText: 'Sí, cerrar sesión',
                cancelText: 'Cancelar',
                icon: '🚪',
                confirmColor: '#ef4444'
            }).then(confirm => {
                if (confirm) window.location.reload(true);
            });
        }
    });
    
    document.getElementById('editProfileBtn').addEventListener('click', () => {
        document.getElementById('editProfileModal').style.display = 'flex';
    });
    
    document.getElementById('cancelEditBtn').addEventListener('click', () => {
        document.getElementById('editProfileModal').style.display = 'none';
    });
    
    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('editError');
        errorEl.textContent = '⏳ Guardando...';
        
        const updatedData = {
            id: user.id,
            name: document.getElementById('editName').value.trim(),
            business_name: document.getElementById('editBusiness').value.trim(),
            email: document.getElementById('editEmail').value.trim(),
            phone: document.getElementById('editPhone').value.trim(),
            theme: user.theme || 'light'
        };
        
        const result = await window.AuthModule.updateUserProfile(updatedData);
        if (result.success) {
            errorEl.textContent = '✅ Perfil actualizado correctamente';
            document.getElementById('editProfileModal').style.display = 'none';
            setTimeout(() => loadProfile(window.AuthModule.getCurrentUser()), 500);
        } else {
            errorEl.textContent = '❌ ' + result.error;
        }
    });
    
    document.getElementById('editProfileModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
    });
}

// ============================================================
// TOGGLE DE SONIDO DE NOTIFICACIONES
// ============================================================

function toggleNotificationSound(enabled) {
    try {
        const result = window.NotificationsModule.setSoundConfig({ enabled });
        
        if (result.success) {
            const slider = document.getElementById('toggle-sound-slider');
            const innerCircle = slider?.querySelector('span');
            const optionsContainer = document.getElementById('sound-options-container');
            
            if (slider && innerCircle) {
                if (enabled) {
                    slider.style.backgroundColor = '#10b981';
                    innerCircle.style.left = '28px';
                } else {
                    slider.style.backgroundColor = '#94a3b8';
                    innerCircle.style.left = '4px';
                }
            }
            
            if (optionsContainer) {
                optionsContainer.style.opacity = enabled ? '1' : '0.5';
                optionsContainer.style.pointerEvents = enabled ? 'auto' : 'none';
            }
            
            window.showToast(
                enabled ? '🔊 Sonido activado' : '🔇 Sonido desactivado',
                'info',
                2000
            );
        }
    } catch (e) {
        console.error('Error toggling sound:', e);
        window.showToast('❌ Error al cambiar configuración', 'error');
    }
}

function selectNotificationSound(soundId) {
    try {
        const result = window.NotificationsModule.setSoundConfig({ soundId });
        
        if (result.success) {
            document.querySelectorAll('.sound-option').forEach(option => {
                const optionSoundId = option.dataset.soundId;
                const radio = option.querySelector('input[type="radio"]');
                
                if (optionSoundId === soundId) {
                    option.style.borderColor = 'var(--primary)';
                    if (radio) radio.checked = true;
                } else {
                    option.style.borderColor = 'var(--border-color)';
                    if (radio) radio.checked = false;
                }
            });
            
            if (soundId !== 'silent') {
                window.NotificationsModule.playSoundById(soundId);
            }
            
            window.showToast(`✅ Sonido seleccionado`, 'success', 1500);
        }
    } catch (e) {
        console.error('Error selecting sound:', e);
        window.showToast('❌ Error al seleccionar sonido', 'error');
    }
}

function testSingleSound(soundId) {
    try {
        window.NotificationsModule.playSoundById(soundId);
    } catch (e) {
        console.error('Error testing sound:', e);
    }
}

function testAllNotificationSounds() {
    try {
        window.NotificationsModule.testAllSounds();
    } catch (e) {
        console.error('Error testing all sounds:', e);
    }
}

// ============================================================
// TOGGLE DE GUÍA RÁPIDA
// ============================================================

function toggleGuiaRapida(activada) {
    if (activada) {
        localStorage.removeItem('panario_guia_deshabilitada');
        localStorage.removeItem('panario_tour_completed');
        window.showToast('✅ Guía rápida activada. Se mostrará al próximo inicio.', 'success', 3000);
    } else {
        localStorage.setItem('panario_guia_deshabilitada', 'true');
        window.showToast('✅ Guía rápida desactivada.', 'info', 3000);
    }
    
    const slider = document.getElementById('toggle-guia-slider');
    const innerCircle = slider?.querySelector('span');
    if (slider && innerCircle) {
        if (activada) {
            slider.style.backgroundColor = '#10b981';
            innerCircle.style.left = '28px';
        } else {
            slider.style.backgroundColor = '#94a3b8';
            innerCircle.style.left = '4px';
        }
    }
}

// ============================================================
// RENDER DASHBOARD TOGGLE
// ============================================================

function renderDashboardToggle(key, label, description, isActive) {
    return `
        <div style="display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: var(--bg-card); border-radius: 6px; border: 1px solid var(--border-color);">
            <div style="flex: 1;">
                <div style="font-size: 13px; font-weight: 500;">${label}</div>
                <div style="font-size: 10px; color: var(--text-light); margin-top: 1px;">${description}</div>
            </div>
            <label style="position: relative; display: inline-block; width: 44px; height: 24px; cursor: pointer; flex-shrink: 0;">
                <input type="checkbox" 
                       ${isActive ? 'checked' : ''}
                       onchange="toggleDashboardElement('${key}', this.checked)"
                       style="opacity: 0; width: 0; height: 0;">
                <span class="dashboard-toggle-slider" 
                      style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; 
                             background-color: ${isActive ? '#10b981' : '#94a3b8'}; 
                             border-radius: 24px; transition: 0.3s;">
                    <span style="position: absolute; height: 18px; width: 18px; 
                                 left: ${isActive ? '22px' : '3px'}; bottom: 3px; 
                                 background-color: white; border-radius: 50%; transition: 0.3s; 
                                 box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
                </span>
            </label>
        </div>
    `;
}

// ============================================================
// TOGGLE DASHBOARD ELEMENT
// ============================================================

async function toggleDashboardElement(key, isActive) {
    try {
        const user = window.AuthModule.getCurrentUser();
        if (!user) {
            window.showToast('❌ No hay usuario autenticado', 'error');
            return;
        }
        
        const currentConfig = user.dashboard_config || window.DBModule.getUserDashboardConfig(user.id);
        currentConfig[key] = isActive;
        
        const result = await window.AuthModule.updateUserDashboardConfig(user.id, currentConfig);
        
        if (result.success) {
            const event = window.event;
            if (event && event.target) {
                const slider = event.target.nextElementSibling;
                const innerCircle = slider?.querySelector('span');
                if (slider && innerCircle) {
                    slider.style.backgroundColor = isActive ? '#10b981' : '#94a3b8';
                    innerCircle.style.left = isActive ? '22px' : '3px';
                }
            }
            
            user.dashboard_config = currentConfig;
            window.AuthModule.setCurrentUser(user);
            
            const label = isActive ? '✅ Activado' : '🚫 Desactivado';
            const keyName = key.replace('show_', '').replace(/_/g, ' ');
            window.showToast(`${label}: ${keyName}`, 'info', 2000);
            
            const currentSection = document.querySelector('.nav-item.active')?.dataset?.section;
            if (currentSection === 'dashboard' && typeof window.renderDashboardView === 'function') {
                setTimeout(() => window.renderDashboardView(), 300);
            }
        } else {
            window.showToast('❌ Error al guardar: ' + result.error, 'error');
        }
        
    } catch (e) {
        console.error('Error guardando configuración del dashboard:', e);
        window.showToast('❌ Error al guardar la configuración', 'error');
    }
}

// ============================================================
// COPIAR CÓDIGO DE INVITACIÓN
// ============================================================

function copiarCodigoInvitacion(codigo) {
    if (!codigo) {
        window.showToast('⚠️ No hay código para copiar', 'warning');
        return;
    }
    
    navigator.clipboard.writeText(codigo).then(() => {
        window.showToast(`✅ Código copiado: ${codigo}`, 'success', 3000);
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = codigo;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            window.showToast(`✅ Código copiado: ${codigo}`, 'success', 3000);
        } catch (e) {
            window.showToast(`📋 Código: ${codigo}`, 'info', 5000);
        }
        document.body.removeChild(textarea);
    });
}

// ============================================================
// EDITAR NOMBRE DEL NEGOCIO
// ============================================================

async function editarNombreNegocio() {
    const user = window.AuthModule.getCurrentUser();
    if (!user || !user.negocio) {
        window.showToast('❌ No hay negocio para editar', 'error');
        return;
    }
    
    const nuevoNombre = await window.ModalModule.showPrompt({
        title: '🏢 Editar nombre del negocio',
        message: 'Ingresa el nuevo nombre:',
        defaultValue: user.negocio.nombre || '',
        icon: '🏢',
        inputType: 'text'
    });
    
    if (nuevoNombre === null || nuevoNombre === undefined) {
        window.showToast('❌ Operación cancelada', 'info', 2000);
        return;
    }
    
    if (!nuevoNombre.trim()) {
        window.showToast('⚠️ El nombre no puede estar vacío', 'warning');
        return;
    }
    
    const result = await window.AuthModule.updateNegocioNombre(nuevoNombre.trim());
    
    if (result.success) {
        window.showToast('✅ Nombre del negocio actualizado', 'success');
        setTimeout(() => loadProfile(window.AuthModule.getCurrentUser()), 500);
    } else {
        window.showToast('❌ Error: ' + result.error, 'error');
    }
}

// ============================================================
// GUÍA RÁPIDA
// ============================================================

function showQuickStartGuide() {
    if (window.HelpModule && typeof window.HelpModule.showQuickStartGuide === 'function') {
        window.HelpModule.showQuickStartGuide();
    } else {
        window.showToast('🚀 Guía rápida: Registra insumos → Crea recetas → Crea productos → Registra ventas', 'info', 5000);
    }
}

function startInteractiveTour() {
    if (window.HelpModule && typeof window.HelpModule.startTour === 'function') {
        window.HelpModule.startTour();
    } else {
        window.showToast('🎯 Tutorial interactivo no disponible', 'warning');
    }
}

function showFAQModal() {
    if (window.HelpModule && typeof window.HelpModule.showFAQModal === 'function') {
        window.HelpModule.showFAQModal();
    } else {
        window.showToast('❓ FAQ no disponible', 'warning');
    }
}

// ============================================================
// TEMA
// ============================================================

async function toggleUserTheme() {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return;
    
    const currentTheme = user.theme === 'dark' ? 'light' : 'dark';
    const result = await window.AuthModule.updateUserTheme(user.id, currentTheme);
    
    if (result.success) {
        window.applyTheme(currentTheme);
        loadProfile(window.AuthModule.getCurrentUser());
        window.showToast(`🌓 Tema cambiado a ${currentTheme === 'dark' ? 'oscuro' : 'claro'}`, 'success');
    } else {
        window.showToast('❌ Error al cambiar tema', 'error');
    }
}

// ============================================================
// FOTO DE PERFIL
// ============================================================

async function handlePhotoUpload(event, userId) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        await window.ModalModule.showAlert({
            title: 'Error',
            message: 'La imagen es demasiado grande. Máximo 2MB.',
            icon: '❌',
            type: 'error'
        });
        event.target.value = '';
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        await window.ModalModule.showAlert({
            title: 'Error',
            message: 'Solo se permiten imágenes.',
            icon: '❌',
            type: 'error'
        });
        event.target.value = '';
        return;
    }
    
    window.showToast('⏳ Cargando imagen...', 'info', 1000);
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const photoData = e.target.result;
        const result = await window.AuthModule.updateUserPhoto(userId, photoData);
        
        if (result.success) {
            window.showToast('✅ Foto actualizada correctamente', 'success');
            window.updateTopBarAvatar(photoData);
            setTimeout(() => loadProfile(window.AuthModule.getCurrentUser()), 500);
        } else {
            window.showToast('❌ Error al actualizar foto', 'error');
        }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

// ============================================================
// FASE D.3: GENERAR TEXTO DEL QR
// ============================================================

function construirTextoQR(banco, titular, cuenta, telefono) {
    let texto = '';
    if (banco) texto += `Banco: ${banco}\n`;
    if (titular) texto += `Titular: ${titular}\n`;
    if (cuenta) texto += `Cuenta: ${cuenta}\n`;
    if (telefono) texto += `Teléfono: ${telefono}`;
    return texto.trim();
}

function generarQRPreview() {
    const banco = document.getElementById('bank-account-bank')?.value?.trim() || '';
    const titular = document.getElementById('bank-account-owner')?.value?.trim() || '';
    const cuenta = document.getElementById('bank-account-number')?.value?.trim() || '';
    const telefono = document.getElementById('bank-account-phone')?.value?.trim() || '';
    
    if (!banco) {
        window.showToast('⚠️ Ingresa el nombre del banco primero', 'warning', 3000);
        document.getElementById('bank-account-bank')?.focus();
        return;
    }
    if (!cuenta) {
        window.showToast('⚠️ Ingresa el número de cuenta primero', 'warning', 3000);
        document.getElementById('bank-account-number')?.focus();
        return;
    }
    
    if (typeof window.QRCode === 'undefined') {
        window.showToast('❌ Librería QR no disponible. Recarga la página.', 'error', 5000);
        return;
    }
    
    const textoQR = construirTextoQR(banco, titular, cuenta, telefono);
    
    try {
        const qr = new window.QRCode({
            text: textoQR,
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: 'M'
        });
        
        const dataUrl = qr.toDataURL();
        window._qrDataTemp = dataUrl;
        
        const previewContainer = document.getElementById('qr-preview');
        const previewImg = document.getElementById('qr-preview-img');
        
        if (previewContainer && previewImg) {
            previewImg.src = dataUrl;
            previewContainer.style.display = 'block';
        }
        
        window.showToast('✅ QR generado correctamente', 'success', 3000);
        
    } catch (error) {
        console.error('Error generando QR:', error);
        window.showToast('❌ Error al generar QR: ' + error.message, 'error', 5000);
    }
}

function generarEditQRPreview() {
    const banco = document.getElementById('edit-bank-account-bank')?.value?.trim() || '';
    const titular = document.getElementById('edit-bank-account-owner')?.value?.trim() || '';
    const cuenta = document.getElementById('edit-bank-account-number')?.value?.trim() || '';
    const telefono = document.getElementById('edit-bank-account-phone')?.value?.trim() || '';
    
    if (!banco) {
        window.showToast('⚠️ Ingresa el nombre del banco primero', 'warning', 3000);
        document.getElementById('edit-bank-account-bank')?.focus();
        return;
    }
    if (!cuenta) {
        window.showToast('⚠️ Ingresa el número de cuenta primero', 'warning', 3000);
        document.getElementById('edit-bank-account-number')?.focus();
        return;
    }
    
    if (typeof window.QRCode === 'undefined') {
        window.showToast('❌ Librería QR no disponible. Recarga la página.', 'error', 5000);
        return;
    }
    
    const textoQR = construirTextoQR(banco, titular, cuenta, telefono);
    
    try {
        const qr = new window.QRCode({
            text: textoQR,
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: 'M'
        });
        
        const dataUrl = qr.toDataURL();
        window._editQrDataTemp = dataUrl;
        
        const previewContainer = document.getElementById('edit-qr-preview');
        const previewImg = document.getElementById('edit-qr-preview-img');
        
        if (previewContainer && previewImg) {
            previewImg.src = dataUrl;
            previewContainer.style.display = 'block';
        }
        
        window.showToast('✅ QR generado correctamente', 'success', 3000);
        
    } catch (error) {
        console.error('Error generando QR:', error);
        window.showToast('❌ Error al generar QR: ' + error.message, 'error', 5000);
    }
}

// ============================================================
// MODAL DE DATOS BANCARIOS
// ============================================================

async function showBankAccountsModal() {
    const existingModal = document.getElementById('bank-accounts-modal');
    if (existingModal) existingModal.remove();
    
    window._qrDataTemp = null;
    
    const accounts = await window.DBModule.getBankAccounts();
    const user = window.AuthModule.getCurrentUser();
    
    const modal = document.createElement('div');
    modal.id = 'bank-accounts-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999; padding: 20px;
    `;
    
    let accountsHtml = '';
    if (accounts.length === 0) {
        accountsHtml = `
            <div style="text-align: center; padding: 20px; color: var(--text-light);">
                <span style="font-size: 32px;">🏦</span>
                <p>No hay cuentas bancarias registradas</p>
            </div>
        `;
    } else {
        accountsHtml = accounts.map(acc => {
            const ownerName = acc.owner_name || '';
            return `
            <div style="background: var(--bg); border-radius: 8px; padding: 12px; margin-bottom: 8px; border-left: 4px solid ${acc.is_default ? '#10b981' : '#94a3b8'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; font-size: 14px;">
                            🏦 ${acc.bank}
                            ${acc.is_default ? '<span style="font-size: 11px; background: #10b98120; color: #10b981; padding: 1px 8px; border-radius: 10px;">✅ Predeterminada</span>' : ''}
                        </div>
                        ${ownerName ? `<div style="font-size: 13px; color: var(--text-light);">👤 Titular: <strong>${ownerName}</strong></div>` : ''}
                        <div style="font-size: 13px; color: var(--text-light);">
                            📋 Cuenta: ${acc.account_number}
                        </div>
                        ${acc.phone ? `<div style="font-size: 13px; color: var(--text-light);">📞 ${acc.phone}</div>` : ''}
                    </div>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        ${!acc.is_default ? `
                            <button onclick="setDefaultBankAccount(${acc.id})" class="btn secondary" style="padding: 2px 10px; font-size: 11px; width: auto; background: #10b981; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
                                ⭐ Default
                            </button>
                        ` : ''}
                        <button onclick="viewBankAccountQR(${acc.id})" class="btn secondary" style="padding: 2px 10px; font-size: 11px; width: auto;">
                            📷 QR
                        </button>
                        <button onclick="editBankAccount(${acc.id})" class="btn secondary" style="padding: 2px 10px; font-size: 11px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
                            ✏️ Editar
                        </button>
                        <button onclick="deleteBankAccount(${acc.id})" class="btn secondary" style="padding: 2px 10px; font-size: 11px; width: auto; color: #ef4444; border-color: #ef4444;">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 480px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="margin: 0;">🏦 Datos Bancarios</h2>
                <button onclick="closeBankAccountsModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="margin-bottom: 16px;">
                <h3 style="margin: 0 0 8px 0; font-size: 14px;">📋 Cuentas registradas</h3>
                ${accountsHtml}
            </div>
            
            <hr>
            
            <h3 style="margin: 12px 0 8px; font-size: 14px;">➕ Agregar nueva cuenta</h3>
            <form id="bank-account-form" style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">
                <div class="form-group">
                    <label>🏦 Banco</label>
                    <input type="text" id="bank-account-bank" placeholder="Ej: Banco de Crédito" required
                           oninput="if(window._qrDataTemp) window._qrDataTemp = null;">
                </div>
                <div class="form-group">
                    <label>👤 Nombre del propietario de la tarjeta</label>
                    <input type="text" id="bank-account-owner" placeholder="Ej: Ricardo Castillo Valdés" value="${user?.name || ''}"
                           oninput="if(window._qrDataTemp) window._qrDataTemp = null;">
                    <small style="font-size: 11px; color: var(--text-light);">Aparecerá en el QR del Dashboard</small>
                </div>
                <div class="form-group">
                    <label>📋 Número de cuenta</label>
                    <input type="text" id="bank-account-number" placeholder="Ej: 1234567890" required
                           oninput="if(window._qrDataTemp) window._qrDataTemp = null;">
                </div>
                <div class="form-group">
                    <label>📞 Teléfono de confirmación</label>
                    <input type="tel" id="bank-account-phone" placeholder="Ej: +53 5555 5555" value="${user?.phone || ''}"
                           oninput="if(window._qrDataTemp) window._qrDataTemp = null;">
                </div>
                
                <div class="form-group">
                    <label>📷 Código QR</label>
                    
                    <div style="background: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; font-size: 12px; color: #3b82f6;">
                        💡 <strong>Elige una opción:</strong><br>
                        • <strong>✨ Generar QR:</strong> Panario lo crea con los datos de arriba<br>
                        • <strong>📁 Subir imagen:</strong> Usa el QR de tu app bancaria
                    </div>
                    
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button type="button" onclick="generarQRPreview()" 
                                class="btn primary" 
                                style="flex: 1; min-width: 130px; padding: 10px 12px; font-size: 13px; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            ✨ Generar QR
                        </button>
                        <button type="button" onclick="document.getElementById('bank-qr-input').click()" 
                                class="btn secondary" 
                                style="flex: 1; min-width: 130px; padding: 10px 12px; font-size: 13px;">
                            📁 Subir imagen
                        </button>
                        <input type="file" id="bank-qr-input" accept="image/*" style="display: none;">
                        <button type="button" onclick="captureQRFromCamera()" 
                                class="btn secondary" 
                                style="padding: 10px 12px; font-size: 13px; width: auto;">
                            📸 Cámara
                        </button>
                    </div>
                    
                    <div id="qr-preview" style="margin-top: 10px; display: none; text-align: center;">
                        <div style="background: #ffffff; display: inline-block; padding: 8px; border-radius: 8px; border: 2px solid var(--border-color);">
                            <img id="qr-preview-img" style="max-width: 180px; max-height: 180px; display: block;">
                        </div>
                        <div style="margin-top: 6px;">
                            <button type="button" onclick="removeQRPreview()" class="btn secondary" style="padding: 2px 10px; font-size: 11px; width: auto; color: #ef4444; border-color: #ef4444;">
                                🗑️ Eliminar QR
                            </button>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: var(--bg); border-radius: 6px; border: 1px solid var(--border-color);">
                    <span style="font-size: 16px;">⭐</span>
                    <span style="flex: 1; font-size: 13px;">Establecer como predeterminada</span>
                    <input type="checkbox" id="bank-account-default" ${accounts.length === 0 ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary);">
                </div>
                <button type="submit" class="btn primary" style="padding: 10px;">💾 Guardar cuenta</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const qrInput = document.getElementById('bank-qr-input');
    
    qrInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 2 * 1024 * 1024) {
            window.showToast('⚠️ La imagen es demasiado grande. Máximo 2MB.', 'error');
            qrInput.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const qrData = e.target.result;
            window._qrDataTemp = qrData;
            document.getElementById('qr-preview').style.display = 'block';
            document.getElementById('qr-preview-img').src = qrData;
            window.showToast('✅ QR cargado correctamente', 'success');
        };
        reader.readAsDataURL(file);
    };
    
    window.captureQRFromCamera = function() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            window.showToast('❌ Cámara no soportada en este dispositivo', 'error');
            return;
        }
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const qrData = e.target.result;
                window._qrDataTemp = qrData;
                document.getElementById('qr-preview').style.display = 'block';
                document.getElementById('qr-preview-img').src = qrData;
                window.showToast('✅ QR capturado correctamente', 'success');
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };
    
    window.removeQRPreview = function() {
        window._qrDataTemp = null;
        document.getElementById('qr-preview').style.display = 'none';
        document.getElementById('bank-qr-input').value = '';
        window.showToast('🗑️ QR eliminado', 'info');
    };
    
    const form = document.getElementById('bank-account-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const bank = document.getElementById('bank-account-bank').value.trim();
        const ownerName = document.getElementById('bank-account-owner').value.trim();
        const accountNumber = document.getElementById('bank-account-number').value.trim();
        const phone = document.getElementById('bank-account-phone').value.trim();
        const isDefault = document.getElementById('bank-account-default').checked;
        
        if (!bank) { window.showToast('⚠️ El nombre del banco es obligatorio', 'error'); return; }
        if (!accountNumber) { window.showToast('⚠️ El número de cuenta es obligatorio', 'error'); return; }
        
        const accountData = {
            bank: bank,
            owner_name: ownerName || null,
            account_number: accountNumber,
            phone: phone || null,
            qr_code: window._qrDataTemp || null,
            is_default: isDefault
        };
        
        const result = await window.DBModule.saveBankAccount(accountData);
        if (result.success) {
            window.showToast('✅ Cuenta bancaria guardada correctamente', 'success');
            window._qrDataTemp = null;
            closeBankAccountsModal();
            setTimeout(() => showBankAccountsModal(), 300);
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeBankAccountsModal();
    });
}

// ============================================================
// EDITAR CUENTA BANCARIA
// ============================================================

async function editBankAccount(accountId) {
    const existingModal = document.getElementById('edit-bank-account-modal');
    if (existingModal) existingModal.remove();
    
    const account = await window.DBModule.getBankAccount(accountId);
    if (!account) {
        window.showToast('❌ Cuenta no encontrada', 'error');
        return;
    }
    
    window._editQrDataTemp = null;
    
    const modal = document.createElement('div');
    modal.id = 'edit-bank-account-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 480px; width: 100%; max-height: 90vh; overflow-y: auto; border: 2px solid #f59e0b;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="margin: 0; color: #f59e0b;">✏️ Editar Cuenta Bancaria</h2>
                <button onclick="closeEditBankAccountModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <form id="edit-bank-account-form" style="display: flex; flex-direction: column; gap: 12px;">
                <input type="hidden" id="edit-bank-account-id" value="${account.id}">
                <input type="hidden" id="edit-bank-qr-data" value="${account.qr_code || ''}">
                
                <div class="form-group">
                    <label>🏦 Banco</label>
                    <input type="text" id="edit-bank-account-bank" value="${account.bank || ''}" placeholder="Ej: Banco de Crédito" required
                           oninput="if(window._editQrDataTemp) window._editQrDataTemp = null;">
                </div>
                
                <div class="form-group">
                    <label>👤 Nombre del propietario de la tarjeta</label>
                    <input type="text" id="edit-bank-account-owner" value="${account.owner_name || ''}" placeholder="Ej: Ricardo Castillo Valdés"
                           oninput="if(window._editQrDataTemp) window._editQrDataTemp = null;">
                    <small style="font-size: 11px; color: var(--text-light);">Aparecerá en el QR del Dashboard</small>
                </div>
                
                <div class="form-group">
                    <label>📋 Número de cuenta</label>
                    <input type="text" id="edit-bank-account-number" value="${account.account_number || ''}" placeholder="Ej: 1234567890" required
                           oninput="if(window._editQrDataTemp) window._editQrDataTemp = null;">
                </div>
                
                <div class="form-group">
                    <label>📞 Teléfono de confirmación</label>
                    <input type="tel" id="edit-bank-account-phone" value="${account.phone || ''}" placeholder="Ej: +53 5555 5555"
                           oninput="if(window._editQrDataTemp) window._editQrDataTemp = null;">
                </div>
                
                <div class="form-group">
                    <label>📷 Código QR</label>
                    
                    <div style="background: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; font-size: 12px; color: #3b82f6;">
                        💡 <strong>Elige una opción:</strong><br>
                        • <strong>✨ Generar QR:</strong> Panario lo crea con los datos actuales<br>
                        • <strong>📁 Subir imagen:</strong> Reemplaza con el QR de tu banco
                    </div>
                    
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button type="button" onclick="generarEditQRPreview()" 
                                class="btn primary" 
                                style="flex: 1; min-width: 130px; padding: 10px 12px; font-size: 13px; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            ✨ Generar QR
                        </button>
                        <button type="button" onclick="document.getElementById('edit-bank-qr-input').click()" 
                                class="btn secondary" 
                                style="flex: 1; min-width: 130px; padding: 10px 12px; font-size: 13px;">
                            📁 Subir imagen
                        </button>
                        <input type="file" id="edit-bank-qr-input" accept="image/*" style="display: none;">
                        <button type="button" onclick="captureEditQRFromCamera()" 
                                class="btn secondary" 
                                style="padding: 10px 12px; font-size: 13px; width: auto;">
                            📸 Cámara
                        </button>
                    </div>
                    
                    <div id="edit-qr-preview" style="margin-top: 10px; display: ${account.qr_code ? 'block' : 'none'}; text-align: center;">
                        <div style="background: #ffffff; display: inline-block; padding: 8px; border-radius: 8px; border: 2px solid var(--border-color);">
                            <img id="edit-qr-preview-img" src="${account.qr_code || ''}" style="max-width: 180px; max-height: 180px; display: block;">
                        </div>
                        <div style="margin-top: 6px;">
                            <button type="button" onclick="removeEditQRPreview()" class="btn secondary" style="padding: 2px 10px; font-size: 11px; width: auto; color: #ef4444; border-color: #ef4444;">
                                🗑️ Eliminar QR
                            </button>
                        </div>
                    </div>
                    <small style="font-size: 11px; color: var(--text-light); display: block; margin-top: 6px;">
                        💡 Si no seleccionas ni generas uno nuevo, se mantendrá el actual.
                    </small>
                </div>
                
                <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: var(--bg); border-radius: 6px; border: 1px solid var(--border-color);">
                    <span style="font-size: 16px;">⭐</span>
                    <span style="flex: 1; font-size: 13px;">Establecer como predeterminada</span>
                    <input type="checkbox" id="edit-bank-account-default" ${account.is_default ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary);">
                </div>
                
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" style="flex: 1; background: #f59e0b; color: #fff; border: none; border-radius: 8px; padding: 10px; cursor: pointer; font-weight: 600;">
                        💾 Guardar cambios
                    </button>
                    <button type="button" onclick="closeEditBankAccountModal()" class="btn secondary" style="flex: 1;">
                        ❌ Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const qrInput = document.getElementById('edit-bank-qr-input');
    
    qrInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 2 * 1024 * 1024) {
            window.showToast('⚠️ La imagen es demasiado grande. Máximo 2MB.', 'error');
            qrInput.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            window._editQrDataTemp = e.target.result;
            document.getElementById('edit-qr-preview').style.display = 'block';
            document.getElementById('edit-qr-preview-img').src = window._editQrDataTemp;
            window.showToast('✅ Nuevo QR cargado', 'success');
        };
        reader.readAsDataURL(file);
    };
    
    window.captureEditQRFromCamera = function() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            window.showToast('❌ Cámara no soportada en este dispositivo', 'error');
            return;
        }
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                window._editQrDataTemp = e.target.result;
                document.getElementById('edit-qr-preview').style.display = 'block';
                document.getElementById('edit-qr-preview-img').src = window._editQrDataTemp;
                window.showToast('✅ Nuevo QR capturado', 'success');
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };
    
    window.removeEditQRPreview = function() {
        window._editQrDataTemp = 'ELIMINAR';
        document.getElementById('edit-qr-preview').style.display = 'none';
        document.getElementById('edit-bank-qr-input').value = '';
        window.showToast('🗑️ QR se eliminará al guardar', 'info');
    };
    
    const form = document.getElementById('edit-bank-account-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = parseInt(document.getElementById('edit-bank-account-id').value);
        const bank = document.getElementById('edit-bank-account-bank').value.trim();
        const ownerName = document.getElementById('edit-bank-account-owner').value.trim();
        const accountNumber = document.getElementById('edit-bank-account-number').value.trim();
        const phone = document.getElementById('edit-bank-account-phone').value.trim();
        const isDefault = document.getElementById('edit-bank-account-default').checked;
        const currentQr = document.getElementById('edit-bank-qr-data').value;
        
        if (!bank) { window.showToast('⚠️ El nombre del banco es obligatorio', 'error'); return; }
        if (!accountNumber) { window.showToast('⚠️ El número de cuenta es obligatorio', 'error'); return; }
        
        let finalQr = currentQr;
        if (window._editQrDataTemp === 'ELIMINAR') {
            finalQr = null;
        } else if (window._editQrDataTemp) {
            finalQr = window._editQrDataTemp;
        }
        
        const accountData = {
            id: id,
            bank: bank,
            owner_name: ownerName || null,
            account_number: accountNumber,
            phone: phone || null,
            qr_code: finalQr,
            is_default: isDefault
        };
        
        const result = await window.DBModule.saveBankAccount(accountData);
        if (result.success) {
            window.showToast('✅ Cuenta bancaria actualizada correctamente', 'success');
            window._editQrDataTemp = null;
            closeEditBankAccountModal();
            closeBankAccountsModal();
            setTimeout(() => showBankAccountsModal(), 300);
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeEditBankAccountModal();
    });
}

// ============================================================
// VER QR DE CUENTA BANCARIA
// ============================================================

async function viewBankAccountQR(accountId) {
    try {
        const account = await window.DBModule.getBankAccount(accountId);
        if (!account) {
            window.showToast('❌ Cuenta no encontrada', 'error');
            return;
        }
        
        const modal = document.createElement('div');
        modal.id = 'qr-view-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            z-index: 999999; padding: 20px;
        `;
        
        const ownerName = account.owner_name || '';
        
        let qrHtml = '';
        if (account.qr_code) {
            qrHtml = `<img src="${account.qr_code}" style="max-width: 300px; max-height: 300px; border-radius: 8px; border: 2px solid var(--border-color);">`;
        } else {
            qrHtml = `
                <div style="text-align: center; padding: 40px; color: var(--text-light);">
                    <span style="font-size: 64px;">📷</span>
                    <p>No hay código QR asociado a esta cuenta</p>
                    <button onclick="closeQRViewModal()" class="btn secondary" style="margin-top: 8px; padding: 6px 16px; font-size: 13px; width: auto;">
                        Cerrar
                    </button>
                </div>
            `;
        }
        
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.4);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h2 style="margin: 0; font-size: 18px;">📷 Código QR</h2>
                    <button onclick="closeQRViewModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
                </div>
                <div style="margin-bottom: 12px;">
                    <div style="font-weight: 600;">🏦 ${account.bank}</div>
                    ${ownerName ? `<div style="font-size: 13px; color: var(--text-light);">👤 Titular: <strong>${ownerName}</strong></div>` : ''}
                    <div style="font-size: 13px; color: var(--text-light);">📋 ${account.account_number}</div>
                </div>
                <div style="display: flex; justify-content: center; align-items: center; min-height: 200px;">
                    ${qrHtml}
                </div>
                ${account.qr_code ? `
                    <button onclick="downloadQRCode()" class="btn secondary" style="margin-top: 12px; padding: 6px 16px; font-size: 13px; width: auto;">
                        📥 Descargar QR
                    </button>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        window.closeQRViewModal = function() {
            const modal = document.getElementById('qr-view-modal');
            if (modal) {
                modal.style.animation = 'modalFadeOut 0.2s ease forwards';
                setTimeout(() => {
                    if (modal.parentNode) modal.remove();
                }, 200);
            }
        };
        
        window.downloadQRCode = function() {
            if (!account.qr_code) return;
            const link = document.createElement('a');
            link.download = `qr-${account.bank}-${account.account_number}.png`;
            link.href = account.qr_code;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.showToast('✅ QR descargado', 'success');
        };
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeQRViewModal();
        });
        
    } catch (error) {
        console.error('Error:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// ELIMINAR CUENTA BANCARIA
// ============================================================

async function deleteBankAccount(accountId) {
    const confirm = await window.ModalModule.showConfirm({
        title: '🗑️ Eliminar cuenta bancaria',
        message: '¿Seguro que quieres eliminar esta cuenta bancaria?',
        confirmText: 'Sí, eliminar',
        cancelText: 'Cancelar',
        icon: '🗑️',
        confirmColor: '#ef4444'
    });
    
    if (!confirm) return;
    
    const result = await window.DBModule.deleteBankAccount(accountId);
    if (result.success) {
        window.showToast('✅ Cuenta bancaria eliminada', 'success');
        closeBankAccountsModal();
        setTimeout(() => showBankAccountsModal(), 300);
    } else {
        window.showToast('❌ Error: ' + result.error, 'error');
    }
}

// ============================================================
// ESTABLECER CUENTA DEFAULT
// ============================================================

async function setDefaultBankAccount(accountId) {
    const result = await window.DBModule.setDefaultBankAccount(accountId);
    if (result.success) {
        window.showToast('✅ Cuenta predeterminada establecida', 'success');
        closeBankAccountsModal();
        setTimeout(() => showBankAccountsModal(), 300);
    } else {
        window.showToast('❌ Error: ' + result.error, 'error');
    }
}

// ============================================================
// CERRAR MODAL DE CUENTAS
// ============================================================

window.closeBankAccountsModal = function() {
    const modal = document.getElementById('bank-accounts-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => {
            if (modal.parentNode) modal.remove();
        }, 200);
    }
    window._qrDataTemp = null;
};

// ============================================================
// EXPORTACIÓN
// ============================================================

window.loadProfile = loadProfile;
window.toggleUserTheme = toggleUserTheme;
window.handlePhotoUpload = handlePhotoUpload;
window.toggleGuiaRapida = toggleGuiaRapida;
window.showBankAccountsModal = showBankAccountsModal;
window.editBankAccount = editBankAccount;
window.viewBankAccountQR = viewBankAccountQR;
window.deleteBankAccount = deleteBankAccount;
window.setDefaultBankAccount = setDefaultBankAccount;
window.closeBankAccountsModal = closeBankAccountsModal;
window.showQuickStartGuide = showQuickStartGuide;
window.startInteractiveTour = startInteractiveTour;
window.showFAQModal = showFAQModal;
window.toggleDashboardElement = toggleDashboardElement;
window.renderDashboardToggle = renderDashboardToggle;
window.copiarCodigoInvitacion = copiarCodigoInvitacion;
window.editarNombreNegocio = editarNombreNegocio;
window.toggleNotificationSound = toggleNotificationSound;
window.selectNotificationSound = selectNotificationSound;
window.testSingleSound = testSingleSound;
window.testAllNotificationSounds = testAllNotificationSounds;
window.generarQRPreview = generarQRPreview;
window.generarEditQRPreview = generarEditQRPreview;
window.construirTextoQR = construirTextoQR;

console.log('📦 Profile Module cargado correctamente v2.0.3 (FASE 1.3.4 fix: closeEditBankAccountModal global)');