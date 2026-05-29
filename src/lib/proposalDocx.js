import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";

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

function normalizeText(value) {
  let text = String(value ?? "");
  const replacements = [
    ["ÃƒÆ’Ã‚â€¡", "Ã‡"], ["Ãƒâ€¡", "Ã‡"],
    ["ÃƒÆ’Ã¢â‚¬Â°", "Ã‰"], ["Ãƒâ€°", "Ã‰"],
    ["ÃƒÆ’Ã‚Â§", "Ã§"], ["ÃƒÂ§", "Ã§"],
    ["ÃƒÆ’Ã‚Â£", "Ã£"], ["ÃƒÂ£", "Ã£"],
    ["ÃƒÆ’Ã‚Âµ", "Ãµ"], ["ÃƒÂµ", "Ãµ"],
    ["ÃƒÆ’Ã‚Â¡", "Ã¡"], ["ÃƒÂ¡", "Ã¡"],
    ["ÃƒÆ’Ã‚Â©", "Ã©"], ["ÃƒÂ©", "Ã©"],
    ["ÃƒÆ’Ã‚Âª", "Ãª"], ["ÃƒÂª", "Ãª"],
    ["ÃƒÆ’Ã‚Â­", "Ã­"], ["ÃƒÂ­", "Ã­"],
    ["ÃƒÆ’Ã‚Â³", "Ã³"], ["ÃƒÂ³", "Ã³"],
    ["ÃƒÆ’Ã‚Âº", "Ãº"], ["ÃƒÂº", "Ãº"],
    ["ÃƒÆ’Ã‚Â", "Ã"], ["ÃƒÂ", "Ã"],
    ["ÃƒÆ’Ã¢â‚¬Â¡", "Ã‡"], ["ÃƒÆ’Ã†â€™O", "ÃƒO"], ["NÃƒÆ’O", "NÃƒO"],
    ["Ã¢â€šÂ¬", "â‚¬"], ["Ã¢Å“â€œ", "âœ“"], ["ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“", "âœ“"],
    ["\u00c3\u0087", "\u00c7"], ["\u00c3\u0089", "\u00c9"],
    ["\u00c3\u2021", "\u00c7"], ["\u00c3\u2030", "\u00c9"],
    ["\u00c3\u00a1", "\u00e1"], ["\u00c3\u00a2", "\u00e2"], ["\u00c3\u00a3", "\u00e3"],
    ["\u00c3\u00a7", "\u00e7"], ["\u00c3\u00a9", "\u00e9"], ["\u00c3\u00aa", "\u00ea"],
    ["\u00c3\u00ad", "\u00ed"], ["\u00c3\u00b3", "\u00f3"], ["\u00c3\u00ba", "\u00fa"],
    ["\u00c3\u00b5", "\u00f5"], ["\u00c3\u008d", "\u00cd"], ["\u00c2\u00ba", "\u00ba"],
    ["\u00c2\u00aa", "\u00aa"], ["\u00e2\u0082\u00ac", "\u20ac"], ["\u00e2\u201a\u00ac", "\u20ac"],
    ["\u00e2\u009c\u0093", "\u2713"], ["\u00e2\u0153\u201c", "\u2713"],
    ["N\u00c3\u0192O", "N\u00c3O"]
  ];
  for (let pass = 0; pass < 2; pass += 1) {
    for (const [bad, good] of replacements) {
      text = text.split(bad).join(good);
    }
  }
  const wordReplacements = [
    [/\bmonofasico\b/gi, "monofásico"],
    [/\btrifasico\b/gi, "trifásico"],
    [/\bhibrido_backup\b/gi, "Híbrido com backup"],
    [/\bhibrido\b/gi, "híbrido"],
    [/\bpreco\b/gi, "preço"],
    [/\bnao\b/gi, "não"],
    [/\bexpansao\b/gi, "expansão"],
    [/\bacrescimo\b/gi, "acréscimo"],
    [/\bdiario\b/gi, "diário"],
    [/\beletrica\b/gi, "elétrica"],
    [/\borcamento\b/gi, "orçamento"],
    [/\bapos\b/gi, "após"],
    [/\btecnica\b/gi, "técnica"],
    [/\bvalidacao\b/gi, "validação"],
    [/\bconstrucao\b/gi, "construção"],
    [/\balteracoes\b/gi, "alterações"],
    [/\bdisponivel\b/gi, "disponível"],
    [/\bsanduiche\b/gi, "sanduíche"],
    [/\binstalacao\b/gi, "instalação"],
    [/\bterrea\b/gi, "térrea"],
    [/\banalise\b/gi, "análise"],
    [/\bmes\b/gi, "mês"],
    [/\bpaineis\b/gi, "painéis"],
    [/\bincluido\b/gi, "incluído"],
    [/\bmao\b/gi, "mão"]
  ];
  for (const [bad, good] of wordReplacements) {
    text = text.replace(bad, good);
  }
  return text;
}

