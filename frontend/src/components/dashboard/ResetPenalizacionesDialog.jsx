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
import { resetearPenalizaciones } from "./api";

/**
 * Dialog temporal de demo: confirma y pone en cero el contador de
 * penalizaciones del mes de todos los clientes, como el rollover automático
 * del 1° de cada mes. Sacarlo cuando la demo deje de necesitarlo.
 */
export default function ResetPenalizacionesDialog({ trigger }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await resetearPenalizaciones();
      if (res.borradas > 0) {
        toast.success(
          res.borradas === 1
            ? "Contador reseteado (1 penalización borrada)."
            : `Contador reseteado (${res.borradas} penalizaciones borradas).`,
        );
      } else {
        toast.info("No había penalizaciones este mes para resetear.");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err?.message ?? "No se pudo resetear el contador de penalizaciones.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resetear penalizaciones del mes</DialogTitle>
          <DialogDescription>
            Ponemos en cero el contador de penalizaciones de este mes para todos
            los clientes, como hace el sistema el 1° de cada mes. Borra las
            penalizaciones del mes en curso y no levanta suspensiones.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Reseteando…" : "Resetear contador"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
