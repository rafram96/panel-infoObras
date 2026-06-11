/** Mock API del pivote — reemplazable por el backend FastAPI real. */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/pivote/mock/store";

export async function GET() {
  return NextResponse.json(db.listarConcursos());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.nomenclatura) {
    return NextResponse.json({ error: "nomenclatura es obligatoria" }, { status: 400 });
  }
  return NextResponse.json(db.crearConcurso(body), { status: 201 });
}
