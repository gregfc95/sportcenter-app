import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ dni: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Credenciales incorrectas.");
        return;
      }
      navigate("/dashboard");
    } catch {
      setError("Error de conexión con el servidor.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💪</span>
          <span className="font-bold text-gray-900 text-lg">Centro Deportivo</span>
        </div>
        <button className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-full transition-all text-sm">
          ❓ Soporte
        </button>
      </header>

      {/* Contenido */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="flex w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden bg-white">
          {/* Panel izquierdo */}
          <div className="hidden md:flex flex-1 flex-col justify-between p-10 bg-[#9A2A46] text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center opacity-10"
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800')" }}
            />
            <div className="relative z-10">
              <h1 className="text-3xl font-black leading-tight mb-4">
                Entrena con los mejores.
              </h1>
              <p className="text-white/80 text-base">
                Accede a tu panel personal para gestionar tus clases, entrenamientos y membresía.
              </p>
            </div>
            <div className="relative z-10 flex items-center gap-2 text-white/80 text-sm">
              <span>🛡️</span>
              <span>Entorno de acceso seguro</span>
            </div>
          </div>

          {/* Panel derecho - formulario */}
          <div className="flex flex-1 flex-col justify-center px-8 py-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Iniciar sesión</h2>
              <p className="text-slate-500 mt-1 text-sm">Bienvenido de nuevo, te echábamos de menos.</p>
            </div>

            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-gray-800">DNI / NIE</span>
                <div className="flex items-center border border-slate-300 rounded-lg bg-white px-4 py-3 gap-2 focus-within:border-[#9A2A46] focus-within:ring-2 focus-within:ring-[#9A2A46]/20 transition-all">
                  <span className="text-slate-400">🪪</span>
                  <input
                    name="dni"
                    type="text"
                    placeholder="12345678X"
                    value={form.dni}
                    onChange={handleChange}
                    className="flex-1 outline-none text-base bg-transparent"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-800">Contraseña</span>
                  <a href="#" className="text-xs text-[#9A2A46] font-semibold hover:underline">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <div className="flex items-center border border-slate-300 rounded-lg bg-white px-4 py-3 gap-2 focus-within:border-[#9A2A46] focus-within:ring-2 focus-within:ring-[#9A2A46]/20 transition-all">
                  <span className="text-slate-400">🔒</span>
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    className="flex-1 outline-none text-base bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </label>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="remember" className="h-4 w-4 rounded border-slate-300" />
                <label htmlFor="remember" className="text-sm text-slate-600">Recordar sesión</label>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-[#9A2A46] px-6 py-4 text-base font-bold text-white shadow-lg hover:bg-[#7d2239] transition-all"
              >
                Acceder a mi cuenta
              </button>
            </form>

            <div className="mt-8 flex flex-col items-center gap-4">
              <p className="text-sm text-slate-600">
                ¿Aún no eres miembro?{" "}
                <a href="/register" className="font-bold text-[#9A2A46] hover:underline">
                  Regístrate ahora
                </a>
              </p>
              <div className="flex gap-3 w-full">
                <button className="flex-1 flex items-center justify-center gap-2 border border-slate-200 rounded-lg py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
                  📱 Acceso QR
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 border border-slate-200 rounded-lg py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
                  📥 Descargar App
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400">
        © 2024 Centro Deportivo. Todos los derechos reservados. | Privacidad | Términos
      </footer>
    </div>
  );
}