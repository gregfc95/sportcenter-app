import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";

import { getActividadIcon } from "@/components/actividades/actividadIcons";
import { listMisCreditos } from "@/components/reservas/api";
import { formatPrice } from "@/lib/utils";

const fmtVencimiento = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Sección del dashboard con los créditos a favor vigentes del cliente: por cada
 * uno, la actividad en la que se puede canjear, el saldo y la fecha de
 * vencimiento. No se renderiza si el cliente no tiene créditos.
 */
export default function CreditosActivos() {
  const [creditos, setCreditos] = useState([]);

  useEffect(() => {
    let active = true;
    listMisCreditos()
      .then((data) => {
        if (active) setCreditos(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setCreditos([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (creditos.length === 0) return null;

  return (
    <section className="flex flex-col gap-md">
      <div className="flex items-center gap-xs">
        <Wallet className="size-5 text-credit-violet" aria-hidden="true" />
        <h3 className="text-headline-md text-on-surface">Créditos a favor</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
        {creditos.map((credito) => {
          const Icon = getActividadIcon(credito.actividad?.nombre);
          return (
            <article
              key={credito.id}
              className="relative overflow-hidden bg-surface border border-credit-violet/30 rounded-xl p-md flex flex-col gap-sm"
            >
              <div
                aria-hidden="true"
                className="absolute -right-8 -top-8 w-28 h-28 bg-credit-violet/10 rounded-full blur-2xl pointer-events-none"
              />
              <div className="relative flex items-center gap-sm">
                <div className="w-10 h-10 rounded-lg bg-credit-violet/10 border border-credit-violet/30 flex items-center justify-center shrink-0">
                  <Icon
                    className="size-5 text-credit-violet"
                    aria-hidden="true"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Crédito a favor
                  </span>
                  <span className="text-label-md text-on-surface">
                    {credito.actividad?.nombre ?? "—"}
                  </span>
                </div>
              </div>
              <div className="relative flex items-end justify-between gap-sm">
                <span className="text-headline-md text-credit-violet leading-none">
                  {formatPrice(credito.saldo)}
                </span>
                <span className="text-label-sm text-on-surface-variant text-right">
                  Vence el {fmtVencimiento.format(new Date(credito.expira_at))}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
