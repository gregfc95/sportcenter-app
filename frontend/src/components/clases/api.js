const CLASES_BASE = "/api";

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

export async function obtenerOCrearClase(turnoId, fecha) {
  const res = await fetch(`${CLASES_BASE}/turnos/${turnoId}/clases`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ fecha: fecha instanceof Date ? fecha.toISOString().split("T")[0] : fecha }),
  });
  const body = await parseJsonSafely(res);
  if (!res.ok) throw toApiError(body, res.status, "No se pudo obtener la clase.");
  return body;
}