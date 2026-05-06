import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

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

function cardBox(x, y, w, h, fill = "1 1 1", stroke = "0.86 0.86 0.86") {
  return rect(x, y - h, w, h, fill, stroke);
}

function readPngChunks(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    throw new Error("Logo PNG invalido.");
  }

  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    chunks.push({ type, data });
    offset += length + 12;
    if (type === "IEND") break;
  }
  return chunks;
}

function unfilterPngScanlines(inflated, width, height, channels) {
  const stride = width * channels;
  const output = Buffer.alloc(width * height * channels);
  let inputOffset = 0;
  let outputOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[inputOffset + x];
      const left = x >= channels ? output[outputOffset + x - channels] : 0;
      const up = y > 0 ? output[outputOffset + x - stride] : 0;
      const upLeft = y > 0 && x >= channels ? output[outputOffset + x - stride - channels] : 0;
      let value = raw;

      if (filter === 1) value = raw + left;
      if (filter === 2) value = raw + up;
      if (filter === 3) value = raw + Math.floor((left + up) / 2);
      if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        value = raw + predictor;
      }

      output[outputOffset + x] = value & 255;
    }
    inputOffset += stride;
    outputOffset += stride;
  }

  return output;
}

function loadLogoImage() {
  const logoPath = join(process.cwd(), "assets", "logo-solexr-header.png");
  if (!existsSync(logoPath)) return null;

  const buffer = readFileSync(logoPath);
  const chunks = readPngChunks(buffer);
  const ihdr = chunks.find((chunk) => chunk.type === "IHDR")?.data;
  if (!ihdr) return null;

  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) return null;

  const idat = Buffer.concat(chunks.filter((chunk) => chunk.type === "IDAT").map((chunk) => chunk.data));
  const pixels = unfilterPngScanlines(inflateSync(idat), width, height, 4);
  const rgb = Buffer.alloc(width * height * 3);
  const alpha = Buffer.alloc(width * height);

  for (let source = 0, color = 0, mask = 0; source < pixels.length; source += 4, color += 3, mask += 1) {
    rgb[color] = pixels[source];
    rgb[color + 1] = pixels[source + 1];
    rgb[color + 2] = pixels[source + 2];
    alpha[mask] = pixels[source + 3];
  }

  return {
    width,
    height,
    rgb: deflateSync(rgb),
    alpha: deflateSync(alpha)
  };
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

