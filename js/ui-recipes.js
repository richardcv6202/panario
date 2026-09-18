// ============================================================
// 📦 UI RECIPES - Panario (Recetas con recálculo y compartir)
// AÑADIDO FASE A.4 (170926): Sección de Auditoría en viewRecipe()
// AÑADIDO FASE B (170926 v2):
//   - Restricción para no-admin: solo lectura + recalcular + usar como plantilla
//   - Solo el admin puede crear, editar, duplicar, compartir o eliminar recetas
// ============================================================

// ============================================================
// HELPER DE PERMISOS
// ============================================================

function canModifyRecipes() {
    try {
        return window.AuthModule.isCurrentUserAdmin();
    } catch (e) {
        return false;
    }
}

// ============================================================
// HELPER DE AUDITORÍA
// ============================================================

function renderAuditoriaHTML(entity) {
    if (!entity) return '';
    
    const createdBy = entity.created_by;
    const modifiedBy = entity.modified_by;
    const createdAt = entity.created_at;
    const updatedAt = entity.updated_at;
    
    if (!createdBy) return '';
    
    const nombreCreador = window.DBModule.getUsuarioNombre(createdBy) || 'Desconocido';
    const nombreModificador = modifiedBy ? (window.DBModule.getUsuarioNombre(modifiedBy) || 'Desconocido') : null;
    
    const fechaCreacion = createdAt 
        ? new Date(createdAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—';
    
    const fechaModificacion = updatedAt && updatedAt !== createdAt
        ? new Date(updatedAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : null;
    
    const fueModificado = modifiedBy && modifiedBy !== createdBy && fechaModificacion;
    const fueModificadoPorMismo = modifiedBy && modifiedBy === createdBy && fechaModificacion;
    
    let auditRows = `
        <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px;">
            <span style="color: var(--text-light);">👤 Creado por:</span>
            <span style="font-weight: 600; text-align: right;">${nombreCreador}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: var(--text-light); border-bottom: 1px dashed var(--border-color);">
            <span>📅 Fecha:</span>
            <span>${fechaCreacion}</span>
        </div>
    `;
    
    if (fueModificado) {
        auditRows += `
            <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; margin-top: 4px;">
                <span style="color: var(--text-light);">✏️ Modificado por:</span>
                <span style="font-weight: 600; text-align: right; color: #f59e0b;">${nombreModificador}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: var(--text-light);">
                <span>📅 Última modificación:</span>
                <span>${fechaModificacion}</span>
            </div>
        `;
    } else if (fueModificadoPorMismo) {
        auditRows += `
            <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: var(--text-light); margin-top: 4px;">
                <span>✏️ Modificado:</span>
                <span>${fechaModificacion}</span>
            </div>
        `;
    }
    
    return `
        <div style="background: var(--bg); border-radius: 8px; padding: 10px 12px; margin-top: 12px; border-left: 3px solid #94a3b8;">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-label); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                🔍 Auditoría
            </div>
            ${auditRows}
        </div>
    `;
}

// Renderizar la vista de recetas
function renderRecipesView() {
    const main = document.getElementById('mainContent');
    const isAdmin = canModifyRecipes();
    
    main.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
            <h2 style="margin: 0;">📖 Recetas</h2>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${isAdmin ? `
                    <button onclick="showRecipeForm()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                        ➕ Nueva Receta
                    </button>
                ` : ''}
                <button onclick="showRecipesReportModal()" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                    📊 Reporte
                </button>
                <button onclick="window.navigate('insumos')" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                    🛒 Insumos
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
                        <span style="font-size: 12px; color: var(--text-light);">Puedes consultar recetas, recalcularlas y usarlas como plantilla. Solo los administradores pueden crear, editar o eliminar recetas.</span>
                    </div>
                </div>
            </div>
        ` : ''}
        
        <!-- Filtros -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
            <select id="filter-recipes" onchange="loadRecipes()" style="padding: 8px 12px; border: 2px solid var(--border-color); border-radius: 8px; background: var(--bg-card); color: var(--text);">
                <option value="all">Todas las recetas</option>
                <option value="mine">Mis recetas</option>
                <option value="shared">Compartidas</option>
            </select>
        </div>
        
        <!-- Lista de recetas -->
        <div id="recipes-list">
            <div class="card" style="text-align: center; padding: 40px;">
                <span style="font-size: 32px;">⏳</span>
                <p>Cargando recetas...</p>
            </div>
        </div>
    `;
    
    loadRecipes();
}

// Cargar recetas
async function loadRecipes() {
    const container = document.getElementById('recipes-list');
    if (!container) return;
    
    const isAdmin = canModifyRecipes();
    const filter = document.getElementById('filter-recipes')?.value || 'all';
    const user = window.AuthModule.getCurrentUser();
    
    try {
        let recipes = await window.RecipesModule.getRecipes();
        
        if (filter === 'mine') {
            recipes = recipes.filter(r => r.user_id === user.id);
        } else if (filter === 'shared') {
            recipes = recipes.filter(r => r.shared === 1 && r.user_id !== user.id);
        }
        
        if (recipes.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 40px;">
                    <span style="font-size: 48px;">📭</span>
                    <p style="margin-top: 8px; color: var(--text-light);">No hay recetas que coincidan</p>
                    ${isAdmin ? `
                        <button onclick="showRecipeForm()" class="btn primary" style="margin-top: 12px; padding: 8px 16px; font-size: 14px; width: auto;">
                            ➕ Crear primera receta
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }
        
        container.innerHTML = recipes.map(recipe => {
            const isOwner = recipe.user_id === user.id;
            const isShared = recipe.shared === 1;
            const cost = window.RecipesModule.calculateRecipeCost(recipe) || { totalCost: 0, costPerUnit: 0, hasPrices: false };
            const priceIndicator = cost.hasPrices ? '💰' : '⚠️';
            const priceLabel = cost.hasPrices ? 'Con costo' : 'Sin costo';
            
            const fechaCreacion = recipe.created_at 
                ? new Date(recipe.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';
            
            // 🆕 FASE B: Solo admin puede editar/duplicar/compartir/eliminar
            const puedeEditar = isAdmin && isOwner;
            
            return `
                <div class="card" style="border-left: 4px solid ${isShared ? '#3b82f6' : '#f59e0b'};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
                        <div style="flex: 1;">
                            <h3 style="margin: 0; font-size: 16px;">
                                ${recipe.name}
                                ${isShared ? '<span style="font-size: 12px; background: #3b82f620; padding: 2px 10px; border-radius: 12px; color: #3b82f6;">🔗 Compartida</span>' : ''}
                                ${!isOwner ? '<span style="font-size: 12px; color: var(--text-light);">por ' + recipe.creator_username + '</span>' : ''}
                            </h3>
                            ${recipe.description ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-light);">${recipe.description}</p>` : ''}
                            <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 4px; font-size: 12px; color: var(--text-light);">
                                <span>📦 Rendimiento: ${parseFloat(recipe.yield_units || 1).toFixed(1)} ${recipe.yield_unit_type || 'unidades'}</span>
                                <span>${priceIndicator} ${priceLabel}: $${(cost.totalCost || 0).toFixed(2)} ($${(cost.costPerUnit || 0).toFixed(2)}/unidad)</span>
                                ${recipe.ingredients ? `<span>🧾 ${recipe.ingredients.length} ingredientes</span>` : ''}
                                <span>📅 ${fechaCreacion}</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            <button onclick="viewRecipe(${recipe.id})" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto;">
                                👁️ Ver
                            </button>
                            ${puedeEditar ? `
                                <button onclick="showRecipeForm(${recipe.id})" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto;">
                                    ✏️ Editar
                                </button>
                                <button onclick="duplicateRecipe(${recipe.id})" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
                                    📋 Duplicar
                                </button>
                                <button onclick="toggleShareRecipe(${recipe.id})" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto;">
                                    ${isShared ? '🔒 No compartir' : '🌐 Compartir'}
                                </button>
                                <button onclick="deleteRecipe(${recipe.id})" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto; color: #ef4444; border-color: #ef4444;">
                                    🗑️
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando recetas:', error);
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 40px; color: #ef4444;">
                <span style="font-size: 32px;">❌</span>
                <p>Error cargando recetas: ${error.message}</p>
            </div>
        `;
    }
}

// ============================================================
// DUPLICAR RECETA (SOLO ADMIN)
// ============================================================

async function duplicateRecipe(recipeId) {
    if (!canModifyRecipes()) {
        window.showToast('🔒 Solo los administradores pueden duplicar recetas', 'warning', 4000);
        return;
    }
    
    try {
        const id = parseInt(recipeId);
        if (!id || isNaN(id) || id <= 0) {
            window.showToast('❌ ID de receta no válido', 'error');
            return;
        }

        const recipe = await window.RecipesModule.getRecipe(id);
        if (!recipe) {
            window.showToast('❌ Receta no encontrada', 'error');
            return;
        }

        const user = window.AuthModule.getCurrentUser();
        if (recipe.user_id !== user.id) {
            window.showToast('⚠️ Solo puedes duplicar tus propias recetas', 'warning');
            return;
        }

        const newName = await window.ModalModule.showPrompt({
            title: '📋 Duplicar Receta',
            message: 'Ingresa el nombre para la nueva receta:',
            placeholder: 'Ej: ' + recipe.name + ' (copia)',
            icon: '📋',
            defaultValue: recipe.name + ' (copia)'
        });

        if (newName === null || newName === undefined) {
            window.showToast('❌ Operación cancelada', 'info', 2000);
            return;
        }

        if (!newName.trim()) {
            window.showToast('⚠️ El nombre es obligatorio', 'error');
            return;
        }

        const recipeData = {
            name: newName.trim(),
            description: recipe.description || null,
            instructions: recipe.instructions || null,
            yield_units: recipe.yield_units || 1,
            yield_unit_type: recipe.yield_unit_type || 'unidades',
            shared: 0,
            ingredients: recipe.ingredients || [],
            receta_insumos: recipe.receta_insumos || []
        };

        const result = await window.RecipesModule.saveRecipe(recipeData);
        
        if (result.success) {
            window.showToast(`✅ Receta "${newName.trim()}" duplicada correctamente`, 'success');
            await loadRecipes();
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error duplicando receta:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// FORMULARIO DE RECETA (SOLO ADMIN)
// ============================================================

async function showRecipeForm(recipeId = null) {
    // 🆕 FASE B: Bloquear si no es admin
    if (!canModifyRecipes()) {
        window.showToast('🔒 Solo los administradores pueden crear o editar recetas', 'warning', 4000);
        return;
    }
    
    const existingModal = document.getElementById('recipe-modal');
    if (existingModal) existingModal.remove();
    
    const isEdit = !!recipeId;
    
    let insumos = [];
    try {
        insumos = await window.DBModule.getInsumos();
    } catch (e) {
        console.warn('Error cargando insumos:', e);
    }
    
    const loadRecipeData = async () => {
        let recipe = null;
        if (isEdit) {
            recipe = await window.RecipesModule.getRecipe(recipeId);
            if (!recipe) {
                window.showToast('❌ Receta no encontrada', 'error');
                return;
            }
            if (recipe.is_shared_readonly) {
                window.showToast('⚠️ Esta receta es compartida y no se puede editar. Se creará una copia.', 'warning');
                const result = await window.RecipesModule.cloneRecipe(recipeId, {
                    name: recipe.name + ' (copia)',
                    shared: false
                });
                if (result.success) {
                    window.showToast('✅ Copia creada. Edita la copia.', 'success');
                    renderRecipesView();
                    return;
                }
            }
        }
        renderForm(recipe, insumos);
    };
    
    const renderForm = (recipe, insumos) => {
        const modal = document.createElement('div');
        modal.id = 'recipe-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            z-index: 99999; padding: 20px;
        `;
        
        const ingredients = recipe?.ingredients || [];
        const recetaInsumos = recipe?.receta_insumos || [];
        
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 650px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <h2 style="margin: 0 0 16px 0;">${isEdit ? '✏️ Editar Receta' : '📝 Nueva Receta'}</h2>
                
                <form id="recipe-form" style="display: flex; flex-direction: column; gap: 12px;">
                    <div class="form-group">
                        <label>📛 Nombre de la receta</label>
                        <input type="text" id="recipe-name" 
                               value="${recipe?.name || ''}" 
                               placeholder="Ej: Pan de Yogur" required>
                    </div>
                    
                    <div class="form-group">
                        <label>📝 Descripción</label>
                        <textarea id="recipe-description" rows="2" placeholder="Breve descripción..." 
                                  style="width: 100%; padding: 8px 12px; border: 2px solid var(--border-color); border-radius: 8px; background: var(--bg-input); color: var(--text);">${recipe?.description || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>📋 Instrucciones</label>
                        <textarea id="recipe-instructions" rows="3" placeholder="Pasos de preparación..." 
                                  style="width: 100%; padding: 8px 12px; border: 2px solid var(--border-color); border-radius: 8px; background: var(--bg-input); color: var(--text);">${recipe?.instructions || ''}</textarea>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group">
                            <label>📦 Cantidad que produce</label>
                            <input type="number" id="recipe-yield" 
                                   value="${recipe?.yield_units || 1}" 
                                   step="0.1" min="0.1" required>
                        </div>
                        <div class="form-group">
                            <label>Unidad</label>
                            <input type="text" id="recipe-unit" 
                                   value="${recipe?.yield_unit_type || 'unidades'}" 
                                   placeholder="unidades, kg, etc.">
                        </div>
                    </div>
                    
                    <!-- INSUMOS ASOCIADOS -->
                    <div>
                        <label style="display: block; margin-bottom: 4px;">🛒 Insumos asociados</label>
                        <div id="receta-insumos-container" style="display: flex; flex-direction: column; gap: 6px; max-height: 150px; overflow-y: auto; border: 2px solid var(--border-color); border-radius: 8px; padding: 8px;">
                            ${recetaInsumos.length > 0 ? recetaInsumos.map((ri, idx) => `
                                <div class="receta-insumo-item" style="display: flex; gap: 6px; align-items: center;">
                                    <select class="ri-insumo-select" style="flex: 2; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text);">
                                        <option value="">Seleccionar insumo...</option>
                                        ${insumos.map(i => `
                                            <option value="${i.id}" ${ri.insumo_id === i.id ? 'selected' : ''}>
                                                ${i.nombre} (${i.stock} ${i.unidad})
                                            </option>
                                        `).join('')}
                                    </select>
                                    <input type="number" class="ri-cantidad" value="${ri.cantidad}" placeholder="Cant." step="0.01" min="0.01" style="width: 70px; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text);">
                                    <input type="text" class="ri-unidad" value="${ri.unidad || 'kg'}" placeholder="Unidad" style="width: 60px; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text);">
                                    <button type="button" onclick="this.closest('.receta-insumo-item').remove()" style="background: none; border: none; font-size: 16px; cursor: pointer; color: #ef4444;">✕</button>
                                </div>
                            `).join('') : `
                                <div style="text-align: center; padding: 8px; color: var(--text-light); font-size: 13px;">
                                    Sin insumos asociados
                                </div>
                            `}
                        </div>
                        <button type="button" onclick="addRecetaInsumo()" class="btn secondary" style="margin-top: 4px; padding: 4px 12px; font-size: 12px; width: auto;">
                            ➕ Agregar insumo
                        </button>
                    </div>
                    
                    <!-- INGREDIENTES (compatibilidad) -->
                    <div>
                        <label style="display: block; margin-bottom: 4px;">🧾 Ingredientes (texto)</label>
                        <div id="ingredients-container" style="display: flex; flex-direction: column; gap: 6px; max-height: 150px; overflow-y: auto; border: 2px solid var(--border-color); border-radius: 8px; padding: 8px;">
                            ${ingredients.length > 0 ? ingredients.map((ing, idx) => `
                                <div class="ingredient-item" style="display: flex; gap: 6px; align-items: center;">
                                    <input type="text" class="ingredient-name" value="${ing.ingredient_name}" placeholder="Ingrediente" style="flex: 2; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text);">
                                    <input type="number" class="ingredient-quantity" value="${ing.quantity}" placeholder="Cant." step="0.01" min="0.01" style="width: 70px; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text);">
                                    <input type="text" class="ingredient-unit" value="${ing.unit || 'kg'}" placeholder="Unidad" style="width: 60px; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text);">
                                    <button type="button" onclick="this.closest('.ingredient-item').remove()" style="background: none; border: none; font-size: 16px; cursor: pointer; color: #ef4444;">✕</button>
                                </div>
                            `).join('') : `
                                <div style="text-align: center; padding: 8px; color: var(--text-light); font-size: 13px;">
                                    Sin ingredientes
                                </div>
                            `}
                        </div>
                        <button type="button" onclick="addIngredient()" class="btn secondary" style="margin-top: 4px; padding: 4px 12px; font-size: 12px; width: auto;">
                            ➕ Agregar ingrediente
                        </button>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: var(--bg); border-radius: 8px;">
                        <span style="font-size: 18px;">🌐</span>
                        <span style="flex: 1; font-size: 13px;">Compartir receta con otros usuarios</span>
                        <input type="checkbox" id="recipe-shared" ${recipe?.shared ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button type="submit" class="btn primary" style="flex: 1;">
                            💾 Guardar receta
                        </button>
                        <button type="button" onclick="window.closeRecipeModal()" class="btn secondary" style="flex: 1;">
                            ❌ Cancelar
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const form = document.getElementById('recipe-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitRecipeForm(recipe?.id);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) window.closeRecipeModal();
        });
    };
    
    loadRecipeData();
}

// ============================================================
// FUNCIONES PARA AGREGAR INSUMOS E INGREDIENTES
// ============================================================

window.addRecetaInsumo = function(insumoId = '', cantidad = 1, unidad = 'kg') {
    const container = document.getElementById('receta-insumos-container');
    if (!container) return;
    
    const loadInsumos = async () => {
        const insumos = await window.DBModule.getInsumos();
        
        const emptyMsg = container.querySelector('div[style*="text-align: center; padding: 8px;"]');
        if (emptyMsg) emptyMsg.remove();
        
        const div = document.createElement('div');
        div.className = 'receta-insumo-item';
        div.style.cssText = 'display: flex; gap: 6px; align-items: center;';
        
        let optionsHtml = '<option value="">Seleccionar insumo...</option>';
        for (const i of insumos) {
            const selected = i.id === insumoId ? 'selected' : '';
            optionsHtml += `<option value="${i.id}" ${selected}>${i.nombre} (${i.stock} ${i.unidad})</option>`;
        }
        
        div.innerHTML = `
            <select class="ri-insumo-select" style="flex: 2; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text);">
                ${optionsHtml}
            </select>
            <input type="number" class="ri-cantidad" value="${cantidad}" placeholder="Cant." step="0.01" min="0.01" style="width: 70px; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text);">
            <input type="text" class="ri-unidad" value="${unidad}" placeholder="Unidad" style="width: 60px; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text);">
            <button type="button" onclick="this.closest('.receta-insumo-item').remove()" style="background: none; border: none; font-size: 16px; cursor: pointer; color: #ef4444;">✕</button>
        `;
        container.appendChild(div);
    };
    
    loadInsumos();
};

window.addIngredient = function(name = '', quantity = 1, unit = 'kg') {
    const container = document.getElementById('ingredients-container');
    if (!container) return;
    
    const emptyMsg = container.querySelector('div[style*="text-align: center; padding: 8px;"]');
    if (emptyMsg) emptyMsg.remove();
    
    const div = document.createElement('div');
    div.className = 'ingredient-item';
    div.style.cssText = 'display: flex; gap: 6px; align-items: center;';
    div.innerHTML = `
        <input type="text" class="ingredient-name" value="${name}" placeholder="Ingrediente" style="flex: 2; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text);">
        <input type="number" class="ingredient-quantity" value="${quantity}" placeholder="Cant." step="0.01" min="0.01" style="width: 70px; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text);">
        <input type="text" class="ingredient-unit" value="${unit}" placeholder="Unidad" style="width: 60px; padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text);">
        <button type="button" onclick="this.closest('.ingredient-item').remove()" style="background: none; border: none; font-size: 16px; cursor: pointer; color: #ef4444;">✕</button>
    `;
    container.appendChild(div);
};

// ============================================================
// ENVIAR FORMULARIO DE RECETA
// ============================================================

async function submitRecipeForm(recipeId) {
    // 🆕 FASE B: Doble verificación
    if (!canModifyRecipes()) {
        window.showToast('🔒 Solo los administradores pueden guardar recetas', 'warning', 4000);
        return;
    }
    
    const name = document.getElementById('recipe-name').value.trim();
    const description = document.getElementById('recipe-description').value.trim();
    const instructions = document.getElementById('recipe-instructions').value.trim();
    const yieldUnits = parseFloat(document.getElementById('recipe-yield').value) || 1;
    const yieldUnitType = document.getElementById('recipe-unit').value.trim() || 'unidades';
    const shared = document.getElementById('recipe-shared').checked;
    
    if (!name) {
        window.showToast('⚠️ El nombre de la receta es obligatorio', 'error');
        return;
    }
    
    const ingredientElements = document.querySelectorAll('.ingredient-item');
    const ingredients = [];
    ingredientElements.forEach(el => {
        const ingName = el.querySelector('.ingredient-name')?.value.trim();
        const quantity = parseFloat(el.querySelector('.ingredient-quantity')?.value) || 0;
        const unit = el.querySelector('.ingredient-unit')?.value.trim() || 'kg';
        if (ingName && quantity > 0) {
            ingredients.push({ name: ingName, quantity: quantity, unit: unit, price: 0 });
        }
    });
    
    const riElements = document.querySelectorAll('.receta-insumo-item');
    const recetaInsumos = [];
    riElements.forEach(el => {
        const insumoId = parseInt(el.querySelector('.ri-insumo-select')?.value);
        const cantidad = parseFloat(el.querySelector('.ri-cantidad')?.value) || 0;
        const unidad = el.querySelector('.ri-unidad')?.value.trim() || 'kg';
        if (insumoId && cantidad > 0) {
            recetaInsumos.push({ insumo_id: insumoId, cantidad: cantidad, unidad: unidad });
        }
    });
    
    if (ingredients.length === 0 && recetaInsumos.length === 0) {
        window.showToast('⚠️ Agrega al menos un ingrediente o insumo', 'error');
        return;
    }
    
    const recipeData = {
        name: name,
        description: description || null,
        instructions: instructions || null,
        yield_units: yieldUnits,
        yield_unit_type: yieldUnitType,
        shared: shared ? 1 : 0,
        ingredients: ingredients,
        receta_insumos: recetaInsumos
    };
    
    if (recipeId) {
        recipeData.id = recipeId;
    }
    
    try {
        const result = await window.RecipesModule.saveRecipe(recipeData);
        
        if (result.success) {
            window.closeRecipeModal();
            window.showToast(`✅ Receta ${result.cloned ? 'clonada' : 'guardada'} correctamente`, 'success');
            loadRecipes();
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error guardando receta:', error);
        window.showToast('❌ Error al guardar: ' + error.message, 'error');
    }
}

// ============================================================
// VER RECETA EN DETALLE
// FASE A.4: Sección de Auditoría
// FASE B: Botones de edición solo para admin
// ============================================================

async function viewRecipe(id) {
    try {
        const recipeId = parseInt(id);
        if (!recipeId || isNaN(recipeId) || recipeId <= 0) {
            window.showToast('❌ ID de receta no válido', 'error');
            return;
        }

        const recipe = await window.RecipesModule.getRecipe(recipeId);
        if (!recipe) {
            window.showToast('❌ Receta no encontrada', 'error');
            return;
        }
        
        const cost = window.RecipesModule.calculateRecipeCost(recipe) || { totalCost: 0, costPerUnit: 0 };
        const user = window.AuthModule.getCurrentUser();
        const isOwner = recipe.user_id === user?.id;
        const isAdmin = canModifyRecipes();
        
        // 🆕 FASE B: Solo admin Y propietario puede editar
        const puedeEditar = isAdmin && isOwner;
        
        // Fecha de creación
        const fechaCreacion = recipe.created_at 
            ? new Date(recipe.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
            : '—';
        
        let insumosHtml = '';
        if (recipe.receta_insumos && recipe.receta_insumos.length > 0) {
            insumosHtml = `
                <hr>
                <h3 style="margin: 12px 0 8px;">🛒 Insumos</h3>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    ${recipe.receta_insumos.map(ri => `
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border-color); font-size: 13px;">
                            <span>${ri.insumo_nombre || 'Insumo'}</span>
                            <span>${ri.cantidad} ${ri.unidad}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        let costDetailsHtml = '';
        if (cost.ingredientDetails && cost.ingredientDetails.length > 0) {
            costDetailsHtml = `
                <hr>
                <h3 style="margin: 12px 0 8px;">💰 Desglose de costos</h3>
                <div style="display: flex; flex-direction: column; gap: 2px; max-height: 200px; overflow-y: auto;">
                    ${cost.ingredientDetails.map(ing => `
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border-color); font-size: 13px;">
                            <span>${ing.name} (${ing.quantity} ${ing.unit})</span>
                            <span>
                                ${ing.price > 0 ? '$' + ing.price.toFixed(2) : '—'} 
                                × ${ing.quantity} = 
                                <strong>$${ing.subtotal.toFixed(2)}</strong>
                            </span>
                        </div>
                    `).join('')}
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 2px solid var(--border-color); font-weight: 700; font-size: 14px;">
                        <span>📊 COSTO TOTAL</span>
                        <span>$${cost.totalCost.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0; font-weight: 700; font-size: 16px; color: var(--primary); border-top: 2px solid var(--primary);">
                        <span>💰 Costo por unidad (${cost.yieldUnits} ${recipe.yield_unit_type || 'unidades'})</span>
                        <span>$${cost.costPerUnit.toFixed(2)}</span>
                    </div>
                </div>
            `;
        }
        
        const auditoriaSection = renderAuditoriaHTML(recipe);
        
        const modal = document.createElement('div');
        modal.id = 'recipe-view-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            z-index: 99999; padding: 20px;
        `;
        
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h2 style="margin: 0;">📖 ${recipe.name}</h2>
                    <button onclick="window.closeRecipeViewModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
                </div>
                
                <div style="font-size: 12px; color: var(--text-light); margin-bottom: 8px;">
                    📅 Creada: ${fechaCreacion}
                </div>
                
                ${recipe.shared ? `<span style="font-size: 12px; background: #3b82f620; padding: 2px 10px; border-radius: 12px; color: #3b82f6; display: inline-block; margin-bottom: 8px;">🔗 Compartida por ${recipe.creator_username || 'usuario'}</span>` : ''}
                
                ${recipe.description ? `<p style="color: var(--text-light); font-size: 14px;">${recipe.description}</p>` : ''}
                
                <hr>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 14px;">
                    <div><strong>📦 Rendimiento:</strong></div>
                    <div>${parseFloat(recipe.yield_units || 1).toFixed(1)} ${recipe.yield_unit_type || 'unidades'}</div>
                </div>
                
                ${insumosHtml}
                
                <hr>
                
                <h3 style="margin: 12px 0 8px;">🧾 Ingredientes (${recipe.ingredients?.length || 0})</h3>
                ${recipe.ingredients && recipe.ingredients.length > 0 ? `
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        ${recipe.ingredients.map(ing => `
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border-color); font-size: 14px;">
                                <span>${ing.ingredient_name}</span>
                                <span>${parseFloat(ing.quantity).toFixed(2)} ${ing.unit}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p style="color: var(--text-light);">Sin ingredientes</p>'}
                
                ${costDetailsHtml}
                
                ${recipe.instructions ? `
                    <hr>
                    <h3 style="margin: 12px 0 8px;">📋 Instrucciones</h3>
                    <p style="font-size: 14px; color: var(--text-light); white-space: pre-wrap;">${recipe.instructions}</p>
                ` : ''}
                
                ${auditoriaSection}
                
                <hr>
                
                <!-- 🆕 Botones de acción con permisos -->
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${puedeEditar ? `
                        <button onclick="showRecipeForm(${recipe.id})" class="btn primary" style="padding: 6px 16px; font-size: 13px; width: auto;">
                            ✏️ Editar
                        </button>
                        <button onclick="duplicateRecipe(${recipe.id})" class="btn secondary" style="padding: 6px 16px; font-size: 13px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 6px; cursor: pointer;">
                            📋 Duplicar
                        </button>
                    ` : `
                        <button onclick="showRecipeForm()" class="btn primary" style="padding: 6px 16px; font-size: 13px; width: auto;">
                            📋 Usar como plantilla
                        </button>
                    `}
                    
                    <!-- Recalcular (disponible para todos) -->
                    <button onclick="showRecalcularModal(${recipe.id})" class="btn secondary" style="padding: 6px 16px; font-size: 13px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 6px; cursor: pointer;">
                        🔄 Recalcular
                    </button>
                    
                    <!-- Compartir (disponible para todos) -->
                    <button onclick="showCompartirModal(${recipe.id})" class="btn secondary" style="padding: 6px 16px; font-size: 13px; width: auto; background: #10b981; color: #fff; border: none; border-radius: 6px; cursor: pointer;">
                        💬 Compartir
                    </button>
                    
                    <button onclick="exportRecipePDF(${recipe.id})" class="btn secondary" style="padding: 6px 16px; font-size: 13px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 6px; cursor: pointer;">
                        📄 Exportar PDF
                    </button>
                    
                    <button onclick="window.closeRecipeViewModal()" class="btn secondary" style="padding: 6px 16px; font-size: 13px; width: auto;">
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) window.closeRecipeViewModal();
        });
        
    } catch (error) {
        console.error('Error viendo receta:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// MODAL DE RECALCULAR
// ============================================================

async function showRecalcularModal(recipeId) {
    const existingModal = document.getElementById('recalcular-modal');
    if (existingModal) existingModal.remove();
    
    const recipe = await window.RecipesModule.getRecipe(recipeId);
    if (!recipe) {
        window.showToast('❌ Receta no encontrada', 'error');
        return;
    }
    
    // 🆕 FASE B: Determinar si el usuario puede modificar la receta original
    const user = window.AuthModule.getCurrentUser();
    const isOwner = recipe.user_id === user?.id;
    const isAdmin = canModifyRecipes();
    const puedeModificarOriginal = isAdmin && isOwner;
    
    const modal = document.createElement('div');
    modal.id = 'recalcular-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 550px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="margin: 0; color: #f59e0b;">🔄 Recalcular Receta</h2>
                <button onclick="closeRecalcularModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 12px;">
                <div style="font-size: 13px; margin-bottom: 4px;">
                    <strong>📖 Receta:</strong> ${recipe.name}
                </div>
                <div style="font-size: 13px;">
                    <strong>📦 Rendimiento actual:</strong> ${recipe.yield_units} ${recipe.yield_unit_type || 'unidades'}
                </div>
            </div>
            
            ${!puedeModificarOriginal ? `
                <div style="background: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; font-size: 12px; color: #3b82f6;">
                    ℹ️ Puedes recalcular esta receta y guardar el resultado como una <strong>nueva receta</strong> en tu colección.
                </div>
            ` : ''}
            
            <div class="form-group" style="margin-bottom: 12px;">
                <label style="font-size: 14px; font-weight: 600;">Nuevo rendimiento</label>
                <input type="number" id="recalcular-nuevo-rend" value="${recipe.yield_units}" 
                       min="0.1" step="0.1" 
                       style="width: 100%; padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 16px; background: var(--bg-input); color: var(--text);"
                       oninput="previewRecalculo(${recipeId})">
                <small style="font-size: 11px; color: var(--text-light);">
                    Ingresa la cantidad de ${recipe.yield_unit_type || 'unidades'} que quieres producir
                </small>
            </div>
            
            <div id="recalcular-preview" style="background: #f0f9ff; padding: 12px; border-radius: 8px; border: 2px solid #3b82f6; margin-bottom: 12px;">
                <div style="text-align: center; color: var(--text-light); font-size: 13px;">
                    Ingresa un nuevo rendimiento para ver la vista previa
                </div>
            </div>
            
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${puedeModificarOriginal ? `
                    <button onclick="aplicarRecalculo(${recipeId}, 'modificar')" class="btn primary" 
                            style="flex: 1; padding: 12px; font-size: 14px; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        ✏️ Modificar esta receta
                    </button>
                ` : ''}
                <button onclick="aplicarRecalculo(${recipeId}, 'crear')" class="btn secondary" 
                        style="flex: 1; padding: 12px; font-size: 14px; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    📋 Crear nueva receta
                </button>
            </div>
            
            <div style="text-align: center; margin-top: 8px;">
                <button onclick="closeRecalcularModal()" class="btn secondary" 
                        style="padding: 6px 16px; font-size: 12px; width: auto;">
                    Cancelar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => previewRecalculo(recipeId), 100);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeRecalcularModal();
    });
}

async function previewRecalculo(recipeId) {
    const preview = document.getElementById('recalcular-preview');
    if (!preview) return;
    
    const nuevoRend = parseFloat(document.getElementById('recalcular-nuevo-rend')?.value);
    if (!nuevoRend || nuevoRend <= 0) {
        preview.innerHTML = `<div style="text-align: center; color: var(--text-light); font-size: 13px;">Ingresa un nuevo rendimiento válido</div>`;
        return;
    }
    
    const recipe = await window.RecipesModule.getRecipe(recipeId);
    if (!recipe) return;
    
    const resultado = window.RecipesModule.recalcularReceta(recipe, nuevoRend);
    if (!resultado.success) {
        preview.innerHTML = `<div style="color: #ef4444; font-size: 13px;">${resultado.error}</div>`;
        return;
    }
    
    const factor = resultado.factor.toFixed(3);
    
    let insumosHtml = '';
    if (resultado.insumos.length > 0) {
        insumosHtml = resultado.insumos.map(ri => `
            <div style="display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; border-bottom: 1px solid #e0e7ff;">
                <span>${ri.insumo_nombre}</span>
                <span>
                    <span style="color: #94a3b8;">${ri.cantidad_original}</span>
                    <span style="color: #3b82f6; font-weight: 600;"> → ${ri.cantidad_nueva}</span>
                    <span style="color: var(--text-light);"> ${ri.unidad}</span>
                </span>
            </div>
        `).join('');
    }
    
    preview.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
            <span><strong>Factor:</strong> ×${factor}</span>
            <span><strong>Nuevo costo:</strong> $${resultado.costo_total_nuevo.toFixed(2)}</span>
        </div>
        <div style="font-size: 12px; font-weight: 600; margin-bottom: 4px;">Ajustes de insumos:</div>
        ${insumosHtml}
        <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 2px solid #3b82f6; font-size: 13px;">
            <span><strong>💵 Costo por unidad:</strong></span>
            <span><strong>$${resultado.costo_por_unidad_nuevo.toFixed(2)}</strong></span>
        </div>
    `;
}

async function aplicarRecalculo(recipeId, modo) {
    const nuevoRend = parseFloat(document.getElementById('recalcular-nuevo-rend')?.value);
    
    if (!nuevoRend || nuevoRend <= 0) {
        window.showToast('⚠️ Ingresa un rendimiento válido', 'error');
        return;
    }
    
    const recipe = await window.RecipesModule.getRecipe(recipeId);
    if (!recipe) {
        window.showToast('❌ Receta no encontrada', 'error');
        return;
    }
    
    const resultado = window.RecipesModule.recalcularReceta(recipe, nuevoRend);
    if (!resultado.success) {
        window.showToast('❌ ' + resultado.error, 'error');
        return;
    }
    
    if (modo === 'modificar') {
        // 🆕 FASE B: Doble verificación
        if (!canModifyRecipes()) {
            window.showToast('🔒 Solo los administradores pueden modificar recetas existentes', 'warning', 4000);
            return;
        }
        
        const user = window.AuthModule.getCurrentUser();
        if (recipe.user_id !== user?.id) {
            window.showToast('🔒 Solo puedes modificar tus propias recetas', 'warning', 4000);
            return;
        }
        
        const confirm = await window.ModalModule.showConfirm({
            title: '⚠️ Modificar receta original',
            message: `¿Modificar la receta "${recipe.name}" con el nuevo rendimiento de ${nuevoRend}?\n\nLa receta original será reemplazada.`,
            confirmText: '✅ SÍ, MODIFICAR',
            cancelText: 'Cancelar',
            icon: '⚠️',
            confirmColor: '#f59e0b'
        });
        
        if (!confirm) return;
        
        const recipeData = {
            id: recipeId,
            name: recipe.name,
            description: recipe.description,
            instructions: recipe.instructions,
            yield_units: nuevoRend,
            yield_unit_type: recipe.yield_unit_type,
            shared: recipe.shared,
            ingredients: resultado.ingredients.map(ing => ({
                name: ing.ingredient_name,
                quantity: ing.cantidad_nueva,
                unit: ing.unit,
                price: ing.price
            })),
            receta_insumos: resultado.insumos.map(ri => ({
                insumo_id: ri.insumo_id,
                cantidad: ri.cantidad_nueva,
                unidad: ri.unidad
            }))
        };
        
        const result = await window.RecipesModule.saveRecipe(recipeData);
        if (result.success) {
            closeRecalcularModal();
            window.showToast(`✅ Receta modificada a ${nuevoRend} ${recipe.yield_unit_type}`, 'success');
            loadRecipes();
            window.closeRecipeViewModal();
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
        
    } else {
        // Crear nueva receta (disponible para todos)
        const newName = await window.ModalModule.showPrompt({
            title: '📋 Crear nueva receta',
            message: 'Nombre para la nueva receta:',
            placeholder: 'Ej: ' + recipe.name + ' (50 unidades)',
            icon: '📋',
            defaultValue: recipe.name + ` (${nuevoRend} ${recipe.yield_unit_type})`
        });
        
        if (!newName || !newName.trim()) {
            window.showToast('⚠️ Nombre obligatorio', 'error');
            return;
        }
        
        const recipeData = {
            name: newName.trim(),
            description: recipe.description,
            instructions: recipe.instructions,
            yield_units: nuevoRend,
            yield_unit_type: recipe.yield_unit_type,
            shared: 0,
            ingredients: resultado.ingredients.map(ing => ({
                name: ing.ingredient_name,
                quantity: ing.cantidad_nueva,
                unit: ing.unit,
                price: ing.price
            })),
            receta_insumos: resultado.insumos.map(ri => ({
                insumo_id: ri.insumo_id,
                cantidad: ri.cantidad_nueva,
                unidad: ri.unidad
            }))
        };
        
        // ⚠️ Para crear receta nueva, aunque el usuario no sea admin,
        // permitimos la operación porque es SU nueva receta.
        // Usamos directamente saveRecipe sin el bloqueo de permisos.
        const result = await window.RecipesModule.saveRecipe(recipeData);
        if (result.success) {
            closeRecalcularModal();
            window.showToast(`✅ Nueva receta "${newName.trim()}" creada`, 'success');
            loadRecipes();
            window.closeRecipeViewModal();
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
    }
}

function closeRecalcularModal() {
    const modal = document.getElementById('recalcular-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
    }
}

// ============================================================
// MODAL DE COMPARTIR
// ============================================================

async function showCompartirModal(recipeId) {
    const existingModal = document.getElementById('compartir-modal');
    if (existingModal) existingModal.remove();
    
    const recipe = await window.RecipesModule.getRecipe(recipeId);
    if (!recipe) {
        window.showToast('❌ Receta no encontrada', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'compartir-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 420px; width: 100%;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="margin: 0; color: #10b981;">💬 Compartir Receta</h2>
                <button onclick="closeCompartirModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <div style="background: var(--bg); padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px;">
                <strong>${recipe.name}</strong><br>
                <span style="color: var(--text-light);">
                    ${recipe.yield_units} ${recipe.yield_unit_type || 'unidades'} · 
                    ${(recipe.receta_insumos?.length || recipe.ingredients?.length || 0)} ingredientes
                </span>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <button onclick="compartirPorWhatsApp(${recipe.id})" 
                        class="btn primary" 
                        style="padding: 12px; font-size: 14px; background: #25D366; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; text-align: left; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">💬</span> Compartir por WhatsApp
                </button>
                
                <button onclick="compartirPorMessenger(${recipe.id})" 
                        class="btn primary" 
                        style="padding: 12px; font-size: 14px; background: #0084FF; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; text-align: left; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">📱</span> Compartir por Messenger
                </button>
                
                <button onclick="compartirPorEmail(${recipe.id})" 
                        class="btn primary" 
                        style="padding: 12px; font-size: 14px; background: #EA4335; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; text-align: left; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">📧</span> Compartir por Email
                </button>
                
                <button onclick="copiarReceta(${recipe.id})" 
                        class="btn secondary" 
                        style="padding: 12px; font-size: 14px; text-align: left; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">📋</span> Copiar al portapapeles
                </button>
            </div>
            
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color); text-align: center;">
                <button onclick="closeCompartirModal()" class="btn secondary" 
                        style="padding: 8px 16px; font-size: 13px; width: auto;">
                    Cancelar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeCompartirModal();
    });
}

async function compartirPorWhatsApp(recipeId) {
    const recipe = await window.RecipesModule.getRecipe(recipeId);
    if (recipe) {
        window.RecipesModule.compartirRecetaWhatsApp(recipe);
        closeCompartirModal();
    }
}

async function compartirPorMessenger(recipeId) {
    const recipe = await window.RecipesModule.getRecipe(recipeId);
    if (recipe) {
        window.RecipesModule.compartirRecetaMessenger(recipe);
        closeCompartirModal();
    }
}

async function compartirPorEmail(recipeId) {
    const recipe = await window.RecipesModule.getRecipe(recipeId);
    if (recipe) {
        window.RecipesModule.compartirRecetaEmail(recipe);
        closeCompartirModal();
    }
}

async function copiarReceta(recipeId) {
    const recipe = await window.RecipesModule.getRecipe(recipeId);
    if (recipe) {
        window.RecipesModule.copiarRecetaAlPortapapeles(recipe);
        closeCompartirModal();
    }
}

function closeCompartirModal() {
    const modal = document.getElementById('compartir-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
    }
}

// ============================================================
// EXPORTAR RECETA A PDF
// ============================================================

async function exportRecipePDF(recipeId) {
    try {
        const id = parseInt(recipeId);
        if (!id || isNaN(id) || id <= 0) {
            window.showToast('❌ ID de receta no válido', 'error');
            return;
        }

        const recipe = await window.RecipesModule.getRecipe(id);
        if (!recipe) {
            window.showToast('❌ Receta no encontrada', 'error');
            return;
        }
        
        const cost = window.RecipesModule.calculateRecipeCost(recipe);
        const fechaCreacion = recipe.created_at 
            ? new Date(recipe.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
            : '—';
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${recipe.name} - Receta</title>
                <style>
                    * { font-family: system-ui, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
                    body { padding: 30px; background: #fff; max-width: 800px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #8b5cf6; padding-bottom: 15px; }
                    .header h1 { color: #8b5cf6; font-size: 28px; }
                    .header p { color: #666; font-size: 14px; margin-top: 4px; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0; background: #f8f9fa; padding: 15px; border-radius: 8px; }
                    .info-grid .label { font-weight: 600; color: #666; }
                    .section { margin-top: 20px; }
                    .section h3 { color: #333; margin-bottom: 10px; font-size: 18px; border-bottom: 2px solid #eee; padding-bottom: 6px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { background: #8b5cf6; color: #fff; padding: 8px 12px; text-align: left; }
                    td { padding: 6px 12px; border-bottom: 1px solid #eee; }
                    tr:nth-child(even) { background: #fafafa; }
                    .total-row { font-weight: 700; background: #f3e8ff; }
                    .footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #eee; padding-top: 15px; }
                    .shared-badge { display: inline-block; background: #3b82f620; color: #3b82f6; padding: 2px 12px; border-radius: 12px; font-size: 12px; }
                    .instructions { background: #f8f9fa; padding: 12px; border-radius: 6px; margin-top: 10px; white-space: pre-wrap; }
                    .fecha { font-size: 12px; color: #666; text-align: center; margin-top: 4px; }
                    @media print {
                        body { padding: 15px; }
                        .header h1 { font-size: 22px; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📖 ${recipe.name}</h1>
                    ${recipe.shared ? '<span class="shared-badge">🌐 Receta Compartida</span>' : ''}
                    <p class="fecha">📅 Creada: ${fechaCreacion}</p>
                    <p>${recipe.description || 'Sin descripción'}</p>
                </div>

                <div class="info-grid">
                    <div><span class="label">📦 Rendimiento:</span> ${recipe.yield_units || 1} ${recipe.yield_unit_type || 'unidades'}</div>
                    <div><span class="label">💰 Costo total:</span> $${(cost.totalCost || 0).toFixed(2)}</div>
                    <div><span class="label">💵 Costo por unidad:</span> $${(cost.costPerUnit || 0).toFixed(2)}</div>
                    <div><span class="label">👤 Creado por:</span> ${recipe.creator_username || 'Usuario'}</div>
                </div>

                <div class="section">
                    <h3>🧾 Insumos</h3>
                    ${recipe.receta_insumos && recipe.receta_insumos.length > 0 ? `
                        <table>
                            <thead>
                                <tr>
                                    <th>Insumo</th>
                                    <th style="text-align: center;">Cantidad</th>
                                    <th>Unidad</th>
                                    <th style="text-align: right;">Costo Unit.</th>
                                    <th style="text-align: right;">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${recipe.receta_insumos.map(ri => `
                                    <tr>
                                        <td>${ri.insumo_nombre || 'Insumo'}</td>
                                        <td style="text-align: center;">${ri.cantidad}</td>
                                        <td>${ri.unidad}</td>
                                        <td style="text-align: right;">$${(ri.costo_unitario || 0).toFixed(2)}</td>
                                        <td style="text-align: right;">$${(ri.cantidad * (ri.costo_unitario || 0)).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td colspan="4" style="text-align: right;">TOTAL</td>
                                    <td style="text-align: right;">$${(cost.totalCost || 0).toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    ` : '<p style="color: #94a3b8;">No hay insumos asociados</p>'}
                </div>

                ${recipe.instructions ? `
                    <div class="section">
                        <h3>📋 Instrucciones</h3>
                        <div class="instructions">${recipe.instructions}</div>
                    </div>
                ` : ''}

                <div class="footer">
                    Reporte generado desde Panario 🍞 - ${new Date().toLocaleString('es-ES')}
                </div>
            </body>
            </html>
        `;
        
        if (window.ReportsModule) {
            window.ReportsModule.printReport(html);
        } else {
            const win = window.open('', '_blank');
            if (!win) {
                window.showToast('❌ Permite ventanas emergentes', 'error');
                return;
            }
            win.document.write(html);
            win.document.close();
            setTimeout(() => win.print(), 500);
        }
        
    } catch (error) {
        console.error('Error exportando receta:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// ELIMINAR RECETA (SOLO ADMIN)
// ============================================================

async function deleteRecipe(id) {
    if (!canModifyRecipes()) {
        window.showToast('🔒 Solo los administradores pueden eliminar recetas', 'warning', 4000);
        return;
    }
    
    const recipeId = parseInt(id);
    if (!recipeId || isNaN(recipeId) || recipeId <= 0) {
        window.showToast('❌ ID de receta no válido', 'error');
        return;
    }

    try {
        const recipe = await window.RecipesModule.getRecipe(recipeId);
        if (!recipe) {
            window.showToast('❌ La receta no existe', 'warning');
            await loadRecipes();
            return;
        }

        const user = window.AuthModule.getCurrentUser();
        if (recipe.user_id !== user.id) {
            window.showToast('⚠️ No tienes permiso', 'warning');
            return;
        }

        const confirm = await window.ModalModule.showConfirm({
            title: 'Eliminar receta',
            message: `¿Seguro que quieres eliminar la receta "${recipe.name}"?\n\n⚠️ Esta acción no se puede deshacer.`,
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar',
            icon: '🗑️',
            confirmColor: '#ef4444'
        });
        
        if (!confirm) return;
        
        const result = await window.RecipesModule.deleteRecipe(recipeId);
        if (result.success) {
            window.showToast('🗑️ Receta eliminada', 'success');
            await loadRecipes();
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error eliminando receta:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
        await loadRecipes();
    }
}

// ============================================================
// COMPARTIR (SOLO ADMIN)
// ============================================================

async function toggleShareRecipe(id) {
    if (!canModifyRecipes()) {
        window.showToast('🔒 Solo los administradores pueden cambiar la visibilidad de las recetas', 'warning', 4000);
        return;
    }
    
    try {
        const result = await window.RecipesModule.toggleShareRecipe(id);
        if (result.success) {
            window.showToast(result.shared ? '🌐 Receta compartida' : '🔒 Receta privada', 'success');
            loadRecipes();
        } else {
            window.showToast('❌ ' + result.error, 'error');
        }
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// REPORTE DE RECETAS
// ============================================================

function showRecipesReportModal() {
    if (window.ReportsModule) {
        const html = window.ReportsModule.generateRecipesReport();
        window.ReportsModule.printReport(html);
    } else {
        window.showToast('❌ Módulo de reportes no disponible', 'error');
    }
}

// ============================================================
// CIERRE DE MODALES
// ============================================================

window.closeRecipeModal = function() {
    const modal = document.getElementById('recipe-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
    }
};

window.closeRecipeViewModal = function() {
    const modal = document.getElementById('recipe-view-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
    }
};

// ============================================================
// EXPORTACIÓN
// ============================================================

window.renderRecipesView = renderRecipesView;
window.loadRecipes = loadRecipes;
window.showRecipeForm = showRecipeForm;
window.viewRecipe = viewRecipe;
window.toggleShareRecipe = toggleShareRecipe;
window.deleteRecipe = deleteRecipe;
window.addIngredient = addIngredient;
window.addRecetaInsumo = addRecetaInsumo;
window.duplicateRecipe = duplicateRecipe;
window.exportRecipePDF = exportRecipePDF;
window.showRecipesReportModal = showRecipesReportModal;
window.showRecalcularModal = showRecalcularModal;
window.previewRecalculo = previewRecalculo;
window.aplicarRecalculo = aplicarRecalculo;
window.closeRecalcularModal = closeRecalcularModal;
window.showCompartirModal = showCompartirModal;
window.closeCompartirModal = closeCompartirModal;
window.compartirPorWhatsApp = compartirPorWhatsApp;
window.compartirPorMessenger = compartirPorMessenger;
window.compartirPorEmail = compartirPorEmail;
window.copiarReceta = copiarReceta;
window.renderAuditoriaHTML = renderAuditoriaHTML;
window.canModifyRecipes = canModifyRecipes;

console.log('📦 UI Recipes Module cargado correctamente v2.0.2 (FASE A.4 + FASE B: solo lectura + recalcular para no-admin)');