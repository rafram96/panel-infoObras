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

interface Supervisor {
  nombre: string;
  tipo: string;
  tipo_persona?: string | null;
  empresa?: string | null;
  ruc?: string | null;
  dni?: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

interface Residente {
  nombre: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

interface Contratista {
  tipo_empresa: string;
  ruc: string | null;
  nombre_empresa: string;
  monto_soles: number | null;
  numero_contrato: string | null;
  fecha_contrato: string | null;
  fecha_fin_contrato: string | null;
}

interface Adenda {
  numero: string | null;
  fecha: string | null;
  descripcion: string | null;
}

interface Cronograma {
  tipo: string | null;
  fecha_aprobacion: string | null;
  documento: string | null;
  nueva_fecha_termino: string | null;
}

interface ModificacionPlazo {
  tipo: string;
  causal: string | null;
  dias_aprobados: number;
  fecha_aprobacion: string | null;
  fecha_fin: string | null;
}

interface EntregaTerreno {
  tipo_entrega: string | null;
  fecha_entrega: string | null;
  porcentaje: number | null;
}

interface Transferencia {
  ambito: string | null;
  entidad_origen: string | null;
  monto: number | null;
  documento: string | null;
}

interface Adelanto {
  tipo: string | null;
  monto: number | null;
  fecha_entrega: string | null;
  documento_aprobacion: string | null;
}

interface AdicionalDeductivo {
  numero: string | null;
  tipo: string | null;
  subtipo: string | null;
  causal: string | null;
  fecha_aprobacion: string | null;
  porcentaje: number | null;
  monto: number | null;
  documento: string | null;
}

interface Controversia {
  mecanismo: string | null;
  estado: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  documento: string | null;
}

interface AvanceMensual {
  anio: number;
  mes: number;
  estado: string;
  tipo_paralizacion: string | null;
  fecha_paralizacion: string | null;
  dias_paralizado: number;
  causal: string | null;
  avance_fisico_programado: number | null;
  avance_fisico_real: number | null;
  valorizado_programado: number | null;
  valorizado_real: number | null;
  pct_ejecucion_financiera: number | null;
  monto_ejecucion_financiera: number | null;
}

interface ObraDetalle {
  cui: string;
  obra_id: number;
  codigo_infobras: string | null;
  nombre: string;
  estado: string;
  tipo_obra: string | null;
  entidad: string;
  ejecutor: string | null;
  ruc_ejecutor: string | null;
  monto_contrato: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  plazo_dias: number | null;
  porcentaje_avance_fisico: number | null;
  monto_ejecutado_acumulado: number | null;
  supervisores: Supervisor[];
  residentes: Residente[];
  contratistas: Contratista[];
  adendas: Adenda[];
  cronogramas: Cronograma[];
  modificaciones_plazo: ModificacionPlazo[];
  entregas_terreno: EntregaTerreno[];
  transferencias: Transferencia[];
  adelantos: Adelanto[];
  adicionales_deductivos: AdicionalDeductivo[];
  controversias: Controversia[];
  avances: AvanceMensual[];
  paralizaciones: number;
  suspension_periods: { inicio: string; fin: string }[];
  total_avances: number;
}

const MES_NOMBRE = [
  "—", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
];

function fmtSoles(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return `S/ ${v.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(2)}%`;
}

type Modo = "nombre" | "cui";

export default function InfoObrasPage() {
  const [modo, setModo] = useState<Modo>("nombre");

  // Modo "nombre"
  const [projectName, setProjectName] = useState("");
  const [certDate, setCertDate] = useState("");
  const [entidad, setEntidad] = useState("");

  // Modo "cui"
  const [cuiInput, setCuiInput] = useState("");

  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<Candidato[]>([]);
  const [searched, setSearched] = useState(false);

  const [loading, setLoading] = useState(false);
  const [detalle, setDetalle] = useState<ObraDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAvances, setShowAvances] = useState(false);

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

