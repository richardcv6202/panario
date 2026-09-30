// ============================================================
// 📦 FAQs - Panario
// v1.0.0 (290926): Base de datos de Preguntas Frecuentes
//   - ✅ Extraídas del manual técnico y resúmenes de correcciones
//   - ✅ Filtradas: solo usuario final (sin nivel técnico)
//   - ✅ Organizadas por categoría temática
//   - ✅ Usadas por help.js y help-detailed.js
// ============================================================

window.FAQS_DB = [
    // ============================================================
    // 🏠 SECCIÓN 1: GENERALES
    // ============================================================
    { 
        cat: '🏠 Generales', 
        q: '¿Qué es Panario?', 
        a: 'Es una aplicación PWA para la gestión integral de una panadería artesanal. Permite gestionar insumos, recetas, productos, ventas, pedidos y finanzas, todo desde tu móvil y sin necesidad de internet.' 
    },
    { 
        cat: '🏠 Generales', 
        q: '¿Por qué se llama "Panario"?', 
        a: 'El nombre es un juego con "pan" y "diario" (de contabilidad). Es corto, original y describe perfectamente el propósito: llevar el diario contable de una panadería.' 
    },
    { 
        cat: '🏠 Generales', 
        q: '¿Necesito internet para usar Panario?', 
        a: 'No. Panario funciona 100% offline. Todos los datos se guardan en tu dispositivo. Solo necesitas internet para la primera carga y para recibir actualizaciones.' 
    },
    { 
        cat: '🏠 Generales', 
        q: '¿Mis datos están seguros?', 
        a: 'Sí. Todos los datos se guardan localmente en tu dispositivo, no se envían a ningún servidor externo. Puedes hacer copias de seguridad periódicas desde Herramientas.' 
    },
    { 
        cat: '🏠 Generales', 
        q: '¿En qué dispositivos funciona Panario?', 
        a: 'Funciona en cualquier navegador moderno (Chrome, Firefox, Safari, Edge) en Android, iOS, Windows, macOS y Linux. Está optimizado para móviles.' 
    },
    { 
        cat: '🏠 Generales', 
        q: '¿Cómo instalo Panario en mi móvil?', 
        a: 'Abre Panario en Chrome, toca el menú (tres puntos) y selecciona "Añadir a pantalla de inicio". La app se instalará como una app nativa y funcionará offline.' 
    },
    { 
        cat: '🏠 Generales', 
        q: '¿Cuántos usuarios pueden usar Panario a la vez?', 
        a: 'Panario está diseñado para 1 a 3 usuarios por negocio. Todos comparten los mismos datos (insumos, ventas, pedidos) pero con permisos diferentes (admin o usuario regular).' 
    },
    { 
        cat: '🏠 Generales', 
        q: '¿Qué es un "negocio" en Panario?', 
        a: 'Un negocio es tu panadería. Cada negocio tiene su propio código de invitación para que otros usuarios puedan unirse y trabajar contigo.' 
    },
    { 
        cat: '🏠 Generales', 
        q: '¿Qué es un "usuario administrador"?', 
        a: 'El administrador es el dueño del negocio. Puede crear, editar y eliminar todo: insumos, recetas, productos, usuarios, etc. Los usuarios regulares tienen permisos limitados.' 
    },
    { 
        cat: '🏠 Generales', 
        q: '¿Qué es un "usuario regular"?', 
        a: 'Es un usuario con permisos limitados. Puede ver insumos, recetas y productos, y registrar ventas y pedidos. No puede modificar la configuración del negocio.' 
    },
    { 
        cat: '🏠 Generales', 
        q: '¿Qué es el "primer administrador"?', 
        a: 'Es el usuario que creó el negocio. Tiene todos los permisos de un admin y además es el único que puede cambiar la configuración bancaria. No puede ser degradado ni eliminado.' 
    },
    { 
        cat: '🏠 Generales', 
        q: '¿Cómo puedo ver la versión de Panario que tengo?', 
        a: 'Ve a Herramientas → Información. Ahí verás la versión actual de la aplicación.' 
    },
    { 
        cat: '🏠 Generales', 
        q: '¿Qué significan los emojis en la app?', 
        a: 'Los emojis son una forma rápida de identificar acciones y módulos. Por ejemplo: 🛒 Insumos, 📖 Recetas, 💰 Ventas, 📋 Pedidos. Están diseñados para que puedas usar la app sin leer mucho texto.' 
    },
    { 
        cat: '🏠 Generales', 
        q: '¿Cómo puedo contactar al desarrollador?', 
        a: 'Puedes contactar a Ricardo Castillo Valdés por WhatsApp (+53 55031725) o por email (3sayricardo@gmail.com). Los datos están en Ayuda → Créditos.' 
    },

    // ============================================================
    // 🚀 SECCIÓN 2: PRIMEROS PASOS
    // ============================================================
    { 
        cat: '🚀 Primeros Pasos', 
        q: '¿Cómo empiezo a usar Panario?', 
        a: 'Sigue estos 5 pasos: 1) Registra tus insumos, 2) Crea tus recetas, 3) Define tus productos, 4) Registra tus ventas, 5) Gestiona tus pedidos. Puedes ver una guía rápida desde Ayuda → Guía rápida.' 
    },
    { 
        cat: '🚀 Primeros Pasos', 
        q: '¿Cómo registro un insumo?', 
        a: 'Ve a 🛒 Insumos → "➕ Nuevo Insumo". Completa nombre, unidad (kg, g, L), costo, stock actual y stock mínimo. Guarda.' 
    },
    { 
        cat: '🚀 Primeros Pasos', 
        q: '¿Cómo creo una receta?', 
        a: 'Ve a 📖 Recetas → "➕ Nueva Receta". Dale un nombre, define el rendimiento (ej: 33 panes) y asocia los insumos con sus cantidades. Guarda.' 
    },
    { 
        cat: '🚀 Primeros Pasos', 
        q: '¿Cómo defino un producto?', 
        a: 'Ve a 🏷️ Productos → "➕ Nuevo Producto". Define nombre, precio de venta, unidad de venta (jaba, docena, unidad) y asócialo a una receta. Opcionalmente, define su CMPBC.' 
    },
    { 
        cat: '🚀 Primeros Pasos', 
        q: '¿Cómo registro una venta?', 
        a: 'Ve a 💰 Ventas → "➕ Nueva Venta". Selecciona el producto, cantidad, método de pago y cliente. Guarda. El stock de insumos se descuenta automáticamente.' 
    },
    { 
        cat: '🚀 Primeros Pasos', 
        q: '¿Cómo gestiono un pedido?', 
        a: 'Ve a 📋 Pedidos → "➕ Nuevo Pedido". Completa cliente, teléfono, fecha de entrega y productos. Al entregar el pedido, se crea la venta automáticamente.' 
    },
    { 
        cat: '🚀 Primeros Pasos', 
        q: '¿Qué es el CMPBC?', 
        a: 'CMPBC significa Capacidad Máxima de Producción por Bloque de Corriente. Es el número máximo de unidades de un producto que puedes producir en un solo bloque de corriente. Se usa para calcular automáticamente cuántos bloques necesitas.' 
    },
    { 
        cat: '🚀 Primeros Pasos', 
        q: '¿Dónde configuro el CMPBC?', 
        a: 'Al crear o editar un producto, en el campo "🏭 CMPBC". Si lo dejas vacío o en 0, el producto no cuenta para el cupo de producción.' 
    },
    { 
        cat: '🚀 Primeros Pasos', 
        q: '¿Cómo sé si un insumo tiene stock bajo?', 
        a: 'En la lista de insumos, el stock se muestra con colores: verde (OK), amarillo (stock bajo) y rojo (sin stock). También recibirás notificaciones cuando el stock esté bajo.' 
    },
    { 
        cat: '🚀 Primeros Pasos', 
        q: '¿Cómo puedo hacer una copia de seguridad?', 
        a: 'Ve a ⚙️ Herramientas → 📤 Exportar copia. Como admin puedes crear una copia completa o solo de datos. Guarda el archivo en un lugar seguro.' 
    },

    // ============================================================
    // 📊 SECCIÓN 3: DASHBOARD
    // ============================================================
    { 
        cat: '📊 Dashboard', 
        q: '¿Qué es el Dashboard?', 
        a: 'Es la pantalla principal de Panario. Muestra un resumen completo de tu negocio: ventas, ingresos, gastos, ganancias, pedidos pendientes, deudas y más.' 
    },
    { 
        cat: '📊 Dashboard', 
        q: '¿Qué significan las tarjetas del Dashboard?', 
        a: 'Cada tarjeta muestra una estadística clave: Ventas totales, Ingresos, Gastos, Ganancia, Pedidos pendientes, Deudas, Ventas hoy, Fondo en caja y Fondo en banco.' 
    },
    { 
        cat: '📊 Dashboard', 
        q: '¿Qué son las "Ventas liberadas"?', 
        a: 'Son ventas sin cliente identificado (mostrador anónimo). Se registran con el modo "Venta liberada" y no aparecen en el ranking de mejores clientes.' 
    },
    { 
        cat: '📊 Dashboard', 
        q: '¿Qué es el "Mejor día" y "Peor día"?', 
        a: 'Son el día con mayor facturación y el día con menor facturación en el historial de ventas. Te ayudan a identificar patrones de venta.' 
    },
    { 
        cat: '📊 Dashboard', 
        q: '¿Qué son los "Días con ventas" y "Días sin ventas"?', 
        a: 'Días con ventas: número de días únicos con al menos una venta. Días sin ventas: días registrados como inactivos (apagón, vacaciones, etc.).' 
    },
    { 
        cat: '📊 Dashboard', 
        q: '¿Cómo puedo personalizar el Dashboard?', 
        a: 'Ve a tu Perfil → "Elementos visibles en el Dashboard". Puedes activar o desactivar las secciones que quieres ver.' 
    },
    { 
        cat: '📊 Dashboard', 
        q: '¿Qué es el "Promedio diario"?', 
        a: 'Es el promedio de ingresos por día. Se calcula dividiendo los ingresos totales entre los días con ventas.' 
    },
    { 
        cat: '📊 Dashboard', 
        q: '¿Qué es el "Fondo en caja" y "Fondo en banco"?', 
        a: 'Fondo en caja: saldo en efectivo (ingresos - gastos en efectivo). Fondo en banco: saldo por transferencia (ingresos - gastos por transferencia).' 
    },
    { 
        cat: '📊 Dashboard', 
        q: '¿Cómo funciona el gráfico de ventas diarias?', 
        a: 'Muestra las ventas de los últimos 7 días. Puedes cambiar el modo (últimos 7 días, semana Dom-Sáb, semana Lun-Dom) y el tipo (barras, línea, pastel).' 
    },
    { 
        cat: '📊 Dashboard', 
        q: '¿Qué significan los colores del gráfico?', 
        a: 'Verde: día con mayor venta. Rojo: día con menor venta. Amarillo: día actual. Azul: días normales. Gris: día sin ventas (muestra el motivo si está registrado).' 
    },
    { 
        cat: '📊 Dashboard', 
        q: '¿Cómo exporto el gráfico?', 
        a: 'En la sección del gráfico, usa los botones 🖼️ (exportar como imagen PNG) o 📄 (exportar como PDF).' 
    },
    { 
        cat: '📊 Dashboard', 
        q: '¿Qué es la tarjeta de "Pedidos activos"?', 
        a: 'Muestra 3 columnas: Pedidos hoy, Pedidos mañana y En lista de espera. Al hacer clic en cada columna, te lleva a la lista de pedidos filtrada.' 
    },
    { 
        cat: '📊 Dashboard', 
        q: '¿Qué es la tarjeta de "Mejores clientes"?', 
        a: 'Muestra los 3 clientes que más han comprado (por monto total). Se calcula a partir de las ventas con cliente identificado.' 
    },
    { 
        cat: '📊 Dashboard', 
        q: '¿Qué es la tarjeta de "Productos más vendidos"?', 
        a: 'Muestra los 5 productos más vendidos (por cantidad de ventas). Te ayuda a identificar tus productos estrella.' 
    },
    { 
        cat: '📊 Dashboard', 
        q: '¿Qué es la tarjeta de "Métodos de pago"?', 
        a: 'Muestra el desglose de ventas por método de pago: efectivo, transferencia, deuda y otros. Incluye el monto total y el porcentaje.' 
    },
    { 
        cat: '📊 Dashboard', 
        q: '¿Qué es la tarjeta de "Análisis de fondos"?', 
        a: 'Muestra el desglose de ingresos, gastos y saldo para efectivo y banco. Te ayuda a ver de dónde viene y a dónde va el dinero.' 
    },
    { 
        cat: '📊 Dashboard', 
        q: '¿Qué es la tarjeta de "Deudas"?', 
        a: 'Muestra el total de deudas pendientes de cobro y el detalle por cliente. Desde aquí puedes ir a Ventas para cobrar.' 
    },
    { 
        cat: '📊 Dashboard', 
        q: '¿Qué es la tarjeta de "Premios"?', 
        a: 'Si el sistema de premios está activo, muestra al mejor cliente del mes y del año, con sus premios correspondientes.' 
    },
    { 
        cat: '📊 Dashboard', 
        q: '¿Qué es la tarjeta de "QR de cuenta bancaria"?', 
        a: 'Si está activada, muestra el QR de tu cuenta bancaria por defecto. Puedes ampliarlo o descargarlo para compartirlo con tus clientes.' 
    },

    { cat: "📊 Dashboard", 
        q: "¿Por qué el título del Dashboard está más pegado al header?", 
        a: "Desde la versión v3.0.8 de app.js y v2.3.7 de style.css, el título del Dashboard está más pegado al header (solo 12px de separación) para aprovechar mejor el espacio vertical. Antes había 16px de padding-top más 16px de margin-bottom del contenedor del título, lo que dejaba mucho espacio vacío." },
    { cat: "📊 Dashboard", 
        q: "¿Por qué hay más espacio entre el último contenido y el bottom-nav?", 
        a: "Desde la versión v3.0.8, el margen inferior se ha aumentado a 40px extra (antes 24px) para dar más respiro al contenido antes del bottom-nav. Esto evita que el último elemento quede pegado a la barra de navegación, especialmente en móviles con gestos de navegación." },
    { cat: "🎨 Interfaz", 
        q: "¿Qué cambió en el espaciado superior e inferior de la app?", 
        a: "La Corrección #6 ajustó dos cosas: (1) el título del Dashboard ahora está más pegado al header (12px de padding-top en lugar de 16px), y (2) el espacio inferior aumentó de 24px a 40px extra antes del bottom-nav. También se añadió una regla que evita que el primer hijo del main tenga margen superior residual." },
    { cat: "🎨 Interfaz", 
        q: "¿El cambio de espaciado afecta a otras vistas además del Dashboard?", 
        a: "Sí. El padding-top de main y el padding-bottom se aplican a TODAS las vistas (Pedidos, Insumos, Recetas, Productos, Ventas, Herramientas, Perfil). El ajuste del título específico del Dashboard solo aplica a esa vista, pero el resto de vistas también se benefician del mayor espacio inferior." 
    },

    // ============================================================
    // 📋 SECCIÓN 4: PEDIDOS
    // ============================================================
    { 
        cat: '📋 Pedidos', 
        q: '¿Qué es un pedido?', 
        a: 'Un pedido es una reserva de productos que un cliente hace para una fecha futura. No es una venta hasta que se entrega.' 
    },
    { 
        cat: '📋 Pedidos', 
        q: '¿Cómo creo un pedido?', 
        a: 'Ve a 📋 Pedidos → "➕ Nuevo Pedido". Completa cliente, teléfono, fecha de entrega, sesión de recogida y productos. Guarda.' 
    },
    { 
        cat: '📋 Pedidos', 
        q: '¿Qué estados puede tener un pedido?', 
        a: 'Pendiente, Confirmado, En producción, Listo, Entregado, Cancelado, En lista de espera y Compró por lista.' 
    },
    { 
        cat: '📋 Pedidos', 
        q: '¿Qué es la "sesión de recogida"?', 
        a: 'Es el momento del día en que el cliente recogerá el pedido: Mañana (10:00 AM), Tarde (3:00 PM) o Noche (7:00 PM).' 
    },
    { 
        cat: '📋 Pedidos', 
        q: '¿Qué es la "reserva por período"?', 
        a: 'Es una función que permite crear múltiples pedidos a la vez para el mismo cliente, repitiendo el pedido en varios días (por ejemplo, todos los martes del mes).' 
    },
    { 
        cat: '📋 Pedidos', 
        q: '¿Cómo entrego un pedido?', 
        a: 'Abre el pedido y pulsa "Entregar (sin deuda)" si el cliente paga al momento, o "Entregar (con deuda)" si pagará después. Se crea la venta automáticamente.' 
    },
    { 
        cat: '📋 Pedidos', 
        q: '¿Qué pasa si un cliente no recoge su pedido?', 
        a: 'Puedes cambiar el estado a "Cancelado". El stock de insumos se repone automáticamente.' 
    },
    { 
        cat: '📋 Pedidos', 
        q: '¿Puedo cancelar varios pedidos a la vez?', 
        a: 'Sí, como administrador puedes usar la "Cancelación Global" en Herramientas para cancelar todos los pedidos de un rango de fechas.' 
    },
    { 
        cat: '📋 Pedidos', 
        q: '¿Puedo mover pedidos de una fecha a otra?', 
        a: 'Sí, como administrador puedes usar "Reprogramar Pedidos por Rango" en Herramientas para mover todos los pedidos de un rango a una fecha destino.' 
    },
    { 
        cat: '📋 Pedidos', 
        q: '¿Qué es la "lista de espera"?', 
        a: 'Es una cola de clientes que esperan a que haya producción disponible. Se usa cuando la demanda supera la oferta.' 
    },
    { 
        cat: '📋 Pedidos', 
        q: '¿Cómo añado un cliente a la lista de espera?', 
        a: 'Desde la gestión de Lista de Espera, pulsa "➕ Añadir a lista" y completa los datos del cliente y el producto que desea.' 
    },
    { 
        cat: '📋 Pedidos', 
        q: '¿Cómo proceso a un cliente de la lista de espera?', 
        a: 'En la lista de espera, pulsa "Procesar" junto al cliente. Se crea la venta automáticamente y el cliente sale de la lista.' 
    },
    { 
        cat: '📋 Pedidos', 
        q: '¿Qué pasa si quito a un cliente de la lista de espera?', 
        a: 'Si quitas a un cliente de la lista sin cancelar su pedido, el pedido vuelve a estado "Pendiente" (no se cancela).' 
    },
    { 
        cat: '📋 Pedidos', 
        q: '¿Cómo se reindexan las posiciones de la lista?', 
        a: 'Cuando quitas o atiendes a un cliente, las posiciones de los demás se reajustan automáticamente para que no queden huecos.' 
    },
    { 
        cat: '📋 Pedidos', 
        q: '¿Puedo generar un reporte de la lista de espera?', 
        a: 'Sí, desde Herramientas → Lista de Espera → "Reporte PDF".' 
    },
    { 
        cat: '📋 Pedidos', 
        q: '¿Qué es el "badge de producción" en los pedidos?', 
        a: 'Es un icono 🔨 que aparece en los pedidos que tienen producción programada. Al hacer clic, abre el modal de configuración de producción.' 
    },
    { 
        cat: '📋 Pedidos', 
        q: '¿Qué es el "cupo de producción"?', 
        a: 'Es la cantidad máxima de un producto que puedes producir en un día, según el CMPBC y los bloques de corriente disponibles. Si el cupo se llena, no se pueden crear más pedidos para ese día.' 
    },
    { 
        cat: '📋 Pedidos', 
        q: '¿Cómo sé cuántos pedidos tengo para hoy?', 
        a: 'En el Dashboard, la tarjeta "Pedidos activos" muestra el número de pedidos para hoy, mañana y en lista de espera.' 
    },

    // ============================================================
    // 🛒 SECCIÓN 5: INSUMOS
    // ============================================================
    { 
        cat: '🛒 Insumos', 
        q: '¿Qué es un insumo?', 
        a: 'Un insumo es una materia prima que usas para producir: harina, levadura, yogur, mantequilla, etc.' 
    },
    { 
        cat: '🛒 Insumos', 
        q: '¿Cómo registro un insumo?', 
        a: 'Ve a 🛒 Insumos → "➕ Nuevo Insumo". Completa nombre, unidad de medida, costo unitario, stock actual y stock mínimo.' 
    },
    { 
        cat: '🛒 Insumos', 
        q: '¿Qué es el "stock mínimo"?', 
        a: 'Es el nivel de stock por debajo del cual se considera que el insumo está bajo. Sirve para generar alertas de reposición.' 
    },
    { 
        cat: '🛒 Insumos', 
        q: '¿Cómo sé si un insumo tiene stock bajo?', 
        a: 'En la lista de insumos, el stock se muestra con colores: verde (OK), amarillo (stock bajo) y rojo (sin stock). También recibirás notificaciones.' 
    },
    { 
        cat: '🛒 Insumos', 
        q: '¿Cómo se descuenta el stock?', 
        a: 'Al registrar una venta o confirmar un pedido, el stock de los insumos se descuenta automáticamente según la receta asociada al producto.' 
    },
    { 
        cat: '🛒 Insumos', 
        q: '¿Puedo editar un insumo?', 
        a: 'Sí, como administrador puedes editar cualquier insumo. Pulsa el botón "✏️ Editar" en la lista de insumos.' 
    },
    { 
        cat: '🛒 Insumos', 
        q: '¿Puedo eliminar un insumo?', 
        a: 'Sí, como administrador puedes eliminar un insumo. Se aplica un "soft-delete" (se marca como eliminado pero no se borra físicamente).' 
    },
    { 
        cat: '🛒 Insumos', 
        q: '¿Qué es el "soft-delete"?', 
        a: 'Es un borrado lógico: el registro se marca como eliminado (con una fecha) pero no se borra físicamente de la base de datos. Se puede restaurar si fue un error.' 
    },
    { 
        cat: '🛒 Insumos', 
        q: '¿Los usuarios regulares pueden editar insumos?', 
        a: 'No, solo los administradores pueden crear, editar o eliminar insumos. Los usuarios regulares solo pueden verlos.' 
    },
    { 
        cat: '🛒 Insumos', 
        q: '¿Cómo puedo ver el valor total de mi inventario?', 
        a: 'En la lista de insumos, se muestra el valor total del inventario (suma de stock × costo unitario).' 
    },
    { 
        cat: '🛒 Insumos', 
        q: '¿Qué unidades de medida puedo usar?', 
        a: 'Puedes usar kg, g, L, ml, unidad, docena, jaba, etc. La app viene con unidades predefinidas pero puedes añadir más.' 
    },

    // ============================================================
    // 📖 SECCIÓN 6: RECETAS
    // ============================================================
    { 
        cat: '📖 Recetas', 
        q: '¿Qué es una receta?', 
        a: 'Una receta es la fórmula de producción. Indica qué insumos se necesitan y en qué cantidad para producir un producto.' 
    },
    { 
        cat: '📖 Recetas', 
        q: '¿Cómo creo una receta?', 
        a: 'Ve a 📖 Recetas → "➕ Nueva Receta". Dale un nombre, define el rendimiento (ej: 33 panes) y asocia los insumos con sus cantidades.' 
    },
    { 
        cat: '📖 Recetas', 
        q: '¿Qué es el "rendimiento" de una receta?', 
        a: 'Es la cantidad de unidades que produce la receta. Por ejemplo, una receta de "Pan de Yogur" puede rendir 33 panes.' 
    },
    { 
        cat: '📖 Recetas', 
        q: '¿Cómo se calcula el costo de una receta?', 
        a: 'El costo se calcula automáticamente: suma de (cantidad de cada insumo × costo unitario). Luego se divide entre el rendimiento para obtener el costo por unidad.' 
    },
    { 
        cat: '📖 Recetas', 
        q: '¿Qué es "recalcular receta"?', 
        a: 'Es una función que permite ajustar una receta para un nuevo rendimiento usando regla de 3. Por ejemplo, si quieres producir 50 panes en vez de 33.' 
    },
    { 
        cat: '📖 Recetas', 
        q: '¿Cómo se redondean las cantidades al recalcular?', 
        a: 'Si el resultado es entero, se deja entero. Si es decimal, se redondea hacia arriba manteniendo decimales. Ej: 1.005 kg → 1.01 kg, 0.333 kg → 0.34 kg.' 
    },
    { 
        cat: '📖 Recetas', 
        q: '¿Puedo compartir una receta?', 
        a: 'Sí, como administrador puedes compartir recetas con otros usuarios del negocio. Pulsa "📤 Compartir" en el detalle de la receta.' 
    },
    { 
        cat: '📖 Recetas', 
        q: '¿Qué pasa si un usuario no-admin usa una receta no compartida?', 
        a: 'Se bloquea la operación. El usuario verá un banner rojo indicando que la receta no está compartida y que contacte al administrador.' 
    },
    { 
        cat: '📖 Recetas', 
        q: '¿Puedo duplicar una receta?', 
        a: 'Sí, puedes duplicar una receta para crear una variante. Pulsa "📋 Duplicar" en el detalle de la receta.' 
    },
    { 
        cat: '📖 Recetas', 
        q: '¿Puedo exportar una receta a PDF?', 
        a: 'Sí, puedes exportar una receta a PDF. Como admin incluye costos, como usuario regular no los incluye.' 
    },
    { 
        cat: '📖 Recetas', 
        q: '¿Los usuarios regulares pueden ver los costos de las recetas?', 
        a: 'No, los usuarios regulares no pueden ver los costos de las recetas. Solo los administradores pueden verlos.' 
    },
    { 
        cat: '📖 Recetas', 
        q: '¿Cómo puedo usar una receta como plantilla?', 
        a: 'Puedes usar cualquier receta como plantilla para crear una nueva. Pulsa "📋 Usar como plantilla" en el detalle de la receta.' 
    },

    // ============================================================
    // 🏷️ SECCIÓN 7: PRODUCTOS
    // ============================================================
    { 
        cat: '🏷️ Productos', 
        q: '¿Qué es un producto?', 
        a: 'Un producto es un artículo que vendes al cliente. Puede ser una jaba de pan, una docena de croissants, un pan suelto, etc.' 
    },
    { 
        cat: '🏷️ Productos', 
        q: '¿Cómo defino un producto?', 
        a: 'Ve a 🏷️ Productos → "➕ Nuevo Producto". Define nombre, precio de venta, unidad de venta, cantidad por unidad y asócialo a una receta.' 
    },
    { 
        cat: '🏷️ Productos', 
        q: '¿Qué es la "unidad de venta"?', 
        a: 'Es la forma en que vendes el producto: unidad, jaba, docena, etc. Por ejemplo, una "Jaba de Pan" tiene 10 panes.' 
    },
    { 
        cat: '🏷️ Productos', 
        q: '¿Qué es la "cantidad por unidad"?', 
        a: 'Es cuántas unidades contiene una unidad de venta. Por ejemplo, si vendes una jaba de 10 panes, la cantidad por unidad es 10.' 
    },
    { 
        cat: '🏷️ Productos', 
        q: '¿Qué es el CMPBC?', 
        a: 'CMPBC significa Capacidad Máxima de Producción por Bloque de Corriente. Es el número máximo de unidades de este producto que puedes producir en un solo bloque de corriente.' 
    },
    { 
        cat: '🏷️ Productos', 
        q: '¿Cómo configuro el CMPBC?', 
        a: 'Al crear o editar un producto, en el campo "🏭 CMPBC". Si lo dejas vacío o en 0, el producto no cuenta para el cupo de producción.' 
    },
    { 
        cat: '🏷️ Productos', 
        q: '¿Para qué sirve el CMPBC?', 
        a: 'Sirve para que el sistema calcule automáticamente cuántos bloques de corriente necesitas para producir una cantidad determinada.' 
    },
    { 
        cat: '🏷️ Productos', 
        q: '¿Cómo se calcula el margen de ganancia?', 
        a: 'El margen se calcula como: (precio de venta - costo del producto) / precio de venta × 100. El costo del producto se obtiene de la receta asociada.' 
    },
    { 
        cat: '🏷️ Productos', 
        q: '¿Puedo vender un producto sin receta?', 
        a: 'Sí, pero en ese caso no se descontará stock de insumos automáticamente. Se recomienda asociar siempre una receta.' 
    },
    { 
        cat: '🏷️ Productos', 
        q: '¿Los usuarios regulares pueden crear productos?', 
        a: 'No, solo los administradores pueden crear, editar o eliminar productos.' 
    },

    // ============================================================
    // 💰 SECCIÓN 8: VENTAS
    // ============================================================
    { 
        cat: '💰 Ventas', 
        q: '¿Cómo registro una venta?', 
        a: 'Ve a 💰 Ventas → "➕ Nueva Venta". Selecciona el producto, cantidad, método de pago y cliente. Guarda.' 
    },
    { 
        cat: '💰 Ventas', 
        q: '¿Qué tipos de venta existen?', 
        a: 'Venta normal (con cliente), venta liberada (sin cliente), venta a deuda (paga después), venta desde pedido y venta desde lista de espera.' 
    },
    { 
        cat: '💰 Ventas', 
        q: '¿Qué es una "venta liberada"?', 
        a: 'Es una venta sin cliente identificado (mostrador anónimo). Se usa para ventas rápidas en el mostrador.' 
    },
    { 
        cat: '💰 Ventas', 
        q: '¿Qué es una "venta a deuda"?', 
        a: 'Es una venta donde el cliente paga después. Queda pendiente de cobro y aparece en la sección de deudas.' 
    },
    { 
        cat: '💰 Ventas', 
        q: '¿Cómo cobro una deuda?', 
        a: 'En la lista de ventas, filtra por "💳 Deudas" y pulsa "💰 Cobrar" en la venta correspondiente.' 
    },
    { 
        cat: '💰 Ventas', 
        q: '¿Qué métodos de pago puedo usar?', 
        a: 'Efectivo, Transferencia, Deuda y Otra. El método de pago determina si el ingreso va a caja o a banco.' 
    },
    { 
        cat: '💰 Ventas', 
        q: '¿Qué es el "Fondo en caja"?', 
        a: 'Es el saldo en efectivo. Se calcula como ingresos en efectivo - gastos en efectivo.' 
    },
    { 
        cat: '💰 Ventas', 
        q: '¿Qué es el "Fondo en banco"?', 
        a: 'Es el saldo por transferencia. Se calcula como ingresos por transferencia - gastos por transferencia.' 
    },
    { 
        cat: '💰 Ventas', 
        q: '¿Cómo anulo una venta?', 
        a: 'En el detalle de la venta, pulsa "🚫 Anular". Se marca como anulada, se repone el stock y se puede recuperar.' 
    },
    { 
        cat: '💰 Ventas', 
        q: '¿Cuál es la diferencia entre anular y eliminar una venta?', 
        a: 'Anular: la venta se marca como anulada pero se conserva en el historial. Eliminar: la venta se borra permanentemente (soft-delete) y no se puede recuperar.' 
    },
    { 
        cat: '💰 Ventas', 
        q: '¿Qué es una "venta desde pedido"?', 
        a: 'Es una venta que se crea automáticamente al entregar un pedido. La fecha de la venta es la fecha actual (momento de la entrega).' 
    },
    { 
        cat: '💰 Ventas', 
        q: '¿Qué es una "venta desde lista de espera"?', 
        a: 'Es una venta que se crea al procesar a un cliente de la lista de espera. La fecha de la venta es la fecha actual.' 
    },
    { 
        cat: '💰 Ventas', 
        q: '¿Puedo añadir una nota a una venta?', 
        a: 'Sí, puedes añadir una nota opcional a cualquier venta. Solo el creador de la venta puede editar la nota.' 
    },
    { 
        cat: '💰 Ventas', 
        q: '¿Cómo registro un gasto?', 
        a: 'Ve a 💰 Ventas → "➕ Nuevo Gasto". Completa concepto, monto, categoría y método de pago. Guarda.' 
    },
    { 
        cat: '💰 Ventas', 
        q: '¿Qué categorías de gastos existen?', 
        a: 'Insumos, Materiales, Transporte, Inversión y Otros. Puedes filtrar los gastos por categoría.' 
    },
    { 
        cat: '💰 Ventas', 
        q: '¿Puedo filtrar las ventas por vendedor?', 
        a: 'Sí, si hay más de un usuario en el negocio, aparece un selector "👤 Vendedor" para filtrar las ventas por vendedor específico.' 
    },
    { 
        cat: '💰 Ventas', 
        q: '¿Cómo registro un día sin ventas?', 
        a: 'Ve a 💰 Ventas → "📅 Días sin ventas". Añade la fecha y el motivo (apagón, vacaciones, enfermedad, etc.).' 
    },
    { 
        cat: '💰 Ventas', 
        q: '¿Por qué es importante registrar los días sin ventas?', 
        a: 'Porque así las estadísticas no mienten. Un día sin ventas por apagón no es lo mismo que un día sin ventas por mal servicio.' 
    },
    { 
        cat: '💰 Ventas', 
        q: '¿Qué motivos puedo usar para un día sin ventas?', 
        a: 'Apagón, Falta de insumos, Feriado, Vacaciones, Enfermedad, Mantenimiento, Mal clima y Otro.' 
    },
    { 
        cat: '💰 Ventas', 
        q: '¿Cómo puedo ver el reporte de ventas?', 
        a: 'En Ventas, pulsa "📊 Reporte" para abrir el modal de reporte. Puedes filtrar por fecha, cliente, producto, método de pago y vendedor.' 
    },

    // ============================================================
    // ⚡ SECCIÓN 9: CORRIENTE Y PRODUCCIÓN
    // ============================================================
    { 
        cat: '⚡ Corriente y Producción', 
        q: '¿Qué es la "corriente"?', 
        a: 'Es la electricidad. En Cuba, la corriente llega en bloques programados (ej: 3 horas de corriente, 12 horas de apagón). Panario te ayuda a planificar la producción según estos horarios.' 
    },
    { 
        cat: '⚡ Corriente y Producción', 
        q: '¿Cómo configuro los horarios de corriente?', 
        a: 'Ve a ⚡ Herramientas → "Gestionar Horarios". Configura el patrón (horas de corriente y horas de apagón) y la referencia inicial (una fecha y hora donde hubo corriente).' 
    },
    { 
        cat: '⚡ Corriente y Producción', 
        q: '¿Qué es el "patrón de corriente"?', 
        a: 'Es la duración de los bloques de corriente y apagón. Por ejemplo: 3 horas de corriente / 12 horas de apagón.' 
    },
    { 
        cat: '⚡ Corriente y Producción', 
        q: '¿Qué es la "referencia inicial"?', 
        a: 'Es una fecha y hora conocida donde hubo corriente. Se usa como punto de partida para calcular todos los bloques futuros.' 
    },
    { 
        cat: '⚡ Corriente y Producción', 
        q: '¿Cómo se calculan los bloques de corriente?', 
        a: 'El sistema usa la referencia inicial y el patrón para calcular todos los bloques. Por ejemplo, si la referencia es "hoy de 10:00 a 13:00" y el patrón es 3h/12h, el siguiente bloque será mañana de 1:00 a 4:00, luego de 16:00 a 19:00, etc.' 
    },
    { 
        cat: '⚡ Corriente y Producción', 
        q: '¿Qué es un "bloque de producción"?', 
        a: 'Es el bloque de corriente que eliges para hornear un producto. Puede ser un bloque del día o el último bloque del día anterior.' 
    },
    { 
        cat: '⚡ Corriente y Producción', 
        q: '¿Qué es la "producción programada"?', 
        a: 'Es la cantidad de un producto que planeas hornear en un día específico. Se configura desde el calendario de corriente.' 
    },
    { 
        cat: '⚡ Corriente y Producción', 
        q: '¿Cómo programo la producción de un día?', 
        a: 'En el calendario de corriente, haz clic en un día, selecciona el producto, la cantidad y el bloque de producción. Guarda.' 
    },
    { 
        cat: '⚡ Corriente y Producción', 
        q: '¿Qué es el "cálculo automático de bloques"?', 
        a: 'Es una función que calcula automáticamente cuántos bloques necesitas para producir una cantidad determinada, distribuyendo la producción de manera óptima.' 
    },
    { 
        cat: '⚡ Corriente y Producción', 
        q: '¿Cómo funciona el "algoritmo del amanecer"?', 
        a: 'Es un algoritmo que elige el bloque de producción ideal para que el pan esté listo antes de las 8:00 AM del día de venta. Prioriza bloques que terminen antes de las 8 AM, luego bloques que terminen entre 8 y 9 AM, y finalmente el último bloque del día anterior.' 
    },
    { 
        cat: '⚡ Corriente y Producción', 
        q: '¿Puedo aplicar producción a un rango de días?', 
        a: 'Sí, en el modal de producción, pulsa "📅 Aplicar a rango". Puedes excluir domingos y días sin corriente, y elegir entre bloque relativo o fijo.' 
    },
    { 
        cat: '⚡ Corriente y Producción', 
        q: '¿Qué es "bloque relativo" y "bloque fijo"?', 
        a: 'Bloque relativo: cada día usa su bloque equivalente (ej: si el día base usa el bloque 1, cada día usará su bloque 1). Bloque fijo: se usan las mismas horas exactas del día base.' 
    },
    { 
        cat: '⚡ Corriente y Producción', 
        q: '¿Puedo generar un reporte de corriente?', 
        a: 'Sí, en la pestaña "📊 Reporte" del modal de corriente. Puedes generar un reporte semanal o mensual.' 
    },
    { 
        cat: '⚡ Corriente y Producción', 
        q: '¿Cómo consulto los horarios de un día específico?', 
        a: 'En la pestaña "🔍 Fecha" del modal de corriente. Selecciona una fecha y pulsa "Consultar".' 
    },
    { 
        cat: '⚡ Corriente y Producción', 
        q: '¿Qué es el "CMPBC"?', 
        a: 'CMPBC significa Capacidad Máxima de Producción por Bloque de Corriente. Es el número máximo de unidades de un producto que puedes producir en un solo bloque.' 
    },
    { 
        cat: '⚡ Corriente y Producción', 
        q: '¿Cómo se distribuye la producción entre bloques?', 
        a: 'El primer bloque lleva más cantidad. Por ejemplo, si CPD=12 y CMPBC=7, necesitas 2 bloques: el primero lleva 7, el segundo 5.' 
    },
    { 
        cat: '⚡ Corriente y Producción', 
        q: '¿Qué es la "producción en el bloque del día anterior"?', 
        a: 'Es cuando la producción se programa para el último bloque del día anterior, para que el pan esté listo al amanecer del día de venta. Se marca con el icono 🌙.' 
    },
    { 
        cat: '⚡ Corriente y Producción', 
        q: '¿Qué es el "diagnóstico de producción"?', 
        a: 'Es una herramienta técnica que verifica si el sistema de producción está funcionando correctamente. Ejecuta 12 comprobaciones y muestra los resultados.' 
    },
    { 
        cat: '⚡ Corriente y Producción', 
        q: '¿Dónde encuentro el diagnóstico de producción?', 
        a: 'En Herramientas → "🔍 Diagnóstico de Producción". También puedes acceder desde el modal de corriente, pestaña Config.' 
    },

    // ============================================================
    // 🏆 SECCIÓN 10: PREMIOS
    // ============================================================
    { 
        cat: '🏆 Premios', 
        q: '¿Qué es el sistema de premios?', 
        a: 'Es un sistema de fidelización que premia a los clientes que más compran. El mejor cliente del mes y del año reciben un premio.' 
    },
    { 
        cat: '🏆 Premios', 
        q: '¿Cómo activo el sistema de premios?', 
        a: 'Ve a 💰 Ventas → 🏆 Premios. Activa el toggle "🎁 Activar sistema" y configura los premios mensual y anual.' 
    },
    { 
        cat: '🏆 Premios', 
        q: '¿Cómo se calcula el mejor cliente del mes?', 
        a: 'Se suma el total de compras de cada cliente en el mes actual. El que tenga el mayor total es el ganador.' 
    },
    { 
        cat: '🏆 Premios', 
        q: '¿Cómo se calcula el mejor cliente del año?', 
        a: 'Se suma el total de compras de cada cliente en el rango configurado (por ejemplo, del 1 de enero al 31 de diciembre).' 
    },
    { 
        cat: '🏆 Premios', 
        q: '¿Qué opciones hay para el cálculo del premio anual?', 
        a: 'Navidad (24 dic), Fin de año (31 dic) o Inicio de año. También puedes configurar una fecha específica.' 
    },
    { 
        cat: '🏆 Premios', 
        q: '¿Cómo se notifica a los ganadores?', 
        a: 'Al inicio de cada mes (días 1-5), el sistema notifica al ganador del mes anterior con su premio correspondiente.' 
    },
    { 
        cat: '🏆 Premios', 
        q: '¿Dónde se muestra la tarjeta de premios?', 
        a: 'En el Dashboard, si el sistema de premios está activo. Muestra el mejor cliente del mes, del año y el top 5 del mes.' 
    },

    // ============================================================
    // 🔔 SECCIÓN 11: NOTIFICACIONES
    // ============================================================
    { 
        cat: '🔔 Notificaciones', 
        q: '¿Qué son las notificaciones?', 
        a: 'Son alertas que te informan de eventos importantes: pedidos pendientes, deudas, stock bajo, premios, etc.' 
    },
    { 
        cat: '🔔 Notificaciones', 
        q: '¿Cómo funciona la campanita?', 
        a: 'En la barra superior, el icono 🔔 muestra un badge rojo con el número de notificaciones no leídas. Al hacer clic, se abre el modal de notificaciones.' 
    },
    { 
        cat: '🔔 Notificaciones', 
        q: '¿Puedo configurar el sonido de las notificaciones?', 
        a: 'Sí, ve a 👤 Perfil → "🔔 Sonido de notificaciones". Puedes activar/desactivar el sonido y elegir entre varios tonos.' 
    },
    { 
        cat: '🔔 Notificaciones', 
        q: '¿Qué sonidos puedo elegir?', 
        a: 'Beep, Chime, Pop, Alert y Success. También puedes elegir "Silencio" para desactivar el sonido.' 
    },
    { 
        cat: '🔔 Notificaciones', 
        q: '¿Puedo probar los sonidos?', 
        a: 'Sí, en la configuración de sonido, pulsa "🔊 Probar" para escuchar cada sonido individualmente, o "🔊 Probar todos" para escucharlos todos en secuencia.' 
    },
    { 
        cat: '🔔 Notificaciones', 
        q: '¿Por qué no suenan las notificaciones?', 
        a: 'Asegúrate de haber interactuado con la app (clic, toque, tecla) para desbloquear el audio. Revisa también el volumen de tu dispositivo.' 
    },
    { 
        cat: '🔔 Notificaciones', 
        q: '¿Las notificaciones se guardan?', 
        a: 'Sí, las notificaciones se guardan en el historial. Puedes verlas en el modal de notificaciones y marcarlas como resueltas.' 
    },

	{ 
		cat: '🔔 Notificaciones', 
		q: '¿Por qué no veo el número rojo en la campanita?', 
		a: 'Si el badge rojo de la campanita no aparece, puede ser porque no hay notificaciones no leídas (ya las abriste todas). Si hay nuevas notificaciones sin leer, el badge se actualiza automáticamente con el número. Si el problema persiste, prueba recargar la app con Ctrl + Shift + R (hard refresh).' 
	},
	{ 
		cat: '🔔 Notificaciones', 
		q: '¿Dónde veo el historial completo de notificaciones?', 
		a: 'Toca el icono 🔔 en la barra superior. Se abrirá un modal con todas las notificaciones, ordenadas de más reciente a más antigua. Puedes marcar cada una como "resuelta" individualmente o usar el botón "Resolver todas".' 
	},	
	
    // ============================================================
    // 👤 SECCIÓN 12: PERFIL
    // ============================================================
    { 
        cat: '👤 Perfil', 
        q: '¿Qué puedo hacer en mi Perfil?', 
        a: 'Editar tu información personal (nombre, email, teléfono, foto), cambiar el tema (claro/oscuro), configurar el Dashboard, gestionar cuentas bancarias y acceder a la ayuda.' 
    },
    { 
        cat: '👤 Perfil', 
        q: '¿Cómo cambio mi foto de perfil?', 
        a: 'En tu Perfil, pulsa sobre tu foto actual y selecciona una nueva imagen desde tu dispositivo.' 
    },
    { 
        cat: '👤 Perfil', 
        q: '¿Cómo cambio el tema de la app?', 
        a: 'En tu Perfil, busca la opción "🌓 Tema" y selecciona Claro u Oscuro.' 
    },
    { 
        cat: '👤 Perfil', 
        q: '¿Qué son los "Elementos visibles en el Dashboard"?', 
        a: 'Son 13 interruptores que te permiten personalizar qué secciones quieres ver en el Dashboard. Puedes activar o desactivar cada una.' 
    },
    { 
        cat: '👤 Perfil', 
        q: '¿Cómo gestiono mis cuentas bancarias?', 
        a: 'En tu Perfil → "🏦 Datos bancarios". Puedes añadir, editar o eliminar cuentas, y definir cuál es tu cuenta por defecto.' 
    },
    { 
        cat: '👤 Perfil', 
        q: '¿Qué datos incluye una cuenta bancaria?', 
        a: 'Nombre del banco, nombre del propietario, número de cuenta, teléfono de confirmación y código QR (generado o subido).' 
    },
    { 
        cat: '👤 Perfil', 
        q: '¿Cómo puedo subir el QR de mi cuenta bancaria?', 
        a: 'En el formulario de cuenta bancaria, pulsa "📷 Subir QR" y selecciona una imagen desde tu dispositivo. También puedes generarlo automáticamente.' 
    },
    { 
        cat: '👤 Perfil', 
        q: '¿Qué es la "cuenta por defecto"?', 
        a: 'Es la cuenta que se muestra en el Dashboard y en los reportes. Puedes tener varias cuentas pero solo una es la predeterminada.' 
    },
    { 
        cat: '👤 Perfil', 
        q: '¿Puedo ver las cuentas bancarias de otros usuarios?', 
        a: 'Depende de la configuración del administrador. Si "Permitir a usuarios ver QRs de otros" está activado, puedes verlas (solo lectura).' 
    },
    { 
        cat: '👤 Perfil', 
        q: '¿Qué es el "QR compartido"?', 
        a: 'Es una cuenta bancaria que el administrador ha marcado como compartida. Todos los usuarios del negocio pueden verla y usarla.' 
    },
    { 
        cat: '👤 Perfil', 
        q: '¿Cómo accedo a la Ayuda?', 
        a: 'En tu Perfil → "❓ Ayuda y Tutoriales". Puedes acceder a la Guía rápida, Tutorial interactivo, Preguntas frecuentes y Ayuda detallada.' 
    },

    // ============================================================
    // ⚙️ SECCIÓN 13: HERRAMIENTAS
    // ============================================================
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Qué hay en Herramientas?', 
        a: 'Gestión de usuarios, configuración bancaria, lista de espera, cancelación global, reprogramación de pedidos, horarios de corriente, diagnóstico de producción, backups, y más.' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Quién puede acceder a Herramientas?', 
        a: 'Todos los usuarios pueden acceder, pero algunas secciones solo son visibles para administradores (Gestión de Usuarios, Cancelación Global, etc.).' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Cómo gestiono los usuarios?', 
        a: 'Como admin, ve a Herramientas → "👥 Gestión de Usuarios". Puedes crear, editar, promover, degradar o eliminar usuarios.' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Cómo creo un nuevo usuario?', 
        a: 'En Gestión de Usuarios, pulsa "➕ Crear usuario". Completa usuario, contraseña, nombre y decide si es admin. Guarda.' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Cómo comparto el código de invitación?', 
        a: 'En Gestión de Usuarios, pulsa "📋 Copiar código" para copiar el código de 8 caracteres. Compártelo con el nuevo usuario.' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Puedo regenerar el código de invitación?', 
        a: 'Sí, como admin puedes regenerar el código. Pulsa "🔄 Regenerar código". El código anterior dejará de funcionar.' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Qué es la "Configuración Bancaria"?', 
        a: 'Es una sección solo para administradores donde se controlan los permisos sobre las cuentas bancarias: ver QRs de otros, cambiar cuenta por defecto, forzar QR del admin.' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Qué significa "Permitir a usuarios ver QRs de otros"?', 
        a: 'Si está activado, los usuarios no-admin pueden ver (solo lectura) las cuentas bancarias de otros usuarios del negocio.' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Qué significa "Permitir a usuarios cambiar su cuenta por defecto"?', 
        a: 'Si está activado, cada usuario puede elegir cuál de sus cuentas usar por defecto. Si está desactivado, el admin designa la cuenta predeterminada global.' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Qué significa "Forzar QR del admin"?', 
        a: 'Si está activado, TODOS los usuarios verán en el Dashboard únicamente el QR del administrador, ignorando su cuenta por defecto individual.' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Cómo funciona la "Cancelación Global"?', 
        a: 'Como admin, ve a Herramientas → "🚨 Cancelación Global". Selecciona un rango de fechas, una causa y una nota. Se cancelarán todos los pedidos activos en ese rango.' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Cómo funciona la "Reprogramación por Rango"?', 
        a: 'Como admin, ve a Herramientas → "🔄 Reprogramar Pedidos". Selecciona el rango origen, la fecha destino, la causa y una nota. Se moverán todos los pedidos.' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Cómo genero un reporte de gastos?', 
        a: 'En Herramientas → "📊 Reporte de Gastos". Selecciona el rango de fechas y los filtros opcionales (categoría, origen del pago, concepto).' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Cómo exporto una copia de seguridad?', 
        a: 'En Herramientas → "📤 Exportar copia". Como admin puedes elegir entre copia completa o solo datos. Los usuarios regulares solo pueden exportar datos.' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Cuál es la diferencia entre "copia completa" y "copia de datos"?', 
        a: 'Copia completa: incluye usuarios y negocios. Copia de datos: solo datos operativos (ventas, pedidos, insumos, etc.), conserva los usuarios.' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Cómo importo una copia de seguridad?', 
        a: 'En Herramientas → "📥 Importar copia". Puedes elegir entre importar copia (reemplaza todo), importar solo datos (reemplaza datos operativos) o fusionar bases.' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Qué es la "fusión de bases de datos"?', 
        a: 'Es una función que combina dos copias de la BD sin perder datos ni crear duplicados. Se comparan los registros por UUID.' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Qué es la "salva diferencial"?', 
        a: 'Es un backup que solo incluye recetas y productos en formato JSON. No afecta ventas, pedidos, insumos ni clientes.' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Cómo limpio los datos eliminados?', 
        a: 'En Herramientas → "🧹 Limpiar datos eliminados". Se eliminan permanentemente todos los registros con soft-delete. Requiere contraseña "panario".' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Cómo funciona la "Eliminación por error"?', 
        a: 'En Herramientas → "🚨 Eliminación por error". Selecciona registros de pedidos o ventas creados por error y elimínalos permanentemente. Requiere contraseña "panario".' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Cómo reinicio la base de datos?', 
        a: 'En Herramientas → "🚨 Reiniciar Base de Datos". Elimina TODOS los datos excepto usuarios y temas. Requiere contraseña "panario".' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Qué es el "Diagnóstico de Producción"?', 
        a: 'Es una herramienta técnica que verifica si el sistema de producción está correctamente configurado. Ejecuta 12 comprobaciones.' 
    },
    { 
        cat: '⚙️ Herramientas', 
        q: '¿Qué es "Restaurar Estilos"?', 
        a: 'Es una función que limpia estilos residuales que puedan estar deformando la interfaz. Útil si la barra superior se ve mal.' 
    },

    // ============================================================
    // 📄 SECCIÓN 14: REPORTES
    // ============================================================
    { 
        cat: '📄 Reportes', 
        q: '¿Qué reportes puedo generar?', 
        a: 'Pedidos, Ventas, Gastos, Insumos, Recetas, Lista de espera, Días sin ventas, Corriente, Producción y más.' 
    },
    { 
        cat: '📄 Reportes', 
        q: '¿Cómo genero un reporte de ventas?', 
        a: 'En Ventas, pulsa "📊 Reporte". Selecciona los filtros (fecha, cliente, producto, pago) y pulsa "Generar Reporte".' 
    },
    { 
        cat: '📄 Reportes', 
        q: '¿Puedo filtrar el reporte de ventas por vendedor?', 
        a: 'Sí, si hay más de un usuario en el negocio, el modal de reporte incluye un selector de vendedor.' 
    },
    { 
        cat: '📄 Reportes', 
        q: '¿Cómo genero un reporte de pedidos?', 
        a: 'En Pedidos, pulsa "📊 Reporte". Selecciona los filtros y pulsa "Generar Reporte".' 
    },
    { 
        cat: '📄 Reportes', 
        q: '¿Cómo genero un reporte de gastos?', 
        a: 'En Herramientas → "📊 Reporte de Gastos". Selecciona el rango de fechas y los filtros opcionales.' 
    },
    { 
        cat: '📄 Reportes', 
        q: '¿Los reportes se guardan?', 
        a: 'No, los reportes se generan en el momento y se abren en una ventana de impresión. Puedes guardarlos como PDF.' 
    },
    { 
        cat: '📄 Reportes', 
        q: '¿Los reportes incluyen el orden ascendente por ID?', 
        a: 'Sí, los pedidos y ventas en los reportes se ordenan por ID ascendente dentro de cada fecha.' 
    },

    // ============================================================
    // ❓ SECCIÓN 15: PREGUNTAS TÉCNICAS (Usuario Final)
    // ============================================================
    { 
        cat: '❓ Preguntas Técnicas', 
        q: '¿Qué hago si la app no carga?', 
        a: 'Intenta hacer un "hard refresh": Ctrl + Shift + R. Si no funciona, limpia la caché desde DevTools (F12) → Application → Clear storage. Si persiste, desregistra el Service Worker.' 
    },
    { 
        cat: '❓ Preguntas Técnicas', 
        q: '¿Qué hago si no se guardan los datos?', 
        a: 'Verifica la consola (F12) para errores. Ejecuta el diagnóstico de producción. Verifica el espacio en localStorage. Exporta un backup y limpia datos antiguos.' 
    },
    { 
        cat: '❓ Preguntas Técnicas', 
        q: '¿Qué hago si la BD está corrupta?', 
        a: 'Restaura desde un backup. Si no tienes, ejecuta "Fusionar bases de datos" con un backup reciente. Como último recurso, "Reiniciar Base de Datos".' 
    },
    { 
        cat: '❓ Preguntas Técnicas', 
        q: '¿Por qué la PWA no se instala?', 
        a: 'Verifica que el manifest sea válido, que el SW esté registrado y que la app se sirva por HTTPS.' 
    },
    { 
        cat: '❓ Preguntas Técnicas', 
        q: '¿Por qué la PWA no se actualiza?', 
        a: 'Limpia la caché, verifica que el CACHE_NAME haya cambiado y fuerza la actualización del Service Worker.' 
    },
    { 
        cat: '❓ Preguntas Técnicas', 
        q: '¿Por qué el top bar se deforma?', 
        a: 'Es un bug de navegadores móviles que aplican transform residual. Usa "Restaurar Estilos" en Herramientas o limpia la caché.' 
    },
    { 
        cat: '❓ Preguntas Técnicas', 
        q: '¿Por qué no suenan las notificaciones?', 
        a: 'Interactúa con la app (clic, toque, tecla) para desbloquear el audio. Sube el volumen del dispositivo.' 
    },
    { 
        cat: '❓ Preguntas Técnicas', 
        q: '¿Por qué la fusión duplica registros?', 
        a: 'Verifica que todos los registros tengan UUID. Si faltan, ejecuta la migración de UUIDs.' 
    },
    { 
        cat: '❓ Preguntas Técnicas', 
        q: '¿Por qué no se genera el PDF?', 
        a: 'Permite popups en el navegador. Verifica que haya datos para el rango seleccionado. Revisa la consola para errores.' 
    },
    { 
        cat: '❓ Preguntas Técnicas', 
        q: '¿Qué hago si el stock no se descuenta?', 
        a: 'Verifica que el producto tenga una receta asociada. Si no tiene receta, no se descuenta stock. Revisa la consola para errores.' 
    },
    { 
        cat: '❓ Preguntas Técnicas', 
        q: '¿Qué hago si el algoritmo del amanecer elige mal el bloque?', 
        a: 'Verifica que la configuración de corriente esté correcta. Revisa que el algoritmo tenga las 3 condiciones del amanecer.' 
    },
    { 
        cat: '❓ Preguntas Técnicas', 
        q: '¿Cómo puedo ver los logs de la app?', 
        a: 'Abre DevTools (F12) → pestaña Console. Ahí verás todos los logs detallados de la app.' 
    },

    // ============================================================
    // 📚 SECCIÓN 16: GLOSARIO
    // ============================================================
    { 
        cat: '📚 Glosario', 
        q: '¿Qué es un "insumo"?', 
        a: 'Materia prima que usas para producir: harina, levadura, yogur, mantequilla, etc.' 
    },
    { 
        cat: '📚 Glosario', 
        q: '¿Qué es una "receta"?', 
        a: 'Fórmula de producción que asocia insumos con cantidades. Ej: "Pan de Yogur" con harina, levadura y yogur.' 
    },
    { 
        cat: '📚 Glosario', 
        q: '¿Qué es un "producto"?', 
        a: 'Artículo que vendes al cliente. Ej: "Jaba de Pan" (10 panes).' 
    },
    { 
        cat: '📚 Glosario', 
        q: '¿Qué es una "jaba"?', 
        a: 'Unidad de venta típica en panadería. Generalmente contiene 10 panes.' 
    },
    { 
        cat: '📚 Glosario', 
        q: '¿Qué es "media jaba"?', 
        a: 'Unidad de venta que contiene 5 panes.' 
    },
    { 
        cat: '📚 Glosario', 
        q: '¿Qué es "consumo interno"?', 
        a: 'Pan que se queda en casa (no se vende). Se puede registrar como gasto o como consumo.' 
    },
    { 
        cat: '📚 Glosario', 
        q: '¿Qué es un "bloque de corriente"?', 
        a: 'Período de tiempo con electricidad. Ej: de 10:00 AM a 1:00 PM.' 
    },
    { 
        cat: '📚 Glosario', 
        q: '¿Qué es un "apagón"?', 
        a: 'Período de tiempo sin electricidad. Ej: de 1:00 PM a 1:00 AM.' 
    },
    { 
        cat: '📚 Glosario', 
        q: '¿Qué es "CMPBC"?', 
        a: 'Capacidad Máxima de Producción por Bloque de Corriente. Ej: 7 jabas por bloque.' 
    },
    { 
        cat: '📚 Glosario', 
        q: '¿Qué es "CPD"?', 
        a: 'Cantidad de Producción Diaria. Es la cantidad total que quieres producir en un día.' 
    },
    { 
        cat: '📚 Glosario', 
        q: '¿Qué es "VD"?', 
        a: 'Ventas Directas. Son las ventas que se hacen sin pedido previo.' 
    },
    { 
        cat: '📚 Glosario', 
        q: '¿Qué es "P"?', 
        a: 'Pedidos. Son las reservas de productos para una fecha futura.' 
    },
    { 
        cat: '📚 Glosario', 
        q: '¿Qué es "UUID"?', 
        a: 'Identificador Único Universal. Se usa para fusionar bases de datos sin duplicar registros.' 
    },
    { 
        cat: '📚 Glosario', 
        q: '¿Qué es "soft-delete"?', 
        a: 'Borrado lógico: el registro se marca como eliminado pero no se borra físicamente. Se puede restaurar.' 
    },
    { 
        cat: '📚 Glosario', 
        q: '¿Qué es "PWA"?', 
        a: 'Progressive Web App. Es una aplicación web que se puede instalar como app nativa y funciona offline.' 
    },
    { 
        cat: '📚 Glosario', 
        q: '¿Qué es "Service Worker"?', 
        a: 'Script que cachea los assets de la app para que funcione offline.' 
    },
    { 
        cat: '📚 Glosario', 
        q: '¿Qué es "localStorage"?', 
        a: 'Almacenamiento local del navegador. Ahí se guarda la base de datos de Panario.' 
    },

    // ============================================================
    // 🎯 SECCIÓN 17: CONSEJOS Y TRUCOS
    // ============================================================
    { 
        cat: '🎯 Consejos y Trucos', 
        q: '¿Cómo puedo aprovechar mejor Panario?', 
        a: 'Registra todo: insumos, recetas, productos, ventas, pedidos. Configura el CMPBC de tus productos. Usa el Dashboard para tomar decisiones. Haz backups semanales.' 
    },
    { 
        cat: '🎯 Consejos y Trucos', 
        q: '¿Cómo puedo saber cuál es mi producto más rentable?', 
        a: 'Revisa el margen de ganancia en la lista de productos. Los productos con mayor margen son los más rentables.' 
    },
    { 
        cat: '🎯 Consejos y Trucos', 
        q: '¿Cómo puedo mejorar mi producción?', 
        a: 'Usa el cálculo automático de bloques para distribuir la producción de manera óptima. Configura el CMPBC de cada producto.' 
    },
    { 
        cat: '🎯 Consejos y Trucos', 
        q: '¿Cómo puedo fidelizar a mis clientes?', 
        a: 'Activa el sistema de premios. El mejor cliente del mes y del año reciben un premio.' 
    },
    { 
        cat: '🎯 Consejos y Trucos', 
        q: '¿Cómo puedo controlar mejor mis finanzas?', 
        a: 'Registra todos los gastos. Usa el Dashboard para ver el análisis de fondos. Revisa el Fondo en caja y Fondo en banco.' 
    },
    { 
        cat: '🎯 Consejos y Trucos', 
        q: '¿Cómo puedo saber si un día fue malo o simplemente no hubo corriente?', 
        a: 'Registra los días sin ventas con su motivo. Así las estadísticas reflejan la realidad (apagón ≠ mal día).' 
    },
    { 
        cat: '🎯 Consejos y Trucos', 
        q: '¿Cómo puedo prepararme para un apagón?', 
        a: 'Usa el calendario de corriente para planificar la producción. Produce en los bloques de corriente y almacena el pan para los días de apagón.' 
    },
    { 
        cat: '🎯 Consejos y Trucos', 
        q: '¿Cómo puedo vender más?', 
        a: 'Ofrece ventas a deuda a clientes de confianza. Usa la lista de espera para no perder ventas. Premia a tus mejores clientes.' 
    },
    { 
        cat: '🎯 Consejos y Trucos', 
        q: '¿Cómo puedo organizar mejor mis pedidos?', 
        a: 'Usa la reserva por período para clientes frecuentes. Usa la sesión de recogida para organizar las entregas.' 
    },
    { 
        cat: '🎯 Consejos y Trucos', 
        q: '¿Cómo puedo reducir el desperdicio?', 
        a: 'Ajusta la producción a la demanda real. Usa el CMPBC para no sobreproducir. Revisa el historial de ventas para prever la demanda.' 
    },
    { 
        cat: '🎯 Consejos y Trucos', 
        q: '¿Cómo puedo ahorrar tiempo en la gestión?', 
        a: 'Usa la app en el móvil. Registra las ventas al momento. Usa los reportes para no tener que hacer cuentas manualmente.' 
    },
    { 
        cat: '🎯 Consejos y Trucos', 
        q: '¿Qué hago si me quedo sin espacio en el dispositivo?', 
        a: 'Limpia los datos eliminados (soft-delete). Exporta un backup y luego reinicia la base de datos. Elimina fotos antiguas de productos.' 
    }
];

// ============================================================
// LOG DE CARGA
// ============================================================

console.log('📚 FAQs cargadas correctamente v1.0.0');
console.log(`   📝 Total de preguntas: ${window.FAQS_DB.length}`);
console.log(`   📂 Categorías: ${[...new Set(window.FAQS_DB.map(f => f.cat))].length}`);
console.log('   🎯 Filtradas para usuario final (sin nivel técnico)');