import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const TransactionPlain = t.Object(
  {
    id: t.String(),
    bookingId: __nullable__(t.String()),
    userId: t.String(),
    type: t.Union(
      [t.Literal("TOP_UP"), t.Literal("BOOKING"), t.Literal("REFUND")],
      { additionalProperties: false },
    ),
    amountCents: t.Integer(),
    amountBeforeCents: t.Integer(),
    amountAfterCents: t.Integer(),
    status: t.Union(
      [t.Literal("PENDING"), t.Literal("SUCCESS"), t.Literal("FAILED")],
      { additionalProperties: false },
    ),
    createdAt: t.Date(),
    updatedAt: t.Date(),
  },
  { additionalProperties: false },
);

export const TransactionRelations = t.Object(
  {
    user: t.Object(
      {
        id: t.String(),
        username: t.String(),
        email: t.String(),
        password: t.String(),
        role: t.Union([t.Literal("ADMIN"), t.Literal("USER")], {
          additionalProperties: false,
        }),
        walletBalanceCents: t.Integer(),
      },
      { additionalProperties: false },
    ),
    booking: __nullable__(
      t.Object(
        {
          id: t.String(),
          userId: t.String(),
          showtimeId: t.String(),
          status: t.Union(
            [
              t.Literal("PENDING"),
              t.Literal("CONFIRMED"),
              t.Literal("CANCELLED"),
              t.Literal("REFUNDED"),
            ],
            { additionalProperties: false },
          ),
          totalCents: t.Integer(),
          createdAt: t.Date(),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const TransactionPlainInputCreate = t.Object(
  {
    type: t.Union(
      [t.Literal("TOP_UP"), t.Literal("BOOKING"), t.Literal("REFUND")],
      { additionalProperties: false },
    ),
    amountCents: t.Integer(),
    amountBeforeCents: t.Integer(),
    amountAfterCents: t.Integer(),
    status: t.Union(
      [t.Literal("PENDING"), t.Literal("SUCCESS"), t.Literal("FAILED")],
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const TransactionPlainInputUpdate = t.Object(
  {
    type: t.Optional(
      t.Union(
        [t.Literal("TOP_UP"), t.Literal("BOOKING"), t.Literal("REFUND")],
        { additionalProperties: false },
      ),
    ),
    amountCents: t.Optional(t.Integer()),
    amountBeforeCents: t.Optional(t.Integer()),
    amountAfterCents: t.Optional(t.Integer()),
    status: t.Optional(
      t.Union(
        [t.Literal("PENDING"), t.Literal("SUCCESS"), t.Literal("FAILED")],
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const TransactionRelationsInputCreate = t.Object(
  {
    user: t.Object(
      {
        connect: t.Object(
          {
            id: t.String({ additionalProperties: false }),
          },
          { additionalProperties: false },
        ),
      },
      { additionalProperties: false },
    ),
    booking: t.Optional(
      t.Object(
        {
          connect: t.Object(
            {
              id: t.String({ additionalProperties: false }),
            },
            { additionalProperties: false },
          ),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const TransactionRelationsInputUpdate = t.Partial(
  t.Object(
    {
      user: t.Object(
        {
          connect: t.Object(
            {
              id: t.String({ additionalProperties: false }),
            },
            { additionalProperties: false },
          ),
        },
        { additionalProperties: false },
      ),
      booking: t.Partial(
        t.Object(
          {
            connect: t.Object(
              {
                id: t.String({ additionalProperties: false }),
              },
              { additionalProperties: false },
            ),
            disconnect: t.Boolean(),
          },
          { additionalProperties: false },
        ),
      ),
    },
    { additionalProperties: false },
  ),
);

export const TransactionWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          bookingId: t.String(),
          userId: t.String(),
          type: t.Union(
            [t.Literal("TOP_UP"), t.Literal("BOOKING"), t.Literal("REFUND")],
            { additionalProperties: false },
          ),
          amountCents: t.Integer(),
          amountBeforeCents: t.Integer(),
          amountAfterCents: t.Integer(),
          status: t.Union(
            [t.Literal("PENDING"), t.Literal("SUCCESS"), t.Literal("FAILED")],
            { additionalProperties: false },
          ),
          createdAt: t.Date(),
          updatedAt: t.Date(),
        },
        { additionalProperties: false },
      ),
    { $id: "Transaction" },
  ),
);

export const TransactionWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object({ id: t.String() }, { additionalProperties: false }),
          { additionalProperties: false },
        ),
        t.Union([t.Object({ id: t.String() })], {
          additionalProperties: false,
        }),
        t.Partial(
          t.Object({
            AND: t.Union([
              Self,
              t.Array(Self, { additionalProperties: false }),
            ]),
            NOT: t.Union([
              Self,
              t.Array(Self, { additionalProperties: false }),
            ]),
            OR: t.Array(Self, { additionalProperties: false }),
          }),
          { additionalProperties: false },
        ),
        t.Partial(
          t.Object(
            {
              id: t.String(),
              bookingId: t.String(),
              userId: t.String(),
              type: t.Union(
                [
                  t.Literal("TOP_UP"),
                  t.Literal("BOOKING"),
                  t.Literal("REFUND"),
                ],
                { additionalProperties: false },
              ),
              amountCents: t.Integer(),
              amountBeforeCents: t.Integer(),
              amountAfterCents: t.Integer(),
              status: t.Union(
                [
                  t.Literal("PENDING"),
                  t.Literal("SUCCESS"),
                  t.Literal("FAILED"),
                ],
                { additionalProperties: false },
              ),
              createdAt: t.Date(),
              updatedAt: t.Date(),
            },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "Transaction" },
);

export const TransactionSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      bookingId: t.Boolean(),
      userId: t.Boolean(),
      type: t.Boolean(),
      amountCents: t.Boolean(),
      amountBeforeCents: t.Boolean(),
      amountAfterCents: t.Boolean(),
      status: t.Boolean(),
      user: t.Boolean(),
      booking: t.Boolean(),
      createdAt: t.Boolean(),
      updatedAt: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const TransactionInclude = t.Partial(
  t.Object(
    {
      type: t.Boolean(),
      status: t.Boolean(),
      user: t.Boolean(),
      booking: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const TransactionOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      bookingId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      userId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      amountCents: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      amountBeforeCents: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      amountAfterCents: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      createdAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      updatedAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const Transaction = t.Composite(
  [TransactionPlain, TransactionRelations],
  { additionalProperties: false },
);

export const TransactionInputCreate = t.Composite(
  [TransactionPlainInputCreate, TransactionRelationsInputCreate],
  { additionalProperties: false },
);

export const TransactionInputUpdate = t.Composite(
  [TransactionPlainInputUpdate, TransactionRelationsInputUpdate],
  { additionalProperties: false },
);
