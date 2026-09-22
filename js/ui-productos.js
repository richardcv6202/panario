// ============================================================
// 📦 UI PRODUCTOS - Panario (Gestión de Productos para Venta)
// AÑADIDO FASE A.4 (170926): Muestra "Creado por" y fecha de creación
// AÑADIDO FASE B (170926 v2):
//   - Restricción para no-admin: solo lectura en productos
//   - Solo el admin puede crear, editar o eliminar productos
// 🆕 ENTREGA B (221026 v3): CAPACIDAD MÁXIMA DE PRODUCCIÓN
//   - ✅ NUEVO campo en el formulario: 🏭 Capacidad máx/bloque
//     * Acepta decimales (0.5, 1.5, 7, 12.5)
//     * Valor 0 o vacío = sin límite definido
//     * Se guarda en columna capacidad_max_bloque
//   - ✅ Validación: acepta cualquier número real >= 0
//   - ✅ Ayuda contextual clara
//   - ✅ Badge "🏭 X/bloque" en la tarjeta si el producto tiene CMPBC
//   - ✅ Texto explicativo en el formulario
// ============================================================

// ============================================================
// HELPER DE PERMISOS
// ============================================================

function canModifyProductos() {
    try {
        return window.AuthModule.isCurrentUserAdmin();
    } catch (e) {
        return false;
    }
}

// ============================================================
// RENDER VISTA DE PRODUCTOS
// ============================================================

function renderProductosView() {
    const main = document.getElementById('mainContent');
    const isAdmin = canModifyProductos();
    
    main.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
            <h2 style="margin: 0;">🏷️ Productos</h2>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${isAdmin ? `
                    <button onclick="showProductoForm()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                        ➕ Nuevo Producto
                    </button>
                ` : ''}
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
                        <span style="font-size: 12px; color: var(--text-light);">Puedes consultar el catálogo de productos y sus precios. Solo los administradores pueden crear, editar o eliminar productos.</span>
                    </div>
                </div>
            </div>
        ` : ''}
        
        <!-- Lista de productos -->
        <div id="productos-list">
            <div class="card" style="text-align: center; padding: 40px;">
                <span style="font-size: 32px;">⏳</span>
                <p>Cargando productos...</p>
            </div>
        </div>
    `;
    
    loadProductos();
}

// ============================================================
// CARGAR PRODUCTOS
// ============================================================

