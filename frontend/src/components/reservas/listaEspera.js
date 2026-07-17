/**
 * True si la reserva tiene una oferta de lista de espera activa (le tocó el
 * lugar y la ventana de pago sigue vigente). Sólo entonces se habilita "Pagar".
 *
 * @param {{ ofertado?: boolean, expira_at?: string|null }|null} espera
 * @returns {boolean}
 */
export function esperaOfertaActiva(espera) {
  return Boolean(
    espera?.ofertado &&
      espera.expira_at &&
      new Date(espera.expira_at) > new Date(),
  );
}

/**
 * Texto de estado para la card en espera: aviso de lugar liberado con la hora
 * límite de pago, aviso de oferta vencida, o la posición en la cola.
 *
 * @param {{ estado?: string, ofertado?: boolean, expira_at?: string|null, posicion?: number|null }|null} espera
 * @returns {string|null}
 */
export function esperaDetalle(espera) {
  if (!espera) return null;
  if (esperaOfertaActiva(espera)) {
    const hora = new Date(espera.expira_at).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `¡Se liberó un lugar! Pagá antes de las ${hora}`;
  }
  if (espera.estado === "vencido") {
    return "Se venció el plazo para pagar tu lugar. Seguís en la lista y te avisamos si se libera otro; si el turno tiene lugar libre, salí de la lista y reservá directo.";
  }
  if (espera.posicion != null) return `Posición en la lista: ${espera.posicion}`;
  return "En lista de espera";
}

/**
 * Estado a mostrar en el chip de una reserva en lista de espera: distingue la
 * oferta vencida del resto. Solo afecta la presentación; las acciones de la
 * card siguen gobernadas por el `en_espera` del backend.
 *
 * @param {{ estado?: string }|null} espera
 * @returns {string}
 */
export function esperaBadgeEstado(espera) {
  return espera?.estado === "vencido" ? "oferta_vencida" : "en_espera";
}

/**
 * Formatea la fecha límite de una renovación ("YYYY-MM-DD") como "dd/mm".
 *
 * @param {string} fechaISO
 * @returns {string}
 */
export function formatRenovacionLimite(fechaISO) {
  const [, mes, dia] = fechaISO.split("-");
  return `${dia}/${mes}`;
}
