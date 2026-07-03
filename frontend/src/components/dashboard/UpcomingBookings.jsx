import { useState } from "react";
import { CalendarClock, CalendarX2 } from "lucide-react";
import { Link } from "react-router-dom";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { FILTROS_TIPO, filtrarPorTipo } from "@/components/reservas/filtros";
import BookingCardEventual from "./BookingCardEventual";
import BookingCardMensual from "./BookingCardMensual";

// Cuántos próximos turnos mostrar antes de "Ver todos".
const MAX_PROXIMOS = 4;

export default function UpcomingBookings({ bookings = [], onCancelled, onPagado }) {
  const [filtro, setFiltro] = useState("todos");

  // Filtrar sobre la lista completa y recién después recortar, para que el
  // filtro elija entre todos los próximos y no solo entre los primeros cuatro.
  const visibles = filtrarPorTipo(bookings, filtro).slice(0, MAX_PROXIMOS);

  return (
    <section className="flex flex-col gap-md pb-lg">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-sm text-headline-md text-on-surface">
          <CalendarClock className="size-5 text-accent" />
          Próximos Turnos
        </h3>
        <Link
          to="/mis-turnos"
          className="text-label-sm text-accent hover:underline font-semibold"
        >
          Ver todos
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-surface-container border border-outline-variant rounded-xl flex flex-col items-center justify-center py-xl px-md md:px-lg text-on-surface-variant">
          <CalendarX2 className="size-12 mb-3 opacity-70" />
          <p className="text-headline-md">Aún no tienes turnos</p>
          <p className="text-body-md opacity-70 mt-1">
            Cuando reserves un turno, aparecerá acá.
          </p>
        </div>
      ) : (
        <>
          <SegmentedControl
            options={FILTROS_TIPO}
            value={filtro}
            onChange={setFiltro}
            aria-label="Filtrar por tipo de reserva"
          />

          {visibles.length > 0 ? (
            <div className="flex flex-col gap-gutter">
              {visibles.map(({ tipo, mensualidad, ...booking }) => {
                const esMensual =
                  tipo === "mensual" && Array.isArray(mensualidad?.clases);
                return esMensual ? (
                  <BookingCardMensual
                    key={booking.id}
                    mensualidad={mensualidad}
                    {...booking}
                    onCancelled={onCancelled}
                    onPagado={onPagado}
                  />
                ) : (
                  <BookingCardEventual
                    key={booking.id}
                    {...booking}
                    onCancelled={onCancelled}
                    onPagado={onPagado}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-body-md text-on-surface-variant">
              No tenés reservas{" "}
              {filtro === "mensual" ? "mensuales" : "eventuales"}.
            </p>
          )}
        </>
      )}
    </section>
  );
}
