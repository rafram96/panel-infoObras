/**
 * POST /api/pivote/jobs/{id}/revision — resuelve UN ItemRevision.
 * Body: { n_prof, n_exp, cui? , accion? ("no_existe") }.
 * El backend real re-dispara SOLO esa experiencia aguas abajo
 * (Motor.resolver_revision); el mock lo simula.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/pivote/mock/store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { n_prof, n_exp, cui, accion } = body ?? {};
  if (typeof n_prof !== "number" || typeof n_exp !== "number") {
    return NextResponse.json({ error: "n_prof y n_exp son obligatorios" }, { status: 400 });
  }
  if (!cui && accion !== "no_existe") {
    return NextResponse.json({ error: "se requiere cui o accion='no_existe'" }, { status: 400 });
  }
  const job = db.resolverRevision(id, n_prof, n_exp, { cui, accion });
  if (!job) {
    return NextResponse.json(
      { error: `no hay ItemRevision pendiente para prof=${n_prof} exp=${n_exp}` },
      { status: 404 },
    );
  }
  return NextResponse.json(job);
}
