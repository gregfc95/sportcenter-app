const USERS_BASE = "/api/users";

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
  if (typeof body === "object") {
    const fieldErrors = normalizeFieldErrors(body);
    if (Object.keys(fieldErrors).length) {
      const first = Object.values(fieldErrors)[0];
      return new ApiError(first ?? fallback, { fieldErrors, status });
    }
  }
  return new ApiError(fallback, { status });
}

export async function listEmpleados() {
  const res = await fetch(`${USERS_BASE}?role=employee`, { headers: authHeaders() });
  const body = await parseJsonSafely(res);
  if (!res.ok) throw toApiError(body, res.status, "No pudimos cargar los empleados.");
  return body;
}

export async function createEmpleado(payload) {
  const res = await fetch(USERS_BASE, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ ...payload, role: "employee" }),
  });
  const body = await parseJsonSafely(res);
  if (!res.ok) throw toApiError(body, res.status, "No se pudo crear el empleado.");
  return body;
}
