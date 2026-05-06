import "./styles.css";
import { isAdminAuthenticated } from "../src/lib/adminAuth.js";

export const metadata = {
  title: "Propostas Fotovoltaicas",
  description: "CRM simples para leads e propostas fotovoltaicas"
};

export default async function RootLayout({ children }) {
  const isAdmin = await isAdminAuthenticated();

  return (
    <html lang="pt">
      <body>
        <header className="topbar">
          <a href="/" className="brand">Propostas FV</a>
          <nav>
            <a href="/leads/new">Nova lead</a>
            {isAdmin ? <a href="/leads">Leads</a> : null}
            {isAdmin ? <a href="/admin/logout">Sair</a> : <a href="/admin/login">Admin</a>}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
