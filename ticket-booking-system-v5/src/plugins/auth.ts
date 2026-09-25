import { Elysia } from "elysia";
import { jwt } from "@elysia/jwt";
import { bearer } from "@elysia/bearer";
import { ENV } from "../config/env";

export const jwtSetup = jwt({
    name: "jwt",
    secret: ENV.SECRET as string,
    exp: "7d"
})

export const requireAuth = new Elysia({ name: "plugin:requireAuth" })
    .use(jwtSetup)
    .use(bearer())
    .resolve({ as: "scoped" }, async ({ jwt, bearer, status }) => {
        if (!bearer) return status(401, {
            success: false,
            message: "Missing token"
        })
        const decoded = await jwt.verify(bearer)

        if (!decoded || !decoded.userId || !decoded.role) {
            return status(401,
                {
                    success: false,
                    message: "Invalid or expired token"
                }
            )
        }

        return {
            userId: decoded.userId as string,
            role: decoded.role as string
        }
    })

export const requireAdmin = new Elysia({ name: "plugin:requireAdmin" })
    .use(requireAuth)
    .resolve({ as: "scoped" }, ({ role, status }) => {
        if (role !== "ADMIN") {
            return status(403, {
                success: false,
                message: "Admin access required"
        })
    }
})