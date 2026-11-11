import { Elysia } from "elysia";
import { errorHandlerPlugin } from "./plugins/errorHandler";
import openapi from "@elysia/openapi";
import { authRoutes } from "./routes/auth/route";
import { walletRoutes } from "./routes/wallet/route";
import { marketRoutes } from "./routes/market/route";
import { resolveRoutes } from "./routes/resolve/route";

export const app = new Elysia()
  .use(errorHandlerPlugin)
.use(
    openapi({
      path: "/docs",
      documentation: {
        info: {
          title: "Mini Kalshi API",
          version: "1.0.0",
          description: "Kalshi prediction market backend",
        },
      },
    }),
)
  .group("/api/v1", (api) => 
    api
      .use(authRoutes)
      .use(walletRoutes)
      .use(marketRoutes)
      .use(resolveRoutes)
)
  
export type App = typeof app;