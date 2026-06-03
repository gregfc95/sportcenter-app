const RESERVAS_BASE = "/api";

export class ApiError extends Error {
  constructor(message, { fieldErrors = {}, status } = {}) {
    super(message);
    this.fieldErrors = fieldErrors;
    this.status = status;
  }
}

function getCurrentUserId() {
  try {
    const stored = localStorage.getItem("user");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.id ?? null;
  } catch {
    return null;
  }
}

function authHeaders(extra = {}) {
  const userId = getCurrentUserId();
  const headers = { ...extra };
  if (userId != null) headers["X-User-ID"] = String(userId);
  return headers;
}

async function parseJsonSafely(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function toApiError(body, status, fallback) {
  if (!body) return new ApiError(fallback, { status });
  if (body.error) return new ApiError(body.error, { status });
  return new ApiError(fallback, { status });
}

export async function createReserva(claseId, tipo = "eventual") {
  const res = await fetch(`${RESERVAS_BASE}/clases/${claseId}/reservas`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ tipo }),
  });
  const body = await parseJsonSafely(res);
  if (!res.ok) throw toApiError(body, res.status, "No se pudo confirmar la reserva.");
  return body;
}

export async function listMisReservas() {
  const res = await fetch(`${RESERVAS_BASE}/reservas/mis-reservas`, {
    headers: authHeaders(),
  });
  const body = await parseJsonSafely(res);
  if (!res.ok) throw toApiError(body, res.status, "No pudimos cargar tus reservas.");
  return body;
}