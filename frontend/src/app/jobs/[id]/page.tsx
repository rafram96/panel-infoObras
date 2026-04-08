"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";

import PanelShell from "@/components/PanelShell";
import type { JobDetail, Seccion, ExtractionResult, TdrResult, RequisitoPersonal } from "@/lib/types";
import {
  STATUS_LABEL,
  STATUS_BADGE,
  confColor,
  formatSeconds,
  compressPages,
  bloqueLabel,
} from "@/lib/helpers";

// ── Helpers ─────────────────────────────────────────────────────────────────

function elapsedSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [activeTab, setActiveTab] = useState<"profesionales" | "metricas" | "requisitos" | "factores">(
    "profesionales",
  );
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // ── Fetch detail ────────────────────────────────────────────────────────
  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: JobDetail = await res.json();
      setDetail(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ── Initial fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // ── Set default tab based on job_type ──────────────────────────────────
  useEffect(() => {
    if (!detail) return;
    if (detail.job_type === "tdr" && activeTab === "profesionales") {
      setActiveTab("requisitos");
    }
  }, [detail?.job_type]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Adaptive polling: 3s when active, 10s when idle ─────────────────────
  useEffect(() => {
    if (!detail) return;
    const isActive =
      detail.status === "pending" || detail.status === "running";
    const pollMs = isActive ? 3_000 : 10_000;

    const interval = setInterval(fetchDetail, pollMs);
    return () => clearInterval(interval);
  }, [detail?.status, fetchDetail]);

  // ── Elapsed timer (only counts from started_at, not queue time) ─────────
  useEffect(() => {
    if (!detail) return;
    if (detail.status !== "running") return;
    const base = detail.started_at ?? detail.created_at;

    setElapsed(elapsedSince(base));
    const timer = setInterval(() => {
      setElapsed(elapsedSince(base));
    }, 1_000);

    return () => clearInterval(timer);
  }, [detail?.status, detail?.started_at, detail?.created_at]);

  // ── Toggle row expansion ────────────────────────────────────────────────
  const toggleRow = (index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // ── Stages for stepper ─────────────────────────────────────────────────
  const stages = ["OCR", "Segmentacion", "Extraccion"];

  function stageIndex(stage: string | null): number {
    if (!stage) return 0;
    const lower = stage.toLowerCase();
    if (lower.includes("extrac")) return 2;
    if (lower.includes("segment")) return 1;
    return 0;
  }

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <PanelShell title="Cargando..." subtitle={`Expediente #${id}`}>
        <div className="flex items-center justify-center py-20">
          <span className="material-symbols-outlined text-4xl text-outline animate-spin">
            progress_activity
          </span>
        </div>
      </PanelShell>
    );
  }

  // ── Network error (not job error) ───────────────────────────────────────
  if (error && !detail) {
    return (
      <PanelShell title="Error" subtitle={`Expediente #${id}`}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
          <span className="material-symbols-outlined align-middle mr-2">
            error
          </span>
          No se pudo cargar el detalle del analisis: {error}
        </div>
      </PanelShell>
    );
  }

  if (!detail) return null;

  const isActive =
    detail.status === "pending" || detail.status === "running";
  const isDone = detail.status === "done";
  const isError = detail.status === "error";
  const currentStage = stageIndex(detail.progress_stage);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <PanelShell
      title={detail.filename}
      subtitle={`Expediente #${id}`}
    >
      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-xs text-outline mb-5">
        <Link href="/" className="hover:text-primary transition-colors">
          Analisis
        </Link>
        <span className="material-symbols-outlined text-sm">
          chevron_right
        </span>
        <span className="text-primary font-medium">
          Expediente #{id.slice(0, 8)}
        </span>
      </nav>

      {/* ── Header row ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span
          className={`inline-block px-2.5 py-0.5 rounded text-[0.6875rem] font-semibold ${STATUS_BADGE[detail.status]}`}
        >
          {STATUS_LABEL[detail.status]}
        </span>

        {isDone && (
          <>
            <button className="inline-flex items-center gap-1.5 primary-gradient text-white text-xs font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90">
              <span className="material-symbols-outlined text-base">
                picture_as_pdf
              </span>
              Exportar PDF
            </button>
            <button className="inline-flex items-center gap-1.5 bg-surface-container-high text-primary text-xs font-semibold px-4 py-2 rounded-lg border border-outline-variant/20 transition-colors hover:bg-surface-container-highest">
              <span className="material-symbols-outlined text-base">
                download
              </span>
              Descargar Reportes
            </button>
          </>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      {isDone && (
        <div className="flex gap-0 border-b border-outline-variant/20 mb-6">
          {detail.job_type === "tdr" ? (
            <>
              <TabButton
                label="Requisitos RTM"
                icon="fact_check"
                active={activeTab === "requisitos"}
                onClick={() => setActiveTab("requisitos")}
              />
              <TabButton
                label="Factores de Evaluación"
                icon="score"
                active={activeTab === "factores"}
                onClick={() => setActiveTab("factores")}
              />
            </>
          ) : (
            <>
              <TabButton
                label="Profesionales"
                icon="groups"
                active={activeTab === "profesionales"}
                onClick={() => setActiveTab("profesionales")}
              />
              <TabButton
                label="Métricas OCR"
                icon="analytics"
                active={activeTab === "metricas"}
                onClick={() => setActiveTab("metricas")}
              />
            </>
          )}
        </div>
      )}

      {/* ── PROGRESS VIEW (pending / running) ────────────────────────────── */}
      {isActive && (
        <div className="space-y-6">
          {/* Stepper */}
          <div className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 p-6">
            <div className="flex items-center justify-between mb-6">
              {stages.map((stage, i) => {
                const isCompleted =
                  detail.status === "running" && i < currentStage;
                const isCurrent =
                  detail.status === "running" && i === currentStage;
                return (
                  <div key={stage} className="flex items-center flex-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          isCompleted
                            ? "bg-green-500 text-white"
                            : isCurrent
                              ? "bg-primary text-white"
                              : "bg-surface-container-high text-outline"
                        }`}
                      >
                        {isCompleted ? (
                          <span className="material-symbols-outlined text-base">
                            check
                          </span>
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          isCompleted
                            ? "text-green-600"
                            : isCurrent
                              ? "text-primary"
                              : "text-outline"
                        }`}
                      >
                        {stage}
                      </span>
                    </div>
                    {i < stages.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-3 rounded ${
                          isCompleted
                            ? "bg-green-400"
                            : isCurrent
                              ? "bg-primary/30"
                              : "bg-outline-variant/30"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500"
                style={{ width: `${detail.progress_pct}%` }}
              />
              {/* Shimmer overlay */}
              <div
                className="absolute inset-y-0 left-0 overflow-hidden rounded-full"
                style={{ width: `${detail.progress_pct}%` }}
              >
                <div className="absolute inset-0 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-outline">
                {detail.progress_stage ?? "Preparando..."}
              </span>
              <span className="text-sm font-bold text-primary">
                {detail.progress_pct}%
              </span>
            </div>
          </div>

          {/* Elapsed timer / Queue status */}
          <div className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-primary">
                {detail.status === "pending" ? "hourglass_top" : "timer"}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {detail.status === "pending" ? "Estado" : "Tiempo Transcurrido"}
              </p>
              <p className="text-2xl font-bold text-primary">
                {detail.status === "pending" ? "En cola..." : formatSeconds(elapsed)}
              </p>
            </div>
          </div>

          {/* Job logs (debug) */}
          {detail.logs && (
            <details className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 overflow-hidden">
              <summary className="px-5 py-3 cursor-pointer hover:bg-surface-container-low transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-sm">terminal</span>
                <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-secondary">
                  Logs del procesamiento
                </span>
              </summary>
              <pre className="px-5 py-3 text-[0.6875rem] text-on-surface-variant font-mono leading-relaxed whitespace-pre-wrap border-t border-outline-variant/10 bg-surface-container-low max-h-60 overflow-y-auto">
                {detail.logs}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* ── ERROR VIEW ───────────────────────────────────────────────────── */}
      {isError && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
            <span className="material-symbols-outlined text-red-600 text-xl mt-0.5">
              error
            </span>
            <div>
              <p className="text-sm font-semibold text-red-700 mb-1">
                El análisis terminó con error
              </p>
              <p className="text-sm text-red-600">
                {detail.error ?? "Error desconocido durante el procesamiento."}
              </p>
            </div>
          </div>
          {detail.logs && (
            <details open className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 overflow-hidden">
              <summary className="px-5 py-3 cursor-pointer hover:bg-surface-container-low transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-sm">terminal</span>
                <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-secondary">
                  Logs del procesamiento
                </span>
              </summary>
              <pre className="px-5 py-3 text-[0.6875rem] text-on-surface-variant font-mono leading-relaxed whitespace-pre-wrap border-t border-outline-variant/10 bg-surface-container-low max-h-60 overflow-y-auto">
                {detail.logs}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* ── DONE VIEW: Extraction ────────────────────────────────────────── */}
      {isDone && detail.result && detail.job_type !== "tdr" && (() => {
        const r = detail.result as ExtractionResult;
        return (
          <>
            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <SummaryCard icon="description" label="Total Páginas" value={String(r.total_pages)} />
              <SummaryCard icon="groups" label="Profesionales" value={String(r.secciones.length)} />
              <SummaryCard icon="timer" label="Tiempo" value={formatSeconds(r.tiempo_total)} />
              <SummaryCard icon="verified" label="Confianza OCR"
                value={`${(r.conf_promedio * 100).toFixed(0)}%`}
                valueClass={confColor(r.conf_promedio)} />
              <SummaryCard icon="warning" label="Errores OCR"
                value={String(r.pages_error)}
                valueClass={r.pages_error > 0 ? "text-red-600" : undefined} />
            </section>

            {activeTab === "metricas" && (
              <section className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 p-5 mb-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                  Detalle de Motor OCR
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-200">
                    <span className="material-symbols-outlined text-sm">memory</span>
                    PaddleOCR: {r.pages_paddle} págs
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-violet-200">
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    Qwen-VL: {r.pages_qwen} págs
                  </span>
                  {r.pages_error > 0 && (
                    <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200">
                      <span className="material-symbols-outlined text-sm">error</span>
                      Errores: {r.pages_error} págs
                    </span>
                  )}
                </div>
              </section>
            )}

            {activeTab === "profesionales" && (
              <section className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-outline-variant/10">
                  <h2 className="text-sm font-semibold text-primary">Profesionales Detectados</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-high">
                      <tr>
                        {["#", "Cargo", "Nombre", "N\u00b0", "Exp.", "Páginas", "Ubicación en PDF"].map((h) => (
                          <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {r.secciones.map((sec, i) => (
                        <ProfessionalRow
                          key={sec.index}
                          seccion={sec}
                          index={i}
                          totalDocPages={detail.doc_total_pages ?? r.total_pages}
                          expanded={expandedRows.has(i)}
                          onToggle={() => toggleRow(i)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        );
      })()}

      {/* ── DONE VIEW: TDR ────────────────────────────────────────────────── */}
      {isDone && detail.result && detail.job_type === "tdr" && (() => {
        const r = detail.result as TdrResult;
        return (
          <>
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <SummaryCard icon="badge" label="Cargos RTM" value={String(r.total_cargos)} />
              <SummaryCard icon="score" label="Factores" value={String(r.total_factores)} />
              <SummaryCard icon="business_center" label="Items Postor" value={String(r.rtm_postor?.length ?? 0)} />
              <SummaryCard icon="fact_check" label="Personal Clave" value={String(r.rtm_personal?.length ?? 0)} />
            </section>

            {/* ── Requisitos RTM table ─────────────────────────────────── */}
            {activeTab === "requisitos" && (
              <section className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-outline-variant/10">
                  <h2 className="text-sm font-semibold text-primary">
                    Requisitos por Cargo Profesional
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-high">
                      <tr>
                        {["#", "Cargo", "Profesiones Aceptadas", "Experiencia Mínima", "Tipo de Obra", "Cargos Válidos"].map((h) => (
                          <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {r.rtm_personal.map((req, i) => (
                        <TdrRequisitoRow key={i} req={req} index={i} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ── Factores table ───────────────────────────────────────── */}
            {activeTab === "factores" && (
              <section className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-outline-variant/10">
                  <h2 className="text-sm font-semibold text-primary">
                    Factores de Evaluación
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-high">
                      <tr>
                        {["#", "Factor", "Aplica a", "Cargo", "Puntaje Máx.", "Metodología"].map((h) => (
                          <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {r.factores_evaluacion.map((f, i) => (
                        <tr key={i} className="hover:bg-surface-container-high/40 transition-colors">
                          <td className="px-3 py-2 text-xs text-secondary font-mono">{i + 1}</td>
                          <td className="px-3 py-2 text-sm text-primary font-medium max-w-[250px]">{f.factor}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              f.aplica_a === "personal" ? "bg-blue-100 text-blue-700"
                              : f.aplica_a === "postor" ? "bg-amber-100 text-amber-700"
                              : "bg-violet-100 text-violet-700"
                            }`}>
                              {f.aplica_a}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-secondary">{f.cargo_personal || "\u2014"}</td>
                          <td className="px-3 py-2 text-sm font-bold text-primary">{f.puntaje_maximo}</td>
                          <td className="px-3 py-2 text-xs text-secondary max-w-[200px] truncate">{f.metodologia || "\u2014"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        );
      })()}
    </PanelShell>
  );
}

// ── TabButton ──────────────────────────────────────────────────────────────

function TabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-xs font-semibold transition-colors relative ${
        active ? "text-primary" : "text-outline hover:text-secondary"
      }`}
    >
      <span className="material-symbols-outlined text-sm align-middle mr-1">
        {icon}
      </span>
      {label}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
      )}
    </button>
  );
}

// ── TdrRequisitoRow ────────────────────────────────────────────────────────

function TdrRequisitoRow({
  req,
  index,
}: {
  req: RequisitoPersonal;
  index: number;
}) {
  const expMin = req.experiencia_minima;
  const meses = expMin?.cantidad;
  const expLabel = meses
    ? `${meses} meses${expMin?.descripcion ? ` — ${expMin.descripcion.slice(0, 80)}` : ""}`
    : "\u2014";

  return (
    <tr className="hover:bg-surface-container-high/40 transition-colors">
      <td className="px-3 py-2 text-xs text-secondary font-mono">{index + 1}</td>
      <td className="px-3 py-2 text-sm text-primary font-medium">{req.cargo}</td>
      <td className="px-3 py-2 text-xs text-secondary">
        {req.profesiones_aceptadas?.join(", ") || "\u2014"}
      </td>
      <td className="px-3 py-2 text-xs text-secondary max-w-[200px]">{expLabel}</td>
      <td className="px-3 py-2 text-xs text-secondary max-w-[150px] truncate">
        {req.tipo_obra_valido || "\u2014"}
      </td>
      <td className="px-3 py-2 text-xs text-secondary max-w-[200px]">
        {expMin?.cargos_similares_validos?.join(", ") || "\u2014"}
      </td>
    </tr>
  );
}

// ── SummaryCard ─────────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: string;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-surface-container-lowest p-4 border-l-4 border-primary shadow-ambient rounded-xl">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-base text-primary">
          {icon}
        </span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {label}
        </p>
      </div>
      <p className={`text-2xl font-bold ${valueClass ?? "text-primary"}`}>
        {value}
      </p>
    </div>
  );
}

// ── ProfessionalRow ─────────────────────────────────────────────────────────

function ProfessionalRow({
  seccion,
  index,
  totalDocPages,
  expanded,
  onToggle,
}: {
  seccion: Seccion;
  index: number;
  totalDocPages: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  // Build mini page bar segments
  const segments = seccion.bloques.map((b) => {
    const left = ((b.start - 1) / totalDocPages) * 100;
    const width = ((b.end - b.start + 1) / totalDocPages) * 100;
    return { left, width, isTipoB: seccion.es_tipo_b };
  });

  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer hover:bg-surface-container-high/40 transition-colors"
      >
        <td className="px-3 py-2 text-xs text-secondary font-mono">
          {index + 1}
        </td>
        <td className="px-3 py-2 text-sm text-primary font-medium">
          <div className="flex items-center gap-2">
            {seccion.cargo}
            {seccion.es_tipo_b && (
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700">
                B
              </span>
            )}
            {seccion._needs_review && (
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                Revisar
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2 text-sm text-on-surface">
          {seccion.profesional?.nombre ?? (
            <span className="text-slate-300">{"\u2014"}</span>
          )}
        </td>
        <td className="px-3 py-2 text-xs text-secondary">
          {seccion.numero ?? "\u2014"}
        </td>
        <td className="px-3 py-2 text-xs text-secondary tabular-nums">
          {seccion.experiencias?.length ?? (
            <span className="text-slate-300">{"\u2014"}</span>
          )}
        </td>
        <td className="px-3 py-2 text-xs text-secondary">
          {seccion.total_pages}
        </td>
        <td className="px-3 py-2">
          <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden min-w-[120px]">
            {segments.map((seg, si) => (
              <div
                key={si}
                className={`absolute inset-y-0 rounded-full ${
                  seg.isTipoB ? "bg-violet-400" : "bg-blue-400"
                }`}
                style={{
                  left: `${seg.left}%`,
                  width: `${Math.max(seg.width, 0.5)}%`,
                }}
              />
            ))}
          </div>
        </td>
      </tr>

      {/* ── Expanded detail ────────────────────────────────────────────── */}
      {expanded && (
        <tr>
          <td colSpan={7} className="px-3 py-0">
            <div
              className="py-3 px-4 mb-2 bg-surface-container-low rounded-lg space-y-4"
              style={{ animation: "fadeIn 0.2s ease-out" }}
            >
              {/* Datos del profesional (Paso 2) */}
              {seccion.profesional && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">person</span>
                    Datos del Profesional
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {[
                      { label: "Nombre", value: seccion.profesional.nombre },
                      { label: "DNI", value: seccion.profesional.dni },
                      { label: "Profesion", value: seccion.profesional.profesion },
                      {
                        label: seccion.profesional.tipo_colegio ?? "Colegiatura",
                        value: seccion.profesional.registro_colegio,
                      },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {label}
                        </p>
                        <p className="text-on-surface font-medium">
                          {value || <span className="text-slate-300">{"\u2014"}</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Experiencias (Paso 3) */}
              {seccion.experiencias && seccion.experiencias.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">description</span>
                    Experiencias ({seccion.experiencias.length})
                  </p>
                  <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-outline-variant/10">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-container-high">
                        <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="px-3 py-1.5">Proyecto</th>
                          <th className="px-3 py-1.5">Cargo</th>
                          <th className="px-3 py-1.5">Empresa</th>
                          <th className="px-3 py-1.5">Periodo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {seccion.experiencias.map((exp, ei) => (
                          <tr key={ei}>
                            <td className="px-3 py-1.5 font-medium text-on-surface max-w-[200px] truncate">
                              {exp.proyecto || "\u2014"}
                            </td>
                            <td className="px-3 py-1.5 text-secondary">
                              {exp.cargo || "\u2014"}
                            </td>
                            <td className="px-3 py-1.5 text-secondary max-w-[160px] truncate">
                              {exp.empresa_emisora || "\u2014"}
                            </td>
                            <td className="px-3 py-1.5 text-secondary whitespace-nowrap">
                              {exp.fecha_inicio || "?"} {"\u2013"} {exp.fecha_fin || "?"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Segmentacion info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                    Paginas
                  </p>
                  <p className="text-secondary">
                    {compressPages(seccion.page_numbers)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                    Bloques
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {seccion.bloques.map((b, bi) => (
                      <span
                        key={bi}
                        className="inline-block px-2 py-0.5 bg-surface-container-high rounded text-[11px] text-secondary"
                      >
                        {bloqueLabel(b)}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                    Tipo
                  </p>
                  {seccion.es_tipo_b ? (
                    <span className="inline-flex items-center gap-1 text-violet-700">
                      <span className="material-symbols-outlined text-sm">
                        swap_horiz
                      </span>
                      Tipo B (intercalado)
                    </span>
                  ) : (
                    <span className="text-secondary">
                      Tipo A (contiguo)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
