// ============================================================
// 📊 REPORTS MODULE - Panario (Generación de reportes PDF)
// v2.2.0 (260926): 🎯 CORRECCIÓN #9 (240926)
//   - ✅ NUEVO: generateProductionScheduleReport()
//     * Reporte de horario de producción con columnas:
//       - Fecha de venta
//       - Producto
//       - Bloque de producción
//       - Cantidad a producir
//       - Horario de porciones y bolear (4h antes del bloque)
//   - ✅ Calcula correctamente el horario de porciones y bolear,
//     teniendo en cuenta cambio de fecha si cruza medianoche
//   - ✅ Filtros por rango de fechas
//   - ✅ Ordenado por fecha de venta ascendente
//   - ✅ Mantiene TODOS los reportes existentes:
//     * Pedidos, Ventas, Gastos, Insumos, Recetas, Lista de espera,
//       Días sin ventas, Corriente
// ============================================================

window.ReportsModule = {};

// ============================================================
// HELPERS DE FORMATO
// ============================================================

function formatearFechaCorta(fechaStr) {
    if (!fechaStr) return '—';
    try {
        const match = String(fechaStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return fechaStr;
        const year = match[1];
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        const mesesCortos = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        return `${String(day).padStart(2, '0')} ${mesesCortos[month - 1]} ${year}`;
    } catch (e) {
        return fechaStr;
    }
}

function formatearFechaLarga(fechaStr) {
    if (!fechaStr) return '—';
    try {
        const match = String(fechaStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return fechaStr;
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const day = parseInt(match[3]);
        const dateObj = new Date(year, month, day);
        const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        return `${dias[dateObj.getDay()]}, ${day} de ${meses[month]} de ${year}`;
    } catch (e) {
        return fechaStr;
    }
}

function formatearMoneda(valor) {
    const num = parseFloat(valor) || 0;
    return `$${num.toFixed(2)}`;
}

function getNombreNegocioReporte() {
    try {
        if (typeof window.getNombreNegocio === 'function') {
            return window.getNombreNegocio();
        }
        const user = window.AuthModule?.getCurrentUser();
        if (user && user.negocio && user.negocio.nombre) {
            return user.negocio.nombre;
        }
        return 'Panario';
    } catch (e) {
        return 'Panario';
    }
}

function getAppVersionReporte() {
    try {
        if (typeof window.getAppVersion === 'function') {
            return window.getAppVersion();
        }
    } catch (e) {}
    return '2.3.1';
}

// ============================================================
// ESTILOS COMUNES PARA REPORTES
// ============================================================

function getReportHeaderStyles(color = '#f5a623') {
    return `
        * { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
        body { padding: 20px; background: #fff; font-size: 13px; color: #2d2d2d; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid ${color}; padding-bottom: 12px; }
        .header h1 { color: ${color}; font-size: 22px; margin-bottom: 4px; }
        .header .negocio { color: #2d2d2d; font-size: 16px; font-weight: 600; margin-top: 4px; }
        .header p { color: #666; font-size: 13px; margin-top: 2px; }
        .summary { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; flex-wrap: wrap; }
        .summary-card { background: #f8f9fa; padding: 10px 16px; border-radius: 8px; text-align: center; border-left: 3px solid ${color}; flex: 1; min-width: 80px; }
        .summary-card .number { font-size: 20px; font-weight: 700; color: ${color}; }
        .summary-card .label { font-size: 10px; color: #666; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
        th { background: ${color}; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 600; }
        td { padding: 6px 10px; border-bottom: 1px solid #eee; font-size: 11px; vertical-align: top; }
        tr:nth-child(even) td { background: #fafafa; }
        .footer { margin-top: 20px; text-align: center; color: #94a3b8; font-size: 10px; border-top: 1px solid #eee; padding-top: 12px; }
        .nota { margin-top: 12px; padding: 10px 12px; background: #fef9e7; border-radius: 6px; border-left: 3px solid ${color}; font-size: 11px; color: #666; line-height: 1.5; }
        .badge { display: inline-block; padding: 1px 8px; border-radius: 8px; font-size: 10px; font-weight: 600; }
        .badge-primary { background: #f5a62320; color: #d4891b; }
        .badge-success { background: #10b98120; color: #059669; }
        .badge-danger { background: #ef444420; color: #dc2626; }
        .badge-warning { background: #f59e0b20; color: #d97706; }
        .badge-info { background: #3b82f620; color: #2563eb; }
        .badge-purple { background: #8b5cf620; color: #7c3aed; }
    `;
}

function getReportFooter() {
    const version = getAppVersionReporte();
    const fecha = new Date().toLocaleString('es-ES');
    return `Reporte generado desde Panario 🍞 v${version} - ${fecha}`;
}

// ============================================================
// 🆕 CORRECCIÓN #9 (240926): CÁLCULO DEL HORARIO DE PORCIONES Y BOLEAR
// ============================================================
// 
// El horario de porciones y bolear es 4 horas antes del INICIO del
// bloque de producción.
// 
// Si el cálculo cruza medianoche, la fecha debe ser del día anterior.
// 
// Ejemplo:
//   Bloque: 24/09 de 2:00 AM a 5:00 AM
//   Porciones: 23/09 a las 10:00 PM (4 horas antes de las 2:00 AM)
// 
// Parámetros:
//   - horaInicioStr: hora de inicio del bloque en formato "HH:MM" (24h)
//   - fechaBloqueReal: fecha real del bloque en formato "YYYY-MM-DD"
// 
// Retorna:
//   { fecha: "YYYY-MM-DD", hora: "HH:MM", horaStr12: "HH:MM AM/PM", texto: "DD/MM a las HH:MM AM/PM" }
// ============================================================

function calcularHorarioPorciones(horaInicioStr, fechaBloqueReal) {
    try {
        if (!horaInicioStr || !fechaBloqueReal) {
            return { fecha: null, hora: null, horaStr12: null, texto: '—' };
        }
        
        // Parsear la hora de inicio (formato "HH:MM" 24h)
        const match = String(horaInicioStr).match(/^(\d{1,2}):(\d{2})$/);
        if (!match) {
            return { fecha: null, hora: null, horaStr12: null, texto: '—' };
        }
        
        let horasInicio = parseInt(match[1]);
        const minutosInicio = parseInt(match[2]);
        
        // Parsear la fecha del bloque
        const fechaMatch = String(fechaBloqueReal).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!fechaMatch) {
            return { fecha: null, hora: null, horaStr12: null, texto: '—' };
        }
        
        const year = parseInt(fechaMatch[1]);
        const month = parseInt(fechaMatch[2]) - 1;
        const day = parseInt(fechaMatch[3]);
        
        // Crear objeto Date con la fecha y hora del bloque
        const fechaBloque = new Date(year, month, day, horasInicio, minutosInicio, 0);
        
        // Restar 4 horas
        const fechaPorciones = new Date(fechaBloque.getTime() - (4 * 60 * 60 * 1000));
        
        // Extraer fecha y hora
        const porcionesYear = fechaPorciones.getFullYear();
        const porcionesMonth = String(fechaPorciones.getMonth() + 1).padStart(2, '0');
        const porcionesDay = String(fechaPorciones.getDate()).padStart(2, '0');
        const porcionesHoras = fechaPorciones.getHours();
        const porcionesMinutos = String(fechaPorciones.getMinutes()).padStart(2, '0');
        
        const fechaStr = `${porcionesYear}-${porcionesMonth}-${porcionesDay}`;
        const horaStr24 = `${String(porcionesHoras).padStart(2, '0')}:${porcionesMinutos}`;
        
        // Formato 12h
        const periodo = porcionesHoras >= 12 ? 'PM' : 'AM';
        let hora12 = porcionesHoras % 12;
        if (hora12 === 0) hora12 = 12;
        const horaStr12 = `${hora12}:${porcionesMinutos} ${periodo}`;
        
        // Formato amigable: "DD/MM a las HH:MM AM/PM"
        const diaStr = String(porcionesDay).padStart(2, '0');
        const mesStr = String(porcionesMonth).padStart(2, '0');
        const texto = `${diaStr}/${mesStr} a las ${horaStr12}`;
        
        return {
            fecha: fechaStr,
            hora: horaStr24,
            horaStr12: horaStr12,
            texto: texto,
            cruzaMedianoche: fechaStr !== fechaBloqueReal
        };
        
    } catch (e) {
        console.warn('⚠️ [calcularHorarioPorciones] Error:', e);
        return { fecha: null, hora: null, horaStr12: null, texto: '—' };
    }
}

// ============================================================
// 🆕 CORRECCIÓN #9 (240926): REPORTE DE HORARIO DE PRODUCCIÓN
// ============================================================
// 
// Genera un HTML listo para imprimir con el horario de producción
// de un rango de fechas.
// 
// Columnas:
//   - Fecha de venta
//   - Producto
//   - Bloque de producción
//   - Cantidad a producir
//   - Horario de porciones y bolear (4h antes del bloque)
// ============================================================

function generateProductionScheduleReport(filters = {}) {
    const LOG_PREFIX = '📄 [generateProductionScheduleReport]';
    console.log(`${LOG_PREFIX} Iniciando...`, filters);
    
    try {
        const negocioId = window.DBModule.getNegocioIdActual();
        if (!negocioId) {
            console.error(`${LOG_PREFIX} ❌ No hay negocio activo`);
            return null;
        }
        
        // Filtros
        const fromDate = filters.from_date || new Date().toISOString().split('T')[0];
        const toDate = filters.to_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
        
        console.log(`${LOG_PREFIX} Rango: ${fromDate} → ${toDate}`);
        
        // Obtener todas las producciones programadas en el rango
        const producciones = window.DBModule.query(`
            SELECT 
                cp.*,
                p.nombre as producto_nombre,
                p.unidad_venta as producto_unidad
            FROM calendario_produccion cp
            LEFT JOIN productos p ON cp.producto_id = p.id
            WHERE cp.negocio_id = ?
              AND cp.fecha >= ?
              AND cp.fecha <= ?
              AND cp.deleted_at IS NULL
            ORDER BY cp.fecha ASC, cp.bloque_index ASC
        `, [negocioId, fromDate, toDate]);
        
        console.log(`${LOG_PREFIX} Producciones encontradas: ${producciones.length}`);
        
        if (producciones.length === 0) {
            console.warn(`${LOG_PREFIX} ⚠️ No hay producciones en el rango`);
            return null;
        }
        
        // Para cada producción, calcular el horario de porciones
        const filas = producciones.map(prod => {
            const fechaVenta = prod.fecha;
            const fechaBloqueReal = prod.fecha_bloque_real || prod.fecha;
            const esBloqueDiaAnterior = prod.es_bloque_dia_anterior === 1;
            
            // Calcular horario de porciones (4 horas antes del inicio del bloque)
            const porciones = calcularHorarioPorciones(prod.hora_inicio, fechaBloqueReal);
            
            // Formatear fecha de venta
            const fechaVentaObj = new Date(fechaVenta + 'T00:00:00');
            const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            const diaSemana = diasSemana[fechaVentaObj.getDay()];
            const dia = String(fechaVentaObj.getDate()).padStart(2, '0');
            const mes = String(fechaVentaObj.getMonth() + 1).padStart(2, '0');
            
            // Formatear bloque
            const bloqueTexto = `${prod.hora_inicio} - ${prod.hora_fin}`;
            
            // Formatear fecha del bloque (si es del día anterior)
            let fechaBloqueTexto = '';
            if (esBloqueDiaAnterior) {
                const fechaBloqueObj = new Date(fechaBloqueReal + 'T00:00:00');
                const dbDia = String(fechaBloqueObj.getDate()).padStart(2, '0');
                const dbMes = String(fechaBloqueObj.getMonth() + 1).padStart(2, '0');
                fechaBloqueTexto = `${dbDia}/${dbMes}`;
            }
            
            return {
                fechaVenta,
                fechaVentaTexto: `${diaSemana} ${dia}/${mes}`,
                productoNombre: prod.producto_nombre || '— Sin producto específico —',
                productoUnidad: prod.producto_unidad || '',
                bloqueTexto,
                fechaBloqueReal,
                fechaBloqueTexto,
                esBloqueDiaAnterior,
                cantidad: parseFloat(prod.cantidad_produccion) || 0,
                notas: prod.notas,
                porcionesTexto: porciones.texto,
                porcionesFecha: porciones.fecha,
                porcionesHora: porciones.hora,
                porcionesCruzaMedianoche: porciones.cruzaMedianoche
            };
        });
        
        // Estadísticas
        const totalDias = new Set(filas.map(f => f.fechaVenta)).size;
        const totalUnidades = filas.reduce((sum, f) => sum + f.cantidad, 0);
        const totalBloques = filas.length;
        
        // Generar HTML
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Horario de Producción - Panario</title>
                <style>${getReportHeaderStyles('#8b5cf6')}</style>
            </head>
            <body>
                <div class="header">
                    <h1>🔨 Horario de Producción</h1>
                    <div class="negocio">🏢 ${getNombreNegocioReporte()}</div>
                    <p>📅 Del ${formatearFechaCorta(fromDate)} al ${formatearFechaCorta(toDate)}</p>
                </div>
                
                <div class="summary">
                    <div class="summary-card">
                        <div class="number">${totalDias}</div>
                        <div class="label">📅 Días</div>
                    </div>
                    <div class="summary-card">
                        <div class="number">${totalBloques}</div>
                        <div class="label">🔨 Bloques</div>
                    </div>
                    <div class="summary-card">
                        <div class="number">${formatearCantidadProduccion(totalUnidades)}</div>
                        <div class="label">📦 Unidades</div>
                    </div>
                </div>
                
                <div class="nota" style="border-left-color: #8b5cf6;">
                    💡 <strong>Horario de porciones y bolear:</strong> Es 4 horas antes del inicio del bloque de producción. En este horario el panadero debe picar la masa en porciones, pesarla y bolearla para darle reposo entre 1 y 2 horas y media (a veces hasta 3 horas).
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 12%;">📅 Fecha venta</th>
                            <th style="width: 22%;">🏷️ Producto</th>
                            <th style="width: 18%;">🔨 Bloque de producción</th>
                            <th style="width: 12%; text-align: center;">📦 Cantidad</th>
                            <th style="width: 26%;">⏰ Porciones y bolear</th>
                            <th style="width: 10%;">📝 Notas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filas.map(fila => `
                            <tr>
                                <td style="white-space: nowrap;">
                                    <strong>${fila.fechaVentaTexto}</strong>
                                </td>
                                <td>
                                    ${fila.productoNombre}
                                    ${fila.productoUnidad ? `<br><small style="color: #999;">(${fila.productoUnidad})</small>` : ''}
                                </td>
                                <td style="white-space: nowrap;">
                                    🔨 ${fila.bloqueTexto}
                                    ${fila.esBloqueDiaAnterior ? `
                                        <br><small style="color: #8b5cf6;">🌙 Bloque del ${fila.fechaBloqueTexto}</small>
                                    ` : ''}
                                </td>
                                <td style="text-align: center; font-weight: 700; color: #8b5cf6;">
                                    ${formatearCantidadProduccion(fila.cantidad)}
                                </td>
                                <td style="white-space: nowrap; background: #fef9e7; font-weight: 600; color: #92400e;">
                                    ⏰ ${fila.porcionesTexto}
                                    ${fila.porcionesCruzaMedianoche ? `
                                        <br><small style="color: #8b5cf6; font-weight: 400;">(día anterior al bloque)</small>
                                    ` : ''}
                                </td>
                                <td style="font-size: 10px; color: #666;">
                                    ${fila.notas || '—'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="nota">
                    <strong>📋 Leyenda:</strong>
                    <br>🔨 <strong>Bloque de producción:</strong> Horario de corriente eléctrica en que se horneará.
                    <br>⏰ <strong>Porciones y bolear:</strong> 4 horas antes del inicio del bloque.
                    <br>🌙 <strong>Bloque del día anterior:</strong> El pan se hornea el día anterior por la noche.
                </div>
                
                <div class="footer">
                    ${getReportFooter()}
                </div>
            </body>
            </html>
        `;
        
        console.log(`${LOG_PREFIX} ✅ Reporte generado con ${filas.length} filas`);
        return html;
        
    } catch (e) {
        console.error(`${LOG_PREFIX} ❌ Error:`, e);
        return null;
    }
}

// ============================================================
// HELPERS DE FORMATEO DE CANTIDAD
// ============================================================

function formatearCantidadProduccion(cantidad) {
    if (cantidad === null || cantidad === undefined) return '—';
    const num = parseFloat(cantidad);
    if (isNaN(num)) return '—';
    if (num === Math.floor(num)) return String(Math.floor(num));
    return num.toFixed(2).replace(/\.?0+$/, '');
}

// ============================================================
// REPORTE DE PEDIDOS
// ============================================================

function generateOrdersReport(filters = {}) {
    try {
        const negocioId = window.DBModule.getNegocioIdActual();
        if (!negocioId) return null;
        
        const fromDate = filters.from_date || '';
        const toDate = filters.to_date || '';
        const clienteFiltro = filters.client || '';
        const productoFiltro = filters.product || '';
        const statusFiltro = filters.status || '';
        const onlyDebts = filters.onlyDebts || false;
        
        let sql = `
            SELECT 
                o.id, o.client_name, o.client_phone, o.delivery_date, o.status,
                o.total, o.notes, o.session, o.priority,
                o.created_at, o.updated_at,
                (SELECT GROUP_CONCAT(DISTINCT p.nombre) 
                 FROM order_items oi 
                 LEFT JOIN productos p ON oi.producto_id = p.id 
                 WHERE oi.order_id = o.id AND oi.deleted_at IS NULL) as productos
            FROM orders o
            WHERE o.negocio_id = ? AND o.deleted_at IS NULL
        `;
        let params = [negocioId];
        
        if (fromDate) { sql += ' AND DATE(o.delivery_date) >= DATE(?)'; params.push(fromDate); }
        if (toDate) { sql += ' AND DATE(o.delivery_date) <= DATE(?)'; params.push(toDate); }
        if (clienteFiltro) { sql += ' AND LOWER(o.client_name) LIKE LOWER(?)'; params.push('%' + clienteFiltro + '%'); }
        if (statusFiltro) { sql += ' AND o.status = ?'; params.push(statusFiltro); }
        
        sql += ' ORDER BY o.delivery_date ASC, o.id ASC';
        
        const orders = window.DBModule.query(sql, params);
        
        // Filtrar por producto (post-query) si es necesario
        let ordersFiltrados = orders;
        if (productoFiltro) {
            ordersFiltrados = orders.filter(o => 
                o.productos && o.productos.toLowerCase().includes(productoFiltro.toLowerCase())
            );
        }
        
        // Filtrar por deudas (post-query)
        if (onlyDebts) {
            ordersFiltrados = ordersFiltrados.filter(o => o.total > 0);
        }
        
        if (ordersFiltrados.length === 0) return null;
        
        const totalPedidos = ordersFiltrados.length;
        const totalMonto = ordersFiltrados.reduce((sum, o) => sum + (o.total || 0), 0);
        
        // Estadísticas por estado
        const porEstado = {};
        ordersFiltrados.forEach(o => {
            if (!porEstado[o.status]) porEstado[o.status] = 0;
            porEstado[o.status]++;
        });
        
        const statusLabels = {
            'pending': '⏳ Pendiente',
            'confirmed': '✅ Confirmado',
            'production': '🔨 En producción',
            'ready': '📦 Listo',
            'delivered': '🚚 Entregado',
            'cancelled': '❌ Cancelado',
            'waiting': '⏰ Lista de espera',
            'waiting_bought': '🔄 Compró por lista'
        };
        
        const periodo = (fromDate && toDate) 
            ? `Del ${formatearFechaCorta(fromDate)} al ${formatearFechaCorta(toDate)}`
            : 'Todos los períodos';
        
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Reporte de Pedidos - Panario</title>
                <style>${getReportHeaderStyles('#3b82f6')}</style>
            </head>
            <body>
                <div class="header">
                    <h1>📋 Reporte de Pedidos</h1>
                    <div class="negocio">🏢 ${getNombreNegocioReporte()}</div>
                    <p>${periodo}</p>
                </div>
                
                <div class="summary">
                    <div class="summary-card">
                        <div class="number">${totalPedidos}</div>
                        <div class="label">📋 Pedidos</div>
                    </div>
                    <div class="summary-card">
                        <div class="number">${formatearMoneda(totalMonto)}</div>
                        <div class="label">💰 Monto total</div>
                    </div>
                    <div class="summary-card">
                        <div class="number">${formatearMoneda(totalPedidos > 0 ? totalMonto / totalPedidos : 0)}</div>
                        <div class="label">📊 Promedio</div>
                    </div>
                </div>
                
                <h3 style="margin-bottom: 8px; font-size: 14px;">📊 Distribución por estado</h3>
                <table style="margin-bottom: 20px;">
                    <thead>
                        <tr>
                            <th>Estado</th>
                            <th style="text-align: right;">Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(porEstado).map(([status, count]) => `
                            <tr>
                                <td>${statusLabels[status] || status}</td>
                                <td style="text-align: right; font-weight: 600;">${count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <h3 style="margin-bottom: 8px; font-size: 14px;">📋 Detalle de pedidos</h3>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 6%;">#</th>
                            <th style="width: 10%;">📅 Fecha</th>
                            <th style="width: 20%;">👤 Cliente</th>
                            <th style="width: 22%;">📦 Productos</th>
                            <th style="width: 12%;">📌 Estado</th>
                            <th style="width: 10%; text-align: right;">💰 Total</th>
                            <th style="width: 20%;">📝 Notas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ordersFiltrados.slice(0, 100).map(o => {
                            const fechaObj = new Date(o.delivery_date + 'T00:00:00');
                            const dia = String(fechaObj.getDate()).padStart(2, '0');
                            const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
                            return `
                                <tr>
                                    <td style="font-weight: 600; color: #3b82f6;">#${o.id}</td>
                                    <td style="white-space: nowrap;">${dia}/${mes}</td>
                                    <td>${o.client_name || '—'}</td>
                                    <td style="font-size: 10px;">${o.productos || '—'}</td>
                                    <td style="font-size: 10px;">${statusLabels[o.status] || o.status}</td>
                                    <td style="text-align: right; font-weight: 600;">${formatearMoneda(o.total)}</td>
                                    <td style="font-size: 10px; color: #666;">${o.notes || '—'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                
                ${ordersFiltrados.length > 100 ? `
                    <div class="nota">
                        ⚠️ Se muestran solo los primeros 100 pedidos de ${ordersFiltrados.length}.
                        <br>Filtra por un rango de fechas más específico para ver todos.
                    </div>
                ` : ''}
                
                <div class="footer">
                    ${getReportFooter()}
                </div>
            </body>
            </html>
        `;
        
        return html;
        
    } catch (e) {
        console.error('❌ [generateOrdersReport] Error:', e);
        return null;
    }
}

// ============================================================
// REPORTE DE VENTAS
// ============================================================

function generateSalesReport(filters = {}) {
    try {
        const negocioId = window.DBModule.getNegocioIdActual();
        if (!negocioId) return null;
        
        const fromDate = filters.from_date || '';
        const toDate = filters.to_date || '';
        const clienteFiltro = filters.client || '';
        const productoFiltro = filters.product || '';
        const metodoPagoFiltro = filters.payment_method || '';
        const vendedorFiltro = filters.vendedor_id || '';
        const onlyDebts = filters.onlyDebts || false;
        const onlyLiberated = filters.onlyLiberated || false;
        
        let sql = `
            SELECT 
                s.id, s.product_name, s.buyer, s.quantity, s.unit_price, s.total,
                s.payment_method, s.is_debt, s.paid, s.sale_date, s.session,
                s.is_liberated, s.voided,
                u.name as vendedor_nombre,
                u.username as vendedor_username
            FROM sales s
            LEFT JOIN users u ON s.created_by = u.id
            WHERE s.negocio_id = ? AND s.deleted_at IS NULL AND s.voided = 0
        `;
        let params = [negocioId];
        
        if (fromDate) { sql += ' AND DATE(s.sale_date, "localtime") >= DATE(?)'; params.push(fromDate); }
        if (toDate) { sql += ' AND DATE(s.sale_date, "localtime") <= DATE(?)'; params.push(toDate); }
        if (clienteFiltro) { sql += ' AND LOWER(s.buyer) LIKE LOWER(?)'; params.push('%' + clienteFiltro + '%'); }
        if (productoFiltro) { sql += ' AND LOWER(s.product_name) LIKE LOWER(?)'; params.push('%' + productoFiltro + '%'); }
        if (metodoPagoFiltro) { sql += ' AND s.payment_method = ?'; params.push(metodoPagoFiltro); }
        if (vendedorFiltro) { sql += ' AND s.created_by = ?'; params.push(vendedorFiltro); }
        if (onlyDebts) { sql += ' AND s.is_debt = 1 AND s.paid = 0'; }
        if (onlyLiberated) { sql += ' AND s.is_liberated = 1'; }
        
        sql += ' ORDER BY s.sale_date ASC, s.id ASC';
        
        const sales = window.DBModule.query(sql, params);
        
        if (sales.length === 0) return null;
        
        const totalVentas = sales.length;
        const totalMonto = sales.reduce((sum, s) => sum + (s.total || 0), 0);
        const totalDeudas = sales.filter(s => s.is_debt && !s.paid).reduce((sum, s) => sum + (s.total || 0), 0);
        const totalLiberadas = sales.filter(s => s.is_liberated).reduce((sum, s) => sum + (s.total || 0), 0);
        const totalLiberadasCount = sales.filter(s => s.is_liberated).length;
        
        const paymentIcons = { 'cash': '💵', 'transfer': '🏦', 'debt': '💳', 'other': '🔄' };
        const paymentLabels = { 'cash': 'Efectivo', 'transfer': 'Transferencia', 'debt': 'Deuda', 'other': 'Otra' };
        
        const periodo = (fromDate && toDate) 
            ? `Del ${formatearFechaCorta(fromDate)} al ${formatearFechaCorta(toDate)}`
            : 'Todos los períodos';
        
        const nombreVendedorFiltro = vendedorFiltro 
            ? (sales[0]?.vendedor_nombre || sales[0]?.vendedor_username || 'Vendedor')
            : null;
        
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Reporte de Ventas - Panario</title>
                <style>${getReportHeaderStyles('#10b981')}</style>
            </head>
            <body>
                <div class="header">
                    <h1>💰 Reporte de Ventas</h1>
                    <div class="negocio">🏢 ${getNombreNegocioReporte()}</div>
                    <p>${periodo}</p>
                    ${nombreVendedorFiltro ? `<p style="color: #10b981; font-weight: 600;">👤 Vendedor: ${nombreVendedorFiltro}</p>` : ''}
                </div>
                
                <div class="summary">
                    <div class="summary-card">
                        <div class="number">${totalVentas}</div>
                        <div class="label">💰 Ventas</div>
                    </div>
                    <div class="summary-card">
                        <div class="number">${formatearMoneda(totalMonto)}</div>
                        <div class="label">📊 Total</div>
                    </div>
                    <div class="summary-card">
                        <div class="number">${formatearMoneda(totalVentas > 0 ? totalMonto / totalVentas : 0)}</div>
                        <div class="label">📈 Promedio</div>
                    </div>
                    ${totalDeudas > 0 ? `
                    <div class="summary-card" style="border-left-color: #ef4444;">
                        <div class="number" style="color: #ef4444;">${formatearMoneda(totalDeudas)}</div>
                        <div class="label">💳 Deudas</div>
                    </div>
                    ` : ''}
                    ${totalLiberadasCount > 0 ? `
                    <div class="summary-card" style="border-left-color: #8b5cf6;">
                        <div class="number" style="color: #8b5cf6;">${totalLiberadasCount}</div>
                        <div class="label">🚀 Liberadas</div>
                    </div>
                    ` : ''}
                </div>
                
                <h3 style="margin-bottom: 8px; font-size: 14px;">📋 Detalle de ventas</h3>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 5%;">#</th>
                            <th style="width: 10%;">📅 Fecha</th>
                            <th style="width: 18%;">👤 Comprador</th>
                            <th style="width: 20%;">📦 Producto</th>
                            <th style="width: 7%; text-align: center;">Cant.</th>
                            <th style="width: 9%; text-align: right;">P. Unit</th>
                            <th style="width: 9%; text-align: right;">Total</th>
                            <th style="width: 10%;">💳 Pago</th>
                            <th style="width: 12%;">👤 Vendedor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sales.slice(0, 100).map(s => {
                            const fechaObj = new Date(s.sale_date);
                            const dia = String(fechaObj.getDate()).padStart(2, '0');
                            const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
                            const vendedor = s.vendedor_nombre || s.vendedor_username || '—';
                            return `
                                <tr>
                                    <td style="font-weight: 600; color: #10b981;">#${s.id}</td>
                                    <td style="white-space: nowrap;">${dia}/${mes}</td>
                                    <td>${s.buyer || 'Cliente ocasional'}${s.is_liberated ? ' <span class="badge badge-purple">🚀</span>' : ''}</td>
                                    <td style="font-size: 10px;">${s.product_name}</td>
                                    <td style="text-align: center;">${formatearCantidadProduccion(s.quantity)}</td>
                                    <td style="text-align: right;">${formatearMoneda(s.unit_price)}</td>
                                    <td style="text-align: right; font-weight: 600;">${formatearMoneda(s.total)}</td>
                                    <td style="font-size: 10px;">
                                        ${paymentIcons[s.payment_method] || '💵'} ${paymentLabels[s.payment_method] || s.payment_method}
                                        ${s.is_debt && !s.paid ? '<br><span class="badge badge-danger">DEUDA</span>' : ''}
                                    </td>
                                    <td style="font-size: 10px;">${vendedor}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                
                ${sales.length > 100 ? `
                    <div class="nota">
                        ⚠️ Se muestran solo las primeras 100 ventas de ${sales.length}.
                        <br>Filtra por un rango de fechas más específico para ver todas.
                    </div>
                ` : ''}
                
                <div class="footer">
                    ${getReportFooter()}
                </div>
            </body>
            </html>
        `;
        
        return html;
        
    } catch (e) {
        console.error('❌ [generateSalesReport] Error:', e);
        return null;
    }
}

// ============================================================
// REPORTE DE GASTOS
// ============================================================

function generateExpensesReport(filters = {}) {
    try {
        const negocioId = window.DBModule.getNegocioIdActual();
        if (!negocioId) return null;
        
        const fromDate = filters.from_date || '';
        const toDate = filters.to_date || '';
        const categoriaFiltro = filters.category || '';
        const metodoPagoFiltro = filters.payment_method || '';
        const searchFiltro = filters.search || '';
        
        let sql = `
            SELECT 
                t.id, t.concept, t.amount, t.category, t.payment_method,
                t.transaction_date, t.created_at,
                u.name as vendedor_nombre
            FROM transactions t
            LEFT JOIN users u ON t.created_by = u.id
            WHERE t.negocio_id = ? AND t.type = 'expense' 
              AND t.deleted_at IS NULL AND t.voided = 0
        `;
        let params = [negocioId];
        
        if (fromDate) { sql += ' AND DATE(t.transaction_date, "localtime") >= DATE(?)'; params.push(fromDate); }
        if (toDate) { sql += ' AND DATE(t.transaction_date, "localtime") <= DATE(?)'; params.push(toDate); }
        if (categoriaFiltro) { sql += ' AND t.category = ?'; params.push(categoriaFiltro); }
        if (metodoPagoFiltro) { sql += ' AND t.payment_method = ?'; params.push(metodoPagoFiltro); }
        if (searchFiltro) { sql += ' AND t.concept LIKE ?'; params.push('%' + searchFiltro + '%'); }
        
        sql += ' ORDER BY t.transaction_date ASC, t.id ASC';
        
        const expenses = window.DBModule.query(sql, params);
        
        if (expenses.length === 0) return null;
        
        const totalGastos = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        
        const categoriaLabels = {
            'insumos': '🛒 Insumos',
            'materiales': '📦 Materiales',
            'transporte': '🚗 Transporte',
            'inversion': '💼 Inversión',
            'otros': '🔄 Otros',
            'gasto': '📤 General'
        };
        
        const porCategoria = {};
        expenses.forEach(e => {
            const cat = e.category || 'otros';
            if (!porCategoria[cat]) porCategoria[cat] = { count: 0, total: 0 };
            porCategoria[cat].count++;
            porCategoria[cat].total += e.amount;
        });
        
        const periodo = (fromDate && toDate) 
            ? `Del ${formatearFechaCorta(fromDate)} al ${formatearFechaCorta(toDate)}`
            : 'Todos los períodos';
        
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Reporte de Gastos - Panario</title>
                <style>${getReportHeaderStyles('#ef4444')}</style>
            </head>
            <body>
                <div class="header">
                    <h1>📤 Reporte de Gastos</h1>
                    <div class="negocio">🏢 ${getNombreNegocioReporte()}</div>
                    <p>${periodo}</p>
                </div>
                
                <div class="summary">
                    <div class="summary-card" style="border-left-color: #ef4444;">
                        <div class="number" style="color: #ef4444;">${expenses.length}</div>
                        <div class="label">📊 Gastos</div>
                    </div>
                    <div class="summary-card" style="border-left-color: #ef4444;">
                        <div class="number" style="color: #ef4444;">${formatearMoneda(totalGastos)}</div>
                        <div class="label">💰 Total</div>
                    </div>
                    <div class="summary-card" style="border-left-color: #ef4444;">
                        <div class="number" style="color: #ef4444;">${formatearMoneda(expenses.length > 0 ? totalGastos / expenses.length : 0)}</div>
                        <div class="label">📈 Promedio</div>
                    </div>
                </div>
                
                <h3 style="margin-bottom: 8px; font-size: 14px;">📂 Desglose por categoría</h3>
                <table style="margin-bottom: 20px;">
                    <thead>
                        <tr>
                            <th>Categoría</th>
                            <th style="text-align: right;">Cantidad</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(porCategoria).map(([cat, data]) => `
                            <tr>
                                <td>${categoriaLabels[cat] || cat}</td>
                                <td style="text-align: right;">${data.count}</td>
                                <td style="text-align: right; font-weight: 600; color: #ef4444;">${formatearMoneda(data.total)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <h3 style="margin-bottom: 8px; font-size: 14px;">📋 Detalle de gastos</h3>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 5%;">#</th>
                            <th style="width: 12%;">📅 Fecha</th>
                            <th style="width: 35%;">📝 Concepto</th>
                            <th style="width: 15%;">📂 Categoría</th>
                            <th style="width: 15%;">💳 Método</th>
                            <th style="width: 18%; text-align: right;">💰 Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${expenses.slice(0, 100).map(e => {
                            const fechaObj = new Date(e.transaction_date);
                            const dia = String(fechaObj.getDate()).padStart(2, '0');
                            const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
                            return `
                                <tr>
                                    <td style="font-weight: 600; color: #ef4444;">#${e.id}</td>
                                    <td style="white-space: nowrap;">${dia}/${mes}</td>
                                    <td>${e.concept}</td>
                                    <td style="font-size: 10px;">${categoriaLabels[e.category] || e.category || '—'}</td>
                                    <td style="font-size: 10px;">${e.payment_method || '—'}</td>
                                    <td style="text-align: right; font-weight: 600; color: #ef4444;">${formatearMoneda(e.amount)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                
                <div class="footer">
                    ${getReportFooter()}
                </div>
            </body>
            </html>
        `;
        
        return html;
        
    } catch (e) {
        console.error('❌ [generateExpensesReport] Error:', e);
        return null;
    }
}

// ============================================================
// REPORTE DE INSUMOS
// ============================================================

function generateInsumosReport(filters = {}) {
    try {
        const negocioId = window.DBModule.getNegocioIdActual();
        if (!negocioId) return null;
        
        const insumos = window.DBModule.query(`
            SELECT * FROM insumos 
            WHERE negocio_id = ? AND deleted_at IS NULL 
            ORDER BY nombre ASC
        `, [negocioId]);
        
        if (insumos.length === 0) return null;
        
        const totalInsumos = insumos.length;
        const valorTotal = insumos.reduce((sum, i) => sum + ((i.stock || 0) * (i.costo_unitario || 0)), 0);
        const stockBajo = insumos.filter(i => i.stock > 0 && i.stock <= (i.stock_minimo || 0)).length;
        const sinStock = insumos.filter(i => i.stock <= 0).length;
        
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Reporte de Insumos - Panario</title>
                <style>${getReportHeaderStyles('#f59e0b')}</style>
            </head>
            <body>
                <div class="header">
                    <h1>🛒 Reporte de Insumos</h1>
                    <div class="negocio">🏢 ${getNombreNegocioReporte()}</div>
                    <p>Listado completo · ${new Date().toLocaleDateString('es-ES')}</p>
                </div>
                
                <div class="summary">
                    <div class="summary-card">
                        <div class="number">${totalInsumos}</div>
                        <div class="label">🛒 Insumos</div>
                    </div>
                    <div class="summary-card">
                        <div class="number">${formatearMoneda(valorTotal)}</div>
                        <div class="label">💰 Valor stock</div>
                    </div>
                    ${stockBajo > 0 ? `
                    <div class="summary-card" style="border-left-color: #f59e0b;">
                        <div class="number" style="color: #f59e0b;">${stockBajo}</div>
                        <div class="label">⚠️ Stock bajo</div>
                    </div>
                    ` : ''}
                    ${sinStock > 0 ? `
                    <div class="summary-card" style="border-left-color: #ef4444;">
                        <div class="number" style="color: #ef4444;">${sinStock}</div>
                        <div class="label">🚫 Sin stock</div>
                    </div>
                    ` : ''}
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 5%;">#</th>
                            <th style="width: 30%;">📛 Nombre</th>
                            <th style="width: 10%; text-align: center;">📏 Unidad</th>
                            <th style="width: 15%; text-align: right;">📦 Stock</th>
                            <th style="width: 15%; text-align: right;">📉 Stock mín.</th>
                            <th style="width: 12%; text-align: right;">💰 Costo</th>
                            <th style="width: 13%; text-align: right;">💵 Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${insumos.map((insumo, i) => {
                            let stockBadge = '';
                            if (insumo.stock <= 0) stockBadge = '<span class="badge badge-danger">🚫</span>';
                            else if (insumo.stock <= (insumo.stock_minimo || 0)) stockBadge = '<span class="badge badge-warning">⚠️</span>';
                            else stockBadge = '<span class="badge badge-success">✅</span>';
                            
                            const valor = (insumo.stock || 0) * (insumo.costo_unitario || 0);
                            
                            return `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td>${insumo.nombre}</td>
                                    <td style="text-align: center;">${insumo.unidad}</td>
                                    <td style="text-align: right;">${formatearCantidadProduccion(insumo.stock)} ${stockBadge}</td>
                                    <td style="text-align: right;">${formatearCantidadProduccion(insumo.stock_minimo || 0)}</td>
                                    <td style="text-align: right;">${formatearMoneda(insumo.costo_unitario)}</td>
                                    <td style="text-align: right; font-weight: 600; color: #f59e0b;">${formatearMoneda(valor)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                
                <div class="footer">
                    ${getReportFooter()}
                </div>
            </body>
            </html>
        `;
        
        return html;
        
    } catch (e) {
        console.error('❌ [generateInsumosReport] Error:', e);
        return null;
    }
}

// ============================================================
// REPORTE DE RECETAS
// ============================================================

function generateRecipesReport(filters = {}) {
    try {
        const negocioId = window.DBModule.getNegocioIdActual();
        if (!negocioId) return null;
        
        const recetas = window.DBModule.query(`
            SELECT 
                r.*,
                u.name as creador_nombre,
                u.username as creador_username,
                (SELECT GROUP_CONCAT(i.nombre || ' (' || ri.cantidad || ' ' || ri.unidad || ')')
                 FROM receta_insumos ri
                 JOIN insumos i ON ri.insumo_id = i.id
                 WHERE ri.receta_id = r.id AND ri.deleted_at IS NULL) as insumos
            FROM recipes r
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.negocio_id = ? AND r.deleted_at IS NULL
            ORDER BY r.name ASC
        `, [negocioId]);
        
        if (recetas.length === 0) return null;
        
        const user = window.AuthModule.getCurrentUser();
        const esAdmin = user && user.is_admin === 1;
        
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Reporte de Recetas - Panario</title>
                <style>${getReportHeaderStyles('#8b5cf6')}</style>
            </head>
            <body>
                <div class="header">
                    <h1>📖 Reporte de Recetas</h1>
                    <div class="negocio">🏢 ${getNombreNegocioReporte()}</div>
                    <p>Listado completo · ${recetas.length} recetas</p>
                </div>
                
                <div class="summary">
                    <div class="summary-card" style="border-left-color: #8b5cf6;">
                        <div class="number" style="color: #8b5cf6;">${recetas.length}</div>
                        <div class="label">📖 Recetas</div>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 5%;">#</th>
                            <th style="width: 20%;">📖 Nombre</th>
                            <th style="width: 12%;">📦 Rendimiento</th>
                            <th style="width: 35%;">🛒 Insumos</th>
                            <th style="width: 10%;">👤 Creador</th>
                            ${esAdmin ? '<th style="width: 18%; text-align: right;">💰 Costo</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${recetas.map((r, i) => {
                            const creador = r.creador_nombre || r.creador_username || '—';
                            let costoInfo = '';
                            
                            if (esAdmin && typeof window.DBModule.calcularCostoProducto === 'function') {
                                try {
                                    // Calcular costo aproximado
                                    const result = window.DBModule.calcularCostoReceta ? 
                                        window.DBModule.calcularCostoReceta(r.id) : null;
                                    if (result && result.success) {
                                        costoInfo = `<td style="text-align: right;">${formatearMoneda(result.costo_total)}<br><small style="color: #666;">Por unidad: ${formatearMoneda(result.costo_por_unidad)}</small></td>`;
                                    } else {
                                        costoInfo = '<td style="text-align: right; color: #999;">—</td>';
                                    }
                                } catch (e) {
                                    costoInfo = '<td style="text-align: right; color: #999;">—</td>';
                                }
                            }
                            
                            return `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td style="font-weight: 600;">${r.name}</td>
                                    <td>${formatearCantidadProduccion(r.yield_units)} ${r.yield_unit_type || 'unidades'}</td>
                                    <td style="font-size: 10px;">${r.insumos || '— Sin insumos —'}</td>
                                    <td style="font-size: 10px;">${creador}</td>
                                    ${costoInfo}
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                
                ${!esAdmin ? `
                    <div class="nota">
                        💡 Los costos no se muestran porque solo los administradores pueden verlos.
                    </div>
                ` : ''}
                
                <div class="footer">
                    ${getReportFooter()}
                </div>
            </body>
            </html>
        `;
        
        return html;
        
    } catch (e) {
        console.error('❌ [generateRecipesReport] Error:', e);
        return null;
    }
}

// ============================================================
// REPORTE DE LISTA DE ESPERA
// ============================================================

async function generateWaitingListReport() {
    try {
        const items = await window.OrdersModule.getWaitingListWithDetails();
        
        if (!items || items.length === 0) return null;
        
        const totalClientes = items.length;
        const totalUnidades = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
        const totalMonto = items.reduce((sum, i) => sum + (i.order_total || 0), 0);
        
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Reporte de Lista de Espera - Panario</title>
                <style>${getReportHeaderStyles('#f59e0b')}</style>
            </head>
            <body>
                <div class="header">
                    <h1>⏰ Reporte de Lista de Espera</h1>
                    <div class="negocio">🏢 ${getNombreNegocioReporte()}</div>
                    <p>Fecha: ${new Date().toLocaleString('es-ES')}</p>
                </div>
                
                <div class="summary">
                    <div class="summary-card" style="border-left-color: #f59e0b;">
                        <div class="number" style="color: #f59e0b;">${totalClientes}</div>
                        <div class="label">👥 Clientes</div>
                    </div>
                    <div class="summary-card" style="border-left-color: #8b5cf6;">
                        <div class="number" style="color: #8b5cf6;">${formatearCantidadProduccion(totalUnidades)}</div>
                        <div class="label">📦 Unidades</div>
                    </div>
                    <div class="summary-card" style="border-left-color: #10b981;">
                        <div class="number" style="color: #10b981;">${formatearMoneda(totalMonto)}</div>
                        <div class="label">💰 Total</div>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 8%; text-align: center;">Pos.</th>
                            <th style="width: 20%;">👤 Cliente</th>
                            <th style="width: 15%;">📞 Teléfono</th>
                            <th style="width: 20%;">📦 Producto</th>
                            <th style="width: 10%; text-align: center;">Cant.</th>
                            <th style="width: 12%; text-align: right;">💰 Total</th>
                            <th style="width: 15%;">📝 Notas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td style="text-align: center; font-weight: 700; color: #f59e0b; font-size: 14px;">#${item.position}</td>
                                <td style="font-weight: 600;">${item.client_name || '—'}</td>
                                <td>${item.client_phone || '—'}</td>
                                <td>${item.product_name || '—'}</td>
                                <td style="text-align: center;">${formatearCantidadProduccion(item.quantity)}</td>
                                <td style="text-align: right; font-weight: 600;">${formatearMoneda(item.order_total)}</td>
                                <td style="font-size: 10px; color: #666;">${item.notes || '—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="footer">
                    ${getReportFooter()}
                </div>
            </body>
            </html>
        `;
        
        return html;
        
    } catch (e) {
        console.error('❌ [generateWaitingListReport] Error:', e);
        return null;
    }
}

// ============================================================
// REPORTE DE DÍAS SIN VENTAS
// ============================================================

function generateDiasSinVentasReport(filters = {}) {
    try {
        const negocioId = window.DBModule.getNegocioIdActual();
        if (!negocioId) return null;
        
        const fromDate = filters.from_date || '';
        const toDate = filters.to_date || '';
        const motivoFiltro = filters.motivo || '';
        
        let sql = `
            SELECT * FROM dias_sin_ventas 
            WHERE negocio_id = ? AND deleted_at IS NULL
        `;
        let params = [negocioId];
        
        if (fromDate) { sql += ' AND fecha >= ?'; params.push(fromDate); }
        if (toDate) { sql += ' AND fecha <= ?'; params.push(toDate); }
        if (motivoFiltro) { sql += ' AND motivo = ?'; params.push(motivoFiltro); }
        
        sql += ' ORDER BY fecha DESC';
        
        const dias = window.DBModule.query(sql, params);
        
        if (dias.length === 0) return null;
        
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Reporte de Días sin Ventas - Panario</title>
                <style>${getReportHeaderStyles('#ef4444')}</style>
            </head>
            <body>
                <div class="header">
                    <h1>📅 Reporte de Días sin Ventas</h1>
                    <div class="negocio">🏢 ${getNombreNegocioReporte()}</div>
                    <p>${dias.length} días registrados</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 5%;">#</th>
                            <th style="width: 15%;">📅 Fecha</th>
                            <th style="width: 25%;">📌 Motivo</th>
                            <th style="width: 55%;">📝 Nota</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dias.map((d, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td style="white-space: nowrap; font-weight: 600;">${formatearFechaCorta(d.fecha)}</td>
                                <td style="font-weight: 600; color: #ef4444;">${d.motivo}</td>
                                <td style="font-size: 11px;">${d.nota || '—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="footer">
                    ${getReportFooter()}
                </div>
            </body>
            </html>
        `;
        
        return html;
        
    } catch (e) {
        console.error('❌ [generateDiasSinVentasReport] Error:', e);
        return null;
    }
}

// ============================================================
// REPORTE DE CORRIENTE
// ============================================================

function generateCorrienteReport(filters = {}) {
    try {
        const fromDate = filters.from_date || new Date().toISOString().split('T')[0];
        const toDate = filters.to_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
        
        const startDate = new Date(fromDate + 'T00:00:00');
        const endDate = new Date(toDate + 'T00:00:00');
        const diffDays = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        let reportData = [];
        let totalHoras = 0;
        
        for (let i = 0; i < diffDays; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() + i);
            const dateStr = window.CorrienteUtils.formatearFechaISO(currentDate);
            
            const bloques = window.CorrienteUtils.getBloques(dateStr);
            const bloqueAyer = window.CorrienteUtils.getUltimoBloqueDiaAnterior(dateStr);
            
            let horas = 0;
            let horariosStr = '🌙 Sin corriente';
            
            if (bloques && bloques.length > 0) {
                horariosStr = bloques.map(h => `${h.inicioStr} - ${h.finStr}`).join(' | ');
                horas = bloques.reduce((sum, h) => sum + h.duracionHoras, 0);
                totalHoras += horas;
            }
            
            reportData.push({
                fecha: dateStr,
                fechaDisplay: formatearFechaCorta(dateStr),
                diaSemana: currentDate.toLocaleDateString('es-ES', { weekday: 'short' }),
                horarios: horariosStr,
                horas: horas,
                numBloques: bloques ? bloques.length : 0,
                bloqueAyerTexto: bloqueAyer ? `${bloqueAyer.inicioStr} - ${bloqueAyer.finStr}` : null
            });
        }
        
        const config = window.CorrienteUtils.getConfig();
        
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Reporte de Corriente - Panario</title>
                <style>${getReportHeaderStyles('#f59e0b')}</style>
            </head>
            <body>
                <div class="header">
                    <h1>⚡ Reporte de Corriente</h1>
                    <div class="negocio">🏢 ${getNombreNegocioReporte()}</div>
                    <p>Del ${formatearFechaCorta(fromDate)} al ${formatearFechaCorta(toDate)}</p>
                    <p style="font-size: 11px; color: #94a3b8;">Patrón: ${config.horasCorriente || 3}h corriente / ${config.horasApagon || 12}h apagón</p>
                </div>
                
                <div class="summary">
                    <div class="summary-card">
                        <div class="number">${diffDays}</div>
                        <div class="label">📅 Días</div>
                    </div>
                    <div class="summary-card">
                        <div class="number">${totalHoras.toFixed(1)}h</div>
                        <div class="label">⚡ Total corriente</div>
                    </div>
                    <div class="summary-card">
                        <div class="number">${(totalHoras / diffDays).toFixed(1)}h</div>
                        <div class="label">📊 Promedio/día</div>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 15%;">📅 Fecha</th>
                            <th style="width: 45%;">⚡ Horario</th>
                            <th style="width: 10%; text-align: center;"># Bloques</th>
                            <th style="width: 10%; text-align: right;">Horas</th>
                            <th style="width: 20%;">🌙 Bloque de ayer</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reportData.map(row => `
                            <tr>
                                <td style="white-space: nowrap; font-weight: 600;">
                                    ${row.fechaDisplay}
                                    <br><small style="color: #999;">${row.diaSemana}</small>
                                </td>
                                <td style="color: ${row.horas > 0 ? '#f59e0b' : '#94a3b8'}; font-weight: ${row.horas > 0 ? '600' : '400'};">
                                    ${row.horarios}
                                </td>
                                <td style="text-align: center;">${row.numBloques > 0 ? `<span class="badge badge-primary">${row.numBloques}</span>` : '—'}</td>
                                <td style="text-align: right; font-weight: ${row.horas > 0 ? '700' : '400'}; color: ${row.horas > 0 ? '#f59e0b' : '#94a3b8'};">
                                    ${row.horas > 0 ? row.horas.toFixed(1) + 'h' : '—'}
                                </td>
                                <td style="font-size: 10px; color: #8b5cf6;">
                                    ${row.bloqueAyerTexto ? `🌙 ${row.bloqueAyerTexto}` : '—'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="nota">
                    💡 El horario se genera automáticamente según el patrón configurado.
                    <br>🔄 Ciclo: ${config.horasCorriente || 3}h / ${config.horasApagon || 12}h
                </div>
                
                <div class="footer">
                    ${getReportFooter()}
                </div>
            </body>
            </html>
        `;
        
        return html;
        
    } catch (e) {
        console.error('❌ [generateCorrienteReport] Error:', e);
        return null;
    }
}

// ============================================================
// IMPRIMIR REPORTE
// ============================================================

function printReport(html) {
    if (!html) {
        console.warn('⚠️ [printReport] HTML vacío');
        return;
    }
    
    try {
        const win = window.open('', '_blank');
        if (!win) {
            window.showToast('❌ Permite ventanas emergentes para imprimir', 'error', 4000);
            return;
        }
        
        win.document.write(html);
        win.document.close();
        
        setTimeout(() => {
            try {
                win.focus();
                win.print();
            } catch (e) {
                console.warn('⚠️ Error al invocar print():', e);
            }
        }, 500);
        
    } catch (e) {
        console.error('❌ [printReport] Error:', e);
        window.showToast('❌ Error al imprimir: ' + e.message, 'error', 5000);
    }
}

// ============================================================
// EXPORTACIÓN
// ============================================================

window.ReportsModule = {
    // Reportes existentes
    generateOrdersReport,
    generateSalesReport,
    generateExpensesReport,
    generateInsumosReport,
    generateRecipesReport,
    generateWaitingListReport,
    generateDiasSinVentasReport,
    generateCorrienteReport,
    // 🆕 CORRECCIÓN #9 (240926)
    generateProductionScheduleReport,
    // Helpers
    printReport,
    calcularHorarioPorciones,
    formatearFechaCorta,
    formatearFechaLarga,
    formatearMoneda
};

console.log('📊 Reports Module cargado correctamente v2.2.0');
console.log('   🆕 CORRECCIÓN #9 (240926): generateProductionScheduleReport()');
console.log('   ✅ Reportes disponibles:');
console.log('      • Pedidos, Ventas, Gastos, Insumos, Recetas');
console.log('      • Lista de espera, Días sin ventas, Corriente');
console.log('      • 🆕 Horario de producción');
console.log('   ✅ calcularHorarioPorciones() calcula 4h antes del bloque');