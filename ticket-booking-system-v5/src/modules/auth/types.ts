import { t } from "elysia";

export const signupSchema = t.Object({
    username: t.String({ minLength: 3 }),
    email: t.String({ format: "email" }),
    password: t.String({ minLength: 6 }),
    role: t.Union([t.Literal("USER"), t.Literal("ADMIN")])
})

export const signinSchema = t.Object({
    username: t.String(),
    password: t.String(),
})

export const AuthUserResponseSchema = t.Object({
    id: t.String(),
    username: t.String(),
    email: t.String(),
    role: t.Union([t.Literal("USER"), t.Literal("ADMIN")])
});

export const AuthTokenResponseSchema = t.Object({
    token: t.String()
});
