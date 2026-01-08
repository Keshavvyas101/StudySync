import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import socket from "../services/socket";
import api from "../services/api";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  /* ===============================
     INITIAL FETCH
     =============================== */
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setHasMore(true);
      return;
    }

    let active = true;

    const fetchNotifications = async () => {
      try {
        const res = await api.get("/notifications", {
          params: { limit: 20 },
        });

        if (!active) return;

        setNotifications(res.data.notifications || []);
        setHasMore(res.data.hasMore ?? false);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };

    fetchNotifications();

    return () => {
      active = false;
    };
  }, [user]);

  /* ===============================
     LOAD OLDER
     =============================== */
  const loadOlderNotifications = async () => {
    if (
      isLoadingOlder ||
      !hasMore ||
      notifications.length === 0
    ) {
      return;
    }

    setIsLoadingOlder(true);

    try {
      const last = notifications[notifications.length - 1];

      const res = await api.get("/notifications", {
        params: {
          limit: 20,
          before: last.createdAt,
        },
      });

      const older = res.data.notifications || [];

      setNotifications((prev) => {
        const existing = new Set(prev.map((n) => n._id));
        return [
          ...prev,
          ...older.filter((n) => !existing.has(n._id)),
        ];
      });

      setHasMore(res.data.hasMore ?? false);
    } catch (err) {
      console.error("Failed to load older notifications", err);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  /* ===============================
     DELETE NOTIFICATION
     =============================== */
  const deleteNotification = async (id) => {
    // 🔥 Optimistic UI
    setNotifications((prev) =>
      prev.filter((n) => n._id !== id)
    );

    try {
      await api.delete(`/notifications/${id}`);
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  /* ===============================
     SOCKET HANDLING
     =============================== */
  useEffect(() => {
    if (!user) return;

    const userId = user._id;

    const joinNotifications = () => {
      socket.emit("join_notifications", userId);
    };

    const handleNewNotification = (notification) => {
      const notifUserId =
        typeof notification.user === "object"
          ? notification.user._id
          : notification.user;

      if (notifUserId !== userId) return;

      setNotifications((prev) => {
        if (prev.some((n) => n._id === notification._id)) {
          return prev;
        }
        return [notification, ...prev];
      });
    };

    const handleDeletedNotification = (id) => {
      setNotifications((prev) =>
        prev.filter((n) => n._id !== id)
      );
    };

    joinNotifications();

    socket.on("connect", joinNotifications);
    socket.on("notification:new", handleNewNotification);
    socket.on("notification:deleted", handleDeletedNotification);

    return () => {
      socket.off("connect", joinNotifications);
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:deleted", handleDeletedNotification);
    };
  }, [user]);

  /* ===============================
     ACTIONS
     =============================== */
  const markAsRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n._id === id ? { ...n, read: true } : n
      )
    );

    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  };

  const markAllAsRead = async () => {
    const hasUnread = notifications.some((n) => !n.read);
    if (!hasUnread) return;

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );

    try {
      await api.patch("/notifications/read-all");
    } catch (err) {
      console.error("Failed to mark all notifications read", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        hasMore,
        isLoadingOlder,
        loadOlderNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  return useContext(NotificationContext);
};
