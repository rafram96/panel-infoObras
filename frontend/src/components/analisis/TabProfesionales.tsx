"use client";

/** Pestaña Profesionales · la extracción (profesionales + sus experiencias).
 *  Tabla con una fila por profesional; clic la expande al detalle + experiencias. */
import { useState } from "react";
import { fmtFecha } from "@/lib/pivote/types";
import { Badge } from "@/components/Badge";
import { EtiquetaBases, refCargo } from "./cargo";

export interface RepEmpresa {
  nombre_empresa?: string; empresa?: string | null; tipo?: string;
  nombre?: string; apellido_paterno?: string; apellido_materno?: string | null;
  ruc?: string | null; monto_soles?: number | null;
}
export interface RepresentanteObra {
  contratistas?: RepEmpresa[]; supervisores?: RepEmpresa[]; residentes?: RepEmpresa[];
}
export interface ExpBreve {
  n: number; proyecto: string; entidad_emisora: string; cargo_ocupado: string;
  fecha_inicial: string; fecha_final: string; dias: number | null;
  cui?: string | null; incluye_covid?: string; traslape?: string | null; folio?: string;
  cui_resuelto?: string | null; obra_nombre?: string | null; via_resolucion?: string | null;
  representante_obra?: RepresentanteObra | null;
  sunat?: { nombre?: string; no_encontrado?: boolean } | null;
}
export interface ProfBreve {
  n_prof: number; cargo: string; cargo_bases_num?: number | null; cargo_bases_nombre?: string | null;
  nombre: string; dni?: string; colegiatura?: string;
  notas?: string[];
  cumple?: string | null; total?: { dias?: number; anios?: number };
  experiencias: ExpBreve[];
}

