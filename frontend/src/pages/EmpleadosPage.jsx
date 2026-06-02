import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";

import { usePageTitle } from "@/lib/usePageTitle";
import { Button } from "@/components/ui/button";
import { listEmpleados } from "@/components/empleados/api";
import { PageHeading } from "@/components/ui/page-heading";

export default function EmpleadosPage() {
  usePageTitle("Empleados");

  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchEmpleados = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listEmpleados();
      setEmpleados(data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmpleados();
  }, [fetchEmpleados]);

  const count = empleados.length;
  const summaryText = useMemo(() => {
    if (loading) return "Cargando empleados...";
    if (loadError) return loadError;
    if (count === 0) return "Mostrando 0 de 0 empleados";
    return `Mostrando 1 a ${count} de ${count} ${count === 1 ? "empleado" : "empleados"}`;
  }, [loading, loadError, count]);

  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-6xl mx-auto w-full">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-gutter">
        <div className="flex flex-col gap-1">
          <PageHeading>Gestión de Empleados</PageHeading>
          <p className="text-on-surface-variant text-sm">
            Administra el directorio del personal y sus datos de contacto.
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link to="/empleados/nuevo">
            Agregar Empleado
          </Link>
        </Button>
      </header>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-high/50">
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase w-20">ID</th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">
                  Nombre
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">
                  Apellido
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">
                  DNI
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">
                  Email
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">
                  Teléfono
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-lg px-md text-center text-on-surface-variant">
                    Cargando empleados...
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={6} className="py-lg px-md text-center">
                    <p className="text-destructive mb-2">{loadError}</p>
                    <Button variant="outline" size="sm" onClick={fetchEmpleados}>
                      Reintentar
                    </Button>
                  </td>
                </tr>
              ) : count === 0 ? (
                <tr>
                  <td colSpan={6} className="py-lg px-md text-center text-on-surface-variant">
                    Todavía no hay empleados. Agregá el primero con el botón de arriba.
                  </td>
                </tr>
              ) : (
                empleados.map((empleado) => (
                  <tr
                    key={empleado.id}
                    className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container-high/40 transition-colors"
                  >
                    <td className="py-sm px-md text-primary font-semibold">
                      {empleado.id}
                    </td>
                    <td className="py-sm px-md text-on-surface font-medium">
                      {empleado.first_name}
                    </td>
                    <td className="py-sm px-md text-on-surface font-medium">
                      {empleado.last_name}
                    </td>
                    <td className="py-sm px-md text-on-surface-variant">
                      {empleado.dni || "—"}
                    </td>
                    <td className="py-sm px-md text-on-surface">
                      {empleado.email}
                    </td>
                    <td className="py-sm px-md text-on-surface-variant">
                      {empleado.phone || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-outline-variant bg-surface-container-low px-md py-sm text-label-sm text-on-surface-variant">
          {summaryText}
        </div>
      </div>
    </div>
  );
}
