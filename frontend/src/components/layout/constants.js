import { Home, Trophy, MessageCircle, Volleyball, Goal, Target } from "lucide-react";

export const NAV_LINKS = [
  { label: "Inicio", href: "#", Icon: Home },
  { label: "Deportes", href: "#deportes", Icon: Trophy },
  { label: "Contacto", href: "#contacto", Icon: MessageCircle },
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
