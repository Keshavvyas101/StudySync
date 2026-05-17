import { useMemo, useState } from "react";
import api from "../../services/api";

const EXAMPLES = [
  "Revise graphs tomorrow",
  "Show my tasks",
  "What is due today",
  "Create subtasks for revise trees",
];

const QUERY_INTENTS = new Set([
  "MY_TASKS",
  "DUE_TODAY",
  "DUE_TOMORROW",
  "DUE_THIS_WEEK",
  "OVERDUE",
  "HIGH_PRIORITY",
]);

const startOfDay = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const isIncomplete = (task) => task.status !== "completed";

const formatDate = (value) => {
  if (!value) return "No deadline";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getTaskMatches = (intent, tasks, currentUser) => {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);
  const userId = currentUser?._id;

  switch (intent) {
    case "MY_TASKS":
      return tasks.filter((task) => {
        const assignedToMe = task.assignedTo?._id === userId;
        const createdByMe = task.createdBy?._id === userId;
        return isIncomplete(task) && (assignedToMe || createdByMe);
      });

    case "DUE_TODAY":
      return tasks.filter((task) => {
        if (!task.deadline || !isIncomplete(task)) return false;
        const due = startOfDay(new Date(task.deadline));
        return due.getTime() === today.getTime();
      });

    case "DUE_TOMORROW":
      return tasks.filter((task) => {
        if (!task.deadline || !isIncomplete(task)) return false;
        const due = startOfDay(new Date(task.deadline));
        return due.getTime() === tomorrow.getTime();
      });

    case "DUE_THIS_WEEK":
      return tasks.filter((task) => {
        if (!task.deadline || !isIncomplete(task)) return false;
        const due = new Date(task.deadline);
        return due >= today && due < nextWeek;
      });

    case "OVERDUE":
      return tasks.filter((task) => {
        if (!task.deadline || !isIncomplete(task)) return false;
        return new Date(task.deadline) < today;
      });

    case "HIGH_PRIORITY":
      return tasks.filter(
        (task) => isIncomplete(task) && task.priority === "high"
      );

    default:
      return [];
  }
};

const getQueryTitle = (intent) => {
  const labels = {
    MY_TASKS: "Your tasks",
    DUE_TODAY: "Due today",
    DUE_TOMORROW: "Due tomorrow",
    DUE_THIS_WEEK: "Due this week",
    OVERDUE: "Overdue",
    HIGH_PRIORITY: "High priority",
  };

  return labels[intent] || "Results";
};

const flattenMetricCards = (payload) => {
  if (!payload || typeof payload !== "object") return [];

  return Object.entries(payload)
    .filter(([, value]) =>
      ["number", "string", "boolean"].includes(typeof value)
    )
    .slice(0, 4)
    .map(([key, value]) => ({
      label: key.replace(/([A-Z])/g, " $1").replace(/_/g, " "),
      value: String(value),
    }));
};

const TaskResultCard = ({ task, onFocusTask }) => (
  <button
    type="button"
    onClick={() => onFocusTask?.(task._id)}
    className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-3 hover:border-indigo-300 dark:hover:border-indigo-500 transition"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
          {task.title}
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {formatDate(task.deadline)}
        </div>
      </div>
      <span className="shrink-0 rounded-full border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-300">
        {task.priority || "medium"}
      </span>
    </div>
  </button>
);

const LoadingDots = () => (
  <div className="flex items-center gap-1.5">
    {[0, 1, 2].map((dot) => (
      <span
        key={dot}
        className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"
        style={{ animationDelay: `${dot * 120}ms` }}
      />
    ))}
  </div>
);

const CopilotHero = ({
  activeRoom,
  tasks,
  currentUser,
  createTask,
  replaceTask,
  onFocusTask,
}) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const taskCount = useMemo(
    () => tasks.filter((task) => task.status !== "completed").length,
    [tasks]
  );

  const runCopilot = async (value) => {
    const text = value.trim();
    if (!text || !activeRoom?._id || loading) return;

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const res = await api.post("/ai/parse-task", {
        prompt: text,
        roomId: activeRoom._id,
        currentDate: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      const { intent } = res.data;

      if (intent === "UNKNOWN") {
        setError("Copilot handles StudySync tasks, planning, habits, and insights.");
        return;
      }

      if (intent === "CREATE_TASK" || intent === "CREATE_RECURRING_TASK") {
        const created = await createTask(activeRoom._id, res.data.task);
        setResult({
          type: "tasks",
          title:
            intent === "CREATE_RECURRING_TASK"
              ? "Recurring task created"
              : "Task created",
          tasks: [created],
        });
        onFocusTask?.(created._id);
        setPrompt("");
        return;
      }

      if (intent === "CREATE_SUBTASKS" || intent === "ASSIGN_TASK") {
        replaceTask(res.data.task);
        setResult({
          type: "tasks",
          title:
            intent === "CREATE_SUBTASKS"
              ? "Subtasks created"
              : "Task assigned",
          tasks: [res.data.task],
        });
        onFocusTask?.(res.data.task._id);
        setPrompt("");
        return;
      }

      if (QUERY_INTENTS.has(intent)) {
        const matches = Array.isArray(res.data.tasks)
          ? res.data.tasks
          : getTaskMatches(intent, tasks, currentUser);
        setResult({
          type: "tasks",
          title: getQueryTitle(intent),
          tasks: matches,
        });
        return;
      }

      if (intent === "PRODUCTIVITY_SUMMARY") {
        const [summary, productivity, streak] = await Promise.allSettled([
          api.get(`/analytics/room/${activeRoom._id}/summary`),
          api.get(`/analytics/room/${activeRoom._id}/productivity`),
          api.get(`/analytics/room/${activeRoom._id}/streak`),
        ]);

        setResult({
          type: "summary",
          title: "Productivity summary",
          cards: [
            ...flattenMetricCards(summary.value?.data),
            ...flattenMetricCards(productivity.value?.data),
            ...flattenMetricCards(streak.value?.data),
          ].slice(0, 6),
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Copilot unavailable1");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    runCopilot(prompt);
  };

  return (
    <section className="mx-auto mb-6 w-full max-w-5xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
              StudySync Copilot
            </div>
            <h3 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">
              What should we move forward?
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {taskCount} active {taskCount === 1 ? "task" : "tasks"} in{" "}
              {activeRoom?.name}
            </p>
          </div>

          {loading && (
            <div className="flex items-center gap-3 rounded-lg border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-200">
              <LoadingDots />
              Working
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask Copilot to create, find, plan, or assign tasks"
            className="min-h-11 flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="min-h-11 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Run Copilot
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setPrompt(example);
                runCopilot(example);
              }}
              disabled={loading}
              className="rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-300 disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {(error || result) && (
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 sm:p-5">
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {result?.type === "tasks" && (
            <div>
              <div className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {result.title}
              </div>
              {result.tasks.length === 0 ? (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  No matching tasks.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {result.tasks.slice(0, 6).map((task) => (
                    <TaskResultCard
                      key={task._id}
                      task={task}
                      onFocusTask={onFocusTask}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {result?.type === "summary" && (
            <div>
              <div className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {result.title}
              </div>
              {result.cards.length === 0 ? (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  No analytics available yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {result.cards.map((card) => (
                    <div
                      key={`${card.label}-${card.value}`}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3"
                    >
                      <div className="text-xs capitalize text-slate-500 dark:text-slate-400">
                        {card.label}
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {card.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default CopilotHero;
