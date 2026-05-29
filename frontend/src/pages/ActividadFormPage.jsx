import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { usePageTitle } from "@/lib/usePageTitle";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ApiError,
  createActividad,
  getActividad,
  updateActividad,
} from "@/components/actividades/api";

const EMPTY = { nombre: "", precio: "" };

function fieldClasses(hasError) {
  return cn(
    "w-full bg-surface-container-high border rounded-lg px-4 py-2 text-on-surface text-body-md outline-none transition-colors placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-ring/40",
    hasError ? "border-destructive focus:border-destructive" : "border-outline-variant focus:border-primary",
  );
}

export default function ActividadFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  usePageTitle(isEdit ? "Editar actividad" : "Nueva actividad");

  const [values, setValues] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await getActividad(id);
        if (!cancelled) {
          setValues({
            nombre: data.nombre ?? "",
            precio: data.precio ?? "",
          });
        }
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const handleChange = (field) => (e) => {
    const next = e.target.value;
    setValues((prev) => ({ ...prev, [field]: next }));
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

    const nombre = values.nombre.trim();
    const precioRaw = values.precio.toString().trim();
    const precioNum = Number(precioRaw);

    const clientErrors = {};
    if (!nombre) clientErrors.nombre = "Ingresá un nombre para la actividad.";
    if (!precioRaw || Number.isNaN(precioNum) || precioNum <= 0) {
      clientErrors.precio = "Ingresá un precio válido mayor a cero.";
    }
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = { nombre, precio: precioNum.toFixed(2) };
      if (isEdit) {
        await updateActividad(id, payload);
        toast.success("Actividad actualizada");
      } else {
        await createActividad(payload);
        toast.success("Actividad creada");
      }
      navigate("/actividades");
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

  const heading = isEdit ? "Editar Actividad" : "Crear Actividad";
  const subtitle = isEdit
    ? "Actualizá los datos de esta disciplina."
    : "Define una nueva disciplina para el complejo deportivo.";
  const breadcrumbCurrent = isEdit ? "Editar Actividad" : "Nueva Actividad";

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
            <span className="text-primary">{breadcrumbCurrent}</span>
          </nav>
          <div className="flex items-center gap-sm">
            <span
              aria-hidden="true"
              className="w-1.5 h-7 rounded-full bg-accent shadow-[0_0_10px_rgba(255,183,0,0.5)]"
            />
            <h2 className="text-headline-lg text-on-surface">{heading}</h2>
          </div>
          <p className="text-body-md text-on-surface-variant">{subtitle}</p>
        </div>

        {loading ? (
          <div className="bg-surface-container border border-outline-variant rounded-xl p-lg text-on-surface-variant">
            Cargando actividad...
          </div>
        ) : loadError ? (
          <div className="bg-surface-container border border-outline-variant rounded-xl p-lg flex flex-col gap-sm">
            <p className="text-destructive">{loadError}</p>
            <Button asChild variant="outline" className="self-start">
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
              <Label htmlFor="actividad-nombre">Nombre de la Actividad</Label>
              <input
                id="actividad-nombre"
                type="text"
                value={values.nombre}
                onChange={handleChange("nombre")}
                placeholder="Ej: Fútbol, Tenis, Natación"
                className={fieldClasses(Boolean(fieldErrors.nombre))}
                aria-invalid={Boolean(fieldErrors.nombre) || undefined}
                aria-describedby={fieldErrors.nombre ? "actividad-nombre-error" : undefined}
                autoFocus
              />
              {fieldErrors.nombre && (
                <p
                  id="actividad-nombre-error"
                  className="text-destructive text-label-sm"
                  role="alert"
                >
                  {fieldErrors.nombre}
                </p>
              )}
            </div>

            <div className="relative z-10 flex flex-col gap-2">
              <Label htmlFor="actividad-precio">Precio</Label>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-label-md"
                >
                  $
                </span>
                <input
                  id="actividad-precio"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={values.precio}
                  onChange={handleChange("precio")}
                  placeholder="0.00"
                  className={cn(fieldClasses(Boolean(fieldErrors.precio)), "pl-8")}
                  aria-invalid={Boolean(fieldErrors.precio) || undefined}
                  aria-describedby={fieldErrors.precio ? "actividad-precio-error" : undefined}
                />
              </div>
              {fieldErrors.precio && (
                <p
                  id="actividad-precio-error"
                  className="text-destructive text-label-sm"
                  role="alert"
                >
                  {fieldErrors.precio}
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
                disabled={submitting}
              >
                <Link to="/actividades">Cancelar</Link>
              </Button>
              <Button
                type="submit"
                size="lg"
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
