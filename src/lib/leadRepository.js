import { LEAD_STATUSES } from "../domain/solarCalculator.js";

const memoryStore = globalThis.__leadMemoryStore ??= {
  leads: [],
  proposals: [],
  followUps: []
};

let poolPromise;
let schemaReadyPromise;

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

async function getPool() {
  if (!poolPromise) {
    poolPromise = import("pg").then(({ Pool }) => new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false }
    }));
  }
  return poolPromise;
}

async function ensureSchema() {
  if (!hasDatabase()) return;
  if (!schemaReadyPromise) {
    schemaReadyPromise = getPool().then((pool) => pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'Novo',
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        locality TEXT,
        source TEXT NOT NULL,
        property_type TEXT,
        grid_type TEXT NOT NULL,
        roof_type TEXT NOT NULL,
        ground_floor BOOLEAN NOT NULL DEFAULT FALSE,
        difficult_tile BOOLEAN NOT NULL DEFAULT FALSE,
        consumption_period TEXT NOT NULL,
        monthly_bill_eur DOUBLE PRECISION NOT NULL DEFAULT 0,
        monthly_consumption_kwh DOUBLE PRECISION,
        distance_pv_to_inverter_m DOUBLE PRECISION NOT NULL DEFAULT 0,
        distance_inverter_to_panel_m DOUBLE PRECISION NOT NULL DEFAULT 0,
        distance_to_maceira_km DOUBLE PRECISION NOT NULL DEFAULT 0,
        wants_battery BOOLEAN NOT NULL DEFAULT FALSE,
        battery_capacity_kwh DOUBLE PRECISION,
        wants_ev_charger BOOLEAN NOT NULL DEFAULT FALSE,
        fatura_mensal_eur DOUBLE PRECISION NOT NULL DEFAULT 0,
        consumo_mensal_kwh DOUBLE PRECISION,
        perfil_consumo TEXT NOT NULL DEFAULT 'equilibrado',
        objetivo TEXT NOT NULL DEFAULT 'poupar',
        escolha_cliente TEXT NOT NULL DEFAULT 'ainda_nao_sei',
        rede TEXT NOT NULL DEFAULT 'monofasico',
        tipo_telhado TEXT NOT NULL DEFAULT 'telha_lusa',
        panel_preference TEXT NOT NULL DEFAULT 'standard_460',
        telha_lusa_dificil BOOLEAN NOT NULL DEFAULT FALSE,
        tipo_estrutura TEXT NOT NULL DEFAULT 'coplanar',
        distancia_paineis_inversor_m DOUBLE PRECISION NOT NULL DEFAULT 0,
        distancia_inversor_quadro_m DOUBLE PRECISION NOT NULL DEFAULT 0,
        distancia_maceira_km DOUBLE PRECISION NOT NULL DEFAULT 0,
        pretende_ev BOOLEAN NOT NULL DEFAULT FALSE,
        backup TEXT NOT NULL DEFAULT 'sem_backup',
        pretende_bateria BOOLEAN NOT NULL DEFAULT FALSE,
        preferencia_bateria TEXT NOT NULL DEFAULT 'ambas',
        capacidade_bateria_desejada_kwh DOUBLE PRECISION,
        notes TEXT
      );

      ALTER TABLE leads ADD COLUMN IF NOT EXISTS fatura_mensal_eur DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS consumo_mensal_kwh DOUBLE PRECISION;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS perfil_consumo TEXT NOT NULL DEFAULT 'equilibrado';
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS objetivo TEXT NOT NULL DEFAULT 'poupar';
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS escolha_cliente TEXT NOT NULL DEFAULT 'ainda_nao_sei';
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS rede TEXT NOT NULL DEFAULT 'monofasico';
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS tipo_telhado TEXT NOT NULL DEFAULT 'telha_lusa';
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS panel_preference TEXT NOT NULL DEFAULT 'standard_460';
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS telha_lusa_dificil BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS tipo_estrutura TEXT NOT NULL DEFAULT 'coplanar';
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS distancia_paineis_inversor_m DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS distancia_inversor_quadro_m DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS distancia_maceira_km DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS pretende_ev BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS backup TEXT NOT NULL DEFAULT 'sem_backup';
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS pretende_bateria BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferencia_bateria TEXT NOT NULL DEFAULT 'ambas';
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS capacidade_bateria_desejada_kwh DOUBLE PRECISION;

      CREATE TABLE IF NOT EXISTS proposals (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL REFERENCES leads(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        calculation_json JSONB NOT NULL,
        price_net DOUBLE PRECISION NOT NULL,
        vat DOUBLE PRECISION NOT NULL,
        price_gross DOUBLE PRECISION NOT NULL,
        annual_savings DOUBLE PRECISION NOT NULL,
        roi_years DOUBLE PRECISION
      );

      CREATE TABLE IF NOT EXISTS follow_ups (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL REFERENCES leads(id),
        due_at TIMESTAMPTZ NOT NULL,
        reason TEXT NOT NULL,
        completed_at TIMESTAMPTZ
      );
    `));
  }
  await schemaReadyPromise;
}

function toBool(value) {
  return value === true || value === "sim" || value === "on" || value === "true" || value === 1;
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function numberValue(...values) {
  const value = firstValue(...values);
  return value === undefined ? 0 : Number(value || 0);
}

function optionalNumberValue(...values) {
  const value = firstValue(...values);
  return value === undefined ? null : Number(value);
}

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function normalizeRoof(value) {
  if (value === "telha-lusa") return "telha_lusa";
  if (["telha_lusa", "sanduiche", "terreo"].includes(value)) return value;
  return "telha_lusa";
}

function normalizeGrid(value) {
  if (value === "nao-sei") return "nao_sei";
  if (["monofasico", "trifasico", "nao_sei"].includes(value)) return value;
  return "monofasico";
}

function toIso(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapLead(row) {
  if (!row) return null;
  const faturaMensalEur = Number(firstValue(row.monthly_bill_eur, row.monthlyBillEur, row.fatura_mensal_eur, 0));
  const consumoMensalKwh = firstValue(row.monthly_consumption_kwh, row.monthlyConsumptionKwh, row.consumo_mensal_kwh, null);
  const perfilConsumo = enumValue(firstValue(row.consumption_period, row.consumptionPeriod, row.perfil_consumo, row.perfilConsumo, "equilibrado"), ["dia", "noite", "equilibrado"], "equilibrado");
  const objetivo = enumValue(firstValue(row.objetivo, row.objective, "poupar"), ["poupar", "backup", "autonomia", "preparar_EV", "aconselhamento"], "poupar");
  const escolhaCliente = enumValue(firstValue(row.escolha_cliente, row.clientChoice, "ainda_nao_sei"), ["ongrid", "hibrido", "hibrido_backup", "ainda_nao_sei"], "ainda_nao_sei");
  const rede = normalizeGrid(firstValue(row.grid_type, row.gridType, row.rede, "monofasico"));
  const tipoTelhado = normalizeRoof(firstValue(row.roof_type, row.roofType, row.tipo_telhado, row.tipoTelhado, "telha_lusa"));
  const panelPreference = enumValue(firstValue(row.panel_preference, row.panelPreference, "standard_460"), ["standard_460", "large_595"], "standard_460");
  const telhaLusaDificil = false;
  const tipoEstrutura = tipoTelhado === "terreo"
    ? "nao_aplicavel"
    : enumValue(firstValue(row.tipo_estrutura, row.tipoEstrutura, "coplanar"), ["coplanar", "triangular"], "coplanar");
  const distanciaPaineisInversorM = Number(firstValue(row.distance_pv_to_inverter_m, row.distancePvToInverterM, row.distancia_paineis_inversor_m, row.distanciaPaineisInversorM, 0));
  const distanciaInversorQuadroM = Number(firstValue(row.distance_inverter_to_panel_m, row.distanceInverterToPanelM, row.distancia_inversor_quadro_m, row.distanciaInversorQuadroM, 0));
  const distanciaMaceiraKm = Number(firstValue(row.distance_to_maceira_km, row.distanceToMaceiraKm, row.distancia_maceira_km, row.distanciaMaceiraKm, 0));
  const pretendeEV = Boolean(firstValue(row.wants_ev_charger, row.wantsEvCharger, row.pretende_ev, row.pretende_EV, row.pretendeEV, false));
  const pretendeBateria = Boolean(firstValue(row.wants_battery, row.wantsBattery, row.pretende_bateria, row.pretendeBateria, false));
  const capacidadeBateriaDesejadaKwh = firstValue(row.battery_capacity_kwh, row.batteryCapacityKwh, row.capacidade_bateria_desejada_kwh, row.capacidadeBateriaDesejadaKwh, null);

  return {
    id: row.id,
    createdAt: toIso(row.created_at ?? row.createdAt),
    updatedAt: toIso(row.updated_at ?? row.updatedAt),
    status: row.status,
    name: row.name,
    phone: row.phone,
    email: row.email,
    locality: row.locality,
    source: row.source,
    propertyType: row.property_type ?? row.propertyType,
    gridType: rede,
    roofType: tipoTelhado,
    groundFloor: Boolean(row.ground_floor ?? row.groundFloor),
    difficultTile: telhaLusaDificil,
    consumptionPeriod: perfilConsumo,
    monthlyBillEur: faturaMensalEur,
    monthlyConsumptionKwh: consumoMensalKwh,
    distancePvToInverterM: distanciaPaineisInversorM,
    distanceInverterToPanelM: distanciaInversorQuadroM,
    distanceToMaceiraKm: distanciaMaceiraKm,
    wantsBattery: pretendeBateria,
    batteryCapacityKwh: capacidadeBateriaDesejadaKwh,
    wantsEvCharger: pretendeEV,
    fatura_mensal_eur: faturaMensalEur,
    consumo_mensal_kwh: consumoMensalKwh,
    perfil_consumo: perfilConsumo,
    objetivo,
    escolha_cliente: escolhaCliente,
    rede,
    tipo_telhado: tipoTelhado,
    panel_preference: panelPreference,
    panelPreference,
    telha_lusa_dificil: telhaLusaDificil,
    tipo_estrutura: tipoEstrutura,
    distancia_paineis_inversor_m: distanciaPaineisInversorM,
    distancia_inversor_quadro_m: distanciaInversorQuadroM,
    distancia_maceira_km: distanciaMaceiraKm,
    pretende_EV: pretendeEV,
    backup: enumValue(firstValue(row.backup, "sem_backup"), ["sem_backup", "backup_manual", "backup_automatico"], "sem_backup"),
    pretende_bateria: pretendeBateria,
    preferencia_bateria: enumValue(firstValue(row.preferencia_bateria, row.batteryPreference, "ambas"), ["economica", "premium", "ambas"], "ambas"),
    capacidade_bateria_desejada_kwh: capacidadeBateriaDesejadaKwh,
    notes: row.notes
  };
}

function normalizeLeadInput(data) {
  const faturaMensalEur = numberValue(data.fatura_mensal_eur, data.monthlyBillEur);
  const consumoMensalKwh = optionalNumberValue(data.consumo_mensal_kwh, data.monthlyConsumptionKwh);
  if (faturaMensalEur <= 0 && !consumoMensalKwh) {
    throw new Error("Indique pelo menos a fatura mensal ou o consumo mensal em kWh.");
  }

  const perfilConsumo = enumValue(firstValue(data.perfil_consumo, data.consumptionPeriod, "equilibrado"), ["dia", "noite", "equilibrado"], "equilibrado");
  const objetivo = enumValue(firstValue(data.objetivo, data.objective, "poupar"), ["poupar", "backup", "autonomia", "preparar_EV", "aconselhamento"], "poupar");
  const backup = enumValue(firstValue(data.backup, "sem_backup"), ["sem_backup", "backup_manual", "backup_automatico"], "sem_backup");
  const escolhaCliente = enumValue(firstValue(data.escolha_cliente, data.clientChoice, backup !== "sem_backup" ? "hibrido_backup" : "ainda_nao_sei"), ["ongrid", "hibrido", "hibrido_backup", "ainda_nao_sei"], "ainda_nao_sei");
  const rede = normalizeGrid(firstValue(data.rede, data.gridType, "monofasico"));
  const tipoTelhado = normalizeRoof(firstValue(data.tipo_telhado, data.roofType, "telha_lusa"));
  const panelPreference = enumValue(firstValue(data.panel_preference, data.panelPreference, "standard_460"), ["standard_460", "large_595"], "standard_460");
  const telhaLusaDificil = false;
  const tipoEstrutura = tipoTelhado === "terreo"
    ? "nao_aplicavel"
    : enumValue(firstValue(data.tipo_estrutura, data.structureType, "coplanar"), ["coplanar", "triangular"], "coplanar");
  const distanciaPaineisInversorM = numberValue(data.distancia_paineis_inversor_m, data.distancePvToInverterM);
  const distanciaInversorQuadroM = numberValue(data.distancia_inversor_quadro_m, data.distanceInverterToPanelM);
  const distanciaMaceiraKm = numberValue(data.distancia_maceira_km, data.distanceToMaceiraKm);
  const pretendeEV = toBool(firstValue(data.pretende_EV, data.pretende_ev, data.wantsEvCharger));
  const pretendeBateria = toBool(firstValue(data.pretende_bateria, data.wantsBattery));
  const preferenciaBateria = enumValue(firstValue(data.preferencia_bateria, data.batteryPreference, "ambas"), ["economica", "premium", "ambas"], "ambas");
  const capacidadeBateriaDesejadaKwh = optionalNumberValue(data.capacidade_bateria_desejada_kwh, data.batteryCapacityKwh);

  return {
    id: crypto.randomUUID(),
    status: LEAD_STATUSES.includes(data.status) ? data.status : "Novo",
    name: data.name,
    phone: data.phone,
    email: data.email || null,
    locality: data.locality || null,
    source: data.source,
    propertyType: data.propertyType || null,
    gridType: rede,
    roofType: tipoTelhado,
    groundFloor: toBool(data.groundFloor),
    difficultTile: telhaLusaDificil,
    consumptionPeriod: perfilConsumo,
    monthlyBillEur: faturaMensalEur,
    monthlyConsumptionKwh: consumoMensalKwh,
    distancePvToInverterM: distanciaPaineisInversorM,
    distanceInverterToPanelM: distanciaInversorQuadroM,
    distanceToMaceiraKm: distanciaMaceiraKm,
    wantsBattery: pretendeBateria,
    batteryCapacityKwh: capacidadeBateriaDesejadaKwh,
    wantsEvCharger: pretendeEV,
    fatura_mensal_eur: faturaMensalEur,
    consumo_mensal_kwh: consumoMensalKwh,
    perfil_consumo: perfilConsumo,
    objetivo,
    escolha_cliente: escolhaCliente,
    rede,
    tipo_telhado: tipoTelhado,
    panel_preference: panelPreference,
    panelPreference,
    telha_lusa_dificil: telhaLusaDificil,
    tipo_estrutura: tipoEstrutura,
    distancia_paineis_inversor_m: distanciaPaineisInversorM,
    distancia_inversor_quadro_m: distanciaInversorQuadroM,
    distancia_maceira_km: distanciaMaceiraKm,
    pretende_EV: pretendeEV,
    backup,
    pretende_bateria: pretendeBateria,
    preferencia_bateria: preferenciaBateria,
    capacidade_bateria_desejada_kwh: capacidadeBateriaDesejadaKwh,
    notes: data.notes || null
  };
}

async function addFollowUp({ leadId, days, reason }) {
  const dueAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const followUp = {
    id: crypto.randomUUID(),
    leadId,
    dueAt: dueAt.toISOString(),
    reason,
    completedAt: null
  };

  if (!hasDatabase()) {
    memoryStore.followUps.push(followUp);
    return followUp.id;
  }

  await ensureSchema();
  const pool = await getPool();
  await pool.query(
    `INSERT INTO follow_ups (id, lead_id, due_at, reason) VALUES ($1, $2, $3, $4)`,
    [followUp.id, leadId, dueAt, reason]
  );
  return followUp.id;
}

export async function listLeads() {
  if (!hasDatabase()) {
    return [...memoryStore.leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  await ensureSchema();
  const pool = await getPool();
  const result = await pool.query("SELECT * FROM leads ORDER BY created_at DESC");
  return result.rows.map(mapLead);
}

export async function getLead(id) {
  if (!hasDatabase()) {
    return memoryStore.leads.find((lead) => lead.id === id) ?? null;
  }

  await ensureSchema();
  const pool = await getPool();
  const result = await pool.query("SELECT * FROM leads WHERE id = $1", [id]);
  return mapLead(result.rows[0]);
}

export async function createLead(data) {
  const lead = normalizeLeadInput(data);
  const now = new Date().toISOString();

  if (!hasDatabase()) {
    memoryStore.leads.push({ ...lead, createdAt: now, updatedAt: now });
    await addFollowUp({ leadId: lead.id, days: 1, reason: "24h apos contacto sem resposta" });
    return getLead(lead.id);
  }

  await ensureSchema();
  const pool = await getPool();
  await pool.query(
    `INSERT INTO leads (
      id, status, name, phone, email, locality, source, property_type, grid_type, roof_type,
      ground_floor, difficult_tile, consumption_period, monthly_bill_eur, monthly_consumption_kwh,
      distance_pv_to_inverter_m, distance_inverter_to_panel_m, distance_to_maceira_km,
      wants_battery, battery_capacity_kwh, wants_ev_charger,
      fatura_mensal_eur, consumo_mensal_kwh, perfil_consumo, objetivo, escolha_cliente,
      rede, tipo_telhado, panel_preference, telha_lusa_dificil, tipo_estrutura,
      distancia_paineis_inversor_m, distancia_inversor_quadro_m, distancia_maceira_km,
      pretende_ev, backup, pretende_bateria, preferencia_bateria, capacidade_bateria_desejada_kwh,
      notes
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34, $35, $36, $37, $38, $39, $40
    )`,
    [
      lead.id, lead.status, lead.name, lead.phone, lead.email, lead.locality, lead.source,
      lead.propertyType, lead.gridType, lead.roofType, lead.groundFloor, lead.difficultTile,
      lead.consumptionPeriod, lead.monthlyBillEur, lead.monthlyConsumptionKwh,
      lead.distancePvToInverterM, lead.distanceInverterToPanelM, lead.distanceToMaceiraKm,
      lead.wantsBattery, lead.batteryCapacityKwh, lead.wantsEvCharger,
      lead.fatura_mensal_eur, lead.consumo_mensal_kwh, lead.perfil_consumo, lead.objetivo,
      lead.escolha_cliente, lead.rede, lead.tipo_telhado, lead.panel_preference,
      lead.telha_lusa_dificil, lead.tipo_estrutura, lead.distancia_paineis_inversor_m, lead.distancia_inversor_quadro_m,
      lead.distancia_maceira_km, lead.pretende_EV, lead.backup, lead.pretende_bateria,
      lead.preferencia_bateria, lead.capacidade_bateria_desejada_kwh, lead.notes
    ]
  );

  await addFollowUp({ leadId: lead.id, days: 1, reason: "24h apos contacto sem resposta" });
  return getLead(lead.id);
}

export async function saveProposal({ leadId, calculation }) {
  const id = crypto.randomUUID();

  if (!hasDatabase()) {
    memoryStore.proposals.push({
      id,
      leadId,
      createdAt: new Date().toISOString(),
      calculation,
      priceNet: calculation.price.net,
      vat: calculation.price.vat,
      priceGross: calculation.price.gross,
      annualSavings: calculation.roi.annualSavingsEur,
      roiYears: calculation.roi.roiYears
    });
    const lead = memoryStore.leads.find((item) => item.id === leadId);
    if (lead) {
      lead.status = "Pre-orcamento enviado";
      lead.updatedAt = new Date().toISOString();
    }
    await addFollowUp({ leadId, days: 3, reason: "3 dias apos proposta enviada" });
    await addFollowUp({ leadId, days: 7, reason: "7 dias apos proposta enviada" });
    return id;
  }

  await ensureSchema();
  const pool = await getPool();
  await pool.query(
    `INSERT INTO proposals (id, lead_id, calculation_json, price_net, vat, price_gross, annual_savings, roi_years)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      leadId,
      JSON.stringify(calculation),
      calculation.price.net,
      calculation.price.vat,
      calculation.price.gross,
      calculation.roi.annualSavingsEur,
      calculation.roi.roiYears
    ]
  );
  await pool.query(
    "UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2",
    ["Pre-orcamento enviado", leadId]
  );
  await addFollowUp({ leadId, days: 3, reason: "3 dias apos proposta enviada" });
  await addFollowUp({ leadId, days: 7, reason: "7 dias apos proposta enviada" });
  return id;
}

export async function listFollowUps(leadId) {
  if (!hasDatabase()) {
    return memoryStore.followUps
      .filter((followUp) => followUp.leadId === leadId)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }

  await ensureSchema();
  const pool = await getPool();
  const result = await pool.query(
    `SELECT id, lead_id AS "leadId", due_at AS "dueAt", reason, completed_at AS "completedAt"
     FROM follow_ups
     WHERE lead_id = $1
     ORDER BY due_at ASC`,
    [leadId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    leadId: row.leadId,
    dueAt: toIso(row.dueAt),
    reason: row.reason,
    completedAt: toIso(row.completedAt)
  }));
}
