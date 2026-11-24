import { t } from "elysia";

export const signupSchema = t.Object({
  username: t.String({ minLength: 2, maxLength: 32 }),
  password: t.String({ minLength: 8, maxLength: 100 }),
})

export const loginSchema = t.Object({
  username: t.String({ minLength: 2, maxLength: 32 }),
  password: t.String({ minLength: 8, maxLength: 100 }),
})
export type SignupInput = typeof signupSchema.static;
export type LoginInput = typeof loginSchema.static