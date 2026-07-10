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
  PivoteJob, ProfesionalHit, ProgresoAnalisis, ResultadoEtapa, ResumenAnalisis,
  SaludPortal,
} from "../types";
import { ETAPA_LABEL, ETAPAS_ORDEN } from "../types";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Minúsculas y sin tildes, para búsquedas tolerantes ("perez" ≈ "Pérez"). */
function sinTildes(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

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
    fecha_presentacion: "2026-05-20",
    creado_en: "2026-05-22T10:00:00Z",
  },
  {
    concurso_id: "c-demo-2",
    nomenclatura: "AS-15-2026/MUNI.DEMO",
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
  origen: "mcp",
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
  zip_infoobras: "/api/pivote/jobs/job-aaa111/zip",
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
  origen: "mcp",
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
  origen: "mcp",
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
  origen: "dropzone",
  estado: "completado",
  etapas: etapasCompletas(17),
  observaciones: [],
  items_revision: [],
  excel_final: "/api/pivote/jobs/job-ddd444/excel",
  zip_infoobras: "/api/pivote/jobs/job-ddd444/zip",
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


// ── Espejo (profesionales + experiencias) para la vista de extracción ────────

export interface ExpBreve {
  n: number; proyecto: string; entidad_emisora: string; cargo_ocupado: string;
  fecha_inicial: string; fecha_final: string; dias: number | null;
  cui?: string | null; incluye_covid?: string; traslape?: string | null;
  folio?: string;
}
export interface ProfBreve {
  n_prof: number; cargo: string; nombre: string; colegiatura?: string;
  cumple?: string | null; total?: { dias?: number; anios?: number };
  experiencias: ExpBreve[];
}

const espejos = new Map<string, ProfBreve[]>([
  [jobA.job_id, [
    { n_prof: 1, cargo: "JEFE DE SUPERVISIÓN", nombre: "Profesional 1", colegiatura: "CIP 90001",
      cumple: "SÍ — 5.08 años", total: { dias: 1857, anios: 5.08 },
      experiencias: [
        { n: 1, proyecto: "Mejoramiento Hospital Regional Demo, Nivel II-1", entidad_emisora: "Gobierno Regional Demo",
          cargo_ocupado: "RESIDENTE DE OBRA", fecha_inicial: "2016-06-10", fecha_final: "2017-05-15", dias: 340, cui: "2160001", folio: "599" },
        { n: 2, proyecto: "Supervisión Plan de Contingencia C.S. Demo", entidad_emisora: "Consorcio IC Demo",
          cargo_ocupado: "SUPERVISOR", fecha_inicial: "2019-05-01", fecha_final: "2019-10-31", dias: 184, folio: "601" },
        { n: 3, proyecto: "Supervisión Mejoramiento P.S. Pentágono Demo", entidad_emisora: "Consorcio Pentágono Demo",
          cargo_ocupado: "JEFE DE SUPERVISIÓN", fecha_inicial: "2021-05-13", fecha_final: "2023-05-06", dias: 724, cui: "2338873", folio: "604" },
        { n: 4, proyecto: "Supervisión Hospital San Ramón Demo", entidad_emisora: "Consorcio San Ramón Demo",
          cargo_ocupado: "JEFE DE SUPERVISIÓN", fecha_inicial: "2023-11-22", fecha_final: "2025-07-22", dias: 609, folio: "608" },
      ] },
    { n_prof: 2, cargo: "ING. CIVIL ESP. ESTRUCTURAS", nombre: "Profesional 2", colegiatura: "CIP 90002",
      cumple: "SÍ — 3.96 años (backend: NO CUMPLE, 1.55 efectivos)", total: { dias: 1444, anios: 3.96 },
      experiencias: [
        { n: 1, proyecto: "Supervisión C.S. Pachas Demo", entidad_emisora: "Consorcio Salud Demo",
          cargo_ocupado: "ESP. ESTRUCTURAS", fecha_inicial: "2019-11-04", fecha_final: "2023-03-31", dias: 1244, cui: "2338873", incluye_covid: "SÍ", folio: "612" },
        { n: 2, proyecto: "Instalación Servicios de Salud Primer Nivel Demo", entidad_emisora: "Consorcio Unión Demo",
          cargo_ocupado: "ESP. ESTRUCTURAS", fecha_inicial: "2014-12-10", fecha_final: "2015-06-27", dias: 200, folio: "615" },
      ] },
    { n_prof: 3, cargo: "ARQUITECTO ESP. INFRAESTRUCTURA", nombre: "Profesional 3", colegiatura: "CAP 17900",
      cumple: "SÍ — 6.41 años", total: { dias: 2340, anios: 6.41 },
      experiencias: [
        { n: 1, proyecto: "Supervisión Hospital Hipólito Demo", entidad_emisora: "Consorcio Hospital Demo",
          cargo_ocupado: "ARQUITECTO", fecha_inicial: "2016-08-01", fecha_final: "2019-02-28", dias: 942, folio: "616" },
        { n: 2, proyecto: "Ejecución E.S. Piura Demo", entidad_emisora: "Consorcio Piura Demo",
          cargo_ocupado: "ARQUITECTO", fecha_inicial: "2019-06-01", fecha_final: "2021-03-31", dias: 670, incluye_covid: "SÍ", folio: "619" },
        { n: 3, proyecto: "Creación Hospital Especializado Demo", entidad_emisora: "Consorcio San Juan Demo",
          cargo_ocupado: "ARQUITECTA SUPERVISORA", fecha_inicial: "2021-06-01", fecha_final: "2023-05-31", dias: 728, folio: "622" },
      ] },
    { n_prof: 4, cargo: "ING. ESP. INSTALACIONES SANITARIAS", nombre: "Profesional 4", colegiatura: "CIP 90004",
      cumple: "SÍ — 3.78 años", total: { dias: 1379, anios: 3.78 },
      experiencias: [
        { n: 1, proyecto: "Supervisión C.S. Ambo Demo", entidad_emisora: "Consorcio Supervisor Demo",
          cargo_ocupado: "ESP. SANITARIO", fecha_inicial: "2021-10-15", fecha_final: "2023-06-05", dias: 599, folio: "625" },
        { n: 2, proyecto: "Supervisión C.S. Huácar Demo", entidad_emisora: "Consorcio Supervisor Demo",
          cargo_ocupado: "ESP. SANITARIO", fecha_inicial: "2024-01-08", fecha_final: "2024-09-05", dias: 242, folio: "627" },
        { n: 3, proyecto: "Ejecución C.S. Canta Demo", entidad_emisora: "Consorcio Ejecución Demo",
          cargo_ocupado: "ESP. SANITARIO", fecha_inicial: "2024-09-11", fecha_final: "2025-02-02", dias: 145, traslape: "SÍ", folio: "630" },
        { n: 4, proyecto: "Supervisión C.S. Ambo Demo (2º periodo)", entidad_emisora: "Consorcio Supervisor Demo",
          cargo_ocupado: "ESP. SANITARIO", fecha_inicial: "2025-02-01", fecha_final: "2025-09-30", dias: 242, traslape: "SÍ", folio: "630" },
      ] },
  ]],
  [jobB.job_id, [
    { n_prof: 3, cargo: "ARQUITECTO ESP. INFRAESTRUCTURA", nombre: "Profesional 3", colegiatura: "CAP 18100",
      cumple: null, total: { dias: 1101, anios: 3.02 },
      experiencias: [
        { n: 1, proyecto: "Supervisión Hospital Andino Demo", entidad_emisora: "Consorcio Andino Demo",
          cargo_ocupado: "ARQUITECTO", fecha_inicial: "2018-02-01", fecha_final: "2019-12-31", dias: 699, folio: "402" },
        { n: 2, proyecto: "Mejoramiento C.S. San Martín de Porres, distrito Demo", entidad_emisora: "Consorcio SMP Demo",
          cargo_ocupado: "ARQUITECTO", fecha_inicial: "2021-03-01", fecha_final: "2022-08-15", dias: 533, folio: "410" },
      ] },
  ]],
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

  crearConcurso(datos: { nomenclatura: string; fecha_presentacion?: string }): Concurso {
    const nuevo: Concurso = {
      concurso_id: `c-nuevo-${secuencia++}`,
      nomenclatura: datos.nomenclatura,
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
      origen: "dropzone",
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
    if (j.items_revision.every((it) => it.resuelto)) {
      j.estado = "completado";
      j.zip_infoobras = j.zip_infoobras ?? `/api/pivote/jobs/${j.job_id}/zip`;
    }
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

  espejoProfesionales(jobId: string): ProfBreve[] | null {
    return espejos.get(jobId) ?? null;
  },

  salud(): SaludPortal[] {
    return salud;
  },

  /** Búsqueda global de profesionales (espejo del endpoint del backend):
   *  matchea nombre/colegiatura/cargo sin tildes ni mayúsculas, una fila por
   *  aparición, con el contexto para saltar directo al análisis. */
  buscarProfesionales(q: string): ProfesionalHit[] {
    const qn = sinTildes(q.trim());
    if (qn.length < 2) return [];
    const out: ProfesionalHit[] = [];
    for (const [jobId, profs] of espejos) {
      const j = jobs.get(jobId);
      if (!j) continue;
      for (const p of profs) {
        const campos = [p.nombre, p.colegiatura, p.cargo];
        if (!campos.some((v) => v && sinTildes(v).includes(qn))) continue;
        out.push({
          nombre: p.nombre, cargo: p.cargo, colegiatura: p.colegiatura ?? null,
          n_prof: p.n_prof, cumple: p.cumple ?? null,
          n_experiencias: p.experiencias.length,
          job_id: jobId, estado_job: j.estado,
          concurso_id: j.concurso_id ?? null, concurso: j.concurso ?? null,
          postor: j.postor ?? null,
        });
      }
    }
    return out
      .sort((a, b) => sinTildes(a.nombre ?? "").localeCompare(sinTildes(b.nombre ?? "")))
      .slice(0, 50);
  },

  /** Progreso sintético para la barra en vivo del panel (sin backend real).
   *  Reusa la simulación de `job()`: la etapa `en_curso` gana un contador
   *  por-ítem y un texto sin jerga, igual que `armar_progreso()` del backend. */
  progreso(jobId: string): ProgresoAnalisis | null {
    const j = jobs.get(jobId);
    if (!j) return null;
    // NO avanza la simulación: `job()` es el único que la mueve. Así /progreso
    // refleja el estado que dejó el último /jobs y no acelera la demo al doble.
    const OK = ["ok", "ok_con_revision", "error_parcial"];
    const completas = j.etapas.filter((e) => OK.includes(e.estado)).length;
    const porEtapa = new Map(j.etapas.map((e) => [e.etapa, e]));
    const etapas = ETAPAS_ORDEN.map((nombre) => {
      const res = porEtapa.get(nombre);
      if (res && res.estado === "en_curso") {
        // solo las etapas que iteran por ítem llevan contador (igual que el backend:
        // validacion/reglas/excel reportan sin número).
        const porItem = ["resolucion_cui", "infoobras", "sunat"].includes(nombre);
        const total = porItem ? res.metrica.items_total || 0 : 0;
        const actual = total ? Math.max(1, res.metrica.items_ok || Math.ceil(total / 2)) : 0;
        return {
          etapa: nombre, estado: "en_curso" as EstadoEtapa,
          texto: textoVivoMock(nombre, actual, total),
          ...(total ? { item_actual: actual, items_total: total } : {}),
        };
      }
      return { etapa: nombre, texto: ETAPA_LABEL[nombre],
               estado: (res?.estado ?? "pendiente") as EstadoEtapa };
    });
    const dEstado = j.descargas_estado ?? "listas";
    return {
      job_id: j.job_id,
      estado: j.estado,
      pct: Math.round((completas / ETAPAS_ORDEN.length) * 100),
      etapas,
      descargas: {
        estado: dEstado, listo: dEstado === "listas",
        total: 0, descargadas: 0, faltan: 0,
        en_revision: j.items_revision.filter((it) => !it.resuelto).length,
        obra_actual: null,
      },
      eta: null,
      pendientes_humano: j.items_revision.filter((it) => !it.resuelto).length,
    };
  },
};

/** Textos sin jerga de la etapa activa (espejo de los que emite el backend). */
function textoVivoMock(etapa: Etapa, i: number, total: number): string {
  switch (etapa) {
    case "resolucion_cui": return `Ubicando la obra ${i} de ${total} en el registro público`;
    case "infoobras": return `Verificando la obra ${i} de ${total} — Hospital de demostración`;
    case "sunat": return `Consultando el emisor ${i} de ${total}`;
    case "validacion": return "Revisando la consistencia de la propuesta";
    case "reglas": return "Calculando los días efectivos de experiencia";
    case "excel": return "Armando el Excel de evaluación";
    default: return ETAPA_LABEL[etapa];
  }
}

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
    j.zip_infoobras = `/api/pivote/jobs/${j.job_id}/zip`;
  }
  j.actualizado_en = new Date().toISOString();
}
