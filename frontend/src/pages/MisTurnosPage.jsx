import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarX2 } from "lucide-react";

import { usePageTitle } from "@/lib/usePageTitle";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { listMisReservas } from "@/components/reservas/api";
import ReservaCard from "@/components/reservas/ReservaCard";
import { cn } from "@/lib/utils";

// Filtro por tipo de reserva del listado.
const FILTROS = [
  { value: "todos", label: "Todos" },
  { value: "mensual", label: "Mensuales" },
  { value: "eventual", label: "Eventuales" },
];

export default function MisTurnosPage() {
  usePageTitle("Mis Turnos");

  const [reservas, setReservas] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [filtro, setFiltro] = useState("todos");

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
  }, []);

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

  const visibles =
    filtro === "todos" ? reservas : reservas.filter((r) => r.tipo === filtro);
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

      {!loaded ? null : hasTurnos ? (
        <>
          <div
            role="group"
            aria-label="Filtrar por tipo de reserva"
            className="flex bg-surface-container-high rounded-xl p-1 border border-outline-variant self-start"
          >
            {FILTROS.map((opcion) => {
              const active = filtro === opcion.value;
              return (
                <button
                  key={opcion.value}
                  type="button"
                  onClick={() => setFiltro(opcion.value)}
                  aria-pressed={active}
                  className={cn(
                    "px-4 py-2 rounded-lg text-label-sm transition-colors cursor-pointer",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface-variant hover:text-on-surface",
                  )}
                >
                  {opcion.label}
                </button>
              );
            })}
          </div>

          {visibles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
              {visibles.map((reserva) => (
                <ReservaCard
                  key={reserva.id}
                  reserva={reserva}
                  onCancelled={handleCancelled}
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
