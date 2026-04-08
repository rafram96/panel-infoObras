"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import PanelShell from "@/components/PanelShell";
import PdfDropzone from "@/components/PdfDropzone";

export default function ExtraccionTdrPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
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
      fd.append("job_type", "tdr");

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
    <PanelShell title="Extracción TDR" subtitle="Herramientas">
      <div className="max-w-[1200px] mx-auto p-8 lg:p-12">
        {/* Header */}
        <div className="mb-10 border-l-4 border-primary pl-6">
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.15rem] text-secondary">
            Herramienta Individual
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-primary mt-1">
            Extracción de Requisitos TDR
          </h2>
          <p className="text-on-surface-variant text-sm mt-2 max-w-2xl">
            Suba el PDF de las bases del concurso para extraer automáticamente
            los requisitos técnicos mínimos (RTM) por cargo profesional,
            factores de evaluación y criterios de calificación.
          </p>
        </div>

        {/* Form */}
        <div className="max-w-[600px]">
          <form className="space-y-8" onSubmit={handleSubmit}>
            {/* Dropzone */}
            <PdfDropzone
              label="Bases del Concurso"
              hint="PDF de las bases o términos de referencia"
              icon="fact_check"
              file={file}
              onFile={setFile}
            />

            {/* Info */}
            <div className="p-4 bg-secondary-container/20 rounded-lg border border-secondary-container/40">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-primary text-sm mt-0.5">
                  info
                </span>
                <div className="text-[0.75rem] leading-relaxed text-on-secondary-container">
                  <p>
                    <span className="font-bold">El sistema extraerá:</span>
                  </p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Requisitos por cargo (profesión, experiencia, tipo de obra)</li>
                    <li>Cargos válidos equivalentes</li>
                    <li>Factores de evaluación y puntajes</li>
                    <li>Requisitos de capacitación</li>
                  </ul>
                </div>
              </div>
            </div>

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
                      fact_check
                    </span>
                  )}
                  <span className="text-sm font-extrabold uppercase tracking-[0.1rem]">
                    {submitting ? "Enviando..." : "Extraer Requisitos"}
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
