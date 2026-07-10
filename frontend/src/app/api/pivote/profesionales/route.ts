/**
 * GET /api/pivote/profesionales?q= — búsqueda global de profesionales en todos
 * los análisis (nombre / colegiatura / cargo, sin tildes). Con PIVOTE_API
 * definido este handler NO corre: Next reescribe la ruta al backend real
 * (buscar_profesionales en app.py). Sin él, sirve el mock.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/pivote/mock/store";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json(db.buscarProfesionales(q));
}
