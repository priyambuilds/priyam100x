import { prisma } from "./prisma"
// This runs once at server startup to ensure the special "external" account exists.
// Onramp transfers come from this account
// Its the only account allowed to go negative since it prints money essentially
export async function createExtrnalAccount() {
  // upsert = create if it doesn't exist, do nothing if it does
  await prisma.account.upsert({
    where: { id: "external" },
    create: { id: "external" },
    update: {}
  })
}
