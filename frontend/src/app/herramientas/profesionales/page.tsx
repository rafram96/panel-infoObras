"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import PanelShell from "@/components/PanelShell";

// ============================================================================
// Tipos compartidos
// ============================================================================

type Severidad = "critica" | "observacion" | "informativa";

interface SenalSimple {
  severidad: Severidad;
  fuente?: string;
  codigo?: string;
  mensaje: string;
}

// ─── Tipos InfoObras ─────────────────────────────────────────────────────────

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
  senales: SenalSimple[];
}

interface CruceInfoObrasResponse {
  ok: boolean;
  extraction_job_id: string;
  tdr_job_id: string;
  cruces: ResultadoCruceExperiencia[];
  cuis_consultados: number;
  cuis_no_encontrados: string[];
  senales_globales: SenalSimple[];
  total_experiencias: number;
  total_alertas: number;
}

// ─── Tipos SUNAT ─────────────────────────────────────────────────────────────

interface EmpresaSUNAT {
  ruc: string;
  razon_social: string | null;
  nombre_comercial: string | null;
  tipo_contribuyente: string | null;
  fecha_inscripcion: string | null;
  fecha_inicio_actividades: string | null;
  estado: string | null;
  condicion: string | null;
  domicilio_fiscal: string | null;
  actividades_economicas: string[];
}

interface CandidatoEmpresa {
  ruc: string;
  razon_social: string;
  score: number;
  estado: string | null;
  ubicacion: string | null;
}

interface ResultadoCruceExperienciaSUNAT {
  profesional: string;
  empresa_declarada: string | null;
  ruc_declarado: string | null;
  ruc_resuelto: string | null;
  proyecto: string | null;
  fecha_inicio_exp: string | null;
  empresa_sunat: EmpresaSUNAT | null;
  score_match_nombre: number | null;
  candidatos_ambiguos: CandidatoEmpresa[];
  senales: SenalSimple[];
}

interface CruceSunatResponse {
  ok: boolean;
  extraction_job_id: string;
  total_experiencias: number;
  cruces: ResultadoCruceExperienciaSUNAT[];
  rucs_consultados: number;
  rucs_servidos_de_cache: number;
  rucs_encontrados: number;
  rucs_no_encontrados: string[];
  total_senales: number;
  total_alt04: number;
  total_mismatches: number;
  total_ambiguos: number;
}

// ============================================================================
// Helpers visuales
// ============================================================================

const SEVERIDAD_FILL: Record<Severidad, string> = {
  critica:
    "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800/50",
  observacion:
    "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/50",
  informativa:
    "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800/50",
};

const SEVERIDAD_ICON: Record<Severidad, string> = {
  critica: "error",
  observacion: "warning",
  informativa: "info",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-outline";
  if (score >= 85) return "text-green-700 dark:text-green-400 font-semibold";
  if (score >= 70) return "text-amber-700 dark:text-amber-300 font-semibold";
  return "text-red-700 dark:text-red-300 font-semibold";
}

// ============================================================================
// Página principal — tabs InfoObras / SUNAT
// ============================================================================

type Tab = "infoobras" | "sunat";

export default function CrucesProfesionalesPage() {
  const searchParams = useSearchParams();
  const initialTab: Tab =
    searchParams.get("tab") === "sunat" ? "sunat" : "infoobras";
  const [tab, setTab] = useState<Tab>(initialTab);
  const initialExtractionId = searchParams.get("extraction_job_id") ?? "";
  const initialTdrId = searchParams.get("tdr_job_id") ?? "";

  return (
    <PanelShell title="Verificación Cruzada de Profesionales" subtitle="Herramientas">
      <div className="max-w-[1400px] mx-auto p-8 lg:p-12">
        {/* Header */}
        <div className="mb-6 border-l-4 border-primary pl-6">
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.15rem] text-secondary">
            Cruces externos
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-primary mt-1">
            Verificación de Profesionales
          </h2>
          <p className="text-on-surface-variant text-sm mt-2 max-w-3xl leading-relaxed">
            Cruza las experiencias declaradas en los certificados contra fuentes
            externas para detectar inconsistencias, alertas y validaciones cruzadas.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-outline-variant/20">
          <TabButton
            active={tab === "infoobras"}
            onClick={() => setTab("infoobras")}
            icon="domain"
            label="InfoObras"
            sublabel="Contraloría"
          />
          <TabButton
            active={tab === "sunat"}
            onClick={() => setTab("sunat")}
            icon="storefront"
            label="SUNAT"
            sublabel="RUCs y empresas"
          />
        </div>

        {/* Vista activa */}
        {tab === "infoobras" && (
          <CruceInfoObrasView
            initialExtractionId={initialExtractionId}
            initialTdrId={initialTdrId}
          />
        )}
        {tab === "sunat" && (
          <CruceSunatView initialExtractionId={initialExtractionId} />
        )}
      </div>
    </PanelShell>
  );
}

