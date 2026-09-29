import { Elysia, t } from "elysia";
import { authPlugin } from "../../plugins/auth";
import { topupSchema, WalletResponseSchema } from "./types";
import { res } from "../../lib/response";
import { getWalletBalanceService, topUpWalletService } from "./service";

export const walletRoutes = new Elysia({ prefix: "/wallet" })
    .use(authPlugin)
    .post("/topup", async ({userId, body, status}) => {
        const wallet = await topUpWalletService(userId, body.amountCents, body.idempotencyKey)

        return status(200, {
            success: true,
            message: `Wallet topuped successfully with ${body.amountCents}`,
            data: wallet
        })
    }, {
        body: topupSchema,
        response: res(WalletResponseSchema),
        detail: {
            summary: "Topup wallet balance",
            tags: ["Wallet"]
        }
    })
    .get("/balance", async ({ userId, status }) => {
        const balance = await getWalletBalanceService(userId);
        return status(200, { success: true as const, message: "Wallet balance fetched successfully", data: balance });
    }, { 
        response: { 200: res(t.Any()) },
        detail: { summary: "Get wallet balance", tags: ["Wallet"] } 
    })
