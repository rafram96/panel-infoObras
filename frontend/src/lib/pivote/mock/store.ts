/**
 * Mock del backend del pivote — DATOS 100% SINTÉTICOS (cero datos del cliente).
 *
 * Sirve las pantallas P1-P6 con las MISMAS formas de `pipeline.py` mientras el
 * orquestador no expone HTTP. Cuando exista el FastAPI real, las pantallas no
 * cambian: solo se apunta `/api/pivote/*` al backend (los route handlers de
 * `app/api/pivote/` desaparecen o hacen proxy).
 *
 * Estado en memoria del proceso dev de Next (module-level): suficiente para
 * desarrollo; se reinicia con el server.
 */
import type {
  Concurso, EstadoEtapa, Etapa, ItemRevision, MetricaEtapa, Observacion,
  PivoteJob, ResultadoEtapa, ResumenAnalisis, SaludPortal,
} from "../types";
import { ETAPAS_ORDEN } from "../types";

// ── helpers ──────────────────────────────────────────────────────────────────

function met(total: number, ok: number, revision = 0, error = 0, ms = 1200): MetricaEtapa {
  return { items_total: total, items_ok: ok, items_revision: revision, items_error: error, reintentos: 0, duracion_ms: ms };
}

function etapaRes(
  etapa: Etapa, estado: EstadoEtapa, metrica: MetricaEtapa,
  observaciones: Observacion[] = [],
): ResultadoEtapa {
  return { etapa, estado, metrica, observaciones, iniciado_en: null, terminado_en: null, error: null };
}

function etapasCompletas(nExp: number, extra?: Partial<Record<Etapa, ResultadoEtapa>>): ResultadoEtapa[] {
  return ETAPAS_ORDEN.map((e) =>
    extra?.[e] ?? etapaRes(e, "ok", met(nExp, nExp)),
  );
}

// ── Concursos demo ───────────────────────────────────────────────────────────

const concursos: Concurso[] = [
  {
    concurso_id: "c-demo-1",
    nomenclatura: "CP-02-2026/GOB.REG.DEMO/C",
    entidad: "Gobierno Regional Demo",
    fecha_presentacion: "2026-05-20",
    creado_en: "2026-05-22T10:00:00Z",
  },
  {
    concurso_id: "c-demo-2",
    nomenclatura: "AS-15-2026/MUNI.DEMO",
    entidad: "Municipalidad Provincial Demo",
    fecha_presentacion: "2026-04-02",
    creado_en: "2026-04-05T10:00:00Z",
  },
];

// ── Jobs demo ────────────────────────────────────────────────────────────────

/** Job A — COMPLETADO. Contiene la historia central del pivote: un veredicto
 *  que el backend INVIERTE al descontar paralizaciones de InfoObras. */
const jobA: PivoteJob = {
  job_id: "job-aaa111",
  analisis_id: "demo-norte-2026-06-08",
  concurso_id: "c-demo-1",
  concurso: "CP-02-2026/GOB.REG.DEMO/C",
  postor: "CONSORCIO SUPERVISOR NORTE",
  estado: "completado",
  etapas: etapasCompletas(38, {
    validacion: etapaRes("validacion", "ok", met(38, 38), [
      { codigo: "NOTA9", severidad: "advertencia", origen: "validacion", referencia: "prof=5 exp=3",
        mensaje: "traslape de 2 días detectado en texto libre pero sin marcar el campo estructurado" },
    ]),
    reglas: etapaRes("reglas", "ok", met(38, 38), [
      { codigo: "PASO5", severidad: "alerta", origen: "reglas", referencia: "prof=2",
        mensaje: "días efectivos por debajo del mínimo tras descontar paralizaciones (3.96 → 1.55 años)" },
    ]),
    sunat: etapaRes("sunat", "ok", met(12, 12), [
      { codigo: "ALT04", severidad: "alerta", origen: "sunat", referencia: "prof=4 exp=2",
        mensaje: "emisor constituido 8 meses antes del inicio de la experiencia declarada" },
      { codigo: "VINCULACION", severidad: "critica", origen: "sunat", referencia: "postor↔emisor",
        mensaje: "el firmante de 9 certificados es consorciado del postor (60% de participación)" },
    ]),
  }),
  observaciones: [],
  items_revision: [],
  excel_final: "/api/pivote/jobs/job-aaa111/excel",
  zip_infoobras: null,
  creado_en: "2026-06-08T14:05:00Z",
  actualizado_en: "2026-06-08T14:31:00Z",
};

