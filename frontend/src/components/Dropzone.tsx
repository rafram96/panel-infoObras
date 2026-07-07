"use client";

/** Zona de arrastrar-y-soltar reusable (unifica el antiguo PdfDropzone y la
 *  `Zona` interna de /nuevo). Estados visuales: reposo · arrastrando · error ·
 *  aceptado. Opcionalmente muestra el resultado de una validación en cliente. */
import { useRef, useState, type DragEvent } from "react";
import { TONO, cx } from "@/lib/ui";

export interface ValidacionArchivo {
  ok: boolean;
  /** Texto corto al pie cuando la validación fue exitosa (ej. "3 profesionales"). */
  resumen?: string | null;
}

export function Dropzone({
  label,
  hint,
  icon,
  file,
  onFile,
  acepta,
  accept,
  validacion,
}: {
  label: string;
  hint: string;
  icon: string;
  file: File | null;
  onFile: (f: File) => void;
  /** Predicado que decide si el archivo soltado es válido por su nombre/tipo. */
  acepta?: (f: File) => boolean;
  /** Atributo `accept` del <input> (filtra el diálogo del sistema). */
  accept?: string;
  /** Resultado de una validación en cliente (ej. el JSON espejo con zod). */
  validacion?: ValidacionArchivo | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const recibir = (files: FileList | null) => {
    if (!files?.length) return;
    const f = files[0];
    if (!acepta || acepta(f)) onFile(f);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    recibir(e.dataTransfer.files);
  };

  const conError = !!validacion && !validacion.ok;
  const abrir = () => inputRef.current?.click();

  const borde = dragging
    ? "border-primary/60 bg-primary-fixed/5"
    : conError
      ? "border-red-400/60"
      : file
        ? "border-green-400/60"
        : "border-outline-variant/30 hover:border-primary/40";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${label}. Arrastra un archivo o presiona para seleccionar.`}
      onClick={abrir}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          abrir();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cx(
        "bg-surface-container-lowest p-8 rounded-xl shadow-ambient border-2 border-dashed transition-colors cursor-pointer group",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        borde,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => recibir(e.target.files)}
      />

      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-secondary-container/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-primary text-2xl">{icon}</span>
        </div>
        <h4 className="text-sm font-semibold text-primary">{label}</h4>

        {file ? (
          <div
            className={cx(
              "mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-tight",
              conError ? TONO.error.chip : TONO.ok.chip,
            )}
          >
            <span className="material-symbols-outlined text-sm filled">
              {conError ? "error" : "check_circle"}
            </span>
            <span className="truncate max-w-[220px] normal-case">{file.name}</span>
          </div>
        ) : (
          <>
            <p className="text-xs text-on-surface-variant mt-1">{hint}</p>
            <p className="mt-3 text-xs text-outline">Arrastra o haz clic para subir</p>
          </>
        )}

        {validacion?.ok && validacion.resumen && (
          <p className="mt-2 text-xs text-green-700 dark:text-green-300 font-semibold">
            ✓ archivo correcto · {validacion.resumen}
          </p>
        )}
      </div>
    </div>
  );
}
