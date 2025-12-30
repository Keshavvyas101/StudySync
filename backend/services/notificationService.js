import Notification from "../models/Notification.js";

let ioRef;

export const initNotificationSocket = (io) => {
  ioRef = io;
};

export const createNotification = async (data) => {
  const notification = await Notification.create(data);

   console.log("📦 notification saved:", notification._id);
  console.log("📡 emitting to user:", data.user.toString());
  // 🔔 emit real-time notification
  if (ioRef) {
    ioRef.to(data.user.toString()).emit("notification:new", notification);
  }

  return notification;
};
