// ============================================================
// 📦 UI ORDERS - Panario (Interfaz de Pedidos completa)
// Con: Reserva por período, lista de espera, filtros mejorados,
// corriente, sesión y reporte parametrizable
// CORREGIDO: Eliminado botón de Deudas (solo en Ventas)
// CORREGIDO FASE 2 (160926): Añadido botón "No, cancelar" en el
//   modal de procesamiento de lista de espera (Problema #12)
// CORREGIDO (160926 v3): Edición de pedido detecta si el usuario
//   cambió el nombre del cliente manualmente
// CORREGIDO FASE 4A (170926): 
//   - showOrderForm() y viewOrder() cierran TODOS los modales antes de abrirse
//   - Botones de cerrar modales con timeout de seguridad
//   - "Ver → Editar" cierra el modal de vista antes de abrir el de edición
//   - updateOrderStatusAndReload() cierra todos los modales antes del confirm
// CORREGIDO FASE A.2 (170926 v2):
//   - Modales de ui-orders usan z-index 9999999998
// AÑADIDO FASE A.4 (170926 v3):
//   - viewOrder() muestra sección de Auditoría
// AÑADIDO FASE 1.2 (190926 v3):
//   - updateOrderStatusAndReload() REFACTORIZADA
//   - Nueva función mostrarAlertaStockWarning()
// CORREGIDO FASE 2.1 FIX (200926):
//   - updateOrderTotal() DEFINIDA GLOBALMENTE al principio
// 🆕 FIX 2 (190926 v4):
//   - normalizarFechaVenta() helper (fallback defensivo)
// 🆕 FASE 2.2 (200926 v5):
//   - NUEVO: Botón "⏰ Lista de espera" en el header
//   - NUEVA: showWaitingListManagerModal()
// 🆕 FASE 7 (Entrega 5 - 200926 v7):
//   - NUEVO: Validación de cantidad de producción al crear pedidos
// 🆕 FASE 7.3 (210926 v9): MOSTRAR PRODUCCIÓN + BLOQUEO DEFINITIVO
//   - renderProduccionInfoHTML() ahora se invoca SIEMPRE en loadOrders()
// 🆕 v2.1.12 (210926 v10): CORRECCIÓN #2 - BLOQUEO POR RECETAS NO COMPARTIDAS
//   - loadOrders(): Verifica permisos y muestra badge "🔒 Solo lectura"
//   - viewOrder(): Muestra detalle en modo solo-lectura cuando está bloqueado
//   - showOrderForm(): Bloquea si el pedido está en modo solo-lectura
//   - updateOrderStatusAndReload(): Verifica permisos ANTES del confirm
//   - renderWaitingManagerContent(): Filtra pedidos bloqueados
// 🆕 v2.1.13 (210926 v11): CORRECCIÓN #4 - EXCLUIR DÍAS DE LA SEMANA
//   - ✅ showMultiOrderForm(): nueva sección "🚫 Excluir días"
//   - ✅ Nuevo campo en el estado: `_multiOrderState.patron.diasExcluidos = []`
//   - ✅ Nuevas funciones globales: selectDiasExcluidos, limpiarDiasExcluidos,
//     updateExclusionSummary
// 🆕 CORRECCIÓN #6 (211026 v12): PRODUCCIÓN DEL DÍA ANTERIOR
//   - ✅ getProduccionInfo() detecta si el bloque guardado es del día anterior
//   - ✅ renderProduccionInfoHTML() muestra badge "🌙 Prod. ayer"
//   - ✅ onOrderDateChange() muestra aviso cuando la producción es del día anterior
//   - ✅ viewOrder() muestra correctamente el bloque del día anterior
// 🆕 v2.2.1 (230926 v13): FIX FECHA REAL EN BLOQUE DEL DÍA ANTERIOR
//   - ✅ getProduccionInfo(): SIEMPRE usa formato
//     `DD/MM de HH:MM a HH:MM` para el texto del bloque
//   - ✅ El texto del badge morado ahora es:
//     * Día actual:  `🔨 Producción: 23/09 de 2:00 AM a 5:00 AM`
//     * Día anterior: `🌙 Prod. ayer: 23/09 de 5:00 PM a 8:00 PM`
//   - ✅ Mismo formato en `viewOrder()` y `onOrderDateChange()`
// 🆕 v2.2.2 (230926 v14): CORRECCIÓN #9 - CONTEO PEDIDOS VS VENTAS
//   - ✅ getProduccionInfo() ahora DELEGA en
//     window.DBModule.contarPedidosYVentasFecha() para el conteo de
//     pedidos y ventas directas. Solo usa fallback local si DBModule
//     no está disponible.
// 🆕 v2.2.4 (230926 v15): CORRECCIÓN #3 - CLIC EN BADGE DE PRODUCCIÓN
//   - ✅ NUEVO: El badge morado de producción en la tarjeta de fecha
//     ahora es CLICKEABLE. Al hacer clic sobre él, se abre el modal
//     de configuración de producción (showHorarioDetalle) para ese día.
//   - ✅ Se aplica event.stopPropagation() para evitar que el clic
//     expanda/colapse la tarjeta del día.
//   - ✅ Se añade cursor: pointer, título explicativo y efecto hover
//     visual para indicar que es clickeable.
//   - ✅ Funciona tanto en desktop como en móvil (touch).
// 🆕 v2.2.6 (240926 v16): CORRECCIÓN #17 - BOTÓN "ENTREGAR (SIN DEUDA)"
//   - ✅ NUEVO: viewOrder() ahora muestra DOS botones de entrega:
//     * ✅ "Entregar (sin deuda)" → crea venta con is_debt = 0, paid = 1
//     * 🚚 "Entregar (con deuda)" → crea venta con is_debt = 1, paid = 0
//   - ✅ NUEVO: updateOrderStatusAndReload() acepta un tercer parámetro
//     `sinDeuda` (boolean) que se propaga a OrdersModule.updateOrderStatus().
//   - ✅ NUEVO: Los botones se muestran en un contenedor visual destacado
//     con bordes de colores diferenciados:
//     * Verde oscuro para "Entregar (sin deuda)"
//     * Amarillo/naranja para "Entregar (con deuda)"
//   - ✅ El comportamiento previo se mantiene: si el pedido tiene pago
//     adelantado completo, no se crea deuda por defecto.
//   - ✅ Si el usuario elige "Entregar (sin deuda)" con un pedido que
//     tenía saldo pendiente, se ignora el saldo y se marca como pagado.
//   - ✅ Compatibilidad total con versiones anteriores.
// 🆕 v2.2.7 (240926 v17): CORRECCIÓN #19 - FILTROS AL HACER CLIC EN TARJETAS
//   - ✅ renderOrdersView() ahora lee window._pendingOrderFilters y
//     aplica los filtros a los inputs (fechas, estado, búsqueda).
//   - ✅ Se limpia window._pendingOrderFilters después de aplicarlo.
//   - ✅ Compatible con navigateWithFilters() de app.js v2.2.3+.
// ============================================================

// ============================================================
// FIX 2: NORMALIZACIÓN DE FECHAS (fallback defensivo)
// ============================================================

if (typeof window.normalizarFechaVenta !== 'function') {
    window.normalizarFechaVenta = function(fechaInput) {
        if (!fechaInput) {
            return new Date().toISOString();
        }
        if (typeof fechaInput === 'string' && fechaInput.includes('T')) {
            return fechaInput;
        }
        const fechaStr = String(fechaInput).trim();
        const match = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) {
            console.warn('⚠️ [normalizarFechaVenta] Formato no reconocido:', fechaInput);
            return new Date().toISOString();
        }
        const hoyStr = new Date().toISOString().split('T')[0];
        if (fechaStr === hoyStr) {
            return new Date().toISOString();
        }
        return `${fechaStr}T12:00:00.000Z`;
    };
}

// ============================================================
// CONSTANTE DE Z-INDEX PARA MODALES DE PEDIDOS
// ============================================================

const ORDERS_MODAL_Z_INDEX = 9999999998;

// ============================================================
// HELPERS DE BLOQUEO (Corrección #2)
// ============================================================

function checkOrderPermission(orderIdOrObject) {
    try {
        if (typeof window.OrdersModule?.puedeUsuarioActualProcesarPedido === 'function') {
            return window.OrdersModule.puedeUsuarioActualProcesarPedido(orderIdOrObject);
        }
        return { puede: true, razon: '', recetasBloqueadas: [] };
    } catch (e) {
        console.warn('⚠️ Error verificando permisos:', e);
        return { puede: true, razon: '', recetasBloqueadas: [] };
    }
}

function renderBadgeSoloLectura() {
    return `<span style="font-size: 10px; background: #94a3b820; color: #94a3b8; padding: 2px 8px; border-radius: 10px; font-weight: 600; border: 1px solid #94a3b8;">🔒 Solo lectura</span>`;
}

function aplicarBloqueoVisual(bloqueado) {
    if (bloqueado) {
        return { borderColor: '#94a3b8', opacity: 0.75, cursor: 'not-allowed' };
    }
    return { borderColor: null, opacity: 1, cursor: 'pointer' };
}

window.checkOrderPermission = checkOrderPermission;
window.renderBadgeSoloLectura = renderBadgeSoloLectura;
window.aplicarBloqueoVisual = aplicarBloqueoVisual;

// ============================================================
// DEFINICIÓN GLOBAL DE updateOrderTotal
// ============================================================

window.updateOrderTotal = function() {
    try {
        const items = document.querySelectorAll('.order-item');
        let total = 0;
        items.forEach(item => {
            const qty = parseFloat(item.querySelector('.item-quantity')?.value) || 0;
            const price = parseFloat(item.querySelector('.item-price')?.value) || 0;
            total += qty * price;
        });
        const display = document.getElementById('order-total-display');
        if (display) display.textContent = total.toFixed(2);
    } catch (e) {
        console.warn('⚠️ [updateOrderTotal] Error:', e.message);
    }
};

// ============================================================
// 🆕 v2.2.1: HELPER PARA OBTENER INFO DE PRODUCCIÓN
// (con soporte para bloque del día anterior Y formato de fecha consistente)
// ============================================================
// 
// CAMBIO v2.2.1: El texto del bloque SIEMPRE usa el formato
// `DD/MM de HH:MM a HH:MM`, sin importar si es del día actual o anterior.
// 
// Ejemplos:
//   Día actual:  "23/09 de 2:00 AM a 5:00 AM"
//   Día anterior: "23/09 de 5:00 PM a 8:00 PM" (con fecha real del bloque)

function getProduccionInfo(fechaISO) {
    // 🆕 CORRECCIÓN #9: Delegar en DBModule si está disponible
    try {
        if (window.DBModule && typeof window.DBModule.contarPedidosYVentasFecha === 'function') {
            const conteo = window.DBModule.contarPedidosYVentasFecha(fechaISO);
            
            // Obtener la config de producción para el texto del bloque
            const config = getProduccionConfig(fechaISO);
            
            if (!config) {
                return { 
                    tieneProduccion: false, 
                    esBloqueDiaAnterior: false,
                    fechaBloqueReal: null,
                    bloqueTextoAyer: null,
                    ...conteo 
                };
            }
            
            const esBloqueDiaAnterior = config.es_bloque_dia_anterior === 1;
            const fechaBloqueReal = config.fecha_bloque_real || fechaISO;
            const fechaParaBloques = esBloqueDiaAnterior ? fechaBloqueReal : fechaISO;
            
            const bloques = window.CorrienteUtils 
                ? window.CorrienteUtils.getBloques(fechaParaBloques) 
                : [];
            
            let bloqueTexto = '';
            let bloqueTextoAyer = null;
            
            if (bloques && bloques.length >= config.bloque_index) {
                const bloque = bloques[config.bloque_index - 1];
                const fechaParaTexto = esBloqueDiaAnterior ? fechaBloqueReal : fechaISO;
                
                try {
                    const fechaObj = new Date(fechaParaTexto + 'T00:00:00');
                    const dia = String(fechaObj.getDate()).padStart(2, '0');
                    const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
                    
                    bloqueTexto = `${dia}/${mes} de ${bloque.inicioStr} a ${bloque.finStr}`;
                    
                    if (esBloqueDiaAnterior) {
                        bloqueTextoAyer = bloqueTexto;
                    }
                } catch (e) {
                    console.warn('⚠️ Error formateando texto de producción:', e);
                    bloqueTexto = `${bloque.inicioStr} - ${bloque.finStr}`;
                    if (esBloqueDiaAnterior) {
                        bloqueTextoAyer = bloqueTexto;
                    }
                }
            }
            
            return {
                tieneProduccion: true,
                bloqueTexto,
                cantidadProduccion: parseFloat(config.cantidad_produccion) || 0,
                notas: config.notas,
                esBloqueDiaAnterior,
                fechaBloqueReal,
                bloqueTextoAyer,
                ...conteo
            };
        }
    } catch (e) {
        console.warn('⚠️ [ui-orders] Error delegando en DBModule.contarPedidosYVentasFecha:', e);
    }
    
    // ------------------------------------------------------------
    // FALLBACK LOCAL (solo si DBModule no está disponible)
    // 🆕 CORRECCIÓN #9: Se aplica la misma lógica que en DBModule
    // ------------------------------------------------------------
    try {
        if (typeof window.getProduccionConfig !== 'function' || 
            typeof window.contarPedidosYVentasFecha !== 'function') {
            return { 
                tieneProduccion: false, 
                pedidos: 0, 
                ventas: 0, 
                disponibles: 0, 
                cantidadProduccion: 0,
                esBloqueDiaAnterior: false,
                fechaBloqueReal: null,
                bloqueTextoAyer: null
            };
        }
        
        const config = window.getProduccionConfig(fechaISO);
        const conteo = window.contarPedidosYVentasFecha(fechaISO);
        
        if (!config) {
            return { 
                tieneProduccion: false, 
                esBloqueDiaAnterior: false,
                fechaBloqueReal: null,
                bloqueTextoAyer: null,
                ...conteo 
            };
        }
        
        const esBloqueDiaAnterior = config.es_bloque_dia_anterior === 1;
        const fechaBloqueReal = config.fecha_bloque_real || fechaISO;
        const fechaParaBloques = esBloqueDiaAnterior ? fechaBloqueReal : fechaISO;
        
        const bloques = window.CorrienteUtils 
            ? window.CorrienteUtils.getBloques(fechaParaBloques) 
            : [];
        
        let bloqueTexto = '';
        let bloqueTextoAyer = null;
        
        if (bloques && bloques.length >= config.bloque_index) {
            const bloque = bloques[config.bloque_index - 1];
            const fechaParaTexto = esBloqueDiaAnterior ? fechaBloqueReal : fechaISO;
            
            try {
                const fechaObj = new Date(fechaParaTexto + 'T00:00:00');
                const dia = String(fechaObj.getDate()).padStart(2, '0');
                const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
                
                bloqueTexto = `${dia}/${mes} de ${bloque.inicioStr} a ${bloque.finStr}`;
                
                if (esBloqueDiaAnterior) {
                    bloqueTextoAyer = bloqueTexto;
                }
            } catch (e) {
                console.warn('⚠️ Error formateando texto de producción:', e);
                bloqueTexto = `${bloque.inicioStr} - ${bloque.finStr}`;
                if (esBloqueDiaAnterior) {
                    bloqueTextoAyer = bloqueTexto;
                }
            }
        }
        
        return {
            tieneProduccion: true,
            bloqueTexto,
            cantidadProduccion: parseFloat(config.cantidad_produccion) || 0,
            notas: config.notas,
            esBloqueDiaAnterior,
            fechaBloqueReal,
            bloqueTextoAyer,
            ...conteo
        };
    } catch (e) {
        console.warn('⚠️ Error en fallback local de getProduccionInfo:', e);
        return { 
            tieneProduccion: false, 
            pedidos: 0, 
            ventas: 0, 
            disponibles: 0, 
            cantidadProduccion: 0,
            esBloqueDiaAnterior: false,
            fechaBloqueReal: null,
            bloqueTextoAyer: null
        };
    }
}

window.getProduccionInfo = getProduccionInfo;

// ============================================================
// FORMATEO DE CANTIDAD (fallback defensivo)
// ============================================================

if (typeof window.formatearCantidadProduccion !== 'function') {
    window.formatearCantidadProduccion = function(cantidad) {
        if (cantidad === null || cantidad === undefined) return '—';
        const num = parseFloat(cantidad);
        if (isNaN(num)) return '—';
        if (num === Math.floor(num)) return String(Math.floor(num));
        return num.toFixed(2).replace(/\.?0+$/, '');
    };
}

// ============================================================
// HELPER: Espera a que un modal se elimine del DOM
// ============================================================

function waitForModalRemoval(modalId, timeoutMs = 600) {
    return new Promise((resolve) => {
        const start = Date.now();
        const check = () => {
            const el = document.getElementById(modalId);
            if (!el || !el.parentNode) {
                resolve(true);
                return;
            }
            if (Date.now() - start > timeoutMs) {
                if (el.parentNode) el.remove();
                resolve(false);
                return;
            }
            setTimeout(check, 30);
        };
        check();
    });
}

// ============================================================
// HELPER DE AUDITORÍA
// ============================================================

