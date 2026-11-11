import { Elysia } from "elysia";
import { useAuthPlugin } from "../../plugins/auth";
import { resolveService } from "./service";
import { resolveMarketSchema } from "./types";

export const resolveRoutes = new Elysia({ prefix: "/resolve" })
  .use(useAuthPlugin)
.post("/", async ({userId, body, status}) => {
  const result = await resolveService(userId, body.marketId, body.resolution)
  return status(201, {
    success: true,
    message: "Market resolved successfully",
    data: result
  })
}, {
  body: resolveMarketSchema
})