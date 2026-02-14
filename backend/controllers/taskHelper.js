// controllers/taskHelper.js

import Task from "../models/Task.js";
import Room from "../models/Room.js";

/* ===============================
   POPULATE CONFIG
================================ */
export const populateTask = async (taskId) => {
  return Task.findById(taskId)
    .populate("assignedTo", "name email avatar")
    .populate("createdBy", "name email avatar")
    .populate("subtasks.assignedTo", "name email avatar");
};

/* ===============================
   PERMISSIONS
================================ */
export const canManageTask = (task, room, userId) => {
  return (
    task.createdBy?.toString() === userId ||
    room.owner?.toString() === userId
  );
};

export const canToggleTask = (task, room, userId) => {
  return (
    task.assignedTo?.toString() === userId ||
    room.owner?.toString() === userId
  );
};

export const canToggleSubtask = (task, room, subtask, userId) => {
  return (
    canManageTask(task, room, userId) ||
    subtask.assignedTo?.toString() === userId ||
    room.members.some((m) => m.toString() === userId)
  );
};

/* ===============================
   SYNC STATUS
================================ */
export const syncTaskStatusWithSubtasks = (task) => {
  if (!task.subtasks || task.subtasks.length === 0) return;

  const allCompleted = task.subtasks.every((s) => s.isCompleted);
  task.status = allCompleted ? "completed" : "todo";
  task.completedAt = allCompleted ? new Date() : null;
};

/* ===============================
   RECIPIENTS
================================ */
export const getTaskRecipients = (task, room, excludeUserId) => {
  const recipients = new Set();

  if (task.createdBy) recipients.add(task.createdBy.toString());
  if (room.owner) recipients.add(room.owner.toString());

  recipients.delete(excludeUserId);
  return [...recipients];
};
