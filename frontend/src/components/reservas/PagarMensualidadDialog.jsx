import { useState } from "react";
import { CalendarDays, Handshake } from "lucide-react";
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
import { crearCheckoutMensualidad } from "@/components/reservas/api";
import { formatPrice } from "@/lib/utils";

/**
 * Modal de confirmación para pagar un abono mensual pendiente. Cubre el caso en
 * que el usuario cerró la ventana de Mercado Pago sin completar el pago y el
 * abono quedó pendiente: reanuda el checkout por el total de las clases del
 * mes (la mensualidad se paga completa, sin seña). Al confirmar genera la
 * preferencia de Checkout Pro y redirige a Mercado Pago; el pago se registra
 * al volver a /pago/exito.
 *
 * @param {object}          props
 * @param {React.ReactNode} props.trigger    - Botón que abre el modal (se envuelve en DialogTrigger asChild).
 * @param {number}          props.reservaId  - Cualquier reserva del abono (identifica el grupo).
 * @param {string}          props.actividad  - Nombre de la actividad (para el copy).
 * @param {string}          props.datetime   - Próxima clase ya formateada (fecha y hora).
 * @param {number}          props.clases     - Cantidad de clases del mes.
 * @param {number}          props.total      - Total de la mensualidad.
 */
export default function PagarMensualidadDialog({
  trigger,
  reservaId,
  actividad,
  datetime,
  clases,
  total,
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const precioClase = clases > 0 ? Number(total) / Number(clases) : null;

  const handlePagar = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { init_point } = await crearCheckoutMensualidad(reservaId);
      // Redirige al Checkout Pro; el pago se registra al volver a /pago/exito.
      window.location.href = init_point;
    } catch (err) {
      toast.error(err?.message ?? "No se pudo iniciar el pago.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar mensualidad</DialogTitle>
          <DialogDescription>
            Vas a abonar la mensualidad completa de tu abono de {actividad}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-md">
          {datetime && (
            <div className="flex items-center gap-3 text-label-sm text-on-surface-variant">
              <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
              <span>Próxima clase: {datetime}</span>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-outline-variant pt-3 text-body-md text-on-surface-variant">
            {precioClase != null && (
              <div className="flex justify-between">
                <span>Precio por clase</span>
                <span className="text-on-surface">
                  {formatPrice(precioClase)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Clases del mes</span>
              <span className="text-on-surface">{clases}</span>
            </div>
          </div>

          <div className="flex items-end justify-between border-t border-outline-variant pt-3">
            <div className="flex flex-col">
              <span className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
                Total mensualidad
              </span>
              <span className="text-headline-md text-primary leading-none">
                {formatPrice(total)}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-[#009EE3]/10 px-3 py-1.5 rounded-full border border-[#009EE3]/30">
              <Handshake className="size-4 text-[#009EE3]" />
              <span className="text-label-sm font-bold text-[#009EE3]">
                MercadoPago
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handlePagar} disabled={submitting}>
            {submitting ? "Redirigiendo…" : "Pagar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
