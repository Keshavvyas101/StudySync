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
    <div className="chat-input">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="Type a message..."
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
};

export default MessageInput;
