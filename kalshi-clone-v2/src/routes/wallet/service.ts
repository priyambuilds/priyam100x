import { and, eq, or, sql } from "drizzle-orm"
import { db } from "../../db/client"
import { cashAccounts, cashTransfers, ledgerTransactions } from "../../db/schema"
import { DepositInput } from "./types"
import { ConflictError, NotFoundError } from "../../lib/errors"

export async function depositService(userId: string, { amountCents, requestId }: DepositInput) {
  const amount = BigInt(amountCents)

  return db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(ledgerTransactions)
      .values({
        kind: "DEPOSIT",
        actorUserId: userId,
        requestId,
      })
      .onConflictDoNothing({
        target: [ledgerTransactions.actorUserId, ledgerTransactions.requestId],
      })
      .returning({ id: ledgerTransactions.id })

    if (!entry) {
      const [previous] = await tx
        .select({
          id: ledgerTransactions.id,
          amountCents: cashTransfers.amountCents,
        })
        .from(ledgerTransactions)
        .innerJoin(cashTransfers, eq(cashTransfers.transactionId, ledgerTransactions.id))
        .where(
          and(
            eq(ledgerTransactions.actorUserId, userId),
            eq(ledgerTransactions.requestId, requestId),
            eq(ledgerTransactions.kind, "DEPOSIT"),
          ),
        )

      if (!previous || previous.amountCents !== amount) {
        throw new ConflictError("Request ID already used for a different operation")
      }
      return { transactionId: previous.id, amountCents, created: false }
    }

    const [wallet] = await tx
      .select({ id: cashAccounts.id })
      .from(cashAccounts)
      .where(and(eq(cashAccounts.kind, "USER_WALLET"), eq(cashAccounts.userId, userId)))

    if (!wallet) {
      throw new NotFoundError("Wallet not found")
    }

    const [external] = await tx
      .select({ id: cashAccounts.id })
      .from(cashAccounts)
      .where(eq(cashAccounts.kind, "EXTERNAL"))

    if (!external) {
      throw new Error("External account has not been initialized")
    }

    await tx.insert(cashTransfers).values({
      transactionId: entry.id,
      fromAccountId: external.id,
      toAccountId: wallet.id,
      amountCents: amount,
    })

    return { transactionId: entry.id, amountCents, created: true }
  })
}

export async function getWalletBalanceService(userId: string) {
  const [wallet] = await db
    .select({
      balanceCents: sql<string>`
      coalesce(
        sum(
          case
            when ${cashTransfers.toAccountId} = ${cashAccounts.id}
            then ${cashTransfers.amountCents}
            else -${cashTransfers.amountCents}
            end
        ),
        0
      )::text
    `,
    })
    .from(cashAccounts)
    .leftJoin(
      cashTransfers,
      or(eq(cashTransfers.toAccountId, cashAccounts.id), eq(cashTransfers.fromAccountId, cashAccounts.id)),
    )
    .where(and(eq(cashAccounts.kind, "USER_WALLET"), eq(cashAccounts.userId, userId)))
    .groupBy(cashAccounts.id)
  
  if (!wallet) {
    throw new NotFoundError("Wallet not found");
  }
  return wallet;
}
