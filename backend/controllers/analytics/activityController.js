import Activity from "../../models/Activity.js";
import Room from "../../models/Room.js";

const productiveTypes = ["task_completed", "subtask_completed"];

// ===============================
// 7-DAY ACTIVITY (PER USER)
// ===============================
export const getLast7DaysActivity = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id.toString();

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (!room.members.some(m => m.toString() === userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Always use UTC boundaries
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

    // Prepare empty 7-day structure
    const map = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setUTCDate(startDate.getUTCDate() + i);
      map[d.toISOString().slice(0, 10)] = 0;
    }

    // Fill counts
    for (const a of activities) {
      const key = new Date(a.createdAt).toISOString().slice(0, 10);
      if (map[key] !== undefined) map[key]++;
    }

    const result = Object.entries(map).map(([date, count]) => ({
      date,
      count,
    }));

    res.json(result);
  } catch (err) {
    console.error("7-day activity error:", err);
    res.status(500).json({ message: "Failed to load activity" });
  }
};

// ===============================
// ROOM COMPARISON (LEADERBOARD)
// ===============================
export const getRoomComparison = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id.toString();

    const room = await Room.findById(roomId).populate("members", "_id name");
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (!room.members.some(m => m._id.toString() === userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setUTCDate(today.getUTCDate() - 6);

    const activities = await Activity.find({
      room: roomId,
      type: { $in: productiveTypes },
      createdAt: { $gte: startDate },
    });

    const counts = {};
    for (const member of room.members) {
      counts[member._id.toString()] = 0;
    }

    for (const act of activities) {
      const uid = act.user.toString();
      if (counts[uid] !== undefined) counts[uid]++;
    }

    const leaderboard = Object.entries(counts)
      .map(([uid, count]) => ({ uid, count }))
      .sort((a, b) => b.count - a.count);

    const yourIndex = leaderboard.findIndex(u => u.uid === userId);
    const rank = yourIndex + 1;

    const totalMembers = leaderboard.length;
    const yourCount = counts[userId] || 0;

    const roomAverage =
      leaderboard.reduce((sum, u) => sum + u.count, 0) / totalMembers;

    const percentile = Math.round(
      ((totalMembers - rank) / totalMembers) * 100
    );

    res.json({
      yourCount,
      roomAverage: Math.round(roomAverage * 10) / 10,
      rank,
      totalMembers,
      percentile,
    });
  } catch (err) {
    console.error("Room comparison error:", err);
    res.status(500).json({ message: "Failed to load comparison" });
  }
};
