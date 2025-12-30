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
      <div className="chat-empty flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
        <p>Select a room to start chatting</p>
      </div>
    );
  }

  return (
    <div className="chat-panel flex flex-col min-h-0 rounded-xl
                    bg-white dark:bg-slate-900
                    border border-slate-200 dark:border-slate-800
                    shadow-sm">

      {/* HEADER */}
      <div className="chat-header px-4 py-3
                      border-b border-slate-200 dark:border-slate-800
                      font-semibold text-slate-900 dark:text-slate-100
                      bg-slate-50 dark:bg-slate-950
                      rounded-t-xl">
        💬 {activeRoom.name}
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-auto no-scrollbar ">
        <MessageList
          messages={messages}
          loading={loading}
        />
      </div>

      {/* INPUT */}
      <div className="border-t border-slate-200 dark:border-slate-800
                      bg-slate-50 dark:bg-slate-950
                      rounded-b-xl">
        <MessageInput />
      </div>
    </div>
  );
};

export default ChatPanel;
