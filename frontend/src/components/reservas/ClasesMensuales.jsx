import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

// "01/07" a partir de una fecha ISO (YYYY-MM-DD).
function ddmm(iso) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/**
 * Fila de chips con las clases del abono mensual: las pasadas quedan marcadas
 * como completadas. Con `selectable`, entre las próximas se elige la clase
 * sobre la que actúa "Cancelar clase" (cada fecha se cancela individualmente,
 * nunca en bloque); sin `selectable` —abono pendiente, que se cancela
 * completo— los chips son solo informativos.
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
        if (clase.pasada) {
          return (
            <div
              key={clase.reserva_id}
              title="Clase pasada"
              className="snap-center shrink-0 relative flex items-center justify-center w-16 h-14 rounded-lg border border-outline-variant bg-surface-container-low opacity-60"
            >
              <span className="text-label-sm text-on-surface-variant">
                {ddmm(clase.fecha)}
              </span>
              <Check
                className="size-3.5 text-success-green absolute top-1 right-1"
                aria-hidden="true"
              />
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
