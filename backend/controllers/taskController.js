import Task from "../models/Task.js";
import Room from "../models/Room.js";
import { createNotification } from "../services/notificationService.js";

/**
 * CREATE TASK
 */
export const createTask = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { title, description, deadline, assignedTo, priority } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Task title is required" });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const userId = req.user._id.toString();

    // ✅ must be room member
    const isMember = room.members.some(
      (id) => id.toString() === userId
    );
    if (!isMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // ✅ validate assignee
    if (assignedTo) {
      const valid = room.members.some(
        (id) => id.toString() === assignedTo
      );
      if (!valid) {
        return res
          .status(400)
          .json({ message: "Assigned user not in room" });
      }
    }

    // ✅ create task
    const task = await Task.create({
      title,
      description,
      deadline,
      room: roomId,
      assignedTo: assignedTo || null,
      createdBy: req.user._id,
      priority: priority || "medium",
    });

    /* 🔔 NOTIFICATIONS (SEMANTIC + CORRECT) */
    const notifications = [];

    // 1️⃣ Notify ASSIGNEE (only if assigned & not creator)
    if (assignedTo && assignedTo !== userId) {
      notifications.push({
        user: assignedTo,
        type: "task_assigned",
        message: `You were assigned a task: "${task.title}"`,
        room: roomId,
        task: task._id,
      });
    }

    // 2️⃣ Notify ROOM OWNER (only if not creator AND not same as assignee)
    const ownerId = room.owner.toString();
    if (
      ownerId !== userId &&
      ownerId !== assignedTo
    ) {
      notifications.push({
        user: ownerId,
        type: "task_assigned", // semantic via message
        message: `New task created in your room: "${task.title}"`,
        room: roomId,
        task: task._id,
      });
    }

    for (const n of notifications) {
      await createNotification(n);
    }

    res.status(201).json({ task });
  } catch (err) {
    console.error("Create task failed:", err);
    res.status(500).json({ message: "Failed to create task" });
  }
};


/**
 * GET TASKS BY ROOM
 * (UNCHANGED)
 */
export const getTasksByRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room)
      return res.status(404).json({ message: "Room not found" });

    const isMember = room.members.some(
      (id) => id.toString() === req.user._id.toString()
    );
    if (!isMember)
      return res.status(403).json({ message: "Not authorized" });

    const limit = Number(req.query.limit) || 10;
    const skip = Number(req.query.skip) || 0;

    const tasks = await Task.find({ room: room._id })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ tasks });
  } catch {
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
};


/**
 * UPDATE TASK
 * (UNCHANGED)
 */
/**
 * UPDATE TASK (WITH NOTIFICATIONS)
 */
export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, deadline, assignedTo, priority } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const room = await Room.findById(task.room);
    const userId = req.user._id.toString();

    // ✅ Permission: assignee OR room owner
    const canEdit =
      task.assignedTo?.toString() === userId ||
      room.owner.toString() === userId;

    if (!canEdit) {
      return res.status(403).json({ message: "Not authorized" });
    }

    /* ===============================
       APPLY UPDATES
       =============================== */
    if (room.owner.toString() === userId && assignedTo !== undefined) {
      if (assignedTo === null) {
        task.assignedTo = null;
      } else {
        const valid = room.members.some(
          (id) => id.toString() === assignedTo
        );
        if (!valid) {
          return res
            .status(400)
            .json({ message: "Invalid assignee" });
        }
        task.assignedTo = assignedTo;
      }
    }

    if (title) task.title = title;
    if (description) task.description = description;
    if (deadline) task.deadline = deadline;
    if (priority) task.priority = priority;

    await task.save();

    /* ===============================
       🔔 TASK UPDATED NOTIFICATIONS
       =============================== */
    const recipients = new Set();

    // assignee
    if (task.assignedTo) {
      recipients.add(task.assignedTo.toString());
    }

    // room owner
    if (room.owner) {
      recipients.add(room.owner.toString());
    }

    // ❌ remove editor
    recipients.delete(userId);

    for (const uid of recipients) {
      await createNotification({
        user: uid,
        type: "task_updated",
        message: `Task "${task.title}" was updated`,
        room: task.room,
        task: task._id,
      });
    }

    const populated = await Task.findById(task._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    res.status(200).json({ task: populated });
  } catch (err) {
    console.error("Update task failed:", err);
    res.status(500).json({ message: "Failed to update task" });
  }
};



/**
 * DELETE TASK
 * (UNCHANGED)
 */
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const room = await Room.findById(task.room);
    const userId = req.user._id.toString();

    if (
      task.createdBy.toString() !== userId &&
      room.owner.toString() !== userId
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await task.deleteOne();
    res.status(200).json({ message: "Task deleted" });
  } catch {
    res.status(500).json({ message: "Failed to delete task" });
  }
};


/**
 * TOGGLE TASK STATUS
 * (only notification wording clarified)
 */
export const toggleTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const room = await Room.findById(task.room);
    const userId = req.user._id.toString();

    const canToggle =
      task.assignedTo?.toString() === userId ||
      room.owner.toString() === userId;

    if (!canToggle) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const wasCompleted = task.status === "completed";

    task.status = wasCompleted ? "todo" : "completed";
    task.completedAt =
      task.status === "completed" ? new Date() : null;

    await task.save();

    // 🔔 completion notification
    try {
      if (!wasCompleted && task.status === "completed") {
        const completedBy = userId;
        const recipients = new Set();

        if (task.createdBy) {
          recipients.add(task.createdBy.toString());
        }

        if (room.owner) {
          recipients.add(room.owner.toString());
        }

        recipients.delete(completedBy);

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
    } catch (err) {
      console.error("❌ Notification failed:", err.message);
    }

    return res.status(200).json({ task });
  } catch (err) {
    console.error("Toggle task error:", err);
    return res.status(500).json({ message: "Failed to toggle status" });
  }
};
