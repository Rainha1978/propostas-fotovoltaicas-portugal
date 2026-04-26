import { redirect } from "next/navigation";
import { createLead } from "../../../src/lib/leadRepository.js";

async function createLeadAction(formData) {
  "use server";
  const data = Object.fromEntries(formData.entries());
  if (!Number(data.fatura_mensal_eur || 0) && !Number(data.consumo_mensal_kwh || 0)) {
    throw new Error("Indique pelo menos a fatura mensal ou o consumo mensal em kWh.");
  }
  const lead = await createLead(data);
  redirect(`/leads/${lead.id}`);
}

export default function NewLeadPage() {
  return (
    <>
      <div className="page-title">
        <h1>Nova lead</h1>
      </div>
      <form action={createLeadAction} className="panel grid">
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
        <div className="field"><label>Tipo de telhado</label><select name="tipo_telhado"><option value="telha_lusa">Telha lusa</option><option value="sanduiche">Sanduiche</option><option value="terreo">Terreo</option></select></div>
        <div className="field">
          <label>Preferencia de painel</label>
          <select name="panel_preference" defaultValue="standard_460">
            <option value="standard_460">Standard 460W</option>
            <option value="large_595">Grande 595W</option>
          </select>
          <small>Painel 595W apenas disponivel para telhado sanduiche ou instalacao terrea, sujeito a validacao tecnica.</small>
        </div>
        <div className="field"><label>Telha lusa dificil</label><select name="telha_lusa_dificil"><option value="">Nao</option><option value="sim">Sim</option></select></div>
        <div className="field"><label>Tipo de estrutura</label><select name="tipo_estrutura"><option value="coplanar">Coplanar</option><option value="triangular">Triangular</option></select></div>
        <div className="field"><label>Distancia paineis ate inversor (m)</label><input name="distancia_paineis_inversor_m" type="number" step="0.1" /></div>
        <div className="field"><label>Distancia inversor ate quadro (m)</label><input name="distancia_inversor_quadro_m" type="number" step="0.1" /></div>
        <div className="field"><label>Distancia ate Maceira (km)</label><input name="distancia_maceira_km" type="number" step="0.1" /></div>
        <div className="field"><label>Pretende EV</label><select name="pretende_EV"><option value="">Nao</option><option value="sim">Sim</option></select></div>
        <div className="field"><label>Backup</label><select name="backup"><option value="sem_backup">Sem backup</option><option value="backup_manual">Backup manual</option><option value="backup_automatico">Backup automatico</option></select></div>
        <div className="field"><label>Pretende bateria</label><select name="pretende_bateria"><option value="">Nao</option><option value="sim">Sim</option></select></div>
        <div className="field"><label>Preferencia bateria</label><select name="preferencia_bateria"><option value="ambas">Ambas</option><option value="economica">Economica</option><option value="premium">Premium</option></select></div>
        <div className="field"><label>Capacidade bateria kWh</label><input name="capacidade_bateria_desejada_kwh" type="number" step="0.1" /></div>
        <div className="field full"><label>Observacoes</label><textarea name="notes" /></div>
        <div className="full"><button className="button" type="submit">Guardar lead</button></div>
      </form>
    </>
  );
}
