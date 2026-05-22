import { useState } from "react";
import {
  Menu,
  X,
  LogIn,
  Home,
  Trophy,
  MessageCircle,
  Volleyball,
  Goal,
  ArrowRight,
  Target,
  Star,
  Clock,
  Users,
  MapPin,
  Phone,
  Mail,
  Sun,
  Moon,
  Check,
} from "lucide-react";

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

const NAV_LINKS = [
  { label: "Inicio", Icon: Home, active: true },
  { label: "Deportes", Icon: Trophy, active: false },
  { label: "Contacto", Icon: MessageCircle, active: false },
];

export default function LandingPage({ isDark = false, onToggleTheme }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col overflow-x-hidden">
      <TopAppBar
        onMenuClick={() => setDrawerOpen(true)}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />
      <NavigationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <main className="flex-grow pt-16 md:pt-20 flex flex-col gap-lg md:gap-xl pb-xl">
        <Hero isDark={isDark} />
        <SportsSection />
        <BenefitsSection isDark={isDark} />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}

function TopAppBar({ onMenuClick, isDark, onToggleTheme }) {
  return (
    <header className="bg-surface fixed top-0 w-full z-50 border-b border-outline-variant shadow-md shadow-secondary-container/10 h-16 md:h-20">
      <div className="mx-auto max-w-7xl h-full flex items-center justify-between px-margin-mobile md:px-md lg:px-margin-desktop">
        <div className="flex items-center gap-sm">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Abrir menú"
            className="md:hidden p-xs hover:text-primary transition-colors rounded-full text-on-surface-variant flex items-center justify-center"
          >
            <Menu className="size-6" />
          </button>
          <div className="hidden md:flex items-center gap-sm">
            <img src="/logo.png" alt="" aria-hidden="true" className="h-10 w-10 object-contain" />
            <span className="text-headline-md font-bold tracking-tight text-on-surface">
              Centro Deportivo Provincia BA
            </span>
          </div>
        </div>

        <div className="md:hidden font-display text-[20px] leading-tight font-extrabold tracking-tight uppercase text-primary-container">
          Centro Deportivo Provincia BA
        </div>

        <nav className="hidden md:flex items-center gap-lg" aria-label="Navegación principal">
          {NAV_LINKS.map(({ label }) => (
            <a
              key={label}
              href={label === "Inicio" ? "#" : `#${label.toLowerCase()}`}
              className="text-label-md text-on-surface hover:text-primary-container transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-xs md:gap-sm">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            aria-pressed={isDark}
            className="p-xs hover:text-primary transition-colors rounded-full text-on-surface-variant flex items-center justify-center"
          >
            {isDark ? <Sun className="size-6" /> : <Moon className="size-6" />}
          </button>
          <button
            type="button"
            className="hidden md:inline-flex bg-primary-container text-on-primary-container text-label-md font-bold px-md py-sm rounded-lg shadow-md shadow-primary-container/20 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Ingresar
          </button>
          <button
            type="button"
            aria-label="Ingresar"
            className="md:hidden p-xs hover:text-primary transition-colors rounded-full text-primary-container flex items-center justify-center"
          >
            <LogIn className="size-6" />
          </button>
        </div>
      </div>
    </header>
  );
}

function NavigationDrawer({ open, onClose }) {
  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 bg-black/50 z-[55] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <nav
        aria-label="Menú principal"
        className={`bg-surface-container text-primary-container h-full w-72 rounded-r-xl border-r border-outline-variant shadow-xl shadow-secondary-container/20 fixed inset-y-0 left-0 z-[60] flex flex-col p-md transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-lg">
          <h2 className="text-headline-md font-bold text-primary-container">
            CD Provincia BA
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="text-on-surface-variant p-xs hover:text-primary rounded-full"
          >
            <X className="size-6" />
          </button>
        </div>
        <ul className="flex flex-col gap-sm text-body-lg">
          {NAV_LINKS.map(({ label, Icon, active }) => (
            <li key={label}>
              <a
                href={label === "Inicio" ? "#" : `#${label.toLowerCase()}`}
                onClick={onClose}
                className={`flex items-center gap-md p-sm rounded-lg transition-colors ${
                  active
                    ? "bg-secondary-container text-on-secondary-container font-bold"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                <Icon className="size-5" />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

function Hero({ isDark }) {
  return (
    <section className="lg:py-xl">
      <div className="mx-auto max-w-7xl w-full px-margin-mobile lg:px-margin-desktop">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-md lg:gap-xl items-center">
          <div className="flex flex-col gap-md order-2 lg:order-1 min-w-0">
            <span className="inline-flex w-fit items-center rounded-full bg-primary-container/10 px-sm py-xs text-label-sm font-bold uppercase tracking-wider text-primary-container">
              Tu mejor versión empieza aquí
            </span>
            <h1 className="text-display-lg-mobile lg:text-display-lg text-on-surface tracking-tight text-balance">
              Tu pasión, nuestro{" "}
              <span className="text-primary-container">terreno</span>
            </h1>
            <p className="text-body-md lg:text-body-lg text-on-surface-variant text-pretty">
              El mejor centro deportivo para Voley, Básquet, Fútbol y Pádel.
              Instalaciones de primer nivel, entrenadores profesionales y una
              comunidad apasionada esperándote.
            </p>
            <button
              type="button"
              className="bg-primary-container text-on-primary-container text-label-md py-md px-lg rounded-full w-full max-w-[240px] mt-sm hover:bg-primary hover:text-primary-foreground transition-colors font-bold shadow-lg shadow-primary-container/20"
            >
              ¡Empieza ahora!
            </button>

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
              className="aspect-video lg:aspect-square w-full max-w-[28rem] lg:max-w-none mx-auto rounded-2xl object-cover shadow-lg shadow-secondary-container/10"
            />
            <div className="hidden lg:flex absolute -bottom-4 -left-4 items-center gap-sm bg-surface border border-outline-variant rounded-xl shadow-xl shadow-secondary-container/20 p-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
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
          <div className="h-1 w-16 rounded-full bg-primary mt-xs mx-auto" />
          <p className="text-body-md text-on-surface-variant max-w-[36rem] mt-sm mx-auto text-pretty">
            Disciplinas diseñadas para todos los niveles, desde principiantes
            hasta alto rendimiento.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter lg:gap-md">
          {PRIMARY_SPORTS.map(({ name, detail, Icon }) => (
            <div
              key={name}
              className="group flex flex-col gap-sm bg-surface-container-low border border-outline-variant rounded-xl p-md hover:border-primary-container/50 hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary-container group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">
                <Icon className="size-6" />
              </div>
              <h3 className="text-headline-md text-on-surface font-bold mt-xs">
                {name}
              </h3>
              <p className="text-body-md text-on-surface-variant">{detail}</p>
              <a
                href="#"
                className="text-label-md text-primary-container flex items-center hover:text-on-surface transition-colors mt-auto pt-sm"
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
      <div className="mx-auto max-w-7xl bg-[#1A1A1A] text-[#F5F5F5] rounded-2xl lg:rounded-[2rem] p-lg lg:p-xl">
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
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFB70033] text-primary">
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
              className="aspect-[3/4] w-full rounded-2xl object-cover"
            />
            <img
              src={isDark ? instalacionesDark : instalacionesLight}
              alt="Instalaciones del centro deportivo"
              loading="lazy"
              className="aspect-[3/4] w-full mt-lg rounded-2xl object-cover"
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
      <div className="mx-auto max-w-7xl bg-primary-container text-on-primary-container rounded-2xl lg:rounded-[2rem] p-lg lg:p-xl text-center shadow-lg shadow-primary-container/20">
        <h2 className="text-headline-md lg:text-headline-lg text-balance">
          ¿Listo para saltar a la cancha?
        </h2>
        <p className="text-body-md lg:text-body-lg opacity-90 max-w-2xl mt-sm mx-auto text-pretty">
          Únete hoy y obtén un 20% de descuento en tu primer mes de membresía
        </p>
        <div className="mt-md flex justify-center">
          <button
            type="button"
            className="w-full sm:w-auto bg-primary text-primary-foreground text-label-md font-bold py-md px-xl rounded-full shadow-md hover:bg-primary-variant transition-colors"
          >
            Registrarse Ahora
          </button>
        </div>
        <p className="text-label-sm opacity-70 italic mt-sm">
          Sin contratos a largo plazo. Con horarios flexibles.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="contacto" className="scroll-mt-16 lg:scroll-mt-20 bg-surface-container-lowest w-full border-t border-outline-variant py-lg">
      <div className="mx-auto max-w-7xl px-margin-mobile lg:px-margin-desktop flex flex-col gap-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md md:gap-lg items-start text-center md:text-left">
          <div className="flex flex-col gap-sm items-center md:items-start">
            <div className="flex items-center gap-sm">
              <img src="/logo.png" alt="" aria-hidden="true" className="h-10 w-10 object-contain" />
              <span className="text-headline-md font-bold text-on-surface">
                CD Provincia BA
              </span>
            </div>
            <p className="text-body-md text-on-surface-variant max-w-[20rem]">
              Transformando vidas a través del deporte y la comunidad desde 2010.
            </p>
          </div>

          <div className="flex flex-col gap-xs items-center md:items-start">
            <h4 className="text-label-md font-bold text-on-surface mb-xs">Deportes</h4>
            {PRIMARY_SPORTS.map(({ name }) => (
              <a
                key={name}
                href="#deportes"
                className="text-label-md text-on-surface-variant hover:text-primary-container transition-colors"
              >
                {name}
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-sm items-center md:items-start">
            <h4 className="text-label-md font-bold text-on-surface mb-xs">Contacto</h4>
            <div className="flex items-center gap-sm text-body-md text-on-surface-variant">
              <MapPin className="size-4 text-primary shrink-0" />
              <span>Calle 9 375 e 39 y 40, La Plata</span>
            </div>
            <a
              href="mailto:contactoBA@sportify.com"
              className="flex items-center gap-sm text-body-md text-on-surface-variant hover:text-primary-container transition-colors"
            >
              <Mail className="size-4 text-primary shrink-0" />
              <span>contactoBA@sportify.com</span>
            </a>
            <div className="flex items-center gap-sm text-body-md text-on-surface-variant">
              <Phone className="size-4 text-primary shrink-0" />
              <span>+54 11 4444-5555</span>
            </div>
          </div>
        </div>

        <div className="border-t border-outline-variant pt-md text-center text-label-sm text-on-surface-variant">
          © {new Date().getFullYear()} Sportify. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