/** Job B — REQUIERE_REVISION: la cola humana de resolución de CUI (P4). */
const jobB: PivoteJob = {
  job_id: "job-bbb222",
  analisis_id: "demo-andina-2026-06-09",
  concurso_id: "c-demo-1",
  concurso: "CP-02-2026/GOB.REG.DEMO/C",
  postor: "CONSORCIO SALUD ANDINA",
  estado: "requiere_revision",
  etapas: etapasCompletas(41, {
    resolucion_cui: etapaRes("resolucion_cui", "ok_con_revision", met(41, 38, 3)),
    infoobras: etapaRes("infoobras", "ok_con_revision", met(38, 38, 0)),
  }),
  observaciones: [],
  items_revision: [
    {
      n_prof: 3, n_exp: 2, etapa: "resolucion_cui", resuelto: false,
      motivo: "CUI sin candidato fiable (nombre abreviado en el certificado)",
      accion_sugerida: "elegir candidato o pegar CUI",
      profesional: "Profesional 3", cargo: "ARQUITECTO ESP. INFRAESTRUCTURA",
      proyecto: "Mejoramiento C.S. San Martín de Porres, distrito Demo",
      fechas: "2021-03-01 → 2022-08-15",
      candidatos: [
        { cui: "2418877", nombre_obra: "MEJORAMIENTO DE LOS SERVICIOS DE SALUD DEL CENTRO DE SALUD SAN MARTIN DE PORRES", departamento: "DEMO", score: 72 },
        { cui: "2391544", nombre_obra: "MEJORAMIENTO Y AMPLIACION DEL PUESTO DE SALUD SAN MARTIN", departamento: "DEMO", score: 41 },
      ],
    },
    {
      n_prof: 7, n_exp: 1, etapa: "resolucion_cui", resuelto: false,
      motivo: "obra probablemente fuera de InfoObras (ESSALUD)",
      accion_sugerida: "confirmar que no existe o pegar CUI",
      profesional: "Profesional 7", cargo: "ING. ESP. INSTALACIONES SANITARIAS",
      proyecto: "Mejoramiento Hospital II ESSALUD Demo",
      fechas: "2019-01-10 → 2020-11-30",
      candidatos: [],
    },
    {
      n_prof: 9, n_exp: 4, etapa: "sunat", resuelto: false,
      motivo: "firmante ilegible en el certificado; SUNAT no puede verificar facultad (ALT12)",
      accion_sugerida: "confirmar firmante facultado",
      profesional: "Profesional 9", cargo: "ESPECIALISTA EN SUELOS",
      proyecto: "Ejecución C.S. Canta Demo",
      fechas: "2024-09-11 → 2025-02-02",
      candidatos: [],
    },
  ],
  excel_final: "/api/pivote/jobs/job-bbb222/excel",
  zip_infoobras: null,
  creado_en: "2026-06-09T09:12:00Z",
  actualizado_en: "2026-06-09T09:44:00Z",
};

/** Job C — EN_PROCESO: avanza una etapa por cada GET (simulación). */
const jobC: PivoteJob = {
  job_id: "job-ccc333",
  analisis_id: "demo-unidos-2026-06-10",
  concurso_id: "c-demo-1",
  concurso: "CP-02-2026/GOB.REG.DEMO/C",
  postor: "INGENIEROS UNIDOS S.A.C.",
  estado: "en_proceso",
  etapas: [
    etapaRes("ingesta", "ok", met(44, 44, 0, 0, 300)),
    etapaRes("validacion", "ok", met(44, 43, 0, 1, 900)),
    etapaRes("resolucion_cui", "en_curso", met(44, 19)),
  ],
  observaciones: [],
  items_revision: [],
  creado_en: "2026-06-10T16:20:00Z",
  actualizado_en: "2026-06-10T16:21:00Z",
};

/** Job D — concurso 2, COMPLETADO sin historias. */
const jobD: PivoteJob = {
  job_id: "job-ddd444",
  analisis_id: "demo-sur-2026-04-12",
  concurso_id: "c-demo-2",
  concurso: "AS-15-2026/MUNI.DEMO",
  postor: "SUPERVISIONES DEL SUR E.I.R.L.",
  estado: "completado",
  etapas: etapasCompletas(17),
  observaciones: [],
  items_revision: [],
  excel_final: "/api/pivote/jobs/job-ddd444/excel",
  creado_en: "2026-04-12T11:00:00Z",
  actualizado_en: "2026-04-12T11:18:00Z",
};

