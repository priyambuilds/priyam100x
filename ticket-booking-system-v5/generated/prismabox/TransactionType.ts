import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const TransactionType = t.Union(
  [t.Literal("TOP_UP"), t.Literal("BOOKING"), t.Literal("REFUND")],
  { additionalProperties: false },
);
