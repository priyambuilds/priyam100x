import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../lib/errors"
import { prisma } from "../../lib/prisma"
import { CreateMarketInput } from "./types"
import { WalletEntryType } from "../../../generated/prisma/enums"
import { Prisma, type Market, type Wallet, Position } from "../../../generated/prisma/client"

const normalize = (input: string) => input.trim()

export async function createMarketService(userId: string, input: CreateMarketInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (!user || user.role !== "ADMIN") {
    throw new ForbiddenError("Either the user doesnt exist or you're not an ADMIN")
  }
  const title = normalize(input.title)
  const description = input.description?.trim() || null
  const resolutionCriteria = normalize(input.resolutionCriteria)
  const resolutionSource = normalize(input.resolutionSource)
  const closesAt = new Date(input.closesAt)

  if (title.length < 3) {
    throw new BadRequestError("Title must contain at least 3 characters")
  }

  if (resolutionCriteria.length < 10) {
    throw new BadRequestError("Resolution criteria must contain at least 10 characters")
  }

  if (resolutionSource.length < 3) {
    throw new BadRequestError("Resolution source is required")
  }

  if (!Number.isFinite(closesAt.getTime()) || closesAt.getTime() <= Date.now()) {
    throw new BadRequestError("Trading close time must be in the future")
  }

  return prisma.market.create({
    data: {
      creatorId: userId,
      title,
      description,
      resolutionCriteria,
      resolutionSource,
      closesAt,
    },
  })
}

export async function getMarketService() {
  return prisma.market.findMany({
    take: 50,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      resolution: true,
      closesAt: true,
      outstandingPairs: true,
      createdAt: true,
    },
  })
}

export async function getMarketByIdService(marketId: string) {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      resolution: true,
      closesAt: true,
      outstandingPairs: true,
      createdAt: true,
    },
  })

  if (!market) {
    throw new NotFoundError("Market not found")
  }

  return market
}

export async function splitService(userId: string, marketId: string, quantity: number, requestId: string) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10_000) {
    throw new BadRequestError("Invalid split quantity")
  }
  const costCents = quantity * 100
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  })
  if (!wallet) {
    throw new NotFoundError("Wallet not found")
  }

  try {
    const entry = await prisma.$transaction(async (tx) => {
      // Claim this requestId before changing balances
      const createdEntry = await tx.walletEntry.create({
        data: {
          walletId: wallet.id,
          marketId,
          type: WalletEntryType.SPLIT,
          amountCents: -costCents,
          requestId,
        },
      })

      // Lock the market before reading its trading state
      const markets = await tx.$queryRaw<Market[]>`SELECT * FROM "Market" WHERE "id" = ${marketId} FOR NO KEY UPDATE`
      const market = markets[0]
      if (!market) {
        throw new NotFoundError("Market not found")
      }

      // Lock the wallet before checking available funds
      const wallets = await tx.$queryRaw<Wallet[]>`SELECT * FROM "Wallet" WHERE "id" = ${wallet.id} FOR NO KEY UPDATE`

      const lockedWallet = wallets[0]

      if (!lockedWallet) {
        throw new NotFoundError("Wallet not found")
      }

      if (market.status !== "OPEN" || market.closesAt.getTime() <= Date.now()) {
        throw new BadRequestError("Market is not open for splitting")
      }

      const availableCents = lockedWallet.balanceCents - lockedWallet.lockedCents

      if (availableCents < costCents) {
        throw new BadRequestError("Insufficient available cash")
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balanceCents: {
            decrement: costCents,
          },
        },
      })

      await tx.market.update({
        where: { id: marketId },
        data: {
          escrowCents: {
            increment: costCents,
          },
          outstandingPairs: {
            increment: quantity,
          },
        },
      })

      for (const outcome of ["YES", "NO"] as const) {
        await tx.position.upsert({
          where: {
            userId_marketId_outcome: {
              userId,
              marketId,
              outcome,
            },
          },
          create: {
            userId,
            marketId,
            outcome,
            quantity,
          },
          update: {
            quantity: {
              increment: quantity,
            },
          },
        })
      }
      return createdEntry
    })
    return {
      entry,
      pairsMinted: quantity,
      replayed: false,
    }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.walletEntry.findUnique({
        where: {
          walletId_requestId: {
            walletId: wallet.id,
            requestId,
          },
        },
      })

      if (!existing) {
        throw err
      }

      if (existing.type !== "SPLIT" || existing.marketId !== marketId || existing.amountCents !== -costCents) {
        throw new ConflictError("Request ID was already used for a different operation")
      }

      return {
        entry: existing,
        pairsMinted: quantity,
        replayed: true,
      }
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code == "P2003") {
      const market = await prisma.market.findUnique({
        where: { id: marketId },
        select: { id: true },
      })
      if (!market) {
        throw new NotFoundError("market not found")
      }
    }
    throw err
  }
}

