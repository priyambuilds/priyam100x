import { Elysia } from "elysia"
import {
  createMarketService,
  getMarketByIdService,
  getMarketService,
  getUserBetsService,
  placeBetService,
} from "./service"
import { useAuthPlugin } from "../../plugins/auth"
import { createMarketSchema, placeBetSchema } from "./types"

export const marketRoutes = new Elysia({ prefix: "/market" })
  // public routes
  .get("/", async ({ status }) => {
    const data = await getMarketService()
    return status(201, {
      success: true,
      message: "Below are all the markets",
      data,
    })
  })
  .get("/:marketId", async ({ params }) => {
    const data = await getMarketByIdService(params.marketId)
    return {
      success: true,
      data,
    }
  })
  // protected routes
  .use(useAuthPlugin)
  .post(
    "/",
    async ({ userId, body, status }) => {
      const market = await createMarketService(
        body.title,
        body.description,
        body.side,
        body.initialWager,
        body.expiry,
        userId,
      )

      return status(201, {
        success: true,
        message: "market created successfully",
        data: market,
      })
    },
    { body: createMarketSchema },
  )
  .post(
    "/bet",
    async ({ body, status, userId }) => {
      const bet = await placeBetService(userId, body.amount, body.marketId)
      return status(201, {
        success: true,
        message: "Bet placed successfully",
        data: bet,
      })
    },
    { body: placeBetSchema },
  )
  .get("/bet", async ({ userId , status}) => {
    const bets = await getUserBetsService(userId)
    return status(201, {
      success: true,
      message: "Below are your bets",
      data: bets,
    })
  })
