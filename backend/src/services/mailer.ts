import nodemailer, { Transporter } from "nodemailer";
import { MailAccount } from "@prisma/client";
import { env } from "../config/env";

const transportPool = new Map<string, Transporter>();

function transporterFor(account: MailAccount): Transporter {
  let t = transportPool.get(account.id);
  if (!t) {
    t = nodemailer.createTransport({
      host: account.smtpHost || env.SMTP_HOST,
      port: account.smtpPort || env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: account.smtpUser, pass: account.smtpPass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
    });
    transportPool.set(account.id, t);
  }
  return t;
}

export async function deliverMessage(params: {
  account: MailAccount;
  to: string;
  subject: string;
  body: string;
}) {
  const transporter = transporterFor(params.account);
  const info = await transporter.sendMail({
    from: `"${params.account.address}" <${params.account.address}>`,
    to: params.to,
    subject: params.subject,
    text: params.body,
    html: params.body.replace(/\n/g, "<br/>"),
  });
  return {
    providerMessageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info) || null,
  };
}
