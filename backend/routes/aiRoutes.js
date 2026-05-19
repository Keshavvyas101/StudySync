import express from "express";
import protect from "../middlewares/authMiddleware.js";
import {
  approveAIAction,
  denyAIAction,
  draftAIAction,
} from "../controllers/aiActionController.js";
import { copilot, parseTask } from "../controllers/aiController.js";
import { requireAIEnabled } from "../services/ai/featureFlags.js";

const router = express.Router();

router.post("/parse-task", protect, parseTask);
router.post("/copilot", protect, requireAIEnabled, copilot);
router.post("/actions/draft", protect, requireAIEnabled, draftAIAction);
router.post("/actions/:id/approve", protect, requireAIEnabled, approveAIAction);
router.post("/actions/:id/deny", protect, requireAIEnabled, denyAIAction);

export default router;
