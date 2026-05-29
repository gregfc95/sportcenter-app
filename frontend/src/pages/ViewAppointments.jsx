import { useEffect, useState } from "react";
import { ChevronDown, Clock, Users, Pencil, CalendarDays, X, Save, AlertCircle } from "lucide-react";

const DIAS_ORDEN = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const EMOJIS = {
  "Fútbol": "⚽",
  "Pádel": "🎾",
  "Básquet": "🏀",
  "Vóley": "🏐",
};

// ─── Modal ───────────────────────────────────────────────────────────────────

function ModalModificar({ turno, onCerrar, onGuardado }) {
  const [cupo, setCupo] = useState(turno.cupo);
  const [descripcion, setDescripcion] = useState(turno.descripcion || "");
  const [errorCupo, setErrorCupo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");

  const inscriptos = turno.cupo - turno.disponibles;

  const validarCupo = (valor) => {
    const n = parseInt(valor, 10);
    if (isNaN(n) || n < 1) return "El cupo mínimo es 1.";
    if (n < inscriptos) return `No podés ingresar un cupo menor a los inscriptos actuales (${inscriptos}).`;
    return "";
  };

  const handleCupoChange = (e) => {
    setCupo(e.target.value);
    setErrorCupo(validarCupo(e.target.value));
  };

  const handleGuardar = async () => {
    const err = validarCupo(cupo);
    if (err) { setErrorCupo(err); return; }

    setGuardando(true);
    setErrorGuardar("");
    try {
      const res = await fetch(`/api/turnos/${turno.id}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cupo: parseInt(cupo, 10),
          descripcion: descripcion.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar.");
      }
      const turnoActualizado = await res.json();
      onGuardado(turnoActualizado);
      onCerrar();
    } catch (e) {
      setErrorGuardar(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-outline-variant bg-surface p-6 shadow-xl">

        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-black text-foreground">Modificar turno</h2>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {turno.actividad} · {turno.dia_semana} · {turno.hora}
            </p>
          </div>
          <button onClick={onCerrar} className="rounded-lg p-1.5 hover:bg-surface-container transition-all cursor-pointer">
            <X size={16} className="text-on-surface-variant" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 rounded-xl bg-surface-container px-4 py-3 mb-5">
          <div>
            <p className="text-xs text-on-surface-variant">Inscriptos</p>
            <p className="text-base font-black text-foreground">{inscriptos}</p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant">Cupo actual</p>
            <p className="text-base font-black text-foreground">{turno.cupo}</p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant">Disponibles</p>
            <p className="text-base font-black text-foreground">{turno.disponibles}</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold text-on-surface mb-1.5">Cupo máximo</label>
          <input
            type="number"
            min={1}
            value={cupo}
            onChange={handleCupoChange}
            className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          />
          {errorCupo && (
            <p className="flex items-center gap-1 mt-1.5 text-xs text-red-600">
              <AlertCircle size={12} /> {errorCupo}
            </p>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-on-surface mb-1.5">Descripción</label>
          <textarea
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Traer ropa cómoda"
            className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-primary"
          />
        </div>

        {errorGuardar && (
          <p className="flex items-center gap-1 mb-4 text-xs text-red-600">
            <AlertCircle size={12} /> {errorGuardar}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCerrar}
            className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface hover:bg-surface-container transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando || !!errorCupo}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Save size={13} />
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Componentes existentes (sin cambios) ────────────────────────────────────

function AppointmentCard({ turno, onModificar }) {
  const inscriptos = turno.cupo - turno.disponibles;
  const ocupacion = Math.round((inscriptos / turno.cupo) * 100);
  const lleno = turno.disponibles === 0;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface px-5 py-4 hover:border-outline hover:shadow-sm transition-all">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <Clock size={14} className="text-primary" />
          <span className="text-base font-black text-foreground">{turno.hora}</span>
        </div>
        <div className="w-px h-8 bg-outline-variant shrink-0" />
        <div className="flex flex-col gap-1 shrink-0 min-w-[80px]">
          <div className="flex items-center gap-1 text-xs text-on-surface-variant font-medium">
            <Users size={12} />
            <span>{inscriptos}/{turno.cupo}</span>
            {lleno && (
              <span className="ml-1 rounded-full bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5">
                LLENO
              </span>
            )}
          </div>
          <div className="h-1.5 w-20 rounded-full bg-outline-variant overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${ocupacion}%`,
                backgroundColor: lleno ? "#dc2626" : ocupacion >= 75 ? "#f59e0b" : "#9A2A46",
              }}
            />
          </div>
        </div>
        {turno.descripcion && (
          <>
            <div className="w-px h-8 bg-outline-variant shrink-0" />
            <p className="text-sm text-on-surface-variant truncate">{turno.descripcion}</p>
          </>
        )}
      </div>
      <button
        onClick={() => onModificar(turno)}
        className="shrink-0 flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-bold text-on-surface hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all cursor-pointer"
      >
        <Pencil size={13} />
        Modificar
      </button>
    </div>
  );
}

function DiaAccordion({ dia, turnos, onModificar }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="rounded-xl border border-outline-variant overflow-hidden">
      <button
        onClick={() => setAbierto(!abierto)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-surface-container hover:bg-surface-container-high transition-all cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <CalendarDays size={15} className="text-on-surface-variant" />
          <span className="text-sm font-bold text-on-surface">{dia}</span>
          <span className="rounded-full bg-outline-variant text-on-surface-variant text-xs font-bold px-2 py-0.5">
            {turnos.length} turno{turnos.length !== 1 ? "s" : ""}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-on-surface-variant transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
        />
      </button>
      {abierto && (
        <div className="flex flex-col gap-2 p-4 border-t border-outline-variant bg-surface">
          {turnos.map((turno) => (
            <AppointmentCard key={turno.id} turno={turno} onModificar={onModificar} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActividadAccordion({ actividad, turnosPorDia, onModificar }) {
  const [abierto, setAbierto] = useState(false);
  const totalTurnos = Object.values(turnosPorDia).reduce((acc, t) => acc + t.length, 0);
  const emoji = EMOJIS[actividad] || "💪";

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${abierto ? "border-primary/30 shadow-md" : "border-outline-variant"}`}>
      <button
        onClick={() => setAbierto(!abierto)}
        className="w-full flex items-center justify-between px-6 py-5 bg-surface hover:bg-surface-container transition-all cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <span className="text-2xl">{emoji}</span>
          <div className="text-left">
            <p className="text-base font-black text-foreground">{actividad}</p>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              {totalTurnos} turno{totalTurnos !== 1 ? "s" : ""} · {Object.keys(turnosPorDia).length} día{Object.keys(turnosPorDia).length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`text-on-surface-variant transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
        />
      </button>
      {abierto && (
        <div className="flex flex-col gap-2 p-4 border-t-2 border-outline-variant bg-surface-container/40">
          {DIAS_ORDEN.filter((d) => turnosPorDia[d]).map((dia) => (
            <DiaAccordion
              key={dia}
              dia={dia}
              turnos={turnosPorDia[dia]}
              onModificar={onModificar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page principal ───────────────────────────────────────────────────────────

export default function TurnosPage({ onModificar }) {
  const [turnosAgrupados, setTurnosAgrupados] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null); // 👈 nuevo

  useEffect(() => {
    const cargarTurnos = async () => {
      try {
        const res = await fetch("/api/turnos/");
        if (!res.ok) throw new Error("No se pudieron cargar los turnos.");
        const data = await res.json();

        const agrupados = {};
        for (const turno of data) {
          if (!agrupados[turno.actividad]) agrupados[turno.actividad] = {};
          if (!agrupados[turno.actividad][turno.dia_semana]) agrupados[turno.actividad][turno.dia_semana] = [];
          agrupados[turno.actividad][turno.dia_semana].push(turno);
        }
        for (const act of Object.values(agrupados)) {
          for (const dia of Object.values(act)) {
            dia.sort((a, b) => a.hora.localeCompare(b.hora));
          }
        }
        setTurnosAgrupados(agrupados);
      } catch (err) {
        setError("Error al cargar los turnos.");
      } finally {
        setCargando(false);
      }
    };
    cargarTurnos();
  }, []);

  // 👈 nuevo: actualiza el turno en el estado local sin recargar todo
  const handleGuardado = (turnoActualizado) => {
    setTurnosAgrupados((prev) => {
      const nuevo = structuredClone(prev);
      const dia = nuevo[turnoActualizado.actividad]?.[turnoActualizado.dia_semana];
      if (dia) {
        const idx = dia.findIndex((t) => t.id === turnoActualizado.id);
        if (idx !== -1) dia[idx] = { ...dia[idx], ...turnoActualizado };
      }
      return nuevo;
    });
  };

  if (cargando) return (
    <div className="flex items-center justify-center px-4 py-12 text-on-surface-variant">
      Cargando turnos...
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center px-4 py-12 text-red-600 text-sm font-medium">
      {error}
    </div>
  );

  const actividades = Object.keys(turnosAgrupados);

  return (
    <>
      <div className="flex justify-center px-4 py-12">
        <div className="w-full max-w-3xl flex flex-col gap-6">
          <div className="border-b border-outline-variant pb-4">
            <h2 className="text-3xl font-black text-foreground">Turnos Agendados</h2>
            <p className="text-on-surface-variant mt-1 text-sm">
              Seleccioná una actividad para ver sus turnos por día.
            </p>
          </div>
          {actividades.length === 0 ? (
            <p className="text-center text-on-surface-variant text-sm py-12">
              No hay turnos agendados todavía.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {actividades.map((actividad) => (
                <ActividadAccordion
                  key={actividad}
                  actividad={actividad}
                  turnosPorDia={turnosAgrupados[actividad]}
                  onModificar={setTurnoSeleccionado} // 👈 abre el modal
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 👈 Modal — aparece encima de todo cuando hay un turno seleccionado */}
      {turnoSeleccionado && (
        <ModalModificar
          turno={turnoSeleccionado}
          onCerrar={() => setTurnoSeleccionado(null)}
          onGuardado={handleGuardado}
        />
      )}
    </>
  );
}