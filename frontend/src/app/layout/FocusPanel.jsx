import { useEffect, useRef } from "react";
import { ChatProvider } from "../../context/ChatContext";
import ChatPanel from "../chat/ChatPanel";
import TaskDetailsPanel from "../../components/taskDetails/TaskDetailPanel";
import { useUI } from "../../context/UIContext";
import { useTasks } from "../../context/TaskContext";

const MIN_WIDTH = 260;
const MAX_WIDTH = 900;

const FocusPanel = ({ setWidth }) => {
  const isResizing = useRef(false);

  const {
    focusMode,
    setFocusMode,
    focusedTaskId,
    isFocusOpen,
    toggleFocus,
  } = useUI();

  const { tasks } = useTasks();
  const focusedTask = tasks.find((t) => t._id === focusedTaskId);

  /* ============================= Auto-switch to task view ============================== */
  useEffect(() => {
    if (focusedTask && isFocusOpen) {
      setFocusMode("task");
    }
  }, [focusedTask, isFocusOpen, setFocusMode]);

  /* ============================= Resize handling ============================== */
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing.current) return;

      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "default";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setWidth]);

  const handleMouseDown = () => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
  };

  /* ============================= Closed state ============================== */
  if (!isFocusOpen) {
    return (
      <div className="focus-panel flex items-center justify-center">
        <button
          onClick={toggleFocus}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
        >
          ▶
        </button>
      </div>
    );
  }

  return (
    <div className="focus-panel">
      {/* Resize Handle */}
      <div className="resize-handle" onMouseDown={handleMouseDown} />

      {/* Header */}
      <div className="focus-header">
        <div className="focus-tabs">
          <button
            onClick={() => setFocusMode("chat")}
            className={`focus-tab ${focusMode === "chat" ? "active" : ""}`}
          >
            Chat
          </button>

          <button
            onClick={() => setFocusMode("task")}
            disabled={!focusedTask}
            className={`focus-tab ${focusMode === "task" ? "active" : ""}`}
            style={{ opacity: focusedTask ? 1 : 0.5 }}
          >
            Task
          </button>
        </div>

        <button onClick={toggleFocus} className="focus-close">
          ✕
        </button>
      </div>

      {/* ============================= BODY - NO WRAPPER ============================== */}
      <div className="focus-body flex flex-col min-h-0">
        {focusMode === "chat" && (
          <ChatProvider>
            <ChatPanel />
          </ChatProvider>
        )}

        {focusMode === "task" && focusedTask && (
          <TaskDetailsPanel task={focusedTask} />
        )}

        {!focusedTask && focusMode === "task" && (
          <div className="p-6 text-slate-400 text-sm">
            No task selected.
            <br />
            Open a task from the list to see details here.
          </div>
        )}

        {!focusMode && (
          <div className="p-6 text-slate-400 text-sm">
            Open chat or select a task.
          </div>
        )}
      </div>
    </div>
  );
};

export default FocusPanel;