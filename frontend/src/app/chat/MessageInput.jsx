// src/components/chat/MessageInput.jsx
import { useState } from "react";
import { useChat } from "../../context/ChatContext";

const MessageInput = () => {
  const [text, setText] = useState("");
  const { sendMessage } = useChat();

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(text.trim());
    setText("");
  };

  return (
    <div
      className="
        flex items-center gap-3
        px-4 py-3
        bg-white dark:bg-slate-950
        border-t border-slate-200 dark:border-slate-800
        shadow-[0_-1px_4px_rgba(0,0,0,0.06)]
      "
    >
      {/* INPUT WRAPPER */}
      <div className="flex-1 relative">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message…"
          className="
            w-full px-5 py-3 pr-12
            rounded-full
            bg-slate-100 dark:bg-slate-800
            text-slate-900 dark:text-slate-100
            placeholder-slate-400 dark:placeholder-slate-500
            outline-none
            focus:ring-2 focus:ring-indigo-500
            transition
          "
        />
      </div>

      {/* SEND BUTTON */}
      <button
        onClick={handleSend}
        disabled={!text.trim()}
        className="
          h-11 w-11
          flex items-center justify-center
          rounded-full
          bg-indigo-900 hover:bg-indigo-400
          text-white
          transition
          disabled:opacity-40 disabled:cursor-not-allowed
        "
        title="Send"
      >
        ➤
      </button>
    </div>
  );
};

export default MessageInput;
