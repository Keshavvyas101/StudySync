import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import socket from "../services/socket";

const NotificationContext = createContext({
  notifications: [],
  setNotifications: () => {},
});

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;

    const userId = user._id;

    const joinRoom = () => {
      if (!socket.connected) return;
      socket.emit("join_notifications", userId);
    };

    joinRoom();
    socket.on("connect", joinRoom);

    const handleNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
    };

    socket.on("notification:new", handleNotification);

    return () => {
      socket.off("connect", joinRoom);
      socket.off("notification:new", handleNotification);
    };
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{ notifications, setNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  return useContext(NotificationContext);
};
