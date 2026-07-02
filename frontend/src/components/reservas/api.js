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
 * Genera el link de Checkout Pro para señar una reserva pendiente ya existente
 * (reanuda el pago cuando no volvió la respuesta de Mercado Pago).
 *
 * @param {number} reservaId
 * @returns {Promise<{ reserva_id: number, preference_id: string, init_point: string, sandbox_init_point: string }>}
 */
export function crearCheckoutSena(reservaId) {
  return request("/api/pagos/sena/checkout", {
    method: "POST",
    body: { reserva_id: reservaId },
    fallback: "No se pudo iniciar el pago.",
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
 * Genera el link de Checkout Pro para pagar un abono mensual pendiente desde
 * Mis Turnos. Sirve cualquier reserva del grupo; el monto cubre todas las
 * clases del mes.
 *
 * @param {number} reservaId
 * @returns {Promise<{ reserva_id: number, fechas: string[], clases: number, monto: number, preference_id: string, init_point: string, sandbox_init_point: string }>}
 */
export function crearCheckoutMensualidad(reservaId) {
  return request("/api/pagos/mensualidad/checkout", {
    method: "POST",
    body: { reserva_id: reservaId },
    fallback: "No se pudo iniciar el pago de la mensualidad.",
  });
}

/**
 * Registra el pago completo del abono mensual (al volver con éxito de Mercado
 * Pago). Idempotente.
 *
 * @param {number} reservaId
 * @returns {Promise<{ reserva_id: number, monto_total: number, pagos: Array<object> }>}
 */
export function confirmarMensualidad(reservaId) {
  return request("/api/pagos/mensualidad", {
    method: "POST",
    body: { reserva_id: reservaId },
    fallback: "No se pudo registrar la mensualidad.",
  });
}

/**
 * Cancela (soft-delete) una reserva cuyo pago no se concretó (abandono/rechazo
 * en Mercado Pago). Idempotente; no cancela si ya tiene un pago registrado.
 * Si la reserva es de un abono mensual, cancela el grupo completo.
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
 * Para una clase de un abono mensual cancelada con más de 48 h se puede elegir
 * `resolucion: "credito"` (crédito a favor) en lugar del reembolso.
 *
 * @param {number} reservaId
 * @param {{ resolucion?: "reembolso" | "credito" }} [opciones]
 * @returns {Promise<{ ok: boolean, reembolsado: boolean, resolucion: string, monto: number|null }>}
 */
export function cancelarReserva(reservaId, opciones = {}) {
  return request(`/api/reservas/${reservaId}/cancelar`, {
    method: "POST",
    ...(opciones.resolucion ? { body: { resolucion: opciones.resolucion } } : {}),
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

/**
 * Historial de pagos de todos los usuarios (vista de administración). Cada fila
 * incluye el cliente al que pertenece la transacción.
 *
 * @returns {Promise<Array<{ id: number, fecha_pago: string, monto: number, estado: string, reserva_id: number, cliente: { id: number, nombre: string, email: string }|null, actividad: string|null, turno: { fecha: string, hora: string, dia_semana: string }|null }>>}
 */
export function listAllPagos() {
  return request("/api/pagos/admin", {
    fallback: "No pudimos cargar el historial de pagos.",
  });
}

/**
 * Registra manualmente (en efectivo) el saldo restante de una reserva. Lo ejecuta
 * un empleado/admin desde la vista de Turnos Reservados; queda asentado quién lo
 * registró. Sólo admin/empleado.
 *
 * @param {number} reservaId
 * @returns {Promise<{ id: number, reserva_id: number, monto: number, estado: string, metodo: string, registrado_por_id: number }>}
 */
export function registrarPagoManual(reservaId) {
  return request("/api/pagos/registrar", {
    method: "POST",
    body: { reserva_id: reservaId },
    fallback: "No se pudo registrar el pago.",
  });
}

/**
 * Sesiones con reservas (turno + fecha) para la vista de Turnos Reservados.
 * Sólo admin/empleado.
 *
 * @returns {Promise<Array<{ turno_id: number, fecha: string, actividad: string, dia_semana: string, hora: string, cupo: number, ocupados: number, reservas: number }>>}
 */
export function listSesionesReservadas() {
  return request("/api/reservas/sesiones", {
    fallback: "No pudimos cargar los turnos reservados.",
  });
}

/**
 * Detalle de una sesión: el turno y la lista de reservas con su cliente y estado
 * de pago. Sólo admin/empleado.
 *
 * @param {number|string} turnoId
 * @param {string} fecha - YYYY-MM-DD
 * @returns {Promise<{ turno: { id: number, actividad: string, dia_semana: string, hora: string, fecha: string, cupo: number, ocupados: number, precio: number }, reservas: Array<{ id: number, tipo: string, estado: string, monto_pagado: number, cliente: { id: number, nombre: string, apellido: string, email: string }|null }> }>}
 */
export function getSesionReservada(turnoId, fecha) {
  return request(`/api/reservas/sesiones/${turnoId}/${fecha}`, {
    fallback: "No pudimos cargar la sesión.",
  });
}
