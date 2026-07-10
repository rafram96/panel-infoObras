/**
 * Types del PIVOTE — espejo 1:1 de `Pivote/backend/schemas/pipeline.py`.
 * Si pipeline.py cambia, este archivo cambia con él (misma fuente de verdad).
 */

export type Etapa =
  | "ingesta"
  | "validacion"
  | "resolucion_cui"
  | "infoobras"
  | "sunat"
  | "reglas"
  | "excel"
  | "persistencia";

export const ETAPAS_ORDEN: Etapa[] = [
  "ingesta", "validacion", "resolucion_cui", "infoobras",
  "sunat", "reglas", "excel", "persistencia",
];

export const ETAPA_LABEL: Record<Etapa, string> = {
  ingesta: "Recepción del análisis",
  validacion: "Revisión de consistencia (15 reglas)",
  resolucion_cui: "Identificación de obras (CUI)",
  infoobras: "Consulta a InfoObras",
  sunat: "Consulta a SUNAT",
  reglas: "Cálculo de días efectivos",
  excel: "Excel final",
  persistencia: "Guardado",
};

export type JobEstado =
  | "recibido" | "en_proceso" | "requiere_revision" | "completado" | "error";

export type EstadoEtapa =
  | "pendiente" | "en_curso" | "ok" | "ok_con_revision" | "error_parcial" | "error";

export type Severidad = "info" | "advertencia" | "alerta" | "critica";

export interface Observacion {
  codigo?: string | null;          // ALT04, ALT12, NOTA9, VINCULACION…
  severidad: Severidad;
  mensaje: string;
  origen: Etapa;
  referencia?: string | null;      // "prof=3 exp=2"
}

export interface CandidatoCui {
  cui: string;
  nombre_obra: string;
  departamento?: string | null;
  score: number;                   // 0-100
}

export interface ItemRevision {
  n_prof: number;
  n_exp: number;
  etapa: Etapa;
  motivo: string;
  candidatos: CandidatoCui[];
  accion_sugerida?: string | null;
  resuelto: boolean;
  // contexto para que el humano decida sin abrir nada más:
  profesional?: string;
  cargo?: string;
  proyecto?: string;
  fechas?: string;
}

export interface MetricaEtapa {
  items_total: number;
  items_ok: number;
  items_revision: number;
  items_error: number;
  reintentos: number;
  duracion_ms?: number | null;
}

export interface ResultadoEtapa {
  etapa: Etapa;
  estado: EstadoEtapa;
  metrica: MetricaEtapa;
  observaciones: Observacion[];
  iniciado_en?: string | null;
  terminado_en?: string | null;
  error?: string | null;
}

export interface PivoteJob {
  job_id: string;
  analisis_id: string;
  concurso_id?: string | null;
  concurso?: string | null;
  postor?: string | null;
  /** Por dónde llegó: el MCP local lo crea directo desde la sesión de Claude
   *  del ingeniero; el dropzone es la alternativa manual. */
  origen?: "mcp" | "dropzone" | null;
  estado: JobEstado;
  etapas: ResultadoEtapa[];
  observaciones: Observacion[];
  items_revision: ItemRevision[];
  excel_final?: string | null;
  zip_infoobras?: string | null;
  /** Descarga diferida de documentos InfoObras (lo que arma el ZIP). El ZIP solo
   *  se puede bajar cuando es "listas". */
  descargas_estado?: "pendiente" | "en_progreso" | "listas" | "error" | null;
  creado_en?: string | null;
  actualizado_en?: string | null;
}

export interface Concurso {
  concurso_id: string;
  nomenclatura: string;
  fecha_presentacion?: string | null;
  creado_en?: string | null;
}

export interface ConcursoConJobs extends Concurso {
  jobs: PivoteJob[];
}

/**
 * Resumen del análisis (pantalla P5) — lo sirve el backend ya digerido:
 * el panel NO recalcula nada (la fuente es el espejo enriquecido +
 * EnriquecimientoExperiencia del servidor).
 */
export interface VeredictoProfesional {
  n_prof: number;
  cargo: string;                   // etiqueta literal del cargo en la propuesta (sin "(cargo bases N°…)")
  cargo_bases_num?: number | null; // cargo equivalente en el Cuadro de Personal de las bases
  cargo_bases_nombre?: string | null;
  nombre: string;
  cumple_claude: string;           // "SÍ — 3.96 años"
  anios_brutos: number;
  cumple_backend?: string | null;  // "NO CUMPLE — 1.55 años efectivos" (null = sin cambio)
  anios_efectivos?: number | null;
  minimo_anios?: number | null;    // mínimo de experiencia exigido al cargo por las bases
  motivo_backend?: string | null;  // "2 paralizaciones (obra CUI …): −212 días"
  fuente?: string | null;          // "InfoObras · consultado 2026-06-10"
}

