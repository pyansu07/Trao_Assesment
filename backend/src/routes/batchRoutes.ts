import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";
import { startBatchHandler, getBatchHandler } from "../controllers/batchController.js";

const router = Router();
router.use(requireAuth);

const batchRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/", batchRateLimit, startBatchHandler);
router.get("/:batchId", getBatchHandler);

export default router;
