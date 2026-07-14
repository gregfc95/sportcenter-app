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
 * límite de pago, o la posición en la cola.
 *
 * @param {{ ofertado?: boolean, expira_at?: string|null, posicion?: number|null }|null} espera
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
  if (espera.posicion != null) return `Posición en la lista: ${espera.posicion}`;
  return "En lista de espera";
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
