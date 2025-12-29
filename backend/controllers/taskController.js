import Task from "../models/Task.js";
import Room from "../models/Room.js";

/**
 * @desc    Create a task inside a room
 * @route   POST /api/tasks/:roomId
 * @access  Private (Room members only)
 */
export const createTask = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { title, description, deadline, assignedTo , priority} = req.body;

    if (!title) {
      return res.status(400).json({ message: "Task title is required" });
    }

    // Check room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Check user is room member
    const isMember = room.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: "Not authorized to create task in this room" });
    }

    // If assignedTo exists, check assigned user is also a room member
    if (assignedTo) {
      const isAssignedUserMember = room.members.some(
        (memberId) => memberId.toString() === assignedTo
      );

      if (!isAssignedUserMember) {
        return res
          .status(400)
          .json({ message: "Assigned user is not a member of this room" });
      }
    }

    const task = await Task.create({
      title,
      description,
      deadline,
      room: roomId,
      assignedTo: assignedTo || null,
      createdBy: req.user._id,
      priority: priority || "medium",
    });

    res.status(201).json({
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to create task", error });
  }
};

/**
 * @desc    Get all tasks of a room
 * @route   GET /api/tasks/:roomId
 * @access  Private (Room members only)
 */
export const getTasksByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Check room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Check membership
    const isMember = room.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: "Not authorized to view tasks of this room" });
    }

    const tasks = await Task.find({ room: roomId })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ tasks });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tasks", error });
  }
};

/**
 * @desc    Update task (status / assignment / details)
 * @route   PATCH /api/tasks/:taskId
 * @access  Private (Task creator or Room owner)
 */


export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, status, deadline, assignedTo, priority } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const room = await Room.findById(task.room);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const userId = req.user._id.toString();
    const isAssigned = task.assignedTo?.toString() === userId;
    const isOwner = room.owner.toString() === userId;
    
    if (!isAssigned && !isOwner) {
      return res.status(403).json({ message: "Not authorized to update this task" });
    }

    // ✅ ASSIGN / UNASSIGN FIX

    
    if(isOwner){
    if (assignedTo === null) {
      task.assignedTo = null;
    } else if (assignedTo) {
      const isMember = room.members.some(
        (memberId) => memberId.toString() === assignedTo
      );
    
      if (!isMember) {
        return res
          .status(400)
          .json({ message: "Assigned user is not a member of this room" });
      }

      task.assignedTo = assignedTo;
    }
  }

    if (status) {
      const allowedStatus = ["todo", "in-progress", "completed"];
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({ message: "Invalid task status" });
      }
      task.status = status;
    }

    if (title) task.title = title;
    if (description) task.description = description;
    if (deadline) task.deadline = deadline;

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    res.status(200).json({
      message: "Task updated successfully",
      task: populatedTask,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update task", error });
  }
};



/**
 * @desc    Delete a task
 * @route   DELETE /api/tasks/:taskId
 * @access  Private (Task creator or Room owner)
 */
export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const room = await Room.findById(task.room);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const userId = req.user._id.toString();

    const isCreator = task.createdBy.toString() === userId;
    const isOwner = room.owner.toString() === userId;

    if (!isCreator && !isOwner) {
      return res.status(403).json({ message: "Not authorized to delete this task" });
    }

    await task.deleteOne();

    res.status(200).json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete task", error });
  }
};

// Toggle only status
export const toggleTaskStatus = async (req, res) => {
  const task = req.task;

  task.status =
    task.status === "completed" ? "todo" : "completed";

  if (task.status === "completed") {
    task.completedAt = new Date();
  } else {
    task.completedAt = null;
  }

  await task.save();

  res.status(200).json({ task });
};
