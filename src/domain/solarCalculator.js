import { PRICE_CALIBRATION, PRICE_DATABASE } from "./priceCalibration.js";

export const ENERGY_PRICE_EUR_PER_KWH = 0.2;
export const BILLING_ENERGY_PRICE_EUR_PER_KWH_EX_VAT = 0.15;
export const ESTIMATED_FIXED_COSTS_EUR_EX_VAT = 20;
export const ANNUAL_PRODUCTION_KWH_PER_KWP = 1500;
export const VAT_RATE = PRICE_DATABASE.vat.rate;

export const LEAD_STATUSES = [
  "Novo",
  "Qualificado",
  "Pre-orcamento enviado",
  "Aguardando resposta",
  "Visita agendada",
  "Fechado",
  "Perdido"
];

const NIGHT_CONSUMPTION_RATIO = {
  dia: 0.3,
  equilibrado: 0.5,
  noite: 0.7
};

const ON_GRID_SELF_CONSUMPTION_RATE = {
  dia: 0.45,
  equilibrado: 0.35,
  noite: 0.25
};

const SIZING_PANEL_TIERS = [
  { maxKwh: 250, basePanelCount: 5 },
  { maxKwh: 350, basePanelCount: 6 },
  { maxKwh: 450, basePanelCount: 7 },
  { maxKwh: 550, basePanelCount: 8 },
  { maxKwh: 650, basePanelCount: 9 },
  { maxKwh: 750, basePanelCount: 10 },
  { maxKwh: 850, basePanelCount: 11 },
  { maxKwh: 950, basePanelCount: 12 },
  { maxKwh: 1050, basePanelCount: 13 },
  { maxKwh: 1150, basePanelCount: 14 }
];

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function roundOne(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 10) / 10;
}