function renderAuditoriaHTML(entity) {
    if (!entity) return '';
    
    const createdBy = entity.created_by || entity.user_id;
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

// ============================================================
// MODAL DE ADVERTENCIA POR FALLO DE STOCK
// ============================================================

async function mostrarAlertaStockWarning(orderId, stockWarning) {
    try {
        await window.ModalModule.showAlert({
            title: '⚠️ Entregado con advertencia',
            message: `El pedido #${orderId} se entregó correctamente y la venta se creó.\n\n` +
                     `⚠️ Sin embargo, hubo un problema al descontar el stock:\n\n` +
                     `"${stockWarning}"\n\n` +
                     `💡 Esto puede deberse a que las recetas o insumos asociados al producto no existen en este dispositivo, o a que las cantidades de stock no eran suficientes.\n\n` +
                     `✅ La venta ya está registrada y el pedido está entregado.\n` +
                     `📦 Revisa manualmente el stock de insumos si es necesario.`,
            icon: '⚠️',
            type: 'warning',
            buttonText: '✅ Entendido'
        });
    } catch (e) {
        console.warn('⚠️ Error mostrando alerta de stockWarning:', e);
        if (window.showToast) {
            window.showToast(`⚠️ Pedido #${orderId} entregado con advertencia de stock`, 'warning', 6000);
        }
    }
}

// ============================================================
// MODAL DE GESTIÓN DE LISTA DE ESPERA
// ============================================================

async function showWaitingListManagerModal() {
    const existingModal = document.getElementById('waiting-manager-modal');
    if (existingModal) existingModal.remove();
    
    if (!window.OrdersModule) {
        window.showToast('❌ Módulo de pedidos no disponible', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'waiting-manager-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: ${ORDERS_MODAL_Z_INDEX + 10}; padding: 15px;
    `;
    
    document.body.appendChild(modal);
    window._waitingManagerModal = modal;
    
    await renderWaitingManagerContent();
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeWaitingManagerModal();
    });
    
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeWaitingManagerModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

async function renderWaitingManagerContent() {
    const modal = document.getElementById('waiting-manager-modal');
    if (!modal) return;
    
    try {
        const listaCompleta = await window.OrdersModule.getWaitingListWithDetails();
        
        const lista = listaCompleta.filter(item => {
            const permisos = checkOrderPermission(item.order_id);
            return permisos.puede;
        });
        
        const bloqueados = listaCompleta.length - lista.length;
        
        const totalItems = lista.length;
        const totalCantidad = lista.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const totalMonto = lista.reduce((sum, item) => sum + (item.order_total || 0), 0);
        
        let listaHtml = '';
        
        if (lista.length === 0) {
            let mensajeBloqueados = '';
            if (bloqueados > 0) {
                mensajeBloqueados = `<p style="font-size: 12px; color: #94a3b8; margin-top: 8px;">🔒 ${bloqueados} pedido(s) ocultos por permisos de recetas no compartidas</p>`;
            }
            listaHtml = `
                <div style="text-align: center; padding: 40px 20px; color: var(--text-light);">
                    <span style="font-size: 56px;">🎉</span>
                    <p style="margin-top: 12px; font-size: 15px; font-weight: 600;">No hay clientes en espera</p>
                    <p style="font-size: 13px;">La lista está vacía o no tienes permisos</p>
                    ${mensajeBloqueados}
                </div>
            `;
        } else {
            listaHtml = lista.map(item => {
                const cantidad = item.quantity || 0;
                const total = item.order_total || 0;
                const fechaEntrega = item.delivery_date 
                    ? formatearFechaLarga(item.delivery_date.split('T')[0]) 
                    : '—';
                
                return `
                    <div class="waiting-item" data-order-id="${item.order_id}" 
                         style="display: flex; align-items: stretch; gap: 10px; padding: 12px; background: var(--bg); border-radius: 10px; border-left: 4px solid #f59e0b; margin-bottom: 8px;">
                        
                        <div style="background: #f59e0b; color: #fff; width: 44px; min-width: 44px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span style="font-size: 9px; opacity: 0.9;">POS</span>
                            <span style="font-weight: 700; font-size: 18px;">${item.position}</span>
                        </div>
                        
                        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px;">
                            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                <span style="font-weight: 700; font-size: 15px; color: var(--text);">👤 ${item.client_name || 'Cliente sin nombre'}</span>
                                ${item.client_phone ? `<span style="font-size: 12px; color: var(--text-light); background: var(--bg-card); padding: 2px 8px; border-radius: 6px;">📞 ${item.client_phone}</span>` : ''}
                            </div>
                            
                            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 13px;">
                                <span style="color: var(--text);">📦 <strong>${item.product_name || 'Producto'}</strong></span>
                                <span style="color: #3b82f6; background: #3b82f620; padding: 2px 8px; border-radius: 6px; font-weight: 600;">× ${cantidad}</span>
                                <span style="color: var(--primary); font-weight: 700; font-size: 15px;">$${total.toFixed(2)}</span>
                            </div>
                            
                            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 11px; color: var(--text-light);">
                                <span>📅 Entrega: <strong>${fechaEntrega}</strong></span>
                                ${item.notes ? `<span style="font-style: italic;">📝 ${item.notes}</span>` : ''}
                            </div>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 4px; justify-content: center; flex-shrink: 0; min-width: 90px;">
                            <button onclick="event.stopPropagation(); procesarClienteDeListaUI(${item.order_id})" 
                                    class="btn" 
                                    style="padding: 6px 10px; font-size: 11px; width: 100%; background: #10b981; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"
                                    title="Convertir en venta">
                                ✅ Procesar
                            </button>
                            <button onclick="event.stopPropagation(); cancelarClienteDeListaUI(${item.order_id}, '${(item.client_name || '').replace(/'/g, "\\'")}')" 
                                    class="btn" 
                                    style="padding: 6px 10px; font-size: 11px; width: 100%; background: #ef4444; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"
                                    title="Cancelar pedido (sin venta)">
                                ❌ Cancelar
                            </button>
                            <button onclick="event.stopPropagation(); eliminarClienteDeListaUI(${item.order_id}, '${(item.client_name || '').replace(/'/g, "\\'")}')" 
                                    class="btn secondary" 
                                    style="padding: 4px 10px; font-size: 11px; width: 100%; color: #94a3b8; border-color: #94a3b8;"
                                    title="Quitar de la lista (el pedido vuelve a pendiente)">
                                🗑️ Quitar
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 20px; max-width: 800px; width: 100%; max-height: 92vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 1px solid var(--border-color);">
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 2px solid #f59e0b; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 28px;">⏰</span>
                        <div>
                            <h2 style="margin: 0; font-size: 18px; color: #f59e0b;">Gestión de Lista de Espera</h2>
                            <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-light);">Administra los clientes en cola</p>
                        </div>
                    </div>
                    <button onclick="closeWaitingManagerModal()" 
                            style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; margin-bottom: 14px;">
                    <div style="background: #f59e0b15; border-left: 3px solid #f59e0b; padding: 8px 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${totalItems}</div>
                        <div style="font-size: 11px; color: var(--text-light);">👥 Clientes</div>
                    </div>
                    <div style="background: #8b5cf615; border-left: 3px solid #8b5cf6; padding: 8px 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 20px; font-weight: 700; color: #8b5cf6;">${totalCantidad}</div>
                        <div style="font-size: 11px; color: var(--text-light);">📦 Unidades</div>
                    </div>
                    <div style="background: #10b98115; border-left: 3px solid #10b981; padding: 8px 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 20px; font-weight: 700; color: #10b981;">$${totalMonto.toFixed(2)}</div>
                        <div style="font-size: 11px; color: var(--text-light);">💰 Total</div>
                    </div>
                    ${bloqueados > 0 ? `
                    <div style="background: #94a3b815; border-left: 3px solid #94a3b8; padding: 8px 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 20px; font-weight: 700; color: #94a3b8;">${bloqueados}</div>
                        <div style="font-size: 11px; color: var(--text-light);">🔒 Bloqueados</div>
                    </div>
                    ` : ''}
                </div>
                
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
                    <button onclick="reporteListaEspera()" 
                            class="btn" 
                            style="padding: 6px 14px; font-size: 12px; width: auto; background: #3b82f6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        📄 Reporte PDF
                    </button>
                    ${totalItems > 0 ? `
                        <button onclick="limpiarListaEsperaUI()" 
                                class="btn" 
                                style="padding: 6px 14px; font-size: 12px; width: auto; background: #ef4444; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                            🧹 Limpiar lista (${totalItems})
                        </button>
                    ` : ''}
                    <button onclick="refrescarListaEsperaUI()" 
                            class="btn secondary" 
                            style="padding: 6px 14px; font-size: 12px; width: auto; margin-left: auto;">
                        🔄 Refrescar
                    </button>
                </div>
                
                <div style="background: #fef9e7; border: 1px solid #f59e0b; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; font-size: 12px; color: #92400e;">
                    💡 <strong>Procesar</strong> → crea la venta · <strong>Cancelar</strong> → cancela el pedido · <strong>Quitar</strong> → solo quita de la lista
                    ${bloqueados > 0 ? `<br>🔒 <strong>${bloqueados} pedido(s) oculto(s)</strong> por usar recetas no compartidas contigo.` : ''}
                </div>
                
                <div id="waiting-manager-list" style="flex: 1; overflow-y: auto; max-height: 500px; padding-right: 4px;">
                    ${listaHtml}
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: 8px; padding-top: 12px; margin-top: 12px; border-top: 1px solid var(--border-color);">
                    <button onclick="closeWaitingManagerModal()" 
                            class="btn secondary" 
                            style="padding: 10px 20px; font-size: 14px; width: auto;">
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('❌ Error renderizando modal de lista de espera:', error);
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 500px; width: 100%; text-align: center;">
                <span style="font-size: 48px;">❌</span>
                <h2 style="margin: 12px 0 8px;">Error</h2>
                <p style="color: var(--text-light); font-size: 13px;">${error.message}</p>
                <button onclick="closeWaitingManagerModal()" class="btn secondary" style="margin-top: 12px; padding: 8px 20px; width: auto;">
                    Cerrar
                </button>
            </div>
        `;
    }
}

function closeWaitingManagerModal() {
    const modal = document.getElementById('waiting-manager-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
        setTimeout(() => {
            const still = document.getElementById('waiting-manager-modal');
            if (still && still.parentNode) still.remove();
        }, 500);
    }
    window._waitingManagerModal = null;
}

async function refrescarListaEsperaUI() {
    const modal = document.getElementById('waiting-manager-modal');
    if (!modal) return;
    
    const lista = document.getElementById('waiting-manager-list');
    if (lista) {
        lista.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <span style="font-size: 32px;">⏳</span>
                <p style="color: var(--text-light); font-size: 13px;">Refrescando...</p>
            </div>
        `;
    }
    
    await renderWaitingManagerContent();
    window.showToast('🔄 Lista actualizada', 'success', 1500);
}

async function procesarClienteDeListaUI(orderId) {
    if (!orderId) return;
    
    const permisos = checkOrderPermission(orderId);
    if (!permisos.puede) {
        window.showToast('🔒 ' + permisos.razon, 'error', 5000);
        return;
    }
    
    const confirm = await window.ModalModule.showConfirm({
        title: '✅ Procesar cliente',
        message: `¿Procesar al cliente de la posición #${orderId}?\n\n✅ Se creará la VENTA automáticamente.\n✅ Se descontará del stock.\n✅ El cliente saldrá de la lista.`,
        confirmText: '✅ SÍ, PROCESAR',
        cancelText: '❌ Cancelar',
        icon: '✅',
        confirmColor: '#10b981'
    });
    
    if (!confirm) return;
    
    try {
        window.showToast('⏳ Procesando cliente...', 'info', 2000);
        
        const result = await window.OrdersModule.procesarClienteDeLista(orderId);
        
        if (result.success) {
            const msg = `✅ Venta creada: ${result.ventas} item(s) por $${(result.total || 0).toFixed(2)}`;
            window.showToast(msg, 'success', 4000);
            
            await refrescarListaEsperaUI();
            
            if (typeof loadOrders === 'function') {
                try { await loadOrders(); } catch (e) {}
            }
            
            if (typeof window.loadDashboardData === 'function') {
                setTimeout(window.loadDashboardData, 500);
            }
        } else {
            window.showToast('❌ Error: ' + (result.error || 'Desconocido'), 'error', 6000);
        }
    } catch (error) {
        console.error('❌ Error procesando cliente:', error);
        window.showToast('❌ Error: ' + error.message, 'error', 6000);
    }
}

async function cancelarClienteDeListaUI(orderId, clientName) {
    if (!orderId) return;
    
    const permisos = checkOrderPermission(orderId);
    if (!permisos.puede) {
        window.showToast('🔒 ' + permisos.razon, 'error', 5000);
        return;
    }
    
    const nombre = clientName || 'Cliente';
    
    const confirm = await window.ModalModule.showConfirm({
        title: '❌ Cancelar pedido',
        message: `¿Cancelar el pedido de "${nombre}"?\n\n⚠️ NO se creará venta.\n⚠️ Se repondrá el stock si estaba descontado.\n⚠️ El cliente saldrá de la lista.`,
        confirmText: '❌ SÍ, CANCELAR',
        cancelText: 'Volver',
        icon: '❌',
        confirmColor: '#ef4444'
    });
    
    if (!confirm) return;
    
    const motivo = await window.ModalModule.showPrompt({
        title: '📝 Motivo de cancelación',
        message: 'Ingresa el motivo (opcional):',
        placeholder: 'Ej: Cliente no se presentó',
        icon: '📝',
        defaultValue: 'Cancelado desde lista de espera'
    });
    
    if (motivo === null || motivo === undefined) {
        window.showToast('❌ Operación cancelada', 'info', 2000);
        return;
    }
    
    try {
        window.showToast('⏳ Cancelando pedido...', 'info', 2000);
        
        const result = await window.OrdersModule.cancelarPedidoDesdeLista(orderId, motivo || 'Cancelado desde lista de espera', '');
        
        if (result.success) {
            window.showToast('✅ Pedido cancelado', 'success', 3000);
            
            await refrescarListaEsperaUI();
            
            if (typeof loadOrders === 'function') {
                try { await loadOrders(); } catch (e) {}
            }
            
            if (typeof window.loadDashboardData === 'function') {
                setTimeout(window.loadDashboardData, 500);
            }
        } else {
            window.showToast('❌ Error: ' + (result.error || 'Desconocido'), 'error', 6000);
        }
    } catch (error) {
        console.error('❌ Error cancelando pedido:', error);
        window.showToast('❌ Error: ' + error.message, 'error', 6000);
    }
}

async function eliminarClienteDeListaUI(orderId, clientName) {
    if (!orderId) return;
    
    const permisos = checkOrderPermission(orderId);
    if (!permisos.puede) {
        window.showToast('🔒 ' + permisos.razon, 'error', 5000);
        return;
    }
    
    const nombre = clientName || 'Cliente';
    
    const confirm = await window.ModalModule.showConfirm({
        title: '🗑️ Quitar de la lista',
        message: `¿Quitar a "${nombre}" de la lista de espera?\n\n📋 El pedido volverá a estado PENDIENTE.\n✅ NO se cancela el pedido.\n✅ NO se repone stock.`,
        confirmText: '🗑️ SÍ, QUITAR',
        cancelText: 'Volver',
        icon: '🗑️',
        confirmColor: '#94a3b8'
    });
    
    if (!confirm) return;
    
    try {
        window.showToast('⏳ Quitando de la lista...', 'info', 2000);
        
        const result = await window.OrdersModule.eliminarDeListaEspera(orderId);
        
        if (result.success) {
            window.showToast('✅ Cliente quitado de la lista', 'success', 3000);
            
            // 🆕 CORRECCIÓN #13: Refrescar SIEMPRE el badge tras quitar de la lista
            if (window.OrdersModule.getWaitingListCount) {
                try {
                    const count = await window.OrdersModule.getWaitingListCount();
                    updateWaitingBadge(count);
                    console.log(`🔄 [eliminarClienteDeListaUI] Badge actualizado: ${count} en lista de espera`);
                } catch (e) {
                    console.warn('⚠️ Error actualizando badge:', e);
                }
            }
            
            await refrescarListaEsperaUI();
            
            if (typeof loadOrders === 'function') {
                try { await loadOrders(); } catch (e) {}
            }
            
            if (typeof window.loadDashboardData === 'function') {
                setTimeout(window.loadDashboardData, 500);
            }
        } else {
            window.showToast('❌ Error: ' + (result.error || 'Desconocido'), 'error', 6000);
        }
    } catch (error) {
        console.error('❌ Error quitando de la lista:', error);
        window.showToast('❌ Error: ' + error.message, 'error', 6000);
    }
}

async function limpiarListaEsperaUI() {
    const confirm1 = await window.ModalModule.showConfirm({
        title: '⚠️ Limpiar lista de espera',
        message: `¿Estás seguro de que quieres LIMPIAR TODA la lista de espera?\n\n⚠️ Se cancelarán TODOS los pedidos en espera a los que tengas acceso.\n⚠️ NO se crearán ventas.\n⚠️ Se repondrá el stock.\n\n⚠️ Esta acción no se puede deshacer.`,
        confirmText: '⚠️ CONTINUAR',
        cancelText: '❌ Cancelar',
        icon: '⚠️',
        confirmColor: '#ef4444'
    });
    
    if (!confirm1) return;
    
    const confirm2 = await window.ModalModule.showConfirm({
        title: '🚨 CONFIRMACIÓN FINAL',
        message: `Esta es la ÚLTIMA advertencia.\n\nEscribe mentalmente: "SÍ, QUIERO LIMPIAR LA LISTA"\n\n¿Confirmas?`,
        confirmText: '🧹 SÍ, LIMPIAR TODO',
        cancelText: '❌ NO, cancelar',
        icon: '🚨',
        confirmColor: '#dc2626'
    });
    
    if (!confirm2) {
        window.showToast('❌ Operación cancelada', 'info', 2000);
        return;
    }
    
    try {
        window.showToast('⏳ Limpiando lista de espera...', 'info', 3000);
        
        const result = await window.OrdersModule.limpiarListaEspera();
        
        if (result.success) {
            let msg = `✅ Lista limpiada: ${result.eliminados} eliminados, ${result.cancelados} cancelados`;
            if (result.bloqueados > 0) msg += `, ${result.bloqueados} omitidos por permisos`;
            window.showToast(msg, 'success', 5000);
            
            await refrescarListaEsperaUI();
            
            if (typeof loadOrders === 'function') {
                try { await loadOrders(); } catch (e) {}
            }
            
            if (typeof window.loadDashboardData === 'function') {
                setTimeout(window.loadDashboardData, 500);
            }
        } else {
            window.showToast('❌ Error: ' + (result.error || 'Desconocido'), 'error', 6000);
        }
    } catch (error) {
        console.error('❌ Error limpiando lista:', error);
        window.showToast('❌ Error: ' + error.message, 'error', 6000);
    }
}

async function reporteListaEspera() {
    try {
        if (!window.ReportsModule || typeof window.ReportsModule.generateWaitingListReport !== 'function') {
            window.showToast('⚠️ Reporte de lista de espera no disponible aún', 'warning', 4000);
            return;
        }
        
        window.showToast('⏳ Generando reporte...', 'info', 2000);
        
        const html = await window.ReportsModule.generateWaitingListReport();
        
        if (html) {
            window.ReportsModule.printReport(html);
            window.showToast('✅ Reporte generado', 'success', 3000);
        } else {
            window.showToast('⚠️ No hay datos para el reporte', 'warning', 3000);
        }
    } catch (error) {
        console.error('❌ Error generando reporte:', error);
        window.showToast('❌ Error: ' + error.message, 'error', 5000);
    }
}

// ============================================================
// 🆕 v2.2.4: RENDER INFO DE PRODUCCIÓN EN TARJETA DE FECHA
// (con badge CLICKEABLE - Corrección #3)
// ============================================================

function renderProduccionInfoHTML(fechaISO) {
    try {
        const info = getProduccionInfo(fechaISO);
        
        if (!info.tieneProduccion) return '';
        
        const disponibles = info.disponibles;
        const cantidadProd = info.cantidadProduccion;
        const pedidos = info.pedidos;
        const ventas = info.ventas;
        const esAyer = info.esBloqueDiaAnterior === true;
        
        const fmt = window.formatearCantidadProduccion || (v => String(v));
        
        let colorDisponible = '#10b981';
        let bgDisponible = '#10b98115';
        if (disponibles === 0) {
            colorDisponible = '#ef4444';
            bgDisponible = '#ef444415';
        } else if (disponibles <= 3) {
            colorDisponible = '#f59e0b';
            bgDisponible = '#f59e0b15';
        }
        
        // ============================================================
        // 🆕 v2.2.4: Badge CLICKEABLE (Corrección #3)
        // Al hacer clic, se abre el modal de configuración de producción
        // para el día correspondiente (showHorarioDetalle)
        // ============================================================
        const badgeBloqueHoy = esAyer
            ? `<span onclick="event.stopPropagation(); if(window.showHorarioDetalle) window.showHorarioDetalle('${fechaISO}');" 
                     style="background: #8b5cf615; color: #8b5cf6; padding: 3px 10px; border-radius: 6px; font-weight: 600; border: 1px dashed #8b5cf6; cursor: pointer; transition: all 0.2s;" 
                     onmouseover="this.style.background='#8b5cf630'; this.style.transform='scale(1.02)';" 
                     onmouseout="this.style.background='#8b5cf615'; this.style.transform='scale(1)';"
                     title="Clic para configurar la producción del día">
                  🌙 Prod. ayer: ${info.bloqueTexto}
               </span>`
            : `<span onclick="event.stopPropagation(); if(window.showHorarioDetalle) window.showHorarioDetalle('${fechaISO}');" 
                     style="background: #8b5cf615; color: #8b5cf6; padding: 3px 10px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s;" 
                     onmouseover="this.style.background='#8b5cf630'; this.style.transform='scale(1.02)';" 
                     onmouseout="this.style.background='#8b5cf615'; this.style.transform='scale(1)';"
                     title="Clic para configurar la producción del día">
                  🔨 Producción: ${info.bloqueTexto}
               </span>`;
        
        return `
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border-color); font-size: 11px;">
                ${badgeBloqueHoy}
                <span style="background: ${bgDisponible}; color: ${colorDisponible}; padding: 3px 10px; border-radius: 6px; font-weight: 600;">
                    📋 Pedidos: ${pedidos}/${fmt(cantidadProd)}
                </span>
                ${ventas > 0 ? `
                    <span style="background: #3b82f615; color: #3b82f6; padding: 3px 10px; border-radius: 6px;">
                        💰 Ventas directas: ${ventas}
                    </span>
                ` : ''}
                ${disponibles === 0 ? `
                    <span style="background: #ef444420; color: #ef4444; padding: 3px 10px; border-radius: 6px; font-weight: 700;">
                        ⛔ COMPLETO
                    </span>
                ` : `
                    <span style="background: #10b98115; color: #10b981; padding: 3px 10px; border-radius: 6px;">
                        ✅ ${fmt(disponibles)} disponibles
                    </span>
                `}
            </div>
        `;
    } catch (e) {
        console.warn('⚠️ Error renderizando info de producción:', e);
        return '';
    }
}

window.renderProduccionInfoHTML = renderProduccionInfoHTML;

// ============================================================
// RENDER ORDERS VIEW
// 🆕 v2.2.7: Lee window._pendingOrderFilters (Corrección #19)
// ============================================================

