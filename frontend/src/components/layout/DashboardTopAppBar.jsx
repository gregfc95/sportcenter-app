import { Link } from "react-router-dom";
import { Search, Sun, Moon } from "lucide-react";

import { useTheme } from "@/lib/ThemeContext";

function getInitials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function DashboardTopAppBar({ user }) {
  const { isDark, toggle } = useTheme();
  const initials = getInitials(user?.name) || "?";

  return (
    <header className="bg-surface fixed top-0 w-full z-50 border-b border-outline-variant shadow-sm shadow-secondary-container/5 h-16">
      <div className="h-full flex items-center justify-between px-margin-mobile">
        <Link to="/dashboard" className="flex items-center gap-sm">
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            className="h-8 w-8 object-contain"
          />
          <span className="font-bold text-on-surface text-base md:text-lg">
            Sportify
          </span>
        </Link>

        <div className="flex items-center gap-xs">
          <button
            type="button"
            onClick={toggle}
            aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            aria-pressed={isDark}
            className="p-xs rounded-full text-on-surface-variant hover:text-primary active:text-primary transition-colors flex items-center justify-center"
          >
            {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>

          <button
            type="button"
            aria-label="Buscar"
            className="p-xs rounded-full text-on-surface-variant hover:text-primary active:text-primary transition-colors flex items-center justify-center"
          >
            <Search className="size-5" />
          </button>

          <button
            type="button"
            className="flex items-center gap-xs bg-surface-container px-sm py-xs rounded-full border border-outline-variant hover:bg-surface-container-high transition-colors active:scale-95 duration-100"
          >
            <span className="text-label-md text-on-surface">{user?.name}</span>
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="w-6 h-6 rounded-full border border-accent object-cover"
              />
            ) : (
              <span className="w-6 h-6 rounded-full bg-accent text-accent-foreground text-[11px] font-bold flex items-center justify-center border border-accent">
                {initials}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
