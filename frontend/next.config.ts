import type { NextConfig } from "next";

// Backend del PIVOTE (FastAPI). Si PIVOTE_API está definida, TODAS las rutas
// /api/pivote/* van al backend real (beforeFiles: gana incluso a los route
// handlers mock). Sin la variable, sirven los mocks locales.
//   PIVOTE_API=http://localhost:8001 npm run dev
const PIVOTE_API = process.env.PIVOTE_API;

const config: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: PIVOTE_API
        ? [{
            source: "/api/pivote/:path*",
            destination: `${PIVOTE_API}/api/pivote/:path*`,
          }]
        : [],
      afterFiles: [
        {
          // Proxy al backend LEGACY (motor-OCR, puerto 8000).
          // `(?!pivote)` excluye /api/pivote/*: esas rutas las sirve el mock
          // local o el backend del pivote (arriba) — sin la exclusión, el
          // rewrite se come las rutas dinámicas [id].
          source: "/api/:path((?!pivote).*)",
          destination: "http://localhost:8000/api/:path*",
        },
      ],
      fallback: [],
    };
  },
};

export default config;
