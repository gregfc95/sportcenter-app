import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Percent, ReceiptText } from "lucide-react";

import { getEstadoMensual } from "@/components/reservas/api";
import { cn } from "@/lib/utils";

/**
 * Estado de suscripción mensual del cliente: al día / suspendida,
 * penalizaciones del mes (X de N) y si conserva el descuento de fidelidad.
 * Hace su propio fetch (como CreditosActivos), así siempre está fresco —a
 * diferencia del `suspendido` del login, que queda viejo. No se renderiza si
 * el estado no pudo cargarse.
 */
export default function AccountStatusCard() {
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    let active = true;
    getEstadoMensual()
      .then((data) => {
        if (active) setEstado(data ?? null);
      })
      .catch(() => {
        if (active) setEstado(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!estado) return null;

  const {
    suspendido,
    penalizaciones_mes: penalMes,
    penalizaciones_max: penalMax,
    tiene_descuento: tieneDescuento,
    descuento_pct: descuentoPct,
  } = estado;
  const penalAlerta = suspendido || penalMes >= penalMax;

  return (
    <section>
      <div
        className={cn(
          "relative overflow-hidden bg-surface rounded-xl p-md border shadow-md shadow-black/5 flex flex-col gap-sm",
          suspendido ? "border-error/40" : "border-outline-variant",
        )}
      >
        <div
          aria-hidden="true"
          className={cn(
            "absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl pointer-events-none",
            suspendido ? "bg-error/20" : "bg-accent/20",
          )}
        />

        <div className="relative flex items-start justify-between gap-sm">
          <div className="flex flex-col gap-xs">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">
              Estado de cuenta
            </span>
            <div className="flex items-center gap-xs">
              <span className="text-headline-md text-on-surface">
                {suspendido ? "Suspendida" : "Al día"}
              </span>
              {suspendido ? (
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-error/10 border border-error/30">
                  <AlertTriangle className="size-4 text-error" />
                </span>
              ) : (
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-success-green/10 border border-success-green/30">
                  <CheckCircle2 className="size-4 text-success-green" />
                </span>
              )}
            </div>
          </div>

          <Link
            to="/mis-pagos"
            aria-label="Ver historial de pagos"
            className="relative bg-surface-container border border-outline-variant p-sm rounded-lg text-accent hover:bg-surface-container-high transition-colors"
          >
            <ReceiptText className="size-5" />
          </Link>
        </div>

        {suspendido && (
          <p className="relative text-label-sm text-on-surface-variant">
            Por una renovación impaga. Hacé y pagá una nueva reserva para
            reactivarla; mientras tanto no se renuevan tus abonos ni aplican
            descuentos.
          </p>
        )}

        <div className="relative flex flex-wrap items-center gap-x-md gap-y-xs pt-sm border-t border-outline-variant text-label-sm">
          <span
            className={cn(
              "flex items-center gap-xs",
              penalAlerta ? "text-error" : "text-on-surface-variant",
            )}
          >
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            Penalizaciones: {penalMes} de {penalMax} este mes
          </span>
          <span
            className={cn(
              "flex items-center gap-xs",
              tieneDescuento ? "text-success-green" : "text-on-surface-variant",
            )}
          >
            <Percent className="size-4 shrink-0" aria-hidden="true" />
            {tieneDescuento
              ? `Descuento fidelidad ${descuentoPct}% activo`
              : "Sin descuento de fidelidad"}
          </span>
        </div>
      </div>
    </section>
  );
}
