// Días de la semana, ordenados como los devuelve el backend en `dia_semana`.
// Interno y ordenado Domingo-primero para indexar con `Date.getDay()`.
const DIAS_LARGOS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// Días de la semana ordenados Lunes-primero, como los espera el backend en
// `dia_semana`. Fuente única para selectores, encabezados y agrupaciones.
export const DIAS_SEMANA = [
  { value: "lunes", label: "Lunes", short: "Lun" },
  { value: "martes", label: "Martes", short: "Mar" },
  { value: "miercoles", label: "Miércoles", short: "Mié" },
  { value: "jueves", label: "Jueves", short: "Jue" },
  { value: "viernes", label: "Viernes", short: "Vie" },
  { value: "sabado", label: "Sábado", short: "Sáb" },
  { value: "domingo", label: "Domingo", short: "Dom" },
];

// Mapea `dia_semana` del backend a un índice Lunes-primero (0 = Lunes … 6 =
// Domingo), para casar un turno contra una celda del calendario.
export const DIA_TO_INDEX = Object.fromEntries(
  DIAS_SEMANA.map((d, i) => [d.value, i]),
);

// Etiquetas cortas del encabezado del calendario (Lunes-primero).
export const WEEKDAYS_MIN = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"];

// Nombre de la actividad en minúscula para intercalar en una frase
// ("el turno de lunes a las …"); cae al valor crudo si no se reconoce.
export function diaLabelMinuscula(diaSemana) {
  const dia = DIAS_SEMANA.find((d) => d.value === diaSemana);
  return (dia?.label ?? diaSemana ?? "").toLowerCase();
}

// YYYY-MM-DD local (evita el desfase de zona horaria que introduce
// toISOString()).
export function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Fecha de hoy como YYYY-MM-DD local, para comparar contra fechas del backend
// que ya vienen en ese formato sin desfase horario.
export function todayISO() {
  return toISODate(new Date());
}

// Los turnos serializan `hora` como tiempo ISO ("14:00:00"); mostramos HH:MM.
export function formatHora(hora) {
  return typeof hora === "string" ? hora.slice(0, 5) : hora;
}

// Índice de día Lunes-primero (0 = Lunes … 6 = Domingo).
export function mondayIndex(date) {
  return (date.getDay() + 6) % 7;
}

// Medianoche local del día de `date` (descarta la hora).
export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// "Julio 2026" a partir de una fecha ISO (YYYY-MM-DD).
export function mesLabel(iso) {
  const [y, m] = iso.split("-");
  return `${MESES[Number(m) - 1]} ${y}`;
}

// "Hoy, 20:00" / "Jueves 12/06, 08:00" a partir de una fecha ISO
// (YYYY-MM-DD) y una hora ya formateada (HH:MM).
export function formatReservaFecha(iso, hora) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date - today) / 86_400_000);

  let label;
  if (diffDays === 0) label = "Hoy";
  else {
    const dd = String(d).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    label = `${DIAS_LARGOS[date.getDay()]} ${dd}/${mm}`;
  }

  return `${label}, ${hora}`;
}
