"use client";

/** P2 · Analizar postor — sube Excel + JSON espejo (Camino B / dropzone).
 *  El espejo se valida con zod EN EL NAVEGADOR al soltarlo: rechazo inmediato
 *  con errores campo a campo (el backend re-valida en INGESTA igual). */
import { use, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PanelShell from "@/components/PanelShell";
import { validarEspejoTexto, type ResultadoValidacion } from "@/lib/pivote/espejo";

interface ArchivoZona {
  file: File | null;
  validacion?: ResultadoValidacion | null;
}

function Zona({
  label, hint, icon, acepta, zona, onFile,
}: {
  label: string; hint: string; icon: string; acepta: (f: File) => boolean;
  zona: ArchivoZona; onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const recibir = (files: FileList | null) => {
    if (!files?.length) return;
    const f = files[0];
    if (acepta(f)) onFile(f);
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); recibir(e.dataTransfer.files); };

  const estado = zona.validacion;
  const borde = dragging
    ? "border-primary/60 bg-primary-fixed/5"
    : estado && !estado.ok
      ? "border-red-400/60"
      : zona.file
        ? "border-green-400/60"
        : "border-outline-variant/30 hover:border-primary/40";

  return (
    <div
      role="button" tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`bg-surface-container-lowest p-8 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${borde}`}
    >
      <input
        ref={inputRef} type="file" className="hidden"
        onChange={(e) => recibir(e.target.files)}
      />
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-secondary-container/30 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-primary text-2xl">{icon}</span>
        </div>
        <h4 className="text-[0.875rem] font-semibold text-primary">{label}</h4>
        {zona.file ? (
          <div className={`mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full border text-[0.6875rem] font-bold uppercase tracking-tight ${
            estado && !estado.ok
              ? "bg-red-50 text-red-700 border-red-100 dark:bg-red-950 dark:text-red-300 dark:border-red-900"
              : "bg-green-50 text-green-700 border-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-900"
          }`}>
            <span className="material-symbols-outlined text-sm">
              {estado && !estado.ok ? "error" : "check_circle"}
            </span>
            <span className="truncate max-w-[220px]">{zona.file.name}</span>
          </div>
        ) : (
          <>
            <p className="text-[0.6875rem] text-on-surface-variant mt-1">{hint}</p>
            <p className="mt-3 text-[0.6875rem] text-outline">Arrastra o haz clic para subir</p>
          </>
        )}
        {estado?.ok && estado.resumen && (
          <p className="mt-2 text-[0.6875rem] text-green-700 dark:text-green-300 font-semibold">
            ✓ espejo válido · {estado.resumen}
          </p>
        )}
      </div>
    </div>
  );
}

export default function NuevoAnalisisPivote({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [excel, setExcel] = useState<ArchivoZona>({ file: null });
  const [espejo, setEspejo] = useState<ArchivoZona>({ file: null });
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const onEspejo = async (f: File) => {
    const texto = await f.text();
    const validacion = validarEspejoTexto(texto);
    setEspejo({ file: f, validacion });
  };

  const listo = !!excel.file && !!espejo.file && espejo.validacion?.ok;

  const enviar = async () => {
    if (!listo || !excel.file || !espejo.file) return;
    setEnviando(true); setErrorEnvio(null);
    const form = new FormData();
    form.append("concurso_id", id);
    form.append("excel", excel.file);
    form.append("espejo", espejo.file);
    const r = await fetch("/api/pivote/analizar", { method: "POST", body: form });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      setErrorEnvio(e.error ?? `Error ${r.status}`);
      setEnviando(false);
      return;
    }
    const { job_id } = await r.json();
    router.push(`/concursos/${id}/jobs/${job_id}`);
  };

  return (
    <PanelShell title="Analizar postor" subtitle="Sube el Excel y el JSON espejo que produjo la skill">
      <div className="max-w-3xl">
        <Link href={`/concursos/${id}`} className="text-[0.75rem] text-on-surface-variant hover:text-primary flex items-center gap-1 mb-6">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Volver al concurso
        </Link>

        <div className="grid md:grid-cols-2 gap-4">
          <Zona
            label="Excel — Formato de Evaluación"
            hint="el .xlsx que generó la skill (hoja CLAUDE)"
            icon="table_view"
            acepta={(f) => f.name.endsWith(".xlsx") || f.name.endsWith(".xlsm")}
            zona={excel}
            onFile={(f) => setExcel({ file: f })}
          />
          <Zona
            label="JSON espejo (contrato v1.2.0)"
            hint="se valida aquí mismo al soltarlo, antes de subir"
            icon="data_object"
            acepta={(f) => f.name.endsWith(".json")}
            zona={espejo}
            onFile={onEspejo}
          />
        </div>

        {/* errores de validación del espejo, campo a campo */}
        {espejo.validacion && !espejo.validacion.ok && (
          <div className="mt-5 p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900">
            <p className="text-[0.8125rem] font-bold text-red-700 dark:text-red-300 mb-2">
              El espejo NO pasa el contrato ({espejo.validacion.errores.length} error{espejo.validacion.errores.length > 1 ? "es" : ""}):
            </p>
            <ul className="space-y-1 max-h-64 overflow-y-auto">
              {espejo.validacion.errores.slice(0, 30).map((e, i) => (
                <li key={i} className="text-[0.75rem] text-red-700 dark:text-red-300 font-mono">
                  <span className="font-bold">[{e.ruta}]</span> {e.mensaje}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[0.6875rem] text-red-600 dark:text-red-400">
              Corrige el espejo en la skill (o re-lanza el subagente responsable) y vuelve a soltarlo.
            </p>
          </div>
        )}

        {errorEnvio && (
          <p className="mt-4 text-[0.8125rem] text-red-600">{errorEnvio}</p>
        )}

        <button
          onClick={enviar}
          disabled={!listo || enviando}
          className="mt-6 h-11 px-6 rounded-lg bg-primary text-on-primary text-[0.875rem] font-semibold disabled:opacity-40 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">
            {enviando ? "hourglass_top" : "rocket_launch"}
          </span>
          {enviando ? "Subiendo…" : "Iniciar análisis"}
        </button>

        <p className="mt-3 text-[0.6875rem] text-on-surface-variant">
          El backend re-valida el espejo en la etapa de ingesta y corre el pipeline:
          validación (15 NOTAS) → CUI → InfoObras ∥ SUNAT → reglas → Excel final.
        </p>
      </div>
    </PanelShell>
  );
}