function drawWrappedLines(lines, x, y, size = 8, gap = 10, font = "F1", color = "0.30 0.36 0.44") {
  return lines
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

function pageHeader(title, subtitle = "") {
  return [
    rect(0, 778, 595, 64, "0.05 0.22 0.16"),
    text(title, 40, 806, 17, "F2", "1 1 1"),
    subtitle ? text(subtitle, 40, 787, 9, "F1", "0.88 0.96 0.91") : ""
  ].filter(Boolean).join("\n");
}

function drawLogo(x = 40, y = 771, width = 150, height = 78) {
  return `q ${width} 0 0 ${height} ${x} ${y} cm /Logo Do Q`;
}

function drawHeader() {
  return [
    rect(0, 760, 595, 82, "1 1 1"),
    drawLogo(40, 766, 150, 78),
    rect(40, 674, 515, 72, "0.04 0.20 0.15"),
    rect(395, 674, 160, 72, "0.10 0.40 0.27"),
    text("PROPOSTA FOTOVOLTAICA", 60, 722, 16, "F2", "1 1 1"),
    text("INDICATIVA", 60, 700, 16, "F2", "1 1 1"),
    text("Dimensionamento e estimativa financeira", 60, 684, 9, "F1", "0.88 0.96 0.91"),
    text(`Data: ${new Date().toLocaleDateString("pt-PT")}`, 424, 718, 8.5, "F1", "0.92 0.97 0.94"),
    text(`Validade: ${process.env.PROPOSAL_VALID_DAYS || "15"} dias`, 424, 700, 8.5, "F2", "1 1 1"),
    text("precos sujeitos a atualizacao", 424, 686, 7, "F1", "0.82 0.91 0.86")
  ].join("\n");
}

function drawClientAndConsumption(lead, calculation, x, y) {
  const consumption = calculation.consumption ?? calculation.sizing;
  return [
    cardBox(x, y, 515, 118, "1 1 1"),
    text("CLIENTE", x + 16, y - 26, 11, "F2", "0.05 0.22 0.16"),
    text(lead.name, x + 16, y - 46, 10, "F2"),
    wrappedText(`Telefone: ${lead.phone || "-"}`, x + 16, y - 63, 34, 8),
    wrappedText(`Email: ${lead.email || "-"}`, x + 16, y - 79, 34, 8),
    wrappedText(`Localidade: ${lead.locality || "-"}`, x + 16, y - 95, 34, 8),
    text("CONSUMO ATUAL", x + 280, y - 26, 11, "F2", "0.05 0.22 0.16"),
    text(`Fatura mensal: ${money(consumption.monthlyBillEur)}`, x + 280, y - 46, 8.5),
    text(`Consumo mensal: ${kwh(consumption.monthlyConsumptionKwh)}`, x + 280, y - 62, 8.5),
    text(`Custo anual atual: ${money(consumption.annualCurrentCostEur)}`, x + 280, y - 78, 8.5),
    text(`Perfil: ${calculation.recommendation?.profile || "-"}`, x + 280, y - 94, 8.5)
  ].join("\n");
}

function drawRecommendation(calculation, x, y) {
  const panel = calculation.equipment.panel;
  const reason = [
    calculation.recommendation?.source === "cliente" ? "Escolha indicada pelo cliente respeitada." : "Recomendacao baseada no consumo, perfil horario e objetivo.",
    ...(calculation.recommendation?.notes ?? []).slice(0, 2)
  ];
  return [
    cardBox(x, y, 515, 126, "0.95 0.98 0.96", "0.72 0.84 0.76"),
    text("SISTEMA RECOMENDADO", x + 16, y - 28, 12, "F2", "0.05 0.22 0.16"),
    wrappedText(`Sistema: ${calculation.recommendation?.text || "-"}`, x + 16, y - 50, 42, 9, 10, "F2"),
    text(`Potencia alvo: ${kwp(calculation.sizing.targetKwp)}`, x + 16, y - 72, 8.5),
    text(`Potencia real em paineis: ${kwp(calculation.sizing.actualPanelPowerKwp)}`, x + 16, y - 88, 8.5),
    wrappedText(`Paineis: ${calculation.equipment.panelCount} x ${panel.label}`, x + 16, y - 104, 42, 8.5),
    wrappedText(reason.join(" "), x + 286, y - 50, 39, 8, 10)
  ].join("\n");
}

function optionCardLayout(option, width = 515) {
  const contentWidth = width - 48;
  const maxChars = Math.max(42, Math.floor(contentWidth / 5.4));
  const notes = notesFor(option).slice(0, 3);
  const noteLines = notes.flatMap((note) => wrap(note, maxChars - 4));
  const inverterLines = wrap(`Inversor: ${optionInverter(option)}`, maxChars);
  const batteryLines = wrap(`Bateria: ${optionBattery(option)}`, maxChars);
  const height = 216
    + inverterLines.length * 9
    + batteryLines.length * 9
    + noteLines.length * 8
    + notes.length * 4;

  return {
    height: Math.max(238, height),
    maxChars,
    notes,
    inverterLines,
    batteryLines
  };
}

function drawOptionCard(option, x, y, width = 515, accent = "0.08 0.32 0.22") {
  const layout = optionCardLayout(option, width);
  const price = optionPrice(option);
  const roi = optionRoi(option);
  const pad = 24;
  const commands = [
    cardBox(x, y, width, layout.height, "1 1 1", "0.80 0.86 0.82"),
    rect(x, y - 44, width, 44, accent),
    text(optionTitle(option), x + pad, y - 27, 12, "F2", "1 1 1")
  ];
  let cursor = y - 68;
  commands.push(drawWrappedLines(layout.inverterLines, x + pad, cursor, 8, 10));
  cursor -= layout.inverterLines.length * 10 + 8;
  commands.push(drawWrappedLines(layout.batteryLines, x + pad, cursor, 8, 10));
  cursor -= layout.batteryLines.length * 10 + 8;
  commands.push(text(`Capacidade: ${optionBatteryCapacity(option)}`, x + pad, cursor, 8));
  cursor -= 15;
  commands.push(line(x + pad, cursor, x + width - pad, cursor));
  cursor -= 18;
  commands.push(text(`Sem IVA: ${money(price.net)}`, x + pad, cursor, 8));
  cursor -= 16;
  commands.push(text(`IVA: ${money(price.vat)}`, x + pad, cursor, 8));
  cursor -= 18;
  commands.push(text(`Com IVA: ${money(price.gross)}`, x + pad, cursor, 10, "F2", "0.08 0.42 0.28"));
  cursor -= 20;
  commands.push(text(`Poupanca mensal: ${money(roi.monthlySavingsEur)}`, x + pad, cursor, 8));
  cursor -= 16;
  commands.push(text(`Poupanca anual: ${money(roi.annualSavingsEur)}`, x + pad, cursor, 8));
  cursor -= 17;
  commands.push(text(`ROI: ${years(roi.roiYears)}`, x + pad, cursor, 8.5, "F2"));
  cursor -= 18;
  if (layout.notes.length) {
    commands.push(bulletList(layout.notes, x + pad, cursor, layout.maxChars - 4, 7, 9));
  }
  return commands.join("\n");
}

function drawComparison({ onGrid, hybrid }, x, y) {
  const onGridHeight = optionCardLayout(onGrid).height;
  const hybridY = y - onGridHeight - 28;
  return [
    text("COMPARACAO DE SOLUCOES", x, y + 22, 13, "F2"),
    drawOptionCard(onGrid, x, y, 515, "0.08 0.32 0.22"),
    drawOptionCard(hybrid, x, hybridY, 515, "0.12 0.44 0.30")
  ].join("\n");
}

function drawBatteryOptions(hybridPriceOptions, x, y) {
  const commands = [text("OPCOES DE BATERIA", x, y + 22, 13, "F2")];
  let cursor = y;
  hybridPriceOptions.slice(0, 2).forEach((option, index) => {
    commands.push(drawOptionCard(option, x, cursor, 515, index === 0 ? "0.10 0.36 0.48" : "0.37 0.31 0.12"));
    cursor -= optionCardLayout(option).height + 28;
  });
  return hybridPriceOptions.length ? commands.join("\n") : "";
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
    cardBox(x, y, 515, 126, "0.98 0.99 0.98", "0.84 0.89 0.86"),
    text("ENQUADRAMENTO", x + 20, y - 28, 12, "F2", "0.05 0.22 0.16"),
    bulletList(items, x + 20, y - 52, 76, 8, 11)
  ].join("\n");
}

