"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import PanelShell from "@/components/PanelShell";
import PdfDropzone from "@/components/PdfDropzone";
import type { JobDetail, ExtractionResult } from "@/lib/types";
import { formatSeconds } from "@/lib/helpers";

// ── Tipos locales ────────────────────────────────────────────────────────────
interface JobFile {
  name: string;
  rel_path: string;
  size_bytes: number;
  modified_at: string;
}

type LogLevel = "info" | "decision" | "warn" | "error" | "stage";

interface LogLine {
  ts: string;
  text: string;
  level: LogLevel;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function classifyLog(line: string): LogLevel {
  const l = line.toLowerCase();
  if (l.includes("error")) return "error";
  if (l.includes("fallback") || l.includes("warn") || l.includes("timeout")) return "warn";
  if (l.includes("fast-path") || l.includes("pdf digital") || l.includes("pdf escaneado") ||
      l.includes("forzando motor-ocr") || l.includes("muestra primeras")) return "decision";
  if (l.startsWith("fase") || l.includes("iniciando") || l.includes("completado") ||
      l.includes("invocando wrapper")) return "stage";
  return "info";
}

function parseLogs(raw: string | null | undefined): LogLine[] {
  if (!raw) return [];
  const out: LogLine[] = [];
  const re = /^\[(\d{2}:\d{2}:\d{2})\]\s*(.*)$/;
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const m = line.match(re);
    if (m) {
      out.push({ ts: m[1], text: m[2], level: classifyLog(m[2]) });
    } else {
      out.push({ ts: "", text: line, level: classifyLog(line) });
    }
  }
  return out;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function LOG_COLOR(level: LogLevel): string {
  switch (level) {
    case "error": return "text-red-400";
    case "warn": return "text-amber-300";
    case "decision": return "text-fuchsia-300 font-semibold";
    case "stage": return "text-cyan-300 font-semibold";
    default: return "text-slate-200";
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function DebugPdfplumberPage() {
  // Form
  const [file, setFile] = useState<File | null>(null);
  const [pagesFrom, setPagesFrom] = useState("");
  const [pagesTo, setPagesTo] = useState("");
  const [forceMotorOcr, setForceMotorOcr] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Job tracking
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobIdInput, setJobIdInput] = useState("");
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [files, setFiles] = useState<JobFile[]>([]);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-scroll terminal
  const terminalRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Derived
  const logs = useMemo(() => parseLogs(detail?.logs), [detail?.logs]);
  const result = detail?.result as ExtractionResult | null | undefined;
  const isActive = detail?.status === "pending" || detail?.status === "running";
  const isDone = detail?.status === "done";
  const engine = (result?.engine as string | undefined) ?? "—";

  // Poll job detail
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d: JobDetail = await res.json();
        if (!cancelled) setDetail(d);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      }
    };

    fetchDetail();
    const interval = setInterval(fetchDetail, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [jobId]);

  // Stop polling once done
  useEffect(() => {
    if (!detail || isActive) return;
    // Fetch files cuando el job termine
    if (jobId && isDone) {
      fetch(`/api/jobs/${jobId}/files`)
        .then((r) => r.json())
        .then((data) => setFiles(data.files ?? []))
        .catch(() => setFiles([]));
    }
  }, [detail?.status, jobId, isDone, isActive]);

  // Auto-scroll terminal
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    setError(null);
    setDetail(null);
    setFiles([]);
    setJobId(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("job_type", "extraction");
      if (pagesFrom) fd.append("pages_from", pagesFrom);
      if (pagesTo) fd.append("pages_to", pagesTo);
      if (forceMotorOcr) fd.append("force_motor_ocr", "true");

      const res = await fetch("/api/jobs", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `HTTP ${res.status}`);
      }
      const { id } = await res.json();
      setJobId(id);
      setJobIdInput(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el job");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadExisting = (e: FormEvent) => {
    e.preventDefault();
    const id = jobIdInput.trim();
    if (!id) return;
    setJobId(id);
    setDetail(null);
    setFiles([]);
    setError(null);
  };

