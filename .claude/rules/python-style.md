---
paths:
  - "backend/**/*.py"
---

# Estilo Python (backend Flask)

Convenciones del backend en `backend/app/`. Comentarios y docstrings en
español (ver `code-comments.md`).

## Arquitectura en capas

- `routes/` — blueprints delgados: parsean la request, delegan al servicio,
  serializan la respuesta. Sin reglas de negocio.
- `services/` — todas las reglas de negocio (validaciones, ventanas de
  cancelación, pagos). Se instancian una vez por módulo de rutas.
- `models/` — modelos SQLAlchemy; exponen `to_dict()` y `__repr__`.
- `schemas/` — Marshmallow para serialización/validación de entrada.
- Los servicios señalan errores de negocio lanzando `ValueError` con un
  mensaje en español apto para mostrar al usuario
  (ej. `raise ValueError("El turno indicado no existe.")`).

## Convenciones de código

- Type hints en las firmas, con sintaxis moderna: `list[date]`, `X | None`.
- `snake_case` para funciones y variables, `PascalCase` para clases.
- Enums de dominio basados en str: `class ReservaTipo(str, Enum)`.
- Constantes de negocio a nivel de módulo, con un comentario que explique la
  regla (ver `CANCELACION_VENTANA_MENSUAL` en `services/reserva_service.py`).
- Nombres de dominio en español: reserva, turno, seña/sena, abono, cupo.

## Reglas de dominio a respetar

- La `hora` de un turno es **hora de pared de Argentina** (así se agenda y se
  muestra), no UTC. Para medir anticipación real, interpretarla con `AR_TZ`
  (`America/Argentina/Buenos_Aires`), como hace `reserva_service.py`.
- Las reservas mensuales son todo-o-nada y se agrupan por `grupo_id`.

## Base de datos

- Patrón transaccional en servicios: validar → construir → `db.session.add` →
  `db.session.commit`.
- Todo cambio de esquema pasa por Flask-Migrate:
  `flask db migrate -m "..."` + `flask db upgrade` (dentro del contenedor).
  Nunca editar tablas ni migraciones aplicadas a mano.

## Tests

- pytest en `backend/tests/`, espejando las capas (`tests/services/`,
  `tests/routes/`, `tests/unit/`); fixtures en `conftest.py`.
- Usar `freezegun` para lógica dependiente del tiempo (ventanas de
  cancelación, turnos pasados).
- Correr con `pytest` desde `backend/` (o `docker compose -f
  docker-compose.dev.yml exec backend pytest`). CI los corre en cada PR a
  `dev` que toque `backend/**`.
