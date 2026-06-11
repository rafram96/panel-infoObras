/**
 * Schema zod del JSON espejo — contrato v1.2.0.
 *
 * ⚠ COPIA en paridad de `Pivote/skill/schemas/espejo.js` (zod CJS) y
 * `Pivote/backend/schemas/espejo.py` (Pydantic). Si el contrato cambia,
 * actualizar las TRES copias; `Pivote/tools/test_contrato.py` valida las dos
 * primeras — esta se valida manualmente al subir un espejo real.
 *
 * Permite validar el espejo EN EL NAVEGADOR al soltarlo en el dropzone:
 * rechazo inmediato con errores campo a campo, sin tocar la red.
 */
import { z } from "zod";

export const SENTINEL_POR_VERIFICAR = "POR VERIFICAR";
const RE_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const RE_FECHA_PARCIAL = /^\d{4}-\d{2}(\D.*)?$/;

const fecha = z
  .string()
  .nullable()
  .optional()
  .refine(
    (v) =>
      v == null ||
      RE_FECHA_ISO.test(v) ||
      v.startsWith(SENTINEL_POR_VERIFICAR) ||
      RE_FECHA_PARCIAL.test(v),
    { message: `fecha inválida (YYYY-MM-DD, 'YYYY-MM (anotación)' o '${SENTINEL_POR_VERIFICAR}…')` }
  );
const monto = z.number().nonnegative().nullable().optional();
const txt = z.string().nullable().optional();
const folioT = z.union([z.string(), z.number()]).nullable().optional();

const Formulario = z.object({
  anexo: z.string().default(""),
  documento: z.string().optional(),
  descripcion: z.string().optional(),
  observacion: z.string().default(""),
  folio: folioT.default(""),
}).passthrough();

const OfertaEconomica = z.object({
  cuantia: monto, limite_inferior: monto, propuesta: monto, detalle: txt,
}).passthrough();

const ExperienciaPostor = z.object({
  n: z.number().int().min(1),
  cliente: txt, contrato: txt, proyecto: txt, tipo_acreditacion: txt,
  monto, pct_objeto: z.number().min(0).max(1).nullable().optional(),
  le_corresponde: monto,
  acredita: z.union([z.number(), z.string()]).nullable().optional(),
  folio: folioT,
  ultimos_20_anios: txt, tipo_solicitado: txt, observaciones: txt,
}).strict();

const Backend = z.object({}).passthrough();

const ExperienciaProf = z.object({
  n: z.number().int().min(1),
  entidad_emisora: txt, ruc_emisor: txt,
  proyecto: txt, cui: txt,
  tipo_documento: txt, nombre_emisor: txt,
  cargo_emisor: txt, cargo_valido_emitir: txt,
  fecha_inicial: fecha, fecha_final: fecha, fecha_emision: fecha,
  folio: folioT,
  dias: monto, meses: monto, anios: monto,
  anterior_colegiatura: txt, cargo_ocupado: txt, cargo_bases_valido: txt,
  funciones_similares: txt, cert_antes_culminar: txt, incluye_covid: txt,
  tipo_obra_valido: txt,
  traslape: txt,
  nivel_categoria: txt,
  area_construida_m2: monto,
  monto_contrato_soles: monto,
  entidad_contratante: txt,
  ubicacion: txt,
  observaciones: txt,
  _backend: Backend.optional(),
}).strict().superRefine((e, ctx) => {
  const ini = e.fecha_inicial, fin = e.fecha_final;
  if (ini && fin && RE_FECHA_ISO.test(ini) && RE_FECHA_ISO.test(fin) && fin < ini) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `exp ${e.n}: fecha_final < fecha_inicial` });
  }
});

const CrossCheck = z.object({
  label: txt,
  valor: z.union([z.string(), z.record(z.any())]).nullable().optional(),
}).passthrough();

