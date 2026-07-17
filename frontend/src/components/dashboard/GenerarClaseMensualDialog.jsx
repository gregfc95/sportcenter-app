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
import { Label } from "@/components/ui/label";
import { mesLabel } from "@/lib/fecha";
import { generarRenovaciones } from "./api";

const SELECT_CLASSES =
  "w-full bg-surface-container-high border border-outline-variant rounded-lg px-4 py-2 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-ring/40";

// Mes actual y siguiente, únicos que acepta el backend.
function opcionesMes() {
  const hoy = new Date();
  return [0, 1].map((offset) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + offset, 1);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    return { mes: d.getMonth() + 1, label: mesLabel(iso) };
  });
}

/**
 * Dialog temporal de demo: genera a mano las renovaciones mensuales del mes
 * elegido, como hace el scheduler el día 1. Renueva los abonos pagos del mes
 * anterior al elegido; es idempotente y no pisa abonos comprados a mano.
 * Sacarlo cuando la demo deje de necesitarlo.
 */
export default function GenerarClaseMensualDialog({ trigger }) {
  const opciones = opcionesMes();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mes, setMes] = useState(opciones[0].mes);

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await generarRenovaciones({ mes });
      if (res.creadas > 0) {
        toast.success(
          res.creadas === 1
            ? "Se generó 1 clase de renovación."
            : `Se generaron ${res.creadas} clases de renovación.`,
        );
      } else {
        toast.info("No había abonos para renovar (o ya estaban generados).");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err?.message ?? "No se pudieron generar las clases mensuales.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar clase mensual</DialogTitle>
          <DialogDescription>
            Generamos las renovaciones del mes elegido como hace el sistema el
            1° de cada mes: una clase por semana para cada abono pago del mes
            anterior. Repetirlo no duplica nada.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-xs">
          <Label htmlFor="generar-mes">Mes a generar</Label>
          <select
            id="generar-mes"
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className={SELECT_CLASSES}
          >
            {opciones.map((o) => (
              <option key={o.mes} value={o.mes}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Generando…" : "Generar clases"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
