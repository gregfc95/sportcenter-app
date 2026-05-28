import { useOutletContext, Link } from "react-router-dom";
import {
  CalendarDays,
  CreditCard,
  UserPlus,
  Dumbbell,
  Clock,
  Users,
} from "lucide-react";

import { usePageTitle } from "@/lib/usePageTitle";
import WelcomeSection from "@/components/dashboard/WelcomeSection";
import AccountStatusCard from "@/components/dashboard/AccountStatusCard";
import QuickAccessGrid from "@/components/dashboard/QuickAccessGrid";
import UpcomingBookings from "@/components/dashboard/UpcomingBookings";

const ACCOUNT = { status: "Al día", paid: true };

const BOOKINGS = [
  {
    id: 1,
    sport: "Pádel",
    court: "Cancha 2",
    datetime: "Hoy, 19:00 hs",
    status: "pendiente",
    capacity: { taken: 2, total: 4 },
  },
  {
    id: 2,
    sport: "Fútbol 5",
    court: "Cancha 1",
    datetime: "Jue 14 Nov, 21:00",
    status: "pagado",
  },
];

const EMPLOYEE_CARDS = [
  { label: "Registrar Cliente", desc: "Creá un nuevo cliente en el sistema", href: "/registro", Icon: UserPlus },
  { label: "Actividades", desc: "Consultá las actividades disponibles", href: "/actividades", Icon: Dumbbell },
  { label: "Turnos", desc: "Gestioná los turnos del centro", href: "/turnos", Icon: Clock },
];

const ADMIN_CARDS = [
  { label: "Usuarios", desc: "Gestioná los usuarios del sistema", href: "/usuarios", Icon: Users },
  { label: "Actividades", desc: "Administrá las actividades", href: "/actividades", Icon: Dumbbell },
  { label: "Turnos", desc: "Administrá los turnos", href: "/turnos", Icon: Clock },
  { label: "Pagos", desc: "Consultá los pagos del centro", href: "/pagos", Icon: CreditCard },
  { label: "Reservas", desc: "Administrá las reservas", href: "/reservas", Icon: CalendarDays },
];

function ClientDashboard({ user }) {
  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-4xl mx-auto w-full">
      <WelcomeSection name={user.name} />
      <AccountStatusCard status={ACCOUNT.status} paid={ACCOUNT.paid} />
      <QuickAccessGrid />
      <UpcomingBookings bookings={BOOKINGS} />
    </div>
  );
}

function AdminDashboard({ user }) {
  const cards = user.role === "employee" ? EMPLOYEE_CARDS : ADMIN_CARDS;

  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-4xl mx-auto w-full">
      <WelcomeSection name={user.name} />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-md">
        {cards.map(({ label, desc, href, Icon }) => (
          <Link
            key={label}
            to={href}
            className="bg-surface-container border border-outline-variant rounded-xl p-md flex flex-col gap-sm hover:border-primary hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Icon className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-on-surface text-label-md">{label}</p>
              <p className="text-body-sm text-on-surface-variant mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
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