export async function mergeService(userId: string, marketId: string, quantity: number, requestId: string) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10_000) {
    throw new BadRequestError("Invalid merge quantity")
  }
  const proceedsCents = quantity * 100
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  })
  if (!wallet) {
    throw new NotFoundError("Wallet not found")
  }

  try {
    const entry = await prisma.$transaction(async (tx) => {
      const createdEntry = await tx.walletEntry.create({
        data: {
          walletId: wallet.id,
          marketId,
          type: WalletEntryType.MERGE,
          amountCents: proceedsCents,
          requestId,
        },
      })

      const markets = await tx.$queryRaw<Market[]>`SELECT * FROM "Market" WHERE "id" = ${marketId} FOR NO KEY UPDATE`
      const market = markets[0]

      if (!market) {
        throw new NotFoundError("Market not found")
      }

      const wallets = await tx.$queryRaw<Market[]>`SELECT * FROM "Wallet" WHERE "id" = ${wallet.id} FOR NOT KEY UPDATE`
      const lockedWallet = wallets[0]

      if (!lockedWallet) {
        throw new NotFoundError("Wallet not found")
      }

      if (market.status !== "OPEN" || market.closesAt.getTime() <= Date.now()) {
        throw new BadRequestError("Market is not open for merging")
      }

      const positions = await tx.$queryRaw<Position[]>`SELECT * FROM "Position" WHERE "userId" = ${userId} AND "marketId" = ${marketId} ORDER BY "outcome", "id" FOR NO KEY UPDATE`
      const yesPosition = positions.find((position) => position.outcome === "YES")
      const noPosition = positions.find((position) => position.outcome === "NO")

      if (!yesPosition || yesPosition.quantity - yesPosition.lockedQuantity < quantity) {
        throw new BadRequestError("Insufficient available yes contracts")
      }

      if (!noPosition || noPosition.quantity - noPosition.lockedQuantity < quantity) {
        throw new BadRequestError("Insufficient available no contracts")
      }

      if (market.outstandingPairs < quantity || market.escrowCents < proceedsCents) {
        throw new Error("Market collateral invariant violated")
      }

      await tx.position.update({
        where: { id: yesPosition.id },
        data: {
          quantity: { decrement: quantity },
        },
      })
      await tx.position.update({
        where: { id: noPosition.id },
        data: {
          quantity: { decrement: quantity },
        },
      })

      await tx.market.update({
        where: { id: marketId },
        data: {
          outstandingPairs: { decrement: quantity },
          escrowCents: { decrement: proceedsCents },
        },
      })

      await tx.wallet.update({
        where: { id: lockedWallet.id },
        data: {
          balanceCents: {
            increment: proceedsCents,
          },
        },
      })

      return createdEntry
    })

    return {
      entry,
      pairsMerged: quantity,
      replayed: false
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.walletEntry.findUnique({
        where: {
          walletId_requestId: {
            walletId: wallet.id,
            requestId,
          },
        },
      });

      if (!existing) {
        throw error;
      }

      if (
        existing.type !== "MERGE" ||
        existing.marketId !== marketId ||
        existing.amountCents !== proceedsCents
      ) {
        throw new ConflictError(
          "Request ID was already used for a different operation",
        );
      }

      return {
        entry: existing,
        pairsMerged: quantity,
        replayed: true,
      };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      const market = await prisma.market.findUnique({
        where: { id: marketId },
        select: { id: true },
      });

      if (!market) {
        throw new NotFoundError("Market not found");
      }
    }

    throw error;
  }
  
}