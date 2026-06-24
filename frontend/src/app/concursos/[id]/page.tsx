"use client";

/** Expediente de UN concurso: métricas, cuadro comparativo de postores (P6)
 *  y auto-refresh — los análisis creados por el MCP aparecen solos. */
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PanelShell from "@/components/PanelShell";
import {
  type ConcursoConJobs, type PivoteJob,
  ETAPAS_ORDEN, JOB_ESTADO_UI, pendientesHumano, fmtFechaHora,
} from "@/lib/pivote/types";

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

export default function ExpedienteConcurso({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<ConcursoConJobs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [editNom, setEditNom] = useState("");
  const [editEnt, setEditEnt] = useState("");

  const cargar = useCallback(async () => {
    const r = await fetch(`/api/pivote/concursos/${id}`);
    if (!r.ok) { setError("Concurso no encontrado"); return; }
    setData(await r.json());
  }, [id]);

  const guardarEdicion = async () => {
    const r = await fetch(`/api/pivote/concursos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomenclatura: editNom.trim(), entidad: editEnt.trim() }),
    });
    if (r.ok) { setEditando(false); cargar(); }
  };

  // puntaje técnico por postor (para comparar de un vistazo) — se re-pide solo
  // cuando cambia el conjunto de análisis, no en cada auto-refresh.
  const [puntajes, setPuntajes] = useState<Record<string, number | null>>({});
  const jobIdsKey = (data?.jobs ?? []).map((j) => j.job_id).join(",");
  useEffect(() => {
    if (!jobIdsKey) return;
    let cancel = false;
    (async () => {
      const pares = await Promise.all(jobIdsKey.split(",").map(async (jid) => {
        try {
          const r = await fetch(`/api/pivote/jobs/${jid}/resumen`);
          if (!r.ok) return [jid, null] as const;
          const d = await r.json();
          return [jid, (d.puntaje_total ?? null) as number | null] as const;
        } catch { return [jid, null] as const; }
      }));
      if (!cancel) setPuntajes(Object.fromEntries(pares));
    })();
    return () => { cancel = true; };
  }, [jobIdsKey]);

  // auto-refresh: el MCP crea análisis sin pasar por el panel
  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 6000);
    return () => clearInterval(t);
  }, [cargar]);

  if (error) return <PanelShell title="Concurso"><p className="text-sm text-red-600">{error}</p></PanelShell>;
  if (!data) return <PanelShell title="Concurso"><p className="text-sm text-outline">Cargando…</p></PanelShell>;

  const etapasOk = (j: PivoteJob) =>
    j.etapas.filter((e) => ["ok", "ok_con_revision", "error_parcial"].includes(e.estado)).length;
  const alertasJob = (j: PivoteJob) => {
    const obs = [...j.observaciones, ...j.etapas.flatMap((e) => e.observaciones)];
    return {
      criticas: obs.filter((o) => o.severidad === "critica").length,
      alertas: obs.filter((o) => o.severidad === "alerta").length,
    };
  };

  const completados = data.jobs.filter((j) => j.estado === "completado").length;
  const pendTotal = data.jobs.reduce((s, j) => s + pendientesHumano(j), 0);
  const criticasTotal = data.jobs.reduce((s, j) => s + alertasJob(j).criticas, 0);

  return (
    <PanelShell title={data.nomenclatura} subtitle={data.entidad ?? undefined}>
      {/* barra superior */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link href="/concursos" className="inline-flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-base">arrow_back</span> Concursos
        </Link>
        <div className="flex-1" />
        <button
          onClick={() => { setEditNom(data.nomenclatura); setEditEnt(data.entidad ?? ""); setEditando((v) => !v); }}
          className="inline-flex items-center gap-1.5 bg-surface-container-high text-on-surface-variant text-xs font-semibold px-4 py-2 rounded-lg hover:bg-surface-container-highest transition-colors"
        >
          <span className="material-symbols-outlined text-base">edit</span> Editar
        </button>
        <Link
          href={`/concursos/${id}/nuevo`}
          className="inline-flex items-center gap-1.5 primary-gradient text-white text-xs font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
        >
          <span className="material-symbols-outlined text-base">upload_file</span>
          Subir análisis manual
        </Link>
      </div>

      {/* form editar concurso (nombre + entidad) — persistente vía PATCH */}
      {editando && (
        <div className="mb-6 p-5 rounded-xl bg-surface-container-lowest shadow-ambient border border-outline-variant/10 flex flex-wrap gap-3 items-end animate-[fadeIn_.2s_ease]">
          <div className="flex-1 min-w-[260px]">
            <label className="block text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-slate-500 mb-1.5">Nomenclatura *</label>
            <input value={editNom} onChange={(e) => setEditNom(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-surface border border-outline-variant/20 text-sm focus:outline-none focus:border-primary/50" />
          </div>
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-slate-500 mb-1.5">Entidad convocante</label>
            <input value={editEnt} onChange={(e) => setEditEnt(e.target.value)} placeholder="ESSALUD, Gobierno Regional de…"
              className="w-full h-10 px-3 rounded-lg bg-surface border border-outline-variant/20 text-sm focus:outline-none focus:border-primary/50" />
          </div>
          <button onClick={guardarEdicion} disabled={!editNom.trim()}
            className="h-10 px-5 rounded-lg primary-gradient text-white text-xs font-semibold disabled:opacity-40">Guardar</button>
          <button onClick={() => setEditando(false)}
            className="h-10 px-4 rounded-lg text-xs font-semibold text-outline hover:text-on-surface">Cancelar</button>
        </div>
      )}

      {/* métricas del expediente */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard icon="groups" label="Postores" value={String(data.jobs.length)} />
        <MetricCard icon="task_alt" label="Completados" value={String(completados)} />
        <MetricCard icon="pending_actions" label="A revisión" value={String(pendTotal)}
          accent={pendTotal > 0 ? "ambar" : undefined} borde={pendTotal > 0 ? "border-amber-500" : "border-primary"} />
        <MetricCard icon="notification_important" label="Alertas críticas" value={String(criticasTotal)}
          accent={criticasTotal > 0 ? "rojo" : undefined} borde={criticasTotal > 0 ? "border-red-500" : "border-primary"} />
      </section>

      {/* aviso flujo MCP */}
      <div className="mb-6 bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 px-5 py-3.5 flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-xl">bolt</span>
        <p className="text-xs text-outline leading-relaxed">
          Los análisis llegan <b className="text-primary">solos desde Claude</b> cuando se evalúa
          una propuesta — esta vista se actualiza automáticamente.
          El botón de subida manual es solo la alternativa.
        </p>
        <span className="ml-auto flex items-center gap-1.5 text-[0.6875rem] font-semibold text-green-600 whitespace-nowrap">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          en vivo
        </span>
      </div>

      {/* P6 · cuadro comparativo */}
      <section className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
          <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">compare_arrows</span>
            Cuadro comparativo de postores
          </h2>
        </div>

        {data.jobs.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-outline">
            Aún no hay postores analizados en este concurso.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-high">
                <tr>
                  {["Postor", "Fecha", "Origen", "Estado", "Puntaje", "Pipeline", "Alertas", "A revisión", "Acciones"].map((h) => (
                    <th key={h} className="px-5 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {data.jobs.map((j) => {
                  const ui = JOB_ESTADO_UI[j.estado];
                  const al = alertasJob(j);
                  const pend = pendientesHumano(j);
                  const ok = etapasOk(j);
                  return (
                    <tr key={j.job_id} className="hover:bg-surface-container-high/40 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-sm text-primary font-medium truncate max-w-[260px]">{j.postor ?? j.analisis_id}</p>
                        <p className="text-[0.6875rem] font-mono text-outline">{j.analisis_id}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-outline whitespace-nowrap">{fmtFechaHora(j.creado_en)}</td>
                      <td className="px-5 py-3">
                        {j.origen === "mcp" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[0.6875rem] font-semibold">
                            <span className="material-symbols-outlined text-[13px]">bolt</span> Claude
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-high text-outline text-[0.6875rem] font-semibold">
                            <span className="material-symbols-outlined text-[13px]">upload_file</span> manual
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[0.6875rem] font-semibold ${ui.cls}`}>{ui.label}</span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {puntajes[j.job_id] != null ? (
                          <span className="text-base font-bold text-primary tabular-nums">{puntajes[j.job_id]}</span>
                        ) : (
                          <span className="text-xs text-outline">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${(ok / ETAPAS_ORDEN.length) * 100}%` }} />
                          </div>
                          <span className="text-[0.6875rem] text-outline">{ok}/{ETAPAS_ORDEN.length}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {al.criticas > 0 && (
                          <span className="mr-1 px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 text-[0.6875rem] font-bold">
                            {al.criticas} crít.
                          </span>
                        )}
                        {al.alertas > 0 && (
                          <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 text-[0.6875rem] font-bold">
                            {al.alertas}
                          </span>
                        )}
                        {al.criticas === 0 && al.alertas === 0 && <span className="text-xs text-outline">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        {pend > 0 ? (
                          <Link href={`/concursos/${id}/jobs/${j.job_id}/revision`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[0.6875rem] font-bold hover:underline">
                            <span className="material-symbols-outlined text-[13px]">pending_actions</span>
                            {pend}
                          </Link>
                        ) : (
                          <span className="text-xs text-outline">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Link href={`/concursos/${id}/jobs/${j.job_id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors">
                          Abrir análisis
                          <span className="material-symbols-outlined text-[15px]">chevron_right</span>
                        </Link>
                        {j.excel_final && (
                          <a href={j.excel_final} download
                            className="ml-3 inline-flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-base">download</span> Excel
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PanelShell>
  );
}
