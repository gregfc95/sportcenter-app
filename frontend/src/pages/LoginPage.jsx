import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import AuthLayout from "@/components/layout/AuthLayout";
import { usePageTitle } from "@/lib/usePageTitle";
import { isValidEmail } from "@/lib/validators";

export default function LoginPage() {
  usePageTitle("Iniciar sesión");
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState(null);

  const stored = localStorage.getItem("user");
  if (stored) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setFormError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const newErrors = {};
    if (!form.email) newErrors.email = "Campo requerido faltante";
    else if (!isValidEmail(form.email)) newErrors.email = "El email ingresado no es valido";
    if (!form.password) newErrors.password = "Campo requerido faltante";
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Email y/o contraseña inválidos");
        return;
      }
      localStorage.setItem("user", JSON.stringify(data));
      toast.success("Sesión iniciada");
      navigate("/dashboard");
    } catch {
      toast.error("Error de conexión con el servidor.");
    }
  };

  const marketing = (
    <div className="flex flex-col h-full justify-between">
      <div>
        <h1 className="text-3xl font-black leading-tight mb-4">
          Entrena con los mejores.
        </h1>
        <p className="text-primary-foreground/80 text-base">
          Accede a tu panel personal para gestionar tus clases, entrenamientos y membresía.
        </p>
      </div>
      <div className="flex items-center gap-2 text-primary-foreground/80 text-sm">
        <ShieldCheck className="w-4 h-4" />
        <span>Entorno de acceso seguro</span>
      </div>
    </div>
  );

  return (
    <AuthLayout marketing={marketing}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-on-surface">Iniciar sesión</h2>
        <p className="text-on-surface-variant mt-1 text-sm">
          Bienvenido de nuevo, te echábamos de menos.
        </p>
      </div>

      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="correo@ejemplo.com"
            value={form.email}
            onChange={handleChange}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="password">Contraseña</Label>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              aria-invalid={!!errors.password}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password}</p>
          )}
        </div>

        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {formError}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
        >
          Acceder a mi cuenta
        </Button>
      </form>

      <div className="mt-8 flex flex-col items-center gap-4">
        <p className="text-sm text-on-surface-variant">
          ¿Aún no eres miembro?{" "}
          <Link to="/register" className="font-bold text-primary hover:underline">
            Regístrate ahora
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}