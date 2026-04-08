"use client";

import { useRef, useState, type DragEvent } from "react";

interface PdfDropzoneProps {
  label: string;
  hint: string;
  icon: string;
  file: File | null;
  onFile: (f: File) => void;
}

export default function PdfDropzone({ label, hint, icon, file, onFile }: PdfDropzoneProps) {
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
            <span className="material-symbols-outlined text-sm font-bold filled">
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
