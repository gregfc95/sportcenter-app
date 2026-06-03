import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cancelarReserva } from "@/components/reservas/api";

/**
 * Modal de confirmación para cancelar una reserva. No interactúa con Mercado
 * Pago: al confirmar da de baja la reserva, avisa al padre vía `onCancelled`
 * para que actualice la lista y redirige a la pantalla de resultado.
 *
 * @param {object}          props
 * @param {React.ReactNode} props.trigger     - Botón que abre el modal (se envuelve en DialogTrigger asChild).
 * @param {number}          props.reservaId   - Reserva a cancelar.
 * @param {string}          props.actividad   - Nombre de la actividad (para el copy).
 * @param {string}          props.datetime    - Fecha y hora ya formateadas del turno.
 * @param {() => void}      [props.onCancelled] - Callback tras cancelar con éxito.
 */
export default function CancelarReservaDialog({
  trigger,
  reservaId,
  actividad,
  datetime,
  onCancelled,
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleCancelar = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await cancelarReserva(reservaId);
      setOpen(false);
      onCancelled?.(reservaId);
      // La pantalla de resultado decide el copy según reembolso/monto.
      navigate("/pago/cancelado", {
        state: {
          reembolsado: !!res?.reembolsado,
          monto: res?.monto ?? null,
        },
      });
    } catch (err) {
      toast.error(err?.message ?? "No se pudo cancelar la reserva.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar reserva</DialogTitle>
          <DialogDescription>
            ¿Seguro que querés cancelar tu reserva de {actividad}? Esta acción no
            se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-md">
          {datetime && (
            <div className="flex items-center gap-3 text-label-sm text-on-surface-variant">
              <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
              <span>{datetime}</span>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-lg border border-error/30 bg-error/10 p-3 text-body-md text-on-surface-variant">
            <AlertTriangle
              className="size-4 shrink-0 text-error mt-0.5"
              aria-hidden="true"
            />
            <span>
              Con más de 24 h de anticipación se te reembolsa lo abonado. Dentro
              de las 24 h, la cancelación no tiene reembolso.
            </span>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Volver
            </Button>
          </DialogClose>
          <Button
            onClick={handleCancelar}
            disabled={submitting}
            className="bg-error text-white hover:bg-error/90"
          >
            {submitting ? "Cancelando…" : "Cancelar reserva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
