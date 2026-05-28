import { useStudySession } from "../../context/StudySessionContext";
import { useUI } from "../../context/UIContext";

const GlobalFocusTimer = () => {
  const { activeSession, formattedElapsed } = useStudySession();
  const { openFocusSession } = useUI();

  if (!activeSession) return null;

  const taskTitle = activeSession.task?.title || "Focus session";
  const taskId = activeSession.task?._id || activeSession.task;
  const isPaused = activeSession.status === "paused";

  return (
    <button
      type="button"
      onClick={() => openFocusSession(taskId)}
      className="topbar-control topbar-focus-timer min-w-0 max-w-[44vw] sm:max-w-[360px]"
      title={`Open focus session for ${taskTitle}`}
    >
      <span className={`h-2 w-2 rounded-full ${isPaused ? "bg-amber-400" : "bg-emerald-400"}`} />
      <span className="font-mono text-slate-950 dark:text-slate-50">{formattedElapsed}</span>
      <span className="truncate text-slate-500 dark:text-slate-400">{taskTitle}</span>
      {isPaused && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
          Paused
        </span>
      )}
    </button>
  );
};

export default GlobalFocusTimer;
