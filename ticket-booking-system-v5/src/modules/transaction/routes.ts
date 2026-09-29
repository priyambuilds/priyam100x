import { Elysia } from "elysia"
import { authPlugin } from "../../plugins/auth"
import { res } from "../../lib/response"
import { TransactionListSchema } from "./schema"
import { getTransactions } from "./service"
import { requireAdmin } from "../../plugins/admin"

const adminTransaction = new Elysia()
    .use(requireAdmin)
    .get("/all", async ({userId, role}) => {
        const transactions = await getTransactions(userId, role)
        return {
            success: true as const,
            data: transactions
        }
    }, {
        response: { 200: res(TransactionListSchema) },
        detail: {
            summary: "Get all transactions (admin only)",
            tags: ["Transactions"],
        },
    })

export const transactionRoutes = new Elysia({ prefix: "/transactions" })
    .use(authPlugin)
    .get("/", async ({ userId, role }) => {
        const transactions = await getTransactions(userId, role)
        return {
            success: true as const,
            data: transactions,
        }
    },
    {
        response: { 200: res(TransactionListSchema) },
        detail: {
            summary: "Get user transactions",
            tags: ["Transactions"],
        },
        })
    .use(adminTransaction)
