import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateProposal,
  dimensionSystem,
  estimateMonthlyConsumptionKwh,
  VAT_RATE
} from "../src/domain/solarCalculator.js";

const baseLead = {
  monthlyBillEur: 80,
  roofType: "telha-lusa",
  tipo_telhado: "telha_lusa",
  panel_preference: "standard_460",
  gridType: "monofasico",
  consumptionPeriod: "equilibrado",
  distancePvToInverterM: 12,
  distanceInverterToPanelM: 8,
  distanceToMaceiraKm: 20,
  wantsBattery: false,
  wantsEvCharger: false
};

test("converte fatura mensal para consumo removendo IVA e custos fixos", () => {
  assert.equal(estimateMonthlyConsumptionKwh({ monthlyBillEur: 80 }), 300.3);
});

test("dimensiona perfil equilibrado mantendo paineis base", () => {
  assert.deepEqual(dimensionSystem(250, "equilibrado"), { targetKwp: 2.3, basePanelCount: 5, adjustedPanelCount: 5, needsTechnicalAnalysis: false });
  assert.deepEqual(dimensionSystem(251, "equilibrado"), { targetKwp: 2.76, basePanelCount: 6, adjustedPanelCount: 6, needsTechnicalAnalysis: false });
  assert.deepEqual(dimensionSystem(350, "equilibrado"), { targetKwp: 2.76, basePanelCount: 6, adjustedPanelCount: 6, needsTechnicalAnalysis: false });
  assert.deepEqual(dimensionSystem(351, "equilibrado"), { targetKwp: 3.22, basePanelCount: 7, adjustedPanelCount: 7, needsTechnicalAnalysis: false });
  assert.deepEqual(dimensionSystem(1150, "equilibrado"), { targetKwp: 6.44, basePanelCount: 14, adjustedPanelCount: 14, needsTechnicalAnalysis: false });
  assert.deepEqual(dimensionSystem(1151, "equilibrado"), { targetKwp: 6.44, basePanelCount: 14, adjustedPanelCount: 14, needsTechnicalAnalysis: true });
});

test("dimensiona perfil dia aumentando paineis por escalao", () => {
  assert.deepEqual(dimensionSystem(250, "dia"), { targetKwp: 2.76, basePanelCount: 5, adjustedPanelCount: 6, needsTechnicalAnalysis: false });
  assert.deepEqual(dimensionSystem(300, "dia"), { targetKwp: 3.22, basePanelCount: 6, adjustedPanelCount: 7, needsTechnicalAnalysis: false });
  assert.deepEqual(dimensionSystem(600, "dia"), { targetKwp: 4.6, basePanelCount: 9, adjustedPanelCount: 10, needsTechnicalAnalysis: false });
});

test("dimensiona perfil noite reduzindo paineis sem baixar de 5", () => {
  assert.deepEqual(dimensionSystem(250, "noite"), { targetKwp: 2.3, basePanelCount: 5, adjustedPanelCount: 5, needsTechnicalAnalysis: false });
  assert.deepEqual(dimensionSystem(600, "noite"), { targetKwp: 3.68, basePanelCount: 9, adjustedPanelCount: 8, needsTechnicalAnalysis: false });
  assert.deepEqual(dimensionSystem(1000, "noite"), { targetKwp: 5.06, basePanelCount: 13, adjustedPanelCount: 11, needsTechnicalAnalysis: false });
});

test("120 EUR mensais com perfil noite reduz para 7 paineis", () => {
  const proposal = calculateProposal({
    ...baseLead,
    fatura_mensal_eur: 120,
    monthlyBillEur: 120,
    perfil_consumo: "noite",
    consumptionPeriod: "noite"
  });

  assert.equal(proposal.consumption.monthlyConsumptionKwh, 517.1);
  assert.equal(proposal.sizing.basePanelCount, 8);
  assert.equal(proposal.sizing.adjustedPanelCount, 7);
  assert.equal(proposal.equipment.panelCount, 7);
});

test("usa 460W em telha lusa mesmo com preferencia 595W", () => {
  const proposal = calculateProposal({
    ...baseLead,
    tipo_telhado: "telha_lusa",
    roofType: "telha-lusa",
    panel_preference: "large_595"
  });

  assert.equal(proposal.equipment.panel.powerW, 460);
  assert.equal(proposal.equipment.panel.preference, "standard_460");
  assert.ok(proposal.recommendation.notes.some((note) => note.includes("Telha lusa usa sempre painel 460W")));
});

test("usa 460W por defeito em sanduiche e 595W apenas com escolha explicita", () => {
  const defaultProposal = calculateProposal({
    ...baseLead,
    tipo_telhado: "sanduiche",
    roofType: "sanduiche",
    panel_preference: undefined
  });
  const largeProposal = calculateProposal({
    ...baseLead,
    tipo_telhado: "sanduiche",
    roofType: "sanduiche",
    panel_preference: "large_595"
  });

  assert.equal(defaultProposal.equipment.panel.powerW, 460);
  assert.equal(defaultProposal.equipment.panel.preference, "standard_460");
  assert.equal(largeProposal.equipment.panel.powerW, 595);
  assert.equal(largeProposal.equipment.panel.preference, "large_595");
});

