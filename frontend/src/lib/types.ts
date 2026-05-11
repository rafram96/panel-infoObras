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

export interface SenalSimple {
  severidad: "critica" | "observacion" | "informativa";
  codigo: string;
  mensaje: string;
}

export interface EmpresaSUNATResumen {
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

export interface CruceSUNATPorExp {
  ruc_declarado: string | null;
  ruc_resuelto: string | null;
  empresa_sunat: EmpresaSUNATResumen | null;
  score_match_nombre: number | null;
  candidatos_ambiguos: Array<{
    ruc: string;
    razon_social: string;
    score: number;
    estado: string | null;
    ubicacion: string | null;
  }>;
  senales: SenalSimple[];
}

export interface AlertaMotor {
  codigo: string;        // ALT01..ALT11
  severidad: "critica" | "observacion";
  mensaje: string;
}

// Títulos cortos para cada código de alerta (motor de reglas + señales SUNAT).
// Se usa en badges y headers donde el código solo no aporta contexto.
export const ALERT_TITLES: Record<string, string> = {
  // Motor de reglas (Paso 4)
  ALT01: "Fecha fin posterior a emisión",
  ALT02: "Periodo COVID",
  ALT03: "Experiencia > 25 años",
  ALT04: "Empresa creada después de la experiencia",
  ALT05: "Sin fecha de término",
  ALT06: "Cargo no válido en TDR",
  ALT07: "Profesión no coincide",
  ALT08: "Tipo de obra no coincide",
  ALT09: "Colegiatura no vigente",
  ALT10: "Experiencia antes de colegiatura",
  ALT11: "Solapamiento temporal",
  // Señales SUNAT
  RUC_DECLARADO_INCORRECTO: "RUC declarado incorrecto",
  MISMATCH_NOMBRE_RUC: "Nombre ≠ razón social SUNAT",
  NOMBRE_DIFERENTE: "Nombre parcialmente distinto",
  AMBIGUO_REQUIERE_HUMANO: "Requiere confirmación humana",
  RUC_INFERIDO_POR_NOMBRE: "RUC inferido por nombre",
  EMPRESA_BAJA: "Empresa en BAJA",
  RUC_NO_ENCONTRADO: "RUC no encontrado en SUNAT",
  NO_ENCONTRADO_POR_NOMBRE: "Empresa no encontrada",
  SIN_RUC: "Sin RUC declarado",
  SIN_DATOS_EMPRESA: "Sin datos de empresa",
};

export function alertTitle(codigo: string): string {
  return ALERT_TITLES[codigo] ?? codigo;
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
  // Inyectado por _run_full_job tras cruce SUNAT. Puede ser null si el cruce
  // no se ejecuto (job de extraction sin bases) o si SUNAT fallo.
  cruce_sunat?: CruceSUNATPorExp | null;
  // Inyectado por _run_full_job tras motor de reglas (Paso 4).
  // Lista de alertas ALT01..ALT11 que aplican a esta experiencia.
  alertas_motor?: AlertaMotor[];
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
  // Campos de diagnóstico del backend (posibles alucinaciones LLM)
  _needs_review?: boolean;
  _review_reason?: string;
  _vl_source?: boolean;
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
