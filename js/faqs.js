// ============================================================
// 📦 FAQs - Panario
// v1.0.1 (290926): Base de datos de Preguntas Frecuentes
//   - ✅ Extraídas del documento "RESUMEN DE FAQ - Panario.md"
//   - ✅ FILTRADAS: solo usuario final (sin nivel técnico)
//   - ✅ DEDUPLICADAS: sin preguntas repetidas
//   - ✅ EXCLUIDAS: funciones JS, logs, estructura BD, SW,
//      cache técnico, IDs internos, versiones, migraciones,
//      diagnóstico técnico, producto_id, distribucion_bloques.
//   - ✅ Organizadas por categoría temática
//   - ✅ Renumeradas secuencialmente (1 → N)
//   - ✅ Usadas por help.js y help-detailed.js
//
// TOTAL: 204 FAQs únicas en 19 categorías
// ============================================================

window.FAQS_DB = [

    // ============================================================
    // 🏠 SECCIÓN 1: GENERALES (1-10)
    // ============================================================
    { cat: '🏠 Generales', q: '¿Qué es Panario?', a: 'Es una aplicación PWA para la gestión integral de una panadería artesanal. Permite gestionar insumos, recetas, productos, ventas, pedidos y finanzas.' },
    { cat: '🏠 Generales', q: '¿Funciona sin conexión?', a: 'Sí, Panario funciona completamente offline. Todos tus datos están guardados localmente en tu dispositivo.' },
    { cat: '🏠 Generales', q: '¿Dónde se guardan mis datos?', a: 'En SQLite (base de datos local) y localStorage. Todo queda en tu dispositivo. Nada se envía a servidores externos.' },
    { cat: '🏠 Generales', q: '¿Cómo hago una copia de seguridad?', a: 'Ve a ⚙️ Herramientas y haz clic en "📥 Descargar copia de seguridad". Se descarga un archivo .db con todos tus datos.' },
    { cat: '🏠 Generales', q: '¿Cómo restauro una copia de seguridad?', a: 'En ⚙️ Herramientas, haz clic en "📤 Importar copia de seguridad" y selecciona el archivo .db. Se reemplazarán todos los datos actuales.' },
    { cat: '🏠 Generales', q: '¿Puedo exportar solo recetas y productos?', a: 'Sí. En Herramientas usa "🧩 Salva diferencial" para exportar/importar solo las recetas y productos, sin afectar al resto de la base de datos.' },
    { cat: '🏠 Generales', q: '¿Qué navegadores soporta Panario?', a: 'Chrome, Firefox, Edge, Safari (versiones recientes). Se recomienda Chrome para mejor rendimiento.' },
    { cat: '🏠 Generales', q: '¿Cómo instalo Panario en mi móvil?', a: 'Abre Panario en el navegador y usa "Añadir a pantalla de inicio" o "Instalar aplicación".' },
    { cat: '🏠 Generales', q: '¿Quién desarrolló Panario?', a: 'Panario fue desarrollado por Ricardo Castillo Valdés. Puedes contactarlo por WhatsApp (+53 55031725) o email (3sayricardo@gmail.com).' },
    { cat: '🏠 Generales', q: '¿Por qué no suenan las notificaciones la primera vez que abro la app?', a: 'Los navegadores modernos bloquean el audio hasta que el usuario interactúa con la página. Haz clic en cualquier parte de la app (incluso en login) y las notificaciones sonarán desde ese momento.' },

    // ============================================================
    // 📊 SECCIÓN 2: DASHBOARD (11-27)
    // ============================================================
    { cat: '📊 Dashboard', q: '¿Puedo personalizar qué veo en el Dashboard?', a: 'Sí. Ve a tu Perfil y en la sección "📊 Elementos visibles en el Dashboard" activa o desactiva las secciones que quieres ver.' },
    { cat: '📊 Dashboard', q: '¿Qué significa "Días con ventas"?', a: 'Es el número de días únicos en los que registraste al menos una venta. No cuenta días sin actividad.' },
    { cat: '📊 Dashboard', q: '¿Cómo se calcula el "Promedio diario"?', a: 'Se divide el total de ingresos entre los días con ventas. Ej: si vendiste $1000 en 5 días, el promedio es $200/día.' },
    { cat: '📊 Dashboard', q: '¿Qué es "Clientes diferentes"?', a: 'Es la cantidad de clientes únicos que han comprado al menos una vez. No cuenta clientes repetidos.' },
    { cat: '📊 Dashboard', q: '¿Por qué los pedidos pendientes no aparecen como deudas?', a: 'Porque un pedido es una solicitud, no una venta ejecutada. Solo se considera deuda cuando se ha completado la venta y el cliente no ha pagado.' },
    { cat: '📊 Dashboard', q: '¿Cómo funcionan las flechas ◀▶ del gráfico?', a: 'Permiten navegar entre semanas. ◀ va a semanas anteriores, ▶ vuelve a la semana actual.' },
    { cat: '📊 Dashboard', q: '¿Qué significan los colores del gráfico?', a: '🥇 Verde = día con mayor venta de la semana. 📉 Rojo = día con menor venta. ⭐ Amarillo = día actual.' },
    { cat: '📊 Dashboard', q: '¿Qué es el "modo del gráfico"?', a: 'Es la forma en que se agrupan los días. Puedes elegir "Últimos 7 días", "Semana Dom-Sáb" o "Semana Lun-Dom". Tu elección se guarda automáticamente.' },
    { cat: '📊 Dashboard', q: '¿Qué son las "Ventas liberadas"?', a: 'Son ventas sin cliente identificado (tipo "mostrador anónimo"). Se contabilizan en los totales pero se pueden ocultar del listado.' },
    { cat: '📊 Dashboard', q: '¿Qué es el "Mejor día" y el "Peor día"?', a: 'Son las fechas con mayor y menor facturación histórica de tu negocio. Sirven para identificar patrones de venta.' },
    { cat: '📊 Dashboard', q: '¿Qué son las "Ventas por empleado"?', a: 'Es un ranking de los usuarios de tu negocio según sus ventas registradas. Te permite evaluar el desempeño del equipo.' },
    { cat: '📊 Dashboard', q: '¿Qué significa "Pedidos mañana" en el Dashboard?', a: 'Es el número total de pedidos activos cuya fecha de entrega es mañana. Excluye pedidos cancelados, entregados y los que ya compraron por lista de espera.' },
    { cat: '📊 Dashboard', q: '¿Por qué algunos pedidos de mañana no se cuentan?', a: 'Porque están en estado cancelado, entregado o compró por lista de espera. Solo se cuentan los pedidos activos (pendiente, confirmado, en producción, listo o en lista de espera).' },
    { cat: '📊 Dashboard', q: '¿Puedo ver más detalles de los pedidos de mañana?', a: 'Sí. Haz clic en la tarjeta de "Pedidos mañana" para ir a la lista de Pedidos filtrada por mañana.' },
    { cat: '📊 Dashboard', q: '¿Qué significa cada columna de la tarjeta "Pedidos activos"?', a: '📋 Pedidos hoy: pedidos activos con fecha de entrega = hoy. 📅 Pedidos mañana: pedidos activos con fecha de entrega = mañana. ⏰ En lista de espera: clientes en cola sin fecha concreta o con fecha futura.' },
    { cat: '📊 Dashboard', q: '¿Puedo hacer clic en las columnas del resumen de pedidos?', a: 'Sí. Al hacer clic en cualquier columna (Pedidos hoy, Pedidos mañana o Lista de espera), la app navega automáticamente al módulo de 📋 Pedidos para que puedas gestionarlos.' },
    { cat: '📊 Dashboard', q: '¿Los pedidos cancelados cuentan en "Pedidos mañana"?', a: 'No. Solo se cuentan pedidos activos (pendiente, confirmado, en producción, listo o en lista de espera). Los cancelados, entregados y compró-por-lista se excluyen.' },
    { cat: '📊 Dashboard', q: '¿Cómo se ve la tarjeta "Pedidos activos" en móvil?', a: 'En pantallas pequeñas, las 3 columnas se apilan verticalmente (1 columna por fila). Cada columna mantiene su altura homogénea.' },

    // ============================================================
    // 🛒 SECCIÓN 3: INSUMOS (28-33)
    // ============================================================
    { cat: '🛒 Insumos', q: '¿Qué es un insumo?', a: 'Es todo lo que compras para producir: harina, levadura, yogur, mantequilla, etc.' },
    { cat: '🛒 Insumos', q: '¿Cómo registro un insumo?', a: 'Ve a 🛒 Insumos → clic en "➕ Nuevo Insumo". Completa nombre, unidad, costo, stock y stock mínimo.' },
    { cat: '🛒 Insumos', q: '¿Los insumos se descuentan automáticamente?', a: 'Sí. Al vender un producto o confirmar un pedido, el stock de los insumos se descuenta según la receta asociada.' },
    { cat: '🛒 Insumos', q: '¿Qué es el stock mínimo?', a: 'Es la cantidad mínima que debe tener un insumo. Cuando el stock baja de ese nivel, aparece una alerta roja.' },
    { cat: '🛒 Insumos', q: '¿Puedo eliminar un insumo?', a: 'Sí, pero se aplica soft-delete. Puedes limpiarlo permanentemente desde Herramientas.' },
    { cat: '🛒 Insumos', q: '¿Los usuarios no-admin pueden editar insumos?', a: 'No. Solo los administradores pueden crear, editar o eliminar insumos. Los usuarios regulares tienen modo solo lectura.' },

    // ============================================================
    // 📖 SECCIÓN 4: RECETAS (34-42)
    // ============================================================
    { cat: '📖 Recetas', q: '¿Qué es una receta?', a: 'Es la fórmula de producción que indica qué insumos se necesitan y en qué cantidad. Ej: "Pan de Yogur" con harina, levadura y yogur.' },
    { cat: '📖 Recetas', q: '¿Cómo se calcula el costo de una receta?', a: 'La suma de (cantidad × costo_unitario) de todos los insumos asociados.' },
    { cat: '📖 Recetas', q: '¿Qué hace el botón "🔄 Recalcular"?', a: 'Permite ajustar una receta para un nuevo rendimiento usando regla de 3. Ej: receta para 33 panes → quiero 50 panes.' },
    { cat: '📖 Recetas', q: '¿Cómo comparto una receta?', a: 'En la vista de detalle de la receta, clic en "💬 Compartir". Puedes enviarla por WhatsApp, Messenger, Email o copiarla al portapapeles. Solo admin.' },
    { cat: '📖 Recetas', q: '¿Puedo duplicar una receta?', a: 'Sí. En la lista de recetas, clic en "📋 Duplicar". Se creará una copia con el nombre que elijas. Solo admin.' },
    { cat: '📖 Recetas', q: '¿Qué significa "receta compartida"?', a: 'Es una receta que otros usuarios del mismo negocio pueden ver y usar como plantilla.' },
    { cat: '📖 Recetas', q: '¿Por qué no puedo editar las recetas?', a: 'Las recetas son fórmulas críticas del negocio. Solo los administradores pueden crearlas, editarlas, duplicarlas o eliminarlas. Los usuarios regulares pueden verlas, recalcularlas, usarlas como plantilla y exportarlas en PDF (sin costos).' },
    { cat: '📖 Recetas', q: '¿Por qué no veo los costos de las recetas?', a: 'Los costos son información sensible del negocio. Solo los administradores los ven. Como usuario regular, ves los ingredientes y cantidades pero no los precios.' },
    { cat: '📖 Recetas', q: '¿Puedo recalcular una receta siendo usuario no-admin?', a: 'Sí. Puedes recalcular, pero solo podrás guardar el resultado como una receta nueva (no modificar la original).' },

    // ============================================================
    // 🏷️ SECCIÓN 5: PRODUCTOS (43-46)
    // ============================================================
    { cat: '🏷️ Productos', q: '¿Qué es un producto?', a: 'Es lo que vendes al cliente. Ej: "Jaba de Pan" con precio $550 y 10 panes por jaba.' },
    { cat: '🏷️ Productos', q: '¿Cómo asocio un producto a una receta?', a: 'Al crear/editar el producto, selecciona la receta en el desplegable "📋 Receta asociada".' },
    { cat: '🏷️ Productos', q: '¿Qué es "cantidad por unidad"?', a: 'Es cuántas unidades del producto contiene una unidad de venta. Ej: una jaba tiene 10 panes → cantidad_por_unidad = 10.' },
    { cat: '🏷️ Productos', q: '¿Cómo sé el margen de ganancia?', a: 'En la lista de productos, se muestra el margen calculado automáticamente: (precio - costo) / precio × 100.' },

    // ============================================================
    // 💰 SECCIÓN 6: VENTAS (47-58)
    // ============================================================
    { cat: '💰 Ventas', q: '¿Cómo registro una venta?', a: 'Ve a 💰 Ventas → clic en "➕ Nueva Venta". Selecciona el producto, cantidad, precio, método de pago y cliente.' },
    { cat: '💰 Ventas', q: '¿Qué es una "venta liberada"?', a: 'Es una venta sin cliente identificado, tipo "mostrador anónimo". Se agrupa visualmente y no permite deuda.' },
    { cat: '💰 Ventas', q: '¿Qué es una deuda?', a: 'Es una venta donde el cliente no pagó al momento. Se marca con is_debt = 1 y paid = 0.' },
    { cat: '💰 Ventas', q: '¿Cómo cobro una deuda?', a: 'En Ventas, ve al filtro "💳 Deudas", encuentra al cliente y haz clic en "💰 Cobrar".' },
    { cat: '💰 Ventas', q: '¿Puedo anular una venta?', a: 'Sí. En el detalle de la venta, clic en "🚫 Anular". Se repondrá el stock automáticamente.' },
    { cat: '💰 Ventas', q: '¿Cómo edito el nombre del cliente?', a: 'Al editar una venta, el campo "👤 Comprador" es editable. Si la venta está vinculada a un pedido, se desvinculará.' },
    { cat: '💰 Ventas', q: '¿Para qué sirve registrar un día sin ventas?', a: 'Sirve para llevar un historial y entender mejor las estadísticas. Sin esta información, un día sin ventas parecería simplemente "un mal día" cuando en realidad no abriste.' },
    { cat: '💰 Ventas', q: '¿Qué motivos puedo usar para un día sin ventas?', a: 'Hay 8 predefinidos: ⚡ Apagón, 🛒 Falta de insumos, 🎉 Feriado, 🏖️ Vacaciones, 🏥 Enfermedad, 🔧 Mantenimiento, 🌧️ Mal clima, y 🔄 Otro.' },
    { cat: '💰 Ventas', q: '¿Cómo veo quién hizo cada venta?', a: 'En el detalle de la venta, en la sección de Auditoría, aparece "👤 Creado por: [nombre del vendedor]".' },
    { cat: '💰 Ventas', q: '¿Qué hago si veo ventas duplicadas?', a: 'Ve a ⚙️ Herramientas → 🚨 Eliminación por error. Selecciona las ventas duplicadas y elimínalas permanentemente.' },
    { cat: '💰 Ventas', q: '¿Cómo añado una nota a una venta?', a: 'Al crear una venta (o al editarla), verás un campo "📝 Nota (opcional)". También puedes añadirla después desde el detalle de la venta, pulsando "✏️ Editar nota".' },
    { cat: '💰 Ventas', q: '¿Quién puede modificar la nota de una venta?', a: 'Solo el usuario que creó la venta. Otros usuarios ven la nota pero no pueden editarla.' },

    // ============================================================
    // 📋 SECCIÓN 7: PEDIDOS (59-74)
    // ============================================================
    { cat: '📋 Pedidos', q: '¿Cuál es la diferencia entre pedido y venta?', a: 'Un pedido es una solicitud de un cliente. Una venta es una transacción completada. Los pedidos no son deudas hasta que se entregan.' },
    { cat: '📋 Pedidos', q: '¿Qué estados tiene un pedido?', a: 'Pendiente, Confirmado, En producción, Listo, Entregado, Cancelado, En lista de espera, Compró por lista de espera.' },
    { cat: '📋 Pedidos', q: '¿Qué es la lista de espera?', a: 'Cuando la demanda supera la oferta, los clientes se ponen en cola. Al haber disponibilidad, se les atiende en orden.' },
    { cat: '📋 Pedidos', q: '¿Cómo funciona la reserva por período?', a: 'Permite crear múltiples pedidos a la vez para el mismo cliente. Elige el patrón: rango completo, días de la semana o días específicos.' },
    { cat: '📋 Pedidos', q: '¿Qué es la paridad en reservas?', a: 'Permite filtrar días pares o impares. Ej: "Solo pares" crea pedidos los días 2, 4, 6, 8, 10...' },
    { cat: '📋 Pedidos', q: '¿Cómo se cancelan pedidos automáticamente?', a: 'Los pedidos pendientes/confirmados con más de 48h sin procesar se cancelan automáticamente.' },
    { cat: '📋 Pedidos', q: '¿Qué es "sesión de recogida"?', a: 'Indica si el cliente recogerá el pedido en la mañana (10:00), tarde (15:00) o noche (19:00).' },
    { cat: '📋 Pedidos', q: '¿Cómo gestiono la lista de espera?', a: 'Ve a 📋 Pedidos → botón "⏰ Lista de espera" o a ⚙️ Herramientas → "⏰ Gestionar lista de espera". Desde ahí puedes procesar, cancelar, eliminar o limpiar la lista.' },
    { cat: '📋 Pedidos', q: '¿Qué es la "cancelación global de pedidos"?', a: 'Es una herramienta de admin que cancela TODOS los pedidos en un rango de fechas. Útil para apagones prolongados, falta de insumos o cierres temporales.' },
    { cat: '📋 Pedidos', q: '¿Qué significa cada botón en la lista de espera?', a: '✅ Procesar → crea la venta. ❌ Cancelar → cancela el pedido y repone stock. 🗑️ Quitar → solo quita al cliente de la lista sin cancelar el pedido.' },
    { cat: '📋 Pedidos', q: '¿Qué diferencia hay entre "Cancelar" y "Quitar"?', a: 'Cancelar → cambia el estado del pedido a "cancelado" y repone stock. Quitar → solo elimina al cliente de la lista, el pedido vuelve a "pendiente".' },
    { cat: '📋 Pedidos', q: '¿Cuál es la diferencia entre "Entregar (sin deuda)" y "Entregar (con deuda)"?', a: '✅ Entregar (sin deuda): Crea la venta con is_debt = 0 y paid = 1. Úsalo cuando el cliente paga al momento. 🚚 Entregar (con deuda): Crea la venta con is_debt = 1 y paid = 0. Úsalo cuando el cliente se lleva el producto y paga después.' },
    { cat: '📋 Pedidos', q: '¿Dónde están los botones de entrega?', a: 'En el modal de detalle del pedido (👁️ Ver). Aparecen en la parte inferior, en un contenedor destacado con borde punteado verde.' },
    { cat: '📋 Pedidos', q: '¿Qué pasa si el pedido tenía pago adelantado y uso "Entregar (sin deuda)"?', a: 'Se ignora el saldo pendiente y se marca la venta como pagada completamente. Útil cuando el cliente decide pagar el resto al momento.' },
    { cat: '📋 Pedidos', q: '¿Qué pasa si el pedido tenía pago adelantado parcial y uso "Entregar (con deuda)"?', a: 'La venta se marca como deuda solo por el saldo pendiente (la diferencia entre el total y lo ya pagado). El pago adelantado se respeta.' },
    { cat: '📋 Pedidos', q: '¿Puedo cambiar de opinión después de entregar?', a: 'No directamente. Una vez entregado, el pedido ya generó una venta. Si necesitas corregir el tipo de deuda, debes ir a 💰 Ventas, anular la venta y volver a crearla manualmente.' },

    // ============================================================
    // ⚡ SECCIÓN 8: CORRIENTE (75-80)
    // ============================================================
    { cat: '⚡ Corriente', q: '¿Cómo funcionan los horarios de corriente?', a: 'Define el patrón (ej: 3h corriente / 12h apagón) y el sistema calcula automáticamente todos los bloques de cada día.' },
    { cat: '⚡ Corriente', q: '¿Qué necesito para configurar corriente?', a: 'Una fecha y hora de referencia donde conociste un bloque de corriente. Ej: "Hoy tuve corriente de 10:00 a 13:00".' },
    { cat: '⚡ Corriente', q: '¿Puedo descargar el reporte de corriente?', a: 'Sí. En Herramientas → ⚡ Gestionar Horarios → pestaña 📊 Reporte, elige semanal o mensual y se genera un PDF.' },
    { cat: '⚡ Corriente', q: '¿Por qué el calendario muestra algunos días sin corriente?', a: 'Porque según el patrón configurado, ese día no tiene bloques de corriente. Aparecen en gris.' },
    { cat: '⚡ Corriente', q: '¿Cómo sé si un producto tiene CMPBC configurado?', a: 'En el dropdown del modal de producción, los productos con CMPBC muestran el texto "🏭 X/bloque" (ej: 🏭 7/bloque). Los productos sin CMPBC muestran "— Sin CMPBC —".' },
    { cat: '⚡ Corriente', q: '¿Por qué el modal de producción no guardaba el producto?', a: 'Era un bug de versiones anteriores. En la versión actual, el producto seleccionado se guarda correctamente y al reabrir el modal aparece preseleccionado.' },

    // ============================================================
    // 🏭 SECCIÓN 9: PRODUCCIÓN (81-108)
    // ============================================================
    { cat: '🏭 Producción', q: '¿Qué es el horario de producción?', a: 'Es el bloque de corriente que has marcado como el momento en que hornearás tu producción. Se muestra en la tarjeta del pedido para saber cuándo estará listo el pan.' },
    { cat: '🏭 Producción', q: '¿Cómo defino el horario de producción para un día?', a: 'Ve a ⚙️ Herramientas → ⚡ Gestionar Horarios → 📅 Calendario. Haz clic en un día con corriente, selecciona el bloque y la cantidad a producir, y guarda.' },
    { cat: '🏭 Producción', q: '¿Qué significa "Pedidos: 5/50"?', a: 'Significa que hay 5 pedidos reservados para ese día y la producción programada es de 50 unidades. Aún quedan 45 cupos disponibles.' },
    { cat: '🏭 Producción', q: '¿Por qué no puedo crear más pedidos para un día?', a: 'Porque la producción de ese día está completa. El sistema bloquea la creación para evitar sobreventa. Cambia la fecha o aumenta la cantidad de producción.' },
    { cat: '🏭 Producción', q: '¿Cómo elimino la producción de un día?', a: 'Ve al día en el calendario, haz clic en el modal de detalle y pulsa el botón 🗑️ junto a la sección de producción.' },
    { cat: '🏭 Producción', q: '¿Las ventas directas afectan el cupo de pedidos?', a: 'Sí. Si vendes directamente sin pedido, esas unidades se descuentan del cupo disponible.' },
    { cat: '🏭 Producción', q: '¿Puedo vender más de la cantidad de producción?', a: 'Sí, las ventas directas no se bloquean. Solo los pedidos respetan el cupo de producción.' },
    { cat: '🏭 Producción', q: '¿Qué pasa si no defino producción para un día?', a: 'No hay límite de pedidos para ese día. La tarjeta no muestra el bloque de producción.' },
    { cat: '🏭 Producción', q: '¿Cómo sé si un día tiene producción programada desde la lista de pedidos?', a: 'En la tarjeta de cada fecha verás un bloque morado con: 🔨 Horario de producción, 📋 Pedidos: n/m, 💰 Ventas directas y ✅ x disponibles o ⛔ COMPLETO.' },
    { cat: '🏭 Producción', q: '¿Qué pasa con las reservas por período si algún día está completo?', a: 'En la vista previa de reserva por período, los días completos aparecen con ⛔ Completo (n/m) y se omiten automáticamente al crear. Solo se crean pedidos en los días con disponibilidad.' },
    { cat: '🏭 Producción', q: '¿Puedo producir cantidades que no sean enteras?', a: 'Sí. El campo "Cantidad a producir" acepta decimales. Por ejemplo: 6.5 significa 6 jabas y media, 2.25 significa 2 jabas y cuarto, 0.5 significa media jaba.' },
    { cat: '🏭 Producción', q: '¿Cómo se calcula la cantidad disponible si la producción es decimal?', a: 'La fórmula es: disponibles = cantidad_produccion - pedidos_reservados - ventas_directas. Ejemplo: si produces 6.5 jabas, tienes 5 pedidos y 1 venta directa: 6.5 - 5 - 1 = 0.5 disponibles.' },
    { cat: '🏭 Producción', q: '¿Se puede guardar una cantidad con muchos decimales?', a: 'Sí, pero se recomienda usar máximo 2 decimales para mayor claridad. El sistema los mostrará formateados (ej: 6.33).' },
    { cat: '🏭 Producción', q: '¿Qué pasa si un pedido consume más de lo disponible?', a: 'El sistema bloquea la creación del pedido cuando disponibles <= 0. Muestra un modal informativo.' },
    { cat: '🏭 Producción', q: '¿Cómo veo la cantidad exacta que falta por producir?', a: 'En la tarjeta del día en el calendario, el tooltip muestra la cantidad formateada. En el modal de detalle hay una sección con: Pedidos, Ventas directas y Disponibles.' },
    { cat: '🏭 Producción', q: '¿Puedo cambiar una cantidad ya guardada de entero a decimal?', a: 'Sí. Simplemente abre el día, edita el input y guarda. No hay restricción para cambiar entre enteros y decimales.' },
    { cat: '🏭 Producción', q: '¿Los reportes muestran cantidades decimales?', a: 'Sí. El reporte de corriente y producción muestra las cantidades formateadas sin ceros innecesarios. Ejemplo: 6.5 aparece como 6.5, 6.0 aparece como 6, 0.5 aparece como 0.5.' },
    { cat: '🏭 Producción', q: '¿Qué pasa si intento guardar cantidad 0 o negativa?', a: 'El sistema muestra un error: "⚠️ La cantidad a producir debe ser mayor a 0". Debes ingresar al menos 0.01.' },
    { cat: '🏭 Producción', q: '¿Qué significa "📋 Pedidos: 3/6.5"?', a: 'Significa: 3 pedidos reservados para ese día, 6.5 producción total programada. Aún hay disponibles 6.5 - 3 = 3.5 cupos.' },
    { cat: '🏭 Producción', q: '¿Cuándo aparece "⛔ COMPLETO"?', a: 'Cuando disponibles <= 0, es decir, cuando los pedidos reservados + ventas directas alcanzan o superan la producción total del día.' },
    { cat: '🏭 Producción', q: '¿Puedo crear pedidos para un día sin producción configurada?', a: 'Sí. Los días sin producción no tienen límite de cupos. Solo se aplica la validación cuando hay configuración de producción.' },
    { cat: '🏭 Producción', q: '¿Qué pasa si edito un pedido y cambio la fecha a un día completo?', a: 'En modo edición, el sistema permite guardar aunque esté completo (para no bloquear la edición de otros campos). La validación estricta solo aplica a pedidos nuevos.' },
    { cat: '🏭 Producción', q: '¿Cómo veo cuántos cupos quedan en un día?', a: 'Tres formas: 1) Tarjeta de fecha en la lista de pedidos: ✅ x disponibles. 2) Formulario de pedido: banner morado al seleccionar la fecha. 3) Modal de horario (Calendario → clic en día): sección "✅ Disponibles: x / m".' },
    { cat: '🏭 Producción', q: '¿Los decimales afectan el bloqueo?', a: 'Sí. Ejemplos: Producción 6.5 con 0.5 disponibles → permite 1 pedido más. Producción 6.5 con 0 disponibles → bloquea. Producción 2.25 con 0.25 disponibles → permite 1 pedido más.' },
    { cat: '🏭 Producción', q: '¿Qué pasa si reduzco la producción después de tener pedidos?', a: 'El sistema recalcula disponibles automáticamente. Si reduces la producción por debajo de los pedidos existentes, los nuevos pedidos se bloquearán. Los pedidos ya existentes no se cancelan.' },
    { cat: '🏭 Producción', q: '¿Puedo ver el historial de producción de días pasados?', a: 'Sí. En el calendario, navega a meses anteriores y haz clic en cualquier día. Los días con producción tienen un borde morado y el icono 🔨.' },
    { cat: '🏭 Producción', q: '¿Qué es la "regla del amanecer" en el algoritmo de bloques?', a: 'Es la regla que determina si un bloque de corriente es válido para producir el pan que se venderá al amanecer del día siguiente. Un bloque es válido si termina antes de las 9:00 AM del día de venta.' },
    { cat: '🏭 Producción', q: '¿Por qué un bloque que comienza a las 8:00 AM no es válido para el amanecer?', a: 'Porque si comienza a las 8:00 AM y dura 3 horas, termina a las 11:00 AM. Para entonces, el desayuno ya pasó. El pan debe estar listo antes de las 9:00 AM.' },
    { cat: '🏭 Producción', q: '¿Cuándo se usa el bloque del día anterior?', a: 'Se usa cuando el primer bloque del día de venta comienza demasiado tarde (después de las 8:00 AM) o cuando no hay bloques válidos para el amanecer. El algoritmo prioriza el último bloque del día anterior porque el pan horneado ahí estará listo mucho antes del desayuno.' },
    { cat: '🏭 Producción', q: '¿El algoritmo prioriza el bloque de ayer o el de hoy?', a: 'Prioriza el bloque del día anterior si termina antes de las 9 AM del día de venta. Si no hay bloque del día anterior válido, usa los bloques del día actual que terminen antes de las 9 AM.' },
    { cat: '🏭 Producción', q: '¿Qué pasa si el bloque del día anterior cruza medianoche?', a: 'Se considera válido si su hora de fin es <= 9:00 AM del día de venta. Por ejemplo, un bloque del 23/09 de 11:00 PM a 2:00 AM del 24/09 es válido porque termina a las 2:00 AM.' },
    { cat: '🏭 Producción', q: '¿Puedo modificar manualmente la distribución sugerida?', a: 'Sí. Después de confirmar el cálculo, puedes editar el bloque y la cantidad manualmente en el modal de producción y volver a guardar.' },
    { cat: '🏭 Producción', q: '¿Qué pasa si no hay suficientes bloques disponibles?', a: 'El algoritmo muestra un error indicando cuántas unidades máximo se pueden producir. Puedes: aumentar el CMPBC del producto, elegir otro producto con mayor CMPBC, o dividir la producción en varios días.' },
    { cat: '🏭 Producción', q: '¿Cómo funciona el cálculo automático de bloques?', a: 'Selecciona un producto (con CMPBC), escribe la cantidad y pulsa "✨ Calcular bloques automáticamente". El sistema sugiere cómo distribuir la producción entre los bloques de corriente.' },
    { cat: '🏭 Producción', q: '¿Qué es la "tolerancia del amanecer"?', a: 'Los bloques que terminan entre las 8:00 y 9:00 AM también son válidos para producir el pan del desayuno.' },

    // ============================================================
    // 🏆 SECCIÓN 10: PREMIOS (109-112)
    // ============================================================
    { cat: '🏆 Premios', q: '¿Cómo funciona el sistema de premios?', a: 'Premia a tus mejores clientes. Se calcula automáticamente el cliente con mayor total gastado en el mes y en el año.' },
    { cat: '🏆 Premios', q: '¿Dónde configuro los premios?', a: 'Ve a 💰 Ventas → botón 🏆 Premios. Ahí puedes activar/desactivar, editar los premios y elegir cuándo se calcula el premio anual.' },
    { cat: '🏆 Premios', q: '¿Por qué hay tres opciones para calcular el premio anual?', a: 'Cada negocio es diferente. Puedes elegir entregar el premio en Navidad (24 dic), a fin de año (31 dic) o al inicio del siguiente año (comportamiento por defecto).' },
    { cat: '🏆 Premios', q: '¿Qué pasa si tengo el sistema de premios desactivado?', a: 'El selector de cálculo anual se guarda igualmente, pero no se muestra la tarjeta de premios en el Dashboard ni se envían notificaciones.' },

    // ============================================================
    // 🔔 SECCIÓN 11: NOTIFICACIONES Y AYUDA (113-124)
    // ============================================================
    { cat: '🔔 Notificaciones y Ayuda', q: '¿Puedo cambiar el sonido de las notificaciones?', a: 'Sí. Ve a tu Perfil → 🔔 Sonido de notificaciones. Puedes elegir entre 5 sonidos embutidos o desactivarlo.' },
    { cat: '🔔 Notificaciones y Ayuda', q: '¿Por qué no se repiten las notificaciones?', a: 'Una vez que abres el modal de notificaciones, se marcan como vistas y no se vuelven a mostrar hasta que sean necesarias de nuevo.' },
    { cat: '🔔 Notificaciones y Ayuda', q: '¿Cómo abro el Centro de Ayuda?', a: 'Haz clic en el botón ❓ de la barra superior. Se abrirá un menú flotante con Guía Rápida, Tutorial, FAQ, Ayuda Detallada, Léeme y Créditos.' },
    { cat: '🔔 Notificaciones y Ayuda', q: '¿Qué es la "Ayuda detallada"?', a: 'Es un manual completo que se abre DENTRO de la app, respetando tu tema actual y abriéndose en la sección del módulo donde estés.' },
    { cat: '🔔 Notificaciones y Ayuda', q: '¿Puedo volver a ver el tutorial?', a: 'Sí. Ve a Ayuda → Tutorial Interactivo. Si ya lo completaste, la app te preguntará si quieres volver a verlo.' },
    { cat: '🔔 Notificaciones y Ayuda', q: '¿Cómo contacto al desarrollador?', a: 'En Ayuda → Créditos. WhatsApp: +53 55031725, Email: 3sayricardo@gmail.com.' },
    { cat: '🔔 Notificaciones y Ayuda', q: '¿El Centro de Ayuda bloquea la pantalla?', a: 'No. El Centro de Ayuda es un menú flotante que aparece debajo del botón ❓. Se cierra automáticamente al hacer clic fuera o presionar Escape.' },
    { cat: '🔔 Notificaciones y Ayuda', q: '¿Qué sonidos hay disponibles?', a: 'Cinco sonidos embutidos: 🔔 Beep (tono corto), 🎵 Chime (tono medio), 💧 Pop (tono corto y agudo), ⚠️ Alert (tono grave), ✅ Success (tono agudo y largo). Más la opción 🔇 Silencio.' },
    { cat: '🔔 Notificaciones y Ayuda', q: '¿El "Probar todos" cambia mi sonido configurado?', a: 'No. Al finalizar la prueba, se restaura automáticamente el sonido que tenías configurado. Además, si detienes la prueba con "⏹️ Detener", tampoco se modifica tu configuración.' },
    { cat: '🔔 Notificaciones y Ayuda', q: '¿Puedo desactivar los sonidos completamente?', a: 'Sí. Ve a Perfil → Sonido de notificaciones y desactiva el toggle. También puedes elegir el sonido "🔇 Silencio".' },
    { cat: '🔔 Notificaciones y Ayuda', q: '¿El sonido funciona si no he hecho login todavía?', a: 'Sí. El audio se desbloquea con cualquier gesto, incluso en la pantalla de login. No necesitas estar logueado para que las notificaciones suenen.' },
    { cat: '🔔 Notificaciones y Ayuda', q: '¿Cómo puedo verificar si el audio está desbloqueado?', a: 'Simplemente interactúa con la app (clic, toque o tecla). Si el sonido no suena, verifica que no tengas el modo silencio activado o que el volumen del dispositivo esté subido.' },

    // ============================================================
    // 👥 SECCIÓN 12: MULTIUSUARIO Y ADMINISTRACIÓN (125-140)
    // ============================================================
    { cat: '👥 Multiusuario', q: '¿Puedo tener varios usuarios en el mismo negocio?', a: 'Sí. Al registrarte puedes crear un negocio nuevo o unirte a uno existente con un código de invitación de 8 caracteres.' },
    { cat: '👥 Multiusuario', q: '¿Cómo comparto el código de invitación?', a: 'En tu Perfil, junto al nombre del negocio, verás el código con un botón "📋 Copiar". Envíalo a quien quieras invitar.' },
    { cat: '👥 Multiusuario', q: '¿Quién es el administrador del negocio?', a: 'El primer usuario que crea el negocio es el administrador. Los siguientes usuarios que se unan tendrán rol de usuario regular.' },
    { cat: '👥 Multiusuario', q: '¿Cómo promuevo a un usuario a admin?', a: 'Ve a ⚙️ Herramientas → 👥 Gestionar Usuarios → botón 👑 junto al usuario.' },
    { cat: '👥 Multiusuario', q: '¿Qué puede hacer un admin que un usuario no puede?', a: 'Crear/editar/eliminar insumos, recetas, productos. Gestionar usuarios. Hacer copias completas. Ver costos de recetas. Cancelar/reprogramar pedidos globalmente.' },
    { cat: '👥 Multiusuario', q: '¿Qué es el "primer administrador"?', a: 'Es el usuario que creó el negocio. Se marca con is_first_admin = 1 y tiene privilegios especiales: solo él puede cambiar la configuración bancaria del negocio.' },
    { cat: '👥 Multiusuario', q: '¿Quién es el primer administrador de mi negocio?', a: 'El usuario que creó el negocio. Puedes verificarlo en Herramientas → Gestión de Usuarios: aparece con el badge 👑 y "PRIMER ADMIN".' },
    { cat: '👥 Multiusuario', q: '¿Puedo cambiar quién es el primer administrador?', a: 'No directamente. El primer administrador se establece al crear el negocio y no se puede transferir.' },
    { cat: '👥 Multiusuario', q: '¿Por qué no puedo degradar a un admin a usuario normal?', a: 'Si el admin es el primer administrador del negocio, no se puede degradar. Es una protección para garantizar que siempre haya al menos un primer admin.' },
    { cat: '👥 Multiusuario', q: '¿Por qué no puedo eliminar a un usuario?', a: 'Si el usuario es el primer administrador del negocio, no se puede eliminar. Es una protección para garantizar que siempre haya al menos un primer admin.' },
    { cat: '👥 Multiusuario', q: '¿Qué pasa si el negocio tenía usuarios antes de esta actualización?', a: 'Al hacer login por primera vez después de actualizar, el sistema marca automáticamente al usuario más antiguo del negocio como is_first_admin = 1.' },
    { cat: '👥 Multiusuario', q: '¿Cómo sé si un usuario es el primer admin?', a: 'En Herramientas → Gestión de Usuarios, el primer admin aparece con el badge "👑 PRIMER ADMIN" junto a su nombre.' },
    { cat: '👥 Multiusuario', q: '¿Qué pasa si un usuario es eliminado?', a: 'Sus ventas se mantienen, pero el nombre del vendedor aparecerá como "Desconocido" en la auditoría.' },
    { cat: '👥 Multiusuario', q: '¿Puedo filtrar ventas por vendedor?', a: 'Puedes ver el ranking de ventas por empleado en el Dashboard. Además, si hay más de 1 usuario en el negocio, aparece un selector "👤 Vendedor" en Ventas para ver solo las ventas de un vendedor específico.' },
    { cat: '👥 Multiusuario', q: '¿Cómo sé quién vendió cada producto?', a: 'En el detalle de cada venta, en la sección de Auditoría, aparece "👤 Creado por: [nombre del vendedor]".' },
    { cat: '👥 Multiusuario', q: '¿Qué configuraciones son individuales por usuario?', a: 'Todas las del perfil: 🎨 Tema (claro/oscuro), 📷 Foto de perfil, 🔔 Sonido de notificaciones, 🚀 Guía rápida activada, 📊 13+ toggles del Dashboard, 📈 Modo del gráfico, 🏦 Cuenta bancaria por defecto.' },

    // ============================================================
    // ⚙️ SECCIÓN 13: HERRAMIENTAS (141-150)
    // ============================================================
    { cat: '⚙️ Herramientas', q: '¿Qué hace "Reiniciar base de datos"?', a: 'Elimina TODOS los datos excepto usuarios y temas. Se conservan las cuentas de usuario para que puedas volver a entrar. Contraseña: "panario".' },
    { cat: '⚙️ Herramientas', q: '¿Qué diferencia hay entre "Limpiar datos eliminados" y "Eliminación por error"?', a: 'Ambas son destructivas. "Limpiar datos eliminados" borra todos los registros con soft-delete. "Eliminación por error" permite seleccionar pedidos o ventas específicos para eliminar permanentemente.' },
    { cat: '⚙️ Herramientas', q: '¿Cómo fusiono dos bases de datos?', a: 'Ve a ⚙️ Herramientas → 📥 Importar → 🔀 Fusionar bases de datos. Los registros nuevos se añaden, los existentes se comparan por UUID (gana el más reciente).' },
    { cat: '⚙️ Herramientas', q: '¿Qué pasa si importo datos duplicados?', a: 'El sistema evita duplicados al fusionar: compara por UUID y solo actualiza si el backup es más reciente. Los duplicados se omiten automáticamente.' },
    { cat: '⚙️ Herramientas', q: '¿Cómo evito duplicados al importar?', a: 'Usa la opción "🔀 Fusionar bases de datos". El sistema compara por UUID y solo añade registros nuevos, actualizando los existentes solo si son más recientes.' },
    { cat: '⚙️ Herramientas', q: '¿Puedo importar la misma salva dos veces?', a: 'Sí, no habrá duplicados. El sistema detecta los registros ya importados y los omite o actualiza según corresponda.' },
    { cat: '⚙️ Herramientas', q: '¿Cómo verifico si hay duplicados en mi base de datos?', a: 'Ve a ⚙️ Herramientas → 🚨 Eliminación por error. Revisa la lista de pedidos y ventas. Si ves entradas idénticas, selecciónalas y elimínalas.' },
    { cat: '⚙️ Herramientas', q: '¿Qué hace el botón "📊 Reporte de gastos"?', a: 'Genera un reporte parametrizable de gastos por rango, categoría y origen del pago. Te permite analizar en qué se va el dinero.' },
    { cat: '⚙️ Herramientas', q: '¿Qué es la "Reprogramación por rango"?', a: 'Es una herramienta de admin que mueve todos los pedidos de un rango de fechas a una fecha destino. Útil para reprogramar múltiples pedidos a la vez.' },
    { cat: '⚙️ Herramientas', q: '¿Qué pasa si no hay registros eliminados para limpiar?', a: 'El modal de progreso mostrará un mensaje indicando "No había registros eliminados para limpiar" y se cerrará automáticamente.' },

    // ============================================================
    // 🏦 SECCIÓN 14: BANCOS (151-170)
    // ============================================================
    { cat: '🏦 Bancos', q: '¿Cómo agrego una cuenta bancaria?', a: 'Ve a tu Perfil → 🏦 Datos Bancarios → completa banco, titular, número de cuenta, teléfono y guarda.' },
    { cat: '🏦 Bancos', q: '¿Puedo generar un QR para mi cuenta bancaria?', a: 'Sí. En el formulario de cuenta bancaria, pulsa "✨ Generar QR". Panario lo crea con los datos que ingresaste (banco, titular, cuenta, teléfono).' },
    { cat: '🏦 Bancos', q: '¿Puedo subir mi propio QR en vez de generarlo?', a: 'Sí. Usa "📁 Subir imagen" para subir el QR de tu app bancaria, o "📸 Cámara" para capturarlo directamente.' },
    { cat: '🏦 Bancos', q: '¿Qué es el toggle "Compartida" en una cuenta bancaria?', a: 'Si lo activas, todos los usuarios de tu negocio podrán ver esa cuenta (solo lectura). Útil para que todos cobren a la misma cuenta.' },
    { cat: '🏦 Bancos', q: '¿Cómo marco una cuenta como compartida?', a: 'Al crear o editar una cuenta bancaria, activa el toggle 🔗 Compartida. La cuenta aparecerá con un badge morado en la lista.' },
    { cat: '🏦 Bancos', q: '¿Puedo descompartir una cuenta?', a: 'Sí. Edita la cuenta y desactiva el toggle 🔗 Compartida. Los demás usuarios dejarán de verla inmediatamente.' },
    { cat: '🏦 Bancos', q: '¿Quién ve las cuentas compartidas?', a: 'Todos los usuarios del mismo negocio, siempre que el admin tenga activada la opción "Permitir a usuarios ver QRs de otros" en Configuración Bancaria.' },
    { cat: '🏦 Bancos', q: '¿Cómo puedo tener mi propia cuenta bancaria por defecto?', a: 'Ve a tu Perfil → Datos Bancarios → marca la casilla "Establecer como predeterminada" en la cuenta que quieras. Tu elección es individual: no afecta a lo que ven otros usuarios.' },
    { cat: '🏦 Bancos', q: '¿Qué significa el badge "⭐ Mi default" en una cuenta bancaria?', a: 'Significa que esa cuenta es tu cuenta por defecto individual. Se usará para mostrar el QR en tu Dashboard. Cada usuario puede tener su propia cuenta por defecto si el admin lo permite.' },
    { cat: '🏦 Bancos', q: '¿Qué significa el badge "👑 Default global"?', a: 'Es la cuenta designada por el administrador como predeterminada del negocio. Solo la ve el admin. Se usa cuando un usuario no-admin no tiene una cuenta por defecto individual configurada.' },
    { cat: '🏦 Bancos', q: '¿Cómo cambio mi cuenta bancaria por defecto?', a: 'Ve a Perfil → Datos Bancarios → en tu cuenta bancaria, pulsa ⭐ Mi Default. Si no ves este botón, es porque el administrador ha desactivado la opción.' },
    { cat: '🏦 Bancos', q: '¿Qué significa "Solo lectura" en una cuenta bancaria?', a: 'Es una cuenta de otro usuario que puedes ver (porque el admin activó "Permitir a usuarios ver QRs de otros") pero no editar ni eliminar. Solo el dueño de la cuenta o el administrador pueden modificar sus datos.' },
    { cat: '🏦 Bancos', q: '¿Por qué el QR del Dashboard cambió sin que yo lo tocara?', a: 'Porque el administrador cambió la cuenta por defecto global, o porque tú cambiaste tu cuenta por defecto individual. El Dashboard muestra la cuenta por defecto del usuario actual.' },
    { cat: '🏦 Bancos', q: '¿Puedo elegir la cuenta por defecto de otro usuario?', a: 'No. La cuenta por defecto es individual: cada usuario elige la suya (si el admin lo permite). Solo el administrador puede cambiar la cuenta por defecto global del negocio.' },
    { cat: '🏦 Bancos', q: '¿Qué pasa si no tengo ninguna cuenta por defecto configurada?', a: 'El sistema usa la cuenta que el administrador haya designado como "default global". Si tampoco existe, se usa la primera cuenta disponible.' },
    { cat: '🏦 Bancos', q: '¿Dónde configuro los permisos de las cuentas bancarias?', a: 'En Herramientas → 🔐 Configuración Bancaria (solo admin). Ahí puedes activar o desactivar: "Permitir a usuarios ver QRs de otros" y "Permitir a usuarios cambiar su cuenta por defecto".' },
    { cat: '🏦 Bancos', q: '¿Qué pasa si activo "Permitir a usuarios ver QRs de otros"?', a: 'Los usuarios no-admin podrán ver TODAS las cuentas bancarias del negocio, pero solo en modo lectura para las ajenas. Solo el dueño o el admin pueden editar/eliminar.' },
    { cat: '🏦 Bancos', q: '¿Qué pasa si activo "Permitir a usuarios cambiar su cuenta por defecto"?', a: 'Cada usuario podrá elegir cuál de sus cuentas usar por defecto (individual). Verá el botón "⭐ Mi Default" en sus cuentas.' },
    { cat: '🏦 Bancos', q: '¿Qué es el toggle "Solo usar y mostrar el QR del administrador"?', a: 'Es un tercer toggle en Herramientas → Configuración Bancaria. Si lo activas, todos los usuarios del negocio verán en su Dashboard únicamente el QR que tú (admin) hayas designado como predeterminado global, ignorando sus cuentas individuales.' },
    { cat: '🏦 Bancos', q: '¿Por qué ya no veo las cuentas bancarias de otros usuarios?', a: 'Los usuarios no administradores solo ven sus propias cuentas bancarias. Esta es una medida de privacidad. Si necesitas ver las cuentas de otros, pídele al administrador que active la opción "Permitir a usuarios ver QRs de otros".' },

    // ============================================================
    // 📱 SECCIÓN 15: PWA Y OFFLINE (171-185)
    // ============================================================
    { cat: '📱 PWA y Offline', q: '¿Por qué la app no funciona offline después de limpiar el caché?', a: 'Cuando limpias el caché de Chrome, se borran los archivos de la PWA. Abre Panario con conexión a internet una vez y espera 5-10 segundos para que se vuelvan a cachear.' },
    { cat: '📱 PWA y Offline', q: '¿Cómo reinstalo la PWA correctamente?', a: 'Desinstala la PWA, limpia el caché del navegador, abre Panario online, espera a que cargue completamente y vuelve a instalarla.' },
    { cat: '📱 PWA y Offline', q: '¿Qué hacer si veo "Sin conexión" pero tengo internet?', a: 'Es posible que el Service Worker tenga una versión antigua. Ve a offline.html y pulsa "Limpiar caché y recargar".' },
    { cat: '📱 PWA y Offline', q: '¿Qué es la página "Sin conexión" de Panario?', a: 'Es una pantalla que se muestra cuando el Service Worker no puede servir la app desde caché ni desde red. Desde ahí puedes reintentar la conexión, limpiar el caché, o esperar a que el auto-retry detecte la reconexión.' },
    { cat: '📱 PWA y Offline', q: '¿Qué significa el indicador de conexión (punto rojo/verde)?', a: '🟢 Verde: Hay conexión al servidor. 🔴 Rojo parpadeante: No hay conexión (o el servidor no responde).' },
    { cat: '📱 PWA y Offline', q: '¿Qué hace el botón "Reintentar conexión"?', a: 'Verifica si navigator.onLine es true Y si el servidor responde. Si ambos son OK, recarga la app automáticamente.' },
    { cat: '📱 PWA y Offline', q: '¿Qué hace el botón "Limpiar caché y recargar"?', a: 'Desregistra todos los Service Workers, elimina todas las cachés, y recarga la página con un parámetro anti-caché. Útil si la app muestra datos obsoletos o no carga correctamente.' },
    { cat: '📱 PWA y Offline', q: '¿Qué es el auto-retry?', a: 'Es un mecanismo que reintenta la conexión automáticamente cada 5 segundos (máximo 12 intentos = 1 minuto). Si detecta reconexión, recarga la app sola.' },
    { cat: '📱 PWA y Offline', q: '¿Qué atajos de teclado hay en la página offline?', a: 'R: Reintentar conexión. Esc: Ir al inicio (index.html).' },
    { cat: '📱 PWA y Offline', q: '¿Por qué a veces dice "Servidor no accesible" si tengo internet?', a: 'Porque navigator.onLine puede reportar true aunque el servidor no responda (por ejemplo, si estás conectado a una WiFi que no tiene salida a internet). El check de fetch HEAD al index.html es más fiable.' },
    { cat: '📱 PWA y Offline', q: '¿La página offline funciona en modo oscuro?', a: 'Sí. Detecta la preferencia del sistema con prefers-color-scheme: dark y adapta los colores.' },
    { cat: '📱 PWA y Offline', q: '¿Qué pasa si limpio el caché pero sigo sin internet?', a: 'La app no podrá cargarse offline hasta que tengas internet al menos una vez. La página offline te mostrará el mensaje "Servidor no accesible" o "Sin conexión".' },
    { cat: '📱 PWA y Offline', q: '¿Cuánto tiempo tengo que esperar para que el auto-retry funcione?', a: 'Máximo 5 segundos después de recuperar la conexión. El auto-retry verifica cada 5 segundos, y si detecta reconexión, recarga en menos de 1 segundo.' },
    { cat: '📱 PWA y Offline', q: '¿Puedo desactivar el auto-retry?', a: 'No directamente, pero si cierras la pestaña o pulsas Esc para ir al inicio, el auto-retry se detiene. Si vuelves a la página offline, se reinicia.' },
    { cat: '📱 PWA y Offline', q: '¿Qué diferencia hay entre "Reintentar conexión" y "Limpiar caché y recargar"?', a: 'Reintentar: solo verifica conexión. Si hay red, recarga. No toca el caché. Limpiar caché: desregistra SWs y elimina cachés. Útil si el caché está corrupto.' },

    // ============================================================
    // 🔄 SECCIÓN 16: REPROGRAMACIÓN (186-196)
    // ============================================================
    { cat: '🔄 Reprogramación', q: '¿Cómo reprogramo pedidos a otra fecha?', a: 'Ve a ⚙️ Herramientas → 🔄 Reprogramar Pedidos por Rango. Selecciona el rango de fechas origen, la fecha destino, la causa y confirma.' },
    { cat: '🔄 Reprogramación', q: '¿Puedo reprogramar solo los pedidos de un cliente?', a: 'Sí. En el modal de reprogramación, hay un campo opcional de cliente. Si lo llenas, solo se reprograman los pedidos de ese cliente.' },
    { cat: '🔄 Reprogramación', q: '¿Qué pasa con la causa y nota al reprogramar?', a: 'La causa y nota se añaden automáticamente al campo de notas de cada pedido, para tener un historial de por qué se movió.' },
    { cat: '🔄 Reprogramación', q: '¿Se puede deshacer una reprogramación?', a: 'No directamente. Deberás volver a reprogramar los pedidos a la fecha original o editar cada pedido manualmente.' },
    { cat: '🔄 Reprogramación', q: '¿Los pedidos entregados se pueden reprogramar?', a: 'No. Solo se reprograman pedidos en estado pendiente, confirmado, en producción o listo.' },
    { cat: '🔄 Reprogramación', q: '¿Qué pasa si la fecha destino ya tiene pedidos?', a: 'Los pedidos reprogramados se añaden a los ya existentes. Se respeta el cupo de producción si está configurado.' },
    { cat: '🔄 Reprogramación', q: '¿Quién puede reprogramar pedidos?', a: 'Solo el administrador del negocio. Es una operación crítica que afecta a múltiples clientes a la vez.' },
    { cat: '🔄 Reprogramación', q: '¿La reprogramación afecta el stock?', a: 'No directamente. El stock ya fue descontado (o no) según el estado original del pedido. La reprogramación solo cambia la fecha.' },
    { cat: '🔄 Reprogramación', q: '¿La reprogramación conserva la hora de entrega?', a: 'Sí. Solo cambia la fecha, la hora se mantiene igual que antes (por ejemplo, si era a las 10:00, sigue siendo a las 10:00).' },
    { cat: '🔄 Reprogramación', q: '¿Puedo reprogramar pedidos a una fecha pasada?', a: 'Sí, técnicamente. Pero no es recomendable porque puede afectar a las estadísticas. Si necesitas corregir, considera editar el pedido individualmente.' },
    { cat: '🔄 Reprogramación', q: '¿Qué pasa con las notas y la causa al reprogramar?', a: 'La causa y la nota se añaden automáticamente al campo notes de cada pedido afectado, precedido del texto "Reprogramado: ". Ej: Reprogramado: 🔄 Falta de insumos | Se pospone una semana.' },

    // ============================================================
    // 📈 SECCIÓN 17: REPORTES (197-205)
    // ============================================================
    { cat: '📈 Reportes', q: '¿En qué orden aparecen las ventas en el reporte PDF?', a: 'Se ordenan por fecha ascendente y, dentro de la misma fecha, por ID ascendente. La venta más antigua del día aparece primero.' },
    { cat: '📈 Reportes', q: '¿En qué orden aparecen los pedidos en el reporte PDF?', a: 'Igual: por fecha de entrega ascendente y luego por ID ascendente. El primer pedido creado para esa fecha aparece primero.' },
    { cat: '📈 Reportes', q: '¿Las deudas también se ordenan?', a: 'Sí. En el reporte de deudas, se ordenan por fecha de venta ascendente y luego por ID ascendente. La deuda más antigua aparece primero.' },
    { cat: '📈 Reportes', q: '¿Por qué añadieron la columna # en los reportes?', a: 'Para que puedas identificar rápidamente cada venta/pedido por su ID y relacionarlo con el módulo de Eliminación por Error o con la lista de la app.' },
    { cat: '📈 Reportes', q: '¿Puedo cambiar el orden de los reportes?', a: 'Actualmente no. Los reportes usan un orden fijo (fecha ASC + ID ASC) que refleja el orden cronológico real. Si necesitas otro orden, exporta a CSV o edita manualmente.' },
    { cat: '📈 Reportes', q: '¿Puedo ver el número total de ventas/pedidos al final del reporte?', a: 'Sí. El reporte de ventas muestra el total de ventas, ingresos totales, promedio por venta, ventas liberadas y deudas pendientes. El reporte de pedidos muestra la distribución por estado.' },
    { cat: '📈 Reportes', q: '¿Por qué el reporte de ventas muestra solo 100 filas?', a: 'Para que el PDF no se haga demasiado largo. Si necesitas ver más, filtra por un rango de fechas más específico o usa la exportación de la base de datos.' },
    { cat: '📈 Reportes', q: '¿Qué significa la columna 🚀 en el detalle de ventas?', a: 'Indica que esa venta es una venta liberada (sin cliente identificado).' },
    { cat: '📈 Reportes', q: '¿Los reportes respetan el tema oscuro?', a: 'No. Los reportes PDF siempre se generan en fondo blanco con texto negro, para garantizar legibilidad al imprimir. El tema de la app no afecta al PDF.' },

    // ============================================================
    // 📅 SECCIÓN 18: DÍAS SIN VENTAS (206-208)
    // ============================================================
    { cat: '📅 Días sin ventas', q: '¿Qué significa "SV." en el gráfico de ventas?', a: 'Es la abreviatura de "Sin Ventas". Aparece sobre los días que no tuvieron ventas y muestra el motivo registrado (ej: "SV. Apagón", "SV. Falta de insumos").' },
    { cat: '📅 Días sin ventas', q: '¿Por qué algunos días del gráfico no muestran el motivo SV?', a: 'Solo se muestra el motivo si ese día está registrado en la tabla de "Días sin ventas". Si no se registró, el día aparece en blanco pero sin texto.' },
    { cat: '📅 Días sin ventas', q: '¿Cómo registro un día sin ventas?', a: 'Ve a 💰 Ventas → botón "📅 Día sin ventas", selecciona la fecha y el motivo. También puedes hacerlo desde Herramientas si está disponible.' },

    // ============================================================
    // 💳 SECCIÓN 19: DEUDAS Y PAGOS (209-216)
    // ============================================================
    { cat: '💳 Deudas y Pagos', q: '¿Qué es una deuda?', a: 'Es una venta donde el cliente no pagó al momento. Se marca con is_debt = 1 y paid = 0.' },
    { cat: '💳 Deudas y Pagos', q: '¿Cómo cobro una deuda?', a: 'En Ventas, ve al filtro "💳 Deudas", encuentra al cliente y haz clic en "💰 Cobrar".' },
    { cat: '💳 Deudas y Pagos', q: '¿Qué pasa si el pedido tenía pago adelantado y uso "Entregar (sin deuda)"?', a: 'Se ignora el saldo pendiente y se marca la venta como pagada completamente. Esto es útil cuando el cliente decide pagar el resto al momento de la entrega.' },
    { cat: '💳 Deudas y Pagos', q: '¿Qué pasa si el pedido tenía pago adelantado parcial y uso "Entregar (con deuda)"?', a: 'La venta se marca como deuda solo por el saldo pendiente (la diferencia entre el total y lo ya pagado). El pago adelantado se respeta.' },
    { cat: '💳 Deudas y Pagos', q: '¿Qué pasa si el pedido no tiene pago adelantado y uso "Entregar (sin deuda)"?', a: 'La venta se crea con is_debt = 0 y paid = 1. El check "Es una deuda" queda desmarcado en Ventas. Es como si el cliente hubiera pagado al momento.' },
    { cat: '💳 Deudas y Pagos', q: '¿Qué pasa si el pedido no tiene pago adelantado y uso "Entregar (con deuda)"?', a: 'La venta se crea con is_debt = 1 y paid = 0. El check "Es una deuda" queda marcado. Debes ir a Ventas → Deudas para cobrarla.' },
    { cat: '💳 Deudas y Pagos', q: '¿Por qué el botón "sin deuda" es verde y el "con deuda" es naranja?', a: 'Por convención visual: verde significa "todo en orden / pagado", naranja significa "pendiente / atención requerida". Esto ayuda a elegir rápidamente la opción correcta.' },

];

console.log('📚 FAQs cargadas: ' + window.FAQS_DB.length + ' preguntas');
console.log('📂 Categorías: ' + [...new Set(window.FAQS_DB.map(f => f.cat))].length);