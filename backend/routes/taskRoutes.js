import express from "express";
import protect from "../middlewares/authMiddleware.js";
import { requireRoomMember } from "../middlewares/roomPermissions.js";
import {
  createTask,
  getTasksByRoom,
  updateTask,
  deleteTask,
  toggleTaskStatus,
} from "../controllers/taskController.js";
import { requireTaskMember, requireTaskOwnerOrRoomOwner } from "../middlewares/taskPermissions.js";

const router = express.Router();

router.post("/:roomId", protect, requireRoomMember, createTask);
router.get("/:roomId", protect, requireRoomMember, getTasksByRoom);
router.patch("/:taskId", protect,requireTaskMember, updateTask);
router.delete("/:taskId", protect,requireTaskMember,
  requireTaskOwnerOrRoomOwner, deleteTask);

  router.patch(
  "/:taskId/status",
  protect,
  requireTaskMember,
  toggleTaskStatus
);

export default router;



