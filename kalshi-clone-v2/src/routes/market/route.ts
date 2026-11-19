import Elysia from "elysia"
import { createMarketService, getMarketByIdService, getMarketService, mergeService, splitService } from "./service"
import { createMarketSchema, marketParamsSchema, mergeSchema, splitSchema } from "./types"
import { useAuthPlugin } from "../../plugins/auth"

export const marketRoutes = new Elysia({ prefix: "/market" })
  .get("", async ({ status }) => {
    const data = await getMarketService()
    return status(200, {
      success: true,
      data,
    })
  })
  .get(
    "/:marketId",
    async ({ status, params }) => {
      const data = await getMarketByIdService(params.marketId)
      return status(200, {
        success: true,
        data,
      })
    },
    { params: marketParamsSchema },
  )
  .use(useAuthPlugin)
  .post(
    "",
    async ({ status, userId, body }) => {
      const data = await createMarketService(userId, body)
      return status(201, {
        success: true,
        data,
      })
    },
    { body: createMarketSchema },
  )
  .post(
    "/:marketId/split",
    async ({ userId, body, status, params }) => {
      const data = await splitService(userId, params.marketId, body.quantity, body.requestId)
      return status(data.replayed ? 200 : 201, {
        succes: true,
        data,
      })
    },
    {
      params: marketParamsSchema,
      body: splitSchema,
    },
  )
  .post(
    "/:marketId/merge",
    async ({ userId, body, params, status }) => {
      const data = await mergeService(userId, params.marketId, body.quantity, body.requestId)
      return status(data.replayed ? 200 : 201, {
        success: true,
        data,
      })
    },
    { body: mergeSchema, params: marketParamsSchema },
  )
