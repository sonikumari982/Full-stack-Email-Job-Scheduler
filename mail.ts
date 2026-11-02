import nodemailer, { type Transporter } from 'nodemailer';
import { env } from './env';

let transporter: Transporter | null = null;

export async function getTransporter(): Promise<Transporter> {
  if (transporter) {
    return transporter;
  }

  const smtpUser = env.smtpUser;
  const smtpPass = env.smtpPass;

  if (smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    return transporter;
  }

  const account = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });

  console.log('Generated Ethereal test account:', account.user);
  return transporter;
}
