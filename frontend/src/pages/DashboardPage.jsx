import { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";

import { usePageTitle } from "@/lib/usePageTitle";
import { Button } from "@/components/ui/button";
import WelcomeSection from "@/components/dashboard/WelcomeSection";
import QuickAccessGrid from "@/components/dashboard/QuickAccessGrid";
import UpcomingBookings from "@/components/dashboard/UpcomingBookings";
import CreditosActivos from "@/components/dashboard/CreditosActivos";
import { listMisReservas } from "@/components/reservas/api";
import { formatReservaFecha } from "@/lib/fecha";
import { DASHBOARD_NAV_LINKS_BY_ROLE } from "@/components/layout/constants";

// Cuántos próximos turnos mostrar en el dashboard antes de "Ver todos".
const MAX_PROXIMOS = 4;

const CARD_DESC_BY_HREF = {
  "/clientes": "Gestioná los clientes del centro",
  "/empleados": "Gestioná el equipo del centro",
  "/actividades": "Administrá las actividades disponibles",
  "/pagos": "Consultá los pagos del centro",
  "/turnos": "Administrá los turnos reservados",
  "/registrar-asistencia": "Escaneá el QR del cliente para registrar su asistencia",
};

function getStaffCards(role) {
  const links = DASHBOARD_NAV_LINKS_BY_ROLE[role] ?? [];
  return links
    .filter(({ href }) => href !== "/dashboard")
    .map((link) => ({ ...link, desc: CARD_DESC_BY_HREF[link.href] ?? "" }));
}

// Próximos turnos: los de hoy en adelante, ordenados por fecha, recortados.
function toUpcomingBookings(reservas) {
  const todayISO = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
  return reservas
    .filter((r) => r.fecha >= todayISO)
    .slice(0, MAX_PROXIMOS)
    .map((r) => ({
      id: r.id,
      reservaId: r.id,
      sport: r.actividad,
      // `fecha` cruda (ISO) además del `datetime` formateado: el botón de QR
      // compara contra hoy y el string "Hoy, 20:00" no sirve para eso.
      fecha: r.fecha,
      asistencia: r.asistencia ?? false,
      datetime: formatReservaFecha(r.fecha, r.turno.hora),
      status: r.estado,
      capacity: { taken: r.turno.ocupados, total: r.turno.cupo },
      precio: r.precio,
      sena: r.sena,
      saldo: r.saldo,
      tipo: r.tipo,
      mensualidad: r.mensualidad ?? null,
      turno: { dia_semana: r.turno.dia_semana, hora: r.turno.hora },
    }));
}

function ClientDashboard({ user }) {
  const [bookings, setBookings] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    listMisReservas()
      .then((data) => {
        if (active) setBookings(toUpcomingBookings(Array.isArray(data) ? data : []));
      })
      .catch(() => {
        if (active) setBookings([]);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  // Tras cancelar (o pagar 100% con crédito, que no pasa por MP) se refresca la
  // lista: una eventual saca su card, pero en un abono mensual solo sale la
  // clase cancelada (el id no coincide con la card).
  const handleRefresh = () => setRefreshKey((k) => k + 1);

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
      <QuickAccessGrid />
      <CreditosActivos />
      <UpcomingBookings
        bookings={bookings}
        onCancelled={handleRefresh}
        onPagado={handleRefresh}
      />
    </div>
  );
}

function AdminDashboard({ user }) {
  const cards = getStaffCards(user.role);

  return (
    <div className="flex flex-col gap-lg px-margin-mobile md:px-lg mt-md md:mt-lg max-w-4xl mx-auto w-full">
      <WelcomeSection user={user} />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-md">
        {cards.map(({ label, desc, href, Icon }) => {
          const className =
            "bg-surface-container border border-outline-variant rounded-xl p-md flex flex-col gap-sm hover:border-primary hover:shadow-md transition-all group";
          return (
            <Link key={label} to={href} className={className}>
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
