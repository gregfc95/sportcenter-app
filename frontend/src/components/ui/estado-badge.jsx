import { cn } from "@/lib/utils";

/**
 * Presentación canónica de los estados de pago/reserva en todo el sistema.
 * Un solo color por estado (tokens de index.css): el texto lo fija `text-*`
 * y el punto lo hereda vía `bg-current`.
 */
const ESTADOS = {
  pagado: {
    label: "Pagado",
    color: "text-success-green bg-success-green/10 border-success-green/30",
  },
  senado: {
    label: "Señado",
    color: "text-accent bg-accent/10 border-accent/30",
  },
  pendiente: {
    label: "Pendiente",
    color: "text-error bg-error/10 border-error/30",
  },
  cancelado: {
    label: "Cancelado",
    color: "text-error bg-error/10 border-error/30",
  },
  reembolsado: {
    label: "Reembolsado",
    color: "text-info-blue bg-info-blue/10 border-info-blue/30",
  },
  credito: {
    label: "Crédito a Favor",
    color: "text-credit-violet bg-credit-violet/10 border-credit-violet/30",
  },
  asistio: {
    label: "Asistió",
    color: "text-success-green bg-success-green/10 border-success-green/30",
  },
  ausente: {
    label: "Ausente",
    color: "text-error bg-error/10 border-error/30",
  },
};

// Estados no contemplados: chip neutro con el valor crudo.
const FALLBACK = {
  label: null,
  color: "text-on-surface-variant bg-surface-container-high border-outline-variant",
};

export function EstadoBadge({ estado, className }) {
  const info = ESTADOS[estado] ?? FALLBACK;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full border shrink-0 text-[10px] font-bold uppercase tracking-widest",
        info.color,
        className,
      )}
    >
      <span className="w-2 h-2 rounded-full bg-current" aria-hidden="true" />
      {info.label ?? estado ?? "—"}
    </span>
  );
}
