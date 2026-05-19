import { useEffect, useRef } from "react";
import { useNotifications } from "../context/NotificationContext";
import { useRooms } from "../context/RoomContext";
import { useUI } from "../context/UIContext";
import Avatar from "../components/common/Avatar";

/* ===============================
   TIME AGO HELPER
   =============================== */
const timeAgo = (date) => {
  if (!date) return "";
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)} weeks ago`;
};

/* ===============================
   TYPE ICON
   =============================== */
const getTypeIcon = (type) => {
  switch (type) {
    case "task_assigned": return "📌";
    case "task_completed": return "✅";
    case "task_created": return "🆕";
    case "task_updated": return "✏️";
    case "due_soon": return "⏰";
    case "member_joined": return "👤";
    case "member_left": return "🚪";
    default: return "🔔";
  }
};

/* ===============================
   GROUP BY TIME
   =============================== */
const groupNotifications = (notifications) => {
  const now = new Date();
  const today = [];
  const yesterday = [];
  const earlier = [];

  notifications.forEach((n) => {
    const created = new Date(n.createdAt);
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);

    const startCreated = new Date(created);
    startCreated.setHours(0, 0, 0, 0);

    const diffDays =
      (startToday - startCreated) / 86400000;

    if (diffDays === 0) today.push(n);
    else if (diffDays === 1) yesterday.push(n);
    else earlier.push(n);
  });

  return { today, yesterday, earlier };
};

const NotificationDropdown = ({ onClose }) => {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    loadOlderNotifications,
    hasMore,
    isLoadingOlder,
    deleteNotification,
    handleNotificationClick,
  } = useNotifications();

  const { rooms, setActiveRoom } = useRooms();
  const { openTask } = useUI();

  const ref = useRef(null);
  const listRef = useRef(null);

  const grouped = groupNotifications(notifications);
  const hasUnread = notifications.some((n) => !n.read);

  /* ===============================
     SCROLL LOAD MORE
     =============================== */
  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;

    if (
      scrollTop + clientHeight >= scrollHeight - 40 &&
      hasMore &&
      !isLoadingOlder
    ) {
      loadOlderNotifications();
    }
  };

  const renderItem = (n) => {
    const isUnread = !n.read;
    const room = rooms.find((r) => r._id === n.room);
    const avatarSrc = room?.avatar?.url;
    const avatarName = room?.name || n.message;

    return (
      <div
        key={n._id}
        onClick={() => {
          handleNotificationClick(n, rooms, setActiveRoom, openTask);
          onClose();
        }}
        className={`group relative flex gap-3 px-4 py-3 cursor-pointer
          border-b border-slate-100 dark:border-slate-800
          hover:bg-slate-100 dark:hover:bg-slate-800
          ${isUnread ? "bg-indigo-50/40 dark:bg-indigo-900/10" : ""}`}
      >
        <div className="shrink-0 pt-0.5">
            <Avatar name={avatarName} src={avatarSrc} size={34} />
        </div>

        <div className="flex-1 pr-6">
          <p className={`text-sm ${isUnread ? "font-medium" : "text-slate-600 dark:text-slate-400"}`}>
            <span className="mr-1">{getTypeIcon(n.type)}</span>
            {n.message}
          </p>

          <span className="block mt-1 text-[11px] text-slate-400">
            {timeAgo(n.createdAt)}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteNotification(n._id);
          }}
          className="absolute right-3 top-3 text-slate-400 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100"
        >
          ✕
        </button>

        {isUnread && (
          <span className="absolute right-3 bottom-3 h-2 w-2 rounded-full bg-indigo-600" />
        )}
      </div>
    );
  };

  const renderGroup = (title, items) =>
    items.length > 0 && (
      <>
        <div className="px-4 py-2 text-xs font-semibold text-slate-500">
          {title}
        </div>
        {items.map(renderItem)}
      </>
    );

  return (
    <div
      ref={ref}
      className="absolute right-0 mt-3 w-80 rounded-xl shadow-xl
        bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800
        z-50 overflow-hidden"
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3
        bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <span className="text-sm font-semibold">Notifications</span>

        {hasUnread && (
          <button
            onClick={markAllAsRead}
            className="text-xs text-indigo-600 hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* LIST */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="max-h-80 overflow-y-auto"
      >
        {notifications.length === 0 && (
          <div className="px-4 py-6 text-sm text-center text-slate-500">
            No notifications yet
          </div>
        )}

        {renderGroup("Today", grouped.today)}
        {renderGroup("Yesterday", grouped.yesterday)}
        {renderGroup("Earlier", grouped.earlier)}

        {isLoadingOlder && (
          <div className="px-4 py-3 text-xs text-center text-slate-500">
            Loading more…
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
