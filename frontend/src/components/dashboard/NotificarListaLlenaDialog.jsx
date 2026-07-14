import { useEffect, useState } from "react";
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
import { listActividades, listTurnosByActividad } from "@/components/actividades/api";
import { diaLabelMinuscula, formatHora } from "@/lib/fecha";
import { notificarListaEsperaLlena } from "./api";

const SELECT_CLASSES =
  "w-full bg-surface-container-high border border-outline-variant rounded-lg px-4 py-2 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-ring/40";

/**
 * Dialog temporal de demo: elige un turno y dispara a mano el email "lista de
 * espera llena" que el sistema manda solo a los admins cuando la cola de una
 * clase llega al tope. Sacarlo cuando la demo deje de necesitarlo.
 */
export default function NotificarListaLlenaDialog({ trigger }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actividades, setActividades] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [actividadId, setActividadId] = useState("");
  const [turnoId, setTurnoId] = useState("");

  useEffect(() => {
    if (!open) {
      setActividadId("");
      setTurnoId("");
      return;
    }
    let active = true;
    listActividades()
      .then((act) => {
        if (active) setActividades(Array.isArray(act) ? act : []);
      })
      .catch((err) => {
        toast.error(err?.message ?? "No pudimos cargar las actividades.");
      });
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    setTurnos([]);
    setTurnoId("");
    if (!actividadId) return;
    let active = true;
    listTurnosByActividad(actividadId)
      .then((data) => {
        if (active) setTurnos(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        toast.error(err?.message ?? "No pudimos cargar los turnos.");
      });
    return () => {
      active = false;
    };
  }, [actividadId]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await notificarListaEsperaLlena({ turnoId: Number(turnoId) });
      toast.success(`Aviso enviado a ${res.enviados} administrador(es).`);
      setOpen(false);
    } catch (err) {
      toast.error(err?.message ?? "No se pudo enviar el aviso.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notificar lista de espera llena</DialogTitle>
          <DialogDescription>
            Les avisamos por email a los administradores que la lista de espera
            del turno elegido llegó al tope.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-md">
          <div className="flex flex-col gap-2">
            <label htmlFor="lista-llena-actividad" className="text-label-md text-on-surface">
              Actividad
            </label>
            <select
              id="lista-llena-actividad"
              value={actividadId}
              onChange={(e) => setActividadId(e.target.value)}
              className={SELECT_CLASSES}
            >
              <option value="">Elegí una actividad</option>
              {actividades.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="lista-llena-turno" className="text-label-md text-on-surface">
              Turno
            </label>
            <select
              id="lista-llena-turno"
              value={turnoId}
              onChange={(e) => setTurnoId(e.target.value)}
              disabled={!actividadId}
              className={SELECT_CLASSES}
            >
              <option value="">
                {actividadId ? "Elegí un turno" : "Elegí una actividad primero"}
              </option>
              {turnos.map((t) => (
                <option key={t.id} value={t.id}>
                  {diaLabelMinuscula(t.dia_semana)} a las {formatHora(t.hora)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={submitting || !turnoId}>
            {submitting ? "Enviando…" : "Enviar aviso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
