/** GET /api/pivote/jobs/{id}/zip — descarga el ZIP de documentos InfoObras
 *  (árbol Proyecto → Profesional → Experiencia, alcance confirmado 2026-06-10).
 *  Mock: genera un ZIP demo con esa estructura; el backend real adjunta los
 *  documentos descargados del portal. */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/pivote/mock/store";
import { zipInfoObrasDemo } from "@/lib/pivote/mock/zip";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = db.job(id);
  if (!job) return NextResponse.json({ error: "job no existe" }, { status: 404 });
  if (!job.zip_infoobras) {
    return NextResponse.json({ error: "el ZIP de InfoObras aún no está generado" }, { status: 409 });
  }
  const bytes = zipInfoObrasDemo(job.concurso ?? "concurso", job.postor ?? job.analisis_id);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="InfoObras_${job.analisis_id}.zip"`,
    },
  });
}