// ============================================================================
// Vista InfoObras
// ============================================================================

function CruceInfoObrasView({
  initialExtractionId = "",
  initialTdrId = "",
}: {
  initialExtractionId?: string;
  initialTdrId?: string;
}) {
  const [extractionJobId, setExtractionJobId] = useState(initialExtractionId);
  const [tdrJobId, setTdrJobId] = useState(initialTdrId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CruceInfoObrasResponse | null>(null);

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
      const json: CruceInfoObrasResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cruzar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SectionDescription>
        Cruza cada experiencia declarada contra los datos registrados en
        InfoObras (Contraloría). Detecta paralizaciones del periodo, verifica
        nominalmente Supervisor/Residente, y valida el periodo declarado vs
        duración real de la obra.
        <span className="block text-[0.75rem] text-outline mt-2 italic">
          Nota: InfoObras solo registra Supervisor y Residente nominalmente.
          Los demás Especialistas no se verifican con nombre — sí se cruza el
          periodo y paralizaciones de la obra.
        </span>
      </SectionDescription>

      <form
        onSubmit={handleSubmit}
        className="bg-surface-container-lowest p-6 rounded-xl shadow-ambient border border-outline-variant/10 mb-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <InputField
            label="Job ID de Extracción (propuesta)"
            value={extractionJobId}
            onChange={setExtractionJobId}
            placeholder="ej: e09f58ba-..."
          />
          <InputField
            label="Job ID de TDR (bases del concurso)"
            value={tdrJobId}
            onChange={setTdrJobId}
            placeholder="ej: 488fdd76-..."
          />
        </div>
        <SubmitButton
          loading={loading}
          disabled={!extractionJobId.trim() || !tdrJobId.trim()}
          icon={loading ? "hourglass_top" : "compare_arrows"}
          label={loading ? "Cruzando..." : "Ejecutar cruce InfoObras"}
        />
        {loading && (
          <p className="text-xs text-on-surface-variant mt-3">
            Esto puede tardar varios segundos por las consultas a InfoObras.
          </p>
        )}
      </form>

      {error && <ErrorAlert message={error} />}

      {data && (
        <>
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
                        <div className="font-semibold text-primary">
                          {c.nombre_profesional}
                        </div>
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

      {!data && !loading && !error && (
        <EmptyState
          icon="compare_arrows"
          message="Ingresa los IDs de un job de extracción y un job TDR para cruzar las experiencias declaradas contra InfoObras."
        />
      )}
    </>
  );
}

// ============================================================================
// Vista SUNAT
// ============================================================================

function CruceSunatView({
  initialExtractionId = "",
}: {
  initialExtractionId?: string;
}) {
  const [extractionJobId, setExtractionJobId] = useState(initialExtractionId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CruceSunatResponse | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!extractionJobId.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(
        `/api/jobs/${extractionJobId.trim()}/cruce-sunat`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `Error ${res.status}`);
      }
      const json: CruceSunatResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cruzar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SectionDescription>
        Cruza cada experiencia con el portal SUNAT (e-consultaruc) para
        verificar fechas de inscripción y razones sociales. Detecta empresas
        que se constituyeron <em>después</em> del inicio de la experiencia
        declarada (ALT04), nombres que no coinciden con el RUC declarado, y
        empresas en estado de baja.
        <span className="block text-[0.75rem] text-outline mt-2 italic">
          Lookup: 1) por RUC declarado si existe, 2) fallback fuzzy por razón
          social. Cache persistente con TTL 30 días.
        </span>
      </SectionDescription>

      <form
        onSubmit={handleSubmit}
        className="bg-surface-container-lowest p-6 rounded-xl shadow-ambient border border-outline-variant/10 mb-8"
      >
        <div className="mb-4">
          <InputField
            label="Job ID de Extracción"
            value={extractionJobId}
            onChange={setExtractionJobId}
            placeholder="ej: e09f58ba-..."
          />
        </div>
        <SubmitButton
          loading={loading}
          disabled={!extractionJobId.trim()}
          icon={loading ? "hourglass_top" : "storefront"}
          label={loading ? "Consultando SUNAT..." : "Ejecutar cruce SUNAT"}
        />
        {loading && (
          <p className="text-xs text-on-surface-variant mt-3">
            La primera consulta de cada RUC es lenta (~2s). Las siguientes
            llamadas al mismo RUC son instantáneas (cache).
          </p>
        )}
      </form>

      {error && <ErrorAlert message={error} />}

      {data && (
        <>
          {/* Métricas principales */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Metric label="Experiencias" value={data.total_experiencias} />
            <Metric label="RUCs encontrados" value={data.rucs_encontrados} />
            <Metric
              label="ALT04 críticas"
              value={data.total_alt04}
              accent={data.total_alt04 > 0}
            />
            <Metric
              label="Mismatches RUC↔nombre"
              value={data.total_mismatches}
              accent={data.total_mismatches > 0}
            />
          </section>

          {/* Métricas de cache + ambiguos */}
          <section className="grid grid-cols-3 gap-4 mb-8">
            <Metric label="Consultas live" value={data.rucs_consultados} muted />
            <Metric
              label="Servidos de cache"
              value={data.rucs_servidos_de_cache}
              muted
            />
            <Metric
              label="Ambiguos (req. humano)"
              value={data.total_ambiguos}
              accent={data.total_ambiguos > 0}
            />
          </section>

          {/* Tabla detallada */}
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
                      "Empresa declarada",
                      "Empresa SUNAT",
                      "RUC",
                      "Inicio exp.",
                      "Inscrita SUNAT",
                      "Match",
                      "Estado",
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
                        <div className="font-semibold text-primary">
                          {c.profesional}
                        </div>
                        {c.proyecto && (
                          <div className="text-on-surface-variant mt-0.5 text-[0.7rem] max-w-[180px] break-words leading-snug">
                            {c.proyecto}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-on-surface-variant max-w-[200px] break-words">
                        {c.empresa_declarada || (
                          <span className="text-outline italic">sin nombre</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs max-w-[200px] break-words">
                        {c.empresa_sunat?.razon_social ? (
                          <>
                            <div className="text-on-surface">
                              {c.empresa_sunat.razon_social}
                            </div>
                            {c.empresa_sunat.tipo_contribuyente && (
                              <div className="text-[0.6875rem] text-outline mt-0.5">
                                {c.empresa_sunat.tipo_contribuyente}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-outline italic">no encontrada</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        <div className="font-mono text-on-surface-variant">
                          {c.ruc_declarado || (
                            <span className="text-outline italic">sin RUC</span>
                          )}
                        </div>
                        {c.ruc_resuelto &&
                          c.ruc_resuelto !== c.ruc_declarado && (
                            <div className="font-mono text-blue-700 dark:text-blue-300 mt-0.5 text-[0.6875rem]">
                              ↳ {c.ruc_resuelto}
                            </div>
                          )}
                      </td>
                      <td className="px-3 py-3 text-xs text-on-surface-variant whitespace-nowrap">
                        {fmtDate(c.fecha_inicio_exp)}
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        <span className="text-on-surface-variant">
                          {fmtDate(c.empresa_sunat?.fecha_inscripcion ?? null)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap text-center">
                        {c.score_match_nombre !== null ? (
                          <span className={scoreColor(c.score_match_nombre)}>
                            {c.score_match_nombre}
                          </span>
                        ) : (
                          <span className="text-outline italic">N/A</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        {c.empresa_sunat?.estado ? (
                          <span
                            className={
                              c.empresa_sunat.estado.toUpperCase().includes("BAJA")
                                ? "text-red-700 dark:text-red-300 font-semibold"
                                : "text-green-700 dark:text-green-400"
                            }
                          >
                            {c.empresa_sunat.estado}
                          </span>
                        ) : (
                          <span className="text-outline">—</span>
                        )}
                        {c.empresa_sunat?.condicion && (
                          <div className="text-[0.6875rem] text-outline mt-0.5">
                            {c.empresa_sunat.condicion}
                          </div>
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
                        {c.candidatos_ambiguos.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-outline-variant/20">
                            <div className="text-[0.6875rem] font-bold text-amber-700 dark:text-amber-300 mb-1.5">
                              Candidatos posibles:
                            </div>
                            <div className="space-y-1">
                              {c.candidatos_ambiguos.map((cand, k) => (
                                <div
                                  key={k}
                                  className="text-[0.7rem] flex items-start gap-2 bg-surface-container-high px-2 py-1 rounded"
                                >
                                  <span
                                    className={`${scoreColor(cand.score)} shrink-0 font-mono w-7`}
                                  >
                                    {cand.score}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-mono text-outline text-[0.6875rem]">
                                      {cand.ruc}
                                    </div>
                                    <div className="text-on-surface-variant break-words leading-tight">
                                      {cand.razon_social}
                                    </div>
                                    {cand.estado && (
                                      <div className="text-[0.6rem] text-outline mt-0.5">
                                        {cand.estado}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* RUCs no encontrados */}
          {data.rucs_no_encontrados.length > 0 && (
            <section className="mt-6 bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
              <h4 className="text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on-surface-variant mb-2">
                RUCs no encontrados en SUNAT ({data.rucs_no_encontrados.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.rucs_no_encontrados.map((ruc) => (
                  <code
                    key={ruc}
                    className="px-2 py-1 bg-surface-container-high text-[0.7rem] font-mono rounded text-on-surface-variant"
                  >
                    {ruc}
                  </code>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {!data && !loading && !error && (
        <EmptyState
          icon="storefront"
          message="Ingresa el ID de un job de extracción para cruzar las empresas emisoras de cada certificado contra SUNAT."
        />
      )}
    </>
  );
}

// ============================================================================
// Subcomponentes compartidos
// ============================================================================

function TabButton({
  active,
  onClick,
  icon,
  label,
  sublabel,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  sublabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex items-center gap-2 px-4 py-3 text-sm font-semibold text-primary border-b-2 border-primary -mb-px"
          : "flex items-center gap-2 px-4 py-3 text-sm text-on-surface-variant hover:text-primary hover:bg-surface-container-high/30 rounded-t-lg transition-colors"
      }
    >
      <span className="material-symbols-outlined text-base">{icon}</span>
      <div className="flex flex-col items-start leading-tight">
        <span>{label}</span>
        {sublabel && (
          <span className="text-[0.625rem] font-normal text-outline">
            {sublabel}
          </span>
        )}
      </div>
    </button>
  );
}

function SectionDescription({ children }: { children: ReactNode }) {
  return (
    <p className="text-on-surface-variant text-sm mb-6 max-w-3xl leading-relaxed">
      {children}
    </p>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col">
      <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-secondary mb-1.5">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:border-primary focus:outline-none"
        required
      />
    </label>
  );
}

function SubmitButton({
  loading,
  disabled,
  icon,
  label,
}: {
  loading: boolean;
  disabled: boolean;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="primary-gradient text-white text-sm font-semibold px-6 py-2.5 rounded-lg disabled:opacity-50 transition-opacity hover:opacity-90 inline-flex items-center gap-2"
    >
      <span className="material-symbols-outlined text-base">{icon}</span>
      {label}
    </button>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl p-4 mb-6 text-red-700 dark:text-red-300 text-sm">
      <span className="material-symbols-outlined align-middle mr-1">error</span>
      {message}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-12 text-center">
      <span className="material-symbols-outlined text-5xl text-outline mb-3">
        {icon}
      </span>
      <p className="text-sm text-on-surface-variant max-w-md mx-auto">{message}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  accent = false,
  muted = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`bg-surface-container-lowest p-4 border-l-4 ${
        muted ? "border-outline-variant/40" : "border-primary"
      } shadow-ambient rounded-xl`}
    >
      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on-surface-variant">
        {label}
      </p>
      <p
        className={`text-2xl font-bold mt-1 ${
          accent
            ? "text-red-700 dark:text-red-400"
            : muted
              ? "text-on-surface-variant"
              : "text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SenalCard({
  senal,
  compact = false,
}: {
  senal: SenalSimple;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-2 border-l-2 px-2.5 py-1.5 rounded-r ${SEVERIDAD_FILL[senal.severidad]}`}
    >
      <span className="material-symbols-outlined text-base shrink-0 mt-0.5">
        {SEVERIDAD_ICON[senal.severidad]}
      </span>
      <div className="flex-1 min-w-0">
        {senal.codigo && (
          <span className="text-[0.6rem] font-bold opacity-70 mr-1.5">
            {senal.codigo}
          </span>
        )}
        <span
          className={`${compact ? "text-[0.7rem]" : "text-xs"} leading-snug whitespace-normal break-words`}
        >
          {senal.mensaje}
        </span>
      </div>
    </div>
  );
}
