"use client";

/** P2 · Analizar postor — sube Excel + JSON espejo (Camino B / dropzone).
 *  El espejo se valida con zod EN EL NAVEGADOR al soltarlo: rechazo inmediato
 *  con errores campo a campo (el backend re-valida en INGESTA igual). */
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import PanelShell from "@/components/PanelShell";
import { Dropzone } from "@/components/Dropzone";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { validarEspejoTexto, type ResultadoValidacion } from "@/lib/pivote/espejo";

interface ArchivoZona {
  file: File | null;
  validacion?: ResultadoValidacion | null;
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
    <PanelShell title="Analizar postor" subtitle="Sube el Excel y el archivo de datos que generó Claude">
      <div className="max-w-3xl">
        <Breadcrumbs
          items={[
            { label: "Concursos", href: "/concursos" },
            { label: "Expediente", href: `/concursos/${id}` },
            { label: "Subir análisis manual" },
          ]}
        />

        <div className="mb-5 bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 px-5 py-3.5 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-xl">bolt</span>
          <p className="text-xs text-outline leading-relaxed">
            Normalmente <b className="text-primary">no necesitas esta pantalla</b>: los análisis llegan solos
            desde Claude. Esta es la vía manual, por si acaso.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Dropzone
            label="Excel — Formato de Evaluación"
            hint="el .xlsx que generó Claude"
            icon="table_view"
            accept=".xlsx,.xlsm"
            acepta={(f) => f.name.endsWith(".xlsx") || f.name.endsWith(".xlsm")}
            file={excel.file}
            validacion={excel.validacion}
            onFile={(f) => setExcel({ file: f })}
          />
          <Dropzone
            label="Archivo de datos (.json)"
            hint="lo genera Claude junto con el Excel; se revisa al instante"
            icon="data_object"
            accept=".json,application/json"
            acepta={(f) => f.name.endsWith(".json")}
            file={espejo.file}
            validacion={espejo.validacion}
            onFile={onEspejo}
          />
        </div>

        {/* errores de validación del espejo, campo a campo */}
        {espejo.validacion && !espejo.validacion.ok && (
          <div className="mt-5 p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900">
            <p className="text-dato font-bold text-red-700 dark:text-red-300 mb-2">
              El archivo de datos tiene {espejo.validacion.errores.length} error{espejo.validacion.errores.length > 1 ? "es" : ""}:
            </p>
            <ul className="space-y-1 max-h-64 overflow-y-auto">
              {espejo.validacion.errores.slice(0, 30).map((e, i) => (
                <li key={i} className="text-xs text-red-700 dark:text-red-300 font-mono">
                  <span className="font-bold">[{e.ruta}]</span> {e.mensaje}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-micro text-red-600 dark:text-red-400">
              Vuelve a generarlo en Claude y súbelo de nuevo.
            </p>
          </div>
        )}

        {errorEnvio && (
          <p className="mt-4 text-dato text-red-600">{errorEnvio}</p>
        )}

        <button
          onClick={enviar}
          disabled={!listo || enviando}
          className="mt-6 inline-flex items-center gap-1.5 primary-gradient text-white text-sm font-semibold px-6 py-3 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[18px]">
            {enviando ? "hourglass_top" : "rocket_launch"}
          </span>
          {enviando ? "Subiendo…" : "Iniciar análisis"}
        </button>

        <p className="mt-3 text-micro text-on-surface-variant">
          Al recibirlo, el sistema revisa el archivo y verifica todo contra SUNAT
          e InfoObras antes de generar el Excel final.
        </p>
      </div>
    </PanelShell>
  );
}
