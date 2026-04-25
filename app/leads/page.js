import { listLeads } from "../../src/lib/leadRepository.js";

export default async function LeadsPage() {
  const leads = await listLeads();

  return (
    <>
      <div className="page-title">
        <h1>Leads</h1>
        <a className="button" href="/leads/new">Nova lead</a>
      </div>
      <section className="lead-list">
        {leads.length === 0 ? (
          <div className="panel">Ainda nao existem leads.</div>
        ) : leads.map((lead) => (
          <a className="lead-row" href={`/leads/${lead.id}`} key={lead.id}>
            <strong>{lead.name}</strong>
            <span>{lead.source}</span>
            <span>{lead.phone}</span>
            <span>{lead.status}</span>
          </a>
        ))}
      </section>
    </>
  );
}
