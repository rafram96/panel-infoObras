/**
 * GET /api/pivote/jobs/{id}/progreso — avance del análisis para la barra en vivo.
 * Fusiona el avance grueso (etapas) con el fino (item por item) + descargas, en
 * un solo request. Con PIVOTE_API definido, este handler NO corre: Next reescribe
 * la ruta al backend real (armar_progreso en app.py). Sin él, sirve el mock.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/pivote/mock/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const p = db.progreso(id);
  if (!p) return NextResponse.json({ error: "análisis no existe" }, { status: 404 });
  return NextResponse.json(p);
}
