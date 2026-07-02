import { useState } from "react";
import { CalendarDays, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EstadoBadge } from "@/components/ui/estado-badge";
import { TipoChip } from "@/components/ui/tipo-chip";
import { getActividadIcon } from "@/components/actividades/actividadIcons";
import PagarSaldoDialog from "@/components/reservas/PagarSaldoDialog";
import PagarSenaDialog from "@/components/reservas/PagarSenaDialog";
import PagarMensualidadDialog from "@/components/reservas/PagarMensualidadDialog";
import CancelarReservaDialog from "@/components/reservas/CancelarReservaDialog";
import CancelarAbonoDialog from "@/components/reservas/CancelarAbonoDialog";
import ClasesMensuales from "@/components/reservas/ClasesMensuales";
import { formatReservaFecha, mesLabel } from "@/lib/fecha";

// Los triggers se montan vía `DialogTrigger asChild`: hay que reenviar las
// props que inyecta Radix (onClick, ref, aria) al Button o el modal no abre.
function CancelarTrigger(props) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="text-error border-error/40 hover:bg-error/10 hover:text-error"
      {...props}
    >
      Cancelar
    </Button>
  );
}

function PagarTrigger(props) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="ml-auto text-primary border-primary/40 hover:bg-primary/10 hover:text-primary"
      {...props}
    >
      Pagar
    </Button>
  );
}

/**
 * Layout compartido de la card de reserva (eventual y mensual): glow, header
 * con icono/título/chip de estado, sección de detalles (children) y footer de
 * acciones.
 */
function ReservaCardShell({ actividad, subtitle, estado, children, actions }) {
  const Icon = getActividadIcon(actividad);

  return (
    <div className="relative overflow-hidden bg-surface-container border border-outline-variant rounded-xl p-md flex flex-col gap-md hover:border-primary/50 transition-colors">
      <div
        aria-hidden="true"
        className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none"
      />

      {/* Header: icon + name + status */}
      <div className="relative z-10 flex justify-between items-start gap-2">
        <div className="flex items-center gap-sm">
          <div className="w-12 h-12 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center shrink-0">
            <Icon className="size-6 text-primary" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-label-md text-on-surface">{actividad}</h3>
            <span className="text-xs text-on-surface-variant">{subtitle}</span>
          </div>
        </div>
        <EstadoBadge estado={estado} />
      </div>

      {/* Details */}
      <div className="relative z-10 flex flex-col gap-sm text-label-sm text-on-surface-variant">
        {children}
      </div>

      {/* Actions — cancelar (por clase en los abonos) y pago si falta.
          `mt-auto` los ancla abajo: en la grilla las cards se estiran a la
          fila y una eventual corta dejaría el footer flotando al medio. */}
      <div className="relative z-10 mt-auto flex items-center gap-sm pt-sm border-t border-outline-variant">
        {actions}
      </div>
      {/* TODO (a futuro): mostrar el QR del turno pagado. Reimportar `QrCode`
          de lucide-react al reactivar.
      {estado === "pagado" && (
        <div className="relative z-10 flex pt-sm border-t border-outline-variant">
          <Button variant="outline" size="sm" className="ml-auto">
            <QrCode className="size-4" />
            Ver QR
          </Button>
        </div>
      )}
      */}
    </div>
  );
}

