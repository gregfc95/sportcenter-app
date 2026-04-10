# SportCenter App

Sistema de gestión para centros deportivos. Permite administrar pagos, turnos, actividades, asistencias, usuarios y notificaciones.

---

## Índice

- [Configuración en Windows (WSL)](#configuración-en-windows-wsl)
- [Stack](#stack)
- [Requisitos previos](#requisitos-previos)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Setup inicial](#setup-inicial)
- [Flujo de desarrollo diario](#flujo-de-desarrollo-diario)
- [Comandos útiles](#comandos-útiles)
- [Convenciones del proyecto](#convenciones-del-proyecto)
- [Problemas frecuentes](#problemas-frecuentes)

---

## Configuración en Windows (WSL)

> Si usás Linux o macOS, saltá esta sección e ir directamente a [Requisitos previos](#requisitos-previos).

El proyecto está pensado para correr en un entorno Unix. En Windows, usamos **WSL 2** (Windows Subsystem for Linux) con Ubuntu, que nos da un entorno Linux real sin máquina virtual completa.

### Requisitos de Windows

- Windows 10 versión **2004 o superior** (Build 19041+) o Windows 11
- Virtualización habilitada en la BIOS (en la mayoría de equipos ya viene activada)

Para verificar tu versión de Windows: `Win + R` → escribí `winver` → Enter.

---

### Paso 1 — Habilitar WSL y instalar Ubuntu

Abrí **PowerShell como Administrador** (`Win + X` → Windows PowerShell (Administrador)) y ejecutá:

```powershell
wsl --install
```

Este comando instala automáticamente:

- WSL 2
- Ubuntu (distribución por defecto)
- El kernel de Linux actualizado

> **En Windows 10** si el comando no funciona, primero ejecutá esto y luego reiniciá:
>
> ```powershell
> dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
> dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
> ```
>
> Después del reinicio, volvé a correr `wsl --install`.

**Reiniciá la computadora** cuando te lo pida.

---

### Paso 2 — Configurar Ubuntu

Al reiniciar, Ubuntu se abre automáticamente y te pide crear un usuario:

```
Enter new UNIX username: tu_nombre        # minúsculas, sin espacios
Enter new UNIX password: ************     # no se ve al escribir, es normal
```

> Anotá bien ese usuario y contraseña, los vas a necesitar para comandos con `sudo`.

Verificá que WSL 2 está activo (desde PowerShell):

```powershell
wsl --list --verbose
# Debe mostrar VERSION 2 al lado de Ubuntu
```

Si muestra VERSION 1:

```powershell
wsl --set-version Ubuntu 2
```

---

### Paso 3 — Actualizar Ubuntu

Dentro de la terminal de Ubuntu:

```bash
sudo apt update && sudo apt upgrade -y
```

---

### Paso 4 — Instalar dependencias en Ubuntu

```bash
# Git
sudo apt install -y git

# Node.js 20 via nvm (recomendado sobre apt)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Verificar
git --version
node --version
npm --version
```

---

### Paso 5 — Instalar Docker Desktop con integración WSL 2

1. Descargá [Docker Desktop para Windows](https://www.docker.com/products/docker-desktop/)
2. Durante la instalación, asegurate de marcar **"Use WSL 2 instead of Hyper-V"**
3. Una vez instalado, abrí Docker Desktop
4. Ir a **Settings → Resources → WSL Integration**
5. Activar la integración con tu distro Ubuntu
6. Clic en **Apply & Restart**

Verificá desde la terminal de Ubuntu:

```bash
docker --version
docker compose version
```

> Si Docker no se encuentra, cerrá y volvé a abrir la terminal de Ubuntu.

---

### Paso 6 — Configurar Git en WSL

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

Generá una SSH key para GitHub:

```bash
ssh-keygen -t ed25519 -C "tu@email.com"
# Presioná Enter en todo (sin passphrase está bien para dev)

# Copiá la clave pública
cat ~/.ssh/id_ed25519.pub
```

Agregá esa clave en GitHub: **Settings → SSH and GPG keys → New SSH key**.

Verificá la conexión:

```bash
ssh -T git@github.com
# Esperado: Hi tu-usuario! You've successfully authenticated...
```

---

### Paso 7 — Clonar el repo dentro de WSL

> **Importante:** Siempre trabajá dentro del filesystem de Linux (`~/`), no en `/mnt/c/`. El rendimiento de Docker con archivos en `/mnt/c/` es significativamente peor.

```bash
cd ~
git clone git@github.com:TU_USUARIO/sportcenter-app.git
cd sportcenter-app
```

A partir de acá, seguí con la sección [Setup inicial](#setup-inicial) normalmente.

---

### Acceder a los archivos desde Windows

Si querés abrir los archivos del proyecto con el Explorador de Windows:

```bash
# Desde la terminal de Ubuntu, dentro del proyecto
explorer.exe .
```

O desde el Explorador de Windows, en la barra de direcciones escribí:

```
\\wsl$\Ubuntu\home\TU_USUARIO\sportcenter-app
```

---

### Terminal recomendada

Instalá **Windows Terminal** desde la [Microsoft Store](https://aka.ms/terminal). Te permite abrir tabs de PowerShell, CMD y Ubuntu en el mismo lugar, con mejor experiencia que la consola default.

---

## Stack

| Capa            | Tecnología              |
| --------------- | ----------------------- |
| Backend         | Python 3.12 + Flask     |
| Base de datos   | PostgreSQL 16           |
| Frontend        | React + Vite            |
| Estilos         | Tailwind CSS v3         |
| Componentes UI  | shadcn/ui (Radix)       |
| Infraestructura | Docker + Docker Compose |

---

## Requisitos previos

Antes de clonar el repo, asegurate de tener instalado:

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose)
- [Node.js 20+](https://nodejs.org/) (para el frontend)
- [Python 3.12+](https://www.python.org/) (opcional, solo si querés correr el backend fuera de Docker)

Verificá las versiones:

```bash
git --version
docker --version
docker compose version
node --version
npm --version
```

---

## Estructura del proyecto

```
sportcenter-app/
├── backend/
│   ├── app/
│   │   ├── __init__.py         # App factory
│   │   ├── config.py           # Configuración por entorno
│   │   ├── routes/             # Blueprints / endpoints
│   │   ├── models/             # Modelos SQLAlchemy
│   │   └── services/           # Lógica de negocio
│   ├── Dockerfile              # Multi-stage (dev / runtime)
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/         # Componentes reutilizables
│   │   ├── pages/              # Vistas por ruta
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── docker-compose.yml          # Producción
├── docker-compose.dev.yml      # Desarrollo
├── .env.example                # Variables de entorno de referencia
└── README.md
```

---

## Setup inicial

### 1 — Clonar el repositorio

```bash
git clone git@github.com:TU_USUARIO/sportcenter-app.git
cd sportcenter-app
```

### 2 — Configurar variables de entorno

```bash
cp .env.example .env
```

Editá el `.env` con tus valores locales. El archivo `.env` **nunca se commitea**.

```env
FLASK_ENV=development
FLASK_SECRET_KEY=

DB_USER=
DB_PASSWORD=
DB_NAME=
DB_HOST=
DB_PORT=
```

> **Importante:** `DB_HOST=db` hace referencia al nombre del servicio en Docker Compose. No lo cambies.

### 3 — Levantar el backend y la base de datos

```bash
docker compose -f docker-compose.dev.yml up --build
```

Esto levanta:

- **Backend Flask** en `http://localhost:5000`
- **PostgreSQL** en `localhost:5432` (accesible desde tu máquina para usar con un cliente como DBeaver o TablePlus)

Verificá que el backend responde:

```bash
curl http://localhost:5000/health
# Esperado: {"status": "ok"}
```

### 4 — Correr migraciones (primera vez)

Con los contenedores corriendo, en otra terminal:

```bash
docker compose -f docker-compose.dev.yml exec backend flask db upgrade
```

> Si es la primera vez que se inicializa la base de datos, la imagen de Postgres crea automáticamente el usuario, la contraseña y la base de datos definidos en el `.env`. No necesitás hacer nada adicional.

### 5 — Levantar el frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend queda disponible en `http://localhost:5173` y se comunica con el backend via proxy en `/api`.

---

## Flujo de desarrollo diario

```bash
# Terminal 1 — Backend + DB
docker compose -f docker-compose.dev.yml up

# Terminal 2 — Frontend
cd frontend && npm run dev
```

---

## Comandos útiles

### Docker

```bash
# Ver logs del backend
docker compose -f docker-compose.dev.yml logs backend -f

# Ver logs de la DB
docker compose -f docker-compose.dev.yml logs db -f

# Bajar los contenedores (conserva los datos)
docker compose -f docker-compose.dev.yml down

# Bajar los contenedores y BORRAR la base de datos
docker compose -f docker-compose.dev.yml down -v
```

### Migraciones (Flask-Migrate)

```bash
# Crear una nueva migración después de modificar modelos
docker compose -f docker-compose.dev.yml exec backend flask db migrate -m "descripcion del cambio"

# Aplicar migraciones pendientes
docker compose -f docker-compose.dev.yml exec backend flask db upgrade

# Revertir la última migración
docker compose -f docker-compose.dev.yml exec backend flask db downgrade
```

### Base de datos (acceso directo)

```bash
# Abrir consola de Postgres
docker compose -f docker-compose.dev.yml exec db psql -U sportcenter -d sportcenter_db
```

---

## Conectar un cliente de base de datos (DBeaver / TablePlus)

| Campo         | Valor                               |
| ------------- | ----------------------------------- |
| Host          | `localhost`                         |
| Puerto        | `5432`                              |
| Usuario       | valor de `DB_USER` en tu `.env`     |
| Contraseña    | valor de `DB_PASSWORD` en tu `.env` |
| Base de datos | valor de `DB_NAME` en tu `.env`     |

---

## Convenciones del proyecto

### Commits (Conventional Commits)

```
feat: nueva funcionalidad
fix: corrección de bug
chore: tareas de configuración o mantenimiento
refactor: cambio de código sin cambio de comportamiento
docs: cambios en documentación
```

### Ramas

```
main        → rama principal, siempre estable
dev         → rama de integración
feat/HU-XX-descripcion-corta → nuevas funcionalidades
fix/HU-XX-descripcion-corta  → correcciones
chore/descripcion-corta → configuración, dependencias
```

---

## Problemas frecuentes

**El backend no conecta con la DB**
Verificá que `DB_HOST=db` en tu `.env`. El backend se conecta al contenedor por nombre de servicio, no por `localhost`.

**Cambié un modelo y la DB no se actualizó**
Corré `flask db migrate` y `flask db upgrade` como se indica en la sección de migraciones.

**El frontend no llega al backend**
Verificá que Docker esté corriendo con `docker compose -f docker-compose.dev.yml ps` y que el backend responda en `http://localhost:5000/health`.

**Puerto 5432 en uso**
Tenés Postgres instalado localmente corriendo en el mismo puerto. Detenelo con `sudo service postgresql stop` (Linux/WSL) o desde Services (Windows).

**Docker no se encuentra en WSL**
Verificá que Docker Desktop esté corriendo en Windows y que la integración WSL esté activada en Settings → Resources → WSL Integration.

**El repo está en `/mnt/c/` y Docker es lento**
Mové el proyecto al filesystem de Linux. Desde Ubuntu: `mv /mnt/c/ruta/sportcenter-app ~/sportcenter-app`. Docker con archivos en `/mnt/c/` tiene un impacto de performance severo.

**`nvm: command not found` al abrir nueva terminal**
Ejecutá `source ~/.bashrc` o cerrá y volvé a abrir la terminal de Ubuntu. El PATH de nvm se carga desde `.bashrc`.
