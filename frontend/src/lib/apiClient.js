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

export function authHeaders(extra = {}) {
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

/**
 * Perform an authenticated request and return the parsed JSON body.
 *
 * @param {string} url
 * @param {object} [options]
 * @param {string} [options.method="GET"]
 * @param {object} [options.body] - JSON-serializable payload (sets Content-Type).
 * @param {string} [options.fallback] - Error message shown when the server gives none.
 * @returns {Promise<any>} parsed JSON body, or null for a 204 No Content response.
 * @throws {ApiError} when the response is not ok (other than 204).
 */
export async function request(url, { method = "GET", body, fallback = "Ocurrió un error." } = {}) {
  const hasBody = body !== undefined;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: authHeaders(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(hasBody ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError("Error de Conexión");
  }

  if (res.status === 204) return null;

  const parsed = await parseJsonSafely(res);
  if (!res.ok) throw toApiError(parsed, res.status, fallback);
  return parsed;
}
