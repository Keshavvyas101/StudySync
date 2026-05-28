import Activity from "../../models/Activity.js";
import Room from "../../models/Room.js";

export const getRoomSummary = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id.toString();

    const room = await Room.findById(roomId).populate(
      "members",
      "name email avatar"
    );
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (!room.members.some((m) => m._id.toString() === userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { range } = req.query;
    let fromDate = null;

    if (range === "1d") fromDate = new Date(Date.now() - 1 * 86400000);
    if (range === "7d") fromDate = new Date(Date.now() - 7 * 86400000);
    if (range === "30d") fromDate = new Date(Date.now() - 30 * 86400000);

    const query = { room: roomId };
    if (fromDate) query.createdAt = { $gte: fromDate };

    const activities = await Activity.find(query)
      .populate("user", "name email avatar")
      .sort({ createdAt: -1 });

    const total = {};
    const perUser = {};

    for (const a of activities) {
      total[a.type] = (total[a.type] || 0) + 1;

      const uid = a.user._id.toString();
      if (!perUser[uid]) {
        perUser[uid] = {
          user: a.user,
          counts: {},
        };
      }

      perUser[uid].counts[a.type] =
        (perUser[uid].counts[a.type] || 0) + 1;
    }

    res.json({
      total,
      users: Object.values(perUser),
    });
  } catch (err) {
    console.error("Analytics summary error:", err);
    res.status(500).json({ message: "Failed to load analytics" });
  }
};
