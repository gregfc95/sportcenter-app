import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dumbbell } from "lucide-react";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    dni: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirm_password) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          dni: form.dni,
          email: form.email,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error) {
          setError(data.error);
        } else {
          const messages = Object.entries(data)
            .map(([field, errs]) => `${field}: ${errs.join(", ")}`)
            .join(" | ");
          setError(messages);
        }
        return;
      }
      navigate("/login");
    } catch {
      setError("Error de conexión con el servidor.");
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <div
        className="hidden lg:flex flex-1 flex-col justify-center items-center p-12 relative overflow-hidden"
        style={{ backgroundColor: "#9A2A4620" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800')" }}
        />
        <div className="relative z-10 max-w-lg text-center">
          <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400 text-[#9A2A46] shadow-xl">
            <Dumbbell className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black leading-tight text-gray-900">
            ¡Únete a nuestra comunidad deportiva!
          </h1>
          <p className="mt-6 text-lg text-slate-700">
            Regístrate para acceder a todas nuestras instalaciones, clases exclusivas y seguimiento personalizado de tus entrenamientos.
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-12 bg-[#FDFDF2]">
        <div className="w-full max-w-[480px]">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Registro de Cliente</h2>
            <p className="text-slate-600 mt-1">Por favor, rellena tus datos para crear una cuenta.</p>
          </div>

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-gray-800">Nombre</span>
                <input
                  name="first_name"
                  type="text"
                  placeholder="Ej. Juan"
                  value={form.first_name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base focus:border-[#9A2A46] focus:ring-2 focus:ring-[#9A2A46]/20 outline-none transition-all"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-gray-800">Apellido</span>
                <input
                  name="last_name"
                  type="text"
                  placeholder="Ej. Pérez"
                  value={form.last_name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base focus:border-[#9A2A46] focus:ring-2 focus:ring-[#9A2A46]/20 outline-none transition-all"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-800">DNI</span>
              <input
                name="dni"
                type="text"
                placeholder="12345678"
                value={form.dni}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base focus:border-[#9A2A46] focus:ring-2 focus:ring-[#9A2A46]/20 outline-none transition-all"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-800">Email</span>
              <input
                name="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base focus:border-[#9A2A46] focus:ring-2 focus:ring-[#9A2A46]/20 outline-none transition-all"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-800">Contraseña</span>
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base focus:border-[#9A2A46] focus:ring-2 focus:ring-[#9A2A46]/20 outline-none transition-all"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-800">Confirmar contraseña</span>
              <input
                name="confirm_password"
                type="password"
                placeholder="••••••••"
                value={form.confirm_password}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base focus:border-[#9A2A46] focus:ring-2 focus:ring-[#9A2A46]/20 outline-none transition-all"
              />
            </label>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <button
              type="submit"
              className="mt-2 w-full rounded-lg bg-[#9A2A46] px-6 py-4 text-base font-bold text-white shadow-lg hover:bg-[#7d2239] transition-all"
            >
              Registrarse
            </button>
          </form>

          <div className="mt-10 flex flex-col items-center gap-4">
            <div className="h-px w-full bg-slate-200" />
            <p className="text-sm text-slate-600">
              ¿Ya tienes una cuenta?{" "}
              <a href="/login" className="font-bold text-[#9A2A46] hover:underline">
                Inicia sesión aquí →
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}