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

    /* 🔔 NOTIFICATIONS (SAFE + MULTI USER) */
    const recipients = new Set();

    // notify room owner (if creator is not owner)
    if (room.owner.toString() !== userId) {
      recipients.add(room.owner.toString());
    }

    // notify assignee (if exists & not creator)
    if (assignedTo && assignedTo !== userId) {
      recipients.add(assignedTo);
    }

    for (const uid of recipients) {
      await createNotification({
        user: uid,
        type: "task_assigned",
        message: `New task created: "${task.title}"`,
        room: roomId,
        task: task._id,
      });
    }

    res.status(201).json({ task });
  } catch (err) {
    console.error("Create task failed:", err);
    res.status(500).json({ message: "Failed to create task" });
  }
};


/**
 * GET TASKS BY ROOM
 */
export const getTasksByRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const isMember = room.members.some(
      (id) => id.toString() === req.user._id.toString()
    );
    if (!isMember) return res.status(403).json({ message: "Not authorized" });

    const tasks = await Task.find({ room: room._id })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ tasks });
  } catch {
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
};

/**
 * UPDATE TASK (NO STATUS TOGGLE HERE)
 */
export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, deadline, assignedTo, priority } = req.body;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const room = await Room.findById(task.room);
    const userId = req.user._id.toString();

    const canEdit =
      task.assignedTo?.toString() === userId ||
      room.owner.toString() === userId;

    if (!canEdit) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (room.owner.toString() === userId && assignedTo !== undefined) {
      if (assignedTo === null) {
        task.assignedTo = null;
      } else {
        const valid = room.members.some(
          (id) => id.toString() === assignedTo
        );
        if (!valid) {
          return res.status(400).json({ message: "Invalid assignee" });
        }
        task.assignedTo = assignedTo;
      }
    }

    if (title) task.title = title;
    if (description) task.description = description;
    if (deadline) task.deadline = deadline;
    if (priority) task.priority = priority;

    await task.save();

    const populated = await Task.findById(task._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    res.status(200).json({ task: populated });
  } catch {
    res.status(500).json({ message: "Failed to update task" });
  }
};

/**
 * DELETE TASK
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
 * TOGGLE TASK STATUS (ONLY PLACE FOR COMPLETION)
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

    // toggle
    task.status = wasCompleted ? "todo" : "completed";
    task.completedAt =
      task.status === "completed" ? new Date() : null;

    await task.save();

    // 🔔 SAFE notification (CANNOT crash API)
    try {
      if (!wasCompleted && task.status === "completed") {
       if (!wasCompleted && task.status === "completed") {
  const completedBy = userId;

  const recipients = new Set();

  // task creator
  if (task.createdBy) {
    recipients.add(task.createdBy.toString());
  }

  // room owner
  if (room.owner) {
    recipients.add(room.owner.toString());
  }

  // ❌ do not notify the user who completed the task
  recipients.delete(completedBy);

  if (recipients.size === 0) {
    console.warn("⚠️ No recipients for completion notification");
  }

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
