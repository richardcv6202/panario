// ============================================================
// 📦 HELP DETAILED MODULE - Panario
// v1.0.0 (250926): CORRECCIÓN #14 (240926)
//   - ✅ Convierte ayuda-panario.html en módulo JS integrado
//   - ✅ Elimina el uso de iframe
//   - ✅ Comparte estilos y variables CSS de la app
//   - ✅ Respeta el tema actual (claro/oscuro)
//   - ✅ Búsqueda en vivo y filtro por categorías
//   - ✅ Índice lateral con navegación suave
//   - ✅ Botón "Volver a Panario" que cierra el modal
//   - ✅ Compatible con desktop y móvil
// ============================================================

window.HelpDetailedModule = {};

// ============================================================
// CONTENIDO DE LA AYUDA (ESTRUCTURA DE DATOS)
// ============================================================
// Cada sección tiene:
//   - id: identificador único para el ancla
//   - icon: emoji representativo
//   - title: título de la sección
//   - html: contenido HTML de la sección
// ============================================================

const HELP_SECTIONS = [
    {
        id: 'intro',
        icon: '🏠',
        title: 'Introducción',
        html: `
            <p><strong>Panario</strong> es una aplicación PWA (Progressive Web App) diseñada específicamente para la gestión integral de una <strong>panadería artesanal</strong>. Funciona completamente offline y guarda todos tus datos localmente en tu dispositivo.</p>

            <div class="help-card primary">
                <div class="help-card-title">✨ ¿Qué puedes hacer con Panario?</div>
                <ul>
                    <li>🛒 Gestionar <strong>insumos</strong> (compras, stock, costos)</li>
                    <li>📖 Crear <strong>recetas</strong> con fórmulas y cálculo de costos</li>
                    <li>🏷️ Definir <strong>productos</strong> para la venta</li>
                    <li>💰 Registrar <strong>ventas</strong> con descuento automático de stock</li>
                    <li>📋 Gestionar <strong>pedidos y reservas</strong></li>
                    <li>⏰ Administrar la <strong>lista de espera</strong></li>
                    <li>📊 Ver <strong>estadísticas</strong> y análisis del negocio</li>
                    <li>⚡ Planificar según <strong>horarios de corriente</strong></li>
                    <li>🔨 Programar <strong>producción</strong> con algoritmo inteligente</li>
                    <li>🏭 Configurar <strong>CMPBC</strong> (Capacidad Máxima por Bloque)</li>
                    <li>🏆 Premiar a tus <strong>mejores clientes</strong></li>
                    <li>📅 Registrar <strong>días sin ventas</strong></li>
                    <li>👥 Trabajar en <strong>multiusuario</strong></li>
                </ul>
            </div>

            <div class="help-card info">
                <div class="help-card-title">🍞 ¿Por qué se llama "Panario"?</div>
                <p>El nombre es un juego con <strong>"pan"</strong> y <strong>"diario"</strong> (de contabilidad). Es corto, original y describe perfectamente el propósito: llevar el diario contable de una panadería.</p>
                <p style="margin-top: 8px; font-size: 12px; color: var(--text-light);">Otros nombres considerados: PanConta, HarinaBalance, MasaYCuentas, BakeryLedger.</p>
            </div>

            <h3>📱 Información técnica</h3>
            <div class="help-table-wrapper">
                <table class="help-table">
                    <tr><th style="width: 40%;">Propiedad</th><th>Valor</th></tr>
                    <tr><td>Versión</td><td><strong>2.3.0</strong></td></tr>
                    <tr><td>Estado</td><td><span class="help-badge success">✅ Producción</span></td></tr>
                    <tr><td>Arquitectura</td><td>Cliente local (SQLite WASM)</td></tr>
                    <tr><td>Tecnología</td><td>HTML5 + CSS3 + JavaScript (ES6+)</td></tr>
                    <tr><td>Persistencia</td><td>SQLite (sql.js) + localStorage</td></tr>
                    <tr><td>Modo offline</td><td>✅ 100% funcional</td></tr>
                    <tr><td>Instalable</td><td>✅ Como app nativa</td></tr>
                </table>
            </div>

            <div class="help-card success">
                <div class="help-card-title">💾 Privacidad y seguridad</div>
                <ul>
                    <li>✅ Todos los datos se guardan <strong>localmente en tu dispositivo</strong>.</li>
                    <li>✅ No se envía información a ningún servidor externo.</li>
                    <li>✅ Puedes hacer copias de seguridad desde <strong>Herramientas</strong>.</li>
                    <li>✅ Funciona 100% offline.</li>
                </ul>
            </div>
        `
    },
    {
        id: 'primeros-pasos',
        icon: '🚀',
        title: 'Primeros pasos',
        html: `
            <p>Sigue estos 5 pasos para empezar a usar Panario correctamente:</p>

            <div class="help-card primary">
                <div class="help-card-title">Paso 1: Registrar insumos</div>
                <p>Ve a <strong>🛒 Insumos</strong> y registra todo lo que compras: harina, levadura, yogur, mantequilla, etc. Define el costo unitario, stock actual y stock mínimo.</p>
            </div>

            <div class="help-card purple">
                <div class="help-card-title">Paso 2: Crear recetas</div>
                <p>Ve a <strong>📖 Recetas</strong> y crea tus fórmulas. Asocia los insumos con sus cantidades. Ej: "Pan de Yogur" con harina, levadura y yogur.</p>
            </div>

            <div class="help-card success">
                <div class="help-card-title">Paso 3: Crear productos</div>
                <p>Ve a <strong>🏷️ Productos</strong> y define lo que vendes. Asocia cada producto a una receta. Ej: "Jaba de Pan" con 10 panes de la receta "Pan de Yogur".</p>
            </div>

            <div class="help-card info">
                <div class="help-card-title">Paso 4: Registrar ventas</div>
                <p>Ve a <strong>💰 Ventas</strong> y registra tus transacciones. El stock de insumos se descuenta automáticamente según la receta.</p>
            </div>

            <div class="help-card warning">
                <div class="help-card-title">Paso 5: Gestionar pedidos</div>
                <p>Ve a <strong>📋 Pedidos</strong> para gestionar reservas, lista de espera y entregas. Al entregar un pedido, se crea la venta automáticamente.</p>
            </div>
        `
    },
    {
        id: 'dashboard',
        icon: '📊',
        title: 'Dashboard',
        html: `
            <p>El <strong>Dashboard</strong> es la pantalla principal. Muestra un resumen completo de tu negocio en tiempo real.</p>

            <h3>🎯 Tarjetas de estadísticas</h3>
            <div class="help-table-wrapper">
                <table class="help-table">
                    <tr><th style="width: 35%;">Tarjeta</th><th>Descripción</th></tr>
                    <tr><td>🛒 Ventas totales</td><td>Cantidad total de ventas registradas</td></tr>
                    <tr><td>💰 Ingresos</td><td>Suma total de todos los ingresos</td></tr>
                    <tr><td>📤 Gastos</td><td>Suma total de gastos registrados</td></tr>
                    <tr><td>📈 Ganancia</td><td>Ingresos - Gastos</td></tr>
                    <tr><td>📋 Pedidos pendientes</td><td>Pedidos aún no entregados</td></tr>
                    <tr><td>💳 Deudas</td><td>Ventas pendientes de cobro</td></tr>
                    <tr><td>📈 Ventas hoy</td><td>Total vendido en el día actual</td></tr>
                    <tr><td>💵 Fondo en caja</td><td>Saldo en efectivo</td></tr>
                    <tr><td>🏦 Fondo en banco</td><td>Saldo por transferencia</td></tr>
                </table>
            </div>

            <h3>🆕 Estadísticas avanzadas</h3>
            <div class="help-table-wrapper">
                <table class="help-table">
                    <tr><th style="width: 35%;">Estadística</th><th>Descripción</th></tr>
                    <tr><td>📅 Días con ventas</td><td>Número de días únicos con al menos una venta</td></tr>
                    <tr><td>📊 Promedio diario</td><td>Ingresos totales / días con ventas</td></tr>
                    <tr><td>🎂 Primer día venta</td><td>Fecha de la primera venta registrada</td></tr>
                    <tr><td>👥 Clientes diferentes</td><td>Cantidad de clientes únicos</td></tr>
                    <tr><td>🚀 Ventas liberadas</td><td>Cantidad e importe de ventas sin cliente</td></tr>
                    <tr><td>🥇 Mejor día</td><td>Día con mayor facturación histórica</td></tr>
                    <tr><td>📉 Peor día</td><td>Día con menor facturación histórica</td></tr>
                    <tr><td>👥 Ventas por empleado</td><td>Ranking de ventas por usuario del negocio</td></tr>
                </table>
            </div>

            <h3>📈 Gráfico de ventas diarias</h3>
            <p>Muestra las ventas con los siguientes controles:</p>
            <ul>
                <li><strong>◀ ▶</strong> — Navegar entre semanas</li>
                <li><strong>📅 Ver:</strong> Últimos 7 días / Semana Dom-Sáb / Semana Lun-Dom</li>
                <li><strong>Tipo</strong> — Barras, Línea o Pastel</li>
                <li><strong>🖼️</strong> — Exportar como imagen PNG</li>
                <li><strong>📄</strong> — Exportar como PDF</li>
            </ul>

            <div class="help-card info">
                <div class="help-card-title">🎨 Colores del gráfico</div>
                <ul>
                    <li>🥇 <strong>Verde:</strong> Día con mayor venta del período</li>
                    <li>📉 <strong>Rojo:</strong> Día con menor venta del período</li>
                    <li>⭐ <strong>Amarillo:</strong> Día actual</li>
                </ul>
            </div>
        `
    },
    {
        id: 'orders',
        icon: '📋',
        title: 'Pedidos',
        html: `
            <p>El módulo de <strong>Pedidos</strong> gestiona todas las reservas y solicitudes de clientes. Los pedidos <strong>no son deudas</strong> hasta que se entregan.</p>

            <h3>📌 Estados de un pedido</h3>
            <div class="help-table-wrapper">
                <table class="help-table">
                    <tr><th style="width: 35%;">Estado</th><th>Descripción</th></tr>
                    <tr><td>⏳ Pendiente</td><td>Recién creado, sin confirmar</td></tr>
                    <tr><td>✅ Confirmado</td><td>Cliente confirmó el pedido</td></tr>
                    <tr><td>🔨 En producción</td><td>Se está elaborando</td></tr>
                    <tr><td>📦 Listo</td><td>Listo para entregar</td></tr>
                    <tr><td>🚚 Entregado</td><td>Ya entregado (crea venta)</td></tr>
                    <tr><td>❌ Cancelado</td><td>Cancelado (repone stock)</td></tr>
                    <tr><td>⏰ En lista de espera</td><td>Cliente en cola</td></tr>
                    <tr><td>🔄 Compró por lista</td><td>Atendido desde lista</td></tr>
                </table>
            </div>

            <h3>🆕 Crear pedidos</h3>

            <h4>Pedido individual</h4>
            <ol>
                <li>Clic en <strong>➕ Nuevo Pedido</strong></li>
                <li>Completa cliente, teléfono, fecha de entrega</li>
                <li>Selecciona sesión de recogida (mañana/tarde/noche)</li>
                <li>Agrega productos con cantidades y precios</li>
                <li>Guarda el pedido</li>
            </ol>

            <h4>Reserva por período</h4>
            <p>Permite crear <strong>múltiples pedidos a la vez</strong> con el mismo cliente y productos:</p>
            <ul>
                <li><strong>Rango completo:</strong> Todos los días del rango</li>
                <li><strong>Paridad:</strong> Solo pares o solo impares</li>
                <li><strong>Días de la semana:</strong> Solo martes, etc.</li>
                <li><strong>Días específicos:</strong> 1, 15, 30 del mes</li>
                <li><strong>🚫 Excluir días:</strong> Excluir domingos, sábados, etc.</li>
            </ul>

            <div class="help-card info">
                <div class="help-card-title">💡 Sesiones de recogida</div>
                <ul>
                    <li>🌅 <strong>Mañana:</strong> 10:00 AM</li>
                    <li>☀️ <strong>Tarde:</strong> 3:00 PM</li>
                    <li>🌙 <strong>Noche:</strong> 7:00 PM</li>
                </ul>
            </div>

            <h3>⏰ Lista de espera</h3>
            <p>Cuando la demanda supera la oferta, los clientes se ponen en lista de espera. Al haber disponibilidad:</p>
            <ul>
                <li>Se les notifica por orden de posición</li>
                <li>Puedes atenderlos completos o parcialmente</li>
                <li>Se reindexa la lista automáticamente</li>
            </ul>

            <h3>🚨 Cancelación global</h3>
            <p>Como administrador, puedes cancelar pedidos por <strong>rango de fechas</strong>. Útil para:</p>
            <ul>
                <li>Apagones prolongados</li>
                <li>Falta de insumos</li>
                <li>Vacaciones no planificadas</li>
                <li>Enfermedad</li>
                <li>Cierres temporales</li>
            </ul>
        `
    },
    {
        id: 'insumos',
        icon: '🛒',
        title: 'Insumos',
        html: `
            <p>Los <strong>insumos</strong> son todo lo que compras para producir: harina, levadura, yogur, mantequilla, etc.</p>

            <h3>📋 Campos de un insumo</h3>
            <div class="help-table-wrapper">
                <table class="help-table">
                    <tr><th style="width: 30%;">Campo</th><th>Descripción</th></tr>
                    <tr><td>📛 Nombre</td><td>Nombre del insumo (Ej: Harina de trigo)</td></tr>
                    <tr><td>📏 Unidad</td><td>Unidad de medida (kg, g, L, unid)</td></tr>
                    <tr><td>💰 Costo unitario</td><td>Precio por unidad</td></tr>
                    <tr><td>📦 Stock</td><td>Cantidad actual disponible</td></tr>
                    <tr><td>📉 Stock mínimo</td><td>Nivel para alerta de reposición</td></tr>
                </table>
            </div>

            <h3>📊 Indicadores visuales</h3>
            <ul>
                <li><span class="help-badge success">✅ Stock OK</span> — Stock por encima del mínimo</li>
                <li><span class="help-badge warning">⚠️ Stock bajo</span> — Stock igual o por debajo del mínimo</li>
                <li><span class="help-badge danger">🚫 Sin stock</span> — Stock agotado</li>
            </ul>

            <h3>🔄 Descuento automático</h3>
            <p>Al vender un producto o confirmar un pedido, el stock se descuenta automáticamente según la receta asociada.</p>

            <h3>🔒 Permisos por rol</h3>
            <div class="help-table-wrapper">
                <table class="help-table">
                    <tr><th>Acción</th><th style="text-align: center;">Admin</th><th style="text-align: center;">Usuario</th></tr>
                    <tr><td>Ver insumos</td><td style="text-align: center;">✅</td><td style="text-align: center;">✅</td></tr>
                    <tr><td>Ver costos</td><td style="text-align: center;">✅</td><td style="text-align: center;">✅</td></tr>
                    <tr><td>Crear / Editar / Eliminar</td><td style="text-align: center;">✅</td><td style="text-align: center;">❌</td></tr>
                </table>
            </div>
        `
    },
    {
        id: 'recipes',
        icon: '📖',
        title: 'Recetas',
        html: `
            <p>Las <strong>recetas</strong> son las fórmulas de producción. Indican qué insumos se necesitan y en qué cantidad.</p>

            <h3>📋 Campos de una receta</h3>
            <ul>
                <li><strong>📛 Nombre:</strong> Ej: "Pan de Yogur"</li>
                <li><strong>📝 Descripción:</strong> Breve descripción</li>
                <li><strong>📦 Rendimiento:</strong> Cuántas unidades produce (Ej: 33 panes)</li>
                <li><strong>🛒 Insumos:</strong> Lista de insumos con cantidades</li>
                <li><strong>📋 Instrucciones:</strong> Pasos de preparación</li>
            </ul>

            <h3>💰 Cálculo de costos</h3>
            <p>El costo se calcula automáticamente:</p>
            <pre><code>Costo total = Σ (cantidad × costo_unitario)
Costo por unidad = Costo total / rendimiento</code></pre>

            <h3>🔄 Recalcular receta</h3>
            <p>Permite ajustar una receta para un nuevo rendimiento usando regla de 3:</p>
            <ol>
                <li>Abre la receta → clic en <strong>🔄 Recalcular</strong></li>
                <li>Ingresa el nuevo rendimiento (Ej: 50 panes)</li>
                <li>Ve la vista previa con los valores ajustados</li>
                <li>Elige:
                    <ul>
                        <li><strong>✏️ Modificar esta receta:</strong> Sobrescribe (solo admin)</li>
                        <li><strong>📋 Crear nueva receta:</strong> Crea una copia</li>
                    </ul>
                </li>
            </ol>

            <div class="help-card info">
                <div class="help-card-title">🔢 Regla de redondeo</div>
                <ul>
                    <li>Si el resultado es entero → dejarlo entero</li>
                    <li>Si es decimal → redondear hacia arriba manteniendo decimales</li>
                    <li>Ejemplos:
                        <ul>
                            <li>1.005 kg → 1.01 kg</li>
                            <li>0.333 kg → 0.34 kg</li>
                            <li>1.0 kg → 1 kg</li>
                        </ul>
                    </li>
                </ul>
            </div>

            <h3>🔒 Permisos por rol</h3>
            <div class="help-table-wrapper">
                <table class="help-table">
                    <tr><th>Acción</th><th style="text-align: center;">Admin</th><th style="text-align: center;">Usuario</th></tr>
                    <tr><td>Ver recetas</td><td style="text-align: center;">✅</td><td style="text-align: center;">✅</td></tr>
                    <tr><td>Ver costos</td><td style="text-align: center;">✅</td><td style="text-align: center;">❌</td></tr>
                    <tr><td>Crear / Editar / Eliminar</td><td style="text-align: center;">✅</td><td style="text-align: center;">❌</td></tr>
                    <tr><td>Recalcular (crear nueva)</td><td style="text-align: center;">✅</td><td style="text-align: center;">✅</td></tr>
                    <tr><td>Usar como plantilla</td><td style="text-align: center;">✅</td><td style="text-align: center;">✅</td></tr>
                    <tr><td>Compartir</td><td style="text-align: center;">✅</td><td style="text-align: center;">❌</td></tr>
                    <tr><td>Exportar PDF</td><td style="text-align: center;">✅ (con costos)</td><td style="text-align: center;">✅ (sin costos)</td></tr>
                </table>
            </div>
        `
    },
    {
        id: 'productos',
        icon: '🏷️',
        title: 'Productos',
        html: `
            <p>Los <strong>productos</strong> son los artículos que vendes al cliente.</p>

            <h3>📋 Campos de un producto</h3>
            <div class="help-table-wrapper">
                <table class="help-table">
                    <tr><th style="width: 30%;">Campo</th><th>Descripción</th></tr>
                    <tr><td>📛 Nombre</td><td>Ej: "Jaba de Pan"</td></tr>
                    <tr><td>📝 Descripción</td><td>Breve descripción (opcional)</td></tr>
                    <tr><td>💰 Precio de venta</td><td>Precio al público</td></tr>
                    <tr><td>📦 Unidad de venta</td><td>unidad, jaba, docena, etc.</td></tr>
                    <tr><td>📊 Cantidad por unidad</td><td>Cuántas unidades contiene</td></tr>
                    <tr><td>📋 Receta asociada</td><td>Receta que usa este producto</td></tr>
                    <tr><td>🆕 🏭 CMPBC</td><td>Capacidad Máxima de Producción por Bloque</td></tr>
                </table>
            </div>

            <h3>💡 Ejemplo práctico</h3>
            <div class="help-card primary">
                <div class="help-card-title">Jaba de Pan</div>
                <ul>
                    <li><strong>Precio:</strong> $550</li>
                    <li><strong>Unidad:</strong> jaba</li>
                    <li><strong>Cantidad:</strong> 10 panes por jaba</li>
                    <li><strong>Receta:</strong> Pan de Yogur (33 panes)</li>
                    <li><strong>🏭 CMPBC:</strong> 7 jabas por bloque de corriente</li>
                </ul>
                <p>Al vender 1 jaba, se descuentan 0.303 kg de harina, 0.003 kg de levadura, etc.</p>
            </div>

            <h3>🆕 🏭 CMPBC — Capacidad Máxima por Bloque</h3>
            <p>Es un valor opcional que indica <strong>cuántas unidades de un producto puedes producir en un solo bloque de corriente</strong>.</p>
            <ul>
                <li><strong>NULL / vacío / 0:</strong> Sin límite definido</li>
                <li><strong>> 0:</strong> CMPBC real (Ej: 7 = 7 jabas por bloque)</li>
            </ul>
            <p>Se usa para que el sistema calcule automáticamente cuántos bloques necesitas para producir una cantidad.</p>

            <h3>📈 Margen de ganancia</h3>
            <p>Se calcula automáticamente: <code>(precio - costo) / precio × 100</code></p>

            <h3>🔒 Permisos por rol</h3>
            <div class="help-table-wrapper">
                <table class="help-table">
                    <tr><th>Acción</th><th style="text-align: center;">Admin</th><th style="text-align: center;">Usuario</th></tr>
                    <tr><td>Ver productos</td><td style="text-align: center;">✅</td><td style="text-align: center;">✅</td></tr>
                    <tr><td>Crear / Editar / Eliminar</td><td style="text-align: center;">✅</td><td style="text-align: center;">❌</td></tr>
                </table>
            </div>
        `
    },
    {
        id: 'sales',
        icon: '💰',
        title: 'Ventas',
        html: `
            <p>El módulo de <strong>Ventas</strong> gestiona todas las transacciones y finanzas del negocio.</p>

            <h3>📌 Tipos de venta</h3>
            <div class="help-table-wrapper">
                <table class="help-table">
                    <tr><th style="width: 35%;">Tipo</th><th>Descripción</th></tr>
                    <tr><td>💰 Venta normal</td><td>Con cliente identificado</td></tr>
                    <tr><td>🚀 Venta liberada</td><td>Sin cliente (mostrador anónimo)</td></tr>
                    <tr><td>💳 Venta a deuda</td><td>Cliente paga después</td></tr>
                    <tr><td>📋 Venta desde pedido</td><td>Al entregar un pedido</td></tr>
                    <tr><td>🔄 Venta desde lista</td><td>Cliente de lista de espera</td></tr>
                </table>
            </div>

            <h3>💳 Métodos de pago</h3>
            <ul>
                <li>💵 <strong>Efectivo:</strong> Afecta al saldo de caja</li>
                <li>🏦 <strong>Transferencia:</strong> Afecta al saldo del banco</li>
                <li>💳 <strong>Deuda:</strong> Queda pendiente de cobro</li>
                <li>🔄 <strong>Otra:</strong> Otros métodos</li>
            </ul>

            <h3>📅 Días sin ventas</h3>
            <p>Permite registrar los días en los que no tuviste actividad, con motivo y nota.</p>

            <p><strong>Motivos disponibles:</strong></p>
            <ul>
                <li>⚡ Apagón</li>
                <li>🛒 Falta de insumos</li>
                <li>🎉 Feriado</li>
                <li>🏖️ Vacaciones</li>
                <li>🏥 Enfermedad</li>
                <li>🔧 Mantenimiento</li>
                <li>🌧️ Mal clima</li>
                <li>🔄 Otro</li>
            </ul>

            <h3>🔍 Filtros del listado</h3>
            <ul>
                <li><strong>💰 Ventas:</strong> Solo ventas</li>
                <li><strong>📤 Gastos:</strong> Solo gastos</li>
                <li><strong>📊 Todo:</strong> Ambos mezclados</li>
                <li><strong>💳 Deudas:</strong> Solo pendientes de cobro</li>
            </ul>

            <h3>👤 Filtro por vendedor</h3>
            <p>Si hay más de 1 usuario en el negocio, aparece un selector <strong>👤 Vendedor</strong> para ver solo las ventas de un vendedor específico. El filtro aparece también en el reporte PDF.</p>
        `
    },
    {
        id: 'corriente',
        icon: '⚡',
        title: 'Corriente',
        html: `
            <p>El módulo de <strong>Corriente</strong> permite planificar la producción según los horarios eléctricos.</p>

            <h3>🔧 Configuración</h3>
            <p>Ve a <strong>⚙️ Herramientas → ⚡ Gestionar Horarios</strong>:</p>
            <ol>
                <li><strong>Patrón:</strong> Define cuántas horas hay corriente y cuántas no (Ej: 3h corriente / 12h apagón)</li>
                <li><strong>Referencia inicial:</strong> Una fecha y hora conocida donde hubo corriente (Ej: Hoy de 10:00 a 13:00)</li>
                <li>Guarda la configuración</li>
            </ol>

            <h3>📅 Calendario</h3>
            <p>Muestra el mes actual con colores:</p>
            <ul>
                <li><span class="help-badge warning">🟠 Naranja</span> — Días con corriente</li>
                <li><span class="help-badge info">⚪ Gris</span> — Días sin corriente</li>
                <li><span class="help-badge danger">🔴 Rojo</span> — Día actual</li>
                <li><span class="help-badge purple">🟣 Borde morado</span> — Día con producción programada</li>
            </ul>
            <p>Navega con <strong>◀ ▶</strong> y vuelve al mes actual con <strong>🔄 Hoy</strong>.</p>

            <h3>📊 Reporte PDF</h3>
            <p>Genera un reporte semanal o mensual con los bloques de corriente de cada día.</p>
        `
    },
    {
        id: 'produccion',
        icon: '🔨',
        title: 'Producción',
        html: `
            <p>El módulo de <strong>Producción</strong> permite programar qué se va a producir cada día, en qué bloque de corriente y con un algoritmo inteligente que sugiere la distribución óptima.</p>

            <h3>🎯 Conceptos clave</h3>
            <div class="help-table-wrapper">
                <table class="help-table">
                    <tr><th style="width: 30%;">Concepto</th><th>Descripción</th></tr>
                    <tr><td>🔨 Bloque de producción</td><td>Bloque de corriente donde se horneará</td></tr>
                    <tr><td>📦 CPD</td><td>Cantidad de Producción Diaria</td></tr>
                    <tr><td>🏭 CMPBC</td><td>Capacidad Máxima por Bloque</td></tr>
                    <tr><td>✨ Algoritmo</td><td>Calcula automáticamente los bloques</td></tr>
                </table>
            </div>

            <h3>📅 Programar producción para un día</h3>
            <ol>
                <li>Ve a <strong>⚙️ Herramientas → ⚡ Gestionar Horarios → 📅 Calendario</strong></li>
                <li>Haz clic en el día que quieras programar</li>
                <li>Selecciona el <strong>🏷️ producto a producir</strong></li>
                <li>Escribe la <strong>📦 cantidad</strong></li>
                <li>Opcional: pulsa <strong>✨ Calcular bloques automáticamente</strong></li>
                <li>Confirma y guarda</li>
            </ol>

            <h3>🧠 Algoritmo inteligente de bloques</h3>
            <p>El sistema sugiere cómo distribuir la producción entre los bloques de corriente, priorizando que el pan esté listo <strong>antes de las 8:00 AM</strong> del día de venta.</p>

            <h4>Reglas del algoritmo:</h4>
            <ul>
                <li><strong>P1:</strong> Bloques que cierran entre 8:00 y 9:00 AM son válidos (tolerancia)</li>
                <li><strong>P2:</strong> Un bloque pertenece al día en que <strong>empieza</strong></li>
                <li><strong>P3:</strong> Cada producto tiene su propio CMPBC</li>
                <li><strong>P4:</strong> Si CPD > CMPBC × bloques disponibles → error</li>
                <li><strong>P5:</strong> El primer bloque lleva más cantidad</li>
                <li><strong>P6:</strong> El usuario puede sobrescribir el cálculo</li>
            </ul>

            <div class="help-card purple">
                <div class="help-card-title">Ejemplo: Jaba de Pan, CMPBC=7, CPD=12</div>
                <p>El algoritmo calcula:</p>
                <ul>
                    <li><strong>Bloques necesarios:</strong> 2 (12 ÷ 7 = 1.71 → 2)</li>
                    <li><strong>Bloque 1 (amanecer):</strong> 7 unidades</li>
                    <li><strong>Bloque 2 (tarde):</strong> 5 unidades</li>
                </ul>
                <p><em>"Se horneará en 2 bloques: 7 al amanecer (2-5 AM), 5 por la tarde (5-8 PM)."</em></p>
            </div>

            <h3>🌙 Producción en el bloque del día anterior</h3>
            <p>Si el primer bloque del día de venta comienza demasiado tarde, el sistema usa el <strong>último bloque del día anterior</strong> para que el pan esté listo al amanecer.</p>
            <p>En el calendario aparece con el icono 🌙 y se guarda con <code>es_bloque_dia_anterior = 1</code>.</p>

            <h3>🔢 Cantidades decimales</h3>
            <p>La cantidad a producir acepta decimales:</p>
            <ul>
                <li><code>6.5</code> = 6 jabas y media</li>
                <li><code>2.25</code> = 2 jabas y cuarto</li>
                <li><code>0.5</code> = media jaba</li>
            </ul>

            <h3>🔍 Diagnóstico de producción</h3>
            <p>Si algo no funciona, ve a <strong>⚙️ Herramientas → 🔍 Diagnóstico de Producción</strong> y ejecuta los 7 tests.</p>
        `
    },
    {
        id: 'rewards',
        icon: '🏆',
        title: 'Premios',
        html: `
            <p>El <strong>Sistema de Premios</strong> fideliza clientes premiando al que más compra.</p>

            <h3>⚙️ Configuración</h3>
            <p>Ve a <strong>💰 Ventas → 🏆 Premios</strong>:</p>
            <ul>
                <li><strong>🎁 Activar sistema:</strong> Toggle para activar/desactivar</li>
                <li><strong>🥇 Premio mensual:</strong> Ej: "Media jaba de pan"</li>
                <li><strong>🥈 Premio anual:</strong> Ej: "Jaba completa de pan"</li>
                <li><strong>⚙️ Cálculo del premio anual:</strong> Navidad (24 dic) / Fin de año (31 dic) / Inicio de año</li>
            </ul>

            <h3>📊 Cálculo automático</h3>
            <p>El sistema calcula automáticamente:</p>
            <ul>
                <li><strong>Mejor cliente del mes:</strong> Suma de compras en el mes actual</li>
                <li><strong>Mejor cliente del año:</strong> Suma de compras en el rango configurado</li>
                <li><strong>Top 5 del mes:</strong> Ranking de los 5 mejores</li>
            </ul>

            <h3>📢 Notificaciones</h3>
            <p>Al inicio de cada mes (días 1-5), el sistema notifica:</p>
            <ul>
                <li>🏆 Al ganador del mes anterior</li>
                <li>📊 El total gastado y número de compras</li>
                <li>🎁 El premio a entregar</li>
            </ul>

            <h3>📊 Tarjeta en Dashboard</h3>
            <p>Se muestra una tarjeta con:</p>
            <ul>
                <li>🥇 Mejor cliente del mes</li>
                <li>🥈 Mejor cliente del año</li>
                <li>🎁 Premio asociado a cada uno</li>
                <li>🏅 Top 5 del mes con medallas</li>
            </ul>
        `
    },
    {
        id: 'notifications',
        icon: '🔔',
        title: 'Notificaciones',
        html: `
            <p>El sistema de <strong>Notificaciones</strong> te mantiene informado de todo lo importante.</p>

            <h3>📌 Tipos de notificación</h3>
            <div class="help-table-wrapper">
                <table class="help-table">
                    <tr><th style="width: 20%;">Tipo</th><th>Descripción</th></tr>
                    <tr><td>✅ Éxito</td><td>Operaciones completadas</td></tr>
                    <tr><td>❌ Error</td><td>Problemas que requieren atención</td></tr>
                    <tr><td>⚠️ Advertencia</td><td>Alertas importantes</td></tr>
                    <tr><td>ℹ️ Información</td><td>Datos relevantes</td></tr>
                    <tr><td>📋 Pedido</td><td>Pedidos para hoy/mañana</td></tr>
                    <tr><td>💰 Deuda</td><td>Deudas pendientes de cobro</td></tr>
                    <tr><td>🛒 Stock</td><td>Insumos con stock bajo</td></tr>
                </table>
            </div>

            <h3>🔔 Campanita</h3>
            <p>El icono 🔔 en la barra superior muestra:</p>
            <ul>
                <li>Badge rojo con el número de notificaciones no leídas</li>
                <li>Al hacer clic → abre el modal de notificaciones</li>
                <li>Al abrir el modal → se marcan como vistas</li>
            </ul>

            <h3>🎵 Sonido configurable</h3>
            <p>Ve a <strong>👤 Perfil → 🔔 Sonido de notificaciones</strong>:</p>
            <ul>
                <li><strong>Toggle:</strong> Activar/desactivar sonido</li>
                <li><strong>🔔 Beep:</strong> Tono corto</li>
                <li><strong>🎵 Chime:</strong> Tono medio</li>
                <li><strong>💧 Pop:</strong> Tono corto y agudo</li>
                <li><strong>⚠️ Alert:</strong> Tono grave</li>
                <li><strong>✅ Success:</strong> Tono agudo y largo</li>
                <li><strong>🔊 Probar:</strong> Escuchar cada sonido</li>
                <li><strong>🔊 Probar todos:</strong> Escuchar todos con animación</li>
            </ul>

            <h3>🚫 Sin duplicados</h3>
            <p>Si una notificación idéntica ya está visible, no se muestra de nuevo. Se agrupa automáticamente.</p>
        `
    },
    {
        id: 'profile',
        icon: '👤',
        title: 'Perfil',
        html: `
            <p>En tu <strong>Perfil</strong> puedes gestionar tu cuenta y preferencias.</p>

            <h3>📋 Información personal</h3>
            <ul>
                <li>👤 Nombre completo</li>
                <li>🏢 Nombre del negocio</li>
                <li>📧 Email</li>
                <li>📞 Teléfono</li>
                <li>📷 Foto de perfil</li>
                <li>🌓 Tema (claro/oscuro)</li>
            </ul>

            <h3>🚀 Guía rápida</h3>
            <p>Toggle para mostrar/ocultar la guía al inicio de la app.</p>

            <h3>📊 Elementos visibles en el Dashboard</h3>
            <p>13 interruptores para personalizar el Dashboard:</p>
            <ul>
                <li>⚡ Horario de corriente hoy</li>
                <li>📋 Pedidos de hoy</li>
                <li>🚀 Ventas liberadas</li>
                <li>🥇 Mejor / Peor día</li>
                <li>👥 Ventas por empleado</li>
                <li>🏆 Mejores clientes</li>
                <li>🏷️ Productos más vendidos</li>
                <li>💵 Análisis de efectivo y banco</li>
                <li>💳 Métodos de pago</li>
                <li>💳 Deudas</li>
                <li>🏆 Premios</li>
                <li>🏦 QR de cuenta bancaria</li>
                <li>🔗 Botones de acción rápida</li>
            </ul>

            <h3>🏦 Datos bancarios</h3>
            <p>Gestiona tus cuentas bancarias:</p>
            <ul>
                <li>🏦 Nombre del banco</li>
                <li>👤 Nombre del propietario de la tarjeta</li>
                <li>📋 Número de cuenta</li>
                <li>📞 Teléfono de confirmación</li>
                <li>📷 Código QR de la cuenta (generado o subido)</li>
            </ul>
        `
    },
    {
        id: 'settings',
        icon: '⚙️',
        title: 'Herramientas',
        html: `
            <p>En <strong>Herramientas</strong> puedes gestionar la configuración avanzada y los datos.</p>

            <h3>⚡ Horarios de corriente</h3>
            <p>Configuración de la planificación eléctrica.</p>

            <h3>⏰ Lista de espera</h3>
            <p>Acceso directo a la gestión de lista de espera y su reporte PDF.</p>

            <h3>🚨 Cancelación global</h3>
            <p>Solo admin. Cancela todos los pedidos en un rango de fechas con causa y nota.</p>

            <h3>🔄 Reprogramar por rango</h3>
            <p>Solo admin. Mueve todos los pedidos de un rango a una fecha destino.</p>

            <h3>📊 Reporte de gastos</h3>
            <p>Genera un reporte parametrizable de gastos por rango, categoría y origen del pago.</p>

            <h3>📤 Exportar base de datos</h3>
            <p>Descarga una copia de seguridad completa o solo datos.</p>

            <h3>📥 Importar base de datos</h3>
            <p>Restaura una copia con 3 modos:</p>
            <ul>
                <li><strong>📥 Importar copia:</strong> Reemplaza todo</li>
                <li><strong>📊 Importar solo datos:</strong> Conserva usuarios</li>
                <li><strong>🔀 Fusionar bases de datos:</strong> Combina por UUID</li>
            </ul>

            <h3>🧩 Salva diferencial</h3>
            <p>Exporta/importa solo recetas y productos en formato JSON.</p>

            <h3>👥 Gestión de usuarios</h3>
            <p>Solo admin. Crear, editar, promover, eliminar usuarios; regenerar código de invitación.</p>

            <h3>🧹 Limpiar datos eliminados</h3>
            <p>Elimina permanentemente los registros con soft-delete.</p>

            <h3>🚨 Eliminación por error</h3>
            <p>Elimina pedidos y ventas creados por error. <strong>NO</strong> se puede deshacer.</p>

            <h3>🚨 Reiniciar base de datos</h3>
            <p>Elimina TODOS los datos excepto usuarios y temas. <strong>Contraseña: "panario"</strong>.</p>

            <div class="help-card danger">
                <div class="help-card-title">⚠️ Advertencia</div>
                <p>Las operaciones de <strong>eliminación</strong> y <strong>reinicio</strong> no se pueden deshacer. Haz copia de seguridad antes.</p>
            </div>
        `
    },
    {
        id: 'atajos',
        icon: '⌨️',
        title: 'Atajos y consejos',
        html: `
            <h3>🖱️ Navegación rápida</h3>
            <div class="help-table-wrapper">
                <table class="help-table">
                    <tr><th style="width: 30%;">Acción</th><th>Cómo hacerlo</th></tr>
                    <tr><td>Ir al inicio</td><td>Clic en el logo 🍞 o botón ⬆️</td></tr>
                    <tr><td>Ir al final</td><td>Botón ⬇️ flotante</td></tr>
                    <tr><td>Abrir ayuda</td><td>Clic en ❓ de la barra superior</td></tr>
                    <tr><td>Abrir notificaciones</td><td>Clic en 🔔 de la barra superior</td></tr>
                    <tr><td>Menú de usuario</td><td>Clic en tu nombre o avatar</td></tr>
                    <tr><td>Cerrar modal</td><td>Tecla Escape o clic fuera</td></tr>
                </table>
            </div>

            <h3>💡 Consejos de uso</h3>
            <ul>
                <li>Configura el <strong>stock mínimo</strong> de cada insumo para recibir alertas</li>
                <li>Usa <strong>ventas liberadas</strong> para clientes ocasionales</li>
                <li>Aprovecha la <strong>reserva por período</strong> para clientes frecuentes</li>
                <li>Configura el <strong>CMPBC</strong> de cada producto para cálculo automático</li>
                <li>Activa el <strong>sistema de premios</strong> para fidelizar</li>
                <li>Revisa el <strong>Dashboard</strong> cada mañana</li>
                <li>Haz <strong>copias de seguridad</strong> semanales</li>
                <li>Registra los <strong>días sin ventas</strong> para tener estadísticas precisas</li>
            </ul>

            <h3>📱 Instalación como app</h3>
            <ol>
                <li>Abre Panario en el navegador (Chrome recomendado)</li>
                <li>Menú → "Añadir a pantalla de inicio"</li>
                <li>La app se instalará como PWA</li>
                <li>Funcionará offline y como app nativa</li>
            </ol>
        `
    },
    {
        id: 'creditos',
        icon: '👨‍💻',
        title: 'Créditos',
        html: `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 72px; margin-bottom: 12px;">🍞</div>
                <h3 style="color: var(--primary); margin: 0;">Panario</h3>
                <p style="color: var(--text-light); margin: 4px 0 20px 0;">"Tu panadería en orden"</p>

                <div style="background: var(--bg); border-radius: var(--radius); padding: 24px; max-width: 400px; margin: 0 auto; text-align: left;">
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                        <div style="width: 80px; height: 80px; border-radius: 50%; 
                                    background: linear-gradient(135deg, #0ea5e9, #0284c7); 
                                    display: flex; align-items: center; justify-content: center; 
                                    font-size: 40px; flex-shrink: 0; overflow: hidden; 
                                    border: 3px solid var(--primary);">
                            <img src="./assets/dev-avatar.png" 
                                 alt="Ricardo Castillo Valdés"
                                 style="width: 100%; height: 100%; object-fit: cover; display: block;"
                                 onerror="this.style.display='none'; this.parentElement.innerHTML='👨‍💻'; this.parentElement.style.fontSize='40px';">
                        </div>
                        <div>
                            <div style="font-weight: 700; font-size: 18px;">Ricardo Castillo Valdés</div>
                            <div style="font-size: 13px; color: var(--text-light);">Desarrollador y Diseñador</div>
                        </div>
                    </div>

                    <div style="border-top: 1px solid var(--border-color); padding-top: 16px;">
                        <div style="font-size: 12px; font-weight: 600; color: var(--text-light); margin-bottom: 10px; text-transform: uppercase;">📞 Contacto</div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <div style="display: flex; align-items: center; gap: 10px; font-size: 14px;">
                                <span style="font-size: 20px;">💬</span>
                                <span><strong>WhatsApp:</strong> +53 55031725</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px; font-size: 14px;">
                                <span style="font-size: 20px;">📧</span>
                                <span><strong>Email:</strong> 3sayricardo@gmail.com</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 24px; color: var(--text-light); font-size: 12px; line-height: 1.7;">
                    <p><strong>Panario v2.3.0</strong></p>
                    <p>© 2026 Ricardo Castillo Valdés</p>
                    <p>Todos los derechos reservados</p>
                    <p style="margin-top: 12px;">Hecho con ❤️ para panaderos artesanales</p>
                    <p>Desarrollado en Cuba 🇨🇺</p>
                </div>
            </div>
        `
    }
];

