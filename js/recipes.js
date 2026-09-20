// ============================================================
// 📦 RECIPES MODULE - Panario (Recetas con recálculo y compartir)
// AÑADIDO (180926 v4):
//   - Nombre del negocio en el texto al compartir recetas
//   - generarTextoReceta() usa getNombreNegocio()
//   - compartirRecetaEmail() incluye el negocio en el asunto
// AÑADIDO FASE 1.3.2 (190926 v5):
//   - saveRecipe() genera uuid para recipes, recipe_ingredients y receta_insumos
//   - cloneRecipe() genera uuid para la copia y sus dependencias
// ============================================================

window.RecipesModule = {};

// ============================================================
// 🆕 HELPER: OBTENER NOMBRE DEL NEGOCIO
// ============================================================

/**
 * Devuelve el nombre del negocio actual para usar en textos compartidos.
 * Usa window.getNombreNegocio() si existe (definido en app.js).
 * Fallback: "Panario".
 * 
 * @returns {string} Nombre del negocio
 */
function getNombreNegocioRecetas() {
    try {
        if (typeof window.getNombreNegocio === 'function') {
            return window.getNombreNegocio();
        }
        
        const user = window.AuthModule?.getCurrentUser();
        if (user) {
            if (user.negocio && user.negocio.nombre) return user.negocio.nombre;
            if (user.business_name) return user.business_name;
        }
        
        return 'Panario';
    } catch (e) {
        console.warn('⚠️ Error obteniendo nombre del negocio en recetas:', e);
        return 'Panario';
    }
}

// ============================================================
// RECETAS CRUD
// ============================================================

async function getRecipes(includeShared = true) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return [];

    let sql = `
        SELECT r.*, u.username as creator_username 
        FROM recipes r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE (r.user_id = ? OR (r.shared = 1 AND r.user_id != ?))
    `;
    let params = [user.id, user.id];

    if (!includeShared) {
        sql = `
            SELECT r.*, u.username as creator_username 
            FROM recipes r
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.user_id = ?
        `;
        params = [user.id];
    }

    sql += ` AND r.deleted_at IS NULL ORDER BY r.shared DESC, r.created_at DESC`;

    return window.DBModule.query(sql, params);
}

async function getRecipe(id) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return null;

    if (!id || isNaN(id)) {
        console.error('❌ ID de receta no válido:', id);
        return null;
    }

    const results = window.DBModule.query(
        `SELECT r.*, u.username as creator_username 
         FROM recipes r
         LEFT JOIN users u ON r.user_id = u.id
         WHERE r.id = ? AND r.deleted_at IS NULL AND (r.user_id = ? OR r.shared = 1)`,
        [id, user.id]
    );

    if (results.length === 0) {
        console.warn('⚠️ Receta no encontrada para ID:', id);
        return null;
    }

    const recipe = results[0];

    recipe.ingredients = window.DBModule.query(
        'SELECT * FROM recipe_ingredients WHERE recipe_id = ? AND deleted_at IS NULL',
        [id]
    );

    recipe.receta_insumos = window.DBModule.getRecetaInsumos(id);

    if (recipe.user_id != user.id && recipe.shared == 1) {
        recipe.is_shared_readonly = true;
    }

    return recipe;
}

