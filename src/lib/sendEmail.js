import nodemailer from "nodemailer";

const FROM_EMAIL = "SolexR Simulador <simulador@solexr.pt>";
const SIMULADOR_EMAIL = "simulador@solexr.pt";
const WHATSAPP_LINK = "https://wa.me/351969880053?text=Ol%C3%A1%2C%20recebi%20a%20minha%20simula%C3%A7%C3%A3o%20fotovoltaica%20e%20quero%20falar%20sobre%20o%20or%C3%A7amento.";

function getTransporter() {
  const port = Number(process.env.SMTP_PORT || 465);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

function formatValue(value, suffix = "") {
  if (value === undefined || value === null || value === "") return "-";
  return `${value}${suffix}`;
}

function formatMoney(value) {
  if (value === undefined || value === null || value === "") return "-";
  return `${Number(value).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
}

function buildInternalEmailHtml({ lead = {}, calculation = {} }) {
  const simulationDate = lead.createdAt || lead.created_at || new Date().toISOString();
  const monthlyConsumption = calculation.sizing?.monthlyConsumptionKwh ?? lead.consumo_mensal_kwh ?? lead.monthlyConsumptionKwh;
  const suggestedPower = calculation.sizing?.actualPanelPowerKwp ?? calculation.sizing?.targetKwp;
  const estimatedValue = calculation.price?.gross;

  return `
    <p>Nova simula&ccedil;&atilde;o recebida no simulador SolexR.</p>
    <ul>
      <li><strong>Nome:</strong> ${formatValue(lead.name)}</li>
      <li><strong>Email:</strong> ${formatValue(lead.email)}</li>
      <li><strong>Telefone:</strong> ${formatValue(lead.phone)}</li>
      <li><strong>Localidade:</strong> ${formatValue(lead.locality)}</li>
      <li><strong>Consumo:</strong> ${formatValue(monthlyConsumption, " kWh/mes")}</li>
      <li><strong>Pot&ecirc;ncia sugerida:</strong> ${formatValue(suggestedPower, " kWp")}</li>
      <li><strong>Valor estimado:</strong> ${formatMoney(estimatedValue)}</li>
      <li><strong>Data da simula&ccedil;&atilde;o:</strong> ${new Date(simulationDate).toLocaleString("pt-PT")}</li>
    </ul>
  `;
}

export async function sendEmail(clienteEmail, pdfBuffer, { lead = {}, calculation = {} } = {}) {
  const results = { cliente: "skipped", simulador: "skipped" };

  const transporter = getTransporter();

  if (clienteEmail) {
    try {
      await transporter.sendMail({
        from: FROM_EMAIL,
        to: clienteEmail,
        replyTo: SIMULADOR_EMAIL,
        subject: "A sua simulação fotovoltaica SolexR",
        html: `
          <p>Ol&aacute;,</p>
          <p>Obrigado por utilizar o simulador fotovoltaico da SolexR.</p>
          <p>Segue em anexo a sua simula&ccedil;&atilde;o inicial em PDF.</p>
          <p>
            Esta simula&ccedil;&atilde;o &eacute; uma estimativa autom&aacute;tica e pode variar conforme consumo real,
            orienta&ccedil;&atilde;o do telhado, sombras, estrutura, pot&ecirc;ncia contratada e condi&ccedil;&otilde;es da instala&ccedil;&atilde;o.
          </p>
          <p>
            Se quiser ajuda a analisar a simula&ccedil;&atilde;o, fale connosco no WhatsApp:<br />
            <a href="${WHATSAPP_LINK}">${WHATSAPP_LINK}</a>
          </p>
          <p>
            Com os melhores cumprimentos,<br />
            SolexR - Energias Renov&aacute;veis<br />
            969 880 053<br />
            <a href="https://www.solexr.pt">https://www.solexr.pt</a>
          </p>
        `,
        attachments: [
          {
            filename: "simulacao-fotovoltaica-solexr.pdf",
            content: pdfBuffer,
            contentType: "application/pdf"
          }
        ]
      });
      console.log("Email cliente enviado");
      results.cliente = "sent";
    } catch (error) {
      console.error("Erro email cliente:", error);
      results.cliente = "failed";
    }
  }

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: SIMULADOR_EMAIL,
      replyTo: clienteEmail || SIMULADOR_EMAIL,
      subject: "Nova simulação recebida",
      html: buildInternalEmailHtml({ lead, calculation }),
      attachments: [
        {
          filename: "simulacao-fotovoltaica-solexr.pdf",
          content: pdfBuffer,
          contentType: "application/pdf"
        }
      ]
    });
    console.log("Email simulador enviado");
    results.simulador = "sent";
  } catch (error) {
    console.error("Erro email simulador:", error);
    results.simulador = "failed";
  }

  return results;
}

