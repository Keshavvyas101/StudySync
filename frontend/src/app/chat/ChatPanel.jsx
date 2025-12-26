import { useRooms } from "../../context/RoomContext";
import { useChat } from "../../context/ChatContext";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import "../layout/layout.css";


const ChatPanel = () => {
  const { activeRoom } = useRooms();
  const { messages, loading } = useChat();

  if (!activeRoom) {
    return (
      <div className="chat-empty">
        <p>Select a room to start chatting</p>
      </div>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">💬 {activeRoom.name}</div>

      <MessageList
        messages={messages}
        loading={loading}
      />

      <MessageInput />
    </div>
  );
};

export default ChatPanel;
