import Activity from "../../models/Activity.js";
import Room from "../../models/Room.js";

export const getRoomStreak = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id.toString();

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (!room.members.some((m) => m.toString() === userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const productiveTypes = ["task_completed", "subtask_completed"];

    const activities = await Activity.find({
      room: roomId,
      user: userId,
      type: { $in: productiveTypes },
    });

    if (activities.length === 0) {
      return res.json({
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
      });
    }

    // Use UTC dates consistently
    const days = Array.from(
      new Set(
        activities.map((a) =>
          new Date(a.createdAt).toISOString().slice(0, 10)
        )
      )
    ).sort();

    // Longest streak
    let longest = 1;
    let temp = 1;

    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1]);
      const curr = new Date(days[i]);
      const diff = (curr - prev) / 86400000;

      if (diff === 1) {
        temp++;
        longest = Math.max(longest, temp);
      } else {
        temp = 1;
      }
    }

    // Current streak
    const daySet = new Set(days);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let current = 0;
    const cursor = new Date(today);

    while (daySet.has(cursor.toISOString().slice(0, 10))) {
      current++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    res.json({
      currentStreak: current,
      longestStreak: longest,
      lastActiveDate: days[days.length - 1],
    });
  } catch (err) {
    console.error("Streak error:", err);
    res.status(500).json({ message: "Failed to load streak" });
  }
};
