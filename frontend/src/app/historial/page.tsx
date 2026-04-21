"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PanelShell from "@/components/PanelShell";
import ConfirmModal from "@/components/ConfirmModal";
import type { Job, JobStatus, JobType } from "@/lib/types";
import { STATUS_LABEL, STATUS_BADGE, JOB_TYPE_LABEL, JOB_TYPE_BADGE, JOB_TYPE_ICON, formatFechaHumano } from "@/lib/helpers";

// ── Filter options ───────────────────────────────────────────────────────────
type FilterStatus = "all" | JobStatus;
type FilterType = "all" | JobType;

const STATUS_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "done", label: "Completado" },
  { value: "error", label: "Error" },
  { value: "running", label: "Procesando" },
  { value: "pending", label: "En cola" },
];

const TYPE_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "extraction", label: "Profesionales" },
  { value: "tdr", label: "Requisitos TDR" },
  { value: "full", label: "Análisis Completo" },
];

const PER_PAGE_OPTIONS = [10, 20, 50, 100];

// ── Page ─────────────────────────────────────────────────────────────────────
export default function HistorialPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Paginación
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce de search (350ms) para no saturar al backend al teclear
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Al cambiar filtros o buscar, volver a página 1
  useEffect(() => {
    setPage(1);
  }, [searchDebounced, statusFilter, typeFilter, perPage]);

  // ── Rerun modal ────────────────────────────────────────────────────────
  const [rerunTarget, setRerunTarget] = useState<Job | null>(null);
  const [rerunForceMotorOcr, setRerunForceMotorOcr] = useState(false);
  const [rerunSubmitting, setRerunSubmitting] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);

  const handleRerun = async () => {
    if (!rerunTarget) return;
    setRerunSubmitting(true);
    setRerunError(null);
    try {
      const fd = new FormData();
      if (rerunForceMotorOcr) fd.append("force_motor_ocr", "true");
      const res = await fetch(`/api/jobs/${rerunTarget.id}/rerun`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `HTTP ${res.status}`);
      }
      const { id } = await res.json();
      setRerunTarget(null);
      setRerunForceMotorOcr(false);
      router.push(`/jobs/${id}`);
    } catch (err) {
      setRerunError(err instanceof Error ? err.message : "Error al re-correr");
    } finally {
      setRerunSubmitting(false);
    }
  };

  // ── Fetch + poll ─────────────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", String(perPage));
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("job_type", typeFilter);
      if (searchDebounced.trim()) params.set("q", searchDebounced.trim());
      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // Compatibilidad: si el backend aun retorna array plano, adaptar
        if (Array.isArray(data)) {
          setJobs(data);
          setTotal(data.length);
          setTotalPages(1);
        } else {
          setJobs(data.items ?? []);
          setTotal(data.total ?? 0);
          setTotalPages(data.total_pages ?? 1);
        }
      }
    } catch {
      /* silently ignore network errors during polling */
    }
  }, [page, perPage, statusFilter, typeFilter, searchDebounced]);

  useEffect(() => {
    fetchJobs();
    const id = setInterval(fetchJobs, 10_000);
    return () => clearInterval(id);
  }, [fetchJobs]);

  // ── Delete handler ───────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/jobs/${deleteTarget}`, { method: "DELETE" });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== deleteTarget));
      }
    } catch {
      /* ignore */
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Los filtros y la búsqueda ya se aplican en el backend ────────────────
  // jobs contiene solo los items de la página actual post-filtro.
  const filtered = jobs;

  // ── Stats (de la página actual para los 2 de "Errores" / "Procesando") ──
  // total viene del backend y cuenta TODOS los jobs filtrados.
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

        {/* Type dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-[0.6875rem] font-bold uppercase tracking-wider text-outline">
            Tipo
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as FilterType)}
            className="bg-surface-container-low border border-outline/10 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary-fixed"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
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
                Tipo
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
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-on-surface-variant"
                >
                  {total === 0
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
                  <td
                    className="px-4 py-4 text-xs text-on-surface font-medium whitespace-nowrap"
                    title={job.created_at}
                  >
                    {formatFechaHumano(job.created_at)}
                  </td>

                  {/* Archivo */}
                  <td className="px-4 py-4">
                    <div className="text-xs font-bold text-primary truncate max-w-[260px]">
                      {job.filename}
                    </div>
                  </td>

                  {/* Tipo */}
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.625rem] font-bold ${
                        JOB_TYPE_BADGE[job.job_type || "extraction"]
                      }`}
                    >
                      <span className="material-symbols-outlined text-[0.75rem]">
                        {JOB_TYPE_ICON[job.job_type || "extraction"]}
                      </span>
                      {JOB_TYPE_LABEL[job.job_type || "extraction"]}
                    </span>
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
                    {job.source_job_id && (
                      <Link
                        href={`/jobs/${job.source_job_id}`}
                        title={`Re-run de ${job.source_job_id} — ver original`}
                      >
                        <span className="material-symbols-outlined text-fuchsia-600 text-lg hover:opacity-70 cursor-pointer align-middle">
                          replay
                        </span>
                      </Link>
                    )}
                    <Link href={`/jobs/${job.id}`}>
                      <span className="material-symbols-outlined text-primary text-lg hover:opacity-70 cursor-pointer align-middle">
                        visibility
                      </span>
                    </Link>
                    <button
                      onClick={() => {
                        setRerunTarget(job);
                        setRerunError(null);
                        setRerunForceMotorOcr(false);
                      }}
                      disabled={!job.pdf_available}
                      title={
                        job.pdf_available
                          ? "Re-correr pipeline sobre el mismo PDF"
                          : "PDF no disponible — no se puede re-correr"
                      }
                    >
                      <span
                        className={
                          "material-symbols-outlined text-lg align-middle " +
                          (job.pdf_available
                            ? "text-fuchsia-600 hover:opacity-70 cursor-pointer"
                            : "text-slate-300 cursor-not-allowed")
                        }
                      >
                        restart_alt
                      </span>
                    </button>
                    <button onClick={() => setDeleteTarget(job.id)}>
                      <span className="material-symbols-outlined text-error text-lg hover:opacity-70 align-middle">
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

      {/* ── Paginación ──────────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3 text-xs text-on-surface-variant">
          <span>
            Mostrando <strong>{filtered.length === 0 ? 0 : (page - 1) * perPage + 1}</strong>–
            <strong>{(page - 1) * perPage + filtered.length}</strong> de{" "}
            <strong>{total}</strong> resultados
          </span>
          <label className="flex items-center gap-2 ml-2">
            <span className="text-[0.6875rem] uppercase tracking-wider text-outline">Por página</span>
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="bg-surface-container-low border border-outline/10 rounded px-2 py-1 text-xs"
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(1)}
            disabled={page <= 1}
            className="p-1.5 rounded text-xs text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:pointer-events-none"
            title="Primera página"
          >
            <span className="material-symbols-outlined text-sm">first_page</span>
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1.5 rounded text-xs text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:pointer-events-none"
            title="Página anterior"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>

          {/* Números de página (ventana de 5) */}
          {(() => {
            const pages: number[] = [];
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const end = Math.min(totalPages, start + 4);
            for (let p = start; p <= end; p++) pages.push(p);
            return pages.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={
                  "min-w-[32px] px-2 py-1 rounded text-xs font-semibold " +
                  (p === page
                    ? "bg-primary text-white"
                    : "text-on-surface-variant hover:bg-surface-container-high")
                }
              >
                {p}
              </button>
            ));
          })()}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded text-xs text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:pointer-events-none"
            title="Página siguiente"
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
            className="p-1.5 rounded text-xs text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:pointer-events-none"
            title="Última página"
          >
            <span className="material-symbols-outlined text-sm">last_page</span>
          </button>
        </div>
      </div>

      {/* ── Bottom Stats Row ────────────────────────────────────────────── */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total */}
        <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/20 border-l-4 border-l-primary">
          <div className="text-[0.6875rem] font-bold uppercase tracking-wider text-outline mb-1">
            Total Resultados
          </div>
          <div className="text-3xl font-bold text-primary">{total}</div>
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
      {/* ── Delete confirmation modal ──────────────────────────────────── */}
      <ConfirmModal
        open={deleteTarget !== null}
        title="Eliminar trabajo"
        message="Esta acción eliminará el trabajo y todos sus archivos de resultado. No se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Rerun modal ────────────────────────────────────────────────── */}
      {rerunTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/20">
              <h3 className="text-base font-bold text-primary">Re-correr análisis</h3>
              <p className="text-[0.75rem] text-outline mt-1">
                Se clonará este job y se procesará el mismo PDF con el pipeline actual.
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-surface-container-low rounded-lg p-3">
                <p className="text-[0.6875rem] uppercase tracking-widest text-outline">Job original</p>
                <p className="font-mono text-sm font-bold text-primary mt-1">{rerunTarget.id}</p>
                <p className="text-xs text-on-surface-variant">{rerunTarget.filename}</p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rerunForceMotorOcr}
                  onChange={(e) => setRerunForceMotorOcr(e.target.checked)}
                  className="w-4 h-4 accent-fuchsia-600"
                />
                <span className="text-sm text-on-surface">
                  Forzar motor-OCR (desactivar fast-path pdfplumber)
                </span>
              </label>

              <div className="bg-secondary-container/20 border border-secondary-container/30 rounded-lg p-3">
                <p className="text-[0.75rem] leading-relaxed text-on-secondary-container">
                  El nuevo job usará el pipeline actual — incluye el fast-path pdfplumber
                  si el PDF es digital y chars/pág ≥ 200. Marca la casilla si quieres forzar el
                  procesamiento OCR completo.
                </p>
              </div>

              {rerunError && (
                <div className="bg-error-container/30 border border-error/20 rounded-lg p-3 text-[0.75rem] text-error font-medium">
                  ⚠ {rerunError}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-3 bg-surface-container-low border-t border-outline-variant/20">
              <button
                onClick={() => setRerunTarget(null)}
                disabled={rerunSubmitting}
                className="px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-high rounded-lg transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleRerun}
                disabled={rerunSubmitting}
                className="px-5 py-2 bg-fuchsia-600 text-white text-sm font-bold rounded-lg hover:bg-fuchsia-700 transition-colors disabled:opacity-40"
              >
                {rerunSubmitting ? "Enviando…" : "Re-correr"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PanelShell>
  );
}
