import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";

// "01/07" a partir de una fecha ISO (YYYY-MM-DD).
function ddmm(iso) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/**
 * Fila de chips con las clases del abono mensual: las asistidas (QR escaneado)
 * quedan marcadas con check verde, las pasadas sin asistir con una X (falta) y
 * las canceladas tachadas. Con `selectable`, entre las próximas se elige la
 * clase sobre la que actúa "Cancelar clase" (cada fecha se cancela
 * individualmente, nunca en bloque); sin `selectable` —abono pendiente, que se
 * cancela completo— los chips son solo informativos.
 */
export default function ClasesMensuales({
  clases,
  selectable = true,
  selectedId = null,
  onSelect,
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 snap-x">
      {clases.map((clase) => {
        const selected = selectable && clase.reserva_id === selectedId;
        // Antes que `pasada`: una clase puede ser ambas y acá no hubo sesión.
        if (clase.cancelada) {
          return (
            <div
              key={clase.reserva_id}
              title="Clase cancelada"
              className="snap-center shrink-0 flex items-center justify-center w-16 h-14 rounded-lg border border-outline-variant bg-surface-container-low opacity-60"
            >
              <span className="text-label-sm text-on-surface-variant line-through">
                {ddmm(clase.fecha)}
              </span>
              <span className="sr-only">(cancelada)</span>
            </div>
          );
        }
        // Antes que `pasada`: una clase asistida hoy todavía no es "pasada"
        // pero ya debe mostrar el check ni bien se escanea su QR.
        if (clase.asistencia) {
          return (
            <div
              key={clase.reserva_id}
              title="Asististe"
              className="snap-center shrink-0 relative flex items-center justify-center w-16 h-14 rounded-lg border border-success-green/30 bg-success-green/10"
            >
              <span className="text-label-sm text-success-green">
                {ddmm(clase.fecha)}
              </span>
              <Check
                className="size-3.5 text-success-green absolute top-1 right-1"
                aria-hidden="true"
              />
              <span className="sr-only">(asististe)</span>
            </div>
          );
        }
        if (clase.pasada) {
          return (
            <div
              key={clase.reserva_id}
              title="Faltaste"
              className="snap-center shrink-0 relative flex items-center justify-center w-16 h-14 rounded-lg border border-outline-variant bg-surface-container-low opacity-60"
            >
              <span className="text-label-sm text-on-surface-variant">
                {ddmm(clase.fecha)}
              </span>
              <X
                className="size-3.5 text-error absolute top-1 right-1"
                aria-hidden="true"
              />
              <span className="sr-only">(faltaste)</span>
            </div>
          );
        }
        if (!selectable) {
          return (
            <div
              key={clase.reserva_id}
              className="snap-center shrink-0 flex items-center justify-center w-16 h-14 rounded-lg border border-outline-variant bg-surface-container-high"
            >
              <span className="text-label-sm text-on-surface">
                {ddmm(clase.fecha)}
              </span>
            </div>
          );
        }
        return (
          <button
            key={clase.reserva_id}
            type="button"
            onClick={() => onSelect(clase.reserva_id)}
            aria-pressed={selected}
            className={cn(
              "snap-center shrink-0 flex items-center justify-center w-16 h-14 rounded-lg border transition-colors cursor-pointer",
              selected
                ? "border-primary bg-primary/10 ring-1 ring-primary/50"
                : "border-outline-variant bg-surface-container-high hover:border-primary/50",
            )}
          >
            <span
              className={cn(
                "text-label-sm",
                selected ? "text-primary" : "text-on-surface",
              )}
            >
              {ddmm(clase.fecha)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
