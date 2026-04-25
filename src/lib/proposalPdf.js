function escapePdfText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function money(value) {
  return `${Number(value || 0).toFixed(2)} EUR`;
}

function kwh(value) {
  return `${Number(value || 0).toFixed(1)} kWh`;
}

function kwp(value) {
  return `${Number(value || 0).toFixed(2)} kWp`;
}

function years(value) {
  return value ? `${value} anos` : "-";
}

function text(value, x, y, size = 9, font = "F1", color = "0.12 0.16 0.22") {
  return `${color} rg BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET`;
}

function rect(x, y, w, h, fill = "1 1 1", stroke = null) {
  const fillCommand = `${fill} rg ${x} ${y} ${w} ${h} re f`;
  if (!stroke) return fillCommand;
  return `${fillCommand}\n${stroke} RG ${x} ${y} ${w} ${h} re S`;
}

function line(x1, y1, x2, y2, color = "0.85 0.89 0.93", width = 1) {
  return `${color} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`;
}

function wrap(value, maxChars) {
  const words = String(value ?? "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function wrappedText(value, x, y, maxChars, size = 8, gap = 10, font = "F1", color = "0.30 0.36 0.44") {
  return wrap(value, maxChars)
    .map((part, index) => text(part, x, y - index * gap, size, font, color))
    .join("\n");
}

function bulletList(items, x, y, maxChars = 74, size = 7.6, gap = 10) {
  const commands = [];
  let cursor = y;
  for (const item of items.filter(Boolean)) {
    const lines = wrap(item, maxChars);
    commands.push(text("+", x, cursor, size, "F2", "0.05 0.32 0.22"));
    lines.forEach((lineText, index) => {
      commands.push(text(lineText, x + 11, cursor - index * gap, size, "F1", "0.20 0.25 0.31"));
    });
    cursor -= Math.max(1, lines.length) * gap + 2;
  }
  return commands.join("\n");
}

function sectionTotal(option, key) {
  return option.price?.breakdown?.find((section) => section.key === key)?.total ?? 0;
}

function costValue(option, key) {
  return option.internalCosts?.[key] ?? option.costs?.[key] ?? 0;
}

function notesFor(option) {
  return [
    ...(option.recommendation?.notes ?? []),
    ...(option.flags ?? []).map((flag) => flag.message)
  ];
}

function optionTitle(option) {
  if (option.key === "economica") return "Opcao economica";
  if (option.key === "premium") return "Opcao premium";
  return option.recommendation?.mode === "on-grid" ? "Opcao on-grid" : "Opcao hibrida";
}

function optionInverter(option) {
  return option.inverter?.label ?? option.equipment?.inverter?.label ?? "-";
}

function optionBattery(option) {
  const battery = option.battery ?? option.equipment?.battery;
  if (!battery || !battery.capacityKwh) return "Sem bateria";
  return battery.label ?? battery.model ?? "Bateria";
}

function optionBatteryCapacity(option) {
  const battery = option.battery ?? option.equipment?.battery;
  return battery?.capacityKwh ? `${battery.capacityKwh} kWh` : "-";
}

function optionPrice(option) {
  return option.price ?? { net: 0, vat: 0, gross: 0 };
}

function optionRoi(option) {
  return option.roi ?? {};
}

function drawHeader() {
  return [
    rect(0, 728, 595, 114, "0.04 0.20 0.15"),
    rect(396, 728, 199, 114, "0.10 0.40 0.27"),
    text("PROPOSTA FOTOVOLTAICA INDICATIVA", 40, 795, 19, "F2", "1 1 1"),
    text("Dimensionamento, comparacao e estimativa financeira", 40, 770, 11, "F1", "0.88 0.96 0.91"),
    text(`Data: ${new Date().toLocaleDateString("pt-PT")}`, 424, 795, 9, "F1", "0.92 0.97 0.94"),
    text(`Validade: ${process.env.PROPOSAL_VALID_DAYS || "15"} dias`, 424, 775, 9, "F2", "1 1 1"),
    text("precos sujeitos a atualizacao", 424, 762, 7.5, "F1", "0.82 0.91 0.86")
  ].join("\n");
}

function drawClientAndConsumption(lead, calculation, x, y) {
  const consumption = calculation.consumption ?? calculation.sizing;
  return [
    rect(x, y - 138, 515, 138, "1 1 1", "0.82 0.88 0.84"),
    text("CLIENTE", x + 14, y - 22, 11, "F2", "0.05 0.22 0.16"),
    text(lead.name, x + 14, y - 42, 10, "F2"),
    text(`Telefone: ${lead.phone || "-"}`, x + 14, y - 59, 8),
    text(`Email: ${lead.email || "-"}`, x + 14, y - 74, 8),
    text(`Localidade: ${lead.locality || "-"}`, x + 14, y - 89, 8),
    text("CONSUMO ATUAL", x + 280, y - 22, 11, "F2", "0.05 0.22 0.16"),
    text(`Fatura mensal: ${money(consumption.monthlyBillEur)}`, x + 280, y - 42, 8.5),
    text(`Consumo mensal: ${kwh(consumption.monthlyConsumptionKwh)}`, x + 280, y - 58, 8.5),
    text(`Custo anual atual: ${money(consumption.annualCurrentCostEur)}`, x + 280, y - 74, 8.5),
    text(`Perfil: ${calculation.recommendation?.profile || "-"}`, x + 280, y - 90, 8.5),
    text(`Consumo noturno diario: ${kwh(consumption.night?.nightDailyKwh)}`, x + 280, y - 106, 8.5)
  ].join("\n");
}

function drawRecommendation(calculation, x, y) {
  const panel = calculation.equipment.panel;
  const reason = [
    calculation.recommendation?.source === "cliente" ? "Escolha indicada pelo cliente respeitada." : "Recomendacao baseada no consumo, perfil horario e objetivo.",
    ...(calculation.recommendation?.notes ?? []).slice(0, 2)
  ];
  return [
    rect(x, y - 136, 515, 136, "0.95 0.98 0.96", "0.72 0.84 0.76"),
    text("SISTEMA RECOMENDADO", x + 14, y - 22, 12, "F2", "0.05 0.22 0.16"),
    text(`Sistema: ${calculation.recommendation?.text || "-"}`, x + 14, y - 44, 9.5, "F2"),
    text(`Potencia alvo: ${kwp(calculation.sizing.targetKwp)}`, x + 14, y - 63, 8.5),
    text(`Potencia real em paineis: ${kwp(calculation.sizing.actualPanelPowerKwp)}`, x + 14, y - 79, 8.5),
    text(`Paineis: ${calculation.equipment.panelCount} x ${panel.label}`, x + 14, y - 95, 8.5),
    text(`Producao anual: ${kwh(calculation.roi.annualProductionKwh)}`, x + 14, y - 111, 8.5),
    wrappedText(reason.join(" "), x + 280, y - 43, 40, 8, 10)
  ].join("\n");
}

function drawOptionCard(option, x, y, width = 245, height = 210, accent = "0.08 0.32 0.22") {
  const price = optionPrice(option);
  const roi = optionRoi(option);
  const notes = notesFor(option).slice(0, 3);
  return [
    rect(x, y - height, width, height, "1 1 1", "0.80 0.86 0.82"),
    rect(x, y - 36, width, 36, accent),
    text(optionTitle(option), x + 12, y - 21, 11, "F2", "1 1 1"),
    text(`Inversor: ${optionInverter(option)}`, x + 12, y - 55, 7.8, "F1"),
    wrappedText(`Bateria: ${optionBattery(option)}`, x + 12, y - 71, 34, 7.6, 9),
    text(`Capacidade: ${optionBatteryCapacity(option)}`, x + 12, y - 98, 7.8),
    line(x + 12, y - 110, x + width - 12, y - 110),
    text(`Sem IVA: ${money(price.net)}`, x + 12, y - 127, 8),
    text(`IVA: ${money(price.vat)}`, x + 12, y - 143, 8),
    text(`Com IVA: ${money(price.gross)}`, x + 12, y - 161, 10, "F2", "0.08 0.42 0.28"),
    text(`Poupanca mensal: ${money(roi.monthlySavingsEur)}`, x + 12, y - 180, 7.8),
    text(`Poupanca anual: ${money(roi.annualSavingsEur)}`, x + 12, y - 194, 7.8),
    text(`ROI: ${years(roi.roiYears)}`, x + 145, y - 194, 7.8, "F2"),
    notes.length ? bulletList(notes, x + 12, y - 214, 34, 6.9, 8) : ""
  ].join("\n");
}

function drawComparison({ onGrid, hybrid }, x, y) {
  const cards = [
    drawOptionCard(onGrid, x, y, 245, 220, "0.08 0.32 0.22"),
    drawOptionCard(hybrid, x + 270, y, 245, 220, "0.12 0.44 0.30")
  ];
  return [
    text("COMPARACAO DE SOLUCOES", x, y + 22, 13, "F2"),
    ...cards
  ].join("\n");
}

function drawBatteryOptions(hybridPriceOptions, x, y) {
  const optionCards = hybridPriceOptions.slice(0, 2).map((option, index) => (
    drawOptionCard(option, x + index * 270, y, 245, 220, index === 0 ? "0.10 0.36 0.48" : "0.37 0.31 0.12")
  ));
  if (!optionCards.length) return "";
  return [
    text("OPCOES DE BATERIA", x, y + 22, 13, "F2"),
    ...optionCards
  ].join("\n");
}

function drawContext({ hybridPriceOptions }, x, y) {
  const premium = hybridPriceOptions.find((option) => option.key === "premium");
  const economic = hybridPriceOptions.find((option) => option.key === "economica");
  const items = [
    premium ? "A opcao premium pode ter ROI mais longo, mas privilegia marca, compatibilidade e uma solucao orientada para autonomia/backup." : null,
    economic ? "A opcao economica tende a privilegiar capacidade/preco e pode apresentar melhor retorno financeiro quando a bateria tem peso relevante." : null,
    "As opcoes nao sao boas ou mas por si: devem ser comparadas com o objetivo do cliente, o perfil de consumo e a visita tecnica."
  ].filter(Boolean);
  return [
    rect(x, y - 106, 515, 106, "0.98 0.99 0.98", "0.84 0.89 0.86"),
    text("ENQUADRAMENTO", x + 14, y - 22, 12, "F2", "0.05 0.22 0.16"),
    bulletList(items, x + 14, y - 44, 78, 8, 11)
  ].join("\n");
}

function drawCostDetail(option, x, y) {
  const rows = [
    ["Paineis", costValue(option, "panels")],
    ["Inversor", costValue(option, "inverter")],
    ["Bateria", costValue(option, "battery")],
    ["Estrutura", costValue(option, "structure")],
    ["Mao de obra", costValue(option, "labor") + costValue(option, "batteryLabor")],
    ["Protecoes/eletrica", costValue(option, "baseProtections") + costValue(option, "hybridProtections") + costValue(option, "backupManual")],
    ["Cabos/conectores", costValue(option, "dcCables") + costValue(option, "acCables") + costValue(option, "connectors")],
    ["Contador", costValue(option, "realTimeMeter")],
    ["EV", costValue(option, "evCharger") + costValue(option, "evProtections")],
    ["Deslocacao", costValue(option, "travel")],
    ["IVA", sectionTotal(option, "vat") || optionPrice(option).vat]
  ];
  const commands = [text("DETALHE DE CUSTOS", x, y, 13, "F2")];
  rows.forEach(([label, value], index) => {
    const rowY = y - 24 - index * 18;
    commands.push(text(label, x, rowY, 8.5, "F1", "0.30 0.36 0.44"));
    commands.push(text(money(value), x + 180, rowY, 8.5, "F2"));
    commands.push(line(x, rowY - 7, x + 250, rowY - 7));
  });
  return commands.join("\n");
}

function drawEquipment(option, x, y) {
  return [
    text("EQUIPAMENTOS", x, y, 13, "F2"),
    wrappedText(`Inversor: ${optionInverter(option)}`, x, y - 26, 42, 8.5),
    wrappedText(`Bateria: ${optionBattery(option)}`, x, y - 58, 42, 8.5),
    text(`Capacidade: ${optionBatteryCapacity(option)}`, x, y - 92, 8.5),
    text(`Preco final: ${money(optionPrice(option).gross)}`, x, y - 118, 10, "F2", "0.08 0.42 0.28"),
    text(`ROI: ${years(optionRoi(option).roiYears)}`, x, y - 138, 8.5)
  ].join("\n");
}

function drawNotes(calculation, x, y) {
  const notes = [
    "Proposta indicativa sujeita a validacao tecnica no local.",
    "Precos sujeitos a atualizacao de mercado.",
    "Nao inclui trabalhos de construcao civil ou alteracoes eletricas nao previstas.",
    calculation.sizing?.needsTechnicalAnalysis ? "Consumo acima de 800 kWh/mes: recomenda-se analise tecnica." : null,
    ...(calculation.advice?.technicalFlags ?? []).map((flag) => flag.message),
    ...(calculation.recommendation?.notes ?? [])
  ].filter(Boolean);
  return [
    text("NOTAS", x, y, 13, "F2"),
    bulletList([...new Set(notes)].slice(0, 10), x, y - 24, 84, 7.6, 10)
  ].join("\n");
}

function footer() {
  return [
    line(40, 36, 555, 36, "0.78 0.84 0.80"),
    text(`${process.env.COMPANY_NAME || "Empresa Fotovoltaica"} | ${process.env.COMPANY_LOCATION || "Maceira, Portugal"}`, 40, 20, 8, "F1", "0.38 0.45 0.53")
  ].join("\n");
}

function buildPageOne({ lead, calculation, onGrid, hybrid, hybridPriceOptions }) {
  return [
    drawHeader(),
    drawClientAndConsumption(lead, calculation, 40, 704),
    drawRecommendation(calculation, 40, 548),
    drawComparison({ onGrid, hybrid }, 40, 370),
    footer()
  ].join("\n");
}

function buildPageTwo({ calculation, hybridPriceOptions }) {
  return [
    rect(0, 778, 595, 64, "0.05 0.22 0.16"),
    text("COMPARACAO E ENQUADRAMENTO", 40, 806, 17, "F2", "1 1 1"),
    text("Leitura comercial das opcoes propostas", 40, 787, 9, "F1", "0.88 0.96 0.91"),
    drawContext({ hybridPriceOptions }, 40, 746),
    drawBatteryOptions(hybridPriceOptions, 40, 590),
    drawNotes(calculation, 40, 320),
    footer()
  ].join("\n");
}

function buildPageThree({ recommended }) {
  return [
    rect(0, 778, 595, 64, "0.05 0.22 0.16"),
    text("DETALHE TECNICO E FINANCEIRO", 40, 806, 17, "F2", "1 1 1"),
    text("Decomposicao do preco da solucao recomendada", 40, 787, 9, "F1", "0.88 0.96 0.91"),
    drawCostDetail(recommended, 40, 735),
    drawEquipment(recommended, 330, 735),
    footer()
  ].join("\n");
}

function buildPdf(pages) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index} 0 R`).join(" ")}] /Count ${pages.length} >>`
  ];

  const pageObjectStart = objects.length + 1;
  const fontRegularObject = pageObjectStart + pages.length;
  const fontBoldObject = fontRegularObject + 1;
  const contentObjectStart = fontBoldObject + 1;

  pages.forEach((_, index) => {
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegularObject} 0 R /F2 ${fontBoldObject} 0 R >> >> /Contents ${contentObjectStart + index} 0 R >>`);
  });
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  pages.forEach((content) => {
    objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
}

export function buildProposalPdf({ lead, calculation, options }) {
  const onGrid = options?.onGrid ?? calculation;
  const hybrid = options?.hybrid ?? calculation;
  const hybridPriceOptions = hybrid.advice?.pricedOptions ?? hybrid.equipment?.pricedOptions ?? calculation.advice?.pricedOptions ?? [];
  const recommended = calculation.recommendation?.mode === "on-grid" ? onGrid : hybrid;
  const detailedRecommended = calculation.advice?.pricedOptions?.find((option) => option.key === calculation.equipment?.battery?.key)
    ?? recommended;

  return buildPdf([
    buildPageOne({ lead, calculation, onGrid, hybrid, hybridPriceOptions }),
    buildPageTwo({ calculation, hybridPriceOptions }),
    buildPageThree({ recommended: detailedRecommended })
  ]);
}
