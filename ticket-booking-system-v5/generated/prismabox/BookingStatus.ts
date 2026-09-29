import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const BookingStatus = t.Union(
  [
    t.Literal("PENDING"),
    t.Literal("CONFIRMED"),
    t.Literal("CANCELLED"),
    t.Literal("REFUNDED"),
  ],
  { additionalProperties: false },
);
