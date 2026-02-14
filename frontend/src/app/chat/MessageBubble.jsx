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
      className={`group relative flex gap-2.5 px-2 py-0.5 rounded-lg
      hover:bg-slate-50 dark:hover:bg-slate-800/50
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

      <div className={`flex flex-col max-w-[75%] ${isOwn ? "items-end" : ""}`}>
        {!grouped && (
          <div className="flex gap-2 text-[10px] text-slate-400 mb-1">
            <span>{isOwn ? "You" : senderName}</span>
            <span>{formatTime(message.createdAt)}</span>
            {message.editedAt && !message.isDeleted && (
              <span className="italic">(edited)</span>
            )}
          </div>
        )}

        {/* ================= DELETED ================= */}
        {isDeletedForViewer ? (
          <div className="px-3 py-2 italic text-xs text-slate-500
            bg-slate-100 dark:bg-slate-800 border border-dashed rounded-xl">
            This message was deleted
          </div>
        ) : (
          <div className="relative">
            {/* ================= MESSAGE / EDIT ================= */}
            <div
              className={`px-3 py-2 rounded-2xl shadow-sm
              ${
                isOwn
                  ? "bg-indigo-600 text-white rounded-tr-sm"
                  : "bg-white dark:bg-slate-800 border rounded-tl-sm"
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
                className={`absolute top-0 opacity-0 group-hover:opacity-100
                transition p-1 rounded-full bg-white dark:bg-slate-800
                border shadow
                ${isOwn ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2"}`}
              >
                ⋮
              </button>
            )}

            {/* ================= MENU ================= */}
            {showMenu && (
              <div
                ref={menuRef}
                className={`absolute z-50 mt-2 w-28 rounded-lg bg-white
                dark:bg-slate-800 border shadow
                ${isOwn ? "right-0" : "left-0"}`}
              >
                {isOwn && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => deleteMessage(message._id)}
                  className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                  Delete
                </button>
              </div>
            )}

            {/* ================= EDIT CONTROLS ================= */}
            {isEditing && (
              <div className="flex gap-2 mt-1 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="text-xs text-indigo-600 font-medium"
                >
                  Save
                </button>
              </div>
            )}

            {/* ================= REACTIONS ================= */}
            {Object.keys(groupedReactions).length > 0 && (
              <div className="flex gap-1 mt-1">
                {Object.entries(groupedReactions).map(([emoji, users]) => (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(message._id, emoji)}
                    className="px-2 py-0.5 text-xs rounded-full bg-slate-100 border"
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
