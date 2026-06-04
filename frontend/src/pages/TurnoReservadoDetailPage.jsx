import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, ChevronRight, Clock, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { usePageTitle } from "@/lib/usePageTitle";
import { cn, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getActividadIcon } from "@/components/actividades/actividadIcons";
import { getSesionReservada, registrarPagoManual } from "@/components/reservas/api";
import RegistrarPagoDialog from "@/components/reservas/RegistrarPagoDialog";

// Mismo criterio de estados de pago que en Mis Turnos: pagado > señado > pendiente.
const ESTADOS = {
  pagado: {
    label: "Pagado",
    dot: "bg-success-green",
    text: "text-success-green",
    chip: "bg-success-green/10 border-success-green/30",
  },
  senado: {
    label: "Señado",
    dot: "bg-accent",
    text: "text-accent",
    chip: "bg-accent/10 border-accent/30",
  },
  pendiente: {
    label: "Pendiente",
    dot: "bg-error",
    text: "text-error",
    chip: "bg-error/10 border-error/30",
  },
};

// Una reserva mensual es de un cliente abonado; una eventual, de paso.
const TIPO_LABELS = { eventual: "Eventual", mensual: "Abonado" };

function formatFechaLarga(iso, diaSemana) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const dia = diaSemana
    ? diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)
    : "";
  return `${dia} ${d}/${m}/${y}`.trim();
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const info = ESTADOS[estado] ?? ESTADOS.pendiente;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border",
        info.chip,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", info.dot)} />
      <span
        className={cn(
          "text-[10px] font-bold uppercase tracking-widest",
          info.text,
        )}
      >
        {info.label}
      </span>
    </span>
  );
}

