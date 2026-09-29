import Elysia from "elysia"
import { jwtSetup } from "../../plugins/jwt"
import { signinUserService, signupUserService } from "./service"
import { AuthTokenResponseSchema, AuthUserResponseSchema, signinSchema, signupSchema } from "./types"
import { res } from "../../lib/response"

export const authRoutes = new Elysia({ prefix: "/auth" })
    .use(jwtSetup)
    .post(
        "/signup",
        async ({ body, status }) => {
            const user = await signupUserService(body.username, body.email, body.password, body.role!)
            return status(201, {
                success: true,
                message: "Signed up successfully",
                data: user,
            })
        },
        {
            body: signupSchema,
            response: { 201: res(AuthUserResponseSchema) },
            detail: {
                summary: "Create a new user account",
                tags: ["Auth"],
            },
        },
    )
    .post(
    "/signin",
    async ({ body, jwt, status }) => {
        const user = await signinUserService(body.username, body.password);
        const token = await jwt.sign({ userId: user.id, role: user.role });

        return status(201, {
            success: true,
            message: "Signed in successfully",
            data: { token },
        });
    },
    {
        body: signinSchema,
        response: { 201: res(AuthTokenResponseSchema) },
        detail: {
            summary: "Signin with your username and password",
            tags: ["Auth"],
        },
    },
)