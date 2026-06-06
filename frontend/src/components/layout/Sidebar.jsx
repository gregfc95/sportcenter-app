import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, CalendarDays, Dumbbell, User, Plus, Users, GraduationCap, Grid2x2, CreditCard, Clock, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

const CLIENT_NAV = [
  { label: "Dashboard", href: "/dashboard/client", Icon: LayoutDashboard },
  { label: "Mis Reservas", href: "/dashboard/client/reservas", Icon: CalendarDays },
  { label: "Mis Pagos", href: "/dashboard/client/pagos", Icon: CreditCard },
  { label: "Mi Perfil", href: "/dashboard/client/perfil", Icon: User },
];

const ADMIN_NAV = [
  { label: "Dashboard", href: "/dashboard/admin", Icon: LayoutDashboard },
  { label: "Usuarios", href: "/dashboard/admin/usuarios", Icon: Users },
  { label: "Actividades", href: "/dashboard/admin/actividades", Icon: Dumbbell },
  { label: "Turnos", href: "/dashboard/admin/turnos", Icon: Clock },
];

const EMPLOYEE_NAV = [
  { label: "Dashboard", href: "/dashboard/employee", Icon: LayoutDashboard },
  { label: "Registrar Cliente", href: "/dashboard/employee/registro", Icon: UserPlus },
  { label: "Actividades", href: "/dashboard/employee/actividades", Icon: Dumbbell },
  { label: "Turnos", href: "/dashboard/employee/turnos", Icon: Clock },
];

const NAV_BY_ROLE = {
  client: CLIENT_NAV,
  admin: ADMIN_NAV,
  employee: EMPLOYEE_NAV,
};

export default function Sidebar({ user }) {
  const location = useLocation();
  const navItems = NAV_BY_ROLE[user?.role] || CLIENT_NAV;

  return (
    <aside className="hidden md:flex flex-col w-52 shrink-0 bg-white border-r border-gray-100 min-h-screen fixed top-0 left-0 pt-16 pb-6 z-40">
      <div className="flex flex-col gap-1 px-3 mt-4 flex-1">
        {navItems.map(({ label, href, Icon }) => {
          const active = location.pathname === href;
          return (
            <Link
              key={label}
              to={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-[#FFB700] text-white"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </div>

      <div className="px-3 flex flex-col gap-2">
        {user?.role === "admin" && (
          <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 pt-3">
            <div className="w-8 h-8 rounded-full bg-[#FFB700]/20 text-[#9A2A46] text-xs font-bold flex items-center justify-center">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-900">{user?.name}</span>
              <span className="text-xs text-gray-400">Administrador</span>
            </div>
          </div>
        )}
        {user?.role === "client" && (
          <button className="w-full flex items-center justify-center gap-2 bg-[#9A2A46] text-white px-4 py-3 rounded-xl font-bold text-sm shadow hover:bg-[#7d2239] transition-colors">
            <Plus className="size-5" />
            Nueva Reserva
          </button>
        )}
      </div>
    </aside>
  );
}