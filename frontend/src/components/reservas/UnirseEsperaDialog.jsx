import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Users } from "lucide-react";
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
} from "@/components/ui/dialog";
import { unirseListaEspera } from "@/components/reservas/api";

/**
 * Modal de confirmación para anotarse en la lista de espera de un turno lleno.
 * Es controlado (open/onOpenChange): lo usa NuevaReservaPage tanto al elegir un
 * horario lleno como al recibir un 409 al confirmar (p. ej. un abono cuyo mes
 * tiene alguna clase llena). No cobra nada; al confirmar navega a Mis Turnos.
 *
 * @param {object}   props
 * @param {boolean}  props.open
 * @param {(v: boolean) => void} props.onOpenChange
 * @param {number}   props.turnoId
 * @param {string}   props.fecha       - Fecha elegida (YYYY-MM-DD).
 * @param {string}   props.tipo        - "eventual" | "mensual".
 * @param {string}   props.actividad   - Nombre de la actividad (para el copy).
 */
export default function UnirseEsperaDialog({
  open,
  onOpenChange,
  turnoId,
  fecha,
  tipo,
  actividad,
}) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const esMensual = tipo === "mensual";

  const handleAnotarse = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await unirseListaEspera({ turno_id: turnoId, fecha, tipo });
      toast.success("Quedaste anotado en la lista de espera.");
      onOpenChange?.(false);
      navigate("/mis-turnos");
    } catch (err) {
      toast.error(err?.message ?? "No pudimos anotarte en la lista de espera.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lista de espera</DialogTitle>
          <DialogDescription>
            {esMensual
              ? `El abono de ${actividad} tiene alguna clase del mes sin lugar.`
              : `El turno de ${actividad} está lleno.`}{" "}
            Podés anotarte en la lista de espera.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-body-md text-on-surface-variant">
          <div className="flex items-start gap-3">
            <Users className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              No se cobra nada hasta que se libere un lugar. Los abonos
              mensuales tienen prioridad sobre las reservas eventuales.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Cuando se libere un lugar te avisamos por email y vas a tener una
              hora para pagarlo desde Mis Turnos. Si no llegás, el lugar pasa al
              siguiente y conservás tu posición.
            </span>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleAnotarse} disabled={submitting}>
            {submitting ? "Anotándote…" : "Anotarme en la lista"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
