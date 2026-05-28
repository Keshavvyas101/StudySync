// controllers/analytics/badgeController.js

import UserBadge from "../../models/UserBadge.js";
import Badge from "../../models/Badge.js";

export const getMyBadges = async (req, res) => {
  try {
    const userId = req.user._id;

    const badges = await UserBadge.find({ user: userId })
      .populate("badge", "key title description icon")
      .sort({ createdAt: -1 });

    res.json({
      count: badges.length,
      badges: badges.map(b => ({
        key: b.badge.key,
        title: b.badge.title,
        description: b.badge.description,
        icon: b.badge.icon,
        earnedAt: b.createdAt,
      })),
    });
  } catch (err) {
    console.error("Get badges error:", err);
    res.status(500).json({ message: "Failed to fetch badges" });
  }
};
