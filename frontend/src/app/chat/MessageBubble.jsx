// src/components/chat/MessageBubble.jsx
import { useAuth } from "../../context/AuthContext";

const MessageBubble = ({ message }) => {
  const { user } = useAuth();

  const senderId =
    typeof message.sender === "string"
      ? message.sender
      : message.sender?._id;

  const isOwnMessage =
    senderId === user?.id || senderId === user?._id;

  const time = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className={`chat-message ${isOwnMessage ? "own" : "other"}`}>
      {!isOwnMessage && (
        <div className="chat-sender">
          {message.sender?.name || "User"}
        </div>
      )}

      <div className="chat-bubble">
        {message.content}
      </div>

      <div className="chat-time">
        {time}
      </div>
    </div>
  );
};

export default MessageBubble;
