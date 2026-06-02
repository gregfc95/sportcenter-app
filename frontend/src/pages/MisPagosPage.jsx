import { useMemo } from "react";

import { usePageTitle } from "@/lib/usePageTitle";
import { getActividadIcon } from "@/components/actividades/actividadIcons";
import { PageHeading } from "@/components/ui/page-heading";

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

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value ?? "—";
  return DATE_FORMATTER.format(date);
}

const TIPO_BADGES = {
  eventual: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  mensual: "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

const ESTADO_BADGES = {
  pagado: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  senado: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  cancelado: "bg-red-500/10 text-red-400 border-red-500/30",
  reembolsado: "bg-sky-500/10 text-sky-400 border-sky-500/30",
};

const ESTADO_LABELS = {
  pagado: "Pagado",
  senado: "Señado",
  cancelado: "Cancelado",
  reembolsado: "Reembolsado",
};

// Datos de muestra hasta que exista el endpoint de pagos.
const PAGOS = [
  { id: 1, actividad: "Fútbol 5 - Cancha 1", tipo: "eventual", monto: 4500, estado: "pagado", fecha: "2023-10-15" },
  { id: 2, actividad: "Paddle - Pista Azul", tipo: "mensual", monto: 12000, estado: "pagado", fecha: "2023-10-05" },
  { id: 3, actividad: "Básquet - Pabellón A", tipo: "eventual", monto: 3000, estado: "senado", fecha: "2023-10-22" },
  { id: 4, actividad: "Fútbol 7 - Cancha Norte", tipo: "eventual", monto: 6000, estado: "pagado", fecha: "2023-09-28" },
  { id: 5, actividad: "Vóley - Pista Central", tipo: "mensual", monto: 8500, estado: "pagado", fecha: "2023-09-01" },
  { id: 6, actividad: "Paddle - Pista Roja", tipo: "eventual", monto: 2500, estado: "senado", fecha: "2023-11-05" },
];

function Badge({ className, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-label-sm uppercase ${className}`}
    >
      {children}
    </span>
  );
}

export default function MisPagosPage() {
  usePageTitle("Mis Pagos");

  const pagos = PAGOS;
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
                  Actividad
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase">
                  Tipo
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase text-right">
                  Monto
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase text-center">
                  Estado
                </th>
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase text-right">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody>
              {count === 0 ? (
                <tr>
                  <td colSpan={5} className="py-lg px-md text-center text-on-surface-variant">
                    Todavía no tenés pagos registrados.
                  </td>
                </tr>
              ) : (
                pagos.map((pago) => {
                  const Icon = getActividadIcon(pago.actividad);
                  return (
                    <tr
                      key={pago.id}
                      className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container-high/40 transition-colors"
                    >
                      <td className="py-sm px-md">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 items-center justify-center rounded-full bg-surface-container-high text-primary">
                            <Icon className="size-4" />
                          </span>
                          <span className="text-on-surface font-medium">
                            {pago.actividad}
                          </span>
                        </div>
                      </td>
                      <td className="py-sm px-md">
                        <Badge className={TIPO_BADGES[pago.tipo]}>
                          {pago.tipo}
                        </Badge>
                      </td>
                      <td className="py-sm px-md text-right text-on-surface font-medium">
                        {formatPrice(pago.monto)}
                      </td>
                      <td className="py-sm px-md text-center">
                        <Badge className={ESTADO_BADGES[pago.estado]}>
                          <span className="size-1.5 rounded-full bg-current" />
                          {ESTADO_LABELS[pago.estado] ?? pago.estado}
                        </Badge>
                      </td>
                      <td className="py-sm px-md text-right text-on-surface-variant">
                        {formatDate(pago.fecha)}
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
