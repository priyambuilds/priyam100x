import { t } from "elysia";

export const signupSchema = t.Object({
  username: t.String({ minLength: 3, maxLength: 32 }),
  password: t.String({minLength: 8, maxLength: 100})
})

export const signinSchema = t.Object({
  username: t.String({ minLength: 3, maxLength: 32 }),
  password: t.String({minLength: 8, maxLength: 100})
})