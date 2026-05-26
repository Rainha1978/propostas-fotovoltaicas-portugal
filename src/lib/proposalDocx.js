const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function money(value) {
  if (value === undefined || value === null || value === "") return "-";
  return `${Number(value || 0).toFixed(2)} EUR`;
}

function p(value, style = null) {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : "";
  return `<w:p>${styleXml}<w:r><w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r></w:p>`;
}

function pageBreak() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function cell(value, { width = 4500, shade = null, bold = false } = {}) {
  const shadeXml = shade ? `<w:shd w:fill="${shade}"/>` : "";
  const boldXml = bold ? "<w:b/>" : "";
  return `
    <w:tc>
      <w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${shadeXml}</w:tcPr>
      <w:p><w:r><w:rPr>${boldXml}</w:rPr><w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r></w:p>
    </w:tc>
  `;
}

function row(...cells) {
  return `<w:tr>${cells.join("")}</w:tr>`;
}

function keyValueRow(label, value) {
  return row(
    cell(label, { width: 3300, shade: "F1F5F9", bold: true }),
    cell(value, { width: 6300 })
  );
}

function table(rows, width = 9630) {
  return `
    <w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="${width}" w:type="dxa"/>
      </w:tblPr>
      ${rows.join("")}
    </w:tbl>
  `;
}

function sectionTitle(value) {
  return p(value, "Heading1");
}

function subTitle(value) {
  return p(value, "Heading2");
}

function kwh(value) {
  if (value === undefined || value === null || value === "") return "-";
  return `${Number(value || 0).toFixed(1)} kWh`;
}

function kwp(value) {
  if (value === undefined || value === null || value === "") return "-";
  return `${Number(value || 0).toFixed(2)} kWp`;
}

function years(value) {
  return value ? `${value} anos` : "-";
}

function optionTitle(option) {
  if (!option) return "-";
  if (option.key === "economica") return "Opcao economica";
  if (option.key === "premium") return "Opcao premium";
  return option.recommendation?.mode === "on-grid" ? "Opcao on-grid" : "Opcao hibrida";
}

function optionInverter(option) {
  return option?.inverter?.label ?? option?.equipment?.inverter?.label ?? "-";
}

function optionBattery(option) {
  const battery = option?.battery ?? option?.equipment?.battery;
  if (!battery || !battery.capacityKwh) return "Sem bateria";
  return battery.label ?? battery.model ?? "Bateria";
}

function optionBatteryCapacity(option) {
  const battery = option?.battery ?? option?.equipment?.battery;
  return battery?.capacityKwh ? `${battery.capacityKwh} kWh` : "-";
}

function optionPrice(option) {
  return option?.price ?? { net: 0, vat: 0, gross: 0 };
}

function optionRoi(option) {
  return option?.roi ?? {};
}

function costValue(option, key) {
  return option?.internalCosts?.[key] ?? option?.costs?.[key] ?? 0;
}

function sectionTotal(option, key) {
  return option?.price?.breakdown?.find((section) => section.key === key)?.total ?? 0;
}

function optionRows(option) {
  const price = optionPrice(option);
  const roi = optionRoi(option);
  return [
    keyValueRow("Solucao", optionTitle(option)),
    keyValueRow("Inversor", optionInverter(option)),
    keyValueRow("Bateria", optionBattery(option)),
    keyValueRow("Capacidade", optionBatteryCapacity(option)),
    keyValueRow("Preco sem IVA", money(price.net)),
    keyValueRow("IVA", money(price.vat)),
    keyValueRow("Preco com IVA", money(price.gross)),
    keyValueRow("Poupanca mensal", money(roi.monthlySavingsEur)),
    keyValueRow("Poupanca anual", money(roi.annualSavingsEur)),
    keyValueRow("ROI", years(roi.roiYears))
  ];
}

function costRows(option) {
  const structureNeedsVisit = (option?.flags ?? []).some((flag) => flag.area === "estrutura" && flag.type === "visita_tecnica");
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

  return rows.map(([label, value]) => keyValueRow(label, typeof value === "string" ? value : money(value)));
}

