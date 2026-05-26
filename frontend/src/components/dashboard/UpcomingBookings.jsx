import BookingCard from "./BookingCard";

export default function UpcomingBookings({ bookings = [] }) {
  return (
    <section className="flex flex-col gap-md pb-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-headline-md text-on-surface">Próximos Turnos</h3>
        <button
          type="button"
          className="text-label-sm text-accent hover:underline font-semibold"
        >
          Ver todos
        </button>
      </div>

      {bookings.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">
          No tenés turnos próximos.
        </p>
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
