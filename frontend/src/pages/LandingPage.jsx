import { Link } from "react-router-dom";
import {
  Trophy,
  Volleyball,
  Goal,
  ArrowRight,
  Target,
  Star,
  Clock,
  Users,
  Check,
} from "lucide-react";

import { useTheme } from "@/lib/ThemeContext";
import { usePageTitle } from "@/lib/usePageTitle";

import principalLight from "@/assets/image-principal-light.png";
import principalDark from "@/assets/image-principal-dark.png";
import comunidadLight from "@/assets/imagen-comunidad-light.jpg";
import comunidadDark from "@/assets/imagen-comunidad-dark.jpg";
import instalacionesLight from "@/assets/image-instalaciones-light.jpg";
import instalacionesDark from "@/assets/image-instalaciones-dark.png";

const ATLETAS = Object.values(
  import.meta.glob("@/assets/atletas/*.{jpg,jpeg,png,webp}", {
    eager: true,
    import: "default",
  })
);

const PRIMARY_SPORTS = [
  {
    name: "Voley",
    detail: "Canchas cubiertas de parquet profesional y ligas amateur mixtas.",
    Icon: Volleyball,
  },
  {
    name: "Básquet",
    detail: "Entrenamiento especializado, técnica individual y partidos nocturnos.",
    Icon: Trophy,
  },
  {
    name: "Fútbol",
    detail: "Césped sintético de última generación con iluminación LED profesional.",
    Icon: Goal,
  },
  {
    name: "Pádel",
    detail: "Pistas panorámicas de cristal, alquiler de palas y clases personalizadas.",
    Icon: Target,
  },
];

const BENEFITS = [
  {
    Icon: Star,
    title: "Equipamiento Premium",
    body: "Equipamiento de última generación para todos los deportes.",
  },
  {
    Icon: Clock,
    title: "Horarios Flexibles",
    body: "Abierto de lunes a domingo con amplios horarios.",
  },
  {
    Icon: Users,
    title: "Comunidad Activa",
    body: "Torneos, eventos y una comunidad vibrante de atletas.",
  },
];

export default function LandingPage() {
  usePageTitle("Inicio", "Centro Deportivo Provincia BA");
  const { isDark } = useTheme();

  return (
    <div className="flex flex-col gap-lg md:gap-xl pb-xl">
      <Hero isDark={isDark} />
      <SportsSection />
      <BenefitsSection isDark={isDark} />
      <FinalCTA />
    </div>
  );
}

