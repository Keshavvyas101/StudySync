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

const MenuIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const Topbar = () => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { activeRoom, fetchMembers } = useRooms();
  const { setWorkspaceMode, openChat, openMobileRooms } = useUI();

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
    <header className="topbar topbar-shell relative z-50 shrink-0 backdrop-blur-xl">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={openMobileRooms}
          className="topbar-control topbar-icon-control topbar-mobile-only"
          aria-label="Open rooms"
        >
          <MenuIcon />
        </button>

        <span className="topbar-brand text-lg font-semibold text-slate-950 dark:text-slate-50">
          StudySync
        </span>
        <GlobalFocusTimer />
      </div>

      {/* RIGHT */}
      <div className="topbar-actions relative flex items-center gap-2.5">
        {/* ================= NOTIFICATIONS ================= */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setNotifOpen((v) => !v)}
            className="topbar-control topbar-icon-control relative"
          >
            🔔
          </button>

          {unreadCount > 0 && (
            <span className="topbar-badge absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-semibold text-white">
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
          className="topbar-control topbar-text-control topbar-desktop-only"
        >
          💬 Chat
        </button>

        {/* ================= ANALYTICS ================= */}
        <button
          onClick={() => setWorkspaceMode("analytics")}
          className="topbar-control topbar-text-control topbar-desktop-only"
        >
          📊 Analytics
        </button>

        {/* ================= THEME ================= */}
        <button
          onClick={toggleTheme}
          className="topbar-control topbar-icon-control"
        >
          {theme === "dark" ? "🌞" : "🌙"}
        </button>

        {/* ================= PROFILE ================= */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setProfileOpen((v) => !v)}
            className="topbar-control topbar-profile-control"
          >
            <Avatar
              name={user?.name}
              src={user?.avatar?.url}
              size={36}
            />

            <span className="max-w-32 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
              {user?.name}
            </span>
          </button>

          {profileOpen && (
            <div className="topbar-profile-menu absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-2xl backdrop-blur-xl">
              {/* HEADER */}
              <div className="profile-menu-header px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={user?.name}
                    src={user?.avatar?.url}
                    size={36}
                  />

                  <div>
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {user?.name}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
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
                  className="topbar-menu-item"
                >
                  {uploading
                    ? "Uploading..."
                    : "Change profile picture"}
                </button>

                <button
                  onClick={handleLogout}
                  className="topbar-menu-item topbar-menu-item-danger"
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
