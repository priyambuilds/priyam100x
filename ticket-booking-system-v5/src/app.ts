import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors"

// Plugins
import { errorHandler } from "./plugins/error-handler";
import { openapiPlugin } from "./plugins/openapi";

// Modules
import { catlogRoutes } from "./modules/catlog/catlog.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { bookingRoutes } from "./modules/booking/booking.routes";

export const app = new Elysia({ prefix: "/api/v5" })
    // Core plugins
    .use(cors())
    .use(openapiPlugin)
    .use(errorHandler)

// Feature modules
    .use(catlogRoutes)
    .use(authRoutes)
    .use(catlogRoutes)
    .use(bookingRoutes)
    
