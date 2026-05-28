import { useState } from "react";
import { useTasks } from "../../context/TaskContext";
import SubtaskItem from "./SubtaskItem";
import "./TaskDetails.css";

const TaskDetailsPanel = ({ task }) => {
  const { clearFocusedTask, addSubtask } = useTasks();
  const [newTitle, setNewTitle] = useState("");

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addSubtask(task._id, newTitle);
    setNewTitle("");
  };

  return (
    <div className="task-details">
      {/* Header */}
      <div className="task-details-header">
        <div>
          <h2 className="task-title">{task.title}</h2>
        </div>
        <button className="task-close" onClick={clearFocusedTask}>
          ✕
        </button>
      </div>

      {/* Description */}
      {task.description && (
        <div className="task-section">
          <div className="task-section-label">Description</div>
          <p className="task-desc">{task.description}</p>
        </div>
      )}

      {/* Subtasks */}
      <div className="task-section">
        <div className="task-section-header">
          <span className="task-section-label">Subtasks</span>
          <span className="task-count">
            {task.subtasks?.length || 0}
          </span>
        </div>

        {task.subtasks?.length === 0 && (
          <div className="empty">No subtasks yet</div>
        )}

        <div className="subtasks-list">
          {task.subtasks?.map((sub) => (
            <SubtaskItem key={sub._id} task={task} subtask={sub} />
          ))}
        </div>

        {/* Add Subtask */}
        <div className="add-subtask">
          <input
            placeholder="Add a new subtask..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <button onClick={handleAdd}>Add</button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsPanel;
