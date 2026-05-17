import { useState, useEffect, useRef } from "react";
import { useTasks } from "../../context/TaskContext";
import Avatar from "../../components/common/Avatar";
import { useUI } from "../../context/UIContext";

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

  const { openTask, focusedTaskId } = useUI();

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
        bg-white dark:bg-slate-800/50
        backdrop-blur-sm
        border-2 rounded-2xl
        transition-all duration-300 ease-out
        ${isFocused 
          ? 'border-slate-900 dark:border-slate-100 shadow-2xl scale-[1.02]' 
          : 'border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xl'
        }
        ${isCompleted ? 'opacity-60' : ''}
      `}
    >
      {/* HEADER */}
      <div
        className="flex items-start gap-4 p-5"
      >
        {/* Status Checkbox */}
        <div
          className="mt-1 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => toggleTaskStatus(task._id)}
            className={`
              w-6 h-6 rounded-md border-2 flex items-center justify-center
              transition-all duration-300
              ${isCompleted
                ? 'bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100'
                : 'border-slate-300 dark:border-slate-600 hover:border-slate-900 dark:hover:border-slate-100 hover:scale-110'
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
            text-lg font-semibold mb-3 leading-tight
            ${isCompleted 
              ? 'line-through text-slate-400 dark:text-slate-600' 
              : 'text-slate-900 dark:text-slate-50'
            }
          `}>
            {task.title}
          </h3>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Assignee */}
            {task.assignedTo && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600/30">
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
            <span className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              {task.priority}
            </span>

            {/* Deadline */}
            {deadlineStatus && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg">
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
              text-slate-600 dark:text-slate-400
              hover:bg-slate-100 dark:hover:bg-slate-700
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
                text-slate-600 dark:text-slate-400
                hover:bg-slate-100 dark:hover:bg-slate-700
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
      <div className="h-1 bg-slate-100 dark:bg-slate-700/30 relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-slate-900 dark:bg-slate-100 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* EXPANDED CONTENT */}
      {expanded && (
        <div className="p-5 border-t-2 border-slate-100 dark:border-slate-700/50">
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
                <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600/30 w-fit">
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
