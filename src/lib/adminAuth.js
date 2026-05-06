import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_SESSION_COOKIE = "solexr_admin_session";

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "";
}

function getExpectedToken() {
  const password = getAdminPassword();
  if (!password) return null;
  return createHmac("sha256", password)
    .update("solexr-admin-session")
    .digest("hex");
}

function safeCompare(value, expected) {
  if (!value || !expected) return false;
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer);
}

export async function isAdminAuthenticated() {
  const expectedToken = getExpectedToken();
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return safeCompare(token, expectedToken);
}

export async function createAdminSession() {
  const expectedToken = getExpectedToken();
  if (!expectedToken) {
    throw new Error("ADMIN_PASSWORD nao configurada.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, expectedToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function requireAdminPage(path = "pagina interna") {
  if (await isAdminAuthenticated()) return;
  console.warn(`Acesso negado a ${path}`);
  redirect(`/admin/login?next=${encodeURIComponent(path)}`);
}

export async function requireAdminApi(path = "api interna") {
  if (await isAdminAuthenticated()) return true;
  console.warn(`Acesso negado a ${path}`);
  return false;
}

export function isAdminPassword(password) {
  const expectedPassword = getAdminPassword();
  return safeCompare(password, expectedPassword);
}
