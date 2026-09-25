import { Elysia } from "elysia"
import { Prisma } from "../../generated/prisma/client"

export const errorHandler = new Elysia({ name: "plugin:errorHandler" })
    .onError({ as: "global" }, ({ code, error, set }) => {
        if (code === "VALIDATION") {
            set.status = 422
            return {
                success: false,
                message: "Validation error",
                errors: error.all
            }
        }
        if (code === "NOT_FOUND") {
            set.status = 404
            return {
                success: false,
                message: "Route not found",
            }
        }
        // Prisma unique constraint violation
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            set.status = 409;
            return {
                success: false,
                message: "Resource already exists",
            }
        }
        console.log("Unhandeled error:", error);
        set.status = 500;
        return {
            success: false,
            message: "Internal server error",
        }
    })