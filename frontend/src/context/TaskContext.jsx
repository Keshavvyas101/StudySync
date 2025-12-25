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
