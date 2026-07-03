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
import { recordarRenovacionesImpagas } from "./api";

/**
 * Dialog temporal de demo: confirma y dispara a mano el recordatorio de pago
 * de renovaciones impagas que el sistema manda solo el día 10 de cada mes.
 * Sacarlo cuando la demo deje de necesitarlo.
 */
export default function RecordarRenovacionesDialog({ trigger }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await recordarRenovacionesImpagas();
      if (res.enviados > 0) {
        toast.success(
          res.enviados === 1
            ? "Se envió 1 recordatorio."
            : `Se enviaron ${res.enviados} recordatorios.`,
        );
      } else {
        toast.info("No hay renovaciones impagas para recordar.");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err?.message ?? "No se pudieron enviar los recordatorios.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recordar renovaciones impagas</DialogTitle>
          <DialogDescription>
            Le mandamos por email el recordatorio de pago a todos los clientes
            con la renovación de su abono impaga (el sistema lo hace solo el
            día 10 de cada mes).
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Enviando…" : "Enviar recordatorios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
