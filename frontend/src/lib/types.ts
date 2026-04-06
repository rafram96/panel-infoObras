export type JobStatus = "pending" | "running" | "done" | "error";

export interface Job {
  id: string;
  filename: string;
  pages_from: number | null;
  pages_to: number | null;
  status: JobStatus;
  created_at: string;
  progress_pct: number;
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

export interface JobDetail extends Job {
  result: {
    total_pages: number;
    pages_paddle: number;
    pages_qwen: number;
    pages_error: number;
    conf_promedio: number;
    tiempo_total: number;
    secciones: Seccion[];
  } | null;
  error: string | null;
  progress_stage: string | null;
  doc_total_pages: number | null;
}
