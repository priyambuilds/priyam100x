import Elysia from "elysia"
import { loginService, signupService } from "./service"
import { loginSchema, signupSchema } from "./types"
import { useJwtPlugin } from '../../plugins/jwt';

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post(
    "/signup",
    async ({ body, status }) => {
      const data = await signupService(body)
      return status(200, {
        success: true,
        data,
      })
    },
    { body: signupSchema },
)
  .use(useJwtPlugin)
  .post(
    "/login",
    async ({ body, status, jwt }) => {
      const data = await loginService(body)
      const token = await jwt.sign({userId: data.id});
      return status(201, {
        status: true,
        data: {token},
      })
    },
    { body: loginSchema },
  )
