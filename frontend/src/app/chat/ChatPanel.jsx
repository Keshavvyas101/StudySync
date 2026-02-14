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
      <div className="flex flex-col items-center justify-center h-full gap-6 
        bg-gradient-to-br from-slate-50 via-white to-slate-100 
        dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        
        {/* Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
          <div className="relative w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 
            rounded-3xl flex items-center justify-center shadow-2xl">
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
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      
      {/* =================== SIMPLE HEADER =================== */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 
        bg-white dark:bg-slate-900 flex-shrink-0">
        
        <div className="flex items-center gap-3">
          {/* Room Icon */}
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 
            rounded-lg flex items-center justify-center text-white font-bold shadow-md">
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
      <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800">
        <MessageInput />
      </div>
    </div>
  );
};

export default ChatPanel;