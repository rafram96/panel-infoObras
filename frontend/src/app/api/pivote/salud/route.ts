/**
 * GET /api/pivote/salud — estado operativo de los portales (SUNAT/InfoObras).
 * El backend real lo alimenta con diagnosticar_html_sunat() y equivalentes:
 * "captcha_real" / "estructura_desconocida" → banner operativo en el panel.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/pivote/mock/store";

export async function GET() {
  return NextResponse.json(db.salud());
}