  const handleCuiSearch = async (e: FormEvent) => {
    e.preventDefault();
    const cui = cuiInput.trim();
    if (!cui) return;
    // Validacion ligera: CUI suele ser 6-10 digitos
    if (!/^\d{6,10}$/.test(cui)) {
      setError("El CUI debe tener entre 6 y 10 dígitos");
      return;
    }
    setError(null);
    setCandidates([]);
    setSearched(false);
    await handleSelect(cui);
  };

  const handleSelect = async (cui: string) => {
    setLoading(true);
    setError(null);
    setDetalle(null);
    setShowAvances(false);

    try {
      const res = await fetch(`/api/infoobras/obra/${cui}`);
      if (res.status === 404) {
        throw new Error(`CUI ${cui} no encontrado en InfoObras`);
      }
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
            personal, contratistas, modificaciones y paralizaciones en el portal
            de la Contraloría.
          </p>
        </div>

        {/* Tabs de modo */}
        <div className="max-w-[700px] mb-4 flex gap-1 border-b border-outline-variant/20">
          <button
            type="button"
            onClick={() => { setModo("nombre"); setError(null); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
              modo === "nombre"
                ? "text-primary border-b-2 border-primary -mb-px"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-sm align-middle mr-1">search</span>
            Buscar por Nombre
          </button>
          <button
            type="button"
            onClick={() => { setModo("cui"); setError(null); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
              modo === "cui"
                ? "text-primary border-b-2 border-primary -mb-px"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-sm align-middle mr-1">tag</span>
            Buscar por CUI
          </button>
        </div>

        {/* Form: por NOMBRE */}
        {modo === "nombre" && (
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
        )}

        {/* Form: por CUI */}
        {modo === "cui" && (
          <form onSubmit={handleCuiSearch} className="max-w-[700px] space-y-4 mb-8">
            <div>
              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-secondary mb-2">
                Código Único de Inversión (CUI)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6,10}"
                value={cuiInput}
                onChange={(e) => setCuiInput(e.target.value.replace(/\D/g, ""))}
                placeholder="2427358"
                maxLength={10}
                className="w-full bg-surface-container-low border-0 focus:ring-2 focus:ring-primary-fixed text-base font-mono font-medium p-3 rounded-lg text-on-surface tracking-widest"
              />
              <p className="text-[10px] text-on-surface-variant mt-1.5">
                Solo números (6 a 10 dígitos). Va directo al detalle de la obra sin
                desambiguación.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!cuiInput.trim() || loading}
                className="px-8 py-3 primary-gradient text-white rounded-lg shadow-[0_4px_14px_0_rgba(2,36,72,0.39)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">
                  {loading ? "progress_activity" : "tag"}
                </span>
                <span className="text-sm font-extrabold uppercase tracking-[0.1rem]">
                  {loading ? "Cargando..." : "Consultar CUI"}
                </span>
              </button>
            </div>
          </form>
        )}

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
                  {candidates.map((c) => (
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
            {/* Header card */}
            <div className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-primary">{detalle.nombre}</h3>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-xs font-mono text-secondary">CUI: {detalle.cui}</span>
                    {detalle.codigo_infobras && (
                      <span className="text-xs font-mono text-secondary">
                        Cód. InfoObras: {detalle.codigo_infobras}
                      </span>
                    )}
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      detalle.estado === "En Ejecución" ? "bg-blue-100 text-blue-700" :
                      detalle.estado === "Finalizado" ? "bg-green-100 text-green-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {detalle.estado}
                    </span>
                    {detalle.tipo_obra && (
                      <span className="text-xs text-on-surface-variant">{detalle.tipo_obra}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => { setDetalle(null); setShowAvances(false); }}
                  className="text-outline hover:text-primary"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Cabecera datos generales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
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
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avance Físico</p>
                  <p className="text-xs text-on-surface font-bold">
                    {fmtPct(detalle.porcentaje_avance_fisico)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monto Contrato</p>
                  <p className="text-xs text-on-surface">{fmtSoles(detalle.monto_contrato)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ejecutado</p>
                  <p className="text-xs text-on-surface">{fmtSoles(detalle.monto_ejecutado_acumulado)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ejecutor</p>
                  <p className="text-xs text-on-surface">{detalle.ejecutor || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">RUC Ejecutor</p>
                  <p className="text-xs text-on-surface font-mono">{detalle.ruc_ejecutor || "—"}</p>
                </div>
              </div>
            </div>

            {/* Summary cards (counts) — solo lo relevante para el flujo del cliente */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <SummaryCard label="Avances" value={detalle.total_avances} color="slate" />
              <SummaryCard label="Supervisores" value={detalle.supervisores.length} color="blue" />
              <SummaryCard label="Residentes" value={detalle.residentes.length} color="violet" />
              <SummaryCard label="Contratistas" value={detalle.contratistas.length} color="emerald" />
              <SummaryCard label="Adendas" value={detalle.adendas.length} color="cyan" />
              <SummaryCard
                label="Paralizaciones"
                value={detalle.paralizaciones}
                color={detalle.paralizaciones > 0 ? "red" : "green"}
              />
            </div>

            {/* Contratistas */}
            {detalle.contratistas.length > 0 && (
              <Section title="Contratistas Ejecutores" icon="business">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-high">
                    <tr>
                      {["Tipo", "RUC", "Empresa", "Monto", "N° Contrato", "Periodo"].map((h) => (
                        <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {detalle.contratistas.map((c, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-secondary">{c.tipo_empresa}</td>
                        <td className="px-3 py-2 text-secondary font-mono">{c.ruc || "—"}</td>
                        <td className="px-3 py-2 font-medium text-on-surface">{c.nombre_empresa}</td>
                        <td className="px-3 py-2 text-secondary">{fmtSoles(c.monto_soles)}</td>
                        <td className="px-3 py-2 text-secondary">{c.numero_contrato || "—"}</td>
                        <td className="px-3 py-2 text-secondary">
                          {c.fecha_contrato || "?"} — {c.fecha_fin_contrato || "vigente"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Supervisores */}
            {detalle.supervisores.length > 0 && (
              <Section title="Supervisores / Inspectores" icon="badge">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-high">
                    <tr>
                      {["Nombre", "Tipo", "Empresa / RUC", "DNI", "Inicio", "Fin"].map((h) => (
                        <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {detalle.supervisores.map((s, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium text-on-surface">{s.nombre}</td>
                        <td className="px-3 py-2 text-secondary">{s.tipo}</td>
                        <td className="px-3 py-2 text-secondary">
                          {s.empresa ? (
                            <>
                              <div className="text-xs">{s.empresa}</div>
                              {s.ruc && <div className="text-[10px] font-mono text-on-surface-variant">{s.ruc}</div>}
                            </>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2 text-secondary font-mono">{s.dni || "—"}</td>
                        <td className="px-3 py-2 text-secondary">{s.fecha_inicio || "—"}</td>
                        <td className="px-3 py-2 text-secondary">{s.fecha_fin || "vigente"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Residentes */}
            {detalle.residentes.length > 0 && (
              <Section title="Residentes" icon="engineering">
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
              </Section>
            )}

            {/* Adendas */}
            {detalle.adendas.length > 0 && (
              <Section title="Adendas al Contrato" icon="article">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-high">
                    <tr>
                      {["N°", "Fecha", "Descripción"].map((h) => (
                        <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {detalle.adendas.map((a, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-secondary font-mono">{a.numero || i + 1}</td>
                        <td className="px-3 py-2 text-secondary">{a.fecha || "—"}</td>
                        <td className="px-3 py-2 text-on-surface">{a.descripcion || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Entrega de terreno */}
            {detalle.entregas_terreno.length > 0 && (
              <Section title="Entrega de Terreno" icon="terrain">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-high">
                    <tr>
                      {["#", "Tipo", "Fecha", "%"].map((h) => (
                        <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {detalle.entregas_terreno.map((e, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-secondary font-mono">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-on-surface">{e.tipo_entrega || "—"}</td>
                        <td className="px-3 py-2 text-secondary">{e.fecha_entrega || "—"}</td>
                        <td className="px-3 py-2 text-secondary">
                          {e.porcentaje !== null ? `${e.porcentaje}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Suspension periods */}
            {detalle.suspension_periods.length > 0 && (
              <Section title="Periodos de Paralización / Suspensión" icon="warning" accent="red">
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
              </Section>
            )}

            {/* Avances mensuales (collapsible) */}
            {detalle.avances.length > 0 && (
              <div className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 overflow-hidden">
                <button
                  onClick={() => setShowAvances(!showAvances)}
                  className="w-full px-5 py-3 border-b border-outline-variant/10 flex items-center justify-between hover:bg-surface-container-high/40 transition-colors"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">timeline</span>
                    Avances Mensuales ({detalle.avances.length})
                  </h4>
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">
                    {showAvances ? "expand_less" : "expand_more"}
                  </span>
                </button>
                {showAvances && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-container-high">
                        <tr>
                          {[
                            "Mes/Año", "Estado", "Av.Físico Prog", "Av.Físico Real",
                            "Valoriz. Prog", "Valoriz. Real", "% Ejec. Fin.", "Monto Ejec."
                          ].map((h) => (
                            <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {detalle.avances.map((a, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-medium text-on-surface">
                              {MES_NOMBRE[a.mes] || a.mes} {a.anio}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                a.estado === "Paralizado" ? "bg-red-100 text-red-700" :
                                a.estado === "Finalizado" ? "bg-green-100 text-green-700" :
                                "bg-blue-100 text-blue-700"
                              }`}>
                                {a.estado}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-secondary">{fmtPct(a.avance_fisico_programado)}</td>
                            <td className="px-3 py-2 text-secondary font-bold">{fmtPct(a.avance_fisico_real)}</td>
                            <td className="px-3 py-2 text-secondary">{fmtSoles(a.valorizado_programado)}</td>
                            <td className="px-3 py-2 text-secondary">{fmtSoles(a.valorizado_real)}</td>
                            <td className="px-3 py-2 text-secondary">{fmtPct(a.pct_ejecucion_financiera)}</td>
                            <td className="px-3 py-2 text-secondary">{fmtSoles(a.monto_ejecucion_financiera)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </PanelShell>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Componentes auxiliares
// ────────────────────────────────────────────────────────────────────────────

const COLOR_BORDER: Record<string, string> = {
  slate: "border-slate-400",
  blue: "border-blue-500",
  violet: "border-violet-500",
  emerald: "border-emerald-500",
  cyan: "border-cyan-500",
  amber: "border-amber-500",
  red: "border-red-500",
  green: "border-green-500",
};

const COLOR_TEXT: Record<string, string> = {
  slate: "text-slate-700",
  blue: "text-blue-700",
  violet: "text-violet-700",
  emerald: "text-emerald-700",
  cyan: "text-cyan-700",
  amber: "text-amber-700",
  red: "text-red-600",
  green: "text-green-600",
};

function SummaryCard({
  label,
  value,
  color = "slate",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div
      className={`bg-surface-container-lowest p-3 border-l-4 shadow-ambient rounded-xl ${COLOR_BORDER[color] || COLOR_BORDER.slate}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-xl font-bold ${COLOR_TEXT[color] || "text-primary"}`}>{value}</p>
    </div>
  );
}

function Section({
  title,
  icon,
  accent = "primary",
  children,
}: {
  title: string;
  icon: string;
  accent?: "primary" | "red";
  children: React.ReactNode;
}) {
  const titleColor = accent === "red" ? "text-error" : "text-primary";
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 overflow-hidden">
      <div className="px-5 py-3 border-b border-outline-variant/10">
        <h4 className={`text-xs font-bold uppercase tracking-wider ${titleColor} flex items-center gap-1`}>
          <span className="material-symbols-outlined text-sm">{icon}</span>
          {title}
        </h4>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
