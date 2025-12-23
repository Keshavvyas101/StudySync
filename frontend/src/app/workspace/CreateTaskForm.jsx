import { useState } from "react";
import { useTasks } from "../../context/TaskContext";

const CreateTaskForm = () => {
  const { addTask } = useTasks();

  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "todo",
    deadline: "",
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      alert("Title is required");
      return;
    }

    setLoading(true);
    const success = await addTask(form);
    setLoading(false);

    if (success) {
      alert("Task created successfully");
      setForm({
        title: "",
        description: "",
        status: "todo",
        deadline: "",
      });
    } else {
      alert("Failed to create task");
    }
  };

  return (
    <div className="p-4 border rounded space-y-3">
      <input
        placeholder="Task title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="w-full border px-3 py-2 rounded"
      />

      <textarea
        placeholder="Description"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="w-full border px-3 py-2 rounded"
      />

      <select
        value={form.status}
        onChange={(e) => setForm({ ...form, status: e.target.value })}
        className="w-full border px-3 py-2 rounded"
      >
        <option value="todo">Todo</option>
        <option value="in-progress">In Progress</option>
        <option value="completed">Completed</option>
      </select>

      <input
        type="date"
        value={form.deadline}
        onChange={(e) => setForm({ ...form, deadline: e.target.value })}
        className="w-full border px-3 py-2 rounded"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="bg-purple-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Creating..." : "Create Task"}
      </button>
    </div>
  );
};

export default CreateTaskForm;
