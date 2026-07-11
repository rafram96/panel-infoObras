import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/pivote/mock/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const c = db.concursoConJobs(id);
  if (!c) return NextResponse.json({ error: "concurso no existe" }, { status: 404 });
  return NextResponse.json(c);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const nomenclatura = (body?.nomenclatura ?? "").trim();
  if (!nomenclatura) return NextResponse.json({ error: "nomenclatura requerida" }, { status: 400 });
  const c = db.renombrarConcurso(id, nomenclatura);
  if (!c) return NextResponse.json({ error: "concurso no existe" }, { status: 404 });
  return NextResponse.json(c);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const r = db.borrarConcurso(id);
  if (!r.eliminado) return NextResponse.json({ error: "concurso no existe" }, { status: 404 });
  return NextResponse.json(r);
}
