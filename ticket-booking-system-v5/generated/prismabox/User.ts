import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const UserPlain = t.Object(
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
);

export const UserRelations = t.Object(
  {
    bookings: t.Array(
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
      { additionalProperties: false },
    ),
    transaction: t.Array(
      t.Object(
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
      ),
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const UserPlainInputCreate = t.Object(
  {
    username: t.String(),
    email: t.String(),
    password: t.String(),
    role: t.Optional(
      t.Union([t.Literal("ADMIN"), t.Literal("USER")], {
        additionalProperties: false,
      }),
    ),
    walletBalanceCents: t.Optional(t.Integer()),
  },
  { additionalProperties: false },
);

export const UserPlainInputUpdate = t.Object(
  {
    username: t.Optional(t.String()),
    email: t.Optional(t.String()),
    password: t.Optional(t.String()),
    role: t.Optional(
      t.Union([t.Literal("ADMIN"), t.Literal("USER")], {
        additionalProperties: false,
      }),
    ),
    walletBalanceCents: t.Optional(t.Integer()),
  },
  { additionalProperties: false },
);

export const UserRelationsInputCreate = t.Object(
  {
    bookings: t.Optional(
      t.Object(
        {
          connect: t.Array(
            t.Object(
              {
                id: t.String({ additionalProperties: false }),
              },
              { additionalProperties: false },
            ),
            { additionalProperties: false },
          ),
        },
        { additionalProperties: false },
      ),
    ),
    transaction: t.Optional(
      t.Object(
        {
          connect: t.Array(
            t.Object(
              {
                id: t.String({ additionalProperties: false }),
              },
              { additionalProperties: false },
            ),
            { additionalProperties: false },
          ),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const UserRelationsInputUpdate = t.Partial(
  t.Object(
    {
      bookings: t.Partial(
        t.Object(
          {
            connect: t.Array(
              t.Object(
                {
                  id: t.String({ additionalProperties: false }),
                },
                { additionalProperties: false },
              ),
              { additionalProperties: false },
            ),
            disconnect: t.Array(
              t.Object(
                {
                  id: t.String({ additionalProperties: false }),
                },
                { additionalProperties: false },
              ),
              { additionalProperties: false },
            ),
          },
          { additionalProperties: false },
        ),
      ),
      transaction: t.Partial(
        t.Object(
          {
            connect: t.Array(
              t.Object(
                {
                  id: t.String({ additionalProperties: false }),
                },
                { additionalProperties: false },
              ),
              { additionalProperties: false },
            ),
            disconnect: t.Array(
              t.Object(
                {
                  id: t.String({ additionalProperties: false }),
                },
                { additionalProperties: false },
              ),
              { additionalProperties: false },
            ),
          },
          { additionalProperties: false },
        ),
      ),
    },
    { additionalProperties: false },
  ),
);

export const UserWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
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
    { $id: "User" },
  ),
);

export const UserWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object(
            { id: t.String(), username: t.String(), email: t.String() },
            { additionalProperties: false },
          ),
          { additionalProperties: false },
        ),
        t.Union(
          [
            t.Object({ id: t.String() }),
            t.Object({ username: t.String() }),
            t.Object({ email: t.String() }),
          ],
          { additionalProperties: false },
        ),
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
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "User" },
);

export const UserSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      username: t.Boolean(),
      email: t.Boolean(),
      password: t.Boolean(),
      role: t.Boolean(),
      walletBalanceCents: t.Boolean(),
      bookings: t.Boolean(),
      transaction: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const UserInclude = t.Partial(
  t.Object(
    {
      role: t.Boolean(),
      bookings: t.Boolean(),
      transaction: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const UserOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      username: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      email: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      password: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      walletBalanceCents: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const User = t.Composite([UserPlain, UserRelations], {
  additionalProperties: false,
});

export const UserInputCreate = t.Composite(
  [UserPlainInputCreate, UserRelationsInputCreate],
  { additionalProperties: false },
);

export const UserInputUpdate = t.Composite(
  [UserPlainInputUpdate, UserRelationsInputUpdate],
  { additionalProperties: false },
);
