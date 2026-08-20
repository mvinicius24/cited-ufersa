const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const html_to_pdf = require('html-pdf-node');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Configuração do transporte SMTP (Use as credenciais do e-mail institucional)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // Ex: smtp.gmail.com ou o servidor do órgão
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER, // E-mail institucional do laboratório
    pass: process.env.SMTP_PASS  // Senha do e-mail
  }
});

app.post('/api/enviar-solicitacao', async (req, res) => {
  try {
    const { emailDestinatario, codigoProtocolo, htmlConteudo } = req.body;

    if (!emailDestinatario || !htmlConteudo) {
      return res.status(400).json({ erro: 'Dados insuficientes para envio.' });
    }

    // 1. Gera o PDF em buffer a partir do HTML
    const options = { format: 'A4', printBackground: true };
    const file = { content: htmlConteudo };
    const pdfBuffer = await html_to_pdf.generatePdf(file, options);

    // 2. Dispara o e-mail com o PDF em anexo
    const mailOptions = {
      from: `"LSRX/LDFF - UFERSA" <${process.env.SMTP_USER}>`,
      to: emailDestinatario,
      subject: `Confirmação de Solicitação - Protocolo ${codigoProtocolo}`,
      html: `
        <h2>Solicitação Recebida</h2>
        <p>Sua solicitação sob o protocolo <strong>${codigoProtocolo}</strong> foi cadastrada no sistema do LSRX/LDFF.</p>
        <p>Em anexo você encontra a cópia em PDF com todas as informações preenchidas.</p>
      `,
      attachments: [
        {
          filename: `Solicitacao_${codigoProtocolo}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ sucesso: true, mensagem: 'E-mail enviado com sucesso!' });

  } catch (error) {
    console.error('Erro no servidor ao processar envio:', error);
    return res.status(500).json({ erro: 'Falha interna no envio do e-mail.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));