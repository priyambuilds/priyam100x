import { Elysia, t } from "elysia"
import jwt from "@elysia/jwt"

export const useJwtPlugin = new Elysia({ name: "jwt-plugin" }).use(
  jwt({
    name: "jwt",
    secret: process.env.JWT_SECRET || "delfault_super_secret_jwt_key",
    exp: "7d",
    schema: t.Object({
      userId: t.String(),
    }),
  }),
)
