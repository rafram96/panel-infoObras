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
  progress_pct: number;
}

interface Bloque {
  start: number;
  end: number;
}

interface Seccion {
  index: number;
  cargo: string;
  cargo_raw: string;
  numero: string | null;
  total_pages: number;
  page_numbers: number[];
  bloques: Bloque[];
  es_tipo_b: boolean;
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
  progress_stage: string | null;
  doc_total_pages: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<JobStatus, string> = {
  pending: "En cola",
  running: "Procesando",
  done: "Completado",
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

/** Compress [1,2,3,5,6,8] → "1–3, 5–6, 8" */
function compressPages(pages: number[]): string {
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

function bloqueLabel(b: Bloque): string {
  return b.start === b.end ? `p. ${b.start}` : `pp. ${b.start}–${b.end}`;
}

// ── Elapsed timer hook ───────────────────────────────────────────────────────
function useElapsed(createdAt: string | null, active: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!createdAt || !active) {
      setElapsed(0);
      return;
    }
    const start = new Date(createdAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt, active]);
  return elapsed;
}

// ── Page map mini visualization ──────────────────────────────────────────────
function PageMap({
  section,
  totalDocPages,
}: {
  section: Seccion;
  totalDocPages: number;
}) {
  if (!totalDocPages || !section.page_numbers.length) return null;
  const pageSet = new Set(section.page_numbers);
  // Render a compact bar showing where this section's pages are in the document
  const barWidth = 200;
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 bg-slate-100 rounded-full overflow-hidden flex-shrink-0"
        style={{ width: barWidth }}
        title={`Páginas ${compressPages(section.page_numbers)} de ${totalDocPages}`}
      >
        {section.bloques.length > 0
          ? section.bloques.map((b, i) => {
              const left = ((b.start - 1) / totalDocPages) * 100;
              const width =
                ((b.end - b.start + 1) / totalDocPages) * 100;
              return (
                <div
                  key={i}
                  className="h-full bg-blue-500 absolute rounded-sm"
                  style={{
                    left: `${left}%`,
                    width: `${Math.max(width, 0.8)}%`,
                  }}
                />
              );
            })
          : section.page_numbers.map((p) => {
              const left = ((p - 1) / totalDocPages) * 100;
              return (
                <div
                  key={p}
                  className="h-full bg-blue-500 absolute rounded-sm"
                  style={{
                    left: `${left}%`,
                    width: `${Math.max(100 / totalDocPages, 0.8)}%`,
                  }}
                />
              );
            })}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(),
  );

