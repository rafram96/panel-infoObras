"use client";

/** La tarjeta de UN caso de revisión humana: todo el contexto para decidir sin
 *  abrir nada más (profesional, obra, fechas, motivo) + las acciones (elegir un
 *  candidato CUI, pegar el CUI a mano, o marcar "no existe"). */
import { useState } from "react";
import type { ItemRevision } from "@/lib/pivote/types";
import { ETAPA_LABEL, fmtFechasEnTexto } from "@/lib/pivote/types";

export function TarjetaRevision({ item, onResolver, ocupado }: {
  item: ItemRevision;
  onResolver: (item: ItemRevision, dato: { cui?: string; accion?: string }) => Promise<void>;
  ocupado: boolean;
}) {
  const [cuiManual, setCuiManual] = useState("");

  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-ambient border border-outline-variant/10 border-l-4 border-l-amber-500 overflow-hidden">
      {/* contexto */}
      <div className="px-6 pt-5 pb-4 border-b border-outline-variant/10">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-micro font-bold">
            Profesional {item.n_prof} · Experiencia {item.n_exp}
          </span>
          <span className="text-micro text-on-surface-variant">
            detectado en: <b>{ETAPA_LABEL[item.etapa]}</b>
          </span>
        </div>
        <p className="text-base font-semibold text-primary">
          {item.profesional ?? `Profesional ${item.n_prof}`}
          {item.cargo && <span className="font-normal text-on-surface-variant"> — {item.cargo}</span>}
        </p>
        {item.proyecto && <p className="text-sm mt-1 text-on-surface">{item.proyecto}</p>}
        {item.fechas && <p className="text-xs text-on-surface-variant mt-0.5">{fmtFechasEnTexto(item.fechas)}</p>}
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 px-3 py-2">
          <span className="material-symbols-outlined text-[18px] text-amber-600 dark:text-amber-400 mt-px">help</span>
          <p className="text-dato text-amber-800 dark:text-amber-200 leading-snug">{item.motivo}</p>
        </div>
      </div>

      {/* acciones */}
      <div className="px-6 py-5 space-y-4">
        {item.candidatos.length > 0 && (
          <div className="space-y-2">
            <p className="text-micro font-bold uppercase tracking-wide text-on-surface-variant">
              Obras candidatas — elige la correcta:
            </p>
            {item.candidatos.map((c) => (
              <button
                key={c.cui}
                disabled={ocupado}
                onClick={() => onResolver(item, { cui: c.cui })}
                className="w-full text-left p-3 rounded-xl border border-outline-variant/30 hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-micro font-bold ${
                    c.score >= 60
                      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}>
                    {c.score}%
                  </span>
                  <span className="font-mono text-xs text-primary font-bold">CUI {c.cui}</span>
                  <span className="flex-1 text-dato truncate">{c.nombre_obra}</span>
                  {c.departamento && <span className="text-micro text-on-surface-variant">{c.departamento}</span>}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={cuiManual}
            onChange={(e) => setCuiManual(e.target.value.replace(/\D/g, ""))}
            placeholder={item.candidatos.length > 0 ? "…o pega el CUI a mano" : "Pega el CUI de la obra"}
            className="h-10 px-3 rounded-lg bg-surface border border-outline-variant/30 text-dato font-mono w-48 focus:outline-none focus:border-primary/50"
          />
          <button
            disabled={ocupado || cuiManual.length < 4}
            onClick={() => onResolver(item, { cui: cuiManual })}
            className="h-10 px-4 rounded-lg primary-gradient text-white text-xs font-bold disabled:opacity-40 transition-opacity hover:opacity-90"
          >
            Confirmar CUI
          </button>
          <div className="flex-1" />
          <button
            disabled={ocupado}
            onClick={() => onResolver(item, { accion: "no_existe" })}
            className="h-10 px-3 rounded-lg border border-outline-variant/40 text-on-surface-variant text-xs font-semibold hover:bg-surface-container-high disabled:opacity-40"
          >
            No existe en InfoObras
          </button>
        </div>
      </div>
    </div>
  );
}
