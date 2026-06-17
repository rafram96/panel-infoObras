# Panel web del pivote (Next.js 15). Sirve la UI y proxyea /api/pivote/* al
# backend on-prem según la variable PIVOTE_API (la inyecta docker-compose).
FROM node:20-slim

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

WORKDIR /app

# Dependencias primero (capa cacheable). npm ci instala también devDeps, que
# Next necesita para `next build`.
COPY package.json package-lock.json ./
RUN npm ci

# Código del panel (sin .env.local ni node_modules — ver .dockerignore).
COPY . .

# Build de producción. PIVOTE_API se resuelve en RUNTIME (next.config lee
# process.env al arrancar), no aquí.
RUN npm run build

EXPOSE 3002

CMD ["npm", "run", "start"]
