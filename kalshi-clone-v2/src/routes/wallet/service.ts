import { WalletEntryType } from "../../../generated/prisma/enums";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import {Prisma} from "../../../generated/prisma/client";
export const getWalletService = async (userId: string) => {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: {
      id: true,
      balanceCents: true,
      lockedCents: true,
    },
  })

  if (!wallet) {
    throw new NotFoundError("Wallet not found");
  }

  return {
    id: wallet.id,
    balanceCents: wallet.balanceCents,
    lockedCents: wallet.lockedCents,
    availableCents: wallet.balanceCents - wallet.lockedCents
  }
}

export async function depositService(
  userId: string,
  amountCents: number,
  requestId: string
) {
  if (!Number.isInteger(amountCents) || amountCents < 1 || amountCents > 1_000_000) {
    throw new BadRequestError("Invalid deposit amount");
  }
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: {id: true}
  })
  if (!wallet) {
    throw new NotFoundError("Wallet not found");
  }

  try {
    const entry = await prisma.$transaction(async (tx) => {
      const createdEntry = await tx.walletEntry.create({
        data: {
          walletId: wallet.id,
          type: WalletEntryType.DEPOSIT,
          amountCents,
          requestId
        }
      });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balanceCents: {
            increment: amountCents
          }
        }
      })
      return createdEntry;
    })
    return {
      entry,
      replayed: false
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = await prisma.walletEntry.findUnique({
        where: {
          walletId_requestId: {
            walletId: wallet.id,
            requestId
          }
        }
      })

      if (!existing) {
        throw e;
      }
      if (existing.type !== "DEPOSIT" || existing.amountCents !==amountCents) {
        throw new ConflictError("Request ID already used for a different operation")
      }
      return {
        entry: existing,
        replayed: true
      }
    }
    throw e;
  }
}