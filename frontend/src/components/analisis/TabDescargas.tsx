"use client";

/** Pestaña Descargas · los entregables del backend: Excel final, ZIP de
 *  documentos InfoObras y acceso a la cola de revisión humana. */
import Link from "next/link";
import type { PivoteJob } from "@/lib/pivote/types";

export function TabDescargas({ job, pend, id, jobId }: {
  job: PivoteJob; pend: number; id: string; jobId: string;
}) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient border border-outline-variant/10 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined text-xl">table_view</span>
          <h3 className="text-sm font-semibold">Excel final enriquecido</h3>
        </div>
        <p className="text-xs text-outline leading-relaxed">
          El Formato de Evaluación completo: la evaluación de Claude, la Base de Datos y
          una hoja por profesional con sus días efectivos. Amarillo = Claude · naranja = verificado.
        </p>
        {job.excel_final ? (
          <a href={job.excel_final} download
            className="mt-auto self-start inline-flex items-center gap-1.5 primary-gradient text-white text-xs font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90">
            <span className="material-symbols-outlined text-base">download</span> Descargar .xlsx
          </a>
        ) : (
          <span className="mt-auto text-xs font-medium text-outline">Disponible al completar</span>
        )}
      </div>

      <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient border border-outline-variant/10 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined text-xl">folder_zip</span>
          <h3 className="text-sm font-semibold">ZIP documentos InfoObras</h3>
        </div>
        <p className="text-xs text-outline leading-relaxed">
          Los documentos oficiales de cada obra (cronogramas, valorizaciones, expediente)
          en carpetas por profesional y experiencia — para revisarlos tú mismo.
        </p>
        {job.descargas_estado === "listas" ? (
          <a href={`/api/pivote/jobs/${jobId}/zip`} download
            className="mt-auto self-start inline-flex items-center gap-1.5 primary-gradient text-white text-xs font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90">
            <span className="material-symbols-outlined text-base">download</span> Descargar .zip
          </a>
        ) : job.descargas_estado === "error" ? (
          <span className="mt-auto text-xs font-medium text-red-600 inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-base">error</span> Error al preparar el ZIP — reintenta más tarde
          </span>
        ) : (
          <span className="mt-auto text-xs font-medium text-amber-600 inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
            Preparando ZIP… (descargando documentos)
          </span>
        )}
      </div>

      <div className="bg-surface-container-lowest p-5 rounded-xl shadow-ambient border border-outline-variant/10 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined text-xl">pending_actions</span>
          <h3 className="text-sm font-semibold">Revisión humana</h3>
        </div>
        <p className="text-xs text-outline leading-relaxed">
          {pend > 0
            ? `${pend} experiencia${pend > 1 ? "s" : ""} esperan tu decisión (obras por identificar, firmantes). Al resolverlas se verifica de nuevo solo esa experiencia.`
            : "Sin pendientes — todo se verificó automáticamente."}
        </p>
        {pend > 0 ? (
          <Link href={`/concursos/${id}/jobs/${jobId}/revision`}
            className="mt-auto self-start inline-flex items-center gap-1.5 bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90">
            <span className="material-symbols-outlined text-base">checklist</span> Resolver ahora
          </Link>
        ) : (
          <span className="mt-auto text-xs font-medium text-green-600 inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-base">task_alt</span> Cola limpia
          </span>
        )}
      </div>
    </section>
  );
}
