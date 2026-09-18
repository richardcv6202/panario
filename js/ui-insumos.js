// ============================================================
// 📦 UI INSUMOS - Panario (Gestión de Insumos/Compras - CON REPORTES)
// AÑADIDO FASE A.4 (170926): Muestra "Creado por" y fecha de creación
// AÑADIDO FASE B (170926 v2):
//   - Restricción para no-admin: solo lectura en insumos
//   - Solo el admin puede crear, editar o eliminar insumos
// ============================================================

// ============================================================
// HELPER DE PERMISOS
// ============================================================

function canModifyInsumos() {
    try {
        return window.AuthModule.isCurrentUserAdmin();
    } catch (e) {
        return false;
    }
}

// Renderizar vista de insumos
function renderInsumosView() {
    const main = document.getElementById('mainContent');
    const isAdmin = canModifyInsumos();
    
    main.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
            <h2 style="margin: 0;">🛒 Insumos</h2>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${isAdmin ? `
                    <button onclick="showInsumoForm()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                        ➕ Nuevo Insumo
                    </button>
                ` : ''}
                <button onclick="showInsumosReportModal()" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                    📊 Reporte
                </button>
                <button onclick="window.navigate('dashboard')" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                    ← Regresar
                </button>
            </div>
        </div>
        
        ${!isAdmin ? `
            <div class="card" style="border-left: 4px solid #3b82f6; background: #3b82f610; margin-bottom: 16px; padding: 12px 16px;">
                <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: #3b82f6;">
                    <span style="font-size: 20px;">🔒</span>
                    <div>
                        <strong>Modo solo lectura</strong><br>
                        <span style="font-size: 12px; color: var(--text-light);">Solo los administradores pueden crear, editar o eliminar insumos. Puedes consultar el inventario actual.</span>
                    </div>
                </div>
            </div>
        ` : ''}
        
        <!-- Resumen -->
        <div id="insumos-summary" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 16px;">
            <div class="card" style="padding: 12px; text-align: center;">
                <div style="font-size: 12px; color: var(--text-light);">📦 Total insumos</div>
                <div style="font-size: 20px; font-weight: 700; color: var(--primary);" id="ins-total-items">-</div>
            </div>
            <div class="card" style="padding: 12px; text-align: center;">
                <div style="font-size: 12px; color: var(--text-light);">⚠️ Stock bajo</div>
                <div style="font-size: 20px; font-weight: 700; color: #ef4444;" id="ins-low-stock">-</div>
            </div>
            <div class="card" style="padding: 12px; text-align: center;">
                <div style="font-size: 12px; color: var(--text-light);">💰 Valor total</div>
                <div style="font-size: 20px; font-weight: 700; color: #10b981;" id="ins-total-value">-</div>
            </div>
        </div>
        
        <!-- Lista de insumos -->
        <div id="insumos-list">
            <div class="card" style="text-align: center; padding: 40px;">
                <span style="font-size: 32px;">⏳</span>
                <p>Cargando insumos...</p>
            </div>
        </div>
    `;
    
    loadInsumos();
}

// Cargar insumos
async function loadInsumos() {
    const container = document.getElementById('insumos-list');
    if (!container) return;
    
    const isAdmin = canModifyInsumos();
    
    try {
        const items = await window.DBModule.getInsumos();
        
        if (items.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 40px;">
                    <span style="font-size: 48px;">📭</span>
                    <p style="margin-top: 8px; color: var(--text-light);">No hay insumos registrados</p>
                    ${isAdmin ? `
                        <button onclick="showInsumoForm()" class="btn primary" style="margin-top: 12px; padding: 8px 16px; font-size: 14px; width: auto;">
                            ➕ Agregar primer insumo
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }
        
        // Calcular resumen
        const totalItems = items.length;
        const lowStock = items.filter(i => i.stock <= i.stock_minimo).length;
        const totalValue = items.reduce((sum, i) => sum + (i.stock * i.costo_unitario), 0);
        
        document.getElementById('ins-total-items').textContent = totalItems;
        document.getElementById('ins-low-stock').textContent = lowStock;
        document.getElementById('ins-total-value').textContent = '$' + totalValue.toFixed(2);
        
        container.innerHTML = items.map(item => {
            const isLowStock = item.stock <= item.stock_minimo;
            const statusColor = isLowStock ? '#ef4444' : '#10b981';
            const statusText = isLowStock ? '⚠️ Stock bajo' : '✅ Stock OK';
            
            // 🆕 FASE A.4: Línea de auditoría
            let auditoriaLine = '';
            if (item.created_by) {
                const nombreCreador = window.DBModule.getUsuarioNombre(item.created_by) || 'Desconocido';
                const fechaCreacion = item.created_at
                    ? new Date(item.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—';
                
                let modificadoInfo = '';
                if (item.modified_by && item.modified_by !== item.created_by) {
                    const nombreModificador = window.DBModule.getUsuarioNombre(item.modified_by) || 'Desconocido';
                    modificadoInfo = ` · ✏️ por <strong style="color: #f59e0b;">${nombreModificador}</strong>`;
                }
                
                auditoriaLine = `
                    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--border-color); font-size: 11px; color: var(--text-light);">
                        👤 Creado por <strong>${nombreCreador}</strong> · 📅 ${fechaCreacion}${modificadoInfo}
                    </div>
                `;
            }
            
            return `
                <div class="card" style="border-left: 4px solid ${statusColor};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
                        <div style="flex: 1; min-width: 0;">
                            <h3 style="margin: 0; font-size: 16px;">
                                ${item.nombre}
                                <span style="font-size: 12px; color: ${statusColor};">
                                    ${statusText}
                                </span>
                            </h3>
                            <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 4px; font-size: 13px; color: var(--text-light);">
                                <span>📦 Stock: <strong>${item.stock} ${item.unidad}</strong></span>
                                <span>💰 Costo: <strong>$${item.costo_unitario.toFixed(2)}</strong></span>
                                <span>📉 Mínimo: ${item.stock_minimo} ${item.unidad}</span>
                            </div>
                            ${auditoriaLine}
                        </div>
                        ${isAdmin ? `
                            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                                <button onclick="showInsumoForm(${item.id})" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto;">
                                    ✏️ Editar
                                </button>
                                <button onclick="deleteInsumo(${item.id})" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto; color: #ef4444; border-color: #ef4444;">
                                    🗑️
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando insumos:', error);
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 40px; color: #ef4444;">
                <span style="font-size: 32px;">❌</span>
                <p>Error cargando insumos: ${error.message}</p>
            </div>
        `;
    }
}

// ============================================================
// FORMULARIO: AGREGAR/EDITAR INSUMO (SOLO ADMIN)
// ============================================================

function showInsumoForm(itemId = null) {
    // 🆕 FASE B: Bloquear si no es admin
    if (!canModifyInsumos()) {
        window.showToast('🔒 Solo los administradores pueden crear o editar insumos', 'warning', 4000);
        return;
    }
    
    const existingModal = document.getElementById('insumo-modal');
    if (existingModal) existingModal.remove();
    
    const isEdit = !!itemId;
    
    const loadItemData = async () => {
        let item = null;
        if (isEdit) {
            item = await window.DBModule.getInsumo(itemId);
            if (!item) {
                window.showToast('❌ Insumo no encontrado', 'error');
                return;
            }
        }
        renderForm(item);
    };
    
    const renderForm = (item) => {
        const modal = document.createElement('div');
        modal.id = 'insumo-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            z-index: 99999; padding: 20px;
        `;
        
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 450px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <h2 style="margin: 0 0 16px 0;">${isEdit ? '✏️ Editar Insumo' : '📝 Nuevo Insumo'}</h2>
                
                <form id="insumo-form" style="display: flex; flex-direction: column; gap: 12px;">
                    ${isEdit ? `<input type="hidden" id="insumo-id" value="${item.id}">` : ''}
                    
                    <div class="form-group">
                        <label>📛 Nombre del insumo</label>
                        <input type="text" id="insumo-nombre" 
                               value="${item?.nombre || ''}" 
                               placeholder="Ej: Harina de trigo" required>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group">
                            <label>📦 Stock actual</label>
                            <input type="number" id="insumo-stock" 
                                   value="${item?.stock || 0}" 
                                   step="0.01" min="0" required>
                        </div>
                        <div class="form-group">
                            <label>📏 Unidad</label>
                            <input type="text" id="insumo-unidad" 
                                   value="${item?.unidad || 'kg'}" 
                                   placeholder="kg, g, L, unid" required>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group">
                            <label>💰 Costo por unidad</label>
                            <input type="number" id="insumo-costo" 
                                   value="${item?.costo_unitario || 0}" 
                                   step="0.01" min="0" placeholder="0.00">
                        </div>
                        <div class="form-group">
                            <label>📉 Stock mínimo</label>
                            <input type="number" id="insumo-min-stock" 
                                   value="${item?.stock_minimo || 0}" 
                                   step="0.01" min="0" placeholder="0">
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button type="submit" class="btn primary" style="flex: 1;">
                            💾 Guardar
                        </button>
                        <button type="button" onclick="window.closeInsumoModal()" class="btn secondary" style="flex: 1;">
                            ❌ Cancelar
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const form = document.getElementById('insumo-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitInsumo(isEdit);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                window.closeInsumoModal();
            }
        });
    };
    
    loadItemData();
}

