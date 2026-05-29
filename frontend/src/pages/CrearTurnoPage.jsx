import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, Check, Clock, Users } from "lucide-react";
import { toast } from "sonner";

import { usePageTitle } from "@/lib/usePageTitle";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ApiError,
  createTurno,
  getActividad,
} from "@/components/actividades/api";

const DIAS = [
  { value: "lunes", label: "Lunes", short: "Lun" },
  { value: "martes", label: "Martes", short: "Mar" },
  { value: "miercoles", label: "Miércoles", short: "Mié" },
  { value: "jueves", label: "Jueves", short: "Jue" },
  { value: "viernes", label: "Viernes", short: "Vie" },
  { value: "sabado", label: "Sábado", short: "Sáb" },
  { value: "domingo", label: "Domingo", short: "Dom" },
];

function fieldShellClasses(hasError) {
  return cn(
    "flex items-center gap-2 w-full bg-surface-container-high border rounded-lg px-4 py-2 transition-colors focus-within:ring-2 focus-within:ring-ring/40",
    hasError
      ? "border-destructive focus-within:border-destructive"
      : "border-outline-variant focus-within:border-primary",
  );
}

export default function CrearTurnoPage() {
  usePageTitle("Agregar Turno");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const actividadId = Number(searchParams.get("actividad")) || null;

  const [actividad, setActividad] = useState(null);
  const [loading, setLoading] = useState(Boolean(actividadId));
  const [loadError, setLoadError] = useState(null);

  const [dia, setDia] = useState(null);
  const [hora, setHora] = useState("");
  const [cupo, setCupo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!actividadId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await getActividad(actividadId);
        if (!cancelled) setActividad(data);
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actividadId]);

  const clearError = (field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
    setFormError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const clientErrors = {};
    if (!dia) clientErrors.dia_semana = "Elegí un día.";
    if (!hora) clientErrors.hora = "Ingresá un horario.";
    const cupoNum = Number(cupo);
    if (!cupo || Number.isNaN(cupoNum) || cupoNum < 1) {
      clientErrors.cupo = "Ingresá un cupo mayor a cero.";
    }
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      await createTurno(actividadId, {
        dia_semana: dia,
        hora: `${hora}:00`,
        cupo: cupoNum,
      });
      toast.success("Turno creado");
      navigate(`/actividades/${actividadId}`);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      } else {
        setFormError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!actividadId) {
    return (
      <div className="px-margin-mobile md:px-lg mt-md md:mt-lg max-w-[600px] mx-auto w-full flex flex-col gap-md">
        <p className="text-on-surface-variant">
          Falta indicar la actividad para la que querés crear un turno.
        </p>
        <Button asChild variant="outline" className="self-start rounded-full">
          <Link to="/actividades">Volver a Actividades</Link>
        </Button>
      </div>
    );
  }

  const backHref = `/actividades/${actividadId}`;

  return (
    <div className="px-margin-mobile md:px-lg mt-md md:mt-lg w-full flex justify-center">
      <div className="w-full max-w-[600px] flex flex-col gap-lg pb-xl">
        <div className="flex flex-col gap-sm">
          <nav
            aria-label="Migas de pan"
            className="flex items-center gap-1 text-label-sm text-on-surface-variant"
          >
            <Link to="/actividades" className="hover:text-primary transition-colors">
              Actividades
            </Link>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            {actividad ? (
              <Link
                to={backHref}
                className="hover:text-primary transition-colors"
              >
                {actividad.nombre}
              </Link>
            ) : (
              <span className="opacity-60">...</span>
            )}
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <span className="text-primary">Agregar Turno</span>
          </nav>
          <div className="flex items-center gap-sm">
            <span
              aria-hidden="true"
              className="w-1.5 h-7 rounded-full bg-accent shadow-[0_0_10px_rgba(255,183,0,0.5)]"
            />
            <h2 className="text-headline-lg text-on-surface">Crear Turno</h2>
          </div>
          <p className="text-body-md text-on-surface-variant">
            Configurá un nuevo horario recurrente para esta actividad.
          </p>
        </div>

        {loading ? (
          <div className="bg-surface-container border border-outline-variant rounded-xl p-lg text-on-surface-variant">
            Cargando actividad...
          </div>
        ) : loadError ? (
          <div className="bg-surface-container border border-outline-variant rounded-xl p-lg flex flex-col gap-sm">
            <p className="text-destructive">{loadError}</p>
            <Button asChild variant="outline" className="self-start rounded-full">
              <Link to="/actividades">Volver a Actividades</Link>
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="relative overflow-hidden bg-surface-container border border-outline-variant rounded-xl shadow-lg p-lg flex flex-col gap-md"
          >
            <div
              aria-hidden="true"
              className="absolute -top-12 -right-12 w-32 h-32 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none"
            />

            <div className="relative z-10 flex flex-col gap-2">
              <Label>Día de la semana</Label>
              <div
                role="radiogroup"
                aria-label="Día de la semana"
                className="grid grid-cols-4 sm:grid-cols-7 gap-2"
              >
                {DIAS.map((d) => {
                  const selected = dia === d.value;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setDia(d.value);
                        clearError("dia_semana");
                      }}
                      className={cn(
                        "py-3 px-1 rounded-xl border text-center text-label-md transition-all cursor-pointer",
                        selected
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                          : "border-outline-variant bg-surface-container-high text-on-surface-variant hover:border-primary/40 hover:text-on-surface",
                      )}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
              {fieldErrors.dia_semana && (
                <p role="alert" className="text-destructive text-label-sm">
                  {fieldErrors.dia_semana}
                </p>
              )}
            </div>

            <div className="relative z-10 flex flex-col gap-2">
              <Label htmlFor="turno-hora">Horario</Label>
              <div className={fieldShellClasses(Boolean(fieldErrors.hora))}>
                <Clock className="size-4 text-on-surface-variant shrink-0" />
                <input
                  id="turno-hora"
                  type="time"
                  value={hora}
                  onChange={(e) => {
                    setHora(e.target.value);
                    clearError("hora");
                  }}
                  className="flex-1 outline-none bg-transparent text-on-surface text-body-md"
                />
              </div>
              {fieldErrors.hora && (
                <p role="alert" className="text-destructive text-label-sm">
                  {fieldErrors.hora}
                </p>
              )}
            </div>

            <div className="relative z-10 flex flex-col gap-2">
              <Label htmlFor="turno-cupo">Cupo máximo</Label>
              <div className={fieldShellClasses(Boolean(fieldErrors.cupo))}>
                <Users className="size-4 text-on-surface-variant shrink-0" />
                <input
                  id="turno-cupo"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={cupo}
                  onChange={(e) => {
                    setCupo(e.target.value);
                    clearError("cupo");
                  }}
                  placeholder="Ej: 20"
                  className="flex-1 outline-none bg-transparent text-on-surface text-body-md placeholder:text-on-surface-variant/50"
                />
              </div>
              {fieldErrors.cupo && (
                <p role="alert" className="text-destructive text-label-sm">
                  {fieldErrors.cupo}
                </p>
              )}
            </div>

            {formError && (
              <p
                role="alert"
                className="relative z-10 text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-label-md"
              >
                {formError}
              </p>
            )}

            <hr className="border-outline-variant my-1 relative z-10" />

            <div className="relative z-10 flex items-center justify-end gap-sm">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full"
                disabled={submitting}
              >
                <Link to={backHref}>Cancelar</Link>
              </Button>
              <Button
                type="submit"
                size="lg"
                className="rounded-full"
                disabled={submitting}
              >
                <Check className="size-4" />
                {submitting ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
