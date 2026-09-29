import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const BookingPlain = t.Object(
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
);

export const BookingRelations = t.Object(
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
    showTime: t.Object(
      {
        id: t.String(),
        screenId: t.String(),
        movieId: t.String(),
        startsAt: t.Date(),
        endsAt: t.Date(),
        priceCents: t.Integer(),
        createdAt: t.Date(),
      },
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
    bookedSeats: t.Array(
      t.Object(
        {
          id: t.String(),
          bookingId: t.String(),
          seatId: t.String(),
          showtimeId: t.String(),
          screenId: t.String(),
        },
        { additionalProperties: false },
      ),
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const BookingPlainInputCreate = t.Object(
  {
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
  },
  { additionalProperties: false },
);

export const BookingPlainInputUpdate = t.Object(
  {
    status: t.Optional(
      t.Union(
        [
          t.Literal("PENDING"),
          t.Literal("CONFIRMED"),
          t.Literal("CANCELLED"),
          t.Literal("REFUNDED"),
        ],
        { additionalProperties: false },
      ),
    ),
    totalCents: t.Optional(t.Integer()),
  },
  { additionalProperties: false },
);

export const BookingRelationsInputCreate = t.Object(
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
    showTime: t.Object(
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
    bookedSeats: t.Optional(
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

export const BookingRelationsInputUpdate = t.Partial(
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
      showTime: t.Object(
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
      bookedSeats: t.Partial(
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

export const BookingWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
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
    { $id: "Booking" },
  ),
);

export const BookingWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object(
            {
              id: t.String(),
              id_showtimeId: t.Object(
                { id: t.String(), showtimeId: t.String() },
                { additionalProperties: false },
              ),
            },
            { additionalProperties: false },
          ),
          { additionalProperties: false },
        ),
        t.Union(
          [
            t.Object({ id: t.String() }),
            t.Object({
              id_showtimeId: t.Object(
                { id: t.String(), showtimeId: t.String() },
                { additionalProperties: false },
              ),
            }),
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
      ],
      { additionalProperties: false },
    ),
  { $id: "Booking" },
);

export const BookingSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      userId: t.Boolean(),
      showtimeId: t.Boolean(),
      status: t.Boolean(),
      totalCents: t.Boolean(),
      user: t.Boolean(),
      showTime: t.Boolean(),
      transaction: t.Boolean(),
      bookedSeats: t.Boolean(),
      createdAt: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const BookingInclude = t.Partial(
  t.Object(
    {
      status: t.Boolean(),
      user: t.Boolean(),
      showTime: t.Boolean(),
      transaction: t.Boolean(),
      bookedSeats: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const BookingOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      userId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      showtimeId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      totalCents: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      createdAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const Booking = t.Composite([BookingPlain, BookingRelations], {
  additionalProperties: false,
});

export const BookingInputCreate = t.Composite(
  [BookingPlainInputCreate, BookingRelationsInputCreate],
  { additionalProperties: false },
);

export const BookingInputUpdate = t.Composite(
  [BookingPlainInputUpdate, BookingRelationsInputUpdate],
  { additionalProperties: false },
);
