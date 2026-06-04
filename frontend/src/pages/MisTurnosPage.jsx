import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarX2 } from "lucide-react";

import { usePageTitle } from "@/lib/usePageTitle";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { listMisReservas } from "@/components/reservas/api";

const DIAS = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

function formatFecha(fechaStr) {
  const [year, month, day] = fechaStr.split("-");
  return `${day}/${month}/${year}`;
}

export default function MisTurnosPage() {
  usePageTitle("Mis Turnos");

  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchTurnos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listMisReservas();
      setTurnos(data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTurnos();
  }, [fetchTurnos]);

  const count = turnos.length;
  const summaryText = useMemo(() => {
    if (loading) return "Cargando turnos...";
    if (loadError) return loadError;
    if (count === 0) return "Mostrando 0 de 0 turnos";
    return `Mostrando 1 a ${count} de ${count} ${count === 1 ? "turno" : "turnos"}`;
  }, [loading, loadError, count]);

  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-4xl mx-auto w-full pb-xl">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-gutter">
        <div className="flex flex-col gap-1">
          <PageHeading>Mis Turnos</PageHeading>
          <p className="text-body-md text-on-surface-variant">
            Gestioná tus reservas y próximos partidos.
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link to="/nueva-reserva">
            Nueva Reserva
          </Link>
        </Button>
      </header>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-high/50">
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">Actividad</th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">Día</th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">Fecha</th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">Horario</th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-lg px-md text-center text-on-surface-variant">
                    Cargando turnos...
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={5} className="py-lg px-md text-center">
                    <p className="text-destructive mb-2">{loadError}</p>
                    <Button variant="outline" size="sm" onClick={fetchTurnos}>
                      Reintentar
                    </Button>
                  </td>
                </tr>
              ) : count === 0 ? (
                <tr>
                  <td colSpan={5} className="py-lg px-md text-center text-on-surface-variant">
                    <div className="flex flex-col items-center justify-center py-xl">
                      <CalendarX2 className="size-12 mb-3 opacity-70" />
                      <p className="text-headline-md">Aún no tienes turnos</p>
                      <p className="text-body-md opacity-70 mt-1">
                        Cuando reserves un turno, aparecerá acá.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                turnos.map((turno) => (
                  <tr
                    key={turno.id}
                    className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container-high/40 transition-colors"
                  >
                    <td className="py-sm px-md text-on-surface font-medium">{turno.actividad}</td>
                    <td className="py-sm px-md text-on-surface-variant">{DIAS[turno.dia_semana] ?? turno.dia_semana}</td>
                    <td className="py-sm px-md text-on-surface-variant">{formatFecha(turno.fecha)}</td>
                    <td className="py-sm px-md text-on-surface-variant">{turno.hora}</td>
                    <td className="py-sm px-md">
                      <span className="text-label-sm bg-primary/10 text-primary px-2 py-1 rounded-full capitalize">
                        {turno.tipo}
                      </span>
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