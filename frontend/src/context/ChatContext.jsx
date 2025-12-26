// src/context/ChatContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useRooms } from "./RoomContext";
import { useAuth } from "./AuthContext";
import api from "../services/api";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { activeRoom } = useRooms();
  const { user } = useAuth();

  const socketRef = useRef(null);
  const abortRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [socketReady, setSocketReady] = useState(false);

  /* =====================================
     CONNECT SOCKET ON LOGIN
     ===================================== */
  useEffect(() => {
    if (!user) return;

    const socket = io("http://localhost:5000", {
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Socket connected");
      setSocketReady(true);
    });

    socket.on("disconnect", () => {
      setSocketReady(false);
    });

    socket.on("new-message", (message) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketReady(false);
    };
  }, [user]);

  /* =====================================
     RESET ON LOGOUT
     ===================================== */
  useEffect(() => {
    if (!user) {
      setMessages([]);
    }
  }, [user]);

  /* =====================================
     LOAD MESSAGES ON ROOM CHANGE
     ===================================== */
  useEffect(() => {
    const roomId = activeRoom?._id || activeRoom?.id;

    if (!roomId) {
      setMessages([]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const loadMessages = async () => {
      try {
        setLoading(true);
        const res = await api.get(
          `/rooms/${roomId}/messages`,
          { signal: controller.signal }
        );
        setMessages(res.data.messages || []);
      } catch (err) {
        if (err.name !== "CanceledError") {
          console.error("Failed to load messages", err);
          setMessages([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    if (socketReady && socketRef.current) {
      socketRef.current.emit("join-room", roomId);
    }

    return () => controller.abort();
  }, [activeRoom, socketReady]);

  /* =====================================
     SEND MESSAGE (SAFE)
     ===================================== */
  const sendMessage = (text) => {
    const roomId = activeRoom?._id || activeRoom?.id;
    if (!text || !roomId || !user) return;
    if (!socketReady || !socketRef.current) return;

    socketRef.current.emit("send-message", {
      roomId,
      content: text,
    });
  };

  const clearMessages = () => setMessages([]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        loading,
        sendMessage,
        clearMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    console.error("useChat must be used within ChatProvider");
    return {
      messages: [],
      loading: false,
      sendMessage: () => {},
      clearMessages: () => {},
    };
  }
  return ctx;
};
