import { Home, CalendarDays, Plus, Bell, Menu } from "lucide-react";

import { cn } from "@/lib/utils";

function NavItem({ Icon, label, active = false, badge }) {
  return (
    <button
      type="button"
      className={cn(
        "flex flex-col items-center gap-xs min-w-[64px] relative transition-colors",
        active ? "text-accent" : "text-on-surface-variant hover:text-accent",
      )}
    >
      <span
        className={cn(
          "px-sm py-0.5 rounded-full flex items-center justify-center relative",
          active && "bg-accent/15",
        )}
      >
        <Icon className="size-6" strokeWidth={active ? 2.5 : 2} />
        {badge && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-surface">
            {badge}
          </span>
        )}
      </span>
      <span
        className={cn(
          "text-[10px] leading-none",
          active ? "font-bold" : "font-medium",
        )}
      >
        {label}
      </span>
    </button>
  );
}

export default function BottomNav() {
  return (
    <nav
      className="md:hidden bg-surface fixed bottom-0 w-full z-50 px-margin-mobile pt-sm pb-md border-t border-outline-variant shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
      aria-label="Navegación principal"
    >
      <div className="flex items-center justify-between relative">
        <NavItem Icon={Home} label="Inicio" active />
        <NavItem Icon={CalendarDays} label="Mis Turnos" />

        <div className="relative -top-6 flex justify-center w-18">
          <button
            type="button"
            aria-label="Reservar"
            className="absolute bg-accent text-accent-foreground w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-accent/40 ring-4 ring-accent/20 active:scale-95 transition-transform"
          >
            <Plus className="size-7" strokeWidth={2.5} />
          </button>
        </div>

        <NavItem Icon={Bell} label="Avisos" />
        <NavItem Icon={Menu} label="Más" />
      </div>
    </nav>
  );
}
