import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

import { usePageTitle } from "@/lib/usePageTitle";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { formatPrice } from "@/lib/utils";

// Resultado de cancelar una reserva. Recibe { reembolsado, resolucion, monto }
// por el `state` de la navegación (lo manda CancelarReservaDialog). Sin state
// —p. ej. si se entra por URL directa o tras refrescar— cae en el caso neutro.
function resolveVariant({ reembolsado, resolucion, monto }) {
  const hasPayment = monto != null && Number(monto) > 0;

  if (resolucion === "credito" && hasPayment) {
    return {
      pageTitle: "Crédito a favor",
      heading: "Crédito a Favor",
      title: "La clase quedó como crédito a favor",
      message:
        "Se canceló la clase y lo abonado quedó como crédito a favor para esta actividad. Se aplica solo al reservar esta misma actividad y vence a los 30 días.",
      amount: monto,
      Icon: CheckCircle2,
      iconClass: "text-credit-violet",
      to: "/mis-pagos",
      cta: "Ir a Mis Pagos",
    };
  }

  if (reembolsado && hasPayment) {
    return {
      pageTitle: "Pago reembolsado",
      heading: "Pago Reembolsado",
      title: "El pago ha sido reembolsado",
      message: "Se ha cancelado la reserva asociada.",
      amount: monto,
      Icon: CheckCircle2,
      iconClass: "text-sky-500",
      to: "/mis-pagos",
      cta: "Ir a Mis Pagos",
    };
  }

  if (hasPayment) {
    return {
      pageTitle: "Reserva cancelada",
      heading: "Reserva Cancelada",
      title: "Reserva cancelada sin reembolso",
      message:
        "Las cancelaciones dentro de la ventana previa al turno (24 hs, o 48 hs para clases mensuales) no tienen reembolso.",
      amount: null,
      Icon: AlertTriangle,
      iconClass: "text-amber-500",
      to: "/mis-pagos",
      cta: "Ir a Mis Pagos",
    };
  }

  return {
    pageTitle: "Reserva cancelada",
    heading: "Reserva Cancelada",
    title: "Reserva cancelada",
    message: "Se ha cancelado la reserva asociada.",
    amount: null,
    Icon: CheckCircle2,
    iconClass: "text-on-surface-variant",
    to: "/mis-turnos",
    cta: "Ir a Mis Turnos",
  };
}

export default function PagoCanceladoPage() {
  const { state } = useLocation();
  const variant = resolveVariant({
    reembolsado: state?.reembolsado ?? false,
    resolucion: state?.resolucion ?? null,
    monto: state?.monto ?? null,
  });
  usePageTitle(variant.pageTitle);

  const { Icon } = variant;

  return (
    <div className="px-margin-mobile md:px-lg mt-md md:mt-lg w-full flex justify-center">
      <div className="w-full max-w-[560px] flex flex-col gap-lg pb-xl">
        <PageHeading>{variant.heading}</PageHeading>

        <section className="bg-surface-container border border-outline-variant rounded-xl p-lg flex flex-col items-center text-center gap-4">
          <Icon className={`size-14 ${variant.iconClass}`} aria-hidden="true" />
          <h2 className="text-headline-md text-on-surface">{variant.title}</h2>

          {variant.amount != null && (
            <p className={`text-headline-md leading-none ${variant.iconClass}`}>
              {formatPrice(variant.amount)}
            </p>
          )}

          <p className="text-body-md text-on-surface-variant max-w-[42ch]">
            {variant.message}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
            <Button asChild size="lg" className="flex-1 min-w-0">
              <Link to={variant.to}>
                {variant.cta}
                <ArrowRight className="size-5" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
