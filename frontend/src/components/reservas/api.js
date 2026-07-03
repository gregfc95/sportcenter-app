import { request } from "@/lib/apiClient";

export { ApiError } from "@/lib/apiClient";

/**
 * Crea la reserva del turno elegido y devuelve el link de Checkout Pro.
 *
 * Si el crédito a favor de la actividad cubre el total, la respuesta trae
 * `pagado_con_credito: true` (sin `init_point`) y el pago ya quedó registrado;
 * si lo cubre en parte, `monto_a_pagar` es el remanente que cobra Mercado Pago.
 *
 * @param {{ turno_id: number, fecha: string, tipo?: string }} payload
 * @returns {Promise<{ reserva_id: number, pagado_con_credito: boolean, monto_credito: number, monto_a_pagar: number, preference_id?: string, init_point?: string, sandbox_init_point?: string, pagos?: Array<object> }>}
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
 * Si el crédito a favor cubre la seña, la respuesta trae `pagado_con_credito:
 * true` (sin `init_point`) y la seña ya quedó registrada.
 *
 * @param {number} reservaId
 * @returns {Promise<{ reserva_id: number, pagado_con_credito: boolean, monto_credito: number, monto_a_pagar: number, preference_id?: string, init_point?: string, sandbox_init_point?: string, pagos?: Array<object> }>}
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
 * Si el crédito a favor cubre el saldo, la respuesta trae `pagado_con_credito:
 * true` (sin `init_point`) y el saldo ya quedó registrado.
 *
 * @param {number} reservaId
 * @returns {Promise<{ reserva_id: number, pagado_con_credito: boolean, monto_credito: number, monto_a_pagar: number, preference_id?: string, init_point?: string, sandbox_init_point?: string, pagos?: Array<object> }>}
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
 * Si el crédito a favor cubre el total del abono, la respuesta trae
 * `pagado_con_credito: true` (sin `init_point`) y el abono ya quedó pagado.
 *
 * @param {number} reservaId
 * @returns {Promise<{ reserva_id: number, fechas: string[], clases: number, monto: number, pagado_con_credito: boolean, monto_credito: number, monto_a_pagar: number, preference_id?: string, init_point?: string, sandbox_init_point?: string, pagos?: Array<object> }>}
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
 * Anota al usuario en la lista de espera de un turno lleno. No cobra nada: la
 * reserva queda en espera hasta que se libere un lugar y llegue el aviso por
 * email para pagarla desde Mis Turnos. Para un abono mensual anota el mes
 * completo si al menos una de sus fechas está llena.
 *
 * @param {{ turno_id: number, fecha: string, tipo?: string }} payload
 * @returns {Promise<{ reserva_id: number, tipo: string, estado: string, fechas: string[] }>}
 */
export function unirseListaEspera(payload) {
  return request("/api/reservas/lista-espera", {
    method: "POST",
    body: payload,
    fallback: "No pudimos anotarte en la lista de espera.",
  });
}

/**
 * Cancela (soft-delete) una reserva cuyo pago no se concretó (abandono/rechazo
 * en Mercado Pago). Idempotente; no cancela si ya tiene un pago registrado.
 * Si la reserva es de un abono mensual, cancela el grupo completo. También es
 * la baja de una entrada de la lista de espera (sale de la cola).
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
 * Estado de suscripción mensual del cliente actual: si está suspendido, las
 * penalizaciones del mes en curso (con su tope) y si le corresponde el
 * descuento de fidelidad. Para el widget de estado de cuenta.
 *
 * @returns {Promise<{ suspendido: boolean, penalizaciones_mes: number, penalizaciones_max: number, tiene_descuento: boolean, descuento_pct: number }>}
 */
export function getEstadoMensual() {
  return request("/api/mensualidad/estado", {
    fallback: "No pudimos cargar el estado de tu cuenta.",
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
 * `monto_credito` es la parte del pago cubierta con crédito a favor; en los
 * asientos de cierre con estado "credito", `credito` trae el saldo y vigencia
 * del crédito que originó esa cancelación (para marcarlo vencido si corresponde).
 *
 * @returns {Promise<Array<{ id: number, fecha_pago: string, monto: number, estado: string, metodo: string, monto_credito: number, credito: { saldo: number, expira_at: string, vencido: boolean }|null, reserva_id: number, actividad: string|null, turno: { fecha: string, hora: string, dia_semana: string }|null }>>}
 */
export function listMisPagos() {
  return request("/api/pagos", {
    fallback: "No pudimos cargar tu historial de pagos.",
  });
}

/**
 * Créditos a favor vigentes del usuario actual (para el dashboard).
 *
 * @returns {Promise<Array<{ id: number, actividad: { id: number, nombre: string }, monto_inicial: number, saldo: number, expira_at: string, created_at: string }>>}
 */
export function listMisCreditos() {
  return request("/api/creditos", {
    fallback: "No pudimos cargar tus créditos a favor.",
  });
}

/**
 * Saldo de crédito a favor canjeable para una actividad, para la vista previa
 * del checkout. Se pasa `actividadId` (nueva reserva) o `reservaId` (diálogos de
 * pago pendiente, que solo conocen la reserva).
 *
 * @param {{ actividadId?: number, reservaId?: number }} params
 * @returns {Promise<{ actividad_id: number, saldo_disponible: number }>}
 */
export function getCreditoAplicable({ actividadId, reservaId } = {}) {
  const query =
    reservaId != null ? `reserva_id=${reservaId}` : `actividad_id=${actividadId}`;
  return request(`/api/creditos/aplicables?${query}`, {
    fallback: "No pudimos calcular tu crédito a favor.",
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
 * @returns {Promise<Array<{ turno_id: number, fecha: string, actividad: string, dia_semana: string, hora: string, cupo: number, ocupados: number, reservas: number, asistencias: number }>>}
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

/**
 * QR de asistencia de una reserva del usuario (imagen como data-URL). Sólo
 * disponible el día del turno; el mensaje de error del backend es el texto
 * exacto del toast a mostrar.
 *
 * @param {number} reservaId
 * @returns {Promise<{ reserva_id: number, qr: string, actividad: string, fecha: string, hora: string }>}
 */
export function getReservaQr(reservaId) {
  return request(`/api/asistencias/reservas/${reservaId}/qr`, {
    fallback: "No se pudo generar el código QR.",
  });
}

/**
 * Registra la asistencia a partir del código escaneado. Sólo admin/empleado.
 * Errores: 404 QR ajeno al sistema, 409 ya registrado; el mensaje es el toast.
 *
 * @param {string} codigo - texto crudo leído del QR
 * @returns {Promise<{ ok: boolean, reserva_id: number, cliente: { nombre: string, apellido: string, email: string }|null, actividad: string, hora: string }>}
 */
export function registrarAsistencia(codigo) {
  return request("/api/asistencias/escanear", {
    method: "POST",
    body: { codigo },
    fallback: "No se pudo registrar la asistencia.",
  });
}

/**
 * Historial de reservas resueltas del usuario para Mi Historial: turnos pasados
 * y cancelados (sin pendientes/futuras) con su estado.
 *
 * @returns {Promise<Array<{ reserva_id: number, actividad: string, fecha: string, dia_semana: string, hora: string, tipo: string, estado: "cancelado"|"asistio"|"ausente" }>>}
 */
export function listMiHistorial() {
  return request("/api/asistencias/historial", {
    fallback: "No pudimos cargar tu historial.",
  });
}
