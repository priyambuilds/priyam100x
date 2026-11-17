import { Elysia } from "elysia"
import { createMarketService, getMarketByIdService, getMarketsService } from "./service"
import { useAuthPlugin } from "../../plugins/auth"
import { createMarketSchema } from "./types"

export const marketRoutes = new Elysia({ prefix: "/market" })
  .get("/", async ({ status }) => {
    const data = await getMarketsService()
    return status(201, {
      success: true,
      data,
    })
  })
  .get("/:marketId", async ({ params, status }) => {
    const data = await getMarketByIdService(params.marketId)
    return status(201, {
      success: true,
      data,
    })
  })
  .use(useAuthPlugin)
  .post(
    "/",
    async ({ userId, body, status }) => {
      const data = await createMarketService(userId, body.title, body.description, body.expiry)
      return status(201, {
        success: true,
        message: "Market created successfully",
        data,
      })
    },
    {
      body: createMarketSchema,
    },
)

