import { useEffect, useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";
import {
  DIA_TO_INDEX,
  diaLabelMinuscula,
  formatHora,
  mondayIndex,
  toISODate,
} from "@/lib/fecha";
import { deleteTurno } from "./api";

// Fechas (ISO) en las que ocurre el turno desde hoy hasta fin del mes en
// curso, sin las ya dadas de baja. La baja puntual opera solo sobre el mes
// corriente (el backend valida lo mismo).
function ocurrenciasDelMes(turno) {
  const objetivo = DIA_TO_INDEX[turno.dia_semana];
  const bloqueadas = new Set(turno.fechas_bloqueadas ?? []);
  const fecha = new Date();
  const mes = fecha.getMonth();
  fecha.setDate(fecha.getDate() + ((objetivo - mondayIndex(fecha) + 7) % 7));

  const fechas = [];
  while (fecha.getMonth() === mes) {
    const iso = toISODate(fecha);
    if (!bloqueadas.has(iso)) fechas.push(iso);
    fecha.setDate(fecha.getDate() + 7);
  }
  return fechas;
}

// "13/07/2026" a partir de YYYY-MM-DD, sin pasar por Date (evita desfases).
function fechaLabel(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function DeleteTurnoDialog({
  open,
  onOpenChange,
  turno,
  onDeleted,
}) {
  const [modo, setModo] = useState("todas");
  const [fecha, setFecha] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const ocurrencias = useMemo(
    () => (turno ? ocurrenciasDelMes(turno) : []),
    [turno],
  );

  useEffect(() => {
    if (open) {
      setModo("todas");
      setFecha("");
    }
  }, [open]);

  const handleDelete = async () => {
    if (!turno) return;
    setSubmitting(true);
    try {
      await deleteTurno(turno.id, modo === "fecha" ? fecha : undefined);
      onDeleted?.(turno, modo === "fecha" ? fecha : undefined);
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const dayLabel = turno ? diaLabelMinuscula(turno.dia_semana) : "";

  const opciones = [
    {
      value: "todas",
      label: "Todas las fechas futuras",
      detail: "El turno deja de dictarse definitivamente.",
    },
    {
      value: "fecha",
      label: "Una fecha específica",
      detail: "Solo se da de baja el día elegido.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar turno</DialogTitle>
          <DialogDescription>
            {turno ? (
              <>
                Elegí qué dar de baja del turno de{" "}
                <span className="font-semibold text-on-surface">
                  {dayLabel} a las {formatHora(turno.hora)}
                </span>
                . Si hay inscriptos, se les reembolsa lo abonado.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Alcance de la baja">
          {opciones.map((opcion) => (
            <label
              key={opcion.value}
              className={cn(
                "flex items-start gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-colors",
                modo === opcion.value
                  ? "border-primary bg-primary/5"
                  : "border-outline-variant hover:bg-surface-container-high",
              )}
            >
              <input
                type="radio"
                name="delete-turno-modo"
                value={opcion.value}
                checked={modo === opcion.value}
                onChange={() => setModo(opcion.value)}
                className="mt-1 accent-primary"
              />
              <span className="flex flex-col">
                <span className="text-body-md text-on-surface">
                  {opcion.label}
                </span>
                <span className="text-label-sm text-on-surface-variant">
                  {opcion.detail}
                </span>
              </span>
            </label>
          ))}
        </div>

        {modo === "fecha" &&
          (ocurrencias.length === 0 ? (
            <p className="text-label-md text-on-surface-variant bg-surface-container-high border border-outline-variant rounded-lg px-3 py-2">
              No quedan fechas de este turno en el mes en curso.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="delete-turno-fecha"
                className="text-label-md text-on-surface"
              >
                Fecha a dar de baja (mes en curso)
              </label>
              <select
                id="delete-turno-fecha"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-surface-container-high border border-outline-variant rounded-lg px-4 py-2 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
              >
                <option value="">Elegí una fecha</option>
                {ocurrencias.map((iso) => (
                  <option key={iso} value={iso}>
                    {fechaLabel(iso)}
                  </option>
                ))}
              </select>
            </div>
          ))}

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
            disabled={submitting || (modo === "fecha" && !fecha)}
          >
            {submitting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
