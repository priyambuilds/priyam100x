import Elysia from "elysia"
import { AppError } from "../lib/errors"

export const errorHandlerPlugin = new Elysia({ name: "error-handler" }).onError(
  { as: "global" },
  ({ code, error, set }) => {
    if (error instanceof AppError) {
      set.status = error.status
      return {
        success: false,
        message: error.message
      }
    }

    if (code === "VALIDATION") {
      set.status = 400;
      return {
        success: false,
        message: error.message,
      };
    }
     if (code === "UNKNOWN" || code === "INTERNAL_SERVER_ERROR") {
      console.error("Unhandled error:", error);
      set.status = 500;
      return {
        success: false,
        message: "Internal server error",
      };
    }
  },
)
