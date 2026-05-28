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

import {
  addSubtask,
  toggleSubtask,
  updateSubtask,
  deleteSubtask,
} from "../controllers/subtaskController.js";

import {
  requireTaskMember,
  requireTaskOwnerOrRoomOwner,
} from "../middlewares/taskPermissions.js";

const router = express.Router();

/* ===========================
   TASK ROUTES
=========================== */

router.post("/:roomId", protect, requireRoomMember, createTask);

router.get("/:roomId", protect, requireRoomMember, getTasksByRoom);

router.patch("/:taskId", protect, requireTaskMember, updateTask);

router.delete(
  "/:taskId",
  protect,
  requireTaskMember,
  requireTaskOwnerOrRoomOwner,
  deleteTask
);

router.patch(
  "/:taskId/status",
  protect,
  requireTaskMember,
  toggleTaskStatus
);

/* ===========================
   SUBTASK ROUTES
=========================== */

router.post(
  "/:taskId/subtasks",
  protect,
  requireTaskMember,
  addSubtask
);

router.patch(
  "/:taskId/subtasks/:subtaskId/toggle",
  protect,
  requireTaskMember,
  toggleSubtask
);

router.patch(
  "/:taskId/subtasks/:subtaskId",
  protect,
  requireTaskMember,
  updateSubtask
);

router.delete(
  "/:taskId/subtasks/:subtaskId",
  protect,
  requireTaskMember,
  deleteSubtask
);

export default router;
