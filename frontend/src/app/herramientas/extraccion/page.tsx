"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import PanelShell from "@/components/PanelShell";
import PdfDropzone from "@/components/PdfDropzone";

export default function ExtraccionProfesionalesPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [pagesFrom, setPagesFrom] = useState("");
  const [pagesTo, setPagesTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!file && !submitting;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setSubmitting(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("job_type", "extraction");
      if (pagesFrom) fd.append("pages_from", pagesFrom);
      if (pagesTo) fd.append("pages_to", pagesTo);

      const res = await fetch("/api/jobs", { method: "POST", body: fd });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `Error ${res.status}`);
      }

      const { id } = await res.json();
      router.push(`/jobs/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear el job");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PanelShell title="Extracción de Profesionales" subtitle="Herramientas">
      <div className="max-w-[1200px] mx-auto p-8 lg:p-12">
        {/* Header */}
        <div className="mb-10 border-l-4 border-primary pl-6">
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.15rem] text-secondary">
            Herramienta Individual
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-primary mt-1">
            Extracción de Profesionales
          </h2>
          <p className="text-on-surface-variant text-sm mt-2 max-w-2xl">
            Suba un PDF de propuesta técnica para extraer automáticamente los
            profesionales propuestos y sus experiencias laborales. El sistema
            ejecutará OCR + extracción con IA.
          </p>
        </div>

        {/* Form */}
        <div className="max-w-[600px]">
          <form className="space-y-8" onSubmit={handleSubmit}>
            {/* Dropzone */}
            <PdfDropzone
              label="Propuesta Técnica"
              hint="PDF escaneado o digitalizado"
              icon="person_search"
              file={file}
              onFile={setFile}
            />

            {/* Page range (optional) */}
            <section className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/10 shadow-ambient">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary text-lg">
                  filter_list
                </span>
                <h3 className="text-[0.75rem] font-bold uppercase tracking-wider text-secondary">
                  Rango de Páginas (opcional)
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  value={pagesFrom}
                  onChange={(e) => setPagesFrom(e.target.value)}
                  placeholder="Inicio"
                  className="w-28 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary-fixed text-sm font-medium p-2.5 rounded-lg text-on-surface"
                />
                <span className="text-outline-variant">&mdash;</span>
                <input
                  type="number"
                  min={1}
                  value={pagesTo}
                  onChange={(e) => setPagesTo(e.target.value)}
                  placeholder="Fin"
                  className="w-28 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary-fixed text-sm font-medium p-2.5 rounded-lg text-on-surface"
                />
              </div>
              <p className="text-[0.6875rem] text-outline mt-3">
                Si conoce las páginas donde inician los profesionales, puede acotar el procesamiento.
              </p>
            </section>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-error-container/30 border border-error/20 rounded-lg">
                <span className="material-symbols-outlined text-error text-lg">
                  error
                </span>
                <p className="text-sm font-medium text-error">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end pt-4 gap-4">
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPagesFrom("");
                  setPagesTo("");
                  setError(null);
                }}
                className="px-6 py-3 text-sm font-bold tracking-tight text-on-surface hover:bg-surface-container-high transition-all rounded-lg"
              >
                Limpiar
              </button>

              <button
                type="submit"
                disabled={!canSubmit}
                className="relative group overflow-hidden px-10 py-4 primary-gradient text-white rounded-lg shadow-[0_4px_14px_0_rgba(2,36,72,0.39)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                <div className="flex items-center gap-3">
                  {submitting ? (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <span className="material-symbols-outlined text-xl">
                      person_search
                    </span>
                  )}
                  <span className="text-sm font-extrabold uppercase tracking-[0.1rem]">
                    {submitting ? "Enviando..." : "Extraer Profesionales"}
                  </span>
                </div>
              </button>
            </div>
          </form>
        </div>
      </div>
    </PanelShell>
  );
}
