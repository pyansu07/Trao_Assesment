import { env } from "./config/env.js";
import { connectDb } from "./config/db.js";
import { logger } from "./config/logger.js";
import { createApp } from "./app.js";
import { GenerationRun } from "./models/GenerationRun.js";

async function main() {
  await connectDb();
  // Ensure the idempotency-enforcing partial unique index exists before
  // serving traffic (see models/GenerationRun.ts).
  await GenerationRun.init();
  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`Backend listening on port ${env.PORT} (${env.NODE_ENV}, retrieval=${env.RETRIEVAL_ENV})`);
  });
}

main().catch((err) => {
  logger.error("Fatal startup error", err);
  process.exit(1);
});
