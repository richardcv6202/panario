# 📦 `README.md` para GitHub — Panario v2.3.6

**Objetivo:** Presentar Panario de forma profesional en GitHub: descripción, características, instalación, uso, arquitectura, capturas, licencia, contacto.

**TODO lo demás queda IDÉNTICO al estándar.**

```markdown
# 🍞 Panario

> **Sistema de gestión integral para panadería artesanal**  
> Offline-first · Multiusuario · PWA · 100% cliente

[![Versión](https://img.shields.io/badge/versión-2.3.6-f5a623?style=flat-square)](https://github.com/)
[![Estado](https://img.shields.io/badge/estado-producción-success?style=flat-square)](https://github.com/)
[![Licencia](https://img.shields.io/badge/licencia-propietaria-red?style=flat-square)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-instalable-blue?style=flat-square)](https://web.dev/progressive-web-apps/)
[![Offline](https://img.shields.io/badge/offline--first-100%25-green?style=flat-square)](https://github.com/)

---

## 📖 Descripción

**Panario** es una aplicación web progresiva (PWA) de gestión integral diseñada **específicamente para panaderías artesanales**. Permite controlar insumos, recetas, productos, ventas, pedidos, corriente eléctrica, producción y finanzas, todo **sin conexión a internet** y **sin servidor**.

Nació de una necesidad real: gestionar una panadería artesanal en Cuba, donde los apagones programados (bloques de 3h corriente / 12h apagón), la lista de espera, la producción limitada y la falta de conexión estable hacen que las apps genéricas no sirvan.

---

## ✨ Características principales

### 🏠 Funcionalidad core

- **🛒 Insumos** — Control de stock, costos y alertas de mínimos.
- **📖 Recetas** — Fórmulas de producción con cálculo automático de costos.
- **🏷️ Productos** — Catálogo con margen de ganancia y CMPBC (capacidad por bloque de corriente).
- **💰 Ventas** — Registro con descuento automático de stock, deudas y ventas liberadas.
- **📋 Pedidos** — Reservas, lista de espera, sesiones de recogida, cupos por producción.
- **⚡ Corriente** — Planificación de producción según horarios de apagón.
- **🔨 Producción** — Algoritmo inteligente de bloques con regla del amanecer.
- **📊 Dashboard** — Estadísticas, gráficos configurables, ranking de clientes y empleados.
- **🏆 Premios** — Fidelización de mejores clientes del mes/año.
- **📄 Reportes** — PDFs parametrizables de ventas, pedidos, gastos, insumos, recetas, deudas.

### 🔐 Multiusuario y roles

- **Código de invitación** de 8 caracteres para unirse al negocio.
- **Roles**: Administrador (`is_admin`) y primer admin (`is_first_admin`).
- **Configuraciones individuales** por usuario (tema, sonido, dashboard, guía rápida).
- **Bloqueo por recetas no compartidas**: un usuario no-admin no puede procesar pedidos que usen recetas que no le compartieron.

### 🏦 Cuentas bancarias

- **QR generado** o subido por el usuario.
- **Cuenta por defecto individual** (cada usuario elige la suya).
- **Permisos configurables por el admin** (3 toggles):
  - `permitir_ver_qr_otros` — Los no-admin pueden ver QRs de otros.
  - `permitir_cambiar_default` — Los no-admin pueden elegir su cuenta por defecto.
  - `forzar_qr_admin` — El Dashboard siempre muestra el QR del admin.
- **Cuentas compartidas** (`is_shared`): visibles para todos los usuarios del negocio.

### 📱 PWA

- **Instalable** en móvil (Android, iOS).
- **100% offline** tras la primera carga.
- **6 shortcuts** en el icono de la app.
- **Auto-reparación de caché** cada 15 minutos.
- **Actualización automática** cuando hay nueva versión.

### 💾 Datos y backups

- **SQLite WASM** (sql.js) — base de datos local en el navegador.
- **Persistencia** en `localStorage`.
- **UUIDs** para fusión de bases de datos entre dispositivos.
- **Soft-delete** en todas las tablas críticas.
- **Auditoría** completa (`created_by`, `modified_by`, `created_at`, `updated_at`).
- **Backups** diferenciados: completo, solo datos, salva diferencial, fusión.

---

## 🚀 Instalación

Panario no requiere instalación ni servidor. Solo necesitas un navegador moderno.

### Opción 1: Usar en el navegador

1. Abre la URL de la app (por ejemplo, `https://usuario.github.io/panario/`).
2. Espera a que cargue completamente (verás la pantalla de login).
3. ¡Listo! Puedes empezar a usar Panario.

