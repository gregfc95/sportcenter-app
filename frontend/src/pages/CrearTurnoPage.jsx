import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CrearTurnoPage() {
  const navigate = useNavigate();

  // 1. Obtenemos la fecha de hoy en formato YYYY-MM-DD
  const fechaHoy = new Date().toISOString().split('T')[0];

  // Lista oficial de actividades del Centro Deportivo
  const actividadesDisponibles = ["Fútbol", "Pádel", "Básquet", "Vóley"];

  // Estados del formulario
  const [actividadSeleccionada, setActividadSeleccionada] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cupo, setCupo] = useState(1); 

  // Estados para alertas y feedback de la API
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // 1. Validaciones manuales antes de disparar el Fetch
    if (!actividadSeleccionada) {
      setError("Por favor, seleccioná una actividad de la lista.");
      return;
    }
    if (!fecha) {
      setError("Falta ingresar la fecha del turno.");
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

    const fechaTurno= new Date(`${fecha}T${hora}:00`);
    const fechaActual = new Date();
    if (fechaTurno < fechaActual) {
      setError("No se pueden crear turnos en el pasado. Por favor, seleccioná una fecha y hora futuras.");
      return;
    }

    // 2. Combinamos Fecha y Hora en formato ISO 8601 que espera Python (DateTime)
    // Ejemplo: "2026-05-25 19:30:00"
    const fechaHoraCombinada = `${fecha} ${hora}:00`;

    // 3. Armamos el objeto JSON para enviar
    const turnoData = {
      actividad: actividadSeleccionada,
      horario: fechaHoraCombinada, // Enviamos la fecha y hora combinada
      descripcion: descripcion.trim(), // Si está vacío, manda un string vacío ""
      cupo: parseInt(cupo) // Agregamos el campo cupo
    };

    try {
      // Reemplazá el puerto 5000 si tu Docker de Python corre en otro
      const res = await fetch("/api/turnos/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(turnoData),
      });

      const data = await res.json();

      if (!res.ok) {
        // Captura los errores del backend (ej: "turno superpuesto")
        setError(data.error || "Hubo un problema al agendar el turno.");
        return;
      }

      // Si el servidor responde OK, limpiamos los campos y tiramos éxito
      setSuccess(true);
      setActividadSeleccionada("");
      setFecha("");
      setHora("");
      setDescripcion("");
      setCupo(1);

    } catch (err) {
      setError("Error de conexión con el servidor. Verificá que el backend en Docker esté corriendo.");
    }
  };


  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans text-gray-900">
      
      {/* Header oficial con la marca y colores del proyecto */}
      <header className="bg-white px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💪</span>
          <span className="font-bold text-gray-900 text-lg">Centro Deportivo</span>
        </div>
        <div className="text-sm font-semibold text-slate-500">
          Módulo Admin 🛠️
        </div>
      </header>

      {/* Bloque del Formulario principal */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl rounded-2xl shadow-xl bg-white p-8 md:p-10">
          
          <div className="mb-8 border-b border-slate-100 pb-4">
            <h2 className="text-3xl font-black text-gray-900">Nuevo Turno</h2>
            <p className="text-slate-500 mt-1 text-sm">Completá los campos para reservar una nueva sesión en el sistema.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            
            {/* PASO 1: Selección de Actividades (Tarjetas sin entrada de teclado) */}
            <div className="flex flex-col gap-3">
              <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                1. Seleccioná la Actividad
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {actividadesDisponibles.map((actividad) => {
                  const estaSeleccionada = actividadSeleccionada === actividad;
                  return (
                    <button
                      key={actividad}
                      type="button"
                      onClick={() => setActividadSeleccionada(actividad)}
                      className={`p-4 rounded-xl border text-center font-bold transition-all flex flex-col items-center justify-center gap-2 cursor-pointer
                        ${estaSeleccionada 
                          ? "border-[#9A2A46] bg-[#9A2A46]/5 text-[#9A2A46] ring-2 ring-[#9A2A46]/20 shadow-md" 
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                    >
                      <span className="text-2xl">
                        {actividad === "Fútbol" && "⚽"}
                        {actividad === "Pádel" && "🎾"}
                        {actividad === "Básquet" && "🏀"}
                        {actividad === "Vóley" && "🏐"}
                      </span>
                      <span className="text-sm">{actividad}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PASO 2: Calendario y Horario nativos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">2. Fecha</span>
                <div className="flex items-center border border-slate-300 rounded-lg bg-white px-4 py-3 gap-2 focus-within:border-[#9A2A46] focus-within:ring-2 focus-within:ring-[#9A2A46]/20 transition-all">
                  <span className="text-slate-400">📅</span>
                  <input
                    type="date"
                    min={fechaHoy} // No permitir fechas pasadas
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="flex-1 outline-none text-base bg-transparent text-gray-900"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">3. Horario</span>
                <div className="flex items-center border border-slate-300 rounded-lg bg-white px-4 py-3 gap-2 focus-within:border-[#9A2A46] focus-within:ring-2 focus-within:ring-[#9A2A46]/20 transition-all">
                  <span className="text-slate-400">⏰</span>
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="flex-1 outline-none text-base bg-transparent text-gray-900"
                  />
                </div>
              </label>
            </div>

            {/* PASO 3: Notas Adicionales (Opcional) */}
            <label className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">4. Descripción</span>
                <span className="text-xs text-slate-400 font-medium">(Opcional)</span>
              </div>
              <div className="flex items-start border border-slate-300 rounded-lg bg-white px-4 py-3 gap-2 focus-within:border-[#9A2A46] focus-within:ring-2 focus-within:ring-[#9A2A46]/20 transition-all">
                <span className="text-slate-400 mt-0.5">📝</span>
                <textarea
                  placeholder="Ej: Cancha 3, partido de profes, traer pelota..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows="3"
                  className="flex-1 outline-none text-base bg-transparent resize-none text-gray-900"
                />
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">5. Cupo</span>
              <div className="flex items-center border border-slate-300 rounded-lg bg-white px-4 py-3 gap-2 focus-within:border-[#9A2A46] focus-within:ring-2 focus-within:ring-[#9A2A46]/20 transition-all">
                <span className="text-slate-400">👥</span>
                <input
                  type="number"
                  min="1"
                  value={cupo}
                  onChange={(e) => setCupo(e.target.value)}
                  className="flex-1 outline-none text-base bg-transparent text-gray-900"
                />
              </div>
            </label>

            {/* Bloques dinámicos para mostrar errores o confirmaciones */}
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-200 font-medium flex items-center gap-2">
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 border border-green-200 font-medium flex items-center gap-2">
                ✅ ¡Turno creado con éxito!
              </div>
            )}

            {/* Botón de envío que hereda el estilo hover del Login */}
            <button
              type="submit"
              className="w-full rounded-lg bg-[#9A2A46] px-6 py-4 text-base font-bold text-white shadow-lg hover:bg-[#7d2239] hover:shadow-xl transition-all cursor-pointer text-center"
            >
              Crear Turno
            </button>
          </form>

        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400 bg-white md:bg-transparent border-t md:border-none border-slate-200">
        © 2026 Centro Deportivo. Módulo de Administración.
      </footer>
    </div>
  );
}