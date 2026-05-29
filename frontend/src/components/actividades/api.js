const BASE = "/api/actividades";

export class ApiError extends Error {
  constructor(message, { fieldErrors = {}, status } = {}) {
    super(message);
    this.fieldErrors = fieldErrors;
    this.status = status;
  }
}

async function parseJsonSafely(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function normalizeFieldErrors(rawErrors) {
  if (!rawErrors || typeof rawErrors !== "object") return {};
  const out = {};
  for (const [field, value] of Object.entries(rawErrors)) {
    if (Array.isArray(value)) {
      out[field] = value[0];
    } else if (typeof value === "string") {
      out[field] = value;
    }
  }
  return out;
}

function toApiError(body, status, fallback) {
  if (!body) return new ApiError(fallback, { status });
  if (body.errors) {
    const fieldErrors = normalizeFieldErrors(body.errors);
    const first = Object.values(fieldErrors)[0];
    return new ApiError(first ?? fallback, { fieldErrors, status });
  }
  if (body.error) return new ApiError(body.error, { status });
  return new ApiError(fallback, { status });
}

export async function listActividades() {
  const res = await fetch(BASE);
  if (!res.ok) throw new ApiError("No pudimos cargar las actividades.", { status: res.status });
  return res.json();
}

export async function getActividad(id) {
  const res = await fetch(`${BASE}/${id}`);
  const body = await parseJsonSafely(res);
  if (!res.ok) throw toApiError(body, res.status, "No pudimos cargar la actividad.");
  return body;
}

export async function createActividad(payload) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await parseJsonSafely(res);
  if (!res.ok) throw toApiError(body, res.status, "No se pudo crear la actividad.");
  return body;
}

export async function updateActividad(id, payload) {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await parseJsonSafely(res);
  if (!res.ok) throw toApiError(body, res.status, "No se pudo actualizar la actividad.");
  return body;
}

export async function deleteActividad(id) {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const body = await parseJsonSafely(res);
    throw toApiError(body, res.status, "No se pudo eliminar la actividad.");
  }
}
