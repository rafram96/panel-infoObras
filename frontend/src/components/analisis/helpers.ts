/** Helpers compartidos por las pestañas del análisis. */

export function fmtMs(ms?: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)} s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

// Normaliza el guion largo "—" → "-" en textos de datos (Claude/backend lo usan
// como separador; el evaluador lo prefiere sin ese símbolo). NO afecta los "—"
// de valores vacíos (esos son literales, no pasan por aquí).
export const nm = (s?: string | null) => (s == null ? s : s.replace(/—/g, "-"));
