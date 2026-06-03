import { Button } from "@/components/ui/button";
import { getActividadIcon } from "@/components/actividades/actividadIcons";
import PagarSaldoDialog from "@/components/reservas/PagarSaldoDialog";
import CancelarReservaDialog from "@/components/reservas/CancelarReservaDialog";
import { cn } from "@/lib/utils";

const STATUS_META = {
  pendiente: {
    label: "Pendiente",
    strip: "bg-accent",
    badgeWrap: "bg-error/10 border-error/30 text-error",
    dot: "bg-error",
    icon: "text-accent",
    title: "text-on-surface",
  },
  senado: {
    label: "Señado",
    strip: "bg-accent",
    badgeWrap: "bg-accent/10 border-accent/30 text-accent",
    dot: "bg-accent",
    icon: "text-accent",
    title: "text-on-surface",
  },
  pagado: {
    label: "Pagado",
    strip: "bg-surface-container-high",
    badgeWrap: "bg-success-green/10 border-success-green/30 text-success-green",
    dot: "bg-success-green",
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
  onCancelled,
}) {
  const meta = STATUS_META[status] ?? STATUS_META.pendiente;
  const Icon = getActividadIcon(sport);
  // "Ver QR" para pagados se implementará a futuro; por ahora solo el pago.
  const showPagar = status === "pendiente" || status === "senado";
  const showCapacity =
    (status === "pendiente" || status === "senado") && capacity;

  const badgeBase = cn(
    "shrink-0 border px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5",
    meta.badgeWrap,
  );
  const badgeInner = (
    <>
      <span className={cn("w-2 h-2 rounded-full", meta.dot)} />
      {meta.label}
    </>
  );

  const cancelButton = (
    <CancelarReservaDialog
      reservaId={reservaId}
      actividad={sport}
      datetime={datetime}
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

  const pagarButton = showPagar ? (
    <PagarSaldoDialog
      reservaId={reservaId}
      actividad={sport}
      datetime={datetime}
      precio={precio}
      sena={sena}
      trigger={
        <Button
          variant="outline"
          size="sm"
          className="text-primary border-primary/40 hover:bg-primary/10 hover:text-primary"
        >
          Pagar
        </Button>
      }
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

          <span className={cn(badgeBase, "md:hidden")}>{badgeInner}</span>
        </div>

        {showCapacity && (
          <span className="hidden md:inline-flex pl-xs text-label-sm text-on-surface-variant">
            Cupo: {capacity.taken} / {capacity.total}
          </span>
        )}
      </div>

      <span className={cn(badgeBase, "hidden md:flex")}>{badgeInner}</span>

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
