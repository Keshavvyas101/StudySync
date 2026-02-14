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

const INITIAL_PAGE_SIZE = 40;
const PAGE_SIZE = 20;

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { activeRoom } = useRooms();
  const { user } = useAuth();

  const roomId = activeRoom?._id || activeRoom?.id;

  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const abortRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  /* ===============================
     JOIN ROOM
  =============================== */
  useEffect(() => {
    if (!roomId || !user) return;

    socket.emit("join-room", roomId);
    socket.emit("mark-read", { roomId });

    return () => {
      socket.emit("leave-room", roomId);
    };
  }, [roomId, user]);

  /* ===============================
     INITIAL FETCH
  =============================== */
  useEffect(() => {
    if (!roomId || !user) {
      setMessages([]);
      setHasMore(true);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const loadMessages = async () => {
      try {
        setLoading(true);

        const res = await api.get(
          `/rooms/${roomId}/messages?limit=${INITIAL_PAGE_SIZE}`,
          { signal: controller.signal }
        );

        const msgs = res.data.messages || [];
        setMessages(msgs);
        setHasMore(msgs.length === INITIAL_PAGE_SIZE);

        socket.emit("mark-read", { roomId });
      } catch (err) {
        if (err.code !== "ERR_CANCELED") {
          console.error("Failed to load messages", err);
        }
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
    return () => controller.abort();
  }, [roomId, user]);

  /* ===============================
     LOAD OLDER
  =============================== */
  const loadOlderMessages = async () => {
    if (!roomId || !hasMore || isLoadingOlder || messages.length === 0)
      return;

    try {
      setIsLoadingOlder(true);

      const oldest = messages[0];
      const res = await api.get(
        `/rooms/${roomId}/messages?before=${oldest.createdAt}&limit=${PAGE_SIZE}`
      );

      const older = res.data.messages || [];
      setMessages((prev) => [...older, ...prev]);
      setHasMore(older.length === PAGE_SIZE);
    } catch (err) {
      console.error("Failed to load older messages", err);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  /* ===============================
     SOCKET: NEW MESSAGE
  =============================== */
  useEffect(() => {
    const handleNewMessage = (message) => {
      setMessages((prev) =>
        prev.some((m) => m._id === message._id)
          ? prev
          : [...prev, message]
      );
    };

    socket.on("new-message", handleNewMessage);
    return () => socket.off("new-message", handleNewMessage);
  }, []);

  /* ===============================
     SOCKET: MESSAGE EDITED
  =============================== */
  useEffect(() => {
    const handleEdited = ({ messageId, content, editedAt }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, content, editedAt }
            : m
        )
      );
    };

    socket.on("message-edited", handleEdited);
    return () => socket.off("message-edited", handleEdited);
  }, []);

  /* ===============================
     SOCKET: MESSAGE DELETED
  =============================== */
  useEffect(() => {
    const handleDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                isDeleted: true,
                content: "This message was deleted",
              }
            : m
        )
      );
    };

    socket.on("message-deleted", handleDeleted);
    return () => socket.off("message-deleted", handleDeleted);
  }, []);

  /* ===============================
     REACTIONS
  =============================== */
  const toggleReaction = (messageId, emoji) => {
    if (!user) return;

    setMessages((prev) =>
      prev.map((m) => {
        if (m._id !== messageId) return m;

        const reactions = m.reactions || [];
        const exists = reactions.find(
          (r) => r.emoji === emoji && r.user === user._id
        );

        return {
          ...m,
          reactions: exists
            ? reactions.filter(
                (r) => !(r.emoji === emoji && r.user === user._id)
              )
            : [...reactions, { emoji, user: user._id }],
        };
      })
    );

    socket.emit("toggle-reaction", { messageId, emoji });
  };

  /* ===============================
     SEND MESSAGE
  =============================== */
  const sendMessage = (text) => {
    if (!text?.trim() || !roomId) return;
    socket.emit("send-message", { roomId, content: text });
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        loading,
        typingUsers,
        sendMessage,
        loadOlderMessages,
        hasMore,
        isLoadingOlder,
        toggleReaction,
        editMessage: async (id, content) =>
          api.patch(`/messages/${id}`, { content }),
        deleteMessage: async (id) =>
          api.delete(`/messages/${id}`),
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
