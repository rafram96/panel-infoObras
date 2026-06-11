/**
 * POST /api/pivote/analizar — recibe Excel + JSON espejo (multipart).
 * Mock: el espejo ya viene validado por zod en el cliente; aquí solo se
 * registra el job y se simula el pipeline. El backend real repite la
 * validación en INGESTA (nunca confiar solo en el cliente).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/pivote/mock/store";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const concursoId = String(form.get("concurso_id") ?? "");
  const espejoFile = form.get("espejo");
  const excelFile = form.get("excel");

  if (!concursoId) return NextResponse.json({ error: "falta concurso_id" }, { status: 400 });
  if (!(espejoFile instanceof File)) return NextResponse.json({ error: "falta el JSON espejo" }, { status: 400 });
  if (!(excelFile instanceof File)) return NextResponse.json({ error: "falta el Excel" }, { status: 400 });

  let analisisId = "(sin analisis_id)";
  let postor: string | null = null;
  try {
    const espejo = JSON.parse(await espejoFile.text());
    analisisId = espejo?._meta?.analisis_id ?? analisisId;
    postor = espejo?._meta?.postor ?? null;
  } catch {
    return NextResponse.json({ error: "el espejo no es JSON válido" }, { status: 422 });
  }

  const job = db.crearJob(concursoId, analisisId, postor);
  return NextResponse.json({ job_id: job.job_id }, { status: 201 });
}
