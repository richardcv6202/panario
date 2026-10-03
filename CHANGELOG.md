# 📋 CHANGELOG — Panario

Todos los cambios notables en este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto se adhiere a [Versionado Semántico](https://semver.org/lang/es/).

---

## 📖 LEYENDA DE ICONOS

| Icono | Significado |
|-------|-------------|
| ✨ | Nuevo / Añadido |
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

- 🚀 Publicación en GitHub Pages
- 🧪 Pruebas finales de integración
- 📚 Actualización del MANUAL DE USUARIO.pdf a v2.5.0

---

## [2.5.0] — 2026-10-03

### 🎯 Correcciones 011026 (N1–N6) + FIX N5

Sesión completa de correcciones sobre la versión estable 2.4.0. Se resolvieron
seis incidencias funcionales (N1–N6) y un bug crítico asociado a N5.

#### ✨ Añadido

- **N1 — Exclusión de deudores en premios** (`db.js` v2.7.1 + `rewards.js` v2.4.0):
  los clientes con deuda pendiente quedan excluidos automáticamente del cálculo
  de premios (Mejor Cliente mensual/anual y Más Frecuente).
- **N1 — Historial de premios otorgados** (`db.js` v2.7.1 + `rewards.js` v2.4.0):
  nueva tabla `premios_otorgados` con registro histórico consultable.
- **N2 — Dos categorías de premios + exclusión** (`db.js` v2.7.1 + `rewards.js` v2.4.0):
  el modal de premios ahora distingue entre premios por victorias y premios por
  frecuencia, con exclusión de deudores en ambos casos.
- **N2-bis — Interruptor "Premio no requiere entrega"** (`db.js` v2.7.1 + `rewards.js` v2.4.0):
  nuevo toggle que permite registrar premios que no implican entrega física de
  producto (quedan marcados como "Entregado" automáticamente).
- **N5 — Tarjeta "Promedio diario por producto"** (`db.js` v2.7.1 + `profile.js` v2.4.1 + `dashboard.js` v2.2.7 + `app.js` v3.1.2):
  nueva tarjeta del Dashboard que muestra el promedio diario de ventas de un
  producto seleccionado por el usuario, con día de mayor venta, total vendido
  y unidades totales.
- **N6 — Limpieza de transacciones huérfanas** (`db.js` v2.7.1 + `ui-settings.js` v2.3.10):
  nueva herramienta en Herramientas → Diagnóstico que detecta y limpia
  transacciones de ingreso sin `sale_id` válido o con venta eliminada.

#### 🐛 Corregido

- **N3 — Diferencia en cálculo de ingresos** (`ui-sales.js` v2.1.16 + `dashboard.js` v2.2.7):
  el total de ingresos mostrado en Dashboard y Ventas ahora se calcula desde
  `sales.total`, eliminando la discrepancia entre ambas vistas. Se añadió
  diagnóstico interno de ingresos.
- **N4 — Ventas liberadas no se guardaban ni listaban** (`sales.js` v2.1.14 + `ui-sales.js` v2.1.16):
  las ventas liberadas ahora se guardan siempre, incluso si falla el descuento
  de stock, y se listan correctamente forzando el toggle "Mostrar liberadas" a ON
  tras crearlas.
- **N6 — Formato de retorno de handlers UI** (`ui-settings.js` v2.3.10):
  los handlers `diagnosticarTransaccionesHuerfanasAction()` y
  `limpiarTransaccionesHuerfanasAction()` fueron adaptados al formato real que
  devuelve `db.js` (`{ total, huerfanas, total_huerfano, porTipo, detalle }`).
- **FIX N5 — `show_producto_promedio` hardcodeado** (`db.js` v2.7.1):
  `getUserDashboardConfig()` devolvía `show_producto_promedio: false` fijo,
  impidiendo que la tarjeta apareciera. Ahora se calcula dinámicamente según
  `dash_producto_promedio_id > 0`.
- **FIX N5 — Limpieza de `producto_promedio_id`** (`profile.js` v2.4.1):
  `toggleProductoPromedio()` no limpiaba el producto seleccionado al desactivar
  el toggle. Ahora sí lo limpia, evitando configuraciones inconsistentes.

#### 🔧 Cambios internos

- **`db.js` v2.7.1**: migraciones idempotentes para las nuevas columnas
  (`dash_producto_promedio_id`, columnas de `premios_config`), nueva función
  `getPromedioDiarioProducto()`, helper `_getSQLExclusionDeudores()`,
  `getConfigGlobalNegocio()` / `saveConfigGlobalNegocio()`.
- **`rewards.js` v2.4.0**: refactor del modal de premios para soportar las dos
  categorías, historial y toggle de entrega.
- **`dashboard.js` v2.2.7**: inclusión de `promedioProducto` en el retorno de
  `getDashboardStats()` y diagnóstico de ingresos.
- **`app.js` v3.1.2**: nueva función `renderTarjetaProductoPromedio()` y
  contenedor `#dashboard-producto-promedio-container`.
- **`profile.js` v2.4.1**: nuevas funciones `toggleProductoPromedio()`,
  `cambiarProductoPromedio()`, `cargarProductosEnCombobox()`.
- **`ui-sales.js` v2.1.16**: adaptación del cálculo de ingresos a `sales.total`.
- **`sales.js` v2.1.14**: la venta se guarda siempre, aunque falle el stock.

### 🎯 Correcciones GitHub 290926 (#3, #7, #12)

#### ✨ Añadido

- **#3 — Botones flotantes "ir al inicio" / "ir al final"** (`help.js` v3.0.3 + `help-detailed.js` v1.3.0):
  botones flotantes de navegación rápida en las vistas de Ayuda Detallada,
  Guía Rápida y FAQs. Se añadieron `crearBotonesFlotantesAyuda()`,
  `eliminarBotonesFlotantesAyuda()`, `scrollToTopAyuda()` y `scrollToBottomAyuda()`.
- **#7 — Tutorial mejorado** (`help.js` v3.0.2 + v3.0.3):
  el tour ahora siempre comienza en el paso 1, llega hasta el final e incluye
  el módulo Perfil. Se corrigieron los IDs únicos en contenedores con scroll
  y se ajustó el flujo de los 9 pasos.
- **#12 — Toggle admin "Producción HOY/MAÑANA"** (`db.js` v2.7.1 + `ui-settings.js` v2.3.10 + `dashboard.js` v2.2.7):
  nuevo toggle en Herramientas → "📅 Producción en Dashboard" que permite al
  primer administrador elegir si la tarjeta de corriente del Dashboard muestra
  la producción del **día actual** o la del **día siguiente**. La preferencia se
  persiste por negocio en la tabla `config_global_negocio`
  (columna `mostrar_produccion_hoy`). Solo el primer admin (`is_first_admin = 1`)
  puede modificarla. Valores: `0` = producción de MAÑANA (default),
  `1` = producción de HOY.

#### 🐛 Corregido

- **#7 — Tour iniciaba en paso incorrecto**: el estado del tour no se reiniciaba
  correctamente entre ejecuciones. Ahora `startTour()` siempre empieza por el paso 1.

### 📚 Documentación

#### ✏️ Modificado

- **`js/help-detailed.js` v1.3.0**: actualización de contenido para incluir
  las funcionalidades de v2.5.0 (N1–N6, #3, #7, #12, Config. Bancaria).
  - Versión de app actualizada a 2.5.0 (Introducción y Créditos).
  - Nuevo bloque N5 en Dashboard (Promedio diario por producto).
  - Nuevos bloques N3 y N4 en Ventas.
  - Nuevos bloques N1, N2, N2-bis y N1-historial en Premios.
  - Nuevo bloque N5 en Perfil.
  - Nuevos bloques Config. Bancaria, #12 y N6 en Herramientas.
  - Nuevo consejo N5 en Atajos y consejos.
- **`js/faqs.js` v1.1.0**: ampliación con 15 FAQs nuevas sobre N1–N6,
  290926 (#3, #7, #12) y Configuración Bancaria. Total: 219 FAQs en 17 categorías.
- **`CHANGELOG.md` v2.5.0**: reescritura completa con codificación UTF-8 correcta.

---

## [2.4.0] — 2026-10-01

### 🎯 FIX PWA — Pantalla completa + GitHub Pages

#### 🐛 Corregido

- **`manifest.json`**: Eliminado `"browser"` de `display_override`. Era la causa
  principal de que la app instalada se abriera dentro de Chrome con barra de
  direcciones en lugar de pantalla completa.
- **`manifest.json`**: `start_url` simplificado a `"./index.html"` (sin query
  string `?v=`). Chrome rechazaba instalar en modo standalone cuando el
  `start_url` tenía parámetros.
- **`manifest.json`**: Añadido `"id": "./"` explícito para identificación estable
  de la PWA.
- **`manifest.json`**: Shortcuts sin query string de versión.
- **`sw.js`**: Nueva estrategia `handleNavigation()` que reconoce peticiones HTML
  con query strings (`?v=`, `?nav=`, `?refresh=`, `?nocache=`) y las resuelve
  correctamente offline contra el `index.html` cacheado.
- **`sw.js`**: Detecta navegación por `request.mode === 'navigate'` (más fiable
  que solo `pathname.endsWith('.html')`).
- **`offline.html`**: Reemplazado `window.location.reload(true)` (deprecado) por
  `window.location.href = './index.html?nocache=' + Date.now()`.
- **`offline.html`**: `SW_VERSION` actualizado a `2.4.0`.

#### ✨ Añadido

- **`LICENSE`**: Licencia propietaria completa.
- **`.gitignore`**: Exclusión de bases de datos locales, backups, archivos del
  sistema y dependencias.
- **`README.md`**: Documentación completa para GitHub Pages.
- **`CHANGELOG.md`**: Este archivo.

#### ✏️ Modificado

- **`sw.js`**: `CACHE_NAME` actualizado a `panario-v2.4.0` (fuerza invalidación
  de cachés antiguas).
- **`sw.js`**: `SW_VERSION` = `2.4.0`.

#### 🔧 Cambios internos

- **`sw.js`**: Estrategia de navegación diferenciada de estrategia de recursos
  estáticos.
- **`sw.js`**: Fallback en cascada: red → caché exacta → `index.html` cacheado →
  `offline.html` → 503.

---

## [2.3.7] — 2026-09-29

### 🎯 CORRECCIÓN #15 — Sistema de Ayuda con FAQs Externas

#### ✨ Añadido

- **`js/faqs.js`** (v1.0.1): 204 FAQs únicas en 19 categorías.
- **`js/help-detailed.js`**: Sección dinámica "❓ Preguntas Frecuentes".
- **`MANUAL.md`**: Manual completo del usuario (~1.850 líneas).

#### ✏️ Modificado

- **`js/help.js`** (v3.0.0 → v3.0.1): Carga FAQs desde `window.FAQS_DB`.
- **`index.html`** (v2.3.6 → v2.3.7): Carga de `faqs.js` y `help-detailed.js`.
- **`sw.js`** (v2.3.6 → v2.3.7): Nuevos assets en `CRITICAL_ASSETS`.
- **`manifest.json`** (v2.3.6 → v2.3.7): Versión y URLs actualizadas.

#### 🗑️ Eliminado

- **`js/help.js`**: Array `FAQS_DB` local (solo 10 FAQs hardcodeadas).

#### 🐛 Corregido

- **`js/faqs.js`**: Eliminadas 12 FAQs duplicadas.

---

## [2.3.6] — 2026-09-28

### 🎯 SESIÓN 7 — Cuentas Compartidas + Primer Admin

#### ✨ Añadido

- **`db.js` v2.3.8**: Tablas `bank_default_user` y `config_bancaria_negocio`.
- **`db.js`**: Columna `is_first_admin` en `users`, `is_shared` en `bank_accounts`.
- **`ui-settings.js`**: Sección "🔐 Configuración Bancaria" (solo admin).
- **`ui-settings.js`**: Sección "👥 Gestión de Usuarios" con badge "👑 PRIMER ADMIN".

#### 🐛 Corregido

- **`ui-settings.js`**: `closeHorarioDetalleModal` no definida (FIX CRÍTICO).
- **`profile.js`**: Error al guardar cuentas bancarias por `await` innecesario.
- **`profile.js`**: Cuentas con `negocio_id = NULL` (huérfanas).
- **`orders.js` v2.3.2**: Fecha de venta desde pedido ahora es fecha actual.
- **`notifications.js` v2.3.5**: Cleanup al cerrar sesión.

---

## [2.3.5] — 2026-09-26

### 🎯 CORRECCIÓN #17 — Configuraciones Individuales

#### ✨ Añadido

- **`db.js`**: Columnas `sound_enabled`, `sound_id`, `guia_rapida_activa` en `users`.
- **`db.js`**: Funciones `getUserSoundConfig()`, `updateUserSoundConfig()`, etc.

#### 🐛 Corregido

- **`notifications.js`**: Error al cerrar sesión por listeners no limpiados.

---

## [2.3.4] — 2026-09-26

### 🎯 CORRECCIÓN #16 (parte 2)

#### ✏️ Modificado

- **`db.js`**: `ensureUserPreferencesColumns()` se ejecuta al iniciar.
- **`profile.js`**: Toggles reflejan el estado del usuario actual.

---

## [2.3.3] — 2026-09-26

### 🎯 CORRECCIÓN #16 (parte 1) — Permisos Bancarios

#### ✨ Añadido

- **`db.js`**: Tabla `config_bancaria_negocio` con `permitir_ver_qr_otros` y
  `permitir_cambiar_default`.
- **`db.js`**: Tabla `bank_default_user` para cuenta por defecto individual.
- **`db.js`**: Funciones `getBankAccountsParaUsuario()`, `puedeUsuarioEditarCuenta()`.
- **`ui-settings.js`**: Sección "Configuración Bancaria" (solo admin).

---

## [2.3.2] — 2026-09-25

### 🎯 CORRECCIÓN #14 — Ayuda Detallada sin iframe

#### ✨ Añadido

- **`js/help-detailed.js`** v1.0.0: Módulo JS integrado.
- **`js/help.js`**: `abrirAyudaEnModalControlado()`, `imprimirAyudaModal()`.

#### 🗑️ Eliminado

- **`js/help.js`**: iframe de `ayuda-panario.html`.

---

## [2.3.1] — 2026-09-25

### 🎯 CORRECCIÓN #13 — Margen inferior + Iconos

#### ✏️ Modificado

- **`css/style.css`**: Reducido margen inferior.

---

## [2.3.0] — 2026-09-20

### 🎯 FASE 3.3 — Toggles del Dashboard

#### ✨ Añadido

- **`profile.js`**: 13 toggles en "📊 Elementos visibles en el Dashboard".

---

## [2.2.8] — 2026-09-19

### 🎯 FASE 2.2.8 — Producto en producción

#### ✨ Añadido

- **`db.js`**: Columna `producto_id` en `calendario_produccion`.
- **`ui-settings.js`**: Dropdown de productos en el modal de producción.

#### 🐛 Corregido

- **`ui-settings.js`**: Modal de producción no guardaba `producto_id`.

---

## [2.2.7] — 2026-09-18

### 🎯 FASE 2.2.7 — Filtros del Dashboard + Algoritmo del amanecer

#### ✨ Añadido

- **`app.js`**: `window._pendingOrderFilters`.
- **`ui-settings.js`**: Regla del amanecer mejorada (bloques ≤ 9:00 AM).

#### 🐛 Corregido

- **`ui-orders.js`**: `renderOrdersView()` no leía `window._pendingOrderFilters`.
- **`dashboard.js`**: Tarjeta "Pedidos hoy/mañana" no aplicaba filtros.

---

## [2.2.6] — 2026-09-17

### 🎯 FASE 2.2.6 — Badge de producción clickeable

#### ✏️ Modificado

- **`ui-orders.js`**: Badge morado de producción ahora es clickeable.

---

## [2.2.5] — 2026-09-16

### 🎯 FASE 2.2.5 — Conteo unificado de pedidos

#### ✨ Añadido

- **`db.js`**: Función `contarPedidosYVentasFecha()`.
- **`db.js`**: Función `getProduccionRangoFechas()`.

---

## [2.2.4] — 2026-09-15

### 🎯 FASE 2.2.4 — CMPBC + Algoritmo de bloques

#### ✨ Añadido

- **`db.js`**: Columna `capacidad_max_bloque` en `productos`.
- **`db.js`**: Funciones `getCMPBCProducto()`, `getProductosConCMPBC()`.

---

## [2.2.3] — 2026-09-14

### 🎯 FASE 2.2.3 — Barra de título sticky

#### 🐛 Corregido

- **`css/style.css`**: Barra de título se deformaba al minimizar/restaurar.

---

## [2.2.2] — 2026-09-13

### 🎯 FASE 2.2.2 — Fechas unificadas

#### ✏️ Modificado

- **`orders.js`**: Orden de pedidos por `id` ascendente.

---

## [2.2.1] — 2026-09-12

### 🎯 FASE 2.2.1 — Productos por defecto

#### 🐛 Corregido

- **`db.js`**: Insertar 18 productos por defecto en tabla `productos`.

---

## [2.2.0] — 2026-09-11

### 🎯 FASE 2.2.0 — PWA shortcuts

#### ✨ Añadido

- **`manifest.json`**: Shortcut "🔨 Producción".
- **`manifest.json`**: `display_override`, `share_target`, `launch_handler`.

---

## [2.1.11] — 2026-09-10

### 🎯 FASE 2.1.11 — Auto-reparación de caché

#### ✨ Añadido

- **`sw.js`**: Auto-reparación cada 15 min, umbral 80%.
- **`offline.html`**: Auto-retry cada 5s (máx 12 intentos).

---

## [2.1.10] — 2026-09-09

### 🎯 FASE 2.1.10 — Desbloqueo de audio

#### ✨ Añadido

- **`notifications.js`**: Desbloqueo del `AudioContext` con primer gesto.

#### 🐛 Corregido

- **`notifications.js`**: Sonido no funcionaba en iOS Safari.

---

## [2.1.9] — 2026-09-08

### 🎯 FASE 2.1.9 — Orden de ventas

#### ✏️ Modificado

- **`sales.js`**: Orden de ventas por `id` ascendente.
- **`reports.js`**: Reportes ordenados por fecha ASC.

---

## [2.1.8] — 2026-09-07

### 🎯 FASE 2.1.8 — Producción con decimales

#### ✨ Añadido

- **`ui-settings.js`**: Cantidad de producción acepta decimales.

---

## [2.1.7] — 2026-09-06

### 🎯 FASE 2.1.7 — Reprogramación por rango

#### ✨ Añadido

- **`ui-settings.js`**: Modal de Reprogramar Pedidos por Rango.

---

## [2.1.6] — 2026-09-05

### 🎯 FASE 2.1.6 — Ayuda detallada (iframe)

#### ✨ Añadido

- **`js/help.js`**: `abrirAyudaDetallada()` con iframe.

---

## [2.1.5] — 2026-09-04

### 🎯 FASE 2.1.5 — Centro de Ayuda flotante

#### ✨ Añadido

- **`js/help.js`**: Popover del Centro de Ayuda, tour de 8 pasos.

---

## [2.1.0] — 2026-08-28

### 🎯 FASE 2.1.0 — Módulo de Producción

#### ✨ Añadido

- **`ui-settings.js`**: Calendario de producción.

---

## [2.0.0] — 2026-08-15

### 🎯 FASE 2.0.0 — Refactor Multiusuario

#### ⚠️ BREAKING CHANGES

- **`db.js`**: Migración de esquema para multiusuario.
- **`auth.js`**: Nuevo sistema de login con negocio.

#### ✨ Añadido

- **`auth.js`**: Códigos de invitación (8 caracteres).
- **`db.js`**: Roles admin/usuario.

---

## [1.0.0] — 2026-07-01

### 🎉 Versión inicial

#### ✨ Añadido

- Módulos base: Dashboard, Pedidos, Insumos, Recetas, Productos, Ventas, Herramientas.
- Login/registro simple.
- Persistencia local con SQLite (sql.js).
- PWA básica.

---

## 📊 ESTADÍSTICAS DEL PROYECTO

| Métrica | Valor |
|---------|-------|
| **Versión actual** | 2.5.0 |
| **Total de versiones documentadas** | 26+ |
| **Archivos JS** | 23 |
| **Archivos CSS** | 1 |
| **Archivos HTML** | 3 |
| **FAQs** | 219 (17 categorías) |
| **Shortcuts PWA** | 6 |
| **Idiomas soportados** | Español (es) |

---

## 🎯 ROADMAP FUTURO

### v1.0.0 (próxima publicación)

- ✅ Sistema de Ayuda completo con FAQs externas
- ✅ Documentación final (MANUAL, CHANGELOG, LICENSE)
- ✅ FIX PWA: pantalla completa en instalación
- ✅ Correcciones 011026 (N1–N6) + FIX N5
- ✅ Correcciones 290926 (#3, #7, #12)
- ✅ Ayuda Detallada actualizada (290926 #8)
- ✅ FAQs ampliadas (219 preguntas)
- ⏳ Actualización del MANUAL DE USUARIO.pdf a v2.5.0
- ⏳ Publicación en GitHub Pages
- ⏳ Pruebas finales de integración

### v1.1.0 (futuro)

- 📱 Sincronización entre dispositivos (export/import)
- 📊 Gráficos avanzados en Dashboard
- 🌐 Soporte multiidioma
- 📦 Exportación a Excel/CSV

### v2.0.0 (futuro lejano)

- ☁️ Sincronización cloud (opcional)
- 📱 App nativa (React Native / Flutter)
- 🔌 API pública

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

**Última actualización:** 3 de octubre de 2026