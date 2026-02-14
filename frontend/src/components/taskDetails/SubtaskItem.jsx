import { useState, useEffect } from "react";
import { useTasks } from "../../context/TaskContext";
import { useRooms } from "../../context/RoomContext";

const SubtaskItem = ({ task, subtask }) => {
  const { toggleSubtask, updateSubtask, deleteSubtask } = useTasks();
  const { members } = useRooms();

  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [deadline, setDeadline] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setTitle(subtask.title || "");
    setAssignee(subtask.assignedTo?._id || "");
    setDeadline(subtask.deadline ? subtask.deadline.slice(0, 10) : "");
  }, [subtask]);

  const handleSave = () => {
    if (!title.trim()) return;

    updateSubtask(task._id, subtask._id, {
      title,
      assignedTo: assignee || null,
      deadline: deadline || null,
    });

    setEditing(false);
  };

  const handleCancel = () => {
    setTitle(subtask.title || "");
    setAssignee(subtask.assignedTo?._id || "");
    setDeadline(subtask.deadline ? subtask.deadline.slice(0, 10) : "");
    setEditing(false);
  };

  const assigneeName = members.find(m => m._id === assignee)?.name;

  return (
    <div
      className={`
        group flex items-start justify-between gap-3
        px-3 py-2 rounded-xl
        hover:bg-slate-100 dark:hover:bg-slate-800
        transition
      `}
    >
      {/* LEFT SIDE */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <input
          type="checkbox"
          checked={subtask.isCompleted}
          onChange={() => toggleSubtask(task._id, subtask._id)}
          className="mt-1 accent-indigo-600"
        />

        {!editing ? (
          <p
            onDoubleClick={() => setEditing(true)}
            className={`text-sm leading-snug cursor-text truncate
              ${subtask.isCompleted ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-100"}
            `}
          >
            {subtask.title}
          </p>
        ) : (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-2 py-1 text-sm rounded-lg
                       bg-white dark:bg-slate-900
                       border border-slate-200 dark:border-slate-700
                       focus:ring-2 focus:ring-indigo-500 outline-none"
            autoFocus
          />
        )}
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Assignee */}
        <select
          value={assignee}
          onChange={(e) => {
            setAssignee(e.target.value);
            setEditing(true);
          }}
          className="
            text-xs px-2 py-1 rounded-full
            bg-slate-100 dark:bg-slate-800
            border border-slate-200 dark:border-slate-700
            hover:bg-slate-200 dark:hover:bg-slate-700
            transition
          "
        >
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m._id} value={m._id}>
              {m.name}
            </option>
          ))}
        </select>

        {/* Deadline */}
        <input
          type="date"
          value={deadline}
          onChange={(e) => {
            setDeadline(e.target.value);
            setEditing(true);
          }}
          className="
            text-xs px-2 py-1 rounded-full
            bg-slate-100 dark:bg-slate-800
            border border-slate-200 dark:border-slate-700
            hover:bg-slate-200 dark:hover:bg-slate-700
            transition
          "
        />

        {/* Actions */}
        {editing ? (
          <>
            <button
              onClick={handleSave}
              className="text-xs px-2 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="text-xs px-2 py-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => deleteSubtask(task._id, subtask._id)}
            className="
              opacity-0 group-hover:opacity-100
              text-slate-400 hover:text-red-500
              transition
            "
            title="Delete subtask"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default SubtaskItem;
