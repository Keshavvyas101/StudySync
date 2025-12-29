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
      className="flex items-center gap-2 px-3 py-2
                 bg-white dark:bg-slate-900
                 border-t border-slate-200 dark:border-slate-800"
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="Type a message..."
        className="flex-1 px-4 py-2 rounded-full
                   bg-slate-100 dark:bg-slate-800
                   text-slate-900 dark:text-slate-100
                   placeholder-slate-400 dark:placeholder-slate-500
                   outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <button
        onClick={handleSend}
        className="px-4 py-2 rounded-full
                   bg-indigo-600 hover:bg-indigo-700
                   text-white text-sm font-medium
                   transition"
      >
        Send
      </button>
    </div>
  );
};

export default MessageInput;
