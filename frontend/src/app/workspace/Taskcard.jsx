import { useState, useEffect, useRef } from "react";
import { useTasks } from "../../context/TaskContext";
import Avatar from "../../components/common/Avatar";
import { useUI } from "../../context/UIContext";
import { useStudySession } from "../../context/StudySessionContext";

/* ===================== ICONS ===================== */
const Icons = {
  Calendar: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Edit: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  ExternalLink: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  Check: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  AlertCircle: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

/* ===================== HELPERS ===================== */
const getDeadlineStatus = (deadline) => {
  if (!deadline) return null;

  const today = new Date();
  const due = new Date(deadline);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const days = (due - today) / 86400000;

  if (days < 0) return { label: "Overdue", type: "overdue" };
  if (days <= 2) return { label: "Due Soon", type: "soon" };
  return { label: "On Track", type: "ok" };
};

const priorityStyles = {
  high: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-300",
  medium: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-300",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-300",
};

const deadlineStyles = {
  overdue: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-300",
  soon: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/25 dark:text-orange-300",
  ok: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
};

/* ===================== COMPONENT ===================== */

const TaskCard = ({
  task,
  members = [],
  expanded = false,
  onToggle,
  onExpand,
}) => {
  const {
    updateTask,
    deleteTask,
    toggleTaskStatus,
    getTaskProgress,
  } = useTasks();

  const { openTask, openFocusSession, focusedTaskId } = useUI();
  const {
    activeSession,
    actionLoading,
    formattedElapsed,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
  } = useStudySession();

  const cardRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [form, setForm] = useState({
    title: task.title,
    description: task.description || "",
    deadline: task.deadline ? task.deadline.slice(0, 10) : "",
    priority: task.priority || "medium",
    assignedTo: task.assignedTo?._id || "",
  });

  const deadlineStatus = getDeadlineStatus(task.deadline);
  const isFocused = focusedTaskId === task._id;
  const progress = getTaskProgress(task);
  const isCompleted = task.status === 'completed';
  const activeTaskId = activeSession?.task?._id || activeSession?.task;
  const isActiveFocusTask = activeTaskId === task._id;
  const isFocusPaused = isActiveFocusTask && activeSession?.status === "paused";

  const handleStartFocus = async (event) => {
    event.stopPropagation();
    if (isCompleted) return;
    await startSession(task._id);
    openFocusSession(task._id);
  };

  const handlePauseFocus = async (event) => {
    event.stopPropagation();
    await pauseSession();
  };

  const handleResumeFocus = async (event) => {
    event.stopPropagation();
    await resumeSession();
  };

  const handleCompleteFocus = async (event) => {
    event.stopPropagation();
    await completeSession();
  };

  useEffect(() => {
    if (isFocused && cardRef.current) {
      onExpand?.(task._id);
      requestAnimationFrame(() => {
        cardRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    }
  }, [isFocused, onExpand, task._id]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = () => setMenuOpen(false);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [menuOpen]);

  const handleSave = () => {
    if (form.title.trim().length < 3) return;

    updateTask(task._id, {
      title: form.title,
      description: form.description,
      deadline: form.deadline || null,
      priority: form.priority,
      assignedTo: form.assignedTo || null,
    });

    setIsEditing(false);
  };

  return (
    <div
      ref={cardRef}
      onClick={() => onToggle?.(task._id)}
      className={`
        group relative cursor-pointer
        bg-white/90 dark:bg-slate-900/70
        backdrop-blur-sm
        border rounded-2xl
        shadow-sm
        transition-all duration-300 ease-out
        ${isFocused || isActiveFocusTask
          ? 'border-indigo-300 dark:border-indigo-500/70 shadow-xl shadow-indigo-500/10 -translate-y-0.5'
          : 'border-slate-200/80 dark:border-slate-800 hover:-translate-y-1 hover:border-slate-300/90 dark:hover:border-slate-700 hover:shadow-xl hover:shadow-slate-200/80 dark:hover:shadow-black/20'
        }
        ${isActiveFocusTask ? 'ring-2 ring-indigo-500/20 dark:ring-indigo-400/20' : ''}
        ${isCompleted ? 'opacity-60' : ''}
      `}
    >
      {/* HEADER */}
      <div
        className="flex items-start gap-4 p-5 sm:p-6"
      >
        {/* Status Checkbox */}
        <div
          className="mt-1 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => toggleTaskStatus(task._id)}
            className={`
              w-6 h-6 rounded-lg border flex items-center justify-center
              transition-all duration-300
              ${isCompleted
                ? 'bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100'
                : 'border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-400 hover:scale-110'
              }
            `}
          >
            {isCompleted && (
              <Icons.Check />
            )}
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`
            text-base font-semibold mb-3 leading-snug sm:text-lg
            ${isCompleted 
              ? 'line-through text-slate-400 dark:text-slate-600' 
              : 'text-slate-900 dark:text-slate-50'
            }
          `}>
            {task.title}
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            {/* Assignee */}
            {task.assignedTo && (
              <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/90 px-2.5 py-1.5 dark:border-slate-700/80 dark:bg-slate-800/60">
                <Avatar
                  name={task.assignedTo.name}
                  src={task.assignedTo.avatar?.url}
                  size={18}
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {task.assignedTo.name}
                </span>
              </div>
            )}

            {/* Priority */}
            <span className={`rounded-full border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${priorityStyles[task.priority] || priorityStyles.medium}`}>
              {task.priority}
            </span>

            {/* Deadline */}
            {deadlineStatus && (
              <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 ${deadlineStyles[deadlineStatus.type]}`}>
                {deadlineStatus.type === 'overdue' && <Icons.AlertCircle />}
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  {deadlineStatus.label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Open Button */}
          <button
            onClick={() => openTask(task._id)}
            className="
              p-2 rounded-lg
              text-slate-500 dark:text-slate-400
              hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100
              transition-all duration-200
              hover:scale-110
            "
            title="Open in focus panel"
          >
            <Icons.ExternalLink />
          </button>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="
                w-8 h-8 rounded-lg flex items-center justify-center
                text-slate-500 dark:text-slate-400
                hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100
                transition-all duration-200
              "
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <circle cx="8" cy="3" r="1.5"/>
                <circle cx="8" cy="8" r="1.5"/>
                <circle cx="8" cy="13" r="1.5"/>
              </svg>
            </button>

            {menuOpen && (
              <div className="
                absolute right-0 top-10 w-44 z-50
                bg-white dark:bg-slate-800
                border-2 border-slate-200 dark:border-slate-700
                rounded-xl shadow-2xl overflow-hidden
              ">
                <button
                  onClick={() => {
                    onExpand?.(task._id);
                    setIsEditing(true);
                    setMenuOpen(false);
                  }}
                  className="
                    w-full px-4 py-3 text-left text-sm font-medium
                    text-slate-700 dark:text-slate-300
                    hover:bg-slate-50 dark:hover:bg-slate-700/50
                    flex items-center gap-3
                    transition-colors
                  "
                >
                  <Icons.Edit />
                  Edit Task
                </button>
                <div className="border-t border-slate-200 dark:border-slate-700"></div>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this task permanently?')) {
                      deleteTask(task._id);
                    }
                  }}
                  className="
                    w-full px-4 py-3 text-left text-sm font-medium
                    text-slate-700 dark:text-slate-300
                    hover:bg-slate-50 dark:hover:bg-slate-700/50
                    flex items-center gap-3
                    transition-colors
                  "
                >
                  <Icons.Trash />
                  Delete Task
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="h-1 bg-slate-100/90 dark:bg-slate-800/70 relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-slate-800 to-indigo-500 dark:from-slate-100 dark:to-indigo-300 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* FOCUS SESSION CONTROLS */}
      <div className="px-5 py-4 sm:px-6" onClick={(e) => e.stopPropagation()}>
        {!isActiveFocusTask ? (
          <button
            type="button"
            onClick={handleStartFocus}
            disabled={isCompleted || actionLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-indigo-200"
          >
            <Icons.Clock />
            Start Focus
          </button>
        ) : (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/25">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-mono text-lg font-semibold text-slate-950 dark:text-slate-50">
                <Icons.Clock />
                {formattedElapsed}
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                isFocusPaused
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              }`}>
                {isFocusPaused ? "Paused" : "Focusing"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handlePauseFocus}
                disabled={isFocusPaused || actionLoading}
                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Pause
              </button>
              <button
                type="button"
                onClick={handleResumeFocus}
                disabled={!isFocusPaused || actionLoading}
                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={handleCompleteFocus}
                disabled={actionLoading}
                className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-600 disabled:opacity-40 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-indigo-200"
              >
                Complete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* EXPANDED CONTENT */}
      {expanded && (
        <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-slate-800">
          {!isEditing ? (
            <div className="space-y-4">
              {/* Description */}
              {task.description && (
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              )}

              {/* Deadline */}
              {task.deadline && (
                <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/70 w-fit">
                  <Icons.Calendar />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {new Date(task.deadline).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              )}

              {/* Progress Info */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700/50">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-500">
                  {progress}% Complete
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 px-3 py-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600/30">
                  {isCompleted ? 'Completed' : 'In Progress'}
                </span>
              </div>
            </div>
          ) : (
            /* EDIT FORM */
            <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Task Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="
                    w-full px-4 py-2.5 rounded-xl text-sm
                    bg-slate-50 dark:bg-slate-900/50
                    border-2 border-slate-200 dark:border-slate-700
                    text-slate-900 dark:text-slate-100
                    focus:outline-none focus:border-slate-900 dark:focus:border-slate-100
                    transition-colors
                  "
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="
                    w-full px-4 py-2.5 rounded-xl text-sm
                    bg-slate-50 dark:bg-slate-900/50
                    border-2 border-slate-200 dark:border-slate-700
                    text-slate-900 dark:text-slate-100
                    focus:outline-none focus:border-slate-900 dark:focus:border-slate-100
                    transition-colors resize-none
                  "
                  placeholder="Add task details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="
                      w-full px-4 py-2.5 rounded-xl text-sm
                      bg-slate-50 dark:bg-slate-900/50
                      border-2 border-slate-200 dark:border-slate-700
                      text-slate-900 dark:text-slate-100
                      focus:outline-none focus:border-slate-900 dark:focus:border-slate-100
                      transition-colors
                    "
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="
                      w-full px-4 py-2.5 rounded-xl text-sm
                      bg-slate-50 dark:bg-slate-900/50
                      border-2 border-slate-200 dark:border-slate-700
                      text-slate-900 dark:text-slate-100
                      focus:outline-none focus:border-slate-900 dark:focus:border-slate-100
                      transition-colors
                    "
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Assign To
                </label>
                <select
                  value={form.assignedTo}
                  onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                  className="
                    w-full px-4 py-2.5 rounded-xl text-sm
                    bg-slate-50 dark:bg-slate-900/50
                    border-2 border-slate-200 dark:border-slate-700
                    text-slate-900 dark:text-slate-100
                    focus:outline-none focus:border-slate-900 dark:focus:border-slate-100
                    transition-colors
                  "
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={form.title.trim().length < 3}
                  className="
                    flex-1 px-5 py-3 rounded-xl text-sm font-bold uppercase tracking-wide
                    bg-slate-900 dark:bg-slate-100
                    text-white dark:text-slate-900
                    hover:bg-slate-800 dark:hover:bg-slate-200
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all duration-200
                    shadow-lg hover:shadow-xl
                    hover:scale-105
                  "
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setForm({
                      title: task.title,
                      description: task.description || "",
                      deadline: task.deadline ? task.deadline.slice(0, 10) : "",
                      priority: task.priority || "medium",
                      assignedTo: task.assignedTo?._id || "",
                    });
                  }}
                  className="
                    px-5 py-3 rounded-xl text-sm font-bold uppercase tracking-wide
                    bg-slate-100 dark:bg-slate-700
                    text-slate-700 dark:text-slate-300
                    hover:bg-slate-200 dark:hover:bg-slate-600
                    transition-all duration-200
                    border-2 border-slate-200 dark:border-slate-600
                  "
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskCard;
