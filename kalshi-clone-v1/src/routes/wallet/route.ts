import { Elysia } from "elysia"
import { useAuthPlugin } from "../../plugins/auth"
import { onrampService, transactionService } from "./service"
import { onrampSchema } from "./types"

export const walletRoutes = new Elysia({ prefix: "/wallet" })
  .use(useAuthPlugin)
  .post(
    "/onramp",
    async ({ userId, status, body }) => {
      const data = await onrampService(userId, body.amount)
      return status(201, {
        success: true,
        message: "Money successfully added to the wallet",
        data,
      })
    },
    {
      body: onrampSchema,
    },
  )
  .get("/transactions", async ({ userId, status }) => {
    const data = await transactionService(userId)
    return status(201, {
      success: true,
      message: "Below are your transactions",
      data,
    })
  })
