/**
 * GET /api/pivote/jobs/{id}/resumen — el resumen digerido para P5.
 * El backend real lo deriva del espejo enriquecido + EnriquecimientoExperiencia;
 * el panel nunca recalcula veredictos.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/pivote/mock/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const r = db.resumen(id);
  if (!r) return NextResponse.json({ error: "sin resumen para este job" }, { status: 404 });
  return NextResponse.json(r);
}
