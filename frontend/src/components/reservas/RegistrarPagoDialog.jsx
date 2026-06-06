import { useState } from "react";
import { CalendarDays, User } from "lucide-react";
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
import { formatPrice } from "@/lib/utils";

/**
 * Modal de confirmación para registrar el pago de una reserva señada o pendiente
 * desde la vista de administración. Muestra el resumen de la reserva y el monto
 * restante a registrar (precio menos lo ya cobrado).
 *
 * El registro real todavía no está conectado: al confirmar se ejecuta `onConfirm`
 * si se provee, o se avisa que la función llega próximamente.
 *
 * @param {object}          props
 * @param {React.ReactNode} props.trigger      - Botón que abre el modal (se envuelve en DialogTrigger asChild).
 * @param {string}          [props.cliente]    - Nombre del cliente (para el copy).
 * @param {string}          props.actividad    - Nombre de la actividad.
 * @param {string}          [props.datetime]   - Fecha y hora ya formateadas del turno.
 * @param {number}          props.precio       - Precio total de la clase (bloqueado al señar).
 * @param {number}          [props.pagado]     - Monto ya cobrado de la reserva.
 * @param {number}          [props.saldo]      - Saldo restante a cobrar (lo calcula el backend).
 * @param {() => Promise<void>|void} [props.onConfirm] - Acción a ejecutar al confirmar.
 */
export default function RegistrarPagoDialog({
  trigger,
  cliente,
  actividad,
  datetime,
  precio,
  pagado = 0,
  saldo,
  onConfirm,
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Lo que falta cobrar lo calcula el backend sobre el precio bloqueado; si no
  // llegara, se reconstruye como precio − pagado por compatibilidad.
  const restante =
    saldo != null ? Number(saldo) : Math.max(0, Number(precio) - Number(pagado));

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (onConfirm) {
        await onConfirm();
      } else {
        // TODO: conectar con el registro de pago real.
        toast.info("El registro de pago llega próximamente.");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err?.message ?? "No se pudo registrar el pago.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            Vas a registrar el pago de la reserva de {actividad}
            {cliente ? ` de ${cliente}` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-md">
          {datetime && (
            <div className="flex items-center gap-3 text-label-sm text-on-surface-variant">
              <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
              <span>{datetime}</span>
            </div>
          )}
          {cliente && (
            <div className="flex items-center gap-3 text-label-sm text-on-surface-variant">
              <User className="size-4 shrink-0" aria-hidden="true" />
              <span>{cliente}</span>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-outline-variant pt-3 text-body-md text-on-surface-variant">
            <div className="flex justify-between">
              <span>Precio de la clase</span>
              <span className="text-on-surface">{formatPrice(precio)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pagado</span>
              <span className="text-on-surface">{formatPrice(pagado)}</span>
            </div>
          </div>

          <div className="flex flex-col border-t border-outline-variant pt-3">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
              Monto a registrar
            </span>
            <span className="text-headline-md text-primary leading-none">
              {formatPrice(restante)}
            </span>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Registrando…" : "Registrar pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
