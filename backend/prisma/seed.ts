// Provisions a small pool of Ethereal test-inbox accounts that Campaigns
// round-robin across. Run with `npm run seed:accounts`.
import nodemailer from "nodemailer";
import { prisma } from "../src/lib/prisma";
import { logger } from "../src/lib/logger";

const POOL_SIZE = Number(process.env.MAIL_ACCOUNT_POOL_SIZE ?? 4);

async function main() {
  const existing = await prisma.mailAccount.count({ where: { isActive: true } });
  if (existing >= POOL_SIZE) {
    logger.info({ existing }, "Mail account pool already provisioned, skipping");
    return;
  }

  for (let i = existing; i < POOL_SIZE; i++) {
    const account = await nodemailer.createTestAccount();
    const created = await prisma.mailAccount.create({
      data: {
        address: account.user,
        smtpUser: account.user,
        smtpPass: account.pass,
        smtpHost: account.smtp.host,
        smtpPort: account.smtp.port,
      },
    });
    logger.info({ id: created.id, address: created.address }, `Provisioned mail account ${i + 1}/${POOL_SIZE}`);
  }
}

main()
  .catch((err) => {
    logger.error({ err }, "Failed to provision mail accounts");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
