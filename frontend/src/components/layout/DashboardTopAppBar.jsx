import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, HelpCircle, LogOut } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

function getInitials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const ROLE_LABELS = {
  client: "Dashboard",
  employee: "Panel de Empleados",
  owner: "Panel Administrativo",
};

export default function DashboardTopAppBar({ user }) {
  const navigate = useNavigate();
  const initials = getInitials(user?.name) || "?";
  const title = ROLE_LABELS[user?.role] || "Dashboard";

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <header className="bg-white fixed top-0 w-full z-50 border-b border-gray-100 shadow-sm h-16">
      <div className="h-full flex items-center justify-between px-6">

        <Link to="/" className="flex items-center gap-2 md:hidden">
          <img src="/logo.png" alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
          <span className="font-bold text-gray-900 text-base">Sportify</span>
        </Link>

        <span className="hidden md:block text-[#9A2A46] font-bold text-lg">
          {title}
        </span>

        <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 w-72">
          <Search className="size-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar turnos, actividades..."
            className="bg-transparent text-sm text-gray-600 outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-3">
          <button type="button" aria-label="Notificaciones" className="p-2 rounded-full text-gray-500 hover:text-[#9A2A46] transition-colors relative">
            <Bell className="size-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#9A2A46] rounded-full" />
          </button>
          <button type="button" aria-label="Ayuda" className="p-2 rounded-full text-gray-500 hover:text-[#9A2A46] transition-colors">
            <HelpCircle className="size-5" />
          </button>

          <div className="flex items-center gap-2 border-l border-gray-100 pl-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-gray-900">{user?.name} {user?.last_name}</p>
            </div>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full border-2 border-[#FFB700] object-cover" />
            ) : (
              <span className="w-9 h-9 rounded-full bg-[#FFB700] text-white text-sm font-bold flex items-center justify-center">
                {initials}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
          >
            <LogOut className="size-4" />
            <span className="hidden md:block">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}