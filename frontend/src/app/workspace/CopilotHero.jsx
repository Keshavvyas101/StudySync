import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { useStudySession } from "../../context/StudySessionContext";

const QUICK_ACTIONS = [
  {
    label: "What should I study next?",
    mode: "next_task",
  },
  {
    label: "Am I behind schedule?",
    mode: "behind_schedule",
  },
  {
    label: "What needs attention?",
    mode: "room_attention",
  },
  {
    label: "How is our team doing?",
    mode: "team_summary",
  },
  {
    label: "What should I finish today?",
    mode: "daily_plan",
  },
];

const LOW_QUALITY_TASK_TITLES = new Set([
  "task",
  "task 1",
  "task 2",
  "test",
  "demo",
  "shopping",
  "temporary",
]);

const normalizeTaskTitle = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");

const isMeaningfulTask = (task) => {
  const title = normalizeTaskTitle(task?.title);
  return title.length > 0 && !LOW_QUALITY_TASK_TITLES.has(title);
};

const MODE_LABELS = {
  due_tomorrow: "Due tomorrow",
  productivity_advice: "Productivity advice",
};

const getModeLabel = (mode) =>
  QUICK_ACTIONS.find((action) => action.mode === mode)?.label ||
  MODE_LABELS[mode] ||
  "Study Copilot";

const getRouteLabel = (result, insight) => {
  if (result?.route === "GENERAL_REASONING") return "General reasoning";
  if (result?.route === "ACTION_REQUEST") return "Approval boundary";
  if (result?.route === "STUDYSYNC_INTENT") return getModeLabel(insight?.type);
  return "Study Copilot";
};

const LoadingDots = () => (
  <div className="flex items-center gap-1.5" aria-hidden="true">
    {[0, 1, 2].map((dot) => (
      <span
        key={dot}
        className="h-2 w-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/30 animate-pulse"
        style={{ animationDelay: `${dot * 120}ms` }}
      />
    ))}
  </div>
);

const TaskPill = ({ task, onFocusTask }) => {
  if (!task || !isMeaningfulTask(task)) return null;

  return (
    <button
      type="button"
      onClick={() => onFocusTask?.(task.id)}
      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:text-indigo-300"
    >
      {task.title}
    </button>
  );
};

const formatDraftDate = (value) => {
  if (!value) return "No deadline";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No deadline";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getDraftTitle = (draft) => {
  if (!draft) return "Action draft";
  if (draft.actionType === "CREATE_TASK") return "Create Task";
  if (draft.actionType === "COMPLETE_OWN_TASK") return "Complete Task";
  if (draft.actionType === "START_FOCUS_SESSION") return "Start Focus Session";
  if (draft.actionType === "ASSIGN_TASK") return "Assign Task";
  if (draft.actionType === "RESCHEDULE_TASK") return "Reschedule Task";
  if (draft.actionType === "CREATE_SUBTASKS") return "Create Subtasks";
  if (draft.actionType === "ARCHIVE_TASK") return "Archive Task";
  return "Action draft";
};

const SAFE_TRUST_ACTIONS = new Set([
  "CREATE_TASK",
  "COMPLETE_OWN_TASK",
  "START_FOCUS_SESSION",
]);

const getDraftRows = (draft) => {
  if (!draft) return [];
  const payload = draft.payload || {};

  if (draft.actionType === "CREATE_TASK") {
    return [
      ["Title", payload.title],
      ["Deadline", formatDraftDate(payload.deadline)],
      ["Priority", payload.priority || "medium"],
    ];
  }

  if (draft.actionType === "ASSIGN_TASK") {
    return [
      ["Task", payload.matchedTask?.title || payload.taskId],
      ["Assign to", payload.targetUser?.name || payload.targetUserId],
    ];
  }

  if (draft.actionType === "RESCHEDULE_TASK") {
    return [
      ["Task", payload.matchedTask?.title || payload.taskId],
      ["New deadline", formatDraftDate(payload.newDeadline)],
    ];
  }

  if (draft.actionType === "CREATE_SUBTASKS") {
    return [
      ["Task", payload.matchedTask?.title || payload.taskId],
      ["Subtasks", Array.isArray(payload.subtasks) ? payload.subtasks.join(", ") : ""],
    ];
  }

  if (draft.actionType === "ARCHIVE_TASK") {
    return [["Task", payload.matchedTask?.title || payload.taskId]];
  }

  return [
    ["Task", payload.matchedTask?.title || payload.taskId || "No matching task"],
  ];
};

