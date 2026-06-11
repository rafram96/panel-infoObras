"use client";

/** P1 · Expediente de concursos — home del flujo pivote.
 *  El concurso es la unidad mental; los jobs son plomería. */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PanelShell from "@/components/PanelShell";
import type { Concurso } from "@/lib/pivote/types";

type ConcursoResumen = Concurso & { n_jobs: number; pendientes: number };

export default function ConcursosPage() {
  const [concursos, setConcursos] = useState<ConcursoResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [creando, setCreando] = useState(false);
  const [nomenclatura, setNomenclatura] = useState("");
  const [entidad, setEntidad] = useState("");

  const cargar = useCallback(async () => {
    try {
      const r = await fetch("/api/pivote/concursos");
      if (r.ok) setConcursos(await r.json());
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async () => {
    if (!nomenclatura.trim()) return;
    const r = await fetch("/api/pivote/concursos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomenclatura: nomenclatura.trim(), entidad: entidad.trim() || undefined }),
    });
    if (r.ok) {
      setNomenclatura(""); setEntidad(""); setCreando(false);
      cargar();
    }
  };

  const visibles = concursos.filter((c) => {
    const q = filtro.toLowerCase();
    return !q || c.nomenclatura.toLowerCase().includes(q) || (c.entidad ?? "").toLowerCase().includes(q);
  });

  return (
    <PanelShell title="Concursos" subtitle="Expedientes del flujo pivote — Claude evalúa, el backend verifica">
      <div className="max-w-5xl">
        {/* barra superior */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[240px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar por nomenclatura o entidad…"
              className="w-full h-10 pl-10 pr-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-[0.8125rem] focus:outline-none focus:border-primary/50"
            />
          </div>
          <button
            onClick={() => setCreando((v) => !v)}
            className="h-10 px-4 rounded-lg bg-primary text-on-primary text-[0.8125rem] font-semibold flex items-center gap-2 hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nuevo concurso
          </button>
        </div>

        {/* form de creación */}
        {creando && (
          <div className="mb-6 p-5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[260px]">
              <label className="block text-[0.6875rem] font-bold uppercase tracking-wide text-on-surface-variant mb-1">
                Nomenclatura *
              </label>
              <input
                value={nomenclatura}
                onChange={(e) => setNomenclatura(e.target.value)}
                placeholder="CP-02-2026/GOB.REG.XXX/C"
                className="w-full h-10 px-3 rounded-lg bg-surface border border-outline-variant/30 text-[0.8125rem] focus:outline-none focus:border-primary/50"
              />
            </div>
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[0.6875rem] font-bold uppercase tracking-wide text-on-surface-variant mb-1">
                Entidad convocante
              </label>
              <input
                value={entidad}
                onChange={(e) => setEntidad(e.target.value)}
                placeholder="Gobierno Regional de…"
                className="w-full h-10 px-3 rounded-lg bg-surface border border-outline-variant/30 text-[0.8125rem] focus:outline-none focus:border-primary/50"
              />
            </div>
            <button
              onClick={crear}
              disabled={!nomenclatura.trim()}
              className="h-10 px-4 rounded-lg bg-primary text-on-primary text-[0.8125rem] font-semibold disabled:opacity-40"
            >
              Crear
            </button>
          </div>
        )}

        {/* lista */}
        {cargando ? (
          <p className="text-[0.8125rem] text-on-surface-variant">Cargando…</p>
        ) : visibles.length === 0 ? (
          <p className="text-[0.8125rem] text-on-surface-variant">Sin concursos. Crea el primero.</p>
        ) : (
          <div className="space-y-3">
            {visibles.map((c) => (
              <Link
                key={c.concurso_id}
                href={`/concursos/${c.concurso_id}`}
                className="block p-5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/40 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[260px]">
                    <h3 className="text-[0.9375rem] font-bold text-primary">{c.nomenclatura}</h3>
                    <p className="text-[0.75rem] text-on-surface-variant mt-0.5">
                      {c.entidad ?? "—"}
                      {c.fecha_presentacion ? ` · presentación ${c.fecha_presentacion}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-[0.6875rem] font-bold text-on-surface-variant">
                      {c.n_jobs} {c.n_jobs === 1 ? "postor" : "postores"}
                    </span>
                    {c.pendientes > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[0.6875rem] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">pending_actions</span>
                        {c.pendientes} a revisión
                      </span>
                    )}
                    <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PanelShell>
  );
}
