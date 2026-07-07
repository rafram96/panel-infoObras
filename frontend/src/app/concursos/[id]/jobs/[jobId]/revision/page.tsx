"use client";

/** P4 ⭐ · Cola de revisión humana — flujo de UNA tarjeta a la vez. Resuelves el
 *  caso enfocado, el sistema re-dispara SOLO esa experiencia aguas abajo, y la
 *  cola avanza sola al siguiente. Barra de progreso + cola navegable. */
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PanelShell from "@/components/PanelShell";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { ItemRevision, PivoteJob } from "@/lib/pivote/types";
import { TarjetaRevision } from "@/components/analisis/TarjetaRevision";
import { fetchRetry } from "@/lib/pivote/fetchRetry";

const keyOf = (it: ItemRevision) => `${it.n_prof}-${it.n_exp}`;

export default function RevisionPage({ params }: { params: Promise<{ id: string; jobId: string }> }) {
  const { id, jobId } = use(params);
  const [job, setJob] = useState<PivoteJob | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [focoKey, setFocoKey] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const r = await fetchRetry(`/api/pivote/jobs/${jobId}`);
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
      setFocoKey(null); // que el foco salte solo al siguiente pendiente
      setMensaje(
        dato.accion === "no_existe"
          ? `Profesional ${item.n_prof}, experiencia ${item.n_exp}: marcada como inexistente — quedó documentado.`
          : `Profesional ${item.n_prof}, experiencia ${item.n_exp}: resuelta con CUI ${dato.cui} — el sistema la está verificando de nuevo y el Excel se actualizará.`,
      );
    } else {
      const e = await r.json().catch(() => ({}));
      setMensaje(e.error ?? `Error ${r.status}`);
    }
    setOcupado(false);
  };

  if (!job) return <PanelShell title="Revisión"><p className="text-dato text-on-surface-variant">Cargando…</p></PanelShell>;

  const pendientes = job.items_revision.filter((it) => !it.resuelto);
  const resueltos = job.items_revision.filter((it) => it.resuelto);
  const total = job.items_revision.length;
  const foco = pendientes.find((it) => keyOf(it) === focoKey) ?? pendientes[0];
  const focoIdx = foco ? pendientes.indexOf(foco) : -1;
  const pct = total > 0 ? Math.round((resueltos.length / total) * 100) : 0;

  return (
    <PanelShell title="Casos por confirmar" subtitle={`${job.postor ?? job.analisis_id} — lo que necesita tu decisión`}>
      <div className="max-w-2xl">
        <Breadcrumbs
          items={[
            { label: "Concursos", href: "/concursos" },
            { label: job.concurso ?? "Expediente", href: `/concursos/${id}` },
            { label: job.postor ?? job.analisis_id, href: `/concursos/${id}/jobs/${jobId}` },
            { label: "Por confirmar" },
          ]}
        />

        {/* progreso */}
        {total > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-dato font-semibold text-primary">
                {resueltos.length} de {total} resueltas
              </span>
              <span className="text-xs text-on-surface-variant">{pendientes.length} pendiente{pendientes.length === 1 ? "" : "s"}</span>
            </div>
            <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {mensaje && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/50 text-dato text-green-800 dark:text-green-300 shadow-ambient flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span><span>{mensaje}</span>
          </div>
        )}

        {pendientes.length === 0 ? (
          <div className="bg-surface-container-lowest p-10 rounded-2xl shadow-ambient border border-outline-variant/10 text-center">
            <span className="material-symbols-outlined text-green-600 text-5xl">task_alt</span>
            <p className="mt-3 text-lg font-bold text-primary">¡Todo listo!</p>
            <p className="text-dato text-on-surface-variant mt-1 max-w-sm mx-auto">
              Resolviste los {total} caso{total === 1 ? "" : "s"}. El sistema volvió a verificar esas experiencias y el Excel final ya está actualizado.
            </p>
            <Link href={`/concursos/${id}/jobs/${jobId}`}
              className="inline-flex items-center gap-1.5 mt-5 primary-gradient text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-opacity hover:opacity-90">
              Ver el análisis completo <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>
        ) : (
          <>
            {/* caso enfocado: X de N + navegación */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                Caso {focoIdx + 1} de {pendientes.length}
              </span>
              {pendientes.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={focoIdx <= 0 || ocupado}
                    onClick={() => setFocoKey(keyOf(pendientes[focoIdx - 1]))}
                    className="h-8 w-8 rounded-lg border border-outline-variant/30 text-on-surface-variant disabled:opacity-30 hover:bg-surface-container-high inline-flex items-center justify-center"
                    title="Anterior"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <button
                    disabled={focoIdx >= pendientes.length - 1 || ocupado}
                    onClick={() => setFocoKey(keyOf(pendientes[focoIdx + 1]))}
                    className="h-8 w-8 rounded-lg border border-outline-variant/30 text-on-surface-variant disabled:opacity-30 hover:bg-surface-container-high inline-flex items-center justify-center"
                    title="Siguiente (sin resolver)"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              )}
            </div>

            {foco && <TarjetaRevision item={foco} onResolver={resolver} ocupado={ocupado} />}

            {/* cola: el resto de pendientes, clic para enfocar */}
            {pendientes.length > 1 && (
              <div className="mt-5">
                <p className="text-micro font-bold uppercase tracking-wide text-on-surface-variant mb-2">En cola</p>
                <div className="flex flex-wrap gap-2">
                  {pendientes.map((it, i) => (
                    <button
                      key={keyOf(it)}
                      disabled={ocupado}
                      onClick={() => setFocoKey(keyOf(it))}
                      className={`px-2.5 py-1 rounded-lg text-micro font-semibold border transition-colors disabled:opacity-50 ${
                        it === foco
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                          : "border-outline-variant/30 text-on-surface-variant hover:border-primary/40"
                      }`}
                      title={it.motivo}
                    >
                      {i + 1}. Prof {it.n_prof} · exp {it.n_exp}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {resueltos.length > 0 && (
          <div className="mt-8">
            <p className="text-micro font-bold uppercase tracking-wide text-on-surface-variant mb-2">
              Resueltas en esta corrida ({resueltos.length})
            </p>
            <ul className="space-y-1">
              {resueltos.map((it) => (
                <li key={keyOf(it)} className="text-xs text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600 text-[16px]">check_circle</span>
                  Prof {it.n_prof} · exp {it.n_exp} — {it.accion_sugerida}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </PanelShell>
  );
}
