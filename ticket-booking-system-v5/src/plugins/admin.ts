import { Elysia } from "elysia"
import { authPlugin } from "./auth"
import { ForbiddenError } from "../lib/errors"

export const requireAdmin = new Elysia({ name: "requireAdmin" })
    .use(authPlugin)
    .onBeforeHandle(({role}) => {
        if (role !== "ADMIN") {
            throw new ForbiddenError("Admin access is required");
        }
    })
    .as("scoped")
