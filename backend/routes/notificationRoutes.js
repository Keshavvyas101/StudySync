import express from "express";
import protect from "../middlewares/authMiddleware.js";
import { deleteNotification } from "../controllers/notificationController.js";
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();


router.get("/", protect, getMyNotifications);
router.patch("/:id/read", protect, markAsRead);
router.patch("/read-all", protect, markAllAsRead);

router.delete(
  "/:id",
  protect,
  deleteNotification
);

export default router;