function renderOrdersView() {
    const main = document.getElementById('mainContent');
    
    // ============================================================
    // 🆕 v2.2.7: Leer filtros pendientes (Corrección #19)
    // ============================================================
    let filtros = window._pendingOrderFilters || {};
    window._pendingOrderFilters = null;
    
    console.log('📋 [renderOrdersView] Filtros pendientes:', filtros);
    
    let waitingCount = 0;
    if (window.OrdersModule && window.OrdersModule.getWaitingListCount) {
        window.OrdersModule.getWaitingListCount().then(count => {
            waitingCount = count;
            updateWaitingBadge(count);
        });
    }
    
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    
    // Aplicar filtros de fecha si vienen
    let fechaInicioMes = primerDiaMes.toISOString().split('T')[0];
    let fechaFinMes = ultimoDiaMes.toISOString().split('T')[0];
    
    if (filtros.from_date) fechaInicioMes = filtros.from_date;
    if (filtros.to_date) fechaFinMes = filtros.to_date;
    
    // Aplicar filtro de estado si viene
    let statusSeleccionado = filtros.status || 'pending';
    
    // Aplicar filtro de búsqueda si viene
    let searchValue = filtros.search || '';
    
    main.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
            <h2 style="margin: 0;">📋 Pedidos, Reservas y Lista de espera <span id="waiting-badge" style="font-size: 12px; background: #f59e0b; color: #fff; padding: 2px 10px; border-radius: 12px; display: none;">0</span></h2>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="showOrderForm()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                    ➕ Nuevo Pedido
                </button>
                <button onclick="showMultiOrderForm()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                    📅 Reserva por período
                </button>
                <button onclick="showWaitingListManagerModal()" class="btn primary" style="padding: 8px 16px; font-size: 14px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    ⏰ Lista de espera
                </button>
                <button onclick="showOrdersReportModal()" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                    📊 Reporte
                </button>
                <button onclick="window.navigate('dashboard')" class="btn secondary" style="padding: 8px 16px; font-size: 14px; width: auto;">
                    ← Regresar
                </button>
            </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; align-items: stretch; background: var(--bg-card); padding: 12px 16px; border-radius: var(--radius); border: 1px solid var(--border-color);">
            
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
                <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
                        <label style="font-weight: 600; font-size: 12px; color: var(--text-label);">📌 Estado:</label>
                        <select id="filter-status" onchange="loadOrders()" style="padding: 6px 10px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-card); color: var(--text); font-size: 13px;">
                            <option value="">📋 Todos</option>
                            <option value="pending" ${statusSeleccionado === 'pending' ? 'selected' : ''}>⏳ Pendiente</option>
                            <option value="confirmed" ${statusSeleccionado === 'confirmed' ? 'selected' : ''}>✅ Confirmado</option>
                            <option value="production" ${statusSeleccionado === 'production' ? 'selected' : ''}>🔨 En producción</option>
                            <option value="ready" ${statusSeleccionado === 'ready' ? 'selected' : ''}>📦 Listo</option>
                            <option value="delivered" ${statusSeleccionado === 'delivered' ? 'selected' : ''}>🚚 Entregado</option>
                            <option value="cancelled" ${statusSeleccionado === 'cancelled' ? 'selected' : ''}>❌ Cancelado</option>
                            <option value="waiting" ${statusSeleccionado === 'waiting' ? 'selected' : ''}>⏰ En lista de espera</option>
                            <option value="waiting_bought" ${statusSeleccionado === 'waiting_bought' ? 'selected' : ''}>🔄 Compro por lista de espera</option>
                        </select>
                    </div>
                </div>
                
                <label id="toggle-mes-orders" style="display: flex; align-items: center; gap: 10px; padding: 6px 14px; background: var(--primary-light); border-radius: 20px; border: 2px solid var(--primary); cursor: pointer; transition: all 0.2s; user-select: none;">
                    <input type="checkbox" id="filter-current-month" checked 
                           onchange="onCurrentMonthChange('orders')"
                           style="opacity: 0; width: 0; height: 0; position: absolute;">
                    <span id="toggle-mes-orders-slider" style="position: relative; display: inline-block; width: 36px; height: 20px; background: var(--primary); border-radius: 20px; transition: 0.3s; flex-shrink: 0;">
                        <span id="toggle-mes-orders-circle" style="position: absolute; height: 16px; width: 16px; left: 18px; bottom: 2px; background: white; border-radius: 50%; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
                    </span>
                    <span id="toggle-mes-orders-label" style="font-size: 12px; font-weight: 600; color: var(--primary); white-space: nowrap;">
                        📅 Solo mes en curso
                    </span>
                </label>
            </div>
            
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                <div style="display: flex; gap: 4px; align-items: center;">
                    <label style="font-weight: 600; font-size: 12px; color: var(--text-label);">📅 Desde:</label>
                    <input type="date" id="filter-date-from" value="${fechaInicioMes}" onchange="onOrdersDateChange()" 
                           style="padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-card); color: var(--text); font-size: 13px;">
                </div>
                <div style="display: flex; gap: 4px; align-items: center;">
                    <label style="font-weight: 600; font-size: 12px; color: var(--text-label);">📅 Hasta:</label>
                    <input type="date" id="filter-date-to" value="${fechaFinMes}" onchange="onOrdersDateChange()" 
                           style="padding: 6px 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-card); color: var(--text); font-size: 13px;">
                </div>
                
                <div style="display: flex; gap: 4px; align-items: center; flex: 1; min-width: 120px;">
                    <label style="font-weight: 600; font-size: 12px; color: var(--text-label);">🔍</label>
                    <input type="text" id="filter-search" placeholder="Buscar cliente..." 
                           value="${searchValue}"
                           style="flex: 1; padding: 6px 10px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-card); color: var(--text); font-size: 13px; min-width: 100px;"
                           oninput="loadOrders()">
                </div>
                
                <button onclick="clearOrderFilters()" class="btn secondary" style="padding: 4px 10px; font-size: 11px; width: auto;">
                    🗑️ Limpiar
                </button>
            </div>
        </div>
        
        <div id="orders-list">
            <div class="card" style="text-align: center; padding: 40px;">
                <span style="font-size: 32px;">⏳</span>
                <p>Cargando pedidos...</p>
            </div>
        </div>
    `;
    
    loadOrders();
    
    setTimeout(() => {
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.scrollTo({ top: 0, behavior: 'instant' });
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, 100);
    
    setTimeout(() => updateMesToggleVisual('orders'), 50);
}

// ============================================================
// ACTUALIZAR VISUAL DEL TOGGLE MES
// ============================================================

function updateMesToggleVisual(modulo) {
    const toggle = document.getElementById(`toggle-mes-${modulo}`);
    const checkbox = document.getElementById('filter-current-month');
    const slider = document.getElementById(`toggle-mes-${modulo}-slider`);
    const circle = document.getElementById(`toggle-mes-${modulo}-circle`);
    const label = document.getElementById(`toggle-mes-${modulo}-label`);
    
    if (!toggle || !checkbox || !slider || !circle || !label) return;
    
    if (checkbox.checked) {
        slider.style.background = 'var(--primary)';
        circle.style.left = '18px';
        label.style.color = 'var(--primary)';
        label.textContent = '📅 Solo mes en curso';
        toggle.style.background = 'var(--primary-light)';
        toggle.style.borderColor = 'var(--primary)';
    } else {
        slider.style.background = '#94a3b8';
        circle.style.left = '2px';
        label.style.color = '#94a3b8';
        label.textContent = '📅 Todos los meses';
        toggle.style.background = 'var(--bg)';
        toggle.style.borderColor = '#94a3b8';
    }
}

// ============================================================
// MANEJO DEL CHECKBOX MES EN CURSO
// ============================================================

function onCurrentMonthChange(modulo) {
    const checkbox = document.getElementById('filter-current-month');
    const fechaDesde = document.getElementById('filter-date-from');
    const fechaHasta = document.getElementById('filter-date-to');
    
    if (!checkbox || !fechaDesde || !fechaHasta) return;
    
    if (checkbox.checked) {
        const hoy = new Date();
        const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        fechaDesde.value = primerDia.toISOString().split('T')[0];
        fechaHasta.value = ultimoDia.toISOString().split('T')[0];
    }
    
    updateMesToggleVisual(modulo);
    
    if (modulo === 'orders') {
        loadOrders();
    } else if (modulo === 'sales') {
        loadSalesAndExpenses();
    }
}

function onOrdersDateChange() {
    const checkbox = document.getElementById('filter-current-month');
    if (checkbox) {
        checkbox.checked = false;
        updateMesToggleVisual('orders');
    }
    loadOrders();
}

// ============================================================
// UPDATE WAITING BADGE
// ============================================================

function updateWaitingBadge(count) {
    const badge = document.getElementById('waiting-badge');
    if (badge) {
        if (count > 0) {
            badge.style.display = 'inline-block';
            badge.textContent = count;
        } else {
            badge.style.display = 'none';
        }
    }
}

// ============================================================
// HELPERS DE CORRIENTE Y SESIÓN
// ============================================================

function getDiaSemanaLargo(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr.split('T')[0] + 'T00:00:00');
        const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        return dias[date.getDay()];
    } catch (e) { return ''; }
}

function formatearFechaLarga(dateStr) {
    if (!dateStr) return '—';
    try {
        const date = new Date(dateStr.split('T')[0] + 'T00:00:00');
        const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        return `${dias[date.getDay()]}, ${date.getDate()} ${meses[date.getMonth()]} ${date.getFullYear()}`;
    } catch (e) { return dateStr; }
}

function getBadgeCorriente(fechaISO) {
    if (!window.CorrienteUtils) return '';
    try {
        const resumen = window.CorrienteUtils.getResumen(fechaISO);
        if (!resumen.tieneCorriente) return '';
        return `<span style="font-size: 11px; color: #f59e0b; background: #f59e0b20; padding: 1px 8px; border-radius: 10px; margin-left: 6px; font-weight: 600;">⚡ ${resumen.numBloques}</span>`;
    } catch (e) { return ''; }
}

function getBloquesCorrienteHTML(fechaISO, opciones = {}) {
    if (!window.CorrienteUtils) return '';
    const { compacto = false } = opciones;
    
    try {
        const bloques = window.CorrienteUtils.getBloques(fechaISO);
        if (!bloques || bloques.length === 0) return '';
        
        if (compacto) {
            return bloques.map(b => {
                if (b.cruzaMedianoche) {
                    return `🟢 ${b.inicioStr} → ${b.finStr} (${window.CorrienteUtils.getDiaSemana(b.fin, true).toLowerCase()})`;
                }
                return `🟢 ${b.inicioStr} - ${b.finStr}`;
            }).join(' · ');
        }
        
        return bloques.map(b => {
            const texto = b.cruzaMedianoche
                ? `${b.inicioStr} → ${b.finStr} (${window.CorrienteUtils.getDiaSemana(b.fin, true).toLowerCase()})`
                : `${b.inicioStr} - ${b.finStr}`;
            return `<div style="display: inline-block; background: #f59e0b20; color: #f59e0b; padding: 2px 10px; border-radius: 10px; margin: 2px 4px 2px 0; font-size: 12px; font-weight: 600;">🟢 ${texto}</div>`;
        }).join('');
    } catch (e) { return ''; }
}

function getBannerCorrienteHTML(fechaISO) {
    if (!window.CorrienteUtils) return '';
    try {
        const resumen = window.CorrienteUtils.getResumen(fechaISO);
        if (!resumen.tieneCorriente) return '';
        
        const bloquesHTML = resumen.bloques.map(b => {
            const texto = b.cruzaMedianoche
                ? `${b.inicioStr} → ${b.finStr} (${window.CorrienteUtils.getDiaSemana(b.fin, true).toLowerCase()})`
                : `${b.inicioStr} - ${b.finStr}`;
            return `<span style="display: inline-block; background: #f59e0b30; color: #f59e0b; padding: 3px 12px; border-radius: 12px; margin: 3px 4px 3px 0; font-size: 13px; font-weight: 600;">🟢 ${texto}</span>`;
        }).join('');
        
        return `
            <div style="background: linear-gradient(135deg, #f59e0b15 0%, #f59e0b08 100%); border: 2px solid #f59e0b; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <span style="font-size: 20px;">⚡</span>
                    <span style="font-weight: 700; color: #f59e0b; font-size: 14px;">Corriente disponible este día</span>
                    <span style="margin-left: auto; font-size: 12px; color: var(--text-light); font-weight: 600;">${resumen.numBloques} bloque${resumen.numBloques > 1 ? 's' : ''} · ${resumen.totalHoras.toFixed(1)}h</span>
                </div>
                <div>${bloquesHTML}</div>
            </div>
        `;
    } catch (e) { return ''; }
}

function getSeccionCorrienteHTML(fechaISO) {
    if (!window.CorrienteUtils) return '';
    try {
        const resumen = window.CorrienteUtils.getResumen(fechaISO);
        if (!resumen.tieneCorriente) return '';
        
        const bloquesHTML = resumen.bloques.map(b => {
            const texto = b.cruzaMedianoche
                ? `${b.inicioStr} → ${b.finStr} (${window.CorrienteUtils.getDiaSemana(b.fin, true).toLowerCase()})`
                : `${b.inicioStr} - ${b.finStr}`;
            return `
                <div style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: #f59e0b10; border-radius: 6px; margin-bottom: 4px; border-left: 3px solid #f59e0b;">
                    <span style="font-size: 16px;">⚡</span>
                    <span style="font-size: 13px; font-weight: 600; color: #f59e0b;">${texto}</span>
                    ${b.cruzaMedianoche ? '<span style="font-size: 10px; color: var(--text-light); background: var(--bg); padding: 1px 6px; border-radius: 8px;">cruza medianoche</span>' : ''}
                </div>
            `;
        }).join('');
        
        return `
            <hr>
            <div style="margin: 10px 0;">
                <div style="font-size: 13px; font-weight: 600; color: #f59e0b; margin-bottom: 6px;">
                    ⚡ Corriente del día (${resumen.numBloques} bloque${resumen.numBloques > 1 ? 's' : ''} · ${resumen.totalHoras.toFixed(1)}h)
                </div>
                ${bloquesHTML}
            </div>
        `;
    } catch (e) { return ''; }
}

function getBadgeSesion(sesion) {
    if (!sesion || !window.CorrienteUtils) return '';
    const s = window.CorrienteUtils.getSesion(sesion);
    if (!s) return '';
    return `<span style="font-size: 11px; background: ${s.bg}; color: ${s.color}; padding: 2px 10px; border-radius: 10px; font-weight: 600;">${s.icon} ${s.label}</span>`;
}

// ============================================================
// LOAD ORDERS - CON VERIFICACIÓN DE PERMISOS
// ============================================================

async function loadOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;
    
    const statusSelect = document.getElementById('filter-status');
    const status = statusSelect?.value || '';
    
    const fromDate = document.getElementById('filter-date-from')?.value || '';
    const toDate = document.getElementById('filter-date-to')?.value || '';
    const search = document.getElementById('filter-search')?.value?.trim() || '';
    
    const filters = {};
    if (status) filters.status = status;
    if (fromDate) filters.from_date = fromDate;
    if (toDate) filters.to_date = toDate;
    if (search) filters.search = search;
    
    try {
        const orders = await window.OrdersModule.getOrders(filters);
        
        if (window.OrdersModule.getWaitingListCount) {
            const count = await window.OrdersModule.getWaitingListCount();
            updateWaitingBadge(count);
        }
        
        if (orders.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 40px;">
                    <span style="font-size: 48px;">📭</span>
                    <p style="margin-top: 8px; color: var(--text-light);">No hay pedidos que coincidan con los filtros</p>
                    <button onclick="showOrderForm()" class="btn primary" style="margin-top: 12px; padding: 8px 16px; font-size: 14px; width: auto;">
                        ➕ Crear primer pedido
                    </button>
                </div>
            `;
            return;
        }
        
        const statusColors = {
            'pending': '#f59e0b', 'confirmed': '#3b82f6', 'production': '#8b5cf6',
            'ready': '#10b981', 'delivered': '#06b6d4', 'cancelled': '#ef4444',
            'waiting': '#f59e0b', 'waiting_bought': '#8b5cf6'
        };
        
        const statusLabels = {
            'pending': '⏳ Pendiente', 'confirmed': '✅ Confirmado', 'production': '🔨 En producción',
            'ready': '📦 Listo', 'delivered': '🚚 Entregado', 'cancelled': '❌ Cancelado',
            'waiting': '⏰ Lista de espera', 'waiting_bought': '🔄 Compró por lista'
        };
        
        const grouped = {};
        const today = new Date().toISOString().split('T')[0];
        
        const permisosPorPedido = {};
        orders.forEach(order => {
            permisosPorPedido[order.id] = checkOrderPermission(order.id);
        });
        
        orders.forEach(order => {
            const dateKey = order.delivery_date ? order.delivery_date.split('T')[0] : 'sin fecha';
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(order);
        });
        
        // 🆕 CORRECCIÓN #7: Ordenar los pedidos DENTRO de cada día por ID ascendente
        Object.keys(grouped).forEach(dateKey => {
            grouped[dateKey].sort((a, b) => {
                const idA = parseInt(a.id) || 0;
                const idB = parseInt(b.id) || 0;
                return idA - idB;
            });
        });
        
        const sortedDates = Object.keys(grouped).sort((a, b) => {
            if (a === today && b !== today) return -1;
            if (b === today && a !== today) return 1;
            return a.localeCompare(b);
        });
        
        let html = '';
        
        sortedDates.forEach((dateKey, index) => {
            const dayOrders = grouped[dateKey];
            const totalDay = dayOrders.reduce((sum, o) => sum + o.total, 0);
            const isToday = dateKey === today;
            const isExpanded = isToday || (index === 0 && !sortedDates.includes(today)) || (index === 0 && !isToday && sortedDates[0] !== today);
            
            const fechaLarga = formatearFechaLarga(dateKey);
            const badgeCorriente = getBadgeCorriente(dateKey);
            
            const produccionInfoHtml = renderProduccionInfoHTML(dateKey);
            
            const bloqueadosDelDia = dayOrders.filter(o => !permisosPorPedido[o.id]?.puede).length;
            const badgeBloqueados = bloqueadosDelDia > 0 
                ? `<span style="font-size: 11px; background: #94a3b820; color: #94a3b8; padding: 1px 8px; border-radius: 10px; font-weight: 600; border: 1px solid #94a3b8;">🔒 ${bloqueadosDelDia} bloqueado${bloqueadosDelDia > 1 ? 's' : ''}</span>`
                : '';
            
            html += `
                <div class="card" style="padding: 10px 12px; margin-bottom: 8px; cursor: pointer; border-left: 4px solid ${isToday ? '#f59e0b' : 'var(--border-color)'};" 
                     onclick="toggleDayOrders('day-${dateKey}')">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <span style="font-size: 18px; transition: transform 0.3s;" id="arrow-day-${dateKey}">
                                ${isExpanded ? '🔽' : '▶️'}
                            </span>
                            <span style="font-weight: 600; font-size: 15px;">
                                📅 ${fechaLarga}
                                ${isToday ? ' <span style="font-size: 11px; color: #f59e0b; background: #f59e0b20; padding: 1px 8px; border-radius: 10px;">HOY</span>' : ''}
                                ${badgeCorriente}
                                ${badgeBloqueados}
                            </span>
                            <span style="font-size: 12px; color: var(--text-light);">
                                ${dayOrders.length} ${dayOrders.length === 1 ? 'pedido' : 'pedidos'}
                            </span>
                        </div>
                        <div style="font-weight: 700; color: var(--primary); font-size: 16px;">
                            $${totalDay.toFixed(2)}
                        </div>
                    </div>
                    ${produccionInfoHtml}
                </div>
                <div id="day-${dateKey}" style="display: ${isExpanded ? 'block' : 'none'}; margin-bottom: 12px; padding-left: 8px;">
                    ${dayOrders.map(order => {
                        let waitingBadge = '';
                        if (order.status === 'waiting' && order.waiting_position) {
                            waitingBadge = `<span style="font-size: 11px; background: #f59e0b; color: #fff; padding: 2px 8px; border-radius: 10px; margin-left: 4px; font-weight: 600;">#${order.waiting_position} en lista de espera</span>`;
                        } else if (order.status === 'waiting_bought') {
                            waitingBadge = `<span style="font-size: 11px; background: #8b5cf6; color: #fff; padding: 2px 8px; border-radius: 10px; margin-left: 4px; font-weight: 600;">🔄 Compró por lista</span>`;
                        }
                        
                        const sesionBadge = getBadgeSesion(order.session);
                        
                        const permisos = permisosPorPedido[order.id] || { puede: true };
                        const bloqueado = !permisos.puede;
                        
                        const statusColor = bloqueado ? '#94a3b8' : (statusColors[order.status] || '#94a3b8');
                        const cardOpacity = bloqueado ? 0.75 : 1;
                        
                        return `
                        <div class="card" style="border-left: 4px solid ${statusColor}; padding: 10px 14px; margin-bottom: 4px; opacity: ${cardOpacity};">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
                                <div style="flex: 1; min-width: 120px;">
                                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                                        <span style="font-weight: 600; font-size: 14px;">
                                            ${bloqueado ? '🔒' : ''} #${order.id} - ${order.client_name}
                                        </span>
                                        ${waitingBadge}
                                        <span style="font-size: 11px; color: ${statusColor}; background: ${statusColor}20; padding: 1px 8px; border-radius: 10px;">
                                            ${statusLabels[order.status] || order.status}
                                        </span>
                                        ${bloqueado ? renderBadgeSoloLectura() : ''}
                                        ${sesionBadge}
                                        ${order.priority === 'urgent' ? '<span style="font-size: 11px; color: #ef4444; font-weight: 600;">🔴 URGENTE</span>' : ''}
                                    </div>
                                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 2px; font-size: 12px; color: var(--text-light);">
                                        ${order.productos_nombres ? `<span>📦 ${order.productos_nombres}</span>` : ''}
                                        ${order.client_phone ? `<span>📞 ${order.client_phone}</span>` : ''}
                                    </div>
                                    ${bloqueado ? `<div style="margin-top: 4px; font-size: 11px; color: #94a3b8; font-style: italic;">🔒 ${permisos.razon}</div>` : ''}
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 16px; font-weight: 700; color: ${bloqueado ? '#94a3b8' : 'var(--primary)'};">
                                        $${parseFloat(order.total).toFixed(2)}
                                    </div>
                                    <div style="display: flex; gap: 4px; margin-top: 4px; justify-content: flex-end;">
                                        <button onclick="event.stopPropagation(); viewOrder(${order.id})" class="btn secondary" style="padding: 2px 10px; font-size: 11px; width: auto;">
                                            👁️ Ver
                                        </button>
                                        ${!bloqueado && order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'waiting_bought' ? `
                                            <button onclick="event.stopPropagation(); showOrderForm(${order.id})" class="btn secondary" style="padding: 2px 10px; font-size: 11px; width: auto;">
                                                ✏️
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                            ${order.notes ? `<p style="margin-top: 4px; font-size: 12px; color: var(--text-light);">📝 ${order.notes}</p>` : ''}
                        </div>
                    `}).join('')}
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error cargando pedidos:', error);
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 40px; color: #ef4444;">
                <span style="font-size: 32px;">❌</span>
                <p>Error cargando pedidos: ${error.message}</p>
            </div>
        `;
    }
}

// ============================================================
// TOGGLE / CLEAR FILTERS
// ============================================================

