"use client";

/** Pestaña Factores · puntaje técnico del postor por factor de las bases.
 *  Una tarjeta por factor: puntaje grande + nombre real + detalle por cargo plegable. */
import { useState } from "react";
import type { FactorResumen } from "@/lib/pivote/types";
import { TONO } from "@/lib/ui";
import { nm } from "./helpers";

function TarjetaFactor({ f }: { f: FactorResumen }) {
  const [abierto, setAbierto] = useState(false);
  const noAplica = typeof f.puntaje === "string";
  const pts = typeof f.puntaje === "number" ? f.puntaje : null;
  const detalle = nm(f.detalle) ?? "";
  // El detalle del Factor A trae "Detalle por cargo: … || … || …" — sepáralo.
  const idx = detalle.search(/Detalle por cargo:/i);
  const headline = idx >= 0 ? detalle.slice(0, idx).trim() : detalle;
  const lista = idx >= 0
    ? detalle.slice(idx).replace(/^Detalle por cargo:/i, "").split("||").map((s) => s.trim()).filter(Boolean)
    : [];
  const badge = pts && pts > 0 ? TONO.ok.chip : TONO.info.chip;
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-ambient px-4 py-3 flex gap-4">
      <div className={`flex-shrink-0 w-16 rounded-lg flex flex-col items-center justify-center py-2 ${badge}`}>
        {noAplica ? (
          <span className="text-nano font-bold uppercase leading-tight text-center">No<br/>aplica</span>
        ) : (
          <><span className="text-2xl font-bold tabular-nums leading-none">{pts}</span><span className="text-nano font-semibold uppercase">pts</span></>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary">
          Factor {nm(f.factor)}
          {f.criterio && f.criterio.trim().toLowerCase() !== `factor ${(f.factor ?? "").trim().toLowerCase()}`
            ? <span className="font-normal text-on-surface-variant"> — {nm(f.criterio)}</span> : null}
        </p>
        <p className="text-xs text-on-surface-variant leading-relaxed mt-1">{headline}</p>
        {lista.length > 0 && (
          <>
            <button onClick={() => setAbierto((x) => !x)} aria-expanded={abierto} className="mt-2 text-micro text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className={`material-symbols-outlined text-[14px] transition-transform ${abierto ? "rotate-180" : ""}`}>expand_more</span>
              {abierto ? "ocultar" : "ver"} detalle por cargo ({lista.length})
            </button>
            {abierto && (
              <ul className="mt-1.5 space-y-1">
                {lista.map((x, i) => (
                  <li key={i} className="text-micro text-on-surface-variant leading-snug pl-3 border-l-2 border-outline-variant/20">{x}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function TabFactores({ factores, puntajeTotal }: { factores: FactorResumen[]; puntajeTotal: number | null }) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold text-primary flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-xl">grading</span>
        Factores de evaluación
      </h2>
      <p className="text-xs text-on-surface-variant mb-3">
        Puntaje técnico del postor por cada factor de las bases.
        {puntajeTotal != null && <> Total: <b className="text-primary">{puntajeTotal}</b> pts.</>}
      </p>
      <div className="space-y-2.5">
        {factores.map((f, i) => <TarjetaFactor key={i} f={f} />)}
      </div>
    </section>
  );
}