const Profesional = z.object({
  n_prof: z.number().int().min(1),
  cargo: z.string().min(1),
  nombre: txt, folio_nombre: folioT, titulo: txt, folio_titulo: folioT,
  profesion_valida: txt, colegiatura: txt,
  fecha_colegiatura: fecha,
  folio_colegiatura: folioT, certificaciones: txt,
  experiencia_total_declarada: z.union([z.number(), z.string()]).nullable().optional(),
  requisitos: z.record(z.any()).nullable().optional(),
  experiencias: z.array(ExperienciaProf).default([]),
  total: z.record(z.any()).default({}),
  cross_checks: z.array(CrossCheck).optional(),
  notas: z.array(z.string()).optional(),
  cumple: txt, anios_adicionales: txt,
}).passthrough().superRefine((p, ctx) => {
  const ns = p.experiencias.map((e) => e.n);
  const esperado = ns.map((_, i) => i + 1);
  if (ns.length && JSON.stringify(ns) !== JSON.stringify(esperado)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `profesional ${p.n_prof}: 'n' de experiencias no es 1..N contiguo: [${ns}]` });
  }
});

const Factor = z.object({
  factor: z.string().min(1),
  criterio: txt, folio: folioT, detalle: txt,
  aplica: z.boolean().nullable().optional(),
  puntaje: z.union([
    z.number(),
    z.string().refine((s) => s.trim().toUpperCase().startsWith("NO APLICA"),
      { message: "puntaje inválido (número, null o 'NO APLICA…')" }),
  ]).nullable().optional(),
}).strict();

const ResumenEvaluacion = z.object({
  factores: z.array(Factor).default([]),
  puntaje_total: monto,
  nota: txt,
}).passthrough();

const Observacion = z.object({
  severidad: txt, tipo: txt, mensaje: txt, referencia: txt,
}).passthrough();

export const JsonEspejo = z.object({
  _meta: z.object({ analisis_id: z.string().min(1) }).passthrough(),
  postor: z.object({
    detalle: txt,
    formularios: z.array(Formulario).default([]),
    oferta_economica: OfertaEconomica.default({}),
    experiencia_postor: z.array(ExperienciaPostor).default([]),
    experiencia_postor_total: z.record(z.any()).default({}),
    postor_cumple: txt,
    consorciados: z.array(z.record(z.any())).nullable().optional(),
  }).passthrough(),
  profesionales: z.array(Profesional).min(1),
  resumen_evaluacion: ResumenEvaluacion.default({}),
  observaciones_claude: z.array(Observacion).optional(),
}).passthrough().superRefine((d, ctx) => {
  const ns = d.profesionales.map((p) => p.n_prof);
  const esperado = ns.map((_, i) => i + 1);
  if (JSON.stringify(ns) !== JSON.stringify(esperado)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `n_prof debe ser 1..N contiguo y único: [${ns}]` });
  }
});

export interface ResultadoValidacion {
  ok: boolean;
  resumen?: string;
  errores: { ruta: string; mensaje: string }[];
}

/** Valida el texto de un archivo .json como espejo. Para el dropzone (P2). */
export function validarEspejoTexto(texto: string): ResultadoValidacion {
  let data: unknown;
  try {
    data = JSON.parse(texto);
  } catch (e) {
    return { ok: false, errores: [{ ruta: "(archivo)", mensaje: `JSON inválido: ${(e as Error).message}` }] };
  }
  const res = JsonEspejo.safeParse(data);
  if (!res.success) {
    return {
      ok: false,
      errores: res.error.issues.map((it) => ({
        ruta: it.path.join(".") || "(raíz)",
        mensaje: it.message,
      })),
    };
  }
  const nprof = res.data.profesionales.length;
  const nexp = res.data.profesionales.reduce((s, p) => s + (p.experiencias?.length ?? 0), 0);
  return {
    ok: true,
    resumen: `${nprof} profesionales · ${nexp} experiencias · factores=${res.data.resumen_evaluacion.factores.length}`,
    errores: [],
  };
}
