import { useEffect, useMemo, useState } from "react";

import { usePageTitle } from "@/lib/usePageTitle";
import { formatPrice } from "@/lib/utils";
import { formatReservaFecha } from "@/lib/fecha";
import { getActividadIcon } from "@/components/actividades/actividadIcons";
import { listMisPagos } from "@/components/reservas/api";
import { EstadoBadge } from "@/components/ui/estado-badge";
import { PageHeading } from "@/components/ui/page-heading";

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return DATE_FORMATTER.format(date);
}

function formatTurno(turno) {
  if (!turno?.fecha) return "—";
  return formatReservaFecha(turno.fecha, turno.hora ?? "");
}

export default function MisPagosPage() {
  usePageTitle("Mis Pagos");

  const [pagos, setPagos] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    listMisPagos()
      .then((data) => {
        if (active) setPagos(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setPagos([]);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const count = pagos.length;

  const summaryText = useMemo(() => {
    if (count === 0) return "Mostrando 0 de 0 pagos";
    return `Mostrando 1 a ${count} de ${count} ${count === 1 ? "pago" : "pagos"}`;
  }, [count]);

  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-6xl mx-auto w-full">
      <header className="flex flex-col gap-1">
        <PageHeading>Historial de Pagos</PageHeading>
        <p className="text-on-surface-variant text-sm">
          Revisá el detalle de tus transacciones recientes y reservas.
        </p>
      </header>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-high/50">
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">
                  Comprobante
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">
                  Fecha de pago
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">
                  Actividad
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">
                  Turno
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase text-right">
                  Monto
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase text-center">
                  Estado
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">
                  Medio
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase text-right">
                  Reserva
                </th>
              </tr>
            </thead>
            <tbody>
              {!loaded ? null : count === 0 ? (
                <tr>
                  <td colSpan={8} className="py-lg px-md text-center text-on-surface-variant">
                    Todavía no tenés pagos registrados.
                  </td>
                </tr>
              ) : (
                pagos.map((pago) => {
                  const Icon = getActividadIcon(pago.actividad ?? "");
                  return (
                    <tr
                      key={pago.id}
                      className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container-high/40 transition-colors"
                    >
                      <td className="py-sm px-md text-on-surface-variant font-mono text-sm">
                        #{String(pago.id).padStart(4, "0")}
                      </td>
                      <td className="py-sm px-md text-on-surface-variant">
                        {formatDate(pago.fecha_pago)}
                      </td>
                      <td className="py-sm px-md">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 items-center justify-center rounded-full bg-surface-container-high text-primary">
                            <Icon className="size-4" />
                          </span>
                          <span className="text-on-surface font-medium">
                            {pago.actividad ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="py-sm px-md text-on-surface-variant">
                        {formatTurno(pago.turno)}
                      </td>
                      <td className="py-sm px-md text-right text-on-surface font-medium">
                        {formatPrice(pago.monto)}
                      </td>
                      <td className="py-sm px-md text-center">
                        <EstadoBadge estado={pago.estado} />
                      </td>
                      <td className="py-sm px-md text-on-surface-variant">
                        {pago.metodo === "efectivo" ? "Efectivo" : "Mercado Pago"}
                      </td>
                      <td className="py-sm px-md text-right text-on-surface-variant font-mono text-sm">
                        #{pago.reserva_id}
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
