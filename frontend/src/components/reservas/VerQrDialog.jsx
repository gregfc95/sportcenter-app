import { useState } from "react";
import { CalendarDays, QrCode } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getReservaQr } from "@/components/reservas/api";
import { todayISO } from "@/lib/fecha";
import { cn } from "@/lib/utils";

/**
 * Botón "Ver QR" + modal con el código de asistencia de una reserva pagada.
 *
 * El QR sólo está disponible el día del turno. Fuera de fecha (o ya escaneado)
 * el botón queda atenuado pero sigue siendo clickeable para poder explicar el
 * motivo con un toast — un botón `disabled` de verdad no dispara onClick. Por
 * eso el dialog es controlado y no usa DialogTrigger.
 *
 * @param {object}  props
 * @param {number}  props.reservaId  - Reserva (clase, en un abono) cuyo QR se pide.
 * @param {string}  props.fecha      - Fecha ISO (YYYY-MM-DD) del turno.
 * @param {boolean} props.asistencia - Si la asistencia ya fue registrada.
 * @param {string}  props.actividad  - Nombre de la actividad (para el copy).
 * @param {string}  props.datetime   - Fecha y hora ya formateadas del turno.
 * @param {boolean} [props.iconOnly] - Solo el ícono, sin "Ver QR" (filas justas).
 * @param {string}  [props.className] - Clases extra del botón (p. ej. ml-auto).
 */
export default function VerQrDialog({
  reservaId,
  fecha,
  asistencia,
  actividad,
  datetime,
  iconOnly = false,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState(null);

  const hoy = todayISO();
  const blocked = asistencia || fecha !== hoy;

  const handleClick = async () => {
    if (asistencia) {
      toast.error("Este código QR ya ha sido utilizado");
      return;
    }
    if (fecha > hoy) {
      toast.info("El QR estará disponible el día del turno");
      return;
    }
    if (fecha < hoy) {
      toast.error("Este código QR ya ha expirado");
      return;
    }
    setQr(null);
    setOpen(true);
    try {
      const data = await getReservaQr(reservaId);
      setQr(data.qr);
    } catch (err) {
      setOpen(false);
      toast.error(err?.message ?? "No se pudo generar el código QR.");
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        aria-disabled={blocked}
        aria-label="Ver QR"
        title={iconOnly ? "Ver QR" : undefined}
        className={cn(
          blocked
            ? "opacity-50 text-on-surface-variant border-outline-variant hover:bg-transparent hover:text-on-surface-variant"
            : "text-on-surface border-outline-variant hover:bg-surface-container-high",
          className,
        )}
      >
        <QrCode className="size-4" strokeWidth={2} />
        {!iconOnly && "Ver QR"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tu código de asistencia</DialogTitle>
            <DialogDescription>
              Mostrá este QR en la recepción para registrar tu asistencia a{" "}
              {actividad}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-md">
            {/* Fondo blanco fijo: el QR tiene que escanear bien en modo oscuro. */}
            <div className="bg-white rounded-xl p-4 border border-outline-variant">
              {qr ? (
                <img
                  src={qr}
                  alt={`Código QR de asistencia de ${actividad}`}
                  className="size-56"
                />
              ) : (
                <div className="size-56 flex items-center justify-center text-sm text-neutral-500">
                  Generando código…
                </div>
              )}
            </div>
            {datetime && (
              <div className="flex items-center gap-2 text-label-sm text-on-surface-variant">
                <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                <span>{datetime}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
