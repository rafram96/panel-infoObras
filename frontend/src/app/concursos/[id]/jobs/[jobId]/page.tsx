"use client";

/** P3 · Job en vivo (8 etapas, métricas, polling) + P5 · Resumen del análisis
 *  (veredictos con diff Claude→backend, alertas con decisión, factores). */
import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PanelShell from "@/components/PanelShell";
import {
  type AlertaResumen, type PivoteJob, type ResumenAnalisis,
  type SaludPortal, ETAPA_LABEL, ETAPAS_ORDEN, JOB_ESTADO_UI, SEVERIDAD_UI,
  pendientesHumano,
} from "@/lib/pivote/types";

const ETAPA_UI: Record<string, { icon: string; cls: string }> = {
  ok: { icon: "check_circle", cls: "text-green-600 dark:text-green-400" },
  ok_con_revision: { icon: "rule", cls: "text-amber-600 dark:text-amber-400" },
  error_parcial: { icon: "warning", cls: "text-orange-600 dark:text-orange-400" },
  error: { icon: "cancel", cls: "text-red-600 dark:text-red-400" },
  en_curso: { icon: "progress_activity", cls: "text-blue-600 dark:text-blue-400 animate-spin" },
  pendiente: { icon: "radio_button_unchecked", cls: "text-outline" },
};

