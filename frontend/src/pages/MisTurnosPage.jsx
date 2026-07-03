import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarX2 } from "lucide-react";

import { usePageTitle } from "@/lib/usePageTitle";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { listMisReservas } from "@/components/reservas/api";
import { FILTROS_TIPO, filtrarPorTipo } from "@/components/reservas/filtros";
import ReservaCard from "@/components/reservas/ReservaCard";
import AccountStatusCard from "@/components/dashboard/AccountStatusCard";

export default function MisTurnosPage() {
  usePageTitle("Mis Turnos");

  const [reservas, setReservas] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    listMisReservas()
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
  }, [refreshKey]);

  // Un pago 100% con crédito no pasa por Mercado Pago (no hay redirección que
  // recargue la vista), así que refrescamos la lista para reflejar el nuevo
  // estado de la reserva.
  const handlePagado = () => setRefreshKey((k) => k + 1);

  // Cancelación: una eventual saca su card; un abono pendiente se cancela
  // completo (sale la card, el id recibido es el de la card); en uno pagado
  // la clase cancelada queda tachada en la fila de chips (y la card entera
  // sale si no le quedan clases próximas sin cancelar).
  const handleCancelled = (reservaId) => {
    setReservas((prev) =>
      prev
        // La card sale entera salvo en un abono pagado, donde el id recibido
        // es el de una clase (puede coincidir con el id de la card).
        .filter(
          (r) =>
            (r.mensualidad && r.estado === "pagado") || r.id !== reservaId,
        )
        .map((r) =>
          r.mensualidad
            ? {
                ...r,
                mensualidad: {
                  ...r.mensualidad,
                  clases: r.mensualidad.clases.map((c) =>
                    c.reserva_id === reservaId ? { ...c, cancelada: true } : c,
                  ),
                },
              }
            : r,
        )
        .filter((r) =>
          r.mensualidad
            ? r.mensualidad.clases.some((c) => !c.pasada && !c.cancelada)
            : true,
        ),
    );
  };

  const visibles = filtrarPorTipo(reservas, filtro);
  const hasTurnos = reservas.length > 0;

  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-5xl mx-auto w-full pb-xl">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-gutter">
        <div className="flex flex-col gap-1">
          <PageHeading>Mis Turnos</PageHeading>
          <p className="text-body-md text-on-surface-variant">
            Gestioná tus reservas y próximos partidos.
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link to="/nueva-reserva">Nueva Reserva</Link>
        </Button>
      </header>

      <AccountStatusCard />

      {!loaded ? null : hasTurnos ? (
        <>
          <SegmentedControl
            options={FILTROS_TIPO}
            value={filtro}
            onChange={setFiltro}
            aria-label="Filtrar por tipo de reserva"
          />

          {visibles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
              {visibles.map((reserva) => (
                <ReservaCard
                  key={reserva.id}
                  reserva={reserva}
                  onCancelled={handleCancelled}
                  onPagado={handlePagado}
                />
              ))}
            </div>
          ) : (
            <p className="text-body-md text-on-surface-variant">
              No tenés reservas{" "}
              {filtro === "mensual" ? "mensuales" : "eventuales"}.
            </p>
          )}
        </>
      ) : (
        <section className="bg-surface-container border border-outline-variant rounded-xl flex flex-col overflow-hidden">
          <div className="p-md md:p-lg flex flex-col items-center justify-center py-xl text-on-surface-variant">
            <CalendarX2 className="size-12 mb-3 opacity-70" />
            <p className="text-headline-md">Aún no tienes turnos</p>
            <p className="text-body-md opacity-70 mt-1">
              Cuando reserves un turno, aparecerá acá.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
