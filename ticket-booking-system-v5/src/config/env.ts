export const ENV = {
    DATABASE_URL: process.env.DATABASE_URL,
    PORT: process.env.PORT || 3000,
    SECRET: process.env.SECRET
}

if(!ENV.DATABASE_URL) throw new Error("Database URL is missing");
if(!ENV.SECRET) throw new Error("JWT Secret is missing");