  const handleViewFile = async (relPath: string) => {
    if (!jobId) return;
    setViewingFile(relPath);
    setFileLoading(true);
    setFileContent("");
    try {
      const res = await fetch(`/api/jobs/${jobId}/files/${encodeURIComponent(relPath)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFileContent(await res.text());
    } catch (e) {
      setFileContent(`⚠ Error leyendo archivo: ${e instanceof Error ? e.message : "desconocido"}`);
    } finally {
      setFileLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
  };

  const handleDownloadLogs = () => {
    if (!detail?.logs) return;
    const blob = new Blob([detail.logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-${jobId}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <PanelShell title="Debug pdfplumber fast-path" subtitle="Herramientas · Diagnóstico">
      <div className="max-w-[1400px] mx-auto p-6 lg:p-10">
        {/* Header */}
        <div className="mb-8 border-l-4 border-fuchsia-500 pl-6">
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.15rem] text-fuchsia-600">
            Herramienta de Diagnóstico
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-primary mt-1">
            Debug pdfplumber fast-path
          </h2>
          <p className="text-on-surface-variant text-sm mt-2 max-w-3xl">
            Visor de consola completo para analizar el pipeline OCR. Muestra decisión de mode
            (pdfplumber vs motor-OCR), logs en tiempo real, archivos <code>.md</code> generados,
            secciones detectadas y el JSON crudo del wrapper.
          </p>
        </div>

        {/* ── Form superior ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Subir nuevo */}
          <form
            onSubmit={handleSubmit}
            className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/10 shadow-ambient"
          >
            <h3 className="text-[0.75rem] font-bold uppercase tracking-wider text-primary mb-4">
              Subir PDF para debug
            </h3>
            <PdfDropzone
              label="Propuesta"
              hint="PDF escaneado o digital"
              icon="bug_report"
              file={file}
              onFile={setFile}
            />

            <div className="grid grid-cols-2 gap-3 mt-4">
              <input
                type="number"
                min={1}
                value={pagesFrom}
                onChange={(e) => setPagesFrom(e.target.value)}
                placeholder="pages_from"
                className="bg-surface-container-low border-0 text-sm p-2 rounded-lg"
              />
              <input
                type="number"
                min={1}
                value={pagesTo}
                onChange={(e) => setPagesTo(e.target.value)}
                placeholder="pages_to"
                className="bg-surface-container-low border-0 text-sm p-2 rounded-lg"
              />
            </div>

            <label className="flex items-center gap-3 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={forceMotorOcr}
                onChange={(e) => setForceMotorOcr(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-on-surface">
                Forzar motor-OCR (desactiva fast-path)
              </span>
            </label>

            <button
              type="submit"
              disabled={!file || submitting}
              className="w-full mt-5 px-6 py-3 bg-fuchsia-600 text-white rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-fuchsia-700 transition-all disabled:opacity-40"
            >
              {submitting ? "Enviando…" : "Lanzar job de debug"}
            </button>
          </form>

          {/* Cargar existente */}
          <form
            onSubmit={handleLoadExisting}
            className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/10 shadow-ambient"
          >
            <h3 className="text-[0.75rem] font-bold uppercase tracking-wider text-primary mb-4">
              Analizar job existente
            </h3>
            <p className="text-[0.75rem] text-outline mb-3">
              Si ya existe un job (ver /historial) pega el ID aquí para revisar sus logs, archivos y resultado.
            </p>
            <input
              type="text"
              value={jobIdInput}
              onChange={(e) => setJobIdInput(e.target.value)}
              placeholder="job_id (ej: a3f9b2c1)"
              className="w-full bg-surface-container-low border-0 text-sm p-3 rounded-lg font-mono"
            />
            <button
              type="submit"
              disabled={!jobIdInput.trim()}
              className="w-full mt-4 px-6 py-3 bg-primary text-white rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-primary/90 transition-all disabled:opacity-40"
            >
              Cargar job
            </button>
            {error && (
              <p className="mt-3 text-[0.75rem] text-red-600">⚠ {error}</p>
            )}
          </form>
        </div>

        {/* ── Stats del job actual ────────────────────────────────── */}
        {detail && (
          <>
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/10 shadow-ambient mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-slate-500">
                    Job actual
                  </p>
                  <h3 className="font-mono text-lg font-bold text-primary">{jobId}</h3>
                  <p className="text-[0.75rem] text-outline">{detail.filename}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      "inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full " +
                      (detail.status === "done"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : detail.status === "error"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : detail.status === "running"
                        ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                        : "bg-slate-100 text-slate-600")
                    }
                  >
                    {detail.status}
                  </span>
                  {isActive && (
                    <span className="text-sm font-mono text-primary">
                      {detail.progress_pct ?? 0}% · {detail.progress_stage ?? "…"}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatBadge label="Engine" value={engine} highlight={engine === "pdfplumber"} />
                <StatBadge label="Total págs" value={String(result?.total_pages ?? "—")} />
                <StatBadge label="pdfplumber" value={String(result?.pages_pdfplumber ?? 0)} />
                <StatBadge label="PaddleOCR" value={String(result?.pages_paddle ?? 0)} />
                <StatBadge label="Qwen-VL" value={String(result?.pages_qwen ?? 0)} />
                <StatBadge
                  label="Tiempo"
                  value={result?.tiempo_total ? formatSeconds(result.tiempo_total) : "—"}
                />
                <StatBadge label="Secciones" value={String(result?.secciones?.length ?? 0)} />
                <StatBadge label="Errores OCR" value={String(result?.pages_error ?? 0)} />
                <StatBadge
                  label="Confianza"
                  value={
                    result?.conf_promedio !== undefined
                      ? `${(result.conf_promedio * 100).toFixed(0)}%`
                      : "—"
                  }
                />
              </div>
            </div>

            {/* ── Consola terminal ─────────────────────────────────── */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-ambient mb-6 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-fuchsia-400 text-sm">terminal</span>
                  <span className="text-[0.75rem] font-bold uppercase tracking-wider text-slate-300">
                    Consola · {logs.length} líneas
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      className="w-3 h-3 accent-fuchsia-500"
                    />
                    Auto-scroll
                  </label>
                  <button
                    onClick={handleDownloadLogs}
                    disabled={!detail.logs}
                    className="text-xs text-slate-300 hover:text-fuchsia-300 disabled:opacity-40 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    Descargar
                  </button>
                </div>
              </div>
              <div
                ref={terminalRef}
                className="h-[420px] overflow-y-auto font-mono text-[0.75rem] leading-relaxed p-4 bg-slate-950"
              >
                {logs.length === 0 ? (
                  <p className="text-slate-500 italic">
                    {isActive ? "Esperando logs…" : "No hay logs aún."}
                  </p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex gap-3 py-0.5 hover:bg-slate-900/50">
                      <span className="text-slate-500 shrink-0 w-20">
                        {log.ts ? `[${log.ts}]` : ""}
                      </span>
                      <span className={`flex-1 whitespace-pre-wrap break-all ${LOG_COLOR(log.level)}`}>
                        {log.text}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ── Archivos generados ────────────────────────────────── */}
            {files.length > 0 && (
              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/10 shadow-ambient mb-6">
                <h3 className="text-[0.75rem] font-bold uppercase tracking-wider text-primary mb-3">
                  Archivos .md generados ({files.length})
                </h3>
                <div className="divide-y divide-outline-variant/10">
                  {files.map((f) => (
                    <button
                      key={f.rel_path}
                      onClick={() => handleViewFile(f.rel_path)}
                      className="w-full flex items-center justify-between py-2 hover:bg-surface-container-high px-2 rounded transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-fuchsia-500 text-base">
                          description
                        </span>
                        <code className="text-xs font-mono text-on-surface">{f.rel_path}</code>
                      </div>
                      <span className="text-[0.6875rem] text-outline font-mono">
                        {formatBytes(f.size_bytes)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Viewer de archivo ──────────────────────────────── */}
            {viewingFile && (
              <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-ambient mb-6 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                  <code className="text-[0.75rem] text-fuchsia-300 font-mono">{viewingFile}</code>
                  <button
                    onClick={() => setViewingFile(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    ✕ cerrar
                  </button>
                </div>
                <pre className="h-[500px] overflow-auto font-mono text-[0.75rem] leading-relaxed p-4 bg-slate-950 text-slate-200 whitespace-pre-wrap break-all">
                  {fileLoading ? "Cargando…" : fileContent}
                </pre>
              </div>
            )}

            {/* ── Secciones detectadas ──────────────────────────── */}
            {result?.secciones && result.secciones.length > 0 && (
              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/10 shadow-ambient mb-6 overflow-x-auto">
                <h3 className="text-[0.75rem] font-bold uppercase tracking-wider text-primary mb-3">
                  Secciones detectadas ({result.secciones.length})
                </h3>
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-high">
                    <tr>
                      {["#", "Cargo", "N°", "Páginas", "Pág. inicio", "Bloques", "Tipo B"].map((h) => (
                        <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {result.secciones.map((sec) => (
                      <tr key={sec.index}>
                        <td className="px-3 py-2 font-mono">{sec.index}</td>
                        <td className="px-3 py-2 font-medium">{sec.cargo}</td>
                        <td className="px-3 py-2 text-center">{sec.numero ?? "—"}</td>
                        <td className="px-3 py-2 font-mono text-xs">{sec.total_pages}</td>
                        <td className="px-3 py-2 font-mono text-xs">{sec.page_numbers?.[0] ?? "—"}</td>
                        <td className="px-3 py-2 font-mono text-[0.6875rem] text-outline">
                          {sec.bloques?.map((b) => `${b.start}–${b.end}`).join(" · ") || "—"}
                        </td>
                        <td className="px-3 py-2">
                          {sec.es_tipo_b ? (
                            <span className="inline-block w-2 h-2 rounded-full bg-fuchsia-500" />
                          ) : (
                            <span className="inline-block w-2 h-2 rounded-full bg-slate-300" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Raw JSON ─────────────────────────────────────────── */}
            {result && (
              <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-ambient mb-6 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                  <span className="text-[0.75rem] font-bold uppercase tracking-wider text-slate-300">
                    Raw result JSON
                  </span>
                  <button
                    onClick={handleCopyJson}
                    className="text-xs text-slate-300 hover:text-fuchsia-300 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    Copiar
                  </button>
                </div>
                <pre className="max-h-[500px] overflow-auto font-mono text-[0.75rem] leading-relaxed p-4 bg-slate-950 text-emerald-300">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}

        {!detail && (
          <div className="bg-surface-container-lowest p-12 rounded-xl border border-dashed border-outline-variant/30 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-300">terminal</span>
            <p className="text-on-surface-variant text-sm mt-4">
              Sube un PDF o pega un job ID existente para empezar a debuggear.
            </p>
          </div>
        )}
      </div>
    </PanelShell>
  );
}

// ── Sub-componente ──────────────────────────────────────────────────────────
function StatBadge({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg p-3 " +
        (highlight
          ? "bg-fuchsia-50 border border-fuchsia-200"
          : "bg-surface-container-low border border-outline-variant/10")
      }
    >
      <p className="text-[0.625rem] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={"text-sm font-bold font-mono mt-1 " + (highlight ? "text-fuchsia-700" : "text-on-surface")}>
        {value}
      </p>
    </div>
  );
}
