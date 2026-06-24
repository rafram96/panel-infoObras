"use client";

/** Pestaña Pasos · el pipeline de verificación con detalle expandible por etapa
 *  (métricas, observaciones, duración). La rama InfoObras ∥ SUNAT se dibuja
 *  como ramal paralelo. */
import type { Observacion, PivoteJob, ResultadoEtapa } from "@/lib/pivote/types";
import { ETAPA_LABEL, ETAPAS_ORDEN, SEVERIDAD_UI } from "@/lib/pivote/types";
import { fmtMs } from "./helpers";
import { BarraProgreso } from "@/components/BarraProgreso";

const ETAPA_UI: Record<string, { icon: string; circulo: string; texto: string }> = {
  ok: { icon: "check", circulo: "bg-green-500 text-white", texto: "text-green-600 dark:text-green-400" },
  ok_con_revision: { icon: "rule", circulo: "bg-amber-500 text-white", texto: "text-amber-600 dark:text-amber-400" },
  error_parcial: { icon: "warning", circulo: "bg-orange-500 text-white", texto: "text-orange-600 dark:text-orange-400" },
  error: { icon: "close", circulo: "bg-red-600 text-white", texto: "text-red-600 dark:text-red-400" },
  en_curso: { icon: "sync", circulo: "bg-primary text-white", texto: "text-primary" },
  pendiente: { icon: "", circulo: "bg-surface-container-high text-outline", texto: "text-outline" },
};

const ESTADO_ETAPA_LABEL: Record<string, string> = {
  ok: "Completado",
  ok_con_revision: "Completado · necesita tu revisión",
  error_parcial: "Completado con algunos errores — el resto continuó",
  error: "Falló",
  en_curso: "En curso…",
  pendiente: "Pendiente",
};

function FilaEtapa({ res, nombre, abierta, onToggle }: {
  res?: ResultadoEtapa; nombre: string; abierta: boolean; onToggle: () => void;
}) {
  const estado = res?.estado ?? "pendiente";
  const ui = ETAPA_UI[estado];
  const m = res?.metrica;
  const tieneDetalle = !!res && (m!.items_total > 0 || res.observaciones.length > 0 || !!res.error);

  return (
    <div className="rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        disabled={!tieneDetalle}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
          tieneDetalle ? "hover:bg-surface-container-high/50 cursor-pointer" : "cursor-default"
        } ${abierta ? "bg-surface-container-high/40" : ""}`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${ui.circulo}`}>
          {ui.icon ? (
            <span className={`material-symbols-outlined text-base ${estado === "en_curso" ? "animate-spin" : ""}`}>{ui.icon}</span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-current opacity-40" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[0.8125rem] font-semibold ${ui.texto}`}>{nombre}</p>
          <p className="text-[0.6875rem] text-outline">{ESTADO_ETAPA_LABEL[estado]}</p>
        </div>
        {m && m.items_total > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 text-[0.6875rem] font-bold">
              {m.items_ok}/{m.items_total}
            </span>
            {m.items_revision > 0 && (
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[0.6875rem] font-bold">
                {m.items_revision} revisión
              </span>
            )}
            {m.items_error > 0 && (
              <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 text-[0.6875rem] font-bold">
                {m.items_error} error
              </span>
            )}
            {res!.observaciones.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[0.6875rem] font-bold">
                {res!.observaciones.length} obs.
              </span>
            )}
          </div>
        )}
        {tieneDetalle && (
          <span className={`material-symbols-outlined text-outline text-[20px] transition-transform ${abierta ? "rotate-180" : ""}`}>
            expand_more
          </span>
        )}
      </button>

      {estado === "en_curso" && (
        <div className="px-3 pb-2 pl-12">
          <BarraProgreso />
        </div>
      )}

      {/* detalle expandido */}
      {abierta && res && (
        <div className="ml-11 mr-3 mb-3 p-4 rounded-lg bg-surface-container-high/30 border border-outline-variant/10 animate-[fadeIn_.2s_ease]">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-1">
            {[
              ["Items", String(res.metrica.items_total)],
              ["OK", String(res.metrica.items_ok)],
              ["A revisión", String(res.metrica.items_revision)],
              ["Con error", String(res.metrica.items_error)],
              ["Reintentos", String(res.metrica.reintentos)],
              ["Duración", fmtMs(res.metrica.duracion_ms)],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[0.625rem] font-bold uppercase tracking-wide text-slate-500">{k}</p>
                <p className="text-sm font-bold text-primary">{v}</p>
              </div>
            ))}
          </div>

          {res.error && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50">
              <p className="text-[0.75rem] font-mono text-red-700 dark:text-red-300">{res.error}</p>
            </div>
          )}

          {res.observaciones.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-[0.625rem] font-bold uppercase tracking-wide text-slate-500">
                Observaciones de este paso
              </p>
              {res.observaciones.map((o: Observacion, i) => {
                const sui = SEVERIDAD_UI[o.severidad];
                return (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`px-2 py-0.5 rounded text-[0.625rem] font-bold whitespace-nowrap ${sui.cls}`}>
                      {o.codigo ?? sui.label}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[0.75rem] text-primary leading-snug">{o.mensaje}</p>
                      {o.referencia && (
                        <p className="text-[0.6875rem] font-mono text-outline">{o.referencia}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TabPasos({ job, abiertas, onToggle }: {
  job: PivoteJob; abiertas: Set<string>; onToggle: (nombre: string) => void;
}) {
  const porEtapa = new Map(job.etapas.map((e) => [e.etapa, e]));
  const previas = ETAPAS_ORDEN.slice(0, ETAPAS_ORDEN.indexOf("infoobras"));
  const rama = ["infoobras", "sunat"] as const;
  const posteriores = ETAPAS_ORDEN.slice(ETAPAS_ORDEN.indexOf("sunat") + 1);

  return (
    <section className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 mb-8 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
        <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-xl">conveyor_belt</span>
          Pasos de la verificación
        </h2>
        <span className="text-[0.6875rem] text-outline">haz clic en un paso para ver el detalle</span>
      </div>
      <div className="p-3">
        {previas.map((nombre) => (
          <FilaEtapa key={nombre} nombre={ETAPA_LABEL[nombre]} res={porEtapa.get(nombre)}
            abierta={abiertas.has(nombre)} onToggle={() => onToggle(nombre)} />
        ))}

        {/* rama paralela */}
        <div className="my-1 ml-4 pl-3 border-l-2 border-dashed border-primary/30 relative">
          <span className="absolute -left-[1px] -top-1 -translate-x-full pr-2 text-[0.625rem] font-bold uppercase tracking-wide text-primary/60 select-none hidden sm:block" />
          <p className="px-3 pt-1 text-[0.625rem] font-bold uppercase tracking-[0.1rem] text-primary/60">
            Consultas simultáneas
          </p>
          {rama.map((nombre) => (
            <FilaEtapa key={nombre} nombre={ETAPA_LABEL[nombre]} res={porEtapa.get(nombre)}
              abierta={abiertas.has(nombre)} onToggle={() => onToggle(nombre)} />
          ))}
        </div>

        {posteriores.map((nombre) => (
          <FilaEtapa key={nombre} nombre={ETAPA_LABEL[nombre]} res={porEtapa.get(nombre)}
            abierta={abiertas.has(nombre)} onToggle={() => onToggle(nombre)} />
        ))}
      </div>
    </section>
  );
}
