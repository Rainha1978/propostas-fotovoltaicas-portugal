import "./styles.css";
import { isAdminAuthenticated } from "../src/lib/adminAuth.js";

export const metadata = {
  title: "Proposta Fotovoltaica SolexR",
  description: "Simulador de proposta fotovoltaica SolexR"
};

export default async function RootLayout({ children }) {
  const isAdmin = await isAdminAuthenticated();

  return (
    <html lang="pt">
      <body>
        <header className="topbar">
          <a href="/" className="brand">
            <img src="/logo-solexr-header.png" alt="SolexR Energias Renovaveis" />
            <span>Proposta Fotovoltaica</span>
          </a>
          <nav>
            <a href="/leads/new">Nova simulacao</a>
            {isAdmin ? <a href="/leads">Simulacoes</a> : null}
            {isAdmin ? <a href="/admin/logout">Sair</a> : <a href="/admin/login">Admin</a>}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
