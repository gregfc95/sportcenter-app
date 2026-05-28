import { useOutletContext, Link } from "react-router-dom";
import { usePageTitle } from "@/lib/usePageTitle";
import { CalendarDays, CreditCard, User, UserPlus, Dumbbell, Clock, Users } from "lucide-react";

const CLIENT_CARDS = [
  { label: "Mis Reservas", desc: "Consultá y gestioná tus reservas", href: "/dashboard/client/reservas", Icon: CalendarDays },
  { label: "Mis Pagos", desc: "Consultá el historial de pagos", href: "/dashboard/client/pagos", Icon: CreditCard },
  { label: "Mi Perfil", desc: "Modificá tus datos personales", href: "/dashboard/client/perfil", Icon: User },
];

const EMPLOYEE_CARDS = [
  { label: "Registrar Cliente", desc: "Creá un nuevo cliente en el sistema", href: "/dashboard/employee/registro", Icon: UserPlus },
  { label: "Actividades", desc: "Consultá las actividades disponibles", href: "/dashboard/employee/actividades", Icon: Dumbbell },
  { label: "Turnos", desc: "Gestioná los turnos del centro", href: "/dashboard/employee/turnos", Icon: Clock },
];

const ADMIN_CARDS = [
  { label: "Usuarios", desc: "Gestioná los usuarios del sistema", href: "/dashboard/admin/usuarios", Icon: Users },
  { label: "Actividades", desc: "Administrá las actividades", href: "/dashboard/admin/actividades", Icon: Dumbbell },
  { label: "Turnos", desc: "Administrá los turnos", href: "/dashboard/admin/turnos", Icon: Clock },
];

const CARDS_BY_ROLE = {
  client: CLIENT_CARDS,
  employee: EMPLOYEE_CARDS,
  admin: ADMIN_CARDS,
};

export default function DashboardPage() {
  usePageTitle("Inicio");
  const { user } = useOutletContext();
  const cards = CARDS_BY_ROLE[user.role] || CLIENT_CARDS;

  return (
    <div className="flex flex-col gap-lg px-margin-mobile mt-md">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(({ label, desc, href, Icon }) => (
          <Link
            key={label}
            to={href}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md hover:border-[#FFB700] transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-[#FFB700]/10 flex items-center justify-center group-hover:bg-[#FFB700]/20 transition-colors">
              <Icon className="size-5 text-[#FFB700]" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}