export default function HomePage() {
  return (
    <section className="panel">
      <div className="page-title">
        <div>
          <h1>Gestao de propostas fotovoltaicas</h1>
          <p className="muted">Comeca por criar uma lead e validar o calculo automatico da proposta.</p>
        </div>
        <a className="button" href="/leads/new">Criar lead</a>
      </div>
      <a className="button secondary" href="/leads">Ver leads</a>
    </section>
  );
}