const jobs = new Map<string, PivoteJob>([
  [jobA.job_id, jobA], [jobB.job_id, jobB], [jobC.job_id, jobC], [jobD.job_id, jobD],
]);

// ── Resúmenes (P5) ───────────────────────────────────────────────────────────

const resumenes = new Map<string, ResumenAnalisis>([
  [jobA.job_id, {
    job_id: jobA.job_id,
    postor: jobA.postor!,
    veredictos: [
      { n_prof: 1, cargo: "JEFE DE SUPERVISIÓN", nombre: "Profesional 1",
        cumple_claude: "SÍ — 5.08 años", anios_brutos: 5.08, cumple_backend: null, anios_efectivos: 4.51,
        motivo_backend: "paralizaciones descontadas: −137 días; sigue sobre el mínimo (3 años)",
        fuente: "InfoObras · 2026-06-08" },
      { n_prof: 2, cargo: "ING. CIVIL ESP. ESTRUCTURAS", nombre: "Profesional 2",
        cumple_claude: "SÍ — 3.96 años", anios_brutos: 3.96,
        cumple_backend: "NO CUMPLE — 1.55 años efectivos (mínimo: 2)",
        anios_efectivos: 1.55,
        motivo_backend: "obra CUI 2338873 paralizada 21 meses dentro del periodo certificado: −821 días efectivos",
        fuente: "InfoObras · 2026-06-08" },
      { n_prof: 3, cargo: "ARQUITECTO ESP. INFRAESTRUCTURA", nombre: "Profesional 3",
        cumple_claude: "SÍ — 6.41 años", anios_brutos: 6.41, cumple_backend: null, anios_efectivos: 6.41,
        motivo_backend: null, fuente: "InfoObras · 2026-06-08" },
      { n_prof: 4, cargo: "ING. ESP. INSTALACIONES SANITARIAS", nombre: "Profesional 4",
        cumple_claude: "SÍ — 3.78 años", anios_brutos: 3.78, cumple_backend: null, anios_efectivos: 3.66,
        motivo_backend: "traslape de 44 días entre exp 2 y 4 (ALT11): se cuenta una sola vez",
        fuente: "recalculo backend" },
    ],
    alertas: [
      { id: "al-1", codigo: "VINCULACION", severidad: "critica",
        mensaje: "El firmante de 9 certificados es consorciado del postor (60%). Posible autocertificación intragrupo — criterio legal pendiente.",
        referencia: "postor ↔ emisor", fuente: "SUNAT getRepLeg · 2026-06-08", decision: null },
      { id: "al-2", codigo: "PASO5", severidad: "alerta",
        mensaje: "Profesional 2: experiencia efectiva 1.55 años < mínimo 2 años tras descontar paralizaciones.",
        referencia: "prof=2", fuente: "InfoObras · 2026-06-08", decision: null },
      { id: "al-3", codigo: "ALT04", severidad: "alerta",
        mensaje: "Emisor del certificado constituido 8 meses antes del inicio de la experiencia.",
        referencia: "prof=4 exp=2", fuente: "SUNAT · 2026-06-08", decision: null },
      { id: "al-4", codigo: "NOTA9", severidad: "advertencia",
        mensaje: "Traslape de 2 días detectado en observaciones (texto libre) sin campo estructurado.",
        referencia: "prof=5 exp=3", fuente: "validador", decision: null },
    ],
    factores: [
      { factor: "A. Experiencia adicional del personal clave", puntaje: 55, detalle: "6 de 8 cargos superan en ≥1 año el mínimo (75% → tramo >50–80%)" },
      { factor: "B. Certificaciones (PMP)", puntaje: "NO APLICA", detalle: "No figura en el Cuadro Resumen de Factores" },
      { factor: "C. Sostenibilidad ambiental (ISO 14001)", puntaje: 15, detalle: "Los 2 consorciados acreditan, vigentes" },
      { factor: "E. Integridad (ISO 37001)", puntaje: 15, detalle: "Los 2 consorciados acreditan" },
      { factor: "J. Gestión de calidad (ISO 9001)", puntaje: 15, detalle: "Alcance incluye supervisión de obras" },
    ],
    puntaje_total: 100,
  }],
]);

// ── Salud de portales ────────────────────────────────────────────────────────

const salud: SaludPortal[] = [
  { portal: "sunat", ok: true, diagnostico: null, desde: null },
  { portal: "infoobras", ok: true, diagnostico: null, desde: null },
];

// ── API del store (lo que consumen los route handlers) ──────────────────────

let secuencia = 1;

