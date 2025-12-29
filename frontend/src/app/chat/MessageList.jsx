// src/components/chat/MessageList.jsx
import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

const MessageList = ({ messages, loading }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full
                      text-slate-400 dark:text-slate-500 text-sm">
        Loading messages…
      </div>
    );
  }

  return (
    <div
      className="chat-messages flex-1 overflow-y-auto px-4 py-3 space-y-3
                 bg-white dark:bg-slate-900"
    >
      {messages.map((msg) => (
        <MessageBubble key={msg._id} message={msg} />
      ))}

      {/* scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
