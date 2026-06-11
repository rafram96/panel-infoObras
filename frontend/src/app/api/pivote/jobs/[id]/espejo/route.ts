/**
 * GET /api/pivote/jobs/{id}/espejo — profesionales + experiencias del espejo
 * (la "extracción") para la vista del panel. El backend real sirve el espejo
 * enriquecido; el panel solo lo muestra, nunca recalcula.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/pivote/mock/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const profesionales = db.espejoProfesionales(id);
  if (!profesionales) {
    return NextResponse.json({ error: "espejo no disponible para este job" }, { status: 404 });
  }
  return NextResponse.json({ profesionales });
}
