"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import PanelShell from "@/components/PanelShell";

// ── Dropzone sub-component ──────────────────────────────────────────────────
interface DropzoneProps {
  label: string;
  hint: string;
  icon: string;
  file: File | null;
  onFile: (f: File) => void;
}

function PdfDropzone({ label, hint, icon, file, onFile }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept = (files: FileList | null) => {
    if (!files?.length) return;
    const f = files[0];
    if (f.type === "application/pdf" || f.name.endsWith(".pdf")) onFile(f);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    accept(e.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={[
        "bg-surface-container-lowest p-8 rounded-lg border-2 border-dashed transition-colors group relative cursor-pointer",
        dragging
          ? "border-primary/60 bg-primary-fixed/5"
          : "border-outline-variant/30 hover:border-primary/40",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => accept(e.target.files)}
      />

      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-secondary-container/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-primary text-2xl">
            {icon}
          </span>
        </div>
        <h4 className="text-[0.875rem] font-semibold text-primary">{label}</h4>
        <p className="text-[0.6875rem] text-on-surface-variant mt-1">
          {file ? "" : hint}
        </p>

        {file ? (
          <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100">
            <span
              className="material-symbols-outlined text-sm font-bold filled"
            >
              check_circle
            </span>
            <span className="text-[0.6875rem] font-bold uppercase tracking-tight truncate max-w-[180px]">
              {file.name}
            </span>
          </div>
        ) : (
          <p className="mt-4 text-[0.6875rem] text-outline">
            Arrastre o haga clic para subir
          </p>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function NuevoAnalisisPage() {
  const router = useRouter();

  // Form state — metadata
  const [nombreConcurso, setNombreConcurso] = useState("");
  const [entidad, setEntidad] = useState("");
  const [items, setItems] = useState("");

  // Files
  const [propuesta, setPropuesta] = useState<File | null>(null);
  const [bases, setBases] = useState<File | null>(null);

  // Advanced options
  const [pagesFrom, setPagesFrom] = useState("");
  const [pagesTo, setPagesTo] = useState("");
  const [forceOcr, setForceOcr] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!propuesta && !submitting;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!propuesta) return;

    setSubmitting(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", propuesta);
      if (bases) fd.append("bases_file", bases);
      if (nombreConcurso) fd.append("nombre_concurso", nombreConcurso);
      if (entidad) fd.append("entidad", entidad);
      if (items) fd.append("items", items);
      if (pagesFrom) fd.append("pages_from", pagesFrom);
      if (pagesTo) fd.append("pages_to", pagesTo);
      if (forceOcr) fd.append("force_ocr", "true");

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

  const handleReset = () => {
    setNombreConcurso("");
    setEntidad("");
    setItems("");
    setPropuesta(null);
    setBases(null);
    setPagesFrom("");
    setPagesTo("");
    setForceOcr(false);
    setError(null);
  };

  return (
    <PanelShell title="Nuevo Análisis" subtitle="Módulo de IA Operativa">
      <div className="max-w-[1200px] mx-auto p-8 lg:p-12">
        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="mb-10 border-l-4 border-primary pl-6">
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.15rem] text-secondary">
            Módulo de IA Operativa
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-primary mt-1">
            Nuevo Análisis de Propuesta Técnica
          </h2>
          <p className="text-on-surface-variant text-sm mt-2 max-w-2xl">
            Inicie el proceso de auditoría inteligente cargando los documentos
            del concurso. El sistema utilizará OCR avanzado para verificar el
            cumplimiento de las bases.
          </p>
        </div>

        {/* ── Form ─────────────────────────────────────────────────────── */}
        <div className="max-w-[800px]">
          <form className="space-y-8" onSubmit={handleSubmit}>
            {/* Section 1: Datos del Concurso */}
            <section className="bg-surface-container-lowest p-8 rounded-lg border border-outline-variant/10 shadow-ambient">
              <div className="flex items-center gap-2 mb-6 border-b border-surface-container-high pb-4">
                <span className="material-symbols-outlined text-primary">
                  description
                </span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                  Datos del Concurso
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-secondary mb-2">
                    Nombre del Concurso
                  </label>
                  <input
                    type="text"
                    value={nombreConcurso}
                    onChange={(e) => setNombreConcurso(e.target.value)}
                    placeholder="Concurso Público N° 01-2026-VIVIENDA"
                    className="w-full bg-surface-container-low border-0 focus:ring-2 focus:ring-primary-fixed text-sm font-medium p-3 rounded-lg text-on-surface"
                  />
                </div>

                <div>
                  <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-secondary mb-2">
                    Entidad
                  </label>
                  <input
                    type="text"
                    value={entidad}
                    onChange={(e) => setEntidad(e.target.value)}
                    placeholder="MVCS"
                    className="w-full bg-surface-container-low border-0 focus:ring-2 focus:ring-primary-fixed text-sm font-medium p-3 rounded-lg text-on-surface"
                  />
                </div>

                <div>
                  <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-secondary mb-2">
                    Items
                  </label>
                  <input
                    type="text"
                    value={items}
                    onChange={(e) => setItems(e.target.value)}
                    placeholder="Unique"
                    className="w-full bg-surface-container-low border-0 focus:ring-2 focus:ring-primary-fixed text-sm font-medium p-3 rounded-lg text-on-surface"
                  />
                </div>
              </div>
            </section>

            {/* Section 2: Documentos (Dropzones) */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PdfDropzone
                label="Propuesta Técnica"
                hint="PDF, escaneado o digitalizado"
                icon="file_present"
                file={propuesta}
                onFile={setPropuesta}
              />
              <PdfDropzone
                label="Bases del Concurso"
                hint="Opcional — PDF de las bases"
                icon="library_books"
                file={bases}
                onFile={setBases}
              />
            </section>

            {/* Section 3: Opciones Avanzadas */}
            <section className="bg-surface-container p-1 rounded-lg">
              <details className="group bg-surface-container-lowest rounded-lg border border-outline-variant/10 overflow-hidden">
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-low transition-colors list-none [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">
                      settings_input_component
                    </span>
                    <span className="text-sm font-bold uppercase tracking-wider text-secondary">
                      Opciones Avanzadas
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-secondary group-open:rotate-180 transition-transform">
                    expand_more
                  </span>
                </summary>

                <div className="p-6 border-t border-surface-container-high bg-surface-container-lowest">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Page range */}
                    <div className="flex flex-col">
                      <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-secondary mb-3">
                        Rango de Páginas (Análisis Focalizado)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={1}
                          value={pagesFrom}
                          onChange={(e) => setPagesFrom(e.target.value)}
                          placeholder="Inicio"
                          className="w-24 bg-surface-container-low border-0 text-sm font-medium p-2 rounded-lg text-on-surface"
                        />
                        <span className="text-outline-variant">&mdash;</span>
                        <input
                          type="number"
                          min={1}
                          value={pagesTo}
                          onChange={(e) => setPagesTo(e.target.value)}
                          placeholder="Fin"
                          className="w-24 bg-surface-container-low border-0 text-sm font-medium p-2 rounded-lg text-on-surface"
                        />
                      </div>
                    </div>

                    {/* Force OCR toggle */}
                    <div className="flex items-center gap-4 h-full">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={forceOcr}
                          onChange={(e) => setForceOcr(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                        <span className="ml-3 text-[0.8125rem] font-semibold text-primary">
                          Forzar Motor OCR de Precisión
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Info note */}
                  <div className="mt-4 p-4 bg-secondary-container/20 rounded-lg border border-secondary-container/40">
                    <div className="flex gap-3">
                      <span className="material-symbols-outlined text-primary text-sm">
                        info
                      </span>
                      <p className="text-[0.75rem] leading-relaxed text-on-secondary-container">
                        <span className="font-bold">Nota:</span> Forzar el OCR
                        aumentará la precisión en documentos con sellos o
                        tachaduras, pero el tiempo de procesamiento podría
                        extenderse hasta 3 minutos adicionales.
                      </p>
                    </div>
                  </div>
                </div>
              </details>
            </section>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-error-container/30 border border-error/20 rounded-lg">
                <span className="material-symbols-outlined text-error text-lg">
                  error
                </span>
                <p className="text-sm font-medium text-error">{error}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end pt-4 gap-4">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 text-sm font-bold tracking-tight text-on-surface hover:bg-surface-container-high transition-all rounded-lg"
              >
                Cancelar y Limpiar
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
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  ) : (
                    <span className="material-symbols-outlined text-xl">
                      rocket_launch
                    </span>
                  )}
                  <span className="text-sm font-extrabold uppercase tracking-[0.1rem]">
                    {submitting ? "Enviando..." : "Iniciar Análisis"}
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
