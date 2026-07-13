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

  // 🆕 unread + blink state
  const [unreadRooms, setUnreadRooms] = useState({});
  const [blinkingRooms, setBlinkingRooms] = useState({});

  const abortRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const blinkTimeoutsRef = useRef({});

  /* ===============================
     JOIN ROOM
  =============================== */
  useEffect(() => {
    if (!roomId || !user) return;

    socket.emit("join-room", roomId);
    socket.emit("mark-read", { roomId });

    // clear unread for opened room
    setUnreadRooms((prev) => {
      const updated = { ...prev };
      delete updated[roomId];
      return updated;
    });

    setBlinkingRooms((prev) => {
      const updated = { ...prev };
      delete updated[roomId];
      return updated;
    });

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

  useEffect(() => {
  return () => {
    Object.values(blinkTimeoutsRef.current).forEach(clearTimeout);
  };
}, []);
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
const activeRoomRef = useRef(null);

useEffect(() => {
  activeRoomRef.current = roomId;
}, [roomId]);

useEffect(() => {
  const handleNewMessage = (message) => {
    const incomingRoomId =
      message.room?._id ||
      message.room?.toString() ||
      message.room;

    console.log("NEW MESSAGE SOCKET:", message);
    console.log("ROOM ID:", incomingRoomId);
    console.log("ACTIVE ROOM:", activeRoomRef.current);

    // active room → append message
    if (incomingRoomId === activeRoomRef.current) {
      setMessages((prev) =>
        prev.some((m) => m._id === message._id)
          ? prev
          : [...prev, message]
      );
      return;
    }

    // ignore own message
    if (message.sender?._id === user?._id) return;

    // unread
    setUnreadRooms((prev) => ({
      ...prev,
      [incomingRoomId]: (prev[incomingRoomId] || 0) + 1,
    }));

    // blink
setBlinkingRooms((prev) => ({
  ...prev,
  [incomingRoomId]: true,
}));

// clear old timeout for this room
if (blinkTimeoutsRef.current[incomingRoomId]) {
  clearTimeout(blinkTimeoutsRef.current[incomingRoomId]);
}

// start fresh timeout
blinkTimeoutsRef.current[incomingRoomId] = setTimeout(() => {
  setBlinkingRooms((prev) => {
    const updated = { ...prev };
    delete updated[incomingRoomId];
    return updated;
  });

  delete blinkTimeoutsRef.current[incomingRoomId];
}, 3500);
  };

    const handleUserTyping = ({ userId, name }) => {
      if (userId === user?._id) return;
      setTypingUsers((prev) =>
        prev.some((u) => u._id === userId)
          ? prev
          : [...prev, { _id: userId, name }]
      );
    };

    const handleUserStopTyping = ({ userId }) => {
      setTypingUsers((prev) => prev.filter((u) => u._id !== userId));
    };

    const handleReactionUpdated = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, reactions } : m
        )
      );
    };

    socket.on("new-message", handleNewMessage);
    socket.on("user-typing", handleUserTyping);
    socket.on("user-stop-typing", handleUserStopTyping);
    socket.on("reaction-updated", handleReactionUpdated);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("user-typing", handleUserTyping);
      socket.off("user-stop-typing", handleUserStopTyping);
      socket.off("reaction-updated", handleReactionUpdated);
    };
}, [user]);

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
  const emitTyping = () => {
  if (!roomId || !user) return;

  if (!isTypingRef.current) {
    isTypingRef.current = true;
    socket.emit("typing", { roomId });
  }

  clearTimeout(typingTimeoutRef.current);

  typingTimeoutRef.current = setTimeout(() => {
    socket.emit("stop-typing", { roomId });
    isTypingRef.current = false;
  }, 1200);
};


useEffect(() => {
  return () => {
    clearTimeout(typingTimeoutRef.current);
  };
}, []);

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
        unreadRooms,       // 🆕
        blinkingRooms,     // 🆕
        editMessage: async (id, content) =>
          api.patch(`/messages/${id}`, { content }),
        deleteMessage: async (id) =>
          api.delete(`/messages/${id}`),
        emitTyping
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);