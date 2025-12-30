import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationContext";
import NotificationDropdown from "../../components/NotificationDropdown";
import "./layout.css";

const Topbar = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // ✅ ALWAYS SAFE NOW
  const { notifications } = useNotifications();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="topbar flex justify-between items-center px-6 h-14
                       bg-white dark:bg-slate-950
                       border-b border-slate-200 dark:border-slate-800">
      <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        StudySync
      </span>

      <div className="flex items-center gap-4 relative">
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="h-9 w-9 flex items-center justify-center rounded-full
                       bg-slate-100 dark:bg-slate-800">
            🔔
          </button>

          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-[20px]
                             px-1 rounded-full bg-red-600 text-white
                             text-xs flex items-center justify-center">
              {notifications.length}
            </span>
          )}

          {open && <NotificationDropdown onClose={() => setOpen(false)} />}
        </div>

        <button onClick={toggleTheme}>
          {theme === "dark" ? "🌞" : "🌙"}
        </button>

        <button onClick={handleLogout}>Logout</button>
      </div>
    </header>
  );
};

export default Topbar;
