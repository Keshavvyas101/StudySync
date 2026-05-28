import Badge from "../models/Badge.js";
import UserBadge from "../models/UserBadge.js";
import Activity from "../models/Activity.js";

/* =====================================================
   BADGE DEFINITIONS
===================================================== */
const defaultBadges = [
  {
    key: "first_task",
    title: "First Task Completed",
    description: "Completed your first task 🎉",
    icon: "🎯",
  },
  {
    key: "streak_3",
    title: "3 Day Streak",
    description: "Active 3 days in a row 🔥",
    icon: "🔥",
  },
  {
    key: "streak_7",
    title: "7 Day Streak",
    description: "Active 7 days in a row 💪",
    icon: "🏆",
  },
  {
    key: "productive_week",
    title: "Productive Week",
    description: "Completed 10+ productive actions in 7 days",
    icon: "⚡",
  },
  {
    key: "consistency_master",
    title: "Consistency Master",
    description: "Active at least 5 days this week 📅",
    icon: "📅",
  },
];

/* =====================================================
   Ensure badges exist
===================================================== */
export const ensureBadgesExist = async () => {
  for (const b of defaultBadges) {
    const exists = await Badge.findOne({ key: b.key });
    if (!exists) {
      await Badge.create(b);
      console.log(`✅ Badge created: ${b.key}`);
    }
  }
};

/* =====================================================
   Helpers
===================================================== */
const productiveTypes = ["task_completed", "subtask_completed"];

const getCurrentStreak = (daysSet) => {
  let streak = 0;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const cursor = new Date(today);

  while (daysSet.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
};

/* =====================================================
   MAIN EVALUATOR
===================================================== */
export const evaluateBadges = async (userId, roomId) => {
  try {
    // Fetch productive activities
    const activities = await Activity.find({
      user: userId,
      room: roomId,
      type: { $in: productiveTypes },
    });

    if (!activities.length) return;

    // Prepare date sets
    const daysSet = new Set(
      activities.map(a =>
        new Date(a.createdAt).toISOString().slice(0, 10)
      )
    );

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const last7 = new Date(today);
    last7.setUTCDate(today.getUTCDate() - 6);

    const recentActivities = activities.filter(
      a => new Date(a.createdAt) >= last7
    );

    const recentDaysSet = new Set(
      recentActivities.map(a =>
        new Date(a.createdAt).toISOString().slice(0, 10)
      )
    );

    const currentStreak = getCurrentStreak(daysSet);

    // Load badges + user badges efficiently
    const allBadges = await Badge.find();
    const userBadges = await UserBadge.find({ user: userId });

    const ownedBadgeIds = new Set(
      userBadges.map(b => b.badge.toString())
    );

    const badgeMap = Object.fromEntries(
      allBadges.map(b => [b.key, b])
    );

    const award = async (badgeKey) => {
      const badge = badgeMap[badgeKey];
      if (!badge) return;
      if (ownedBadgeIds.has(badge._id.toString())) return;

      await UserBadge.create({
        user: userId,
        badge: badge._id,
      });

      console.log(`🏅 Badge awarded: ${badge.key} → ${userId}`);
    };

    /* =====================
       BADGE CONDITIONS
    ===================== */

    // 1. First task
    if (activities.some(a => a.type === "task_completed")) {
      await award("first_task");
    }

    // 2. 3-day streak
    if (currentStreak >= 3) {
      await award("streak_3");
    }

    // 3. 7-day streak
    if (currentStreak >= 7) {
      await award("streak_7");
    }

    // 4. Productive week (10+ actions)
    if (recentActivities.length >= 10) {
      await award("productive_week");
    }

    // 5. Consistency master (5+ days active in 7)
    if (recentDaysSet.size >= 5) {
      await award("consistency_master");
    }

  } catch (err) {
    console.error("Badge evaluation error:", err);
  }
};
