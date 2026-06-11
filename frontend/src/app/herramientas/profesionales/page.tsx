"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
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
  cached?: boolean;
  ejecutado_en?: string;
  extraction_job_id: string;
  tdr_job_id: string;
  cruces: ResultadoCruceExperiencia[];
  cuis_consultados: number;
  cuis_no_encontrados: string[];
  senales_globales: SenalSimple[];
  total_experiencias: number;
  total_alertas: number;
}

type FiltroInfoObras = "all" | "con-alertas" | "no-encontradas" | "paralizaciones" | "nominal-falla";

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
  cached?: boolean;
  ejecutado_en?: string;
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

type FiltroSunat = "all" | "con-alertas" | "alt04" | "mismatch" | "baja" | "sin-empresa" | "ambiguos";

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

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  } catch {
    return iso;
  }
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

// Wrapper con Suspense — requerido por Next.js 15 cuando un componente
// cliente usa useSearchParams (la pagina deja de ser pre-renderizable
// estaticamente sin un suspense boundary explicito).
export default function CrucesProfesionalesPage() {
  return (
    <Suspense fallback={<CrucesPageFallback />}>
      <CrucesProfesionalesPageInner />
    </Suspense>
  );
}

function CrucesPageFallback() {
  return (
    <PanelShell title="Verificación Cruzada de Profesionales" subtitle="Herramientas">
      <div className="max-w-[1400px] mx-auto p-8 lg:p-12">
        <div className="bg-surface-container-low rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline mb-3 animate-pulse">
            hourglass_top
          </span>
          <p className="text-sm text-on-surface-variant">Cargando...</p>
        </div>
      </div>
    </PanelShell>
  );
}

