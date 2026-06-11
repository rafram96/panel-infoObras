"use client";

import PanelShell from "@/components/PanelShell";

// ── Datos de las alertas ───────────────────────────────────────────────────

interface Alerta {
  codigo: string;
  titulo: string;
  severidad: "CRITICO" | "OBSERVACION";
  automatica: boolean;
  descripcion: string;
  logica: string;
  ejemplo?: string;
  fuente?: string;
}

const ALERTAS: Alerta[] = [
  {
    codigo: "ALT01",
    titulo: "Fecha de emisión anterior al fin de la experiencia",
    severidad: "OBSERVACION",
    automatica: true,
    descripcion: "El certificado fue emitido antes de que terminara la experiencia declarada.",
    logica: "fecha_fin_experiencia > fecha_emision_certificado",
    ejemplo: "Certificado emitido en marzo/2020 pero declara experiencia hasta diciembre/2020.",
    fuente: "Regla de coherencia temporal — un certificado solo puede emitirse una vez terminada la labor.",
  },
  {
    codigo: "ALT02",
    titulo: "Periodo incluye COVID-19",
    severidad: "OBSERVACION",
    automatica: true,
    descripcion: "La experiencia se superpone con el periodo de paralización por pandemia.",
    logica: "fecha_inicio ≤ 31/12/2021  Y  fecha_fin ≥ 16/03/2020",
    ejemplo: "Experiencia del 01/01/2019 al 30/06/2022 incluye 21 meses del periodo COVID.",
    fuente: "Rango COVID: 16/03/2020 — 31/12/2021. Los días solapados se descuentan del cómputo de experiencia.",
  },
  {
    codigo: "ALT03",
    titulo: "Experiencia con más de 25 años de antigüedad",
    severidad: "OBSERVACION",
    automatica: true,
    descripcion: "La fecha de término de la experiencia supera los 25 años desde la presentación de la propuesta.",
    logica: "fecha_fin < (fecha_propuesta - 25 años)",
    ejemplo: "Propuesta presentada en 2026, experiencia terminada en 1999 → queda fuera del umbral.",
    fuente: "Criterio OSCE: solo se consideran experiencias de los últimos 25 años.",
  },
  {
    codigo: "ALT04",
    titulo: "Empresa emisora constituida después del inicio de experiencia",
    severidad: "CRITICO",
    automatica: false,
    descripcion: "La empresa que emite el certificado fue fundada después de la fecha en que dice que el profesional inició labores.",
    logica: "fecha_inicio_actividades_SUNAT > fecha_inicio_experiencia",
    ejemplo: "Certificado dice 'trabajó desde 01/2015' pero la empresa fue creada el 01/2018.",
    fuente: "Verificación manual en https://e-consultaruc.sunat.gob.pe (tiene CAPTCHA, no se automatiza).",
  },
  {
    codigo: "ALT05",
    titulo: "Sin fecha de término (“a la fecha”)",
    severidad: "CRITICO",
    automatica: true,
    descripcion: "El certificado no especifica una fecha de término explícita, dice “a la fecha” o similar.",
    logica: "fecha_fin = null  ó  texto contiene 'a la fecha' / 'actualidad'",
    ejemplo: "Certificado dice 'viene laborando desde 2018 a la fecha'.",
    fuente: "La experiencia solo es válida hasta la fecha de emisión del certificado. Se usa cert_issue_date como fecha fin efectiva.",
  },
  {
    codigo: "ALT06",
    titulo: "Cargo no válido según bases",
    severidad: "CRITICO",
    automatica: true,
    descripcion: "El cargo desempeñado en el certificado no coincide con los cargos aceptados por las bases.",
    logica: "cargo_certificado ∉ cargos_similares_validos (del RTM)",
    ejemplo: "Bases piden 'Jefe de Supervisión' y certificado dice 'Residente de Obra'.",
    fuente: "Matching por normalización + sinónimos OSCE (Gestor BIM ≈ Especialista BIM ≈ Coordinador BIM).",
  },
  {
    codigo: "ALT07",
    titulo: "Profesión no coincide",
    severidad: "CRITICO",
    automatica: true,
    descripcion: "La profesión del profesional propuesto no coincide con las aceptadas en las bases.",
    logica: "profesion_propuesta ∉ profesiones_aceptadas (del RTM)",
    ejemplo: "Bases requieren 'Ingeniero Civil' o 'Arquitecto' y el profesional es 'Ingeniero Industrial'.",
    fuente: "Comparación literal género-neutro (Ingeniero = Ingeniera).",
  },
  {
    codigo: "ALT08",
    titulo: "Tipo de obra no coincide",
    severidad: "CRITICO",
    automatica: true,
    descripcion: "El sector de la obra en el certificado no coincide con el requerido por las bases.",
    logica: "tipo_obra_certificado ≠ tipo_obra_requerido",
    ejemplo: "Bases piden experiencia en obras de salud y el certificado es de una carretera.",
    fuente: "Matching por diccionario de sinónimos sectoriales (salud ↔ hospital, clínica, centro médico).",
  },
  {
    codigo: "ALT09",
    titulo: "Colegiatura no vigente",
    severidad: "OBSERVACION",
    automatica: false,
    descripcion: "El número de colegiatura del profesional no está activo al momento de presentar la propuesta.",
    logica: "estado_colegiatura ≠ 'Vigente' / 'Activo'",
    ejemplo: "CIP N° 123456 aparece como 'suspendido' o 'baja' en el colegio correspondiente.",
    fuente: "Verificación manual en el portal del colegio correspondiente (CIP, CAP, CBP, CMP, etc. — cada colegio tiene su propio portal).",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────

const SEVERIDAD_STYLES: Record<Alerta["severidad"], { bg: string; text: string; border: string; icon: string }> = {
  CRITICO: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-300",
    icon: "error",
  },
  OBSERVACION: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-300",
    icon: "warning",
  },
};

