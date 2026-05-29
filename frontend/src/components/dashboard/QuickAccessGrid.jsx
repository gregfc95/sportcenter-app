import { useEffect, useState } from "react";

import { getActividadIcon } from "@/components/actividades/actividadIcons";
import { listActividades } from "@/components/actividades/api";
import { cn } from "@/lib/utils";

const TONES = [
  "amber-solid",
  "burgundy-solid",
  "amber-outline",
  "burgundy-outline",
];

const TONE_CLASSES = {
  "amber-solid": "bg-accent text-accent-foreground border border-transparent",
  "burgundy-solid":
    "bg-primary text-primary-foreground border border-transparent",
  "amber-outline": "bg-accent/15 text-accent border border-accent/40",
  "burgundy-outline": "bg-primary/10 text-primary border border-primary/30",
};

export default function QuickAccessGrid() {
  const [actividades, setActividades] = useState([]);

  useEffect(() => {
    let active = true;
    listActividades()
      .then((data) => {
        if (active) setActividades(data);
      })
      .catch(() => {
        if (active) setActividades([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="flex flex-col gap-sm">
      <h3 className="text-label-md text-on-surface uppercase tracking-wider">
        Acceso rápido
      </h3>
      {actividades.length === 0 ? (
        <div className="bg-surface-container border border-outline-variant rounded-xl px-md py-lg text-center text-on-surface-variant">
          Todavía no hay actividades disponibles.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-gutter md:grid-cols-[repeat(4,minmax(0,120px))] md:gap-md">
        {actividades.map((actividad, index) => {
          const Icon = getActividadIcon(actividad.nombre);
          const tone = TONES[index % TONES.length];
          return (
            <button
              key={actividad.id}
              type="button"
              className="flex flex-col items-center gap-xs group"
            >
              <span
                className={cn(
                  "w-full aspect-square rounded-xl flex items-center justify-center shadow-sm transition-transform group-active:scale-95",
                  TONE_CLASSES[tone],
                )}
              >
                <Icon className="size-8" strokeWidth={2} />
              </span>
              <span className="text-[11px] font-medium text-on-surface">
                {actividad.nombre}
              </span>
            </button>
          );
        })}
        </div>
      )}
    </section>
  );
}
