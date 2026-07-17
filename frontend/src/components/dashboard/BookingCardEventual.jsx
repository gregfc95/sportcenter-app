import { CalendarDays, Check, Clock, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EstadoBadge } from "@/components/ui/estado-badge";
import { TipoChip } from "@/components/ui/tipo-chip";
import { ActividadIcon } from "@/components/actividades/ActividadIcon";
import PagarSaldoDialog from "@/components/reservas/PagarSaldoDialog";
import PagarSenaDialog from "@/components/reservas/PagarSenaDialog";
import CancelarReservaDialog from "@/components/reservas/CancelarReservaDialog";
import SalirEsperaDialog from "@/components/reservas/SalirEsperaDialog";
import PagarEsperaBloqueado from "@/components/reservas/PagarEsperaBloqueado";
import VerQrDialog from "@/components/reservas/VerQrDialog";
import {
  esperaBadgeEstado,
  esperaDetalle,
  esperaOfertaActiva,
} from "@/components/reservas/listaEspera";
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
  espera,
  onCancelled,
  onPagado,
}) {
  const meta = STATUS_META[status] ?? STATUS_META.pendiente;
  // Pendiente paga la seña (reanuda el checkout); señada paga el saldo.
  const showSena = status === "pendiente";
  const showSaldo = status === "senado";
  const showCapacity = Boolean(capacity);
  const enEspera = status === "en_espera";
  const ofertaActiva = esperaOfertaActiva(espera);
  const badgeEstado = enEspera ? esperaBadgeEstado(espera) : status;

  const cancelButton = enEspera ? (
    <SalirEsperaDialog
      reservaId={reservaId}
      actividad={sport}
      onCancelled={onCancelled}
      trigger={
        <Button
          variant="outline"
          size="sm"
          className="text-error border-error/40 hover:bg-error/10 hover:text-error"
        >
          Salir
        </Button>
      }
    />
  ) : (
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
  const senaDialog = (
    <PagarSenaDialog
      reservaId={reservaId}
      actividad={sport}
      datetime={datetime}
      precio={precio}
      sena={sena}
      onPagado={onPagado}
      trigger={pagarTrigger}
    />
  );
  let pagarButton = null;
  if (enEspera) {
    pagarButton = ofertaActiva ? senaDialog : <PagarEsperaBloqueado />;
  } else if (showSena) {
    pagarButton = senaDialog;
  } else if (showSaldo) {
    pagarButton = (
      <PagarSaldoDialog
        reservaId={reservaId}
        actividad={sport}
        datetime={datetime}
        precio={precio}
        sena={sena}
        saldo={saldo}
        onPagado={onPagado}
        trigger={pagarTrigger}
      />
    );
  }
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
              <ActividadIcon
                actividad={sport}
                className={cn("size-5", meta.icon)}
                strokeWidth={2}
              />
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
            {asistencia && (
              <span className="flex items-center gap-xs text-label-sm text-success-green">
                <Check className="size-4" strokeWidth={2} />
                Asististe
              </span>
            )}
            {enEspera && (
              <span className="flex items-center gap-xs text-label-sm text-info-blue">
                {espera?.estado !== "vencido" && (
                  <Clock className="size-4" strokeWidth={2} />
                )}
                {esperaDetalle(espera)}
              </span>
            )}
          </div>

          <EstadoBadge estado={badgeEstado} className="md:hidden" />
        </div>

        {showCapacity && (
          <span className="hidden md:inline-flex items-center gap-xs pl-xs text-label-sm text-on-surface-variant">
            <Users className="size-4" strokeWidth={2} />
            Cupo: {capacity.taken} / {capacity.total}
          </span>
        )}
      </div>

      <EstadoBadge estado={badgeEstado} className="hidden md:inline-flex" />

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
