import { openapi } from '@elysia/openapi'

export const openapiPlugin = openapi({
    documentation: {
        info: {
            title: "Ticket Booking system api",
            version: "5.0.0",
            description: "Movie booking app backend rewrtie with Elysiajs, OpenAPI specs and bun:tests"
        }
    }
})