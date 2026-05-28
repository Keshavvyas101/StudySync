// import Activity from "../models/Activity.js";
// import Room from "../models/Room.js";

// /* ===============================
//    ROOM SUMMARY
// ================================ */
// export const getRoomSummary = async (req, res) => {
//   try {
//     const { roomId } = req.params;
//     const userId = req.user._id.toString();

//     const room = await Room.findById(roomId).populate("members", "name email avatar");
//     if (!room) return res.status(404).json({ message: "Room not found" });

//     if (!room.members.some(m => m._id.toString() === userId)) {
//       return res.status(403).json({ message: "Not authorized" });
//     }

//     const { range } = req.query;
//     let fromDate = null;

//     if (range === "1d") fromDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
//     if (range === "7d") fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
//     if (range === "30d") fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

//     const query = { room: roomId };
//     if (fromDate) query.createdAt = { $gte: fromDate };

//     const activities = await Activity.find(query)
//       .populate("user", "name email avatar")
//       .sort({ createdAt: -1 });

//     const total = {};
//     const perUser = {};

//     for (const a of activities) {
//       total[a.type] = (total[a.type] || 0) + 1;

//       const uid = a.user._id.toString();
//       if (!perUser[uid]) {
//         perUser[uid] = {
//           user: a.user,
//           counts: {},
//         };
//       }

//       perUser[uid].counts[a.type] =
//         (perUser[uid].counts[a.type] || 0) + 1;
//     }

//     res.json({
//       total,
//       users: Object.values(perUser),
//     });
//   } catch (err) {
//     console.error("Analytics error:", err);
//     res.status(500).json({ message: "Failed to load analytics" });
//   }
// };



// /* ===============================
//    STREAK ANALYTICS (PER USER)
// ================================ */
// export const getRoomStreak = async (req, res) => {
//   try {
//     const { roomId } = req.params;
//     const userId = req.user._id.toString();

//     const room = await Room.findById(roomId);
//     if (!room) return res.status(404).json({ message: "Room not found" });

//     if (!room.members.some(m => m.toString() === userId)) {
//       return res.status(403).json({ message: "Not authorized" });
//     }

//     const productiveTypes = ["task_completed", "subtask_completed"];

//     const activities = await Activity.find({
//       room: roomId,
//       user: userId,
//       type: { $in: productiveTypes },
//     });

//     if (activities.length === 0) {
//       return res.json({
//         currentStreak: 0,
//         longestStreak: 0,
//         lastActiveDate: null,
//       });
//     }

//     const days = Array.from(
//       new Set(
//         activities.map(a =>
//           new Date(a.createdAt).toLocaleDateString("en-CA")
//         )
//       )
//     ).sort();

//     let longest = 1;
//     let temp = 1;

//     for (let i = 1; i < days.length; i++) {
//       const prev = new Date(days[i - 1]);
//       const curr = new Date(days[i]);
//       const diff = (curr - prev) / 86400000;

//       if (diff === 1) {
//         temp++;
//         longest = Math.max(longest, temp);
//       } else {
//         temp = 1;
//       }
//     }

//     const daySet = new Set(days);
//     let current = 0;

//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const cursor = new Date(today);

//     while (daySet.has(cursor.toLocaleDateString("en-CA"))) {
//       current++;
//       cursor.setDate(cursor.getDate() - 1);
//     }

//     res.json({
//       currentStreak: current,
//       longestStreak: longest,
//       lastActiveDate: days[days.length - 1],
//     });
//   } catch (err) {
//     console.error("Streak error:", err);
//     res.status(500).json({ message: "Failed to load streak" });
//   }
// };



// /* ===============================
//    NEW: DAILY PRODUCTIVITY (PER USER)
// ================================ */
// export const getDailyProductivity = async (req, res) => {
//   try {
//     const { roomId } = req.params;
//     const userId = req.user._id.toString();

//     const room = await Room.findById(roomId);
//     if (!room) return res.status(404).json({ message: "Room not found" });

//     if (!room.members.some(m => m.toString() === userId)) {
//       return res.status(403).json({ message: "Not authorized" });
//     }

//     const todayStart = new Date();
//     todayStart.setHours(0, 0, 0, 0);

//     const productiveTypes = ["task_completed", "subtask_completed"];

//     const activities = await Activity.find({
//       room: roomId,
//       user: userId,
//       type: { $in: productiveTypes },
//       createdAt: { $gte: todayStart },
//     });

//     const tasksCompletedToday = activities.filter(
//       a => a.type === "task_completed"
//     ).length;

//     const subtasksCompletedToday = activities.filter(
//       a => a.type === "subtask_completed"
//     ).length;

//     res.json({
//       tasksCompletedToday,
//       subtasksCompletedToday,
//       totalProductiveActionsToday:
//         tasksCompletedToday + subtasksCompletedToday,
//     });
//   } catch (err) {
//     console.error("Daily productivity error:", err);
//     res.status(500).json({ message: "Failed to load daily productivity" });
//   }
// };


