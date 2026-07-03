import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Botón "Pagar" deshabilitado para una reserva en espera que todavía no recibió
 * la oferta. No se deshabilita de verdad: como el QR, queda clickeable con
 * `aria-disabled` y explica con un toast por qué aún no se puede pagar.
 *
 * @param {object} props
 * @param {string} [props.className]
 */
export default function PagarEsperaBloqueado({ className }) {
  return (
    <Button
      variant="outline"
      size="sm"
      aria-disabled="true"
      onClick={() =>
        toast.info("Todavía no te tocó el lugar. Te avisaremos por email.")
      }
      className={cn(
        "text-on-surface-variant border-outline-variant opacity-70",
        className,
      )}
    >
      Pagar
    </Button>
  );
}
