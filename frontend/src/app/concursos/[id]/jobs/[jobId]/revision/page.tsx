"use client";

/** P4 ⭐ · Cola de revisión humana — donde el 0-50% no-automático se vuelve
 *  trabajo fluido. Cada resolución re-dispara SOLO esa experiencia aguas
 *  abajo; el resto del job no se toca. */
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PanelShell from "@/components/PanelShell";
import type { ItemRevision, PivoteJob } from "@/lib/pivote/types";
import { ETAPA_LABEL, pendientesHumano } from "@/lib/pivote/types";

function TarjetaItem({
  item, onResolver, ocupado,
}: {
  item: ItemRevision;
  onResolver: (item: ItemRevision, dato: { cui?: string; accion?: string }) => Promise<void>;
  ocupado: boolean;
}) {
  const [cuiManual, setCuiManual] = useState("");

  return (
    <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient border border-outline-variant/10 border-l-4 border-l-amber-500">
      {/* contexto de la experiencia — decidir sin abrir nada más */}
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[0.6875rem] font-bold">
          prof {item.n_prof} · exp {item.n_exp}
        </span>
        <span className="text-[0.6875rem] text-on-surface-variant uppercase tracking-wide">
          etapa: {ETAPA_LABEL[item.etapa]}
        </span>
      </div>
      <p className="text-[0.875rem] font-semibold">{item.profesional ?? `Profesional ${item.n_prof}`}
        {item.cargo && <span className="font-normal text-on-surface-variant"> — {item.cargo}</span>}
      </p>
      {item.proyecto && <p className="text-[0.8125rem] mt-0.5">{item.proyecto}</p>}
      {item.fechas && <p className="text-[0.6875rem] text-on-surface-variant">{item.fechas}</p>}
      <p className="mt-2 text-[0.8125rem] text-amber-800 dark:text-amber-300">
        <span className="material-symbols-outlined text-[16px] align-text-bottom mr-1">help</span>
        {item.motivo}
      </p>

      {/* candidatos con score */}
      {item.candidatos.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-on-surface-variant">
            Candidatos encontrados — elige uno:
          </p>
          {item.candidatos.map((c) => (
            <button
              key={c.cui}
              disabled={ocupado}
              onClick={() => onResolver(item, { cui: c.cui })}
              className="w-full text-left p-3 rounded-lg border border-outline-variant/30 hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-[0.6875rem] font-bold ${
                  c.score >= 60
                    ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}>
                  {c.score}%
                </span>
                <span className="font-mono text-[0.75rem] text-primary font-bold">CUI {c.cui}</span>
                <span className="flex-1 text-[0.75rem] truncate">{c.nombre_obra}</span>
                {c.departamento && <span className="text-[0.6875rem] text-on-surface-variant">{c.departamento}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* CUI manual + no existe */}
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        <input
          value={cuiManual}
          onChange={(e) => setCuiManual(e.target.value.replace(/\D/g, ""))}
          placeholder="…o pega el CUI"
          className="h-9 px-3 rounded-lg bg-surface border border-outline-variant/30 text-[0.8125rem] font-mono w-44 focus:outline-none focus:border-primary/50"
        />
        <button
          disabled={ocupado || cuiManual.length < 4}
          onClick={() => onResolver(item, { cui: cuiManual })}
          className="h-9 px-4 rounded-lg primary-gradient text-white text-[0.75rem] font-bold disabled:opacity-40 transition-opacity hover:opacity-90"
        >
          Confirmar CUI
        </button>
        <div className="flex-1" />
        <button
          disabled={ocupado}
          onClick={() => onResolver(item, { accion: "no_existe" })}
          className="h-9 px-3 rounded-lg border border-outline-variant/40 text-on-surface-variant text-[0.75rem] font-semibold hover:bg-surface-container-high disabled:opacity-40"
        >
          No existe en InfoObras
        </button>
      </div>
    </div>
  );
}

export default function RevisionPage({ params }: { params: Promise<{ id: string; jobId: string }> }) {
  const { id, jobId } = use(params);
  const [job, setJob] = useState<PivoteJob | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const r = await fetch(`/api/pivote/jobs/${jobId}`);
    if (r.ok) setJob(await r.json());
  }, [jobId]);

  useEffect(() => { cargar(); }, [cargar]);

  const resolver = async (item: ItemRevision, dato: { cui?: string; accion?: string }) => {
    setOcupado(true); setMensaje(null);
    const r = await fetch(`/api/pivote/jobs/${jobId}/revision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ n_prof: item.n_prof, n_exp: item.n_exp, ...dato }),
    });
    if (r.ok) {
      setJob(await r.json());
      setMensaje(
        dato.accion === "no_existe"
          ? `prof ${item.n_prof} exp ${item.n_exp}: marcada como inexistente — quedó documentado.`
          : `prof ${item.n_prof} exp ${item.n_exp}: re-disparada con CUI ${dato.cui} (InfoObras → reglas → Excel).`,
      );
    } else {
      const e = await r.json().catch(() => ({}));
      setMensaje(e.error ?? `Error ${r.status}`);
    }
    setOcupado(false);
  };

  if (!job) return <PanelShell title="Revisión"><p className="text-[0.8125rem] text-on-surface-variant">Cargando…</p></PanelShell>;

  const pendientes = job.items_revision.filter((it) => !it.resuelto);
  const resueltos = job.items_revision.filter((it) => it.resuelto);

  return (
    <PanelShell
      title="Cola de revisión"
      subtitle={`${job.postor ?? job.analisis_id} — lo que el sistema no pudo resolver solo`}
    >
      <div className="max-w-3xl">
        <Link href={`/concursos/${id}/jobs/${jobId}`} className="text-[0.75rem] text-on-surface-variant hover:text-primary flex items-center gap-1 mb-6">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Volver al análisis
        </Link>

        {mensaje && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/50 text-[0.8125rem] text-green-800 dark:text-green-300 shadow-ambient flex items-center gap-2"><span className="material-symbols-outlined text-base">check_circle</span><span>
            {mensaje}</span>
          </div>
        )}

        {pendientes.length === 0 ? (
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-ambient border border-outline-variant/10 text-center">
            <span className="material-symbols-outlined text-green-600 text-4xl">task_alt</span>
            <p className="mt-2 text-[0.9375rem] font-bold text-primary">Cola limpia</p>
            <p className="text-[0.8125rem] text-on-surface-variant mt-1">
              Todo resuelto. El backend re-corrió las experiencias afectadas y el Excel final está regenerado.
            </p>
            <Link
              href={`/concursos/${id}/jobs/${jobId}`}
              className="inline-flex items-center gap-1.5 mt-4 primary-gradient text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-opacity hover:opacity-90"
            >
              Ver el análisis completo
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-4 text-[0.8125rem] text-on-surface-variant">
              <b className="text-amber-700 dark:text-amber-300">{pendientes.length}</b> item{pendientes.length > 1 ? "s" : ""} esperando tu decisión.
              Cada resolución re-dispara <b>solo esa experiencia</b> aguas abajo — el resto del job no se toca.
            </p>
            <div className="space-y-4">
              {pendientes.map((item) => (
                <TarjetaItem
                  key={`${item.n_prof}-${item.n_exp}`}
                  item={item}
                  onResolver={resolver}
                  ocupado={ocupado}
                />
              ))}
            </div>
          </>
        )}

        {resueltos.length > 0 && (
          <div className="mt-8">
            <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-on-surface-variant mb-2">
              Resueltos en esta corrida
            </p>
            <ul className="space-y-1">
              {resueltos.map((it) => (
                <li key={`${it.n_prof}-${it.n_exp}`} className="text-[0.75rem] text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600 text-[16px]">check_circle</span>
                  prof {it.n_prof} exp {it.n_exp} — {it.accion_sugerida}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </PanelShell>
  );
}
