import express from "express";
import protect from "../middlewares/authMiddleware.js";
import {
  completeStudySession,
  getActiveStudySession,
  getStudySessionHistory,
  pauseStudySession,
  resumeStudySession,
  startStudySession,
} from "../controllers/studySessionController.js";

const router = express.Router();

router.get("/active", protect, getActiveStudySession);
router.get("/history", protect, getStudySessionHistory);
router.post("/start", protect, startStudySession);
router.patch("/:sessionId/pause", protect, pauseStudySession);
router.patch("/:sessionId/resume", protect, resumeStudySession);
router.patch("/:sessionId/complete", protect, completeStudySession);

export default router;