function toggleDayOrders(dayId) {
    const dayContent = document.getElementById(dayId);
    const arrow = document.getElementById('arrow-' + dayId);
    if (!dayContent) return;
    if (dayContent.style.display === 'none') {
        dayContent.style.display = 'block';
        if (arrow) arrow.textContent = '🔽';
    } else {
        dayContent.style.display = 'none';
        if (arrow) arrow.textContent = '▶️';
    }
}

function clearOrderFilters() {
    const statusSelect = document.getElementById('filter-status');
    const dateFrom = document.getElementById('filter-date-from');
    const dateTo = document.getElementById('filter-date-to');
    const searchInput = document.getElementById('filter-search');
    const currentMonth = document.getElementById('filter-current-month');
    
    if (statusSelect) statusSelect.value = 'pending';
    if (dateFrom) dateFrom.value = '';
    if (dateTo) dateTo.value = '';
    if (searchInput) searchInput.value = '';
    if (currentMonth) {
        currentMonth.checked = false;
        updateMesToggleVisual('orders');
    }
    
    loadOrders();
}

// ============================================================
// MODAL DE REPORTE PARAMETRIZABLE
// ============================================================

function showOrdersReportModal() {
    const existingModal = document.getElementById('orders-report-modal');
    if (existingModal) existingModal.remove();
    
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    
    const modal = document.createElement('div');
    modal.id = 'orders-report-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: ${ORDERS_MODAL_Z_INDEX}; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="margin: 0;">📊 Reporte de Pedidos</h2>
                <button onclick="closeOrdersReportModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <p style="font-size: 13px; color: var(--text-light); margin-bottom: 16px;">
                Configura los filtros y genera el reporte en PDF.
            </p>
            
            <form id="orders-report-form" style="display: flex; flex-direction: column; gap: 12px;">
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">📅 Rango de fechas</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group">
                            <label style="font-size: 12px;">Desde</label>
                            <input type="date" id="report-orders-from" value="${primerDia.toISOString().split('T')[0]}" class="input-field">
                        </div>
                        <div class="form-group">
                            <label style="font-size: 12px;">Hasta</label>
                            <input type="date" id="report-orders-to" value="${ultimoDia.toISOString().split('T')[0]}" class="input-field">
                        </div>
                    </div>
                </div>
                
                <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-label); margin-bottom: 8px;">🔍 Filtros opcionales</div>
                    
                    <div class="form-group" style="margin-bottom: 8px;">
                        <label style="font-size: 12px;">👤 Cliente</label>
                        <input type="text" id="report-orders-client" placeholder="Ej: Juan Pérez (opcional)" class="input-field">
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 8px;">
                        <label style="font-size: 12px;">📦 Producto</label>
                        <input type="text" id="report-orders-product" placeholder="Ej: Jaba de Pan (opcional)" class="input-field">
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 8px;">
                        <label style="font-size: 12px;">📌 Estado</label>
                        <select id="report-orders-status" class="input-select">
                            <option value="">Todos los estados</option>
                            <option value="pending">⏳ Pendiente</option>
                            <option value="confirmed">✅ Confirmado</option>
                            <option value="production">🔨 En producción</option>
                            <option value="ready">📦 Listo</option>
                            <option value="delivered">🚚 Entregado</option>
                            <option value="cancelled">❌ Cancelado</option>
                            <option value="waiting">⏰ Lista de espera</option>
                            <option value="waiting_bought">🔄 Compró por lista</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: var(--bg-card); border-radius: 6px; border: 1px solid var(--border-color);">
                        <input type="checkbox" id="report-orders-only-debts" style="width: 16px; height: 16px; cursor: pointer; accent-color: var(--primary);">
                        <label for="report-orders-only-debts" style="font-size: 13px; cursor: pointer;">💳 Solo con deuda pendiente</label>
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="submit" class="btn primary" style="flex: 1;">
                        📄 Generar Reporte
                    </button>
                    <button type="button" onclick="closeOrdersReportModal()" class="btn secondary" style="flex: 1;">
                        ❌ Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const form = document.getElementById('orders-report-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await generateOrdersReportFromForm();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeOrdersReportModal();
    });
}

async function generateOrdersReportFromForm() {
    const filters = {
        from_date: document.getElementById('report-orders-from')?.value || '',
        to_date: document.getElementById('report-orders-to')?.value || '',
        client: document.getElementById('report-orders-client')?.value?.trim() || '',
        product: document.getElementById('report-orders-product')?.value?.trim() || '',
        status: document.getElementById('report-orders-status')?.value || '',
        onlyDebts: document.getElementById('report-orders-only-debts')?.checked || false
    };
    
    if (window.ReportsModule) {
        const html = window.ReportsModule.generateOrdersReport(filters);
        window.ReportsModule.printReport(html);
        closeOrdersReportModal();
        window.showToast('✅ Reporte generado', 'success');
    } else {
        window.showToast('❌ Módulo de reportes no disponible', 'error');
    }
}

function closeOrdersReportModal() {
    const modal = document.getElementById('orders-report-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
        setTimeout(() => {
            const still = document.getElementById('orders-report-modal');
            if (still && still.parentNode) still.remove();
        }, 500);
    }
}

// ============================================================
// FORMULARIO DE PEDIDO INDIVIDUAL
// ============================================================

