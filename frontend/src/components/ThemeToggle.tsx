"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "panel-theme";

function leerThemeInicial(): Theme {
  if (typeof window === "undefined") return "light";
  const guardado = window.localStorage.getItem(STORAGE_KEY);
  if (guardado === "dark" || guardado === "light") return guardado;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function aplicarTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export default function ThemeToggle() {
  // Empezamos con null para que el SSR no marque uno fijo y haya hydration mismatch.
  // El valor real se aplica en useEffect.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const inicial = leerThemeInicial();
    setTheme(inicial);
    aplicarTheme(inicial);
  }, []);

  const toggle = () => {
    const proximo: Theme = theme === "dark" ? "light" : "dark";
    setTheme(proximo);
    aplicarTheme(proximo);
    try {
      window.localStorage.setItem(STORAGE_KEY, proximo);
    } catch {
      /* localStorage puede fallar en privacy mode — ignorar */
    }
  };

  // Evitar flash de icono incorrecto pre-hidratación: no renderizamos hasta
  // saber el tema. El script anti-flash en layout.tsx ya aplicó la clase
  // correcta al <html>, así que esto solo es por el ícono del botón.
  if (theme === null) {
    return (
      <div
        className="p-1.5 rounded text-secondary"
        aria-hidden="true"
        style={{ width: 32, height: 32 }}
      />
    );
  }

  const esDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      title={esDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      aria-label={esDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      className="p-1.5 rounded text-secondary hover:bg-surface-container transition-all duration-200"
    >
      <span className="material-symbols-outlined text-[20px]">
        {esDark ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
