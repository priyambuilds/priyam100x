import Elysia from "elysia"
import { useAuthPlugin } from "../../plugins/auth"
import { placeOrderSchema } from "./types"
import { placeOrderService } from "./service"

export const orderRoutes = new Elysia({ prefix: "/order" }).use(useAuthPlugin).post(
  "",
  async ({ userId, body, params, status }) => {
    const data = await placeOrderService(userId, body)
    return status(data.replayed ? 200 : 201, { success: true, data })
  },
  { body: placeOrderSchema },
)
