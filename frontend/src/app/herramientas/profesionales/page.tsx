"use client";

import { useState, type FormEvent } from "react";
import PanelShell from "@/components/PanelShell";

interface SenalCruce {
  severidad: "critica" | "observacion" | "informativa";
  fuente: string;
  mensaje: string;
}

interface ResultadoCruceExperiencia {
  nombre_profesional: string;
  cargo_postulado: string;
  proyecto: string;
  cargo_experiencia: string | null;
  cui: string | null;
  folio: string | null;
  fecha_inicio_cert: string | null;
  fecha_fin_cert: string | null;
  obra_encontrada: boolean;
  nombre_obra_infoobras: string | null;
  fecha_inicio_obra: string | null;
  fecha_fin_obra: string | null;
  estado_obra: string | null;
  aplica_verif_nominal: boolean;
  nombre_coincide: boolean | null;
  score_nombre: number | null;
  nombre_encontrado_infoobras: string | null;
  periodo_valido: boolean | null;
  paralizaciones: { anio: number; mes: number; estado: string; dias: number }[];
  dias_paralizado_en_periodo: number;
  senales: SenalCruce[];
}

interface CruceResponse {
  ok: boolean;
  extraction_job_id: string;
  tdr_job_id: string;
  cruces: ResultadoCruceExperiencia[];
  cuis_consultados: number;
  cuis_no_encontrados: string[];
  senales_globales: SenalCruce[];
  total_experiencias: number;
  total_alertas: number;
}

const SEVERIDAD_FILL: Record<SenalCruce["severidad"], string> = {
  critica: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800/50",
  observacion: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/50",
  informativa: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800/50",
};

