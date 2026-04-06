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

export interface Seccion {
  index: number;
  cargo: string;
  cargo_raw: string;
  numero: string | null;
  total_pages: number;
  page_numbers: number[];
  bloques: Bloque[];
  es_tipo_b: boolean;
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
