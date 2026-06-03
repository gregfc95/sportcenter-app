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
import { listActividades } from "@/components/actividades/api";
import { listTurnosPorActividad } from "@/components/turnos/api";
import { obtenerOCrearClase } from "@/components/clases/api";
import { createReserva } from "@/components/reservas/api";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const WEEKDAYS = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"];

const PRICE_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function formatPrice(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return PRICE_FORMATTER.format(num);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

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
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    let active = true;
    listActividades()
      .then((data) => { if (active) setActividades(data); })
      .catch(() => { if (active) setActividades([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!actividadId || !selectedDate) return;
    let active = true;

    const fecha = selectedDate.toISOString().split("T")[0];
    listTurnosPorActividad(actividadId, fecha)
      .then((data) => { if (active) setSlots(data); })
      .catch(() => { if (active) setSlots([]); });

    setSelectedSlot(null);
    return () => { active = false; };
  }, [actividadId, selectedDate]);

  const mappedSlots = slots.map((turno) => ({
    turno_id: turno.id,
    time: turno.hora.slice(0, 5),
    status: turno.disponibles > 0 ? "available" : "full",
  }));

  const selectedActividad = useMemo(
    () => actividades.find((a) => String(a.id) === String(actividadId)) ?? null,
    [actividades, actividadId],
  );

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

  const total = selectedActividad ? formatPrice(selectedActividad.precio) : "—";

  const handleConfirm = async () => {
    if (!selectedSlot || !selectedDate) return;

    setIsConfirming(true);
    try {
      const fecha = selectedDate.toISOString().split("T")[0];
      const clase = await obtenerOCrearClase(selectedSlot.turno_id, fecha);
      await createReserva(clase.id);
      toast.success("Reserva confirmada");
    } catch (err) {
      toast.error(err.message ?? "Error al confirmar la reserva");
    } finally {
      setIsConfirming(false);
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
        <section className="relative overflow-hidden bg-surface-container border border-outline-variant rounded-xl p-md md:p-lg">
          <div
            aria-hidden="true"
            className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none"
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
                  onChange={(e) => setActividadId(e.target.value)}
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
                <div
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
                </div>

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
          <div className="md:col-span-7 bg-surface-container border border-outline-variant rounded-xl p-md md:p-lg flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-headline-md text-on-surface">
                {MONTHS[viewMonth]} {viewYear}
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={goToPrevMonth}
                  disabled={atCurrentMonth}
                  aria-label="Mes anterior"
                  className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  aria-label="Mes siguiente"
                  className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
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

            <div className="grid grid-cols-7 text-center gap-y-2 text-label-md">
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
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setSelectedDate(cellDate);
                      setSelectedSlot(null);
                    }}
                    className="flex items-center justify-center h-10 cursor-pointer"
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
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slots */}
          <div className="md:col-span-5 bg-surface-container border border-outline-variant rounded-xl p-md md:p-lg flex flex-col">
            <div className="mb-6">
              <h3 className="text-headline-md text-on-surface">
                {selectedDate
                  ? `${selectedDate.getDate()} de ${MONTHS[selectedDate.getMonth()]}`
                  : "Elegí una fecha"}
              </h3>
              <p className="text-label-sm text-on-surface-variant">
                {mappedSlots.filter((s) => s.status === "available").length} horarios disponibles
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {mappedSlots.map((slot) => {
                if (slot.status === "full") {
                  return (
                    <div
                      key={slot.turno_id}
                      className="w-full border border-error/20 bg-error/5 rounded-lg p-3 flex justify-between items-center opacity-70"
                    >
                      <span className="text-headline-md text-on-surface-variant text-lg line-through">
                        {slot.time}
                      </span>
                      <span className="text-label-sm text-error bg-error/10 px-2 py-1 rounded">
                        Turno Lleno
                      </span>
                    </div>
                  );
                }
                const selected = selectedSlot?.turno_id === slot.turno_id;
                return (
                  <button
                    key={slot.turno_id}
                    type="button"
                    onClick={() => setSelectedSlot({ turno_id: slot.turno_id, time: slot.time })}
                    className={cn(
                      "w-full border rounded-lg p-3 flex justify-between items-center transition-all group",
                      selected
                        ? "border-primary bg-surface-container-high"
                        : "border-outline-variant bg-surface-container-low hover:border-primary hover:bg-surface-container-high",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {selected && <CheckCircle2 className="size-5 text-success-green" />}
                      <span className="text-headline-md text-on-surface text-lg">{slot.time}</span>
                    </div>
                    <span className="text-label-sm text-on-surface-variant group-hover:text-primary transition-colors">
                      {selected ? "Seleccionado" : "Seleccionar"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 3: summary */}
        <section className="bg-surface-container-high rounded-xl p-md md:p-lg border border-outline-variant flex flex-col gap-4 shadow-lg">
          <div className="flex flex-col gap-2 text-body-md text-on-surface-variant border-b border-outline-variant pb-4">
            <div className="flex justify-between items-center">
              <span>Clases seleccionadas:</span>
              <span className="text-on-surface text-label-md">1 (Eventual)</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Precio por clase:</span>
              <span className="text-on-surface text-label-md">
                {selectedActividad ? formatPrice(selectedActividad.precio) : "—"}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-end pt-2">
            <div className="flex flex-col">
              <span className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
                Total a pagar
              </span>
              <span className="text-headline-lg text-primary leading-none">{total}</span>
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
            disabled={!selectedSlot || !selectedDate || isConfirming}
            className="w-full mt-4"
          >
            {isConfirming ? "Confirmando..." : "Confirmar Reserva"}
            <ArrowRight className="size-5" />
          </Button>
        </section>
      </div>
    </div>
  );
}