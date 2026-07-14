import { useState } from "react";
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
 * Modal para salir de la lista de espera de un turno (o de un abono en espera).
 * Reusa `cancelarCheckout`, que da de baja la fila —o el grupo mensual completo—
 * sin cobros ni penalización. No interactúa con Mercado Pago.
 *
 * @param {object}          props
 * @param {React.ReactNode} props.trigger    - Botón que abre el modal (DialogTrigger asChild).
 * @param {number}          props.reservaId  - Fila en espera (identifica el grupo si es mensual).
 * @param {string}          props.actividad  - Nombre de la actividad (para el copy).
 * @param {(id: number) => void} [props.onCancelled] - Callback tras salir de la lista.
 */
export default function SalirEsperaDialog({
  trigger,
  reservaId,
  actividad,
  onCancelled,
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSalir = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await cancelarCheckout(reservaId);
      setOpen(false);
      onCancelled?.(reservaId);
      toast.success("Saliste de la lista de espera.");
    } catch (err) {
      toast.error(err?.message ?? "No se pudo salir de la lista de espera.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salir de la lista de espera</DialogTitle>
          <DialogDescription>
            ¿Seguro que querés salir de la lista de espera de {actividad}? No se
            cobró nada y podés volver a anotarte más adelante.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Volver
            </Button>
          </DialogClose>
          <Button
            onClick={handleSalir}
            disabled={submitting}
            className="bg-error text-white hover:bg-error/90"
          >
            {submitting ? "Saliendo…" : "Salir de la lista"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
