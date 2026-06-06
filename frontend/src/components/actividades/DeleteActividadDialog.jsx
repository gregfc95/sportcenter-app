import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteActividad } from "./api";

export default function DeleteActividadDialog({
  open,
  onOpenChange,
  actividad,
  onDeleted,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    if (!actividad) return;
    setError(null);
    setSubmitting(true);
    try {
      await deleteActividad(actividad.id);
      onDeleted?.(actividad);
      onOpenChange(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar actividad</DialogTitle>
          <DialogDescription>
            {actividad ? (
              <>
                ¿Seguro que querés eliminar{" "}
                <span className="font-semibold text-on-surface">{actividad.nombre}</span>?
                Se eliminarán también sus turnos y las reservas vigentes se
                cancelarán y reembolsarán automáticamente. Esta acción no se
                puede deshacer.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p
            role="alert"
            className="text-label-md text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2"
          >
            {error}
          </p>
        )}

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