test("usa 460W por defeito em terreo e 595W apenas com escolha explicita", () => {
  const defaultProposal = calculateProposal({
    ...baseLead,
    tipo_telhado: "terreo",
    panel_preference: undefined
  });
  const largeProposal = calculateProposal({
    ...baseLead,
    tipo_telhado: "terreo",
    panel_preference: "large_595"
  });

  assert.equal(defaultProposal.equipment.panel.powerW, 460);
  assert.equal(defaultProposal.equipment.panel.preference, "standard_460");
  assert.equal(largeProposal.equipment.panel.powerW, 595);
  assert.equal(largeProposal.equipment.panel.preference, "large_595");
});

test("calcula proposta on-grid com preco total composto e IVA", () => {
  const proposal = calculateProposal(baseLead);
  const breakdownTotal = proposal.price.breakdown.reduce((total, section) => total + section.total, 0);

  assert.equal(proposal.recommendation.mode, "on-grid");
  assert.equal(proposal.equipment.panel.powerW, 460);
  assert.equal(proposal.price.gross, Number((proposal.price.net * (1 + VAT_RATE)).toFixed(2)));
  assert.equal(Number(breakdownTotal.toFixed(2)), proposal.price.gross);
  assert.deepEqual(
    proposal.price.breakdown.map((section) => section.label),
    ["Equipamento", "Mao de obra", "Eletrica/protecoes", "Extras", "Bateria/EV", "IVA"]
  );
});

test("calcula mao de obra por numero de paineis segundo a regra nova", () => {
  const cases = [
    { monthlyConsumptionKwh: 180, expectedPanels: 5, expectedLabor: 400 },
    { monthlyConsumptionKwh: 400, expectedPanels: 7, expectedLabor: 440 },
    { monthlyConsumptionKwh: 600, expectedPanels: 9, expectedLabor: 480 },
    { monthlyConsumptionKwh: 800, expectedPanels: 11, expectedLabor: 520 },
    { monthlyConsumptionKwh: 1000, expectedPanels: 13, expectedLabor: 560 },
    { monthlyConsumptionKwh: 1200, expectedPanels: 14, expectedLabor: 560 }
  ];

  for (const item of cases) {
    const proposal = calculateProposal({
      ...baseLead,
      monthlyConsumptionKwh: item.monthlyConsumptionKwh,
      monthlyBillEur: 0
    });

    assert.equal(proposal.equipment.panelCount, item.expectedPanels);
    assert.equal(proposal.internalCosts.labor, item.expectedLabor);
  }
});

test("calcula bateria GoodWe LV premium a 1320 EUR por modulo", () => {
  const proposal = calculateProposal({
    ...baseLead,
    consumptionPeriod: "noite",
    wantsBattery: true,
    batteryCapacityKwh: 5,
    preferencia_bateria: "premium"
  });

  assert.equal(proposal.equipment.battery.brand, "GoodWe");
  assert.equal(proposal.equipment.battery.capacityKwh, 5.12);
  assert.equal(proposal.internalCosts.battery, 1320);
});

test("calcula bateria GSL LV economica 16kWh a 2600 EUR", () => {
  const proposal = calculateProposal({
    ...baseLead,
    consumptionPeriod: "noite",
    wantsBattery: true,
    batteryCapacityKwh: 10,
    preferencia_bateria: "economica"
  });

  assert.equal(proposal.equipment.battery.brand, "GSL");
  assert.equal(proposal.equipment.battery.capacityKwh, 16);
  assert.equal(proposal.internalCosts.battery, 2600);
});

test("em trifasico hibrido usa GoodWe premium como principal e DEYE/GSL como economica", () => {
  const proposal = calculateProposal({
    ...baseLead,
    gridType: "trifasico",
    rede: "trifasico",
    consumptionPeriod: "noite",
    wantsBattery: true,
    batteryCapacityKwh: 12
  });
  const economic = proposal.advice.pricedOptions.find((option) => option.key === "economica");

  assert.equal(proposal.equipment.inverter.brand, "GoodWe");
  assert.match(proposal.equipment.inverter.model, /^GW\d+K-ET$/);
  assert.equal(proposal.equipment.battery.brand, "GoodWe/BYD");
  assert.ok(proposal.equipment.battery.model.includes("BYD HVS"));
  assert.equal(economic.inverter.brand, "DEYE");
  assert.equal(economic.battery.brand, "DEYE/GSL");
  assert.equal(economic.battery.equipmentCost, 600 + economic.battery.modules * 625);
});
