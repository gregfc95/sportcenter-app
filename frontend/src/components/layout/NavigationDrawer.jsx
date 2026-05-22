import { Link } from "react-router-dom";
import { X, LogIn } from "lucide-react";
import { NAV_LINKS } from "./constants";

export default function NavigationDrawer({ open, onClose, activeLabel = "Inicio" }) {
  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 bg-black/50 z-55 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <nav
        aria-label="Menú principal"
        className={`bg-surface-container text-primary h-full w-72 rounded-r-xl border-r border-outline-variant shadow-xl shadow-secondary-container/20 fixed inset-y-0 left-0 z-60 flex flex-col p-md transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-lg">
          <h2 className="text-headline-md font-bold text-primary">
            CD Provincia BA
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="text-on-surface-variant p-xs hover:text-primary rounded-full"
          >
            <X className="size-6" />
          </button>
        </div>
        <ul className="flex flex-col gap-sm text-body-lg">
          {NAV_LINKS.map(({ label, href, Icon }) => {
            const active = label === activeLabel;
            return (
              <li key={label}>
                <a
                  href={href}
                  onClick={onClose}
                  className={`flex items-center gap-md p-sm rounded-lg transition-colors ${
                    active
                      ? "bg-secondary-container text-on-secondary-container font-bold"
                      : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  <Icon className="size-5" />
                  {label}
                </a>
              </li>
            );
          })}
        </ul>

        <Link
          to="/login"
          onClick={onClose}
          className="mt-auto flex items-center justify-center gap-sm bg-primary text-primary-foreground text-label-md font-bold px-md py-sm rounded-lg shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors"
        >
          <LogIn className="size-5" />
          Ingresar
        </Link>
      </nav>
    </>
  );
}
