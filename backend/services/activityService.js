import Activity from "../models/Activity.js";

/**
 * Log a user activity
 * @param {string} userId
 * @param {string} roomId
 * @param {string} type
 * @param {object} metadata
 */
export const logActivity = async (userId, roomId, type, metadata = {}) => {
  try {
    if (!userId || !roomId || !type) {
      console.warn("Activity not logged: missing fields", {
        userId,
        roomId,
        type,
      });
      return;
    }

    await Activity.create({
      user: userId,
      room: roomId,
      type,
      metadata,
    });
  } catch (err) {
    // IMPORTANT: Do not crash app if activity logging fails
    console.error("Activity logging failed:", err.message);
  }
};
