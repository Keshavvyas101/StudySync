import { useEffect, useState } from "react";
import { useRooms } from "../../context/RoomContext";
import { useTasks } from "../../context/TaskContext";
import TaskCard from "./TaskCard";
import "../layout/layout.css"

const Workspace = () => {
  const { activeRoom, members } = useRooms();
  const { tasks, loading, fetchTasks, createTask } = useTasks();

  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    deadline: "",
    assignedTo: "",
    priority: "medium"
  });

  useEffect(() => {
    if (activeRoom?._id) {
      fetchTasks(activeRoom._id);
    }
  }, [activeRoom]);

  if (!activeRoom) {
    return (
      <div className="workspace flex items-center justify-center text-gray-400">
        Select a room to see tasks
      </div>
    );
  }

  const handleAddTask = () => {
    if (form.title.trim().length < 3) return;

    createTask(activeRoom._id, {
      title: form.title,
      description: form.description,
      deadline: form.deadline || null,
      assignedTo: form.assignedTo || null,
      priority: form.priority || "medium"
    });

    setForm({
      title: "",
      description: "",
      deadline: "",
      assignedTo: "",
      priority: "medium"
    });
    setShowForm(false);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === "completed") return t.status === "completed";
    if (filter === "active") return t.status !== "completed";
    return true;
  });

  return (
    <div className="workspace w-full h-full px-6 ">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">
          {activeRoom.name}
        </h2>

        {/* FILTER BAR */}
        <div className="flex gap-2">
          {["all", "active", "completed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded text-sm transition ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 dark:bg-[#1a1f2b] text-slate-700 dark:text-gray-400 hover:bg-slate-300 dark:hover:bg-[#232838]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="text-gray-400">
          Loading tasks…
        </p>
      )}

      {!loading && filteredTasks.length === 0 && (
        <p className="text-gray-400">
          No tasks yet
        </p>
      )}

      {/* TASK LIST */}
      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <TaskCard
            key={task._id}
            task={task}
            members={members}
          />
        ))}
      </div>

      {/* ADD TASK */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="mt-8 w-full py-3 rounded bg-blue-600 hover:bg-blue-700 text-white"
        >
          + Add New Task
        </button>
      ) : (
        <div className="mt-6 p-4 rounded border border-slate-300 dark:border-white/10
                        bg-white dark:bg-[#15151c] space-y-3">

          <input
            placeholder="Task title"
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
            className="w-full px-3 py-2 rounded bg-slate-100 dark:bg-[#0f0f14]
                       border border-slate-300 dark:border-white/10"
          />

          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            className="w-full px-3 py-2 rounded bg-slate-100 dark:bg-[#0f0f14]
                       border border-slate-300 dark:border-white/10"
          />

          <input
            type="date"
            value={form.deadline}
            onChange={(e) =>
              setForm({ ...form, deadline: e.target.value })
            }
            className="w-full px-3 py-2 rounded bg-slate-100 dark:bg-[#0f0f14]
                       border border-slate-300 dark:border-white/10"
          />

          <select
            value={form.assignedTo}
            onChange={(e) =>
              setForm({ ...form, assignedTo: e.target.value })
            }
            className="w-full px-3 py-2 rounded bg-slate-100 dark:bg-[#0f0f14]
                       border border-slate-300 dark:border-white/10"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </select>
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


          <div className="flex gap-2 pt-2">
            <button
              onClick={handleAddTask}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
            >
              Save Task
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspace;
