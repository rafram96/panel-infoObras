/** GET /api/pivote/jobs/{id}/excel — descarga el Excel final enriquecido.
 *  Mock: genera un XLSX mínimo válido; el backend real sirve el verdadero. */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/pivote/mock/store";
import { xlsxDemo } from "@/lib/pivote/mock/zip";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = db.job(id);
  if (!job) return NextResponse.json({ error: "job no existe" }, { status: 404 });
  if (!job.excel_final) {
    return NextResponse.json({ error: "el Excel final aún no está generado" }, { status: 409 });
  }
  const bytes = xlsxDemo(job.postor ?? job.analisis_id);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Formato_Evaluacion_${job.analisis_id}.xlsx"`,
    },
  });
}
