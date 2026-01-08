// src/components/chat/MessageList.jsx
import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

const MessageList = ({
  messages,
  loading,
  loadOlderMessages,
  hasMore,
  isLoadingOlder,
}) => {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);

  /* =====================================
     AUTO SCROLL (NEW MESSAGES ONLY)
     ===================================== */
  useEffect(() => {
    if (!isLoadingOlder) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages, isLoadingOlder]);

  /* =====================================
     AUTO LOAD OLDER ON SCROLL TOP
     ===================================== */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (
        el.scrollTop <=5 &&
        hasMore &&
        !isLoadingOlder
      ) {
        loadOlderMessages();
      }
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [hasMore, isLoadingOlder, loadOlderMessages]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-full
                   text-slate-400 dark:text-slate-500 text-sm"
      >
        Loading messages…
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="chat-messages flex-1 min-h-0 h-full overflow-y-auto
                 px-4 py-3 space-y-3
                 bg-white dark:bg-slate-900"
    >
      {/* Optional small hint */}
      {isLoadingOlder && (
        <div className="text-center text-xs text-slate-400 mb-2">
          Loading older messages…
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble key={msg._id} message={msg} />
      ))}

      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
