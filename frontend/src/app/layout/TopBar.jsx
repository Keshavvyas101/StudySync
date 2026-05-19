import { useEffect, useRef, useState } from "react";
import { useRooms } from "../../context/RoomContext";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationContext";
import NotificationDropdown from "../../components/NotificationDropdown";
import Avatar from "../../components/common/Avatar";
import api from "../../services/api";
import { useUI } from "../../context/UIContext";
import GlobalFocusTimer from "./GlobalFocusTimer";
import "./layout.css";

const Topbar = () => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { activeRoom, fetchMembers } = useRooms();
  const { setWorkspaceMode, openChat } = useUI();




  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const fileInputRef = useRef(null);

  const navigate = useNavigate();
  const { logout, user, updateUserAvatar } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();

  /* ===============================
     CLOSE DROPDOWNS ON OUTSIDE MOUSEDOWN
     =============================== */
  useEffect(() => {
    const handleMouseDown = (e) => {
      if (
        notifRef.current &&
        !notifRef.current.contains(e.target)
      ) {
        setNotifOpen(false);
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(e.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () =>
      document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  /* ===============================
     AVATAR UPLOAD HANDLER
     =============================== */
 const handleAvatarChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("avatar", file);

  try {
    setUploading(true);

    const res = await api.patch("/users/avatar", formData);

    // ✅ update logged-in user avatar
    updateUserAvatar(res.data.avatar);

    // 🔥 IMPORTANT: refresh members list
    if (activeRoom?._id) {
      fetchMembers(activeRoom._id);
    }

    setProfileOpen(false);
  } catch (err) {
    console.error("Avatar upload failed", err);
    alert("Failed to upload profile picture");
  } finally {
    setUploading(false);
    e.target.value = "";
  }
};


  return (
    <header className="topbar relative z-50 shrink-0 bg-white/85 dark:bg-slate-950/85 border-b border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold text-slate-950 dark:text-slate-50">
          StudySync
        </span>
        <GlobalFocusTimer />
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-3 relative">
        {/* ================= NOTIFICATIONS ================= */}
        <div ref={notifRef} className="relative">
          
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setNotifOpen((v) => !v)}
            className="relative h-9 w-9 flex items-center justify-center rounded-full
                       bg-slate-100/80 hover:bg-slate-200
                       dark:bg-slate-900 dark:hover:bg-slate-800
                       transition-all duration-200 hover:-translate-y-0.5"
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

          {notifOpen && (
            <NotificationDropdown
              onClose={() => setNotifOpen(false)}
            />
          )}
        </div>

       {/* ================= CHAT ================= */}
<button
  onClick={openChat}
  className="h-9 px-3 flex items-center gap-1 rounded-full
             bg-slate-100/80 hover:bg-slate-200
             dark:bg-slate-900 dark:hover:bg-slate-800
             text-sm font-medium text-slate-700 dark:text-slate-200
             transition-all duration-200 hover:-translate-y-0.5"
>
  💬 Chat
</button>

{/* ================= ANALYTICS ================= */}
<button
  onClick={() => setWorkspaceMode("analytics")}
  className="h-9 px-3 flex items-center gap-1 rounded-full
             bg-slate-100/80 hover:bg-slate-200
             dark:bg-slate-900 dark:hover:bg-slate-800
             text-sm font-medium text-slate-700 dark:text-slate-200
             transition-all duration-200 hover:-translate-y-0.5"
>
  📊 Analytics
</button>



        {/* ================= THEME ================= */}
        <button
          onClick={toggleTheme}
          className="h-9 w-9 flex items-center justify-center rounded-full
                     bg-slate-100/80 hover:bg-slate-200
                     dark:bg-slate-900 dark:hover:bg-slate-800
                     transition-all duration-200 hover:-translate-y-0.5"
        >
          {theme === "dark" ? "🌞" : "🌙"}
        </button>

        {/* ================= PROFILE ================= */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 pl-3
                       border-l border-slate-200 dark:border-slate-800"
          >
           <Avatar
  name={user?.name}
  src={user?.avatar?.url}
  size={36}
/>

            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {user?.name}
            </span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-3 w-56 rounded-2xl shadow-2xl shadow-slate-900/10
                            bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
                            border border-slate-200/80 dark:border-slate-800 z-50 overflow-hidden">
              {/* HEADER */}
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                 <Avatar
  name={user?.name}
  src={user?.avatar?.url}
  size={36}
/>

                  <div>
                    <p className="text-sm font-semibold">
                      {user?.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="p-2 space-y-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full text-left px-3 py-2 text-sm rounded-md
                             hover:bg-slate-100 dark:hover:bg-slate-800
                             disabled:opacity-50"
                >
                  {uploading
                    ? "Uploading..."
                    : "Change profile picture"}
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm rounded-md
                             text-red-600 hover:bg-red-50
                             dark:hover:bg-red-900/20"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HIDDEN FILE INPUT */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleAvatarChange}
      />
    </header>
  );
};

export default Topbar;