const SEVERIDAD_ICON: Record<SenalCruce["severidad"], string> = {
  critica: "error",
  observacion: "warning",
  informativa: "info",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  // YYYY-MM-DD → DD/MM/YYYY
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export default function CruceInfoObrasPage() {
  const [extractionJobId, setExtractionJobId] = useState("");
  const [tdrJobId, setTdrJobId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CruceResponse | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!extractionJobId.trim() || !tdrJobId.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const fd = new FormData();
      fd.append("tdr_job_id", tdrJobId.trim());
      const res = await fetch(
        `/api/jobs/${extractionJobId.trim()}/cruce-infoobras`,
        { method: "POST", body: fd },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `Error ${res.status}`);
      }
      const json: CruceResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cruzar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PanelShell title="Cruce de Profesionales con InfoObras" subtitle="Herramientas">
      <div className="max-w-[1400px] mx-auto p-8 lg:p-12">
        {/* Header */}
        <div className="mb-8 border-l-4 border-primary pl-6">
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.15rem] text-secondary">
            Verificación Cruzada
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-primary mt-1">
            Cruce de Profesionales con InfoObras
          </h2>
          <p className="text-on-surface-variant text-sm mt-2 max-w-3xl leading-relaxed">
            Cruza cada experiencia declarada en los certificados contra los datos
            registrados en InfoObras (Contraloría). Detecta paralizaciones del
            periodo, verificación nominal de Supervisor/Residente, y validaciones
            del CV (periodo declarado vs duración real de la obra).
          </p>
          <p className="text-[0.75rem] text-outline mt-2 italic">
            Nota: InfoObras solo registra Supervisor y Residente nominalmente.
            Los demás Especialistas no se verifican con nombre — sí se cruza el
            periodo y paralizaciones de la obra.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface-container-lowest p-6 rounded-xl shadow-ambient border border-outline-variant/10 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <label className="flex flex-col">
              <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-secondary mb-1.5">
                Job ID de Extracción (propuesta)
              </span>
              <input
                type="text"
                value={extractionJobId}
                onChange={(e) => setExtractionJobId(e.target.value)}
                placeholder="ej: e09f58ba-..."
                className="px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:border-primary focus:outline-none"
                required
              />
            </label>
            <label className="flex flex-col">
              <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-secondary mb-1.5">
                Job ID de TDR (bases del concurso)
              </span>
              <input
                type="text"
                value={tdrJobId}
                onChange={(e) => setTdrJobId(e.target.value)}
                placeholder="ej: 488fdd76-..."
                className="px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:border-primary focus:outline-none"
                required
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={loading || !extractionJobId.trim() || !tdrJobId.trim()}
            className="primary-gradient text-white text-sm font-semibold px-6 py-2.5 rounded-lg disabled:opacity-50 transition-opacity hover:opacity-90 inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">
              {loading ? "hourglass_top" : "compare_arrows"}
            </span>
            {loading ? "Cruzando..." : "Ejecutar cruce"}
          </button>
          {loading && (
            <p className="text-xs text-on-surface-variant mt-3">
              Esto puede tardar varios segundos por las consultas a InfoObras.
            </p>
          )}
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl p-4 mb-6 text-red-700 dark:text-red-300 text-sm">
            <span className="material-symbols-outlined align-middle mr-1">
              error
            </span>
            {error}
          </div>
        )}

        {/* Resultado */}
        {data && (
          <>
            {/* Resumen de métricas */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Metric label="Experiencias" value={data.total_experiencias} />
              <Metric label="CUIs consultados" value={data.cuis_consultados} />
              <Metric
                label="Alertas totales"
                value={data.total_alertas}
                accent={data.total_alertas > 0}
              />
              <Metric
                label="Obras no encontradas"
                value={data.cuis_no_encontrados.length}
                accent={data.cuis_no_encontrados.length > 0}
              />
            </section>

            {/* Señales globales */}
            {data.senales_globales.length > 0 && (
              <section className="mb-8">
                <h3 className="text-sm font-bold text-primary mb-3">
                  Señales globales (entre profesionales del concurso)
                </h3>
                <div className="space-y-2">
                  {data.senales_globales.map((s, i) => (
                    <SenalCard key={i} senal={s} />
                  ))}
                </div>
              </section>
            )}

            {/* Tabla de cruces */}
            <section className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-outline-variant/10">
                <h3 className="text-sm font-bold text-primary">
                  Detalle por experiencia ({data.cruces.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-high">
                    <tr>
                      {[
                        "Profesional",
                        "Cargo postulado",
                        "Proyecto / Obra",
                        "Periodo cert.",
                        "Periodo InfoObras",
                        "Match nombre",
                        "Paraliz.",
                        "Alertas",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on-surface-variant"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {data.cruces.map((c, i) => (
                      <tr
                        key={i}
                        className="align-top hover:bg-surface-container-high/40 transition-colors"
                      >
                        <td className="px-3 py-3 text-xs">
                          <div className="font-semibold text-primary">{c.nombre_profesional}</div>
                          {c.cargo_experiencia && (
                            <div className="text-on-surface-variant mt-0.5 text-[0.7rem]">
                              {c.cargo_experiencia}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-on-surface-variant max-w-[200px]">
                          {c.cargo_postulado}
                        </td>
                        <td className="px-3 py-3 text-xs max-w-[280px]">
                          <div className="text-on-surface-variant break-words leading-snug">
                            {c.proyecto || "—"}
                          </div>
                          {c.cui && (
                            <div className="text-[0.6875rem] font-mono text-outline mt-1">
                              CUI: {c.cui}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-on-surface-variant whitespace-nowrap">
                          {fmtDate(c.fecha_inicio_cert)} → {fmtDate(c.fecha_fin_cert)}
                        </td>
                        <td className="px-3 py-3 text-xs whitespace-nowrap">
                          {c.obra_encontrada ? (
                            <>
                              <div className="text-on-surface-variant">
                                {fmtDate(c.fecha_inicio_obra)} → {fmtDate(c.fecha_fin_obra)}
                              </div>
                              {c.estado_obra && (
                                <div className="text-[0.6875rem] text-outline mt-0.5">
                                  {c.estado_obra}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-outline italic">no encontrada</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs whitespace-nowrap">
                          {c.aplica_verif_nominal ? (
                            c.nombre_coincide ? (
                              <span className="text-green-700 dark:text-green-400">
                                ✓ {c.score_nombre?.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-red-700 dark:text-red-300">
                                ✗ {c.score_nombre?.toFixed(2)}
                              </span>
                            )
                          ) : (
                            <span className="text-outline italic">N/A</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-center">
                          {c.dias_paralizado_en_periodo > 0 ? (
                            <span className="text-amber-700 dark:text-amber-300 font-semibold">
                              {c.dias_paralizado_en_periodo}d
                            </span>
                          ) : (
                            <span className="text-outline">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs max-w-[420px]">
                          {c.senales.length === 0 ? (
                            <span className="text-outline italic">sin alertas</span>
                          ) : (
                            <div className="space-y-1.5">
                              {c.senales.map((s, j) => (
                                <SenalCard key={j} senal={s} compact />
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* Estado inicial */}
        {!data && !loading && !error && (
          <div className="bg-surface-container-low rounded-xl p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-outline mb-3">
              compare_arrows
            </span>
            <p className="text-sm text-on-surface-variant max-w-md mx-auto">
              Ingresa los IDs de un job de extracción y un job TDR para cruzar
              las experiencias declaradas contra InfoObras.
            </p>
          </div>
        )}
      </div>
    </PanelShell>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="bg-surface-container-lowest p-4 border-l-4 border-primary shadow-ambient rounded-xl">
      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on-surface-variant">
        {label}
      </p>
      <p
        className={`text-2xl font-bold mt-1 ${
          accent ? "text-red-700 dark:text-red-400" : "text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SenalCard({ senal, compact = false }: { senal: SenalCruce; compact?: boolean }) {
  return (
    <div
      className={`flex items-start gap-2 border-l-2 px-2.5 py-1.5 rounded-r ${SEVERIDAD_FILL[senal.severidad]}`}
    >
      <span className="material-symbols-outlined text-base shrink-0 mt-0.5">
        {SEVERIDAD_ICON[senal.severidad]}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`${compact ? "text-[0.7rem]" : "text-xs"} leading-snug whitespace-normal break-words`}>
          {senal.mensaje}
        </p>
      </div>
    </div>
  );
}
