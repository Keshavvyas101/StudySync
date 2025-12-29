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
    <div
      className={`flex flex-col ${
        isOwnMessage ? "items-end" : "items-start"
      }`}
    >
      {!isOwnMessage && (
        <span className="mb-1 text-xs text-slate-500 dark:text-slate-400">
          {message.sender?.name || "User"}
        </span>
      )}

      <div
        className={`px-3 py-2 rounded-2xl max-w-[70%] text-sm
          ${
            isOwnMessage
              ? "bg-indigo-600 text-white rounded-br-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm"
          }
        `}
      >
        {message.content}
      </div>

      <span className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
        {time}
      </span>
    </div>
  );
};

export default MessageBubble;
