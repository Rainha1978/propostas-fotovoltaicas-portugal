import { redirect } from "next/navigation";
import { createAdminSession, isAdminPassword } from "../../../src/lib/adminAuth.js";

async function loginAction(formData) {
  "use server";
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/leads");

  if (!isAdminPassword(password)) {
    console.warn("Acesso negado a login admin");
    redirect(`/admin/login?error=1&next=${encodeURIComponent(next)}`);
  }

  await createAdminSession();
  redirect(next.startsWith("/") ? next : "/leads");
}

export default async function AdminLoginPage({ searchParams }) {
  const query = await searchParams;
  const next = query?.next || "/leads";
  const hasError = query?.error === "1";

  return (
    <section className="panel auth-panel">
      <div className="page-title">
        <div>
          <h1>Login admin</h1>
          <p className="muted">Acesso reservado à gestão interna de leads.</p>
        </div>
      </div>
      <form action={loginAction} className="auth-form">
        <input type="hidden" name="next" value={next} />
        <div className="field">
          <label>Password</label>
          <input name="password" type="password" autoComplete="current-password" required />
        </div>
        {hasError ? <p className="auth-error">Password incorreta.</p> : null}
        <button className="button" type="submit">Entrar</button>
      </form>
    </section>
  );
}
