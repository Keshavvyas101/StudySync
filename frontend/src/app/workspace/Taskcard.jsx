import { useState } from "react";
import { useTasks } from "../../context/TaskContext";

/* ===================== HELPERS ===================== */

const getPriorityBorder = (priority) => {
  if (priority === "high")
    return "border-l-4 border-l-red-500 dark:border-l-red-400";
  if (priority === "medium")
    return "border-l-4 border-l-yellow-400 dark:border-l-yellow-300";
  return "border-l-4 border-l-green-500 dark:border-l-green-400";
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

const TaskCard = ({ task }) => {
  const { updateTask, deleteTask } = useTasks();

  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState({
    title: task.title,
    description: task.description || "",
    deadline: task.deadline ? task.deadline.slice(0, 10) : "",
  });

  const deadlineStatus = getDeadlineStatus(task.deadline);

  const handleSave = () => {
    if (form.title.trim().length < 3) return;

    updateTask(task._id, {
      title: form.title,
      description: form.description,
      deadline: form.deadline || null,
    });

    setIsEditing(false);
  };

  return (
    <div
      className={`
        rounded-xl p-4 transition
        bg-white text-gray-800
        dark:bg-slate-800 dark:text-slate-100
        shadow-sm hover:shadow-md
        border border-gray-200 dark:border-slate-700
        ${getPriorityBorder(task.priority)}
      `}
    >
      {/* ===== HEADER ===== */}
      <div
        onClick={() => setExpanded((p) => !p)}
        className="flex justify-between items-start gap-3 cursor-pointer"
      >
        <div>
          <h3 className="font-semibold text-base">
            {task.title}
          </h3>

          {task.assignedTo && (
            <p className="text-xs mt-1 text-blue-600 dark:text-blue-400">
              Assigned to {task.assignedTo.name}
            </p>
          )}
        </div>

        {deadlineStatus && (
          <span
            className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${deadlineStatus.className}`}
          >
            {deadlineStatus.label}
          </span>
        )}
      </div>

      {/* ===== EXPANDED ===== */}
      {expanded && (
        <div
          className="mt-4 space-y-3 text-sm text-gray-600 dark:text-slate-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ===== VIEW MODE ===== */}
          {!isEditing && (
            <>
              {task.description && <p>{task.description}</p>}

              {task.deadline && (
                <p>
                  📅 Due {new Date(task.deadline).toDateString()}
                </p>
              )}

              {/* STATUS */}
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
                  className="h-4 w-4 accent-green-600 cursor-pointer"
                />

                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
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

              {/* ACTIONS */}
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

          {/* ===== EDIT MODE ===== */}
          {isEditing && (
            <div className="space-y-2">
              <input
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                className="w-full px-3 py-2 rounded bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600"
              />

              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
                rows={3}
                className="w-full px-3 py-2 rounded bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600"
              />

              <input
                type="date"
                value={form.deadline}
                onChange={(e) =>
                  setForm({
                    ...form,
                    deadline: e.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600"
              />

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-xs rounded bg-gray-500 text-white hover:bg-gray-600"
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
