import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dumbbell } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import AuthLayout from "@/components/layout/AuthLayout";
import { usePageTitle } from "@/lib/usePageTitle";
import { isValidEmail } from "@/lib/validators";

const REQUIRED = ["first_name", "last_name", "dni", "email", "phone", "birth_date", "password", "confirm_password"];

export default function RegisterPage() {
  usePageTitle("Crear cuenta");
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    dni: "",
    email: "",
    phone: "",
    birth_date: "",
    password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);

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
    REQUIRED.forEach((f) => {
      if (!form[f]) newErrors[f] = "Campo requerido faltante";
    });
    if (form.email && !isValidEmail(form.email)) {
      newErrors.email = "El email ingresado no es valido";
    }
    if (form.password && form.confirm_password && form.password !== form.confirm_password) {
      newErrors.confirm_password = "Las contraseñas no coinciden";
    }
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
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
          phone: form.phone,
          birth_date: form.birth_date,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error) {
          setFormError(data.error);
        } else if (typeof data === "object" && data !== null) {
          const fieldErrors = {};
          Object.entries(data).forEach(([field, msgs]) => {
            fieldErrors[field] = Array.isArray(msgs) ? msgs[0] : String(msgs);
          });
          setErrors(fieldErrors);
        } else {
          setFormError("Error al registrarse.");
        }
        return;
      }
      toast.success("Usuario creado con éxito");
      setTimeout(() => navigate("/login"), 2000);
    } catch {
      toast.error("Error de conexión con el servidor.");
    }
  };

  const marketing = (
    <div className="flex flex-col h-full justify-center text-center">
      <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-full bg-accent text-primary shadow-xl mx-auto">
        <Dumbbell className="w-10 h-10" />
      </div>
      <h1 className="text-3xl font-black leading-tight">
        ¡Únete a nuestra comunidad deportiva!
      </h1>
      <p className="mt-6 text-base text-primary-foreground/80">
        Regístrate para acceder a todas nuestras instalaciones, clases exclusivas y seguimiento personalizado de tus entrenamientos.
      </p>
    </div>
  );

  return (
    <AuthLayout marketing={marketing}>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-on-surface">Registro de Cliente</h2>
        <p className="text-on-surface-variant mt-1 text-sm">
          Por favor, rellena tus datos para crear una cuenta.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="first_name">Nombre</Label>
            <Input id="first_name" name="first_name" type="text" maxLength={100} placeholder="Ej. Juan" value={form.first_name} onChange={handleChange} aria-invalid={!!errors.first_name} />
            {errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="last_name">Apellido</Label>
            <Input id="last_name" name="last_name" type="text" maxLength={100} placeholder="Ej. Pérez" value={form.last_name} onChange={handleChange} aria-invalid={!!errors.last_name} />
            {errors.last_name && <p className="text-xs text-destructive">{errors.last_name}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="dni">DNI</Label>
            <Input id="dni" name="dni" type="text" maxLength={20} placeholder="12345678" value={form.dni} onChange={handleChange} aria-invalid={!!errors.dni} />
            {errors.dni && <p className="text-xs text-destructive">{errors.dni}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" name="phone" type="tel" maxLength={20} placeholder="1113467371" value={form.phone} onChange={handleChange} aria-invalid={!!errors.phone} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" maxLength={255} placeholder="correo@ejemplo.com" value={form.email} onChange={handleChange} aria-invalid={!!errors.email} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="birth_date">Fecha de nacimiento</Label>
            <Input id="birth_date" name="birth_date" type="date" value={form.birth_date} onChange={handleChange} onKeyDown={(e) => e.preventDefault()} aria-invalid={!!errors.birth_date} />
            {errors.birth_date && <p className="text-xs text-destructive">{errors.birth_date}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" maxLength={15} placeholder="••••••••" value={form.password} onChange={handleChange} aria-invalid={!!errors.password} />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm_password">Confirmar contraseña</Label>
            <Input id="confirm_password" name="confirm_password" type="password" maxLength={15} placeholder="••••••••" value={form.confirm_password} onChange={handleChange} aria-invalid={!!errors.confirm_password} />
            {errors.confirm_password && <p className="text-xs text-destructive">{errors.confirm_password}</p>}
          </div>
        </div>

        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {formError}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg">
          Registrarse
        </Button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-4">
        <p className="text-sm text-on-surface-variant">
          ¿Ya tienes una cuenta?{" "}
          <Link to="/login" className="font-bold text-primary hover:underline">
            Inicia sesión aquí →
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}