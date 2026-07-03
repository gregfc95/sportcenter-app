import {
  Home,
  Trophy,
  MessageCircle,
  Volleyball,
  Goal,
  Target,
  CalendarDays,
  History,
  QrCode,
  Wallet,
  Users,
  Briefcase,
  Dumbbell,
} from "lucide-react";

export const NAV_LINKS = [
  { label: "Inicio", href: "#", Icon: Home },
  { label: "Deportes", href: "#deportes", Icon: Trophy },
  { label: "Contacto", href: "#contacto", Icon: MessageCircle },
];

const CLIENT_NAV_LINKS = [
  { label: "Inicio", href: "/dashboard", Icon: Home },
  { label: "Mis Turnos", href: "/mis-turnos", Icon: CalendarDays },
  { label: "Mis Pagos", href: "/mis-pagos", Icon: Wallet },
  { label: "Mi Historial", href: "/mi-historial", Icon: History },
];

const EMPLOYEE_NAV_LINKS = [
  { label: "Inicio", href: "/dashboard", Icon: Home },
  { label: "Clientes", href: "/clientes", Icon: Users },
  { label: "Turnos Reservados", href: "/turnos", Icon: CalendarDays },
  { label: "Registrar Asistencia", href: "/registrar-asistencia", Icon: QrCode },
];

const ADMIN_NAV_LINKS = [
  { label: "Inicio", href: "/dashboard", Icon: Home },
  { label: "Clientes", href: "/clientes", Icon: Users },
  { label: "Empleados", href: "/empleados", Icon: Briefcase },
  { label: "Actividades", href: "/actividades", Icon: Dumbbell },
  { label: "Pagos", href: "/pagos", Icon: Wallet },
  { label: "Turnos Reservados", href: "/turnos", Icon: CalendarDays },
  { label: "Registrar Asistencia", href: "/registrar-asistencia", Icon: QrCode },
];

export const DASHBOARD_NAV_LINKS_BY_ROLE = {
  client: CLIENT_NAV_LINKS,
  employee: EMPLOYEE_NAV_LINKS,
  admin: ADMIN_NAV_LINKS,
};

export const SPORTS = [
  { name: "Voley", Icon: Volleyball },
  { name: "Básquet", Icon: Trophy },
  { name: "Fútbol", Icon: Goal },
  { name: "Pádel", Icon: Target },
];

export const SPORT_BY_NAME = Object.fromEntries(
  SPORTS.map((sport) => [sport.name, sport]),
);