export default function JobPivote({ params }: { params: Promise<{ id: string; jobId: string }> }) {
  const { id, jobId } = use(params);
  const [job, setJob] = useState<PivoteJob | null>(null);
  const [resumen, setResumen] = useState<ResumenAnalisis | null>(null);
  const [salud, setSalud] = useState<SaludPortal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargar = useCallback(async () => {
    const r = await fetch(`/api/pivote/jobs/${jobId}`);
    if (!r.ok) { setError("Job no encontrado"); return; }
    const j: PivoteJob = await r.json();
    setJob(j);
    if (j.estado === "completado" || j.estado === "requiere_revision") {
      const rr = await fetch(`/api/pivote/jobs/${jobId}/resumen`);
      if (rr.ok) setResumen(await rr.json());
    }
  }, [jobId]);

  useEffect(() => {
    cargar();
    fetch("/api/pivote/salud").then(async (r) => {
      if (r.ok) setSalud(await r.json());
    });
  }, [cargar]);

  // polling mientras el pipeline corre (el backend real además empuja por WS)
  useEffect(() => {
    if (job?.estado === "en_proceso" || job?.estado === "recibido") {
      timerRef.current = setInterval(cargar, 2500);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [job?.estado, cargar]);

  const decidirAlerta = async (alerta: AlertaResumen, relevante: boolean) => {
    const razon = relevante ? undefined : window.prompt("Razón para descartar (queda en el expediente):") ?? undefined;
    if (!relevante && razon === undefined) return;
    const r = await fetch(`/api/pivote/jobs/${jobId}/alertas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alerta_id: alerta.id, relevante, razon }),
    });
    if (r.ok) setResumen(await r.json());
  };

  if (error) return <PanelShell title="Análisis"><p className="text-[0.8125rem] text-red-600">{error}</p></PanelShell>;
  if (!job) return <PanelShell title="Análisis"><p className="text-[0.8125rem] text-on-surface-variant">Cargando…</p></PanelShell>;

  const ui = JOB_ESTADO_UI[job.estado];
  const pend = pendientesHumano(job);
  const porEtapa = new Map(job.etapas.map((e) => [e.etapa, e]));
  const completas = job.etapas.filter((e) => ["ok", "ok_con_revision", "error_parcial"].includes(e.estado)).length;
  const portalesCaidos = salud.filter((s) => !s.ok);

  return (
    <PanelShell title={job.postor ?? job.analisis_id} subtitle={job.concurso ?? undefined}>
      <div className="max-w-5xl">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link href={`/concursos/${id}`} className="text-[0.75rem] text-on-surface-variant hover:text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Expediente
          </Link>
          <span className={`px-2.5 py-1 rounded-full text-[0.6875rem] font-bold ${ui.cls}`}>{ui.label}</span>
          <span className="text-[0.75rem] text-on-surface-variant">{completas}/{ETAPAS_ORDEN.length} etapas</span>
          <div className="flex-1" />
          {pend > 0 && (
            <Link
              href={`/concursos/${id}/jobs/${jobId}/revision`}
              className="h-10 px-4 rounded-lg bg-amber-500 text-white text-[0.8125rem] font-semibold flex items-center gap-2 hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[18px]">pending_actions</span>
              Resolver {pend} pendiente{pend > 1 ? "s" : ""}
            </Link>
          )}
          {job.excel_final && (
            <a
              href={job.excel_final}
              className="h-10 px-4 rounded-lg border border-primary/40 text-primary text-[0.8125rem] font-semibold flex items-center gap-2 hover:bg-primary/5"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Excel final
            </a>
          )}
        </div>

        {/* banner de salud de portales */}
        {portalesCaidos.length > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-start gap-3">
            <span className="material-symbols-outlined text-red-600">cloud_off</span>
            <div className="text-[0.8125rem] text-red-700 dark:text-red-300">
              {portalesCaidos.map((p) => (
                <p key={p.portal}>
                  <b>{p.portal.toUpperCase()}</b> no responde
                  {p.diagnostico ? ` (${p.diagnostico})` : ""}{p.desde ? ` desde ${p.desde}` : ""} —
                  las experiencias de esa rama quedarán en espera.
                </p>
              ))}
            </div>
          </div>
        )}

        {/* P3 · pipeline de 8 etapas */}
        <section className="rounded-lg bg-surface-container-lowest border border-outline-variant/20 p-5 mb-8">
          <h2 className="text-[0.875rem] font-bold text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">conveyor_belt</span>
            Pipeline del backend
          </h2>
          <ol className="space-y-1">
            {ETAPAS_ORDEN.map((nombre) => {
              const res = porEtapa.get(nombre);
              const estado = res?.estado ?? "pendiente";
              const eui = ETAPA_UI[estado];
              const m = res?.metrica;
              return (
                <li key={nombre} className="flex items-center gap-3 py-2 border-b border-outline-variant/10 last:border-0">
                  <span className={`material-symbols-outlined text-[20px] ${eui.cls}`}>{eui.icon}</span>
                  <span className="flex-1 text-[0.8125rem] font-medium">{ETAPA_LABEL[nombre]}</span>
                  {res?.estado === "error" && res.error && (
                    <span className="text-[0.6875rem] text-red-600 max-w-[360px] truncate" title={res.error}>{res.error}</span>
                  )}
                  {m && m.items_total > 0 && (
                    <span className="text-[0.6875rem] text-on-surface-variant whitespace-nowrap">
                      {m.items_ok}/{m.items_total} OK
                      {m.items_revision > 0 && <span className="text-amber-600 font-semibold"> · {m.items_revision} a revisión</span>}
                      {m.items_error > 0 && <span className="text-orange-600 font-semibold"> · {m.items_error} con error</span>}
                    </span>
                  )}
                  {(nombre === "infoobras" || nombre === "sunat") && (
                    <span className="text-[0.625rem] uppercase tracking-wide text-outline">∥ paralela</span>
                  )}
                </li>
              );
            })}
          </ol>
          {job.etapas.some((e) => e.estado === "error_parcial") && (
            <p className="mt-3 text-[0.75rem] text-orange-700 dark:text-orange-300">
              Hubo items con error en alguna etapa, pero <b>el resto del análisis continuó</b> — los fallidos están identificados y se pueden re-disparar.
            </p>
          )}
        </section>

        {/* P5 · Resumen del análisis */}
        {resumen && (
          <>
            {/* veredictos con diff */}
            <section className="rounded-lg bg-surface-container-lowest border border-outline-variant/20 overflow-hidden mb-8">
              <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center justify-between">
                <h2 className="text-[0.875rem] font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">gavel</span>
                  Veredictos por profesional — Claude → backend
                </h2>
                {resumen.puntaje_total != null && (
                  <span className="text-[0.8125rem] font-bold">
                    Puntaje técnico: <span className="text-primary text-[1rem]">{resumen.puntaje_total}</span>
                  </span>
                )}
              </div>
              <div className="divide-y divide-outline-variant/10">
                {resumen.veredictos.map((v) => {
                  const invertido = !!v.cumple_backend;
                  return (
                    <div key={v.n_prof} className={`px-5 py-4 ${invertido ? "bg-red-50/60 dark:bg-red-950/20" : ""}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[0.8125rem] font-bold">{v.n_prof}. {v.cargo}</span>
                        <span className="text-[0.75rem] text-on-surface-variant">{v.nombre}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.8125rem]">
                        <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200 font-semibold">
                          Claude: {v.cumple_claude}
                        </span>
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">arrow_forward</span>
                        {invertido ? (
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-bold">
                            Backend: {v.cumple_backend}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 font-semibold">
                            Backend: confirma{v.anios_efectivos != null ? ` (${v.anios_efectivos} años efectivos)` : ""}
                          </span>
                        )}
                      </div>
                      {v.motivo_backend && (
                        <p className="mt-1.5 text-[0.75rem] text-on-surface-variant">
                          {v.motivo_backend}
                          {v.fuente && <span className="text-outline"> · {v.fuente}</span>}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* alertas con decisión humana */}
            <section className="rounded-lg bg-surface-container-lowest border border-outline-variant/20 overflow-hidden mb-8">
              <div className="px-5 py-4 border-b border-outline-variant/20">
                <h2 className="text-[0.875rem] font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">notification_important</span>
                  Alertas — la máquina detecta, tú decides
                </h2>
              </div>
              <div className="divide-y divide-outline-variant/10">
                {[...resumen.alertas]
                  .sort((a, b) => SEVERIDAD_UI[a.severidad].orden - SEVERIDAD_UI[b.severidad].orden)
                  .map((a) => {
                    const sui = SEVERIDAD_UI[a.severidad];
                    return (
                      <div key={a.id} className="px-5 py-4 flex flex-wrap items-start gap-3">
                        <span className={`px-2 py-0.5 rounded-full text-[0.6875rem] font-bold ${sui.cls}`}>
                          {a.codigo} · {sui.label}
                        </span>
                        <div className="flex-1 min-w-[260px]">
                          <p className="text-[0.8125rem]">{a.mensaje}</p>
                          <p className="text-[0.6875rem] text-on-surface-variant mt-0.5">
                            {a.referencia}{a.fuente ? ` · ${a.fuente}` : ""}
                          </p>
                        </div>
                        {a.decision ? (
                          <span className={`px-2.5 py-1 rounded-full text-[0.6875rem] font-bold ${
                            a.decision.relevante
                              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}>
                            {a.decision.relevante ? "Marcada relevante" : `Descartada${a.decision.razon ? `: ${a.decision.razon}` : ""}`}
                          </span>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => decidirAlerta(a, true)}
                              className="px-3 h-8 rounded-lg bg-red-600 text-white text-[0.6875rem] font-bold hover:opacity-90"
                            >
                              Relevante
                            </button>
                            <button
                              onClick={() => decidirAlerta(a, false)}
                              className="px-3 h-8 rounded-lg border border-outline-variant/40 text-on-surface-variant text-[0.6875rem] font-bold hover:bg-surface-container-high"
                            >
                              Descartar…
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </section>

            {/* factores */}
            <section className="rounded-lg bg-surface-container-lowest border border-outline-variant/20 overflow-hidden">
              <div className="px-5 py-4 border-b border-outline-variant/20">
                <h2 className="text-[0.875rem] font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">grading</span>
                  Factores de evaluación
                </h2>
              </div>
              <table className="w-full text-[0.8125rem]">
                <tbody>
                  {resumen.factores.map((f, i) => (
                    <tr key={i} className="border-b border-outline-variant/10 last:border-0">
                      <td className="px-5 py-3 font-medium">{f.factor}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{f.detalle}</td>
                      <td className="px-5 py-3 text-right font-bold whitespace-nowrap">
                        {typeof f.puntaje === "number" ? f.puntaje : (
                          <span className="text-on-surface-variant font-semibold">{f.puntaje ?? "—"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </PanelShell>
  );
}
