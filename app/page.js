const benefits = [
  "Estimar o custo de uma solucao fotovoltaica ajustada ao seu consumo.",
  "Perceber quanto pode poupar todos os anos na fatura de eletricidade.",
  "Receber aconselhamento entre sistema on-grid, hibrido e opcoes com bateria.",
  "Escolher preferencias de equipamentos, bateria, backup e carregador eletrico."
];

export default function HomePage() {
  return (
    <section className="home-hero">
      <div className="home-copy">
        <p className="eyebrow">Simulador SolexR</p>
        <h1>Descubra a sua proposta fotovoltaica em poucos segundos</h1>
        <p className="hero-text">
          Com este simulador pode saber quanto pode custar o seu sistema solar,
          quanto pode poupar e que solucao faz mais sentido para o seu perfil de consumo.
        </p>
        <div className="hero-actions">
          <a className="button hero-button" href="/leads/new">Simular agora</a>
          <span>Simulacao gratuita, rapida e sem compromisso.</span>
        </div>
      </div>

      <div className="home-card">
        <img className="home-logo" src="/logo-solexr-header.png" alt="SolexR Energias Renovaveis" />
        <h2>O que pode fazer aqui?</h2>
        <ul className="benefit-list">
          {benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
        </ul>
      </div>
    </section>
  );
}
