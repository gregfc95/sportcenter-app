import { useEffect, useRef } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { usePageTitle } from "@/lib/usePageTitle";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import {
  confirmarSena,
  cancelarCheckout,
  completarPago,
} from "@/components/reservas/api";

// La seña se guarda en sessionStorage antes de ir a Mercado Pago. Mostramos
// "$1500" si es entero, "$1500.50" si tiene centavos.
function formatSena(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

// Maps each back_url path to how the result should be presented. MercadoPago
// also appends a `status` query param, but the path is the reliable signal.
const ESTADOS = {
  "/pago/exito": {
    title: "¡Pago confirmado!",
    pageTitle: "Pago confirmado",
    message:
      "Recibimos tu seña y tu reserva quedó confirmada. Te esperamos en el turno.",
    Icon: CheckCircle2,
    iconClass: "text-success-green",
  },
  "/pago/pendiente": {
    title: "Pago pendiente",
    pageTitle: "Pago pendiente",
    message:
      "Tu pago está siendo procesado. Apenas se acredite, vas a ver la reserva confirmada en Mis Turnos.",
    Icon: Clock,
    iconClass: "text-on-surface-variant",
  },
  "/pago/error": {
    title: "No pudimos procesar el pago",
    pageTitle: "Pago rechazado",
    message:
      "El pago no se completó y la reserva no quedó confirmada.",
    Icon: XCircle,
    iconClass: "text-error",
  },
};

export default function PagoResultadoPage() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isSuccess = pathname === "/pago/exito";
  const isError = pathname === "/pago/error";
  const estado = ESTADOS[pathname] ?? ESTADOS["/pago/error"];
  usePageTitle(estado.pageTitle);

  // Mercado Pago devuelve el id de la reserva en external_reference, así que no
  // dependemos de sessionStorage (ni del origin desde el que se inició el pago).
  const reservaId = Number(searchParams.get("external_reference"));
  // `accion=completar` lo agrega el back_url del checkout de saldo: distingue el
  // pago del saldo (segunda mitad) del de la seña inicial.
  const isCompletar = searchParams.get("accion") === "completar";

  // Éxito: registramos el pago (seña o saldo según `accion`), toast con el monto
  // del backend y vamos a Mis Turnos. Error: en el flujo de seña cancelamos la
  // reserva recién creada; en el de saldo la reserva ya está señada y no se
  // toca. El ref evita el doble disparo de StrictMode.
  const handled = useRef(false);
  useEffect(() => {
    if (handled.current || (!isSuccess && !isError)) return;
    handled.current = true;

    const tieneReserva = Number.isInteger(reservaId) && reservaId > 0;

    if (isSuccess) {
      const registrar = isCompletar ? completarPago : confirmarSena;
      const mensaje = (formatted) =>
        isCompletar
          ? formatted
            ? `Pago completado. Saldo de ${formatted} abonado.`
            : "Pago completado."
          : formatted
            ? `Reserva confirmada. Seña de ${formatted} abonada.`
            : "Reserva confirmada.";

      const finish = (monto) => {
        toast.success(mensaje(formatSena(monto)));
        navigate("/mis-turnos", { replace: true });
      };
      if (tieneReserva) {
        registrar(reservaId)
          .then((pago) => finish(pago?.monto))
          .catch(() => finish(null));
      } else {
        finish(null);
      }
      return;
    }

    // isError en el flujo de seña: cancelamos la reserva abandonada (sin pago).
    // En el flujo de saldo no cancelamos: la reserva sigue señada y válida.
    if (!isCompletar && tieneReserva) cancelarCheckout(reservaId).catch(() => {});
  }, [isSuccess, isError, isCompletar, reservaId, navigate]);

  if (isSuccess) return null;

  const { Icon } = estado;
  // En el flujo de saldo la reserva no se pierde: sigue señada y se puede
  // reintentar el pago desde Mis Turnos.
  const message =
    isError && isCompletar
      ? "El pago del saldo no se completó. Tu reserva sigue señada; podés reintentar el pago desde Mis Turnos."
      : estado.message;

  return (
    <div className="px-margin-mobile md:px-lg mt-md md:mt-lg w-full flex justify-center">
      <div className="w-full max-w-[560px] flex flex-col gap-lg pb-xl">
        <PageHeading>Pago Rechazado</PageHeading>

        <section className="bg-surface-container border border-outline-variant rounded-xl p-lg flex flex-col items-center text-center gap-4">
          <Icon className={`size-14 ${estado.iconClass}`} aria-hidden="true" />
          <h2 className="text-headline-md text-on-surface">{estado.title}</h2>
          <p className="text-body-md text-on-surface-variant max-w-[42ch]">
            {message}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
            <Button asChild size="lg" className="flex-1 min-w-0">
              <Link to="/mis-turnos">
                Ir a Mis Turnos
                <ArrowRight className="size-5" />
              </Link>
            </Button>

          </div>
        </section>
      </div>
    </div>
  );
}
