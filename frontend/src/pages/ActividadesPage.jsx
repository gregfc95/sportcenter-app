import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { usePageTitle } from "@/lib/usePageTitle";
import { Button } from "@/components/ui/button";
import DeleteActividadDialog from "@/components/actividades/DeleteActividadDialog";
import { getActividadIcon } from "@/components/actividades/actividadIcons";
import { listActividades } from "@/components/actividades/api";

const PRICE_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function formatPrice(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return value ?? "—";
  return PRICE_FORMATTER.format(num);
}

function padId(id) {
  return String(id).padStart(3, "0");
}

export default function ActividadesPage() {
  usePageTitle("Actividades");
  const navigate = useNavigate();

  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const fetchActividades = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listActividades();
      setActividades(data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActividades();
  }, [fetchActividades]);

  const openDelete = (actividad) => {
    setDeleting(actividad);
    setDeleteOpen(true);
  };

  const handleDeleted = (deletedItem) => {
    setActividades((prev) => prev.filter((a) => a.id !== deletedItem.id));
    toast.success("Actividad eliminada");
  };

  const count = actividades.length;
  const summaryText = useMemo(() => {
    if (loading) return "Cargando actividades...";
    if (loadError) return loadError;
    if (count === 0) return "Mostrando 0 de 0 actividades";
    return `Mostrando 1 a ${count} de ${count} ${count === 1 ? "actividad" : "actividades"}`;
  }, [loading, loadError, count]);

  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-6xl mx-auto w-full">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-gutter">
        <h2 className="text-headline-lg text-on-surface">Actividades</h2>
        <Button asChild className="self-start sm:self-auto">
          <Link to="/actividades/nueva">
            Crear Actividad
          </Link>
        </Button>
      </header>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-high/50">
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase w-16" />
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase w-24">ID</th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">
                  Nombre
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">
                  Precio
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase text-right w-40">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-lg px-md text-center text-on-surface-variant">
                    Cargando actividades...
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={5} className="py-lg px-md text-center">
                    <p className="text-destructive mb-2">{loadError}</p>
                    <Button variant="outline" size="sm" onClick={fetchActividades}>
                      Reintentar
                    </Button>
                  </td>
                </tr>
              ) : count === 0 ? (
                <tr>
                  <td colSpan={5} className="py-lg px-md text-center text-on-surface-variant">
                    Todavía no hay actividades. Creá la primera con el botón de arriba.
                  </td>
                </tr>
              ) : (
                actividades.map((actividad) => {
                  const Icon = getActividadIcon(actividad.nombre);
                  return (
                    <tr
                      key={actividad.id}
                      className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container-high/40 transition-colors"
                    >
                      <td className="py-sm px-md">
                        <Icon className="size-5 text-primary" />
                      </td>
                      <td className="py-sm px-md">
                        <Link
                          to={`/actividades/${actividad.id}`}
                          className="text-primary font-semibold hover:underline"
                        >
                          {padId(actividad.id)}
                        </Link>
                      </td>
                      <td className="py-sm px-md">
                        <Link
                          to={`/actividades/${actividad.id}`}
                          className="text-on-surface font-medium hover:text-primary transition-colors"
                        >
                          {actividad.nombre}
                        </Link>
                      </td>
                      <td className="py-sm px-md text-on-surface-variant">
                        {formatPrice(actividad.precio)}
                      </td>
                      <td className="py-sm px-md">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            asChild
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Ver turnos de ${actividad.nombre}`}
                            title="Ver turnos"
                          >
                            <Link to={`/actividades/${actividad.id}`}>
                              <CalendarDays className="size-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Editar ${actividad.nombre}`}
                            title="Editar"
                            onClick={() => navigate(`/actividades/${actividad.id}/editar`)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Eliminar ${actividad.nombre}`}
                            title="Eliminar"
                            onClick={() => openDelete(actividad)}
                            className="text-on-surface-variant hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-outline-variant bg-surface-container-low px-md py-sm text-label-sm text-on-surface-variant">
          {summaryText}
        </div>
      </div>

      <DeleteActividadDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        actividad={deleting}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
