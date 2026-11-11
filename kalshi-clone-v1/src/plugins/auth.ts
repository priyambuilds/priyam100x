import { Elysia } from "elysia"
import bearer from "@elysia/bearer"
import { useJwtPlugin } from "./jwt"
import { UnauthorizedError } from "../lib/errors"

export const useAuthPlugin = new Elysia({ name: "authPlugin" })
  .use(useJwtPlugin)
  .use(bearer())
  .resolve({ as: "scoped" }, async ({ jwt, bearer }) => {
    if (!bearer) {
      throw new UnauthorizedError("Missing or malformed token")
    }

    const decoded = await jwt.verify(bearer)

    if (!decoded || !decoded.userId) {
      throw new UnauthorizedError("Malformed token")
    }
    return { userId: decoded.userId as string }
  })
