// src/context/ChatContext.jsx
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRooms } from "./RoomContext";
import { useAuth } from "./AuthContext";
import api from "../services/api";
import socket from "../services/socket";

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { activeRoom } = useRooms();
  const { user } = useAuth();

  const roomId = activeRoom?._id || activeRoom?.id;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const abortRef = useRef(null);

  /* =====================================
     JOIN / LEAVE ROOM
     ===================================== */
  useEffect(() => {
    if (!roomId || !user) return;

    socket.emit("join-room", roomId);

    return () => {
      socket.emit("leave-room", roomId);
    };
  }, [roomId, user]);

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
    const handleNewMessage = (message) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
    };

    socket.on("new-message", handleNewMessage);

    return () => {
      socket.off("new-message", handleNewMessage);
    };
  }, []);

  /* =====================================
     SEND MESSAGE
     ===================================== */
  const sendMessage = (text) => {
    if (!text?.trim()) return;
    if (!roomId || !user) return;

    socket.emit("send-message", {
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
