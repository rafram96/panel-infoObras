/**
 * POST /api/pivote/jobs/{id}/alertas — registra la decisión humana sobre una
 * alerta: { alerta_id, relevante: boolean, razon? }. La máquina detecta,
 * el humano decide, y la decisión queda en el expediente (auditoría).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/pivote/mock/store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { alerta_id, relevante, razon } = (await req.json()) ?? {};
  if (typeof alerta_id !== "string" || typeof relevante !== "boolean") {
    return NextResponse.json({ error: "alerta_id y relevante son obligatorios" }, { status: 400 });
  }
  const r = db.decidirAlerta(id, alerta_id, relevante, razon);
  if (!r) return NextResponse.json({ error: "alerta no existe" }, { status: 404 });
  return NextResponse.json(r);
}
