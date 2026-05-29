import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/lib/usePageTitle";
import { isValidEmail } from "@/lib/validators";
import { createCliente } from "@/components/clientes/api";
import { PageHeading } from "@/components/ui/page-heading";

const REQUIRED = [
  "first_name",
  "last_name",
  "dni",
  "email",
  "phone",
  "birth_date",
  "password",
  "confirm_password",
];

export default function ClienteFormPage() {
  usePageTitle("Agregar cliente");
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
  const [submitting, setSubmitting] = useState(false);

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
    if (
      form.password &&
      form.confirm_password &&
      form.password !== form.confirm_password
    ) {
      newErrors.confirm_password = "Las contraseñas no coinciden";
    }
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      await createCliente({
        first_name: form.first_name,
        last_name: form.last_name,
        dni: form.dni,
        email: form.email,
        phone: form.phone,
        birth_date: form.birth_date,
        password: form.password,
      });
      toast.success("Usuario creado con éxito");
      navigate("/clientes");
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length) {
        setErrors(err.fieldErrors);
      } else {
        setFormError(err.message || "No se pudo crear el cliente.");
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
          <Link to="/clientes" className="hover:text-primary transition-colors">
            Clientes
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span className="text-primary">Agregar Cliente</span>
        </nav>
        <PageHeading>Agregar Cliente</PageHeading>
        <p className="text-body-md text-on-surface-variant">
          Completá los datos del nuevo cliente. Recibirá una cuenta con la contraseña que ingreses.
        </p>
      </header>

      <form
        className="flex flex-col gap-4 bg-surface-container border border-outline-variant rounded-xl p-lg"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="first_name">Nombre</Label>
            <Input
              id="first_name"
              name="first_name"
              type="text"
              maxLength={100}
              placeholder="Ej. Juan"
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
              placeholder="Ej. Pérez"
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
            <Input
              id="dni"
              name="dni"
              type="text"
              maxLength={20}
              placeholder="12345678"
              value={form.dni}
              onChange={handleChange}
              aria-invalid={!!errors.dni}
            />
            {errors.dni && <p className="text-xs text-destructive">{errors.dni}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              maxLength={20}
              placeholder="1113467371"
              value={form.phone}
              onChange={handleChange}
              aria-invalid={!!errors.phone}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="birth_date">Fecha de nacimiento</Label>
            <Input
              id="birth_date"
              name="birth_date"
              type="date"
              value={form.birth_date}
              onChange={handleChange}
              onKeyDown={(e) => e.preventDefault()}
              aria-invalid={!!errors.birth_date}
            />
            {errors.birth_date && (
              <p className="text-xs text-destructive">{errors.birth_date}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              maxLength={15}
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm_password">Confirmar contraseña</Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              maxLength={15}
              placeholder="••••••••"
              value={form.confirm_password}
              onChange={handleChange}
              aria-invalid={!!errors.confirm_password}
            />
            {errors.confirm_password && (
              <p className="text-xs text-destructive">{errors.confirm_password}</p>
            )}
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

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button asChild variant="outline" type="button">
            <Link to="/clientes">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            <Check className="size-4" />
            {submitting ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
