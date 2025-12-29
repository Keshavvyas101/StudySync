import { useState } from "react";
import { useTasks } from "../../context/TaskContext";

/* ===================== HELPERS ===================== */

const getPriorityBorder = (priority) => {
  if (priority === "high")
    return "border-l-4 border-l-red-500/80 dark:border-l-red-400";
  if (priority === "medium")
    return "border-l-4 border-l-amber-400/80 dark:border-l-amber-300";
  return "border-l-4 border-l-emerald-500/80 dark:border-l-emerald-400";
};

const getPriorityBadge = (priority) => {
  if (priority === "high")
    return "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  if (priority === "medium")
    return "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
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
        "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    };

  if (days <= 2)
    return {
      label: "Due Soon",
      className:
        "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    };

  return {
    label: "On Track",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
};

/* ===================== COMPONENT ===================== */

const TaskCard = ({ task, members = [] }) => {
  const { updateTask, deleteTask } = useTasks();

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
      className={`
        rounded-xl p-4 transition-all
        bg-white dark:bg-slate-900
        border border-slate-200 dark:border-slate-800
        shadow-sm hover:shadow-md
        ${getPriorityBorder(task.priority)}
      `}
    >
      {/* ===== HEADER (COLLAPSED VIEW) ===== */}
      <div
        className="flex justify-between items-start gap-3 cursor-pointer"
        onClick={() => !isEditing && setExpanded((p) => !p)}
      >
        <div className="space-y-1">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {task.title}
          </h3>

          {task.assignedTo && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400">
              Assigned to {task.assignedTo.name}
            </p>
          )}

          <span
            className={`inline-block text-xs px-2 py-0.5 rounded-full ${getPriorityBadge(
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

      {/* ===== EXPANDED VIEW ===== */}
      {expanded && (
        <div
          className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300"
          onClick={(e) => e.stopPropagation()}
        >
          {!isEditing && (
            <>
              {task.description && <p>{task.description}</p>}

              {task.deadline && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  📅 Due {new Date(task.deadline).toDateString()}
                </p>
              )}

              <p>
                🔥 Priority:{" "}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${getPriorityBadge(
                    task.priority
                  )}`}
                >
                  {task.priority}
                </span>
              </p>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={task.status === "completed"}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateTask(task._id, {
                      status:
                        task.status === "completed"
                          ? "todo"
                          : "completed",
                    });
                  }}
                  className="h-4 w-4 accent-emerald-600 cursor-pointer"
                />

                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    task.status === "completed"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  }`}
                >
                  {task.status === "completed" ? "Completed" : "Active"}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button className="px-3 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700">
                  Edit
                </button>

                <button className="px-3 py-1 text-xs rounded bg-rose-600 text-white hover:bg-rose-700">
                  Delete
                </button>
              </div>
            </>
          )}

          {/* ===== EDIT MODE ===== */}
          {isEditing && (
            <div className="space-y-3">
              <input className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
              <textarea className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
              <input type="date" className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
              <select className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
              <select className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />

              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs rounded bg-emerald-600 text-white">
                  Save
                </button>
                <button className="px-3 py-1 text-xs rounded bg-slate-500 text-white">
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
