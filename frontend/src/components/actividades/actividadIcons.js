import { Goal, Target, Volleyball, Trophy, Dumbbell } from "lucide-react";

const ICON_BY_KEYWORD = [
  { keywords: ["futbol", "fútbol"], Icon: Goal },
  { keywords: ["padel", "pádel"], Icon: Target },
  { keywords: ["voley", "vóley", "volley"], Icon: Volleyball },
  { keywords: ["basket", "básquet", "basquet"], Icon: Trophy },
];

export function getActividadIcon(nombre) {
  const normalized = (nombre ?? "").toLowerCase();
  for (const { keywords, Icon } of ICON_BY_KEYWORD) {
    if (keywords.some((k) => normalized.includes(k))) return Icon;
  }
  return Dumbbell;
}
