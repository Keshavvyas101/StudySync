import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";

// Summary & core stats
import { getMyBadges } from "../controllers/analytics/badgeController.js";
import {
  getRoomSummary,
} from "../controllers/analytics/summaryController.js";

// Productivity & personal performance
import {
  
  getDailyProductivity,
  getWeeklyConsistency,
  getWeeklyComparison,
  getProductivityScore,
} from "../controllers/analytics/productivityController.js";

import { getRoomStreak } from "../controllers/analytics/streakController.js";

// Activity & comparison
import {
  getLast7DaysActivity,
  getRoomComparison,
} from "../controllers/analytics/activityController.js";

const router = express.Router();

// ===============================
// SUMMARY
// ===============================
router.get("/room/:roomId/summary", authMiddleware, getRoomSummary);

// ===============================
// PERSONAL PRODUCTIVITY
// ===============================
router.get("/room/:roomId/streak", authMiddleware, getRoomStreak);
router.get("/room/:roomId/daily", authMiddleware, getDailyProductivity);
router.get("/room/:roomId/consistency", authMiddleware, getWeeklyConsistency);
router.get("/room/:roomId/weekly-comparison", authMiddleware, getWeeklyComparison);
router.get("/room/:roomId/productivity", authMiddleware, getProductivityScore);

// ===============================
// ACTIVITY & ROOM COMPARISON
// ===============================
router.get("/room/:roomId/activity-7days", authMiddleware, getLast7DaysActivity);
router.get("/room/:roomId/room-comparison", authMiddleware, getRoomComparison);
router.get("/me/badges", authMiddleware, getMyBadges);

export default router;


