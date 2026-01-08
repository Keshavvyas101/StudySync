import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationContext";
import NotificationDropdown from "../../components/NotificationDropdown";
import Avatar from "../../components/common/Avatar";
import "./layout.css";

const Topbar = () => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();

  useEffect(() => {
    if (!open) return;

    const handleClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="topbar">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          StudySync
        </span>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4 relative">
        {/* NOTIFICATIONS */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative h-9 w-9 flex items-center justify-center rounded-full
                       bg-slate-100 hover:bg-slate-200
                       dark:bg-slate-800 dark:hover:bg-slate-700
                       transition"
          >
            🔔
          </button>

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px]
                             px-1 rounded-full bg-red-600 text-white
                             text-[11px] font-semibold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}

          {open && (
            <NotificationDropdown onClose={() => setOpen(false)} />
          )}
        </div>

        {/* THEME */}
        <button
          onClick={toggleTheme}
          className="h-9 w-9 flex items-center justify-center rounded-full
                     bg-slate-100 hover:bg-slate-200
                     dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          {theme === "dark" ? "🌞" : "🌙"}
        </button>

        {/* USER */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-700">
          <Avatar name={user?.name} size={36} />

          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {user?.name}
          </span>

          <button
            onClick={handleLogout}
            className="text-sm text-slate-500 hover:text-red-600
                       dark:text-slate-400 dark:hover:text-red-400"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