// ============================================================
// ESTILOS INLINE PARA LA AYUDA
// ============================================================
// Se inyectan una sola vez en el documento. Usan las variables
// CSS de la app para respetar el tema actual.
// ============================================================

const HELP_DETAILED_STYLES_ID = 'help-detailed-styles';

function inyectarEstilosAyuda() {
    if (document.getElementById(HELP_DETAILED_STYLES_ID)) return;
    
    const style = document.createElement('style');
    style.id = HELP_DETAILED_STYLES_ID;
    style.textContent = `
        /* ============================================================
           HELP DETAILED - Estilos integrados
           ============================================================ */
        
        .help-detailed-layout {
            display: flex;
            gap: 20px;
            flex: 1;
            overflow: hidden;
            min-height: 0;
        }
        
        .help-detailed-sidebar {
            width: 240px;
            flex-shrink: 0;
            overflow-y: auto;
            padding-right: 8px;
            border-right: 1px solid var(--border-color);
        }
        
        .help-detailed-search {
            width: 100%;
            padding: 8px 12px;
            border: 2px solid var(--border-color);
            border-radius: 8px;
            background: var(--bg);
            color: var(--text);
            font-size: 13px;
            margin-bottom: 12px;
            transition: border-color 0.2s;
            font-family: inherit;
        }
        
        .help-detailed-search:focus {
            outline: none;
            border-color: var(--primary);
        }
        
        .help-detailed-nav {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: 0;
            margin: 0;
        }
        
        .help-detailed-nav li a {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            color: var(--text);
            text-decoration: none;
            border-radius: 6px;
            font-size: 13px;
            transition: all 0.15s;
            border-left: 3px solid transparent;
            cursor: pointer;
        }
        
        .help-detailed-nav li a:hover {
            background: var(--bg);
            border-left-color: var(--primary);
        }
        
        .help-detailed-nav li a.active {
            background: var(--primary-light);
            color: var(--primary-dark);
            font-weight: 600;
            border-left-color: var(--primary);
        }
        
        .help-detailed-content {
            flex: 1;
            overflow-y: auto;
            padding-right: 8px;
            min-width: 0;
        }
        
        .help-detailed-section {
            background: var(--bg);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            padding: 20px 24px;
            margin-bottom: 14px;
            scroll-margin-top: 20px;
        }
        
        .help-detailed-section h2 {
            font-size: 20px;
            color: var(--primary);
            margin: 0 0 12px 0;
            display: flex;
            align-items: center;
            gap: 10px;
            padding-bottom: 10px;
            border-bottom: 2px solid var(--primary);
        }
        
        .help-detailed-section h3 {
            font-size: 16px;
            color: var(--text);
            margin: 20px 0 10px 0;
        }
        
        .help-detailed-section h4 {
            font-size: 14px;
            color: var(--text);
            margin: 14px 0 6px 0;
        }
        
        .help-detailed-section p {
            margin: 8px 0;
            color: var(--text);
            line-height: 1.6;
            font-size: 14px;
        }
        
        .help-detailed-section ul,
        .help-detailed-section ol {
            margin: 8px 0 8px 24px;
            color: var(--text);
            font-size: 14px;
        }
        
        .help-detailed-section li {
            margin: 4px 0;
            line-height: 1.5;
        }
        
        .help-detailed-section code {
            background: var(--bg-card);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'SF Mono', Monaco, Consolas, monospace;
            font-size: 12px;
            border: 1px solid var(--border-color);
            color: var(--danger);
        }
        
        .help-detailed-section pre {
            background: var(--bg-card);
            padding: 12px;
            border-radius: 8px;
            overflow-x: auto;
            border: 1px solid var(--border-color);
            font-family: 'SF Mono', Monaco, Consolas, monospace;
            font-size: 12px;
            line-height: 1.5;
            margin: 12px 0;
        }
        
        .help-detailed-section pre code {
            background: none;
            padding: 0;
            border: none;
            color: var(--text);
        }
        
        .help-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 14px 16px;
            margin: 12px 0;
        }
        
        .help-card.primary { border-left: 4px solid var(--primary); }
        .help-card.success { border-left: 4px solid var(--success); }
        .help-card.warning { border-left: 4px solid var(--warning); }
        .help-card.danger { border-left: 4px solid var(--danger); }
        .help-card.info { border-left: 4px solid var(--info); }
        .help-card.purple { border-left: 4px solid #8b5cf6; }
        
        .help-card-title {
            font-weight: 700;
            font-size: 13px;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .help-table-wrapper {
            width: 100%;
            overflow-x: auto;
            margin: 12px 0;
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }
        
        .help-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            min-width: 400px;
        }
        
        .help-table th {
            background: var(--primary);
            color: #fff;
            padding: 8px 12px;
            text-align: left;
            font-size: 12px;
            font-weight: 700;
            white-space: nowrap;
        }
        
        .help-table td {
            padding: 8px 12px;
            border-bottom: 1px solid var(--border-color);
            vertical-align: top;
            color: var(--text);
        }
        
        .help-table tr:nth-child(even) td {
            background: var(--bg-card);
        }
        
        .help-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 600;
        }
        
        .help-badge.success { background: var(--success-bg); color: var(--success); }
        .help-badge.danger { background: var(--danger-bg); color: var(--danger); }
        .help-badge.warning { background: var(--warning-bg); color: var(--warning); }
        .help-badge.info { background: var(--info-bg); color: var(--info); }
        .help-badge.purple { background: #8b5cf620; color: #8b5cf6; }
        
        /* Móvil */
        @media (max-width: 768px) {
            .help-detailed-layout {
                flex-direction: column;
                gap: 12px;
            }
            
            .help-detailed-sidebar {
                width: 100%;
                max-height: 180px;
                border-right: none;
                border-bottom: 1px solid var(--border-color);
                padding-right: 0;
                padding-bottom: 8px;
            }
            
            .help-detailed-section {
                padding: 16px;
            }
            
            .help-detailed-section h2 {
                font-size: 18px;
            }
            
            .help-detailed-section h3 {
                font-size: 15px;
            }
            
            .help-table {
                font-size: 12px;
                min-width: 350px;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// ============================================================
// RENDERIZAR LA AYUDA DETALLADA
// ============================================================

function renderHelpDetailed(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('❌ [help-detailed] Container no encontrado:', containerId);
        return;
    }
    
    inyectarEstilosAyuda();
    
    // Generar índice lateral
    const navHtml = HELP_SECTIONS.map(s => `
        <li>
            <a href="#help-section-${s.id}" 
               onclick="event.preventDefault(); scrollToHelpSection('${s.id}');"
               data-section-id="${s.id}">
                <span style="font-size: 16px; width: 20px; text-align: center; flex-shrink: 0;">${s.icon}</span>
                <span>${s.title}</span>
            </a>
        </li>
    `).join('');
    
    // Generar contenido
    const contentHtml = HELP_SECTIONS.map(s => `
        <section class="help-detailed-section" id="help-section-${s.id}" data-section-id="${s.id}">
            <h2>${s.icon} ${s.title}</h2>
            ${s.html}
        </section>
    `).join('');
    
    container.innerHTML = `
        <div class="help-detailed-layout">
            <aside class="help-detailed-sidebar">
                <input type="text" 
                       class="help-detailed-search" 
                       id="help-detailed-search-input"
                       placeholder="🔍 Buscar en la ayuda..."
                       oninput="filtrarAyudaDetallada(this.value)">
                <ul class="help-detailed-nav" id="help-detailed-nav">
                    ${navHtml}
                </ul>
            </aside>
            <div class="help-detailed-content" id="help-detailed-content">
                ${contentHtml}
            </div>
        </div>
    `;
    
    console.log('📖 [help-detailed] Contenido renderizado:', HELP_SECTIONS.length, 'secciones');
    
    // Guardar referencia para uso posterior
    window._helpDetailedContainerId = containerId;
}

// ============================================================
// NAVEGACIÓN A UNA SECCIÓN
// ============================================================

function scrollToHelpSection(sectionId) {
    const section = document.getElementById('help-section-' + sectionId);
    const contentContainer = document.getElementById('help-detailed-content');
    
    if (!section || !contentContainer) return;
    
    const offset = section.offsetTop - contentContainer.offsetTop - 20;
    
    contentContainer.scrollTo({
        top: offset,
        behavior: 'smooth'
    });
    
    // Actualizar enlace activo
    document.querySelectorAll('#help-detailed-nav a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`#help-detailed-nav a[data-section-id="${sectionId}"]`);
    if (activeLink) activeLink.classList.add('active');
}

