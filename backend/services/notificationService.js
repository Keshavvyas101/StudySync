import Notification from "../models/Notification.js";

let ioRef;

/* ===============================
   INIT SOCKET
   =============================== */
export const initNotificationSocket = (io) => {
  ioRef = io;
};

/* ===============================
   DUPLICATE CONTROL RULES
   =============================== */

/**
 * Types that should NEVER be duplicated
 * for same user + task
 */
const SINGLE_TASK_NOTIFICATIONS = new Set([
  "task_assigned",
  "due_soon",
]);

/**
 * Types that are allowed multiple times
 * (event / history based)
 */
const MULTI_EVENT_NOTIFICATIONS = new Set([
  "task_completed",
  "task_created",
  "task_updated",     // ✅ NEW
  "member_joined",
  "member_left",
]);

/* ===============================
   CREATE NOTIFICATION
   =============================== */
export const createNotification = async (data) => {
  /**
   * Expected data shape:
   * {
   *   user: ObjectId,
   *   type: String,
   *   message: String,
   *   room?: ObjectId,
   *   task?: ObjectId
   * }
   */

  if (!data?.user || !data?.type || !data?.message) {
    console.warn("⚠️ Invalid notification payload, skipped:", data);
    return null;
  }

  /* 🛑 SMART DUPLICATE PREVENTION */
  if (
    data.task &&
    SINGLE_TASK_NOTIFICATIONS.has(data.type)
  ) {
    const exists = await Notification.findOne({
      user: data.user,
      task: data.task,
      type: data.type,
    });

    if (exists) {
      console.log(
        "⏭️ Duplicate notification skipped:",
        data.type,
        exists._id.toString()
      );
      return exists;
    }
  }

  /* ✅ CREATE NOTIFICATION */
  const notification = await Notification.create({
    user: data.user,
    type: data.type,
    message: data.message,
    room: data.room || null,
    task: data.task || null,
    read: false,
  });

  console.log(
    "📦 Notification created:",
    notification.type,
    notification._id.toString()
  );

  /* 🔔 REAL-TIME SOCKET EMIT */
  if (ioRef && data.user) {
    ioRef
      .to(data.user.toString())
      .emit("notification:new", notification);
  }

  return notification;
};
