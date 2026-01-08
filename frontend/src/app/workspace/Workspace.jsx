import { useEffect, useState } from "react";
import { useRooms } from "../../context/RoomContext";
import { useTasks } from "../../context/TaskContext";
import TaskCard from "./Taskcard";
import "../layout/layout.css";

const Workspace = () => {
  const { activeRoom, members } = useRooms();
  const {
    tasks,
    loading,
    hasMore,
    fetchTasks,
    loadMoreTasks,
    createTask,
  } = useTasks();

  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    deadline: "",
    assignedTo: "",
    priority: "medium",
  });

  /* ===============================
     FETCH TASKS ON ROOM CHANGE
     =============================== */
  useEffect(() => {
    if (activeRoom?._id) {
      fetchTasks(activeRoom._id);
    }
  }, [activeRoom]);

  if (!activeRoom) {
    return (
      <div className="workspace flex items-center justify-center text-slate-400 dark:text-slate-500">
        Select a room to see tasks
      </div>
    );
  }

  /* ===============================
     CREATE TASK
     =============================== */
  const handleAddTask = () => {
    if (form.title.trim().length < 3) return;

    createTask(activeRoom._id, {
      title: form.title,
      description: form.description,
      deadline: form.deadline || null,
      assignedTo: form.assignedTo || null,
      priority: form.priority,
    });

    setForm({
      title: "",
      description: "",
      deadline: "",
      assignedTo: "",
      priority: "medium",
    });
    setShowForm(false);
  };

  /* ===============================
     FILTER TASKS
     =============================== */
  const filteredTasks = tasks.filter((t) => {
    if (filter === "completed") return t.status === "completed";
    if (filter === "active") return t.status !== "completed";
    return true;
  });

  return (
    <div className="workspace w-full h-full flex flex-col">
      {/* ================= STICKY HEADER ================= */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {activeRoom.name}
          </h2>

          <div className="flex gap-2">
            {["all", "active", "completed"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm transition ${
                  filter === f
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================= SCROLLABLE CONTENT ================= */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {loading && (
          <p className="text-slate-400 dark:text-slate-500">
            Loading tasks…
          </p>
        )}

        {!loading && filteredTasks.length === 0 && (
          <div className="text-center py-20 text-slate-400 dark:text-slate-500">
            <p className="text-lg">No tasks yet</p>
            <p className="text-sm mt-1">
              Add your first task to start studying 🚀
            </p>
          </div>
        )}

        {/* ================= TASK LIST ================= */}
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div
              key={task._id}
              id={`task-${task._id}`} // 👈 IMPORTANT (for future notification scroll)
            >
              <TaskCard task={task} members={members} />
            </div>
          ))}
        </div>

        {/* ================= LOAD MORE ================= */}
        {hasMore && !loading && (
          <button
            onClick={() => loadMoreTasks(activeRoom._id)}
            className="mt-6 w-full py-2 rounded-lg
                       bg-slate-100 dark:bg-slate-800
                       text-slate-700 dark:text-slate-300
                       hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Load more tasks
          </button>
        )}

        {/* ================= ADD TASK CTA ================= */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mt-10 w-full py-3 rounded-xl
                       bg-indigo-600 hover:bg-indigo-700
                       text-white font-medium shadow-sm"
          >
            + Add New Task
          </button>
        )}

        {/* ================= ADD TASK FORM ================= */}
        {showForm && (
          <div className="mt-6 p-5 rounded-xl
                          border border-slate-200 dark:border-slate-800
                          bg-white dark:bg-slate-900
                          space-y-3 shadow-sm">
            <input
              placeholder="Task title"
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800
                         border border-slate-200 dark:border-slate-700"
            />

            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800
                         border border-slate-200 dark:border-slate-700"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={form.deadline}
                onChange={(e) =>
                  setForm({ ...form, deadline: e.target.value })
                }
                className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800
                           border border-slate-200 dark:border-slate-700"
              />

              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value })
                }
                className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800
                           border border-slate-200 dark:border-slate-700"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <select
              value={form.assignedTo}
              onChange={(e) =>
                setForm({ ...form, assignedTo: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800
                         border border-slate-200 dark:border-slate-700"
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
                onClick={handleAddTask}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              >
                Save Task
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Workspace;
