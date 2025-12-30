import { createContext, useContext, useState } from "react";
import api from "../services/api";

const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = async (roomId) => {
    if (!roomId) return;
    try {
      setLoading(true);
      const res = await api.get(`/tasks/${roomId}`);
      setTasks(res.data.tasks);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (roomId, data) => {
    const res = await api.post(`/tasks/${roomId}`, data);
    setTasks((prev) => [res.data.task, ...prev]);
  };

  const updateTask = async (taskId, updates) => {
    const res = await api.patch(`/tasks/${taskId}`, updates);
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? res.data.task : t))
    );
  };
const toggleTaskStatus = async (taskId) => {
  let nextStatus = null;

  setTasks((prev) =>
    prev.map((task) => {
      if (task._id !== taskId) return task;

      nextStatus =
        task.status === "completed" ? "todo" : "completed";

      return {
        ...task,
        status: nextStatus,
        completedAt:
          nextStatus === "completed"
            ? new Date().toISOString()
            : null,
      };
    })
  );

  try {
    await api.patch(`/tasks/${taskId}/status`);
  } catch (error) {
    console.error("Failed to toggle task status", error);

    // rollback using known nextStatus
    setTasks((prev) =>
      prev.map((task) =>
        task._id === taskId
          ? {
              ...task,
              status:
                nextStatus === "completed" ? "todo" : "completed",
              completedAt:
                nextStatus === "completed"
                  ? null
                  : new Date().toISOString(),
            }
          : task
      )
    );
  }
};




  const deleteTask = async (taskId) => {
    await api.delete(`/tasks/${taskId}`);
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        fetchTasks,
        createTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) {
    throw new Error("useTasks must be used within TaskProvider");
  }
  return ctx;
};
