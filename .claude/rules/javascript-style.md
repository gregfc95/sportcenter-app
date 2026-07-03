---
paths:
  - "frontend/src/**/*.{js,jsx}"
---

# Estilo JavaScript (frontend React)

Convenciones del frontend en `frontend/src/`. Comentarios y JSDoc en español
(ver `code-comments.md`).

## Lenguaje y estructura

- **JavaScript plano (JS/JSX). Nunca introducir TypeScript**: ni archivos
  `.ts`/`.tsx` ni sintaxis de tipos (`components.json` fija `tsx: false`).
- Solo componentes de función con hooks. Nada de clases.
- Ubicación: páginas en `src/pages/` (una por ruta), componentes de feature en
  `src/components/<feature>/` (reservas, actividades, clientes...), primitivas
  shadcn en `src/components/ui/`, utilidades en `src/lib/`.
- Antes de crear un componente de UI genérico, revisar si ya existe una
  primitiva en `components/ui/` que lo cubra.
- Exports: `export default` para páginas y componentes de feature; exports
  nombrados para primitivas de `ui/` y funciones de `lib/`.
- Imports con el alias `@/` (`@/components/...`, `@/lib/...`).
- Constantes: las compartidas/transversales van en `src/lib/` (ej.
  `validators.js` con `EMAIL_RE`, `PASSWORD_RULE`); las propias de una feature,
  en un `constants.js` dentro de su carpeta (ej.
  `components/layout/constants.js` con `NAV_LINKS`, `SPORTS`). No hardcodear
  estos valores en los componentes.

## Capa de API

- Cada feature tiene su `api.js` que envuelve `request()` de
  `src/lib/apiClient.js` — no usar `fetch` directo en componentes.
- Pasar siempre un `fallback` en español apto para el usuario
  (`fallback: "No se pudo iniciar el pago."`).
- Los errores llegan como `ApiError` con `fieldErrors`; usarlos para marcar
  campos de formulario.
- JSDoc con `@param`/`@returns` (descripciones en español) en las funciones de
  API y de `lib/` — ver `src/components/reservas/api.js` como modelo.

## Estilos

- Tailwind v4 con los **tokens semánticos definidos en `src/index.css`**
  (bloque `@theme inline`) — esa es la fuente de verdad. Usar solo esos tokens,
  nunca clases de paleta cruda (`bg-gray-100`, `text-red-500`) ni valores
  hardcodeados:
  - Color: `bg-surface-container`, `bg-surface-container-high`, `text-on-surface`,
    `text-on-surface-variant`, `border-outline-variant`, `bg-primary`,
    `text-error`, `text-success-green`, `text-info-blue`, `text-credit-violet`.
  - Espaciado: `p-md`, `gap-sm`, `px-gutter`, `py-base` (`xs/base/sm/gutter/md/lg/xl`).
  - Tipografía: `text-display-lg`, `text-headline-lg`, `text-headline-md`,
    `text-body-lg`, `text-body-md`, `text-label-md`, `text-label-sm`.
  - Fuentes: `font-sans`/`font-heading`/`font-body` (Lexend); radios `rounded-lg`, etc.
- Si falta un token, agregarlo en `index.css`; no inventar valores en el JSX.
- Dark mode con la variante `dark:` (clase `.dark` manejada por
  `ThemeContext`); el tema ajusta luminancia, no invierte.
- Combinar clases condicionales con `cn()` de `@/lib/utils`.
- Íconos con `lucide-react`; toasts con `sonner`.

## Idioma y locale

- Strings de UI en español.
- Fechas con los helpers de `src/lib/fecha.js`; moneda con
  `Intl.NumberFormat("es-AR", { currency: "ARS" })`.

## Al terminar

- Sin `console.log` remanentes ni JSX comentado.
- `npm run lint` limpio (ESLint 9, config en `frontend/eslint.config.js`).
