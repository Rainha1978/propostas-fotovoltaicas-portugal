import { calculateProposal } from "../src/domain/solarCalculator.js";

const base = {
  monthlyBillEur: 0,
  groundFloor: false,
  gridType: "monofasico",
  consumptionPeriod: "dia",
  distancePvToInverterM: 12,
  distanceInverterToPanelM: 8,
  distanceToMaceiraKm: 20,
  wantsBattery: false,
  wantsEvCharger: false,
  difficultTile: false
};

const scenarios = [
  { name: "2kWp on-grid telha lusa", input: { ...base, monthlyConsumptionKwh: 250, roofType: "telha-lusa" } },
  { name: "2kWp on-grid sanduiche", input: { ...base, monthlyConsumptionKwh: 250, roofType: "sanduiche", groundFloor: true } },
  { name: "3kWp on-grid telha lusa", input: { ...base, monthlyConsumptionKwh: 400, roofType: "telha-lusa" } },
  { name: "3kWp on-grid sanduiche", input: { ...base, monthlyConsumptionKwh: 400, roofType: "sanduiche", groundFloor: true } },
  { name: "4kWp on-grid telha lusa", input: { ...base, monthlyConsumptionKwh: 600, roofType: "telha-lusa" }, note: "O motor atual dimensiona este escalão como 4.5kWp alvo." },
  { name: "4kWp on-grid sanduiche", input: { ...base, monthlyConsumptionKwh: 600, roofType: "sanduiche", groundFloor: true }, note: "O motor atual dimensiona este escalão como 4.5kWp alvo." },
  { name: "5kWp hibrido monofasico com 10kWh", input: { ...base, monthlyConsumptionKwh: 800, roofType: "telha-lusa", consumptionPeriod: "noite", wantsBattery: true, batteryCapacityKwh: 10 } },
  { name: "6kWp hibrido trifasico DEYE + GSL HV 10kWh", input: { ...base, monthlyConsumptionKwh: 900, roofType: "telha-lusa", gridType: "trifasico", consumptionPeriod: "noite", wantsBattery: true, batteryCapacityKwh: 10 } }
];

function eur(value) {
  return `${Number(value).toFixed(2)} EUR`;
}

function sectionTotal(proposal, key) {
  return proposal.price.breakdown.find((section) => section.key === key)?.total ?? 0;
}

function rows() {
  return scenarios.map((scenario) => {
    const proposal = calculateProposal(scenario.input);
    return {
      cenario: scenario.name,
      precoSemIva: proposal.price.net,
      iva: proposal.price.vat,
      precoComIva: proposal.price.gross,
      eurPorKwp: Number((proposal.price.gross / proposal.sizing.actualPanelPowerKwp).toFixed(2)),
      potenciaAlvoKwp: proposal.sizing.targetKwp,
      potenciaRealPaineisKwp: proposal.sizing.actualPanelPowerKwp,
      paineis: `${proposal.equipment.panelCount} x ${proposal.equipment.panel.label}`,
      inversor: proposal.equipment.inverter.label,
      estrutura: sectionTotal(proposal, "equipment") - proposal.internalCosts.panels - proposal.internalCosts.inverter - proposal.internalCosts.realTimeMeter,
      maoDeObra: proposal.internalCosts.labor,
      protecoesEletrica: sectionTotal(proposal, "electricalProtections"),
      bateria: proposal.equipment.battery.capacityKwh ? `${proposal.equipment.battery.label} (${eur(proposal.internalCosts.battery + proposal.internalCosts.batteryLabor)})` : "-",
      observacoes: [
        scenario.note,
        proposal.recommendation.notes.join(" ") || null,
        proposal.equipment.battery.capacityKwh ? `Mao de obra bateria: ${eur(proposal.internalCosts.batteryLabor)}` : null,
        proposal.internalCosts.realTimeMeter ? `Inclui medidor/contador: ${eur(proposal.internalCosts.realTimeMeter)}` : null
      ].filter(Boolean).join(" ") || "-"
    };
  });
}

const data = rows();
const headers = [
  "Cenario",
  "Sem IVA",
  "IVA",
  "Com IVA",
  "EUR/kWp",
  "Paineis",
  "Inversor",
  "Estrutura",
  "Mao de obra",
  "Protecoes/eletrica",
  "Bateria",
  "Observacoes"
];

const markdownRows = data.map((row) => [
  row.cenario,
  eur(row.precoSemIva),
  eur(row.iva),
  eur(row.precoComIva),
  `${row.eurPorKwp.toFixed(2)} EUR/kWp`,
  row.paineis,
  row.inversor,
  eur(row.estrutura),
  eur(row.maoDeObra),
  eur(row.protecoesEletrica),
  row.bateria,
  row.observacoes
]);

const markdown = [
  "# Tabela de validacao do MVP",
  "",
  "Cenarios calculados com o motor atual. O IVA aplicado e 23%.",
  "",
  `| ${headers.join(" | ")} |`,
  `| ${headers.map(() => "---").join(" | ")} |`,
  ...markdownRows.map((row) => `| ${row.join(" | ")} |`),
  "",
  "## Dados estruturados",
  "",
  "```json",
  JSON.stringify(data, null, 2),
  "```",
  ""
].join("\n");

console.log(markdown);
