# Deploy y variables de entorno

Referencia de qué necesita esta app para correr fuera de local (deploy test-live
o producción) y de dónde sale cada dato. El objetivo es no tener que reinvestigar
el código cada vez que surge una pregunta de deploy o de `.env`.

## Arquitectura recomendada (test-live)

La app es un SPA estático (Vite) + un backend Flask de proceso largo con Postgres
y migraciones Alembic. Encaja mejor **híbrido**, no todo en un solo serverless:

- **Frontend → Vercel** (build estático `npm run build` → `dist/`).
- **Backend → host de contenedores** (Render / Railway / Fly) usando el stage
  `runtime` del `backend/Dockerfile`.
- **Postgres → gestionado** (Neon / Supabase / el del propio host). Requieren SSL.
- **MercadoPago → credenciales de TEST** para un instance de prueba.

**CORS no hace falta** si Vercel reescribe `/api/*` al backend (mismo origen desde
el navegador). El frontend llama a rutas relativas `/api/*`, así que un rewrite
en `vercel.json` evita tocar código del frontend y evita agregar `flask-cors`.

## Variables de entorno del backend

Todas se leen con `os.getenv(...)` en `backend/app/config.py` y
`backend/app/services/mercadopago_client.py`. **No hay `load_dotenv()`** en el
código: en local las inyecta Docker Compose vía `env_file: .env`; en un host hay
que cargarlas como variables del proyecto. La clase de config la elige `FLASK_ENV`
(`development` / `production` / `testing`) en `create_app`.

| Variable | Para qué | Notas |
|---|---|---|
| `FLASK_ENV` | Elige la clase de config | `production` en el deploy. Default `development`. |
| `FLASK_SECRET_KEY` | `SECRET_KEY` de Flask | Default `"dev"`; poner un valor random real. |
| `APP_BASE_URL` | Origen del frontend para construir los `back_urls` de MercadoPago | **= la URL pública del frontend (https)**. Default `http://localhost:5173`. |
| `DB_USER` `DB_PASSWORD` `DB_HOST` `DB_PORT` `DB_NAME` | Se arman en `SQLALCHEMY_DATABASE_URI` | Hoy **no existe un `DATABASE_URL` único** ni parámetro de SSL en la URI. En local `DB_HOST=db` (nombre del servicio de compose). |
| `MP_ACCESS_TOKEN` | Token del SDK de MercadoPago | Lanza `RuntimeError` si falta. En test, usar el token de TEST. |
| `MAILTRIP_TOKEN` | Token de Mailtrap | **El nombre lleva el typo `MAILTRIP` a propósito**: así lo lee el código (`config.py`). Opcional. |
| `MAILTRAP_SANDBOX` `MAILTRAP_INBOX_ID` `MAIL_FROM` `MAIL_FROM_NAME` | Config de email | Opcionales para un instance de prueba. |
| `TEST_DATABASE_URL` | Solo tests/CI | No se usa en runtime. |

Nota para Postgres gestionado (Neon/Supabase): exigen SSL y hoy la URI se arma sin
`sslmode`. Para soportarlo hay que tocar `config.py` (p. ej. preferir un
`DATABASE_URL` completo si está seteado, con `?sslmode=require`).

## Frontend

- SPA estático de Vite. Build: `npm run build` → `dist/` (sin override de `outDir`).
- **No usa ninguna `import.meta.env.VITE_*`** ni archivos `.env*`. No hay que
  configurar variables de build.
- Todas las llamadas a la API son a rutas **relativas `/api/*`**
  (`frontend/src/lib/apiClient.js`); en dev funcionan por el proxy de
  `vite.config.js` (`/api` → `localhost:5000`), que es **solo de dev**.
- Auth por header `X-User-ID` desde `localStorage`, no por cookies: no hay
  problemas de cookies cross-domain.
- Router client-side (BrowserRouter). En hosting estático necesita un fallback
  catch-all a `/index.html` para que los deep links y los refresh no den 404.
- Rutas de retorno de pago que deben existir: `/pago/exito`, `/pago/error`,
  `/pago/pendiente`, `/pago/cancelado`.
- **MercadoPago NO está en el frontend** (no hay SDK ni public key). El flujo es
  redirect: el backend devuelve `init_point` y el front hace
  `window.location.href = init_point`.

## MercadoPago

- Vive **solo en el backend**. Único secreto necesario: `MP_ACCESS_TOKEN`.
- Los `back_urls` se construyen desde `APP_BASE_URL` en
  `backend/app/services/pago_service.py` (`_crear_preferencia`). `auto_return="approved"`
  se activa solo si `APP_BASE_URL` empieza con `https://`.
- **No hay webhook / `notification_url`**: la confirmación del pago la hace el
  frontend con llamadas de retorno idempotentes tras el redirect
  (`POST /api/pagos/sena|completar|mensualidad|cancelar`). Es decir, **no hay nada
  que registrar en el panel de MercadoPago** más allá de tener el token.
- Endpoints que crean preferencias (`backend/app/routes/pago_routes.py`):
  `POST /api/pagos/checkout`, `/api/pagos/mensualidad/checkout`,
  `/api/pagos/sena/checkout`, `/api/pagos/saldo/checkout`.

## Cómo corre el backend

- Entry point: `backend/run.py` expone `app = create_app()` (callable WSGI).
- Su bloque `__main__` corre el server de desarrollo de Werkzeug con
  **`debug=True`**. **No usar `python run.py` en una URL pública** (el debugger
  interactivo es RCE). Para un host, usar un WSGI server (gunicorn) y no exponer
  debug. Hoy `gunicorn` **no** está en `requirements.txt` y el `runtime` del
  Dockerfile hace `CMD ["python", "run.py"]`, puerto 5000.
- Health check: `GET /health` → `{"status": "ok"}`. Todo el negocio va bajo `/api/*`.

## Base de datos y migraciones

- Postgres 16 + SQLAlchemy + Flask-Migrate. Migraciones en `backend/migrations/`.
- **No hay auto-migrate al arrancar**: hay que correr `flask db upgrade` a mano
  contra la base destino como parte del deploy. Seed opcional vía los comandos CLI
  de `seed.py`.

## Config de deploy existente

No hay ninguna (`vercel.json`, `render.yaml`, `railway.json`, `fly.toml`,
`Procfile`, `netlify.toml` — ninguno existe). Lo único en CI es
`.github/workflows/backend-tests.yml`, que corre pytest en PRs a `dev` que tocan
`backend/**`; no despliega nada.
