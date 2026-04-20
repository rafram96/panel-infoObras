"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import PanelShell from "@/components/PanelShell";
import PdfDropzone from "@/components/PdfDropzone";
import type { JobDetail, ExtractionResult, TdrResult } from "@/lib/types";
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
  if (l.includes("fallback") || l.includes("warn") || l.includes("timeout") ||
      l.includes("insuficiente") || l.includes("escaneado")) return "warn";
  if (l.includes("fast-path") || l.includes("pdf digital") ||
      l.includes("forzando motor-ocr") || l.includes("muestra primeras") ||
      l.includes("chars/pág") || l.includes("pdfplumber:")) return "decision";
  if (l.startsWith("fase") || l.includes("iniciando") || l.includes("completado") ||
      l.includes("invocando wrapper") || l.includes("extracción llm") ||
      l.includes("llamando a extraer_bases")) return "stage";
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

type DebugJobType = "extraction" | "tdr";

// ── Page ─────────────────────────────────────────────────────────────────────
export default function DebugPdfplumberPage() {
  // Form
  const [jobType, setJobType] = useState<DebugJobType>("extraction");
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
  const detailJobType = (detail?.job_type as DebugJobType | undefined) ?? jobType;
  const isTdr = detailJobType === "tdr";
  const resultExtraction = !isTdr
    ? (detail?.result as ExtractionResult | null | undefined)
    : undefined;
  const resultTdr = isTdr
    ? (detail?.result as TdrResult | null | undefined)
    : undefined;
  const isActive = detail?.status === "pending" || detail?.status === "running";
  const isDone = detail?.status === "done";
  const engine = (resultExtraction?.engine as string | undefined) ?? "—";

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
      fd.append("job_type", jobType);
      if (pagesFrom) fd.append("pages_from", pagesFrom);
      if (pagesTo) fd.append("pages_to", pagesTo);
      if (forceMotorOcr && jobType === "extraction") fd.append("force_motor_ocr", "true");

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
    const payload = resultExtraction ?? resultTdr;
    if (!payload) return;
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  };

  const handleDownloadLogs = async () => {
    if (!jobId) return;
    // Preferir el archivo dedicado (logs completos incluyendo librerias).
    // Si no existe, caer al campo DB (hitos resumidos).
    try {
      const res = await fetch(`/api/jobs/${jobId}/log`);
      if (res.ok) {
        const txt = await res.text();
        const blob = new Blob([txt], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `job-${jobId}.log`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      /* fallback a detail.logs */
    }
    if (detail?.logs) {
      const blob = new Blob([detail.logs], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `job-${jobId}-logs.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <PanelShell title="Debug pdfplumber fast-path" subtitle="Herramientas · Diagnóstico">
      <div className="max-w-[1400px] mx-auto p-6 lg:p-10">
        {/* Header */}
        <div className="mb-6 border-l-4 border-fuchsia-500 pl-6">
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.15rem] text-fuchsia-600">
            Herramienta de Diagnóstico
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-primary mt-1">
            Debug pdfplumber fast-path
          </h2>
          <p className="text-on-surface-variant text-sm mt-2 max-w-3xl">
            Visor de consola completo para analizar el pipeline OCR sobre jobs de
            Profesionales (propuesta técnica) y TDR (bases del concurso). Logs en
            tiempo real, decisión de mode, archivos generados y resultado crudo.
          </p>
        </div>

        {/* ── Panel explicativo (fast-path) ───────────────────────────── */}
        <details className="mb-6 bg-fuchsia-50/40 border border-fuchsia-200 rounded-xl overflow-hidden group">
          <summary className="flex items-center gap-2 px-5 py-3 cursor-pointer hover:bg-fuchsia-50 transition-colors list-none">
            <span className="material-symbols-outlined text-fuchsia-600 text-base">bolt</span>
            <span className="text-[0.8125rem] font-bold text-fuchsia-800">
              ¿Qué es el fast-path? (click para expandir)
            </span>
            <span className="material-symbols-outlined text-fuchsia-600 text-sm ml-auto group-open:rotate-180 transition-transform">
              expand_more
            </span>
          </summary>
          <div className="px-5 py-4 border-t border-fuchsia-200 space-y-3 text-[0.8125rem] text-slate-700 leading-relaxed">
            <p>
              Tradicionalmente, todo PDF subido pasa por <strong>motor-OCR</strong> (PaddleOCR +
              Qwen-VL). Para una propuesta escaneada de 2300 páginas eso toma 2-3 horas. El
              fast-path detecta si el PDF es <strong>digital</strong> (capa de texto nativa) y
              evita motor-OCR usando <code>pdfplumber</code> directamente.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white border border-fuchsia-200 rounded-lg p-3">
                <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-fuchsia-700 mb-1">
                  Profesionales (propuesta)
                </p>
                <ul className="text-[0.75rem] space-y-1 list-disc pl-4">
                  <li>Umbral: <strong>≥200 chars/pág</strong> en primeras 5 págs</li>
                  <li>Mode del wrapper: <code>pdfplumber_segmentation</code></li>
                  <li>Detector: fuzzy RapidFuzz + qwen2.5:14b texto-only para borderline</li>
                  <li>Fallback automático a motor-OCR si detecta &lt;2 secciones</li>
                  <li>Ahorro típico: ~2-3 h → ~15 min</li>
                </ul>
              </div>
              <div className="bg-white border border-fuchsia-200 rounded-lg p-3">
                <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-fuchsia-700 mb-1">
                  TDR (bases)
                </p>
                <ul className="text-[0.75rem] space-y-1 list-disc pl-4">
                  <li>Umbral: <strong>≥50 chars/pág</strong> (todas las págs)</li>
                  <li>No usa mode del wrapper — pdfplumber <em>nativo</em> en <code>_run_tdr_job</code></li>
                  <li>No requiere segmentación por profesional</li>
                  <li>Fallback a motor-OCR (mode <code>ocr_only</code>) si texto insuficiente</li>
                  <li>Las bases OSCE suelen ser digitales → fast-path casi siempre activo</li>
                </ul>
              </div>
            </div>
            <p className="text-[0.75rem] text-slate-600">
              <strong>Forzar motor-OCR:</strong> checkbox que desactiva el fast-path (solo
              aplica a Profesionales). Útil si el PDF es digital pero tiene sellos/tachaduras
              que requieren análisis visual, o si el fast-path detectó menos profesionales de
              los esperados.
            </p>
          </div>
        </details>

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

            {/* Selector de tipo */}
            <div className="flex gap-2 mb-4">
              {([
                { id: "extraction", label: "Profesionales", icon: "person_search" },
                { id: "tdr", label: "TDR (bases)", icon: "fact_check" },
              ] as { id: DebugJobType; label: string; icon: string }[]).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setJobType(opt.id)}
                  className={
                    "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all " +
                    (jobType === opt.id
                      ? "bg-fuchsia-600 text-white shadow-sm"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high")
                  }
                >
                  <span className="material-symbols-outlined text-base">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>

            <PdfDropzone
              label={jobType === "tdr" ? "Bases del concurso" : "Propuesta técnica"}
              hint={jobType === "tdr" ? "PDF digital (OSCE)" : "PDF escaneado o digital"}
              icon="bug_report"
              file={file}
              onFile={setFile}
            />

            {jobType === "extraction" && (
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
            )}

            {jobType === "extraction" ? (
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
            ) : (
              <p className="mt-4 text-[0.75rem] text-outline leading-relaxed">
                <span className="material-symbols-outlined text-sm align-middle text-fuchsia-600 mr-1">info</span>
                TDR intenta pdfplumber primero por diseño. Sólo cae a motor-OCR (mode <code>ocr_only</code>) si chars/pág &lt; 50 en todo el documento.
              </p>
            )}

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
                <StatBadge
                  label="Tipo"
                  value={isTdr ? "TDR" : "Profesionales"}
                  highlight={isTdr}
                />
                {isTdr ? (
                  <>
                    <StatBadge
                      label="Cargos RTM"
                      value={String(resultTdr?.total_cargos ?? 0)}
                    />
                    <StatBadge
                      label="Factores"
                      value={String(resultTdr?.total_factores ?? 0)}
                    />
                    <StatBadge
                      label="RTM postor"
                      value={String(resultTdr?.rtm_postor?.length ?? 0)}
                    />
                  </>
                ) : (
                  <>
                    <StatBadge
                      label="Engine"
                      value={engine}
                      highlight={engine === "pdfplumber"}
                    />
                    <StatBadge label="Total págs" value={String(resultExtraction?.total_pages ?? "—")} />
                    <StatBadge label="pdfplumber" value={String(resultExtraction?.pages_pdfplumber ?? 0)} />
                    <StatBadge label="PaddleOCR" value={String(resultExtraction?.pages_paddle ?? 0)} />
                    <StatBadge label="Qwen-VL" value={String(resultExtraction?.pages_qwen ?? 0)} />
                    <StatBadge
                      label="Tiempo"
                      value={resultExtraction?.tiempo_total ? formatSeconds(resultExtraction.tiempo_total) : "—"}
                    />
                    <StatBadge label="Secciones" value={String(resultExtraction?.secciones?.length ?? 0)} />
                    <StatBadge label="Errores OCR" value={String(resultExtraction?.pages_error ?? 0)} />
                    <StatBadge
                      label="Confianza"
                      value={
                        resultExtraction?.conf_promedio !== undefined
                          ? `${(resultExtraction.conf_promedio * 100).toFixed(0)}%`
                          : "—"
                      }
                    />
                  </>
                )}
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

            {/* ── Secciones detectadas (Profesionales) ──────────── */}
            {!isTdr && resultExtraction?.secciones && resultExtraction.secciones.length > 0 && (
              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/10 shadow-ambient mb-6 overflow-x-auto">
                <h3 className="text-[0.75rem] font-bold uppercase tracking-wider text-primary mb-3">
                  Secciones detectadas ({resultExtraction.secciones.length})
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
                    {resultExtraction.secciones.map((sec) => (
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

            {/* ── RTM Personal detectado (TDR) ──────────────────── */}
            {isTdr && resultTdr?.rtm_personal && resultTdr.rtm_personal.length > 0 && (
              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/10 shadow-ambient mb-6 overflow-x-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[0.75rem] font-bold uppercase tracking-wider text-primary">
                    Cargos RTM detectados ({resultTdr.rtm_personal.length})
                  </h3>
                  {(() => {
                    const flagged = resultTdr.rtm_personal.filter((x) => x._needs_review).length;
                    return flagged > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[0.6875rem] font-bold bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        {flagged} marcado{flagged !== 1 ? "s" : ""} para revisión
                      </span>
                    ) : null;
                  })()}
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-high">
                    <tr>
                      {["#", "Cargo", "Años colegiado", "Exp. mínima", "Tipo obra", "Profesiones"].map((h) => (
                        <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {resultTdr.rtm_personal.map((r, i) => {
                      const flag = Boolean(r._needs_review);
                      return (
                        <tr
                          key={i}
                          className={flag ? "bg-red-50/60 border-l-4 border-red-500" : ""}
                          title={flag ? r._review_reason : undefined}
                        >
                          <td className="px-3 py-2 font-mono">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">
                            <div className="flex items-center gap-1.5">
                              {flag && (
                                <span className="material-symbols-outlined text-red-600 text-sm">warning</span>
                              )}
                              <span className={flag ? "text-red-700" : ""}>{r.cargo}</span>
                            </div>
                            {flag && r._review_reason && (
                              <p className="text-[0.625rem] text-red-600 mt-0.5 leading-tight">{r._review_reason}</p>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-[0.6875rem]">{r.anos_colegiado ?? "—"}</td>
                          <td className="px-3 py-2 text-[0.6875rem]">
                            {r.experiencia_minima
                              ? `${r.experiencia_minima.cantidad ?? "—"} ${r.experiencia_minima.unidad ?? ""}`
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-[0.6875rem] text-outline">{r.tipo_obra_valido ?? "—"}</td>
                          <td className="px-3 py-2 text-[0.6875rem] text-outline truncate max-w-[240px]">
                            {r.profesiones_aceptadas?.join(", ") ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Raw JSON ─────────────────────────────────────────── */}
            {(resultExtraction || resultTdr) && (
              <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-ambient mb-6 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                  <span className="text-[0.75rem] font-bold uppercase tracking-wider text-slate-300">
                    Raw result JSON {isTdr ? "(TDR)" : "(Profesionales)"}
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
                  {JSON.stringify(resultExtraction ?? resultTdr, null, 2)}
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
