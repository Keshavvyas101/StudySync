import { useState } from "react";
import { useTasks } from "../../context/TaskContext";
import CreateTaskForm from "./CreateTaskForm";
import TaskDetail from "./TaskDetail";

const TaskView = () => {
  const taskContext = useTasks();

  // 🛡 SAFETY GUARD
  if (!taskContext) {
    return (
      <div className="p-6 text-red-400">
        Task context not available
      </div>
    );
  }

  const {
    tasks = [],
    loading = false,
    // deleteTask ❌ NOT USED until implemented
  } = taskContext;

  const [selectedTask, setSelectedTask] = useState(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400">
        Loading tasks...
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col gap-6 p-6">
      {/* CREATE TASK */}
      <CreateTaskForm />

      {/* EMPTY STATE */}
      {tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          No tasks in this room yet
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task._id}
              onClick={() => setSelectedTask(task)}
              className="
                p-4 rounded-xl
                bg-[#15151c]
                border border-white/10
                cursor-pointer
                hover:bg-[#1a1a24]
                transition
              "
            >
              <p className="text-sm font-medium text-white">
                {task.title}
              </p>

              <p className="text-xs text-gray-400 capitalize">
                {task.status}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* TASK DETAIL */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
};

export default TaskView;
