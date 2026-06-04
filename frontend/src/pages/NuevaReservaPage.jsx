import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ArrowRight,
  Handshake,
} from "lucide-react";

import { toast } from "sonner";

import { usePageTitle } from "@/lib/usePageTitle";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import {
  listActividades,
  listTurnosByActividad,
} from "@/components/actividades/api";
import { crearCheckout } from "@/components/reservas/api";
import { cn, formatPrice } from "@/lib/utils";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const WEEKDAYS = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"];

// Maps the backend's `dia_semana` value to a Monday-first weekday index, so a
// turno can be matched against a calendar cell's day of week.
const DIA_TO_INDEX = {
  lunes: 0,
  martes: 1,
  miercoles: 2,
  jueves: 3,
  viernes: 4,
  sabado: 5,
  domingo: 6,
};

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Turnos serialize `hora` as ISO time ("14:00:00"); show just HH:MM.
function formatHora(hora) {
  return typeof hora === "string" ? hora.slice(0, 5) : hora;
}

// Local YYYY-MM-DD (avoids the UTC shift that toISOString() introduces).
function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Monday-first weekday index (0 = Monday ... 6 = Sunday).
function mondayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function buildMonthCells(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const lead = mondayIndex(firstOfMonth);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  return cells;
}

export default function NuevaReservaPage() {
  usePageTitle("Nueva Reserva");
  const [searchParams] = useSearchParams();
  const actividadParam = searchParams.get("actividad");

  const today = useMemo(() => startOfDay(new Date()), []);

  const [actividades, setActividades] = useState([]);
  const [actividadId, setActividadId] = useState(actividadParam ?? "");
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  // No pre-seleccionamos fecha: el usuario debe elegir un día explícitamente.
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  // All turnos for the selected activity — drives the calendar's per-day cues.
  const [turnos, setTurnos] = useState([]);
  // Turnos for the selected date, carrying real-time `disponibles` (cupo).
  const [dayTurnos, setDayTurnos] = useState([]);
  // Identifies which (actividad, fecha) the loaded `dayTurnos` belong to. The
  // loading state is derived by comparing it against the current selection,
  // so it's already correct on the render where the selection changes — no
  // flash of "no turnos" before the fetch effect gets a chance to run.
  const [loadedDayTurnosKey, setLoadedDayTurnosKey] = useState(null);

  useEffect(() => {
    let active = true;
    listActividades()
      .then((data) => { if (active) setActividades(data); })
      .catch(() => { if (active) setActividades([]); });
    return () => { active = false; };
  }, []);

  // Load every turno of the selected activity to know which weekdays it runs on.
  useEffect(() => {
    let active = true;
    const load = actividadId
      ? listTurnosByActividad(actividadId)
      : Promise.resolve([]);
    load
      .then((data) => {
        if (active) setTurnos(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setTurnos([]);
      });
    return () => {
      active = false;
    };
  }, [actividadId]);

  // Load the selected day's turnos with their availability (`disponibles`).
  useEffect(() => {
    let active = true;
    const key =
      actividadId && selectedDate
        ? `${actividadId}:${toISODate(selectedDate)}`
        : null;
    const load = key
      ? listTurnosByActividad(actividadId, toISODate(selectedDate))
      : Promise.resolve([]);
    load
      .then((data) => {
        if (active) setDayTurnos(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setDayTurnos([]);
      })
      .finally(() => {
        if (active) setLoadedDayTurnosKey(key);
      });
    return () => {
      active = false;
    };
  }, [actividadId, selectedDate]);

  const selectedActividad = useMemo(
    () => actividades.find((a) => String(a.id) === String(actividadId)) ?? null,
    [actividades, actividadId],
  );

  // Monday-first weekday indices the activity has at least one turno on.
  const availableWeekdays = useMemo(() => {
    const set = new Set();
    for (const turno of turnos) {
      const index = DIA_TO_INDEX[turno.dia_semana];
      if (index !== undefined) set.add(index);
    }
    return set;
  }, [turnos]);

  // Turnos that fall on the selected date's weekday, sorted by time.
  const slotsForDay = useMemo(() => {
    if (!selectedDate) return [];
    const weekday = mondayIndex(selectedDate);
    return dayTurnos
      .filter((turno) => DIA_TO_INDEX[turno.dia_semana] === weekday)
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }, [dayTurnos, selectedDate]);

  // Derived (not a flag set in an effect): true on the very render where the
  // selection changes but the loaded turnos still belong to a prior selection.
  const dayTurnosKey =
    actividadId && selectedDate
      ? `${actividadId}:${toISODate(selectedDate)}`
      : null;
  const loadingDayTurnos =
    dayTurnosKey !== null && loadedDayTurnosKey !== dayTurnosKey;

  const cells = useMemo(
    () => buildMonthCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const atCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const goToPrevMonth = () => {
    if (atCurrentMonth) return;
    setViewMonth((m) => (m === 0 ? 11 : m - 1));
    setViewYear((y) => (viewMonth === 0 ? y - 1 : y));
  };

  const goToNextMonth = () => {
    setViewMonth((m) => (m === 11 ? 0 : m + 1));
    setViewYear((y) => (viewMonth === 11 ? y + 1 : y));
  };

  const isSelected = (day) =>
    selectedDate &&
    selectedDate.getFullYear() === viewYear &&
    selectedDate.getMonth() === viewMonth &&
    selectedDate.getDate() === day;

  // Turno elegido (para mostrar el horario en el recap de la selección).
  const selectedTurno = useMemo(
    () => slotsForDay.find((slot) => slot.id === selectedSlot) ?? null,
    [slotsForDay, selectedSlot],
  );

  // El cobro es siempre una seña del 50% del precio de la clase; el resto se
  // abona en el establecimiento (la mitad coincide con iniciar_pago en el back).
  const precioClase = selectedActividad ? Number(selectedActividad.precio) : null;
  const sena = precioClase != null ? precioClase / 2 : null;
  const total = sena != null ? formatPrice(sena) : "—";

  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selectedTurno || submitting) return;
    setSubmitting(true);
    try {
      const { init_point, reserva_id } = await crearCheckout({
        turno_id: selectedTurno.id,
        fecha: toISODate(selectedDate),
        tipo: "eventual",
      });
      // Guardamos la seña y la reserva para confirmarla y mostrar el toast al
      // volver de Mercado Pago; sessionStorage sobrevive la ida y vuelta en la
      // misma pestaña.
      if (sena != null) sessionStorage.setItem("pago_sena", String(sena));
      sessionStorage.setItem("pago_reserva_id", String(reserva_id));
      // Redirige al Checkout Pro de Mercado Pago.
      window.location.href = init_point;
    } catch (err) {
      toast.error(err?.message ?? "No se pudo iniciar el pago.");
      setSubmitting(false);
    }
  };

  return (
    <div className="px-margin-mobile md:px-lg mt-md md:mt-lg w-full flex justify-center">
      <div className="w-full max-w-[800px] flex flex-col gap-lg pb-xl">
        {/* Header & breadcrumb */}
        <div className="flex flex-col gap-sm">
          <nav
            aria-label="Migas de pan"
            className="flex items-center gap-1 text-label-sm text-on-surface-variant"
          >
            <Link to="/mis-turnos" className="hover:text-primary transition-colors">
              Mis Turnos
            </Link>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <span className="text-primary">Nueva Reserva</span>
          </nav>
          <PageHeading>Nueva Reserva</PageHeading>
        </div>

        {/* Section 1: configuration */}
        <section className="relative overflow-hidden bg-surface-container border border-accent/15 rounded-xl p-md md:p-lg">
          <div
            aria-hidden="true"
            className="absolute -top-20 -right-20 w-40 h-40 bg-primary/25 rounded-full blur-3xl pointer-events-none"
          />
          <div className="relative z-10 flex flex-col gap-md">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="reserva-actividad"
                className="text-label-sm text-on-surface-variant uppercase tracking-widest"
              >
                Actividad
              </label>
              <div className="relative">
                <select
                  id="reserva-actividad"
                  value={actividadId}
                  onChange={(e) => {
                    setActividadId(e.target.value);
                    // Cambiar de actividad invalida la fecha y el turno elegidos.
                    setSelectedDate(null);
                    setSelectedSlot(null);
                  }}
                  className="w-full appearance-none bg-surface-container-high border border-outline-variant text-on-surface rounded-lg px-4 py-3 pr-10 cursor-pointer outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-body-md"
                >
                  {actividades.length === 0 ? (
                    <option value="">No hay actividades disponibles</option>
                  ) : (
                    <>
                      <option value="" disabled>Seleccioná una actividad</option>
                      {actividades.map((actividad) => (
                        <option key={actividad.id} value={actividad.id}>
                          {actividad.nombre}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <ChevronRight
                  className="size-4 absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-on-surface-variant pointer-events-none"
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-label-sm text-on-surface-variant uppercase tracking-widest">
                Tipo de Reserva
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mensual — disabled / coming soon */}
{/*                 <div
                  aria-disabled="true"
                  className="relative flex flex-col gap-2 p-4 rounded-xl border border-outline-variant bg-surface-container-low opacity-60 cursor-not-allowed"
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-label-md text-on-surface text-lg">Mensual</span>
                    <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                      Próximamente
                    </span>
                  </div>
                  <p className="text-label-sm text-on-surface-variant">
                    Reserva fija para todo el mes.
                  </p>
                </div> */}

                <div className="relative flex flex-col gap-2 p-4 rounded-xl border-2 border-primary bg-primary/5">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-label-md text-on-surface text-lg">Eventual</span>
                  </div>
                  <p className="text-label-sm text-on-surface-variant">
                    Un solo turno para una fecha.
                  </p>
                  <div className="absolute top-4 right-4 w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center bg-primary/20">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: date & time */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {/* Calendar */}
          <div className="md:col-span-7 bg-surface-container border border-accent/15 rounded-xl p-md md:p-lg flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-headline-md text-on-surface">
                {MONTHS[viewMonth]} {viewYear}
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={goToPrevMonth}
                  disabled={!actividadId || atCurrentMonth}
                  aria-label="Mes anterior"
                  className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  disabled={!actividadId}
                  aria-label="Mes siguiente"
                  className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center text-label-sm text-on-surface-variant mb-4">
              {WEEKDAYS.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            <div
              aria-disabled={!actividadId}
              className={cn(
                "grid grid-cols-7 text-center gap-y-2 text-label-md",
                !actividadId && "opacity-40 pointer-events-none select-none",
              )}
            >
              {cells.map((day, index) => {
                if (day === null) return <div key={`blank-${index}`} />;
                const cellDate = new Date(viewYear, viewMonth, day);
                const isPast = cellDate < today;
                const selected = isSelected(day);
                if (isPast) {
                  return (
                    <div
                      key={day}
                      className="flex items-center justify-center h-10 text-on-surface-variant opacity-30 cursor-not-allowed"
                    >
                      {day}
                    </div>
                  );
                }
                // Once an activity is chosen, block any day without a turno.
                const hasActividad = Boolean(actividadId);
                const hasTurno = availableWeekdays.has(mondayIndex(cellDate));
                if (hasActividad && !hasTurno) {
                  return (
                    <div
                      key={day}
                      title="Sin turnos para este día"
                      className="flex flex-col items-center justify-center h-10 cursor-not-allowed"
                    >
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant opacity-40">
                        {day}
                      </span>
                      <span
                        aria-hidden="true"
                        className="w-1.5 h-1.5 rounded-full mt-0.5 bg-error"
                      />
                    </div>
                  );
                }
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setSelectedDate(cellDate);
                      setSelectedSlot(null);
                    }}
                    className="flex flex-col items-center justify-center h-10 cursor-pointer"
                  >
                    <span
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-surface-container-high",
                      )}
                    >
                      {day}
                    </span>
                    {hasActividad && hasTurno && (
                      <span
                        aria-hidden="true"
                        className="w-1.5 h-1.5 rounded-full mt-0.5 bg-success-green"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slots */}
          <div className="md:col-span-5 bg-surface-container border border-accent/15 rounded-xl p-md md:p-lg flex flex-col">
            <div className="mb-6">
              <h3 className="text-headline-md text-on-surface">
                {selectedDate
                  ? `${selectedDate.getDate()} de ${MONTHS[selectedDate.getMonth()]}`
                  : "Elegí una fecha"}
              </h3>
              <p className="text-label-sm text-on-surface-variant">
                {!actividadId
                  ? "Elegí una actividad"
                  : !selectedDate
                    ? ""
                    : loadingDayTurnos
                      ? ""
                      : `${slotsForDay.filter((t) => t.disponibles !== 0).length} horarios disponibles`}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {!actividadId ? (
                <p className="text-body-md text-on-surface-variant">
                  Seleccioná una actividad para ver sus turnos.
                </p>
              ) : !selectedDate ? null : loadingDayTurnos ? null : slotsForDay.length === 0 ? (
                <div className="w-full border border-error/20 bg-error/5 rounded-lg p-4 text-center">
                  <span className="text-label-md text-error">
                    No hay turnos disponibles para este día.
                  </span>
                </div>
              ) : (
                slotsForDay.map((slot) => {
                  const isFull = slot.disponibles === 0;
                  if (isFull) {
                    return (
                      <div
                        key={slot.id}
                        className="w-full border border-error/20 bg-error/5 rounded-lg p-3 flex justify-between items-center opacity-70"
                      >
                        <span className="text-headline-md text-on-surface-variant text-lg line-through">
                          {formatHora(slot.hora)}
                        </span>
                        <span className="text-label-sm text-error bg-error/10 px-2 py-1 rounded">
                          Turno Lleno
                        </span>
                      </div>
                    );
                  }
                  const selected = selectedSlot === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlot(slot.id)}
                      className={cn(
                        "w-full border rounded-lg p-3 flex justify-between items-center transition-all group",
                        selected
                          ? "border-primary bg-surface-container-high"
                          : "border-outline-variant bg-surface-container-low hover:border-primary hover:bg-surface-container-high",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {selected && (
                          <CheckCircle2 className="size-5 text-success-green" />
                        )}
                        <span className="text-headline-md text-on-surface text-lg">
                          {formatHora(slot.hora)}
                        </span>
                      </div>
                      <span className="text-label-sm text-on-surface-variant text-right">
                        {selected
                          ? "Seleccionado"
                          : slot.disponibles != null
                            ? `${slot.disponibles} ${slot.disponibles === 1 ? "lugar" : "lugares"}`
                            : "Seleccionar"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Section 3: selection recap — only once a turno time is chosen */}
        {selectedTurno && (
          <section className="bg-surface-container border border-accent/15 rounded-xl p-md md:p-lg flex flex-col gap-3">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-widest">
              Clase seleccionada (1 Eventual)
            </span>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Actividad
                </span>
                <span className="text-body-md text-on-surface">
                  {selectedActividad ? selectedActividad.nombre : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Fecha
                </span>
                <span className="text-body-md text-on-surface">
                  {selectedDate
                    ? `${selectedDate.getDate()} de ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
                    : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Horario
                </span>
                <span className="text-body-md text-on-surface">
                  {formatHora(selectedTurno.hora)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Precio de la clase
                </span>
                <span className="text-body-md text-on-surface">
                  {selectedActividad ? formatPrice(selectedActividad.precio) : "—"}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Section 4: summary */}
        <section className="bg-surface-container-high rounded-xl p-md md:p-lg border border-accent/15 flex flex-col gap-4 shadow-lg">
          <div className="flex flex-col gap-2 text-body-md text-on-surface-variant border-b border-outline-variant pb-4">
            <div className="flex justify-between items-center">
              <span>Seña a pagar (50%):</span>
              <span className="text-on-surface text-label-md">
                {selectedTurno && sena != null ? formatPrice(sena) : "—"}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-end pt-2">
            <div className="flex flex-col">
              <span className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
                Total a pagar (seña)
              </span>
              <span className="text-headline-lg text-primary leading-none">
                {selectedTurno ? total : "—"}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-[#009EE3]/10 px-3 py-1.5 rounded-full border border-[#009EE3]/30">
              <Handshake className="size-4 text-[#009EE3]" />
              <span className="text-label-sm font-bold text-[#009EE3]">MercadoPago</span>
            </div>
          </div>

          <Button
            type="button"
            size="lg"
            onClick={handleConfirm}
            disabled={!selectedTurno || submitting}
            className="w-full mt-4"
          >
            {submitting ? "Redirigiendo…" : "Confirmar Reserva"}
            <ArrowRight className="size-5" />
          </Button>
        </section>
      </div>
    </div>
  );
}