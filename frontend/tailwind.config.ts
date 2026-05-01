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
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "0.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
