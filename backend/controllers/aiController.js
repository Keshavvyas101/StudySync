import Room from "../models/Room.js";
import Task from "../models/Task.js";
import { populateTask } from "./taskHelper.js";
import {
  classifyIntent,
  extractAssignTask,
  extractCreateSubtasks,
  extractCreateTask,
  extractRecurringTask,
} from "../services/Ai.js";

const TASK_QUERY_INTENTS = new Set([
  "MY_TASKS",
  "DUE_TODAY",
  "DUE_TOMORROW",
  "DUE_THIS_WEEK",
  "OVERDUE",
  "HIGH_PRIORITY",
]);

const QUERY_INTENTS = new Set([
  ...TASK_QUERY_INTENTS,
  "PRODUCTIVITY_SUMMARY",
]);

const normalize = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");

const ensureRoomMember = async (roomId, userId) => {
  const room = await Room.findById(roomId).populate(
    "members",
    "name email avatar"
  );
  if (!room) {
    const error = new Error("Room not found");
    error.status = 404;
    throw error;
  }

  const isMember = room.members.some(
    (member) => member._id.toString() === userId.toString()
  );
  if (!isMember) {
    const error = new Error("Not authorized");
    error.status = 403;
    throw error;
  }

  return room;
};

const findTaskByName = async (roomId, title) => {
  const normalizedTitle = normalize(title);
  if (!normalizedTitle) return null;

  const tasks = await Task.find({ room: roomId }).sort({ createdAt: -1 });

  return (
    tasks.find((task) => normalize(task.title) === normalizedTitle) ||
    tasks.find((task) => {
      const taskTitle = normalize(task.title);
      return (
        taskTitle.includes(normalizedTitle) ||
        normalizedTitle.includes(taskTitle)
      );
    }) ||
    null
  );
};

const findMemberByName = (room, name) => {
  const normalizedName = normalize(name);
  if (!normalizedName) return null;

  return (
    room.members.find((member) => normalize(member.name) === normalizedName) ||
    room.members.find((member) => normalize(member.email) === normalizedName) ||
    room.members.find((member) => {
      const memberName = normalize(member.name);
      return (
        memberName.includes(normalizedName) ||
        normalizedName.includes(memberName)
      );
    }) ||
    null
  );
};

const getDayRange = (currentDate, offset = 0) => {
  const start = new Date(currentDate || Date.now());
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + offset);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

const populateTasks = (query) =>
  query
    .populate("assignedTo", "name email avatar")
    .populate("createdBy", "name email avatar")
    .populate("subtasks.assignedTo", "name email avatar")
    .sort({ createdAt: -1 })
    .limit(50);

const findTasksForIntent = (intent, roomId, userId, currentDate) => {
  const active = { status: { $ne: "completed" } };
  const today = getDayRange(currentDate);

  switch (intent) {
    case "MY_TASKS":
      return populateTasks(
        Task.find({
          room: roomId,
          ...active,
          $or: [{ assignedTo: userId }, { createdBy: userId }],
        })
      );

    case "DUE_TODAY":
      return populateTasks(
        Task.find({
          room: roomId,
          ...active,
          deadline: { $gte: today.start, $lt: today.end },
        })
      );

    case "DUE_TOMORROW": {
      const tomorrow = getDayRange(currentDate, 1);
      return populateTasks(
        Task.find({
          room: roomId,
          ...active,
          deadline: { $gte: tomorrow.start, $lt: tomorrow.end },
        })
      );
    }

    case "DUE_THIS_WEEK": {
      const weekEnd = new Date(today.start);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return populateTasks(
        Task.find({
          room: roomId,
          ...active,
          deadline: { $gte: today.start, $lt: weekEnd },
        })
      );
    }

    case "OVERDUE":
      return populateTasks(
        Task.find({
          room: roomId,
          ...active,
          deadline: { $lt: today.start },
        })
      );

    case "HIGH_PRIORITY":
      return populateTasks(
        Task.find({
          room: roomId,
          ...active,
          priority: "high",
        })
      );

    default:
      return [];
  }
};

