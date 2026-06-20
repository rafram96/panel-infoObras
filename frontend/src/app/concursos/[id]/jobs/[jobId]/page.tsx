"use client";

/** P3 · Job en vivo — pipeline de 8 etapas con DETALLE expandible por etapa
 *  (métricas, observaciones, duración) + P5 · Resumen del análisis
 *  (veredictos Claude→backend, alertas con decisión, factores, entregables). */
import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PanelShell from "@/components/PanelShell";
import {
  type AlertaResumen, type Observacion, type PivoteJob, type ResultadoEtapa,
  type ResumenAnalisis, type SaludPortal,
  ETAPA_LABEL, ETAPAS_ORDEN, JOB_ESTADO_UI, SEVERIDAD_UI, fmtFecha, pendientesHumano,
} from "@/lib/pivote/types";

// ── presentación por estado de etapa ─────────────────────────────────────────
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

function fmtMs(ms?: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)} s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

// Normaliza el guion largo "—" → "-" en textos de datos (Claude/backend lo usan
// como separador; el evaluador lo prefiere sin ese símbolo). NO afecta los "—"
// de valores vacíos (esos son literales, no pasan por aquí).
const nm = (s?: string | null) => (s == null ? s : s.replace(/—/g, "-"));

// Etiquetas legibles para agrupar las alertas por su código.
const ALERTA_LABEL: Record<string, string> = {
  PARALIZACION: "Paralizaciones / gaps",
  VEREDICTO: "Sin veredicto",
  COBERTURA: "Cobertura baja",
  INFOOBRAS: "Portal sin responder",
  PASO5: "Días efectivos",
  NOTA9: "Traslapes",
};

// ── tarjeta métrica (mismo patrón del dashboard) ─────────────────────────────
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

// ── fila de etapa con detalle expandible ─────────────────────────────────────
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

// ── extracción: profesionales + experiencias (patrón del panel legacy) ──────
interface ExpBreve {
  n: number; proyecto: string; entidad_emisora: string; cargo_ocupado: string;
  fecha_inicial: string; fecha_final: string; dias: number | null;
  cui?: string | null; incluye_covid?: string; traslape?: string | null; folio?: string;
}
interface ProfBreve {
  n_prof: number; cargo: string; nombre: string; dni?: string; colegiatura?: string;
  notas?: string[];
  cumple?: string | null; total?: { dias?: number; anios?: number };
  experiencias: ExpBreve[];
}

