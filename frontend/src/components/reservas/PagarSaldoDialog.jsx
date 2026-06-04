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
import { crearCheckoutSaldo } from "@/components/reservas/api";
import { formatPrice } from "@/lib/utils";

/**
 * Modal de confirmación para abonar el saldo restante de una reserva señada.
 * Al confirmar genera la preferencia de Checkout Pro y redirige a Mercado Pago;
 * el saldo se registra al volver a /pago/exito?accion=completar.
 *
 * @param {object}      props
 * @param {React.ReactNode} props.trigger  - Botón que abre el modal (se envuelve en DialogTrigger asChild).
 * @param {number}      props.reservaId    - Reserva a la que se le abona el saldo.
 * @param {string}      props.actividad    - Nombre de la actividad (para el copy).
 * @param {string}      props.datetime     - Fecha y hora ya formateadas del turno.
 * @param {number}      props.precio       - Precio total de la clase.
 * @param {number}      props.sena         - Seña ya abonada.
 */
export default function PagarSaldoDialog({
  trigger,
  reservaId,
  actividad,
  datetime,
  precio,
  sena,
}) {
  // El saldo restante es el precio menos lo ya cobrado (la seña).
  const restante = Number(precio) - Number(sena);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePagarSaldo = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { init_point } = await crearCheckoutSaldo(reservaId);
      // Redirige al Checkout Pro; el saldo se registra al volver a /pago/exito.
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
          <DialogTitle>Completar pago</DialogTitle>
          <DialogDescription>
            Vas a abonar el saldo restante de tu reserva de {actividad}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-md">
          {datetime && (
            <div className="flex items-center gap-3 text-label-sm text-on-surface-variant">
              <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
              <span>{datetime}</span>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-outline-variant pt-3 text-body-md text-on-surface-variant">
            <div className="flex justify-between">
              <span>Precio de la clase</span>
              <span className="text-on-surface">{formatPrice(precio)}</span>
            </div>
            <div className="flex justify-between">
              <span>Seña abonada</span>
              <span className="text-on-surface">{formatPrice(sena)}</span>
            </div>
          </div>

          <div className="flex items-end justify-between border-t border-outline-variant pt-3">
            <div className="flex flex-col">
              <span className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
                Saldo a pagar
              </span>
              <span className="text-headline-md text-primary leading-none">
                {formatPrice(restante)}
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
          <Button onClick={handlePagarSaldo} disabled={submitting}>
            {submitting ? "Redirigiendo…" : "Pagar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
