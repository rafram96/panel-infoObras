import type { JobStatus, JobType, Bloque } from "./types";

export const JOB_TYPE_LABEL: Record<JobType, string> = {
  extraction: "Profesionales",
  tdr: "Requisitos TDR",
  full: "Análisis Completo",
};

export const JOB_TYPE_BADGE: Record<JobType, string> = {
  extraction: "bg-blue-50 text-blue-700 border border-blue-200",
  tdr: "bg-violet-50 text-violet-700 border border-violet-200",
  full: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

export const JOB_TYPE_ICON: Record<JobType, string> = {
  extraction: "person_search",
  tdr: "fact_check",
  full: "query_stats",
};

export const STATUS_LABEL: Record<JobStatus, string> = {
  pending: "En cola",
  running: "Procesando",
  done: "Completado",
  error: "Error",
};

export const STATUS_BADGE: Record<JobStatus, string> = {
  pending:
    "bg-amber-100 text-amber-700 border-l-4 border-amber-600",
  running:
    "bg-blue-100 text-blue-700 border-l-4 border-blue-600",
  done:
    "bg-green-100 text-green-700 border-l-4 border-green-600",
  error:
    "bg-red-100 text-red-700 border-l-4 border-red-600",
};

export function confColor(conf: number): string {
  if (conf >= 0.9) return "text-emerald-600";
  if (conf >= 0.75) return "text-amber-600";
  return "text-red-600";
}

export function formatSeconds(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${Math.round(s % 60)}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

const MESES_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/**
 * Formato humano para fechas ISO:
 * - Hoy, 15:42
 * - Ayer, 09:17
 * - 19 abr, 15:42   (este año)
 * - 19 abr 2025, 15:42 (otro año)
 */
export function formatFechaHumano(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;

  const now = new Date();
  const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  const fecha = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const hora = `${hh}:${mm}`;

  if (fecha.getTime() === hoy.getTime()) return `Hoy, ${hora}`;
  if (fecha.getTime() === ayer.getTime()) return `Ayer, ${hora}`;

  const dia = d.getDate();
  const mes = MESES_ES[d.getMonth()];
  const anio = d.getFullYear();
  const mostrarAnio = anio !== now.getFullYear();
  return mostrarAnio
    ? `${dia} ${mes} ${anio}, ${hora}`
    : `${dia} ${mes}, ${hora}`;
}

export function compressPages(pages: number[]): string {
  if (!pages.length) return "—";
  const sorted = [...pages].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}–${end}`);
      start = end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}–${end}`);
  return ranges.join(", ");
}

export function bloqueLabel(b: Bloque): string {
  return b.start === b.end ? `p. ${b.start}` : `pp. ${b.start}–${b.end}`;
}
