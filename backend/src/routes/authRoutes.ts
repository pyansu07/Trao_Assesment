import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, logout, me } from "../controllers/authController.js";
import { validateBody } from "../middleware/validate.js";
import { RegisterSchema, LoginSchema } from "../validation/authSchemas.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", authRateLimit, validateBody(RegisterSchema), register);
router.post("/login", authRateLimit, validateBody(LoginSchema), login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
