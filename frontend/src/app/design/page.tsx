"use client";

import { useState } from "react";
import Link from "next/link";

const screens = [
  { file: "dashboard.html", title: "Dashboard", description: "Vista principal con metricas y resumen" },
  { file: "dashboard-dark.html", title: "Dashboard (Oscuro)", description: "Modo oscuro del dashboard" },
  { file: "nuevo-analisis.html", title: "Nuevo Analisis", description: "Formulario para iniciar analisis de licitacion" },
  { file: "progreso.html", title: "Progreso del Analisis", description: "Seguimiento en tiempo real del procesamiento" },
  { file: "resultados.html", title: "Resultados del Analisis", description: "Detalle de resultados con profesionales detectados" },
  { file: "confirmacion-cuis.html", title: "Confirmacion de CUIs", description: "Validacion de CUIs contra InfoObras" },
  { file: "historial.html", title: "Historial de Analisis", description: "Lista de todos los analisis realizados" },
  { file: "exportar.html", title: "Exportar Resultados", description: "Opciones de exportacion a Excel" },
];

export default function DesignIndex() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Stitch Designs — InfoObras
            </h1>
            <p className="text-xs text-slate-400">
              Mockups estaticos de referencia (sin backend)
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            &larr; Panel principal
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Screen selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {screens.map((s) => (
            <button
              key={s.file}
              onClick={() => setActive(s.file)}
              className={[
                "text-left p-3 rounded-lg border transition-all text-sm",
                active === s.file
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300",
              ].join(" ")}
            >
              <p className="font-medium text-slate-800">{s.title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                {s.description}
              </p>
            </button>
          ))}
        </div>

        {/* Iframe preview */}
        {active ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
              <span className="text-xs text-slate-500 font-mono">
                /design/{active}
              </span>
              <a
                href={`/design/${active}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Abrir en nueva pestana
              </a>
            </div>
            <iframe
              src={`/design/${active}`}
              className="w-full border-0"
              style={{ height: "80vh" }}
              title={active}
            />
          </div>
        ) : (
          <div className="text-center py-20 text-slate-400 text-sm">
            Selecciona un screen para previsualizarlo
          </div>
        )}
      </main>
    </div>
  );
}