function FilaProfesional({ prof }: { prof: ProfBreve }) {
  const [expanded, setExpanded] = useState(false);
  const sinVeredicto = !prof.cumple;
  const noCumple = (prof.cumple ?? "").toUpperCase().includes("NO CUMPLE");

  return (
    <>
      <tr
        onClick={() => setExpanded((v) => !v)}
        className="hover:bg-surface-container-high/40 transition-colors cursor-pointer"
      >
        <td className="px-3 py-2 text-xs font-mono text-secondary">{prof.n_prof}</td>
        <td className="px-3 py-2">
          <span className="text-sm font-medium text-primary">{prof.cargo}</span>
        </td>
        <td className="px-3 py-2 text-sm text-on-surface">
          <div className="flex items-center gap-1.5">
            <span>{prof.nombre}</span>
            {prof.notas && prof.notas.length > 0 && (
              <span
                className="material-symbols-outlined text-[15px] text-amber-500 cursor-help"
                title={prof.notas.join("\n")}
              >
                warning
              </span>
            )}
          </div>
          {prof.dni && <span className="text-[11px] text-outline font-mono">DNI {prof.dni}</span>}
        </td>
        <td className="px-3 py-2 text-xs text-secondary">{prof.colegiatura ?? "—"}</td>
        <td className="px-3 py-2 text-xs text-secondary tabular-nums">{prof.experiencias.length}</td>
        <td className="px-3 py-2 text-xs text-secondary tabular-nums">
          {prof.total?.anios != null ? prof.total.anios.toFixed(2) : "—"}
        </td>
        <td className="px-3 py-2">
          {sinVeredicto ? (
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Pendiente
            </span>
          ) : noCumple ? (
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
              No cumple
            </span>
          ) : (
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
              Cumple
            </span>
          )}
        </td>
        <td className="px-3 py-2 text-right">
          <span className={`material-symbols-outlined text-outline text-[18px] transition-transform ${expanded ? "rotate-180" : ""}`}>
            expand_more
          </span>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={8} className="px-3 py-0">
            <div className="py-3 px-4 mb-2 bg-surface-container-low rounded-lg space-y-4"
              style={{ animation: "fadeIn 0.2s ease-out" }}>
              {/* Datos del profesional */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">person</span>
                  Datos del profesional
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {[
                    { label: "Nombre", value: prof.nombre },
                    { label: "DNI", value: prof.dni },
                    { label: "Colegiatura", value: prof.colegiatura },
                    { label: "Total días (brutos)", value: prof.total?.dias != null ? String(prof.total.dias) : undefined },
                    { label: "Veredicto", value: prof.cumple ?? "pendiente de revisión" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="text-on-surface font-medium">
                        {value || <span className="text-slate-300">—</span>}
                      </p>
                    </div>
                  ))}
                </div>
                {prof.notas && prof.notas.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      Notas de extracción (Claude)
                    </p>
                    <ul className="list-disc pl-5 space-y-0.5 text-xs text-on-surface-variant">
                      {prof.notas.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Experiencias */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">description</span>
                  Experiencias ({prof.experiencias.length})
                </p>
                <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-outline-variant/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-container-high">
                      <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-1.5">#</th>
                        <th className="px-3 py-1.5">Proyecto u obra</th>
                        <th className="px-3 py-1.5">Emisor</th>
                        <th className="px-3 py-1.5">Cargo ocupó</th>
                        <th className="px-3 py-1.5">Periodo</th>
                        <th className="px-3 py-1.5 text-right">Días</th>
                        <th className="px-3 py-1.5">Marcas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {prof.experiencias.map((e) => (
                        <tr key={e.n} className="hover:bg-surface-container-high/30">
                          <td className="px-3 py-2 font-mono text-secondary">{e.n}</td>
                          <td className="px-3 py-2 text-on-surface max-w-[280px]">
                            <p className="truncate" title={e.proyecto}>{e.proyecto}</p>
                            {e.cui && <p className="font-mono text-[10px] text-secondary">CUI {e.cui}</p>}
                          </td>
                          <td className="px-3 py-2 text-secondary max-w-[160px] truncate" title={e.entidad_emisora}>
                            {e.entidad_emisora}
                          </td>
                          <td className="px-3 py-2 text-secondary">{e.cargo_ocupado}</td>
                          <td className="px-3 py-2 text-secondary whitespace-nowrap">
                            {fmtFecha(e.fecha_inicial)} → {fmtFecha(e.fecha_final)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-on-surface">{e.dias ?? "—"}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {(e.incluye_covid ?? "").startsWith("S") && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">COVID</span>
                              )}
                              {(e.traslape ?? "").startsWith("S") && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">TRASLAPE</span>
                              )}
                              {e.folio && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-container-high text-slate-500">f.{e.folio}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── alertas: decisión inline (sin window.prompt) ─────────────────────────────
function FilaAlerta({ a, onDecidir }: {
  a: AlertaResumen; onDecidir: (a: AlertaResumen, relevante: boolean, razon?: string) => void;
}) {
  const [descartando, setDescartando] = useState(false);
  const [razon, setRazon] = useState("");
  const sui = SEVERIDAD_UI[a.severidad];

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className={`px-2.5 py-0.5 rounded text-[0.6875rem] font-bold whitespace-nowrap ${sui.cls}`}>
          {a.codigo}
        </span>
        <div className="flex-1 min-w-[240px]">
          <p className="text-sm text-primary leading-snug">{nm(a.mensaje)}</p>
          <p className="text-[0.6875rem] text-outline mt-1">
            {a.referencia}{a.fuente ? <> · <span className="font-medium">{a.fuente}</span></> : null}
          </p>
        </div>
        {a.decision ? (
          <span className={`px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold ${
            a.decision.relevante
              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
              : "bg-surface-container-high text-on-surface-variant"
          }`}>
            <span className="material-symbols-outlined text-[14px] align-text-bottom mr-1">
              {a.decision.relevante ? "flag" : "block"}
            </span>
            {a.decision.relevante ? "Relevante" : `Descartada${a.decision.razon ? ` — ${a.decision.razon}` : ""}`}
          </span>
        ) : !descartando ? (
          <div className="flex gap-2">
            <button
              onClick={() => onDecidir(a, true)}
              className="px-3 h-8 rounded-lg primary-gradient text-white text-[0.6875rem] font-bold hover:opacity-90"
            >
              Relevante
            </button>
            <button
              onClick={() => setDescartando(true)}
              className="px-3 h-8 rounded-lg border border-outline-variant/30 text-on-surface-variant text-[0.6875rem] font-bold hover:bg-surface-container-high"
            >
              Descartar…
            </button>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <input
              autoFocus
              value={razon}
              onChange={(e) => setRazon(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && razon.trim()) onDecidir(a, false, razon.trim()); }}
              placeholder="razón (queda en el expediente)"
              className="h-8 px-3 rounded-lg bg-surface border border-outline-variant/30 text-[0.75rem] w-56 focus:outline-none focus:border-primary/50"
            />
            <button
              disabled={!razon.trim()}
              onClick={() => onDecidir(a, false, razon.trim())}
              className="px-3 h-8 rounded-lg bg-primary text-on-primary text-[0.6875rem] font-bold disabled:opacity-40"
            >
              OK
            </button>
            <button
              onClick={() => setDescartando(false)}
              className="material-symbols-outlined text-outline text-[18px]"
            >
              close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── página ────────────────────────────────────────────────────────────────────
export default function JobPivote({ params }: { params: Promise<{ id: string; jobId: string }> }) {
  const { id, jobId } = use(params);
  const [job, setJob] = useState<PivoteJob | null>(null);
  const [resumen, setResumen] = useState<ResumenAnalisis | null>(null);
  const [profesionales, setProfesionales] = useState<ProfBreve[] | null>(null);
  const [salud, setSalud] = useState<SaludPortal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"pasos" | "profesionales" | "veredictos" | "factores" | "alertas" | "descargas">("profesionales");
  const [filtroCod, setFiltroCod] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargar = useCallback(async () => {
    const r = await fetch(`/api/pivote/jobs/${jobId}`);
    if (!r.ok) { setError("Análisis no encontrado"); return; }
    const j: PivoteJob = await r.json();
    setJob(j);
    if (j.estado === "completado" || j.estado === "requiere_revision") {
      const [rr, re] = await Promise.all([
        fetch(`/api/pivote/jobs/${jobId}/resumen`),
        fetch(`/api/pivote/jobs/${jobId}/espejo`),
      ]);
      if (rr.ok) setResumen(await rr.json());
      if (re.ok) setProfesionales((await re.json()).profesionales);
    }
  }, [jobId]);

  useEffect(() => {
    cargar();
    fetch("/api/pivote/salud").then(async (r) => { if (r.ok) setSalud(await r.json()); });
  }, [cargar]);

  // polling mientras corre (el backend real además empuja ProgresoJob por WS)
  useEffect(() => {
    if (job?.estado === "en_proceso" || job?.estado === "recibido") {
      timerRef.current = setInterval(cargar, 2500);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [job?.estado, cargar]);

  const decidirAlerta = async (a: AlertaResumen, relevante: boolean, razon?: string) => {
    const r = await fetch(`/api/pivote/jobs/${jobId}/alertas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alerta_id: a.id, relevante, razon }),
    });
    if (r.ok) setResumen(await r.json());
  };

  if (error) return <PanelShell title="Análisis"><p className="text-sm text-red-600">{error}</p></PanelShell>;
  if (!job) return <PanelShell title="Análisis"><p className="text-sm text-outline">Cargando…</p></PanelShell>;

  const ui = JOB_ESTADO_UI[job.estado];
  const pend = pendientesHumano(job);
  const porEtapa = new Map(job.etapas.map((e) => [e.etapa, e]));
  const completas = job.etapas.filter((e) => ["ok", "ok_con_revision", "error_parcial"].includes(e.estado)).length;
  const pct = Math.round((completas / ETAPAS_ORDEN.length) * 100);
  const activo = job.estado === "en_proceso" || job.estado === "recibido";
  const criticas = resumen?.alertas.filter((x) => x.severidad === "critica").length ?? 0;
  const nAlertas = resumen?.alertas.length ?? 0;
  const portalesCaidos = salud.filter((s) => !s.ok);
  const ver = resumen?.veredictos ?? [];
  const veredictoTxt = (v: { cumple_backend?: string | null; cumple_claude?: string | null }) =>
    `${v.cumple_backend ?? v.cumple_claude ?? ""}`.toUpperCase();
  const noCumplen = ver.filter((v) => veredictoTxt(v).includes("NO CUMPLE")).length;
  const cumplen = ver.filter((v) => veredictoTxt(v).includes("CUMPLE") && !veredictoTxt(v).includes("NO CUMPLE")).length;
  const gruposAlerta = (() => {
    const m = new Map<string, { cod: string; n: number; sev: string }>();
    for (const a of resumen?.alertas ?? []) {
      const cod = a.codigo || "OTRAS";
      const g = m.get(cod) ?? { cod, n: 0, sev: a.severidad };
      g.n++;
      if (a.severidad === "alerta" || a.severidad === "critica") g.sev = a.severidad;
      m.set(cod, g);
    }
    const ord: Record<string, number> = { critica: 0, alerta: 1, advertencia: 2 };
    return [...m.values()].sort((x, y) => (ord[x.sev] ?? 3) - (ord[y.sev] ?? 3) || y.n - x.n);
  })();

  const toggle = (nombre: string) =>
    setAbiertas((prev) => {
      const s = new Set(prev);
      if (s.has(nombre)) s.delete(nombre); else s.add(nombre);
      return s;
    });

  // tramos para render: antes de la rama ∥, la rama, después
  const previas = ETAPAS_ORDEN.slice(0, ETAPAS_ORDEN.indexOf("infoobras"));
  const rama = ["infoobras", "sunat"] as const;
  const posteriores = ETAPAS_ORDEN.slice(ETAPAS_ORDEN.indexOf("sunat") + 1);

  return (
    <PanelShell title={job.postor ?? job.analisis_id} subtitle={job.concurso ?? undefined}>
      {/* barra superior */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link href={`/concursos/${id}`} className="inline-flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-base">arrow_back</span> Expediente
        </Link>
        <span className={`px-2.5 py-0.5 rounded text-[0.6875rem] font-semibold ${ui.cls}`}>{ui.label}</span>
        {job.origen === "mcp" && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-primary/10 text-primary text-[0.6875rem] font-semibold"
            title="Llegó automáticamente desde la sesión de Claude">
            <span className="material-symbols-outlined text-[14px]">bolt</span> desde Claude
          </span>
        )}
        <span className="text-xs font-mono text-outline">{job.analisis_id}</span>
      </div>

      {/* métricas — lo más relevante según el estado del análisis */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {resumen ? (
          <>
            <MetricCard icon="verified" label="Profesionales que cumplen"
              value={`${cumplen}/${ver.length}`}
              borde={noCumplen > 0 ? "border-red-500" : cumplen > 0 ? "border-green-500" : "border-primary"} />
            <MetricCard icon="grading" label="Puntaje técnico"
              value={resumen.puntaje_total != null ? String(resumen.puntaje_total) : "—"} />
          </>
        ) : (
          <>
            <MetricCard icon="conveyor_belt" label="Pasos" value={`${completas}/${ETAPAS_ORDEN.length}`} />
            <MetricCard icon="speed" label="Progreso" value={`${pct}%`} />
          </>
        )}
        <MetricCard
          icon="notification_important" label="Alertas"
          value={resumen ? String(nAlertas) : "—"}
          accent={criticas > 0 ? "rojo" : undefined}
          borde={criticas > 0 ? "border-red-500" : "border-primary"}
        />
        <MetricCard
          icon="pending_actions" label="Por confirmar"
          value={String(pend)}
          accent={pend > 0 ? "ambar" : undefined}
          borde={pend > 0 ? "border-amber-500" : "border-primary"}
        />
      </section>

      {/* CTA · casos por confirmar — acceso directo (sin cazar pestañas) */}
      {pend > 0 && (
        <Link href={`/concursos/${id}/jobs/${jobId}/revision`}
          className="group mb-6 flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 px-5 py-4 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors">
          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">pending_actions</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {pend} {pend === 1 ? "caso espera tu decisión" : "casos esperan tu decisión"}
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/70">
              Al confirmar, el sistema re-verifica solo esa experiencia y regenera el Excel/ZIP.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 dark:text-amber-300 group-hover:gap-2 transition-all whitespace-nowrap">
            Resolver <span className="material-symbols-outlined text-base">arrow_forward</span>
          </span>
        </Link>
      )}

      {/* banner de salud de portales */}
      {portalesCaidos.length > 0 && (
        <div className="mb-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-600">cloud_off</span>
          <div className="text-sm text-red-700 dark:text-red-300">
            {portalesCaidos.map((p) => (
              <p key={p.portal}>
                <b>{p.portal.toUpperCase()}</b> no responde{p.diagnostico ? ` (${p.diagnostico})` : ""} —
                esas consultas quedan en espera; el resto de la verificación continúa.
              </p>
            ))}
          </div>
        </div>
      )}

      {/* barra de progreso con shimmer mientras corre */}
      {activo && (
        <div className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 p-5 mb-6">
          <div className="relative h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            <div className="absolute inset-y-0 left-0 overflow-hidden rounded-full" style={{ width: `${pct}%` }}>
              <div className="absolute inset-0 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-outline">
              {ETAPA_LABEL[job.etapas.find((e) => e.estado === "en_curso")?.etapa ?? "ingesta"]}…
            </span>
            <span className="text-sm font-bold text-primary">{pct}%</span>
          </div>
        </div>
      )}

      {/* ── PESTAÑAS (subvistas) ── */}
      <nav className="flex flex-wrap gap-1 mb-6 border-b border-outline-variant/10">
        {([
          ["pasos", "Pasos", "conveyor_belt", null],
          ["profesionales", "Profesionales", "groups", profesionales?.length ?? null],
          ["veredictos", "Veredictos", "gavel", resumen?.veredictos.length ?? null],
          ["factores", "Factores", "grading", null],
          ["alertas", "Alertas", "notification_important", nAlertas || null],
          ["descargas", "Descargas", "download", null],
        ] as const).map(([id, label, icon, badge]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-primary"}`}>
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            {label}
            {badge != null && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-surface-container-high text-[0.625rem] font-bold text-outline">{badge}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ── PIPELINE con detalle por etapa ── */}
      {tab === "pasos" && (
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
              abierta={abiertas.has(nombre)} onToggle={() => toggle(nombre)} />
          ))}

          {/* rama paralela */}
          <div className="my-1 ml-4 pl-3 border-l-2 border-dashed border-primary/30 relative">
            <span className="absolute -left-[1px] -top-1 -translate-x-full pr-2 text-[0.625rem] font-bold uppercase tracking-wide text-primary/60 select-none hidden sm:block" />
            <p className="px-3 pt-1 text-[0.625rem] font-bold uppercase tracking-[0.1rem] text-primary/60">
              Consultas simultáneas
            </p>
            {rama.map((nombre) => (
              <FilaEtapa key={nombre} nombre={ETAPA_LABEL[nombre]} res={porEtapa.get(nombre)}
                abierta={abiertas.has(nombre)} onToggle={() => toggle(nombre)} />
            ))}
          </div>

          {posteriores.map((nombre) => (
            <FilaEtapa key={nombre} nombre={ETAPA_LABEL[nombre]} res={porEtapa.get(nombre)}
              abierta={abiertas.has(nombre)} onToggle={() => toggle(nombre)} />
          ))}
        </div>
      </section>
      )}

      {/* ── EXTRACCIÓN · profesionales y experiencias (patrón legacy) ── */}
      {tab === "profesionales" && profesionales && profesionales.length > 0 && (
        <section className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 mb-8 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
            <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">groups</span>
              Extracción: profesionales y experiencias
            </h2>
            <span className="text-[0.6875rem] text-outline">
              {profesionales.length} profesionales · clic en una fila para el detalle
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-high">
                <tr>
                  {["#", "Cargo", "Profesional", "Colegiatura", "Exps", "Años", "Veredicto", ""].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {profesionales.map((p) => <FilaProfesional key={p.n_prof} prof={p} />)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── ENTREGABLES ── */}
      {tab === "descargas" && (job.excel_final || job.zip_infoobras || pend > 0) && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient border border-outline-variant/10 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-xl">table_view</span>
              <h3 className="text-sm font-semibold">Excel final enriquecido</h3>
            </div>
            <p className="text-xs text-outline leading-relaxed">
              El Formato de Evaluación completo: la evaluación de Claude, la Base de Datos y
              una hoja por profesional con sus días efectivos. Amarillo = Claude · naranja = verificado.
            </p>
            {job.excel_final ? (
              <a href={job.excel_final} download
                className="mt-auto self-start inline-flex items-center gap-1.5 primary-gradient text-white text-xs font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90">
                <span className="material-symbols-outlined text-base">download</span> Descargar .xlsx
              </a>
            ) : (
              <span className="mt-auto text-xs font-medium text-outline">Disponible al completar</span>
            )}
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient border border-outline-variant/10 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-xl">folder_zip</span>
              <h3 className="text-sm font-semibold">ZIP documentos InfoObras</h3>
            </div>
            <p className="text-xs text-outline leading-relaxed">
              Los documentos oficiales de cada obra (cronogramas, valorizaciones, expediente)
              en carpetas por profesional y experiencia — para revisarlos tú mismo.
            </p>
            {job.zip_infoobras ? (
              <a href={job.zip_infoobras} download
                className="mt-auto self-start inline-flex items-center gap-1.5 primary-gradient text-white text-xs font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90">
                <span className="material-symbols-outlined text-base">download</span> Descargar .zip
              </a>
            ) : (
              <span className="mt-auto text-xs font-medium text-outline">Disponible al completar</span>
            )}
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient border border-outline-variant/10 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-xl">pending_actions</span>
              <h3 className="text-sm font-semibold">Revisión humana</h3>
            </div>
            <p className="text-xs text-outline leading-relaxed">
              {pend > 0
                ? `${pend} experiencia${pend > 1 ? "s" : ""} esperan tu decisión (obras por identificar, firmantes). Al resolverlas se verifica de nuevo solo esa experiencia.`
                : "Sin pendientes — todo se verificó automáticamente."}
            </p>
            {pend > 0 ? (
              <Link href={`/concursos/${id}/jobs/${jobId}/revision`}
                className="mt-auto self-start inline-flex items-center gap-1.5 bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90">
                <span className="material-symbols-outlined text-base">checklist</span> Resolver ahora
              </Link>
            ) : (
              <span className="mt-auto text-xs font-medium text-green-600 inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-base">task_alt</span> Cola limpia
              </span>
            )}
          </div>
        </section>
      )}

      {/* ── P5 · RESUMEN ── */}
      {resumen && (
        <>
          {/* veredictos */}
          {tab === "veredictos" && (
          <section className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 mb-8 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
              <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">gavel</span>
                Veredictos: lo que evaluó Claude y lo que verificó el sistema
              </h2>
              {resumen.puntaje_total != null && (
                <span className="text-xs text-outline">
                  Puntaje técnico: <span className="text-lg font-bold text-primary align-middle">{resumen.puntaje_total}</span>
                </span>
              )}
            </div>
            <div className="divide-y divide-outline-variant/10">
              {resumen.veredictos.map((v) => {
                const invertido = !!v.cumple_backend;
                return (
                  <div key={v.n_prof} className={`px-5 py-4 ${invertido ? "bg-red-50/50 dark:bg-red-950/15 border-l-4 border-red-500" : ""}`}>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-semibold text-primary">{v.n_prof}. {v.cargo}</span>
                      <span className="text-xs text-outline">{v.nombre}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-yellow-100/80 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200 text-[0.75rem] font-semibold">
                        Claude · {v.cumple_claude}
                      </span>
                      <span className="material-symbols-outlined text-base text-outline">trending_flat</span>
                      {invertido ? (
                        <span className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[0.75rem] font-bold">
                          Verificado · {v.cumple_backend}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200 text-[0.75rem] font-semibold">
                          Verificado · confirma{v.anios_efectivos != null ? ` (${v.anios_efectivos} años efectivos)` : ""}
                        </span>
                      )}
                    </div>
                    {v.motivo_backend && (
                      <p className="mt-2 text-xs text-outline leading-relaxed">
                        <span className="material-symbols-outlined text-[14px] align-text-bottom mr-1">subdirectory_arrow_right</span>
                        {nm(v.motivo_backend)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
          )}

          {/* alertas */}
          {tab === "alertas" && (
          <section className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 mb-8 overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/10">
              <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">notification_important</span>
                Alertas: la máquina detecta, tú decides
              </h2>
            </div>
            {gruposAlerta.length > 0 && (
              <div className="px-5 py-3 flex flex-wrap items-center gap-2 border-b border-outline-variant/10">
                {gruposAlerta.map((g) => {
                  const activo = filtroCod === g.cod;
                  const alta = g.sev === "alerta" || g.sev === "critica";
                  return (
                    <button key={g.cod} onClick={() => setFiltroCod(activo ? null : g.cod)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        activo
                          ? "border-primary bg-primary/15 text-primary"
                          : alta
                            ? "border-red-500/30 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 hover:border-red-500/60"
                            : "border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:border-amber-500/60"
                      }`}>
                      <span className="font-bold tabular-nums">{g.n}</span>
                      {ALERTA_LABEL[g.cod] ?? g.cod}
                    </button>
                  );
                })}
                {filtroCod && (
                  <button onClick={() => setFiltroCod(null)}
                    className="ml-1 text-xs text-outline hover:text-primary underline">ver todas</button>
                )}
              </div>
            )}
            <div className="divide-y divide-outline-variant/10">
              {[...resumen.alertas]
                .filter((a) => !filtroCod || (a.codigo || "OTRAS") === filtroCod)
                .sort((a, b) => SEVERIDAD_UI[a.severidad].orden - SEVERIDAD_UI[b.severidad].orden)
                .map((a) => <FilaAlerta key={a.id} a={a} onDecidir={decidirAlerta} />)}
            </div>
          </section>
          )}

          {/* factores */}
          {tab === "factores" && (
          <section className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/10">
              <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">grading</span>
                Factores de evaluación
              </h2>
            </div>
            <table className="w-full text-left">
              <thead className="bg-surface-container-high">
                <tr>
                  {["Factor", "Detalle", "Puntaje"].map((h) => (
                    <th key={h} className="px-5 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-slate-500 last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {resumen.factores.map((f, i) => (
                  <tr key={i} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="px-5 py-3 text-sm text-primary font-medium">{nm(f.factor)}</td>
                    <td className="px-5 py-3 text-xs text-outline">{nm(f.detalle)}</td>
                    <td className="px-5 py-3 text-right">
                      {typeof f.puntaje === "number" ? (
                        <span className="text-sm font-bold text-primary">{f.puntaje}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-surface-container-high text-[0.6875rem] font-semibold text-outline">{f.puntaje ?? "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          )}
        </>
      )}
    </PanelShell>
  );
}