  const [file, setFile] = useState<File | null>(null);
  const [pagesFrom, setPagesFrom] = useState("");
  const [pagesTo, setPagesTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isActive =
    detail?.status === "pending" || detail?.status === "running";
  const elapsed = useElapsed(detail?.created_at ?? null, isActive);

  const loadDetail = async (id: string) => {
    const res = await fetch(`/api/jobs/${id}`);
    if (res.ok) {
      setDetail(await res.json());
      setExpandedSections(new Set());
    }
  };

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Polling: 3s if active, 10s otherwise
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
    const ms = isActive ? 3000 : 10000;
    const interval = setInterval(tick, ms);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, detail?.status, isActive]);

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

  const pct = detail?.progress_pct ?? 0;
  const totalDocPages = detail?.result?.total_pages ?? detail?.doc_total_pages ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">
              Panel InfoObras
            </h1>
            <p className="text-[11px] text-slate-400 leading-tight">
              OCR + segmentación de profesionales
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* ── Upload form ─────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            Nuevo procesamiento
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
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
                "transition-all select-none outline-none",
                "focus-visible:ring-2 focus-visible:ring-blue-400",
                dragOver
                  ? "border-blue-400 bg-blue-50 scale-[1.01]"
                  : "border-slate-300 hover:border-slate-400 bg-slate-50/50",
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
                  <svg
                    className="w-8 h-8 mx-auto text-blue-500 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-slate-700">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <svg
                    className="w-8 h-8 mx-auto text-slate-300 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                  <p className="text-sm text-slate-500">
                    Arrastra un PDF aquí o{" "}
                    <span className="text-blue-600 font-medium">
                      selecciona un archivo
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Documentos de hasta 400+ páginas
                  </p>
                </div>
              )}
            </div>

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
                           focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
              />
              <span className="text-slate-300">–</span>
              <input
                type="number"
                min={1}
                placeholder="hasta"
                value={pagesTo}
                onChange={(e) => setPagesTo(e.target.value)}
                className="w-20 border border-slate-300 rounded-lg px-2.5 py-1.5
                           focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
              />
              <span className="text-[11px] text-slate-400">(base 1)</span>
            </div>

            <button
              type="submit"
              disabled={!file || submitting}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold
                         hover:bg-blue-700 active:scale-[0.995] transition-all
                         disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-blue-200"
            >
              {submitting ? "Enviando…" : "Procesar PDF"}
            </button>
          </form>
        </section>

        {/* ── Job detail ──────────────────────────────────────────────────── */}
        {detail && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="px-6 py-4 flex items-start justify-between gap-3 border-b border-slate-100">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {detail.filename}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {detail.pages_from && detail.pages_to
                    ? `pp. ${detail.pages_from}–${detail.pages_to}`
                    : "Todas las páginas"}
                  {totalDocPages > 0 && ` · ${totalDocPages} págs detectadas`}
                  {" · "}
                  {detail.created_at}
                </p>
              </div>
              <span
                className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[detail.status]}`}
              >
                {STATUS_LABEL[detail.status]}
              </span>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* ── Progress bar ──────────────────────────────────────────── */}
              {isActive && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">
                        {detail.progress_stage ?? "Iniciando…"}
                      </span>
                      <span className="tabular-nums font-semibold text-slate-700">
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out
                                   bg-gradient-to-r from-blue-500 via-blue-500 to-blue-400
                                   relative overflow-hidden"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      >
                        <div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent
                                     animate-[shimmer_2s_infinite]"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {formatSeconds(elapsed)} transcurrido
                    </span>
                    <span className="text-slate-300">|</span>
                    <span>Se actualiza cada 3s</span>
                  </div>
                </div>
              )}

              {/* ── Error ────────────────────────────────────────────────── */}
              {detail.status === "error" && (
                <div className="flex items-start gap-3 bg-red-50 rounded-xl p-4">
                  <svg
                    className="w-5 h-5 text-red-400 shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                  <pre className="text-xs text-red-600 overflow-auto whitespace-pre-wrap flex-1">
                    {detail.error}
                  </pre>
                </div>
              )}

              {/* ── Resultado ────────────────────────────────────────────── */}
              {detail.result && (
                <>
                  {/* Stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      {
                        label: "Páginas",
                        value: detail.result.total_pages,
                        icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
                      },
                      {
                        label: "Profesionales",
                        value: detail.result.secciones.length,
                        icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
                      },
                      {
                        label: "Tiempo",
                        value: formatSeconds(detail.result.tiempo_total),
                        icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
                      },
                      {
                        label: "Confianza",
                        value: `${(detail.result.conf_promedio * 100).toFixed(0)}%`,
                        icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
                        extraClass: confColor(detail.result.conf_promedio),
                      },
                    ].map(({ label, value, icon, extraClass }) => (
                      <div
                        key={label}
                        className="bg-slate-50/80 rounded-xl p-3 text-center"
                      >
                        <svg
                          className="w-4 h-4 mx-auto text-slate-300 mb-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d={icon}
                          />
                        </svg>
                        <div
                          className={`text-lg font-bold text-slate-900 ${extraClass ?? ""}`}
                        >
                          {value}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Engine detail */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
                    <span className="inline-flex items-center gap-1 bg-slate-100 rounded-md px-2 py-0.5">
                      PaddleOCR: {detail.result.pages_paddle}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-slate-100 rounded-md px-2 py-0.5">
                      Qwen: {detail.result.pages_qwen}
                    </span>
                    {detail.result.pages_error > 0 && (
                      <span className="inline-flex items-center gap-1 bg-red-50 text-red-500 rounded-md px-2 py-0.5">
                        Errores: {detail.result.pages_error}
                      </span>
                    )}
                  </div>

                  {/* ── Professionals list ────────────────────────────────── */}
                  {detail.result.secciones.length > 0 ? (
                    <div className="space-y-0 border border-slate-100 rounded-xl overflow-hidden">
                      {/* Table header */}
                      <div className="grid grid-cols-[2rem_1fr_3rem_4rem_10rem] gap-2 px-4 py-2.5
                                      bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold
                                      border-b border-slate-100">
                        <span>#</span>
                        <span>Cargo</span>
                        <span className="text-center">N°</span>
                        <span className="text-center">Págs</span>
                        <span>Ubicación en PDF</span>
                      </div>

                      {/* Rows */}
                      {detail.result.secciones.map((s, i) => {
                        const isExpanded = expandedSections.has(s.index);
                        return (
                          <div
                            key={s.index}
                            className={`border-b border-slate-50 last:border-0 ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}
                          >
                            {/* Main row */}
                            <div
                              onClick={() => toggleSection(s.index)}
                              className="grid grid-cols-[2rem_1fr_3rem_4rem_10rem] gap-2 px-4 py-2.5
                                         items-center cursor-pointer hover:bg-blue-50/40 transition-colors"
                            >
                              <span className="text-xs text-slate-400 tabular-nums">
                                {s.index}
                              </span>
                              <div className="min-w-0">
                                <span className="text-sm font-medium text-slate-800 truncate block">
                                  {s.cargo}
                                </span>
                                {s.cargo_raw &&
                                  s.cargo_raw !== s.cargo && (
                                    <span className="text-[10px] text-slate-400 truncate block">
                                      {s.cargo_raw}
                                    </span>
                                  )}
                              </div>
                              <span className="text-sm text-center text-slate-500">
                                {s.numero ?? "—"}
                              </span>
                              <span className="text-sm text-center tabular-nums text-slate-500">
                                {s.total_pages}
                              </span>
                              {/* Mini page map */}
                              <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                {s.bloques.length > 0
                                  ? s.bloques.map((b, bi) => {
                                      const left =
                                        ((b.start - 1) / totalDocPages) * 100;
                                      const width =
                                        ((b.end - b.start + 1) /
                                          totalDocPages) *
                                        100;
                                      return (
                                        <div
                                          key={bi}
                                          className={`absolute h-full rounded-sm ${
                                            s.es_tipo_b
                                              ? "bg-violet-400"
                                              : "bg-blue-400"
                                          }`}
                                          style={{
                                            left: `${left}%`,
                                            width: `${Math.max(width, 1)}%`,
                                          }}
                                        />
                                      );
                                    })
                                  : s.page_numbers.length > 0 && (
                                      <div
                                        className="absolute h-full bg-blue-400 rounded-sm"
                                        style={{
                                          left: `${((Math.min(...s.page_numbers) - 1) / totalDocPages) * 100}%`,
                                          width: `${Math.max(((Math.max(...s.page_numbers) - Math.min(...s.page_numbers) + 1) / totalDocPages) * 100, 1)}%`,
                                        }}
                                      />
                                    )}
                              </div>
                            </div>

                            {/* Expanded detail */}
                            {isExpanded && (
                              <div className="px-4 pb-3 pt-0 ml-8 space-y-2 animate-[fadeIn_150ms_ease-out]">
                                {/* Page numbers */}
                                {s.page_numbers.length > 0 && (
                                  <div className="text-xs text-slate-500">
                                    <span className="font-medium text-slate-600">
                                      Páginas:{" "}
                                    </span>
                                    {compressPages(s.page_numbers)}
                                  </div>
                                )}

                                {/* Bloques */}
                                {s.bloques.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {s.bloques.map((b, bi) => (
                                      <span
                                        key={bi}
                                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md
                                          ${
                                            s.es_tipo_b
                                              ? "bg-violet-50 text-violet-600"
                                              : "bg-blue-50 text-blue-600"
                                          }`}
                                      >
                                        <svg
                                          className="w-3 h-3"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                          strokeWidth={2}
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                                          />
                                        </svg>
                                        Bloque {bi + 1}: {bloqueLabel(b)}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Tipo B indicator */}
                                {s.es_tipo_b && (
                                  <p className="text-[11px] text-violet-500">
                                    Tipo B — páginas distribuidas en{" "}
                                    {s.bloques.length} bloques del documento
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-6">
                      No se encontraron secciones de profesionales
                    </p>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* ── Historial ───────────────────────────────────────────────────── */}
        {jobs.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">
                Historial
              </h2>
              <span className="text-[11px] text-slate-400">
                {jobs.length} trabajo{jobs.length !== 1 && "s"}
              </span>
            </div>
            <ul>
              {jobs.map((job) => (
                <li
                  key={job.id}
                  onClick={() => selectJob(job.id)}
                  className={[
                    "flex items-center gap-3 px-6 py-3 cursor-pointer",
                    "border-b border-slate-50 last:border-0",
                    "hover:bg-slate-50 transition-colors",
                    selectedId === job.id ? "bg-blue-50/60" : "",
                  ].join(" ")}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {job.filename}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px] text-slate-400">
                        {job.pages_from && job.pages_to
                          ? `pp. ${job.pages_from}–${job.pages_to} · `
                          : ""}
                        {job.created_at}
                      </p>
                      {(job.status === "running" ||
                        job.status === "pending") && (
                        <div className="w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(job.progress_pct, 3)}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${STATUS_COLOR[job.status]}`}
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
