import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { usePageTitle } from "@/lib/usePageTitle";
import { formatPrice } from "@/lib/utils";
import { formatReservaFecha } from "@/lib/fecha";
import { getActividadIcon } from "@/components/actividades/actividadIcons";
import { listAllPagos } from "@/components/reservas/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const ESTADO_BADGES = {
  pagado: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  senado: "bg-accent/10 text-accent border-accent/30",
  cancelado: "bg-red-500/10 text-red-400 border-red-500/30",
  reembolsado: "bg-sky-500/10 text-sky-400 border-sky-500/30",
};

const ESTADO_LABELS = {
  pagado: "Pagado",
  senado: "Señado",
  cancelado: "Cancelado",
  reembolsado: "Reembolsado",
};

function Badge({ className, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-label-sm uppercase ${className}`}
    >
      {children}
    </span>
  );
}

export default function PagosPage() {
  usePageTitle("Pagos");

  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState("");

  const fetchPagos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listAllPagos();
      setPagos(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err.message);
      setPagos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPagos();
  }, [fetchPagos]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return pagos;
    return pagos.filter((pago) => {
      const nombre = pago.cliente?.nombre?.toLowerCase() ?? "";
      const email = pago.cliente?.email?.toLowerCase() ?? "";
      return nombre.includes(term) || email.includes(term);
    });
  }, [pagos, query]);

  const total = pagos.length;
  const count = filtered.length;

  const summaryText = useMemo(() => {
    if (loading) return "Cargando pagos...";
    if (loadError) return loadError;
    if (total === 0) return "Mostrando 0 de 0 pagos";
    if (count === 0) return `Sin resultados para "${query.trim()}"`;
    return `Mostrando ${count} de ${total} ${total === 1 ? "pago" : "pagos"}`;
  }, [loading, loadError, count, total, query]);

  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-6xl mx-auto w-full">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-gutter">
        <div className="flex flex-col gap-1">
          <PageHeading>Historial de Pagos</PageHeading>
          <p className="text-on-surface-variant text-sm">
            Revisá las transacciones de todos los clientes y sus reservas.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o email"
            className="pl-9"
            aria-label="Buscar pagos por nombre o email"
          />
        </div>
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
                  Cliente
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
                <th className="py-md px-md text-label-sm text-on-surface-variant uppercase text-right">
                  Reserva
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-lg px-md text-center text-on-surface-variant">
                    Cargando pagos...
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={8} className="py-lg px-md text-center">
                    <p className="text-destructive mb-2">{loadError}</p>
                    <Button variant="outline" size="sm" onClick={fetchPagos}>
                      Reintentar
                    </Button>
                  </td>
                </tr>
              ) : count === 0 ? (
                <tr>
                  <td colSpan={8} className="py-lg px-md text-center text-on-surface-variant">
                    {query.trim()
                      ? `No se encontraron pagos para "${query.trim()}".`
                      : "Todavía no hay pagos registrados."}
                  </td>
                </tr>
              ) : (
                filtered.map((pago) => {
                  const Icon = getActividadIcon(pago.actividad ?? "");
                  return (
                    <tr
                      key={pago.id}
                      className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container-high/40 transition-colors"
                    >
                      <td className="py-sm px-md text-on-surface-variant font-mono text-sm">
                        #{String(pago.id).padStart(4, "0")}
                      </td>
                      <td className="py-sm px-md">
                        {pago.cliente ? (
                          <div className="flex flex-col">
                            <span className="text-on-surface font-medium">
                              {pago.cliente.nombre}
                            </span>
                            <span className="text-on-surface-variant text-sm">
                              {pago.cliente.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )}
                      </td>
                      <td className="py-sm px-md text-on-surface-variant">
                        {formatDate(pago.fecha_pago)}
                      </td>
                      <td className="py-sm px-md">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-primary">
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
                        <Badge className={ESTADO_BADGES[pago.estado]}>
                          <span className="size-1.5 rounded-full bg-current" />
                          {ESTADO_LABELS[pago.estado] ?? pago.estado}
                        </Badge>
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
