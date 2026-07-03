import { useEffect, useState } from "react";
import { CalendarDays, Handshake, Wallet } from "lucide-react";
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
import {
  crearCheckoutSaldo,
  getCreditoAplicable,
} from "@/components/reservas/api";
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
 * @param {number}      props.precio       - Precio total de la clase (bloqueado al momento de la seña).
 * @param {number}      props.sena         - Seña ya abonada.
 * @param {number}      props.saldo        - Saldo restante a pagar (lo calcula el backend).
 * @param {() => void}  [props.onPagado]   - Se llama tras pagar 100% con crédito (sin MP), para refrescar la vista.
 */
export default function PagarSaldoDialog({
  trigger,
  reservaId,
  actividad,
  datetime,
  precio,
  sena,
  saldo,
  onPagado,
}) {
  // El saldo lo calcula el backend sobre el precio bloqueado y lo ya cobrado;
  // si no llegara, se reconstruye como precio − seña por compatibilidad.
  const restante = saldo != null ? Number(saldo) : Number(precio) - Number(sena);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [creditoDisponible, setCreditoDisponible] = useState(0);

  const descuentoCredito = Math.min(creditoDisponible, restante);
  const totalFinal = restante - descuentoCredito;
  const cubiertoConCredito = totalFinal === 0 && descuentoCredito > 0;

  // Crédito a favor de la actividad, para descontarlo en la vista previa.
  useEffect(() => {
    if (!open) return;
    let active = true;
    getCreditoAplicable({ reservaId })
      .then((data) => {
        if (active) setCreditoDisponible(data?.saldo_disponible ?? 0);
      })
      .catch(() => {
        if (active) setCreditoDisponible(0);
      });
    return () => {
      active = false;
    };
  }, [open, reservaId]);

  const handlePagarSaldo = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const resp = await crearCheckoutSaldo(reservaId);
      // Crédito cubrió el saldo: ya quedó registrado, sin pasar por MP.
      if (resp.pagado_con_credito) {
        toast.success("Pago completado con tu crédito a favor.");
        setOpen(false);
        onPagado?.();
        return;
      }
      // Redirige al Checkout Pro; el saldo se registra al volver a /pago/exito.
      window.location.href = resp.init_point;
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
            {descuentoCredito > 0 && (
              <div className="flex justify-between text-credit-violet">
                <span>Crédito a favor</span>
                <span>−{formatPrice(descuentoCredito)}</span>
              </div>
            )}
          </div>

          <div className="flex items-end justify-between border-t border-outline-variant pt-3">
            <div className="flex flex-col">
              <span className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
                Saldo a pagar
              </span>
              <span className="text-headline-md text-primary leading-none">
                {formatPrice(totalFinal)}
              </span>
            </div>
            {cubiertoConCredito ? (
              <div className="flex items-center gap-1 bg-credit-violet/10 px-3 py-1.5 rounded-full border border-credit-violet/30">
                <Wallet className="size-4 text-credit-violet" />
                <span className="text-label-sm font-bold text-credit-violet">
                  Crédito a favor
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-[#009EE3]/10 px-3 py-1.5 rounded-full border border-[#009EE3]/30">
                <Handshake className="size-4 text-[#009EE3]" />
                <span className="text-label-sm font-bold text-[#009EE3]">
                  MercadoPago
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handlePagarSaldo} disabled={submitting}>
            {submitting
              ? cubiertoConCredito
                ? "Confirmando…"
                : "Redirigiendo…"
              : "Pagar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
