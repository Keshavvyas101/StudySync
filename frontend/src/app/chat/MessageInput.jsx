import { useState, useRef, useEffect } from "react";
import { useChat } from "../../context/ChatContext";

const EMOJIS = [
  "😀","😃","😄","😁","😆","😅","😂","🙂","😉","😊",
  "😍","😘","😗","😙","😚","😋","😜","🤪","😝","😎",
  "🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮",
  "😯","😪","😫","😴","😌","😛","😜","😝","🤤",
  "👍","👎","👏","🙌","🙏","🔥","❤️","💔","🎉","✨"
];

const MessageInput = () => {
  const { sendMessage, emitTyping } = useChat();

  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const textareaRef = useRef(null);
  const pickerRef = useRef(null);

  /* =======================
     Auto-resize textarea
  ======================= */
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [text]);

  /* =======================
     Close picker on outside click / ESC
  ======================= */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    const handleEsc = (e) => {
      if (e.key === "Escape") setShowEmojiPicker(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  /* =======================
     Emoji insertion at cursor
  ======================= */
  const insertEmoji = (emoji) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const updated =
      text.slice(0, start) + emoji + text.slice(end);

    setText(updated);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + emoji.length;
      textarea.setSelectionRange(cursor, cursor);
    });

    setShowEmojiPicker(false);
  };

  /* =======================
     Send message
  ======================= */
  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!text.trim()) return;

    sendMessage(text);
    setText("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    emitTyping();
  };

  return (
    <div className="relative p-3">
      {/* ================= Emoji Picker ================= */}
      {showEmojiPicker && (
        <div
          ref={pickerRef}
          className="emoji-picker-surface absolute bottom-16 left-4 z-50 max-h-52 w-64 overflow-y-auto rounded-2xl p-2"
        >
          <div className="grid grid-cols-8 gap-1">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => insertEmoji(emoji)}
                className="emoji-picker-button"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ================= Input Box ================= */}
      <div
        className="message-input-shell flex items-end gap-2 rounded-2xl p-2.5"
      >
        {/* Emoji Toggle */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker((v) => !v)}
          className="chat-composer-icon-button"
          title="Add emoji"
        >
          😊
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 px-2 py-1.5 bg-transparent resize-none outline-none
            text-sm text-slate-900 dark:text-slate-100
            placeholder:text-slate-400 dark:placeholder:text-slate-500
            max-h-[120px] overflow-y-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#cbd5e1 transparent",
          }}
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim()}
          className={`chat-send-button
            ${
              text.trim()
                ? "chat-send-button-ready"
                : "chat-send-button-disabled cursor-not-allowed"
            }`}
        >
          <svg
            className={`w-4 h-4 ${
              text.trim() ? "text-white" : "text-slate-500"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>

      {/* Hint */}
      <p className="mt-1.5 px-2 text-[10px] text-slate-400 dark:text-slate-500">
        Press Enter to send, Shift + Enter for new line
      </p>
    </div>
  );
};

export default MessageInput;
