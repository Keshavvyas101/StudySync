// src/context/ChatContext.jsx
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import { useRooms } from "./RoomContext";
import { useAuth } from "./AuthContext";
import api from "../services/api";

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { activeRoom } = useRooms();
  const { user } = useAuth();

  const roomId = activeRoom?._id || activeRoom?.id;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const socketRef = useRef(null);
  const connectedRef = useRef(false);
  const abortRef = useRef(null);

  /* =====================================
     SOCKET CONNECT (STRICTMODE SAFE)
     ===================================== */
  useEffect(() => {
    if (!user) return;
    if (connectedRef.current) return;

    const socket = io("http://localhost:5000", {
      withCredentials: true,
      autoConnect: true,
    });

    socketRef.current = socket;
    connectedRef.current = true;

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    socket.on("disconnect", () => {
      connectedRef.current = false;
      socketRef.current = null;
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        connectedRef.current = false;
      }
    };
  }, [user]);

  /* =====================================
     JOIN ROOM ON ROOM CHANGE
     ===================================== */
  useEffect(() => {
    if (!socketRef.current) return;
    if (!roomId) return;

    socketRef.current.emit("join-room", roomId);

    return () => {
      socketRef.current?.emit("leave-room", roomId);
    };
  }, [roomId]);

  /* =====================================
     FETCH OLD MESSAGES (REST)
     ===================================== */
  useEffect(() => {
    if (!roomId || !user) {
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

    return () => controller.abort();
  }, [roomId, user]);

  /* =====================================
     RECEIVE NEW MESSAGE (SOCKET)
     ===================================== */
  useEffect(() => {
    if (!socketRef.current) return;

    const handleNewMessage = (message) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
    };

    socketRef.current.on("new-message", handleNewMessage);

    return () => {
      socketRef.current?.off("new-message", handleNewMessage);
    };
  }, []);

  /* =====================================
     SEND MESSAGE
     ===================================== */
  const sendMessage = (text) => {
    if (!socketRef.current) return;
    if (!text?.trim()) return;
    if (!roomId || !user) return;

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
  return (
    ctx || {
      messages: [],
      loading: false,
      sendMessage: () => {},
      clearMessages: () => {},
    }
  );
};
