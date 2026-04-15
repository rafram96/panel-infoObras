"use client";

import { useState, type FormEvent } from "react";
import PanelShell from "@/components/PanelShell";

interface Candidato {
  obra_id: number;
  nombre: string;
  cui: string;
  estado: string;
  entidad: string;
  fecha_inicio: string | null;
  score: number;
  motivos: string[];
}

interface ObraDetalle {
  cui: string;
  obra_id: number;
  nombre: string;
  estado: string;
  entidad: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  plazo_dias: number | null;
  supervisores: { nombre: string; tipo: string; fecha_inicio: string | null; fecha_fin: string | null }[];
  residentes: { nombre: string; fecha_inicio: string | null; fecha_fin: string | null }[];
  paralizaciones: number;
  suspension_periods: { inicio: string; fin: string }[];
  total_avances: number;
}

export default function InfoObrasPage() {
  const [projectName, setProjectName] = useState("");
  const [certDate, setCertDate] = useState("");
  const [entidad, setEntidad] = useState("");

  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<Candidato[]>([]);
  const [searched, setSearched] = useState(false);

  const [loading, setLoading] = useState(false);
  const [detalle, setDetalle] = useState<ObraDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setSearching(true);
    setError(null);
    setCandidates([]);
    setDetalle(null);

    try {
      const fd = new FormData();
      fd.append("project_name", projectName);
      if (certDate) fd.append("cert_date", certDate);
      if (entidad) fd.append("entidad", entidad);

      const res = await fetch("/api/infoobras/search", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setCandidates(data.candidates || []);
      setSearched(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error de búsqueda");
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = async (cui: string) => {
    setLoading(true);
    setError(null);
    setDetalle(null);

    try {
      const res = await fetch(`/api/infoobras/obra/${cui}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: ObraDetalle = await res.json();
      setDetalle(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar obra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PanelShell title="Consulta InfoObras" subtitle="Herramientas">
      <div className="max-w-[1200px] mx-auto p-8 lg:p-12">
        {/* Header */}
        <div className="mb-10 border-l-4 border-primary pl-6">
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.15rem] text-secondary">
            Verificación de Obras
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-primary mt-1">
            Consulta InfoObras
          </h2>
          <p className="text-on-surface-variant text-sm mt-2 max-w-2xl">
            Busque una obra por nombre del proyecto para verificar su estado,
            supervisores, residentes y periodos de paralización en el portal
            de la Contraloría.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="max-w-[700px] space-y-4 mb-8">
          <div>
            <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-secondary mb-2">
              Nombre del Proyecto (del certificado)
            </label>
            <textarea
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="MEJORAMIENTO Y AMPLIACIÓN DE LOS SERVICIOS DE SALUD DEL HOSPITAL..."
              rows={3}
              className="w-full bg-surface-container-low border-0 focus:ring-2 focus:ring-primary-fixed text-sm font-medium p-3 rounded-lg text-on-surface resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-secondary mb-2">
                Fecha del Certificado (opcional)
              </label>
              <input
                type="date"
                value={certDate}
                onChange={(e) => setCertDate(e.target.value)}
                className="w-full bg-surface-container-low border-0 focus:ring-2 focus:ring-primary-fixed text-sm font-medium p-3 rounded-lg text-on-surface"
              />
            </div>
            <div>
              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-secondary mb-2">
                Entidad (opcional)
              </label>
              <input
                type="text"
                value={entidad}
                onChange={(e) => setEntidad(e.target.value)}
                placeholder="ESSALUD, Gobierno Regional, etc."
                className="w-full bg-surface-container-low border-0 focus:ring-2 focus:ring-primary-fixed text-sm font-medium p-3 rounded-lg text-on-surface"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!projectName.trim() || searching}
              className="px-8 py-3 primary-gradient text-white rounded-lg shadow-[0_4px_14px_0_rgba(2,36,72,0.39)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">
                {searching ? "progress_activity" : "search"}
              </span>
              <span className="text-sm font-extrabold uppercase tracking-[0.1rem]">
                {searching ? "Buscando..." : "Buscar en InfoObras"}
              </span>
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-error-container/30 border border-error/20 rounded-lg mb-6">
            <span className="material-symbols-outlined text-error text-lg">error</span>
            <p className="text-sm font-medium text-error">{error}</p>
          </div>
        )}

        {/* Candidates table */}
        {searched && candidates.length > 0 && !detalle && (
          <section className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-outline-variant/10">
              <h2 className="text-sm font-semibold text-primary">
                Resultados ({candidates.length})
              </h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Seleccione la obra correcta para ver sus datos completos
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-high">
                  <tr>
                    {["Score", "Obra", "CUI", "Estado", "Entidad", "Inicio", ""].map((h) => (
                      <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {candidates.map((c, i) => (
                    <tr
                      key={c.obra_id}
                      className="hover:bg-surface-container-high/40 transition-colors cursor-pointer"
                      onClick={() => c.cui && handleSelect(c.cui)}
                    >
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.score >= 50 ? "bg-green-100 text-green-700" :
                          c.score >= 25 ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {c.score}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-primary font-medium max-w-[300px]">
                        {c.nombre}
                      </td>
                      <td className="px-3 py-2 text-xs text-secondary font-mono">{c.cui || "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.estado === "En Ejecución" ? "bg-blue-100 text-blue-700" :
                          c.estado === "Finalizado" ? "bg-green-100 text-green-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {c.estado}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-secondary max-w-[200px] truncate">{c.entidad}</td>
                      <td className="px-3 py-2 text-xs text-secondary">{c.fecha_inicio || "—"}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); c.cui && handleSelect(c.cui); }}
                          className="text-primary hover:opacity-70"
                        >
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {searched && candidates.length === 0 && !searching && (
          <div className="text-center py-12 text-on-surface-variant text-sm">
            No se encontraron obras con ese nombre en InfoObras.
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <span className="material-symbols-outlined text-4xl text-outline animate-spin">progress_activity</span>
          </div>
        )}

        {/* Obra detail */}
        {detalle && (
          <section className="space-y-6">
            {/* Header */}
            <div className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-primary">{detalle.nombre}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs font-mono text-secondary">CUI: {detalle.cui}</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      detalle.estado === "En Ejecución" ? "bg-blue-100 text-blue-700" :
                      detalle.estado === "Finalizado" ? "bg-green-100 text-green-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {detalle.estado}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { setDetalle(null); }}
                  className="text-outline hover:text-primary"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Entidad</p>
                  <p className="text-xs text-on-surface">{detalle.entidad || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Periodo</p>
                  <p className="text-xs text-on-surface">{detalle.fecha_inicio || "?"} — {detalle.fecha_fin || "?"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Plazo</p>
                  <p className="text-xs text-on-surface">{detalle.plazo_dias ? `${detalle.plazo_dias} días` : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avances</p>
                  <p className="text-xs text-on-surface">{detalle.total_avances} registros</p>
                </div>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-surface-container-lowest p-4 border-l-4 border-blue-500 shadow-ambient rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Supervisores</p>
                <p className="text-2xl font-bold text-primary">{detalle.supervisores.length}</p>
              </div>
              <div className="bg-surface-container-lowest p-4 border-l-4 border-violet-500 shadow-ambient rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Residentes</p>
                <p className="text-2xl font-bold text-primary">{detalle.residentes.length}</p>
              </div>
              <div className={`bg-surface-container-lowest p-4 border-l-4 shadow-ambient rounded-xl ${detalle.paralizaciones > 0 ? "border-red-500" : "border-green-500"}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Paralizaciones</p>
                <p className={`text-2xl font-bold ${detalle.paralizaciones > 0 ? "text-red-600" : "text-green-600"}`}>{detalle.paralizaciones}</p>
              </div>
            </div>

            {/* Supervisors */}
            {detalle.supervisores.length > 0 && (
              <div className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 overflow-hidden">
                <div className="px-5 py-3 border-b border-outline-variant/10">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">badge</span>
                    Supervisores / Inspectores
                  </h4>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-high">
                    <tr>
                      {["Nombre", "Tipo", "Inicio", "Fin"].map((h) => (
                        <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {detalle.supervisores.map((s, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium text-on-surface">{s.nombre}</td>
                        <td className="px-3 py-2 text-secondary">{s.tipo}</td>
                        <td className="px-3 py-2 text-secondary">{s.fecha_inicio || "—"}</td>
                        <td className="px-3 py-2 text-secondary">{s.fecha_fin || "vigente"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Residents */}
            {detalle.residentes.length > 0 && (
              <div className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 overflow-hidden">
                <div className="px-5 py-3 border-b border-outline-variant/10">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">engineering</span>
                    Residentes
                  </h4>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-high">
                    <tr>
                      {["Nombre", "Inicio", "Fin"].map((h) => (
                        <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {detalle.residentes.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium text-on-surface">{r.nombre}</td>
                        <td className="px-3 py-2 text-secondary">{r.fecha_inicio || "—"}</td>
                        <td className="px-3 py-2 text-secondary">{r.fecha_fin || "vigente"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Suspension periods */}
            {detalle.suspension_periods.length > 0 && (
              <div className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 overflow-hidden">
                <div className="px-5 py-3 border-b border-outline-variant/10">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-error flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    Periodos de Paralización / Suspensión
                  </h4>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-high">
                    <tr>
                      {["#", "Inicio", "Fin"].map((h) => (
                        <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {detalle.suspension_periods.map((p, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-secondary font-mono">{i + 1}</td>
                        <td className="px-3 py-2 text-error font-medium">{p.inicio}</td>
                        <td className="px-3 py-2 text-error font-medium">{p.fin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </PanelShell>
  );
}
