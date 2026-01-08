import { useState, useEffect, useRef } from "react";
import { useTasks } from "../../context/TaskContext";

/* ===================== HELPERS ===================== */

const getPriorityBorder = (priority) => {
  if (priority === "high")
    return "border-l-4 border-l-red-500 dark:border-l-red-400";
  if (priority === "medium")
    return "border-l-4 border-l-yellow-400 dark:border-l-yellow-300";
  return "border-l-4 border-l-green-500 dark:border-l-green-400";
};

const getPriorityBadge = (priority) => {
  if (priority === "high")
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  if (priority === "medium")
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300";
  return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
};

const getDeadlineStatus = (deadline) => {
  if (!deadline) return null;

  const today = new Date();
  const due = new Date(deadline);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const days = (due - today) / 86400000;

  if (days < 0)
    return {
      label: "Overdue",
      className:
        "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    };

  if (days <= 2)
    return {
      label: "Due Soon",
      className:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    };

  return {
    label: "On Track",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  };
};

/* ===================== COMPONENT ===================== */

const TaskCard = ({ task, members = [] }) => {
  const {
    updateTask,
    deleteTask,
    toggleTaskStatus,
    focusedTaskId,
    clearFocusedTask,
  } = useTasks();

  const cardRef = useRef(null);

  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState({
    title: task.title,
    description: task.description || "",
    deadline: task.deadline ? task.deadline.slice(0, 10) : "",
    priority: task.priority || "medium",
    assignedTo: task.assignedTo?._id || "",
  });

  const deadlineStatus = getDeadlineStatus(task.deadline);

  const isFocused = focusedTaskId === task._id;

  /* ===================== AUTO EXPAND + SCROLL ===================== */
  useEffect(() => {
    if (isFocused) {
      setExpanded(true);

      // 🔥 scroll safely
      setTimeout(() => {
        cardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  }, [isFocused]);

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
    clearFocusedTask();
  };

  return (
    <div
      ref={cardRef}
      className={`
        rounded-xl p-4 transition
        bg-white dark:bg-slate-800
        border border-gray-200 dark:border-slate-700
        shadow-sm hover:shadow-md
        ${getPriorityBorder(task.priority)}
        ${isFocused ? "ring-2 ring-indigo-500" : ""}
      `}
    >
      {/* HEADER */}
      <div
        className="flex justify-between items-start gap-3 cursor-pointer"
        onClick={() => !isEditing && setExpanded((p) => !p)}
      >
        <div>
          <h3 className="font-semibold text-base">{task.title}</h3>

          {task.assignedTo && (
            <p className="text-xs mt-1 text-blue-600 dark:text-blue-400">
              Assigned to {task.assignedTo.name}
            </p>
          )}

          <span
            className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${getPriorityBadge(
              task.priority
            )}`}
          >
            Priority: {task.priority}
          </span>
        </div>

        {deadlineStatus && (
          <span
            className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${deadlineStatus.className}`}
          >
            {deadlineStatus.label}
          </span>
        )}
      </div>

      {/* EXPANDED */}
      {expanded && (
        <div
          className="mt-4 space-y-3 text-sm text-gray-600 dark:text-slate-300"
          onClick={(e) => e.stopPropagation()}
        >
          {!isEditing && (
            <>
              {task.description && <p>{task.description}</p>}

              {task.deadline && (
                <p>📅 Due {new Date(task.deadline).toDateString()}</p>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={task.status === "completed"}
                  onChange={() => {
                    toggleTaskStatus(task._id);
                    clearFocusedTask();
                  }}
                  className="h-4 w-4 accent-green-600 cursor-pointer"
                />

                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    task.status === "completed"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                  }`}
                >
                  {task.status === "completed"
                    ? "Completed"
                    : "Active"}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Edit
                </button>

                <button
                  onClick={() => deleteTask(task._id)}
                  className="px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </>
          )}

          {isEditing && (
            <div className="space-y-3">
              <input
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                className="w-full px-3 py-2 rounded bg-slate-100 dark:bg-slate-700 border"
              />

              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 rounded bg-slate-100 dark:bg-slate-700 border"
              />

              <input
                type="date"
                value={form.deadline}
                onChange={(e) =>
                  setForm({ ...form, deadline: e.target.value })
                }
                className="w-full px-3 py-2 rounded bg-slate-100 dark:bg-slate-700 border"
              />

              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value })
                }
                className="w-full px-3 py-2 rounded bg-slate-100 dark:bg-slate-700 border"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>

              <select
                value={form.assignedTo}
                onChange={(e) =>
                  setForm({ ...form, assignedTo: e.target.value })
                }
                className="w-full px-3 py-2 rounded bg-slate-100 dark:bg-slate-700 border"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg"
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
