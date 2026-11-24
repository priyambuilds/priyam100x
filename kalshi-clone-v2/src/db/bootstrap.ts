import { sql } from "drizzle-orm"
import { db } from "./client"
import { cashAccounts } from "./schema"

export async function createExternalCashAccount() {
  await db
    .insert(cashAccounts)
    .values({ kind: "EXTERNAL" })
    .onConflictDoNothing({
      target: cashAccounts.kind,
      where: sql`${cashAccounts.kind} = 'EXTERNAL'`,
    })
}