export interface AlertaResumen {
  id: string;
  codigo: string;                  // ALT04, ALT12, VINCULACION, NOTA9…
  severidad: Severidad;
  mensaje: string;
  referencia?: string | null;
  fuente?: string | null;
  decision?: { relevante: boolean; razon?: string } | null;
}

export interface FactorResumen {
  factor: string;
  criterio?: string | null;        // nombre del factor ("Experiencia adicional del personal clave")
  puntaje: number | string | null; // número o "NO APLICA"
  detalle?: string | null;
}

export interface ResumenAnalisis {
  job_id: string;
  postor: string;
  veredictos: VeredictoProfesional[];
  alertas: AlertaResumen[];
  factores: FactorResumen[];
  puntaje_total: number | null;
}

export interface SaludPortal {
  portal: "sunat" | "infoobras";
  ok: boolean;
  diagnostico?: string | null;     // "captcha_real" | "estructura_desconocida"
  desde?: string | null;
}

// ── Búsqueda global de profesionales ─────────────────────────────────────────
// Espejo de GET /api/pivote/profesionales (backend `buscar_profesionales`).
// Una fila por aparición: el mismo profesional en 2 propuestas = 2 filas.

export interface ProfesionalHit {
  nombre: string | null;
  cargo: string | null;
  colegiatura: string | null;
  n_prof: number;
  cumple?: string | null;          // veredicto de Claude ("SÍ — 4.51 años")
  n_experiencias: number;
  job_id: string;
  estado_job: JobEstado;
  concurso_id: string | null;
  concurso: string | null;
  postor: string | null;
}

// ── Progreso del análisis (barra en vivo) ────────────────────────────────────
// Espejo de `armar_progreso()` en Pivote/backend/api/app.py. Fusiona el avance
// grueso (checkpoints por etapa) con el fino (item por item, en memoria).

/** Una etapa en el stepper. `item_actual/items_total` solo vienen mientras está
 *  `en_curso` y la etapa itera por ítem (obras, emisores). */
export interface EtapaProgreso {
  etapa: Etapa;
  texto: string;                   // texto en vivo SIN jerga (lo emite el backend)
  estado: EstadoEtapa;             // incluye "en_curso" para la(s) etapa(s) activa(s)
  item_actual?: number;
  items_total?: number;
}

/** Avance de la descarga diferida de documentos (lo que arma el ZIP). */
export interface DescargasProgreso {
  estado?: PivoteJob["descargas_estado"];
  listo: boolean;
  total: number;
  descargadas: number;
  faltan: number;
  en_revision: number;
  obra_actual?: string | null;     // frase de la obra que se está bajando ahora
}

/** Estimación de tiempo restante (§4 — futuro; hoy el backend manda `null`). */
export interface EtaProgreso {
  segundos_restantes: number;
  rango: [number, number];
  confiable: boolean;
}

export interface ProgresoAnalisis {
  job_id: string;
  estado: JobEstado;
  pct: number;                     // 0-100, grueso por etapas
  etapas: EtapaProgreso[];         // en orden canónico (8)
  descargas: DescargasProgreso;
  eta?: EtaProgreso | null;
  pendientes_humano: number;
}

// ── helpers de presentación ──────────────────────────────────────────────────

export const JOB_ESTADO_UI: Record<JobEstado, { label: string; cls: string }> = {
  recibido: { label: "Recibido", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  en_proceso: { label: "En proceso", cls: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  requiere_revision: { label: "Requiere revisión", cls: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  completado: { label: "Completado", cls: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" },
  error: { label: "Error", cls: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

export const SEVERIDAD_UI: Record<Severidad, { label: string; cls: string; orden: number }> = {
  critica: { label: "Crítica", cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300", orden: 0 },
  alerta: { label: "Alerta", cls: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300", orden: 1 },
  advertencia: { label: "Advertencia", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300", orden: 2 },
  info: { label: "Info", cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", orden: 3 },
};

export function pendientesHumano(job: PivoteJob): number {
  return job.items_revision.filter((it) => !it.resuelto).length;
}

/** Presentación de fechas (pedido del cliente): DD/MM/YY.
 *  El ISO vive solo en el contrato; sentinels/parciales se muestran tal cual. */
export function fmtFecha(v?: string | null): string {
  if (!v) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : v;
}

/** Timestamp ISO (UTC) → DD/MM/YY HH:MM en hora de Lima, Perú (UTC-5). Para los
 *  `creado_en` de concursos/análisis. Si no es un timestamp válido, cae a fmtFecha. */
export function fmtFechaHora(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return fmtFecha(v);
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: "America/Lima",
  }).format(d).replace(",", "");
}

/** Reemplaza TODAS las fechas ISO dentro de un texto por DD/MM/YY
 *  (para campos compuestos tipo "2021-03-01 → 2022-08-15"). */
export function fmtFechasEnTexto(s?: string | null): string {
  return (s ?? "").replace(
    /(\d{4})-(\d{2})-(\d{2})/g,
    (_t, a: string, m: string, d: string) => `${d}/${m}/${a.slice(2)}`,
  );
}
