import "dotenv/config"
import Redis from "ioredis"

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  // Imagine you deploy your app to production, or you run docker compose up. What happens if:
  // Redis takes 3 seconds longer to start than your Bun server?
  // Or your Wi-Fi/network blips for 1 second?
  // Or Redis restarts during a routine server update?

  // Without retryStrategy, the Redis client will say: "Connection refused! Fatal error!" and crash your entire backend server process immediately.
  // retryStrategy is how you tell the client:
  // "Don't crash! If Redis disconnects, wait a moment and try reconnecting automatically."
  retryStrategy(times) {
    // Math.min(..., 2000) ensures it never waits more than 2 seconds between attempts.
    return Math.min(times * 50, 2000)
  },
})

redis.on("connect", () => {
  console.log("Connected to Redis")
})

redis.on("error", (err) => {
  console.error("Redis error:", err)
})

// Standard key names
export const RedisKeys = {
  // Hash map of price -> total quantity available at that price
  orderBookDepth: (marketId: string, outcome: "YES" | "NO", side: "BUY" | "SELL") =>
    `kalshi:book:${marketId}:${outcome.toLowerCase()}:${side.toLowerCase()}`,
  // channel for broadcasting trade executions
  tradeChannel: (marketId: string) => `kalshi:trades:${marketId}`,
}

// updated the live aggregated depth in Redis when an order Rests, Fills or Cancels
// eg: At price 60 cents there are now 16 contracts available
export async function updateOrderBookdepth(
  marketId: string,
  outcome: "YES" | "NO",
  side: "BUY" | "SELL",
  price: number,
  quantityDelta: number,
) {
  const key = RedisKeys.orderBookDepth(marketId, outcome, side)
  const priceField = price.toString()

  // Increment or Decrement the depth at this price level
  const newQty = await redis.hincrby(key, priceField, quantityDelta)

  // If quantity drops to 0 or below, remove this price level from the book
  if (newQty <= 0) {
    await redis.hdel(key, priceField)
  }
}

// Fetch the full orderbook depth instantly
export async function getOrderBookDepth(marketId: string, outcome: "YES" | "NO", side: "BUY" | "SELL") {
  const key = RedisKeys.orderBookDepth(marketId, outcome, side)
  const rawDepth = await redis.hgetall(key)

  // Conver raw redis string into soted numbers
  return Object.entries(rawDepth)
    .map(([price, qty]) => ({
      price: parseInt(price, 10),
      quantity: parseInt(qty, 10),
    }))
    .filter((level) => level.quantity > 0)
    .sort((a, b) => (side === "BUY" ? b.price - a.price : a.price - b.price))
}

// Broadcasts a completed trade to any listening frontend or client
export async function broadcastTrade(marketId: string, tradeData: Record<string, unknown>) {
  const channel = RedisKeys.tradeChannel(marketId);
  await redis.publish(channel, JSON.stringify(tradeData));
}