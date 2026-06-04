import { request } from "@/lib/apiClient";

export { ApiError } from "@/lib/apiClient";

const USERS_BASE = "/api/users";

export function listEmpleados() {
  return request(`${USERS_BASE}?role=employee`, { fallback: "No pudimos cargar los empleados." });
}

export function createEmpleado(payload) {
  return request(USERS_BASE, {
    method: "POST",
    body: { ...payload, role: "employee" },
    fallback: "No se pudo crear el empleado.",
  });
}
