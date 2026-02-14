import Activity from "../../models/Activity.js";
import Room from "../../models/Room.js";

const productiveTypes = ["task_completed", "subtask_completed"];

// ===============================
// DAILY PRODUCTIVITY
// ===============================
export const getDailyProductivity = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id.toString();

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (!room.members.some((m) => m.toString() === userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const activities = await Activity.find({
      room: roomId,
      user: userId,
      type: { $in: productiveTypes },
      createdAt: { $gte: today },
    });

    const tasks = activities.filter(a => a.type === "task_completed").length;
    const subtasks = activities.filter(a => a.type === "subtask_completed").length;

    res.json({
      tasksCompletedToday: tasks,
      subtasksCompletedToday: subtasks,
      totalProductiveActionsToday: tasks + subtasks,
    });
  } catch (err) {
    console.error("Daily productivity error:", err);
    res.status(500).json({ message: "Failed to load daily productivity" });
  }
};

// ===============================
// WEEKLY CONSISTENCY
// ===============================
export const getWeeklyConsistency = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id.toString();

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (!room.members.some((m) => m.toString() === userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setUTCDate(today.getUTCDate() - 6);

    const activities = await Activity.find({
      room: roomId,
      user: userId,
      type: { $in: productiveTypes },
      createdAt: { $gte: startDate },
    });

    const activeDays = new Set(
      activities.map(a => new Date(a.createdAt).toISOString().slice(0, 10))
    );

    res.json({
      activeDaysLast7: activeDays.size,
      consistencyPercent: Math.round((activeDays.size / 7) * 100),
    });
  } catch (err) {
    console.error("Consistency error:", err);
    res.status(500).json({ message: "Failed to load consistency" });
  }
};

// ===============================
// WEEKLY COMPARISON
// ===============================
export const getWeeklyComparison = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id.toString();

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (!room.members.some((m) => m.toString() === userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const thisWeekStart = new Date(today);
    thisWeekStart.setUTCDate(today.getUTCDate() - 6);

    const lastWeekStart = new Date(today);
    lastWeekStart.setUTCDate(today.getUTCDate() - 13);

    const lastWeekEnd = new Date(today);
    lastWeekEnd.setUTCDate(today.getUTCDate() - 7);

    const thisWeek = await Activity.countDocuments({
      room: roomId,
      user: userId,
      type: { $in: productiveTypes },
      createdAt: { $gte: thisWeekStart },
    });

    const lastWeek = await Activity.countDocuments({
      room: roomId,
      user: userId,
      type: { $in: productiveTypes },
      createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd },
    });

    const change = thisWeek - lastWeek;

    res.json({
      thisWeek,
      lastWeek,
      change,
      trend: change > 0 ? "up" : change < 0 ? "down" : "same",
    });
  } catch (err) {
    console.error("Weekly comparison error:", err);
    res.status(500).json({ message: "Failed to load weekly comparison" });
  }
};

// ===============================
// PRODUCTIVITY SCORE
// ===============================
export const getProductivityScore = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id.toString();

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (!room.members.some((m) => m.toString() === userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setUTCDate(today.getUTCDate() - 6);

    const activities = await Activity.find({
      room: roomId,
      user: userId,
      type: { $in: productiveTypes },
      createdAt: { $gte: startDate },
    });

    const taskCount = activities.filter(a => a.type === "task_completed").length;
    const subtaskCount = activities.filter(a => a.type === "subtask_completed").length;

    const taskPoints = taskCount * 10;
    const subtaskPoints = subtaskCount * 5;

    const activeDays = new Set(
      activities.map(a => new Date(a.createdAt).toISOString().slice(0, 10))
    );

    let currentStreak = 0;
    const cursor = new Date(today);

    while (activeDays.has(cursor.toISOString().slice(0, 10))) {
      currentStreak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    let streakBonus = currentStreak >= 7 ? 20 : currentStreak >= 3 ? 10 : 0;
    let consistencyBonus = activeDays.size >= 6 ? 20 : activeDays.size >= 4 ? 10 : 0;

    const rawScore = taskPoints + subtaskPoints + streakBonus + consistencyBonus;
    const finalScore = Math.min(rawScore, 100);

    res.json({
      score: finalScore,
      breakdown: {
        taskPoints,
        subtaskPoints,
        streakBonus,
        consistencyBonus,
        activeDays: activeDays.size,
        currentStreak,
      },
    });
  } catch (err) {
    console.error("Productivity score error:", err);
    res.status(500).json({ message: "Failed to calculate productivity score" });
  }
};
