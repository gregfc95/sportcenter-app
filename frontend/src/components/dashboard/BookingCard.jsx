import { Button } from "@/components/ui/button";
import { EstadoBadge } from "@/components/ui/estado-badge";
import { getActividadIcon } from "@/components/actividades/actividadIcons";
import PagarSaldoDialog from "@/components/reservas/PagarSaldoDialog";
import PagarSenaDialog from "@/components/reservas/PagarSenaDialog";
import PagarMensualidadDialog from "@/components/reservas/PagarMensualidadDialog";
import CancelarReservaDialog from "@/components/reservas/CancelarReservaDialog";
import { cn } from "@/lib/utils";

// Presentación propia de la card por estado; el badge sale de EstadoBadge.
const STATUS_META = {
  pendiente: {
    strip: "bg-accent",
    icon: "text-accent",
    title: "text-on-surface",
  },
  senado: {
    strip: "bg-accent",
    icon: "text-accent",
    title: "text-on-surface",
  },
  pagado: {
    strip: "bg-surface-container-high",
    icon: "text-on-surface-variant",
    title: "text-on-surface-variant",
  },
};

export default function BookingCard({
  reservaId,
  sport,
  court,
  datetime,
  status = "pendiente",
  capacity,
  precio,
  sena,
  saldo,
  tipo,
  mensualidad,
  onCancelled,
}) {
  const meta = STATUS_META[status] ?? STATUS_META.pendiente;
  const Icon = getActividadIcon(sport);
  const esMensual = tipo === "mensual" && Array.isArray(mensualidad?.clases);
  // En un abono mensual, "Cancelar" actúa sobre la próxima clase (la de la
  // card); la mensualidad pendiente se paga completa, sin seña.
  const proximaClase = esMensual
    ? mensualidad.clases.find((c) => !c.pasada)
    : null;
  // "Ver QR" para pagados se implementará a futuro; por ahora solo el pago.
  // Pendiente paga la seña (reanuda el checkout); señada paga el saldo.
  const showMensualidad = esMensual && status !== "pagado";
  const showSena = !esMensual && status === "pendiente";
  const showSaldo = !esMensual && status === "senado";
  const showCapacity =
    (status === "pendiente" || status === "senado") && capacity;

  const cancelButton = (!esMensual || proximaClase) && (
    <CancelarReservaDialog
      reservaId={esMensual ? proximaClase.reserva_id : reservaId}
      actividad={sport}
      datetime={datetime}
      mensual={esMensual}
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
  const pagarButton = showMensualidad ? (
    <PagarMensualidadDialog
      reservaId={reservaId}
      actividad={sport}
      datetime={datetime}
      clases={mensualidad.clases.length}
      total={mensualidad.total}
      trigger={pagarTrigger}
    />
  ) : showSena ? (
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
  /* TODO (a futuro): "Ver QR" para turnos pagados. Reimportar `QrCode`
     de lucide-react al reactivar.
      <Button
        variant="outline"
        size="sm"
        className="text-on-surface border-outline-variant hover:bg-surface-container-high"
      >
        <QrCode className="size-4" strokeWidth={2} />
        Ver QR
      </Button>
  */

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
              <h4
                className={cn(
                  "text-label-md uppercase tracking-wider",
                  meta.title,
                )}
              >
                {court ? `${sport} • ${court}` : sport}
              </h4>
            </div>
            <span className="text-xs text-on-surface-variant">
              Reserva #{reservaId}
            </span>
            <span className="text-[20px] leading-tight font-bold text-on-surface">
              {datetime}
            </span>
          </div>

          <EstadoBadge estado={status} className="md:hidden" />
        </div>

        {showCapacity && (
          <span className="hidden md:inline-flex pl-xs text-label-sm text-on-surface-variant">
            Cupo: {capacity.taken} / {capacity.total}
          </span>
        )}
      </div>

      <EstadoBadge estado={status} className="hidden md:inline-flex" />

      <div className="flex items-center justify-between pt-sm border-t border-outline-variant pl-xs md:pt-0 md:border-t-0 md:border-l md:border-outline-variant md:pl-md md:justify-end md:shrink-0">
        {showCapacity && (
          <span className="md:hidden text-label-sm text-on-surface-variant">
            Cupo: {capacity.taken} / {capacity.total}
          </span>
        )}
        <div className="ml-auto md:ml-0 flex items-center gap-sm">
          {cancelButton}
          {pagarButton}
        </div>
      </div>
    </article>
  );
}
