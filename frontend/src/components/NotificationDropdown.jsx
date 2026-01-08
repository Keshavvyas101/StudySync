import { useEffect, useRef } from "react";
import { useNotifications } from "../context/NotificationContext";
import { useRooms } from "../context/RoomContext";
import { useTasks } from "../context/TaskContext";

/* ===============================
   ICON HELPER
   =============================== */
const getNotificationIcon = (type) => {
  switch (type) {
    case "task_assigned":
      return "📌";
    case "task_completed":
      return "✅";
    case "due_soon":
      return "⏰";
    case "member_left":
      return "🚪";
    case "member_joined":
      return "👋";
    default:
      return "🔔";
  }
};

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

const NotificationDropdown = ({ onClose }) => {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    loadOlderNotifications,
    hasMore,
    isLoadingOlder,
    deleteNotification,
  } = useNotifications();

  const { rooms, setActiveRoom } = useRooms();
  const { focusTask } = useTasks(); // ✅ NEW

  const ref = useRef(null);
  const listRef = useRef(null);

  /* ===============================
     CLOSE ON OUTSIDE CLICK
     =============================== */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  /* ===============================
     SCROLL PAGINATION
     =============================== */
  const handleScroll = () => {
    if (!listRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      listRef.current;

    if (
      scrollTop + clientHeight >= scrollHeight - 40 &&
      hasMore &&
      !isLoadingOlder
    ) {
      loadOlderNotifications();
    }
  };

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div
      ref={ref}
      className="
        absolute right-0 mt-3 w-80
        rounded-xl shadow-xl
        bg-white dark:bg-slate-900
        border border-slate-200 dark:border-slate-800
        z-50 overflow-hidden
      "
    >
      {/* HEADER */}
      <div
        className="
          flex items-center justify-between
          px-4 py-3
          bg-slate-50 dark:bg-slate-950
          border-b border-slate-200 dark:border-slate-800
        "
      >
        <span className="text-sm font-semibold">
          Notifications
        </span>

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

        {notifications.map((n) => {
          const isUnread = !n.read;

          return (
            <div
              key={n._id}
              onClick={() => {
                if (isUnread) markAsRead(n._id);

                // ✅ SWITCH ROOM
                if (n.room) {
                  const targetRoom = rooms.find(
                    (r) => r._id === n.room
                  );
                  if (targetRoom) {
                    setActiveRoom(targetRoom);
                  }
                }

                // ✅ STORE TASK TO FOCUS (if any)
                if (n.task) {
                  focusTask(n.task);
                }

                onClose();
              }}
              className={`
                group relative flex gap-3 px-4 py-3 cursor-pointer
                border-b border-slate-100 dark:border-slate-800
                hover:bg-slate-100 dark:hover:bg-slate-800
                transition
                ${
                  isUnread
                    ? "bg-indigo-50/40 dark:bg-indigo-900/10"
                    : ""
                }
              `}
            >
              {/* ICON */}
              <div className="text-lg pt-0.5 shrink-0">
                {getNotificationIcon(n.type)}
              </div>

              {/* CONTENT */}
              <div className="flex-1 pr-6">
                <p
                  className={`text-sm ${
                    isUnread
                      ? "font-medium"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {n.message}
                </p>

                <span className="block mt-1 text-[11px] text-slate-400">
                  {timeAgo(n.createdAt)}
                </span>
              </div>

              {/* DELETE */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(n._id);
                }}
                className="
                  absolute right-3 top-3
                  text-slate-400 hover:text-red-500
                  text-xs
                  opacity-0 group-hover:opacity-100
                  transition
                "
                title="Delete notification"
              >
                ✕
              </button>

              {/* UNREAD DOT */}
              {isUnread && (
                <span className="absolute right-3 bottom-3 h-2 w-2 rounded-full bg-indigo-600" />
              )}
            </div>
          );
        })}

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
