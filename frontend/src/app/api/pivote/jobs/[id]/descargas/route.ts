import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/pivote/mock/store";

/** Avance de la descarga diferida de documentos (lo que arma el ZIP). Espejo de
 *  GET /api/pivote/jobs/{id}/descargas del backend real. En el mock los jobs
 *  demo ya vienen con el ZIP listo, así que devuelve el estado sin progreso. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const avance = db.avanceDescargas(id);
  if (!avance) return NextResponse.json({ error: "job no existe" }, { status: 404 });
  return NextResponse.json(avance);
}
