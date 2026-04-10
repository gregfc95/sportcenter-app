# backend/Dockerfile
# ─── Stage 1: Builder ───────────────────────────────────────
FROM python:3.12-alpine AS builder

WORKDIR /app

RUN apk add --no-cache gcc musl-dev libffi-dev postgresql-dev

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt


# ─── Stage 2: Runtime ───────────────────────────────────────
FROM python:3.12-alpine AS dev

WORKDIR /app

# Librerías de runtime que necesita psycopg2
RUN apk add --no-cache gcc musl-dev libffi-dev postgresql-dev

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ─── Stage 3: Runtime (prod) ────────────────────────────────
FROM python:3.12-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache libpq

COPY --from=builder /install /usr/local
COPY app/ ./app/
COPY run.py .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 5000

CMD ["python", "run.py"]