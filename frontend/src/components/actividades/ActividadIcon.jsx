import { createElement } from "react";

import { getActividadIcon } from "@/components/actividades/actividadIcons";

// Se renderiza con createElement en lugar de <Icon/> para que react-hooks no lo
// tome como un componente creado en cada render: el ícono sale de una tabla fija.
export function ActividadIcon({ actividad, ...props }) {
  return createElement(getActividadIcon(actividad), props);
}
