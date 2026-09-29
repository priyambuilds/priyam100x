import { t, type TSchema } from "elysia";

export const res = <T extends TSchema>(schema: T) => (
    t.Object({
        success: t.Literal(true),
        message: t.Optional(t.String()),
        data: schema
    })
)