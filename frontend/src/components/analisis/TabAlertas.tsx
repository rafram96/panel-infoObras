"use client";

/** Pestaña Alertas · lo que el sistema detectó, agrupado por tipo y en lenguaje
 *  de evaluador. Dos secciones: "Requieren tu atención" vs "Para tu información".
 *  Cada tipo es una tarjeta-resumen (N casos + explicación) plegable a los casos. */
import { useState } from "react";
import type { AlertaResumen } from "@/lib/pivote/types";
import { nm } from "./helpers";

// Etiquetas legibles para agrupar las alertas por su código.
const ALERTA_LABEL: Record<string, string> = {
  PARALIZACION: "Obras con paralizaciones",
  VEREDICTO: "Experiencias sin veredicto",
  COBERTURA: "Cobertura de valorizaciones baja",
  INFOOBRAS: "Portal InfoObras sin responder",
  PARAL_INVALIDA: "Paralizaciones con fechas inválidas",
  ALT04: "Antigüedad del emisor inconsistente",
  PASO5: "Aviso del cálculo de días",
  NOTA9: "Traslape de periodos",
  NOTA10: "COVID declarado fuera de la ventana",
};

// Qué significa cada alerta, en palabras del evaluador (no jerga del pipeline).
const ALERTA_EXPLICACION: Record<string, string> = {
  PARALIZACION: "La obra de esta experiencia tuvo paralizaciones registradas en InfoObras. El sistema ya las descontó al calcular los años efectivos — es informativo.",
  COBERTURA: "Las valorizaciones halladas no cubren todo el periodo certificado (menos del 50%). El cálculo de días efectivos puede quedar parcial; conviene revisar el sustento.",
  PARAL_INVALIDA: "El portal devolvió una paralización con fechas invertidas (inicio después del fin). El sistema la descartó sola; no afecta el cálculo.",
  ALT04: "El emisor de la constancia figura como empresa creada DESPUÉS de la experiencia que certifica (posible inconsistencia de antigüedad). Verificar en SUNAT.",
  VEREDICTO: "Esta experiencia quedó sin veredicto del sistema porque faltó un dato (p. ej. una fecha sin confirmar). Revísala en la cola de revisión.",
  INFOOBRAS: "El portal InfoObras no respondió para esta experiencia; el cruce quedó incompleto. Suele resolverse reintentando.",
  PASO5: "Aviso del cálculo de días efectivos (Paso 5).",
  NOTA9: "Dos periodos de este profesional se superponen en el tiempo; el sistema cuenta ese tiempo una sola vez.",
  NOTA10: "El profesional declaró que el periodo incluye COVID, pero sus fechas no caen dentro de la ventana de emergencia (16/03/2020–30/06/2020). Verifica si corresponde ese descuento.",
};

// "prof=1 exp=2" → "Prof. 1 · Exp. 2" (quita la jerga del locator).
const prettyRef = (ref?: string | null) =>
  (ref ?? "").replace(/prof\s*=\s*(\d+)\s*exp\s*=\s*(\d+)/i, "Prof. $1 · Exp. $2").trim();

function GrupoAlerta({ codigo, items, alta }: { codigo: string; items: AlertaResumen[]; alta: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const label = ALERTA_LABEL[codigo] ?? codigo;
  const explica = ALERTA_EXPLICACION[codigo];
  // Si el mensaje es idéntico en todos los casos, ya está en la explicación de arriba:
  // mostramos solo los locators (chips), no 10 párrafos repetidos.
  const mensajeComun = new Set(items.map((a) => a.mensaje)).size === 1;
  return (
    <div className={`rounded-xl border overflow-hidden ${
      alta ? "border-red-500/25 bg-red-50/40 dark:bg-red-950/15" : "border-outline-variant/10 bg-surface-container-lowest"
    }`}>
      <button onClick={() => setAbierto((v) => !v)} className="w-full text-left px-4 py-3 flex items-start gap-3">
        <span className={`material-symbols-outlined text-[20px] mt-0.5 ${alta ? "text-red-500" : "text-secondary"}`}>
          {alta ? "warning" : "info"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-primary">{label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[0.625rem] font-bold tabular-nums ${
              alta ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-surface-container-high text-on-surface-variant"
            }`}>{items.length} {items.length === 1 ? "caso" : "casos"}</span>
          </div>
          {explica && <p className="text-xs text-on-surface-variant leading-relaxed mt-1">{explica}</p>}
        </div>
        <span className={`material-symbols-outlined text-outline text-[18px] transition-transform ${abierto ? "rotate-180" : ""}`}>expand_more</span>
      </button>
      {abierto && (mensajeComun ? (
        <div className="border-t border-outline-variant/10 px-4 py-3 pl-12 flex flex-wrap gap-1.5">
          {items.map((a) => (
            <span key={a.id} title={a.fuente ?? undefined}
              className="px-2 py-0.5 rounded-md bg-surface-container-high text-[0.625rem] font-medium text-on-surface-variant whitespace-nowrap">
              {prettyRef(a.referencia) || nm(a.mensaje)}
            </span>
          ))}
        </div>
      ) : (
        <ul className="border-t border-outline-variant/10 divide-y divide-outline-variant/10">
          {items.map((a) => (
            <li key={a.id} className="px-4 py-2.5 pl-12">
              <p className="text-xs text-on-surface leading-snug">{nm(a.mensaje)}</p>
              {(a.referencia || a.fuente) && (
                <p className="text-[0.625rem] text-outline mt-0.5">
                  {prettyRef(a.referencia)}{a.fuente ? <> · <span className="font-medium">{a.fuente}</span></> : null}
                </p>
              )}
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

export function TabAlertas({ alertas }: { alertas: AlertaResumen[] }) {
  const porCodigo = (sevs: string[]) => {
    const m = new Map<string, AlertaResumen[]>();
    for (const a of alertas) {
      if (!sevs.includes(a.severidad)) continue;
      const cod = a.codigo || "OTRAS";
      const arr = m.get(cod);
      if (arr) arr.push(a); else m.set(cod, [a]);
    }
    return [...m.entries()].sort((x, y) => y[1].length - x[1].length);
  };
  const altas = porCodigo(["critica", "alerta"]);
  const infos = porCodigo(["advertencia", "info"]);
  const nA = altas.reduce((s, [, it]) => s + it.length, 0);
  const nI = infos.reduce((s, [, it]) => s + it.length, 0);
  return (
    <section className="mb-8 space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-primary flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-xl text-red-500">warning</span>
          Requieren tu atención{nA > 0 && <span className="text-xs text-red-600 dark:text-red-400 font-bold">· {nA}</span>}
        </h2>
        {altas.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container-lowest rounded-xl border border-outline-variant/10 px-4 py-3">
            <span className="material-symbols-outlined text-green-600 text-lg">check_circle</span>
            Nada crítico — el sistema no halló inconsistencias que exijan tu revisión.
          </div>
        ) : (
          <div className="space-y-2">
            {altas.map(([cod, items]) => <GrupoAlerta key={cod} codigo={cod} items={items} alta />)}
          </div>
        )}
      </div>
      {infos.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-on-surface-variant flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-xl text-secondary">info</span>
            Para tu información <span className="text-xs text-outline font-bold">· {nI}</span>
          </h2>
          <div className="space-y-2">
            {infos.map(([cod, items]) => <GrupoAlerta key={cod} codigo={cod} items={items} alta={false} />)}
          </div>
        </div>
      )}
    </section>
  );
}
