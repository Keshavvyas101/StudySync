import { useEffect, useRef } from "react";
import { useNotifications } from "../context/NotificationContext";

const NotificationDropdown = ({ onClose }) => {
  const { notifications } = useNotifications();
  const ref = useRef(null);

  // close on outside click
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

  return (
    <div
      ref={ref}
      className="absolute right-0 mt-2 w-80
                 rounded-lg shadow-lg
                 bg-white dark:bg-slate-900
                 border border-slate-200 dark:border-slate-800
                 z-50"
    >
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800
                      text-sm font-semibold text-slate-800 dark:text-slate-100">
        Notifications
      </div>

      <div className="max-h-72 overflow-y-auto">
        {notifications.length === 0 && (
          <div className="px-4 py-3 text-sm text-slate-500">
            No notifications
          </div>
        )}

        {notifications.map((n) => (
          <div
            key={n._id}
            className={`px-4 py-3 text-sm cursor-pointer
                        border-b border-slate-100 dark:border-slate-800
                        hover:bg-slate-100 dark:hover:bg-slate-800
                        ${
                          n.read
                            ? "text-slate-500"
                            : "text-slate-900 dark:text-slate-100 font-medium"
                        }`}
          >
            {n.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationDropdown;