function Hero({ isDark }) {
  return (
    <section className="lg:py-xl">
      <div className="mx-auto max-w-7xl w-full px-margin-mobile lg:px-margin-desktop">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-md lg:gap-xl items-center">
          <div className="flex flex-col gap-md order-2 lg:order-1 min-w-0">
            <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-sm py-xs text-label-sm font-bold uppercase tracking-wider text-primary">
              Tu mejor versión empieza aquí
            </span>
            <h1 className="text-display-lg-mobile lg:text-display-lg text-on-surface tracking-tight text-balance">
              Tu pasión, nuestro{" "}
              <span className="text-primary">terreno</span>
            </h1>
            <p className="text-body-md lg:text-body-lg text-on-surface-variant text-pretty">
              El mejor centro deportivo para Voley, Básquet, Fútbol y Pádel.
              Instalaciones de primer nivel, entrenadores profesionales y una
              comunidad apasionada esperándote.
            </p>
            <Link
              to="/register"
              className="bg-primary text-primary-foreground text-label-md py-md px-lg rounded-full w-full max-w-60 mt-sm hover:bg-primary/90 transition-colors font-bold shadow-lg shadow-primary/20 text-center"
            >
              ¡Empieza ahora!
            </Link>

            <div className="flex items-center gap-md mt-sm">
              <div className="flex -space-x-2">
                {ATLETAS.length > 0
                  ? ATLETAS.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt=""
                        aria-hidden="true"
                        className="h-10 w-10 rounded-full border-2 border-background object-cover"
                      />
                    ))
                  : [1, 2, 3].map((i) => (
                      <div
                        key={i}
                        aria-hidden="true"
                        className="h-10 w-10 rounded-full border-2 border-background bg-surface-container-high"
                      />
                    ))}
              </div>
              <p className="text-label-md text-on-surface-variant">
                <span className="font-bold text-on-surface">+500 atletas</span>{" "}
                entrenan con nosotros cada semana
              </p>
            </div>
          </div>

          <div className="relative order-1 lg:order-2">
            <img
              src={isDark ? principalDark : principalLight}
              alt="Centro Deportivo Provincia BA"
              className="aspect-video lg:aspect-square w-full max-w-112 lg:max-w-none mx-auto rounded-2xl object-cover shadow-lg shadow-secondary-container/10"
            />
            <div className="hidden lg:flex absolute -bottom-4 -left-4 items-center gap-sm bg-surface border border-outline-variant rounded-xl shadow-xl shadow-secondary-container/20 p-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Check className="size-5" strokeWidth={3} />
              </div>
              <div className="text-left">
                <p className="text-label-md font-bold text-on-surface">
                  Canchas Disponibles
                </p>
                <p className="text-label-sm text-on-surface-variant">
                  Reserva instantánea hoy
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SportsSection() {
  return (
    <section id="deportes" className="scroll-mt-16 lg:scroll-mt-20 bg-background py-md lg:py-xl">
      <div className="mx-auto max-w-7xl w-full px-margin-mobile lg:px-margin-desktop flex flex-col gap-md lg:gap-lg">
        <div className="text-center">
          <h2 className="text-headline-md lg:text-headline-lg text-on-surface">
            Nuestros Deportes
          </h2>
          <div className="h-1 w-16 rounded-full bg-accent mt-xs mx-auto" />
          <p className="text-body-md text-on-surface-variant max-w-144 mt-sm mx-auto text-pretty">
            Disciplinas diseñadas para todos los niveles, desde principiantes
            hasta alto rendimiento.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter lg:gap-md">
          {PRIMARY_SPORTS.map(({ name, detail, Icon }) => (
            <div
              key={name}
              className="group flex flex-col gap-sm bg-surface-container-low border border-outline-variant rounded-xl p-md hover:border-primary/50 hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="size-6" />
              </div>
              <h3 className="text-headline-md text-on-surface font-bold mt-xs">
                {name}
              </h3>
              <p className="text-body-md text-on-surface-variant">{detail}</p>
              <a
                href="#"
                className="text-label-md text-primary flex items-center hover:text-on-surface transition-colors mt-auto pt-sm"
              >
                Saber más <ArrowRight className="size-4 ml-xs" />
              </a>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

function BenefitsSection({ isDark }) {
  return (
    <section id="beneficios" className="scroll-mt-16 lg:scroll-mt-20 px-margin-mobile lg:px-margin-desktop">
      <div className="mx-auto max-w-7xl bg-[#1A1A1A] text-[#F5F5F5] rounded-2xl lg:rounded-4x1 p-lg lg:p-xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-md lg:gap-xl items-center">
          <div className="flex flex-col gap-md">
            <h2 className="text-headline-md lg:text-headline-lg text-balance">
              ¿Por qué elegir Centro Deportivo Provincia BA?
            </h2>
            <p className="text-body-md text-[#B0B8BA] text-pretty">
              No somos solo un lugar para jugar, somos un espacio diseñado
              para tu bienestar y crecimiento deportivo.
            </p>
            <div className="flex flex-col gap-md mt-sm">
              {BENEFITS.map(({ Icon, title, body }) => (
                <div key={title} className="flex items-start gap-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-label-md font-bold">{title}</h4>
                    <p className="text-body-md text-[#B0B8BA] mt-xs">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-gutter">
            <img
              src={isDark ? comunidadDark : comunidadLight}
              alt="Comunidad de atletas"
              loading="lazy"
              className="aspect-3/4 w-full rounded-2xl object-cover"
            />
            <img
              src={isDark ? instalacionesDark : instalacionesLight}
              alt="Instalaciones del centro deportivo"
              loading="lazy"
              className="aspect-3/4 w-full mt-lg rounded-2xl object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-margin-mobile lg:px-margin-desktop">
      <div className="mx-auto max-w-7xl bg-primary text-primary-foreground rounded-2xl lg:rounded-4x1 p-lg lg:p-xl text-center shadow-lg shadow-primary/20">
        <h2 className="text-headline-md lg:text-headline-lg text-balance">
          ¿Listo para saltar a la cancha?
        </h2>
        <p className="text-body-md lg:text-body-lg opacity-90 max-w-2xl mt-sm mx-auto text-pretty">
          Únete hoy y obtén un 20% de descuento en tu primer mes de membresía
        </p>
        <div className="mt-md flex justify-center">
          <Link
            to="/register"
            className="w-full sm:w-auto bg-accent text-accent-foreground text-label-md font-bold py-md px-xl rounded-full shadow-md hover:bg-accent/90 transition-colors text-center"
          >
            Registrarse Ahora
          </Link>
        </div>
        <p className="text-label-sm opacity-70 italic mt-sm">
          Sin contratos a largo plazo. Con horarios flexibles.
        </p>
      </div>
    </section>
  );
}