async function showOrderForm(orderId = null) {
    const existingModal = document.getElementById('order-modal');
    if (existingModal) existingModal.remove();
    
    const viewModal = document.getElementById('order-view-modal');
    if (viewModal) viewModal.remove();
    
    const isEdit = !!orderId;
    
    if (isEdit) {
        const permisos = checkOrderPermission(orderId);
        if (!permisos.puede) {
            await window.ModalModule.showAlert({
                title: '🔒 Pedido bloqueado',
                message: `No puedes editar este pedido.\n\n${permisos.razon}\n\n💡 Pídele al administrador que comparta las recetas asociadas con el negocio.`,
                icon: '🔒',
                type: 'warning',
                buttonText: 'Entendido'
            });
            return;
        }
    }
    
    const loadData = async () => {
        let orderData = null;
        if (isEdit) {
            orderData = await window.OrdersModule.getOrder(orderId);
            if (!orderData) {
                window.showToast('❌ Pedido no encontrado', 'error');
                return;
            }
        }
        const productos = await window.OrdersModule.getProductos();
        renderForm(orderData, productos);
    };
    
    const renderForm = (orderData, productos) => {
        const modal = document.createElement('div');
        modal.id = 'order-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            z-index: ${ORDERS_MODAL_Z_INDEX}; padding: 20px;
        `;
        
        window._orderFormModal = modal;
        
        const orderIdInput = isEdit ? `<input type="hidden" id="order-id" value="${orderData.id}">` : '';
        const lastDeliveryDate = localStorage.getItem('panario_last_delivery_date') || new Date(Date.now() + 86400000).toISOString().slice(0, 16);
        const defaultDate = orderData?.delivery_date || lastDeliveryDate;
        const defaultDateOnly = defaultDate.split('T')[0];
        
        const clientNameValue = orderData?.client_name || '';
        const clientPhoneValue = orderData?.client_phone || '';
        const clientIdValue = orderData?.client_id || '';
        
        let itemsHtml = '';
        if (isEdit && orderData.items && orderData.items.length > 0) {
            itemsHtml = orderData.items.map(item => `
                <div class="order-item" style="display: grid; grid-template-columns: 2fr 1fr 1fr 30px; gap: 4px; align-items: center; padding: 6px 10px; background: var(--bg); border-radius: 6px; margin-bottom: 4px;">
                    <span style="font-size: 14px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${item.producto_nombre || item.product_name}
                        ${item.receta_id ? '📋' : ''}
                    </span>
                    <input type="number" class="item-quantity" value="${item.quantity}" step="0.1" min="0.1" 
                           style="width: 100%; padding: 4px 6px; text-align: center; font-size: 13px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text);">
                    <input type="number" class="item-price" value="${item.unit_price}" step="0.01" min="0" 
                           style="width: 100%; padding: 4px 6px; text-align: center; font-size: 13px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text);">
                    <button type="button" onclick="removeOrderItem(this)" style="background: none; border: none; font-size: 16px; cursor: pointer; color: #ef4444; padding: 0;">✕</button>
                    <input type="hidden" class="item-producto-id" value="${item.producto_id || ''}">
                    <input type="hidden" class="item-receta-id" value="${item.receta_id || ''}">
                    <input type="hidden" class="item-product-name" value="${item.producto_nombre || item.product_name || ''}">
                </div>
            `).join('');
        } else {
            itemsHtml = `<div style="text-align: center; padding: 16px; color: var(--text-light); font-size: 13px;">Sin productos agregados</div>`;
        }
        
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <h2 style="margin: 0 0 16px 0;">${isEdit ? '✏️ Editar Pedido #' + orderData.id : '📝 Nuevo Pedido'}</h2>
                
                <form id="order-form" style="display: flex; flex-direction: column; gap: 12px;">
                    ${orderIdInput}
                    
                    <input type="hidden" id="order-original-client-name" value="${clientNameValue}">
                    <input type="hidden" id="order-original-client-id" value="${clientIdValue}">
                    
                    <div class="form-group">
                        <label>👤 Cliente</label>
                        <input type="text" id="order-client-name" class="input-field"
                               value="${clientNameValue}" 
                               placeholder="Nombre del cliente" required>
                        <input type="text" id="order-client-phone" class="input-field"
                               value="${clientPhoneValue}" 
                               placeholder="Teléfono (opcional)" style="margin-top: 4px;">
                    </div>
                    
                    <div class="form-group">
                        <label>📅 Fecha de entrega</label>
                        <input type="date" id="order-delivery-date" class="input-field"
                               value="${defaultDateOnly}" required
                               onchange="onOrderDateChange()">
                    </div>
                    
                    <div id="order-corriente-banner"></div>
                    <div id="order-produccion-info"></div>
                    
                    <div class="form-group">
                        <label>🕐 Sesión de recogida <span style="font-size: 11px; color: var(--text-light); font-weight: normal;">(opcional)</span></label>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            <label class="sesion-option" style="flex: 1; min-width: 80px; padding: 8px 12px; border-radius: 8px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg); transition: all 0.2s;" onclick="selectSesion('')">
                                <input type="radio" name="order-sesion" value="" ${!orderData?.session ? 'checked' : ''} style="display: none;">
                                <span style="font-size: 13px;">➖ Sin especificar</span>
                            </label>
                            <label class="sesion-option" style="flex: 1; min-width: 80px; padding: 8px 12px; border-radius: 8px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg); transition: all 0.2s;" onclick="selectSesion('manana')">
                                <input type="radio" name="order-sesion" value="manana" ${orderData?.session === 'manana' ? 'checked' : ''} style="display: none;">
                                <span style="font-size: 13px;">🌅 Mañana</span>
                            </label>
                            <label class="sesion-option" style="flex: 1; min-width: 80px; padding: 8px 12px; border-radius: 8px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg); transition: all 0.2s;" onclick="selectSesion('tarde')">
                                <input type="radio" name="order-sesion" value="tarde" ${orderData?.session === 'tarde' ? 'checked' : ''} style="display: none;">
                                <span style="font-size: 13px;">☀️ Tarde</span>
                            </label>
                            <label class="sesion-option" style="flex: 1; min-width: 80px; padding: 8px 12px; border-radius: 8px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg); transition: all 0.2s;" onclick="selectSesion('noche')">
                                <input type="radio" name="order-sesion" value="noche" ${orderData?.session === 'noche' ? 'checked' : ''} style="display: none;">
                                <span style="font-size: 13px;">🌙 Noche</span>
                            </label>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group">
                            <label>📌 Estado</label>
                            <select id="order-status" class="input-select">
                                <option value="pending" ${orderData?.status === 'pending' ? 'selected' : ''}>⏳ Pendiente</option>
                                <option value="confirmed" ${orderData?.status === 'confirmed' ? 'selected' : ''}>✅ Confirmado</option>
                                <option value="production" ${orderData?.status === 'production' ? 'selected' : ''}>🔨 En producción</option>
                                <option value="ready" ${orderData?.status === 'ready' ? 'selected' : ''}>📦 Listo</option>
                                <option value="delivered" ${orderData?.status === 'delivered' ? 'selected' : ''}>🚚 Entregado</option>
                                <option value="cancelled" ${orderData?.status === 'cancelled' ? 'selected' : ''}>❌ Cancelado</option>
                                <option value="waiting" ${orderData?.status === 'waiting' ? 'selected' : ''}>⏰ En lista de espera</option>
                                <option value="waiting_bought" ${orderData?.status === 'waiting_bought' ? 'selected' : ''}>🔄 Compro por lista de espera</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>⚡ Prioridad</label>
                            <select id="order-priority" class="input-select">
                                <option value="normal" ${orderData?.priority === 'normal' ? 'selected' : ''}>Normal</option>
                                <option value="urgent" ${orderData?.priority === 'urgent' ? 'selected' : ''}>🔴 Urgente</option>
                            </select>
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border-color);">
                        <span style="font-size: 20px;">💰</span>
                        <span style="flex: 1; font-size: 14px; font-weight: 500;">Pago por adelantado</span>
                        <input type="checkbox" id="order-advance-payment" ${orderData?.has_advance_payment ? 'checked' : ''} 
                               onchange="toggleAdvancePaymentFields()" style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--primary);">
                    </div>
                    
                    <div id="advance-payment-fields" style="display: ${orderData?.has_advance_payment ? 'grid' : 'none'}; grid-template-columns: 1fr 1fr; gap: 8px; padding: 8px 12px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border-color);">
                        <div class="form-group">
                            <label>💰 Monto adelantado</label>
                            <input type="number" id="order-advance-amount" class="input-field"
                                   value="${orderData?.advance_amount || 0}" 
                                   step="0.01" min="0" placeholder="0.00">
                        </div>
                        <div class="form-group">
                            <label>💳 Forma de pago</label>
                            <select id="order-advance-payment-method" class="input-select">
                                <option value="cash" ${orderData?.advance_payment_method === 'cash' ? 'selected' : ''}>💵 Efectivo</option>
                                <option value="transfer" ${orderData?.advance_payment_method === 'transfer' ? 'selected' : ''}>🏦 Transferencia</option>
                                <option value="debt" ${orderData?.advance_payment_method === 'debt' ? 'selected' : ''}>💳 Deuda</option>
                                <option value="other" ${orderData?.advance_payment_method === 'other' ? 'selected' : ''}>🔄 Otra</option>
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 4px; font-weight: 600;">🛒 Productos</label>
                        
                        <div style="border: 2px solid var(--border-color); border-radius: 8px; overflow: hidden;">
                            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 30px; background: var(--bg); padding: 8px 10px; border-bottom: 2px solid var(--border-color); font-size: 12px; font-weight: 600; color: var(--text-label);">
                                <span>Producto</span>
                                <span style="text-align: center;">Cantidad</span>
                                <span style="text-align: center;">Precio</span>
                                <span></span>
                            </div>
                            <div id="order-items-container" style="display: flex; flex-direction: column; gap: 4px; max-height: 200px; overflow-y: auto; padding: 6px;">
                                ${itemsHtml}
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
                            <button type="button" onclick="showAddProductModal()" class="btn primary" style="padding: 4px 12px; font-size: 12px; width: auto;">
                                ➕ Agregar producto
                            </button>
                            <button type="button" onclick="clearOrderItems()" class="btn secondary" style="padding: 4px 12px; font-size: 12px; width: auto; color: #ef4444; border-color: #ef4444;">
                                🗑️ Limpiar
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>📝 Notas</label>
                        <textarea id="order-notes" class="input-textarea" rows="2" placeholder="Notas adicionales...">${orderData?.notes || ''}</textarea>
                    </div>
                    
                    <div style="text-align: right; font-size: 20px; font-weight: 700; color: var(--primary);">
                        Total: $<span id="order-total-display">${orderData?.total || '0.00'}</span>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button type="submit" class="btn primary" style="flex: 1;">💾 Guardar pedido</button>
                        <button type="button" onclick="window.closeOrderModal()" class="btn secondary" style="flex: 1;">❌ Cancelar</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        setTimeout(() => {
            onOrderDateChange();
            if (orderData?.session) {
                highlightSesionSelection(orderData.session);
            } else {
                highlightSesionSelection('');
            }
        }, 50);
        
        window.toggleAdvancePaymentFields = function() {
            const checked = document.getElementById('order-advance-payment').checked;
            const fields = document.getElementById('advance-payment-fields');
            fields.style.display = checked ? 'grid' : 'none';
        };
        
        window.updateOrderTotal();
        
        document.querySelectorAll('.item-quantity, .item-price').forEach(el => {
            el.addEventListener('input', window.updateOrderTotal);
        });
        
        const form = document.getElementById('order-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitOrderForm(isEdit);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) window.closeOrderModal();
        });
    };
    
    loadData();
}

// ============================================================
// RESERVA POR PERÍODO
// 🆕 v2.1.13: Con exclusión de días de la semana
// ============================================================

async function showMultiOrderForm() {
    const existingModal = document.getElementById('multi-order-modal');
    if (existingModal) existingModal.remove();
    
    window._multiOrderState = {
        patron: {
            tipo: 'rango',
            fechaInicio: new Date().toISOString().split('T')[0],
            fechaFin: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            diasSemana: [],
            diasEspecificos: [],
            paridad: 'todos',
            diasExcluidos: []
        },
        items: [],
        fechasGeneradas: [],
        duplicados: {},
        sesion: 'manana',
        fechasExcluidas: []
    };
    
    const productos = await window.OrdersModule.getProductos();
    
    const modal = document.createElement('div');
    modal.id = 'multi-order-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: ${ORDERS_MODAL_Z_INDEX}; padding: 15px;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 20px; max-width: 700px; width: 100%; max-height: 95vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="margin: 0; color: #8b5cf6;">📅 Reserva por período</h2>
                <button onclick="closeMultiOrderModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
            </div>
            
            <p style="font-size: 13px; color: var(--text-light); margin-bottom: 16px;">
                💡 Crea múltiples pedidos a la vez. Se compartirán cliente y productos, cambiando solo la fecha de entrega.
            </p>
            
            <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 12px;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px;">👤 Cliente</h4>
                <div class="form-group">
                    <input type="text" id="multi-client-name" class="input-field"
                           placeholder="Nombre del cliente *" required>
                    <input type="text" id="multi-client-phone" class="input-field"
                           placeholder="Teléfono (opcional)" style="margin-top: 6px;">
                </div>
            </div>
            
            <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 12px;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px;">🛒 Productos (mismos para todos los días)</h4>
                
                <div style="border: 2px solid var(--border-color); border-radius: 8px; overflow: hidden; background: var(--bg-card);">
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 30px; background: var(--bg); padding: 6px 8px; border-bottom: 2px solid var(--border-color); font-size: 11px; font-weight: 600; color: var(--text-label);">
                        <span>Producto</span>
                        <span style="text-align: center;">Cant.</span>
                        <span style="text-align: center;">Precio</span>
                        <span></span>
                    </div>
                    <div id="multi-items-container" style="display: flex; flex-direction: column; gap: 4px; max-height: 150px; overflow-y: auto; padding: 6px;">
                        <div style="text-align: center; padding: 12px; color: var(--text-light); font-size: 12px;">
                            Sin productos agregados
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
                    <button type="button" onclick="showMultiAddProductModal()" class="btn primary" style="padding: 4px 12px; font-size: 12px; width: auto;">
                        ➕ Agregar producto
                    </button>
                </div>
                
                <div style="text-align: right; font-size: 14px; font-weight: 700; color: var(--primary); margin-top: 6px;">
                    Total por pedido: $<span id="multi-total-display">0.00</span>
                </div>
            </div>
            
            <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 12px;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px;">📅 Patrón de fechas</h4>
                
                <div style="display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap;">
                    <label style="flex: 1; min-width: 100px; padding: 8px 12px; border-radius: 8px; border: 2px solid #8b5cf6; cursor: pointer; text-align: center; background: #8b5cf615; transition: all 0.2s; font-weight: 600;" class="multi-patron-option" onclick="selectPatronType('rango')">
                        <input type="radio" name="multi-patron" value="rango" checked style="display: none;">
                        <span style="font-size: 13px;">📆 Rango completo</span>
                    </label>
                    <label style="flex: 1; min-width: 100px; padding: 8px 12px; border-radius: 8px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg-card); transition: all 0.2s;" class="multi-patron-option" onclick="selectPatronType('semana')">
                        <input type="radio" name="multi-patron" value="semana" style="display: none;">
                        <span style="font-size: 13px;">🗓️ Días de la semana</span>
                    </label>
                    <label style="flex: 1; min-width: 100px; padding: 8px 12px; border-radius: 8px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg-card); transition: all 0.2s;" class="multi-patron-option" onclick="selectPatronType('especificos')">
                        <input type="radio" name="multi-patron" value="especificos" style="display: none;">
                        <span style="font-size: 13px;">📌 Días específicos</span>
                    </label>
                </div>
                
                <div id="multi-paridad-container" style="margin-bottom: 12px; padding: 10px 12px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-label); margin-bottom: 6px;">
                        📅 Selecciona qué días incluir:
                    </div>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        <label class="multi-paridad-option" style="flex: 1; min-width: 80px; padding: 6px 10px; border-radius: 6px; border: 2px solid #8b5cf6; cursor: pointer; text-align: center; background: #8b5cf615; transition: all 0.2s; font-size: 12px; font-weight: 600;" data-paridad="todos">
                            <input type="radio" name="multi-paridad" value="todos" checked style="display: none;">
                            📅 Todos
                        </label>
                        <label class="multi-paridad-option" style="flex: 1; min-width: 80px; padding: 6px 10px; border-radius: 6px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg); transition: all 0.2s; font-size: 12px;" data-paridad="pares">
                            <input type="radio" name="multi-paridad" value="pares" style="display: none;">
                            🔵 Solo pares
                        </label>
                        <label class="multi-paridad-option" style="flex: 1; min-width: 80px; padding: 6px 10px; border-radius: 6px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg); transition: all 0.2s; font-size: 12px;" data-paridad="impares">
                            <input type="radio" name="multi-paridad" value="impares" style="display: none;">
                            🟡 Solo impares
                        </label>
                    </div>
                    <div style="font-size: 11px; color: var(--text-light); margin-top: 4px;">
                        💡 Ej: "Solo pares" crea pedidos los días 2, 4, 6, 8, 10...
                    </div>
                </div>
                
                <div id="multi-exclusion-container" style="margin-bottom: 12px; padding: 10px 12px; background: #ef444410; border-radius: 8px; border: 1px dashed #ef4444;">
                    <div style="font-size: 12px; font-weight: 600; color: #ef4444; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                        <span>🚫</span>
                        <span>Excluir días de la semana (opcional)</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-light); margin-bottom: 8px;">
                        Los días marcados NO se incluirán en la reserva (útil para excluir los días que no trabajas).
                    </div>
                    
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        <label class="multi-dia-excluido" data-dia="1" style="flex: 1; min-width: 60px; padding: 6px 8px; border-radius: 6px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg-card); font-size: 12px; transition: all 0.2s;">
                            <input type="checkbox" name="multi-excluido" value="1" style="display: none;">
                            Lun
                        </label>
                        <label class="multi-dia-excluido" data-dia="2" style="flex: 1; min-width: 60px; padding: 6px 8px; border-radius: 6px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg-card); font-size: 12px; transition: all 0.2s;">
                            <input type="checkbox" name="multi-excluido" value="2" style="display: none;">
                            Mar
                        </label>
                        <label class="multi-dia-excluido" data-dia="3" style="flex: 1; min-width: 60px; padding: 6px 8px; border-radius: 6px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg-card); font-size: 12px; transition: all 0.2s;">
                            <input type="checkbox" name="multi-excluido" value="3" style="display: none;">
                            Mié
                        </label>
                        <label class="multi-dia-excluido" data-dia="4" style="flex: 1; min-width: 60px; padding: 6px 8px; border-radius: 6px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg-card); font-size: 12px; transition: all 0.2s;">
                            <input type="checkbox" name="multi-excluido" value="4" style="display: none;">
                            Jue
                        </label>
                        <label class="multi-dia-excluido" data-dia="5" style="flex: 1; min-width: 60px; padding: 6px 8px; border-radius: 6px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg-card); font-size: 12px; transition: all 0.2s;">
                            <input type="checkbox" name="multi-excluido" value="5" style="display: none;">
                            Vie
                        </label>
                        <label class="multi-dia-excluido" data-dia="6" style="flex: 1; min-width: 60px; padding: 6px 8px; border-radius: 6px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg-card); font-size: 12px; transition: all 0.2s;">
                            <input type="checkbox" name="multi-excluido" value="6" style="display: none;">
                            Sáb
                        </label>
                        <label class="multi-dia-excluido" data-dia="0" style="flex: 1; min-width: 60px; padding: 6px 8px; border-radius: 6px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg-card); font-size: 12px; transition: all 0.2s;">
                            <input type="checkbox" name="multi-excluido" value="0" style="display: none;">
                            Dom
                        </label>
                    </div>
                    
                    <div style="display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap;">
                        <button type="button" onclick="selectDiasExcluidos([0, 6])" 
                                class="btn secondary" 
                                style="padding: 4px 10px; font-size: 11px; width: auto; background: #ef444415; color: #ef4444; border-color: #ef4444;">
                            🚫 Excluir fines de semana
                        </button>
                        <button type="button" onclick="limpiarDiasExcluidos()" 
                                class="btn secondary" 
                                style="padding: 4px 10px; font-size: 11px; width: auto;">
                            🗑️ Limpiar exclusiones
                        </button>
                    </div>
                    
                    <div id="multi-exclusion-summary" style="font-size: 11px; color: #ef4444; margin-top: 6px; font-style: italic;"></div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                    <div class="form-group">
                        <label style="font-size: 12px;">📅 Desde</label>
                        <input type="date" id="multi-fecha-inicio" class="input-field" 
                               value="${window._multiOrderState.patron.fechaInicio}"
                               onchange="onMultiPatronChange()">
                    </div>
                    <div class="form-group">
                        <label style="font-size: 12px;">📅 Hasta</label>
                        <input type="date" id="multi-fecha-fin" class="input-field"
                               value="${window._multiOrderState.patron.fechaFin}"
                               onchange="onMultiPatronChange()">
                    </div>
                </div>
                
                <div id="multi-dias-semana" style="display: none; margin-bottom: 8px;">
                    <label style="font-size: 12px; font-weight: 600; color: var(--text-label);">Días de la semana a incluir:</label>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">
                        <label class="multi-dia-semana" style="flex: 1; min-width: 60px; padding: 6px 8px; border-radius: 6px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg-card); font-size: 12px; transition: all 0.2s;" data-dia="1">
                            <input type="checkbox" name="multi-dia" value="1" style="display: none;">
                            Lun
                        </label>
                        <label class="multi-dia-semana" style="flex: 1; min-width: 60px; padding: 6px 8px; border-radius: 6px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg-card); font-size: 12px; transition: all 0.2s;" data-dia="2">
                            <input type="checkbox" name="multi-dia" value="2" style="display: none;">
                            Mar
                        </label>
                        <label class="multi-dia-semana" style="flex: 1; min-width: 60px; padding: 6px 8px; border-radius: 6px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg-card); font-size: 12px; transition: all 0.2s;" data-dia="3">
                            <input type="checkbox" name="multi-dia" value="3" style="display: none;">
                            Mié
                        </label>
                        <label class="multi-dia-semana" style="flex: 1; min-width: 60px; padding: 6px 8px; border-radius: 6px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg-card); font-size: 12px; transition: all 0.2s;" data-dia="4">
                            <input type="checkbox" name="multi-dia" value="4" style="display: none;">
                            Jue
                        </label>
                        <label class="multi-dia-semana" style="flex: 1; min-width: 60px; padding: 6px 8px; border-radius: 6px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg-card); font-size: 12px; transition: all 0.2s;" data-dia="5">
                            <input type="checkbox" name="multi-dia" value="5" style="display: none;">
                            Vie
                        </label>
                        <label class="multi-dia-semana" style="flex: 1; min-width: 60px; padding: 6px 8px; border-radius: 6px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg-card); font-size: 12px; transition: all 0.2s;" data-dia="6">
                            <input type="checkbox" name="multi-dia" value="6" style="display: none;">
                            Sáb
                        </label>
                        <label class="multi-dia-semana" style="flex: 1; min-width: 60px; padding: 6px 8px; border-radius: 6px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg-card); font-size: 12px; transition: all 0.2s;" data-dia="0">
                            <input type="checkbox" name="multi-dia" value="0" style="display: none;">
                            Dom
                        </label>
                    </div>
                </div>
                
                <div id="multi-dias-especificos" style="display: none; margin-bottom: 8px;">
                    <label style="font-size: 12px; font-weight: 600; color: var(--text-label);">Días del mes (1-31):</label>
                    <input type="text" id="multi-dias-esp" class="input-field" placeholder="Ej: 1, 15, 30"
                           oninput="onMultiPatronChange()" style="margin-top: 4px;">
                    <small style="font-size: 11px; color: var(--text-light);">Separa con comas</small>
                </div>
            </div>
            
            <div style="background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 12px;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px;">🕐 Sesión de recogida</h4>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <label class="multi-sesion-option" style="flex: 1; min-width: 80px; padding: 8px 12px; border-radius: 8px; border: 2px solid #10b981; cursor: pointer; text-align: center; background: #10b98115; transition: all 0.2s; font-weight: 600;" onclick="selectMultiSesion('manana')">
                        <input type="radio" name="multi-sesion" value="manana" checked style="display: none;">
                        <span style="font-size: 13px;">🌅 Mañana</span>
                    </label>
                    <label class="multi-sesion-option" style="flex: 1; min-width: 80px; padding: 8px 12px; border-radius: 8px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg-card); transition: all 0.2s;" onclick="selectMultiSesion('tarde')">
                        <input type="radio" name="multi-sesion" value="tarde" style="display: none;">
                        <span style="font-size: 13px;">☀️ Tarde</span>
                    </label>
                    <label class="multi-sesion-option" style="flex: 1; min-width: 80px; padding: 8px 12px; border-radius: 8px; border: 2px solid var(--border-color); cursor: pointer; text-align: center; background: var(--bg-card); transition: all 0.2s;" onclick="selectMultiSesion('noche')">
                        <input type="radio" name="multi-sesion" value="noche" style="display: none;">
                        <span style="font-size: 13px;">🌙 Noche</span>
                    </label>
                </div>
                <small style="font-size: 11px; color: var(--text-light);">La hora se asigna automáticamente: Mañana 10:00, Tarde 15:00, Noche 19:00</small>
            </div>
            
            <div class="form-group" style="margin-bottom: 12px;">
                <label style="font-size: 12px;">📝 Notas (opcional)</label>
                <textarea id="multi-notes" class="input-textarea" rows="2" placeholder="Ej: Reserva semanal"></textarea>
            </div>
            
            <div style="background: #f0f9ff; padding: 12px; border-radius: 8px; border: 2px solid #3b82f6; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h4 style="margin: 0; font-size: 14px; color: #3b82f6;">📋 Vista previa</h4>
                    <button onclick="actualizarVistaPrevia()" class="btn secondary" style="padding: 2px 10px; font-size: 11px; width: auto;">
                        🔄 Actualizar
                    </button>
                </div>
                <div id="multi-preview" style="font-size: 13px; max-height: 200px; overflow-y: auto;">
                    <p style="color: var(--text-light); text-align: center; font-size: 12px;">
                        Selecciona el patrón y los productos para ver la vista previa
                    </p>
                </div>
            </div>
            
            <div id="multi-summary" style="background: var(--bg); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 12px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                    <span>📅 Pedidos a crear:</span>
                    <strong id="multi-count">0</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 2px 0; border-top: 1px solid var(--border-color); margin-top: 4px; padding-top: 4px;">
                    <span>💰 Monto total:</span>
                    <strong id="multi-total" style="color: #10b981;">$0.00</strong>
                </div>
            </div>
            
            <div style="display: flex; gap: 8px;">
                <button type="button" onclick="closeMultiOrderModal()" class="btn secondary" style="flex: 1;">
                    ❌ Cancelar
                </button>
                <button type="button" onclick="submitMultiOrderForm()" class="btn primary" id="multi-submit-btn" style="flex: 2; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;" disabled>
                    ✅ Crear pedidos
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelectorAll('.multi-dia-semana').forEach(label => {
        label.addEventListener('click', function(e) {
            e.preventDefault();
            const checkbox = this.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            this.style.borderColor = checkbox.checked ? '#3b82f6' : 'var(--border-color)';
            this.style.background = checkbox.checked ? '#3b82f615' : 'var(--bg-card)';
            this.style.fontWeight = checkbox.checked ? '600' : 'normal';
            onMultiPatronChange();
        });
    });
    
    modal.querySelectorAll('.multi-dia-excluido').forEach(label => {
        label.addEventListener('click', function(e) {
            e.preventDefault();
            const checkbox = this.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            this.style.borderColor = checkbox.checked ? '#ef4444' : 'var(--border-color)';
            this.style.background = checkbox.checked ? '#ef444415' : 'var(--bg-card)';
            this.style.fontWeight = checkbox.checked ? '600' : 'normal';
            this.style.color = checkbox.checked ? '#ef4444' : 'inherit';
            onMultiPatronChange();
        });
    });
    
    modal.querySelectorAll('.multi-paridad-option').forEach(label => {
        label.addEventListener('click', function(e) {
            e.preventDefault();
            const paridad = this.dataset.paridad;
            
            modal.querySelectorAll('.multi-paridad-option').forEach(l => {
                const radio = l.querySelector('input[type="radio"]');
                if (l.dataset.paridad === paridad) {
                    radio.checked = true;
                    l.style.borderColor = '#8b5cf6';
                    l.style.background = '#8b5cf615';
                    l.style.fontWeight = '600';
                } else {
                    radio.checked = false;
                    l.style.borderColor = 'var(--border-color)';
                    l.style.background = 'var(--bg)';
                    l.style.fontWeight = 'normal';
                }
            });
            
            onMultiPatronChange();
        });
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeMultiOrderModal();
    });
    
    setTimeout(() => actualizarVistaPrevia(), 100);
}

// ============================================================
// HELPERS DE RESERVA POR PERÍODO
// ============================================================

function selectPatronType(tipo) {
    window._multiOrderState.patron.tipo = tipo;
    
    document.querySelectorAll('.multi-patron-option').forEach(label => {
        const radio = label.querySelector('input[type="radio"]');
        if (radio.value === tipo) {
            radio.checked = true;
            label.style.borderColor = '#8b5cf6';
            label.style.background = '#8b5cf615';
            label.style.fontWeight = '600';
        } else {
            radio.checked = false;
            label.style.borderColor = 'var(--border-color)';
            label.style.background = 'var(--bg-card)';
            label.style.fontWeight = 'normal';
        }
    });
    
    const diasSemanaDiv = document.getElementById('multi-dias-semana');
    const diasEspDiv = document.getElementById('multi-dias-especificos');
    const paridadDiv = document.getElementById('multi-paridad-container');
    const exclusionDiv = document.getElementById('multi-exclusion-container');
    
    if (diasSemanaDiv) diasSemanaDiv.style.display = tipo === 'semana' ? 'block' : 'none';
    if (diasEspDiv) diasEspDiv.style.display = tipo === 'especificos' ? 'block' : 'none';
    if (paridadDiv) paridadDiv.style.display = tipo === 'rango' ? 'block' : 'none';
    
    if (exclusionDiv) {
        exclusionDiv.style.display = tipo === 'rango' ? 'block' : 'none';
    }
    
    if (tipo !== 'rango') {
        limpiarDiasExcluidos();
    }
    
    onMultiPatronChange();
}

function selectMultiSesion(sesion) {
    window._multiOrderState.sesion = sesion;
    
    document.querySelectorAll('.multi-sesion-option').forEach(label => {
        const radio = label.querySelector('input[type="radio"]');
        if (radio.value === sesion) {
            radio.checked = true;
            const colors = { manana: '#10b981', tarde: '#f59e0b', noche: '#92400e' };
            label.style.borderColor = colors[sesion];
            label.style.background = colors[sesion] + '15';
            label.style.fontWeight = '600';
        } else {
            radio.checked = false;
            label.style.borderColor = 'var(--border-color)';
            label.style.background = 'var(--bg-card)';
            label.style.fontWeight = 'normal';
        }
    });
    
    onMultiPatronChange();
}

// ============================================================
// HELPERS DE EXCLUSIÓN DE DÍAS
// ============================================================

function selectDiasExcluidos(dias) {
    if (!Array.isArray(dias)) return;
    
    const set = new Set(dias.map(d => parseInt(d)));
    
    document.querySelectorAll('.multi-dia-excluido').forEach(label => {
        const dia = parseInt(label.dataset.dia);
        const checkbox = label.querySelector('input[type="checkbox"]');
        if (!checkbox) return;
        
        const marcar = set.has(dia);
        checkbox.checked = marcar;
        label.style.borderColor = marcar ? '#ef4444' : 'var(--border-color)';
        label.style.background = marcar ? '#ef444415' : 'var(--bg-card)';
        label.style.fontWeight = marcar ? '600' : 'normal';
        label.style.color = marcar ? '#ef4444' : 'inherit';
    });
    
    onMultiPatronChange();
}

function limpiarDiasExcluidos() {
    document.querySelectorAll('.multi-dia-excluido').forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        if (!checkbox) return;
        checkbox.checked = false;
        label.style.borderColor = 'var(--border-color)';
        label.style.background = 'var(--bg-card)';
        label.style.fontWeight = 'normal';
        label.style.color = 'inherit';
    });
    
    onMultiPatronChange();
}

function updateExclusionSummary() {
    const summaryEl = document.getElementById('multi-exclusion-summary');
    if (!summaryEl) return;
    
    const checkboxes = document.querySelectorAll('input[name="multi-excluido"]:checked');
    const diasExcluidos = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    if (diasExcluidos.length === 0) {
        summaryEl.innerHTML = '';
        return;
    }
    
    const nombresDias = diasExcluidos
        .sort((a, b) => {
            const orden = [1, 2, 3, 4, 5, 6, 0];
            return orden.indexOf(a) - orden.indexOf(b);
        })
        .map(d => {
            if (typeof window.OrdersModule?.getNombreDiaSemana === 'function') {
                return window.OrdersModule.getNombreDiaSemana(d, true);
            }
            return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d];
        })
        .join(', ');
    
    summaryEl.innerHTML = `🚫 Excluyendo: <strong>${nombresDias}</strong>`;
}

window.selectDiasExcluidos = selectDiasExcluidos;
window.limpiarDiasExcluidos = limpiarDiasExcluidos;
window.updateExclusionSummary = updateExclusionSummary;

// ============================================================
// ON MULTI PATRON CHANGE
// ============================================================

function onMultiPatronChange() {
    const state = window._multiOrderState;
    
    state.patron.fechaInicio = document.getElementById('multi-fecha-inicio')?.value || '';
    state.patron.fechaFin = document.getElementById('multi-fecha-fin')?.value || '';
    
    const checkboxes = document.querySelectorAll('input[name="multi-dia"]:checked');
    state.patron.diasSemana = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    const diasEspInput = document.getElementById('multi-dias-esp');
    if (diasEspInput) {
        const texto = diasEspInput.value.trim();
        state.patron.diasEspecificos = texto 
            ? texto.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 31)
            : [];
    }
    
    const paridadRadio = document.querySelector('input[name="multi-paridad"]:checked');
    state.patron.paridad = paridadRadio ? paridadRadio.value : 'todos';
    
    const excluidosCheckboxes = document.querySelectorAll('input[name="multi-excluido"]:checked');
    state.patron.diasExcluidos = Array.from(excluidosCheckboxes).map(cb => parseInt(cb.value));
    
    updateExclusionSummary();
    
    actualizarVistaPrevia();
}

// ============================================================
// ACTUALIZAR VISTA PREVIA
// ============================================================

async function actualizarVistaPrevia() {
    const state = window._multiOrderState;
    const preview = document.getElementById('multi-preview');
    const countEl = document.getElementById('multi-count');
    const totalEl = document.getElementById('multi-total');
    const submitBtn = document.getElementById('multi-submit-btn');
    
    if (!preview || !countEl || !totalEl) return;
    
    const clientName = document.getElementById('multi-client-name')?.value?.trim() || '';
    
    if (!state.patron.fechaInicio || !state.patron.fechaFin) {
        preview.innerHTML = '<p style="color: var(--text-light); text-align: center; font-size: 12px;">Selecciona fechas de inicio y fin</p>';
        countEl.textContent = '0';
        totalEl.textContent = '$0.00';
        if (submitBtn) submitBtn.disabled = true;
        return;
    }
    
    if (state.items.length === 0) {
        preview.innerHTML = '<p style="color: var(--text-light); text-align: center; font-size: 12px;">Agrega al menos un producto</p>';
        countEl.textContent = '0';
        totalEl.textContent = '$0.00';
        if (submitBtn) submitBtn.disabled = true;
        return;
    }
    
    let fechas = [];
    try {
        fechas = window.OrdersModule.generarFechasPorPatron(state.patron);
    } catch (e) {
        console.error('Error generando fechas:', e);
    }
    
    let infoExclusiones = '';
    if (state.patron.tipo === 'rango' && state.patron.diasExcluidos && state.patron.diasExcluidos.length > 0) {
        const nombres = state.patron.diasExcluidos
            .sort((a, b) => {
                const orden = [1, 2, 3, 4, 5, 6, 0];
                return orden.indexOf(a) - orden.indexOf(b);
            })
            .map(d => {
                if (typeof window.OrdersModule?.getNombreDiaSemana === 'function') {
                    return window.OrdersModule.getNombreDiaSemana(d, true);
                }
                return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d];
            })
            .join(', ');
        
        infoExclusiones = `
            <div style="background: #ef444415; border: 1px solid #ef4444; border-radius: 6px; padding: 6px 10px; margin-bottom: 8px; font-size: 11px; color: #ef4444;">
                🚫 <strong>Excluidos:</strong> ${nombres}
            </div>
        `;
    }
    
    if (fechas.length === 0) {
        preview.innerHTML = `
            ${infoExclusiones}
            <p style="color: var(--text-light); text-align: center; font-size: 12px;">El patrón no genera fechas válidas</p>
        `;
        countEl.textContent = '0';
        totalEl.textContent = '$0.00';
        if (submitBtn) submitBtn.disabled = true;
        return;
    }
    
    let duplicados = {};
    if (clientName) {
        duplicados = window.OrdersModule.verificarPedidosDuplicados(clientName, fechas);
    }
    
    const totalPorPedido = state.items.reduce((sum, item) => sum + (item.quantity * (item.unit_price || 0)), 0);
    
    let creadosCount = 0;
    let omitidosCount = 0;
    
    let previewHtml = '';
    
    const fmt = window.formatearCantidadProduccion || (v => String(v));
    
    fechas.forEach(fecha => {
        const fechaObj = new Date(fecha + 'T00:00:00');
        const diaSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][fechaObj.getDay()];
        const diaMes = fechaObj.getDate();
        const mes = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][fechaObj.getMonth()];
        
        const duplicadoId = duplicados[fecha];
        const tieneCorriente = window.CorrienteUtils 
            ? window.CorrienteUtils.getResumen(fecha).tieneCorriente 
            : true;
        
        const prodInfo = getProduccionInfo(fecha);
        const produccionCompleta = prodInfo.tieneProduccion && prodInfo.disponibles <= 0;
        
        let borderColor = '#10b981';
        let bgColor = '#10b98110';
        let icono = '✅';
        let textoExtra = '';
        
        if (duplicadoId) {
            borderColor = '#ef4444';
            bgColor = '#ef444410';
            icono = '🚫';
            textoExtra = `<span style="color: #ef4444; font-weight: 600;">Ya existe pedido #${duplicadoId}</span>`;
            omitidosCount++;
        } else if (produccionCompleta) {
            borderColor = '#dc2626';
            bgColor = '#dc262610';
            icono = '⛔';
            textoExtra = `<span style="color: #dc2626; font-weight: 600;">Completo (${prodInfo.pedidos}/${fmt(prodInfo.cantidadProduccion)})</span>`;
            omitidosCount++;
        } else {
            creadosCount++;
            
            if (!tieneCorriente) {
                borderColor = '#f59e0b';
                bgColor = '#f59e0b10';
                icono = '⚠️';
                textoExtra = `<span style="color: #f59e0b;">🌙 Sin corriente</span>`;
            } else if (window.CorrienteUtils) {
                const resumen = window.CorrienteUtils.getResumen(fecha);
                textoExtra = `<span style="color: #f59e0b;">⚡ ${resumen.numBloques} bloque${resumen.numBloques > 1 ? 's' : ''}</span>`;
            }
            
            if (prodInfo.tieneProduccion) {
                const prodBadge = prodInfo.esBloqueDiaAnterior 
                    ? `🌙 ${prodInfo.pedidos}/${fmt(prodInfo.cantidadProduccion)}` 
                    : `🔨 ${prodInfo.pedidos}/${fmt(prodInfo.cantidadProduccion)}`;
                textoExtra += ` <span style="color: #8b5cf6;">${prodBadge}</span>`;
            }
        }
        
        previewHtml += `
            <div style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: ${bgColor}; border-radius: 6px; margin-bottom: 4px; border-left: 3px solid ${borderColor};">
                <span style="font-size: 14px;">${icono}</span>
                <span style="flex: 1; font-size: 12px; font-weight: 600;">${diaSemana} ${diaMes} ${mes}</span>
                <span style="font-size: 11px;">${textoExtra}</span>
            </div>
        `;
    });
    
    preview.innerHTML = `
        ${infoExclusiones}
        <div style="margin-bottom: 8px; font-size: 12px;">
            <span style="background: #10b98120; color: #10b981; padding: 2px 8px; border-radius: 10px; margin-right: 6px;">✅ ${creadosCount} se crearán</span>
            ${omitidosCount > 0 ? `<span style="background: #ef444420; color: #ef4444; padding: 2px 8px; border-radius: 10px;">🚫 ${omitidosCount} omitidos</span>` : ''}
        </div>
        ${previewHtml}
    `;
    
    countEl.textContent = creadosCount;
    totalEl.textContent = `$${(totalPorPedido * creadosCount).toFixed(2)}`;
    
    if (submitBtn) {
        submitBtn.disabled = creadosCount === 0;
        if (creadosCount > 0) {
            submitBtn.textContent = `✅ Crear ${creadosCount} pedidos`;
        } else {
            submitBtn.textContent = '⚠️ Nada que crear';
        }
    }
}