function CrucesProfesionalesPageInner() {
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
  const [filtro, setFiltro] = useState<FiltroInfoObras>("all");
  const [busqueda, setBusqueda] = useState("");

  const runCruce = useCallback(
    async (extId: string, tdrId: string, refresh = false) => {
      if (!extId.trim() || !tdrId.trim()) return;
      setLoading(true);
      setError(null);

      try {
        const fd = new FormData();
        fd.append("tdr_job_id", tdrId.trim());
        const url =
          `/api/jobs/${extId.trim()}/cruce-infoobras` +
          (refresh ? "?refresh=true" : "");
        const res = await fetch(url, { method: "POST", body: fd });
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
    },
    [],
  );

  // Auto-cargar cache cuando llegan params en URL (navegacion desde /jobs/[id])
  useEffect(() => {
    if (initialExtractionId && initialTdrId && !data) {
      runCruce(initialExtractionId, initialTdrId, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialExtractionId, initialTdrId]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    runCruce(extractionJobId, tdrJobId, false);
  };

  // Métricas derivadas
  const metricsExtra = useMemo(() => {
    if (!data) return null;
    let criticas = 0;
    let observaciones = 0;
    let infoNominalFalla = 0;
    let conParalizacion = 0;
    let diasTotalesParaliz = 0;
    for (const c of data.cruces) {
      for (const s of c.senales) {
        if (s.severidad === "critica") criticas++;
        else if (s.severidad === "observacion") observaciones++;
      }
      if (c.aplica_verif_nominal && c.nombre_coincide === false) infoNominalFalla++;
      if (c.dias_paralizado_en_periodo > 0) {
        conParalizacion++;
        diasTotalesParaliz += c.dias_paralizado_en_periodo;
      }
    }
    return { criticas, observaciones, infoNominalFalla, conParalizacion, diasTotalesParaliz };
  }, [data]);

  // Aplicar filtro + busqueda
  const crucesFiltrados = useMemo(() => {
    if (!data) return [];
    const term = busqueda.trim().toLowerCase();
    return data.cruces.filter((c) => {
      // Filtro por categoría
      if (filtro === "con-alertas" && c.senales.length === 0) return false;
      if (filtro === "no-encontradas" && c.obra_encontrada) return false;
      if (filtro === "paralizaciones" && c.dias_paralizado_en_periodo === 0) return false;
      if (
        filtro === "nominal-falla" &&
        !(c.aplica_verif_nominal && c.nombre_coincide === false)
      )
        return false;
      // Busqueda libre
      if (term) {
        const hay =
          c.nombre_profesional.toLowerCase().includes(term) ||
          (c.proyecto || "").toLowerCase().includes(term) ||
          (c.cui || "").toLowerCase().includes(term) ||
          (c.cargo_postulado || "").toLowerCase().includes(term);
        if (!hay) return false;
      }
      return true;
    });
  }, [data, filtro, busqueda]);

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
          periodo y paralizaciones de la obra. El resultado queda{" "}
          <strong>persistido en el job</strong>: las próximas visitas son
          instantáneas.
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
        <div className="flex items-center gap-2 flex-wrap">
          <SubmitButton
            loading={loading}
            disabled={!extractionJobId.trim() || !tdrJobId.trim()}
            icon={loading ? "hourglass_top" : data ? "cached" : "compare_arrows"}
            label={
              loading
                ? "Cruzando..."
                : data
                  ? "Cargar resultado (cache)"
                  : "Ejecutar cruce InfoObras"
            }
          />
          {data && (
            <button
              type="button"
              onClick={() => runCruce(extractionJobId, tdrJobId, true)}
              disabled={loading}
              className="text-sm font-semibold px-4 py-2.5 rounded-lg inline-flex items-center gap-2 border border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 disabled:opacity-50"
              title="Re-ejecuta el cruce ignorando cache"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              Re-ejecutar (sin cache)
            </button>
          )}
        </div>
        {loading && (
          <p className="text-xs text-on-surface-variant mt-3">
            La primera ejecución consulta InfoObras (varios minutos).
            Las siguientes visitas leen del cache en segundos.
          </p>
        )}
      </form>

      {error && <ErrorAlert message={error} />}

      {data && (
        <>
          {/* Banner de cache hit */}
          {data.cached && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-lg p-3 mb-6 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
              <span className="material-symbols-outlined text-base">cached</span>
              <span>
                Resultado cargado del cache persistente del job.
                {data.ejecutado_en && (
                  <span className="ml-2 text-blue-600/80 dark:text-blue-400/80">
                    Última ejecución: {fmtDateTime(data.ejecutado_en)}
                  </span>
                )}
                <span className="ml-2 opacity-80">
                  Usá &quot;Re-ejecutar&quot; para refrescar.
                </span>
              </span>
            </div>
          )}

          <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <Metric label="Experiencias" value={data.total_experiencias} />
            <Metric label="CUIs consultados" value={data.cuis_consultados} />
            <Metric
              label="Críticas"
              value={metricsExtra?.criticas ?? 0}
              accent={(metricsExtra?.criticas ?? 0) > 0}
            />
            <Metric
              label="Observaciones"
              value={metricsExtra?.observaciones ?? 0}
              accent={(metricsExtra?.observaciones ?? 0) > 0}
              tone="warning"
            />
            <Metric
              label="Nominal falla"
              value={metricsExtra?.infoNominalFalla ?? 0}
              accent={(metricsExtra?.infoNominalFalla ?? 0) > 0}
            />
            <Metric
              label="Con paralización"
              value={metricsExtra?.conParalizacion ?? 0}
              accent={(metricsExtra?.conParalizacion ?? 0) > 0}
              tone="warning"
            />
          </section>

          {data.senales_globales.length > 0 && (
            <section className="mb-6">
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

          {/* Filtros + búsqueda */}
          <section className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-4 mb-3 flex flex-wrap items-center gap-2">
            <FilterChip
              active={filtro === "all"}
              onClick={() => setFiltro("all")}
              label="Todas"
              count={data.cruces.length}
            />
            <FilterChip
              active={filtro === "con-alertas"}
              onClick={() => setFiltro("con-alertas")}
              label="Con alertas"
              count={data.cruces.filter((c) => c.senales.length > 0).length}
              tone="danger"
            />
            <FilterChip
              active={filtro === "no-encontradas"}
              onClick={() => setFiltro("no-encontradas")}
              label="Obra no encontrada"
              count={data.cruces.filter((c) => !c.obra_encontrada).length}
              tone="muted"
            />
            <FilterChip
              active={filtro === "paralizaciones"}
              onClick={() => setFiltro("paralizaciones")}
              label="Con paralización"
              count={metricsExtra?.conParalizacion ?? 0}
              tone="warning"
            />
            <FilterChip
              active={filtro === "nominal-falla"}
              onClick={() => setFiltro("nominal-falla")}
              label="Nominal falla"
              count={metricsExtra?.infoNominalFalla ?? 0}
              tone="danger"
            />
            <div className="flex-1" />
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-outline pointer-events-none">
                search
              </span>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar profesional, proyecto, CUI..."
                className="pl-8 pr-3 py-1.5 text-xs bg-surface border border-outline-variant rounded-lg focus:border-primary focus:outline-none min-w-[240px]"
              />
            </div>
          </section>

          <section className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-outline-variant/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary">
                Detalle por experiencia
              </h3>
              <span className="text-xs text-on-surface-variant">
                Mostrando <strong>{crucesFiltrados.length}</strong> de{" "}
                {data.cruces.length}
              </span>
            </div>
            {crucesFiltrados.length === 0 ? (
              <div className="p-8 text-center text-sm text-on-surface-variant">
                Ninguna experiencia coincide con el filtro actual.
              </div>
            ) : (
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
                    {crucesFiltrados.map((c, i) => (
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
                            <span
                              className="text-amber-700 dark:text-amber-300 font-semibold"
                              title={`${c.paralizaciones.length} mes(es)`}
                            >
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
            )}
          </section>

          {/* CUIs no encontrados (al final, colapsable) */}
          {data.cuis_no_encontrados.length > 0 && (
            <section className="mt-6 bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
              <h4 className="text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on-surface-variant mb-2">
                CUIs no encontrados en InfoObras ({data.cuis_no_encontrados.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.cuis_no_encontrados.map((cui) => (
                  <code
                    key={cui}
                    className="px-2 py-1 bg-surface-container-high text-[0.7rem] font-mono rounded text-on-surface-variant"
                  >
                    {cui}
                  </code>
                ))}
              </div>
            </section>
          )}
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
  const [filtro, setFiltro] = useState<FiltroSunat>("all");
  const [busqueda, setBusqueda] = useState("");

  const runCruce = useCallback(
    async (extId: string, refresh = false) => {
      if (!extId.trim()) return;
      setLoading(true);
      setError(null);

      try {
        const url =
          `/api/jobs/${extId.trim()}/cruce-sunat` +
          (refresh ? "?refresh=true" : "");
        const res = await fetch(url, { method: "POST" });
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
    },
    [],
  );

  // Auto-cargar cache si llega un job_id por URL
  useEffect(() => {
    if (initialExtractionId && !data) {
      runCruce(initialExtractionId, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialExtractionId]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    runCruce(extractionJobId, false);
  };

  // Aplicar filtro + busqueda
  const crucesFiltrados = useMemo(() => {
    if (!data) return [];
    const term = busqueda.trim().toLowerCase();
    return data.cruces.filter((c) => {
      // Filtros por categoria
      if (filtro === "con-alertas" && c.senales.length === 0) return false;
      if (
        filtro === "alt04" &&
        !c.senales.some((s) => s.codigo === "ALT04" || s.codigo === "ALT04_SUNAT")
      )
        return false;
      if (
        filtro === "mismatch" &&
        !c.senales.some(
          (s) => s.codigo === "MISMATCH_NOMBRE_RUC" || s.codigo === "RUC_DECLARADO_INCORRECTO",
        )
      )
        return false;
      if (
        filtro === "baja" &&
        !((c.empresa_sunat?.estado || "").toUpperCase().includes("BAJA"))
      )
        return false;
      if (filtro === "sin-empresa" && c.empresa_sunat) return false;
      if (filtro === "ambiguos" && c.candidatos_ambiguos.length === 0) return false;
      // Busqueda libre
      if (term) {
        const hay =
          c.profesional.toLowerCase().includes(term) ||
          (c.empresa_declarada || "").toLowerCase().includes(term) ||
          (c.empresa_sunat?.razon_social || "").toLowerCase().includes(term) ||
          (c.ruc_declarado || "").toLowerCase().includes(term) ||
          (c.ruc_resuelto || "").toLowerCase().includes(term);
        if (!hay) return false;
      }
      return true;
    });
  }, [data, filtro, busqueda]);

  const conBaja = useMemo(
    () =>
      data?.cruces.filter((c) =>
        (c.empresa_sunat?.estado || "").toUpperCase().includes("BAJA"),
      ).length ?? 0,
    [data],
  );

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
          social. Cache persistente con TTL 30 días. El resultado queda{" "}
          <strong>persistido en el job</strong>: las próximas visitas son
          instantáneas.
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
        <div className="flex items-center gap-2 flex-wrap">
          <SubmitButton
            loading={loading}
            disabled={!extractionJobId.trim()}
            icon={loading ? "hourglass_top" : data ? "cached" : "storefront"}
            label={
              loading
                ? "Consultando SUNAT..."
                : data
                  ? "Cargar resultado (cache)"
                  : "Ejecutar cruce SUNAT"
            }
          />
          {data && (
            <button
              type="button"
              onClick={() => runCruce(extractionJobId, true)}
              disabled={loading}
              className="text-sm font-semibold px-4 py-2.5 rounded-lg inline-flex items-center gap-2 border border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 disabled:opacity-50"
              title="Re-ejecuta el cruce ignorando cache de job (SUNAT igual usa cache de 30d a nivel RUC)"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              Re-ejecutar (sin cache)
            </button>
          )}
        </div>
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
          {/* Banner de cache hit */}
          {data.cached && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-lg p-3 mb-6 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
              <span className="material-symbols-outlined text-base">cached</span>
              <span>
                Resultado cargado del cache persistente del job.
                {data.ejecutado_en && (
                  <span className="ml-2 text-blue-600/80 dark:text-blue-400/80">
                    Última ejecución: {fmtDateTime(data.ejecutado_en)}
                  </span>
                )}
                <span className="ml-2 opacity-80">
                  Usá &quot;Re-ejecutar&quot; para refrescar.
                </span>
              </span>
            </div>
          )}

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
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
              tone="warning"
            />
            <Metric
              label="Empresas en BAJA"
              value={conBaja}
              accent={conBaja > 0}
            />
          </section>

          {/* Filtros + búsqueda */}
          <section className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-4 mb-3 flex flex-wrap items-center gap-2">
            <FilterChip
              active={filtro === "all"}
              onClick={() => setFiltro("all")}
              label="Todas"
              count={data.cruces.length}
            />
            <FilterChip
              active={filtro === "con-alertas"}
              onClick={() => setFiltro("con-alertas")}
              label="Con alertas"
              count={data.cruces.filter((c) => c.senales.length > 0).length}
              tone="danger"
            />
            <FilterChip
              active={filtro === "alt04"}
              onClick={() => setFiltro("alt04")}
              label="ALT04"
              count={data.total_alt04}
              tone="danger"
            />
            <FilterChip
              active={filtro === "mismatch"}
              onClick={() => setFiltro("mismatch")}
              label="Mismatch RUC↔nombre"
              count={data.total_mismatches}
              tone="danger"
            />
            <FilterChip
              active={filtro === "baja"}
              onClick={() => setFiltro("baja")}
              label="En BAJA"
              count={conBaja}
              tone="danger"
            />
            <FilterChip
              active={filtro === "ambiguos"}
              onClick={() => setFiltro("ambiguos")}
              label="Ambiguos"
              count={data.total_ambiguos}
              tone="warning"
            />
            <FilterChip
              active={filtro === "sin-empresa"}
              onClick={() => setFiltro("sin-empresa")}
              label="Sin empresa"
              count={data.cruces.filter((c) => !c.empresa_sunat).length}
              tone="muted"
            />
            <div className="flex-1" />
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-outline pointer-events-none">
                search
              </span>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar profesional, empresa, RUC..."
                className="pl-8 pr-3 py-1.5 text-xs bg-surface border border-outline-variant rounded-lg focus:border-primary focus:outline-none min-w-[240px]"
              />
            </div>
          </section>

          {/* Tabla detallada */}
          <section className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-outline-variant/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary">
                Detalle por experiencia
              </h3>
              <span className="text-xs text-on-surface-variant">
                Mostrando <strong>{crucesFiltrados.length}</strong> de{" "}
                {data.cruces.length}
              </span>
            </div>
            {crucesFiltrados.length === 0 ? (
              <div className="p-8 text-center text-sm text-on-surface-variant">
                Ninguna experiencia coincide con el filtro actual.
              </div>
            ) : (
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
                  {crucesFiltrados.map((c, i) => (
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
            )}
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
  tone = "danger",
}: {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
  tone?: "danger" | "warning";
}) {
  const accentColor =
    tone === "warning"
      ? "text-amber-700 dark:text-amber-400"
      : "text-red-700 dark:text-red-400";
  const borderColor =
    muted
      ? "border-outline-variant/40"
      : accent
        ? tone === "warning"
          ? "border-amber-500"
          : "border-red-500"
        : "border-primary";
  return (
    <div
      className={`bg-surface-container-lowest p-4 border-l-4 ${borderColor} shadow-ambient rounded-xl`}
    >
      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on-surface-variant">
        {label}
      </p>
      <p
        className={`text-2xl font-bold mt-1 ${
          accent
            ? accentColor
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

function FilterChip({
  active,
  onClick,
  label,
  count,
  tone = "neutral",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: "neutral" | "danger" | "warning" | "muted";
}) {
  const baseTone =
    tone === "danger"
      ? "text-red-700 dark:text-red-300"
      : tone === "warning"
        ? "text-amber-700 dark:text-amber-300"
        : tone === "muted"
          ? "text-on-surface-variant"
          : "text-primary";
  const activeBg =
    tone === "danger"
      ? "bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-800/60"
      : tone === "warning"
        ? "bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60"
        : tone === "muted"
          ? "bg-surface-container-high border-outline-variant/30"
          : "bg-primary/10 dark:bg-primary/20 border-primary/40";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={count === 0 && !active}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
        active
          ? `${activeBg} ${baseTone}`
          : "bg-surface-container border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high"
      } ${count === 0 && !active ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <span>{label}</span>
      <span
        className={`text-[0.6875rem] px-1.5 py-0.5 rounded-full ${
          active ? "bg-white/40 dark:bg-black/30" : "bg-surface-container-high"
        } ${baseTone}`}
      >
        {count}
      </span>
    </button>
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
