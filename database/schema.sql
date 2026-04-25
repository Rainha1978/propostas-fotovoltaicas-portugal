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
