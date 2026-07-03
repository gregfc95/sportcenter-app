import { cn } from "@/lib/utils";

/**
 * Control segmentado de selección única: una fila de botones donde uno queda
 * activo. Se usa para filtros por categoría (ej. tipo de reserva).
 *
 * `options` es `[{ value, label }]`; `...props` deja pasar atributos como
 * `aria-label` al contenedor.
 */
export function SegmentedControl({ options, value, onChange, className, ...props }) {
  return (
    <div
      role="group"
      className={cn(
        "flex bg-surface-container-high rounded-xl p-1 border border-outline-variant self-start",
        className,
      )}
      {...props}
    >
      {options.map((opcion) => {
        const active = value === opcion.value;
        return (
          <button
            key={opcion.value}
            type="button"
            onClick={() => onChange(opcion.value)}
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
  );
}
