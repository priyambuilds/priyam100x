import Elysia from "elysia"
import { useAuthPlugin } from "../../plugins/auth"
import { depositService, getWalletService } from "./service"
import { depositSchema } from "./types"

export const walletRoutes = new Elysia({ prefix: "/wallet" })
  .use(useAuthPlugin)
  .get("", async ({ userId, status }) => {
    const data = await getWalletService(userId)
    return status(201, {
      success: true,
      data,
    })
  })
  .post(
    "/deposits",
    async ({ body, status, userId }) => {
      const data = await depositService(userId, body.amountCents, body.requestId)
      return status(data.replayed ? 200 : 201, {
        success: true,
        data,
      })
    },
    {
      body: depositSchema,
    },
  )
