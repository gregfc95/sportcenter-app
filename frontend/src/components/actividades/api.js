import { request } from "@/lib/apiClient";

export { ApiError } from "@/lib/apiClient";

const BASE = "/api/actividades";

export function listActividades() {
  return request(BASE, { fallback: "No pudimos cargar las actividades." });
}

export function getActividad(id) {
  return request(`${BASE}/${id}`, { fallback: "No pudimos cargar la actividad." });
}

export function createActividad(payload) {
  return request(BASE, { method: "POST", body: payload, fallback: "No se pudo crear la actividad." });
}

export function updateActividad(id, payload) {
  return request(`${BASE}/${id}`, { method: "PUT", body: payload, fallback: "No se pudo actualizar la actividad." });
}

export function deleteActividad(id) {
  return request(`${BASE}/${id}`, { method: "DELETE", fallback: "No se pudo eliminar la actividad." });
}

export function listTurnosByActividad(actividadId, fecha) {
  const query = fecha ? `?fecha=${encodeURIComponent(fecha)}` : "";
  return request(`${BASE}/${actividadId}/turnos${query}`, { fallback: "No pudimos cargar los turnos." });
}

export function createTurno(actividadId, payload) {
  return request(`${BASE}/${actividadId}/turnos`, { method: "POST", body: payload, fallback: "No se pudo crear el turno." });
}

export function updateTurno(turnoId, payload) {
  return request(`/api/turnos/${turnoId}`, { method: "PUT", body: payload, fallback: "No se pudo actualizar el turno." });
}

export function deleteTurno(turnoId, fecha) {
  const query = fecha ? `?fecha=${encodeURIComponent(fecha)}` : "";
  return request(`/api/turnos/${turnoId}${query}`, { method: "DELETE", fallback: "No se pudo eliminar el turno." });
}
