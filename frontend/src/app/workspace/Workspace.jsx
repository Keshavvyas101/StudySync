import { useEffect, useState } from "react";
import { useRooms } from "../../context/RoomContext";
import { useTasks } from "../../context/TaskContext";
import TaskCard from "./TaskCard"; // ✅ IMPORTANT

const Workspace = () => {
  const { activeRoom } = useRooms();
  const { tasks, loading, fetchTasks, createTask } = useTasks();
  const [filter, setFilter] = useState("all");


  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    deadline: "",
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

    createTask({
      roomId: activeRoom._id,
      title: form.title,
      description: form.description,
      deadline: form.deadline || null,
    });

    setForm({ title: "", description: "", deadline: "" });
    setShowAddForm(false);
  };

  const filteredTasks = tasks.filter((task) => {
  if (filter === "completed") return task.status === "completed";
  if (filter === "active") return task.status !== "completed";
  return true; // all
});


  return (
    <div className="workspace w-full h-full px-6">
      <h2 className="text-xl font-semibold mb-6">
        {activeRoom.name}
      </h2>

      {/* FILTER BAR */}
<div className="flex gap-2 mb-6">
  <FilterButton
    label="All"
    active={filter === "all"}
    onClick={() => setFilter("all")}
  />
  <FilterButton
    label="Active"
    active={filter === "active"}
    onClick={() => setFilter("active")}
  />
  <FilterButton
    label="Completed"
    active={filter === "completed"}
    onClick={() => setFilter("completed")}
  />
</div>


      {loading && <p className="text-gray-400">Loading tasks…</p>}

      {!loading && tasks.length === 0 && (
        <p className="text-gray-400 mb-6">No tasks yet</p>
      )}

      {/* ✅ TASK LIST */}
      <div className="space-y-4">
      {filteredTasks.map((task) => (
  <TaskCard key={task._id} task={task} />
))}

      </div>

      {/* ADD TASK */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="mt-8 w-full py-3 rounded bg-blue-600 hover:bg-blue-700"
        >
          + Add New Task
        </button>
      )}

      {showAddForm && (
        <div className="mt-6 bg-[#15151c] p-4 rounded border border-white/10">
          <input
            placeholder="Task title"
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
            className="w-full mb-3 px-3 py-2 rounded bg-[#0f0f14] border border-white/10"
          />

          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            className="w-full mb-3 px-3 py-2 rounded bg-[#0f0f14] border border-white/10"
          />

          <input
            type="date"
            value={form.deadline}
            onChange={(e) =>
              setForm({ ...form, deadline: e.target.value })
            }
            className="w-full mb-4 px-3 py-2 rounded bg-[#0f0f14] border border-white/10"
          />

          <div className="flex gap-2">
            <button
              onClick={handleAddTask}
              className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
            >
              Save Task
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
};

const FilterButton = ({ label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded text-sm transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-[#1a1f2b] text-gray-400 hover:bg-[#232838]"
      }`}
    >
      {label}
    </button>
  );
};


export default Workspace;
