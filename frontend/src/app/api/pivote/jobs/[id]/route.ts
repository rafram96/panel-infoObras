import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/pivote/mock/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = db.job(id);
  if (!job) return NextResponse.json({ error: "job no existe" }, { status: 404 });
  return NextResponse.json(job);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const r = db.borrarJob(id);
  if (!r.eliminado) return NextResponse.json({ error: "job no existe" }, { status: 404 });
  return NextResponse.json(r);
}
