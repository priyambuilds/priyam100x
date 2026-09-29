import { Elysia } from "elysia";
import cors from "@elysia/cors";
import { openapiPlugin } from './plugins/openapi';
import { errorHandlerPlugin } from "./plugins/errorHander";
import { authRoutes } from "./modules/auth/routes";
import { adminRoutes } from "./modules/admin/routes";
import { catlogRoutes } from "./modules/catlog/routes";
import { bookingRoutes } from "./modules/booking/routes";
import { walletRoutes } from "./modules/wallet/routes";
import { transactionRoutes } from "./modules/transaction/routes";

export const app = new Elysia({ prefix: "/api/v5" })
    .use(cors())
    .use(openapiPlugin)
    .use(errorHandlerPlugin)

    .use(authRoutes)
    .use(adminRoutes)
    .use(catlogRoutes)
    .use(bookingRoutes)
    .use(walletRoutes)
    .use(transactionRoutes)