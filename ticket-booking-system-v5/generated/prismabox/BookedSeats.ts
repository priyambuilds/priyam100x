import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const BookedSeatsPlain = t.Object(
  {
    id: t.String(),
    bookingId: t.String(),
    seatId: t.String(),
    showtimeId: t.String(),
    screenId: t.String(),
  },
  { additionalProperties: false },
);

export const BookedSeatsRelations = t.Object(
  {
    booking: t.Object(
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
    seat: t.Object(
      { id: t.String(), number: t.Integer(), screenId: t.String() },
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
  },
  { additionalProperties: false },
);

export const BookedSeatsPlainInputCreate = t.Object(
  {},
  { additionalProperties: false },
);

export const BookedSeatsPlainInputUpdate = t.Object(
  {},
  { additionalProperties: false },
);

export const BookedSeatsRelationsInputCreate = t.Object(
  {
    booking: t.Object(
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
    seat: t.Object(
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
  },
  { additionalProperties: false },
);

export const BookedSeatsRelationsInputUpdate = t.Partial(
  t.Object(
    {
      booking: t.Object(
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
      seat: t.Object(
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
    },
    { additionalProperties: false },
  ),
);

export const BookedSeatsWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          bookingId: t.String(),
          seatId: t.String(),
          showtimeId: t.String(),
          screenId: t.String(),
        },
        { additionalProperties: false },
      ),
    { $id: "BookedSeats" },
  ),
);

export const BookedSeatsWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object(
            {
              id: t.String(),
              showtimeId_seatId: t.Object(
                { showtimeId: t.String(), seatId: t.String() },
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
              showtimeId_seatId: t.Object(
                { showtimeId: t.String(), seatId: t.String() },
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
              bookingId: t.String(),
              seatId: t.String(),
              showtimeId: t.String(),
              screenId: t.String(),
            },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "BookedSeats" },
);

export const BookedSeatsSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      bookingId: t.Boolean(),
      seatId: t.Boolean(),
      showtimeId: t.Boolean(),
      screenId: t.Boolean(),
      booking: t.Boolean(),
      seat: t.Boolean(),
      showTime: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const BookedSeatsInclude = t.Partial(
  t.Object(
    {
      booking: t.Boolean(),
      seat: t.Boolean(),
      showTime: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const BookedSeatsOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      bookingId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      seatId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      showtimeId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      screenId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const BookedSeats = t.Composite(
  [BookedSeatsPlain, BookedSeatsRelations],
  { additionalProperties: false },
);

export const BookedSeatsInputCreate = t.Composite(
  [BookedSeatsPlainInputCreate, BookedSeatsRelationsInputCreate],
  { additionalProperties: false },
);

export const BookedSeatsInputUpdate = t.Composite(
  [BookedSeatsPlainInputUpdate, BookedSeatsRelationsInputUpdate],
  { additionalProperties: false },
);
