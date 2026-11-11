import { t } from "elysia"

export const resolveMarketSchema = t.Object({
  marketId: t.String({ format: "uuid" }),
  resolution: t.UnionEnum(["YES", "NO"]),
})
