import type { JobStatus, Bloque } from "./types";

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
