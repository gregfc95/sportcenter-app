export default function WelcomeSection({ name }) {
  return (
    <section className="flex flex-col gap-sm">
      <h2 className="text-headline-lg text-on-surface">
        Hola, {name}.
      </h2>
      <p className="text-body-lg text-on-surface-variant">
        ¿Qué deporte practicamos hoy?
      </p>
    </section>
  );
}