function roundTwo(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function normalizeBoolean(value) {
  return value === true || value === "sim" || value === "on" || value === "true" || value === 1;
}

function numberOrZero(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function normalizeProfile(input) {
  const value = input.perfil_consumo ?? input.perfilConsumo ?? input.consumptionPeriod ?? "equilibrado";
  return ["dia", "noite", "equilibrado"].includes(value) ? value : "equilibrado";
}

function normalizeObjective(input) {
  const value = input.objetivo ?? input.objective ?? null;
  if (["poupar", "backup", "autonomia", "preparar_EV", "aconselhamento"].includes(value)) return value;
  if (normalizeBoolean(input.wantsEvCharger) || normalizeBoolean(input.pretende_EV)) return "preparar_EV";
  if (normalizeBoolean(input.wantsBattery) || normalizeBoolean(input.pretende_bateria)) return "autonomia";
  return "poupar";
}

function normalizeGridType(input) {
  const value = input.rede ?? input.gridType ?? "monofasico";
  if (value === "trifasico") return "trifasico";
  if (value === "nao_sei" || value === "nao-sei") return "nao_sei";
  return "monofasico";
}

function normalizeRoofType(input) {
  const value = input.tipo_telhado ?? input.roofType ?? "telha_lusa";
  if (value === "telha-lusa") return "telha_lusa";
  if (["telha_lusa", "sanduiche", "terreo"].includes(value)) return value;
  return "telha_lusa";
}

function normalizeStructureType(input) {
  const value = input.tipo_estrutura ?? input.structureType ?? input.roofType ?? "coplanar";
  if (value === "triangular") return "triangular";
  return "coplanar";
}

function normalizeSystemChoice(input) {
  if (input.forceMode === "on-grid") return "ongrid";
  if (input.forceMode === "hibrido") return "hibrido";

  const value = input.escolha_cliente ?? input.clientChoice ?? input.systemChoice ?? "ainda_nao_sei";
  if (value === "on-grid") return "ongrid";
  if (["ongrid", "hibrido", "hibrido_backup", "ainda_nao_sei"].includes(value)) return value;
  return "ainda_nao_sei";
}

function legacyMode(system) {
  return system === "ongrid" ? "on-grid" : system;
}

function pairsForPanels(panelCount) {
  return Math.ceil(panelCount / 2);
}

function getInverterPrice(inverter) {
  if (!inverter) return null;
  const manualPrice = inverter.manualPrice ?? inverter.preco_manual;
  if (manualPrice != null && Number.isFinite(Number(manualPrice))) return Number(manualPrice);
  return inverter.tablePrice ?? inverter.preco_tabela;
}

function hasConfirmedPrice(value) {
  return value != null && Number.isFinite(Number(value));
}

function chooseByLimit(items, targetKwp) {
  return items.find((item) => targetKwp <= item.limitKwp) ?? items.at(-1);
}

function getTechnicalFlags({ inverter, structure, electrical, extras, batterySelection }) {
  const flags = [];
  if (inverter.status === "a_confirmar" || !hasConfirmedPrice(inverter.price)) {
    flags.push({
      type: "a_confirmar",
      area: "inversor",
      message: `Preco do inversor ${inverter.label} a confirmar.`
    });
  }
  if (structure.status === "visita_tecnica") {
    flags.push({
      type: "visita_tecnica",
      area: "estrutura",
      message: structure.notes[0] ?? "Estrutura sujeita a visita tecnica."
    });
  }
  for (const note of [...electrical.notes, ...extras.notes, ...batterySelection.notes]) {
    const lower = note.toLowerCase();
    flags.push({
      type: lower.includes("analise tecnica") ? "analise_tecnica" : lower.includes("visita tecnica") ? "visita_tecnica" : "nota",
      area: "calculo",
      message: note
    });
  }
  return flags;
}

export function calcularConsumo(input) {
  const monthlyConsumptionInput = input.consumo_mensal_kwh ?? input.monthlyConsumptionKwh;
  const monthlyBillInput = input.fatura_mensal_eur ?? input.monthlyBillEur;
  const notes = [];
  const hasConsumptionInput = numberOrZero(monthlyConsumptionInput) > 0;
  const hasBillInput = numberOrZero(monthlyBillInput) > 0;
  const billExVat = numberOrZero(monthlyBillInput) / (1 + VAT_RATE);
  const energyValueExVat = Math.max(0, billExVat - ESTIMATED_FIXED_COSTS_EUR_EX_VAT);
  const monthlyConsumptionKwh = hasConsumptionInput
    ? numberOrZero(monthlyConsumptionInput)
    : energyValueExVat / BILLING_ENERGY_PRICE_EUR_PER_KWH_EX_VAT;
  const monthlyBillEur = numberOrZero(monthlyBillInput) > 0
    ? numberOrZero(monthlyBillInput)
    : monthlyConsumptionKwh * ENERGY_PRICE_EUR_PER_KWH;

  if (!hasConsumptionInput && hasBillInput) {
    notes.push("Consumo estimado a partir da fatura mensal, removendo IVA e custos fixos tipicos de potencia e taxas.");
  }

  return {
    monthlyConsumptionKwh: roundOne(monthlyConsumptionKwh),
    monthlyBillEur: roundMoney(monthlyBillEur),
    annualConsumptionKwh: roundOne(monthlyConsumptionKwh * 12),
    annualCurrentCostEur: roundMoney(monthlyBillEur * 12),
    energyPriceEurPerKwh: ENERGY_PRICE_EUR_PER_KWH,
    billingEnergyPriceEurPerKwhExVat: BILLING_ENERGY_PRICE_EUR_PER_KWH_EX_VAT,
    estimatedFixedCostsEurExVat: ESTIMATED_FIXED_COSTS_EUR_EX_VAT,
    notes
  };
}

export function estimateMonthlyConsumptionKwh({ monthlyBillEur, monthlyConsumptionKwh, fatura_mensal_eur, consumo_mensal_kwh }) {
  return calcularConsumo({ monthlyBillEur, monthlyConsumptionKwh, fatura_mensal_eur, consumo_mensal_kwh }).monthlyConsumptionKwh;
}

export function dimensionarSistema(input) {
  const monthlyConsumptionKwh = numberOrZero(input.monthlyConsumptionKwh ?? input.consumo_mensal_kwh);
  const objective = input.objective ?? input.objetivo ?? "poupar";
  const profile = normalizeProfile(input);
  const theoreticalKwp = monthlyConsumptionKwh * 12 / ANNUAL_PRODUCTION_KWH_PER_KWP;
  const tierIndex = SIZING_PANEL_TIERS.findIndex((tier) => monthlyConsumptionKwh <= tier.maxKwh);
  const tier = tierIndex >= 0 ? SIZING_PANEL_TIERS[tierIndex] : SIZING_PANEL_TIERS.at(-1);
  const sizingStep = tierIndex >= 0 ? tierIndex + 1 : SIZING_PANEL_TIERS.length;
  const adjustmentPercent = sizingStep + 9;
  const profileFactor = profile === "dia"
    ? 1 + adjustmentPercent / 100
    : profile === "noite"
      ? 1 - adjustmentPercent / 100
      : 1;
  const basePanelCount = tier.basePanelCount;
  const adjustedPanelCount = Math.max(5, Math.round(basePanelCount * profileFactor));
  const targetKwp = roundTwo(adjustedPanelCount * PRICE_DATABASE.panels.standard460w.powerW / 1000);
  const needsTechnicalAnalysis = tierIndex < 0;

  const notes = [];
  if (needsTechnicalAnalysis) notes.push("Consumo acima de 1150kWh/mes: validar potencia final em analise tecnica.");
  if (objective === "poupar" && targetKwp > theoreticalKwp * 1.35) {
    notes.push("Dimensionamento limitado por ROI: evitar sobredimensionamento sem consumo futuro confirmado.");
  }
  if (["backup", "autonomia", "preparar_EV"].includes(objective)) {
    notes.push("Pode fazer sentido prever expansao futura por autonomia, backup ou EV.");
  }

  return {
    targetKwp,
    theoreticalKwp: roundTwo(theoreticalKwp),
    profile,
    sizingStep,
    basePanelCount,
    adjustedPanelCount,
    needsTechnicalAnalysis,
    notes
  };
}

export function dimensionSystem(monthlyConsumptionKwh, profile = "equilibrado") {
  const sizing = dimensionarSistema({ monthlyConsumptionKwh, perfilConsumo: profile });
  return {
    targetKwp: sizing.targetKwp,
    basePanelCount: sizing.basePanelCount,
    adjustedPanelCount: sizing.adjustedPanelCount,
    needsTechnicalAnalysis: sizing.needsTechnicalAnalysis
  };
}

export function escolherPainel(input) {
  const roofType = normalizeRoofType(input);
  const panelPreference = input.panel_preference ?? input.panelPreference ?? "standard_460";
  const canUseLargePanel = panelPreference === "large_595" && (roofType === "sanduiche" || roofType === "terreo");
  const panel = canUseLargePanel ? PRICE_DATABASE.panels.large595w : PRICE_DATABASE.panels.standard460w;

  return {
    powerW: panel.powerW,
    unitPrice: panel.unitPrice,
    label: panel.label,
    sourceKey: canUseLargePanel ? "large595w" : "standard460w",
    preference: canUseLargePanel ? "large_595" : "standard_460",
    notes: [
      canUseLargePanel
        ? "Painel 595W usado por escolha explicita/validacao tecnica."
        : "Painel 460W usado por defeito. Painel 595W disponivel para telhado sanduiche ou instalacao terrea quando escolhido/validado tecnicamente.",
      panelPreference === "large_595" && roofType === "telha_lusa"
        ? "Telha lusa usa sempre painel 460W; pedido de 595W ignorado por regra tecnica."
        : null
    ].filter(Boolean)
  };
}

export function choosePanel(input) {
  return escolherPainel(input);
}

export function escolherSistema(input) {
  const objective = normalizeObjective(input);
  const profile = normalizeProfile(input);
  const choice = normalizeSystemChoice(input);
  const wantsBattery = normalizeBoolean(input.wantsBattery) || normalizeBoolean(input.pretende_bateria);
  const backup = input.backup ?? "sem_backup";
  const notes = [];
  let system = "ongrid";
  let alternatives = [];
  let source = "aconselhamento";

  if (choice !== "ainda_nao_sei") {
    system = choice;
    source = "cliente";
    notes.push("Solucao escolhida pelo cliente respeitada; alternativas podem ser mostradas apenas para comparacao.");
  } else if (objective === "backup" || backup !== "sem_backup") {
    system = "hibrido_backup";
    alternatives = ["hibrido", "ongrid"];
  } else if (objective === "autonomia" || wantsBattery || profile === "noite") {
    system = "hibrido";
    alternatives = ["ongrid"];
  } else if (objective === "preparar_EV") {
    system = "ongrid";
    alternatives = ["hibrido"];
    notes.push("Solucao preparada para EV: comparar on-grid preparado com hibrido.");
  } else if (profile === "dia") {
    system = "ongrid";
    alternatives = ["hibrido"];
  } else if (profile === "equilibrado") {
    system = "ongrid";
    alternatives = ["hibrido"];
    notes.push("Perfil equilibrado: comparar on-grid e hibrido antes da decisao final.");
  }

  if (wantsBattery && system === "ongrid") {
    alternatives = [...new Set(["hibrido", ...alternatives])];
    notes.push("Cliente indicou interesse em bateria; manter hibrido como alternativa de comparacao.");
  }

  return {
    system,
    mode: legacyMode(system),
    source,
    objective,
    profile,
    alternatives,
    notes
  };
}

export function estimarConsumoNoturno(input) {
  const profile = normalizeProfile(input);
  const monthlyConsumptionKwh = numberOrZero(input.monthlyConsumptionKwh ?? input.consumo_mensal_kwh);
  const nightRatio = NIGHT_CONSUMPTION_RATIO[profile] ?? NIGHT_CONSUMPTION_RATIO.equilibrado;
  const nightDailyKwh = monthlyConsumptionKwh * nightRatio / 30;

  return {
    profile,
    nightRatio,
    nightDailyKwh: roundTwo(nightDailyKwh),
    monthlyNightConsumptionKwh: roundOne(monthlyConsumptionKwh * nightRatio)
  };
}

function chooseGoodWeLvCapacity(targetKwh) {
  const options = PRICE_DATABASE.batteries.goodweLynxUG3.typicalCapacitiesKwh;
  return options.find((capacity) => capacity >= targetKwh) ?? options.at(-1);
}

function chooseGslLvCapacity(targetKwh) {
  const options = PRICE_DATABASE.batteries.gslLv16.typicalCapacitiesKwh;
  return options.find((capacity) => capacity >= targetKwh) ?? options.at(-1);
}

function chooseGslHvCapacity(targetKwh) {
  const battery = PRICE_DATABASE.batteries.gslHv;
  const modules = Math.max(2, Math.ceil(targetKwh / battery.capacityPerModuleKwh));
  const capacityKwh = Math.min(battery.maxCapacityKwh, modules * battery.capacityPerModuleKwh);
  return { modules: capacityKwh / battery.capacityPerModuleKwh, capacityKwh };
}

function chooseBydHvsCapacity(targetKwh) {
  const battery = PRICE_DATABASE.batteries.bydHvs;
  const modules = Math.max(4, Math.ceil(targetKwh / battery.capacityPerModuleKwh));
  return {
    modules,
    capacityKwh: roundTwo(modules * battery.capacityPerModuleKwh)
  };
}

export function escolherBaterias(input) {
  const gridType = normalizeGridType(input);
  const preference = input.preferencia_bateria ?? input.batteryPreference ?? "ambas";
  const requested = numberOrZero(input.capacidade_bateria_desejada_kwh ?? input.batteryCapacityKwh);
  const night = estimarConsumoNoturno(input);
  const targetKwh = requested > 0 ? requested : night.nightDailyKwh;
  const options = [];

  if (gridType === "trifasico") {
    const premiumCapacity = chooseBydHvsCapacity(Math.max(10, targetKwh));
    const premium = PRICE_DATABASE.batteries.bydHvs;
    options.push({
      key: "premium",
      label: `GoodWe trifasico + BYD HVS ${premiumCapacity.capacityKwh}kWh`,
      brand: "GoodWe/BYD",
      model: "GoodWe trifasico + BYD HVS",
      type: "HV",
      positioning: "premium",
      capacityKwh: premiumCapacity.capacityKwh,
      modules: premiumCapacity.modules,
      equipmentCost: roundMoney(premium.baseAndBcuPrice + premiumCapacity.modules * premium.modulePrice),
      laborMode: "hv-system"
    });

    const economicCapacity = chooseGslHvCapacity(Math.max(10, targetKwh));
    const economic = PRICE_DATABASE.batteries.gslHv;
    options.push({
      key: "economica",
      label: `DEYE + GSL HV ${economicCapacity.capacityKwh}kWh`,
      brand: "DEYE/GSL",
      model: "DEYE + GSL HV",
      type: "HV",
      positioning: "economica",
      capacityKwh: economicCapacity.capacityKwh,
      modules: economicCapacity.modules,
      equipmentCost: roundMoney(economic.baseAndBmsPrice + economicCapacity.modules * economic.modulePrice),
      laborMode: "hv-system"
    });
  } else {
    const goodweCapacity = chooseGoodWeLvCapacity(Math.max(5.12, targetKwh));
    const goodwe = PRICE_DATABASE.batteries.goodweLynxUG3;
    const goodweUnits = Math.round(goodweCapacity / goodwe.capacityPerUnitKwh);
    options.push({
      key: "premium",
      label: `${goodwe.model} ${goodweCapacity}kWh`,
      brand: goodwe.brand,
      model: goodwe.model,
      type: "LV",
      positioning: goodwe.positioning,
      capacityKwh: goodweCapacity,
      count: goodweUnits,
      equipmentCost: roundMoney(goodweUnits * goodwe.unitPrice),
      laborMode: "lv-per-battery"
    });

    const gslCapacity = chooseGslLvCapacity(Math.max(16, targetKwh));
    const gsl = PRICE_DATABASE.batteries.gslLv16;
    const gslUnits = Math.ceil(gslCapacity / gsl.capacityPerUnitKwh);
    options.push({
      key: "economica",
      label: `${gsl.model} ${gslCapacity}kWh`,
      brand: gsl.brand,
      model: gsl.model,
      type: "LV",
      positioning: gsl.positioning,
      capacityKwh: gslCapacity,
      count: gslUnits,
      equipmentCost: roundMoney(gslUnits * gsl.unitPrice),
      laborMode: "lv-per-battery"
    });
  }

  let selected = options.find((option) => option.key === preference);
  if (!selected) {
    selected = preference === "premium"
      ? options.find((option) => option.key === "premium")
      : preference === "economica"
        ? options.find((option) => option.key === "economica")
        : options.find((option) => option.key === "premium") ?? options[0];
  }

  const notes = [];
  if (selected && selected.capacityKwh < night.nightDailyKwh) {
    notes.push("A bateria proposta nao cobre todo o consumo noturno diario estimado.");
  }

  return {
    selected,
    options,
    targetKwh: roundTwo(targetKwh),
    night,
    notes
  };
}

export function escolherInversor(input) {
  const gridType = normalizeGridType(input);
  const system = input.system ?? input.sistema ?? "ongrid";
  const targetKwp = numberOrZero(input.targetKwp);
  const batteryOption = input.batteryOption;
  const phase = gridType === "trifasico" ? "trifasico" : "monofasico";
  const notes = [];

  if (phase === "trifasico" && system !== "ongrid") {
    if (batteryOption?.key === "economica") {
      const inverter = PRICE_DATABASE.inverters.deye[0];
      return {
        label: inverter.model,
        brand: inverter.brand,
        model: inverter.model,
        price: getInverterPrice(inverter),
        powerKw: inverter.powerKw,
        phase,
        mode: "hibrido",
        type: "hibrido",
        status: inverter.status ?? "ok",
        alternatives: ["GoodWe trifasico premium + BYD/GoodWe compativel"],
        notes: ["Opcao economica trifasica: DEYE + GSL HV."]
      };
    }

    const inverter = chooseByLimit(
      PRICE_DATABASE.inverters.goodwe.filter((item) => item.phase === "trifasico" && item.type === "hibrido"),
      targetKwp
    );
    return {
      label: inverter.model,
      brand: inverter.brand,
      model: inverter.model,
      price: getInverterPrice(inverter) ?? 0,
      powerKw: inverter.powerKw,
      phase,
      mode: "hibrido",
      type: "hibrido",
      status: inverter.status ?? "ok",
      alternatives: ["DEYE + GSL HV economica"],
      notes: []
    };
  }

  if (phase === "trifasico") {
    const inverter = chooseByLimit(
      PRICE_DATABASE.inverters.goodwe.filter((item) => item.phase === "trifasico" && item.type === "ongrid"),
      targetKwp
    );
    return {
      label: inverter.model,
      brand: inverter.brand,
      model: inverter.model,
      price: getInverterPrice(inverter) ?? 0,
      powerKw: inverter.powerKw,
      phase,
      mode: "on-grid",
      type: "ongrid",
      status: inverter.status ?? "ok",
      alternatives: [],
      notes: []
    };
  }

  const type = system === "ongrid" ? "ongrid" : "hibrido";
  const list = PRICE_DATABASE.inverters.goodwe.filter((item) => item.phase === "monofasico" && item.type === type);
  const inverter = chooseByLimit(list, targetKwp);
  if (!inverter) notes.push("Inversor nao encontrado na tabela.");

  return {
    label: inverter ? `${inverter.brand} ${type === "ongrid" ? "monofasico on-grid" : "monofasico hibrido"} ${inverter.powerKw}kW` : "Inversor a confirmar",
    brand: inverter?.brand ?? null,
    model: inverter?.model ?? "a_confirmar",
    price: getInverterPrice(inverter) ?? 0,
    powerKw: inverter?.powerKw ?? null,
    phase,
    mode: type === "ongrid" ? "on-grid" : "hibrido",
    type,
    status: inverter?.status ?? "ok",
    alternatives: [],
    notes
  };
}

function buildCosts({ panelCount, panel, inverter, batteryOption, structure, labor, electrical, extras }) {
  return {
    panels: roundMoney(panelCount * panel.unitPrice),
    inverter: roundMoney(hasConfirmedPrice(inverter.price) ? inverter.price : 0),
    battery: roundMoney(batteryOption?.equipmentCost ?? 0),
    structure: structure.amount,
    labor: labor.base + labor.difficultTileExtra,
    batteryLabor: labor.batteryExtra,
    baseProtections: electrical.baseProtections,
    hybridProtections: electrical.hybridProtections,
    backupManual: electrical.backupManualExtra,
    dcCables: electrical.dcCables,
    acCables: electrical.acCables,
    connectors: electrical.connectors,
    realTimeMeter: extras.realTimeMeter,
    travel: extras.travel,
    evCharger: extras.evCharger,
    evProtections: extras.evProtections,
    installationExtras: 0
  };
}

function sumCosts(costs) {
  return roundMoney(Object.values(costs).reduce((total, value) => total + numberOrZero(value), 0));
}

function buildPricedOption({ key, label, input, panel, panelCount, gridType, system, sizing, structure, electrical, consumption, profile, batteryOption }) {
  const inverter = escolherInversor({
    ...input,
    gridType,
    system,
    targetKwp: sizing.targetKwp,
    batteryOption
  });
  const optionExtras = calcularExtras({
    ...input,
    inverterPowerKw: inverter.powerKw ?? 0
  });
  const labor = calcularMaoObra({ ...input, panelCount, batteryOption });
  const costs = buildCosts({ panelCount, panel, inverter, batteryOption, structure, labor, electrical, extras: optionExtras });
  const net = sumCosts(costs);
  const vat = roundMoney(net * VAT_RATE);
  const gross = roundMoney(net + vat);
  const flags = getTechnicalFlags({
    inverter,
    structure,
    electrical,
    extras: optionExtras,
    batterySelection: { notes: batteryOption?.notes ?? [] }
  });
  const roi = calcularROI({
    system,
    profile,
    annualConsumptionKwh: consumption.annualConsumptionKwh,
    annualProductionKwh: panelCount * panel.powerW / 1000 * ANNUAL_PRODUCTION_KWH_PER_KWP,
    batteryCapacityKwh: batteryOption?.capacityKwh ?? 0,
    totalGross: gross,
    uncertain: flags.length > 0
  });

  return {
    key,
    label,
    inverter,
    battery: batteryOption,
    costs,
    price: { net, vat, gross },
    roi,
    flags,
    confirmedPrice: flags.every((flag) => flag.type === "nota")
  };
}

export function calcularEstrutura(input) {
  const panelCount = numberOrZero(input.panelCount);
  const roofType = normalizeRoofType(input);
  const structureType = normalizeStructureType(input);

  if (roofType === "terreo") {
    return {
      amount: 0,
      status: "visita_tecnica",
      label: "Estrutura terreo sujeita a visita tecnica",
      notes: [PRICE_DATABASE.structures.groundMount.note]
    };
  }

  const perPair = structureType === "triangular"
    ? PRICE_DATABASE.structures.triangularPerTwoPanels
    : PRICE_DATABASE.structures.coplanarPerTwoPanels;
  return {
    amount: roundMoney(pairsForPanels(panelCount) * perPair),
    status: "ok",
    label: structureType === "triangular" ? "Estrutura triangular" : "Estrutura coplanar",
    notes: []
  };
}

export function calcularMaoObra(input) {
  const panelCount = numberOrZero(input.panelCount);
  const roofType = normalizeRoofType(input);
  const difficultTile = normalizeBoolean(input.difficultTile) || normalizeBoolean(input.telha_lusa_dificil);
  const batteryOption = input.batteryOption;
  const tier = PRICE_DATABASE.labor.byPanelCount.find((item) => panelCount <= item.maxPanels);
  const base = tier
    ? tier.price
    : PRICE_DATABASE.labor.aboveTwelve.basePrice
      + pairsForPanels(panelCount - 12) * PRICE_DATABASE.labor.aboveTwelve.extraPerTwoPanels;
  const difficultExtra = roofType === "telha_lusa" && difficultTile
    ? pairsForPanels(panelCount) * PRICE_DATABASE.labor.difficultTileExtraPerTwoPanels
    : 0;
  const batteryExtra = !batteryOption
    ? 0
    : batteryOption.laborMode === "hv-system"
      ? PRICE_DATABASE.labor.hybridHvExtraPerSystem
      : numberOrZero(batteryOption.count || 1) * PRICE_DATABASE.labor.hybridLvExtraPerBattery;

  return {
    base: roundMoney(base),
    difficultTileExtra: roundMoney(difficultExtra),
    batteryExtra: roundMoney(batteryExtra),
    amount: roundMoney(base + difficultExtra + batteryExtra)
  };
}

export function calcularEletrica(input) {
  const panelCount = numberOrZero(input.panelCount);
  const gridType = normalizeGridType(input);
  const phase = gridType === "trifasico" ? "trifasico" : "monofasico";
  const system = input.system ?? "ongrid";
  const backup = input.backup ?? "sem_backup";
  const table = PRICE_DATABASE.electrical[phase];
  const stringsRule = PRICE_DATABASE.electrical.strings.find((item) => panelCount <= item.maxPanels);
  const strings = stringsRule?.strings ?? 0;
  const notes = [];

  if (stringsRule?.status === "analise_tecnica") notes.push("Mais de 24 paineis: strings sujeitas a analise tecnica.");
  if (backup === "backup_automatico") notes.push("Backup automatico necessita visita tecnica.");

  const dcCables = numberOrZero(input.distancePvToInverterM ?? input.distancia_paineis_inversor_m)
    * strings
    * PRICE_DATABASE.electrical.cables.dcPerMeter;
  const acCables = numberOrZero(input.distanceInverterToPanelM ?? input.distancia_inversor_quadro_m)
    * (phase === "trifasico" ? PRICE_DATABASE.electrical.cables.acTriPerMeter : PRICE_DATABASE.electrical.cables.acMonoPerMeter);
  const hybridExtra = system === "hibrido" || system === "hibrido_backup" ? table.hybridProtectionsExtra : 0;
  const backupManualExtra = backup === "backup_manual" ? table.backupManualExtra : 0;
  const connectors = strings * PRICE_DATABASE.electrical.connectorsPerString;

  return {
    phase,
    strings,
    baseProtections: roundMoney(table.baseProtections),
    hybridProtections: roundMoney(hybridExtra),
    backupManualExtra: roundMoney(backupManualExtra),
    dcCables: roundMoney(dcCables),
    acCables: roundMoney(acCables),
    connectors: roundMoney(connectors),
    amount: roundMoney(table.baseProtections + hybridExtra + backupManualExtra + dcCables + acCables + connectors),
    notes
  };
}

export function calcularExtras(input) {
  const inverterPowerKw = numberOrZero(input.inverterPowerKw);
  const wantsEv = normalizeBoolean(input.wantsEvCharger) || normalizeBoolean(input.pretende_EV);
  const backup = input.backup ?? "sem_backup";
  const realTimeMeter = inverterPowerKw > 4 ? PRICE_DATABASE.extras.realTimeMeter : 0;
  const evCharger = wantsEv ? PRICE_DATABASE.extras.evCharger : 0;
  const evProtections = wantsEv ? PRICE_DATABASE.extras.evProtection : 0;
  const travel = numberOrZero(input.distanceToMaceiraKm ?? input.distancia_maceira_km) * PRICE_DATABASE.extras.travelPerKmFromMaceira;
  const notes = backup === "backup_automatico" ? ["Backup automatico necessita visita tecnica; preco fechado nao calculado."] : [];

  return {
    realTimeMeter: roundMoney(realTimeMeter),
    evCharger: roundMoney(evCharger),
    evProtections: roundMoney(evProtections),
    travel: roundMoney(travel),
    amount: roundMoney(realTimeMeter + evCharger + evProtections + travel),
    notes
  };
}

export function calcularROI(input) {
  const system = input.system ?? "ongrid";
  const profile = input.profile ?? "equilibrado";
  const annualConsumptionKwh = numberOrZero(input.annualConsumptionKwh);
  const annualProductionKwh = numberOrZero(input.annualProductionKwh);
  const batteryCapacityKwh = numberOrZero(input.batteryCapacityKwh);
  const nightRatio = NIGHT_CONSUMPTION_RATIO[profile] ?? NIGHT_CONSUMPTION_RATIO.equilibrado;
  const onGridRate = ON_GRID_SELF_CONSUMPTION_RATE[profile] ?? ON_GRID_SELF_CONSUMPTION_RATE.equilibrado;
  let directSelfConsumptionKwh = 0;
  let batteryUsefulKwh = 0;
  let totalUsedEnergyKwh = 0;

  if (system === "ongrid") {
    totalUsedEnergyKwh = annualProductionKwh * onGridRate;
    directSelfConsumptionKwh = totalUsedEnergyKwh;
  } else {
    const daytimeConsumptionKwh = annualConsumptionKwh * (1 - nightRatio);
    directSelfConsumptionKwh = Math.min(annualProductionKwh, daytimeConsumptionKwh);
    const solarSurplusKwh = Math.max(0, annualProductionKwh - directSelfConsumptionKwh);
    const nightConsumptionKwh = annualConsumptionKwh * nightRatio;
    const batteryYearLimitKwh = batteryCapacityKwh * 330;
    batteryUsefulKwh = Math.min(solarSurplusKwh, nightConsumptionKwh, batteryYearLimitKwh) * 0.9;
    totalUsedEnergyKwh = directSelfConsumptionKwh + batteryUsefulKwh;
  }

  const annualSavingsEur = totalUsedEnergyKwh * ENERGY_PRICE_EUR_PER_KWH;
  const roiYears = annualSavingsEur > 0 ? numberOrZero(input.totalGross) / annualSavingsEur : null;
  const uncertain = normalizeBoolean(input.uncertain);
  const roiYearsRounded = roiYears ? roundOne(roiYears) : null;

  return {
    annualConsumptionKwh: roundOne(annualConsumptionKwh),
    annualProductionKwh: roundOne(annualProductionKwh),
    directSelfConsumptionKwh: roundOne(directSelfConsumptionKwh),
    batteryUsefulKwh: roundOne(batteryUsefulKwh),
    totalUsedEnergyKwh: roundOne(totalUsedEnergyKwh),
    selfConsumptionRate: annualProductionKwh > 0 ? roundTwo(totalUsedEnergyKwh / annualProductionKwh) : 0,
    annualSavingsEur: roundMoney(annualSavingsEur),
    monthlySavingsEur: roundMoney(annualSavingsEur / 12),
    roiYears: roiYearsRounded,
    roiRangeYears: roiYearsRounded ? {
      min: roundOne(roiYearsRounded * 0.9),
      max: roundOne(roiYearsRounded * 1.15)
    } : null,
    status: uncertain ? "incerto" : "estimado",
    notes: uncertain ? ["ROI indicativo: existem valores a confirmar, visita tecnica ou analise tecnica."] : []
  };
}

function buildPriceBreakdown(costs, vat) {
  const sections = [
    {
      key: "equipment",
      label: "Equipamento",
      items: [
        { label: "Paineis fotovoltaicos", amount: costs.panels },
        { label: "Inversor", amount: costs.inverter }
      ]
    },
    {
      key: "labor",
      label: "Mao de obra",
      items: [
        { label: "Instalacao FV e inversor", amount: costs.labor }
      ]
    },
    {
      key: "electricalProtections",
      label: "Eletrica/protecoes",
      items: [
        { label: "Protecoes base", amount: costs.baseProtections },
        { label: "Protecoes hibridas", amount: costs.hybridProtections },
        { label: "Backup manual", amount: costs.backupManual },
        { label: "Cabo DC", amount: costs.dcCables },
        { label: "Cabo AC", amount: costs.acCables },
        { label: "Conectores", amount: costs.connectors }
      ]
    },
    {
      key: "extras",
      label: "Extras",
      items: [
        { label: "Estrutura de fixacao", amount: costs.structure },
        { label: "Medidor/controlo em tempo real", amount: costs.realTimeMeter },
        { label: "Deslocacao", amount: costs.travel }
      ]
    },
    {
      key: "batteryEv",
      label: "Bateria/EV",
      items: [
        { label: "Bateria", amount: costs.battery },
        { label: "Instalacao de bateria", amount: costs.batteryLabor },
        { label: "Carregador EV", amount: costs.evCharger },
        { label: "Protecoes EV", amount: costs.evProtections }
      ]
    },
    {
      key: "vat",
      label: "IVA",
      items: [{ label: `IVA ${Math.round(VAT_RATE * 100)}%`, amount: vat }]
    }
  ];

  return sections.map((section) => {
    const items = section.items
      .map((item) => ({ ...item, amount: roundMoney(item.amount) }))
      .filter((item) => item.amount > 0);
    return {
      ...section,
      items,
      total: roundMoney(items.reduce((total, item) => total + item.amount, 0))
    };
  });
}

export function calculateProposal(input) {
  const consumption = calcularConsumo(input);
  const profile = normalizeProfile(input);
  const objective = normalizeObjective(input);
  const gridType = normalizeGridType(input);
  const systemAdvice = escolherSistema(input);
  const system = systemAdvice.system;
  const sizing = dimensionarSistema({ monthlyConsumptionKwh: consumption.monthlyConsumptionKwh, objective, perfilConsumo: profile });
  const panel = escolherPainel(input);
  const panelCount = panel.powerW === PRICE_DATABASE.panels.standard460w.powerW
    ? sizing.adjustedPanelCount
    : Math.ceil(sizing.targetKwp / (panel.powerW / 1000));
  const actualPanelPowerKwp = roundTwo(panelCount * panel.powerW / 1000);
  const annualProductionKwh = actualPanelPowerKwp * ANNUAL_PRODUCTION_KWH_PER_KWP;
  const needsBattery = system !== "ongrid";
  const batterySelection = needsBattery
    ? escolherBaterias({
      ...input,
      monthlyConsumptionKwh: consumption.monthlyConsumptionKwh,
      perfilConsumo: profile
    })
    : { selected: null, options: [], targetKwh: 0, night: estimarConsumoNoturno({ ...input, monthlyConsumptionKwh: consumption.monthlyConsumptionKwh, perfilConsumo: profile }), notes: [] };
  const inverter = escolherInversor({
    ...input,
    gridType,
    system,
    targetKwp: sizing.targetKwp,
    batteryOption: batterySelection.selected
  });
  const structure = calcularEstrutura({ ...input, panelCount });
  const labor = calcularMaoObra({ ...input, panelCount, batteryOption: batterySelection.selected });
  const electrical = calcularEletrica({ ...input, panelCount, gridType, system });
  const extras = calcularExtras({
    ...input,
    inverterPowerKw: inverter.powerKw ?? 0
  });

  const costs = buildCosts({
    panelCount,
    panel,
    inverter,
    batteryOption: batterySelection.selected,
    structure,
    labor,
    electrical,
    extras
  });

  const priceNet = sumCosts(costs);
  const vat = roundMoney(priceNet * VAT_RATE);
  const priceGross = roundMoney(priceNet + vat);
  const technicalFlags = getTechnicalFlags({
    inverter,
    structure,
    electrical,
    extras,
    batterySelection
  });
  const roi = calcularROI({
    system,
    profile,
    annualConsumptionKwh: consumption.annualConsumptionKwh,
    annualProductionKwh,
    batteryCapacityKwh: batterySelection.selected?.capacityKwh ?? 0,
    totalGross: priceGross,
    uncertain: technicalFlags.length > 0
  });
  const pricedOptions = needsBattery
    ? batterySelection.options.map((batteryOption) => buildPricedOption({
      key: batteryOption.key,
      label: batteryOption.positioning,
      input,
      panel,
      panelCount,
      gridType,
      system,
      sizing,
      structure,
      electrical,
      consumption,
      profile,
      batteryOption
    }))
    : [];
  const allNotes = [
    ...consumption.notes,
    ...systemAdvice.notes,
    ...sizing.notes,
    ...panel.notes,
    ...batterySelection.notes,
    ...inverter.notes,
    ...structure.notes,
    ...electrical.notes,
    ...extras.notes,
    ...technicalFlags.map((flag) => flag.message)
  ];

  if (priceGross > 0 && consumption.monthlyBillEur < 60 && system !== "ongrid") {
    allNotes.push("Esta solucao pode ser mais orientada para autonomia/backup do que para retorno financeiro rapido.");
  }
  if (gridType === "nao_sei") {
    allNotes.push("Tipo de rede nao indicado: calculo assumido como monofasico ate validacao.");
  }

  const breakdown = buildPriceBreakdown(costs, vat);

  return {
    recommendation: {
      mode: legacyMode(system),
      system,
      source: systemAdvice.source,
      objective,
      profile,
      alternatives: systemAdvice.alternatives.map(legacyMode),
      text: system === "ongrid" ? "Sistema on-grid recomendado" : system === "hibrido_backup" ? "Sistema hibrido com backup recomendado" : "Sistema hibrido recomendado",
      notes: allNotes
    },
    sizing: {
      monthlyConsumptionKwh: consumption.monthlyConsumptionKwh,
      monthlyBillEur: consumption.monthlyBillEur,
      annualConsumptionKwh: consumption.annualConsumptionKwh,
      annualCurrentCostEur: consumption.annualCurrentCostEur,
      targetKwp: sizing.targetKwp,
      theoreticalKwp: sizing.theoreticalKwp,
      basePanelCount: sizing.basePanelCount,
      adjustedPanelCount: sizing.adjustedPanelCount,
      actualPanelPowerKwp,
      needsTechnicalAnalysis: sizing.needsTechnicalAnalysis
    },
    equipment: {
      panel,
      panelCount,
      inverter,
      battery: batterySelection.selected
        ? {
          ...batterySelection.selected,
          count: batterySelection.selected.count ?? batterySelection.selected.modules ?? 1
        }
        : { capacityKwh: 0, count: 0, label: "Sem bateria", equipmentCost: 0 },
      batteryOptions: batterySelection.options,
      pricedOptions,
      evCharger: extras.evCharger > 0 ? "Carregador EV" : null
    },
    advice: {
      systemChoice: systemAdvice,
      battery: batterySelection,
      pricedOptions,
      inverterAlternatives: inverter.alternatives,
      technicalFlags,
      technicalVisit: allNotes.filter((note) => note.toLowerCase().includes("visita tecnica") || note.toLowerCase().includes("a confirmar"))
    },
    consumption: {
      ...consumption,
      night: batterySelection.night
    },
    roi,
    price: {
      net: priceNet,
      vat,
      gross: priceGross,
      breakdown
    },
    internalCosts: costs,
    calibration: {
      source: PRICE_DATABASE.source,
      vatRate: VAT_RATE,
      historicalVatRate: PRICE_CALIBRATION.historicalVatRate,
      benchmarksHistoricalGrossPerKwp: PRICE_CALIBRATION.benchmarksHistoricalGrossPerKwp,
      benchmarksGrossPerKwp: PRICE_CALIBRATION.benchmarksGrossPerKwp
    }
  };
}
