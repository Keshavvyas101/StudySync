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
      className="flex min-w-0 max-w-[44vw] items-center gap-2 rounded-full border border-indigo-200/80 bg-white/90 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm shadow-indigo-500/10 backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:text-indigo-600 dark:border-indigo-900/70 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:text-indigo-300 sm:max-w-[360px]"
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
