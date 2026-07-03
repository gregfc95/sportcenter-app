import { cn } from "@/lib/utils";

/**
 * Chip del tipo de reserva (Mensual / Eventual). Va relleno con el color de
 * acento —no `text-accent` sobre superficie clara, que no llega al contraste
 * WCAG (≈1.7:1)—; `bg-accent text-accent-foreground` pasa AAA en ambos temas.
 */
const LABELS = {
  mensual: "Mensual",
  eventual: "Eventual",
};

export function TipoChip({ tipo, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full bg-accent text-accent-foreground shrink-0 text-[10px] font-bold uppercase tracking-widest",
        className,
      )}
    >
      {LABELS[tipo] ?? tipo}
    </span>
  );
}
