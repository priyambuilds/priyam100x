import { t } from "elysia";
import { UserRole } from "../../../generated/prisma/enums";
export const signupSchema = t.Object({
    username: t.String({ minLength: 3, maxLength: 20 }),
    email: t.String({ format: "email" }),
    password: t.String({ minLength: 8 }),
    role: t.Optional(t.Enum(UserRole, {default: "USER"}))
})

export const singinSchema = t.Object({
    username: t.String({ minLength: 3, maxLength: 20 }),
    password: t.String({ minLength: 8 })
})