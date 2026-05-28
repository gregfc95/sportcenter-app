const SUBTITLE_BY_ROLE = {
  client: "¿Qué deporte practicamos hoy?",
  employee: "Esto es lo que pasa hoy en el centro.",
  admin: "Esto es lo que pasa hoy en el centro.",
};

export default function WelcomeSection({ user }) {
  const subtitle = SUBTITLE_BY_ROLE[user?.role] ?? SUBTITLE_BY_ROLE.client;

  return (
    <section className="flex flex-col gap-sm">
      <h2 className="text-headline-lg text-on-surface">
        Hola, {user?.name}.
      </h2>
      <p className="text-body-lg text-on-surface-variant">
        {subtitle}
      </p>
    </section>
  );
}
