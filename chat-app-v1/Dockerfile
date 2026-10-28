FROM oven/bun:1
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY prisma ./prisma
COPY prisma.config.ts ./
# `prisma generate` only needs the schema; the URL is a placeholder it never connects to.
RUN DATABASE_URL=postgres://placeholder bunx prisma generate

COPY src ./src
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
USER bun
CMD ["bun", "src/main.ts"]
