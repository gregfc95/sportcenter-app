import { useEffect, useState } from "react";
import { ChevronDown, Clock, Users, Pencil, CalendarDays } from "lucide-react";

const DIAS_ORDEN = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const EMOJIS = {
  "Fútbol": "⚽",
  "Pádel": "🎾",
  "Básquet": "🏀",
  "Vóley": "🏐",
};

function AppointmentCard({ turno, onModificar }) {
  const inscriptos = turno.cupo - turno.disponibles;
  const ocupacion = Math.round((inscriptos / turno.cupo) * 100);
  const lleno = turno.disponibles === 0;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface px-5 py-4 hover:border-outline hover:shadow-sm transition-all">
      <div className="flex items-center gap-4 min-w-0">

        {/* Hora */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Clock size={14} className="text-primary" />
          <span className="text-base font-black text-foreground">{turno.hora}</span>
        </div>

        {/* Separador */}
        <div className="w-px h-8 bg-outline-variant shrink-0" />

        {/* Cupo */}
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

        {/* Descripción */}
        {turno.descripcion && (
          <>
            <div className="w-px h-8 bg-outline-variant shrink-0" />
            <p className="text-sm text-on-surface-variant truncate">{turno.descripcion}</p>
          </>
        )}
      </div>

      {/* Botón modificar */}
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

export default function TurnosPage({ onModificar }) {
  const [turnosAgrupados, setTurnosAgrupados] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarTurnos = async () => {
      try {
        const res = await fetch("/api/turnos/");
        if (!res.ok) throw new Error("No se pudieron cargar los turnos.");
        const data = await res.json();

        // Agrupar: { actividad: { dia: [turnos ordenados por hora] } }
        const agrupados = {};
        for (const turno of data) {
          if (!agrupados[turno.actividad]) agrupados[turno.actividad] = {};
          if (!agrupados[turno.actividad][turno.dia_semana]) agrupados[turno.actividad][turno.dia_semana] = [];
          agrupados[turno.actividad][turno.dia_semana].push(turno);
        }
        // Ordenar turnos de cada día por hora
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

  if (cargando) {
    return (
      <div className="flex items-center justify-center px-4 py-12 text-on-surface-variant">
        Cargando turnos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center px-4 py-12 text-red-600 text-sm font-medium">
        {error}
      </div>
    );
  }

  const actividades = Object.keys(turnosAgrupados);

  return (
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
                onModificar={onModificar}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}