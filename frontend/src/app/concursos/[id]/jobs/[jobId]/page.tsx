"use client";

/** P3 · Análisis (job) — orquestador de la vista de detalle. Trae job + resumen
 *  + extracción, maneja las pestañas, y delega cada subvista a su módulo en
 *  `@/components/analisis/*` (pasos, profesionales, veredictos, alertas,
 *  factores, descargas). El render pesado vive en esos módulos, no aquí. */
import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PanelShell from "@/components/PanelShell";
import {
  type PivoteJob, type ResumenAnalisis, type SaludPortal,
  ETAPA_LABEL, ETAPAS_ORDEN, JOB_ESTADO_UI, pendientesHumano,
} from "@/lib/pivote/types";
import { TabPasos } from "@/components/analisis/TabPasos";
import { TabProfesionales, type ProfBreve } from "@/components/analisis/TabProfesionales";
import { TabVeredictos } from "@/components/analisis/TabVeredictos";
import { TabAlertas } from "@/components/analisis/TabAlertas";
import { TabFactores } from "@/components/analisis/TabFactores";
import { TabDescargas } from "@/components/analisis/TabDescargas";
import { fetchRetry } from "@/lib/pivote/fetchRetry";

// ── tarjeta métrica (mismo patrón del dashboard) ─────────────────────────────
function MetricCard({ icon, label, value, accent, borde = "border-primary" }: {
  icon: string; label: string; value: string; accent?: "rojo" | "ambar"; borde?: string;
}) {
  const color = accent === "rojo" ? "text-red-600" : accent === "ambar" ? "text-amber-600" : "text-primary";
  return (
    <div className={`bg-surface-container-lowest p-4 border-l-4 ${borde} shadow-ambient rounded-xl flex items-start gap-4`}>
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <span className={`material-symbols-outlined text-xl ${color}`}>{icon}</span>
      </div>
      <div>
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-slate-500">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

// ── página ────────────────────────────────────────────────────────────────────
export default function JobPivote({ params }: { params: Promise<{ id: string; jobId: string }> }) {
  const { id, jobId } = use(params);
  const [job, setJob] = useState<PivoteJob | null>(null);
  const [resumen, setResumen] = useState<ResumenAnalisis | null>(null);
  const [profesionales, setProfesionales] = useState<ProfBreve[] | null>(null);
  const [salud, setSalud] = useState<SaludPortal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"pasos" | "profesionales" | "veredictos" | "factores" | "alertas" | "descargas">("profesionales");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargar = useCallback(async () => {
    const r = await fetchRetry(`/api/pivote/jobs/${jobId}`);
    if (!r.ok) { setError("No pudimos cargar el análisis (el servidor no respondió)."); return; }
    setError(null);
    const j: PivoteJob = await r.json();
    setJob(j);
    if (j.estado === "completado" || j.estado === "requiere_revision") {
      const [rr, re] = await Promise.all([
        fetch(`/api/pivote/jobs/${jobId}/resumen`),
        fetch(`/api/pivote/jobs/${jobId}/espejo`),
      ]);
      if (rr.ok) setResumen(await rr.json());
      if (re.ok) setProfesionales((await re.json()).profesionales);
    }
  }, [jobId]);

  useEffect(() => {
    cargar();
    fetch("/api/pivote/salud").then(async (r) => { if (r.ok) setSalud(await r.json()); });
  }, [cargar]);

  // polling mientras corre el pipeline O mientras se preparan las descargas del ZIP
  // (el job ya puede estar en estado terminal pero el ZIP seguir bajándose en background)
  useEffect(() => {
    const descBusy = job?.descargas_estado === "pendiente" || job?.descargas_estado === "en_progreso";
    if (job?.estado === "en_proceso" || job?.estado === "recibido" || descBusy) {
      timerRef.current = setInterval(cargar, 2500);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [job?.estado, job?.descargas_estado, cargar]);

  if (error) return (
    <PanelShell title="Análisis">
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => { setError(null); setJob(null); cargar(); }}
          className="inline-flex items-center gap-1.5 primary-gradient text-white text-xs font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
        >
          <span className="material-symbols-outlined text-base">refresh</span> Reintentar
        </button>
      </div>
    </PanelShell>
  );
  if (!job) return <PanelShell title="Análisis"><p className="text-sm text-outline">Cargando…</p></PanelShell>;

  const ui = JOB_ESTADO_UI[job.estado];
  const pend = pendientesHumano(job);
  const completas = job.etapas.filter((e) => ["ok", "ok_con_revision", "error_parcial"].includes(e.estado)).length;
  const pct = Math.round((completas / ETAPAS_ORDEN.length) * 100);
  const activo = job.estado === "en_proceso" || job.estado === "recibido";
  const criticas = resumen?.alertas.filter((x) => x.severidad === "critica").length ?? 0;
  const nAlertas = resumen?.alertas.length ?? 0;
  const portalesCaidos = salud.filter((s) => !s.ok);
  const ver = resumen?.veredictos ?? [];
  const veredictoTxt = (v: { cumple_backend?: string | null; cumple_claude?: string | null }) =>
    `${v.cumple_backend ?? v.cumple_claude ?? ""}`.toUpperCase();
  const noCumplen = ver.filter((v) => veredictoTxt(v).includes("NO CUMPLE")).length;
  const cumplen = ver.filter((v) => veredictoTxt(v).includes("CUMPLE") && !veredictoTxt(v).includes("NO CUMPLE")).length;

  const toggle = (nombre: string) =>
    setAbiertas((prev) => {
      const s = new Set(prev);
      if (s.has(nombre)) s.delete(nombre); else s.add(nombre);
      return s;
    });

  return (
    <PanelShell title={job.postor ?? job.analisis_id} subtitle={job.concurso ?? undefined}>
      {/* barra superior */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link href={`/concursos/${id}`} className="inline-flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-base">arrow_back</span> Expediente
        </Link>
        <span className={`px-2.5 py-0.5 rounded text-[0.6875rem] font-semibold ${ui.cls}`}>{ui.label}</span>
        {job.origen === "mcp" && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-primary/10 text-primary text-[0.6875rem] font-semibold"
            title="Llegó automáticamente desde la sesión de Claude">
            <span className="material-symbols-outlined text-[14px]">bolt</span> desde Claude
          </span>
        )}
        <span className="text-xs font-mono text-outline">{job.analisis_id}</span>
      </div>

      {/* métricas — lo más relevante según el estado del análisis */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {resumen ? (
          <>
            <MetricCard icon="verified" label="Profesionales que cumplen"
              value={`${cumplen}/${ver.length}`}
              borde={noCumplen > 0 ? "border-red-500" : cumplen > 0 ? "border-green-500" : "border-primary"} />
            <MetricCard icon="grading" label="Puntaje técnico"
              value={resumen.puntaje_total != null ? String(resumen.puntaje_total) : "—"} />
          </>
        ) : (
          <>
            <MetricCard icon="conveyor_belt" label="Pasos" value={`${completas}/${ETAPAS_ORDEN.length}`} />
            <MetricCard icon="speed" label="Progreso" value={`${pct}%`} />
          </>
        )}
        <MetricCard
          icon="notification_important" label="Alertas"
          value={resumen ? String(nAlertas) : "—"}
          accent={criticas > 0 ? "rojo" : undefined}
          borde={criticas > 0 ? "border-red-500" : "border-primary"}
        />
        <MetricCard
          icon="pending_actions" label="Por confirmar"
          value={String(pend)}
          accent={pend > 0 ? "ambar" : undefined}
          borde={pend > 0 ? "border-amber-500" : "border-primary"}
        />
      </section>

      {/* CTA · casos por confirmar — acceso directo (sin cazar pestañas) */}
      {pend > 0 && (
        <Link href={`/concursos/${id}/jobs/${jobId}/revision`}
          className="group mb-6 flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 px-5 py-4 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors">
          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">pending_actions</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {pend} {pend === 1 ? "caso espera tu decisión" : "casos esperan tu decisión"}
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/70">
              Al confirmar, el sistema re-verifica solo esa experiencia y regenera el Excel/ZIP.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 dark:text-amber-300 group-hover:gap-2 transition-all whitespace-nowrap">
            Resolver <span className="material-symbols-outlined text-base">arrow_forward</span>
          </span>
        </Link>
      )}

      {/* banner de salud de portales */}
      {portalesCaidos.length > 0 && (
        <div className="mb-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-600">cloud_off</span>
          <div className="text-sm text-red-700 dark:text-red-300">
            {portalesCaidos.map((p) => (
              <p key={p.portal}>
                <b>{p.portal.toUpperCase()}</b> no responde{p.diagnostico ? ` (${p.diagnostico})` : ""} —
                esas consultas quedan en espera; el resto de la verificación continúa.
              </p>
            ))}
          </div>
        </div>
      )}

      {/* barra de progreso con shimmer mientras corre */}
      {activo && (
        <div className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 p-5 mb-6">
          <div className="relative h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            <div className="absolute inset-y-0 left-0 overflow-hidden rounded-full" style={{ width: `${pct}%` }}>
              <div className="absolute inset-0 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-outline">
              {ETAPA_LABEL[job.etapas.find((e) => e.estado === "en_curso")?.etapa ?? "ingesta"]}…
            </span>
            <span className="text-sm font-bold text-primary">{pct}%</span>
          </div>
        </div>
      )}

      {/* ── PESTAÑAS (subvistas) ── */}
      <nav className="flex flex-wrap gap-1 mb-6 border-b border-outline-variant/10">
        {([
          ["pasos", "Pasos", "conveyor_belt", null],
          ["profesionales", "Profesionales", "groups", profesionales?.length ?? null],
          ["veredictos", "Veredictos", "gavel", resumen?.veredictos.length ?? null],
          ["factores", "Factores", "grading", null],
          ["alertas", "Alertas", "notification_important", nAlertas || null],
          ["descargas", "Descargas", "download", null],
        ] as const).map(([id, label, icon, badge]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-primary"}`}>
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            {label}
            {badge != null && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-surface-container-high text-[0.625rem] font-bold text-outline">{badge}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ── SUBVISTAS (cada una en su módulo) ── */}
      {tab === "pasos" && <TabPasos job={job} abiertas={abiertas} onToggle={toggle} />}

      {tab === "profesionales" && profesionales && profesionales.length > 0 && (
        <TabProfesionales profesionales={profesionales} />
      )}

      {resumen && (
        <>
          {tab === "veredictos" && <TabVeredictos resumen={resumen} />}
          {tab === "alertas" && <TabAlertas alertas={resumen.alertas} />}
          {tab === "factores" && <TabFactores factores={resumen.factores} puntajeTotal={resumen.puntaje_total} />}
        </>
      )}

      {tab === "descargas" && (job.excel_final || job.zip_infoobras || pend > 0) && (
        <TabDescargas job={job} pend={pend} id={id} jobId={jobId} />
      )}
    </PanelShell>
  );
}
