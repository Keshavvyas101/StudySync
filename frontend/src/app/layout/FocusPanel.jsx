import { useEffect, useRef } from "react";
import { ChatProvider } from "../../context/ChatContext";
import ChatPanel from "../chat/ChatPanel";
import TaskDetailsPanel from "../../components/taskDetails/TaskDetailPanel";
import { useUI } from "../../context/UIContext";
import { useTasks } from "../../context/TaskContext";
import { useStudySession } from "../../context/StudySessionContext";

const MIN_WIDTH = 260;
const MAX_WIDTH = 900;

const FocusSessionPanel = () => {
  const {
    activeSession,
    actionLoading,
    completeSession,
    error,
    formattedElapsed,
    pauseSession,
    resumeSession,
  } = useStudySession();

  if (!activeSession) {
    return (
      <div className="flex h-full flex-col justify-center p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Focus Session
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Start focus from a task card to attach the timer to real work.
          </p>
        </div>
      </div>
    );
  }

  const taskTitle = activeSession.task?.title || "Selected task";
  const isPaused = activeSession.status === "paused";

  return (
    <div className="flex h-full flex-col justify-center p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Focusing on
        </div>
        <div className="mx-auto mt-2 max-w-[16rem] truncate text-base font-semibold text-slate-700 dark:text-slate-200">
          {taskTitle}
        </div>
        <div className="mt-4 font-mono text-5xl font-semibold text-slate-950 dark:text-slate-50">
          {formattedElapsed}
        </div>
        <div className="mt-3 flex justify-center">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            isPaused
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          }`}>
            {isPaused ? "Paused" : "Active"}
          </span>
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={isPaused ? resumeSession : pauseSession}
            disabled={actionLoading}
            className="flex-1 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-indigo-600 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-indigo-200"
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            onClick={completeSession}
            disabled={actionLoading}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Complete
          </button>
        </div>
      </div>
    </div>
  );
};

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
    if (focusedTask && isFocusOpen && !focusMode) {
      setFocusMode("task");
    }
  }, [focusedTask, focusMode, isFocusOpen, setFocusMode]);

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

          <button
            onClick={() => setFocusMode("focus")}
            className={`focus-tab ${focusMode === "focus" ? "active" : ""}`}
          >
            Focus
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

        {focusMode === "focus" && <FocusSessionPanel />}

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