// ============================================================
// MODAL PARA AGREGAR PRODUCTO EN RESERVA POR PERÍODO
// ============================================================

function showMultiAddProductModal() {
    const existingModal = document.getElementById('multi-add-product-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'multi-add-product-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: ${ORDERS_MODAL_Z_INDEX}; padding: 20px;
    `;
    
    const loadProductos = async () => {
        const productos = await window.OrdersModule.getProductos();
        
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 400px; width: 100%;">
                <h2 style="margin: 0 0 16px 0;">➕ Agregar Producto</h2>
                
                <form id="multi-add-product-form" style="display: flex; flex-direction: column; gap: 12px;">
                    <div class="form-group">
                        <label>🏷️ Producto</label>
                        <select id="multi-add-product-select" style="padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text); width: 100%;">
                            <option value="">Seleccionar producto...</option>
                            ${productos.map(p => `
                                <option value="${p.id}" data-precio="${p.precio_venta}" data-receta="${p.receta_id || ''}">
                                    ${p.nombre} - $${p.precio_venta} (${p.unidad_venta})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group">
                            <label>📦 Cantidad</label>
                            <input type="number" id="multi-add-product-quantity" class="input-field" value="1" step="0.1" min="0.1" required>
                        </div>
                        <div class="form-group">
                            <label>💰 Precio</label>
                            <input type="number" id="multi-add-product-price" class="input-field" value="0" step="0.01" min="0" required>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button type="submit" class="btn primary" style="flex: 1;">✅ Agregar</button>
                        <button type="button" onclick="closeMultiAddProductModal()" class="btn secondary" style="flex: 1;">❌ Cancelar</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const select = document.getElementById('multi-add-product-select');
        const priceInput = document.getElementById('multi-add-product-price');
        select.onchange = function() {
            const selected = this.options[this.selectedIndex];
            const precio = selected?.dataset?.precio || 0;
            if (priceInput) priceInput.value = precio;
        };
        
        const form = document.getElementById('multi-add-product-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const select = document.getElementById('multi-add-product-select');
            const productoId = parseInt(select.value);
            const productoName = select.options[select.selectedIndex]?.text?.split(' - ')[0] || '';
            const quantity = parseFloat(document.getElementById('multi-add-product-quantity').value) || 0;
            const price = parseFloat(document.getElementById('multi-add-product-price').value) || 0;
            const recetaId = select.options[select.selectedIndex]?.dataset?.receta || '';
            
            if (!productoId) {
                window.showToast('⚠️ Selecciona un producto', 'error');
                return;
            }
            
            addMultiItemToList(productoId, productoName, quantity, price, recetaId);
            closeMultiAddProductModal();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeMultiAddProductModal();
        });
    };
    
    loadProductos();
}

function addMultiItemToList(productoId, productName, quantity, unitPrice, recetaId) {
    const state = window._multiOrderState;
    
    state.items.push({
        producto_id: productoId,
        product_name: productName,
        receta_id: recetaId || null,
        quantity: quantity,
        unit_price: unitPrice
    });
    
    renderMultiItems();
    actualizarVistaPrevia();
}

