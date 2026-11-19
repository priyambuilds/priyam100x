import Elysia from "elysia"
import { useJwtPlugin } from "./jwt"
import bearer from "@elysia/bearer"
import { UnauthorizedError } from "../lib/errors";
export const useAuthPlugin = new Elysia({ name: "auth-plugin" })
  .use(useJwtPlugin)
  .use(bearer())
  .resolve({ as: "scoped" }, async ({ jwt, bearer }) => {
    if (!bearer) {
      throw new UnauthorizedError("Missing or malformed Auth header")
    }
    const decoded = await jwt.verify(bearer)
    if (!decoded || !decoded.userId) {
      throw new UnauthorizedError("Invalid or expored jwt session token")
    }
    return {
      userId: decoded.userId as string,
    }
  })
