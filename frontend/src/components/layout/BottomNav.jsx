import { Link, useLocation } from "react-router-dom";

import { DASHBOARD_NAV_LINKS_BY_ROLE } from "./constants";
import { cn } from "@/lib/utils";

function NavItem({ Icon, label, href, active }) {
  const className = cn(
    "flex flex-col items-center gap-xs flex-1 min-w-0 transition-colors",
    active ? "text-accent" : "text-on-surface-variant hover:text-accent",
  );

  return (
    <Link to={href} className={className}>
      <span
        className={cn(
          "px-sm py-0.5 rounded-full flex items-center justify-center",
          active && "bg-accent/15",
        )}
      >
        <Icon className="size-6" strokeWidth={active ? 2.5 : 2} />
      </span>
      <span
        className={cn(
          "text-[10px] leading-none truncate max-w-full px-0.5",
          active ? "font-bold" : "font-medium",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

export default function BottomNav({ user }) {
  const { pathname } = useLocation();
  const navLinks =
    DASHBOARD_NAV_LINKS_BY_ROLE[user?.role] ??
    DASHBOARD_NAV_LINKS_BY_ROLE.client;

  return (
    <nav
      className="md:hidden bg-surface fixed bottom-0 w-full z-50 px-margin-mobile pt-sm pb-md border-t border-outline-variant shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
      aria-label="Navegación principal"
    >
      <div className="flex items-stretch justify-between gap-xs">
        {navLinks.map(({ label, href, Icon }) => (
          <NavItem
            key={label}
            Icon={Icon}
            label={label}
            href={href}
            active={pathname === href}
          />
        ))}
      </div>
    </nav>
  );
}
