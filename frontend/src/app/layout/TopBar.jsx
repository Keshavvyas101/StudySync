import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const Topbar = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();          // ✅ clears user immediately
    navigate("/login", { replace: true }); // ✅ instant redirect
  };

  return (
    <header className="topbar flex justify-between items-center px-6 h-14 border-b border-white/10">
      <span className="text-lg font-semibold">StudySync</span>

      <div className="flex gap-3">
        <button
          onClick={toggleTheme}
          className="px-3 py-1 rounded bg-[#1a1f2b]"
        >
          {theme === "dark" ? "🌞" : "🌙"}
        </button>

        <button
          onClick={handleLogout}
          className="px-3 py-1 rounded bg-red-600 hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Topbar;
