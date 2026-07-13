import {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import {
  fetchTasksApi,
  createTaskApi,
  updateTaskApi,
  deleteTaskApi,
  toggleTaskStatusApi,
  addSubtaskApi,
  toggleSubtaskApi,
  updateSubtaskApi,
  deleteSubtaskApi,
} from "../services/taskService";
import socket from "../services/socket";

const TaskContext = createContext();
const PAGE_SIZE = 10;

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  /* ======================
     SOCKET TASK SYNC
  ====================== */
  useEffect(() => {
    const handleTaskCreated = (task) => {
      replaceTask(task);
    };

    const handleTaskUpdated = (task) => {
      replaceTask(task);
    };

    const handleTaskDeleted = (taskId) => {
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    };

    socket.on("task-created", handleTaskCreated);
    socket.on("task-updated", handleTaskUpdated);
    socket.on("task-deleted", handleTaskDeleted);

    return () => {
      socket.off("task-created", handleTaskCreated);
      socket.off("task-updated", handleTaskUpdated);
      socket.off("task-deleted", handleTaskDeleted);
    };
  }, []);

  /* ======================
     FETCH TASKS
  ====================== */

  const fetchTasks = async (roomId, options = {}) => {
    if (!roomId) return;
    setLoading(true);

    try {
      const data = await fetchTasksApi(
        roomId,
        PAGE_SIZE,
        0,
        Boolean(options.includeArchived)
      );
      setTasks(data);
      setPage(0);
      setHasMore(data.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreTasks = async (roomId, options = {}) => {
    if (!roomId || !hasMore || loading) return;

    setLoading(true);
    const nextPage = page + 1;

    try {
      const data = await fetchTasksApi(
        roomId,
        PAGE_SIZE,
        nextPage * PAGE_SIZE,
        Boolean(options.includeArchived)
      );

      setTasks((prev) => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(data.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error loading more tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  /* ======================
     TASK CRUD
  ====================== */

  const createTask = async (roomId, payload) => {
    try {
      const newTask = await createTaskApi(roomId, payload);
      setTasks((prev) => [newTask, ...prev]);
      return newTask;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  };

  const updateTask = async (taskId, payload) => {
    try {
      const updated = await updateTaskApi(taskId, payload);
      setTasks((prev) =>
        prev.map((t) => (t._id === updated._id ? updated : t))
      );
      return updated;
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  };

  const replaceTask = (task) => {
    if (!task?._id) return;

    setTasks((prev) => {
      const exists = prev.some(
        (current) => current._id === task._id
      );

      if (!exists) return [task, ...prev];

      return prev.map((current) =>
        current._id === task._id ? task : current
      );
    });
  };

  const deleteTask = async (taskId) => {
    try {
      await deleteTaskApi(taskId);
      setTasks((prev) =>
        prev.filter((t) => t._id !== taskId)
      );
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  };

  const toggleTaskStatus = async (taskId) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t._id === taskId
          ? {
              ...t,
              status:
                t.status === "completed"
                  ? "todo"
                  : "completed",
            }
          : t
      )
    );

    try {
      const updated = await toggleTaskStatusApi(taskId);

      if (updated?._id) {
        setTasks((prev) =>
          prev.map((t) =>
            t._id === updated._id ? updated : t
          )
        );
      }

      return updated;
    } catch (error) {
      console.error("Error toggling task status:", error);

      // Revert on error
      setTasks((prev) =>
        prev.map((t) =>
          t._id === taskId
            ? {
                ...t,
                status:
                  t.status === "completed"
                    ? "todo"
                    : "completed",
              }
            : t
        )
      );

      throw error;
    }
  };

  /* ======================
     SUBTASKS
  ====================== */

  const addSubtask = async (taskId, payload) => {
    try {
      const updated = await addSubtaskApi(taskId, payload);
      setTasks((prev) =>
        prev.map((t) => (t._id === updated._id ? updated : t))
      );
      return updated;
    } catch (error) {
      console.error("Error adding subtask:", error);
      throw error;
    }
  };

  const toggleSubtask = async (taskId, subtaskId) => {
    let originalTasks = null;

    setTasks((prev) => {
      originalTasks = prev;
      return prev.map((t) => {
        if (t._id !== taskId) return t;

        const updatedSubtasks = t.subtasks.map((s) => {
          if (s._id !== subtaskId) return s;
          const nextCompleted = !s.isCompleted;
          return {
            ...s,
            isCompleted: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : null,
          };
        });

        // Sync parent task status if all subtasks are complete
        const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every((s) => s.isCompleted);
        const nextStatus = allCompleted ? "completed" : "todo";
        const nextCompletedAt = allCompleted ? new Date().toISOString() : null;

        return {
          ...t,
          subtasks: updatedSubtasks,
          status: nextStatus,
          completedAt: nextCompletedAt,
        };
      });
    });

    try {
      const updated = await toggleSubtaskApi(taskId, subtaskId);
      if (updated?._id) {
        setTasks((prev) =>
          prev.map((t) => (t._id === updated._id ? updated : t))
        );
      }
      return updated;
    } catch (error) {
      console.error("Error toggling subtask:", error);
      if (originalTasks) {
        setTasks(originalTasks);
      }
      throw error;
    }
  };

  const updateSubtask = async (
    taskId,
    subtaskId,
    payload
  ) => {
    try {
      const updated = await updateSubtaskApi(
        taskId,
        subtaskId,
        payload
      );
      setTasks((prev) =>
        prev.map((t) => (t._id === updated._id ? updated : t))
      );
      return updated;
    } catch (error) {
      console.error("Error updating subtask:", error);
      throw error;
    }
  };

  const deleteSubtask = async (taskId, subtaskId) => {
    let originalTasks = null;

    setTasks((prev) => {
      originalTasks = prev;
      return prev.map((t) => {
        if (t._id !== taskId) return t;
        const updatedSubtasks = t.subtasks.filter((s) => s._id !== subtaskId);

        // Sync parent status
        const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every((s) => s.isCompleted);
        const nextStatus = allCompleted ? "completed" : "todo";
        const nextCompletedAt = allCompleted ? new Date().toISOString() : null;

        return {
          ...t,
          subtasks: updatedSubtasks,
          status: nextStatus,
          completedAt: nextCompletedAt,
        };
      });
    });

    try {
      const updated = await deleteSubtaskApi(taskId, subtaskId);
      if (updated?._id) {
        setTasks((prev) =>
          prev.map((t) => (t._id === updated._id ? updated : t))
        );
      }
      return updated;
    } catch (error) {
      console.error("Error deleting subtask:", error);
      if (originalTasks) {
        setTasks(originalTasks);
      }
      throw error;
    }
  };

  /* ======================
     HELPERS
  ====================== */

  const getTaskProgress = (task) => {
    if (!task) return 0;

    const subtasks = task.subtasks || [];

    if (subtasks.length === 0) {
      return task.status === "completed" ? 100 : 0;
    }

    const done = subtasks.filter(
      (s) => s.isCompleted
    ).length;

    return Math.round(
      (done / subtasks.length) * 100
    );
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        hasMore,

        fetchTasks,
        loadMoreTasks,

        createTask,
        replaceTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,

        addSubtask,
        toggleSubtask,
        updateSubtask,
        deleteSubtask,

        getTaskProgress,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const ctx = useContext(TaskContext);

  if (!ctx) {
    throw new Error(
      "useTasks must be used inside TaskProvider"
    );
  }

  return ctx;
};