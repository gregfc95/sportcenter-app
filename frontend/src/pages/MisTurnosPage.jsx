import { Link } from "react-router-dom";
import { CalendarX2, Plus } from "lucide-react";

import { usePageTitle } from "@/lib/usePageTitle";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";

export default function MisTurnosPage() {
  usePageTitle("Mis Turnos");

  const turnos = [];
  const hasTurnos = turnos.length > 0;

  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-4xl mx-auto w-full pb-xl">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-gutter">
        <div className="flex flex-col gap-1">
          <PageHeading>Mis Turnos</PageHeading>
          <p className="text-body-md text-on-surface-variant">
            Gestioná tus reservas y próximos partidos.
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link to="/nueva-reserva">
            Nueva Reserva
          </Link>
        </Button>
      </header>

      <section className="bg-surface-container border border-outline-variant rounded-xl flex flex-col overflow-hidden">
        {hasTurnos ? null : (
          <div className="p-md md:p-lg flex flex-col items-center justify-center py-xl text-on-surface-variant">
            <CalendarX2 className="size-12 mb-3 opacity-70" />
            <p className="text-headline-md">Aún no tienes turnos</p>
            <p className="text-body-md opacity-70 mt-1">
              Cuando reserves un turno, aparecerá acá.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