// ============================================================
// FILTRAR CONTENIDO DE LA AYUDA
// ============================================================

function filtrarAyudaDetallada(query) {
    const q = String(query || '').trim().toLowerCase();
    const navLinks = document.querySelectorAll('#help-detailed-nav a');
    const sections = document.querySelectorAll('.help-detailed-section');
    
    if (!q) {
        navLinks.forEach(a => a.parentElement.style.display = '');
        sections.forEach(s => s.style.display = '');
        return;
    }
    
    let visibleCount = 0;
    
    sections.forEach(section => {
        const text = section.textContent.toLowerCase();
        const matches = text.includes(q);
        section.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
    });
    
    navLinks.forEach(link => {
        const sectionId = link.dataset.sectionId;
        const section = document.getElementById('help-section-' + sectionId);
        const matches = section && section.style.display !== 'none';
        link.parentElement.style.display = matches ? '' : 'none';
    });
    
    console.log(`🔍 [help-detailed] Filtro "${q}": ${visibleCount} secciones visibles`);
}

// ============================================================
// EXPORTACIÓN
// ============================================================

window.HelpDetailedModule = {
    renderHelpDetailed,
    scrollToHelpSection,
    filtrarAyudaDetallada,
    inyectarEstilosAyuda,
    HELP_SECTIONS
};

// Exponer funciones globalmente para uso desde onclick en HTML
window.renderHelpDetailed = renderHelpDetailed;
window.scrollToHelpSection = scrollToHelpSection;
window.filtrarAyudaDetallada = filtrarAyudaDetallada;
window.inyectarEstilosAyuda = inyectarEstilosAyuda;

console.log('📦 Help Detailed Module cargado correctamente v1.0.0 (CORRECCIÓN #14 240926)');
console.log('   📚 Secciones:', HELP_SECTIONS.length);
console.log('   ✅ Sin iframe - todo dentro del mismo documento');
console.log('   ✅ Respeta el tema actual (claro/oscuro)');
console.log('   ✅ Búsqueda en vivo y navegación suave');