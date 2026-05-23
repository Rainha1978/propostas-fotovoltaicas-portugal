import { redirect } from "next/navigation";
import { calculateProposal } from "../../../src/domain/solarCalculator.js";
import { createLead, saveProposal } from "../../../src/lib/leadRepository.js";
import { buildProposalPdf } from "../../../src/lib/proposalPdf.js";
import { sendEmail } from "../../../src/lib/sendEmail.js";

async function buildAndSendProposalEmail(lead) {
  try {
    const calculation = calculateProposal(lead);
    const onGridOption = calculateProposal({
      ...lead,
      forceMode: "on-grid",
      wantsBattery: false,
      batteryCapacityKwh: null
    });
    const hybridOption = calculateProposal({
      ...lead,
      forceMode: "hibrido",
      wantsBattery: true,
      pretende_bateria: true,
      batteryCapacityKwh: lead.batteryCapacityKwh || lead.capacidade_bateria_desejada_kwh || null,
      capacidade_bateria_desejada_kwh: lead.capacidade_bateria_desejada_kwh || lead.batteryCapacityKwh || null
    });
    await saveProposal({ leadId: lead.id, calculation });
    const pdf = buildProposalPdf({
      lead,
      calculation,
      options: {
        onGrid: onGridOption,
        hybrid: hybridOption
      }
    });

    const emailResult = await sendEmail({ lead, pdfBuffer: pdf, calculation });
    return emailResult.cliente;
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    return "failed";
  }
}

