# Panel web del pivote (Next.js 15). Sirve la UI y proxyea /api/pivote/* al
# backend on-prem según la variable PIVOTE_API (la inyecta docker-compose).
#
# Node ANCLADO a 20.17 a propósito: el tag flotante node:20-slim bajaba 20.19+,
# cuyo V8 rompe el `next build` de Next 15.2.4 con
#   EvalError: Identifier 'Debug' cannot be declared with 'var'
# 20.17 es la última buena verificada (build local pasa con ella). Al subir Next
# (pendiente por CVE-2025-66478) se puede volver a un tag más nuevo.
FROM node:20.17.0-slim

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

WORKDIR /app

# Dependencias primero (capa cacheable). --include=dev es OBLIGATORIO: con
# NODE_ENV=production (arriba), `npm ci` OMITIRÍA las devDeps — pero `next build`
# necesita typescript (para resolver los paths `@/` del tsconfig) y tailwind/
# postcss (para el CSS). Sin ellas el build falla con "Module not found: @/...".
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Código del panel (sin .env.local ni node_modules — ver .dockerignore).
COPY . .

# URL del backend alcanzable por el BROWSER de Manuel (LAN). Es NEXT_PUBLIC_* →
# Next la HORNEA en build-time en el bundle del cliente; el panel la usa para bajar
# el ZIP DIRECTO del backend (el proxy de Next no streamea archivos de GBs → .txt).
ARG NEXT_PUBLIC_PIVOTE_API
ENV NEXT_PUBLIC_PIVOTE_API=${NEXT_PUBLIC_PIVOTE_API}

# Build de producción. PIVOTE_API (el proxy server-side) se resuelve en RUNTIME
# (next.config lee process.env al arrancar), no aquí.
RUN npm run build

EXPOSE 3002

CMD ["npm", "run", "start"]