function escapeXml(value) {
  return normalizeText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function money(value) {
  if (value === undefined || value === null || value === "") return "-";
  return `${Number(value || 0).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Ã¢â€šÂ¬`;
}

function moneyShort(value) {
  if (value === undefined || value === null || value === "") return "-";
  return `${Number(value || 0).toLocaleString("pt-PT", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Ã¢â€šÂ¬`;
}

function p(value, style = null, { justify = false, bold = false, underline = false, color = null, align = null, size = null, before = null, after = null } = {}) {
  const styleXml = style ? `<w:pStyle w:val="${style}"/>` : "";
  const justifyXml = justify ? '<w:jc w:val="both"/>' : "";
  const alignXml = align ? `<w:jc w:val="${align}"/>` : "";
  const spacingXml = before || after ? `<w:spacing ${before ? `w:before="${before}"` : ""} ${after ? `w:after="${after}"` : ""}/>` : "";
  const colorXml = color ? `<w:color w:val="${color}"/>` : "";
  const boldXml = bold ? "<w:b/>" : "";
  const underlineXml = underline ? '<w:u w:val="single"/>' : "";
  const sizeXml = size ? `<w:sz w:val="${size}"/>` : "";
  return `
    <w:p>
      <w:pPr>${styleXml}${justifyXml}${alignXml}${spacingXml}</w:pPr>
      <w:r><w:rPr>${boldXml}${underlineXml}${colorXml}${sizeXml}</w:rPr><w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r>
    </w:p>
  `;
}

function pageBreak() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function cell(value, { width = 4500, shade = null, bold = false, color = null, align = "left", height = null, size = null, borderColor = "D9E2EC", padY = 85, padX = 140 } = {}) {
  const shadeXml = shade ? `<w:shd w:fill="${shade}"/>` : "";
  const heightXml = height ? `<w:trHeight w:val="${height}" w:hRule="atLeast"/>` : "";
  const boldXml = bold ? "<w:b/>" : "";
  const colorXml = color ? `<w:color w:val="${color}"/>` : "";
  const sizeXml = size ? `<w:sz w:val="${size}"/>` : "";
  return `
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="${width}" w:type="dxa"/>${shadeXml}${heightXml}
        <w:tcBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="${borderColor}"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="${borderColor}"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="${borderColor}"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="${borderColor}"/>
        </w:tcBorders>
        <w:tcMar><w:top w:w="${padY}" w:type="dxa"/><w:left w:w="${padX}" w:type="dxa"/><w:bottom w:w="${padY}" w:type="dxa"/><w:right w:w="${padX}" w:type="dxa"/></w:tcMar>
      </w:tcPr>
      <w:p><w:pPr><w:jc w:val="${align}"/></w:pPr><w:r><w:rPr>${boldXml}${colorXml}${sizeXml}</w:rPr><w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r></w:p>
    </w:tc>
  `;
}

function row(...cells) {
  return `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cells.join("")}</w:tr>`;
}

function keyValueRow(label, value) {
  return row(
    cell(label, { width: 3300, shade: "F3F7F4", bold: true, color: "0B3828", size: 20, padY: 85, padX: 140 }),
    cell(value, { width: 6300, shade: "FFFFFF", color: "17211B", size: 20, padY: 85, padX: 140 })
  );
}

function compactKeyValueRow(label, value) {
  return row(
    cell(label, { width: 3300, shade: "F3F7F4", bold: true, color: "0B3828", size: 19, padY: 75, padX: 130 }),
    cell(value, { width: 6300, shade: "FFFFFF", size: 19, padY: 75, padX: 130 })
  );
}

function table(rows, width = 9630, { shade = "FFFFFF" } = {}) {
  return `
    <w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="${width}" w:type="dxa"/>
        <w:tblLook w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
        <w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar>
        <w:shd w:fill="${shade}"/>
      </w:tblPr>
      ${rows.join("")}
    </w:tbl>
    <w:p><w:pPr><w:spacing w:after="180"/></w:pPr></w:p>
  `;
}

function borderlessTable(rows, width = 9630) {
  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="${width}" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/>
          <w:insideH w:val="nil"/><w:insideV w:val="nil"/>
        </w:tblBorders>
      </w:tblPr>
      ${rows.join("")}
    </w:tbl>
    <w:p><w:pPr><w:spacing w:after="160"/></w:pPr></w:p>
  `;
}

function sectionTitle(value) {
  return p(normalizeText(value).toUpperCase(), "Heading1", { bold: true, underline: true, before: 300, after: 180 });
}

function chapterTitle(value) {
  return p(normalizeText(value).toUpperCase(), "Heading1", { bold: true, underline: true, before: 260, after: 260 });
}

function subTitle(value) {
  return p(value, "Heading2", { bold: true });
}

function spacer() {
  return '<w:p><w:r><w:t> </w:t></w:r></w:p>';
}

function tightSpacer() {
  return '<w:p><w:pPr><w:spacing w:after="60"/></w:pPr><w:r><w:t> </w:t></w:r></w:p>';
}

function chapterSpacer() {
  return '<w:p><w:pPr><w:spacing w:after="260"/></w:pPr><w:r><w:t> </w:t></w:r></w:p>';
}

function paragraphSpacer() {
  return '<w:p><w:pPr><w:spacing w:before="160" w:after="160"/></w:pPr><w:r><w:t> </w:t></w:r></w:p>';
}

function smallNote(value) {
  return p(value, null, { color: "5D6A61", size: 18, after: 120 });
}

function premiumRule() {
  return borderlessTable([
    row(
      cell("", { width: 2400, shade: "F5B631", borderColor: "F5B631", height: 90 }),
      cell("", { width: 7230, shade: "DFF3E6", borderColor: "DFF3E6", height: 90 })
    )
  ]);
}

function objectiveBlock() {
  return `
    ${p("OBJETIVO DA PROPOSTA", null, { bold: true, underline: true, color: "0B3828", size: 22, before: 120, after: 70 })}
    ${p("Esta proposta foi preparada com base nos consumos fornecidos e pretende apresentar uma soluÃƒÂ§ÃƒÂ£o equilibrada entre investimento, poupanÃƒÂ§a, autonomia energÃƒÂ©tica e possibilidade de expansÃƒÂ£o futura.", null, { color: "39463F", size: 20, after: 140 })}
  `;
}

function bullet(value) {
  return p(`Ã¢Å“â€œ ${value}`, null, { color: "17211B", size: 21, after: 55 });
}

function mutedBullet(value) {
  return p(`- ${value}`, null, { color: "39463F", size: 21, after: 170 });
}

function twoColumnBullets(leftItems = [], rightItems = []) {
  const max = Math.max(leftItems.length, rightItems.length);
  const rows = [];
  for (let index = 0; index < max; index += 1) {
    rows.push(row(
      cell(leftItems[index] ? `Ã¢Å“â€œ ${leftItems[index]}` : " ", { width: 4815, shade: "FFFFFF", color: "17211B", borderColor: "FFFFFF" }),
      cell(rightItems[index] ? `- ${rightItems[index]}` : " ", { width: 4815, shade: "FFFFFF", color: "39463F", borderColor: "FFFFFF" })
    ));
  }
  return borderlessTable(rows);
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
  if (option.key === "economica") return "OpÃƒÂ§ÃƒÂ£o econÃƒÂ³mica";
  if (option.key === "premium") return "OpÃƒÂ§ÃƒÂ£o premium";
  return option.recommendation?.mode === "on-grid" ? "OpÃƒÂ§ÃƒÂ£o on-grid" : "OpÃƒÂ§ÃƒÂ£o hÃƒÂ­brida";
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
    row(cell(optionTitle(option), { width: 9630, shade: "0B3828", bold: true, color: "FFFFFF" })),
    keyValueRow("SoluÃƒÂ§ÃƒÂ£o", optionTitle(option)),
    keyValueRow("Inversor", optionInverter(option)),
    keyValueRow("Bateria", optionBattery(option)),
    keyValueRow("Capacidade", optionBatteryCapacity(option)),
    keyValueRow("PreÃƒÂ§o sem IVA", money(price.net)),
    keyValueRow("IVA", money(price.vat)),
    keyValueRow("PreÃƒÂ§o com IVA", money(price.gross)),
    keyValueRow("PoupanÃƒÂ§a mensal", money(roi.monthlySavingsEur)),
    keyValueRow("PoupanÃƒÂ§a anual", money(roi.annualSavingsEur)),
    keyValueRow("ROI", years(roi.roiYears))
  ];
}

function costRows(option) {
  const structureNeedsVisit = (option?.flags ?? []).some((flag) => flag.area === "estrutura" && flag.type === "visita_tecnica");
  const rows = [
    ["PainÃƒÂ©is", costValue(option, "panels")],
    ["Inversor", costValue(option, "inverter")],
    ["Bateria", costValue(option, "battery")],
    ["Estrutura", structureNeedsVisit ? "valor a definir apos visita tecnica" : costValue(option, "structure")],
    ["MÃƒÂ£o de obra", costValue(option, "labor") + costValue(option, "batteryLabor")],
    ["ProteÃƒÂ§ÃƒÂµes/elÃƒÂ©trica", costValue(option, "baseProtections") + costValue(option, "hybridProtections") + costValue(option, "backupManual")],
    ["Cabos/conectores", costValue(option, "dcCables") + costValue(option, "acCables") + costValue(option, "connectors")],
    ["Contador", costValue(option, "realTimeMeter")],
    ["EV", costValue(option, "evCharger") + costValue(option, "evProtections")],
    ["DeslocaÃƒÂ§ÃƒÂ£o", costValue(option, "travel")],
    ["IVA", sectionTotal(option, "vat") || optionPrice(option).vat],
    ["Total final", optionPrice(option).gross]
  ];

  return [
    row(
      cell("Componente", { width: 4300, shade: "0B3828", bold: true, color: "FFFFFF", padY: 110, padX: 150 }),
      cell("Valor", { width: 5330, shade: "0B3828", bold: true, color: "FFFFFF", align: "right", padY: 110, padX: 150 })
    ),
    ...rows.map(([label, value], index) => {
      const isTotal = label === "Total final";
      return row(
        cell(label, { width: 4300, shade: isTotal ? "0B3828" : index % 2 ? "FFFFFF" : "F8FAFC", bold: true, color: isTotal ? "FFFFFF" : "17211B", size: 20, padY: 85, padX: 140 }),
        cell(typeof value === "string" ? value : money(value), { width: 5330, shade: isTotal ? "DFF3E6" : index % 2 ? "FFFFFF" : "F8FAFC", align: "right", bold: isTotal, color: isTotal ? "0B3828" : "17211B", size: 20, padY: 85, padX: 140 })
      );
    })
  ];
}

function detailKeyValueRow(label, value, index = 0) {
  return row(
    cell(label, { width: 4300, shade: index % 2 ? "FFFFFF" : "F8FAFC", bold: true, color: "17211B", size: 20, padY: 85, padX: 140 }),
    cell(value, { width: 5330, shade: index % 2 ? "FFFFFF" : "F8FAFC", color: "17211B", size: 20, padY: 85, padX: 140 })
  );
}

function notesFor(calculation) {
  const preferredPanelNote = "Painel 460W usado por defeito. Painel 595W disponÃƒÆ’Ã‚Â­vel para telhado sanduÃƒÆ’Ã‚Â­che ou instalaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o tÃƒÆ’Ã‚Â©rrea quando escolhido/validado tecnicamente.";
  const notes = [
    "Proposta sujeita a validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o tÃƒÆ’Ã‚Â©cnica no local.",
    "PreÃƒÆ’Ã‚Â§os sujeitos a atualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de mercado.",
    "NÃƒÆ’Ã‚Â£o inclui trabalhos de construÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o civil ou alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes elÃƒÆ’Ã‚Â©tricas nÃƒÆ’Ã‚Â£o previstas.",
    preferredPanelNote,
    calculation.sizing?.needsTechnicalAnalysis ? "Consumo acima de 800 kWh/mÃƒÆ’Ã‚Âªs: recomenda-se anÃƒÆ’Ã‚Â¡lise tÃƒÆ’Ã‚Â©cnica." : null,
    ...(calculation.advice?.technicalFlags ?? []).map((flag) => flag.message),
    ...(calculation.recommendation?.notes ?? [])
  ].filter(Boolean);

  let panelNoteAdded = false;
  return notes.filter((note) => {
    const normalized = normalizeText(note).toLowerCase();
    const isPanelNote = normalized.includes("painel 460w") || normalized.includes("painel 595w") || normalized.includes("595w disponÃ­vel") || normalized.includes("595w disponivel");
    if (!isPanelNote) return true;
    if (panelNoteAdded) return false;
    panelNoteAdded = true;
    return true;
  });
}
function logoXml() {
  return `
    <w:p>
      <w:pPr><w:spacing w:before="80" w:after="160"/></w:pPr>
      <w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
            <wp:extent cx="2468880" cy="1288447"/>
            <wp:docPr id="1" name="SolexR"/>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:nvPicPr><pic:cNvPr id="1" name="logo-solexr-header.png"/><pic:cNvPicPr/></pic:nvPicPr>
                  <pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
                  <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="2468880" cy="1288447"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>
  `;
}

function coverHeader(lead = {}) {
  return borderlessTable([
    row(
      cell("ORÃƒâ€¡AMENTO TÃƒâ€°CNICO FOTOVOLTAICO", { width: 6500, shade: "FFFFFF", bold: true, color: "0B3828", size: 40, borderColor: "FFFFFF" }),
      cell(`Data: ${new Date().toLocaleDateString("pt-PT")}\nValidade: ${process.env.PROPOSAL_VALID_DAYS || "15"} dias\nContacto: 969 880 053`, { width: 3130, shade: "F7FAF7", bold: true, color: "0B3828", align: "right", borderColor: "E6EFE8", height: 980 })
    ),
    row(
      cell("SoluÃƒÂ§ÃƒÂ£o personalizada de autoconsumo e backup energÃƒÂ©tico", { width: 6500, shade: "FFFFFF", color: "166534", size: 24, borderColor: "FFFFFF" }),
      cell(`Cliente: ${lead.name || "-"}\nLocalidade: ${lead.locality || "-"}`, { width: 3130, shade: "FFFFFF", bold: true, color: "39463F", align: "right", borderColor: "FFFFFF" })
    )
  ]);
}

function highlightTable(rows) {
  return table(rows.map(([label, value], index) => row(
    cell(label, { width: 3600, shade: index === rows.length - 1 ? "166534" : "EEF3F0", bold: true, color: index === rows.length - 1 ? "FFFFFF" : "0B3828" }),
    cell(value, { width: 6030, shade: index === rows.length - 1 ? "DFF3E6" : "FFFFFF", bold: index === rows.length - 1, color: "0B3828", align: "right" })
  )));
}

function freeEditRow(label) {
  return row(
    cell(`${label}:\n______________________________________________________________`, { width: 9630, shade: "FFFFFF", bold: true, color: "0B3828", height: 850, borderColor: "D9E2EC" })
  );
}

function metricCell(label, value, { accent = false } = {}) {
  return cell(`${label}\n${value}`, {
    width: 2400,
    shade: accent ? "0B3828" : "F3F7F4",
    color: accent ? "FFFFFF" : "0B3828",
    bold: true,
    align: "center",
    height: 1100,
    size: accent ? 24 : 22,
    borderColor: accent ? "0B3828" : "D9E2EC"
  });
}

function mainSystemName({ recommendation, equipment, battery }) {
  const inverter = friendlyInverterName({ recommendation, equipment });
  const batteryText = battery.capacityKwh ? battery.label : "";
  const base = recommendation.text || recommendation.mode || "";
  const joined = [inverter, batteryText].filter(Boolean).join(" + ");
  if (base && joined && base.toLowerCase().includes(inverter.toLowerCase())) return base;
  return joined || base || "Sistema fotovoltaico";
}

function friendlyInverterName({ recommendation = {}, equipment = {} } = {}) {
  const raw = `${equipment.inverter?.label || equipment.inverter?.model || ""} ${recommendation.mode || ""}`.toLowerCase();
  if (raw.includes("goodwe") && (raw.includes("hibr") || raw.includes("hybrid"))) return "GoodWe monofásico híbrido";
  if (raw.includes("goodwe") && (raw.includes("on-grid") || raw.includes("ongrid"))) return "GoodWe monofásico on-grid";
  return equipment.inverter?.label || equipment.inverter?.model || "-";
}

function friendlySystemType({ recommendation = {}, lead = {} } = {}) {
  const mode = String(recommendation.mode || "").toLowerCase();
  const goal = String(lead.objetivo || lead.goal || "").toLowerCase();
  if (mode.includes("hibr") && goal.includes("backup")) return "Híbrido com backup";
  if (mode.includes("hibr")) return "Híbrido com armazenamento";
  if (mode.includes("on")) return "On-grid";
  return recommendation.mode || "-";
}

function heroMetric(label, value, { accent = false } = {}) {
  return cell(`${label}\n${value}`, {
    width: 3210,
    shade: accent ? "0B3828" : "F3F7F4",
    color: accent ? "FFFFFF" : "0B3828",
    bold: true,
    align: "center",
    height: 1180,
    size: accent ? 30 : 27,
    borderColor: accent ? "0B3828" : "D9E2EC"
  });
}

function configRow(label, value) {
  return row(
    cell(label, { width: 3300, shade: "F7FAF7", bold: true, color: "0B3828", borderColor: "E3ECE5", size: 20, padY: 85, padX: 140 }),
    cell(value, { width: 6330, shade: "FFFFFF", color: "17211B", borderColor: "E3ECE5", size: 20, padY: 85, padX: 140 })
  );
}

function configurationTable({ recommendation, sizing, equipment, battery, lead }) {
  const batteryText = battery.capacityKwh ? battery.label : "Sem bateria";
  const panelText = equipment.panelCount && equipment.panel ? `${equipment.panelCount} x ${equipment.panel.label}` : "-";
  const systemType = friendlySystemType({ recommendation, lead });
  return table([
    configRow("PotÃƒÂªncia instalada", kwp(sizing.actualPanelPowerKwp || sizing.targetKwp)),
    configRow("PainÃƒÂ©is solares", panelText),
    configRow("Inversor", friendlyInverterName({ recommendation, equipment })),
    configRow("Bateria", batteryText),
    configRow("Tipo de sistema", systemType)
  ]);
}

function coverSystemBlock({ recommendation, sizing, equipment, battery, price, roi }) {
  const systemName = mainSystemName({ recommendation, equipment, battery });
  return `
    ${p("SISTEMA RECOMENDADO", null, { bold: true, underline: true, color: "0B3828", size: 25, before: 120, after: 90 })}
    ${p(systemName, null, { bold: true, color: "0B3828", size: 31, after: 120 })}
    ${borderlessTable([
      row(
        heroMetric("INVESTIMENTO TOTAL", moneyShort(price.gross), { accent: true }),
        heroMetric("POUPANÃƒâ€¡A ANUAL ESTIMADA", moneyShort(roi.annualSavingsEur)),
        heroMetric("RETORNO ESTIMADO", years(roi.roiYears))
      )
    ])}
  `;
}

function systemHighlightTable({ recommendation, sizing, equipment, battery, price, roi }) {
  const systemName = mainSystemName({ recommendation, equipment, battery });
  const batteryText = battery.capacityKwh ? battery.label : "Sem bateria";
  const panelText = equipment.panelCount && equipment.panel ? `${equipment.panelCount} x ${equipment.panel.label}` : "-";
  return table([
    row(cell("SISTEMA RECOMENDADO", { width: 9630, shade: "0B3828", bold: true, color: "FFFFFF", size: 24, align: "center" })),
    row(cell(systemName, { width: 9630, shade: "EFF7F2", bold: true, color: "0B3828", size: 28, align: "center", height: 900 })),
    row(
      metricCell("PotÃƒÂªncia", kwp(sizing.actualPanelPowerKwp || sizing.targetKwp)),
      metricCell("PainÃƒÂ©is", panelText),
      metricCell("Bateria", batteryText),
      metricCell("Investimento", moneyShort(price.gross), { accent: true })
    ),
    row(
      metricCell("PoupanÃƒÂ§a anual", moneyShort(roi.annualSavingsEur)),
      metricCell("PoupanÃƒÂ§a mensal", moneyShort(roi.monthlySavingsEur)),
      metricCell("Retorno", years(roi.roiYears)),
      metricCell("Estado", "Base editÃƒÂ¡vel", { accent: true })
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
  const consumption = calculation.consumption ?? sizing;  const recommended = calculation;

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
    keyValueRow("Perfil de utilizaÃƒÂ§ÃƒÂ£o", recommendation.profile || lead.perfil_consumo || lead.consumptionPeriod || "-")
  ];

  const equipmentRows = [
    detailKeyValueRow("Inversor", friendlyInverterName({ recommendation, equipment }), 0),
    detailKeyValueRow("Bateria", battery.capacityKwh ? battery.label : "Sem bateria", 1),
    detailKeyValueRow("Capacidade", battery.capacityKwh ? `${battery.capacityKwh} kWh` : "-", 2),
    detailKeyValueRow("Preço final", money(price.gross), 3),
    detailKeyValueRow("ROI", years(roi.roiYears), 4)
  ];
  const recommendationItems = [
    "Maior autonomia energÃƒÂ©tica",
    "Melhor aproveitamento da produÃƒÂ§ÃƒÂ£o solar",
    "ReduÃƒÂ§ÃƒÂ£o da dependÃƒÂªncia da rede",
    "SoluÃƒÂ§ÃƒÂ£o preparada para backup",
    "Excelente equilÃƒÂ­brio entre investimento, capacidade e retorno"
  ];

  const recommendationText = "A soluÃƒÂ§ÃƒÂ£o hÃƒÂ­brida permite aumentar o aproveitamento da energia produzida durante o dia, armazenando excedentes para utilizaÃƒÂ§ÃƒÂ£o em perÃƒÂ­odos de maior consumo ou menor produÃƒÂ§ÃƒÂ£o solar.";

  const includedItems = [
    "Fornecimento de equipamentos principais",
    "Estrutura de fixaÃƒÂ§ÃƒÂ£o",
    "InstalaÃƒÂ§ÃƒÂ£o elÃƒÂ©trica",
    "ParametrizaÃƒÂ§ÃƒÂ£o do sistema",
    "ConfiguraÃƒÂ§ÃƒÂ£o da APP",
    "LegalizaÃƒÂ§ÃƒÂ£o",
    "Testes finais e colocaÃƒÂ§ÃƒÂ£o em funcionamento"
  ];

  const notIncludedItems = [
    "ConstruÃƒÂ§ÃƒÂ£o civil",
    "AlteraÃƒÂ§ÃƒÂµes nÃƒÂ£o previstas",
    "ReparaÃƒÂ§ÃƒÂµes de telhado",
    "Infraestruturas adicionais"
  ].filter(Boolean);

  const freeRows = [
    freeEditRow("Ajustes comerciais"),
    freeEditRow("CondiÃƒÂ§ÃƒÂµes especiais"),
    freeEditRow("ObservaÃƒÂ§ÃƒÂµes tÃƒÂ©cnicas"),
    freeEditRow("Notas para instalaÃƒÂ§ÃƒÂ£o")
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <w:body>
        ${logoXml()}
        ${coverHeader(lead)}
        ${premiumRule()}
        ${smallNote("Documento interno SolexR para edi\u00e7\u00e3o comercial e t\u00e9cnica.")}
        ${p("Solu\u00e7\u00e3o dimensionada para maximizar autoconsumo, autonomia e poupan\u00e7a, com possibilidade de backup energ\u00e9tico em caso de falha da rede.", null, { color: "39463F", size: 22, after: 180 })}
        ${objectiveBlock()}
        ${pageBreak()}
        ${chapterTitle("Configura\u00e7\u00e3o principal")}
        ${configurationTable({ recommendation, sizing, equipment, battery, lead })}
        ${coverSystemBlock({ recommendation, sizing, equipment, battery, price, roi })}
        ${sectionTitle("Benef\u00edcios da solu\u00e7\u00e3o")}
        ${[
          "Redu\u00e7\u00e3o significativa da fatura el\u00e9trica",
          "Maior aproveitamento da produ\u00e7\u00e3o solar",
          "Armazenamento para consumo fora das horas solares",
          "Sistema preparado para backup e expans\u00e3o futura"
        ].map((item) => bullet(item)).join("")}
        ${pageBreak()}
        ${chapterTitle("Porque recomendamos esta solu\u00e7\u00e3o")}
        ${p(recommendationText, null, { justify: true, color: "39463F", size: 21, after: 120 })}
        ${recommendationItems.map((item) => bullet(item)).join("")}
        ${chapterSpacer()}
        ${sectionTitle("Cliente e consumo atual")}
        ${table(leadRows)}
        ${table(consumptionRows)}
        ${sectionTitle("Detalhe t\u00e9cnico e financeiro")}
        ${table(costRows(recommended))}
        ${sectionTitle("Equipamentos")}
        ${table(equipmentRows)}
        ${pageBreak()}
        ${chapterTitle("Trabalhos inclu\u00eddos")}
        ${borderlessTable([
          row(
            cell("TRABALHOS INCLU\u00cdDOS", { width: 4815, shade: "F7FAF7", bold: true, color: "0B3828", borderColor: "E3ECE5" }),
            cell("N\u00c3O INCLU\u00cdDO", { width: 4815, shade: "F7FAF7", bold: true, color: "0B3828", borderColor: "E3ECE5" })
          )
        ])}
        ${twoColumnBullets(includedItems, notIncludedItems)}
        ${sectionTitle("Notas t\u00e9cnicas e comerciais")}
        ${[...new Set(notesFor(calculation))].slice(0, 12).map((note) => mutedBullet(note)).join("")}
        ${paragraphSpacer()}
        ${sectionTitle("ZONA DE EDI\u00c7\u00c3O INTERNA SOLEXR")}
        ${table(freeRows)}
        ${chapterSpacer()}
        ${premiumRule()}
        ${p("SolexR. Energias Renov\u00e1veis", null, { bold: true, color: "0B3828", size: 30, before: 180, after: 60 })}
        ${p("www.solexr.pt  |  orcamentos@solexr.pt  |  969 880 053", null, { color: "39463F", size: 20, after: 120 })}
        ${p("Agradecemos a oportunidade de apresentar esta solu\u00e7\u00e3o energ\u00e9tica personalizada.", null, { color: "39463F", size: 20, after: 160 })}
        <w:sectPr>
          <w:pgSz w:w="11906" w:h="16838"/>
          <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/>
        </w:sectPr>
      </w:body>
    </w:document>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:docDefaults>
        <w:rPrDefault>
          <w:rPr>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:cs="Aptos"/>
            <w:sz w:val="22"/>
            <w:color w:val="1F2933"/>
          </w:rPr>
        </w:rPrDefault>
        <w:pPrDefault>
          <w:pPr>
            <w:spacing w:after="150" w:line="292" w:lineRule="auto"/>
          </w:pPr>
        </w:pPrDefault>
      </w:docDefaults>
      <w:style w:type="paragraph" w:styleId="Title">
        <w:name w:val="Title"/>
        <w:pPr><w:spacing w:after="180"/></w:pPr>
        <w:rPr><w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display"/><w:b/><w:color w:val="0B3828"/><w:sz w:val="34"/></w:rPr>
      </w:style>
      <w:style w:type="paragraph" w:styleId="Heading1">
        <w:name w:val="heading 1"/>
        <w:pPr><w:spacing w:before="420" w:after="190"/><w:keepNext/></w:pPr>
        <w:rPr><w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display"/><w:b/><w:color w:val="0B3828"/><w:sz w:val="30"/></w:rPr>
      </w:style>
      <w:style w:type="paragraph" w:styleId="Heading2">
        <w:name w:val="heading 2"/>
        <w:pPr><w:spacing w:before="280" w:after="130"/><w:keepNext/></w:pPr>
        <w:rPr><w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display"/><w:b/><w:color w:val="166534"/><w:sz w:val="24"/></w:rPr>
      </w:style>
      <w:style w:type="table" w:styleId="TableGrid">
        <w:name w:val="Table Grid"/>
        <w:tblPr>
          <w:tblCellMar><w:top w:w="140" w:type="dxa"/><w:left w:w="160" w:type="dxa"/><w:bottom w:w="140" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tblCellMar>
          <w:tblBorders>
            <w:top w:val="single" w:sz="6" w:space="0" w:color="D9E2EC"/>
            <w:left w:val="single" w:sz="6" w:space="0" w:color="D9E2EC"/>
            <w:bottom w:val="single" w:sz="6" w:space="0" w:color="D9E2EC"/>
            <w:right w:val="single" w:sz="6" w:space="0" w:color="D9E2EC"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E5EAF0"/>
            <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E5EAF0"/>
          </w:tblBorders>
        </w:tblPr>
      </w:style>
    </w:styles>`;
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Default Extension="png" ContentType="image/png"/>
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

function documentRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo-solexr-header.png"/>
    </Relationships>`;
}

function logoBuffer() {
  const candidates = [
    join(process.cwd(), "assets", "logo-solexr-header.png"),
    join(process.cwd(), "public", "logo-solexr-header.png")
  ];
  for (const candidate of candidates) {
    try {
      return readFileSync(candidate);
    } catch {
      // Try next known asset location.
    }
  }
  return null;
}

function templateBuffer() {
  const candidates = [
    join(process.cwd(), "src", "lib", "templates", "solexr-proposta-template.docx")
  ];
  for (const candidate of candidates) {
    try {
      return readFileSync(candidate);
    } catch {
      // Fall back to the generated DOCX package if the template is unavailable.
    }
  }
  return null;
}

function unzip(buffer) {
  const entries = [];
  let offset = 0;

  while (offset < buffer.length - 4) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) {
      offset += 1;
      continue;
    }

    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const name = buffer.slice(offset + 30, offset + 30 + nameLength).toString("utf8");
    const dataStart = offset + 30 + nameLength + extraLength;
    const compressed = buffer.slice(dataStart, dataStart + compressedSize);
    const content = method === 8 ? inflateRawSync(compressed) : compressed;

    entries.push({ name, content });
    offset = dataStart + compressedSize;
  }

  return entries;
}

function docxEntriesFromTemplate({ lead, calculation, options }) {
  const template = templateBuffer();
  if (!template) return null;

  const entries = unzip(template);
  const logo = logoBuffer();
  const templateDocument = entries.find((entry) => entry.name === "word/document.xml")?.content.toString("utf8");
  const replacements = new Map([
    ["word/document.xml", templateDocument ? fillTemplateDocumentXml(templateDocument, { lead, calculation, options }) : buildDocumentXml({ lead, calculation, options })]
  ]);

  if (logo) {
    replacements.set("word/media/image1.png", logo);
  }

  const merged = entries.map((entry) => ({
    name: entry.name,
    content: replacements.get(entry.name) ?? entry.content
  }));

  for (const [name, content] of replacements) {
    if (!merged.some((entry) => entry.name === name)) {
      merged.push({ name, content });
    }
  }

  return merged;
}

function replaceXmlText(xml, oldValue, newValue) {
  const escapedOld = escapeXml(oldValue);
  const escapedNew = escapeXml(newValue);
  return xml.split(`>${escapedOld}<`).join(`>${escapedNew}<`);
}

function replaceXmlTextSequential(xml, oldValue, newValues) {
  const escapedOld = escapeXml(oldValue);
  let index = 0;
  return xml.replaceAll(`>${escapedOld}<`, () => {
    const value = newValues[index] ?? newValues.at(-1) ?? oldValue;
    index += 1;
    return `>${escapeXml(value)}<`;
  });
}

function fillTemplateDocumentXml(xml, { lead = {}, calculation = {} }) {
  const price = calculation.price ?? {};
  const sizing = calculation.sizing ?? {};
  const equipment = calculation.equipment ?? {};
  const roi = calculation.roi ?? {};
  const recommendation = calculation.recommendation ?? {};
  const battery = equipment.battery ?? {};
  const consumption = calculation.consumption ?? sizing;
  const panelText = equipment.panelCount && equipment.panel ? `${equipment.panelCount} x ${equipment.panel.label}` : "-";
  const batteryText = battery.capacityKwh ? battery.label : "Sem bateria";
  const systemName = mainSystemName({ recommendation, equipment, battery });
  const systemType = friendlySystemType({ recommendation, lead });
  const currentCostRows = costRows(calculation);
  const costMap = new Map([
    ["Painéis", currentCostRows[1]],
    ["Inversor", currentCostRows[2]],
    ["Bateria", currentCostRows[3]],
    ["Estrutura", currentCostRows[4]],
    ["Mão de obra", currentCostRows[5]],
    ["Proteções/elétrica", currentCostRows[6]],
    ["Cabos/conectores", currentCostRows[7]],
    ["Contador", currentCostRows[8]],
    ["EV", currentCostRows[9]],
    ["Deslocação", currentCostRows[10]],
    ["IVA", currentCostRows[11]],
    ["Total final", currentCostRows[12]]
  ]);
  const costValueFromRow = (label) => {
    const rowXml = costMap.get(label) ?? "";
    const matches = [...rowXml.matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g)].map((match) => match[1]);
    return matches.at(-1) ?? "-";
  };

  const values = [
    ["Data: 29/05/2026 Validade: 15 dias Contacto: 969 880 053", `Data: ${new Date().toLocaleDateString("pt-PT")} Validade: ${process.env.PROPOSAL_VALID_DAYS || "15"} dias Contacto: 969 880 053`],
    ["Cliente: Cliente Teste Localidade: Leiria", `Cliente: ${lead.name || "-"} Localidade: ${lead.locality || "-"}`],
    ["3.22 kWp", kwp(sizing.actualPanelPowerKwp || sizing.targetKwp)],
    ["7 x Painel standard 460W", panelText],
    ["GoodWe monofásico híbrido", friendlyInverterName({ recommendation, equipment })],
    ["Lynx U G3 / LX U5.0-30 5.12kWh", batteryText],
    ["Híbrido com backup", systemType],
    ["GoodWe monofásico híbrido + Lynx U G3 / LX U5.0-30 5.12kWh", systemName],
    ["INVESTIMENTO TOTAL 4785 €", `INVESTIMENTO TOTAL ${moneyShort(price.gross)}`],
    ["POUPANÇA ANUAL ESTIMADA 934 €", `POUPANÇA ANUAL ESTIMADA ${moneyShort(roi.annualSavingsEur)}`],
    ["RETORNO ESTIMADO 5.1 anos", `RETORNO ESTIMADO ${years(roi.roiYears)}`],
    ["Cliente Teste", lead.name || "-"],
    ["cliente@teste.pt", lead.email || "-"],
    ["900000000", lead.phone || "-"],
    ["Leiria", lead.locality || "-"],
    ["180,00 €", money(consumption.monthlyBillEur)],
    ["450.0 kWh", kwh(consumption.monthlyConsumptionKwh)],
    ["2160,00 €", money(consumption.annualCurrentCostEur)],
    ["equilibrado", recommendation.profile || lead.perfil_consumo || lead.consumptionPeriod || "-"],
    ["504,00 €", costValueFromRow("Painéis")],
    ["999,00 €", costValueFromRow("Inversor")],
    ["1300,00 €", costValueFromRow("Bateria")],
    ["280,00 €", costValueFromRow("Estrutura")],
    ["580,00 €", costValueFromRow("Mão de obra")],
    ["225,00 €", costValueFromRow("Proteções/elétrica")],
    ["2,60 €", costValueFromRow("Cabos/conectores")],
    ["894,84 €", costValueFromRow("IVA")],
    ["4785,44 €", money(price.gross)],
    ["5.12 kWh", battery.capacityKwh ? `${battery.capacityKwh} kWh` : "-"],
    ["5.1 anos", years(roi.roiYears)]
  ];

  let output = xml;
  for (const [oldValue, newValue] of values) {
    output = replaceXmlText(output, oldValue, normalizeText(newValue));
  }
  output = replaceXmlTextSequential(output, "0,00 €", [
    costValueFromRow("Contador"),
    costValueFromRow("EV"),
    costValueFromRow("Deslocação")
  ]);
  return output;
}

function zip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content, "utf8");
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
  const templateEntries = docxEntriesFromTemplate({ lead, calculation, options });
  if (templateEntries) {
    return zip(templateEntries);
  }

  const logo = logoBuffer();
  const entries = [
    { name: "[Content_Types].xml", content: contentTypesXml() },
    { name: "_rels/.rels", content: relsXml() },
    { name: "word/_rels/document.xml.rels", content: documentRelsXml() },
    { name: "word/document.xml", content: buildDocumentXml({ lead, calculation, options }) },
    { name: "word/styles.xml", content: stylesXml() }
  ];
  if (logo) {
    entries.push({ name: "word/media/logo-solexr-header.png", content: logo });
  }
  return zip(entries);
}
