import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import kitRoutes from "./routes/kitRoutes.js";
import runRoutes from "./routes/runRoutes.js";
import batchRoutes from "./routes/batchRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  // FRONTEND_URL may be a comma-separated list (e.g. a stable production
  // domain plus a custom domain) - trailing slashes are ignored so a
  // copy-pasted URL with or without one still matches.
  const allowedOrigins = env.FRONTEND_URL.split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin(requestOrigin, callback) {
        // no Origin header (curl, server-to-server, same-origin) - allow
        if (!requestOrigin) return callback(null, true);
        const normalized = requestOrigin.replace(/\/$/, "");
        if (allowedOrigins.includes(normalized)) return callback(null, true);
        callback(new Error(`Origin ${requestOrigin} is not allowed`));
      },
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", env: env.NODE_ENV, retrievalEnv: env.RETRIEVAL_ENV });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/kits", kitRoutes);
  app.use("/api/runs", runRoutes);
  app.use("/api/batch", batchRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
