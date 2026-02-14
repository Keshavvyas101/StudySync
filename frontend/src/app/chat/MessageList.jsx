import { useEffect, useRef, useMemo } from "react";
import MessageBubble from "./MessageBubble";
import { useChat } from "../../context/ChatContext";

const GROUP_TIME_MS = 3 * 60 * 1000;
const TOP_THRESHOLD = 80;

const MessageList = ({
  messages,
  loading,
  loadOlderMessages,
  hasMore,
  isLoadingOlder,
}) => {
  const { typingUsers } = useChat();

  const containerRef = useRef(null);
  const prevScrollHeightRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  /* ===========================
     SCROLL HANDLER
  =========================== */
  const handleScroll = (e) => {
    const el = e.currentTarget;
    if (!el) return;

    if (
      el.scrollTop <= TOP_THRESHOLD &&
      hasMore &&
      !isLoadingOlder
    ) {
      prevScrollHeightRef.current = el.scrollHeight;
      loadOlderMessages();
    }
  };

  /* ===========================
     AUTO-SCROLL TO BOTTOM ON INITIAL LOAD
  =========================== */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || loading) return;

    if (isInitialLoadRef.current && messages.length > 0) {
      setTimeout(() => {
        el.scrollTop = el.scrollHeight;
      }, 100);
      isInitialLoadRef.current = false;
    }
  }, [messages, loading]);

  /* ===========================
     PRESERVE SCROLL POSITION AFTER PAGINATION
  =========================== */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || prevScrollHeightRef.current == null) return;

    const diff = el.scrollHeight - prevScrollHeightRef.current;
    el.scrollTop = diff;

    prevScrollHeightRef.current = null;
  }, [messages]);

  /* ===========================
     SCROLL TO BOTTOM ON NEW MESSAGE
  =========================== */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || isInitialLoadRef.current || loading) return;

    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    
    if (isNearBottom) {
      setTimeout(() => {
        el.scrollTop = el.scrollHeight;
      }, 50);
    }
  }, [messages.length, loading]);

  /* ===========================
     GROUPING
  =========================== */
  const enriched = useMemo(() => {
    return messages.map((msg, i) => {
      const prev = messages[i - 1];
      let isGrouped = false;

      if (prev) {
        const sameSender =
          (prev.sender?._id || prev.sender) ===
          (msg.sender?._id || msg.sender);

        const timeDiff =
          new Date(msg.createdAt) - new Date(prev.createdAt);

        if (sameSender && timeDiff < GROUP_TIME_MS) {
          isGrouped = true;
        }
      }

      return { ...msg, isGrouped };
    });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 
        bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        {/* Animated Loading Spinner */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 dark:border-indigo-500 
            rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 animate-pulse">
          Loading messages...
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto px-4 py-6 
        bg-gradient-to-br from-slate-50 via-white to-slate-50 
        dark:from-slate-900 dark:via-slate-900 dark:to-slate-800
        scroll-smooth"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e1 transparent'
      }}
    >
      {/* Load More Indicator */}
      {isLoadingOlder && (
        <div className="flex items-center justify-center py-4 mb-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full 
            bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="w-4 h-4 border-2 border-indigo-600 dark:border-indigo-500 
              rounded-full border-t-transparent animate-spin"></div>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Loading older messages...
            </span>
          </div>
        </div>
      )}

      {/* Load More Button */}
      {!isLoadingOlder && hasMore && messages.length > 0 && (
        <div className="flex items-center justify-center py-4 mb-4">
          <button
            onClick={loadOlderMessages}
            className="group flex items-center gap-2 px-4 py-2 rounded-full 
              bg-white dark:bg-slate-800 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-600
              shadow-lg border border-slate-200 dark:border-slate-700
              hover:border-transparent hover:shadow-indigo-500/25
              transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            <svg className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-white transition-colors" 
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-white transition-colors">
              Load previous messages
            </span>
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="space-y-1">
        {enriched.map((msg) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            grouped={msg.isGrouped}
          />
        ))}
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 mt-4 px-2">
          <div className="flex items-center gap-1 px-3 py-2 rounded-2xl 
            bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700">
            {/* Animated Dots */}
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 ml-2">
              {typingUsers[0].name} is typing
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {enriched.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-3xl opacity-20"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 
              rounded-3xl flex items-center justify-center shadow-2xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
              No messages yet
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Start the conversation by sending a message
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;