import { useState, useEffect } from "react";
import { useTasks } from "../../context/TaskContext";
import { useRooms } from "../../context/RoomContext";
import { useUsers } from "../../context/UserContext";

const TaskCard = ({ task }) => {
  const { updateTask, deleteTask } = useTasks();
  const { activeRoom } = useRooms();
  const { users, fetchRoomMembers } = useUsers();

  const [isEditing, setIsEditing] = useState(false);
  const isCompleted = task.status === "completed";

  const [form, setForm] = useState({
    title: task.title,
    description: task.description || "",
    deadline: task.deadline ? task.deadline.slice(0, 10) : "",
    status: task.status,
    assignedTo: task.assignedTo?._id || "",
  });

  const getDeadlineColor = (deadline) => {
  if (!deadline) return "border-gray-600";

  const today = new Date();
  const dueDate = new Date(deadline);

  // remove time difference
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate - today;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return "border-red-500";
  if (diffDays <= 2) return "border-yellow-500";
  return "border-green-500";
};


  useEffect(() => {
    setForm({
      title: task.title,
      description: task.description || "",
      deadline: task.deadline ? task.deadline.slice(0, 10) : "",
      status: task.status,
      assignedTo: task.assignedTo?._id || "",
    });
  }, [task]);

  useEffect(() => {
    if (isEditing && activeRoom?._id) {
      fetchRoomMembers(activeRoom._id);
    }
  }, [isEditing, activeRoom]);

  const toggleComplete = () => {
    updateTask(task._id, {
      status: isCompleted ? "todo" : "completed",
    });
  };

  const handleSave = () => {
    updateTask(task._id, {
      title: form.title,
      description: form.description,
      deadline: form.deadline || null,
      status: form.status,
      assignedTo: form.assignedTo || null,
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm("Delete this task?")) {
      deleteTask(task._id);
    }
  };

  return (
    <div
  className={`bg-[#1a1f2b] border-l-4 rounded p-4 ${
    getDeadlineColor(task.deadline)
  }`}
>

      {!isEditing ? (
        <div className="flex justify-between gap-4">
          <div className="flex gap-3">
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={toggleComplete}
              className="mt-1"
            />

            <div>
              <p
                className={`font-medium ${
                  isCompleted ? "line-through text-gray-400" : ""
                }`}
              >
                {task.title}
              </p>

              {task.assignedTo && (
                <p className="text-xs text-blue-400">
                  Assigned to {task.assignedTo.name}
                </p>
              )}

             {task.deadline && (
  <p
    className={`text-xs mt-1 ${
      getDeadlineColor(task.deadline).includes("red")
        ? "text-red-400"
        : getDeadlineColor(task.deadline).includes("yellow")
        ? "text-yellow-400"
        : "text-green-400"
    }`}
  >
    Due {new Date(task.deadline).toDateString()}
  </p>
)}

            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 bg-blue-600 rounded"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1 bg-red-600 rounded"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
            className="w-full px-2 py-1 bg-[#0f0f14]"
          />

          <textarea
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            className="w-full px-2 py-1 bg-[#0f0f14]"
          />

          <input
            type="date"
            value={form.deadline}
            onChange={(e) =>
              setForm({ ...form, deadline: e.target.value })
            }
            className="w-full px-2 py-1 bg-[#0f0f14]"
          />

          <select
            value={form.assignedTo}
            onChange={(e) =>
              setForm({ ...form, assignedTo: e.target.value })
            }
            className="w-full px-2 py-1 bg-[#0f0f14]"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-green-600 rounded"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 bg-gray-600 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