### Opción 2: Instalar como PWA (recomendado)

**En Android (Chrome):**
1. Abre Panario en Chrome.
2. Menú (3 puntos) → **"Instalar aplicación"** o **"Añadir a pantalla de inicio"**.
3. Confirma. Aparece el icono de Panario en tu pantalla de inicio.

**En iOS (Safari):**
1. Abre Panario en Safari.
2. Botón **Compartir** → **"Añadir a pantalla de inicio"**.
3. Confirma.

**En Desktop (Chrome/Edge):**
1. Abre Panario en el navegador.
2. En la barra de direcciones, haz clic en el icono de instalación (⊕).
3. Confirma.

---

## 🎯 Primeros pasos

### 1. Crear tu cuenta

Al abrir Panario por primera vez, verás la pantalla de login. Pulsa **"Crear una"** y elige:

- **✨ Crear nuevo negocio**: si eres el dueño y vas a crear tu panadería. Serás el **primer administrador**.
- **🔗 Unirme a uno existente**: si te han invitado con un código de 8 caracteres.

### 2. Configurar tu panadería

1. **Perfil** → Añade tu nombre, foto, negocio.
2. **Herramientas** → Configura los **horarios de corriente**.
3. **Insumos** → Registra tus materias primas (harina, levadura, etc.).
4. **Recetas** → Crea las fórmulas de producción.
5. **Productos** → Añade los artículos que vendes (jaba, media jaba, etc.).

### 3. Empezar a usar

- **💰 Ventas** → Registra cada transacción.
- **📋 Pedidos** → Gestiona las reservas de clientes.
- **⚡ Corriente** → Planifica la producción según los apagones.
- **📊 Dashboard** → Revisa las estadísticas.

---

## 🛠️ Tecnologías