async function submitInsumo(isEdit) {
    // 🆕 FASE B: Doble verificación
    if (!canModifyInsumos()) {
        window.showToast('🔒 Solo los administradores pueden guardar insumos', 'warning', 4000);
        return;
    }
    
    const nombre = document.getElementById('insumo-nombre').value.trim();
    const stock = parseFloat(document.getElementById('insumo-stock').value) || 0;
    const unidad = document.getElementById('insumo-unidad').value.trim() || 'kg';
    const costo = parseFloat(document.getElementById('insumo-costo').value) || 0;
    const minStock = parseFloat(document.getElementById('insumo-min-stock').value) || 0;
    
    if (!nombre) {
        window.showToast('⚠️ El nombre es obligatorio', 'error');
        return;
    }
    
    const itemData = {
        nombre: nombre,
        stock: stock,
        unidad: unidad,
        costo_unitario: costo,
        stock_minimo: minStock
    };
    
    const idInput = document.getElementById('insumo-id');
    if (idInput) {
        itemData.id = parseInt(idInput.value);
    }
    
    try {
        const result = await window.DBModule.saveInsumo(itemData);
        if (result.success) {
            window.closeInsumoModal();
            window.showToast(`✅ Insumo ${isEdit ? 'actualizado' : 'agregado'} correctamente`, 'success');
            loadInsumos();
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// ELIMINAR INSUMO (SOLO ADMIN)
// ============================================================

async function deleteInsumo(id) {
    // 🆕 FASE B: Bloquear si no es admin
    if (!canModifyInsumos()) {
        window.showToast('🔒 Solo los administradores pueden eliminar insumos', 'warning', 4000);
        return;
    }
    
    const confirm = await window.ModalModule.showConfirm({
        title: 'Eliminar insumo',
        message: '¿Seguro que quieres eliminar este insumo?',
        confirmText: 'Sí, eliminar',
        cancelText: 'Cancelar',
        icon: '🗑️',
        confirmColor: '#ef4444'
    });
    
    if (!confirm) return;
    
    try {
        const result = await window.DBModule.deleteInsumo(id);
        if (result.success) {
            window.showToast('🗑️ Insumo eliminado', 'success');
            loadInsumos();
        } else {
            window.showToast('❌ ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// REPORTE DE INSUMOS
// ============================================================

function showInsumosReportModal() {
    if (window.ReportsModule) {
        const html = window.ReportsModule.generateInsumosReport();
        window.ReportsModule.printReport(html);
    } else {
        window.showToast('❌ Módulo de reportes no disponible', 'error');
    }
}

// ============================================================
// FUNCIÓN DE CIERRE DE MODAL - EXPORTADA
// ============================================================

window.closeInsumoModal = function() {
    const modal = document.getElementById('insumo-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => {
            if (modal.parentNode) modal.remove();
        }, 200);
    }
};

// ============================================================
// EXPORTACIÓN
// ============================================================

window.renderInsumosView = renderInsumosView;
window.loadInsumos = loadInsumos;
window.showInsumoForm = showInsumoForm;
window.deleteInsumo = deleteInsumo;
window.showInsumosReportModal = showInsumosReportModal;
window.canModifyInsumos = canModifyInsumos;

console.log('📦 UI Insumos Module cargado correctamente v2.0.2 (FASE A.4 + FASE B: solo lectura para no-admin)');