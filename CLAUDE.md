# Panel InfoObras — Frontend Next.js

Panel web interno para gestionar el procesamiento de documentos del ecosistema InfoObras. Esta primera fase cubre únicamente la integración con **motor-OCR**.

## Stack

- Next.js 14+ (App Router)
- React + TypeScript
- Tailwind CSS
- shadcn/ui (componentes)

## Contexto del ecosistema

El panel consume servicios Python que corren en el mismo servidor. Ver el CLAUDE.md del orquestador (`../CLAUDE.md`) para la arquitectura completa. Por ahora solo se integra con motor-OCR.

---

## Motor-OCR — referencia completa de integración

**Repo:** `D:\proyectos\InfoObras\motor-OCR`
**No tiene API REST todavía.** Se invoca como subprocess vía `subprocess_wrapper.py`.

El panel no llama a motor-OCR directamente — lo hace a través del backend (FastAPI del evaluador en Alpamayo-InfoObras, puerto 8000). El panel solo necesita saber la forma de los datos que devuelve.

---

### Modos de operación

| Modo | Descripción | Cuándo usarlo |
|---|---|---|
| `ocr_only` | Extrae texto, sin segmentar por profesional | Cuando solo se necesita el texto del documento |
| `segmentation` | Extrae texto + identifica secciones por cargo | Para procesar propuestas técnicas completas |

---

### Input al subprocess

```json
{
  "mode": "segmentation",
  "pdf_path": "D:/proyectos/infoobras/uploads/propuesta.pdf",
  "pages": null,
  "output_dir": "D:/proyectos/infoobras/ocr_output",
  "keep_images": false
}
```

- `pages`: `null` para todo el documento, o array `[1, 5, 10]` para páginas específicas (base 1)
- `output_dir`: se crea automáticamente si no existe

---

### Output — modo `ocr_only`

```ts
interface OcrOnlyResult {
  mode: "ocr_only"
  total_pages: number
  pages_paddle: number       // páginas procesadas por PaddleOCR
  pages_qwen: number         // páginas que usaron fallback Qwen-VL
  pages_error: number        // páginas que fallaron
  conf_promedio_documento: number  // 0.0 – 1.0
  tiempo_total: number       // segundos
  full_text: string          // texto completo del documento
}
```

---

### Output — modo `segmentation`

```ts
interface SegmentationResult {
  mode: "segmentation"
  doc: {
    total_pages: number
    pages_paddle: number
    pages_qwen: number
    pages_error: number
    conf_promedio_documento: number
    tiempo_total: number
    full_text: string
  }
  secciones: ProfessionalSection[]
}

interface ProfessionalSection {
  section_index: number        // 1, 2, 3...
  cargo: string                // cargo normalizado: "Gerente de Contrato"
  numero: string | null        // "1", "2" si hay varios del mismo cargo, null si es único
  total_pages: number          // páginas que ocupa esta sección
  full_text: string            // texto completo de la sección
}
```

---

### Archivos generados en disco

Motor-OCR genera cuatro archivos Markdown en `{output_dir}/{pdf_stem}/`:

```
ocr_output/
└── propuesta/
    ├── propuesta_metricas_20260330_142500.md   # métricas por página
    ├── propuesta_texto_20260330_142500.md       # texto por página
    ├── propuesta_segmentacion_20260330_142500.md  # candidatos a separadores
    └── propuesta_profesionales_20260330_142500.md # secciones por profesional
```

El panel puede ofrecer descarga de estos archivos como reportes.

---

### Tiempos de procesamiento

| Escenario | Tiempo aproximado |
|---|---|
| Documento pequeño (< 50 páginas) | 5–15 min |
| Propuesta típica (200–400 páginas) | 40–100 min |
| Documento grande (390 páginas) | ~1h 40min |

**El procesamiento es asíncrono obligatoriamente.** El flujo debe ser:
1. Usuario sube PDF → recibe un job ID
2. Panel hace polling o WebSocket para ver estado
3. Cuando el job termina, muestra resultados

---

### Estados de un job

```ts
type JobStatus = "pendiente" | "procesando" | "completado" | "error"

interface Job {
  id: string
  nombre_archivo: string
  estado: JobStatus
  modo: "ocr_only" | "segmentation"
  progreso_pagina?: number      // página actual que se está procesando
  total_paginas?: number
  creado_en: string             // ISO 8601
  actualizado_en: string
  error?: string                // mensaje si estado === "error"
  resultado?: OcrOnlyResult | SegmentationResult
}
```

---

### Confianza OCR — interpretación para el UI

| `conf_promedio_documento` | Estado sugerido en UI |
|---|---|
| ≥ 0.90 | Excelente — verde |
| 0.75 – 0.89 | Bueno — amarillo |
| < 0.75 | Bajo — rojo, advertir al usuario |

Si `pages_error > 0`, mostrar advertencia con el conteo de páginas fallidas.

---

### Cargos detectados — ejemplos

Motor-OCR normaliza los cargos. Los más comunes en propuestas peruanas de obras:

- Gerente de Contrato
- Jefe de Supervisión
- Especialista en Estructura
- Especialista en Arquitectura
- Especialista en Instalaciones Sanitarias
- Especialista en Instalaciones Eléctricas
- Especialista Ambiental
- Especialista en Seguridad y Salud
- Especialista en Costos y Presupuestos
- Residente de Obra

Si `numero` es "1", "2", etc., significa que hay múltiples profesionales para ese cargo (ej: dos Especialistas en Estructura).

---

## Flujo de pantallas (fase 1)

```
/ (home)
  └── /upload          → formulario: subir PDF, elegir modo
        └── /jobs      → lista de jobs con estado
              └── /jobs/[id]  → detalle: resultados, métricas, descarga reportes
```

### Pantalla /upload
- Input de archivo (PDF solamente, sin límite de tamaño definido — documentos de 390 páginas son normales)
- Selector de modo: OCR simple / Segmentar por profesional
- Botón enviar → redirige a /jobs/[id]

### Pantalla /jobs
- Tabla con todos los jobs
- Columnas: archivo, modo, estado (badge), páginas procesadas, tiempo, fecha
- Auto-refresh cada 30s o WebSocket
- Clic en fila → /jobs/[id]

### Pantalla /jobs/[id]
- Estado actual del job con barra de progreso (página actual / total)
- Si `completado`:
  - Métricas globales: total páginas, % paddle vs qwen, confianza promedio
  - Si modo `segmentation`: lista de profesionales detectados con cargo, páginas y preview de texto
  - Botones de descarga para los 4 archivos Markdown
- Si `error`: mensaje de error y opción de reintentar

---

## API del backend (Alpamayo-InfoObras, puerto 8000)

Endpoints que el panel necesita consumir (algunos por crear en el backend):

```
POST   /api/ocr/jobs           → crear job, recibe PDF, devuelve { id }
GET    /api/ocr/jobs           → listar todos los jobs
GET    /api/ocr/jobs/:id       → estado y resultado de un job
DELETE /api/ocr/jobs/:id       → cancelar job pendiente
GET    /api/ocr/jobs/:id/files → listar archivos Markdown generados
GET    /api/ocr/jobs/:id/files/:filename → descargar archivo Markdown
WS     /ws/ocr/jobs/:id        → WebSocket para progreso en tiempo real
```

---

## Variables de entorno del panel

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

En producción (servidor), `NEXT_PUBLIC_API_URL` apunta a la IP/hostname del servidor.
