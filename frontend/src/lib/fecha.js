const DIAS_LARGOS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const MESES = [
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
