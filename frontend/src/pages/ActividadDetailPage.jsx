import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarX2, ChevronRight, Pencil, Plus } from "lucide-react";
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

export default function ActividadDetailPage() {
  const { id } = useParams();

  const [actividad, setActividad] = useState(null);
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTurno, setDeletingTurno] = useState(null);

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
    </div>
  );
}