| Capa | Tecnología |
|------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript ES6+ |
| **Base de datos** | SQLite (sql.js / WebAssembly) |
| **Persistencia** | localStorage |
| **PWA** | Service Worker, Manifest |
| **Librerías** | [sql.js](https://github.com/sql-js/sql.js), [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) |
| **Arquitectura** | 100% cliente, offline-first, sin backend |

---

## 📁 Estructura del proyecto

```
panario/
├── index.html                  # Página principal
├── offline.html                # Página de sin conexión
├── ayuda-panario.html          # Ayuda detallada
├── manifest.json               # Manifest PWA
├── sw.js                       # Service Worker
├── .gitignore
├── README.md
├── LICENSE
│
├── css/
│   └── style.css               # Estilos globales
│
├── js/                         # Módulos JavaScript
│   ├── modal.js                # Modales + limpieza de estilos
│   ├── db.js                   # Base de datos + migraciones
│   ├── auth.js                 # Autenticación + multiusuario
│   ├── theme.js                # Tema claro/oscuro
│   ├── profile.js              # Perfil + cuentas bancarias
│   ├── notifications.js        # Notificaciones + sonido
│   ├── corriente-utils.js      # Utilidades de corriente
│   ├── orders.js               # Lógica de pedidos
│   ├── ui-orders.js            # UI de pedidos
│   ├── ui-insumos.js           # UI de insumos
│   ├── recipes.js              # Lógica de recetas
│   ├── ui-recipes.js           # UI de recetas
│   ├── ui-productos.js         # UI de productos
│   ├── sales.js                # Lógica de ventas
│   ├── ui-sales.js             # UI de ventas
│   ├── dashboard.js            # Estadísticas
│   ├── ui-settings.js          # UI de herramientas
│   ├── reports.js              # Generación de PDFs
│   ├── rewards.js              # Sistema de premios
│   ├── help.js                 # Centro de ayuda
│   └── app.js                  # Controlador principal
│
├── lib/                        # Librerías externas
│   ├── sql-wasm.js
│   ├── sql-wasm.wasm
│   └── qrcode.js
│
└── assets/                     # Imágenes y recursos
    ├── icon-192.png
    ├── icon-512.png
    ├── icon-maskable-192.png
    ├── icon-maskable-512.png
    └── dev-avatar.png
```

---

## 🔧 Desarrollo local

### Requisitos

- Un navegador moderno (Chrome 90+, Firefox 88+, Edge 90+, Safari 14+).
- Un servidor HTTP local (opcional, pero recomendado para que el SW funcione).

### Servidor local con Python

```bash
# Python 3
cd panario
python3 -m http.server 8000
```

Luego abre `http://localhost:8000` en tu navegador.

### Servidor local con Node.js

```bash
# Con npx (Node.js 14+)
npx serve panario

# O con http-server
npm install -g http-server
http-server panario -p 8000
```

### Consideraciones

- **NO abras el `index.html` directamente con `file://`** — el Service Worker y SQL.js WASM no funcionan con ese protocolo.
- **Siempre usa un servidor HTTP local** (`localhost` está exento de HTTPS).

---

## 🧪 Diagnóstico

Panario incluye herramientas de diagnóstico integradas:

### Diagnóstico de Producción

**Herramientas → 🔍 Diagnóstico de Producción → "Ejecutar diagnóstico"**

Ejecuta **11 tests** que verifican:
1. `DBModule` disponible.
2. `saveProduccion()` existe.
3. `getProduccionByFecha()` existe.
4. `saveProduccionRango()` existe.
5. `getCMPBCProducto()` existe.
6. `contarPedidosYVentasFecha()` existe.
7. Estructura de `calendario_produccion`.
8. CMPBC en `productos`.
9. Algoritmo de bloques.
10. Tablas bancarias (`bank_default_user`, `config_bancaria_negocio`).
11. Columna `forzar_qr_admin`.

### Verificación de caché

**DevTools (F12) → Console:**

```javascript
// Ver cachés activos
caches.keys().then(console.log);

// Verificar integridad
navigator.serviceWorker.controller?.postMessage({ type: 'CHECK_INTEGRITY' });
```

### Verificación de versión

**Console:**

```javascript
window.getAppVersion(); // → "2.3.6"
```

---

## 📚 Documentación

Panario incluye documentación integrada:

- **❓ Centro de Ayuda** — Accesible desde el botón `❓` del header.
- **📖 Guía rápida** — 5 pasos para empezar.
- **🎯 Tutorial interactivo** — Recorrido guiado de 8 pasos.
- **❓ FAQ** — 375+ preguntas frecuentes organizadas por categoría.
- **📄 Ayuda detallada** — Manual completo en iframe.
- **📝 Léeme** — Información del proyecto.
- **👨‍💻 Créditos** — Información del desarrollador.

---

## 🎯 Casos de uso

### Panadero artesanal (dueño)

- Registra insumos, recetas y productos.
- Configura horarios de corriente.
- Programa la producción diaria.
- Revisa estadísticas y ganancias.
- Gestiona usuarios y códigos de invitación.

### Vendedor (usuario regular)

- Registra ventas.
- Gestiona pedidos.
- Añade clientes a la lista de espera.
- Ve el Dashboard con sus estadísticas.
- Cambia su tema, sonido y cuenta bancaria por defecto.

### Familiar/ayudante

- Ayuda en horas punta.
- Registra ventas sin acceso a edición de productos.
- Ve solo la información que le corresponde.

---

## 🚧 Limitaciones conocidas

| Limitación | Descripción | Workaround |
|------------|-------------|------------|
| **Tamaño de BD** | SQLite WASM tiene límite de ~50 MB en `localStorage` | Exportar backups periódicamente |
| **Rendimiento en móviles viejos** | Puede ralentizarse con muchos registros | Usar "Limpiar datos eliminados" |
| **Sin sincronización automática** | Cada dispositivo tiene su propia BD | Usar "🔀 Fusionar bases" para sincronizar |
| **Sin notificaciones push reales** | Las notificaciones son locales | — |
| **Sin autenticación de servidor** | Los usuarios se guardan localmente | — |

---

## 🗺️ Roadmap

### ✅ Completado (v2.3.6)

- Sistema multiusuario con roles.
- CMPBC y algoritmo de bloques.
- Fusión de bases de datos por UUID.
- Cuentas bancarias con permisos configurables.
- Primer admin (`is_first_admin`).
- Cuentas compartidas (`is_shared`).

### ⏳ En progreso

- Auditoría de textos en inglés (v2.3.7).

### 📅 Futuro (v3.0)

- **Producción Diaria con Destinos**: modelo que descuenta stock al producir, no al vender, resolviendo el doble descuento.
- **Sincronización LAN** (evaluada, descartada por complejidad).
- **Reportes avanzados** con gráficos.

---

## 🤝 Contribuir

Panario es un proyecto **propietario** de **Ricardo Castillo Valdés**. No se aceptan contribuciones externas sin autorización previa.

Si encuentras un bug o tienes una sugerencia, contacta directamente:

- **WhatsApp:** +53 55031725
- **Email:** 3sayricardo@gmail.com

---

## 📄 Licencia

**© 2026 Ricardo Castillo Valdés — Todos los derechos reservados.**

Este software es **propietario**. No se permite su redistribución, modificación o uso comercial sin autorización expresa del autor.

Ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 🙏 Agradecimientos

- A mi esposa, por soportar las horas de desarrollo.
- A los panaderos artesanales de Cuba, por inspirar este proyecto.
- A la comunidad de código abierto por las librerías utilizadas:
  - [sql.js](https://github.com/sql-js/sql.js) — SQLite en WebAssembly
  - [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) — Generación de códigos QR

---

## 📞 Contacto

**Ricardo Castillo Valdés**  
Desarrollador y Diseñador de Panario  
🇨🇺 Cuba

- 📱 WhatsApp: [+53 55031725](https://wa.me/5355031725)
- 📧 Email: [3sayricardo@gmail.com](mailto:3sayricardo@gmail.com)

---

## 📊 Estadísticas del proyecto

| Métrica | Valor |
|---------|-------|
| **Versión actual** | 2.3.6 |
| **Líneas de código** | ~35,000 |
| **Archivos JS** | 23 |
| **Tablas en BD** | 25 |
| **Preguntas FAQ** | 375+ |
| **Correcciones aplicadas** | 42 |
| **Cobertura offline** | 100% |
| **Compatibilidad** | Chrome 90+, Firefox 88+, Edge 90+, Safari 14+ |

---

<div align="center">

**Hecho con ❤️ para panaderos artesanales — Desarrollado en Cuba 🇨🇺**

🍞 **Panario** — Tu panadería en orden

</div>
```

---

## 📋 RESUMEN DEL `README.md`

### 🎯 Secciones incluidas

| # | Sección | Propósito |
|---|---------|-----------|
| 1 | **Título + badges** | Presentación con estado, versión y licencia |
| 2 | **Descripción** | Contexto y motivación del proyecto |
| 3 | **Características** | Lista detallada por área |
| 4 | **Instalación** | Cómo usar como web o PWA |
| 5 | **Primeros pasos** | Guía de inicio rápido |
| 6 | **Tecnologías** | Stack usado |
| 7 | **Estructura** | Árbol de directorios |
| 8 | **Desarrollo local** | Cómo levantar un servidor |
| 9 | **Diagnóstico** | Herramientas de verificación |
| 10 | **Documentación** | Ayuda integrada |
| 11 | **Casos de uso** | Perfiles de usuario |
| 12 | **Limitaciones** | Restricciones conocidas |
| 13 | **Roadmap** | Estado y futuro |
| 14 | **Contribuir** | Política de contribución |
| 15 | **Licencia** | Propietaria |
| 16 | **Agradecimientos** | Créditos |
| 17 | **Contacto** | Datos del desarrollador |
| 18 | **Estadísticas** | Métricas del proyecto |

### ✅ Puntos clave

- **Profesional:** estructura clara, badges, tablas.
- **Descriptivo:** explica qué es, para quién es, y por qué existe.
- **Práctico:** instrucciones paso a paso para instalar y usar.
- **Honesto:** menciona limitaciones y roadmap.
- **Contacto:** datos claros del desarrollador.
- **Español:** coherente con el resto del proyecto.

---

## 🚀 SIGUIENTE PASO

Ahora tienes:

1. **README.md** completo para GitHub.

**Si quieres, puedo también darte:**
- **`LICENSE`** — Texto de licencia propietaria.
- **`CHANGELOG.md`** — Historial de cambios por versión.
- **`CONTRIBUTING.md`** — Guía de contribución (aunque sea propietario).
- **`CODE_OF_CONDUCT.md`** — Código de conducta.

**Dime cuál(es) quieres y te los entrego en mensajes separados.** 📦🚀

---

## 📊 ESTADO FINAL DEL PROYECTO

```
┌─────────────────────────────────────────────────────────────┐
│  PANARIO v2.3.6 — ESTADO POR ÁREA                           │
├─────────────────────────────────────────────────────────────┤
│  ✅ Código fuente (13 archivos):                100%        │
│  ✅ Configuración PWA (4 archivos):             100%        │
│  ✅ Documentación (README + Manual):            100%        │
│  ✅ Archivos de soporte (.gitignore):           100%        │
│  ⏳ Corrección #7 (textos en inglés):             0%        │
│  ⏳ Publicación en GitHub:                        0%        │
├─────────────────────────────────────────────────────────────┤
│  🎯 TOTAL PROYECTO:                             99%        │
└─────────────────────────────────────────────────────────────┘
```

