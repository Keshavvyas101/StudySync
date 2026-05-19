// controllers/taskController.js

import Task from "../models/Task.js";
import Room from "../models/Room.js";
import { createNotification } from "../services/notificationService.js";
import { logActivity } from "../services/activityService.js";
import { completeActiveSessionsForTask } from "../services/studySessionService.js";


import {
  populateTask,
  canManageTask,
  canToggleTask,
  getTaskRecipients,
} from "./taskHelper.js";

/* ===============================
   CREATE TASK
================================ */
export const createTask = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { title, description, deadline, assignedTo, priority, recurrence, tags } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Task title is required" });
    }

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const userId = req.user._id.toString();

    if (!room.members.some((m) => m.toString() === userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (assignedTo && !room.members.some((m) => m.toString() === assignedTo)) {
      return res.status(400).json({ message: "Assigned user not in room" });
    }

    const task = await Task.create({
      title,
      description,
      deadline,
      room: roomId,
      assignedTo: assignedTo || null,
      createdBy: req.user._id,
      priority: priority || "medium",
      recurrence: recurrence || null,
      tags: Array.isArray(tags) ? tags : [],
    });
    // 📘 Activity log
await logActivity(req.user._id, roomId, "task_created", {
  taskId: task._id,
  title: task.title,
});


    // 🔔 Notify assignee
    if (assignedTo && assignedTo !== userId) {
      await createNotification({
        user: assignedTo,
        actor: req.user._id,
        type: "task_assigned",
        room: roomId,
        task: task._id,
        meta: { taskTitle: task.title },
      });
    }

    // 🔔 Notify room owner
    const ownerId = room.owner.toString();
    if (ownerId !== userId && ownerId !== assignedTo) {
      await createNotification({
        user: ownerId,
        actor: req.user._id,
        type: "task_created",
        room: roomId,
        task: task._id,
        meta: { taskTitle: task.title },
      });
    }

    res.status(201).json({ task });
  } catch (err) {
    console.error("Create task failed:", err);
    res.status(500).json({ message: "Failed to create task" });
  }
};

/* ===============================
   GET TASKS
================================ */
export const getTasksByRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const userId = req.user._id.toString();
    if (!room.members.some((m) => m.toString() === userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const limit = Number(req.query.limit) || 10;
    const skip = Number(req.query.skip) || 0;

    const tasks = await Task.find({ room: room._id })
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("subtasks.assignedTo", "name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ tasks });
  } catch {
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
};

/* ===============================
   UPDATE TASK
================================ */
export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const room = await Room.findById(task.room);
    const userId = req.user._id.toString();

    if (!canManageTask(task, room, userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    Object.assign(task, updates);
    await task.save();

    if (task.status === "completed") {
      await completeActiveSessionsForTask(task._id);
    }

    const recipients = getTaskRecipients(task, room, userId);

    for (const uid of recipients) {
      await createNotification({
        user: uid,
        actor: req.user._id,
        type: "task_updated",
        room: task.room,
        task: task._id,
        meta: { taskTitle: task.title },
      });
    }

    const populated = await populateTask(task._id);
    res.status(200).json({ task: populated });
  } catch (err) {
    console.error("Update task failed:", err);
    res.status(500).json({ message: "Failed to update task" });
  }
};

/* ===============================
   DELETE TASK
================================ */
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const room = await Room.findById(task.room);
    const userId = req.user._id.toString();

    if (!canManageTask(task, room, userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await task.deleteOne();
    res.status(200).json({ message: "Task deleted" });
  } catch {
    res.status(500).json({ message: "Failed to delete task" });
  }
};

/* ===============================
   TOGGLE TASK STATUS
================================ */
export const toggleTaskStatus = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const room = await Room.findById(task.room);
    const userId = req.user._id.toString();

    if (!canToggleTask(task, room, userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const wasCompleted = task.status === "completed";

    task.status = wasCompleted ? "todo" : "completed";
    task.completedAt = task.status === "completed" ? new Date() : null;

    await task.save();

    if (task.status === "completed") {
      await completeActiveSessionsForTask(task._id);
    }

    // 🔔 Notify only on transition to completed
    if (!wasCompleted && task.status === "completed") {
      // 📘 Activity log
await logActivity(req.user._id, task.room, "task_completed", {
  taskId: task._id,
  title: task.title,
});

      const recipients = getTaskRecipients(task, room, userId);

      for (const uid of recipients) {
        await createNotification({
          user: uid,
          actor: req.user._id,
          type: "task_completed",
          room: task.room,
          task: task._id,
          meta: { taskTitle: task.title },
        });
      }
    }

    const populated = await populateTask(task._id);
    res.status(200).json({ task: populated });
  } catch (err) {
    console.error("Toggle task error:", err);
    res.status(500).json({ message: "Failed to toggle status" });
  }
};
