import { SPORT_BY_NAME } from "@/components/layout/constants";
import { cn } from "@/lib/utils";

const TILES = [
  { name: "Pádel", tone: "amber-solid" },
  { name: "Básquet", tone: "burgundy-solid" },
  { name: "Voley", tone: "amber-outline" },
  { name: "Fútbol", tone: "burgundy-outline" },
];

const TONE_CLASSES = {
  "amber-solid": "bg-accent text-accent-foreground border border-transparent",
  "burgundy-solid":
    "bg-primary text-primary-foreground border border-transparent",
  "amber-outline": "bg-accent/15 text-accent border border-accent/40",
  "burgundy-outline": "bg-primary/10 text-primary border border-primary/30",
};

export default function QuickAccessGrid() {
  return (
    <section className="flex flex-col gap-sm">
      <h3 className="text-label-md text-on-surface uppercase tracking-wider">
        Acceso rápido
      </h3>
      <div className="grid grid-cols-4 gap-gutter">
        {TILES.map(({ name, tone }) => {
          const { Icon } = SPORT_BY_NAME[name];
          return (
            <button
              key={name}
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
                {name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
