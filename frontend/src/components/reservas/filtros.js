// Opciones del filtro por tipo de reserva del listado (Mis Turnos y dashboard).
export const FILTROS_TIPO = [
  { value: "todos", label: "Todos" },
  { value: "mensual", label: "Mensuales" },
  { value: "eventual", label: "Eventuales" },
];

/**
 * Filtra reservas por tipo. `todos` devuelve la lista sin tocar; cualquier otro
 * valor deja las que coinciden con `item.tipo` (`"mensual"` / `"eventual"`).
 *
 * @param {Array} items - reservas o bookings del dashboard (traen `tipo`).
 * @param {string} filtro - valor de `FILTROS_TIPO`.
 * @returns {Array} las reservas que pasan el filtro.
 */
export function filtrarPorTipo(items, filtro) {
  return filtro === "todos" ? items : items.filter((i) => i.tipo === filtro);
}

/**
 * Filtra sesiones por tipo (vista de Turnos Reservados). A diferencia de las
 * reservas, cada sesión agrega varias reservas y trae un array `tipos` que
 * puede mezclar mensual y eventual; coincide si el tipo buscado está presente.
 * `todos` devuelve la lista sin tocar.
 *
 * @param {Array} sesiones - sesiones (traen `tipos`).
 * @param {string} filtro - valor de `FILTROS_TIPO`.
 * @returns {Array} las sesiones que pasan el filtro.
 */
export function filtrarSesionesPorTipo(sesiones, filtro) {
  return filtro === "todos"
    ? sesiones
    : sesiones.filter((s) => s.tipos?.includes(filtro));
}
