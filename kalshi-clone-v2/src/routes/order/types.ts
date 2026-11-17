import { t } from "elysia";

export const splitMergeSchema = t.Object({
  marketId: t.String({ format: "uuid" }),
  // number of pairs to mint/burn
  quantity: t.Integer({minimum: 1, maximum: 100_000})
})