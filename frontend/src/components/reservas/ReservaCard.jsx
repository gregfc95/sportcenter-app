import { useState } from "react";
import { CalendarDays, Check, MoveRight, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EstadoBadge } from "@/components/ui/estado-badge";
import { getActividadIcon } from "@/components/actividades/actividadIcons";
import PagarSaldoDialog from "@/components/reservas/PagarSaldoDialog";
import PagarSenaDialog from "@/components/reservas/PagarSenaDialog";
import PagarMensualidadDialog from "@/components/reservas/PagarMensualidadDialog";
import CancelarReservaDialog from "@/components/reservas/CancelarReservaDialog";
import { formatReservaFecha } from "@/lib/fecha";
import { cn } from "@/lib/utils";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// "01/07" a partir de una fecha ISO (YYYY-MM-DD).
function ddmm(iso) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

// "Julio 2026" a partir de una fecha ISO (YYYY-MM-DD).
function mesLabel(iso) {
  const [y, m] = iso.split("-");
  return `${MESES[Number(m) - 1]} ${y}`;
}

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

      {/* Actions — cancelar (por clase en los abonos) y pago si falta. */}
      <div className="relative z-10 flex items-center gap-sm pt-sm border-t border-outline-variant">
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

// Chip de tipo ("mensual" / "eventual") alineado a la derecha en los detalles.
function TipoChip({ tipo }) {
  return (
    <span className="ml-auto px-2 py-0.5 bg-surface-container-high rounded text-xs capitalize">
      {tipo}
    </span>
  );
}

/**
 * Fila de chips con las clases del abono mensual: las pasadas quedan marcadas
 * como completadas; entre las próximas se elige la clase sobre la que actúa
 * "Cancelar clase" (cada fecha se cancela individualmente, nunca en bloque).
 */
function ClasesMensuales({ clases, selectedId, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 snap-x">
      {clases.map((clase) => {
        const selected = clase.reserva_id === selectedId;
        if (clase.pasada) {
          return (
            <div
              key={clase.reserva_id}
              title="Clase pasada"
              className="snap-center shrink-0 relative flex items-center justify-center w-16 h-14 rounded-lg border border-outline-variant bg-surface-container-low opacity-60"
            >
              <span className="text-label-sm text-on-surface-variant">
                {ddmm(clase.fecha)}
              </span>
              <Check
                className="size-3.5 text-success-green absolute top-1 right-1"
                aria-hidden="true"
              />
            </div>
          );
        }
        return (
          <button
            key={clase.reserva_id}
            type="button"
            onClick={() => onSelect(clase.reserva_id)}
            aria-pressed={selected}
            className={cn(
              "snap-center shrink-0 flex items-center justify-center w-16 h-14 rounded-lg border transition-colors cursor-pointer",
              selected
                ? "border-primary bg-primary/10 ring-1 ring-primary/50"
                : "border-outline-variant bg-surface-container-high hover:border-primary/50",
            )}
          >
            <span
              className={cn(
                "text-label-sm",
                selected ? "text-primary" : "text-on-surface",
              )}
            >
              {ddmm(clase.fecha)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ReservaMensualCard({ reserva, onCancelled }) {
  const clases = reserva.mensualidad.clases;
  const proximas = clases.filter((c) => !c.pasada);
  const pasadas = clases.length - proximas.length;

  // Clase del abono sobre la que actúa "Cancelar clase"; por defecto la próxima.
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
        <>
          {claseSeleccionada && (
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
          )}
          {reserva.estado !== "pagado" && (
            // El abono pendiente se paga completo (todas las clases del mes).
            <PagarMensualidadDialog
              reservaId={reserva.id}
              actividad={reserva.actividad}
              datetime={
                proximas[0]
                  ? formatReservaFecha(proximas[0].fecha, reserva.turno.hora)
                  : null
              }
              clases={clases.length}
              total={reserva.mensualidad.total}
              trigger={<PagarTrigger />}
            />
          )}
        </>
      }
    >
      <div className="flex items-center gap-3">
        <span className="text-label-sm text-primary">
          {clases.length > 0 ? mesLabel(clases[0].fecha) : ""}
        </span>
        <TipoChip tipo={reserva.tipo} />
      </div>
      <ClasesMensuales
        clases={clases}
        selectedId={claseSeleccionada?.reserva_id ?? null}
        onSelect={setClaseSeleccionadaId}
      />
      <div className="flex items-center gap-2">
        <MoveRight className="size-4 shrink-0" aria-hidden="true" />
        <span>
          {pasadas} de {clases.length}{" "}
          {clases.length === 1 ? "sesión" : "sesiones"}
          {proximas[0]
            ? ` · próxima: ${formatReservaFecha(proximas[0].fecha, reserva.turno.hora)}`
            : ""}
        </span>
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
        <span>{datetime}</span>
        <TipoChip tipo={reserva.tipo} />
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
