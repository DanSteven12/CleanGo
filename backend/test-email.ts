import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

const emailUser = process.env.EMAIL_USER as string;
const targetEmail = (process.argv[2] || emailUser) as string;

async function runDiagnostics() {
  console.log(`=== INICIANDO DIAGNÓSTICO DE CORREO ===`);
  console.log(`Remitente (Auth User): ${emailUser}`);
  console.log(`Destinatario: ${targetEmail}`);
  console.log(`Modo: ${process.env.EMAIL_APP_PASSWORD ? 'App Password (SMTP Directo)' : 'OAuth2'}\n`);

  let transporter;

  if (process.env.EMAIL_APP_PASSWORD) {
    // 4. Prueba con un Transporter SMTP directo / Contraseña de Aplicación
    console.log('Usando SMTP Básico con App Password...');
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true for 465, false for other ports
      logger: true, // 1. Verificación de Transporter (Debug Mode)
      debug: true,
      auth: {
        user: emailUser,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });
  } else {
    // Usar OAuth2
    console.log('Usando Gmail OAuth2...');
    transporter = nodemailer.createTransport({
      service: 'gmail',
      logger: true, // 1. Verificación de Transporter (Debug Mode)
      debug: true,
      auth: {
        type: 'OAuth2',
        user: emailUser,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      },
    });
  }

  // 2. Verificación de Autenticación de Usuario (Sender Identity)
  // Ensure 'from' is EXACTLY the same as auth user
  const fromField = `"CleanGo Soporte" <${emailUser}>`;

  // 3. Verificación de Cabeceras y Contenido
  const mailOptions = {
    from: fromField,
    to: targetEmail,
    subject: 'Diagnóstico de Correo - Acción Requerida ' + new Date().toISOString(), // No genérico
    text: `Hola,\nEste es un correo de prueba en texto plano.\nRemitente: ${fromField}\nSi puedes leer esto, el envío fue exitoso.`,
    html: `
      <div style="font-family: sans-serif; color: #333;">
        <h2>Prueba de Correo HTML</h2>
        <p>Este es un correo de prueba.</p>
        <p>Remitente configurado: <strong>${fromField}</strong></p>
        <p>Si puedes leer esto, los filtros antispam no lo han bloqueado silenciosamente.</p>
      </div>
    `,
    // forceEmbeddedImages: true // Uncomment if there are actual embedded images
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('\n=== RESULTADO DEL ENVÍO ===');
    console.log('MessageId:', info.messageId);
    console.log('Accepted:', info.accepted);
    console.log('Rejected:', info.rejected);
    console.log('Response:', info.response);

    if (info.accepted && info.accepted.includes(targetEmail)) {
      console.log('\nEl servidor SMTP aceptó el correo con éxito.');
      console.log('Si no llega a la bandeja de entrada, revisa tu carpeta de Spam. Si no está en Spam, Google lo descartó silenciosamente.');
      console.log('Esto suele pasar en OAuth2 por falta de verificación de la app en Google Cloud o por contenido sospechoso.');
    } else {
      console.log('\nEl correo NO fue aceptado completamente por el servidor SMTP.');
    }
  } catch (error: any) {
    console.error('\n=== ERROR AL ENVIAR ===');
    console.error(`Código: ${error.code}`);
    console.error(`Mensaje: ${error.message}`);
    console.error(error);
  }
}

runDiagnostics();
