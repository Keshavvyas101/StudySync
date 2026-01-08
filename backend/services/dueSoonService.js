import Task from "../models/Task.js";
import { createNotification } from "./notificationService.js";

/**
 * Check and notify tasks that are due soon for a user
 * Triggered on login (safe, non-spammy)
 */
export const checkDueSoonTasksForUser = async (userId) => {
  try {
    const now = new Date();
    const next24Hours = new Date(
      now.getTime() + 24 * 60 * 60 * 1000
    );

    const dueSoonTasks = await Task.find({
      assignedTo: userId,
      status: { $ne: "completed" },
      deadline: {
        $gte: now,
        $lte: next24Hours,
      },
      dueSoonNotified: false,
    }).populate("room");

    for (const task of dueSoonTasks) {
      // 🔔 Create notification (dedupe handled inside service)
      await createNotification({
        user: userId,
        type: "due_soon",
        task: task._id,
        room: task.room?._id,
        message: `Task "${task.title}" is due soon`,
      });

      // 🧠 Mark task as notified to avoid spam
      task.dueSoonNotified = true;
      await task.save();
    }
  } catch (error) {
    console.error("❌ Due-soon check failed:", error.message);
  }
};
