import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, CalendarX2, ChevronRight, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";

import { usePageTitle } from "@/lib/usePageTitle";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import TurnoCard from "@/components/actividades/TurnoCard";
import DeleteTurnoDialog from "@/components/actividades/DeleteTurnoDialog";
import { getActividadIcon } from "@/components/actividades/actividadIcons";
import {
  getActividad,
  listTurnosByActividad,
} from "@/components/actividades/api";
import { authHeaders } from "@/lib/apiClient";


const DAYS = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miércoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
];

function groupByDay(turnos) {
  const grouped = Object.fromEntries(DAYS.map((d) => [d.key, []]));
  for (const turno of turnos) {
    const list = grouped[turno.dia_semana];
    if (list) list.push(turno);
  }
  for (const list of Object.values(grouped)) {
    list.sort((a, b) => a.hora.localeCompare(b.hora));
  }
  return grouped;
}

function ModalModificar({ turno, actividadNombre, onCerrar, onGuardado }) {
  const [cupo, setCupo] = useState(turno.cupo);
  const [errorCupo, setErrorCupo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");

  const validarCupo = (valor) => {
    const n = parseInt(valor, 10);
    if (isNaN(n) || n < 1) return "El cupo mínimo es 1.";
    return "";
  };

  const handleCupoChange = (e) => {
    setCupo(e.target.value);
    setErrorCupo(validarCupo(e.target.value));
  };

  const handleGuardar = async () => {
    const err = validarCupo(cupo);
    if (err) { setErrorCupo(err); return; }

    setGuardando(true);
    setErrorGuardar("");
    try {
      const res = await fetch(`/api/turnos/${turno.id}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          cupo: parseInt(cupo, 10),
          dia_semana: turno.dia_semana,
          hora: turno.hora,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.log("Error response:", data);
        throw new Error(data.error || "Error al guardar.");
      }
      const turnoActualizado = await res.json();
      onGuardado(turnoActualizado);
      onCerrar();
    } catch (e) {
      setErrorGuardar(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-outline-variant bg-surface p-6 shadow-xl">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-black text-foreground">Modificar turno</h2>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {actividadNombre} · {turno.dia_semana} · {turno.hora?.slice(0, 5)}
            </p>
          </div>
          <button onClick={onCerrar} className="rounded-lg p-1.5 hover:bg-surface-container transition-all cursor-pointer">
            <X size={16} className="text-on-surface-variant" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold text-on-surface mb-1.5">Cupo máximo</label>
          <input
            type="number"
            min={1}
            value={cupo}
            onChange={handleCupoChange}
            className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          />
          {errorCupo && (
            <p className="flex items-center gap-1 mt-1.5 text-xs text-red-600">
              <AlertCircle size={12} /> {errorCupo}
            </p>
          )}
        </div>

        {errorGuardar && (
          <p className="flex items-center gap-1 mb-4 text-xs text-red-600">
            <AlertCircle size={12} /> {errorGuardar}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCerrar}
            className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface hover:bg-surface-container transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando || !!errorCupo}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Save size={13} />
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ActividadDetailPage() {
  const { id } = useParams();

  const [actividad, setActividad] = useState(null);
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTurno, setDeletingTurno] = useState(null);
  const [editingTurno, setEditingTurno] = useState(null);

  usePageTitle(actividad?.nombre ?? "Actividad");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [actividadData, turnosData] = await Promise.all([
        getActividad(id),
        listTurnosByActividad(id),
      ]);
      setActividad(actividadData);
      setTurnos(turnosData);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const grouped = useMemo(() => groupByDay(turnos), [turnos]);
  const hasTurnos = turnos.length > 0;

  const handleEditTurno = (turno) => {
    setEditingTurno(turno);
  };

  const handleTurnoUpdated = (turnoActualizado) => {
    setTurnos((prev) =>
      prev.map((t) => (t.id === turnoActualizado.id ? { ...t, ...turnoActualizado } : t))
    );
    toast.success("Turno modificado");
  };

  const handleDeleteTurnoRequest = (turno) => {
    setDeletingTurno(turno);
    setDeleteOpen(true);
  };

  const handleTurnoDeleted = (turno) => {
    setTurnos((prev) => prev.filter((t) => t.id !== turno.id));
    toast.success("Turno eliminado");
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-6xl mx-auto w-full">
        <p className="text-on-surface-variant">Cargando actividad...</p>
      </div>
    );
  }

  if (loadError || !actividad) {
    return (
      <div className="flex flex-col gap-md px-margin-mobile md:px-lg mt-md md:mt-lg max-w-6xl mx-auto w-full">
        <p className="text-destructive">
          {loadError ?? "No se encontró la actividad."}
        </p>
        <Button asChild variant="outline" className="self-start">
          <Link to="/actividades">Volver a Actividades</Link>
        </Button>
      </div>
    );
  }

  const Icon = getActividadIcon(actividad.nombre);

  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-6xl mx-auto w-full pb-xl">
      <nav
        aria-label="Migas de pan"
        className="flex items-center gap-1 text-label-md text-on-surface-variant"
      >
        <Link to="/actividades" className="hover:text-primary transition-colors">
          Actividades
        </Link>
        <ChevronRight className="size-4" aria-hidden="true" />
        <span className="text-on-surface">{actividad.nombre}</span>
      </nav>

      <section className="bg-surface-container border border-outline-variant rounded-xl p-md md:p-lg relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none"
        />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-md">
          <div className="flex flex-col md:flex-row gap-md md:gap-lg md:items-center w-full">
            <div className="w-16 h-16 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-center shrink-0">
              <Icon className="size-8 text-primary" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md md:gap-xl w-full">
              <div>
                <p className="text-label-sm text-on-surface-variant mb-1">
                  Nombre
                </p>
                <p className="text-headline-md text-on-surface">
                  {actividad.nombre}
                </p>
              </div>
              <div>
                <p className="text-label-sm text-on-surface-variant mb-1">
                  Precio
                </p>
                <p className="text-body-lg text-primary">
                  {formatPrice(actividad.precio)}
                </p>
              </div>
            </div>
          </div>
          <Button asChild variant="outline" className="shrink-0 self-end md:self-auto">
            <Link to={`/actividades/${actividad.id}/editar`}>
              <Pencil className="size-4" />
              Editar
            </Link>
          </Button>
        </div>
      </section>

      <section className="bg-surface-container border border-outline-variant rounded-xl flex flex-col overflow-hidden">
        <div className="p-md md:p-lg border-b border-outline-variant flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
          <div>
            <h2 className="text-headline-md text-on-surface">Turnos Semanales</h2>
            <p className="text-body-md text-on-surface-variant mt-1">
              Gestión de horarios y cupos
            </p>
          </div>
          <Button asChild size="lg" className="self-start sm:self-auto">
            <Link to={`/crear-turno?actividad=${actividad.id}`}>
              Agregar Turno
            </Link>
          </Button>
        </div>

        {hasTurnos ? (
          <div className="p-md md:p-lg overflow-x-auto">
            <div className="min-w-[800px] grid grid-cols-7 gap-2">
              {DAYS.map(({ key, label }) => (
                <div
                  key={`header-${key}`}
                  className="text-label-md text-on-surface-variant pb-md text-center border-b border-outline-variant/40"
                >
                  {label}
                </div>
              ))}
              {DAYS.map(({ key }) => {
                const dayTurnos = grouped[key];
                return (
                  <div key={`col-${key}`} className="flex flex-col gap-2 pt-2">
                    {dayTurnos.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-lg opacity-50 text-on-surface-variant">
                        <CalendarX2 className="size-5 mb-1" />
                        <p className="text-label-sm">Sin turnos</p>
                      </div>
                    ) : (
                      dayTurnos.map((turno) => (
                        <TurnoCard
                          key={turno.id}
                          turno={turno}
                          onEdit={handleEditTurno}
                          onDelete={handleDeleteTurnoRequest}
                        />
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-md md:p-lg flex flex-col items-center justify-center py-xl text-on-surface-variant">
            <CalendarX2 className="size-12 mb-3 opacity-70" />
            <p className="text-headline-md">Todavía no hay turnos.</p>
            <p className="text-body-md opacity-70 mt-1">
              Crea el primer turno con el botón de arriba.
            </p>
          </div>
        )}
      </section>

      <DeleteTurnoDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        turno={deletingTurno}
        onDeleted={handleTurnoDeleted}
      />

      {editingTurno && (
        <ModalModificar
          turno={editingTurno}
          actividadNombre={actividad.nombre}
          onCerrar={() => setEditingTurno(null)}
          onGuardado={handleTurnoUpdated}
        />
      )}
    </div>
  );
}