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
import { cancelarCheckout } from "@/components/reservas/api";

/**
 * Modal de confirmación para cancelar un abono mensual pendiente completo.
 * Solo aplica mientras no hay pagos registrados: el backend cancela todas las
 * clases del grupo de una vez (un abono pagado se cancela clase por clase con
 * CancelarReservaDialog). Como no hay nada abonado, no corresponde reembolso
 * ni crédito.
 *
 * @param {object}          props
 * @param {React.ReactNode} props.trigger     - Botón que abre el modal (se envuelve en DialogTrigger asChild).
 * @param {number}          props.reservaId   - Cualquier reserva del abono (identifica el grupo).
 * @param {string}          props.actividad   - Nombre de la actividad (para el copy).
 * @param {number}          props.clases      - Cantidad de clases del mes.
 * @param {string}          [props.datetime]  - Próxima clase ya formateada (fecha y hora).
 * @param {(id: number) => void} [props.onCancelled] - Callback tras cancelar con éxito.
 */
export default function CancelarAbonoDialog({
  trigger,
  reservaId,
  actividad,
  clases,
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
      await cancelarCheckout(reservaId);
      setOpen(false);
      onCancelled?.(reservaId);
      // Sin pagos registrados no hay reembolso: la pantalla de resultado
      // muestra el copy de cancelación simple.
      navigate("/pago/cancelado", {
        state: { reembolsado: false, resolucion: null, monto: null },
      });
    } catch (err) {
      toast.error(err?.message ?? "No se pudo cancelar el abono.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar abono mensual</DialogTitle>
          <DialogDescription>
            ¿Seguro que querés cancelar tu abono de {actividad}? Se cancelan
            las {clases} clases del mes. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-md">
          {datetime && (
            <div className="flex items-center gap-3 text-label-sm text-on-surface-variant">
              <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
              <span>Próxima clase: {datetime}</span>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-lg border border-error/30 bg-error/10 p-3 text-body-md text-on-surface-variant">
            <AlertTriangle
              className="size-4 shrink-0 text-error mt-0.5"
              aria-hidden="true"
            />
            <span>
              El abono está pendiente de pago, así que no hay nada que
              reembolsar: se libera tu lugar en todas las clases del mes.
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
            {submitting ? "Cancelando…" : "Cancelar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
