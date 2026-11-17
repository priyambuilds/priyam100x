import { Elysia } from "elysia"
import { AppError } from "../lib/errors"

export const errorHandler = new Elysia({ name: "errorHandler-plugin" }).onError(
  { as: "global" },
  ({ code, error, set }) => {
    // 1. handle our custom app errors
    if (error instanceof AppError) {
      set.status = error.status
      return {
        success: false,
        message: error.message,
      }
    }
    // 2. Handle Elysia's schema validation errors
    if (code === "VALIDATION") {
      set.status = 400
      return {
        success: false,
        message: "Invalid request payload",
        details: error.message,
      }
    }

    // 3. Fallback for unhandeled server crashes
    console.error("Unhandeled internal error", error)
    set.status = 500
    return {
      success: false,
      message: "Internal server error",
    }
  },
)