export default function TurnoReservadoDetailPage() {
  const { turnoId, fecha } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState("");

  usePageTitle(data?.turno ? `${data.turno.actividad} reservado` : "Turno reservado");

  const fetchSesion = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await getSesionReservada(turnoId, fecha);
      setData(result);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [turnoId, fecha]);

  useEffect(() => {
    fetchSesion();
  }, [fetchSesion]);

  const handleRegistrarPago = async (reservaId) => {
    await registrarPagoManual(reservaId);
    toast.success("Pago registrado");
    await fetchSesion();
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-6xl mx-auto w-full">
        <p className="text-on-surface-variant">Cargando sesión...</p>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="flex flex-col gap-md px-margin-mobile md:px-lg mt-md md:mt-lg max-w-6xl mx-auto w-full">
        <p className="text-destructive">
          {loadError ?? "No se encontró la sesión."}
        </p>
        <Button asChild variant="outline" className="self-start">
          <Link to="/turnos">Volver a Turnos Reservados</Link>
        </Button>
      </div>
    );
  }

  const { turno, reservas } = data;
  const Icon = getActividadIcon(turno.actividad);
  const ocupacion =
    turno.cupo > 0 ? Math.min(100, (turno.ocupados / turno.cupo) * 100) : 0;
  const lleno = turno.cupo > 0 && turno.ocupados >= turno.cupo;
  const count = reservas.length;

  const term = query.trim().toLowerCase();
  const filtered = term
    ? reservas.filter((reserva) => {
        const nombre = reserva.cliente?.nombre?.toLowerCase() ?? "";
        const email = reserva.cliente?.email?.toLowerCase() ?? "";
        return nombre.includes(term) || email.includes(term);
      })
    : reservas;

  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-6xl mx-auto w-full pb-xl">
      <nav
        aria-label="Migas de pan"
        className="flex items-center gap-1 text-label-md text-on-surface-variant"
      >
        <Link to="/turnos" className="hover:text-primary transition-colors">
          Turnos Reservados
        </Link>
        <ChevronRight className="size-4" aria-hidden="true" />
        <span className="text-on-surface">
          {turno.actividad} {formatFechaLarga(turno.fecha, turno.dia_semana)}{" "}
          {turno.hora}
        </span>
      </nav>

      {/* Información del Turno */}
      <section className="bg-surface-container border border-outline-variant rounded-xl relative overflow-hidden group">
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-700 pointer-events-none"
        />
        <div className="relative z-10 p-md md:p-lg">
          <div className="flex flex-col md:flex-row md:items-center gap-md border-b border-outline-variant/40 pb-md mb-lg">
            <div className="w-12 h-12 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center shrink-0">
              <Icon className="size-6 text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-headline-md text-on-surface">
              Información del Turno
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-md gap-x-lg">
            <Field label="Actividad">
              <span className="text-body-md text-on-surface font-medium">
                {turno.actividad}
              </span>
            </Field>

            <Field label="Fecha">
              <span className="text-body-md text-on-surface font-medium flex items-center gap-2">
                <CalendarDays
                  className="size-4 text-on-surface-variant"
                  aria-hidden="true"
                />
                {formatFechaLarga(turno.fecha, turno.dia_semana)}
              </span>
            </Field>

            <Field label="Horario">
              <span className="text-body-md text-on-surface font-medium flex items-center gap-2">
                <Clock
                  className="size-4 text-on-surface-variant"
                  aria-hidden="true"
                />
                {turno.hora}
              </span>
            </Field>

            <Field label="Cupo">
              <div className="flex items-center gap-3">
                <span className="text-body-md text-on-surface font-medium">
                  {turno.ocupados}/{turno.cupo}
                </span>
                <div className="h-2 w-24 bg-outline-variant rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      lleno ? "bg-error" : "bg-primary",
                    )}
                    style={{ width: `${ocupacion}%` }}
                  />
                </div>
              </div>
            </Field>
          </div>
        </div>
      </section>

      {/* Reservas */}
      <section className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <div className="p-md md:p-lg border-b border-outline-variant/40 flex flex-col sm:flex-row sm:items-center justify-between gap-md">
          <div className="flex items-center gap-3">
            <h2 className="text-headline-md text-on-surface">Reservas</h2>
            <span className="px-3 py-1 rounded bg-surface-container-high text-on-surface-variant text-label-sm">
              {count} {count === 1 ? "reserva" : "reservas"}
            </span>
          </div>

          {count > 0 && (
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o email"
                className="pl-9"
                aria-label="Buscar reservas por nombre o email"
              />
            </div>
          )}
        </div>

        {count === 0 ? (
          <div className="p-md md:p-lg flex flex-col items-center justify-center py-xl text-on-surface-variant">
            <Users className="size-12 mb-3 opacity-70" />
            <p className="text-headline-md">No hay reservas en esta sesión.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high border-b border-outline-variant">
                  <th className="py-md px-md text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="py-md px-md text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="py-md px-md text-label-sm text-on-surface-variant uppercase tracking-wider text-center">
                    Estado
                  </th>
                  <th className="py-md px-md text-label-sm text-on-surface-variant uppercase tracking-wider text-right">
                    Pagado
                  </th>
                  <th className="py-md px-md text-right">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-lg px-md text-center text-on-surface-variant"
                    >
                      No se encontraron reservas para "{query.trim()}".
                    </td>
                  </tr>
                ) : (
                  filtered.map((reserva) => {
                    const abonado = reserva.tipo === "mensual";
                    return (
                      <tr
                        key={reserva.id}
                        className="hover:bg-surface-container-high/40 transition-colors"
                      >
                        <td className="py-sm px-md">
                          <div className="flex flex-col">
                            <span className="text-body-md text-on-surface">
                              {reserva.cliente?.nombre ?? "—"}
                            </span>
                            {reserva.cliente?.email && (
                              <span className="text-xs text-on-surface-variant">
                                {reserva.cliente.email}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-sm px-md text-body-md">
                          <span
                            className={cn(
                              abonado
                                ? "text-primary"
                                : "text-on-surface-variant",
                            )}
                          >
                            {TIPO_LABELS[reserva.tipo] ?? reserva.tipo}
                          </span>
                        </td>
                        <td className="py-sm px-md text-center">
                          <EstadoBadge estado={reserva.estado} />
                        </td>
                        <td className="py-sm px-md text-right text-on-surface font-medium">
                          {formatPrice(reserva.monto_pagado)}
                        </td>
                        <td className="py-sm px-md text-right">
                          {(reserva.estado === "senado" ||
                            reserva.estado === "pendiente") && (
                            <RegistrarPagoDialog
                              cliente={reserva.cliente?.nombre}
                              actividad={turno.actividad}
                              datetime={`${formatFechaLarga(
                                turno.fecha,
                                turno.dia_semana,
                              )} ${turno.hora}`}
                              precio={reserva.precio ?? turno.precio}
                              pagado={reserva.monto_pagado}
                              saldo={reserva.saldo}
                              onConfirm={() => handleRegistrarPago(reserva.id)}
                              trigger={
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-primary border-primary/40 hover:bg-primary/10 hover:text-primary"
                                >
                                  Registrar Pago
                                </Button>
                              }
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
