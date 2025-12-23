import { createContext, useContext, useEffect, useState } from "react";
import {
  createTaskApi,
  getTasksByRoomApi,
  deleteTaskApi,
} from "../services/taskService";

const TaskContext = createContext(null);

export const TaskProvider = ({ children, roomId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔴 KEY FIX: reset + refetch when roomId changes
  useEffect(() => {
    if (!roomId) return;

    const fetchTasks = async () => {
      try {
        setLoading(true);
        setTasks([]); // 🔥 clear previous room tasks
        const data = await getTasksByRoomApi(roomId);
        setTasks(data);
      } catch (err) {
        console.error("Failed to load tasks", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [roomId]); // 🔥 DEPENDENCY ADDED

  const addTask = async (taskData) => {
    if (!roomId || !taskData.title) return false;

    try {
      const newTask = await createTaskApi(roomId, taskData);
      setTasks((prev) => [newTask, ...prev]);
      return true;
    } catch (err) {
      console.error("Failed to create task", err);
      return false;
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await deleteTaskApi(taskId);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  return (
    <TaskContext.Provider
      value={{ tasks, loading, addTask, deleteTask }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) {
    throw new Error("useTasks must be used inside TaskProvider");
  }
  return ctx;
};
