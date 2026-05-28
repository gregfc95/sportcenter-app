import { cn } from "@/lib/utils";

const STATUS_META = {
  pagado: { label: "PAGADO", color: "text-green-600 bg-green-50 border-green-200" },
  pendiente: { label: "PENDIENTE", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  clase: { label: "CLASE", color: "text-blue-600 bg-blue-50 border-blue-200" },
};

export default function UpcomingBookingsAdmin({ bookings = [] }) {
  return (
    <section className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <h3 className="text-label-md text-on-surface uppercase tracking-wider">
          Próximas Reservas
        </h3>
        <button type="button" className="text-label-sm text-accent hover:underline font-semibold">
          Ver todas
        </button>
      </div>

      {bookings.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">
          No hay reservas próximas.
        </p>
      ) : (
        <div className="flex flex-col gap-gutter">
          {bookings.map((booking) => {
            const meta = STATUS_META[booking.status] ?? STATUS_META.pendiente;
            return (
              <div key={booking.id} className="bg-surface border border-outline-variant rounded-xl p-md flex items-center gap-md shadow-sm">
                <div className="flex flex-col items-center justify-center bg-surface-container rounded-lg px-sm py-xs min-w-[56px] text-center">
                  <span className="text-label-sm text-on-surface-variant uppercase">{booking.day}</span>
                  <span className="text-headline-md font-black text-accent">{booking.time}</span>
                </div>
                <div className="flex flex-col flex-1 gap-xs">
                  <span className="text-label-md font-bold text-on-surface">{booking.court}</span>
                  <span className="text-body-sm text-on-surface-variant">{booking.client} • {booking.duration}</span>
                </div>
                <span className={cn("text-xs font-bold px-2 py-1 rounded border uppercase", meta.color)}>
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}