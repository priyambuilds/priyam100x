import Elysia from "elysia"
import { useAuthPlugin } from "../../plugins/auth"
import { depositService, getWalletBalanceService } from "./service"
import { depositSchema } from "./types"

export const walletRoutes = new Elysia({ prefix: "/wallet" })
  .use(useAuthPlugin)
  .post(
    "/deposits",
    async ({ body, userId, status }) => {
      const data = await depositService(userId, body)
      return status(data.created ? 201 : 200, {
        success: true,
        data: { transactionid: data.transactionId, amountCents: data.amountCents },
      })
    },
    { body: depositSchema },
  )

  .get("/balance", async ({ userId, status }) => {
    const data = await getWalletBalanceService(userId)
    return status(201, {
      success: true,
      data,
    })
  })
