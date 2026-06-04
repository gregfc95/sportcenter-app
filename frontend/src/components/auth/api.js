import { request } from "@/lib/apiClient";

export { ApiError } from "@/lib/apiClient";

const USERS_BASE = "/api/users";

export function login(credentials) {
  return request(`${USERS_BASE}/login`, {
    method: "POST",
    body: credentials,
    fallback: "Email y/o contraseña inválidos",
  });
}

export function register(payload) {
  return request(`${USERS_BASE}/register`, {
    method: "POST",
    body: payload,
    fallback: "Error al registrarse.",
  });
}

export function updateProfile(payload) {
  return request(`${USERS_BASE}/me`, {
    method: "PUT",
    body: payload,
    fallback: "Error al guardar los cambios.",
  });
}
