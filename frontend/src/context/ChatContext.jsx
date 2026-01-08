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


const PAGE_SIZE = 20;
const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { activeRoom } = useRooms();
  const { user } = useAuth();
  
  const roomId = activeRoom?._id || activeRoom?.id;
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  
  const abortRef = useRef(null);
  
  /* ===============================
  JOIN / LEAVE ROOM (SOCKET)
  =============================== */
  useEffect(() => {
    if (!roomId || !user) return;
    
    socket.emit("join-room", roomId);
    
    return () => {
      socket.emit("leave-room", roomId);
    };
  }, [roomId, user]);
  
  /* ===============================
  INITIAL FETCH (LATEST MESSAGES)
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
          `/rooms/${roomId}/messages?limit=${PAGE_SIZE}`,
          { signal: controller.signal }
        );
        
        const msgs = res.data.messages || [];
        setMessages(msgs);
        setHasMore(msgs.length === PAGE_SIZE);
      } catch (err) {
        if (
          err.name !== "CanceledError" &&
          err.code !== "ERR_CANCELED"
        ) {
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
  
  /* ===============================
  LOAD OLDER MESSAGES (PAGINATION)
  =============================== */
  const loadOlderMessages = async () => {
    if (
      !roomId ||
      !hasMore ||
      isLoadingOlder ||
      messages.length === 0
    )
    return;
    
    try {
      setIsLoadingOlder(true);
      
      const oldest = messages[0];
      
      const res = await api.get(
        `/rooms/${roomId}/messages?before=${oldest.createdAt}&limit=${PAGE_SIZE}`
      );
      
      const olderMessages = res.data.messages || [];
      
      setMessages((prev) => [...olderMessages, ...prev]);
      setHasMore(olderMessages.length === PAGE_SIZE);
    } catch (err) {
      console.error("Failed to load older messages", err);
    } finally {
      setIsLoadingOlder(false);
    }
  };
  
  /* ===============================
     RECEIVE NEW MESSAGE (SOCKET)
     =============================== */
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
  
  /* ===============================
  SEND MESSAGE
  =============================== */
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
        loadOlderMessages,
        hasMore,
        isLoadingOlder,
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
      loadOlderMessages: () => {},
      hasMore: false,
      isLoadingOlder: false,
    }
  );
  };
