export default function OccupancyCard({ occupied = 12, total = 15 }) {
  const percentage = Math.round((occupied / total) * 100);

  return (
    <section className="bg-[#9A2A46] rounded-xl p-md flex flex-col gap-sm">
      <span className="text-white/80 text-label-sm uppercase tracking-wider">
        Ocupación Actual
      </span>
      <span className="text-white text-headline-lg font-black">
        {percentage}% de Capacidad
      </span>
      <div className="w-full bg-white/20 rounded-full h-2">
        <div
          className="bg-white rounded-full h-2 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-white/70 text-label-sm">
        {occupied} canchas ocupadas de {total} disponibles
      </span>
    </section>
  );
}