// /* ===============================
//    NEW: WEEKLY CONSISTENCY (PER USER)
// ================================ */
// export const getWeeklyConsistency = async (req, res) => {
//   try {
//     const { roomId } = req.params;
//     const userId = req.user._id.toString();

//     const room = await Room.findById(roomId);
//     if (!room) return res.status(404).json({ message: "Room not found" });

//     if (!room.members.some(m => m.toString() === userId)) {
//       return res.status(403).json({ message: "Not authorized" });
//     }

//     const productiveTypes = ["task_completed", "subtask_completed"];

//     // Last 7 days window
//     const fromDate = new Date();
//     fromDate.setHours(0, 0, 0, 0);
//     fromDate.setDate(fromDate.getDate() - 6); // includes today

//     const activities = await Activity.find({
//       room: roomId,
//       user: userId,
//       type: { $in: productiveTypes },
//       createdAt: { $gte: fromDate },
//     });

//     // Collect unique active dates
//     const activeDaysSet = new Set(
//       activities.map(a =>
//         new Date(a.createdAt).toLocaleDateString("en-CA")
//       )
//     );

//     const activeDaysLast7 = activeDaysSet.size;
//     const consistencyPercent = Math.round((activeDaysLast7 / 7) * 100);

//     res.json({
//       activeDaysLast7,
//       consistencyPercent,
//     });
//   } catch (err) {
//     console.error("Consistency error:", err);
//     res.status(500).json({ message: "Failed to load consistency" });
//   }
// };

// /* ===============================
//    NEW: WEEKLY COMPARISON (PER USER)
// ================================ */
// export const getWeeklyComparison = async (req, res) => {
//   try {
//     const { roomId } = req.params;
//     const userId = req.user._id.toString();

//     const room = await Room.findById(roomId);
//     if (!room) return res.status(404).json({ message: "Room not found" });

//     if (!room.members.some(m => m.toString() === userId)) {
//       return res.status(403).json({ message: "Not authorized" });
//     }

//     const productiveTypes = ["task_completed", "subtask_completed"];

//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     // This week (last 7 days including today)
//     const thisWeekStart = new Date(today);
//     thisWeekStart.setDate(today.getDate() - 6);

//     // Last week window (7 days before that)
//     const lastWeekStart = new Date(today);
//     lastWeekStart.setDate(today.getDate() - 13);

//     const lastWeekEnd = new Date(today);
//     lastWeekEnd.setDate(today.getDate() - 7);

//     const thisWeekCount = await Activity.countDocuments({
//       room: roomId,
//       user: userId,
//       type: { $in: productiveTypes },
//       createdAt: { $gte: thisWeekStart },
//     });

//     const lastWeekCount = await Activity.countDocuments({
//       room: roomId,
//       user: userId,
//       type: { $in: productiveTypes },
//       createdAt: {
//         $gte: lastWeekStart,
//         $lte: lastWeekEnd,
//       },
//     });

//     const change = thisWeekCount - lastWeekCount;

//     let trend = "same";
//     if (change > 0) trend = "up";
//     if (change < 0) trend = "down";

//     res.json({
//       thisWeek: thisWeekCount,
//       lastWeek: lastWeekCount,
//       change,
//       trend,
//     });
//   } catch (err) {
//     console.error("Weekly comparison error:", err);
//     res.status(500).json({ message: "Failed to load weekly comparison" });
//   }
// };


// /* ===============================
//    NEW: 7-DAY ACTIVITY (PER USER)
// ================================ */
// export const getLast7DaysActivity = async (req, res) => {
//   try {
//     const { roomId } = req.params;
//     const userId = req.user._id.toString();

//     const room = await Room.findById(roomId);
//     if (!room) return res.status(404).json({ message: "Room not found" });

//     if (!room.members.some(m => m.toString() === userId)) {
//       return res.status(403).json({ message: "Not authorized" });
//     }

//     const productiveTypes = ["task_completed", "subtask_completed"];

//     // 🔒 Always work in UTC
//     const today = new Date();
//     today.setUTCHours(0, 0, 0, 0);

//     const startDate = new Date(today);
//     startDate.setUTCDate(today.getUTCDate() - 6);

//     const activities = await Activity.find({
//       room: roomId,
//       user: userId,
//       type: { $in: productiveTypes },
//       createdAt: { $gte: startDate },
//     });

//     // Prepare 7-day map (YYYY-MM-DD)
//     const map = {};
//     for (let i = 0; i < 7; i++) {
//       const d = new Date(startDate);
//       d.setUTCDate(startDate.getUTCDate() + i);
//       map[d.toISOString().slice(0, 10)] = 0;
//     }

//     // Count activities by UTC date
//     for (const a of activities) {
//       const key = new Date(a.createdAt).toISOString().slice(0, 10);
//       if (map[key] !== undefined) {
//         map[key]++;
//       }
//     }

//     // Convert to array
//     const result = Object.entries(map).map(([date, count]) => ({
//       date,
//       count,
//     }));

//     res.json(result);
//   } catch (err) {
//     console.error("7-day activity error:", err);
//     res.status(500).json({ message: "Failed to load 7-day activity" });
//   }
// };

