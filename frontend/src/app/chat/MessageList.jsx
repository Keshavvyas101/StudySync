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
    return <div className="chat-loading">Loading messages...</div>;
  }

  return (
    <div className="chat-messages">
      {messages.map((msg) => (
        <MessageBubble key={msg._id} message={msg} />
      ))}

      {/* scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
