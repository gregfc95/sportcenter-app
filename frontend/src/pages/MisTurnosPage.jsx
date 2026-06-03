import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarX2, CalendarDays, Users } from "lucide-react";

import { usePageTitle } from "@/lib/usePageTitle";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { getActividadIcon } from "@/components/actividades/actividadIcons";
import { listMisReservas } from "@/components/reservas/api";
import PagarSaldoDialog from "@/components/reservas/PagarSaldoDialog";
import CancelarReservaDialog from "@/components/reservas/CancelarReservaDialog";
import { formatReservaFecha } from "@/lib/fecha";
import { cn } from "@/lib/utils";

// Cómo se presenta cada estado de pago en la card.
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

function ReservaCard({ reserva, onCancelled }) {
  const estado = ESTADOS[reserva.estado] ?? ESTADOS.pendiente;
  const { cupo, ocupados } = reserva.turno;
  const ocupacion = cupo > 0 ? Math.min(100, (ocupados / cupo) * 100) : 0;
  const Icon = getActividadIcon(reserva.actividad);
  const pagado = reserva.estado === "pagado";

  return (
    <div className="relative overflow-hidden bg-surface-container border border-outline-variant rounded-xl p-md flex flex-col gap-md hover:border-primary/50 transition-colors">
      <div
        aria-hidden="true"
        className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none"
      />

      {/* Header: icon + name + status */}
      <div className="relative z-10 flex justify-between items-start gap-2">
        <div className="flex items-center gap-sm">
          <div className="w-12 h-12 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center shrink-0">
            <Icon className="size-6 text-primary" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-label-md text-on-surface">{reserva.actividad}</h3>
            <span className="text-xs text-on-surface-variant">
              Reserva #{reserva.id}
            </span>
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full border shrink-0",
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
      </div>

      {/* Details */}
      <div className="relative z-10 flex flex-col gap-sm text-label-sm text-on-surface-variant">
        <div className="flex items-center gap-3">
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
          <span>{formatReservaFecha(reserva.fecha, reserva.turno.hora)}</span>
          <span className="ml-auto px-2 py-0.5 bg-surface-container-high rounded text-xs capitalize">
            {reserva.tipo}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Users className="size-4 shrink-0" aria-hidden="true" />
          <span>
            Cupo: {ocupados} / {cupo}
          </span>
          <div className="ml-auto w-16 h-1.5 bg-outline-variant rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${ocupacion}%` }}
            />
          </div>
        </div>
      </div>

      {/* Actions — cancelar siempre, y pago del saldo si falta. "Ver QR" a futuro. */}
      <div className="relative z-10 flex items-center gap-sm pt-sm border-t border-outline-variant">
        <CancelarReservaDialog
          reservaId={reserva.id}
          actividad={reserva.actividad}
          datetime={formatReservaFecha(reserva.fecha, reserva.turno.hora)}
          onCancelled={onCancelled}
          trigger={
            <Button
              variant="outline"
              size="sm"
              className="text-error border-error/40 hover:bg-error/10 hover:text-error"
            >
              Cancelar
            </Button>
          }
        />
        {!pagado && (
          <PagarSaldoDialog
            reservaId={reserva.id}
            actividad={reserva.actividad}
            datetime={formatReservaFecha(reserva.fecha, reserva.turno.hora)}
            precio={reserva.precio}
            sena={reserva.sena}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="ml-auto text-primary border-primary/40 hover:bg-primary/10 hover:text-primary"
              >
                Pagar
              </Button>
            }
          />
        )}
      </div>
      {/* TODO (a futuro): mostrar el QR del turno pagado. Reimportar `QrCode`
          de lucide-react al reactivar.
      {pagado && (
        <div className="relative z-10 flex pt-sm border-t border-outline-variant">
          <Button variant="outline" size="sm" className="ml-auto">
            <QrCode className="size-4" />
            Ver QR
          </Button>
        </div>
      )}
      */}
    </div>
  );
}

export default function MisTurnosPage() {
  usePageTitle("Mis Turnos");

  const [reservas, setReservas] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    listMisReservas()
      .then((data) => {
        if (active) setReservas(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setReservas([]);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleCancelled = (reservaId) => {
    setReservas((prev) => prev.filter((r) => r.id !== reservaId));
  };

  const hasTurnos = reservas.length > 0;

  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-5xl mx-auto w-full pb-xl">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-gutter">
        <div className="flex flex-col gap-1">
          <PageHeading>Mis Turnos</PageHeading>
          <p className="text-body-md text-on-surface-variant">
            Gestioná tus reservas y próximos partidos.
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link to="/nueva-reserva">Nueva Reserva</Link>
        </Button>
      </header>

      {!loaded ? null : hasTurnos ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
          {reservas.map((reserva) => (
            <ReservaCard
              key={reserva.id}
              reserva={reserva}
              onCancelled={handleCancelled}
            />
          ))}
        </div>
      ) : (
        <section className="bg-surface-container border border-outline-variant rounded-xl flex flex-col overflow-hidden">
          <div className="p-md md:p-lg flex flex-col items-center justify-center py-xl text-on-surface-variant">
            <CalendarX2 className="size-12 mb-3 opacity-70" />
            <p className="text-headline-md">Aún no tienes turnos</p>
            <p className="text-body-md opacity-70 mt-1">
              Cuando reserves un turno, aparecerá acá.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
