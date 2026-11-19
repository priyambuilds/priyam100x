import { Elysia } from "elysia"
import { errorHandler } from "./plugins/errorHandler"
import { authRoutes } from "./routes/auth/route"
import { walletRoutes } from "./routes/wallet/route"
import { marketRoutes } from "./routes/market/route"
import { orderRoutes } from "./routes/order/route";

export const app = new Elysia()
  .use(errorHandler)
  .get("/health", async () => ({
    succes: true,
    message: "Server is running",
  }))
  .use(authRoutes)
  .use(walletRoutes)
  .use(marketRoutes)
  .use(orderRoutes)