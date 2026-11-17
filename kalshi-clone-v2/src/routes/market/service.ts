import { NotFoundError } from "elysia";
import { BadRequestError, UnauthorizedError } from "../../../../ticket-booking-system-v5/src/lib/errors";
import { AccountType } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";

export async function createMarketService(
  creatorId: string,
  title: string,
  description: string | null | undefined,
  expiry: Date
) {
  // expiry must be in the future\
  if (expiry.getTime() <= Date.now()) {
    throw new BadRequestError("Market expiry must be a date in the future");
  }

  // Atomically create the market AND its dedicated cash escrow account
  const market = await prisma.market.create({
    data: {
      title,
      description: description || null,
      creatorId,
      expiry,
      totalIssued: 0, // starts with 0 active contract pairs
      // Nested write creates the dedicated escrow account for this market
      accounts: {
        create: {
          type: AccountType.MARKET_ESCROW,
          balance: 0,
          locked: 0
        }
      }
    },
    include: {
      accounts: true
    }
  })

  return market;
}

export async function getMarketsService() {
  return await prisma.market.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      resolution: true,
      expiry: true,
      totalIssued: true,
      createdAt: true,
      creator: {
        select: {
          id: true,
          username: true
        }
      }
    }
  })
}

export async function getMarketByIdService(marketId: string) {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: {
      creator: {
        select: {id: true, username: true}
      },
      accounts: {
        where: { type: AccountType.MARKET_ESCROW },
        select: {id: true, balance: true}
      }
    }
  })

  if (!market) {
    throw new NotFoundError("Market not found");
  };
  return market;
}