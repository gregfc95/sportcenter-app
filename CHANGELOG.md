# Changelog

Todas las novedades destacables de Sportify se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [0.1.0] - 2026-06-05

Primera versión de la plataforma **Sportify** para el **Centro Deportivo Provincia BA**.
Incluye el flujo principal de reservas, pagos y gestión para los roles de cliente,
empleado y administrador.

### Agregado

**Autenticación y cuentas**
- Autenticación con JWT, login y redirección según el rol del usuario
- Registro de usuarios con validaciones (edad, DNI duplicado)
- Logout y protección de rutas
- Edición de perfil, incluida la fecha de nacimiento
- Flujo de cambio y recuperación de contraseña con envío por email
- Normalización de email a minúsculas y baja lógica (soft delete) de usuarios

**Roles y dashboards**
- Layouts y dashboards diferenciados por rol (administrador / empleado / cliente)
- Grilla de accesos rápidos dinámica y barra lateral
- Tablas de clientes y empleados con formularios de gestión

**Turnos**
- Ciclo completo de turnos: crear, editar, eliminar y visualizar reservas
- Validaciones: solapamiento de horarios entre actividades, bloqueo de horarios ya pasados y máximo de reservas vigentes por cliente
- Páginas "Mis Turnos" y de reserva
- Reemplazo del calendario por una vista de lista de días, más clara

**Actividades**
- Gestión de actividades (alta, baja, modificación) con modelo polimórfico respaldado por base de datos
- Cálculo de precio al vuelo (ya no queda fijo) y recálculo de saldo al editar

**Pagos**
- Integración con MercadoPago
- Registro manual de pagos en efectivo por parte del empleado
- Página "Mis Pagos" y ruteo de pagos
- Manejo del estado "Pendiente" cuando MercadoPago falla

**Landing y experiencia de usuario**
- Landing page con imágenes y soporte para modo oscuro
- Cambio animado entre modo claro y oscuro
- Sistema de notificaciones (toasts)
- Sistema de diseño estandarizado, migrado a Tailwind v4
- Ruteo y layouts adaptados a mobile

### Corregido
- Validación de solapamiento de actividades para el mismo cliente en el mismo horario
- Valor correcto de la reserva al actualizar el precio de la actividad
- Correcciones de renderizado y accesibilidad en modo oscuro (ícono de calendario, colores del switch)
- Bug de visualización de turnos; ajustes de margen en diálogos y diseño de botones

### Cambios internos / Arquitectura
- Backend reestructurado en services / routes / schemas (repositories → services)
- Refactor de la capa de llamadas a la API
- Configuración de migraciones con Alembic; seed movido al backend
- Integración del proveedor de email (Mailtrap)

[0.1.0]: https://github.com/gregfc95/sportcenter-app/releases/tag/v0.1.0
