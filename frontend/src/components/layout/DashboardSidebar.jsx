import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plus, LogOut } from "lucide-react";

import { DASHBOARD_NAV_LINKS_BY_ROLE } from "./constants";
import { cn } from "@/lib/utils";

export default function DashboardSidebar({ user }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const navLinks =
    DASHBOARD_NAV_LINKS_BY_ROLE[user?.role] ??
    DASHBOARD_NAV_LINKS_BY_ROLE.client;

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <nav
      aria-label="Menú principal"
      className="hidden md:flex fixed inset-y-0 left-0 z-55 w-72 flex-col bg-surface-container border-r border-outline-variant shadow-xl shadow-secondary-container/10 p-md"
    >
      <Link
        to="/dashboard"
        className="px-sm mb-lg flex items-center gap-sm"
      >
        <img
          src="/logo.png"
          alt=""
          aria-hidden="true"
          className="h-10 w-10 object-contain"
        />
        <span className="text-headline-md font-bold tracking-tight text-on-surface">
          Sportify
        </span>
      </Link>

      <ul className="flex flex-col gap-sm flex-1">
        {navLinks.map(({ label, href, Icon }) => {
          const active = pathname === href;
          return (
            <li key={label}>
              <Link
                to={href}
                className={cn(
                  "flex items-center gap-md px-md py-sm rounded-lg transition-colors",
                  active
                    ? "bg-secondary-container text-on-secondary-container font-bold"
                    : "text-on-surface-variant hover:text-primary",
                )}
              >
                <Icon
                  className="size-5"
                  strokeWidth={active ? 2.5 : 2}
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-md px-md py-sm rounded-lg text-on-surface-variant hover:text-primary transition-colors"
          >
            <LogOut className="size-5" />
            <span>Cerrar sesión</span>
          </button>
        </li>
      </ul>

      {user?.role === "client" && (
        <button
          type="button"
          className="mt-md flex items-center justify-center gap-sm bg-primary text-primary-foreground text-label-md font-bold px-md py-sm rounded-lg shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          <Plus className="size-5" />
          Nueva Reserva
        </button>
      )}
    </nav>
  );
}
