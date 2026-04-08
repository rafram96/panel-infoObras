"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PanelShell from "@/components/PanelShell";
import type { Job, JobStatus } from "@/lib/types";
import { STATUS_LABEL, STATUS_BADGE } from "@/lib/helpers";

// ── Filter options ───────────────────────────────────────────────────────────
type FilterStatus = "all" | JobStatus;

const STATUS_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "done", label: "Completado" },
  { value: "error", label: "Error" },
  { value: "running", label: "Procesando" },
  { value: "pending", label: "En cola" },
];

// ── Page ─────────────────────────────────────────────────────────────────────
export default function HistorialPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  // ── Fetch + poll ─────────────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs");
      if (res.ok) {
        const data: Job[] = await res.json();
        setJobs(data);
      }
    } catch {
      /* silently ignore network errors during polling */
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const id = setInterval(fetchJobs, 10_000);
    return () => clearInterval(id);
  }, [fetchJobs]);

  // ── Delete handler ───────────────────────────────────────────────────────
  const handleDelete = async (jobId: string) => {
    if (!confirm("¿Eliminar este trabajo? Esta accion no se puede deshacer."))
      return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
      }
    } catch {
      /* ignore */
    }
  };

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = jobs.filter((job) => {
    const matchesSearch =
      search === "" ||
      job.filename.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalCount = jobs.length;
  const errorCount = jobs.filter((j) => j.status === "error").length;
  const activeCount = jobs.filter(
    (j) => j.status === "running" || j.status === "pending",
  ).length;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <PanelShell
      title="Historial de Analisis"
      subtitle="Gestione y revise los expedientes procesados por el motor de inteligencia."
    >
      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest p-4 mb-6 flex flex-wrap items-center gap-4 border border-outline-variant/20 rounded-lg">
        {/* Search */}
        <div className="flex-1 min-w-[260px] relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre de archivo..."
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline/10 rounded-lg text-sm focus:ring-2 focus:ring-primary-fixed focus:border-primary-fixed outline-none transition-all"
          />
        </div>

        {/* Status dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-[0.6875rem] font-bold uppercase tracking-wider text-outline">
            Estado
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
            className="bg-surface-container-low border border-outline/10 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary-fixed"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest overflow-hidden rounded-lg border border-outline-variant/20">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-high">
            <tr>
              <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on-surface-variant">
                Fecha
              </th>
              <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on-surface-variant">
                Archivo
              </th>
              <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on-surface-variant">
                Estado
              </th>
              <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on-surface-variant text-center">
                Profesionales
              </th>
              <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on-surface-variant">
                Progreso
              </th>
              <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on-surface-variant text-right">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-outline-variant/10">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm text-on-surface-variant"
                >
                  {jobs.length === 0
                    ? "No hay trabajos registrados."
                    : "No se encontraron resultados con los filtros aplicados."}
                </td>
              </tr>
            )}

            {filtered.map((job, i) => {
              const isActive =
                job.status === "running" || job.status === "pending";
              return (
                <tr
                  key={job.id}
                  className={[
                    "hover:bg-secondary-container/30 transition-colors",
                    i % 2 !== 0 ? "bg-surface-container-low/50" : "",
                  ].join(" ")}
                >
                  {/* Fecha */}
                  <td className="px-4 py-4 text-xs text-on-surface font-medium whitespace-nowrap">
                    {job.created_at}
                  </td>

                  {/* Archivo */}
                  <td className="px-4 py-4">
                    <div className="text-xs font-bold text-primary truncate max-w-[260px]">
                      {job.filename}
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-4">
                    <span
                      className={[
                        "inline-flex items-center px-2 py-0.5 rounded text-[0.625rem] font-bold uppercase",
                        STATUS_BADGE[job.status],
                        isActive ? "animate-pulse" : "",
                      ].join(" ")}
                    >
                      {STATUS_LABEL[job.status]}
                    </span>
                  </td>

                  {/* Profesionales / Cargos */}
                  <td className="px-4 py-4 text-center text-xs font-semibold text-on-surface-variant">
                    {job.profesionales_count != null ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-primary font-bold text-sm">
                          {job.profesionales_count}
                        </span>
                        <span className="text-[0.6rem] text-slate-400">
                          {job.job_type === "tdr" ? "cargos" : "prof."}
                        </span>
                      </span>
                    ) : (
                      <span>&mdash;</span>
                    )}
                  </td>

                  {/* Progreso */}
                  <td className="px-4 py-4">
                    {isActive ? (
                      <div className="w-24">
                        <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${Math.max(job.progress_pct, 3)}%`,
                            }}
                          />
                        </div>
                        <span className="text-[0.625rem] text-on-surface-variant mt-0.5 block">
                          {job.progress_pct}%
                        </span>
                      </div>
                    ) : null}
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-4 text-right space-x-2">
                    <Link href={`/jobs/${job.id}`}>
                      <span className="material-symbols-outlined text-primary text-lg hover:opacity-70 cursor-pointer">
                        visibility
                      </span>
                    </Link>
                    <button onClick={() => handleDelete(job.id)}>
                      <span className="material-symbols-outlined text-error text-lg hover:opacity-70">
                        delete
                      </span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Bottom Stats Row ────────────────────────────────────────────── */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total */}
        <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/20 border-l-4 border-l-primary">
          <div className="text-[0.6875rem] font-bold uppercase tracking-wider text-outline mb-1">
            Total Analizados
          </div>
          <div className="text-3xl font-bold text-primary">{totalCount}</div>
        </div>

        {/* Errors */}
        <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/20 border-l-4 border-l-error">
          <div className="text-[0.6875rem] font-bold uppercase tracking-wider text-outline mb-1">
            Con Errores
          </div>
          <div className="text-3xl font-bold text-primary">{errorCount}</div>
        </div>

        {/* Active */}
        <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/20 border-l-4 border-l-secondary">
          <div className="text-[0.6875rem] font-bold uppercase tracking-wider text-outline mb-1">
            Procesando
          </div>
          <div className="text-3xl font-bold text-primary">{activeCount}</div>
        </div>
      </div>
    </PanelShell>
  );
}
