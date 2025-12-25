// backend/middlewares/taskPermissions.js
import Task from "../models/Task.js";
import Room from "../models/Room.js";

/**
 * Checks:
 * - user is member of task's room
 * - attaches task + room to req
 */
export const requireTaskMember = async (req, res, next) => {
  try {
    const taskId = req.params.taskId;
    if (!taskId) {
      return res.status(400).json({ message: "Task ID missing" });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const room = await Room.findById(task.room);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const isMember = room.members.some(
      (m) => m.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    req.task = task;
    req.room = room;
    next();
  } catch (err) {
    res.status(500).json({ message: "Task permission check failed" });
  }
};

/**
 * Only task creator OR room owner
 */
export const requireTaskOwnerOrRoomOwner = (req, res, next) => {
  const { task, room } = req;

  const isTaskOwner =
    task.createdBy.toString() === req.user._id.toString();

  const isRoomOwner =
    room.owner.toString() === req.user._id.toString();

    


  if (!isTaskOwner && !isRoomOwner) {
    return res.status(403).json({
      message: "Not allowed to modify this task",
    });
  }

  next();
};
