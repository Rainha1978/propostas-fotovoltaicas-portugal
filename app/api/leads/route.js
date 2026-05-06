import { NextResponse } from "next/server";
import { createLead } from "../../../src/lib/leadRepository.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({ error: "Metodo nao permitido." }, { status: 405 });
}

export async function POST(request) {
  const lead = await createLead(await request.json());
  return NextResponse.json({ lead: { id: lead.id } }, { status: 201 });
}
