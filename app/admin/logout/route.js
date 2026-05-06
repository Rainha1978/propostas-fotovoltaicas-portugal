import { NextResponse } from "next/server";
import { clearAdminSession } from "../../../src/lib/adminAuth.js";

export async function GET(request) {
  await clearAdminSession();
  return NextResponse.redirect(new URL("/admin/login", request.url));
}