function ReservaMensualCard({ reserva, onCancelled }) {
  const clases = reserva.mensualidad.clases;
  // Las canceladas se muestran tachadas pero no cuentan para selección,
  // sesiones ni pago.
  const vivas = clases.filter((c) => !c.cancelada);
  const proximas = vivas.filter((c) => !c.pasada);
  const pasadas = vivas.length - proximas.length;
  const pagado = reserva.estado === "pagado";
  const proximaDatetime = proximas[0]
    ? formatReservaFecha(proximas[0].fecha, reserva.turno.hora)
    : null;
  // Cupo del turno semanal (mismo dato que la eventual: el grupo comparte cupo).
  const { cupo, ocupados } = reserva.turno;
  const ocupacion = cupo > 0 ? Math.min(100, (ocupados / cupo) * 100) : 0;

  // Clase del abono pagado sobre la que actúa "Cancelar clase"; por defecto
  // la próxima. Un abono pendiente se cancela completo, sin selección.
  const [claseSeleccionadaId, setClaseSeleccionadaId] = useState(null);
  const claseSeleccionada =
    proximas.find((c) => c.reserva_id === claseSeleccionadaId) ??
    proximas[0] ??
    null;

  return (
    <ReservaCardShell
      actividad={reserva.actividad}
      subtitle={`Todos los ${reserva.turno.dia_semana} · ${reserva.turno.hora}`}
      estado={reserva.estado}
      actions={
        pagado ? (
          claseSeleccionada && (
            <CancelarReservaDialog
              reservaId={claseSeleccionada.reserva_id}
              actividad={reserva.actividad}
              datetime={formatReservaFecha(
                claseSeleccionada.fecha,
                reserva.turno.hora,
              )}
              mensual
              estado={reserva.estado}
              onCancelled={onCancelled}
              trigger={<CancelarTrigger />}
            />
          )
        ) : (
          <>
            {/* Sin pagos, el abono se cancela y se paga completo (todas las
                clases del mes). */}
            <CancelarAbonoDialog
              reservaId={reserva.id}
              actividad={reserva.actividad}
              clases={vivas.length}
              datetime={proximaDatetime}
              onCancelled={onCancelled}
              trigger={<CancelarTrigger />}
            />
            <PagarMensualidadDialog
              reservaId={reserva.id}
              actividad={reserva.actividad}
              datetime={proximaDatetime}
              clases={vivas.length}
              total={reserva.mensualidad.total}
              trigger={<PagarTrigger />}
            />
          </>
        )
      }
    >
      <div className="flex items-center gap-3">
        <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
        <span className="text-primary">
          {clases.length > 0 ? mesLabel(clases[0].fecha) : ""}
        </span>
        <TipoChip tipo={reserva.tipo} className="ml-auto" />
      </div>
      <ClasesMensuales
        clases={clases}
        selectable={pagado}
        selectedId={claseSeleccionada?.reserva_id ?? null}
        onSelect={setClaseSeleccionadaId}
      />
      <div className="flex items-center gap-2">
        <span>
          {pasadas} de {vivas.length}{" "}
          {vivas.length === 1 ? "sesión" : "sesiones"}
          {proximas[0]
            ? ` · próxima: ${formatReservaFecha(proximas[0].fecha, reserva.turno.hora)}`
            : ""}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Users className="size-4 shrink-0" aria-hidden="true" />
        <span>
          Cupo: {ocupados} / {cupo}
        </span>
        <div className="ml-auto w-16 h-1.5 bg-outline-variant rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${ocupacion}%` }}
          />
        </div>
      </div>
    </ReservaCardShell>
  );
}

function ReservaEventualCard({ reserva, onCancelled }) {
  const { cupo, ocupados } = reserva.turno;
  const ocupacion = cupo > 0 ? Math.min(100, (ocupados / cupo) * 100) : 0;
  const datetime = formatReservaFecha(reserva.fecha, reserva.turno.hora);

  // Pendiente reanuda la seña; señada paga el saldo restante.
  const PagarDialog =
    reserva.estado === "senado" ? PagarSaldoDialog : PagarSenaDialog;

  return (
    <ReservaCardShell
      actividad={reserva.actividad}
      subtitle={`Reserva #${reserva.id}`}
      estado={reserva.estado}
      actions={
        <>
          <CancelarReservaDialog
            reservaId={reserva.id}
            actividad={reserva.actividad}
            datetime={datetime}
            estado={reserva.estado}
            onCancelled={onCancelled}
            trigger={<CancelarTrigger />}
          />
          {reserva.estado !== "pagado" && (
            <PagarDialog
              reservaId={reserva.id}
              actividad={reserva.actividad}
              datetime={datetime}
              precio={reserva.precio}
              sena={reserva.sena}
              saldo={reserva.saldo}
              trigger={<PagarTrigger />}
            />
          )}
        </>
      }
    >
      <div className="flex items-center gap-3">
        <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
        <span className="text-primary">{datetime}</span>
        <TipoChip tipo={reserva.tipo} className="ml-auto" />
      </div>
      <div className="flex items-center gap-3">
        <Users className="size-4 shrink-0" aria-hidden="true" />
        <span>
          Cupo: {ocupados} / {cupo}
        </span>
        <div className="ml-auto w-16 h-1.5 bg-outline-variant rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${ocupacion}%` }}
          />
        </div>
      </div>
    </ReservaCardShell>
  );
}

export default function ReservaCard({ reserva, onCancelled }) {
  const esMensual =
    reserva.tipo === "mensual" && Array.isArray(reserva.mensualidad?.clases);
  return esMensual ? (
    <ReservaMensualCard reserva={reserva} onCancelled={onCancelled} />
  ) : (
    <ReservaEventualCard reserva={reserva} onCancelled={onCancelled} />
  );
}
