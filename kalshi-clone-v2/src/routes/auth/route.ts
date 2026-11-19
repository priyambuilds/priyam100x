import Elysia from "elysia"
import { useJwtPlugin } from "../../plugins/jwt"
import { signinService, signupService } from "./service"
import { signinSchema, signupSchema } from "./types"

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(useJwtPlugin)
  .post(
    "/signup",
    async ({ body, status }) => {
      const user = await signupService(body.username, body.password)
      return status(200, {
        success: true,
        message: "Account created successfully,",
        data: user,
      })
    },
    {
      body: signupSchema,
    },
  )
  .post(
    "/signin",
    async ({ body, jwt, status }) => {
      const user = await signinService(body.username, body.password)
      const token = await jwt.sign({ userId: user.userId })
      return status(201, {
        success: true,
        message: "Signed in successfully",
        data: {
          token,
          user: {
            id: user.userId,
            username: user.username,
          },
        },
      })
    },
    { body: signinSchema },
  )
