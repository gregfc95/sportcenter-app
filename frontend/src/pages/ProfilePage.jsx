import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Check, ChevronRight, User } from "lucide-react";
import { toast } from "sonner";

import { usePageTitle } from "@/lib/usePageTitle";
import { isValidEmail } from "@/lib/validators";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";

export default function ProfilePage() {
  usePageTitle("Mi Perfil");
  const { user, updateUser } = useOutletContext();

  const [form, setForm] = useState({
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    email: user.email || "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const newErrors = {};
    ["first_name", "last_name", "email"].forEach((f) => {
      if (!form[f]) newErrors[f] = "Campo requerido faltante";
    });
    if (form.email && !isValidEmail(form.email)) {
      newErrors.email = "El email ingresado no es valido";
    }
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": String(user.id),
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Error al guardar los cambios.");
        return;
      }
      updateUser(data);
      toast.success("Cambios guardados");
    } catch {
      setFormError("Error de conexión con el servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-3xl mx-auto w-full">
      <header className="flex flex-col gap-sm">
        <nav
          aria-label="Migas de pan"
          className="flex items-center gap-1 text-label-sm text-on-surface-variant"
        >
          <Link to="/dashboard" className="hover:text-primary transition-colors">
            Inicio
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span className="text-primary">Mi Perfil</span>
        </nav>
        <PageHeading>Mi Perfil</PageHeading>
        <p className="text-body-md text-on-surface-variant">
          Gestiona tu información personal de la cuenta.
        </p>
      </header>

      <form
        className="flex flex-col gap-lg bg-surface-container border border-outline-variant rounded-xl p-lg"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="flex flex-col gap-4">
          <h3 className="flex items-center gap-sm text-headline-md text-on-surface">
            <User className="size-5 text-primary" aria-hidden="true" />
            Datos Personales
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="first_name">Nombre</Label>
              <Input
                id="first_name"
                name="first_name"
                type="text"
                maxLength={100}
                placeholder="Tu nombre"
                value={form.first_name}
                onChange={handleChange}
                aria-invalid={!!errors.first_name}
              />
              {errors.first_name && (
                <p className="text-xs text-destructive">{errors.first_name}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="last_name">Apellido</Label>
              <Input
                id="last_name"
                name="last_name"
                type="text"
                maxLength={100}
                placeholder="Tu apellido"
                value={form.last_name}
                onChange={handleChange}
                aria-invalid={!!errors.last_name}
              />
              {errors.last_name && (
                <p className="text-xs text-destructive">{errors.last_name}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dni">DNI</Label>
              <Input id="dni" name="dni" type="text" value={user.dni || ""} readOnly disabled />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
              <Input
                id="birth_date"
                name="birth_date"
                type="date"
                value={user.birth_date || ""}
                readOnly
                disabled
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              maxLength={255}
              placeholder="correo@ejemplo.com"
              value={form.email}
              onChange={handleChange}
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
        </div>

        {formError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {formError}
          </p>
        )}

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={submitting}>
            <Check className="size-4" />
            Guardar
          </Button>
        </div>
      </form>
    </div>
  );
}