// /* ===============================
//    NEW: PRODUCTIVITY SCORE (PER USER)
// ================================ */
// /* ===============================
//    PRODUCTIVITY SCORE (PER USER)
// ================================ */
// export const getProductivityScore = async (req, res) => {
//   try {
//     const { roomId } = req.params;
//     const userId = req.user._id.toString();

//     const room = await Room.findById(roomId);
//     if (!room) return res.status(404).json({ message: "Room not found" });

//     if (!room.members.some(m => m.toString() === userId)) {
//       return res.status(403).json({ message: "Not authorized" });
//     }

//     const productiveTypes = ["task_completed", "subtask_completed"];

//     // --- UTC window (last 7 days including today)
//     const today = new Date();
//     today.setUTCHours(0, 0, 0, 0);

//     const startDate = new Date(today);
//     startDate.setUTCDate(today.getUTCDate() - 6);

//     const activities = await Activity.find({
//       room: roomId,
//       user: userId,
//       type: { $in: productiveTypes },
//       createdAt: { $gte: startDate },
//     });

//     // --- Count types
//     const taskCount = activities.filter(a => a.type === "task_completed").length;
//     const subtaskCount = activities.filter(a => a.type === "subtask_completed").length;

//     // --- Points system (tunable later)
//     const taskPoints = taskCount * 10;
//     const subtaskPoints = subtaskCount * 5;

//     // --- Unique active days (UTC)
//     const activeDays = new Set(
//       activities.map(a => new Date(a.createdAt).toISOString().slice(0, 10))
//     );

//     // --- Current streak (UTC, same logic as graph)
//     let currentStreak = 0;
//     const cursor = new Date(today);

//     while (activeDays.has(cursor.toISOString().slice(0, 10))) {
//       currentStreak++;
//       cursor.setUTCDate(cursor.getUTCDate() - 1);
//     }

//     // --- Bonuses
//     let streakBonus = 0;
//     if (currentStreak >= 7) streakBonus = 20;
//     else if (currentStreak >= 3) streakBonus = 10;

//     let consistencyBonus = 0;
//     if (activeDays.size >= 6) consistencyBonus = 20;
//     else if (activeDays.size >= 4) consistencyBonus = 10;

//     const rawScore =
//       taskPoints +
//       subtaskPoints +
//       streakBonus +
//       consistencyBonus;

//     const finalScore = Math.min(rawScore, 100);

//     res.json({
//       score: finalScore,
//       breakdown: {
//         taskPoints,
//         subtaskPoints,
//         streakBonus,
//         consistencyBonus,
//         activeDays: activeDays.size,
//         currentStreak,
//       },
//     });
//   } catch (err) {
//     console.error("Productivity score error:", err);
//     res.status(500).json({ message: "Failed to calculate productivity score" });
//   }
// };

// // ===============================
// // PHASE 2.1 — ROOM COMPARISON
// // ===============================
// export const getRoomComparison = async (req, res) => {
//   try {
//     const { roomId } = req.params;
//     const userId = req.user._id.toString();

//     const room = await Room.findById(roomId).populate("members", "_id name");
//     if (!room) return res.status(404).json({ message: "Room not found" });

//     if (!room.members.some(m => m._id.toString() === userId)) {
//       return res.status(403).json({ message: "Not authorized" });
//     }

//     const productiveTypes = ["task_completed", "subtask_completed"];

//     // --- UTC window: last 7 days including today
//     const today = new Date();
//     today.setUTCHours(0, 0, 0, 0);

//     const startDate = new Date(today);
//     startDate.setUTCDate(today.getUTCDate() - 6);

//     // --- Fetch all productive activity for room
//     const activities = await Activity.find({
//       room: roomId,
//       type: { $in: productiveTypes },
//       createdAt: { $gte: startDate },
//     });

//     // --- Count per user
//     const counts = {};
//     for (const member of room.members) {
//       counts[member._id.toString()] = 0;
//     }

//     for (const act of activities) {
//       const uid = act.user.toString();
//       if (counts[uid] !== undefined) {
//         counts[uid]++;
//       }
//     }

//     // --- Build sorted leaderboard
//     const leaderboard = Object.entries(counts)
//       .map(([uid, count]) => ({ uid, count }))
//       .sort((a, b) => b.count - a.count);

//     const yourIndex = leaderboard.findIndex(u => u.uid === userId);

//     const yourCount = counts[userId] || 0;
//     const totalMembers = leaderboard.length;
//     const rank = yourIndex + 1;

//     const roomAverage =
//       leaderboard.reduce((sum, u) => sum + u.count, 0) / totalMembers;

//     const percentile = Math.round(
//       ((totalMembers - rank) / totalMembers) * 100
//     );

//     res.json({
//       yourCount,
//       roomAverage: Math.round(roomAverage * 10) / 10,
//       rank,
//       totalMembers,
//       percentile,
//     });
//   } catch (err) {
//     console.error("Room comparison error:", err);
//     res.status(500).json({ message: "Failed to load comparison" });
//   }
// };
