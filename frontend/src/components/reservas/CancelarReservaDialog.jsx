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
import { cn } from "@/lib/utils";

// Opciones de resolución para cancelar una clase de un abono mensual con más
// de 48 h de anticipación: el cliente elige entre reembolso y crédito a favor.
const RESOLUCIONES = [
  {
    value: "reembolso",
    label: "Reembolso",
    detail: "Se te devuelve lo abonado por esta clase.",
  },
  {
    value: "credito",
    label: "Crédito a Favor",
    detail: "Queda como crédito para esta actividad.",
  },
];

/**
 * Modal de confirmación para cancelar una reserva. No interactúa con Mercado
 * Pago: al confirmar da de baja la reserva, avisa al padre vía `onCancelled`
 * para que actualice la lista y redirige a la pantalla de resultado.
 *
 * Para una clase de un abono mensual (`mensual`), la ventana de anticipación
 * es de 48 h y el cliente elige la resolución (reembolso o crédito a favor).
 * Una reserva pendiente no tiene nada abonado, así que no se ofrece beneficio.
 *
 * @param {object}          props
 * @param {React.ReactNode} props.trigger     - Botón que abre el modal (se envuelve en DialogTrigger asChild).
 * @param {number}          props.reservaId   - Reserva a cancelar.
 * @param {string}          props.actividad   - Nombre de la actividad (para el copy).
 * @param {string}          props.datetime    - Fecha y hora ya formateadas del turno.
 * @param {boolean}         [props.mensual]   - True si es una clase de un abono mensual.
 * @param {string}          [props.estado]    - Estado de pago de la reserva ("pendiente" | "senado" | "pagado").
 * @param {(id: number) => void} [props.onCancelled] - Callback tras cancelar con éxito.
 */
export default function CancelarReservaDialog({
  trigger,
  reservaId,
  actividad,
  datetime,
  mensual = false,
  estado,
  onCancelled,
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resolucion, setResolucion] = useState("reembolso");

  // Sin pago no hay nada que reembolsar ni acreditar: se cancela y listo.
  const sinPago = estado === "pendiente";
  const conBeneficio = mensual && !sinPago;

  const handleCancelar = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await cancelarReserva(
        reservaId,
        conBeneficio ? { resolucion } : {},
      );
      setOpen(false);
      onCancelled?.(reservaId);
      // La pantalla de resultado decide el copy según la resolución/monto.
      navigate("/pago/cancelado", {
        state: {
          reembolsado: !!res?.reembolsado,
          resolucion: res?.resolucion ?? null,
          monto: res?.monto ?? null,
        },
      });
    } catch (err) {
      toast.error(err?.message ?? "No se pudo cancelar la reserva.");
      setSubmitting(false);
    }
  };

  const ventana = mensual ? "48 h" : "24 h";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mensual ? "Cancelar clase del abono" : "Cancelar reserva"}
          </DialogTitle>
          <DialogDescription>
            {mensual
              ? `¿Seguro que querés cancelar esta clase de ${actividad}? El resto del abono no se modifica.`
              : `¿Seguro que querés cancelar tu reserva de ${actividad}? Esta acción no se puede deshacer.`}
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
              {sinPago
                ? "Todavía no abonaste esta reserva, así que se cancela sin reembolso ni crédito."
                : mensual
                  ? "Con más de 48 h de anticipación elegís entre reembolso o crédito a favor. Dentro de las 48 h, la cancelación no tiene reembolso ni crédito."
                  : `Con más de ${ventana} de anticipación se te reembolsa lo abonado. Dentro de las ${ventana}, la cancelación no tiene reembolso.`}
            </span>
          </div>

          {conBeneficio && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-label-sm text-on-surface-variant uppercase tracking-widest mb-2">
                Si corresponde beneficio
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {RESOLUCIONES.map((opcion) => {
                  const selected = resolucion === opcion.value;
                  return (
                    <button
                      key={opcion.value}
                      type="button"
                      onClick={() => setResolucion(opcion.value)}
                      aria-pressed={selected}
                      className={cn(
                        "flex flex-col gap-1 p-3 rounded-lg border text-left transition-colors",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-outline-variant bg-surface-container-low hover:border-primary/50",
                      )}
                    >
                      <span
                        className={cn(
                          "text-label-md",
                          selected ? "text-primary" : "text-on-surface",
                        )}
                      >
                        {opcion.label}
                      </span>
                      <span className="text-label-sm text-on-surface-variant">
                        {opcion.detail}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
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
            {submitting
              ? "Cancelando…"
              : mensual
                ? "Cancelar clase"
                : "Cancelar reserva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
