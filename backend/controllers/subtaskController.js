// controllers/subtaskController.js

import Task from "../models/Task.js";
import Room from "../models/Room.js";
import { createNotification } from "../services/notificationService.js";
import { logActivity } from "../services/activityService.js";
import { completeActiveSessionsForTask } from "../services/studySessionService.js";


import {
  populateTask,
  canManageTask,
  canToggleSubtask,
  syncTaskStatusWithSubtasks,
  getTaskRecipients,
} from "./taskHelper.js";

/* ===============================
   ADD SUBTASK
================================ */
export const addSubtask = async (req, res) => {
  console.log("USER:", req.user);

  try {
    const { taskId } = req.params;
    const { title, assignedTo = null, deadline = null } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Subtask title required" });
    }

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.subtasks.push({
      title: title.trim(),
      assignedTo,
      deadline,
      isCompleted: false,
      completedAt: null,
    });

    await task.save();

    // 📘 Activity log
const createdSubtask = task.subtasks[task.subtasks.length - 1];

await logActivity(req.user._id, task.room, "subtask_created", {
  taskId: task._id,
  subtaskId: createdSubtask._id,
  title: createdSubtask.title,
});


    const populated = await populateTask(task._id);
    res.status(201).json({ task: populated });
  } catch (err) {
    console.error("Add subtask failed:", err);
    res.status(500).json({ message: "Failed to add subtask" });
  }
};

/* ===============================
   TOGGLE SUBTASK
================================ */
export const toggleSubtask = async (req, res) => {
  try {
    const { taskId, subtaskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const room = await Room.findById(task.room);
    const userId = req.user._id.toString();

    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) return res.status(404).json({ message: "Subtask not found" });

    if (!canToggleSubtask(task, room, subtask, userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const wasCompleted = task.status === "completed";

    subtask.isCompleted = !subtask.isCompleted;
    subtask.completedAt = subtask.isCompleted ? new Date() : null;

    // 📘 Activity log only when marking completed
if (subtask.isCompleted) {
  await logActivity(req.user._id, task.room, "subtask_completed", {
    taskId: task._id,
    subtaskId: subtask._id,
    title: subtask.title,
  });
}


    syncTaskStatusWithSubtasks(task);

    const nowCompleted = task.status === "completed";

    if (!wasCompleted && nowCompleted) {
      const recipients = getTaskRecipients(task, room, userId);

      for (const uid of recipients) {
        await createNotification({
          user: uid,
          type: "task_completed",
          message: `Task "${task.title}" was completed`,
          room: task.room,
          task: task._id,
        });
      }
    }

    await task.save();

    if (task.status === "completed") {
      await completeActiveSessionsForTask(task._id);
    }

    const populated = await populateTask(task._id);
    res.status(200).json({ task: populated });
  } catch (err) {
    console.error("Toggle subtask failed:", err);
    res.status(500).json({ message: "Failed to toggle subtask" });
  }
};

/* ===============================
   UPDATE SUBTASK
================================ */
export const updateSubtask = async (req, res) => {
  try {
    const { taskId, subtaskId } = req.params;
    const { title, assignedTo, deadline } = req.body;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const room = await Room.findById(task.room);
    const userId = req.user._id.toString();

    if (!canManageTask(task, room, userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) return res.status(404).json({ message: "Subtask not found" });

    if (title !== undefined) subtask.title = title;
    if (assignedTo !== undefined) subtask.assignedTo = assignedTo || null;
    if (deadline !== undefined) subtask.deadline = deadline || null;

    syncTaskStatusWithSubtasks(task);
    await task.save();

    if (task.status === "completed") {
      await completeActiveSessionsForTask(task._id);
    }

    const populated = await populateTask(task._id);
    res.status(200).json({ task: populated });
  } catch (err) {
    console.error("Update subtask failed:", err);
    res.status(500).json({ message: "Failed to update subtask" });
  }
};

/* ===============================
   DELETE SUBTASK
================================ */
export const deleteSubtask = async (req, res) => {
  try {
    const { taskId, subtaskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const room = await Room.findById(task.room);
    const userId = req.user._id.toString();

    if (!canManageTask(task, room, userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) return res.status(404).json({ message: "Subtask not found" });

    subtask.deleteOne();
    syncTaskStatusWithSubtasks(task);

    await task.save();

    if (task.status === "completed") {
      await completeActiveSessionsForTask(task._id);
    }

    const populated = await populateTask(task._id);
    res.status(200).json({ task: populated });
  } catch (err) {
    console.error("Delete subtask failed:", err);
    res.status(500).json({ message: "Failed to delete subtask" });
  }
};
