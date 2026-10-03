# 🍞 Panario

> **Sistema de gestión integral para panadería artesanal**
> Offline-first · Multiusuario · PWA · 100% cliente

[![Versión](https://img.shields.io/badge/versión-2.5.0-f5a623?style=flat-square)](#)
[![Estado](https://img.shields.io/badge/estado-producción-success?style=flat-square)](#)
[![Licencia](https://img.shields.io/badge/licencia-propietaria-red?style=flat-square)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-instalable-blue?style=flat-square)](https://web.dev/progressive-web-apps/)
[![Offline](https://img.shields.io/badge/offline--first-100%25-green?style=flat-square)](#)

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
- **🏆 Premios** — Fidelización de mejores clientes del mes/año con exclusión automática de deudores.
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

### 🎯 Correcciones 011026 y 290926 (v2.5.0)

- **N1 — Exclusión de deudores en premios**: los clientes con deuda pendiente quedan excluidos automáticamente del cálculo de premios (Mejor Cliente mensual/anual y Más Frecuente).
- **N1 — Historial de premios otorgados**: nueva tabla `premios_otorgados` con registro histórico consultable.
- **N2 — Dos categorías de premios + exclusión**: el modal de premios distingue entre premios por victorias y por frecuencia.
- **N2-bis — Interruptor "Premio no requiere entrega"**: registra premios que no implican entrega física (marcados como "Entregado" automáticamente).
- **N3 — Cálculo unificado de ingresos**: el total de ingresos del Dashboard y Ventas ahora se calcula desde `sales.total`, eliminando discrepancias.
- **N4 — Ventas liberadas**: se guardan siempre (incluso si falla el descuento de stock) y se listan correctamente.
- **N5 — Tarjeta "Promedio diario por producto"**: nueva tarjeta del Dashboard con promedio diario, día de mayor venta, total vendido y unidades.
- **N6 — Limpieza de transacciones huérfanas**: herramienta en Herramientas → Diagnóstico que detecta y limpia transacciones de ingreso sin `sale_id` válido.
- **290926 #3 — Botones flotantes en Ayuda**: navegación rápida "ir al inicio" / "ir al final" en Ayuda Detallada, Guía Rápida y FAQs.
- **290926 #7 — Tutorial mejorado**: el tour siempre comienza en el paso 1, llega hasta el final e incluye el módulo Perfil.

### 📱 PWA

- **Instalable** en móvil (Android, iOS).
- **100% offline** tras la primera carga.
- **6 shortcuts** en el icono de la app.
- **Auto-reparación de caché** cada 15 minutos.
- **Actualización automática** cuando hay nueva versión.
- **Pantalla completa** en PWA instalada (FIX v2.4.0).

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
