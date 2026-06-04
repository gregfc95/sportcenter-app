import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Check, ChevronRight, Lock, User } from "lucide-react";
import { toast } from "sonner";

import { usePageTitle } from "@/lib/usePageTitle";
import { isValidEmail, isValidPassword, PASSWORD_RULE } from "@/lib/validators";
import { updateProfile, ApiError } from "@/components/auth/api";
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
    current_password: "",
    new_password: "",
    confirm_password: "",
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

    const wantsPasswordChange =
      form.current_password || form.new_password || form.confirm_password;
    if (wantsPasswordChange) {
      if (!form.current_password) {
        newErrors.current_password = "Campo requerido faltante";
      }
      if (!form.new_password) {
        newErrors.new_password = "Campo requerido faltante";
      } else if (!isValidPassword(form.new_password)) {
        newErrors.new_password = PASSWORD_RULE;
      }
      if (form.new_password !== form.confirm_password) {
        newErrors.confirm_password = "Las contraseñas no coinciden";
      }
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
    };
    if (wantsPasswordChange) {
      payload.current_password = form.current_password;
      payload.new_password = form.new_password;
    }

    setSubmitting(true);
    try {
      const data = await updateProfile(payload);
      updateUser(data);
      setForm((prev) => ({
        ...prev,
        current_password: "",
        new_password: "",
        confirm_password: "",
      }));
      toast.success("Cambios guardados");
    } catch (err) {
      if (err instanceof ApiError) {
        if (Object.keys(err.fieldErrors).length) {
          setErrors(err.fieldErrors);
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError("Error de conexión con el servidor.");
      }
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

        <div className="flex flex-col gap-4 border-t border-outline-variant pt-lg">
          <div className="flex flex-col gap-1">
            <h3 className="flex items-center gap-sm text-headline-md text-on-surface">
              <Lock className="size-5 text-primary" aria-hidden="true" />
              Cambiar Contraseña
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              Dejá estos campos en blanco si no querés cambiar tu contraseña.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="current_password">Contraseña Actual</Label>
            <Input
              id="current_password"
              name="current_password"
              type="password"
              maxLength={15}
              placeholder="••••••••"
              autoComplete="current-password"
              value={form.current_password}
              onChange={handleChange}
              aria-invalid={!!errors.current_password}
            />
            {errors.current_password && (
              <p className="text-xs text-destructive">{errors.current_password}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new_password">Contraseña Nueva</Label>
              <Input
                id="new_password"
                name="new_password"
                type="password"
                maxLength={15}
                placeholder="••••••••"
                autoComplete="new-password"
                value={form.new_password}
                onChange={handleChange}
                aria-invalid={!!errors.new_password}
              />
              {errors.new_password && (
                <p className="text-xs text-destructive">{errors.new_password}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm_password">Confirmar Contraseña</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                maxLength={15}
                placeholder="••••••••"
                autoComplete="new-password"
                value={form.confirm_password}
                onChange={handleChange}
                aria-invalid={!!errors.confirm_password}
              />
              {errors.confirm_password && (
                <p className="text-xs text-destructive">{errors.confirm_password}</p>
              )}
            </div>
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
