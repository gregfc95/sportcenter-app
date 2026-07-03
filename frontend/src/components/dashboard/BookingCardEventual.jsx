import { CalendarDays, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EstadoBadge } from "@/components/ui/estado-badge";
import { TipoChip } from "@/components/ui/tipo-chip";
import { getActividadIcon } from "@/components/actividades/actividadIcons";
import PagarSaldoDialog from "@/components/reservas/PagarSaldoDialog";
import PagarSenaDialog from "@/components/reservas/PagarSenaDialog";
import CancelarReservaDialog from "@/components/reservas/CancelarReservaDialog";
import VerQrDialog from "@/components/reservas/VerQrDialog";
import { STATUS_META } from "./statusMeta";
import { cn } from "@/lib/utils";

export default function BookingCardEventual({
  reservaId,
  sport,
  fecha,
  datetime,
  status = "pendiente",
  capacity,
  precio,
  sena,
  saldo,
  asistencia,
  onCancelled,
}) {
  const meta = STATUS_META[status] ?? STATUS_META.pendiente;
  const Icon = getActividadIcon(sport);
  // Pendiente paga la seña (reanuda el checkout); señada paga el saldo.
  const showSena = status === "pendiente";
  const showSaldo = status === "senado";
  const showCapacity = Boolean(capacity);

  const cancelButton = (
    <CancelarReservaDialog
      reservaId={reservaId}
      actividad={sport}
      datetime={datetime}
      estado={status}
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
  );

  const pagarTrigger = (
    <Button
      variant="outline"
      size="sm"
      className="text-primary border-primary/40 hover:bg-primary/10 hover:text-primary"
    >
      Pagar
    </Button>
  );
  const pagarButton = showSena ? (
    <PagarSenaDialog
      reservaId={reservaId}
      actividad={sport}
      datetime={datetime}
      precio={precio}
      sena={sena}
      trigger={pagarTrigger}
    />
  ) : showSaldo ? (
    <PagarSaldoDialog
      reservaId={reservaId}
      actividad={sport}
      datetime={datetime}
      precio={precio}
      sena={sena}
      saldo={saldo}
      trigger={pagarTrigger}
    />
  ) : null;
  // El turno pagado muestra su QR de asistencia (habilitado solo el día).
  const qrButton = status === "pagado" && (
    <VerQrDialog
      reservaId={reservaId}
      fecha={fecha}
      asistencia={asistencia}
      actividad={sport}
      datetime={datetime}
    />
  );

  return (
    <article
      className={cn(
        "relative overflow-hidden bg-surface border border-outline-variant rounded-xl p-md shadow-sm shadow-black/5 flex flex-col gap-sm md:flex-row md:items-center md:gap-md",
        status === "pagado" && "opacity-90",
      )}
    >
      <span
        className={cn("absolute left-0 top-0 bottom-0 w-1", meta.strip)}
        aria-hidden="true"
      />

      <div className="flex flex-col gap-sm md:flex-1 md:min-w-0">
        <div className="flex justify-between items-start gap-sm pl-xs">
          <div className="flex flex-col gap-xs">
            <div className="flex items-center gap-xs">
              <Icon className={cn("size-5", meta.icon)} strokeWidth={2} />
              <h4 className="text-label-md uppercase tracking-wider text-primary">
                {sport}
              </h4>
            </div>
            <div className="flex items-center gap-xs">
              <span className="text-xs text-on-surface-variant">
                Reserva #{reservaId}
              </span>
              <TipoChip tipo="eventual" />
            </div>
            <span className="flex items-center gap-xs text-[20px] leading-tight font-bold text-on-surface">
              <CalendarDays className="size-5 text-on-surface-variant" strokeWidth={2} />
              {datetime}
            </span>
          </div>

          <EstadoBadge estado={status} className="md:hidden" />
        </div>

        {showCapacity && (
          <span className="hidden md:inline-flex items-center gap-xs pl-xs text-label-sm text-on-surface-variant">
            <Users className="size-4" strokeWidth={2} />
            Cupo: {capacity.taken} / {capacity.total}
          </span>
        )}
      </div>

      <EstadoBadge estado={status} className="hidden md:inline-flex" />

      <div className="flex items-center justify-between pt-sm border-t border-outline-variant pl-xs md:pt-0 md:border-t-0 md:border-l md:border-outline-variant md:pl-md md:justify-end md:shrink-0">
        {showCapacity && (
          <span className="md:hidden inline-flex items-center gap-xs text-label-sm text-on-surface-variant">
            <Users className="size-4" strokeWidth={2} />
            Cupo: {capacity.taken} / {capacity.total}
          </span>
        )}
        <div className="ml-auto md:ml-0 flex items-center gap-sm">
          {cancelButton}
          {pagarButton}
          {qrButton}
        </div>
      </div>
    </article>
  );
}
