"use client";

/** P1 · Expediente de concursos — home del flujo pivote.
 *  Auto-refresh: los análisis que crea el MCP aparecen sin recargar. */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PanelShell from "@/components/PanelShell";
import { type Concurso, fmtFechaHora } from "@/lib/pivote/types";

type ConcursoResumen = Concurso & { n_jobs: number; pendientes: number };

function MetricCard({ icon, label, value, accent }: {
  icon: string; label: string; value: string; accent?: boolean;
}) {
  return (
    <div className={`bg-surface-container-lowest p-4 border-l-4 ${accent ? "border-amber-500" : "border-primary"} shadow-ambient rounded-xl flex items-start gap-4`}>
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <span className={`material-symbols-outlined text-xl ${accent ? "text-amber-600" : "text-primary"}`}>{icon}</span>
      </div>
      <div>
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-slate-500">{label}</p>
        <p className={`text-2xl font-bold ${accent ? "text-amber-600" : "text-primary"}`}>{value}</p>
      </div>
    </div>
  );
}

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

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 8000); // los jobs del MCP llegan solos
    return () => clearInterval(t);
  }, [cargar]);

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

  const visibles = concursos
    .filter((c) => {
      const q = filtro.toLowerCase();
      return !q || c.nomenclatura.toLowerCase().includes(q) || (c.entidad ?? "").toLowerCase().includes(q);
    })
    .sort((a, b) => (b.creado_en ?? "").localeCompare(a.creado_en ?? ""));  // más reciente primero

  const totalAnalisis = concursos.reduce((s, c) => s + c.n_jobs, 0);
  const totalPendientes = concursos.reduce((s, c) => s + c.pendientes, 0);

  return (
    <PanelShell title="Concursos" subtitle="Claude evalúa las propuestas; el sistema las verifica con SUNAT e InfoObras">
      {/* métricas */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <MetricCard icon="gavel" label="Concursos" value={cargando ? "…" : String(concursos.length)} />
        <MetricCard icon="lab_profile" label="Análisis (postores)" value={cargando ? "…" : String(totalAnalisis)} />
        <MetricCard icon="pending_actions" label="Pendientes de revisión" value={cargando ? "…" : String(totalPendientes)} accent={totalPendientes > 0} />
      </section>

      {/* barra: buscador + nuevo */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por nomenclatura o entidad…"
            className="w-full h-10 pl-10 pr-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20 text-sm focus:outline-none focus:border-primary/50 shadow-ambient"
          />
        </div>
        <button
          onClick={() => setCreando((v) => !v)}
          className="inline-flex items-center gap-1.5 primary-gradient text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-opacity hover:opacity-90"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Nuevo concurso
        </button>
      </div>

      {/* form crear */}
      {creando && (
        <div className="mb-6 p-5 rounded-xl bg-surface-container-lowest shadow-ambient border border-outline-variant/10 flex flex-wrap gap-3 items-end animate-[fadeIn_.2s_ease]">
          <div className="flex-1 min-w-[260px]">
            <label className="block text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-slate-500 mb-1.5">
              Nomenclatura *
            </label>
            <input
              value={nomenclatura}
              onChange={(e) => setNomenclatura(e.target.value)}
              placeholder="CP-02-2026/GOB.REG.XXX/C"
              className="w-full h-10 px-3 rounded-lg bg-surface border border-outline-variant/20 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-slate-500 mb-1.5">
              Entidad convocante
            </label>
            <input
              value={entidad}
              onChange={(e) => setEntidad(e.target.value)}
              placeholder="Gobierno Regional de…"
              className="w-full h-10 px-3 rounded-lg bg-surface border border-outline-variant/20 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <button
            onClick={crear}
            disabled={!nomenclatura.trim()}
            className="h-10 px-5 rounded-lg primary-gradient text-white text-xs font-semibold disabled:opacity-40"
          >
            Crear
          </button>
        </div>
      )}

      {/* tabla de concursos */}
      <section className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 overflow-hidden">
        {cargando ? (
          <div className="px-5 py-10 text-center text-sm text-outline">Cargando…</div>
        ) : visibles.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-outline">
            {filtro ? "Sin resultados para ese filtro." : "Sin concursos. Crea el primero."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-high">
                <tr>
                  {["Concurso", "Fecha", "Entidad", "Postores", "A revisión", ""].map((h, i) => (
                    <th key={i} className="px-5 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {visibles.map((c) => (
                  <tr key={c.concurso_id} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/concursos/${c.concurso_id}`} className="text-sm font-semibold text-primary hover:underline">
                        {c.nomenclatura}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-outline whitespace-nowrap">{fmtFechaHora(c.creado_en)}</td>
                    <td className="px-5 py-3.5 text-xs text-outline">{c.entidad ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 rounded bg-surface-container-high text-[0.6875rem] font-bold text-on-surface-variant">
                        {c.n_jobs}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {c.pendientes > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[0.6875rem] font-bold">
                          <span className="material-symbols-outlined text-[13px]">pending_actions</span>
                          {c.pendientes}
                        </span>
                      ) : (
                        <span className="text-xs text-outline">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/concursos/${c.concurso_id}`}
                        className="inline-flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors">
                        Abrir expediente
                        <span className="material-symbols-outlined text-base">chevron_right</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PanelShell>
  );
}
