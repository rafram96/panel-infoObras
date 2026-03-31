"use client";

import { useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type JobStatus = "pending" | "running" | "done" | "error";

interface Job {
  id: string;
  filename: string;
  pages_from: number | null;
  pages_to: number | null;
  status: JobStatus;
  created_at: string;
}

interface Seccion {
  index: number;
  cargo: string;
  numero: string | null;
  total_pages: number;
}

interface JobDetail extends Job {
  result: {
    total_pages: number;
    pages_paddle: number;
    pages_qwen: number;
    pages_error: number;
    conf_promedio: number;
    tiempo_total: number;
    secciones: Seccion[];
  } | null;
  error: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<JobStatus, string> = {
  pending: "En cola",
  running: "Procesando…",
  done: "Listo",
  error: "Error",
};

const STATUS_COLOR: Record<JobStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  running: "bg-blue-100 text-blue-700",
  done: "bg-emerald-100 text-emerald-700",
  error: "bg-red-100 text-red-700",
};

function confColor(conf: number): string {
  if (conf >= 0.9) return "text-emerald-600";
  if (conf >= 0.75) return "text-amber-600";
  return "text-red-600";
}

function formatSeconds(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${Math.round(s % 60)}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pagesFrom, setPagesFrom] = useState("");
  const [pagesTo, setPagesTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDetail = async (id: string) => {
    const res = await fetch(`/api/jobs/${id}`);
    if (res.ok) setDetail(await res.json());
  };

  // Polling cada 5s: refresca lista y detalle si hay job activo
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const res = await fetch("/api/jobs");
      if (!res.ok || cancelled) return;
      const data: Job[] = await res.json();
      if (!cancelled) setJobs(data);

      if (!selectedId || cancelled) return;
      const job = data.find((j) => j.id === selectedId);
      if (!job) return;
      if (
        job.status === "pending" ||
        job.status === "running" ||
        job.status !== detail?.status
      ) {
        const dRes = await fetch(`/api/jobs/${selectedId}`);
        if (!cancelled && dRes.ok) setDetail(await dRes.json());
      }
    };

    tick();
    const interval = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, detail?.status]);

  const handleFileSelect = (f: File | undefined | null) => {
    if (f && f.name.toLowerCase().endsWith(".pdf")) setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || submitting) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (pagesFrom) form.append("pages_from", pagesFrom);
      if (pagesTo) form.append("pages_to", pagesTo);

      const res = await fetch("/api/jobs", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail ?? "Error al enviar el trabajo");
        return;
      }

      const { id } = await res.json();
      setFile(null);
      setPagesFrom("");
      setPagesTo("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSelectedId(id);
      await loadDetail(id);
    } finally {
      setSubmitting(false);
    }
  };

  const selectJob = (id: string) => {
    setSelectedId(id);
    loadDetail(id);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-lg font-bold text-slate-900">Panel InfoObras</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          OCR + segmentación de profesionales en propuestas técnicas
        </p>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* ── Upload form ─────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            Nuevo procesamiento
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) =>
                e.key === "Enter" && fileInputRef.current?.click()
              }
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFileSelect(e.dataTransfer.files[0]);
              }}
              className={[
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer",
                "transition-colors select-none outline-none",
                "focus-visible:ring-2 focus-visible:ring-blue-400",
                dragOver
                  ? "border-blue-400 bg-blue-50"
                  : "border-slate-300 hover:border-slate-400 bg-slate-50",
              ].join(" ")}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />
              {file ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-700">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Arrastra un PDF aquí o{" "}
                  <span className="text-blue-600 font-medium">
                    selecciona un archivo
                  </span>
                </p>
              )}
            </div>

            {/* Page range */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 w-32 shrink-0">
                Páginas (opcional)
              </span>
              <input
                type="number"
                min={1}
                placeholder="desde"
                value={pagesFrom}
                onChange={(e) => setPagesFrom(e.target.value)}
                className="w-20 border border-slate-300 rounded-lg px-2.5 py-1.5
                           focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <span className="text-slate-300">–</span>
              <input
                type="number"
                min={1}
                placeholder="hasta"
                value={pagesTo}
                onChange={(e) => setPagesTo(e.target.value)}
                className="w-20 border border-slate-300 rounded-lg px-2.5 py-1.5
                           focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <span className="text-xs text-slate-400">(base 1)</span>
            </div>

            <button
              type="submit"
              disabled={!file || submitting}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold
                         hover:bg-blue-700 active:scale-[0.99] transition
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Enviando…" : "Procesar PDF"}
            </button>
          </form>
        </section>

        {/* ── Job detail ──────────────────────────────────────────────────── */}
        {detail && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {detail.filename}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {detail.pages_from && detail.pages_to
                    ? `pp. ${detail.pages_from}–${detail.pages_to} · `
                    : "Todas las páginas · "}
                  {detail.created_at}
                </p>
              </div>
              <span
                className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOR[detail.status]}`}
              >
                {STATUS_LABEL[detail.status]}
              </span>
            </div>

            {/* Spinner */}
            {(detail.status === "pending" || detail.status === "running") && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <svg
                  className="animate-spin h-4 w-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Procesando… se actualiza cada 5 segundos
              </div>
            )}

            {/* Error */}
            {detail.status === "error" && (
              <pre className="text-xs text-red-600 bg-red-50 rounded-lg p-3 overflow-auto whitespace-pre-wrap">
                {detail.error}
              </pre>
            )}

            {/* Resultado */}
            {detail.result && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "Páginas OCR", value: detail.result.total_pages },
                    {
                      label: "Profesionales",
                      value: detail.result.secciones.length,
                    },
                    {
                      label: "Tiempo total",
                      value: formatSeconds(detail.result.tiempo_total),
                    },
                    {
                      label: "Confianza",
                      value: `${(detail.result.conf_promedio * 100).toFixed(0)}%`,
                      className: confColor(detail.result.conf_promedio),
                    },
                  ].map(({ label, value, className }) => (
                    <div
                      key={label}
                      className="bg-slate-50 rounded-xl p-3 text-center"
                    >
                      <div
                        className={`text-xl font-bold text-slate-900 ${className ?? ""}`}
                      >
                        {value}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Detalle engines */}
                <p className="text-xs text-slate-400">
                  Paddle: {detail.result.pages_paddle} págs · Qwen:{" "}
                  {detail.result.pages_qwen} págs
                  {detail.result.pages_error > 0 && (
                    <span className="text-red-400">
                      {" "}
                      · Errores: {detail.result.pages_error}
                    </span>
                  )}
                </p>

                {/* Tabla de profesionales */}
                {detail.result.secciones.length > 0 ? (
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                          <th className="pb-2 px-1 font-medium">#</th>
                          <th className="pb-2 px-1 font-medium">Cargo</th>
                          <th className="pb-2 px-1 font-medium text-center">
                            N°
                          </th>
                          <th className="pb-2 px-1 font-medium text-center">
                            Págs
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.result.secciones.map((s) => (
                          <tr
                            key={s.index}
                            className="border-b border-slate-50 hover:bg-slate-50"
                          >
                            <td className="py-2 px-1 text-slate-400 tabular-nums">
                              {s.index}
                            </td>
                            <td className="py-2 px-1 font-medium text-slate-800">
                              {s.cargo}
                            </td>
                            <td className="py-2 px-1 text-center text-slate-500">
                              {s.numero ?? "—"}
                            </td>
                            <td className="py-2 px-1 text-center tabular-nums text-slate-500">
                              {s.total_pages}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6">
                    No se encontraron secciones de profesionales
                  </p>
                )}
              </>
            )}
          </section>
        )}

        {/* ── Historial ───────────────────────────────────────────────────── */}
        {jobs.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">
                Historial
              </h2>
            </div>
            <ul>
              {jobs.map((job) => (
                <li
                  key={job.id}
                  onClick={() => selectJob(job.id)}
                  className={[
                    "flex items-center gap-3 px-5 py-3 cursor-pointer",
                    "border-b border-slate-50 last:border-0",
                    "hover:bg-slate-50 transition-colors",
                    selectedId === job.id ? "bg-blue-50" : "",
                  ].join(" ")}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {job.filename}
                    </p>
                    <p className="text-xs text-slate-400">
                      {job.pages_from && job.pages_to
                        ? `pp. ${job.pages_from}–${job.pages_to} · `
                        : ""}
                      {job.created_at}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[job.status]}`}
                  >
                    {STATUS_LABEL[job.status]}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
