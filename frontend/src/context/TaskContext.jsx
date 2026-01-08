import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const TaskContext = createContext();
const PAGE_SIZE = 10;

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // 🎯 NEW: focused task (from notifications)
  const [focusedTaskId, setFocusedTaskId] = useState(null);

  /* ===============================
     INITIAL FETCH
     =============================== */
  const fetchTasks = async (roomId) => {
    if (!roomId) return;
    try {
      setLoading(true);
      setPage(0);
      setHasMore(true);

      const res = await api.get(
        `/tasks/${roomId}?limit=${PAGE_SIZE}&skip=0`
      );

      const fetched = res.data.tasks || [];
      setTasks(fetched);
      setHasMore(fetched.length === PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     LOAD MORE TASKS
     =============================== */
  const loadMoreTasks = async (roomId) => {
    if (!roomId || !hasMore || loading) return;

    try {
      setLoading(true);
      const nextPage = page + 1;

      const res = await api.get(
        `/tasks/${roomId}?limit=${PAGE_SIZE}&skip=${
          nextPage * PAGE_SIZE
        }`
      );

      const fetched = res.data.tasks || [];

      setTasks((prev) => [...prev, ...fetched]);
      setPage(nextPage);
      setHasMore(fetched.length === PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     CRUD
     =============================== */
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
      setTasks((prev) =>
        prev.map((task) =>
          task._id === taskId
            ? {
                ...task,
                status:
                  nextStatus === "completed"
                    ? "todo"
                    : "completed",
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

  /* ===============================
     🎯 FOCUS TASK API
     =============================== */
  const focusTask = (taskId) => {
    setFocusedTaskId(taskId);
  };

  const clearFocusedTask = () => {
    setFocusedTaskId(null);
  };

  // 🧹 Auto-clear focus if task list changes and task no longer exists
  useEffect(() => {
    if (
      focusedTaskId &&
      !tasks.some((t) => t._id === focusedTaskId)
    ) {
      setFocusedTaskId(null);
    }
  }, [tasks, focusedTaskId]);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        hasMore,
        focusedTaskId,      // ✅ exposed
        fetchTasks,
        loadMoreTasks,
        createTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,
        focusTask,           // ✅ exposed
        clearFocusedTask,    // ✅ exposed
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
