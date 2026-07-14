import { request } from "@/lib/apiClient";

export { ApiError } from "@/lib/apiClient";

// Disparo manual (demo) del aviso "se liberó un lugar" que el sistema manda
// solo al promover la lista de espera.
export function notificarCupoDisponible({ clienteId, turnoId }) {
  return request("/api/notificaciones/cupo-disponible", {
    method: "POST",
    body: { cliente_id: clienteId, turno_id: turnoId },
    fallback: "No se pudo enviar el aviso.",
  });
}

// Disparo manual (demo) del aviso "lista de espera llena" que el sistema manda
// solo a los admins cuando la cola de una clase llega al tope.
export function notificarListaEsperaLlena({ turnoId }) {
  return request("/api/notificaciones/lista-espera-llena", {
    method: "POST",
    body: { turno_id: turnoId },
    fallback: "No se pudo enviar el aviso a los administradores.",
  });
}

// Disparo manual (demo) del recordatorio de renovaciones impagas que el
// sistema manda solo el día 10.
export function recordarRenovacionesImpagas() {
  return request("/api/notificaciones/recordatorio-renovaciones", {
    method: "POST",
    fallback: "No se pudieron enviar los recordatorios.",
  });
}

// Reset manual (demo) del contador de penalizaciones del mes, como el rollover
// automático del 1°.
export function resetearPenalizaciones() {
  return request("/api/notificaciones/reset-penalizaciones", {
    method: "POST",
    fallback: "No se pudo resetear el contador de penalizaciones.",
  });
}