export const db = {
  listarConcursos(): (Concurso & { n_jobs: number; pendientes: number })[] {
    return concursos.map((c) => {
      const js = [...jobs.values()].filter((j) => j.concurso_id === c.concurso_id);
      return {
        ...c,
        n_jobs: js.length,
        pendientes: js.reduce((s, j) => s + j.items_revision.filter((i) => !i.resuelto).length, 0),
      };
    });
  },

  crearConcurso(datos: { nomenclatura: string; entidad?: string; fecha_presentacion?: string }): Concurso {
    const nuevo: Concurso = {
      concurso_id: `c-nuevo-${secuencia++}`,
      nomenclatura: datos.nomenclatura,
      entidad: datos.entidad ?? null,
      fecha_presentacion: datos.fecha_presentacion ?? null,
      creado_en: new Date().toISOString(),
    };
    concursos.push(nuevo);
    return nuevo;
  },

  concursoConJobs(id: string) {
    const c = concursos.find((x) => x.concurso_id === id);
    if (!c) return null;
    return { ...c, jobs: [...jobs.values()].filter((j) => j.concurso_id === id) };
  },

  job(id: string): PivoteJob | null {
    const j = jobs.get(id);
    if (!j) return null;
    if (j.estado === "en_proceso") avanzarSimulacion(j);
    return j;
  },

  crearJob(concursoId: string, analisisId: string, postor: string | null): PivoteJob {
    const c = concursos.find((x) => x.concurso_id === concursoId);
    const nuevo: PivoteJob = {
      job_id: `job-nuevo-${secuencia++}`,
      analisis_id: analisisId,
      concurso_id: concursoId,
      concurso: c?.nomenclatura ?? null,
      postor,
      estado: "en_proceso",
      etapas: [etapaRes("ingesta", "ok", met(1, 1, 0, 0, 250))],
      observaciones: [],
      items_revision: [],
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    };
    jobs.set(nuevo.job_id, nuevo);
    return nuevo;
  },

  resolverRevision(jobId: string, nProf: number, nExp: number, dato: { cui?: string; accion?: string }) {
    const j = jobs.get(jobId);
    if (!j) return null;
    const item = j.items_revision.find(
      (it) => it.n_prof === nProf && it.n_exp === nExp && !it.resuelto,
    );
    if (!item) return null;
    item.resuelto = true;
    item.accion_sugerida = dato.accion === "no_existe"
      ? "marcada como inexistente en InfoObras"
      : `resuelta con CUI ${dato.cui ?? "?"} — re-disparada aguas abajo`;
    // simula el re-disparo: la etapa del item sube a OK si ya no quedan pendientes
    for (const et of j.etapas) {
      const pendientesEtapa = j.items_revision.filter(
        (it) => it.etapa === et.etapa && !it.resuelto,
      ).length;
      if (et.estado === "ok_con_revision" && pendientesEtapa === 0) et.estado = "ok";
      et.metrica.items_revision = pendientesEtapa;
    }
    if (j.items_revision.every((it) => it.resuelto)) j.estado = "completado";
    j.actualizado_en = new Date().toISOString();
    return j;
  },

  decidirAlerta(jobId: string, alertaId: string, relevante: boolean, razon?: string) {
    const r = resumenes.get(jobId);
    const alerta = r?.alertas.find((a) => a.id === alertaId);
    if (!alerta) return null;
    alerta.decision = { relevante, razon };
    return r;
  },

  resumen(jobId: string): ResumenAnalisis | null {
    return resumenes.get(jobId) ?? null;
  },

  salud(): SaludPortal[] {
    return salud;
  },
};

/** El job EN_PROCESO avanza una etapa por consulta (suficiente para ver el
 *  stepper vivo con el polling de P3). */
function avanzarSimulacion(j: PivoteJob) {
  const actual = j.etapas.find((e) => e.estado === "en_curso");
  if (actual) {
    actual.estado = "ok";
    actual.metrica.items_ok = actual.metrica.items_total;
    actual.metrica.duracion_ms = 1500;
  }
  const hechas = new Set(j.etapas.map((e) => e.etapa));
  const siguiente = ETAPAS_ORDEN.find((e) => !hechas.has(e));
  if (siguiente) {
    const total = j.etapas[0]?.metrica.items_total ?? 1;
    j.etapas.push(etapaRes(siguiente, "en_curso", met(total, Math.floor(total / 2))));
  } else {
    j.estado = "completado";
    j.excel_final = `/api/pivote/jobs/${j.job_id}/excel`;
  }
  j.actualizado_en = new Date().toISOString();
}
