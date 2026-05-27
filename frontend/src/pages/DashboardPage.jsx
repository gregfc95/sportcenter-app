import { useOutletContext } from "react-router-dom";
import { usePageTitle } from "@/lib/usePageTitle";
import WelcomeSection from "@/components/dashboard/WelcomeSection";
import AccountStatusCard from "@/components/dashboard/AccountStatusCard";
import QuickAccessGrid from "@/components/dashboard/QuickAccessGrid";
import UpcomingBookings from "@/components/dashboard/UpcomingBookings";

function ClientDashboard({ user }) {
  // TODO: reemplazar con fetch a /api/bookings
  const bookings = [];
  // TODO: reemplazar con fetch a /api/account
  const account = { status: "Al día", paid: true };

  return (
    <div className="flex flex-col gap-lg px-margin-mobile mt-md">
      <WelcomeSection name={user.name} />
      <AccountStatusCard status={account.status} paid={account.paid} />
      <QuickAccessGrid />
      <UpcomingBookings bookings={bookings} />
    </div>
  );
}

function AdminDashboard({ user }) {
  const isEmployee = user.role === "employee";

  return (
    <div className="flex flex-col gap-lg px-margin-mobile mt-md">
      <WelcomeSection name={user.name} />
      {/* TODO: agregar componentes de admin cuando los endpoints estén listos */}
      <p className="text-on-surface-variant text-body-md">
        {isEmployee ? "Panel de empleado en construcción." : "Panel de administración en construcción."}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  usePageTitle("Inicio");
  const { user } = useOutletContext();

  if (user.role === "owner" || user.role === "employee") {
    return <AdminDashboard user={user} />;
  }

  return <ClientDashboard user={user} />;
}