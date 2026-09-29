import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const ShowTimesPlain = t.Object(
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
);

export const ShowTimesRelations = t.Object(
  {
    screen: t.Object(
      { id: t.String(), number: t.Integer(), theatreId: t.String() },
      { additionalProperties: false },
    ),
    movie: t.Object(
      { id: t.String(), name: t.String() },
      { additionalProperties: false },
    ),
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

export const ShowTimesPlainInputCreate = t.Object(
  { startsAt: t.Date(), endsAt: t.Date(), priceCents: t.Integer() },
  { additionalProperties: false },
);

export const ShowTimesPlainInputUpdate = t.Object(
  {
    startsAt: t.Optional(t.Date()),
    endsAt: t.Optional(t.Date()),
    priceCents: t.Optional(t.Integer()),
  },
  { additionalProperties: false },
);

export const ShowTimesRelationsInputCreate = t.Object(
  {
    screen: t.Object(
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
    movie: t.Object(
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

export const ShowTimesRelationsInputUpdate = t.Partial(
  t.Object(
    {
      screen: t.Object(
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
      movie: t.Object(
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

export const ShowTimesWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
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
    { $id: "ShowTimes" },
  ),
);

export const ShowTimesWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object(
            {
              id: t.String(),
              id_screenId: t.Object(
                { id: t.String(), screenId: t.String() },
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
              id_screenId: t.Object(
                { id: t.String(), screenId: t.String() },
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
              screenId: t.String(),
              movieId: t.String(),
              startsAt: t.Date(),
              endsAt: t.Date(),
              priceCents: t.Integer(),
              createdAt: t.Date(),
            },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "ShowTimes" },
);

export const ShowTimesSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      screenId: t.Boolean(),
      movieId: t.Boolean(),
      startsAt: t.Boolean(),
      endsAt: t.Boolean(),
      priceCents: t.Boolean(),
      screen: t.Boolean(),
      movie: t.Boolean(),
      bookings: t.Boolean(),
      bookedSeats: t.Boolean(),
      createdAt: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const ShowTimesInclude = t.Partial(
  t.Object(
    {
      screen: t.Boolean(),
      movie: t.Boolean(),
      bookings: t.Boolean(),
      bookedSeats: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const ShowTimesOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      screenId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      movieId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      startsAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      endsAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      priceCents: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      createdAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const ShowTimes = t.Composite([ShowTimesPlain, ShowTimesRelations], {
  additionalProperties: false,
});

export const ShowTimesInputCreate = t.Composite(
  [ShowTimesPlainInputCreate, ShowTimesRelationsInputCreate],
  { additionalProperties: false },
);

export const ShowTimesInputUpdate = t.Composite(
  [ShowTimesPlainInputUpdate, ShowTimesRelationsInputUpdate],
  { additionalProperties: false },
);
