"use client";

/** Pestaña Veredictos · ¿cada profesional alcanza la experiencia mínima?
 *  Una tarjeta por profesional con el resultado VERIFICADO (años efectivos vs
 *  mínimo del cargo), la explicación del descuento de paralizaciones, y el
 *  razonamiento de Claude plegable. Ordena primero los que necesitan atención. */
import { useState } from "react";
import type { ResumenAnalisis, VeredictoProfesional } from "@/lib/pivote/types";
import { nm } from "./helpers";
import { EtiquetaBases, refCargo } from "./cargo";

// El mínimo del cargo: lo expone el backend, y si no, se lee del texto de Claude.
// El evaluador lo escribe de varias formas — "≥ 24 meses requeridos", "mínimo 24
// meses", "al menos 2 años" — así que el parser tolera todas. Se ancla al
// requisito (≥ / mínimo / requeridos) para NO agarrar el total ("52.57 meses").
export function minimoAnios(v: VeredictoProfesional): number | null {
  if (v.minimo_anios != null) return v.minimo_anios;
  const t = (v.cumple_claude ?? "");
  const m =
    t.match(/(?:≥|>=|m[íi]nimo|al menos|exig\w*|requier\w*)\s*(?:de\s*)?(\d+(?:[.,]\d+)?)\s*(mes|a[ñn]o)/i) ||
    t.match(/(\d+(?:[.,]\d+)?)\s*(mes|a[ñn]o)\w*\s+(?:requerid|exigid|m[íi]nim)/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  return /mes/i.test(m[2]) ? n / 12 : n;
}

export function veredictoFinal(v: VeredictoProfesional): "cumple" | "no_cumple" | "pendiente" {
  if (!v.cumple_claude && !v.cumple_backend) return "pendiente";
  const txt = `${v.cumple_backend ?? v.cumple_claude ?? ""}`.toUpperCase();
  if (txt.includes("NO CUMPLE")) return "no_cumple";
  if (txt.includes("CUMPLE")) return "cumple";
  return "pendiente";
}

const VEREDICTO_UI = {
  cumple: { label: "Cumple", icon: "check_circle", chip: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300", borde: "border-l-green-500" },
  no_cumple: { label: "No cumple", icon: "cancel", chip: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300", borde: "border-l-red-500" },
  pendiente: { label: "Pendiente", icon: "schedule", chip: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300", borde: "border-l-amber-500" },
} as const;

function TarjetaVeredicto({ v }: { v: VeredictoProfesional }) {
  const [abierto, setAbierto] = useState(false);
  const estado = veredictoFinal(v);
  const u = VEREDICTO_UI[estado];
  const ef = v.anios_efectivos;
  const min = minimoAnios(v);
  const brutos = v.anios_brutos ?? 0;
  const huboDescuento = ef != null && Math.abs(ef - brutos) > 0.02;
  const bajoMinimo = ef != null && min != null && ef < min - 0.001;
  const c = refCargo(v.cargo, v.cargo_bases_num, v.cargo_bases_nombre);
  return (
    <div className={`bg-surface-container-lowest rounded-xl border border-outline-variant/10 border-l-4 ${u.borde} shadow-ambient px-4 py-3`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-primary">{v.n_prof}. {c.nombre}</span>
            {c.basesNum && <EtiquetaBases num={c.basesNum} full={c.basesFull} />}
          </div>
          <p className="text-xs text-outline mt-0.5">{v.nombre}</p>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${u.chip}`}>
          <span className="material-symbols-outlined text-[15px]">{u.icon}</span>{u.label}
        </span>
      </div>

      {(ef != null || min != null) && (
        <div className="mt-3 flex items-baseline gap-2 text-xs flex-wrap">
          <span className={`text-xl font-bold tabular-nums ${bajoMinimo ? "text-red-600 dark:text-red-400" : "text-primary"}`}>
            {ef != null ? ef.toFixed(2) : brutos.toFixed(2)}
          </span>
          <span className="text-on-surface-variant">años de experiencia válida</span>
          {min != null && <span className="text-outline">· mínimo del cargo <b className="tabular-nums text-on-surface-variant">{min.toFixed(2)}</b></span>}
        </div>
      )}

      {huboDescuento && (
        <p className="mt-1.5 text-xs text-on-surface-variant leading-relaxed">
          Claude contó <b className="tabular-nums">{brutos.toFixed(2)}</b> años brutos; el sistema descontó{" "}
          {v.motivo_backend ? nm(v.motivo_backend) : "tiempo no efectivo"} → quedan <b className="tabular-nums">{ef!.toFixed(2)}</b> efectivos.
        </p>
      )}

      {bajoMinimo && estado === "cumple" && (
        <p className="mt-1.5 text-[0.6875rem] text-amber-700 dark:text-amber-300 flex items-start gap-1 leading-snug">
          <span className="material-symbols-outlined text-[14px] mt-px">warning</span>
          Con días efectivos quedaría por debajo del mínimo; el sistema lo dejó como cumple de forma provisional — conviene revisarlo.
        </p>
      )}

      <button onClick={() => setAbierto((x) => !x)} className="mt-2 text-[0.6875rem] text-secondary hover:text-primary inline-flex items-center gap-1">
        <span className={`material-symbols-outlined text-[14px] transition-transform ${abierto ? "rotate-180" : ""}`}>expand_more</span>
        {abierto ? "ocultar" : "ver"} cómo lo razonó Claude
      </button>
      {abierto && (
        <p className="mt-1.5 text-xs text-on-surface-variant leading-relaxed bg-surface-container-high/40 rounded-lg p-2.5">{nm(v.cumple_claude)}</p>
      )}
    </div>
  );
}

export function TabVeredictos({ resumen }: { resumen: ResumenAnalisis }) {
  const rank = (v: VeredictoProfesional) => {
    const e = veredictoFinal(v);
    if (e === "no_cumple") return 0;
    if (e === "pendiente") return 1;
    const ef = v.anios_efectivos, mn = minimoAnios(v);
    if (ef != null && mn != null && ef < mn - 0.001) return 2; // cumple provisional
    return 3;
  };
  const vs = [...resumen.veredictos].sort((a, b) => rank(a) - rank(b) || a.n_prof - b.n_prof);
  const nC = vs.filter((v) => veredictoFinal(v) === "cumple").length;
  const nN = vs.filter((v) => veredictoFinal(v) === "no_cumple").length;
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-xl">gavel</span>
          ¿Cada profesional alcanza la experiencia mínima?
        </h2>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 font-bold">{nC} cumplen</span>
          {nN > 0 && <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold">{nN} no</span>}
          {resumen.puntaje_total != null && <span className="text-outline">· puntaje <b className="text-primary text-sm">{resumen.puntaje_total}</b></span>}
        </div>
      </div>
      <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
        El número grande son los <b>años efectivos</b> (el sistema descuenta paralizaciones de obra). Si baja del mínimo del cargo, sale en rojo. Abre cada tarjeta para ver el razonamiento de Claude.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {vs.map((v) => <TarjetaVeredicto key={v.n_prof} v={v} />)}
      </div>
    </section>
  );
}
