import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { usePageTitle } from "@/lib/usePageTitle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  usePageTitle("Mi Perfil");
  const { user } = useOutletContext();

  const [form, setForm] = useState({
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    email: user.email || "",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!form.first_name || !form.last_name || !form.email) {
      setError("Campos requeridos faltantes");
      return;
    }

    try {
      const res = await fetch(`/api/users/profile/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al guardar los cambios.");
        return;
      }
      localStorage.setItem("user", JSON.stringify({ ...user, ...data }));
      setSuccess(true);
    } catch {
      setError("Error de conexión con el servidor.");
    }
  };

  return (
    <div className="px-6 mt-6 w-full max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Mi Perfil</h2>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="first_name">Nombre</Label>
              <Input
                id="first_name"
                name="first_name"
                type="text"
                placeholder="Tu nombre"
                value={form.first_name}
                onChange={handleChange}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="last_name">Apellido</Label>
              <Input
                id="last_name"
                name="last_name"
                type="text"
                placeholder="Tu apellido"
                value={form.last_name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">Cambios guardados</div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Guardar
          </Button>
        </form>
      </div>
    </div>
  );
}