import { useOutletContext } from "react-router-dom";

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

export default function DashboardPage() {
  usePageTitle("Inicio");
  const { user } = useOutletContext();

  return (
    <div className="flex flex-col gap-lg px-margin-mobile mt-md">
      <WelcomeSection name={user.name} />
      <AccountStatusCard status={ACCOUNT.status} paid={ACCOUNT.paid} />
      <QuickAccessGrid />
      <UpcomingBookings bookings={BOOKINGS} />
    </div>
  );
}
