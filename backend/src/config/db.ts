import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

let connected = false;

export async function connectDb(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  if (connected && mongoose.connection.readyState === 1) return mongoose;
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  connected = true;
  logger.info(`Connected to MongoDB at ${uri.replace(/\/\/[^@]*@/, "//***@")}`);
  return mongoose;
}

export async function disconnectDb(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}
