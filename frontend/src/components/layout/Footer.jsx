import { MapPin, Phone, Mail } from "lucide-react";
import { SPORTS } from "./constants";

export default function Footer() {
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
            <p className="text-body-md text-on-surface-variant max-w-80">
              Transformando vidas a través del deporte y la comunidad desde 2010.
            </p>
          </div>

          <div className="flex flex-col gap-xs items-center md:items-start">
            <h4 className="text-label-md font-bold text-on-surface mb-xs">Deportes</h4>
            {SPORTS.map(({ name }) => (
              <a
                key={name}
                href="#deportes"
                className="text-label-md text-on-surface-variant hover:text-primary transition-colors"
              >
                {name}
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-sm items-center md:items-start">
            <h4 className="text-label-md font-bold text-on-surface mb-xs">Contacto</h4>
            <div className="flex items-center gap-sm text-body-md text-on-surface-variant">
              <MapPin className="size-4 text-accent shrink-0" />
              <span>Calle 9 375 e 39 y 40, La Plata</span>
            </div>
            <a
              href="mailto:contactoBA@sportify.com"
              className="flex items-center gap-sm text-body-md text-on-surface-variant hover:text-primary transition-colors"
            >
              <Mail className="size-4 text-accent shrink-0" />
              <span>contactoBA@sportify.com</span>
            </a>
            <div className="flex items-center gap-sm text-body-md text-on-surface-variant">
              <Phone className="size-4 text-accent shrink-0" />
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
