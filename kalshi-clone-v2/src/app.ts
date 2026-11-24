import { Elysia } from "elysia"
import { errorHandler } from "./plugins/errorHandler"
import { authRoutes } from "./routes/auth/route"
import { walletRoutes } from "./routes/wallet/route"

export const app = new Elysia()
  .use(errorHandler)
  .get("/health", () => ({ success: true, message: "Server is running" }))
  .use(authRoutes)
  .use(walletRoutes)
