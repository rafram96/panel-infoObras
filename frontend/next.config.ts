import type { NextConfig } from "next";

const config: NextConfig = {
  async rewrites() {
    return [
      {
        // Proxy al backend LEGACY (motor-OCR, puerto 8000).
        // `(?!pivote)` excluye /api/pivote/* : esas rutas las sirven los
        // route handlers locales (mock del backend del pivote) — sin la
        // exclusión, el rewrite se come las rutas dinámicas [id].
        source: "/api/:path((?!pivote).*)",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default config;
