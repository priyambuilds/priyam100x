import Elysia from "elysia"
import { useAuthPlugin } from "../../plugins/auth"
import { createMarketService } from "./service"
import { createMarketSchema } from "./types"

export const marketRoutes = new Elysia().use(useAuthPlugin).post(
  "/markets",
  async ({ body, userId, status }) => {
    const market = await createMarketService(userId, body)
    return status(201, {
      success: true,
      data: market,
    })
  },
  { body: createMarketSchema },
)
