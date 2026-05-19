import express from "express";
import protect from "../middlewares/authMiddleware.js";
import { copilot, parseTask } from "../controllers/aiController.js";
import { requireAIEnabled } from "../services/ai/featureFlags.js";

const router = express.Router();

router.post("/parse-task", protect, parseTask);
router.post("/copilot", protect, requireAIEnabled, copilot);

export default router;
