export type JobStatus = "pending" | "running" | "done" | "error";
export type JobType = "extraction" | "tdr" | "full";

export interface Job {
  id: string;
  filename: string;
  job_type: JobType;
  pages_from: number | null;
  pages_to: number | null;
  status: JobStatus;
  created_at: string;
  progress_pct: number;
  profesionales_count: number | null;
  source_job_id?: string | null;
  pdf_available?: boolean;
}

export interface Bloque {
  start: number;
  end: number;
}

export interface ProfesionalExtraccion {
  nombre: string | null;
  dni: string | null;
  tipo_colegio: string | null;
  registro_colegio: string | null;
  profesion: string | null;
  cargo_postulado: string | null;
  _needs_review?: boolean;
}

export interface Experiencia {
  proyecto: string | null;
  cargo: string | null;
  empresa_emisora: string | null;
  ruc: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  fecha_emision: string | null;
  firmante: string | null;
  cargo_firmante: string | null;
  folio: string | null;
  tipo_obra: string | null;
  tipo_intervencion: string | null;
  tipo_acreditacion: string | null;
}

export interface Seccion {
  index: number;
  cargo: string;
  cargo_raw: string;
  numero: string | null;
  total_pages: number;
  page_numbers: number[];
  bloques: Bloque[];
  es_tipo_b: boolean;
  profesional?: ProfesionalExtraccion | null;
  experiencias?: Experiencia[];
  _needs_review?: boolean;
}

// ── Resultado de extracción (job_type: "extraction") ──────────────────────
export interface ExtractionResult {
  total_pages: number;
  pages_paddle: number;
  pages_qwen: number;
  pages_pdfplumber?: number;
  pages_error: number;
  conf_promedio: number;
  tiempo_total: number;
  engine?: "motor_ocr" | "pdfplumber";
  secciones: Seccion[];
}

// ── Resultado TDR (job_type: "tdr") ───────────────────────────────────────
export interface ExperienciaMinimaTdr {
  cantidad: number | null;
  unidad: string;
  descripcion: string | null;
  cargos_similares_validos: string[] | null;
  puntaje_por_experiencia: number | null;
  puntaje_maximo: number | null;
}

export interface RequisitoPersonal {
  cargo: string;
  profesiones_aceptadas: string[] | null;
  anos_colegiado: string | null;
  experiencia_minima: ExperienciaMinimaTdr | null;
  tipo_obra_valido: string | null;
  tiempo_adicional_factores: string | null;
  capacitacion: Record<string, unknown> | null;
  pagina: number | null;
}

export interface FactorEvaluacion {
  factor: string;
  aplica_a: "postor" | "personal" | "ambos";
  cargo_personal: string | null;
  puntaje_maximo: number;
  metodologia: string | null;
  pagina: number | null;
}

export interface TdrResult {
  job_type: "tdr";
  rtm_personal: RequisitoPersonal[];
  rtm_postor: Record<string, unknown>[];
  factores_evaluacion: FactorEvaluacion[];
  total_cargos: number;
  total_factores: number;
}

// ── JobDetail unificado ───────────────────────────────────────────────────
export interface JobDetail extends Job {
  result: ExtractionResult | TdrResult | null;
  error: string | null;
  started_at: string | null;
  progress_stage: string | null;
  doc_total_pages: number | null;
  logs: string | null;
  bases_available?: boolean;
}
