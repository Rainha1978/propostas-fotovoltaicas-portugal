import "./styles.css";

export const metadata = {
  title: "Propostas Fotovoltaicas",
  description: "CRM simples para leads e propostas fotovoltaicas"
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <body>
        <header className="topbar">
          <a href="/" className="brand">Propostas FV</a>
          <nav>
            <a href="/leads">Leads</a>
            <a href="/leads/new">Nova lead</a>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