async function saveRecipe(recipeData) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    try {
        let recipeId = recipeData.id || null;

        if (recipeId) {
            const existing = await getRecipe(recipeId);
            if (existing && existing.shared == 1 && existing.used_by_others == 1 && existing.user_id != user.id) {
                return await cloneRecipe(recipeId, recipeData);
            }
        }

        if (recipeId) {
            // UPDATE: no se regenera uuid
            window.DBModule.execute(`
                UPDATE recipes 
                SET name = ?, description = ?, instructions = ?, 
                    yield_units = ?, yield_unit_type = ?, 
                    shared = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            `, [
                recipeData.name,
                recipeData.description || null,
                recipeData.instructions || null,
                recipeData.yield_units || 1,
                recipeData.yield_unit_type || 'unidades',
                recipeData.shared ? 1 : 0,
                recipeId,
                user.id
            ]);

            window.DBModule.execute(
                'UPDATE recipe_ingredients SET deleted_at = CURRENT_TIMESTAMP WHERE recipe_id = ?',
                [recipeId]
            );

            window.DBModule.execute(
                'DELETE FROM receta_insumos WHERE receta_id = ?',
                [recipeId]
            );

        } else {
            // 🆕 FASE 1.3.2: Generar uuid para la receta nueva
            const db = window.DBModule.getDB();
            const recetaUuid = window.DBModule.generateUuidForTable('recipes');
            
            db.run(`
                INSERT INTO recipes (user_id, name, description, instructions, 
                    yield_units, yield_unit_type, shared, uuid)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                user.id,
                recipeData.name,
                recipeData.description || null,
                recipeData.instructions || null,
                recipeData.yield_units || 1,
                recipeData.yield_unit_type || 'unidades',
                recipeData.shared ? 1 : 0,
                recetaUuid
            ]);
            
            const idResult = db.exec('SELECT last_insert_rowid() as id');
            recipeId = idResult[0]?.values?.[0]?.[0] || null;
            
            console.log(`✅ [saveRecipe] Receta #${recipeId} creada con uuid ${recetaUuid}`);
            
            window.DBModule.saveDatabase();
        }

        if (!recipeId) {
            return { success: false, error: 'Error al guardar la receta: ID no generado' };
        }

        if (recipeData.ingredients && recipeData.ingredients.length > 0) {
            const db = window.DBModule.getDB();
            
            for (const ingredient of recipeData.ingredients) {
                const ingName = ingredient.name || ingredient.ingredient_name;
                if (ingName && ingredient.quantity > 0) {
                    // 🆕 FASE 1.3.2: Generar uuid para cada ingrediente
                    const ingUuid = window.DBModule.generateUuidForTable('recipe_ingredients');
                    
                    db.run(`
                        INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, price, uuid)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        recipeId,
                        ingName.trim(),
                        parseFloat(ingredient.quantity) || 0,
                        ingredient.unit || 'kg',
                        ingredient.price || 0,
                        ingUuid
                    ]);
                }
            }
        }

        if (recipeData.receta_insumos && recipeData.receta_insumos.length > 0) {
            for (const ri of recipeData.receta_insumos) {
                if (ri.insumo_id && ri.cantidad > 0) {
                    // 🆕 FASE 1.3.2: Generar uuid para cada receta_insumo
                    const riUuid = window.DBModule.generateUuidForTable('receta_insumos');
                    
                    window.DBModule.execute(`
                        INSERT INTO receta_insumos (receta_id, insumo_id, cantidad, unidad, uuid)
                        VALUES (?, ?, ?, ?, ?)
                    `, [
                        recipeId,
                        ri.insumo_id,
                        ri.cantidad,
                        ri.unidad || 'kg',
                        riUuid
                    ]);
                }
            }
        }

        window.DBModule.saveAndNotify();
        return { success: true, id: recipeId };

    } catch (e) {
        console.error('❌ Error guardando receta:', e);
        return { success: false, error: e.message };
    }
}

async function cloneRecipe(originalId, newData) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    try {
        const original = await getRecipe(originalId);
        if (!original) return { success: false, error: 'Receta original no encontrada' };

        const db = window.DBModule.getDB();
        
        // 🆕 FASE 1.3.2: Generar uuid para la copia
        const recetaUuid = window.DBModule.generateUuidForTable('recipes');
        
        db.run(`
            INSERT INTO recipes (user_id, name, description, instructions, 
                yield_units, yield_unit_type, shared, uuid)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            user.id,
            newData.name || original.name + ' (copia)',
            newData.description || original.description,
            newData.instructions || original.instructions,
            newData.yield_units || original.yield_units,
            newData.yield_unit_type || original.yield_unit_type,
            newData.shared ? 1 : 0,
            recetaUuid
        ]);

        const idResult = db.exec('SELECT last_insert_rowid() as id');
        const newId = idResult[0]?.values?.[0]?.[0] || null;
        
        console.log(`✅ [cloneRecipe] Copia #${newId} creada con uuid ${recetaUuid}`);
        
        window.DBModule.saveDatabase();

        if (!newId) {
            return { success: false, error: 'Error al clonar: ID no generado' };
        }

        if (original.ingredients && original.ingredients.length > 0) {
            for (const ing of original.ingredients) {
                // 🆕 FASE 1.3.2: Generar uuid para cada ingrediente clonado
                const ingUuid = window.DBModule.generateUuidForTable('recipe_ingredients');
                
                db.run(`
                    INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, price, uuid)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    newId, ing.ingredient_name, ing.quantity,
                    ing.unit || 'kg', ing.price || 0, ingUuid
                ]);
            }
        }

        if (original.receta_insumos && original.receta_insumos.length > 0) {
            for (const ri of original.receta_insumos) {
                // 🆕 FASE 1.3.2: Generar uuid para cada receta_insumo clonado
                const riUuid = window.DBModule.generateUuidForTable('receta_insumos');
                
                db.run(`
                    INSERT INTO receta_insumos (receta_id, insumo_id, cantidad, unidad, uuid)
                    VALUES (?, ?, ?, ?, ?)
                `, [
                    newId, ri.insumo_id, ri.cantidad, ri.unidad || 'kg', riUuid
                ]);
            }
        }

        window.DBModule.saveAndNotify();
        return { success: true, id: newId, cloned: true };

    } catch (e) {
        console.error('Error clonando receta:', e);
        return { success: false, error: e.message };
    }
}

async function deleteRecipe(id) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    if (!id || isNaN(id)) {
        return { success: false, error: 'ID de receta no válido' };
    }

    try {
        const recipe = await getRecipe(id);
        if (!recipe) {
            return { success: false, error: 'Receta no encontrada' };
        }
        
        if (recipe.user_id != user.id) {
            return { success: false, error: 'No tienes permiso para eliminar esta receta' };
        }

        window.DBModule.execute(
            'UPDATE recipes SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
            [id, user.id]
        );
        
        window.DBModule.execute(
            'UPDATE recipe_ingredients SET deleted_at = CURRENT_TIMESTAMP WHERE recipe_id = ?',
            [id]
        );
        
        window.DBModule.execute(
            'DELETE FROM receta_insumos WHERE receta_id = ?',
            [id]
        );
        
        window.DBModule.saveAndNotify();
        return { success: true };

    } catch (e) {
        console.error('Error eliminando receta:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// COMPARTIR RECETAS
// ============================================================

async function toggleShareRecipe(id) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    try {
        const recipe = await getRecipe(id);
        if (!recipe) return { success: false, error: 'Receta no encontrada' };
        if (recipe.user_id != user.id) {
            return { success: false, error: 'No tienes permiso para modificar esta receta' };
        }

        const newShared = recipe.shared == 1 ? 0 : 1;
        window.DBModule.execute(
            'UPDATE recipes SET shared = ? WHERE id = ? AND user_id = ?',
            [newShared, id, user.id]
        );

        if (newShared == 0 && recipe.used_by_others == 1) {
            window.DBModule.execute(
                'UPDATE recipes SET shared = 1 WHERE id = ? AND user_id = ?',
                [id, user.id]
            );
            return { 
                success: false, 
                error: '⚠️ No se puede desactivar el compartir. La receta ya ha sido usada por otros usuarios.' 
            };
        }

        window.DBModule.saveAndNotify();
        return { success: true, shared: newShared };

    } catch (e) {
        console.error('Error cambiando estado de compartir:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// CÁLCULO DE COSTOS
// ============================================================

function calculateRecipeCost(recipe) {
    if (!recipe) {
        return { 
            totalCost: 0, costPerUnit: 0, hasPrices: false, 
            needsPrices: true, ingredientDetails: []
        };
    }

    let totalCost = 0;
    let hasPrices = false;
    let ingredientDetails = [];

    if (recipe.receta_insumos && recipe.receta_insumos.length > 0) {
        for (const ri of recipe.receta_insumos) {
            const costo = ri.costo_unitario || 0;
            const subtotal = ri.cantidad * costo;
            totalCost += subtotal;
            if (costo > 0) hasPrices = true;
            
            ingredientDetails.push({
                name: ri.insumo_nombre || 'Insumo',
                quantity: ri.cantidad,
                unit: ri.unidad || 'kg',
                price: costo,
                priceSource: costo > 0 ? '📦 Insumo' : '⚠️ Sin precio',
                subtotal: subtotal,
                insumo_id: ri.insumo_id
            });
        }
    } 
    else if (recipe.ingredients && recipe.ingredients.length > 0) {
        for (const ing of recipe.ingredients) {
            let price = 0;
            let priceSource = 'ninguno';
            
            const insumo = window.DBModule.getInsumoByName(ing.ingredient_name);
            if (insumo && insumo.costo_unitario > 0) {
                price = insumo.costo_unitario;
                priceSource = '📦 Insumo';
                hasPrices = true;
            }
            
            const subtotal = ing.quantity * price;
            totalCost += subtotal;
            
            ingredientDetails.push({
                name: ing.ingredient_name,
                quantity: ing.quantity,
                unit: ing.unit || 'kg',
                price: price,
                priceSource: priceSource,
                subtotal: subtotal
            });
        }
    }

    const yieldUnits = parseFloat(recipe.yield_units) || 1;
    const costPerUnit = yieldUnits > 0 ? totalCost / yieldUnits : 0;

    return {
        totalCost: totalCost,
        costPerUnit: costPerUnit,
        yieldUnits: yieldUnits,
        hasPrices: hasPrices,
        needsPrices: !hasPrices && totalCost === 0,
        ingredientDetails: ingredientDetails,
        ingredientCount: ingredientDetails.length
    };
}

// ============================================================
// RECALCULAR RECETA (REGLA DE 3 CON REDONDEO)
// ============================================================

/**
 * Redondea una cantidad según las reglas del documento.
 * 
 * Ejemplos:
 * - 1.005 kg → 1.01 kg
 * - 0.333 kg → 0.34 kg
 * - 1.0 kg → 1 kg
 * - 0.010 kg → 0.01 kg
 * - 5.5 kg → 5.5 kg
 */
function redondearCantidad(cantidad) {
    if (cantidad === 0) return 0;
    
    if (Number.isInteger(cantidad)) return cantidad;
    
    const cantidadStr = cantidad.toString();
    const parteDecimal = cantidadStr.split('.')[1];
    const decimales = parteDecimal ? parteDecimal.length : 0;
    
    const factor = Math.pow(10, decimales);
    const redondeado = Math.ceil(cantidad * factor) / factor;
    
    return redondeado;
}

/**
 * Recalcula una receta para un nuevo rendimiento usando regla de 3.
 */
function recalcularReceta(recipe, nuevoRendimiento) {
    if (!recipe) return { success: false, error: 'Receta no encontrada' };
    
    const rendimientoOriginal = parseFloat(recipe.yield_units) || 1;
    const factor = nuevoRendimiento / rendimientoOriginal;
    
    if (factor <= 0 || !isFinite(factor)) {
        return { success: false, error: 'Nuevo rendimiento no válido' };
    }
    
    const insumosRecalculados = [];
    if (recipe.receta_insumos && recipe.receta_insumos.length > 0) {
        for (const ri of recipe.receta_insumos) {
            const cantidadOriginal = parseFloat(ri.cantidad) || 0;
            const cantidadNueva = redondearCantidad(cantidadOriginal * factor);
            
            insumosRecalculados.push({
                insumo_id: ri.insumo_id,
                insumo_nombre: ri.insumo_nombre,
                unidad: ri.unidad,
                costo_unitario: ri.costo_unitario,
                cantidad_original: cantidadOriginal,
                cantidad_nueva: cantidadNueva,
                subtotal_nuevo: cantidadNueva * (ri.costo_unitario || 0)
            });
        }
    }
    
    const ingredientsRecalculados = [];
    if (recipe.ingredients && recipe.ingredients.length > 0) {
        for (const ing of recipe.ingredients) {
            const cantidadOriginal = parseFloat(ing.quantity) || 0;
            const cantidadNueva = redondearCantidad(cantidadOriginal * factor);
            
            ingredientsRecalculados.push({
                ingredient_name: ing.ingredient_name,
                unit: ing.unit,
                price: ing.price,
                cantidad_original: cantidadOriginal,
                cantidad_nueva: cantidadNueva
            });
        }
    }
    
    const costoTotalNuevo = insumosRecalculados.reduce((sum, ri) => sum + ri.subtotal_nuevo, 0);
    const costoPorUnidadNuevo = nuevoRendimiento > 0 ? costoTotalNuevo / nuevoRendimiento : 0;
    
    return {
        success: true,
        rendimiento_original: rendimientoOriginal,
        rendimiento_nuevo: nuevoRendimiento,
        factor: factor,
        insumos: insumosRecalculados,
        ingredients: ingredientsRecalculados,
        costo_total_nuevo: costoTotalNuevo,
        costo_por_unidad_nuevo: costoPorUnidadNuevo
    };
}

// ============================================================
// COMPARTIR RECETAS POR WHATSAPP/MESSENGER/EMAIL
// ============================================================

/**
 * Genera el texto formateado de la receta para compartir.
 * 🆕 v4: Incluye el nombre del negocio en el pie.
 */
function generarTextoReceta(recipe) {
    if (!recipe) return '';
    
    const costo = calculateRecipeCost(recipe);
    const nombreNegocio = getNombreNegocioRecetas();
    
    let texto = `🍞 *${recipe.name}*\n\n`;
    
    if (recipe.description) {
        texto += `📝 ${recipe.description}\n\n`;
    }
    
    texto += `📦 Rendimiento: ${recipe.yield_units || 1} ${recipe.yield_unit_type || 'unidades'}\n`;
    texto += `💰 Costo total: $${(costo.totalCost || 0).toFixed(2)}\n`;
    texto += `💵 Costo por unidad: $${(costo.costPerUnit || 0).toFixed(2)}\n\n`;
    
    // Insumos
    if (recipe.receta_insumos && recipe.receta_insumos.length > 0) {
        texto += `🧾 *Insumos:*\n`;
        for (const ri of recipe.receta_insumos) {
            texto += `• ${ri.insumo_nombre || 'Insumo'}: ${ri.cantidad} ${ri.unidad}\n`;
        }
        texto += `\n`;
    } else if (recipe.ingredients && recipe.ingredients.length > 0) {
        texto += `🧾 *Ingredientes:*\n`;
        for (const ing of recipe.ingredients) {
            texto += `• ${ing.ingredient_name}: ${ing.quantity} ${ing.unit}\n`;
        }
        texto += `\n`;
    }
    
    // Instrucciones
    if (recipe.instructions) {
        texto += `📋 *Instrucciones:*\n${recipe.instructions}\n\n`;
    }
    
    // 🆕 v4: Nombre del negocio en el pie
    texto += `_Compartido desde ${nombreNegocio} 🍞_`;
    
    return texto;
}

/**
 * Compartir receta por WhatsApp
 */
function compartirRecetaWhatsApp(recipe) {
    const texto = generarTextoReceta(recipe);
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
    window.showToast('💬 Abriendo WhatsApp...', 'info', 3000);
}

/**
 * Compartir receta por Messenger
 */
function compartirRecetaMessenger(recipe) {
    const texto = generarTextoReceta(recipe);
    navigator.clipboard.writeText(texto).then(() => {
        window.showToast('📋 Receta copiada. Pégala en Messenger', 'success', 4000);
        window.open('https://www.messenger.com/', '_blank');
    }).catch(() => {
        window.showToast('❌ No se pudo copiar al portapapeles', 'error');
    });
}

/**
 * Compartir receta por Email
 * 🆕 v4: Incluye el nombre del negocio en el asunto
 */
function compartirRecetaEmail(recipe) {
    const texto = generarTextoReceta(recipe).replace(/\*/g, ''); // Quitar markdown
    const nombreNegocio = getNombreNegocioRecetas();
    const subject = `Receta: ${recipe.name} - ${nombreNegocio}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
}

/**
 * Copiar receta al portapapeles
 */
function copiarRecetaAlPortapapeles(recipe) {
    const texto = generarTextoReceta(recipe);
    navigator.clipboard.writeText(texto).then(() => {
        window.showToast('✅ Receta copiada al portapapeles', 'success', 3000);
    }).catch(() => {
        window.showToast('❌ No se pudo copiar', 'error');
    });
}

// ============================================================
// VALIDAR STOCK
// ============================================================

async function validarStockReceta(recetaId, cantidad = 1) {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    try {
        const recipe = await getRecipe(recetaId);
        if (!recipe) return { success: false, error: 'Receta no encontrada' };

        if (!recipe.receta_insumos || recipe.receta_insumos.length === 0) {
            return { success: true, valid: true, message: 'No hay insumos asociados a esta receta' };
        }

        const faltantes = [];
        for (const ri of recipe.receta_insumos) {
            const insumo = window.DBModule.getInsumo(ri.insumo_id);
            if (!insumo) {
                faltantes.push({ nombre: 'Insumo desconocido', cantidad: ri.cantidad * cantidad });
                continue;
            }
            
            const necesario = ri.cantidad * cantidad;
            if (insumo.stock < necesario) {
                faltantes.push({
                    nombre: insumo.nombre,
                    stock: insumo.stock,
                    necesario: necesario,
                    unidad: insumo.unidad,
                    id: insumo.id
                });
            }
        }

        if (faltantes.length > 0) {
            return { 
                success: true, valid: false, faltantes,
                message: 'Stock insuficiente para algunos insumos'
            };
        }

        return { success: true, valid: true, message: 'Stock suficiente' };

    } catch (e) {
        console.error('Error validando stock:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// DESCONTAR STOCK
// ============================================================

async function descontarStockReceta(recetaId, cantidad = 1, concepto = 'Producción') {
    const user = window.AuthModule.getCurrentUser();
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    try {
        const recipe = await getRecipe(recetaId);
        if (!recipe) return { success: false, error: 'Receta no encontrada' };

        if (!recipe.receta_insumos || recipe.receta_insumos.length === 0) {
            return { success: true, message: 'No hay insumos que descontar' };
        }

        const descontados = [];
        for (const ri of recipe.receta_insumos) {
            const necesario = ri.cantidad * cantidad;
            const result = window.DBModule.actualizarStockInsumo(ri.insumo_id, -necesario);
            if (!result.success) {
                return { success: false, error: `Error descontando ${ri.insumo_nombre}: ${result.error}` };
            }
            descontados.push({
                nombre: ri.insumo_nombre,
                cantidad: necesario,
                unidad: ri.unidad,
                stock_restante: result.stock
            });
        }

        return { success: true, descontados: descontados };

    } catch (e) {
        console.error('Error descontando stock:', e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// EXPORTACIÓN
// ============================================================

window.RecipesModule = {
    getRecipes,
    getRecipe,
    saveRecipe,
    deleteRecipe,
    cloneRecipe,
    toggleShareRecipe,
    calculateRecipeCost,
    validarStockReceta,
    descontarStockReceta,
    // Recalcular y compartir
    redondearCantidad,
    recalcularReceta,
    generarTextoReceta,
    compartirRecetaWhatsApp,
    compartirRecetaMessenger,
    compartirRecetaEmail,
    copiarRecetaAlPortapapeles,
    // 🆕 v4: Helper
    getNombreNegocioRecetas
};

console.log('📦 Recipes Module v2.0.5 (FASE 1.3.2: UUID en recipes, recipe_ingredients y receta_insumos)');