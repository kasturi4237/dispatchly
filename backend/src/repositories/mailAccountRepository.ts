import { prisma } from "../lib/prisma";

export function listActiveMailAccounts() {
  return prisma.mailAccount.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
}
