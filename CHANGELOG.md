# 📋 CHANGELOG — Panario

Todos los cambios notables en este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto se adhiere a [Versionado Semántico](https://semver.org/lang/es/).

---

## 📖 LEYENDA DE ICONOS

| Icono | Significado |
|-------|-------------|
| ➕ | Nuevo / Añadido |
| ✏️ | Modificado / Cambiado |
| 🗑️ | Eliminado |
| 🐛 | Corregido (bug fix) |
| 🔒 | Seguridad |
| ⚡ | Rendimiento |
| 📚 | Documentación |
| 🔧 | Mantenimiento / Refactor |
| ⚠️ | Breaking change |

---

## [Unreleased]

### Pendiente para v1.0.0

- 📚 Documentación final (MANUAL.md, CHANGELOG.md, LICENSE) — ✅ **COMPLETADO**
- 🚀 Publicación en GitHub Pages
- 🧪 Pruebas finales de integración

---

## [2.3.7] — 2026-09-29

### 🎯 CORRECCIÓN #15 — Sistema de Ayuda con FAQs Externas

#### ➕ Añadido

- **`js/faqs.js`** (v1.0.1): Nuevo archivo externo con **204 FAQs** únicas organizadas en 19 categorías.
- **`js/help-detailed.js`**: Nueva sección dinámica **"❓ Preguntas Frecuentes"** al final del manual.
- **`js/help-detailed.js`**: Nueva función `renderFAQsEnAyudaDetallada()`.
- **`js/help-detailed.js`**: Nueva función `toggleFAQEnAyudaDetallada()`.
- **`js/help-detailed.js`**: Nueva función `filtrarFAQsEnAyudaDetallada()`.
- **`js/help.js`**: Nueva función `obtenerFAQs()` para leer `window.FAQS_DB`.
- **`js/profile.js`**: Nuevo botón **"📖 Ayuda detallada"** en la sección "Ayuda y Tutoriales".
- **`MANUAL.md`**: Manual completo del usuario (~1.850 líneas).
- **`CHANGELOG.md`**: Este archivo de historial de versiones.

#### ✏️ Modificado

- **`js/help.js`** (v3.0.0 → v3.0.1): Ahora carga las FAQs desde `window.FAQS_DB` en lugar de tenerlas embebidas.
- **`index.html`** (v2.3.6 → v2.3.7): Añadida carga de `js/faqs.js` (antes de `help.js`) y `js/help-detailed.js` (después de `help.js`).
- **`sw.js`** (v2.3.6 → v2.3.7): `CACHE_NAME` actualizado. Añadidos `js/faqs.js` y `js/help-detailed.js` a `CRITICAL_ASSETS`.
- **`manifest.json`** (v2.3.6 → v2.3.7): Versión y URLs de shortcuts actualizadas.
- **`offline.html`** (v2.3.6 → v2.3.7): Constante `SW_VERSION` actualizada.
- **`meta[name="app-version"]`**: Ahora reporta `2.3.7`.

#### 🗑️ Eliminado

- **`js/help.js`**: Array `FAQS_DB` local (solo tenía 10 FAQs hardcodeadas).

#### 🔧 Cambios internos

- **`js/help.js`**: Nuevo getter `window.HelpModule.FAQS_DB` para retrocompatibilidad.
- **`js/help-detailed.js`**: `HELP_SECTIONS` ahora tiene 15 secciones (14 estáticas + 1 dinámica).

#### 🐛 Corregido

- **`js/faqs.js`**: Eliminadas **12 FAQs duplicadas** de la versión inicial (v1.0.0 → v1.0.1).
- **`js/help.js`**: El popover del Centro de Ayuda ahora muestra dinámicamente el número de FAQs (antes mostraba un valor hardcodeado).

#### 🔒 Seguridad

- Ninguna corrección de seguridad en esta versión.

---

## [2.3.6] — 2026-09-28

### 🎯 SESIÓN 7 — Cuentas Compartidas + Primer Admin + Config Bancaria

#### ➕ Añadido

- **`db.js` v2.3.8**: Tablas `bank_default_user` y `config_bancaria_negocio`.
- **`db.js`**: Funciones `getConfigBancaria()`, `saveConfigBancaria()`, `getCuentaDefaultUsuario()`, `setCuentaDefaultUsuario()`.
- **`db.js`**: Columna `is_first_admin` en tabla `users`.
- **`db.js`**: Columna `is_shared` en tabla `bank_accounts`.
- **`db.js`**: Función `repararNegocioIdEnBankAccounts()` (auto-reparación de cuentas huérfanas).
- **`auth.js` v2.3.5**: Marcar automáticamente al primer usuario de un negocio como admin.
- **`profile.js`**: Toggle **"🔗 Compartida"** en el formulario de crear/editar cuenta bancaria.
- **`profile.js`**: Badge visual **"🔗 Compartida"** en la lista de cuentas.
- **`ui-settings.js`**: Nueva sección **"🔐 Configuración Bancaria"** (solo admin) con 3 toggles:
  - 👁️ Permitir a usuarios ver QRs de otros.
  - ⭐ Permitir a usuarios cambiar su cuenta por defecto.
  - 👑 Solo usar y mostrar el QR del administrador.
- **`ui-settings.js`**: Sección **"👥 Gestión de Usuarios"** con badge "👑 PRIMER ADMIN".

#### ✏️ Modificado

- **`db.js`**: `saveBankAccount()` ahora guarda `is_shared` y garantiza `negocio_id` no nulo.
- **`profile.js`**: `showBankAccountsModal()` ahora usa `getBankAccountsParaUsuario()` para filtrar por permisos.
- **`profile.js`**: `setDefaultBankAccount()` distingue entre admin (global) y no-admin (individual).
- **`profile.js`**: `deleteBankAccount()` verifica permisos antes de eliminar.
- **`app.js` v3.0.6**: `renderDashboardBankQR()` respeta `forzar_qr_admin`.
- **`app.js`**: `downloadDashboardQR()` usa `getCuentaDefaultUsuario()`.
- **`css/style.css` v2.3.6**: Corrección #13 (reducir margen inferior).
- **`index.html`**: Botón **👤 Perfil** añadido a la barra inferior.
- **`index.html`**: Botón **🚪 Cerrar sesión** añadido al header.
- **`manifest.json`** v2.3.6: Versión y shortcuts actualizados.
- **`sw.js`** v2.3.6: `CACHE_NAME` actualizado.
- **`offline.html`** v2.3.6: `SW_VERSION` actualizado.

#### 🐛 Corregido

- **`ui-settings.js`**: `closeHorarioDetalleModal` no definida (FIX CRÍTICO).
- **`profile.js`**: Error al guardar cuentas bancarias por `await` innecesario (regresión #16).
- **`profile.js`**: Cuentas con `negocio_id = NULL` (huérfanas).
- **`profile.js`**: Comparación de `user_id` fallaba por coerción de tipos en SQLite.
- **`orders.js` v2.3.1**: `validarYAjustarCantidadPedido()` no usaba `excludeOrderId`.
- **`dashboard.js` v2.2.4**: Query de "Ventas por empleado" filtraba por `created_by` (columna añadida después).
- **`orders.js` v2.3.2**: Fecha de venta desde pedido ahora es fecha actual (FIX #10).
- **`notifications.js` v2.3.5**: Cleanup al cerrar sesión (regresión #9).
- **`ui-sales.js` v2.1.15**: Traducción de métodos de pago (Corrección #7).

---

## [2.3.5] — 2026-09-26

### 🎯 CORRECCIÓN #17 — Configuraciones Individuales por Usuario

#### ➕ Añadido

- **`db.js`**: Columnas `sound_enabled`, `sound_id`, `guia_rapida_activa` en tabla `users`.
- **`db.js`**: Funciones `getUserSoundConfig()`, `updateUserSoundConfig()`, `getUserGuiaRapidaActiva()`, `updateUserGuiaRapida()`.
- **`auth.js`**: Carga automática de preferencias al hacer login.

#### ✏️ Modificado

- **`profile.js` v2.3.5**: `loadProfile()` lee guía rápida y sonido desde la BD (con fallback a localStorage).
- **`profile.js`**: `toggleGuiaRapida()` guarda en la BD con `user_id`.
- **`notifications.js` v2.3.5**: `getSoundConfig()` lee desde BD con `user_id`.

#### 🐛 Corregido

- **`notifications.js`**: Error al cerrar sesión por listeners no limpiados (regresión #9).

---

## [2.3.4] — 2026-09-26

### 🎯 CORRECCIÓN #16 (parte 2) — Configuraciones Individuales

#### ✏️ Modificado

- **`db.js`**: `ensureUserPreferencesColumns()` se ejecuta al iniciar la app.
- **`profile.js`**: Los toggles de Perfil reflejan el estado correcto del usuario actual.

---

## [2.3.3] — 2026-09-26

### 🎯 CORRECCIÓN #16 (parte 1) — Permisos Bancarios

#### ➕ Añadido

- **`db.js`**: Tabla `config_bancaria_negocio` con campos `permitir_ver_qr_otros` y `permitir_cambiar_default`.
- **`db.js`**: Tabla `bank_default_user` para cuenta por defecto individual.
- **`db.js`**: Funciones `getBankAccountsParaUsuario()`, `puedeUsuarioEditarCuenta()`.
- **`ui-settings.js`**: Sección "Configuración Bancaria" (solo admin).

#### ✏️ Modificado

- **`profile.js` v2.3.3**: Modal de cuentas bancarias con permisos.
- **`profile.js`**: Botón **"⭐ Mi Default"** para cuenta por defecto individual.
- **`profile.js`**: Indicadores visuales "⭐ Mi default" y "👑 Default global".
- **`profile.js`**: Banner informativo en modo solo lectura.

---

## [2.3.2] — 2026-09-25

### 🎯 CORRECCIÓN #14 — Ayuda Detallada sin iframe

#### ➕ Añadido

- **`js/help-detailed.js`** v1.0.0: Nuevo módulo que convierte `ayuda-panario.html` en módulo JS integrado.
- **`js/help.js`**: Función `abrirAyudaEnModalControlado()`.
- **`js/help.js`**: Función `imprimirAyudaModal()` (reemplaza a `imprimirAyudaIframe()`).
- **`js/help.js`**: Función `renderAyudaStandalone()` para `?standalone=1`.
- **`js/help.js`**: Función `abrirAyudaStandalone()`.
- **`js/help.js`**: Botón **🔗 ↗** (standalone, solo desktop).
- **`js/help.js`**: Botón **🖨️** (imprimir directamente el modal).

#### ✏️ Modificado

- **`js/help.js`** v3.0.0: `abrirAyudaDetallada()` usa `HelpDetailedModule.renderHelpDetailed()`.

#### 🗑️ Eliminado

- **`js/help.js`**: iframe de `ayuda-panario.html`.
- **`js/help.js`**: `postMessage` `CLOSE_HELP`/`PONG`/`NAVIGATE`.
- **`js/help.js`**: `forzarModalAlFrente()`.
- **`js/help.js`**: `ofrecerFallbackPestanaNueva()`.
- **`js/help.js`**: `imprimirAyudaIframe()`.

#### 🐛 Corregido

- **`js/help.js`**: Problemas de z-index del iframe.
- **`js/help.js`**: Problemas de `postMessage` cross-origin.

---

## [2.3.1] — 2026-09-25

### 🎯 CORRECCIÓN #13 — Margen inferior + Iconos

#### ✏️ Modificado

- **`css/style.css` v2.3.1**: Reducir margen inferior para mejor uso del espacio.
- **`css/style.css`**: Iconos optimizados.

---

## [2.3.0] — 2026-09-20

### 🎯 FASE 3.3 — Toggles del Dashboard

#### ➕ Añadido

- **`profile.js` v2.3.0**: 13 toggles en "📊 Elementos visibles en el Dashboard":
  - `show_corriente`
  - `show_orders_today`
  - `show_released_sales`
  - `show_best_worst_day`
  - `show_sales_by_employee`
  - `show_top_clients`
  - `show_top_products`
  - `show_funds_analysis`
  - `show_payment_methods`
  - `show_debts`
  - `show_rewards`
  - `show_bank_qr`
  - `show_quick_actions`

---

## [2.2.8] — 2026-09-19

### 🎯 FASE 2.2.8 — Producto en producción + Bug fixes

#### ➕ Añadido

- **`db.js`**: Columna `producto_id` en `calendario_produccion`.
- **`db.js`**: Funciones `getProductoDeProduccion()`, `getProduccionConProducto()`, `contarProduccionConProducto()`.
- **`ui-settings.js`**: Dropdown de productos en el modal de producción.

#### 🐛 Corregido

- **`ui-settings.js`**: Modal de producción no guardaba `producto_id`.
- **`ui-settings.js`**: Productos con CMPBC=0 no aparecían en dropdown.
- **`ui-settings.js`**: Producto guardado se perdía al reabrir el modal.
- **`ui-settings.js`**: `producto_id` no se propagaba a todas las fechas del rango.

---

## [2.2.7] — 2026-09-18

### 🎯 FASE 2.2.7 — Filtros del Dashboard + Algoritmo del amanecer

#### ➕ Añadido

- **`app.js`**: `window._pendingOrderFilters` para pasar filtros entre módulos.
- **`ui-settings.js`**: Regla del amanecer mejorada (bloques ≤ 9:00 AM).

#### 🐛 Corregido

- **`ui-settings.js`**: Bloque de 8:00 AM no era válido para el amanecer.
- **`ui-orders.js`**: `renderOrdersView()` no leía `window._pendingOrderFilters`.
- **`dashboard.js`**: Tarjeta "Pedidos hoy/mañana" no aplicaba filtros.

---

## [2.2.6] — 2026-09-17

### 🎯 FASE 2.2.6 — Badge de producción clickeable

#### ✏️ Modificado

- **`ui-orders.js`**: Badge morado de producción ahora es clickeable (`event.stopPropagation()`).
- **`ui-orders.js`**: Tooltip: "Clic para configurar la producción del día".

---

## [2.2.5] — 2026-09-16

### 🎯 FASE 2.2.5 — Conteo unificado de pedidos

#### ➕ Añadido

- **`db.js`**: Función `contarPedidosYVentasFecha()`.
- **`db.js`**: Función `getProduccionRangoFechas()`.

#### 🐛 Corregido

- **`ui-settings.js`**: Contador "Pedidos: 3/6" cambiaba al convertir pedido en venta.
- **`dashboard.js`**: Diferencia entre "Pedidos de hoy" en Dashboard y en lista de Pedidos.

---

## [2.2.4] — 2026-09-15

### 🎯 FASE 2.2.4 — CMPBC + Algoritmo de bloques

#### ➕ Añadido

- **`db.js`**: Columna `capacidad_max_bloque` en tabla `productos`.
- **`db.js`**: Columna `bloques_usados` y `distribucion_bloques` en `calendario_produccion`.
- **`db.js`**: Funciones `getCMPBCProducto()`, `getProductosConCMPBC()`, `calcularBloquesIdeales()`.
- **`ui-productos.js`**: Campo CMPBC en formulario de producto.
- **`ui-settings.js`**: Botón **✨ Calcular bloques automáticamente** en modal de producción.

#### ✏️ Modificado

- **`db.js`**: Migración de `cantidad_produccion` de INTEGER a REAL.
- **`ui-settings.js`**: Modal de producción acepta decimales.

---

## [2.2.3] — 2026-09-14

### 🎯 FASE 2.2.3 — Barra de título sticky

#### 🐛 Corregido

- **`css/style.css`**: Barra de título se deformaba al minimizar/restaurar la app.
- **`app.js`**: `limpiarEstilosResiduales()` ahora limpia más propiedades CSS.

---

## [2.2.2] — 2026-09-13

### 🎯 FASE 2.2.2 — Fechas unificadas

#### ✏️ Modificado

- **`dashboard.js`**: Tarjeta "Pedidos mañana" usa la misma función de conteo que la lista de Pedidos.
- **`orders.js`**: Orden de pedidos por `id` ascendente (antes por `created_at`).

---

## [2.2.1] — 2026-09-12

### 🎯 FASE 2.2.1 — Productos por defecto

#### 🐛 Corregido

- **`db.js`**: Insertar 18 productos por defecto en tabla `productos` (antes intentaba en `products`, que no existía).

---

## [2.2.0] — 2026-09-11

### 🎯 FASE 2.2.0 — PWA shortcuts + Versión unificada

#### ➕ Añadido

- **`manifest.json`**: Shortcut **🔨 Producción**.
- **`manifest.json`**: `display_override`, `share_target`, `launch_handler`.

#### ✏️ Modificado

- **Todos los archivos**: Versión unificada a `2.2.0`.
- **`sw.js`**: `CACHE_NAME` actualizado.

---

## [2.1.11] — 2026-09-10

### 🎯 FASE 2.1.11 — Auto-reparación de caché + Auto-retry

#### ➕ Añadido

- **`sw.js`**: Auto-reparación de caché (verificación cada 15 min, umbral 80%).
- **`offline.html`**: Auto-retry cada 5s (máx 12 intentos).
- **`offline.html`**: Detección de reconexión con fetch HEAD.

#### ✏️ Modificado

- **`index.html`**: `viewport` cambiado a `user-scalable=5.0` (zoom permitido).

---

## [2.1.10] — 2026-09-09

### 🎯 FASE 2.1.10 — Desbloqueo de audio

#### ➕ Añadido

- **`notifications.js`**: Desbloqueo automático del `AudioContext` con el primer gesto del usuario.

#### 🐛 Corregido

- **`notifications.js`**: Sonido no funcionaba en iOS Safari.

---

## [2.1.9] — 2026-09-08

### 🎯 FASE 2.1.9 — Orden de ventas + Decimales

#### ✏️ Modificado

- **`sales.js`**: Orden de ventas por `id` ascendente.
- **`reports.js`**: Reportes ordenados por fecha ASC + id ASC.

---

## [2.1.8] — 2026-09-07

### 🎯 FASE 2.1.8 — Producción con decimales

#### ➕ Añadido

- **`ui-settings.js`**: Cantidad de producción acepta decimales.

#### ✏️ Modificado

- **`db.js`**: Migración de `cantidad_produccion` de INTEGER a REAL.

---

## [2.1.7] — 2026-09-06

### 🎯 FASE 2.1.7 — Reprogramación por rango

#### ➕ Añadido

- **`ui-settings.js`**: Modal de **🔄 Reprogramar Pedidos por Rango**.

#### ✏️ Modificado

- **`orders.js`**: Añadir causa y nota a pedidos reprogramados.

---

## [2.1.6] — 2026-09-05

### 🎯 FASE 2.1.6 — Ayuda detallada (iframe)

#### ➕ Añadido

- **`js/help.js`**: `abrirAyudaDetallada()` con iframe.
- **`ayuda-panario.html`**: Manual completo en HTML.

#### 🐛 Corregido

- **`js/help.js`**: Problemas de z-index del iframe.

---

## [2.1.5] — 2026-09-04

### 🎯 FASE 2.1.5 — Centro de Ayuda flotante

#### ➕ Añadido

- **`js/help.js`**: Popover del Centro de Ayuda (❓).
- **`js/help.js`**: Tour interactivo de 8 pasos.
- **`js/help.js`**: Guía rápida de inicio (5 pasos).
- **`js/help.js`**: Modal de Léeme.
- **`js/help.js`**: Modal de Créditos.

---

## [2.1.0] — 2026-08-28

### 🎯 FASE 2.1.0 — Módulo de Producción

#### ➕ Añadido

- **`ui-settings.js`**: Calendario de producción.
- **`ui-settings.js`**: Modal de configuración de bloques.

---

## [2.0.0] — 2026-08-15

### 🎯 FASE 2.0.0 — Refactor Multiusuario

#### ⚠️ BREAKING CHANGES

- **`db.js`**: Migración de esquema para soportar multiusuario.
- **`auth.js`**: Nuevo sistema de login con negocio.
- **`db.js`**: Todas las tablas ahora tienen `negocio_id` y `user_id`.

#### ➕ Añadido

- **`auth.js`**: Códigos de invitación (8 caracteres).
- **`db.js`**: Roles admin/usuario.
- **`ui-settings.js`**: Gestión de usuarios.

#### ✏️ Modificado

- **Todos los módulos**: Refactor para filtrar por negocio.

---

## [1.0.0] — 2026-07-01

### 🎉 Versión inicial

#### ➕ Añadido

- Módulos base: Dashboard, Pedidos, Insumos, Recetas, Productos, Ventas, Herramientas.
- Login/registro simple.
- Persistencia local con SQLite (sql.js).
- PWA básica.

---

## 📊 ESTADÍSTICAS DEL PROYECTO

| Métrica | Valor |
|---------|-------|
| **Versión actual** | 2.3.7 |
| **Total de versiones documentadas** | 20+ |
| **Archivos JS** | 20 |
| **Archivos CSS** | 1 |
| **Archivos HTML** | 3 (index, offline, ayuda) |
| **Archivos PWA** | 3 (manifest, sw, offline) |
| **FAQs** | 204 (19 categorías) |
| **Secciones del manual** | 15 |
| **Shortcuts PWA** | 6 |
| **Idiomas soportados** | Español (es) |

---

## 🎯 ROADMAP FUTURO

### v1.0.0 (próxima publicación)

- ✅ Sistema de Ayuda completo con FAQs externas
- ✅ Documentación final (MANUAL, CHANGELOG, LICENSE)
- ⏳ Publicación en GitHub Pages
- ⏳ Pruebas finales de integración

### v1.1.0 (futuro)

- 📱 Sincronización entre dispositivos (opcional, vía export/import)
- 📊 Gráficos avanzados en Dashboard
- 🎨 Más temas visuales
- 🌐 Soporte multiidioma (inglés, portugués)
- 📦 Exportación a Excel/CSV

### v1.2.0 (futuro)

- 🖨️ Reportes imprimibles personalizables
- 📅 Vista de calendario unificada
- 🔔 Notificaciones push (PWA)
- 🎯 Objetivos y metas de ventas

### v2.0.0 (futuro lejano)

- ☁️ Sincronización cloud (opcional)
- 👥 Colaboración en tiempo real
- 📱 App nativa (React Native / Flutter)
- 🔌 API pública para integraciones

---

## 📚 REFERENCIAS

- [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
- [Versionado Semántico](https://semver.org/lang/es/)
- [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/)

---

## 📞 CONTACTO

**Desarrollador:** Ricardo Castillo Valdés

- 💬 **WhatsApp:** +53 55031725
- 📧 **Email:** 3sayricardo@gmail.com

---

**Última actualización:** 29 de septiembre de 2026