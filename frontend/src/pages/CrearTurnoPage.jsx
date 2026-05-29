import { useEffect, useState } from "react";
import { Clock, FileText, Users, AlertCircle, CheckCircle } from "lucide-react";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function CrearTurnoPage() {

  const [actividadesDisponibles, setActividadesDisponibles] = useState([]);
  const [actividadSeleccionada, setActividadSeleccionada] = useState(null);
  const [dia, setDia] = useState(null);
  const [hora, setHora] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cupo, setCupo] = useState(1);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (actividadSeleccionada === null) {
      setError("Por favor, seleccioná una actividad de la lista.");
      return;
    }
    if (dia === null) {
      setError("Por favor, seleccioná un día de la semana.");
      return;
    }
    if (!hora) {
      setError("Falta ingresar el horario del turno.");
      return;
    }
    if (cupo < 1) {
      setError("El cupo mínimo es 1.");
      return;
    }

    const turnoData = {
      actividad_id: actividadSeleccionada,
      dia_semana: dia,
      hora: `${hora}:00`,
      descripcion: descripcion.trim(),
      cupo: parseInt(cupo)
    };

    try {
      const res = await fetch("/api/turnos/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(turnoData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Hubo un problema al agendar el turno.");
        return;
      }

      setSuccess(true);
      setActividadSeleccionada(null);
      setDia(null);
      setHora("");
      setDescripcion("");
      setCupo(1);

    } catch (err) {
      setError("Error de conexión con el servidor. Verificá que el backend esté corriendo.");
    }
  };

  const obtenerEmoji = (nombre) => {
    const mapa = {
      "Fútbol": "⚽",
      "Pádel": "🎾",
      "Básquet": "🏀",
      "Vóley": "🏐"
    };
    return mapa[nombre] || "💪";
  };

  useEffect(() => {
    const cargarActividades = async () => {
      try {
        const res = await fetch("/api/actividades");
        if (res.ok) {
          const data = await res.json();
          setActividadesDisponibles(data);
        }
      } catch (err) {
        console.error("Error de conexión al cargar actividades:", err);
      }
    };
    cargarActividades();
  }, []);

  return (
    <div className="flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl rounded-2xl shadow-xl bg-surface p-8 md:p-10">

        <div className="mb-8 border-b border-outline-variant pb-4">
          <h2 className="text-3xl font-black text-foreground">Nuevo Turno</h2>
          <p className="text-on-surface-variant mt-1 text-sm">
            Los turnos son semanales y recurrentes. Ej: todos los miércoles a las 18:00.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">

          {/* PASO 1: Actividad */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-bold text-on-surface uppercase tracking-wider">
              1. Seleccioná la Actividad
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {actividadesDisponibles.map((actividad) => {
                const idActividad = Number(actividad.id);
                const estaSeleccionada = actividadSeleccionada === idActividad;
                return (
                  <button
                    key={actividad.id}
                    type="button"
                    onClick={() => setActividadSeleccionada(idActividad)}
                    className={`p-4 rounded-xl border text-center font-bold transition-all flex flex-col items-center justify-center gap-2 cursor-pointer
                      ${estaSeleccionada
                        ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20 shadow-md"
                        : "border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container hover:border-outline"
                      }`}
                  >
                    <span className="text-2xl">{obtenerEmoji(actividad.nombre)}</span>
                    <span className="text-sm">{actividad.nombre}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PASO 2: Día de la semana */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-bold text-on-surface uppercase tracking-wider">
              2. Día de la Semana
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {DIAS.map((d) => {
                const estaSeleccionado = dia === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDia(d)}
                    className={`py-3 px-1 rounded-xl border text-center text-sm font-bold transition-all cursor-pointer
                      ${estaSeleccionado
                        ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20 shadow-md"
                        : "border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container hover:border-outline"
                      }`}
                  >
                    <span className="sm:hidden">{d.slice(0, 3)}</span>
                    <span className="hidden sm:inline">{d.slice(0, 3)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PASO 3: Horario */}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-on-surface uppercase tracking-wider">3. Horario</span>
            <div className="flex items-center border border-outline rounded-lg bg-surface px-4 py-3 gap-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <Clock size={18} className="text-on-surface-variant shrink-0" />
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="flex-1 outline-none text-base bg-transparent text-foreground"
              />
            </div>
          </label>

          {/* PASO 4: Descripción */}
          <label className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-on-surface uppercase tracking-wider">4. Descripción</span>
              <span className="text-xs text-on-surface-variant font-medium">(Opcional)</span>
            </div>
            <div className="flex items-start border border-outline rounded-lg bg-surface px-4 py-3 gap-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <FileText size={18} className="text-on-surface-variant shrink-0 mt-0.5" />
              <textarea
                placeholder="Ej: Cancha 3, partido de profes, traer pelota..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows="3"
                className="flex-1 outline-none text-base bg-transparent resize-none text-foreground"
              />
            </div>
          </label>

          {/* PASO 5: Cupo */}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-on-surface uppercase tracking-wider">5. Cupo</span>
            <div className="flex items-center border border-outline rounded-lg bg-surface px-4 py-3 gap-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <Users size={18} className="text-on-surface-variant shrink-0" />
              <input
                type="number"
                min="1"
                value={cupo}
                onChange={(e) => setCupo(e.target.value)}
                className="flex-1 outline-none text-base bg-transparent text-foreground"
              />
            </div>
          </label>

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-200 font-medium flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 border border-green-200 font-medium flex items-center gap-2">
              <CheckCircle size={18} className="shrink-0" />
              ¡Turno creado con éxito!
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-primary px-6 py-4 text-base font-bold text-primary-foreground shadow-lg hover:bg-secondary-variant hover:shadow-xl transition-all cursor-pointer text-center"
          >
            Crear Turno
          </button>

        </form>
      </div>
    </div>
  );
}