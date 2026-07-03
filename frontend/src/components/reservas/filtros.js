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