function drawCostDetail(option, x, y) {
  const structureNeedsVisit = (option.flags ?? []).some((flag) => flag.area === "estrutura" && flag.type === "visita_tecnica");
  const rows = [
    ["Paineis", costValue(option, "panels")],
    ["Inversor", costValue(option, "inverter")],
    ["Bateria", costValue(option, "battery")],
    ["Estrutura", structureNeedsVisit ? "valor a definir apos visita tecnica" : costValue(option, "structure")],
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
    commands.push(text(typeof value === "string" ? value : money(value), x + 180, rowY, 8.5, "F2"));
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
    "Painel 460W usado por defeito. Painel 595W disponivel para telhado sanduiche ou instalacao terrea quando escolhido/validado tecnicamente.",
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
    drawClientAndConsumption(lead, calculation, 40, 650),
    drawRecommendation(calculation, 40, 502),
    footer()
  ].join("\n");
}

function buildPageTwo({ onGrid, hybrid }) {
  return [
    pageHeader("COMPARACAO DE SOLUCOES", "Opcoes apresentadas em largura total para leitura limpa"),
    drawComparison({ onGrid, hybrid }, 40, 735),
    footer()
  ].join("\n");
}

function buildPageThree({ calculation, hybridPriceOptions }) {
  return [
    pageHeader("COMPARACAO E ENQUADRAMENTO", "Leitura comercial das opcoes propostas"),
    drawContext({ hybridPriceOptions }, 40, 735),
    drawNotes(calculation, 40, 540),
    footer()
  ].join("\n");
}

function buildPageFour({ hybridPriceOptions }) {
  return [
    pageHeader("OPCOES DE BATERIA", "Comparacao das alternativas de armazenamento"),
    drawBatteryOptions(hybridPriceOptions, 40, 735),
    footer()
  ].join("\n");
}

function buildPageFive({ recommended }) {
  return [
    pageHeader("DETALHE TECNICO E FINANCEIRO", "Decomposicao do preco da solucao recomendada"),
    drawCostDetail(recommended, 40, 735),
    drawEquipment(recommended, 330, 735),
    footer()
  ].join("\n");
}

function buildPdf(pages) {
  const logoImage = loadLogoImage();
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index} 0 R`).join(" ")}] /Count ${pages.length} >>`
  ];

  const pageObjectStart = objects.length + 1;
  const fontRegularObject = pageObjectStart + pages.length;
  const fontBoldObject = fontRegularObject + 1;
  const logoMaskObject = logoImage ? fontBoldObject + 1 : null;
  const logoObject = logoImage ? fontBoldObject + 2 : null;
  const contentObjectStart = fontBoldObject + 1 + (logoImage ? 2 : 0);
  const imageResources = logoImage ? `/XObject << /Logo ${logoObject} 0 R >>` : "";

  pages.forEach((_, index) => {
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegularObject} 0 R /F2 ${fontBoldObject} 0 R >> ${imageResources} >> /Contents ${contentObjectStart + index} 0 R >>`);
  });
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  if (logoImage) {
    const alphaHex = `${logoImage.alpha.toString("hex")}>`;
    const rgbHex = `${logoImage.rgb.toString("hex")}>`;
    objects.push(`<< /Type /XObject /Subtype /Image /Width ${logoImage.width} /Height ${logoImage.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter [/ASCIIHexDecode /FlateDecode] /Length ${alphaHex.length} >>\nstream\n${alphaHex}\nendstream`);
    objects.push(`<< /Type /XObject /Subtype /Image /Width ${logoImage.width} /Height ${logoImage.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /FlateDecode] /SMask ${logoMaskObject} 0 R /Length ${rgbHex.length} >>\nstream\n${rgbHex}\nendstream`);
  }
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
    buildPageTwo({ onGrid, hybrid }),
    buildPageThree({ calculation, hybridPriceOptions }),
    buildPageFour({ hybridPriceOptions }),
    buildPageFive({ recommended: detailedRecommended })
  ]);
}