// ── Page ──────────────────────────────────────────────────────────────────

export default function AlertasInfoPage() {
  const totalCriticas = ALERTAS.filter((a) => a.severidad === "CRITICO").length;
  const totalObservaciones = ALERTAS.filter((a) => a.severidad === "OBSERVACION").length;
  const totalAutomaticas = ALERTAS.filter((a) => a.automatica).length;
  const totalManuales = ALERTAS.filter((a) => !a.automatica).length;

  return (
    <PanelShell title="Alertas del Sistema" subtitle="Información">
      <div className="max-w-[1200px] mx-auto p-6 lg:p-10">
        {/* Header */}
        <div className="mb-10 border-l-4 border-primary pl-6">
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.15rem] text-secondary">
            Referencia
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-primary mt-1">
            Catálogo de Alertas
          </h2>
          <p className="text-on-surface-variant text-sm mt-2 max-w-2xl">
            Listado completo de alertas que el sistema detecta automáticamente
            al evaluar certificados de experiencia contra los requisitos del concurso.
          </p>
        </div>

        {/* Summary cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface-container-lowest p-4 border-l-4 border-primary shadow-ambient rounded-xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total alertas</p>
            <p className="text-2xl font-bold text-primary">{ALERTAS.length}</p>
          </div>
          <div className="bg-surface-container-lowest p-4 border-l-4 border-red-500 shadow-ambient rounded-xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Críticas</p>
            <p className="text-2xl font-bold text-red-600">{totalCriticas}</p>
          </div>
          <div className="bg-surface-container-lowest p-4 border-l-4 border-amber-500 shadow-ambient rounded-xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Observaciones</p>
            <p className="text-2xl font-bold text-amber-600">{totalObservaciones}</p>
          </div>
          <div className="bg-surface-container-lowest p-4 border-l-4 border-green-500 shadow-ambient rounded-xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Automáticas</p>
            <p className="text-2xl font-bold text-green-600">
              {totalAutomaticas}<span className="text-base text-slate-400">/{ALERTAS.length}</span>
            </p>
          </div>
        </section>

        {/* Legend */}
        <div className="bg-surface-container-low rounded-xl border border-outline-variant/20 p-5 mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
            Leyenda de Severidades
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-red-600 text-base mt-0.5">error</span>
              <div>
                <p className="text-xs font-bold text-red-700">CRÍTICO</p>
                <p className="text-[11px] text-on-surface-variant">
                  Puede ser causa de descalificación o rechazo del profesional.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-600 text-base mt-0.5">warning</span>
              <div>
                <p className="text-xs font-bold text-amber-700">OBSERVACIÓN</p>
                <p className="text-[11px] text-on-surface-variant">
                  Requiere atención del evaluador pero no necesariamente descalifica.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-green-600 text-base mt-0.5">autorenew</span>
              <div>
                <p className="text-xs font-bold text-green-700">AUTOMÁTICA</p>
                <p className="text-[11px] text-on-surface-variant">
                  El sistema la detecta solo. No requiere intervención del usuario.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-slate-600 text-base mt-0.5">person_search</span>
              <div>
                <p className="text-xs font-bold text-slate-700">MANUAL</p>
                <p className="text-[11px] text-on-surface-variant">
                  Requiere verificación del evaluador en portales externos.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts list */}
        <section className="space-y-4">
          {ALERTAS.map((alerta) => {
            const styles = SEVERIDAD_STYLES[alerta.severidad];
            return (
              <article
                key={alerta.codigo}
                className={`bg-surface-container-lowest rounded-xl shadow-ambient border ${styles.border} overflow-hidden`}
              >
                {/* Header */}
                <div className={`px-5 py-4 border-b ${styles.border} ${styles.bg} flex items-start gap-3`}>
                  <span className={`material-symbols-outlined ${styles.text} text-xl mt-0.5`}>
                    {styles.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-black tracking-wider ${styles.bg} ${styles.text} border ${styles.border}`}>
                        {alerta.codigo}
                      </span>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${styles.bg} ${styles.text}`}>
                        {alerta.severidad}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          alerta.automatica
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[12px]">
                          {alerta.automatica ? "autorenew" : "person_search"}
                        </span>
                        {alerta.automatica ? "Automática" : "Manual"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-primary leading-tight">
                      {alerta.titulo}
                    </h3>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-3">
                  <div>
                    <p className="text-xs text-on-surface">{alerta.descripcion}</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Lógica de detección
                    </p>
                    <pre className="bg-slate-900 text-slate-100 text-[11px] font-mono px-3 py-2 rounded overflow-x-auto">
                      {alerta.logica}
                    </pre>
                  </div>

                  {alerta.ejemplo && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Ejemplo
                      </p>
                      <p className="text-xs text-on-surface-variant italic border-l-2 border-slate-300 pl-3">
                        {alerta.ejemplo}
                      </p>
                    </div>
                  )}

                  {alerta.fuente && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Fuente / Observación
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        {alerta.fuente}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        {/* Footer note */}
        <div className="mt-10 p-5 bg-primary/5 rounded-xl border border-primary/20">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary text-lg mt-0.5">
              info
            </span>
            <div className="text-xs text-on-surface leading-relaxed">
              <p className="font-bold mb-1">Degradación elegante</p>
              <p>
                Las alertas que requieren verificación manual (ALT04, ALT09) solo se generan si el
                evaluador proporciona el dato externo correspondiente. En ausencia de ese dato,
                la alerta no se dispara para evitar falsos positivos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}
