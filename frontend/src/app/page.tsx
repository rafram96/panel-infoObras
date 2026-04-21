"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import PanelShell from "@/components/PanelShell";
import type { Job } from "@/lib/types";
import { STATUS_LABEL, STATUS_BADGE, formatFechaHumano } from "@/lib/helpers";

// ── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchJobs = async () => {
      try {
        // Dashboard solo muestra stats + recent — usa per_page amplio
        const res = await fetch("/api/jobs?per_page=100");
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        // Compat: endpoint nuevo retorna {items}, viejo retorna array
        const list: Job[] = Array.isArray(data) ? data : (data.items ?? []);
        if (!cancelled) setJobs(list);
      } catch {
        /* silently ignore — cards show 0 */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchJobs();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Derived metrics ──────────────────────────────────────────────────────
  const total = jobs.length;

  const now = new Date();
  const thisMonth = jobs.filter((j) => {
    const d = new Date(j.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const withErrors = jobs.filter((j) => j.status === "error").length;

  // 5 most recent jobs (already sorted by API, but sort defensively)
  const recent = [...jobs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PanelShell title="Dashboard" subtitle="Resumen general del sistema">
      {/* ── Metric cards ─────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon="lab_profile"
          label="Total Analisis"
          value={loading ? "..." : String(total)}
        />
        <MetricCard
          icon="calendar_month"
          label="Este Mes"
          value={loading ? "..." : String(thisMonth)}
        />
        <MetricCard
          icon="error"
          label="Con Errores"
          value={loading ? "..." : String(withErrors)}
          accent={withErrors > 0}
        />
        <MetricCard
          icon="timer"
          label="Tiempo Promedio"
          value={"—"}
        />
      </section>

      {/* ── Recent analyses table ────────────────────────────────────────── */}
      <section className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 mb-8 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
          <h2 className="text-sm font-semibold text-primary">Analisis Recientes</h2>
          <Link
            href="/jobs"
            className="text-xs text-secondary hover:text-primary transition-colors"
          >
            Ver todos
          </Link>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-outline">
            Cargando...
          </div>
        ) : recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-outline">
            No hay analisis registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-high">
                <tr>
                  {["ID", "Archivo", "Fecha", "Estado", "Acciones"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {recent.map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-surface-container-high/40 transition-colors"
                  >
                    <td className="px-5 py-3 text-xs font-mono text-secondary">
                      {job.id.slice(0, 8)}
                    </td>
                    <td className="px-5 py-3 text-sm text-primary truncate max-w-[200px]">
                      {job.filename}
                    </td>
                    <td
                      className="px-5 py-3 text-xs text-outline whitespace-nowrap"
                      title={job.created_at}
                    >
                      {formatFechaHumano(job.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[0.6875rem] font-semibold ${STATUS_BADGE[job.status]}`}
                      >
                        {STATUS_LABEL[job.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="inline-flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">
                          visibility
                        </span>
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Bottom action cards ──────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Descargar Reportes */}
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient border border-outline-variant/10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-xl">download</span>
            <h3 className="text-sm font-semibold">Descargar Reportes</h3>
          </div>
          <p className="text-xs text-outline leading-relaxed">
            Accede a los archivos Markdown generados por cada analisis completado.
          </p>
          <Link
            href="/jobs"
            className="mt-auto self-start text-xs font-medium text-secondary hover:text-primary transition-colors"
          >
            Ir a Jobs &rarr;
          </Link>
        </div>

        {/* Equipo de Analisis */}
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient border border-outline-variant/10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-xl">groups</span>
            <h3 className="text-sm font-semibold">Equipo de Analisis</h3>
          </div>
          <p className="text-xs text-outline leading-relaxed">
            Gestiona los miembros del equipo y los permisos de acceso al panel.
          </p>
          <span className="mt-auto self-start text-xs font-medium text-outline">
            Proximamente
          </span>
        </div>

        {/* Nuevo Analisis */}
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient border border-outline-variant/10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-xl">
              note_add
            </span>
            <h3 className="text-sm font-semibold">Nuevo Analisis</h3>
          </div>
          <p className="text-xs text-outline leading-relaxed">
            Sube un nuevo PDF para procesarlo con motor-OCR y segmentar por profesional.
          </p>
          <Link
            href="/nuevo-analisis"
            className="mt-auto self-start inline-flex items-center gap-1.5 primary-gradient text-white text-xs font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Iniciar
          </Link>
        </div>
      </section>
    </PanelShell>
  );
}

// ── MetricCard ───────────────────────────────────────────────────────────────
function MetricCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-surface-container-lowest p-4 border-l-4 border-primary shadow-ambient rounded-xl flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <span
          className={`material-symbols-outlined text-xl ${accent ? "text-red-600" : "text-primary"}`}
        >
          {icon}
        </span>
      </div>
      <div>
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-slate-500">
          {label}
        </p>
        <p className={`text-2xl font-bold ${accent ? "text-red-600" : "text-primary"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
