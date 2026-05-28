// src/utils/notificationUtils.js

export const getNotificationMeta = (type) => {
  switch (type) {
    case "task_assigned":
      return { icon: "📌", label: "Assigned" };
    case "task_completed":
      return { icon: "✅", label: "Completed" };
    case "task_updated":
      return { icon: "✏️", label: "Updated" };
    case "task_created":
      return { icon: "🆕", label: "Created" };
    case "due_soon":
      return { icon: "⏰", label: "Due Soon" };
    case "member_joined":
      return { icon: "👤", label: "Joined" };
    case "member_left":
      return { icon: "👋", label: "Left" };
    default:
      return { icon: "🔔", label: "Notification" };
  }
};

export const groupNotifications = (notifications) => {
  const today = [];
  const yesterday = [];
  const earlier = [];

  const now = new Date();
  const startOfToday = new Date(now.setHours(0, 0, 0, 0));
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  notifications.forEach((n) => {
    const created = new Date(n.createdAt);

    if (created >= startOfToday) today.push(n);
    else if (created >= startOfYesterday) yesterday.push(n);
    else earlier.push(n);
  });

  return { today, yesterday, earlier };
};

export const getSmartAvatarName = (notification, room) => {
  if (notification.task) return "Task";
  if (room?.name) return room.name;
  return notification.message || "Notification";
};
