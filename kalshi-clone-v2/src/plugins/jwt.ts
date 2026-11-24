import { Elysia, t } from "elysia"
import jwt from "@elysia/jwt"

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("Jwt secret is not defined");
}

export const useJwtPlugin = new Elysia({ name: "jwt-plugin" }).use(
  jwt({
    name: "jwt",
    secret: jwtSecret,
    exp: "7d",
    schema: t.Object({
      userId: t.String(),
    }),
  }),
)
