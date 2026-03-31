Muestra o genera los tipos TypeScript para la API de motor-OCR.

Los tipos base están definidos en CLAUDE.md. Si el argumento es "show", imprime los tipos. Si es un nombre de endpoint (ej: "jobs", "job-detail"), genera los tipos para ese endpoint.

Tipos base del proyecto (ya deben existir en src/types/ocr.ts):

```typescript
export type JobStatus = "pendiente" | "procesando" | "completado" | "error"
export type OcrMode = "ocr_only" | "segmentation"

export interface Job {
  id: string
  nombre_archivo: string
  estado: JobStatus
  modo: OcrMode
  progreso_pagina?: number
  total_paginas?: number
  creado_en: string
  actualizado_en: string
  error?: string
  resultado?: OcrOnlyResult | SegmentationResult
}

export interface OcrOnlyResult {
  mode: "ocr_only"
  total_pages: number
  pages_paddle: number
  pages_qwen: number
  pages_error: number
  conf_promedio_documento: number
  tiempo_total: number
  full_text: string
}

export interface SegmentationResult {
  mode: "segmentation"
  doc: Omit<OcrOnlyResult, "mode">
  secciones: ProfessionalSection[]
}

export interface ProfessionalSection {
  section_index: number
  cargo: string
  numero: string | null
  total_pages: number
  full_text: string
}
```

Si estos tipos no existen aún, créalos en `src/types/ocr.ts`.