function notesFor(calculation) {
  return [
    "Proposta indicativa sujeita a validacao tecnica no local.",
    "Precos sujeitos a atualizacao de mercado.",
    "Nao inclui trabalhos de construcao civil ou alteracoes eletricas nao previstas.",
    "Painel 460W usado por defeito. Painel 595W disponivel para telhado sanduiche ou instalacao terrea quando escolhido/validado tecnicamente.",
    calculation.sizing?.needsTechnicalAnalysis ? "Consumo acima de 800 kWh/mes: recomenda-se analise tecnica." : null,
    ...(calculation.advice?.technicalFlags ?? []).map((flag) => flag.message),
    ...(calculation.recommendation?.notes ?? [])
  ].filter(Boolean);
}

function headerTable() {
  return table([
    row(
      cell("PROPOSTA FOTOVOLTAICA\nINDICATIVA\nDimensionamento e estimativa financeira", { width: 6500, shade: "0B3828", bold: true }),
      cell(`Data: ${new Date().toLocaleDateString("pt-PT")}\nValidade: ${process.env.PROPOSAL_VALID_DAYS || "15"} dias\nPrecos sujeitos a atualizacao`, { width: 3130, shade: "166534", bold: true })
    )
  ]);
}

function buildDocumentXml({ lead = {}, calculation = {}, options = {} }) {
  const price = calculation.price ?? {};
  const sizing = calculation.sizing ?? {};
  const equipment = calculation.equipment ?? {};
  const roi = calculation.roi ?? {};
  const recommendation = calculation.recommendation ?? {};
  const battery = equipment.battery ?? {};
  const consumption = calculation.consumption ?? sizing;
  const hybridPriceOptions = calculation.advice?.pricedOptions ?? [];
  const recommended = calculation;

  const leadRows = [
    keyValueRow("Nome", lead.name || "-"),
    keyValueRow("Email", lead.email || "-"),
    keyValueRow("Telefone", lead.phone || "-"),
    keyValueRow("Localidade", lead.locality || "-")
  ];

  const consumptionRows = [
    keyValueRow("Fatura mensal", money(consumption.monthlyBillEur)),
    keyValueRow("Consumo mensal", kwh(consumption.monthlyConsumptionKwh)),
    keyValueRow("Custo anual atual", money(consumption.annualCurrentCostEur)),
    keyValueRow("Perfil", recommendation.profile || lead.perfil_consumo || lead.consumptionPeriod || "-")
  ];

  const proposalRows = [
    keyValueRow("Sistema", recommendation.text || recommendation.mode || "-"),
    keyValueRow("Potencia alvo", kwp(sizing.targetKwp)),
    keyValueRow("Potencia real em paineis", kwp(sizing.actualPanelPowerKwp)),
    keyValueRow("Paineis", equipment.panelCount && equipment.panel ? `${equipment.panelCount} x ${equipment.panel.label}` : "-"),
    keyValueRow("Motivo", recommendation.source === "cliente" ? "Escolha indicada pelo cliente respeitada." : "Recomendacao baseada no consumo, perfil horario e objetivo.")
  ];

  const financialRows = [
    keyValueRow("Preco sem IVA", money(price.net)),
    keyValueRow("IVA", money(price.vat)),
    keyValueRow("Preco com IVA", money(price.gross)),
    keyValueRow("Poupanca mensal estimada", money(roi.monthlySavingsEur)),
    keyValueRow("Poupanca anual estimada", money(roi.annualSavingsEur)),
    keyValueRow("ROI estimado", years(roi.roiYears))
  ];

  const equipmentRows = [
    keyValueRow("Inversor", equipment.inverter?.label || equipment.inverter?.model || "-"),
    keyValueRow("Bateria", battery.capacityKwh ? battery.label : "Sem bateria"),
    keyValueRow("Capacidade", battery.capacityKwh ? `${battery.capacityKwh} kWh` : "-"),
    keyValueRow("Preco final", money(price.gross)),
    keyValueRow("ROI", years(roi.roiYears))
  ];

  const contextItems = [
    hybridPriceOptions.find((option) => option.key === "premium") ? "A opcao premium pode ter ROI mais longo, mas privilegia marca, compatibilidade e uma solucao orientada para autonomia/backup." : null,
    hybridPriceOptions.find((option) => option.key === "economica") ? "A opcao economica tende a privilegiar capacidade/preco e pode apresentar melhor retorno financeiro quando a bateria tem peso relevante." : null,
    "As opcoes nao sao boas ou mas por si: devem ser comparadas com o objetivo do cliente, o perfil de consumo e a visita tecnica."
  ].filter(Boolean);

  const freeRows = [
    keyValueRow("Ajustes comerciais", ""),
    keyValueRow("Condicoes especiais", ""),
    keyValueRow("Observacoes para visita tecnica", "")
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        ${headerTable()}
        ${p("Documento editavel interno - estrutura alinhada com o PDF enviado ao cliente.")}
        ${sectionTitle("Cliente")}
        ${table(leadRows)}
        ${sectionTitle("Consumo atual")}
        ${table(consumptionRows)}
        ${sectionTitle("Sistema recomendado")}
        ${table(proposalRows)}
        ${sectionTitle("Beneficio financeiro")}
        ${table(financialRows)}
        ${pageBreak()}
        ${sectionTitle("Comparacao de solucoes")}
        ${subTitle("Opcao on-grid")}
        ${table(optionRows(options.onGrid))}
        ${subTitle("Opcao hibrida")}
        ${table(optionRows(options.hybrid))}
        ${sectionTitle("Enquadramento")}
        ${contextItems.map((item) => p(`- ${item}`)).join("")}
        ${hybridPriceOptions.length ? pageBreak() : ""}
        ${hybridPriceOptions.length ? sectionTitle("Opcoes de bateria") : ""}
        ${hybridPriceOptions.slice(0, 2).map((option) => `${subTitle(optionTitle(option))}${table(optionRows(option))}`).join("")}
        ${pageBreak()}
        ${sectionTitle("Detalhe tecnico e financeiro")}
        ${subTitle("Detalhe de custos")}
        ${table(costRows(recommended))}
        ${subTitle("Equipamentos")}
        ${table(equipmentRows)}
        ${sectionTitle("Notas")}
        ${[...new Set(notesFor(calculation))].slice(0, 12).map((note) => p(`- ${note}`)).join("")}
        ${sectionTitle("Campos livres para edicao")}
        ${table(freeRows)}
        <w:sectPr>
          <w:pgSz w:w="11906" w:h="16838"/>
          <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
        </w:sectPr>
      </w:body>
    </w:document>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:style w:type="paragraph" w:styleId="Title">
        <w:name w:val="Title"/>
        <w:rPr><w:b/><w:sz w:val="34"/></w:rPr>
      </w:style>
      <w:style w:type="paragraph" w:styleId="Heading1">
        <w:name w:val="heading 1"/>
        <w:rPr><w:b/><w:sz w:val="26"/></w:rPr>
      </w:style>
      <w:style w:type="table" w:styleId="TableGrid">
        <w:name w:val="Table Grid"/>
        <w:tblPr><w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="D9E2EC"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="D9E2EC"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="D9E2EC"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="D9E2EC"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="D9E2EC"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="D9E2EC"/>
        </w:tblBorders></w:tblPr>
      </w:style>
    </w:styles>`;
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
    </Types>`;
}

function relsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>`;
}

function zip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = Buffer.from(entry.content, "utf8");
    const crc = crc32(data);

    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);

    localParts.push(local, data);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);

    centralParts.push(central);
    offset += local.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

export function buildProposalDocx({ lead, calculation, options } = {}) {
  return zip([
    { name: "[Content_Types].xml", content: contentTypesXml() },
    { name: "_rels/.rels", content: relsXml() },
    { name: "word/document.xml", content: buildDocumentXml({ lead, calculation, options }) },
    { name: "word/styles.xml", content: stylesXml() }
  ]);
}
