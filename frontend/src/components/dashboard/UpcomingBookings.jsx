import { CalendarX2 } from "lucide-react";
import { Link } from "react-router-dom";

import BookingCard from "./BookingCard";

export default function UpcomingBookings({ bookings = [] }) {
  return (
    <section className="flex flex-col gap-md pb-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-headline-md text-on-surface">Próximos Turnos</h3>
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
        <div className="flex flex-col gap-gutter">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} {...booking} />
          ))}
        </div>
      )}
    </section>
  );
}
