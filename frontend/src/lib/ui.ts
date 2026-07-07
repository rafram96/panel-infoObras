/**
 * Tonos semánticos — única fuente de verdad para los colores de estado del panel.
 *
 * Antes cada tab/página hardcodeaba sus `bg-green-100 dark:bg-green-950…` a su
 * manera (TabVeredictos, TabFactores, TabPasos, páginas). Esto los unifica: un
 * tono = un significado, con todas sus superficies (píldora, sólido, texto,
 * borde). Si hay que ajustar un color de estado, se cambia acá una sola vez.
 *
 * Convención de tonos:
 *   ok       verde   → cumple / completado / correcto
 *   error    rojo    → no cumple / falló / crítico
 *   alerta   naranja → alerta (severidad media, error parcial)
 *   revision ámbar   → por confirmar / necesita atención humana / provisional
 *   info     neutro  → informativo / no aplica / pendiente
 *   acento   azul    → interactivo / origen Claude / activo
 */

export type Tono = "ok" | "error" | "alerta" | "revision" | "info" | "acento";

interface SuperficiesTono {
  /** Píldora/badge suave: fondo tenue + texto de color. Para chips de estado. */
  chip: string;
  /** Círculo/badge sólido: fondo saturado + texto blanco. Para íconos de paso. */
  solido: string;
  /** Solo texto de color (sobre superficie neutra). */
  texto: string;
  /** Borde izquierdo de acento (tarjetas con `border-l-4`). */
  borde: string;
}

export const TONO: Record<Tono, SuperficiesTono> = {
  ok: {
    chip: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    solido: "bg-green-500 text-white",
    texto: "text-green-600 dark:text-green-400",
    borde: "border-l-green-500",
  },
  error: {
    chip: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    solido: "bg-red-600 text-white",
    texto: "text-red-600 dark:text-red-400",
    borde: "border-l-red-500",
  },
  alerta: {
    chip: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    solido: "bg-orange-500 text-white",
    texto: "text-orange-600 dark:text-orange-400",
    borde: "border-l-orange-500",
  },
  revision: {
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    solido: "bg-amber-500 text-white",
    texto: "text-amber-600 dark:text-amber-400",
    borde: "border-l-amber-500",
  },
  info: {
    chip: "bg-surface-container-high text-on-surface-variant",
    solido: "bg-surface-container-high text-outline",
    texto: "text-outline",
    borde: "border-l-outline-variant",
  },
  acento: {
    chip: "bg-primary/10 text-primary",
    solido: "bg-primary text-white",
    texto: "text-primary",
    borde: "border-l-primary",
  },
};

/** Une clases condicionales sin arrastrar una dependencia (clsx/cn). */
export function cx(...partes: Array<string | false | null | undefined>): string {
  return partes.filter(Boolean).join(" ");
}
