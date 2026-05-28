import Notification from "../models/Notification.js";

let ioRef;

/* ===============================
   INIT SOCKET
=============================== */
export const initNotificationSocket = (io) => {
  ioRef = io;
};

/* ===============================
   CONFIG
=============================== */

const THROTTLED_NOTIFICATION_TYPES = {
  task_updated: 60 * 1000,
  subtask_completed: 30 * 1000,
  due_soon: 6 * 60 * 60 * 1000,
};

const SINGLE_TASK_NOTIFICATIONS = new Set([
  "task_assigned",
  "due_soon",
]);

/* ===============================
   MESSAGE GENERATOR
=============================== */
const buildMessage = ({ type, meta }) => {
  const title = meta?.taskTitle || "a task";

  switch (type) {
    case "task_assigned":
      return `You were assigned "${title}"`;

    case "task_created":
      return `New task created: "${title}"`;

    case "task_updated":
      if (meta?.deadlineChanged) {
        return `Deadline updated for "${title}"`;
      }
      return `Task updated: "${title}"`;

    case "task_completed":
      return `Task completed: "${title}"`;

    case "due_soon":
      return `"${title}" is due soon`;

    

    default:
      return "You have a new notification";
  }
};

/* ===============================
   CREATE NOTIFICATION
=============================== */
export const createNotification = async (data) => {
  /**
   * Expected shape:
   * {
   *   user: ObjectId,
   *   actor?: ObjectId,
   *   type: String,
   *   room?: ObjectId,
   *   task?: ObjectId,
   *   meta?: {},
   *   message?: String
   * }
   */

  if (!data?.user || !data?.type) {
    console.warn("⚠️ Invalid notification payload:", data);
    return null;
  }

  /* ===============================
     DUPLICATE & THROTTLE CONTROL
  =============================== */
  if (data.task) {
    // Hard block duplicates
    if (SINGLE_TASK_NOTIFICATIONS.has(data.type)) {
      const exists = await Notification.findOne({
        user: data.user,
        task: data.task,
        type: data.type,
        createdAt: {
          $gte: new Date(Date.now() - 60 * 1000),
        },
      });

      if (exists) return exists;
    }

    // Throttling
    if (THROTTLED_NOTIFICATION_TYPES[data.type]) {
      const windowMs = THROTTLED_NOTIFICATION_TYPES[data.type];

      const recent = await Notification.findOne({
        user: data.user,
        task: data.task,
        type: data.type,
        createdAt: {
          $gte: new Date(Date.now() - windowMs),
        },
      });

      if (recent) return recent;
    }
  }

  /* ===============================
     FINAL MESSAGE
  =============================== */
  let message;

  if (
    typeof data.message === "string" &&
    data.message.trim()
  ) {
    message = data.message.trim();
  } else {
    message = buildMessage({
      type: data.type,
      meta: data.meta,
    });
  }

  /* ===============================
     CREATE NOTIFICATION
  =============================== */
  const notification = await Notification.create({
    user: data.user,
    type: data.type,
    message,
    room: data.room || null,
    task: data.task || null,
    meta: data.meta || {},
    read: false,
  });

  /* ===============================
     REALTIME SOCKET PUSH
  =============================== */
  if (ioRef && data.user) {
    ioRef.to(data.user.toString()).emit(
      "notification:new",
      notification
    );
  }

  return notification;
};