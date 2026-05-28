import { Goal, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SPORT_BY_NAME } from "@/components/layout/constants";
import { cn } from "@/lib/utils";

const SPORT_ALIASES = {
  "Fútbol 5": "Fútbol",
};

const STATUS_META = {
  pendiente: {
    label: "Pendiente",
    strip: "bg-accent",
    badgeWrap: "bg-primary/10 border-primary/30 text-primary",
    dot: "bg-primary",
    icon: "text-accent",
    title: "text-on-surface",
  },
  pagado: {
    label: "Pagado",
    strip: "bg-surface-container-high",
    badgeWrap: "bg-[#4CAF50]/10 border-[#4CAF50]/30 text-on-surface",
    dot: "bg-[#4CAF50]",
    icon: "text-on-surface-variant",
    title: "text-on-surface-variant",
  },
};

export default function BookingCard({
  sport,
  court,
  datetime,
  status = "pendiente",
  capacity,
}) {
  const meta = STATUS_META[status] ?? STATUS_META.pendiente;
  const sportKey = SPORT_ALIASES[sport] ?? sport;
  const Icon = SPORT_BY_NAME[sportKey]?.Icon ?? Goal;
  const showAction = status === "pendiente" || status === "pagado";
  const showCapacity = status === "pendiente" && capacity;

  const actionButton =
    status === "pendiente" ? (
      <Button
        variant="outline"
        size="sm"
        className="text-primary border-primary/40 hover:bg-primary/10 hover:text-primary"
      >
        Pagar
      </Button>
    ) : (
      <Button
        variant="outline"
        size="sm"
        className="text-on-surface border-outline-variant hover:bg-surface-container-high"
      >
        <QrCode className="size-4" strokeWidth={2} />
        Ver QR
      </Button>
    );

  return (
    <article
      className={cn(
        "relative overflow-hidden bg-surface border border-outline-variant rounded-xl p-md shadow-sm shadow-black/5 flex flex-col gap-sm md:flex-row md:items-center md:gap-md",
        status === "pagado" && "opacity-90",
      )}
    >
      <span
        className={cn("absolute left-0 top-0 bottom-0 w-1", meta.strip)}
        aria-hidden="true"
      />

      <div className="flex flex-col gap-sm md:flex-1 md:min-w-0">
        <div className="flex justify-between items-start gap-sm pl-xs">
          <div className="flex flex-col gap-xs">
            <div className="flex items-center gap-xs">
              <Icon className={cn("size-5", meta.icon)} strokeWidth={2} />
              <h4
                className={cn(
                  "text-label-md uppercase tracking-wider",
                  meta.title,
                )}
              >
                {sport} • {court}
              </h4>
            </div>
            <span className="text-[20px] leading-tight font-bold text-on-surface">
              {datetime}
            </span>
          </div>

          <span
            className={cn(
              "shrink-0 border px-xs py-0.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1",
              meta.badgeWrap,
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
            {meta.label}
          </span>
        </div>

        {showCapacity && (
          <span className="hidden md:inline-flex pl-xs text-label-sm text-on-surface-variant">
            Cupo: {capacity.taken} / {capacity.total}
          </span>
        )}
      </div>

      {showAction && (
        <div className="flex items-center justify-between pt-sm border-t border-outline-variant pl-xs md:pt-0 md:border-t-0 md:border-l md:border-outline-variant md:pl-md md:justify-end md:shrink-0">
          {showCapacity && (
            <span className="md:hidden text-label-sm text-on-surface-variant">
              Cupo: {capacity.taken} / {capacity.total}
            </span>
          )}
          <div className="ml-auto md:ml-0">{actionButton}</div>
        </div>
      )}
    </article>
  );
}
