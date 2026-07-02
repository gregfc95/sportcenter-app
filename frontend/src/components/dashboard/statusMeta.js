// Presentación propia de las cards del dashboard por estado de pago; el badge
// sale de EstadoBadge. En archivo aparte (no exporta componentes) para no
// romper el fast refresh de los que lo importan.
export const STATUS_META = {
  pendiente: {
    strip: "bg-accent",
    icon: "text-accent",
  },
  senado: {
    strip: "bg-accent",
    icon: "text-accent",
  },
  pagado: {
    strip: "bg-surface-container-high",
    icon: "text-on-surface-variant",
  },
};
