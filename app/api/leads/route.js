import { NextResponse } from "next/server";
import { createLead, listLeads } from "../../../src/lib/leadRepository.js";

export async function GET() {
  return NextResponse.json({ leads: await listLeads() });
}

export async function POST(request) {
  const lead = await createLead(await request.json());
  return NextResponse.json({ lead }, { status: 201 });
}
