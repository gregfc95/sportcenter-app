import { Link } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/useTheme";
import defaultMarketingImageLight from "@/assets/image-instalaciones-light.jpg";
import defaultMarketingImageDark from "@/assets/image-instalaciones-dark.png";

export default function AuthLayout({
  marketing,
  marketingImageLight = defaultMarketingImageLight,
  marketingImageDark = defaultMarketingImageDark,
  children,
}) {
  const { isDark, toggle } = useTheme();
  const marketingImage = isDark ? marketingImageDark : marketingImageLight;

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col">
      <header className="bg-surface border-b border-outline-variant px-md md:px-lg py-sm flex items-center justify-between">
        <Link to="/" className="flex items-center gap-sm">
          <img src="/logo.png" alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
          <span className="font-bold text-on-surface text-base md:text-lg">
            Sportify
          </span>
        </Link>
        <button
          type="button"
          onClick={toggle}
          aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          aria-pressed={isDark}
          className="p-xs hover:text-primary transition-colors rounded-full text-on-surface-variant flex items-center justify-center"
        >
          {isDark ? <Sun className="size-6" /> : <Moon className="size-6" />}
        </button>
      </header>

      <div className="flex flex-1 items-center justify-center px-md py-lg">
        <div className="flex w-full max-w-4xl rounded-2xl shadow-xl shadow-secondary-container/20 overflow-hidden bg-surface">
          <div className="hidden md:flex flex-1 flex-col p-lg bg-primary text-primary-foreground relative overflow-hidden">
            {marketingImage && (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-10"
                style={{ backgroundImage: `url(${marketingImage})` }}
                aria-hidden="true"
              />
            )}
            <div className="relative z-10 flex flex-col flex-1">
              {marketing}
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center px-md md:px-lg py-lg">
            {children}
          </div>
        </div>
      </div>

      <footer className="text-center py-md text-xs text-on-surface-variant">
        © {new Date().getFullYear()} Sportify
      </footer>
    </div>
  );
}
