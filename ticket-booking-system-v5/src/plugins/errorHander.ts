import { Elysia } from "elysia"
import { Prisma } from "../../generated/prisma/client"
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from "../lib/errors"

export const errorHandlerPlugin = new Elysia({ name: "plugin:errorHandler" }).onError(
    { as: "global" },
    ({ code, error, status }) => {
        if (code === "VALIDATION") {
            return status(422, {
                success: false,
                message: "Validation error",
                error: error.all,
            })
        }

        if (code === "NOT_FOUND") {
            return status(422, {
                success: false,
                message: "Validation error",
                error: error,
            })
        }

        const err = error as Error
        const errorName = err?.name || "Unknown"
        const errorMessage = err?.message || "An unexpected error occured"

        if (errorName === "BadRequestError" || error instanceof BadRequestError) {
            return status(400, {
                success: false,
                message: errorMessage,
            })
        }
        if (errorName === "UnauthorizedError" || error instanceof UnauthorizedError) {
            return status(401, {
                success: false,
                message: errorMessage,
            })
        }
        if (errorName === "ConflictError" || error instanceof ConflictError) {
            return status(409, {
                success: false,
                message: errorMessage,
            })
        }
        if (errorName === "NotFoundError" || error instanceof NotFoundError) {
            return status(404, {
                success: false,
                message: errorMessage,
            })
        }

        if (errorName === "ForbiddenError" || error instanceof ForbiddenError) {
            return status(403, {
                success: false,
                message: errorMessage,
            })
        }

        // Prisma errors
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                return status(409, {
                    success: false,
                    message: "Prisma error, target already exists",
                })
            }
            if (error.code === "P2003") {
                return status(400, {
                    success: false,
                    message: "Invalid reference field does not exist",
                })
            }
            if (error.code === "P2025") {
                return status(404, {
                    success: false,
                    message: "The requested resource was not found",
                })
            }
            return status(400, {
                success: false,
                message: "database error",
                error: error
            })
        }

        console.log("Unhandled error", errorName, errorMessage)
        return status(500, {
            success: false,
            message: "Unhandled: Internal server error",
            error: error
        })
    },
)
