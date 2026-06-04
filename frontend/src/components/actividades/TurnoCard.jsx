import { MoreVertical, Trash2, Users } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TurnoCard({ turno, onDelete }) {
  const hora = turno.hora?.slice(0, 5) ?? turno.hora;
  return (
    <div className="bg-surface-container-high border border-outline-variant rounded-lg p-sm relative hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="text-label-md text-on-surface">{hora}</p>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Acciones para el turno de las ${hora}`}
            className="text-on-surface-variant hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded -mt-0.5 -mr-1 p-0.5"
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => onDelete?.(turno)}
            >
              <Trash2 className="size-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-1.5 mt-1 text-on-surface-variant">
        <Users className="size-3.5 text-primary" />
        <p className="text-label-sm">{turno.cupo} cupos</p>
      </div>
    </div>
  );
}
