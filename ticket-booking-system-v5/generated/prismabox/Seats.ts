import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const SeatsPlain = t.Object(
  { id: t.String(), number: t.Integer(), screenId: t.String() },
  { additionalProperties: false },
);

export const SeatsRelations = t.Object(
  {
    screen: t.Object(
      { id: t.String(), number: t.Integer(), theatreId: t.String() },
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

export const SeatsPlainInputCreate = t.Object(
  { number: t.Integer() },
  { additionalProperties: false },
);

export const SeatsPlainInputUpdate = t.Object(
  { number: t.Optional(t.Integer()) },
  { additionalProperties: false },
);

export const SeatsRelationsInputCreate = t.Object(
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

export const SeatsRelationsInputUpdate = t.Partial(
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

export const SeatsWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          number: t.Integer(),
          screenId: t.String(),
        },
        { additionalProperties: false },
      ),
    { $id: "Seats" },
  ),
);

export const SeatsWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object(
            {
              id: t.String(),
              screenId_number: t.Object(
                { screenId: t.String(), number: t.Integer() },
                { additionalProperties: false },
              ),
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
              screenId_number: t.Object(
                { screenId: t.String(), number: t.Integer() },
                { additionalProperties: false },
              ),
            }),
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
            { id: t.String(), number: t.Integer(), screenId: t.String() },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "Seats" },
);

export const SeatsSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      number: t.Boolean(),
      screenId: t.Boolean(),
      screen: t.Boolean(),
      bookedSeats: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const SeatsInclude = t.Partial(
  t.Object(
    { screen: t.Boolean(), bookedSeats: t.Boolean(), _count: t.Boolean() },
    { additionalProperties: false },
  ),
);

export const SeatsOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      number: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      screenId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const Seats = t.Composite([SeatsPlain, SeatsRelations], {
  additionalProperties: false,
});

export const SeatsInputCreate = t.Composite(
  [SeatsPlainInputCreate, SeatsRelationsInputCreate],
  { additionalProperties: false },
);

export const SeatsInputUpdate = t.Composite(
  [SeatsPlainInputUpdate, SeatsRelationsInputUpdate],
  { additionalProperties: false },
);
