import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema";

const databaseUrl = process.env.EXCHANGE_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("EXCHANGE_DATABASE_URL is required");
}

export const db = drizzle(databaseUrl, { schema });