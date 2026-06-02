import { useOutletContext, Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { usePageTitle } from "@/lib/usePageTitle";
import { Button } from "@/components/ui/button";
import WelcomeSection from "@/components/dashboard/WelcomeSection";
import AccountStatusCard from "@/components/dashboard/AccountStatusCard";
import QuickAccessGrid from "@/components/dashboard/QuickAccessGrid";
import UpcomingBookings from "@/components/dashboard/UpcomingBookings";
import { DASHBOARD_NAV_LINKS_BY_ROLE } from "@/components/layout/constants";

const ACCOUNT = { status: "Al día", paid: true };

const CARD_DESC_BY_HREF = {
  "/clientes": "Gestioná los clientes del centro",
  "/empleados": "Gestioná el equipo del centro",
  "/actividades": "Administrá las actividades disponibles",
  "/pagos": "Consultá los pagos del centro",
  "/turnos": "Administrá los turnos reservados",
};

function getStaffCards(role) {
  const links = DASHBOARD_NAV_LINKS_BY_ROLE[role] ?? [];
  return links
    .filter(({ href }) => href !== "/dashboard")
    .map((link) => ({ ...link, desc: CARD_DESC_BY_HREF[link.href] ?? "" }));
}

function ClientDashboard({ user }) {
  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-4xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-gutter">
        <WelcomeSection user={user} />
        <Button asChild className="self-start sm:self-auto">
          <Link to="/nueva-reserva">
            Nueva Reserva
          </Link>
        </Button>
      </div>
{/*       <AccountStatusCard status={ACCOUNT.status} paid={ACCOUNT.paid} /> */}
      <QuickAccessGrid />
      <UpcomingBookings bookings={[]} />
    </div>
  );
}

function AdminDashboard({ user }) {
  const cards = getStaffCards(user.role);

  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-4xl mx-auto w-full">
      <WelcomeSection user={user} />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-md">
        {cards.map(({ label, desc, href, Icon, comingSoon }) => {
          const className =
            "bg-surface-container border border-outline-variant rounded-xl p-md flex flex-col gap-sm hover:border-primary hover:shadow-md transition-all group";
          const inner = (
            <>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Icon className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-on-surface text-label-md">
                  {label}
                </p>
                <p className="text-body-sm text-on-surface-variant mt-0.5">
                  {desc}
                </p>
              </div>
            </>
          );

          if (comingSoon) {
            return (
              <button
                key={label}
                type="button"
                onClick={() =>
                  toast.info(`${label} estará disponible próximamente`)
                }
                className={`${className} text-left`}
              >
                {inner}
              </button>
            );
          }

          return (
            <Link key={label} to={href} className={className}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  usePageTitle("Inicio");
  const { user } = useOutletContext();

  if (user.role === "admin" || user.role === "employee") {
    return <AdminDashboard user={user} />;
  }

  return <ClientDashboard user={user} />;
}
