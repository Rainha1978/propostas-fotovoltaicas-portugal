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

function cell(value) {
  return `<w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/></w:tcPr>${p(value)}</w:tc>`;
}

function row(label, value) {
  return `<w:tr>${cell(label)}${cell(value)}</w:tr>`;
}

function table(rows) {
  return `
    <w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="0" w:type="auto"/>
      </w:tblPr>
      ${rows.join("")}
    </w:tbl>
  `;
}

function optionSummary(option) {
  if (!option) return "-";
  return [
    option.recommendation?.mode ?? option.key ?? "Opcao",
    option.sizing?.actualPanelPowerKwp ? `${option.sizing.actualPanelPowerKwp} kWp reais` : null,
    option.equipment?.panelCount ? `${option.equipment.panelCount} paineis` : null,
    option.price?.gross ? money(option.price.gross) : null
  ].filter(Boolean).join(" | ");
}

function buildDocumentXml({ lead = {}, calculation = {}, options = {} }) {
  const price = calculation.price ?? {};
  const sizing = calculation.sizing ?? {};
  const equipment = calculation.equipment ?? {};
  const roi = calculation.roi ?? {};
  const recommendation = calculation.recommendation ?? {};
  const battery = equipment.battery ?? {};

  const leadRows = [
    row("Nome", lead.name || "-"),
    row("Email", lead.email || "-"),
    row("Telefone", lead.phone || "-"),
    row("Localidade", lead.locality || "-"),
    row("Tipo de telhado", lead.tipo_telhado || lead.roofType || "-"),
    row("Tipo de rede", lead.rede || lead.gridType || "-"),
    row("Perfil de consumo", lead.perfil_consumo || lead.consumptionPeriod || "-"),
    row("Observacoes", lead.notes || "-")
  ];

  const proposalRows = [
    row("Solucao recomendada", recommendation.text || recommendation.mode || "-"),
    row("Potencia recomendada", sizing.targetKwp ? `${sizing.targetKwp} kWp` : "-"),
    row("Potencia real em paineis", sizing.actualPanelPowerKwp ? `${sizing.actualPanelPowerKwp} kWp` : "-"),
    row("Paineis", equipment.panelCount && equipment.panel ? `${equipment.panelCount} x ${equipment.panel.label}` : "-"),
    row("Inversor", equipment.inverter?.label || equipment.inverter?.model || "-"),
    row("Bateria", battery.capacityKwh ? battery.label : "Sem bateria"),
    row("Preco sem IVA", money(price.net)),
    row("IVA", money(price.vat)),
    row("Preco com IVA", money(price.gross)),
    row("Poupanca anual estimada", money(roi.annualSavingsEur)),
    row("ROI estimado", roi.roiYears ? `${roi.roiYears} anos` : "-")
  ];

  const optionRows = [
    row("Opcao on-grid", optionSummary(options.onGrid)),
    row("Opcao hibrida", optionSummary(options.hybrid))
  ];

  const notes = [
    ...(recommendation.notes ?? []),
    ...(calculation.advice?.technicalFlags ?? []).map((flag) => flag.message)
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        ${p("Proposta Fotovoltaica SolexR - Documento editavel", "Title")}
        ${p("Documento interno gerado automaticamente para edicao comercial.")}
        ${p("Cliente", "Heading1")}
        ${table(leadRows)}
        ${p("Resumo da proposta", "Heading1")}
        ${table(proposalRows)}
        ${p("Comparacao de solucoes", "Heading1")}
        ${table(optionRows)}
        ${p("Notas para validacao/edicao", "Heading1")}
        ${(notes.length ? notes : ["Sem notas adicionais."]).map((note) => p(`- ${note}`)).join("")}
        ${p("Campos livres para edicao", "Heading1")}
        ${p("Ajustes comerciais:")}
        ${p("Condicoes especiais:")}
        ${p("Observacoes para visita tecnica:")}
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
