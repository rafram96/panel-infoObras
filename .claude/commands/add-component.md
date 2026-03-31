Crea un nuevo componente React en el panel.

El argumento es el nombre del componente en PascalCase (ej: `JobStatusBadge`, `ProfessionalList`, `UploadForm`).

Convenciones:
- Componentes de UI puros (sin fetch, sin estado global): `src/components/ui/$ARGUMENTS.tsx`
- Componentes de features con lógica: `src/components/$ARGUMENTS.tsx`
- Si el componente usa hooks o eventos del browser, agregar `"use client"` al inicio
- Props siempre tipadas con interface: `interface ${ARGUMENTS}Props { ... }`
- Exportación nombrada, no default: `export function $ARGUMENTS(...)`

Para componentes que muestran estado de un job OCR, usar estos colores de Tailwind para los badges de estado:
- `pendiente` → `bg-gray-100 text-gray-700`
- `procesando` → `bg-blue-100 text-blue-700`
- `completado` → `bg-green-100 text-green-700`
- `error` → `bg-red-100 text-red-700`

Para confianza OCR:
- ≥ 0.90 → `text-green-600`
- 0.75–0.89 → `text-yellow-600`
- < 0.75 → `text-red-600`
