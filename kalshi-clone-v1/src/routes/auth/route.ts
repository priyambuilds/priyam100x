import { Elysia } from "elysia"
import { useJwtPlugin } from "../../plugins/jwt"
import { signinService, signupService } from "./service"
import { signinSchema, signupSchema } from "./types"

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(useJwtPlugin)
  .post(
    "/signup",
    async ({ body, status }) => {
      const user = await signupService(body.username, body.password)
      return status(201, {
        success: true,
        message: "Signed up successfully",
        data: user,
      })
    },
    {
      body: signupSchema,
      detail: {
        summary: "Create a new user account",
        tags: ["Auth"],
      },
    },
  )
  .post(
    "/signin",
    async ({ body, jwt, status }) => {
      const user = await signinService(body.username, body.password)
      const token = await jwt.sign({ userId: user.userId })
      return status(200, {
        success: true,
        message: "Signed in successfully",
        data: { token },
      })
    },
    {
      body: signinSchema,
      detail: {
        summary: "Sign in to your account",
        tags: ["Auth"],
      },
    },
  )