function renderMultiItems() {
    const container = document.getElementById('multi-items-container');
    if (!container) return;
    
    const state = window._multiOrderState;
    
    if (state.items.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 12px; color: var(--text-light); font-size: 12px;">
                Sin productos agregados
            </div>
        `;
        const totalDisplay = document.getElementById('multi-total-display');
        if (totalDisplay) totalDisplay.textContent = '0.00';
        return;
    }
    
    let total = 0;
    
    container.innerHTML = state.items.map((item, index) => {
        const subtotal = item.quantity * item.unit_price;
        total += subtotal;
        return `
            <div style="display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: var(--bg-card); border-radius: 6px; font-size: 13px;">
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${item.product_name} ${item.receta_id ? '📋' : ''}
                </span>
                <span style="font-size: 12px; color: var(--text-light);">x${item.quantity}</span>
                <span style="font-weight: 600; min-width: 60px; text-align: right;">$${subtotal.toFixed(2)}</span>
                <button type="button" onclick="removeMultiItem(${index})" style="background: none; border: none; font-size: 14px; cursor: pointer; color: #ef4444; padding: 0 4px;">✕</button>
            </div>
        `;
    }).join('');
    
    const totalDisplay = document.getElementById('multi-total-display');
    if (totalDisplay) totalDisplay.textContent = total.toFixed(2);
}

function removeMultiItem(index) {
    const state = window._multiOrderState;
    state.items.splice(index, 1);
    renderMultiItems();
    actualizarVistaPrevia();
}

// ============================================================
// ENVIAR RESERVA POR PERÍODO
// ============================================================

async function submitMultiOrderForm() {
    const state = window._multiOrderState;
    
    const clientName = document.getElementById('multi-client-name')?.value?.trim() || '';
    const clientPhone = document.getElementById('multi-client-phone')?.value?.trim() || '';
    const notes = document.getElementById('multi-notes')?.value?.trim() || '';
    
    if (!clientName) {
        window.showToast('⚠️ El nombre del cliente es obligatorio', 'error');
        return;
    }
    
    if (state.items.length === 0) {
        window.showToast('⚠️ Agrega al menos un producto', 'error');
        return;
    }
    
    const fechas = window.OrdersModule.generarFechasPorPatron(state.patron);
    if (fechas.length === 0) {
        window.showToast('⚠️ El patrón no genera fechas', 'error');
        return;
    }
    
    const duplicados = window.OrdersModule.verificarPedidosDuplicados(clientName, fechas);
    const fechasAProcesar = fechas.filter(f => !duplicados[f]);
    
    if (fechasAProcesar.length === 0) {
        window.showToast('⚠️ Todas las fechas ya tienen pedidos del mismo cliente', 'warning');
        return;
    }
    
    let patronDesc = 'Rango completo';
    if (state.patron.tipo === 'semana') patronDesc = 'Días de la semana';
    else if (state.patron.tipo === 'especificos') patronDesc = 'Días específicos';
    
    if (state.patron.tipo === 'rango' && state.patron.paridad !== 'todos') {
        patronDesc += ` (${state.patron.paridad === 'pares' ? 'solo pares' : 'solo impares'})`;
    }
    
    let exclusionDesc = '';
    if (state.patron.tipo === 'rango' && state.patron.diasExcluidos && state.patron.diasExcluidos.length > 0) {
        const nombres = state.patron.diasExcluidos
            .sort((a, b) => {
                const orden = [1, 2, 3, 4, 5, 6, 0];
                return orden.indexOf(a) - orden.indexOf(b);
            })
            .map(d => {
                if (typeof window.OrdersModule?.getNombreDiaSemana === 'function') {
                    return window.OrdersModule.getNombreDiaSemana(d, true);
                }
                return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d];
            })
            .join(', ');
        exclusionDesc = `\n🚫 Excluyendo: ${nombres}`;
    }
    
    const confirm = await window.ModalModule.showConfirm({
        title: '📅 Confirmar reserva',
        message: `Se crearán ${fechasAProcesar.length} pedido(s) para "${clientName}".\n\nPatrón: ${patronDesc}${exclusionDesc}\n${Object.keys(duplicados).filter(f => duplicados[f]).length > 0 ? `⚠️ Se omitirán ${Object.keys(duplicados).filter(f => duplicados[f]).length} fecha(s) por duplicados.\n\n` : ''}¿Continuar?`,
        confirmText: `✅ SÍ, CREAR ${fechasAProcesar.length}`,
        cancelText: 'Cancelar',
        icon: '📅',
        confirmColor: '#8b5cf6'
    });
    
    if (!confirm) return;
    
    try {
        const result = await window.OrdersModule.crearPedidosMultiples({
            clientName, clientPhone,
            items: state.items,
            patron: state.patron,
            sesion: state.sesion,
            notes,
            fechasExcluidas: Object.keys(duplicados).filter(f => duplicados[f])
        });
        
        if (result.success) {
            let msg = `✅ ${result.totalCreados} pedido${result.totalCreados > 1 ? 's' : ''} creado${result.totalCreados > 1 ? 's' : ''}`;
            if (result.totalOmitidos > 0) msg += ` · ${result.totalOmitidos} omitido${result.totalOmitidos > 1 ? 's' : ''}`;
            if (result.totalErrores > 0) msg += ` · ${result.totalErrores} error${result.totalErrores > 1 ? 'es' : ''}`;
            
            window.showToast(msg, 'success', 5000);
            
            await loadOrders();
            
            if (typeof window.loadDashboardData === 'function') {
                setTimeout(window.loadDashboardData, 500);
            }
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// CIERRE DE MODALES DE RESERVA
// ============================================================

function closeMultiOrderModal() {
    const modal = document.getElementById('multi-order-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
        setTimeout(() => {
            const still = document.getElementById('multi-order-modal');
            if (still && still.parentNode) still.remove();
        }, 500);
    }
    window._multiOrderState = null;
}

function closeMultiAddProductModal() {
    const modal = document.getElementById('multi-add-product-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
        setTimeout(() => {
            const still = document.getElementById('multi-add-product-modal');
            if (still && still.parentNode) still.remove();
        }, 500);
    }
}

// ============================================================
// SESIÓN (formulario individual)
// ============================================================

function selectSesion(sesion) {
    const radios = document.querySelectorAll('input[name="order-sesion"]');
    radios.forEach(r => { r.checked = (r.value === sesion); });
    highlightSesionSelection(sesion);
}

function highlightSesionSelection(sesion) {
    const labels = document.querySelectorAll('.sesion-option');
    const colors = {
        '': { border: 'var(--border-color)', bg: 'var(--bg)' },
        'manana': { border: '#10b981', bg: '#10b98115' },
        'tarde': { border: '#f59e0b', bg: '#f59e0b15' },
        'noche': { border: '#92400e', bg: '#92400e15' }
    };
    
    labels.forEach(label => {
        const radio = label.querySelector('input[name="order-sesion"]');
        if (!radio) return;
        if (radio.value === sesion) {
            label.style.borderColor = colors[sesion]?.border || 'var(--border-color)';
            label.style.background = colors[sesion]?.bg || 'var(--bg)';
            label.style.fontWeight = '600';
        } else {
            label.style.borderColor = 'var(--border-color)';
            label.style.background = 'var(--bg)';
            label.style.fontWeight = 'normal';
        }
    });
}

// ============================================================
// 🆕 v2.2.1: onOrderDateChange con formato de fecha consistente
// ============================================================

function onOrderDateChange() {
    const dateInput = document.getElementById('order-delivery-date');
    const bannerContainer = document.getElementById('order-corriente-banner');
    const prodInfoContainer = document.getElementById('order-produccion-info');
    
    if (!dateInput) return;
    
    const fechaISO = dateInput.value;
    if (!fechaISO) { 
        if (bannerContainer) bannerContainer.innerHTML = ''; 
        if (prodInfoContainer) prodInfoContainer.innerHTML = '';
        return; 
    }
    
    localStorage.setItem('panario_last_delivery_date', fechaISO);
    
    if (bannerContainer) {
        bannerContainer.innerHTML = getBannerCorrienteHTML(fechaISO);
    }
    
    if (prodInfoContainer) {
        const info = getProduccionInfo(fechaISO);
        
        if (!info.tieneProduccion) {
            prodInfoContainer.innerHTML = '';
        } else {
            const disponibles = info.disponibles;
            const fmt = window.formatearCantidadProduccion || (v => String(v));
            const esAyer = info.esBloqueDiaAnterior === true;
            
            let colorDisponible = '#10b981';
            let bgDisponible = '#10b98115';
            let borderColor = '#10b981';
            
            if (disponibles === 0) {
                colorDisponible = '#ef4444';
                bgDisponible = '#ef444415';
                borderColor = '#ef4444';
            } else if (disponibles <= 3) {
                colorDisponible = '#f59e0b';
                bgDisponible = '#f59e0b15';
                borderColor = '#f59e0b';
            }
            
            const tituloProduccion = esAyer
                ? `<span style="font-weight: 700; color: #8b5cf6; font-size: 13px;">🌙 Prod. ayer: ${info.bloqueTexto}</span>`
                : `<span style="font-weight: 700; color: #8b5cf6; font-size: 13px;">🔨 Horario de producción: ${info.bloqueTexto}</span>`;
            
            const iconoProduccion = esAyer ? '🌙' : '🔨';
            
            prodInfoContainer.innerHTML = `
                <div style="background: ${bgDisponible}; border: 2px solid ${esAyer ? '#8b5cf6' : borderColor}; border-radius: 10px; padding: 10px 14px; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                        <span style="font-size: 20px;">${iconoProduccion}</span>
                        ${tituloProduccion}
                    </div>
                    ${esAyer ? `
                        <div style="font-size: 11px; color: #8b5cf6; background: #8b5cf615; padding: 4px 8px; border-radius: 6px; margin-bottom: 6px; border-left: 2px solid #8b5cf6;">
                            💡 Esta producción se hace en el bloque del día anterior (${info.fechaBloqueReal}).
                        </div>
                    ` : ''}
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; font-size: 12px;">
                        <span style="background: var(--bg); padding: 3px 10px; border-radius: 8px;">
                            📋 Pedidos: <strong>${info.pedidos}/${fmt(info.cantidadProduccion)}</strong>
                        </span>
                        ${info.ventas > 0 ? `
                            <span style="background: var(--bg); padding: 3px 10px; border-radius: 8px;">
                                💰 Ventas: <strong>${info.ventas}</strong>
                            </span>
                        ` : ''}
                        <span style="background: ${colorDisponible}20; color: ${colorDisponible}; padding: 3px 10px; border-radius: 8px; font-weight: 700;">
                            ${disponibles === 0 ? '⛔ COMPLETO' : `✅ ${fmt(disponibles)} disponibles`}
                        </span>
                    </div>
                    ${info.notas ? `<div style="font-size: 11px; color: var(--text-light); margin-top: 6px;">📝 ${info.notes || info.notas}</div>` : ''}
                </div>
            `;
        }
    }
}

// ============================================================
// MODAL PARA AGREGAR PRODUCTO (formulario individual)
// ============================================================

function showAddProductModal() {
    const existingModal = document.getElementById('add-product-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'add-product-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: ${ORDERS_MODAL_Z_INDEX}; padding: 20px;
    `;
    
    const loadProductos = async () => {
        const productos = await window.OrdersModule.getProductos();
        
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 400px; width: 100%;">
                <h2 style="margin: 0 0 16px 0;">➕ Agregar Producto</h2>
                
                <form id="add-product-form" style="display: flex; flex-direction: column; gap: 12px;">
                    <div class="form-group">
                        <label>🏷️ Producto</label>
                        <select id="add-product-select" style="padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-input); color: var(--text); width: 100%;">
                            <option value="">Seleccionar producto...</option>
                            ${productos.map(p => `
                                <option value="${p.id}" data-precio="${p.precio_venta}" data-receta="${p.receta_id || ''}">
                                    ${p.nombre} - $${p.precio_venta} (${p.unidad_venta})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group">
                            <label>📦 Cantidad</label>
                            <input type="number" id="add-product-quantity" class="input-field" value="1" step="0.1" min="0.1" required>
                        </div>
                        <div class="form-group">
                            <label>💰 Precio</label>
                            <input type="number" id="add-product-price" class="input-field" value="0" step="0.01" min="0" required>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button type="submit" class="btn primary" style="flex: 1;">✅ Agregar</button>
                        <button type="button" onclick="window.closeAddProductModal()" class="btn secondary" style="flex: 1;">❌ Cancelar</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const select = document.getElementById('add-product-select');
        const priceInput = document.getElementById('add-product-price');
        select.onchange = function() {
            const selected = this.options[this.selectedIndex];
            const precio = selected?.dataset?.precio || 0;
            if (priceInput) priceInput.value = precio;
        };
        
        const form = document.getElementById('add-product-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const select = document.getElementById('add-product-select');
            const productoId = parseInt(select.value);
            const productoName = select.options[select.selectedIndex]?.text || '';
            const quantity = parseFloat(document.getElementById('add-product-quantity').value) || 0;
            const price = parseFloat(document.getElementById('add-product-price').value) || 0;
            const recetaId = select.options[select.selectedIndex]?.dataset?.receta || '';
            
            if (!productoId) { window.showToast('⚠️ Selecciona un producto', 'error'); return; }
            if (quantity <= 0) { window.showToast('⚠️ Cantidad debe ser > 0', 'error'); return; }
            
            addOrderItemToList(productoId, productoName, quantity, price, recetaId);
            window.closeAddProductModal();
            window.showToast(`✅ "${productoName}" agregado al pedido`, 'success');
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) window.closeAddProductModal();
        });
    };
    
    loadProductos();
}

function addOrderItemToList(productoId, productName, quantity, unitPrice, recetaId) {
    const container = document.getElementById('order-items-container');
    if (!container) return;
    
    const emptyMsg = container.querySelector('div[style*="text-align: center; padding: 16px;"]');
    if (emptyMsg) emptyMsg.remove();
    
    const div = document.createElement('div');
    div.className = 'order-item';
    div.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 1fr 30px; gap: 4px; align-items: center; padding: 6px 10px; background: var(--bg); border-radius: 6px; margin-bottom: 4px;';
    div.innerHTML = `
        <span style="font-size: 14px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${productName}
            ${recetaId ? '📋' : ''}
        </span>
        <input type="number" class="item-quantity" value="${quantity}" step="0.1" min="0.1" 
               style="width: 100%; padding: 4px 6px; text-align: center; font-size: 13px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text);">
        <input type="number" class="item-price" value="${unitPrice}" step="0.01" min="0" 
               style="width: 100%; padding: 4px 6px; text-align: center; font-size: 13px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text);">
        <button type="button" onclick="removeOrderItem(this)" style="background: none; border: none; font-size: 16px; cursor: pointer; color: #ef4444; padding: 0;">✕</button>
        <input type="hidden" class="item-producto-id" value="${productoId}">
        <input type="hidden" class="item-receta-id" value="${recetaId}">
        <input type="hidden" class="item-product-name" value="${productName}">
    `;
    container.appendChild(div);
    
    div.querySelectorAll('.item-quantity, .item-price').forEach(el => {
        el.addEventListener('input', window.updateOrderTotal);
    });
    
    window.updateOrderTotal();
}

function removeOrderItem(button) {
    const item = button.closest('.order-item');
    if (item) {
        item.remove();
        window.updateOrderTotal();
        const container = document.getElementById('order-items-container');
        if (container && container.children.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 16px; color: var(--text-light); font-size: 13px;">Sin productos agregados</div>`;
        }
    }
}

function clearOrderItems() {
    const container = document.getElementById('order-items-container');
    if (container) {
        container.innerHTML = `<div style="text-align: center; padding: 16px; color: var(--text-light); font-size: 13px;">Sin productos agregados</div>`;
        window.updateOrderTotal();
    }
}

// ============================================================
// ENVIAR FORMULARIO INDIVIDUAL
// ============================================================

async function submitOrderForm(isEdit) {
    const clientNameInput = document.getElementById('order-client-name');
    const clientPhoneInput = document.getElementById('order-client-phone');
    const deliveryDateInput = document.getElementById('order-delivery-date');
    const statusInput = document.getElementById('order-status');
    const priorityInput = document.getElementById('order-priority');
    const notesInput = document.getElementById('order-notes');
    const advancePaymentInput = document.getElementById('order-advance-payment');
    const advanceAmountInput = document.getElementById('order-advance-amount');
    const advancePaymentMethodInput = document.getElementById('order-advance-payment-method');
    
    const clientName = clientNameInput.value.trim();
    const clientPhone = clientPhoneInput.value.trim();
    const deliveryDateRaw = deliveryDateInput.value;
    const status = statusInput.value;
    const priority = priorityInput.value;
    const notes = notesInput.value.trim();
    const hasAdvancePayment = advancePaymentInput.checked;
    const advanceAmount = parseFloat(advanceAmountInput.value) || 0;
    const advancePaymentMethod = advancePaymentMethodInput.value;
    
    let session = '';
    const sesionRadio = document.querySelector('input[name="order-sesion"]:checked');
    if (sesionRadio) session = sesionRadio.value || null;
    
    if (deliveryDateRaw) localStorage.setItem('panario_last_delivery_date', deliveryDateRaw);
    
    if (!clientName) { window.showToast('⚠️ El nombre del cliente es obligatorio', 'error'); return; }
    if (!deliveryDateRaw) { window.showToast('⚠️ La fecha de entrega es obligatoria', 'error'); return; }
    if (hasAdvancePayment && advanceAmount <= 0) { window.showToast('⚠️ Monto adelanto > 0', 'error'); return; }
    
    if (!isEdit) {
        const prodInfo = getProduccionInfo(deliveryDateRaw);
        const fmt = window.formatearCantidadProduccion || (v => String(v));
        
        if (prodInfo.tieneProduccion && prodInfo.disponibles <= 0) {
            await window.ModalModule.showAlert({
                title: '⛔ Pedidos completos',
                message: `Los pedidos para el ${deliveryDateRaw} están completos.\n\n` +
                         `📋 Pedidos reservados: ${prodInfo.pedidos}/${fmt(prodInfo.cantidadProduccion)}\n` +
                         (prodInfo.ventas > 0 ? `💰 Ventas directas: ${prodInfo.ventas}\n` : '') +
                         `\nNo hay cupos disponibles para este día.\n\n` +
                         `💡 Puedes:\n` +
                         `• Elegir otra fecha\n` +
                         `• Pedirle al admin que aumente la producción`,
                icon: '⛔',
                type: 'warning',
                buttonText: 'Entendido'
            });
            return;
        }
    }
    
    const itemElements = document.querySelectorAll('.order-item');
    const items = [];
    let total = 0;
    
    itemElements.forEach(el => {
        const productoId = parseInt(el.querySelector('.item-producto-id')?.value) || null;
        const productName = el.querySelector('.item-product-name')?.value || '';
        const recetaId = el.querySelector('.item-receta-id')?.value || null;
        const quantity = parseFloat(el.querySelector('.item-quantity')?.value) || 0;
        const unitPrice = parseFloat(el.querySelector('.item-price')?.value) || 0;
        if ((productoId || productName) && quantity > 0) {
            items.push({
                producto_id: productoId, product_name: productName,
                receta_id: recetaId || null, quantity, unit_price: unitPrice
            });
            total += quantity * unitPrice;
        }
    });
    
    if (items.length === 0) { window.showToast('⚠️ Agrega al menos un producto', 'error'); return; }
    
    let clientId = null;
    if (isEdit) {
        const originalNameInput = document.getElementById('order-original-client-name');
        const originalIdInput = document.getElementById('order-original-client-id');
        const originalName = (originalNameInput?.value || '').trim().toLowerCase();
        const originalId = originalIdInput?.value || '';
        const newName = clientName.trim().toLowerCase();
        
        if (originalName === newName) {
            clientId = originalId || null;
        } else {
            clientId = null;
        }
    }
    
    const deliveryDate = window.normalizarFechaVenta(deliveryDateRaw);
    
    const orderData = {
        client_name: clientName, 
        client_phone: clientPhone || null,
        client_id: clientId,
        delivery_date: deliveryDate,
        status, 
        priority: priority || 'normal',
        notes: notes || null, 
        session, 
        items, 
        total,
        has_advance_payment: hasAdvancePayment,
        advance_amount: hasAdvancePayment ? advanceAmount : 0,
        advance_payment_method: hasAdvancePayment ? advancePaymentMethod : null
    };
    
    const orderIdInput = document.getElementById('order-id');
    if (orderIdInput) orderData.id = parseInt(orderIdInput.value);
    
    try {
        const result = await window.OrdersModule.saveOrder(orderData);
        if (result.success) {
            window.closeOrderModal();
            window.showToast(`✅ Pedido ${result.updated ? 'actualizado' : 'guardado'} correctamente`, 'success');
            await loadOrders();
            if (typeof window.loadDashboardData === 'function') setTimeout(window.loadDashboardData, 500);
        } else {
            window.showToast('❌ Error: ' + result.error, 'error');
        }
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// VER PEDIDO EN DETALLE
// 🆕 v2.2.1: producción del día anterior con fecha real
// 🆕 v2.2.6: dos botones "Entregar (sin deuda)" y "Entregar (con deuda)"
// ============================================================

async function viewOrder(id) {
    try {
        const order = await window.OrdersModule.getOrder(id);
        if (!order) { window.showToast('❌ Pedido no encontrado', 'error'); return; }
        
        const permisos = checkOrderPermission(order);
        const bloqueado = !permisos.puede;
        
        const editModal = document.getElementById('order-modal');
        if (editModal) editModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'order-view-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            z-index: ${ORDERS_MODAL_Z_INDEX}; padding: 20px;
        `;
        
        const statusIcons = {
            'pending': '⏳', 'confirmed': '✅', 'production': '🔨',
            'ready': '📦', 'delivered': '🚚', 'cancelled': '❌',
            'waiting': '⏰', 'waiting_bought': '🔄'
        };
        const statusColors = {
            'pending': '#f59e0b', 'confirmed': '#3b82f6', 'production': '#8b5cf6',
            'ready': '#10b981', 'delivered': '#06b6d4', 'cancelled': '#ef4444',
            'waiting': '#f59e0b', 'waiting_bought': '#8b5cf6'
        };
        const statusLabels = {
            'pending': '⏳ Pendiente', 'confirmed': '✅ Confirmado', 'production': '🔨 En producción',
            'ready': '📦 Listo', 'delivered': '🚚 Entregado', 'cancelled': '❌ Cancelado',
            'waiting': '⏰ En lista de espera', 'waiting_bought': '🔄 Compro por lista'
        };
        
        const nombreCliente = order.client_name || order.client_name_full || 'Sin nombre';
        
        const totalPaid = order.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const remaining = order.total - totalPaid;
        const fechaEntregaLarga = formatearFechaLarga(order.delivery_date);
        const sesionBadge = order.session ? getBadgeSesion(order.session) : '';
        const corrienteSection = getSeccionCorrienteHTML(order.delivery_date.split('T')[0]);
        const auditoriaSection = renderAuditoriaHTML(order);
        
        const prodInfo = getProduccionInfo(order.delivery_date.split('T')[0]);
        const fmt = window.formatearCantidadProduccion || (v => String(v));
        
        let produccionSection = '';
        if (prodInfo.tieneProduccion) {
            const esAyer = prodInfo.esBloqueDiaAnterior === true;
            
            produccionSection = `
                <div style="background: linear-gradient(135deg, #8b5cf615 0%, #8b5cf608 100%); border: ${esAyer ? '2px dashed' : '1px solid'} #8b5cf6; border-radius: 8px; padding: 10px 12px; margin: 10px 0;">
                    <div style="font-size: 13px; font-weight: 600; color: #8b5cf6; margin-bottom: 4px;">
                        ${esAyer 
                            ? `🌙 Prod. ayer: ${prodInfo.bloqueTexto}` 
                            : `🔨 Horario de producción: ${prodInfo.bloqueTexto}`
                        }
                    </div>
                    ${esAyer ? `
                        <div style="font-size: 11px; color: #8b5cf6; background: #8b5cf615; padding: 3px 8px; border-radius: 6px; margin-bottom: 4px; border-left: 2px solid #8b5cf6; font-style: italic;">
                            📅 Bloque real: ${prodInfo.fechaBloqueReal}
                        </div>
                    ` : ''}
                    <div style="font-size: 12px; color: var(--text-light);">
                        📋 Pedidos: ${prodInfo.pedidos}/${fmt(prodInfo.cantidadProduccion)}
                        ${prodInfo.notas ? ` · 📝 ${prodInfo.notas}` : ''}
                    </div>
                </div>
            `;
        }
        
        let avisoBloqueo = '';
        if (bloqueado) {
            const recetasList = permisos.recetasBloqueadas && permisos.recetasBloqueadas.length > 0
                ? permisos.recetasBloqueadas.map(r => `• ${r.nombre}`).join('\n')
                : '';
            
            avisoBloqueo = `
                <div style="background: #ef444415; border: 2px solid #ef4444; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px;">
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <span style="font-size: 24px; flex-shrink: 0;">🔒</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 700; color: #ef4444; font-size: 14px; margin-bottom: 4px;">
                                Solo lectura
                            </div>
                            <div style="font-size: 12px; color: var(--text); line-height: 1.5;">
                                ${permisos.razon}
                            </div>
                            ${recetasList ? `
                                <div style="margin-top: 8px; padding: 6px 10px; background: var(--bg-card); border-radius: 6px; font-size: 11px; color: var(--text-light); white-space: pre-line;">
                                    <strong style="color: #ef4444;">Recetas bloqueadas:</strong>
                                    ${recetasList}
                                </div>
                            ` : ''}
                            <div style="margin-top: 8px; font-size: 11px; color: var(--text-light); font-style: italic;">
                                💡 Pídele al administrador que comparta las recetas con el negocio para poder procesar este pedido.
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        let statusButtons = '';
        const currentStatus = order.status;
        
        if (!bloqueado && currentStatus !== 'cancelled' && currentStatus !== 'delivered' && currentStatus !== 'waiting_bought') {
            const statusOptions = [
                { value: 'confirmed', label: '✅ Confirmar', color: 'primary' },
                { value: 'production', label: '🔨 Producción', color: 'secondary' },
                { value: 'ready', label: '📦 Listo', color: 'secondary' },
                { value: 'delivered', label: '🚚 Entregado', color: 'success' }
            ];
            const statusOrder = ['pending', 'confirmed', 'production', 'ready', 'delivered'];
            const currentIndex = statusOrder.indexOf(currentStatus);
            
            statusButtons = statusOptions
                .filter(opt => statusOrder.indexOf(opt.value) > currentIndex)
                .map(opt => {
                    if (opt.value === 'delivered') {
                        return '';
                    }
                    const btnClass = opt.color === 'primary' ? 'btn primary' : 
                                    opt.color === 'success' ? 'btn success' : 'btn secondary';
                    return `<button onclick="updateOrderStatusAndReload(${order.id}, '${opt.value}')" class="${btnClass}" style="padding: 6px 16px; font-size: 13px; width: auto;">${opt.label}</button>`;
                }).join('');
        }
        
        let waitingButtons = '';
        let waitingPositionInfo = '';
        
        if (!bloqueado) {
            if (currentStatus === 'waiting' && order.waiting_list) {
                waitingPositionInfo = `<div style="width: 100%; padding: 8px 12px; background: #f59e0b20; border-radius: 6px; margin-bottom: 8px; font-size: 13px; color: #f59e0b; text-align: center; font-weight: 600;">⏰ Posición #${order.waiting_list.position} en lista de espera</div>`;
            }
            
            if (currentStatus !== 'waiting' && currentStatus !== 'waiting_bought' && currentStatus !== 'delivered' && currentStatus !== 'cancelled') {
                waitingButtons = `<button onclick="updateOrderStatusAndReload(${order.id}, 'waiting')" class="btn secondary" style="padding: 6px 16px; font-size: 13px; width: auto; background: #f59e0b; color: #fff; border: none; border-radius: 6px; cursor: pointer;">⏰ Lista de espera</button>`;
            }
        }
        
        let attendButton = '';
        if (!bloqueado && currentStatus === 'waiting') {
            attendButton = `
                ${waitingPositionInfo}
                <button onclick="updateOrderStatusAndReload(${order.id}, 'waiting_bought')" class="btn success" style="padding: 6px 16px; font-size: 13px; width: auto; background: #8b5cf6; color: #fff; border: none; border-radius: 6px; cursor: pointer; width: 100%;">🛒 Atender (Compro por lista de espera)</button>
                <button onclick="updateOrderStatusAndReload(${order.id}, 'cancelled')" class="btn danger" style="padding: 6px 16px; font-size: 13px; width: auto; margin-top: 4px;">❌ Cancelar y eliminar de lista</button>
            `;
        }
        
        let deliverButtons = '';
        if (!bloqueado && currentStatus !== 'delivered' && currentStatus !== 'waiting_bought' && currentStatus !== 'cancelled') {
            deliverButtons = `
                <div style="display: flex; gap: 8px; flex-wrap: wrap; width: 100%; padding: 8px 12px; background: linear-gradient(135deg, #10b98110 0%, #f59e0b10 100%); border-radius: 10px; border: 1px dashed #10b981;">
                    <div style="width: 100%; font-size: 12px; font-weight: 700; color: var(--text-light); text-align: center; margin-bottom: 4px;">
                        🚚 ¿Cómo deseas entregar el pedido?
                    </div>
                    <button onclick="event.stopPropagation(); updateOrderStatusAndReload(${order.id}, 'delivered', true)" 
                            class="btn success" 
                            style="flex: 1; min-width: 140px; padding: 10px 14px; font-size: 13px; background: linear-gradient(135deg, #059669, #10b981); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; box-shadow: 0 3px 10px rgba(16, 185, 129, 0.35);">
                        ✅ Entregar (sin deuda)
                        <br><small style="font-weight: 400; font-size: 10px; opacity: 0.9;">El cliente paga al momento</small>
                    </button>
                    <button onclick="event.stopPropagation(); updateOrderStatusAndReload(${order.id}, 'delivered', false)" 
                            class="btn warning" 
                            style="flex: 1; min-width: 140px; padding: 10px 14px; font-size: 13px; background: linear-gradient(135deg, #d97706, #f59e0b); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; box-shadow: 0 3px 10px rgba(245, 158, 11, 0.35);">
                        🚚 Entregar (con deuda)
                        <br><small style="font-weight: 400; font-size: 10px; opacity: 0.9;">Queda pendiente de pago</small>
                    </button>
                </div>
            `;
        }
        
        modal.innerHTML = `
            <div style="background: var(--bg-card); border-radius: var(--radius); padding: 24px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h2 style="margin: 0;">📋 Pedido #${order.id} ${bloqueado ? '🔒' : ''}</h2>
                    <button onclick="window.closeOrderViewModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); padding: 0 4px;">✕</button>
                </div>
                
                ${avisoBloqueo}
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 14px;">
                    <div><strong>Cliente:</strong></div><div>${nombreCliente}</div>
                    ${order.client_phone ? `<div><strong>Teléfono:</strong></div><div>${order.client_phone}</div>` : ''}
                    <div><strong>Fecha entrega:</strong></div><div>📅 ${fechaEntregaLarga}</div>
                    <div><strong>Estado:</strong></div>
                    <div><span style="color: ${statusColors[order.status]}; background: ${statusColors[order.status]}20; padding: 2px 10px; border-radius: 12px;">${statusIcons[order.status]} ${statusLabels[order.status] || order.status}</span></div>
                    ${order.session ? `<div><strong>Sesión:</strong></div><div>${sesionBadge}</div>` : ''}
                    <div><strong>Prioridad:</strong></div><div>${order.priority === 'urgent' ? '🔴 Urgente' : 'Normal'}</div>
                    <div><strong>Total:</strong></div><div style="font-weight: 700; color: var(--primary);">$${parseFloat(order.total).toFixed(2)}</div>
                    ${order.has_advance_payment ? `<div><strong>💰 Adelanto:</strong></div><div>$${parseFloat(order.advance_amount || 0).toFixed(2)} (${order.advance_payment_method || 'cash'})</div>` : ''}
                    ${totalPaid > 0 ? `<div><strong>💳 Pagado:</strong></div><div>$${totalPaid.toFixed(2)}</div><div><strong>💳 Saldo:</strong></div><div style="color: ${remaining > 0 ? '#ef4444' : '#10b981'};">$${remaining.toFixed(2)}</div>` : ''}
                </div>
                
                ${corrienteSection}
                ${produccionSection}
                
                <hr>
                
                <h3 style="margin: 12px 0 8px;">🛒 Productos</h3>
                ${order.items && order.items.length > 0 ? `
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        ${order.items.map(item => `
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border-color); font-size: 14px;">
                                <span>${item.producto_nombre || item.product_name}</span>
                                <span>${item.quantity} × $${item.unit_price.toFixed(2)} = $${item.subtotal.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div style="display: flex; justify-content: space-between; padding-top: 8px; font-weight: 700; font-size: 16px; border-top: 2px solid var(--border-color);">
                        <span>TOTAL</span><span>$${order.total.toFixed(2)}</span>
                    </div>
                ` : '<p style="color: var(--text-light);">Sin productos</p>'}
                
                ${order.notes ? `<hr><h3 style="margin: 12px 0 8px;">📝 Notas</h3><p style="font-size: 14px; color: var(--text-light);">${order.notes}</p>` : ''}
                
                ${auditoriaSection}
                
                <div style="display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap;">
                    ${statusButtons}
                    ${waitingButtons}
                    ${attendButton}
                    ${deliverButtons}
                    ${!bloqueado && currentStatus !== 'cancelled' && currentStatus !== 'delivered' && currentStatus !== 'waiting_bought' && currentStatus !== 'waiting' ? `<button onclick="updateOrderStatusAndReload(${order.id}, 'cancelled')" class="btn danger" style="padding: 6px 16px; font-size: 13px; width: auto;">❌ Cancelar</button>` : ''}
                    ${!bloqueado ? `<button onclick="abrirEdicionDesdeVista(${order.id})" class="btn secondary" style="padding: 6px 16px; font-size: 13px; width: auto;">✏️ Editar</button>` : ''}
                    <button onclick="window.closeOrderViewModal()" class="btn secondary" style="padding: 6px 16px; font-size: 13px; width: auto;">Cerrar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) window.closeOrderViewModal(); });
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

async function abrirEdicionDesdeVista(orderId) {
    const permisos = checkOrderPermission(orderId);
    if (!permisos.puede) {
        window.showToast('🔒 ' + permisos.razon, 'error', 5000);
        return;
    }
    
    window.closeOrderViewModal();
    await new Promise(r => setTimeout(r, 250));
    showOrderForm(orderId);
}

// ============================================================
// 🆕 v2.2.6: updateOrderStatusAndReload AHORA ACEPTA `sinDeuda`
// ============================================================

async function updateOrderStatusAndReload(orderId, status, sinDeuda = false) {
    if (!orderId) { window.showToast('❌ ID no válido', 'error'); return; }
    
    const permisos = checkOrderPermission(orderId);
    if (!permisos.puede) {
        window.showToast('🔒 ' + permisos.razon, 'error', 5000);
        return;
    }
    
    const order = await window.OrdersModule.getOrder(orderId);
    if (!order) { window.showToast('❌ Pedido no encontrado', 'error'); return; }
    
    let confirmTitle = 'Cambiar estado';
    let confirmMsg = `¿Seguro que quieres cambiar el estado del pedido #${orderId} a "${status}"?`;
    let confirmText = 'Sí, cambiar';
    let icon = '📋';
    let confirmColor = 'var(--primary)';
    
    if (status === 'delivered') {
        if (sinDeuda) {
            confirmTitle = '✅ Entregar (sin deuda)';
            confirmMsg = `✅ ¿ENTREGAR el pedido #${orderId} SIN DEUDA?\n\n` +
                         `✅ Se creará la VENTA con pago inmediato.\n` +
                         `✅ El check "Es una deuda" quedará en NO.\n` +
                         `✅ Se cancelará cualquier saldo pendiente.\n` +
                         `⚠️ Se intentará descontar stock (si falla, la venta se creará igual).`;
            confirmText = '✅ SÍ, ENTREGAR SIN DEUDA';
            icon = '✅';
            confirmColor = '#10b981';
        } else {
            confirmTitle = '🚚 Entregar (con deuda)';
            confirmMsg = `🚚 ¿ENTREGAR el pedido #${orderId} CON DEUDA?\n\n` +
                         `⚠️ Se creará la VENTA con deuda pendiente.\n` +
                         `⚠️ El check "Es una deuda" quedará en SÍ.\n` +
                         `⚠️ Podrás cobrarla desde Ventas → Deudas.\n` +
                         `⚠️ Se intentará descontar stock (si falla, la venta se creará igual).`;
            confirmText = '🚚 SÍ, ENTREGAR CON DEUDA';
            icon = '🚚';
            confirmColor = '#f59e0b';
        }
    } else if (status === 'waiting') {
        confirmTitle = '⏰ Lista de espera';
        confirmMsg = `⏰ ¿Poner pedido #${orderId} en LISTA DE ESPERA?`;
        confirmText = '✅ SÍ';
        icon = '⏰';
        confirmColor = '#f59e0b';
    } else if (status === 'waiting_bought') {
        confirmTitle = '🔄 Compró por lista';
        confirmMsg = `🔄 ¿Marcar pedido #${orderId} como COMPRO POR LISTA DE ESPERA?\n\n✅ Se creará la venta.\n✅ Se cancelará la deuda.`;
        confirmText = '✅ SÍ, COMPRÓ';
        icon = '🔄';
        confirmColor = '#8b5cf6';
    } else if (status === 'cancelled') {
        const estabaEnLista = order.status === 'waiting' || order.status === 'waiting_bought';
        const waitingCount = await window.OrdersModule.getWaitingListCount();
        
        if (estabaEnLista || waitingCount > 0) {
            const candidatos = await window.OrdersModule.getWaitingListWithDetails(orderId);
            if (candidatos.length > 0) {
                window.closeOrderViewModal();
                await waitForModalRemoval('order-view-modal', 400);
                
                const cantidadDisponible = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                showWaitingListProcessingModal(order, candidatos, cantidadDisponible);
                return;
            }
        }
        
        confirmTitle = '❌ Cancelar pedido';
        confirmMsg = `❌ ¿CANCELAR pedido #${orderId}?\n\n⚠️ Stock se repondrá.`;
        confirmText = '❌ SÍ, CANCELAR';
        icon = '❌';
        confirmColor = '#ef4444';
    }
    
    const confirm = await window.ModalModule.showConfirm({
        title: confirmTitle,
        message: confirmMsg,
        confirmText: confirmText,
        cancelText: 'Cancelar',
        icon: icon,
        confirmColor: confirmColor
    });
    
    if (!confirm) return;
    
    window.closeOrderViewModal();
    await waitForModalRemoval('order-view-modal', 400);
    
    try {
        window.showToast('⏳ Actualizando...', 'info', 2000);
        const result = await window.OrdersModule.updateOrderStatus(orderId, status, sinDeuda);
        
        if (!result.success) {
            window.showToast('❌ Error: ' + (result.error || 'Desconocido'), 'error', 6000);
            return;
        }
        
        window.showToast(`✅ Estado actualizado a: ${status}${status === 'delivered' ? (sinDeuda ? ' (sin deuda)' : ' (con deuda)') : ''}`, 'success');
        
        if (status === 'delivered' || status === 'waiting_bought') {
            window.showToast('💰 Venta creada automáticamente', 'success', 4000);
        }
        
        // ============================================================
        // 🆕 CORRECCIÓN #13: Refrescar SIEMPRE el badge de lista de espera
        // cuando cambia el estado, porque puede haber entrado o salido
        // de la lista de espera.
        // ============================================================
        if (window.OrdersModule.getWaitingListCount) {
            try {
                const count = await window.OrdersModule.getWaitingListCount();
                updateWaitingBadge(count);
                console.log(`🔄 [updateOrderStatusAndReload] Badge actualizado: ${count} en lista de espera`);
            } catch (e) {
                console.warn('⚠️ Error actualizando badge de lista de espera:', e);
            }
        }
        
        if (result.stockWarning) {
            await mostrarAlertaStockWarning(orderId, result.stockWarning);
        }
        
        await loadOrders();
        
        if (typeof window.loadDashboardData === 'function') {
            setTimeout(window.loadDashboardData, 500);
        }
        
    } catch (error) {
        console.error('❌ Error en updateOrderStatusAndReload:', error);
        window.showToast('❌ Error: ' + error.message, 'error', 6000);
    }
}

// ============================================================
// MODAL DE PROCESAMIENTO DE LISTA DE ESPERA
// ============================================================

function showWaitingListProcessingModal(order, candidatos, cantidadDisponible) {
    const existingModal = document.getElementById('waiting-processing-modal');
    if (existingModal) existingModal.remove();
    
    const candidatosFiltrados = candidatos.filter(c => {
        const permisos = checkOrderPermission(c.order_id);
        return permisos.puede;
    });
    
    const candidatosBloqueados = candidatos.length - candidatosFiltrados.length;
    
    if (candidatosFiltrados.length === 0) {
        window.showToast('🔒 No hay candidatos disponibles que puedas procesar', 'warning', 4000);
        return;
    }
    
    const cantidadTotalCandidatos = candidatosFiltrados.reduce((sum, c) => sum + c.quantity, 0);
    const cabenMultiples = cantidadTotalCandidatos <= cantidadDisponible;
    const usarCheckbox = cabenMultiples && cantidadDisponible > 1;
    
    const modal = document.createElement('div');
    modal.id = 'waiting-processing-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: ${ORDERS_MODAL_Z_INDEX}; padding: 20px;
    `;
    
    const candidatosHtml = candidatosFiltrados.map(c => {
        const cabe = c.quantity <= cantidadDisponible;
        const cabeParcial = !cabe && cantidadDisponible > 0;
        
        let borderColor = '#94a3b8';
        let bgColor = 'var(--bg)';
        let icono = '⏸️';
        
        if (cabe) { borderColor = '#10b981'; bgColor = '#10b98110'; icono = '✅'; }
        else if (cabeParcial) { borderColor = '#f59e0b'; bgColor = '#f59e0b10'; icono = '⚠️'; }
        
        return `
            <div class="waiting-candidato" data-order-id="${c.order_id}" data-quantity="${c.quantity}"
                 style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: ${bgColor}; border-radius: 8px; border-left: 4px solid ${borderColor}; margin-bottom: 6px;">
                <input type="${usarCheckbox ? 'checkbox' : 'radio'}" name="waiting-candidate" class="waiting-checkbox"
                       value="${c.order_id}" data-quantity="${c.quantity}"
                       style="width: 18px; height: 18px; cursor: pointer; accent-color: #f59e0b; flex-shrink: 0;">
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                        <span style="font-size: 12px; background: #f59e0b; color: #fff; padding: 1px 8px; border-radius: 10px; font-weight: 600;">#${c.position}</span>
                        <span style="font-weight: 600; font-size: 14px;">${c.client_name}</span>
                        <span style="font-size: 16px;">${icono}</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-light); margin-top: 2px;">
                        📦 ${c.quantity} unidades de "${c.product_name || 'Producto'}"
                        ${!cabe && cabeParcial ? `<span style="color: #f59e0b; font-weight: 600;"> — parcial: ${cantidadDisponible}</span>` : ''}
                    </div>
                </div>
                <div style="text-align: right; flex-shrink: 0;">
                    <div style="font-size: 14px; font-weight: 700; color: var(--primary);">$${(c.order_total || 0).toFixed(2)}</div>
                </div>
            </div>
        `;
    }).join('');
    
    let infoBloqueados = '';
    if (candidatosBloqueados > 0) {
        infoBloqueados = `
            <div style="background: #94a3b815; border: 1px solid #94a3b8; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; font-size: 12px; color: #94a3b8; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">🔒</span>
                <span>${candidatosBloqueados} candidato(s) oculto(s) por recetas no compartidas contigo.</span>
            </div>
        `;
    }
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: var(--radius); padding: 20px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                <span style="font-size: 32px;">🔔</span>
                <div style="flex: 1;">
                    <h2 style="margin: 0; font-size: 17px; color: #f59e0b;">Procesar lista de espera</h2>
                    <p style="margin: 2px 0 0 0; font-size: 13px; color: var(--text-light);">
                        El pedido #${order.id} (${order.client_name}) tiene <strong>${cantidadDisponible} unidades</strong> disponibles
                    </p>
                </div>
            </div>
            
            ${infoBloqueados}
            
            <div style="background: #fef9e7; border: 1px solid #f59e0b; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; font-size: 12px; color: #92400e;">
                💡 Selecciona los clientes a atender.
                ${!usarCheckbox ? '<br>⚠️ <strong>Solo puedes seleccionar uno</strong>.' : '<br>✅ <strong>Puedes seleccionar varios</strong>.'}
            </div>
            
            <div style="margin-bottom: 12px;">
                <div style="font-size: 12px; font-weight: 600; color: var(--text-label); margin-bottom: 6px;">
                    📋 Candidatos en espera (${candidatosFiltrados.length}):
                </div>
                ${candidatosHtml}
            </div>
            
            <div style="background: var(--bg); padding: 10px 12px; border-radius: 8px; margin-bottom: 14px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                    <span>📦 Cantidad disponible:</span><strong>${cantidadDisponible} unidades</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                    <span>✅ Seleccionados:</span><strong id="waiting-selected-count">0</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 2px 0; border-top: 1px solid var(--border-color); margin-top: 4px; padding-top: 4px;">
                    <span>📊 Total a procesar:</span><strong id="waiting-selected-total" style="color: #10b981;">0 unidades</strong>
                </div>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <button onclick="procesarSeleccionListaEspera(${order.id}, ${cantidadDisponible})" 
                        class="btn primary" style="padding: 12px; font-size: 14px; background: #10b981; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    ✅ Procesar seleccionados
                </button>
                
                <div style="display: flex; gap: 8px;">
                    <button onclick="omitirListaEspera(${order.id})" 
                            class="btn secondary" style="flex: 1; padding: 10px 16px; font-size: 13px;">
                        ⏭️ Omitir y cancelar pedido
                    </button>
                    
                    <button onclick="cancelarOperacionYVolver(${order.id})" 
                            class="btn secondary" style="flex: 1; padding: 10px 16px; font-size: 13px; background: #ef4444; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        ❌ No, cancelar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelectorAll('.waiting-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
            updateWaitingModalCounters(modal, cantidadDisponible);
        });
    });
    
    updateWaitingModalCounters(modal, cantidadDisponible);
}

async function cancelarOperacionYVolver(orderId) {
    const modal = document.getElementById('waiting-processing-modal');
    if (modal) modal.remove();
    
    await waitForModalRemoval('waiting-processing-modal', 400);
    
    window.showToast('❌ Operación cancelada. El pedido conserva su estado original.', 'info', 4000);
    
    setTimeout(async () => {
        if (typeof loadOrders === 'function') {
            await loadOrders();
        }
    }, 600);
}

async function procesarSeleccionListaEspera(orderId, cantidadDisponible) {
    const modal = document.getElementById('waiting-processing-modal');
    if (!modal) return;
    
    const checkboxes = modal.querySelectorAll('.waiting-checkbox:checked');
    if (checkboxes.length === 0) { window.showToast('⚠️ Selecciona al menos un cliente', 'warning'); return; }
    
    const seleccionados = [];
    let totalSeleccionado = 0;
    
    checkboxes.forEach(cb => {
        const orderIdSel = parseInt(cb.value);
        const cantidad = parseFloat(cb.dataset.quantity) || 0;
        const atender = Math.min(cantidad, cantidadDisponible - totalSeleccionado);
        if (atender > 0) {
            seleccionados.push({ order_id: orderIdSel, cantidadAtender: atender, cantidadTotal: cantidad });
            totalSeleccionado += atender;
        }
    });
    
    modal.remove();
    await waitForModalRemoval('waiting-processing-modal', 400);
    
    const confirm = await window.ModalModule.showConfirm({
        title: '⚠️ ¿Cancelar y procesar?',
        message: `Se cancelará el pedido #${orderId} y se procesarán ${seleccionados.length} cliente(s).`,
        confirmText: '✅ SÍ, PROCESAR', cancelText: '❌ Cancelar',
        icon: '🚨', confirmColor: '#10b981'
    });
    
    if (!confirm) {
        const order = await window.OrdersModule.getOrder(orderId);
        const candidatos = await window.OrdersModule.getWaitingListWithDetails(orderId);
        const cantidadDisponibleNueva = order?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        if (candidatos.length > 0) {
            showWaitingListProcessingModal(order, candidatos, cantidadDisponibleNueva);
        }
        return;
    }
    
    try {
        window.showToast('⏳ Procesando...', 'info', 3000);
        const result = await window.OrdersModule.procesarListaEsperaAlCancelar(orderId, seleccionados);
        await window.OrdersModule.updateOrderStatus(orderId, 'cancelled');
        
        if (result.success) {
            window.showToast(`✅ ${result.procesados} pedido(s) procesado(s)`, 'success', 5000);
        }
        
        await loadOrders();
        if (window.OrdersModule.getWaitingListCount) {
            const count = await window.OrdersModule.getWaitingListCount();
            updateWaitingBadge(count);
        }
        if (typeof window.loadDashboardData === 'function') setTimeout(window.loadDashboardData, 500);
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

async function omitirListaEspera(orderId) {
    const modal = document.getElementById('waiting-processing-modal');
    if (modal) modal.remove();
    await waitForModalRemoval('waiting-processing-modal', 400);
    
    const confirm = await window.ModalModule.showConfirm({
        title: '❌ Cancelar sin procesar',
        message: `Se cancelará el pedido #${orderId} sin procesar la lista.`,
        confirmText: 'Sí, cancelar', cancelText: 'Volver',
        icon: '❌', confirmColor: '#ef4444'
    });
    
    if (!confirm) {
        const order = await window.OrdersModule.getOrder(orderId);
        const candidatos = await window.OrdersModule.getWaitingListWithDetails(orderId);
        const cantidadDisponible = order?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        if (candidatos.length > 0) showWaitingListProcessingModal(order, candidatos, cantidadDisponible);
        return;
    }
    
    try {
        await window.OrdersModule.updateOrderStatus(orderId, 'cancelled');
        window.showToast('❌ Pedido cancelado', 'success');
        
        await loadOrders();
        if (window.OrdersModule.getWaitingListCount) {
            const count = await window.OrdersModule.getWaitingListCount();
            updateWaitingBadge(count);
        }
    } catch (error) {
        window.showToast('❌ Error: ' + error.message, 'error');
    }
}

function updateWaitingModalCounters(modal, cantidadDisponible) {
    const checkboxes = modal.querySelectorAll('.waiting-checkbox:checked');
    let totalSeleccionado = 0;
    let seleccionados = 0;
    
    checkboxes.forEach(cb => {
        const qty = parseFloat(cb.dataset.quantity) || 0;
        const atender = Math.min(qty, cantidadDisponible - totalSeleccionado);
        if (atender > 0) { totalSeleccionado += atender; seleccionados++; }
    });
    
    const selectedCountEl = modal.querySelector('#waiting-selected-count');
    const selectedTotalEl = modal.querySelector('#waiting-selected-total');
    if (selectedCountEl) selectedCountEl.textContent = seleccionados;
    if (selectedTotalEl) {
        selectedTotalEl.textContent = `${totalSeleccionado} unidades`;
        selectedTotalEl.style.color = totalSeleccionado > 0 ? '#10b981' : 'var(--text-light)';
    }
}

// ============================================================
// CIERRE DE MODALES CON TIMEOUT DE SEGURIDAD
// ============================================================

window.closeOrderModal = function() {
    const modal = document.getElementById('order-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
        setTimeout(() => {
            const still = document.getElementById('order-modal');
            if (still && still.parentNode) still.remove();
            window._orderFormModal = null;
        }, 500);
    }
};

window.closeOrderViewModal = function() {
    const modal = document.getElementById('order-view-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
        setTimeout(() => {
            const still = document.getElementById('order-view-modal');
            if (still && still.parentNode) still.remove();
        }, 500);
    }
};

window.closeAddProductModal = function() {
    const modal = document.getElementById('add-product-modal');
    if (modal) {
        modal.style.animation = 'modalFadeOut 0.2s ease forwards';
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
        setTimeout(() => {
            const still = document.getElementById('add-product-modal');
            if (still && still.parentNode) still.remove();
        }, 500);
    }
};

// ============================================================
// EXPORTACIÓN
// ============================================================

window.renderOrdersView = renderOrdersView;
window.loadOrders = loadOrders;
window.showOrderForm = showOrderForm;
window.showMultiOrderForm = showMultiOrderForm;
window.viewOrder = viewOrder;
window.updateOrderStatusAndReload = updateOrderStatusAndReload;
window.toggleDayOrders = toggleDayOrders;
window.clearOrderFilters = clearOrderFilters;
window.updateWaitingBadge = updateWaitingBadge;
window.showOrdersReportModal = showOrdersReportModal;
window.onOrderDateChange = onOrderDateChange;
window.selectSesion = selectSesion;
window.highlightSesionSelection = highlightSesionSelection;
window.getDiaSemanaLargo = getDiaSemanaLargo;
window.formatearFechaLarga = formatearFechaLarga;
window.getBadgeCorriente = getBadgeCorriente;
window.getBloquesCorrienteHTML = getBloquesCorrienteHTML;
window.getBannerCorrienteHTML = getBannerCorrienteHTML;
window.getSeccionCorrienteHTML = getSeccionCorrienteHTML;
window.getBadgeSesion = getBadgeSesion;
window.showWaitingListProcessingModal = showWaitingListProcessingModal;
window.procesarSeleccionListaEspera = procesarSeleccionListaEspera;
window.omitirListaEspera = omitirListaEspera;
window.updateWaitingModalCounters = updateWaitingModalCounters;
window.onCurrentMonthChange = onCurrentMonthChange;
window.onOrdersDateChange = onOrdersDateChange;
window.updateMesToggleVisual = updateMesToggleVisual;
window.generateOrdersReportFromForm = generateOrdersReportFromForm;
window.closeOrdersReportModal = closeOrdersReportModal;

window.selectPatronType = selectPatronType;
window.selectMultiSesion = selectMultiSesion;
window.onMultiPatronChange = onMultiPatronChange;
window.actualizarVistaPrevia = actualizarVistaPrevia;
window.showMultiAddProductModal = showMultiAddProductModal;
window.addMultiItemToList = addMultiItemToList;
window.renderMultiItems = renderMultiItems;
window.removeMultiItem = removeMultiItem;
window.submitMultiOrderForm = submitMultiOrderForm;
window.closeMultiOrderModal = closeMultiOrderModal;
window.closeMultiAddProductModal = closeMultiAddProductModal;

window.cancelarOperacionYVolver = cancelarOperacionYVolver;
window.abrirEdicionDesdeVista = abrirEdicionDesdeVista;
window.waitForModalRemoval = waitForModalRemoval;
window.renderAuditoriaHTML = renderAuditoriaHTML;
window.mostrarAlertaStockWarning = mostrarAlertaStockWarning;

window.showWaitingListManagerModal = showWaitingListManagerModal;
window.closeWaitingManagerModal = closeWaitingManagerModal;
window.renderWaitingManagerContent = renderWaitingManagerContent;
window.refrescarListaEsperaUI = refrescarListaEsperaUI;
window.procesarClienteDeListaUI = procesarClienteDeListaUI;
window.cancelarClienteDeListaUI = cancelarClienteDeListaUI;
window.eliminarClienteDeListaUI = eliminarClienteDeListaUI;
window.limpiarListaEsperaUI = limpiarListaEsperaUI;
window.reporteListaEspera = reporteListaEspera;

window.getProduccionInfo = getProduccionInfo;
window.renderProduccionInfoHTML = renderProduccionInfoHTML;

window.checkOrderPermission = checkOrderPermission;
window.renderBadgeSoloLectura = renderBadgeSoloLectura;
window.aplicarBloqueoVisual = aplicarBloqueoVisual;

window.selectDiasExcluidos = selectDiasExcluidos;
window.limpiarDiasExcluidos = limpiarDiasExcluidos;
window.updateExclusionSummary = updateExclusionSummary;

console.log('📦 UI Orders Module v2.2.7 (CORRECCIÓN #19: filtros al hacer clic en tarjetas)');
console.log('   🆕 Novedades v2.2.7:');
console.log('      • renderOrdersView() lee window._pendingOrderFilters');
console.log('      • Aplica filtros a los inputs (fechas, estado, búsqueda)');
console.log('      • Limpia window._pendingOrderFilters después de aplicarlo');
console.log('      • Compatible con navigateWithFilters() de app.js v2.2.3+');
console.log('   ✅ Correcciones incluidas:');
console.log('      • #3: Badge de producción clickeable (v2.2.4)');
console.log('      • #17: Dos botones de entrega "sin/con deuda" (v2.2.6)');
console.log('      • #19: Filtros al hacer clic en tarjetas (v2.2.7)');
console.log('   ✅ Compatibilidad total con versiones anteriores');