import { useRooms } from "../../context/RoomContext";
import { useChat } from "../../context/ChatContext";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import "../layout/layout.css";

const ChatPanel = () => {
  const { activeRoom } = useRooms();
  const {
    messages,
    loading,
    loadOlderMessages,
    hasMore,
    isLoadingOlder,
  } = useChat();

  if (!activeRoom) {
    return (
      <div className="chat-empty-state flex h-full flex-col items-center justify-center gap-6">
        
        {/* Icon */}
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-indigo-500 blur-2xl opacity-10"></div>
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-600 shadow-2xl shadow-indigo-500/20">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-2 max-w-sm px-6">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
            No conversation selected
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Select a room to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-panel flex h-full flex-col">
      
      {/* =================== SIMPLE HEADER =================== */}
      <div className="chat-panel-header flex-shrink-0 px-4 py-3">
        
        <div className="flex items-center gap-3">
          {/* Room Icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-500/20">
            #
          </div>

          {/* Room Name */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {activeRoom.name}
            </h2>
            {activeRoom.memberCount && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeRoom.memberCount} members
              </p>
            )}
          </div>
        </div>
      </div>

      {/* =================== MESSAGES =================== */}
      <MessageList
        messages={messages}
        loading={loading}
        loadOlderMessages={loadOlderMessages}
        hasMore={hasMore}
        isLoadingOlder={isLoadingOlder}
      />

      {/* =================== INPUT =================== */}
      <div className="chat-input-region flex-shrink-0">
        <MessageInput />
      </div>
    </div>
  );
};

export default ChatPanel;
