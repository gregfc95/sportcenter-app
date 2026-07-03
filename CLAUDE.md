# Sportify (sportcenter-app)

Sistema de gestión y reservas para centros deportivos: turnos, reservas (eventuales y mensuales), pagos con Mercado Pago, asistencias por QR, clientes y empleados. "Sportify" es la app; "Centro Deportivo Provincia BA" es el centro que se promociona en la landing.

## Stack

- **Backend** (`backend/`): Python 3.12, Flask 3, SQLAlchemy + Flask-Migrate (Alembic), Postgres 16, Marshmallow, Mercado Pago, pytest.
- **Frontend** (`frontend/`): React 19 + Vite, **JavaScript plano (JSX, sin TypeScript)**, Tailwind CSS v4, shadcn/ui (Radix), lucide-react, sonner.

## Comandos

```bash
# Backend + DB (desde la raíz)
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml logs backend -f

# Frontend (desde frontend/)
npm run dev      # dev server con proxy /api → localhost:5000
npm run lint     # ESLint (único linter del proyecto)
npm run build

# Migraciones (nunca editar tablas a mano)
docker compose -f docker-compose.dev.yml exec backend flask db migrate -m "descripcion"
docker compose -f docker-compose.dev.yml exec backend flask db upgrade

# Tests del backend (no hay tests de frontend)
docker compose -f docker-compose.dev.yml exec backend pytest
```

## Arquitectura

- **Backend en capas** bajo `backend/app/`: `routes/` (blueprints delgados) → `services/` (reglas de negocio) → `models/`; `schemas/` (Marshmallow) para serialización; `utils/`; migraciones en `backend/migrations/versions/`.
- **Frontend** bajo `frontend/src/`: `pages/` (una por ruta), `components/<feature>/` (actividades, reservas, clientes, empleados...), `components/ui/` (primitivas shadcn), `lib/` (`apiClient.js`, `fecha.js`, `validators.js`, `utils.js`). Alias `@` → `src`.
- Cada feature del frontend habla con la API vía su `api.js`, que envuelve `request()` de `lib/apiClient.js`.

## Convenciones

- **Comentarios, docstrings, JSDoc y strings de UI en español.** Vocabulario de dominio en español: reserva, turno, seña, abono, cupo, actividad.
- Locale `es-AR` para fechas y moneda (ARS).
- Commits con Conventional Commits; ramas `feat/HU-XX-descripcion-corta`. `main` es estable, **`dev` es la rama de integración** (los PRs van contra `dev`).
- Reglas de estilo detalladas en `.claude/rules/` (comentarios, Python, JavaScript, anti-slop).
- Setup completo y problemas frecuentes: ver `README.md`.
- Deploy y variables de entorno (qué necesita la app fuera de local, MercadoPago, DB): ver `.claude/deployment.md`.
