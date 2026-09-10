import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getRunHandler } from "../controllers/runsController.js";

const router = Router();
router.use(requireAuth);
router.get("/:id", getRunHandler);

export default router;
