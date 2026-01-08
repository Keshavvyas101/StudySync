import { useAuth } from "../../context/AuthContext";

const MessageBubble = ({ message }) => {
  const { user } = useAuth();

  const senderId =
    typeof message.sender === "string"
      ? message.sender
      : message.sender?._id;

  const isOwnMessage =
    senderId === user?.id || senderId === user?._id;

  const senderName = message.sender?.name || "User";
  const avatarLetter = senderName.charAt(0).toUpperCase();

  const time = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div
      className={`flex gap-2 ${
        isOwnMessage ? "justify-end" : "justify-start"
      }`}
    >
      {/* AVATAR (only for others) */}
      {!isOwnMessage && (
        <div
          className="
            h-8 w-8 rounded-full
            flex items-center justify-center
            text-sm font-semibold
            text-white
            bg-gradient-to-br from-indigo-500 to-purple-600
            flex-shrink-0
            mt-5
          "
          title={senderName}
        >
          {avatarLetter}
        </div>
      )}

      {/* MESSAGE COLUMN */}
      <div
        className={`flex flex-col ${
          isOwnMessage ? "items-end" : "items-start"
        }`}
      >
        {/* Sender name (only for others) */}
        {!isOwnMessage && (
          <span className="mb-0.5 text-[11px] font-medium
                           text-slate-500 dark:text-slate-400">
            {senderName}
          </span>
        )}

        {/* Message bubble */}
        <div
          className={`
            px-4 py-2.5
            rounded-2xl
            max-w-[75%]
            text-sm leading-relaxed
            ${
              isOwnMessage
                ? "bg-indigo-600 text-white rounded-br-md"
                : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-md"
            }
          `}
        >
          {message.content}
        </div>

        {/* Time */}
        <span className="mt-0.5 text-[10px]
                         text-slate-400 dark:text-slate-500">
          {time}
        </span>
      </div>
    </div>
  );
};

export default MessageBubble;