const ApprovalCard = ({
  draft,
  busy,
  feedback,
  onApprove,
  onAlwaysAllow,
  onDeny,
}) => {
  if (!draft) return null;

  const isFinal = ["executed", "denied", "invalid", "failed"].includes(draft.status);
  const canAlwaysAllow = SAFE_TRUST_ACTIONS.has(draft.actionType);

  return (
    <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 shadow-sm dark:border-indigo-900/70 dark:bg-indigo-950/25">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
            Approval required
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">
            {getDraftTitle(draft)}
          </div>
        </div>
        <span className="rounded-full border border-indigo-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase text-indigo-600 dark:border-indigo-800 dark:bg-slate-950 dark:text-indigo-300">
          {draft.status}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {getDraftRows(draft).map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="text-slate-500 dark:text-slate-400">{label}</span>
            <span className="text-right font-medium text-slate-800 dark:text-slate-100">
              {value || "Not set"}
            </span>
          </div>
        ))}
      </div>

      {feedback && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          {feedback}
        </div>
      )}

      {!isFinal && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            className="flex-1 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-indigo-200"
          >
            {busy ? "Working..." : "Allow once"}
          </button>
          {canAlwaysAllow && (
            <button
              type="button"
              onClick={onAlwaysAllow}
              disabled={busy}
              className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              Always allow
            </button>
          )}
          <button
            type="button"
            onClick={onDeny}
            disabled={busy}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Deny
          </button>
        </div>
      )}
    </div>
  );
};

