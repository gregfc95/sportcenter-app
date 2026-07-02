import { useState } from "react";
import { CalendarDays, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EstadoBadge } from "@/components/ui/estado-badge";
import { TipoChip } from "@/components/ui/tipo-chip";
import { getActividadIcon } from "@/components/actividades/actividadIcons";
import ClasesMensuales from "@/components/reservas/ClasesMensuales";
import PagarMensualidadDialog from "@/components/reservas/PagarMensualidadDialog";
import CancelarReservaDialog from "@/components/reservas/CancelarReservaDialog";
import CancelarAbonoDialog from "@/components/reservas/CancelarAbonoDialog";
import { formatReservaFecha, mesLabel } from "@/lib/fecha";
import { cn } from "@/lib/utils";
import { STATUS_META } from "./statusMeta";

// Los triggers se montan vía `DialogTrigger asChild`: hay que reenviar las
// props que inyecta Radix (onClick, ref, aria) al Button o el modal no abre.
function CancelarTrigger({ label, ...props }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="text-error border-error/40 hover:bg-error/10 hover:text-error"
      {...props}
    >
      {label}
    </Button>
  );
}

function PagarTrigger(props) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="text-primary border-primary/40 hover:bg-primary/10 hover:text-primary"
      {...props}
    >
      Pagar
    </Button>
  );
}

/**
 * Card compacta del dashboard para un abono mensual: el turno es un grupo de
 * fechas (una clase por semana), así que muestra el mes con la fila de chips
 * de clases en lugar de una única fecha.
 *
 * Pendiente: el abono se paga completo (sin seña) y se cancela completo (sin
 * pagos no hay nada que reembolsar). Pagado: cada clase se cancela
 * individualmente, eligiéndola en la fila de chips.
 */
export default function BookingCardMensual({
  reservaId,
  sport,
  status = "pendiente",
  capacity,
  mensualidad,
  turno,
  onCancelled,
}) {
  const meta = STATUS_META[status] ?? STATUS_META.pendiente;
  const Icon = getActividadIcon(sport);
  const pagado = status === "pagado";
  // Mismo criterio que la card eventual; el cupo es el de la próxima clase.
  const showCapacity = Boolean(capacity);

  const clases = mensualidad.clases;
  const proximas = clases.filter((c) => !c.pasada);
  const pasadas = clases.length - proximas.length;
  const proximaDatetime = proximas[0]
    ? formatReservaFecha(proximas[0].fecha, turno.hora)
    : null;

  // Clase del abono pagado sobre la que actúa "Cancelar clase"; por defecto
  // la próxima. En un abono pendiente no hay selección: se cancela completo.
  const [claseSeleccionadaId, setClaseSeleccionadaId] = useState(null);
  const claseSeleccionada =
    proximas.find((c) => c.reserva_id === claseSeleccionadaId) ??
    proximas[0] ??
    null;

  return (
    <article
      className={cn(
        "relative overflow-hidden bg-surface border border-outline-variant rounded-xl p-md shadow-sm shadow-black/5 flex flex-col gap-sm",
        pagado && "opacity-90",
      )}
    >
      <span
        className={cn("absolute left-0 top-0 bottom-0 w-1", meta.strip)}
        aria-hidden="true"
      />

      <div className="flex justify-between items-start gap-sm pl-xs">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-xs">
            <Icon className={cn("size-5", meta.icon)} strokeWidth={2} />
            <h4 className="text-label-md uppercase tracking-wider text-primary">
              {sport}
            </h4>
          </div>
          <div className="flex items-center gap-xs">
            {pagado && claseSeleccionada && (
              <span className="text-xs text-on-surface-variant">
                Reserva #{claseSeleccionada.reserva_id}
              </span>
            )}
            <TipoChip tipo="mensual" />
          </div>
          <div className="flex items-center gap-xs">
            <CalendarDays
              className="size-5 shrink-0 text-on-surface-variant"
              strokeWidth={2}
            />
            <div className="flex items-baseline gap-xs flex-wrap">
              <span className="text-[20px] leading-tight font-bold text-on-surface">
                {clases.length > 0 ? mesLabel(clases[0].fecha) : ""}
              </span>
              <span className="text-xs text-on-surface-variant" aria-hidden="true">
                ·
              </span>
              <span className="text-xs text-on-surface-variant">
                Todos los {turno.dia_semana} · {turno.hora}
              </span>
            </div>
          </div>
        </div>
        <EstadoBadge estado={status} />
      </div>

      <div className="pl-xs">
        <ClasesMensuales
          clases={clases}
          selectable={pagado}
          selectedId={claseSeleccionada?.reserva_id ?? null}
          onSelect={setClaseSeleccionadaId}
        />
      </div>

      <div className="pl-xs flex items-center gap-2 text-label-sm text-on-surface-variant">
        <span>
          {pasadas} de {clases.length}{" "}
          {clases.length === 1 ? "sesión" : "sesiones"}
          {proximaDatetime ? ` · próxima: ${proximaDatetime}` : ""}
        </span>
      </div>

      <div className="flex items-center justify-between pt-sm border-t border-outline-variant pl-xs">
        {showCapacity && (
          <span className="flex items-center gap-xs text-label-sm text-on-surface-variant">
            <Users className="size-4" strokeWidth={2} />
            Cupo: {capacity.taken} / {capacity.total}
          </span>
        )}
        <div className="ml-auto flex items-center gap-sm">
          {pagado ? (
            claseSeleccionada && (
              <CancelarReservaDialog
                reservaId={claseSeleccionada.reserva_id}
                actividad={sport}
                datetime={formatReservaFecha(
                  claseSeleccionada.fecha,
                  turno.hora,
                )}
                mensual
                estado={status}
                onCancelled={onCancelled}
                trigger={<CancelarTrigger label="Cancelar" />}
              />
            )
          ) : (
            <>
              <CancelarAbonoDialog
                reservaId={reservaId}
                actividad={sport}
                clases={clases.length}
                datetime={proximaDatetime}
                onCancelled={onCancelled}
                trigger={<CancelarTrigger label="Cancelar" />}
              />
              <PagarMensualidadDialog
                reservaId={reservaId}
                actividad={sport}
                datetime={proximaDatetime}
                clases={clases.length}
                total={mensualidad.total}
                trigger={<PagarTrigger />}
              />
            </>
          )}
        </div>
      </div>
    </article>
  );
}
