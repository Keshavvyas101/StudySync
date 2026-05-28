import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import Avatar from "../../components/common/Avatar";

const MessageBubble = ({ message, grouped }) => {
  const { user } = useAuth();
  const { toggleReaction, editMessage, deleteMessage } = useChat();

  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);

  const pickerRef = useRef(null);
  const menuRef = useRef(null);

  const isOwn =
    message.sender?._id === user?._id ||
    message.sender === user?._id;

  const senderName = message.sender?.name || "Unknown";
  const senderAvatar = message.sender?.avatar?.url;

  /* ============================
     🗑 Deleted message handling
  ============================ */
  if (message.isDeleted && isOwn) {
  return (
    <div
      className={`px-2 py-1 text-[10px] text-slate-400 italic opacity-60
        ${grouped ? "mt-0.5" : "mt-3"}`}
    >
      You deleted this message
    </div>
  );
}

  const isDeletedForViewer = message.isDeleted && !isOwn;

  /* ============================
     Outside click close
  ============================ */
  useEffect(() => {
    const handler = (e) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target)
      ) setShowReactionPicker(false);

      if (
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) setShowMenu(false);
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const commonReactions = ["👍", "❤️", "😂", "😮", "🎉"];

  const groupedReactions = message.reactions?.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r.user);
    return acc;
  }, {});

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== message.content) {
      editMessage(message._id, editText);
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`message-row group relative flex gap-3 px-3 py-1.5
      ${isOwn ? "flex-row-reverse" : "flex-row"}
      ${grouped ? "mt-0.5" : "mt-3"}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 ${grouped ? "opacity-0" : ""}`}>
        {!isOwn ? (
          <Avatar name={senderName} src={senderAvatar} size={32} />
        ) : (
          <div className="w-8 h-8" />
        )}
      </div>

      <div className={`flex max-w-[78%] flex-col ${isOwn ? "items-end" : ""}`}>
        {!grouped && (
          <div className="mb-1.5 flex gap-2 px-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
            <span>{isOwn ? "You" : senderName}</span>
            <span>{formatTime(message.createdAt)}</span>
            {message.editedAt && !message.isDeleted && (
              <span className="italic">(edited)</span>
            )}
          </div>
        )}

        {/* ================= DELETED ================= */}
        {isDeletedForViewer ? (
          <div className="rounded-2xl bg-slate-100/80 px-3 py-2 text-xs italic text-slate-500 shadow-sm dark:bg-slate-800/70 dark:text-slate-400">
            This message was deleted
          </div>
        ) : (
          <div className="relative px-7">
            {/* ================= MESSAGE / EDIT ================= */}
            <div
              className={`message-bubble-surface px-3.5 py-2.5
              ${
                isOwn
                  ? "message-bubble-own rounded-tr-md text-white"
                  : "message-bubble-other rounded-tl-md"
              }`}
            >
              {isEditing ? (
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full text-sm resize-none bg-transparent outline-none"
                  rows={2}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {message.content}
                </p>
              )}
            </div>

            {/* ================= ACTION BUTTON ================= */}
            {!isEditing && (
              <button
                onClick={() => setShowMenu(!showMenu)}
                className={`message-action-trigger absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100
                ${isOwn ? "left-0" : "right-0"}`}
                aria-label="Message actions"
              >
                ⋮
              </button>
            )}

            {/* ================= MENU ================= */}
            {showMenu && (
              <div
                ref={menuRef}
                className={`message-action-menu absolute z-50 mt-2 w-32 overflow-hidden rounded-xl
                ${isOwn ? "right-0" : "left-0"}`}
              >
                {isOwn && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="message-menu-item"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => deleteMessage(message._id)}
                  className="message-menu-item message-menu-item-danger"
                >
                  Delete
                </button>
              </div>
            )}

            {/* ================= EDIT CONTROLS ================= */}
            {isEditing && (
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="message-inline-action"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="message-inline-action message-inline-action-primary"
                >
                  Save
                </button>
              </div>
            )}

            {/* ================= REACTIONS ================= */}
            {Object.keys(groupedReactions).length > 0 && (
              <div className="mt-1.5 flex gap-1">
                {Object.entries(groupedReactions).map(([emoji, users]) => (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(message._id, emoji)}
                    className="message-reaction-pill"
                  >
                    {emoji} {users.length}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