async function loadProductos() {
    const container = document.getElementById('productos-list');
    if (!container) return;
    
    const isAdmin = canModifyProductos();
    
    try {
        const items = await window.DBModule.getProductos();
        
        if (items.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 40px;">
                    <span style="font-size: 48px;">📭</span>
                    <p style="margin-top: 8px; color: var(--text-light);">No hay productos registrados</p>
                    ${isAdmin ? `
                        <button onclick="showProductoForm()" class="btn primary" style="margin-top: 12px; padding: 8px 16px; font-size: 14px; width: auto;">
                            ➕ Crear primer producto
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }
        
        container.innerHTML = items.map(item => {
            // Calcular costo del producto
            const costo = window.DBModule.calcularCostoProducto(item.id);
            const costoPorProducto = costo.success ? costo.costo_por_producto : 0;
            const margen = costoPorProducto > 0 ? ((item.precio_venta - costoPorProducto) / item.precio_venta * 100) : 0;
            
            // 🆕 ENTREGA B: Badge de CMPBC si está definido
            const cmpbc = parseFloat(item.capacidad_max_bloque);
            const tieneCMPBC = !isNaN(cmpbc) && cmpbc > 0;
            const cmpbcBadge = tieneCMPBC 
                ? `<span style="font-size: 11px; background: #8b5cf620; color: #8b5cf6; padding: 2px 8px; border-radius: 8px; font-weight: 600; border: 1px solid #8b5cf6;">🏭 ${formatearCMPBC(cmpbc)}/bloque</span>` 
                : '';
            
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
                <div class="card" style="border-left: 4px solid ${item.receta_id ? '#10b981' : '#f59e0b'};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
                        <div style="flex: 1; min-width: 0;">
                            <h3 style="margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                ${item.nombre}
                                ${item.receta_id ? '<span style="font-size: 12px; color: #10b981;">📋 Con receta</span>' : '<span style="font-size: 12px; color: #f59e0b;">⚠️ Sin receta</span>'}
                                ${cmpbcBadge}
                            </h3>
                            ${item.descripcion ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-light);">${item.descripcion}</p>` : ''}
                            <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 4px; font-size: 13px; color: var(--text-light);">
                                <span>💰 Precio: <strong>$${item.precio_venta.toFixed(2)}</strong></span>
                                <span>📦 Unidad: ${item.unidad_venta}</span>
                                <span>📊 Cantidad: ${item.cantidad_por_unidad}</span>
                                ${item.receta_nombre ? `<span>📋 Receta: ${item.receta_nombre}</span>` : ''}
                                ${costo.success ? `<span>💰 Costo: $${costoPorProducto.toFixed(2)}</span>` : ''}
                                ${costo.success && costoPorProducto > 0 ? `<span style="color: ${margen > 30 ? '#10b981' : '#f59e0b'};">📈 Margen: ${margen.toFixed(1)}%</span>` : ''}
                            </div>
                            ${auditoriaLine}
                        </div>
                        ${isAdmin ? `
                            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                                <button onclick="showProductoForm(${item.id})" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto;">
                                    ✏️ Editar
                                </button>
                                <button onclick="deleteProducto(${item.id})" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto; color: #ef4444; border-color: #ef4444;">
                                    🗑️
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando productos:', error);
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 40px; color: #ef4444;">
                <span style="font-size: 32px;">❌</span>
                <p>Error cargando productos: ${error.message}</p>
            </div>
        `;
    }
}

// ============================================================
// 🆕 ENTREGA B: HELPER PARA FORMATEAR CMPBC
// ============================================================

/**
 * Formatea el CMPBC para mostrarlo en la UI.
 * Ej: 7 → "7", 7.5 → "7.5", 7.25 → "7.25"
 */
function formatearCMPBC(cmpbc) {
    if (cmpbc === null || cmpbc === undefined) return '—';
    const num = parseFloat(cmpbc);
    if (isNaN(num)) return '—';
    if (num === Math.floor(num)) return String(Math.floor(num));
    return num.toFixed(2).replace(/\.?0+$/, '');
}

// ============================================================
// FORMULARIO: AGREGAR/EDITAR PRODUCTO (SOLO ADMIN)
// ============================================================

function showProductoForm(itemId = null) {
    // 🆕 FASE B: Bloquear si no es admin
    if (!canModifyProductos()) {
        window.showToast('🔒 Solo los administradores pueden crear o editar productos', 'warning', 4000);
        return;
    }
    
    const existingModal = document.getElementById('producto-modal');
    if (existingModal) existingModal.remove();
    
    const isEdit = !!itemId;
    
    const loadItemData = async () => {
        let item = null;
        let recetas = [];
        
        try {
            recetas = await window.RecipesModule.getRecipes();
        } catch (e) {
            console.warn('Error cargando recetas:', e);
        }
        
        if (isEdit) {
            item = await window.DBModule.getProducto(itemId);
            if (!item) {
                window.showToast('❌ Producto no encontrado', 'error');
                return;
            }
        }
        renderForm(item, recetas);
    };
    
    const renderForm = (item, recetas) => {
        // 🆕 ENTREGA B: Valor del CMPBC (o vacío si no está definido)
        let cmpbcValue = '';
        if (item && item.capacidad_max_bloque !== null && item.capacidad_max_bloque !== undefined) {
            const parsed = parseFloat(item.capacidad_max_bloque);
            if (!isNaN(parsed) && parsed > 0) {
                cmpbcValue = formatearCMPBC(parsed);
            }
        }
        
        const modal = document.createElement('div');
        modal.id = 'producto-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            z-index: 99999; padding: 20px;
        `;
        
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 480px; width: 100%; max-height: 92vh; overflow-y: auto;">
                <h2 style="margin: 0 0 16px 0;">${isEdit ? '✏️ Editar Producto' : '📝 Nuevo Producto'}</h2>
                
                <form id="producto-form" style="display: flex; flex-direction: column; gap: 12px;">
                    ${isEdit ? `<input type="hidden" id="producto-id" value="${item.id}">` : ''}
                    
                    <div class="form-group">
                        <label>📛 Nombre del producto</label>
                        <input type="text" id="producto-nombre" 
                               value="${item?.nombre || ''}" 
                               placeholder="Ej: Jaba de Pan" required>
                    </div>
                    
                    <div class="form-group">
                        <label>📝 Descripción</label>
                        <textarea id="producto-descripcion" rows="2" placeholder="Descripción del producto..." 
                                  style="width: 100%; padding: 8px 12px; border: 2px solid var(--border-color); border-radius: 8px; background: var(--bg-input); color: var(--text);">${item?.descripcion || ''}</textarea>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group">
                            <label>💰 Precio de venta</label>
                            <input type="number" id="producto-precio" 
                                   value="${item?.precio_venta || 0}" 
                                   step="0.01" min="0" placeholder="0.00" required>
                        </div>
                        <div class="form-group">
                            <label>📦 Unidad de venta</label>
                            <input type="text" id="producto-unidad" 
                                   value="${item?.unidad_venta || 'unidad'}" 
                                   placeholder="unidad, jaba, docena" required>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group">
                            <label>📊 Cantidad por unidad</label>
                            <input type="number" id="producto-cantidad" 
                                   value="${item?.cantidad_por_unidad || 1}" 
                                   step="1" min="1" placeholder="1" required>
                            <small style="font-size: 11px; color: var(--text-light);">Ej: 10 si la jaba contiene 10 panes</small>
                        </div>
                        <div class="form-group">
                            <label>📋 Receta asociada</label>
                            <select id="producto-receta" style="padding: 8px 12px; border: 2px solid var(--border-color); border-radius: 8px; background: var(--bg-card); color: var(--text); width: 100%;">
                                <option value="">Sin receta</option>
                                ${recetas.map(r => `
                                    <option value="${r.id}" ${item?.receta_id === r.id ? 'selected' : ''}>
                                        ${r.name}
                                    </option>
                                `).join('')}
                            </select>
                            <small style="font-size: 11px; color: var(--text-light);">Selecciona la receta que usa este producto</small>
                        </div>
                    </div>
                    
                    <!-- 🆕 ENTREGA B: Campo de Capacidad Máxima por Bloque -->
                    <div style="background: linear-gradient(135deg, #8b5cf610 0%, #8b5cf605 100%); border: 2px dashed #8b5cf6; border-radius: 10px; padding: 12px 14px; margin-top: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span style="font-size: 22px;">🏭</span>
                            <div style="flex: 1;">
                                <div style="font-weight: 700; font-size: 14px; color: #8b5cf6;">
                                    Capacidad máxima por bloque
                                </div>
                                <div style="font-size: 11px; color: var(--text-light); margin-top: 1px;">
                                    ¿Cuántas unidades puedes producir en un bloque de corriente?
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label style="font-size: 12px; font-weight: 600; color: #8b5cf6;">
                                🏭 Capacidad máx/bloque
                            </label>
                            <input type="number" id="producto-cmpbc" 
                                   value="${cmpbcValue}" 
                                   step="any" 
                                   min="0" 
                                   placeholder="Ej: 7 (opcional)"
                                   style="width: 100%; padding: 8px 12px; border: 2px solid #8b5cf6; border-radius: 8px; background: var(--bg-input); color: var(--text); font-size: 15px;">
                            <small style="font-size: 11px; color: var(--text-light); display: block; margin-top: 4px; line-height: 1.5;">
                                💡 <strong>Opcional.</strong> Déjalo vacío o en 0 si no quieres calcular bloques automáticamente.
                                <br>📦 Acepta cualquier número real: 6, 6.5, 7.25, etc.
                                <br>🎯 Se usa en el modal de producción para sugerir automáticamente cuántos bloques usar.
                            </small>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button type="submit" class="btn primary" style="flex: 1;">
                            💾 Guardar
                        </button>
                        <button type="button" onclick="window.closeProductoModal()" class="btn secondary" style="flex: 1;">
                            ❌ Cancelar
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Enfocar el primer campo
        setTimeout(() => {
            document.getElementById('producto-nombre')?.focus();
        }, 100);
        
        const form = document.getElementById('producto-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitProducto(isEdit);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                window.closeProductoModal();
            }
        });
    };
    
    loadItemData();
}

// ============================================================
// ENVIAR FORMULARIO DE PRODUCTO
// ============================================================

async function submitProducto(isEdit) {
    // 🆕 FASE B: Doble verificación
    if (!canModifyProductos()) {
        window.showToast('🔒 Solo los administradores pueden guardar productos', 'warning', 4000);
        return;
    }
    
    const nombre = document.getElementById('producto-nombre').value.trim();
    const descripcion = document.getElementById('producto-descripcion').value.trim();
    const precio = parseFloat(document.getElementById('producto-precio').value) || 0;
    const unidad = document.getElementById('producto-unidad').value.trim() || 'unidad';
    const cantidad = parseInt(document.getElementById('producto-cantidad').value) || 1;
    const recetaId = document.getElementById('producto-receta').value;
    
    // 🆕 ENTREGA B: Leer el CMPBC
    const cmpbcRaw = document.getElementById('producto-cmpbc').value?.trim() || '';
    let capacidadMaxBloque = null;
    
    if (cmpbcRaw !== '') {
        const parsed = parseFloat(cmpbcRaw);
        if (!isNaN(parsed) && parsed > 0) {
            capacidadMaxBloque = parsed;
        } else if (!isNaN(parsed) && parsed === 0) {
            // 0 explícito = sin límite (equivalente a vacío)
            capacidadMaxBloque = null;
        } else if (isNaN(parsed)) {
            window.showToast('⚠️ El CMPBC debe ser un número válido', 'error', 4000);
            return;
        }
    }
    
    if (!nombre) {
        window.showToast('⚠️ El nombre es obligatorio', 'error');
        return;
    }
    
    if (precio <= 0) {
        window.showToast('⚠️ El precio de venta debe ser mayor a 0', 'error');
        return;
    }
    
    if (cantidad < 1) {
        window.showToast('⚠️ La cantidad por unidad debe ser al menos 1', 'error');
        return;
    }
    
    const itemData = {
        nombre: nombre,
        descripcion: descripcion || null,
        precio_venta: precio,
        unidad_venta: unidad,
        cantidad_por_unidad: cantidad,
        receta_id: recetaId || null,
        capacidad_max_bloque: capacidadMaxBloque
    };
    
    const idInput = document.getElementById('producto-id');
    if (idInput) {
        itemData.id = parseInt(idInput.value);
    }
    
    try {
        const result = await window.DBModule.saveProducto(itemData);
        if (result.success) {
            window.closeProductoModal();
            
            // 🆕 ENTREGA B: Mensaje enriquecido si se guardó el CMPBC
            let mensaje = `✅ Producto ${isEdit ? 'actualizado' : 'agregado'} correctamente`;
            if (capacidadMaxBloque !== null) {
                mensaje += ` · 🏭 ${formatearCMPBC(capacidadMaxBloque)}/bloque`;
            }
            window.showToast(mensaje, 'success', 4000);
            
            loadProductos();
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// ELIMINAR PRODUCTO (SOLO ADMIN)
// ============================================================

async function deleteProducto(id) {
    // 🆕 FASE B: Bloquear si no es admin
    if (!canModifyProductos()) {
        window.showToast('🔒 Solo los administradores pueden eliminar productos', 'warning', 4000);
        return;
    }
    
    const producto = await window.DBModule.getProducto(id);
    if (!producto) {
        window.showToast('❌ Producto no encontrado', 'error');
        return;
    }
    
    const confirm = await window.ModalModule.showConfirm({
        title: 'Eliminar producto',
        message: `¿Seguro que quieres eliminar el producto "${producto.nombre}"?\n\n${producto.capacidad_max_bloque ? `🏭 CMPBC: ${formatearCMPBC(producto.capacidad_max_bloque)}/bloque\n\n` : ''}⚠️ Esta acción se puede revertir desde "Limpiar datos eliminados".`,
        confirmText: 'Sí, eliminar',
        cancelText: 'Cancelar',
        icon: '🗑️',
        confirmColor: '#ef4444'
    });
    
    if (!confirm) return;
    
    try {
        const result = await window.DBModule.deleteProducto(id);
        if (result.success) {
            window.showToast('🗑️ Producto eliminado', 'success');
            loadProductos();
        } else {
            window.showToast('❌ ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// FUNCIÓN DE CIERRE DE MODAL - EXPORTADA
// ============================================================

window.closeProductoModal = function() {
    const modal = document.getElementById('producto-modal');
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

window.renderProductosView = renderProductosView;
window.loadProductos = loadProductos;
window.showProductoForm = showProductoForm;
window.deleteProducto = deleteProducto;
window.canModifyProductos = canModifyProductos;
window.formatearCMPBC = formatearCMPBC;

console.log('📦 UI Productos Module cargado correctamente v2.1.19 (ENTREGA B: campo CMPBC añadido)');
console.log('   🆕 Novedades:');
console.log('      • Campo 🏭 Capacidad máx/bloque en el formulario');
console.log('      • Badge "🏭 X/bloque" en tarjetas de producto');
console.log('      • Validación de CMPBC (acepta cualquier número real >= 0)');
console.log('      • Helper formatearCMPBC() para mostrar valores');