const toClientTask = (payload) => ({
  title: payload.title?.trim(),
  description: payload.description?.trim() || "",
  priority: ["low", "medium", "high"].includes(payload.priority?.toLowerCase())
    ? payload.priority.toLowerCase()
    : "medium",
  deadline:
    payload.deadline && payload.deadline !== "null" ? payload.deadline : null,
});

const handleAiError = (res, error) => {
  if (error.code === "AI_QUOTA_EXHAUSTED") {
    return res.status(503).json({ message: "AI quota exhausted" });
  }

  if (error.code === "AI_PARSE_FAILED") {
    return res.status(422).json({ message: "Could not parse task" });
  }

  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }

  console.error("Copilot failed:", error);
  return res.status(503).json({ message: "Copilot unavailable6" });
};

export const parseTask = async (req, res) => {
  try {
    const { prompt, roomId, currentDate, timezone } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    const { intent } = await classifyIntent(prompt.trim());

    if (intent === "UNKNOWN") {
      return res.status(200).json({ intent: "UNKNOWN" });
    }

    if (!roomId) {
      return res.status(400).json({ message: "Room is required" });
    }

    const room = await ensureRoomMember(roomId, req.user._id);

    if (TASK_QUERY_INTENTS.has(intent)) {
      const tasks = await findTasksForIntent(
        intent,
        roomId,
        req.user._id,
        currentDate
      );
      return res.status(200).json({ intent, tasks });
    }

    if (QUERY_INTENTS.has(intent)) {
      return res.status(200).json({ intent });
    }

    switch (intent) {
      case "CREATE_TASK": {
        const parsed = await extractCreateTask(prompt, {
          currentDate,
          timezone,
        });
        const task = toClientTask(parsed);

        if (!task.title || task.title.length < 3) {
          return res.status(422).json({ message: "Could not parse task" });
        }

        return res.status(200).json({ intent, task });
      }

      case "CREATE_SUBTASKS": {
        const parsed = await extractCreateSubtasks(prompt);
        const parent = await findTaskByName(roomId, parsed.parentTaskName);
        if (!parent) {
          return res.status(404).json({ message: "Parent task not found" });
        }

        const subtasks = Array.isArray(parsed.subtasks)
          ? parsed.subtasks.map((title) => title?.trim()).filter(Boolean)
          : [];
        if (subtasks.length === 0) {
          return res.status(422).json({ message: "Could not parse task" });
        }

        parent.subtasks.push(
          ...subtasks.map((title) => ({
            title,
            assignedTo: null,
            deadline: null,
            isCompleted: false,
            completedAt: null,
          }))
        );
        await parent.save();

        const task = await populateTask(parent._id);
        return res.status(200).json({ intent, task, subtasks });
      }

      case "ASSIGN_TASK": {
        const parsed = await extractAssignTask(prompt);
        const task = await findTaskByName(roomId, parsed.title);
        if (!task) {
          return res.status(404).json({ message: "Task not found" });
        }

        const assignee = findMemberByName(room, parsed.assignee);
        if (!assignee) {
          return res.status(404).json({ message: "Member not found" });
        }

        task.assignedTo = assignee._id;
        await task.save();

        const updated = await populateTask(task._id);
        return res.status(200).json({ intent, task: updated });
      }

      case "CREATE_RECURRING_TASK": {
        const parsed = await extractRecurringTask(prompt);
        if (!parsed.title?.trim() || !parsed.recurrence?.trim()) {
          return res.status(422).json({ message: "Could not parse task" });
        }

        return res.status(200).json({
          intent,
          task: {
            title: parsed.title.trim(),
            description: "",
            priority: "medium",
            deadline: null,
            recurrence: parsed.recurrence.trim(),
          },
        });
      }

      default:
        return res.status(200).json({ intent: "UNKNOWN" });
    }
  } catch (error) {
    return handleAiError(res, error);
  }
};
