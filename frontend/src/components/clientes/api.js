import { request } from "@/lib/apiClient";

export { ApiError } from "@/lib/apiClient";

const USERS_BASE = "/api/users";

export function listClientes() {
  return request(`${USERS_BASE}?role=client`, { fallback: "No pudimos cargar los clientes." });
}

export function createCliente(payload) {
  return request(`${USERS_BASE}/register`, {
    method: "POST",
    body: payload,
    fallback: "No se pudo crear el cliente.",
  });
}
