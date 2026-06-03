import { request } from "@/lib/apiClient";

export { ApiError } from "@/lib/apiClient";

/**
 * Crea la reserva del turno elegido y devuelve el link de Checkout Pro.
 *
 * @param {{ turno_id: number, fecha: string, tipo?: string }} payload
 * @returns {Promise<{ reserva_id: number, preference_id: string, init_point: string, sandbox_init_point: string }>}
 */
export function crearCheckout(payload) {
  return request("/api/pagos/checkout", {
    method: "POST",
    body: payload,
    fallback: "No se pudo iniciar el pago.",
  });
}

/**
 * Registra la seña de una reserva (al volver con éxito de Mercado Pago).
 *
 * @param {number} reservaId
 * @returns {Promise<{ id: number, reserva_id: number, monto: number, estado: string }>}
 */
export function confirmarSena(reservaId) {
  return request("/api/pagos/sena", {
    method: "POST",
    body: { reserva_id: reservaId },
    fallback: "No se pudo registrar la seña.",
  });
}

/**
 * Genera el link de Checkout Pro para abonar el saldo restante de una reserva
 * ya señada.
 *
 * @param {number} reservaId
 * @returns {Promise<{ reserva_id: number, preference_id: string, init_point: string, sandbox_init_point: string }>}
 */
export function crearCheckoutSaldo(reservaId) {
  return request("/api/pagos/saldo/checkout", {
    method: "POST",
    body: { reserva_id: reservaId },
    fallback: "No se pudo iniciar el pago del saldo.",
  });
}

/**
 * Registra el pago del saldo (al volver con éxito de Mercado Pago). Idempotente.
 *
 * @param {number} reservaId
 * @returns {Promise<{ id: number, reserva_id: number, monto: number, estado: string }>}
 */
export function completarPago(reservaId) {
  return request("/api/pagos/completar", {
    method: "POST",
    body: { reserva_id: reservaId },
    fallback: "No se pudo registrar el pago.",
  });
}

/**
 * Cancela (soft-delete) una reserva cuyo pago no se concretó (abandono/rechazo
 * en Mercado Pago). Idempotente; no cancela si ya tiene un pago registrado.
 *
 * @param {number} reservaId
 */
export function cancelarCheckout(reservaId) {
  return request("/api/pagos/cancelar", {
    method: "POST",
    body: { reserva_id: reservaId },
    fallback: "No se pudo cancelar la reserva.",
  });
}

/**
 * Cancela (soft-delete) una reserva del usuario actual. No interactúa con
 * Mercado Pago: solo da de baja la reserva.
 *
 * @param {number} reservaId
 */
export function cancelarReserva(reservaId) {
  return request(`/api/reservas/${reservaId}/cancelar`, {
    method: "POST",
    fallback: "No se pudo cancelar la reserva.",
  });
}

/**
 * Lista las reservas del usuario actual con su turno, cupo y estado de pago.
 *
 * @returns {Promise<Array<{ id: number, fecha: string, tipo: string, estado: string, actividad: string, precio: number, sena: number, turno: { id: number, dia_semana: string, hora: string, cupo: number, ocupados: number } }>>}
 */
export function listMisReservas() {
  return request("/api/reservas", {
    fallback: "No pudimos cargar tus turnos.",
  });
}

/**
 * Historial de pagos del usuario actual (registro transaccional inmutable).
 *
 * @returns {Promise<Array<{ id: number, fecha_pago: string, monto: number, estado: string, reserva_id: number, actividad: string|null, turno: { fecha: string, hora: string, dia_semana: string }|null }>>}
 */
export function listMisPagos() {
  return request("/api/pagos", {
    fallback: "No pudimos cargar tu historial de pagos.",
  });
}
