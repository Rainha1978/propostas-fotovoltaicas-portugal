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
  groundFloor: false,
  gridType: "monofasico",
  consumptionPeriod: "dia",
  distancePvToInverterM: 12,
  distanceInverterToPanelM: 8,
  distanceToMaceiraKm: 20,
  wantsBattery: false,
  wantsEvCharger: false
};

test("converte fatura mensal para consumo com energia a 0.20 EUR/kWh", () => {
  assert.equal(estimateMonthlyConsumptionKwh({ monthlyBillEur: 80 }), 400);
});

test("dimensiona potencia por escaloes de consumo mensal", () => {
  assert.deepEqual(dimensionSystem(250), { targetKwp: 2, needsTechnicalAnalysis: false });
  assert.deepEqual(dimensionSystem(251), { targetKwp: 3, needsTechnicalAnalysis: false });
  assert.deepEqual(dimensionSystem(601), { targetKwp: 5.5, needsTechnicalAnalysis: false });
  assert.deepEqual(dimensionSystem(801), { targetKwp: 6, needsTechnicalAnalysis: true });
});

test("calcula proposta on-grid com autoconsumo diurno realista", () => {
  const proposal = calculateProposal(baseLead);
  const breakdownTotal = proposal.price.breakdown.reduce((total, section) => total + section.total, 0);

  assert.equal(proposal.recommendation.mode, "on-grid");
  assert.equal(proposal.sizing.targetKwp, 3);
  assert.equal(proposal.equipment.panel.powerW, 460);
  assert.equal(proposal.equipment.panelCount, 7);
  assert.equal(proposal.roi.annualProductionKwh, 4500);
  assert.equal(proposal.roi.directSelfConsumptionKwh, 3120);
  assert.equal(proposal.roi.annualSavingsEur, 624);
  assert.equal(proposal.price.gross, Number((proposal.price.net * (1 + VAT_RATE)).toFixed(2)));
  assert.equal(Number(breakdownTotal.toFixed(2)), proposal.price.gross);
  assert.deepEqual(
    proposal.price.breakdown.map((section) => section.label),
    ["Equipamento", "Mao de obra", "Eletrica/protecoes", "Extras", "Bateria/EV", "IVA"]
  );
});

test("calcula mao de obra por escaloes de paineis, nao por kWp direto", () => {
  const cases = [
    { monthlyConsumptionKwh: 180, expectedPanels: 5, expectedLabor: 400 },
    { monthlyConsumptionKwh: 400, expectedPanels: 7, expectedLabor: 440 },
    { monthlyConsumptionKwh: 600, expectedPanels: 10, expectedLabor: 480 },
    { monthlyConsumptionKwh: 750, expectedPanels: 12, expectedLabor: 520 },
    { monthlyConsumptionKwh: 900, expectedPanels: 14, expectedLabor: 560 }
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

test("acrescenta mao de obra unica para bateria e agravamento em telha lusa dificil", () => {
  const proposal = calculateProposal({
    ...baseLead,
    consumptionPeriod: "noite",
    wantsBattery: true,
    batteryCapacityKwh: 10,
    difficultTile: true
  });

  assert.equal(proposal.equipment.panelCount, 7);
  assert.equal(proposal.internalCosts.labor, 480);
  assert.equal(proposal.internalCosts.batteryLabor, 120);
});

test("usa painel 595W quando telhado sanduiche e instalacao no res do chao", () => {
  const proposal = calculateProposal({
    ...baseLead,
    roofType: "sanduiche",
    groundFloor: true
  });

  assert.equal(proposal.equipment.panel.powerW, 595);
  assert.equal(proposal.equipment.panelCount, 6);
});

test("recomenda hibrido e contabiliza descarga de bateria para consumo noturno", () => {
  const proposal = calculateProposal({
    ...baseLead,
    consumptionPeriod: "noite",
    wantsBattery: true,
    batteryCapacityKwh: 10
  });

  assert.equal(proposal.recommendation.mode, "hibrido");
  assert.equal(proposal.equipment.battery.capacityKwh, 10);
  assert.equal(proposal.internalCosts.battery, 2640);
  assert.equal(proposal.roi.totalUsedEnergyKwh, 3825);
  assert.equal(proposal.roi.selfConsumptionRate, 0.85);
  assert.equal(proposal.roi.annualSavingsEur, 765);
});

test("calcula poupanca hibrida com 85% de aproveitamento da producao anual", () => {
  const proposal = calculateProposal({
    ...baseLead,
    monthlyBillEur: 0,
    monthlyConsumptionKwh: 800,
    consumptionPeriod: "noite",
    wantsBattery: true,
    batteryCapacityKwh: 10
  });

  assert.equal(proposal.sizing.targetKwp, 5.5);
  assert.equal(proposal.roi.annualProductionKwh, 8250);
  assert.equal(proposal.roi.totalUsedEnergyKwh, 7012.5);
  assert.equal(proposal.roi.annualSavingsEur, 1402.5);
});

test("em trifasico com bateria escolhe DEYE + GSL HV como opcao principal", () => {
  const proposal = calculateProposal({
    ...baseLead,
    gridType: "trifasico",
    wantsBattery: true,
    batteryCapacityKwh: 12
  });

  assert.equal(proposal.equipment.inverter.label, "DEYE trifasico hibrido");
  assert.equal(proposal.equipment.battery.label, "GSL G-PRO HV 15kWh");
  assert.ok(proposal.recommendation.notes.some((note) => note.includes("DEYE + GSL HV")));
});
