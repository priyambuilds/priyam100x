import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const MoviePlain = t.Object(
  { id: t.String(), name: t.String() },
  { additionalProperties: false },
);

export const MovieRelations = t.Object(
  {
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

export const MoviePlainInputCreate = t.Object(
  { name: t.String() },
  { additionalProperties: false },
);

export const MoviePlainInputUpdate = t.Object(
  { name: t.Optional(t.String()) },
  { additionalProperties: false },
);

export const MovieRelationsInputCreate = t.Object(
  {
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

export const MovieRelationsInputUpdate = t.Partial(
  t.Object(
    {
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

export const MovieWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          name: t.String(),
        },
        { additionalProperties: false },
      ),
    { $id: "Movie" },
  ),
);

export const MovieWhereUnique = t.Recursive(
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
            { id: t.String(), name: t.String() },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "Movie" },
);

export const MovieSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      name: t.Boolean(),
      showTimes: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const MovieInclude = t.Partial(
  t.Object(
    { showTimes: t.Boolean(), _count: t.Boolean() },
    { additionalProperties: false },
  ),
);

export const MovieOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      name: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const Movie = t.Composite([MoviePlain, MovieRelations], {
  additionalProperties: false,
});

export const MovieInputCreate = t.Composite(
  [MoviePlainInputCreate, MovieRelationsInputCreate],
  { additionalProperties: false },
);

export const MovieInputUpdate = t.Composite(
  [MoviePlainInputUpdate, MovieRelationsInputUpdate],
  { additionalProperties: false },
);
