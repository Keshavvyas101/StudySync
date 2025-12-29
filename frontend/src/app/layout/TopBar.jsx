import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import "./layout.css";

const Topbar = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header
      className="topbar flex justify-between items-center px-6 h-14
                 bg-white dark:bg-slate-950
                 border-b border-slate-200 dark:border-slate-800"
    >
      {/* LOGO / TITLE */}
      <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        StudySync
      </span>

      {/* ACTIONS */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="h-9 w-9 flex items-center justify-center rounded-full
                     bg-slate-100 dark:bg-slate-800
                     text-slate-700 dark:text-slate-200
                     hover:bg-slate-200 dark:hover:bg-slate-700
                     transition"
          title="Toggle theme"
        >
          {theme === "dark" ? "🌞" : "🌙"}
        </button>

        <button
          onClick={handleLogout}
          className="px-4 py-1.5 rounded-full
                     bg-rose-600 hover:bg-rose-700
                     text-white text-sm font-medium
                     transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Topbar;
