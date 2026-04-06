import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#022448",
        "primary-container": "#1e3a5f",
        "on-primary": "#ffffff",
        "on-primary-container": "#8aa4cf",
        "primary-fixed": "#d5e3ff",
        "primary-fixed-dim": "#adc8f5",
        secondary: "#515f74",
        "secondary-container": "#d5e3fc",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#57657a",
        tertiary: "#002252",
        "tertiary-container": "#00377c",
        error: "#ba1a1a",
        "error-container": "#ffdad6",
        surface: "#f8f9fa",
        "surface-dim": "#d9dadb",
        "surface-bright": "#f8f9fa",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f3f4f5",
        "surface-container": "#edeeef",
        "surface-container-high": "#e7e8e9",
        "surface-container-highest": "#e1e3e4",
        "on-surface": "#191c1d",
        "on-surface-variant": "#43474e",
        outline: "#74777f",
        "outline-variant": "#c4c6cf",
        "inverse-surface": "#2e3132",
        "inverse-on-surface": "#f0f1f2",
        "inverse-primary": "#adc8f5",
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
