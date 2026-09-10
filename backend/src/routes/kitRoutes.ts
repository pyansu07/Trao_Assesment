import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  AddQuestionSchema,
  UpdateQuestionSchema,
  ReorderQuestionsSchema,
  PinSchema,
  RegenerateQuestionsSchema,
  AddFlashcardSchema,
  UpdateFlashcardSchema,
  PracticeFlashcardSchema,
  UpdateCompanyBriefSchema,
  ForceOnlySchema,
  RegenerateScheduleSchema,
} from "../validation/kitRequestSchemas.js";
import {
  createKitHandler,
  listKitsHandler,
  getKitHandler,
  deleteKitHandler,
  updateCompanyBriefHandler,
  pinCompanyBriefHandler,
  regenerateCompanyBriefHandler,
  addQuestionHandler,
  updateQuestionHandler,
  deleteQuestionHandler,
  reorderQuestionsHandler,
  pinQuestionHandler,
  regenerateQuestionsHandler,
  addFlashcardHandler,
  updateFlashcardHandler,
  deleteFlashcardHandler,
  pinFlashcardHandler,
  practiceFlashcardHandler,
  regenerateFlashcardsHandler,
  regenerateScheduleHandler,
} from "../controllers/kitsController.js";

const router = Router();
router.use(requireAuth);

const generationRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/", generationRateLimit, createKitHandler);
router.get("/", listKitsHandler);
router.get("/:id", getKitHandler);
router.delete("/:id", deleteKitHandler);

router.patch("/:id/company-brief", validateBody(UpdateCompanyBriefSchema), updateCompanyBriefHandler);
router.post("/:id/company-brief/pin", validateBody(PinSchema), pinCompanyBriefHandler);
router.post(
  "/:id/company-brief/regenerate",
  generationRateLimit,
  validateBody(ForceOnlySchema),
  regenerateCompanyBriefHandler,
);

router.post("/:id/questions", validateBody(AddQuestionSchema), addQuestionHandler);
router.patch("/:id/questions/:qid", validateBody(UpdateQuestionSchema), updateQuestionHandler);
router.delete("/:id/questions/:qid", deleteQuestionHandler);
router.post("/:id/questions/reorder", validateBody(ReorderQuestionsSchema), reorderQuestionsHandler);
router.post("/:id/questions/:qid/pin", validateBody(PinSchema), pinQuestionHandler);
router.post(
  "/:id/questions/regenerate",
  generationRateLimit,
  validateBody(RegenerateQuestionsSchema),
  regenerateQuestionsHandler,
);

router.post("/:id/flashcards", validateBody(AddFlashcardSchema), addFlashcardHandler);
router.patch("/:id/flashcards/:fid", validateBody(UpdateFlashcardSchema), updateFlashcardHandler);
router.delete("/:id/flashcards/:fid", deleteFlashcardHandler);
router.post("/:id/flashcards/:fid/pin", validateBody(PinSchema), pinFlashcardHandler);
router.post("/:id/flashcards/:fid/practice", validateBody(PracticeFlashcardSchema), practiceFlashcardHandler);
router.post(
  "/:id/flashcards/regenerate",
  generationRateLimit,
  validateBody(ForceOnlySchema),
  regenerateFlashcardsHandler,
);

router.post("/:id/schedule/regenerate", validateBody(RegenerateScheduleSchema), regenerateScheduleHandler);

export default router;
