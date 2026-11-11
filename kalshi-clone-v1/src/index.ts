import "dotenv/config";
import { app } from "./app";
import { createExtrnalAccount } from "./lib/bootstrap";

const PORT = Number(process.env.PORT) || 3000;

async function start() {
  try {
    // 1. create the external acc
    await createExtrnalAccount();

    app.listen(PORT, () => {
      console.log(`Mini Kalshi server listening at http://localhost:${PORT}`);
      console.log(`OpenAPI docs at http://localhost:${PORT}/docs`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