async function createLeadAction(formData) {
  "use server";
  const data = Object.fromEntries(formData.entries());
  if (!Number(data.fatura_mensal_eur || 0) && !Number(data.consumo_mensal_kwh || 0)) {
    redirect("/leads/new?error=1");
  }
  let lead;
  let emailStatus;
  try {
    lead = await createLead(data);
    emailStatus = lead.duplicateExisting ? "sent" : await buildAndSendProposalEmail(lead);
  } catch (error) {
    console.error("Erro ao criar simulacao:", error);
    redirect("/leads/new?error=1");
  }
  redirect(`/leads/${lead.id}/success?email=${emailStatus}`);
}
export default async function NewLeadPage({ searchParams }) {
  const query = await searchParams;
  const hasError = query?.error === "1";

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Nova simulação</h1>
          <p className="muted">Preencha os seus dados para calcularmos a melhor solução para si.</p>
        </div>
      </div>
      <form action={createLeadAction} className="panel grid" id="simulation-form">
        <input type="hidden" name="clientRequestId" id="client_request_id" />
        {hasError ? (
          <div className="field full">
            <p className="form-error">Não foi possível gerar a simulação. Tente novamente.</p>
          </div>
        ) : null}
        <div className="field"><label>Nome</label><input name="name" required /></div>
        <div className="field"><label>Telefone</label><input name="phone" required /></div>
        <div className="field"><label>Email</label><input name="email" type="email" /></div>
        <div className="field"><label>Localidade</label><input name="locality" /></div>
        <div className="field"><label>Origem</label><select name="source" required><option>WhatsApp</option><option>Facebook</option><option>Site</option></select></div>
        <div className="field"><label>Tipo de imovel</label><input name="propertyType" /></div>
        <div className="field"><label>Fatura mensal em EUR</label><input name="fatura_mensal_eur" type="number" step="0.01" /></div>
        <div className="field"><label>Consumo mensal em kWh</label><input name="consumo_mensal_kwh" type="number" step="0.1" /></div>
        <div className="field"><label>Perfil de consumo</label><select name="perfil_consumo"><option value="dia">Dia</option><option value="noite">Noite</option><option value="equilibrado">Equilibrado</option></select></div>
        <div className="field"><label>Objetivo</label><select name="objetivo"><option value="poupar">Poupar</option><option value="backup">Backup</option><option value="autonomia">Autonomia</option><option value="preparar_EV">Preparar EV</option><option value="aconselhamento">Aconselhamento</option></select></div>
        <div className="field"><label>Escolha do cliente</label><select name="escolha_cliente"><option value="ainda_nao_sei">Ainda nao sei</option><option value="ongrid">On-grid</option><option value="hibrido">Hibrido</option><option value="hibrido_backup">Hibrido com backup</option></select></div>
        <div className="field"><label>Tipo de rede</label><select name="rede"><option value="monofasico">Monofasico</option><option value="trifasico">Trifasico</option><option value="nao_sei">Nao sei</option></select></div>
        <div className="field"><label>Tipo de telhado</label><select id="tipo_telhado" name="tipo_telhado"><option value="telha_lusa">Telha lusa</option><option value="sanduiche">Sanduiche</option><option value="terreo">Terreo</option></select></div>
        <div className="field">
          <label>Preferencia de painel</label>
          <select name="panel_preference" defaultValue="standard_460">
            <option value="standard_460">Standard 460W</option>
            <option value="large_595">Grande 595W</option>
          </select>
          <small>Painel 595W apenas disponivel para telhado sanduiche ou instalacao terrea, sujeito a validacao tecnica.</small>
        </div>
        <div className="field" id="tipo_estrutura_field">
          <label>Tipo de estrutura</label>
          <select id="tipo_estrutura" name="tipo_estrutura">
            <option value="coplanar">Coplanar</option>
            <option value="triangular">Triangular</option>
            <option value="nao_aplicavel">Nao aplicavel</option>
          </select>
          <small id="estrutura_terreo_help" hidden>Estrutura terrea a definir apos visita tecnica.</small>
        </div>
        <div className="field"><label>Distancia paineis ate inversor (m)</label><input name="distancia_paineis_inversor_m" type="number" step="0.1" /></div>
        <div className="field"><label>Distancia inversor ate quadro (m)</label><input name="distancia_inversor_quadro_m" type="number" step="0.1" /></div>
        <div className="field"><label>Distancia ate Maceira (km)</label><input name="distancia_maceira_km" type="number" step="0.1" /></div>
        <div className="field"><label>Pretende EV</label><select name="pretende_EV"><option value="">Nao</option><option value="sim">Sim</option></select></div>
        <div className="field"><label>Backup</label><select name="backup"><option value="sem_backup">Sem backup</option><option value="backup_manual">Backup manual</option><option value="backup_automatico">Backup automatico</option></select></div>
        <div className="field"><label>Pretende bateria</label><select name="pretende_bateria"><option value="">Nao</option><option value="sim">Sim</option></select></div>
        <div className="field"><label>Preferencia bateria</label><select name="preferencia_bateria"><option value="ambas">Ambas</option><option value="economica">Economica</option><option value="premium">Premium</option></select></div>
        <div className="field"><label>Capacidade bateria kWh</label><input name="capacidade_bateria_desejada_kwh" type="number" step="0.1" /></div>
        <div className="field full"><label>Observacoes</label><textarea name="notes" /></div>
        <div className="full">
          <button className="button" type="submit" id="simulation-submit">Gerar simulação</button>
          <p className="muted" id="simulation-feedback" hidden>Por favor aguarde. Estamos a gerar a sua simulação...</p>
        </div>
      </form>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (() => {
              const roof = document.getElementById("tipo_telhado");
              const structure = document.getElementById("tipo_estrutura");
              const field = document.getElementById("tipo_estrutura_field");
              const help = document.getElementById("estrutura_terreo_help");
              const form = document.getElementById("simulation-form");
              const submit = document.getElementById("simulation-submit");
              const feedback = document.getElementById("simulation-feedback");
              const requestId = document.getElementById("client_request_id");
              if (requestId && !requestId.value) {
                requestId.value = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(16).slice(2);
              }
              let isSubmitting = false;
              const resetSubmit = () => {
                isSubmitting = false;
                if (submit) {
                  submit.disabled = false;
                  submit.textContent = "Gerar simulação";
                }
                if (feedback) feedback.hidden = true;
              };
              if (form && submit && feedback) {
                form.addEventListener("submit", (event) => {
                  if (isSubmitting) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    return;
                  }
                  isSubmitting = true;
                  submit.disabled = true;
                  submit.textContent = "Estamos a gerar a sua simulação...";
                  feedback.hidden = false;
                });
                form.addEventListener("keydown", (event) => {
                  if (isSubmitting && event.key === "Enter") {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                  }
                });
                window.addEventListener("pageshow", resetSubmit);
                window.addEventListener("offline", () => {
                  resetSubmit();
                  feedback.textContent = "Não foi possível gerar a simulação. Tente novamente.";
                  feedback.hidden = false;
                });
              }
              if (!roof || !structure || !field || !help) return;
              const syncStructure = () => {
                const isGround = roof.value === "terreo";
                structure.value = isGround ? "nao_aplicavel" : (structure.value === "nao_aplicavel" ? "coplanar" : structure.value);
                structure.disabled = isGround;
                help.hidden = !isGround;
                field.dataset.ground = isGround ? "true" : "false";
              };
              roof.addEventListener("change", syncStructure);
              syncStructure();
            })();
          `
        }}
      />
    </>
  );
}
