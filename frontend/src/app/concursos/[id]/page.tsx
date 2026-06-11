"use client";

/** Expediente de UN concurso: sus postores (jobs) + P6 comparador. */
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PanelShell from "@/components/PanelShell";
import {
  type ConcursoConJobs, type PivoteJob,
  ETAPAS_ORDEN, JOB_ESTADO_UI, pendientesHumano,
} from "@/lib/pivote/types";

export default function ExpedienteConcurso({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<ConcursoConJobs | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const r = await fetch(`/api/pivote/concursos/${id}`);
    if (!r.ok) { setError("Concurso no encontrado"); return; }
    setData(await r.json());
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  if (error) {
    return (
      <PanelShell title="Concurso">
        <p className="text-[0.8125rem] text-red-600">{error}</p>
      </PanelShell>
    );
  }
  if (!data) {
    return (
      <PanelShell title="Concurso">
        <p className="text-[0.8125rem] text-on-surface-variant">Cargando…</p>
      </PanelShell>
    );
  }

  const etapasOk = (j: PivoteJob) =>
    j.etapas.filter((e) => ["ok", "ok_con_revision", "error_parcial"].includes(e.estado)).length;
  const alertasJob = (j: PivoteJob) => {
    const obs = [...j.observaciones, ...j.etapas.flatMap((e) => e.observaciones)];
    return {
      criticas: obs.filter((o) => o.severidad === "critica").length,
      alertas: obs.filter((o) => o.severidad === "alerta").length,
    };
  };

  return (
    <PanelShell title={data.nomenclatura} subtitle={data.entidad ?? undefined}>
      <div className="max-w-6xl">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link href="/concursos" className="text-[0.75rem] text-on-surface-variant hover:text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Concursos
          </Link>
          <div className="flex-1" />
          <Link
            href={`/concursos/${id}/nuevo`}
            className="h-10 px-4 rounded-lg bg-primary text-on-primary text-[0.8125rem] font-semibold flex items-center gap-2 hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            Analizar postor (Excel + espejo)
          </Link>
        </div>

        {/* P6 · Comparador de postores */}
        <section className="rounded-lg bg-surface-container-lowest border border-outline-variant/20 overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">compare_arrows</span>
            <h2 className="text-[0.875rem] font-bold text-primary">Cuadro comparativo de postores</h2>
          </div>

          {data.jobs.length === 0 ? (
            <p className="p-5 text-[0.8125rem] text-on-surface-variant">
              Aún no hay postores analizados en este concurso.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[0.8125rem]">
                <thead>
                  <tr className="text-left text-[0.6875rem] uppercase tracking-wide text-on-surface-variant border-b border-outline-variant/20">
                    <th className="px-5 py-3 font-bold">Postor</th>
                    <th className="px-4 py-3 font-bold">Estado</th>
                    <th className="px-4 py-3 font-bold">Pipeline</th>
                    <th className="px-4 py-3 font-bold">Alertas</th>
                    <th className="px-4 py-3 font-bold">A revisión</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {data.jobs.map((j) => {
                    const ui = JOB_ESTADO_UI[j.estado];
                    const al = alertasJob(j);
                    const pend = pendientesHumano(j);
                    return (
                      <tr key={j.job_id} className="border-b border-outline-variant/10 hover:bg-surface-container-high/40">
                        <td className="px-5 py-3">
                          <p className="font-semibold">{j.postor ?? j.analisis_id}</p>
                          <p className="text-[0.6875rem] text-on-surface-variant">{j.analisis_id}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[0.6875rem] font-bold ${ui.cls}`}>{ui.label}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">
                          {etapasOk(j)}/{ETAPAS_ORDEN.length} etapas
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {al.criticas > 0 && (
                            <span className="mr-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 text-[0.6875rem] font-bold">
                              {al.criticas} crítica{al.criticas > 1 ? "s" : ""}
                            </span>
                          )}
                          {al.alertas > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 text-[0.6875rem] font-bold">
                              {al.alertas}
                            </span>
                          )}
                          {al.criticas === 0 && al.alertas === 0 && <span className="text-on-surface-variant">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {pend > 0 ? (
                            <Link
                              href={`/concursos/${id}/jobs/${j.job_id}/revision`}
                              className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[0.6875rem] font-bold hover:underline"
                            >
                              {pend} pendiente{pend > 1 ? "s" : ""}
                            </Link>
                          ) : (
                            <span className="text-on-surface-variant">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/concursos/${id}/jobs/${j.job_id}`}
                            className="text-primary text-[0.75rem] font-semibold hover:underline"
                          >
                            Ver análisis →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-4 text-[0.6875rem] text-on-surface-variant">
          El puntaje técnico comparado por postor aparece en el resumen de cada análisis;
          la exportación consolidada del expediente es de fase 2.
        </p>
      </div>
    </PanelShell>
  );
}
