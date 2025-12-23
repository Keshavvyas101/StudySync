import express from "express";
import protect from "../middlewares/authMiddleware.js";
import {
  createTask,
  getTasksByRoom,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";

const router = express.Router();

router.post("/:roomId", protect, createTask);
router.get("/:roomId", protect, getTasksByRoom);
router.patch("/:taskId", protect, updateTask);
router.delete("/:taskId", protect, deleteTask);

export default router;
