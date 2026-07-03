import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { diaLabelMinuscula } from "@/lib/fecha";
import { deleteTurno } from "./api";

export default function DeleteTurnoDialog({
  open,
  onOpenChange,
  turno,
  onDeleted,
}) {
  const [submitting, setSubmitting] = useState(false);

  const handleDelete = async () => {
    if (!turno) return;
    setSubmitting(true);
    try {
      await deleteTurno(turno.id);
      onDeleted?.(turno);
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const dayLabel = turno ? diaLabelMinuscula(turno.dia_semana) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar turno</DialogTitle>
          <DialogDescription>
            {turno ? (
              <>
                ¿Seguro que querés eliminar el turno de{" "}
                <span className="font-semibold text-on-surface">
                  {dayLabel} a las {turno.hora}
                </span>
                ? Esta acción no se puede deshacer.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={submitting}
          >
            {submitting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