const soloDig = (s?: string | null) => (s ?? "").replace(/\D/g, "");
// Normaliza una razón social para comparar (sin acentos, sin sufijos societarios).
function normEmp(s?: string | null) {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()
    .replace(/[.,]/g, " ")
    .replace(/\bS\s?A\s?C?\b|\bSUCURSAL\b|\bDEL\s+PERU\b|\bLIMITED\b|\bCORPORATION\b|\bEIRL\b/g, " ")
    .replace(/\s+/g, " ").trim();
}
// ¿Emisor del certificado y representante de la obra son la misma empresa?
function mismaEmpresa(a?: string | null, b?: string | null) {
  const ta = normEmp(a).split(" ").filter((w) => w.length > 2);
  const tb = new Set(normEmp(b).split(" ").filter((w) => w.length > 2));
  if (!ta.length || !tb.size) return false;
  const hit = ta.filter((w) => tb.has(w)).length;
  return hit >= 2 || hit === ta.length;
}
const nombrePersona = (p: RepEmpresa) =>
  [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ").trim();

/** Una fila de experiencia. Se expande para mostrar, lado a lado, el emisor del
 *  certificado (lo que verifica SUNAT) y el Representante de obra de InfoObras
 *  (contratista ejecutor, supervisor, residentes), resaltando si coinciden. */
function FilaExperiencia({ e }: { e: ExpBreve }) {
  const [open, setOpen] = useState(false);
  const rep = e.representante_obra;
  const contr = rep?.contratistas ?? [];
  const supes = rep?.supervisores ?? [];
  const resis = rep?.residentes ?? [];
  const tieneRep = contr.length + supes.length + resis.length > 0;
  const expandable = tieneRep || !!e.cui_resuelto;
  const emisorEsSupervisor = supes.some((s) => mismaEmpresa(e.entidad_emisora, s.empresa));
  const emisorEsContratista = contr.some((c) => mismaEmpresa(e.entidad_emisora, c.nombre_empresa));
  const coincide = emisorEsSupervisor || emisorEsContratista;
  const cuiDistinto = e.cui_resuelto && soloDig(e.cui_resuelto) !== soloDig(e.cui);

  return (
    <>
      <tr
        className={`hover:bg-surface-container-high/30 ${expandable ? "cursor-pointer" : ""}`}
        aria-expanded={expandable ? open : undefined}
        onClick={(ev) => { if (expandable) { ev.stopPropagation(); setOpen((v) => !v); } }}
      >
        <td className="px-3 py-2 font-mono text-secondary align-top">{e.n}</td>
        <td className="px-3 py-2 text-on-surface max-w-[280px] align-top">
          <p className="truncate flex items-center gap-1" title={e.proyecto}>
            {expandable && (
              <span className={`material-symbols-outlined text-[14px] text-outline transition-transform ${open ? "rotate-90" : ""}`}>chevron_right</span>
            )}
            {e.proyecto}
          </p>
          {e.cui && (
            <p className="font-mono text-nano text-secondary pl-4">
              CUI {e.cui}{cuiDistinto && <span className="text-amber-600"> → obra {e.cui_resuelto}</span>}
            </p>
          )}
        </td>
        <td className="px-3 py-2 text-secondary max-w-[160px] align-top" title={e.entidad_emisora}>
          <span className="flex items-center gap-0.5">
            <span className="truncate">{e.entidad_emisora}</span>
            {coincide && <span className="material-symbols-outlined text-[14px] text-green-600 shrink-0" title="Coincide con el representante de la obra (InfoObras)">verified</span>}
          </span>
        </td>
        <td className="px-3 py-2 text-secondary align-top">{e.cargo_ocupado}</td>
        <td className="px-3 py-2 text-secondary whitespace-nowrap align-top">{fmtFecha(e.fecha_inicial)} → {fmtFecha(e.fecha_final)}</td>
        <td className="px-3 py-2 text-right tabular-nums text-on-surface align-top">{e.dias ?? "—"}</td>
        <td className="px-3 py-2 align-top">
          <div className="flex flex-wrap gap-1">
            {(e.incluye_covid ?? "").startsWith("S") && <span className="px-1.5 py-0.5 rounded text-nano font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">COVID</span>}
            {(e.traslape ?? "").startsWith("S") && <span className="px-1.5 py-0.5 rounded text-nano font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">TRASLAPE</span>}
            {e.folio && <span className="px-1.5 py-0.5 rounded text-nano font-bold bg-surface-container-high text-on-surface-variant">f.{e.folio}</span>}
          </div>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="px-3 pb-3 pt-0">
            <div className="grid sm:grid-cols-2 gap-3 text-xs" style={{ animation: "fadeIn 0.2s ease-out" }}>
              {/* Emisor del certificado — lo que el backend verifica contra SUNAT */}
              <div className="bg-surface-container-lowest rounded-lg p-3 border border-outline-variant/10">
                <p className="text-nano font-bold uppercase tracking-wider text-on-surface-variant mb-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">badge</span>Emisor del certificado · SUNAT
                </p>
                <p className="text-on-surface font-medium">{e.entidad_emisora || "—"}</p>
                {e.sunat?.nombre && <p className="text-secondary mt-0.5">SUNAT: {e.sunat.nombre}{e.sunat.no_encontrado ? " (no hallado)" : ""}</p>}
                {coincide ? (
                  <p className="mt-2 text-green-700 dark:text-green-300 flex items-start gap-1 leading-snug">
                    <span className="material-symbols-outlined text-[14px] mt-px">verified</span>
                    El emisor es {emisorEsSupervisor ? "el supervisor" : "el contratista"} de la obra en InfoObras — consistente.
                  </p>
                ) : tieneRep ? (
                  <p className="mt-2 text-amber-700 dark:text-amber-300 flex items-start gap-1 leading-snug">
                    <span className="material-symbols-outlined text-[14px] mt-px">help</span>
                    El emisor no figura como contratista ni supervisor de esta obra — conviene verificar.
                  </p>
                ) : null}
              </div>
              {/* Representante de obra — quién la ejecutó/supervisó según InfoObras */}
              <div className="bg-surface-container-lowest rounded-lg p-3 border border-outline-variant/10">
                <p className="text-nano font-bold uppercase tracking-wider text-on-surface-variant mb-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">engineering</span>Representante de obra · InfoObras
                </p>
                {!tieneRep && <p className="text-outline">Sin datos de representante para esta obra.</p>}
                {contr.map((c, i) => (
                  <div key={`c${i}`} className="mb-1.5">
                    <span className="text-nano font-bold uppercase text-outline">Contratista (ejecutor)</span>
                    <p className="text-on-surface">{c.nombre_empresa}{c.ruc && <span className="font-mono text-secondary"> · RUC {c.ruc}</span>}{c.monto_soles ? <span className="text-secondary"> · S/ {c.monto_soles.toLocaleString("es-PE")}</span> : null}</p>
                  </div>
                ))}
                {supes.map((s, i) => (
                  <div key={`s${i}`} className="mb-1.5">
                    <span className="text-nano font-bold uppercase text-outline">{s.tipo || "Supervisor"}</span>
                    <p className="text-on-surface">{s.empresa || nombrePersona(s) || "—"}{s.ruc && <span className="font-mono text-secondary"> · RUC {s.ruc}</span>}</p>
                  </div>
                ))}
                {resis.length > 0 && (
                  <div>
                    <span className="text-nano font-bold uppercase text-outline">Residente(s)</span>
                    <p className="text-on-surface">{resis.map(nombrePersona).filter(Boolean).join(" · ") || "—"}</p>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function FilaProfesional({ prof }: { prof: ProfBreve }) {
  const cargo = refCargo(prof.cargo, prof.cargo_bases_num, prof.cargo_bases_nombre);
  const [expanded, setExpanded] = useState(false);
  const sinVeredicto = !prof.cumple;
  const noCumple = (prof.cumple ?? "").toUpperCase().includes("NO CUMPLE");

  return (
    <>
      <tr
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={`hover:bg-surface-container-high/40 transition-colors cursor-pointer ${
          noCumple ? "bg-red-50/40 dark:bg-red-950/10" : sinVeredicto ? "bg-amber-50/40 dark:bg-amber-950/10" : ""
        }`}
      >
        <td className="px-3 py-2 text-xs font-mono text-secondary">{prof.n_prof}</td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary">{cargo.nombre}</span>
            {cargo.basesNum && <EtiquetaBases num={cargo.basesNum} full={cargo.basesFull} />}
          </div>
        </td>
        <td className="px-3 py-2 text-sm text-on-surface">
          <div className="flex items-center gap-1.5">
            <span>{prof.nombre}</span>
            {prof.notas && prof.notas.length > 0 && (
              <span
                className="material-symbols-outlined text-[15px] text-amber-500 cursor-help"
                title={prof.notas.join("\n")}
              >
                warning
              </span>
            )}
          </div>
          {prof.dni && <span className="text-micro text-outline font-mono">DNI {prof.dni}</span>}
        </td>
        <td className="px-3 py-2 text-xs text-secondary">{prof.colegiatura ?? "—"}</td>
        <td className="px-3 py-2 text-xs text-secondary tabular-nums">{prof.experiencias.length}</td>
        <td className="px-3 py-2 text-xs text-secondary tabular-nums">
          {prof.total?.anios != null ? prof.total.anios.toFixed(2) : "—"}
        </td>
        <td className="px-3 py-2">
          {sinVeredicto ? (
            <Badge tono="revision" chico>Pendiente</Badge>
          ) : noCumple ? (
            <Badge tono="error" chico>No cumple</Badge>
          ) : (
            <Badge tono="ok" chico>Cumple</Badge>
          )}
        </td>
        <td className="px-3 py-2 text-right">
          <span className={`material-symbols-outlined text-outline text-[18px] transition-transform ${expanded ? "rotate-180" : ""}`}>
            expand_more
          </span>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={8} className="px-3 py-0">
            <div className="py-3 px-4 mb-2 bg-surface-container-low rounded-lg space-y-4"
              style={{ animation: "fadeIn 0.2s ease-out" }}>
              {/* Datos del profesional */}
              <div>
                <p className="text-nano font-bold uppercase tracking-widest text-on-surface-variant mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">person</span>
                  Datos del profesional
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {[
                    { label: "Nombre", value: prof.nombre },
                    { label: "DNI", value: prof.dni },
                    { label: "Colegiatura", value: prof.colegiatura },
                    { label: "Total días (brutos)", value: prof.total?.dias != null ? String(prof.total.dias) : undefined },
                    { label: "Veredicto", value: prof.cumple ?? "pendiente de revisión" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-nano font-bold uppercase tracking-wider text-outline">{label}</p>
                      <p className="text-on-surface font-medium">
                        {value || <span className="text-outline-variant">—</span>}
                      </p>
                    </div>
                  ))}
                </div>
                {prof.notas && prof.notas.length > 0 && (
                  <div className="mt-3">
                    <p className="text-nano font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      Notas de extracción (Claude)
                    </p>
                    <ul className="list-disc pl-5 space-y-0.5 text-xs text-on-surface-variant">
                      {prof.notas.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Experiencias */}
              <div>
                <p className="text-nano font-bold uppercase tracking-widest text-on-surface-variant mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">description</span>
                  Experiencias ({prof.experiencias.length})
                </p>
                <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-outline-variant/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-container-high">
                      <tr className="text-nano font-bold uppercase tracking-wider text-on-surface-variant">
                        <th scope="col" className="px-3 py-1.5">#</th>
                        <th scope="col" className="px-3 py-1.5">Proyecto u obra</th>
                        <th scope="col" className="px-3 py-1.5">Emisor</th>
                        <th scope="col" className="px-3 py-1.5">Cargo ocupó</th>
                        <th scope="col" className="px-3 py-1.5">Periodo</th>
                        <th scope="col" className="px-3 py-1.5 text-right">Días</th>
                        <th scope="col" className="px-3 py-1.5">Marcas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {prof.experiencias.map((e) => <FilaExperiencia key={e.n} e={e} />)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function TabProfesionales({ profesionales }: { profesionales: ProfBreve[] }) {
  return (
    <section className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 mb-8 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
        <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-xl">groups</span>
          Extracción: profesionales y experiencias
        </h2>
        <span className="text-micro text-outline">
          {profesionales.length} profesionales · clic en una fila para el detalle
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container-high">
            <tr>
              {["#", "Cargo", "Profesional", "Colegiatura", "Exps", "Años", "Veredicto", ""].map((h, i) => (
                <th key={i} className="px-3 py-3 text-micro font-bold uppercase tracking-[0.05rem] text-on-surface-variant">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {profesionales.map((p) => <FilaProfesional key={p.n_prof} prof={p} />)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
