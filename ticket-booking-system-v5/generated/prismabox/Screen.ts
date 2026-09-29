import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const ScreenPlain = t.Object(
  { id: t.String(), number: t.Integer(), theatreId: t.String() },
  { additionalProperties: false },
);

export const ScreenRelations = t.Object(
  {
    theatre: t.Object(
      { id: t.String(), name: t.String(), cityId: t.String() },
      { additionalProperties: false },
    ),
    seats: t.Array(
      t.Object(
        { id: t.String(), number: t.Integer(), screenId: t.String() },
        { additionalProperties: false },
      ),
      { additionalProperties: false },
    ),
    showTimes: t.Array(
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
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const ScreenPlainInputCreate = t.Object(
  { number: t.Integer() },
  { additionalProperties: false },
);

export const ScreenPlainInputUpdate = t.Object(
  { number: t.Optional(t.Integer()) },
  { additionalProperties: false },
);

export const ScreenRelationsInputCreate = t.Object(
  {
    theatre: t.Object(
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
    seats: t.Optional(
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
    showTimes: t.Optional(
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

export const ScreenRelationsInputUpdate = t.Partial(
  t.Object(
    {
      theatre: t.Object(
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
      seats: t.Partial(
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
      showTimes: t.Partial(
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

export const ScreenWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          number: t.Integer(),
          theatreId: t.String(),
        },
        { additionalProperties: false },
      ),
    { $id: "Screen" },
  ),
);

export const ScreenWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object(
            {
              id: t.String(),
              theatreId_number: t.Object(
                { theatreId: t.String(), number: t.Integer() },
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
              theatreId_number: t.Object(
                { theatreId: t.String(), number: t.Integer() },
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
            { id: t.String(), number: t.Integer(), theatreId: t.String() },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "Screen" },
);

export const ScreenSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      number: t.Boolean(),
      theatreId: t.Boolean(),
      theatre: t.Boolean(),
      seats: t.Boolean(),
      showTimes: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const ScreenInclude = t.Partial(
  t.Object(
    {
      theatre: t.Boolean(),
      seats: t.Boolean(),
      showTimes: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const ScreenOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      number: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      theatreId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const Screen = t.Composite([ScreenPlain, ScreenRelations], {
  additionalProperties: false,
});

export const ScreenInputCreate = t.Composite(
  [ScreenPlainInputCreate, ScreenRelationsInputCreate],
  { additionalProperties: false },
);

export const ScreenInputUpdate = t.Composite(
  [ScreenPlainInputUpdate, ScreenRelationsInputUpdate],
  { additionalProperties: false },
);