const InsightCard = ({ result, onFocusTask }) => {
  if (!result) return null;

  const { insight } = result;
  const why = Array.isArray(insight?.why) ? insight.why : [];
  const tasks = [
    ...(Array.isArray(insight?.tasks) ? insight.tasks : []),
    ...(Array.isArray(insight?.suggestedTasks) ? insight.suggestedTasks : []),
  ].filter(isMeaningfulTask);

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
        {getRouteLabel(result, insight)}
      </div>
      <h4 className="mt-2 text-base font-semibold text-slate-950 dark:text-slate-50">
        {insight.title}
      </h4>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {insight.recommendation}
      </p>

      {why.length > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Why
          </div>
          <ul className="mt-2 space-y-2">
            {why.map((reason) => (
              <li
                key={reason}
                className="flex gap-2 text-sm leading-5 text-slate-600 dark:text-slate-300"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {insight?.caveat && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          {insight.caveat}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tasks.slice(0, 5).map((task) => (
            <TaskPill key={task.id} task={task} onFocusTask={onFocusTask} />
          ))}
        </div>
      )}
    </div>
  );
};

const ProactiveInsights = ({ insights }) => {
  const items = Array.isArray(insights) ? insights : [];

  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Today's Insights
      </div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
            Everything looks on track.
          </div>
        ) : (
          items.map((insight) => (
            <div
              key={`${insight.type}-${insight.cooldownKey}`}
              className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {insight.title}
                </div>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {insight.severity}
                </span>
              </div>
              <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                {insight.message}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const CopilotHero = ({
  activeRoom,
  tasks,
  currentUser,
  createTask,
  replaceTask,
  onFocusTask,
  onClose,
}) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [headerInsight, setHeaderInsight] = useState("");
  const [proactiveInsights, setProactiveInsights] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionFeedback, setActionFeedback] = useState("");
  const { refreshActiveSession } = useStudySession();

  void currentUser;
  void createTask;
  void replaceTask;

  const taskCount = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.status !== "completed" && !task.archived && isMeaningfulTask(task)
      )
        .length,
    [tasks]
  );

  useEffect(() => {
    let active = true;

    const loadHeaderInsight = async () => {
      if (!activeRoom?._id) {
        setHeaderInsight("");
        return;
      }

      try {
        const res = await api.post("/ai/copilot", {
          roomId: activeRoom._id,
          mode: "daily_plan",
        });

        if (active) {
          setHeaderInsight(res.data?.insight?.headerContext?.label || "");
          setProactiveInsights(res.data?.context?.proactiveInsights || []);
        }
      } catch {
        if (active) setHeaderInsight("");
      }
    };

    loadHeaderInsight();

    return () => {
      active = false;
    };
  }, [activeRoom?._id]);

  const runQuery = async (query) => {
    const text = query.trim();
    if (!text || !activeRoom?._id || loading) return;

    try {
      setLoading(true);
      setError("");
      setActionFeedback("");

      const res = await api.post("/ai/copilot", {
        roomId: activeRoom._id,
        query: text,
        currentDate: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (!res.data?.success) {
        setResult(null);
        setError(res.data?.message || "I'm still learning. Ask me about tasks, deadlines, focus, or team progress.");
        setPrompt(text);
        return;
      }

      const executedTask = res.data?.result?.task;
      const executedSession = res.data?.result?.session;
      if (executedTask?._id) {
        replaceTask(executedTask);
        onFocusTask?.(executedTask._id);
      }
      if (executedSession?._id) {
        await refreshActiveSession();
      }

      setResult(res.data);
      setProactiveInsights(res.data?.context?.proactiveInsights || []);
      setHeaderInsight(res.data?.insight?.headerContext?.label || headerInsight);
      setPrompt(text);
    } catch (err) {
      setError(err.response?.data?.message || "Copilot unavailable");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDraft = async () => {
    return handleApproveDraftWithTrust(false);
  };

  const handleAlwaysAllowDraft = async () => {
    return handleApproveDraftWithTrust(true);
  };

  const handleApproveDraftWithTrust = async (alwaysAllow) => {
    const draft = result?.draftAction || result?.insight?.draftAction;
    if (!draft?.id || actionBusy) return;

    try {
      setActionBusy(true);
      setActionFeedback("");
      const res = await api.post(`/ai/actions/${draft.id}/approve`, {
        alwaysAllow,
      });
      const updatedDraft = res.data?.draftAction;
      const task = res.data?.result?.task;
      const session = res.data?.result?.session;

      if (task?._id) {
        replaceTask(task);
        onFocusTask?.(task._id);
      }

      if (session?._id) {
        await refreshActiveSession();
      }

      setResult((current) => ({
        ...current,
        draftAction: updatedDraft || current?.draftAction,
        insight: {
          ...current?.insight,
          draftAction: updatedDraft || current?.insight?.draftAction,
        },
      }));
      setActionFeedback(res.data?.trustSaved ? "Approved, executed, and saved." : "Approved and executed.");
    } catch (err) {
      const message = err.response?.data?.message || "Action could not be executed";
      setActionFeedback(message);
      const updatedDraft = err.response?.data?.draftAction;
      if (updatedDraft) {
        setResult((current) => ({
          ...current,
          draftAction: updatedDraft,
          insight: {
            ...current?.insight,
            draftAction: updatedDraft,
          },
        }));
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleDenyDraft = async () => {
    const draft = result?.draftAction || result?.insight?.draftAction;
    if (!draft?.id || actionBusy) return;

    try {
      setActionBusy(true);
      setActionFeedback("");
      const res = await api.post(`/ai/actions/${draft.id}/deny`);
      const updatedDraft = res.data?.draftAction;
      setResult((current) => ({
        ...current,
        draftAction: updatedDraft || current?.draftAction,
        insight: {
          ...current?.insight,
          draftAction: updatedDraft || current?.insight?.draftAction,
        },
      }));
      setActionFeedback("Denied. No StudySync data was changed.");
    } catch (err) {
      setActionFeedback(err.response?.data?.message || "Action could not be denied");
    } finally {
      setActionBusy(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    runQuery(prompt);
  };

  return (
    <aside className="flex h-full flex-col bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="border-b border-slate-200/80 bg-white/90 px-5 py-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
              Study Copilot
            </h3>
            <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
              Ask what to focus on.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="Close Study Copilot"
          >
            X
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>
            {taskCount} active {taskCount === 1 ? "task" : "tasks"} in {activeRoom?.name}
          </span>
          {headerInsight && (
            <>
              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="truncate">{headerInsight}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <ProactiveInsights insights={proactiveInsights} />

        <div>
          <div className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Quick Questions
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.mode}
                type="button"
                onClick={() => runQuery(action.label)}
                disabled={loading}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md disabled:translate-y-0 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:text-indigo-300"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Answer
            </div>
            {loading && (
              <div className="flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200">
                <LoadingDots />
                Thinking
              </div>
            )}
          </div>

          {!error && !result && !loading && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-center text-sm leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
              Copilot reads your tasks, deadlines, focus history, and AI memory to give deterministic study guidance.
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm font-medium text-amber-800 shadow-sm dark:border-amber-800/80 dark:bg-amber-900/20 dark:text-amber-300">
              {error}
            </div>
          )}

          {result && <InsightCard result={result} onFocusTask={onFocusTask} />}
          <ApprovalCard
            draft={result?.draftAction || result?.insight?.draftAction}
            busy={actionBusy}
            feedback={actionFeedback}
            onApprove={handleApproveDraft}
            onAlwaysAllow={handleAlwaysAllowDraft}
            onDeny={handleDenyDraft}
          />
        </div>
      </div>

      <div className="border-t border-slate-200/80 bg-white/95 px-5 py-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
        <form
          onSubmit={handleSubmit}
          className="flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-2 shadow-inner shadow-slate-200/60 transition-all duration-200 focus-within:border-indigo-300 focus-within:shadow-[0_0_0_4px_rgba(99,102,241,0.12)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 dark:focus-within:border-indigo-500/70"
        >
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask a study question..."
            className="min-h-9 flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-slate-950 px-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-indigo-200"
            aria-label="Ask Study Copilot"
          >
            {loading ? (
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin dark:border-slate-950/30 dark:border-t-slate-950" />
            ) : (
              "Ask"
            )}
          </button>
        </form>
      </div>
    </aside>
  );
};

export default CopilotHero;
