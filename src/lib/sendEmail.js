import nodemailer from "nodemailer";

const FROM_EMAIL = "SolexR Simulador <simulador@solexr.pt>";
const CONTACT_EMAIL = "orcamentos@solexr.pt";
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

export async function sendEmail(clienteEmail, pdfBuffer) {
  if (!clienteEmail) {
    throw new Error("Email do cliente nao indicado.");
  }

  console.log("A enviar email para:", clienteEmail);

  const transporter = getTransporter();
  await transporter.sendMail({
    from: FROM_EMAIL,
    to: clienteEmail,
    cc: CONTACT_EMAIL,
    replyTo: CONTACT_EMAIL,
    subject: "A sua simulacao fotovoltaica SolexR",
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

  console.log("Email enviado com sucesso");
}

