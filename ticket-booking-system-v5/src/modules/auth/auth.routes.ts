import { Elysia } from "elysia";
import { jwtSetup } from "../../plugins/auth";
import { signupSchema } from "./auth.schema";
import { signupUser, verifyUser } from "./auth.service";
import { signinSchema } from '../../../../ticket-booking-system-v3/src/types/index';

export const authRoutes = new Elysia({ prefix: "/auth" })
    .use(jwtSetup)
    .post("/signup", async ({ body }) => {
        const user = await signupUser(body.username, body.email, body.password, body.role!);
        return {
            success: true,
            message: "Signup Successful",
            data: user
        }
    }, {
        body: signupSchema,
        detail: {
            summary: "Create a new user account", tags: ["Auth"]
        }
    })
    .post("/signin", async ({ body, jwt, status }) => {
        const user = await verifyUser(body.username, body.password);
        
        if (!user) {
            return status(401, {
                success: false,
                message: "Invalid username or password"
            })
        }

        const token = await jwt.sign({ userId: user.id, role: user.role });
        
        return {
            success: true,
            messagd: "Signin Successful",
            data: {id: user.id, username: user.username, token}
        }
    }, {
        body: signinSchema,
        detail: {
            summary: "Sign in with username and password", tags: ["Auth"]
        }
})