import {
  Home,
  Trophy,
  MessageCircle,
  Volleyball,
  Goal,
  Target,
  CalendarDays,
  Wallet,
} from "lucide-react";

export const NAV_LINKS = [
  { label: "Inicio", href: "#", Icon: Home },
  { label: "Deportes", href: "#deportes", Icon: Trophy },
  { label: "Contacto", href: "#contacto", Icon: MessageCircle },
];

export const DASHBOARD_NAV_LINKS = [
  { label: "Inicio", href: "/dashboard", Icon: Home },
  { label: "Mis Turnos", href: "/turnos", Icon: CalendarDays },
  { label: "Pagos", href: "/pagos", Icon: Wallet },
];

export const SPORTS = [
  { name: "Voley", Icon: Volleyball },
  { name: "Básquet", Icon: Trophy },
  { name: "Fútbol", Icon: Goal },
  { name: "Pádel", Icon: Target },
];

export const SPORT_BY_NAME = Object.fromEntries(
  SPORTS.map((sport) => [sport.name, sport]),
);
