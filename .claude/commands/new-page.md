Crea una nueva página en el panel Next.js siguiendo las convenciones del proyecto.

El argumento es la ruta de la página (ej: `jobs/[id]`, `upload`, `settings`).

Pasos:
1. Crea `src/app/$ARGUMENTS/page.tsx` con estructura básica de Server Component
2. Si la página necesita interactividad del cliente, crea un componente separado en `src/components/` con `"use client"`
3. Si la página consume la API del backend, crea el tipo TypeScript correspondiente en `src/types/`
4. Usa Tailwind CSS para estilos — sin CSS modules ni styled-components
5. Usa componentes de shadcn/ui cuando estén disponibles en `src/components/ui/`

La URL base de la API es `process.env.NEXT_PUBLIC_API_URL` (string, siempre presente).

No crear páginas con lógica de negocio directamente en page.tsx — separarla en componentes o server actions.
