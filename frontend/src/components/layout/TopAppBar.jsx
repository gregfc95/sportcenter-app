import { Link } from "react-router-dom";
import { Menu, LogIn, Sun, Moon } from "lucide-react";
import { NAV_LINKS } from "./constants";
import { useTheme } from "@/lib/ThemeContext";

export default function TopAppBar({ onMenuClick }) {
  const { isDark, toggle } = useTheme();
  return (
    <header className="bg-surface fixed top-0 w-full z-50 border-b border-outline-variant shadow-md shadow-secondary-container/10 h-16 md:h-20">
      <div className="mx-auto max-w-7xl h-full flex items-center justify-between px-margin-mobile md:px-md lg:px-margin-desktop">
        <div className="flex items-center gap-sm">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Abrir menú"
            className="md:hidden p-xs hover:text-primary transition-colors rounded-full text-on-surface-variant flex items-center justify-center"
          >
            <Menu className="size-6" />
          </button>
          <div className="hidden md:flex items-center gap-sm">
            <img src="/logo.png" alt="" aria-hidden="true" className="h-10 w-10 object-contain" />
            <span className="text-headline-md font-bold tracking-tight text-on-surface">
              Centro Deportivo Provincia BA
            </span>
          </div>
        </div>

        <div className="md:hidden font-display text-[20px] leading-tight font-extrabold tracking-tight uppercase text-primary-container">
          Centro Deportivo Provincia BA
        </div>

        <nav className="hidden md:flex items-center gap-lg" aria-label="Navegación principal">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-label-md text-on-surface hover:text-primary-container transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-xs md:gap-sm">
          <button
            type="button"
            onClick={toggle}
            aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            aria-pressed={isDark}
            className="p-xs hover:text-primary transition-colors rounded-full text-on-surface-variant flex items-center justify-center"
          >
            {isDark ? <Sun className="size-6" /> : <Moon className="size-6" />}
          </button>
          <Link
            to="/login"
            className="hidden md:inline-flex bg-primary-container text-on-primary-container text-label-md font-bold px-md py-sm rounded-lg shadow-md shadow-primary-container/20 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Ingresar
          </Link>
          <Link
            to="/login"
            aria-label="Ingresar"
            className="md:hidden p-xs hover:text-primary transition-colors rounded-full text-primary-container flex items-center justify-center"
          >
            <LogIn className="size-6" />
          </Link>
        </div>
      </div>
    </header>
  );
}
