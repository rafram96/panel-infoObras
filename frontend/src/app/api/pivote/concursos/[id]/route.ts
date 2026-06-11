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
