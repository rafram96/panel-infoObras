import type { Config } from "tailwindcss";

// Paleta M3 mapeada a CSS variables. Los valores estan en globals.css
// (:root para tema claro, .dark para tema oscuro). Esto permite que
// `bg-primary`, `text-secondary`, `bg-surface/80` etc. funcionen en
// ambos temas sin agregar `dark:` modifier en cada uso.
const tk = (name: string) =>
  `rgb(var(--color-${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: tk("primary"),
        "primary-container": tk("primary-container"),
        "on-primary": tk("on-primary"),
        "on-primary-container": tk("on-primary-container"),
        "primary-fixed": tk("primary-fixed"),
        "primary-fixed-dim": tk("primary-fixed-dim"),
        secondary: tk("secondary"),
        "secondary-container": tk("secondary-container"),
        "on-secondary": tk("on-secondary"),
        "on-secondary-container": tk("on-secondary-container"),
        tertiary: tk("tertiary"),
        "tertiary-container": tk("tertiary-container"),
        error: tk("error"),
        "error-container": tk("error-container"),
        surface: tk("surface"),
        "surface-dim": tk("surface-dim"),
        "surface-bright": tk("surface-bright"),
        "surface-container-lowest": tk("surface-container-lowest"),
        "surface-container-low": tk("surface-container-low"),
        "surface-container": tk("surface-container"),
        "surface-container-high": tk("surface-container-high"),
        "surface-container-highest": tk("surface-container-highest"),
        "on-surface": tk("on-surface"),
        "on-surface-variant": tk("on-surface-variant"),
        outline: tk("outline"),
        "outline-variant": tk("outline-variant"),
        "inverse-surface": tk("inverse-surface"),
        "inverse-on-surface": tk("inverse-on-surface"),
        "inverse-primary": tk("inverse-primary"),
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      // Escala tipográfica del panel. `nano/micro/dato` cubren los tamaños
      // densos que antes se escribían inline (text-[0.625rem] etc.); los de
      // 0.75rem y 0.875rem ya existen como text-xs / text-sm de Tailwind.
      fontSize: {
        nano: ["0.625rem", { lineHeight: "0.9rem" }],   // 10px — etiquetas UPPERCASE, chips diminutos
        micro: ["0.6875rem", { lineHeight: "1rem" }],   // 11px — texto de apoyo en filas densas
        dato: ["0.8125rem", { lineHeight: "1.15rem" }], // 13px — dato principal en tablas/tarjetas
      },
      // Radios del design system "Precision Engineering": esquinas 4–8px.
      // Antes `rounded` (DEFAULT) era 2px — un filo casi invisible que convivía
      // con cards de 8px. Se sube el piso a 4px.
      borderRadius: {
        DEFAULT: "0.25rem", // 4px
        lg: "0.375rem",     // 6px
        xl: "0.5rem",       // 8px
        full: "9999px",     // píldora/círculo real (antes 0.75rem lo rompía)
      },
    },
  },
  plugins: [],
};

export default config;
