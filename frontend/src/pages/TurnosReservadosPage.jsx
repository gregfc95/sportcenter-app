import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarX2,
  CalendarDays,
  Users,
  UserCheck,
  ChevronRight,
} from "lucide-react";

import { usePageTitle } from "@/lib/usePageTitle";
import { PageHeading } from "@/components/ui/page-heading";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ActividadIcon } from "@/components/actividades/ActividadIcon";
import { TipoChip } from "@/components/ui/tipo-chip";
import { listSesionesReservadas } from "@/components/reservas/api";
import {
  FILTROS_TIPO,
  filtrarSesionesPorTipo,
} from "@/components/reservas/filtros";
import { formatReservaFecha, todayISO } from "@/lib/fecha";
import { cn } from "@/lib/utils";

function SesionCard({ sesion }) {
  const { cupo, ocupados, reservas, asistencias = 0, tipos = [] } = sesion;
  const ocupacion = cupo > 0 ? Math.min(100, (ocupados / cupo) * 100) : 0;
  const lleno = cupo > 0 && ocupados >= cupo;
  const asistenciaPct =
    reservas > 0 ? Math.min(100, (asistencias / reservas) * 100) : 0;

  return (
    <Link
      to={`/turnos/${sesion.turno_id}/${sesion.fecha}`}
      className="group relative overflow-hidden bg-surface-container border border-outline-variant rounded-xl p-md flex flex-col gap-md hover:border-primary/50 hover:bg-surface-container-high transition-colors"
    >
      <div
        aria-hidden="true"
        className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none"
      />

      {/* Header: icon + activity + reservas count */}
      <div className="relative z-10 flex justify-between items-start gap-2">
        <div className="flex items-center gap-sm">
          <div className="w-12 h-12 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center shrink-0">
            <ActividadIcon
              actividad={sesion.actividad}
              className="size-6 text-primary"
              aria-hidden="true"
            />
          </div>
          <div className="flex flex-col">
            <h3 className="text-label-md text-on-surface">{sesion.actividad}</h3>
            <span className="text-xs text-on-surface-variant">
              Turno #{sesion.turno_id}
            </span>
          </div>
        </div>
        {tipos.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            {tipos.map((tipo) => (
              <TipoChip key={tipo} tipo={tipo} />
            ))}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="relative z-10 flex flex-col gap-sm text-label-sm text-on-surface-variant">
        <div className="flex items-center gap-3">
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
          <span>{formatReservaFecha(sesion.fecha, sesion.hora)}</span>
        </div>
        <div className="flex items-center gap-3">
          <Users className="size-4 shrink-0" aria-hidden="true" />
          <span>
            Cupo: {ocupados} / {cupo}
          </span>
          <div className="ml-auto w-16 h-1.5 bg-outline-variant rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full", lleno ? "bg-error" : "bg-primary")}
              style={{ width: `${ocupacion}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <UserCheck className="size-4 shrink-0" aria-hidden="true" />
          <span>
            Asistencia: {asistencias} / {reservas}
          </span>
          <div className="ml-auto w-16 h-1.5 bg-outline-variant rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-success-green"
              style={{ width: `${asistenciaPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer: ver detalle */}
      <div className="relative z-10 flex items-center justify-end gap-1 pt-sm border-t border-outline-variant text-label-sm text-primary">
        <span>Ver detalle</span>
        <ChevronRight
          className="size-4 group-hover:translate-x-0.5 transition-transform"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

export default function TurnosReservadosPage() {
  usePageTitle("Turnos Reservados");

  const [sesiones, setSesiones] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    let active = true;
    listSesionesReservadas()
      .then((data) => {
        if (active) setSesiones(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setSesiones([]);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Separamos pasados (día anterior a hoy) de próximos para que el historial no
  // se mezcle con lo que todavía está por jugarse. Cada grupo conserva el orden
  // ascendente que ya trae el backend.
  const { proximos, pasados } = useMemo(() => {
    const hoy = todayISO();
    const proximos = [];
    const pasados = [];
    for (const sesion of filtrarSesionesPorTipo(sesiones, filtro)) {
      (sesion.fecha < hoy ? pasados : proximos).push(sesion);
    }
    return { proximos, pasados };
  }, [sesiones, filtro]);

  const hasSesiones = sesiones.length > 0;

  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-6xl mx-auto w-full pb-xl">
      <header className="flex flex-col gap-1">
        <PageHeading>Turnos Reservados</PageHeading>
        <p className="text-body-md text-on-surface-variant">
          Gestión de sesiones y control de cupos.
        </p>
      </header>

      {!loaded ? null : hasSesiones ? (
        <div className="flex flex-col gap-lg">
          <SegmentedControl
            options={FILTROS_TIPO}
            value={filtro}
            onChange={setFiltro}
            aria-label="Filtrar por tipo de reserva"
          />

          {proximos.length === 0 && pasados.length === 0 && (
            <p className="text-body-md text-on-surface-variant">
              No hay turnos {filtro === "mensual" ? "mensuales" : "eventuales"}.
            </p>
          )}

          {proximos.length > 0 && (
            <section className="flex flex-col gap-md">
              <h2 className="text-headline-md text-on-surface">Próximos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
                {proximos.map((sesion) => (
                  <SesionCard
                    key={`${sesion.turno_id}-${sesion.fecha}`}
                    sesion={sesion}
                  />
                ))}
              </div>
            </section>
          )}
          {pasados.length > 0 && (
            <section className="flex flex-col gap-md">
              <h2 className="text-headline-md text-on-surface-variant">
                Pasados
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter opacity-60">
                {pasados.map((sesion) => (
                  <SesionCard
                    key={`${sesion.turno_id}-${sesion.fecha}`}
                    sesion={sesion}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <section className="bg-surface-container border border-outline-variant rounded-xl flex flex-col overflow-hidden">
          <div className="p-md md:p-lg flex flex-col items-center justify-center py-xl text-on-surface-variant">
            <CalendarX2 className="size-12 mb-3 opacity-70" />
            <p className="text-headline-md">Todavía no hay turnos reservados</p>
            <p className="text-body-md opacity-70 mt-1">
              Cuando un cliente reserve un turno, su sesión aparecerá acá.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
