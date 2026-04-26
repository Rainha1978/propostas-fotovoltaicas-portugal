import { notFound } from "next/navigation";
import { calculateProposal } from "../../../src/domain/solarCalculator.js";
import { getLead, listFollowUps } from "../../../src/lib/leadRepository.js";

function eur(value) {
  return `${Number(value || 0).toFixed(2)} EUR`;
}

function valueOrDash(value) {
  return value || "-";
}

function yesNo(value) {
  return value ? "Sim" : "Nao";
}

function panelPreferenceLabel(value) {
  return value === "large_595" ? "Grande 595W" : "Standard 460W";
}

export default async function LeadDetailPage({ params }) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();
  const proposal = calculateProposal(lead);
  const followUps = await listFollowUps(lead.id);

  return (
    <>
      <div className="page-title">
        <div>
          <h1>{lead.name}</h1>
          <p className="muted">{lead.status} &middot; {lead.phone} &middot; {lead.source}</p>
        </div>
        <a className="button" href={`/api/leads/${lead.id}/proposal`}>Gerar proposta PDF</a>
      </div>

      <section className="summary">
        <div className="metric">Solucao<strong>{proposal.recommendation.mode}</strong></div>
        <div className="metric">Sistema recomendado<strong>{proposal.sizing.targetKwp} kWp</strong><span>potencia otimizada face ao consumo</span></div>
        <div className="metric">Preco final<strong>{eur(proposal.price.gross)}</strong></div>
        <div className="metric">Poupanca anual<strong>{eur(proposal.roi.annualSavingsEur)}</strong></div>
        <div className="metric">ROI<strong>{proposal.roi.roiYears ?? "-"} anos</strong></div>
        <div className="metric">Paineis<strong>{proposal.equipment.panelCount}</strong></div>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <h2>Dados do cliente</h2>
          <dl className="info-list">
            <div><dt>Telefone</dt><dd>{lead.phone}</dd></div>
            <div><dt>Email</dt><dd>{valueOrDash(lead.email)}</dd></div>
            <div><dt>Localidade</dt><dd>{valueOrDash(lead.locality)}</dd></div>
            <div><dt>Imovel</dt><dd>{valueOrDash(lead.propertyType)}</dd></div>
            <div><dt>Rede</dt><dd>{lead.rede}</dd></div>
            <div><dt>Telhado</dt><dd>{lead.tipo_telhado}</dd></div>
            <div><dt>Preferencia painel</dt><dd>{panelPreferenceLabel(lead.panel_preference)}</dd></div>
            <div><dt>Estrutura</dt><dd>{lead.tipo_estrutura}</dd></div>
            <div><dt>Telha dificil</dt><dd>{yesNo(lead.telha_lusa_dificil)}</dd></div>
            <div><dt>Objetivo</dt><dd>{lead.objetivo}</dd></div>
            <div><dt>Escolha cliente</dt><dd>{lead.escolha_cliente}</dd></div>
            <div><dt>Backup</dt><dd>{lead.backup}</dd></div>
          </dl>
        </article>

        <article className="panel recommendation-card">
          <h2>Conselho de solucao</h2>
          <p className="recommendation-title">{proposal.recommendation.text}</p>
          <p>
            Consumo estimado de <strong>{proposal.sizing.monthlyConsumptionKwh} kWh/mes</strong>,
            com sistema recomendado de <strong>{proposal.sizing.targetKwp} kWp</strong>
            e <strong>{proposal.sizing.actualPanelPowerKwp} kWp reais em paineis</strong>.
          </p>
          <p>
            Fatura mensal de <strong>{eur(proposal.sizing.monthlyBillEur)}</strong>,
            perfil <strong>{proposal.recommendation.profile}</strong>,
            poupanca mensal estimada de <strong>{eur(proposal.roi.monthlySavingsEur)}</strong>.
          </p>
          {proposal.recommendation.notes.length > 0 && (
            <div className="notice-list">
              {proposal.recommendation.notes.map((note) => <p key={note}>{note}</p>)}
            </div>
          )}
        </article>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Equipamentos aconselhados</h2>
            <p className="muted">Resumo para validar rapidamente se a recomendacao faz sentido.</p>
          </div>
        </div>
        <div className="equipment-grid">
          <div className="equipment-card">
            <span>Paineis</span>
            <strong>{proposal.equipment.panelCount} x {proposal.equipment.panel.label}</strong>
            <small>Escolha: {panelPreferenceLabel(lead.panel_preference)}</small>
          </div>
          <div className="equipment-card">
            <span>Inversor</span>
            <strong>{proposal.equipment.inverter.label}</strong>
          </div>
          <div className="equipment-card">
            <span>Bateria</span>
            <strong>{proposal.equipment.battery.capacityKwh ? proposal.equipment.battery.label : "Sem bateria"}</strong>
          </div>
          <div className="equipment-card">
            <span>Carregador EV</span>
            <strong>{proposal.equipment.evCharger || "Nao incluido"}</strong>
          </div>
        </div>
      </section>

      {proposal.advice.pricedOptions.length > 0 && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Opcoes de bateria</h2>
              <p className="muted">Comparacao entre alternativas economicas e premium.</p>
            </div>
          </div>
          <div className="equipment-grid">
            {proposal.advice.pricedOptions.map((option) => (
              <div className="equipment-card" key={option.key}>
                <span>{option.key}</span>
                <strong>{option.battery?.label || "Sem bateria"}</strong>
                <small>
                  {option.inverter.label} · {eur(option.price.gross)} · ROI {option.roi.roiYears ?? "-"} anos
                </small>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Divisao do calculo</h2>
            <p className="muted">Valores indicativos para perceber onde o preco esta a nascer.</p>
          </div>
          <strong className="total-pill">{eur(proposal.price.gross)}</strong>
        </div>

        <div className="breakdown">
          {proposal.price.breakdown.map((section) => (
            <article className="breakdown-section" key={section.key}>
              <header>
                <h3>{section.label}</h3>
                <strong>{eur(section.total)}</strong>
              </header>
              {section.items.length === 0 ? (
                <p className="muted">Nao aplicavel neste lead.</p>
              ) : (
                <table className="cost-table">
                  <tbody>
                    {section.items.map((item) => (
                      <tr key={item.label}>
                        <td>{item.label}</td>
                        <td>{eur(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </article>
          ))}
        </div>
        <div className="calibration-note">
          <strong>Calibracao usada:</strong> {proposal.calibration.source}
          <br />
          IVA atual aplicado: {Math.round(proposal.calibration.vatRate * 100)}%.
          Benchmarks ajustados ao IVA atual: on-grid ~{proposal.calibration.benchmarksGrossPerKwp.onGridMedian} EUR/kWp,
          hibrido ~{proposal.calibration.benchmarksGrossPerKwp.hybridMedian} EUR/kWp.
          Historico observado com IVA {Math.round(proposal.calibration.historicalVatRate * 100)}%:
          on-grid ~{proposal.calibration.benchmarksHistoricalGrossPerKwp.onGridMedian} EUR/kWp,
          hibrido ~{proposal.calibration.benchmarksHistoricalGrossPerKwp.hybridMedian} EUR/kWp.
        </div>
      </section>

      <section className="panel">
        <h2>Producao e retorno</h2>
        <div className="roi-grid">
          <div><span>Producao anual</span><strong>{proposal.roi.annualProductionKwh} kWh</strong></div>
          <div><span>Autoconsumo direto</span><strong>{proposal.roi.directSelfConsumptionKwh} kWh</strong></div>
          <div><span>Uso via bateria</span><strong>{proposal.roi.batteryUsefulKwh} kWh</strong></div>
          <div><span>Poupanca mensal</span><strong>{eur(proposal.roi.monthlySavingsEur)}</strong></div>
          <div><span>Poupanca anual</span><strong>{eur(proposal.roi.annualSavingsEur)}</strong></div>
        </div>
      </section>

      {proposal.advice.technicalFlags.length > 0 && (
        <section className="panel">
          <h2>Notas tecnicas</h2>
          <div className="notice-list">
            {proposal.advice.technicalFlags.map((flag) => (
              <p key={`${flag.type}-${flag.area}-${flag.message}`}>
                <strong>{flag.type}:</strong> {flag.message}
              </p>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Follow-up</h2>
        {followUps.length === 0 ? (
          <p className="muted">Sem lembretes.</p>
        ) : followUps.map((followUp) => (
          <p key={followUp.id}>
            <strong>{new Date(followUp.dueAt).toLocaleDateString("pt-PT")}:</strong> {followUp.reason}
          </p>
        ))}
      </section>
    </>
  );
}
