import { Link } from "react-router-dom";
import { BellRing, CalendarClock, CreditCard, RotateCcw, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import NotificarCupoDialog from "./NotificarCupoDialog";
import RecordarRenovacionesDialog from "./RecordarRenovacionesDialog";
import ResetPenalizacionesDialog from "./ResetPenalizacionesDialog";

// "Registrar Pago" lleva a Turnos Reservados porque el cobro manual vive en el
// detalle de cada turno; las acciones con `Dialog` son los disparadores demo de
// los avisos automáticos (lista de espera y recordatorio del día 10).
const ACTIONS = [
  { label: "Registrar Pago", Icon: CreditCard, href: "/turnos" },
  { label: "Notificar Cupo", Icon: BellRing, Dialog: NotificarCupoDialog },
  {
    label: "Recordar Renovaciones",
    Icon: CalendarClock,
    Dialog: RecordarRenovacionesDialog,
  },
  {
    label: "Resetear Penalizaciones",
    Icon: RotateCcw,
    Dialog: ResetPenalizacionesDialog,
  },
  { label: "Nuevo Staff", Icon: UserPlus, href: "/empleados/nuevo", adminOnly: true },
];

export default function StaffQuickActions({ role }) {
  const actions = ACTIONS.filter(({ adminOnly }) => !adminOnly || role === "admin");

  return (
    <section className="flex flex-col gap-sm">
      <h3 className="text-label-md text-on-surface uppercase tracking-wider">
        Acciones rápidas
      </h3>
      <div className="flex flex-wrap gap-sm">
        {actions.map(({ label, Icon, href, Dialog }) =>
          Dialog ? (
            <Dialog
              key={label}
              trigger={
                <Button variant="outline">
                  <Icon className="size-4" />
                  {label}
                </Button>
              }
            />
          ) : (
            <Button key={label} asChild variant="outline">
              <Link to={href}>
                <Icon className="size-4" />
                {label}
              </Link>
            </Button>
          ),
        )}
      </div>
    </section>
  );
}
