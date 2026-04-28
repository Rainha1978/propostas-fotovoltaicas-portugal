import { notFound } from "next/navigation";
import { getLead } from "../../../../src/lib/leadRepository.js";

const WHATSAPP_URL = "https://wa.me/351969880053?text=Ol%C3%A1,%20acabei%20de%20fazer%20uma%20simula%C3%A7%C3%A3o%20fotovoltaica%20no%20site%20SolexR%20e%20gostava%20de%20ajuda%20com%20o%20or%C3%A7amento.";

export default async function LeadSuccessPage({ params }) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  return (
    <section className="success-shell">
      <article className="success-card">
        <div className="success-badge">Simulacao pronta</div>
        <h1>Simulacao criada com sucesso!</h1>
        <p className="success-intro">
          A sua simulacao fotovoltaica foi gerada com base nos dados fornecidos.
        </p>
        <p className="success-email-note">
          Enviamos a proposta para o seu email. Se nao encontrar, verifique tambem a pasta de spam.
        </p>

        <div className="success-actions">
          <a className="button whatsapp-button" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
            Falar no WhatsApp
          </a>
          <a className="button secondary success-secondary-button" href={`/api/leads/${lead.id}/proposal`}>
            Descarregar simulacao em PDF
          </a>
          <a className="success-back-link" href="/leads/new">
            Voltar ao simulador
          </a>
        </div>

        <p className="success-final-note">
          A proposta apresentada e uma simulacao inicial. O valor final pode variar conforme consumo real,
          orientacao do telhado, sombras e condicoes da instalacao.
        </p>
      </article>
    </section>
  );
}
