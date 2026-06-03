import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, ChevronRight, Mail, Users } from "lucide-react";

import { usePageTitle } from "@/lib/usePageTitle";
import { cn, formatPrice } from "@/lib/utils";
import { formatReservaFecha } from "@/lib/fecha";
import { Button } from "@/components/ui/button";
import { getActividadIcon } from "@/components/actividades/actividadIcons";
import { getSesionReservada } from "@/components/reservas/api";

// Mismo criterio de estados que en Mis Turnos: pagado > señado > pendiente.
const ESTADOS = {
  pagado: {
    label: "Pagado",
    dot: "bg-success-green",
    text: "text-success-green",
    chip: "bg-success-green/10 border-success-green/30",
  },
  senado: {
    label: "Señado",
    dot: "bg-accent",
    text: "text-accent",
    chip: "bg-accent/10 border-accent/30",
  },
  pendiente: {
    label: "Pendiente",
    dot: "bg-error",
    text: "text-error",
    chip: "bg-error/10 border-error/30",
  },
};

function inicial(nombre) {
  return (nombre?.trim()?.[0] ?? "?").toUpperCase();
}

function ReservaRow({ reserva }) {
  const estado = ESTADOS[reserva.estado] ?? ESTADOS.pendiente;
  const nombre = reserva.cliente?.nombre ?? "Cliente sin datos";

  return (
    <div className="bg-surface-container-high border border-outline-variant rounded-lg p-md flex flex-col sm:flex-row sm:items-center justify-between gap-md">
      <div className="flex items-center gap-sm min-w-0">
        <div className="w-10 h-10 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center shrink-0 text-label-md text-primary">
          {inicial(reserva.cliente?.nombre)}
        </div>
        <div className="flex flex-col min-w-0">
          <p className="text-label-md text-on-surface truncate">{nombre}</p>
          {reserva.cliente?.email && (
            <span className="text-xs text-on-surface-variant truncate flex items-center gap-1">
              <Mail className="size-3 shrink-0" aria-hidden="true" />
              {reserva.cliente.email}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-sm shrink-0 flex-wrap">
        <span className="px-2 py-0.5 bg-surface-container rounded text-xs capitalize text-on-surface-variant border border-outline-variant">
          {reserva.tipo}
        </span>
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full border",
            estado.chip,
          )}
        >
          <span className={cn("w-2 h-2 rounded-full", estado.dot)} />
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-widest",
              estado.text,
            )}
          >
            {estado.label}
          </span>
        </div>
        <span className="text-label-md text-on-surface min-w-[88px] text-right">
          {formatPrice(reserva.monto_pagado)}
        </span>
      </div>
    </div>
  );
}

export default function TurnoReservadoDetailPage() {
  const { turnoId, fecha } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  usePageTitle(data?.turno ? `${data.turno.actividad} reservado` : "Turno reservado");

  const fetchSesion = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await getSesionReservada(turnoId, fecha);
      setData(result);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [turnoId, fecha]);

  useEffect(() => {
    fetchSesion();
  }, [fetchSesion]);

  if (loading) {
    return (
      <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-5xl mx-auto w-full">
        <p className="text-on-surface-variant">Cargando sesión...</p>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="flex flex-col gap-md px-margin-mobile md:px-lg mt-md md:mt-lg max-w-5xl mx-auto w-full">
        <p className="text-destructive">
          {loadError ?? "No se encontró la sesión."}
        </p>
        <Button asChild variant="outline" className="self-start">
          <Link to="/turnos">Volver a Turnos Reservados</Link>
        </Button>
      </div>
    );
  }

  const { turno, reservas } = data;
  const Icon = getActividadIcon(turno.actividad);
  const ocupacion =
    turno.cupo > 0 ? Math.min(100, (turno.ocupados / turno.cupo) * 100) : 0;
  const lleno = turno.cupo > 0 && turno.ocupados >= turno.cupo;

  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-5xl mx-auto w-full pb-xl">
      <nav
        aria-label="Migas de pan"
        className="flex items-center gap-1 text-label-md text-on-surface-variant"
      >
        <Link to="/turnos" className="hover:text-primary transition-colors">
          Turnos Reservados
        </Link>
        <ChevronRight className="size-4" aria-hidden="true" />
        <span className="text-on-surface">
          {turno.actividad} — {formatReservaFecha(turno.fecha, turno.hora)}
        </span>
      </nav>

      <section className="bg-surface-container border border-outline-variant rounded-xl p-md md:p-lg relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none"
        />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-md">
          <div className="w-16 h-16 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-center shrink-0">
            <Icon className="size-8 text-primary" aria-hidden="true" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-md md:gap-xl w-full">
            <div>
              <p className="text-label-sm text-on-surface-variant mb-1">
                Actividad
              </p>
              <p className="text-headline-md text-on-surface">
                {turno.actividad}
              </p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant mb-1">Cuándo</p>
              <p className="text-body-lg text-on-surface flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" aria-hidden="true" />
                {formatReservaFecha(turno.fecha, turno.hora)}
              </p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant mb-1">Cupo</p>
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" aria-hidden="true" />
                <span className="text-body-lg text-on-surface">
                  {turno.ocupados} / {turno.cupo}
                </span>
                <div className="w-16 h-1.5 bg-outline-variant rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      lleno ? "bg-error" : "bg-primary",
                    )}
                    style={{ width: `${ocupacion}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface-container border border-outline-variant rounded-xl flex flex-col overflow-hidden">
        <div className="p-md md:p-lg border-b border-outline-variant">
          <h2 className="text-headline-md text-on-surface">
            Reservas ({reservas.length})
          </h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            Clientes anotados en esta sesión y su estado de pago.
          </p>
        </div>

        {reservas.length > 0 ? (
          <div className="p-md md:p-lg flex flex-col gap-sm">
            {reservas.map((reserva) => (
              <ReservaRow key={reserva.id} reserva={reserva} />
            ))}
          </div>
        ) : (
          <div className="p-md md:p-lg flex flex-col items-center justify-center py-xl text-on-surface-variant">
            <Users className="size-12 mb-3 opacity-70" />
            <p className="text-headline-md">No hay reservas en esta sesión.</p>
          </div>
        )}
      </section>
    </div>
  );
}
