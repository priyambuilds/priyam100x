import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

config({ path: ".env.local" })

const databaseUrl = process.env.EXCHANGE_DATABASE_URL

if (!databaseUrl) {
  throw new Error("EXCHANGE_DATABASE_URL not configured")
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle-exchange",
  dbCredentials: {
    url: databaseUrl,
  },
})
