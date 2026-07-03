import { useEffect, useMemo, useState } from "react";

import { usePageTitle } from "@/lib/usePageTitle";
import { getActividadIcon } from "@/components/actividades/actividadIcons";
import { listMiHistorial } from "@/components/reservas/api";
import { EstadoBadge } from "@/components/ui/estado-badge";
import { PageHeading } from "@/components/ui/page-heading";

// "Lunes 01/07/2026" a partir de la fecha ISO y el día que manda el backend.
// Se arma desde las partes del string para evitar el desfase de zona horaria.
function formatFecha(iso, diaSemana) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const dia = diaSemana
    ? diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)
    : "";
  return `${dia} ${d}/${m}/${y}`.trim();
}

export default function MiHistorialPage() {
  usePageTitle("Mi Historial");

  const [reservas, setReservas] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    listMiHistorial()
      .then((data) => {
        if (active) setReservas(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setReservas([]);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const count = reservas.length;

  const summaryText = useMemo(() => {
    if (count === 0) return "Mostrando 0 de 0 reservas";
    return `Mostrando 1 a ${count} de ${count} ${count === 1 ? "reserva" : "reservas"}`;
  }, [count]);

  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-6xl mx-auto w-full">
      <header className="flex flex-col gap-1">
        <PageHeading>Mi Historial</PageHeading>
        <p className="text-on-surface-variant text-sm">
          Revisá tus reservas y tu asistencia a cada turno.
        </p>
      </header>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-high/50">
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">
                  Actividad
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">
                  Fecha
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">
                  Horario
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase text-center">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {!loaded ? null : count === 0 ? (
                <tr>
                  <td colSpan={4} className="py-lg px-md text-center text-on-surface-variant">
                    Todavía no tenés reservas registradas.
                  </td>
                </tr>
              ) : (
                reservas.map((reserva) => {
                  const Icon = getActividadIcon(reserva.actividad ?? "");
                  return (
                    <tr
                      key={reserva.reserva_id}
                      className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container-high/40 transition-colors"
                    >
                      <td className="py-sm px-md">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 items-center justify-center rounded-full bg-surface-container-high text-primary">
                            <Icon className="size-4" />
                          </span>
                          <span className="text-on-surface font-medium">
                            {reserva.actividad ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="py-sm px-md text-on-surface-variant">
                        {formatFecha(reserva.fecha, reserva.dia_semana)}
                      </td>
                      <td className="py-sm px-md text-on-surface-variant">
                        {reserva.hora ?? "—"}
                      </td>
                      <td className="py-sm px-md text-center">
                        <EstadoBadge estado={reserva.estado} />
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
    </div>
  );
}
