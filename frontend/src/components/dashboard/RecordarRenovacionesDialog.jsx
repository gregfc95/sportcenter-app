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
import { listClientes } from "@/components/clientes/api";
import { listActividades, listTurnosByActividad } from "@/components/actividades/api";
import { diaLabelMinuscula, formatHora } from "@/lib/fecha";
import { notificarRecordatorioRenovacion } from "./api";

const SELECT_CLASSES =
  "w-full bg-surface-container-high border border-outline-variant rounded-lg px-4 py-2 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-ring/40";

/**
 * Dialog temporal de demo: elige un cliente y un turno y dispara a mano el
 * email "recordá renovar tu abono" que el sistema manda solo el día 10. No
 * depende de que el cliente tenga una renovación impaga real: sirve para
 * mostrar el email en una demo. Sacarlo cuando la demo deje de necesitarlo.
 */
export default function RecordarRenovacionesDialog({ trigger }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [actividadId, setActividadId] = useState("");
  const [turnoId, setTurnoId] = useState("");

  useEffect(() => {
    if (!open) {
      setClienteId("");
      setActividadId("");
      setTurnoId("");
      return;
    }
    let active = true;
    Promise.all([listClientes(), listActividades()])
      .then(([cli, act]) => {
        if (!active) return;
        setClientes(Array.isArray(cli) ? cli : []);
        setActividades(Array.isArray(act) ? act : []);
      })
      .catch((err) => {
        toast.error(err?.message ?? "No pudimos cargar los datos.");
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
      const res = await notificarRecordatorioRenovacion({
        clienteId: Number(clienteId),
        turnoId: Number(turnoId),
      });
      toast.success(`Recordatorio de renovación enviado a ${res.email}.`);
      setOpen(false);
    } catch (err) {
      toast.error(err?.message ?? "No se pudo enviar el recordatorio.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recordar renovación</DialogTitle>
          <DialogDescription>
            Le mandamos por email al cliente el recordatorio para renovar su
            abono del turno elegido.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-md">
          <div className="flex flex-col gap-2">
            <label htmlFor="recordar-renovacion-cliente" className="text-label-md text-on-surface">
              Cliente
            </label>
            <select
              id="recordar-renovacion-cliente"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className={SELECT_CLASSES}
            >
              <option value="">Elegí un cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.last_name}, {c.first_name} (DNI {c.dni})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="recordar-renovacion-actividad" className="text-label-md text-on-surface">
              Actividad
            </label>
            <select
              id="recordar-renovacion-actividad"
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
            <label htmlFor="recordar-renovacion-turno" className="text-label-md text-on-surface">
              Turno
            </label>
            <select
              id="recordar-renovacion-turno"
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
          <Button
            onClick={handleSubmit}
            disabled={submitting || !clienteId || !turnoId}
          >
            {submitting ? "Enviando…" : "Enviar recordatorio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
