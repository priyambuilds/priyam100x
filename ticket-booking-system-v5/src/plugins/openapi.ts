import { openapi } from "@elysia/openapi"

export const openapiPlugin = openapi({
    documentation: {
        info: {
            title: "Ticket Booking System API",
            version: "5.0.0",
            description: "Rewrite in Elysiajs with OpenAPI specs and bun:tests"
        }
    }
})