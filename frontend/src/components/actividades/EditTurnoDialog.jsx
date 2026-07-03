import { useEffect, useState } from "react";
import { Users } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { diaLabelMinuscula, formatHora } from "@/lib/fecha";
import { ApiError, updateTurno } from "./api";

export default function EditTurnoDialog({
  open,
  onOpenChange,
  turno,
  onUpdated,
}) {
  const [cupo, setCupo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState(null);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (open && turno) {
      setCupo(String(turno.cupo ?? ""));
      setFieldError(null);
      setFormError(null);
    }
  }, [open, turno]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!turno) return;
    setFieldError(null);
    setFormError(null);

    const cupoNum = Number(cupo);
    if (!cupo || Number.isNaN(cupoNum) || cupoNum < 1) {
      setFieldError("Ingresá un cupo mayor a cero.");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateTurno(turno.id, {
        dia_semana: turno.dia_semana,
        hora: turno.hora,
        cupo: cupoNum,
      });
      onUpdated?.(updated);
      toast.success("Turno actualizado con éxito");
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors?.cupo) {
        setFieldError(err.fieldErrors.cupo);
      } else {
        setFormError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const dayLabel = turno ? diaLabelMinuscula(turno.dia_semana) : "";
  const hora = turno ? formatHora(turno.hora) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-md">
          <DialogHeader>
            <DialogTitle>Editar turno</DialogTitle>
            <DialogDescription>
              {turno ? (
                <>
                  Modificá el cupo del turno de{" "}
                  <span className="font-semibold text-on-surface">
                    {dayLabel} a las {hora}
                  </span>
                  .
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-turno-cupo">Cupo máximo</Label>
            <div
              className={cn(
                "flex items-center gap-2 w-full bg-surface-container-high border rounded-lg px-4 py-2 transition-colors focus-within:ring-2 focus-within:ring-ring/40",
                fieldError
                  ? "border-destructive focus-within:border-destructive"
                  : "border-outline-variant focus-within:border-primary",
              )}
            >
              <Users className="size-4 text-on-surface-variant shrink-0" />
              <input
                id="edit-turno-cupo"
                type="number"
                min="1"
                inputMode="numeric"
                value={cupo}
                onChange={(e) => {
                  setCupo(e.target.value);
                  setFieldError(null);
                  setFormError(null);
                }}
                className="flex-1 outline-none bg-transparent text-on-surface text-body-md"
              />
            </div>
            {fieldError && (
              <p role="alert" className="text-destructive text-label-sm">
                {fieldError}
              </p>
            )}
          </div>

          {formError && (
            <p
              role="alert"
              className="text-label-md text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2"
            >
              {formError}
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
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
