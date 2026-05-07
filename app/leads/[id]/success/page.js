const WHATSAPP_URL = "https://wa.me/351969880053?text=Ol%C3%A1,%20acabei%20de%20fazer%20uma%20simula%C3%A7%C3%A3o%20fotovoltaica%20no%20site%20SolexR%20e%20gostava%20de%20ajuda%20com%20o%20or%C3%A7amento.";

function emailMessage(status) {
  if (status === "failed") {
    return "A sua proposta fotovoltaica foi gerada com base nos dados fornecidos. Se não receber o email, fale connosco no WhatsApp.";
  }
  if (status === "skipped") {
    return "A sua proposta fotovoltaica foi gerada com base nos dados fornecidos. Como não foi indicado email, pode falar connosco no WhatsApp.";
  }
  return "Enviámos a simulação para o seu email. Se não encontrar, verifique também a pasta de spam.";
}

export default async function LeadSuccessPage({ searchParams }) {
  const query = await searchParams;

  return (
    <section className="success-shell">
      <article className="success-card">
        <div className="success-badge">Simulação pronta</div>
        <h1>Simulação criada com sucesso!</h1>
        <p className="success-intro">
          A sua proposta fotovoltaica foi gerada com base nos dados fornecidos.
        </p>
        <p className="success-email-note">
          {emailMessage(query?.email)}
        </p>

        <div className="success-actions">
          <a className="button whatsapp-button" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
            Falar no WhatsApp
          </a>
          <a className="success-back-link" href="/leads/new">
            Nova simulação
          </a>
        </div>

        <p className="success-final-note">
          A proposta apresentada é uma simulação indicativa.
          O valor final poderá variar após análise técnica no local.
        </p>
      </article>
    </section>
  );
}
