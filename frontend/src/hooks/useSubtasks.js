import api from "../services/api";

export const useSubtasks = (setTasks) => {
  const reconcileTaskStatus = (task) => {
    const subtasks = task.subtasks || [];
    if (subtasks.length === 0) return task;

    const allCompleted = subtasks.every((s) => s.isCompleted);

    return {
      ...task,
      status: allCompleted ? "completed" : "todo",
      completedAt: allCompleted ? new Date().toISOString() : null,
    };
  };

  const addSubtask = async (taskId, payload) => {
    try {
      let data;

      if (typeof payload === "string") {
        data = { title: payload };
      } else {
        data = {
          title: payload.title,
          assignedTo: payload.assignedTo || null,
          deadline: payload.deadline || null,
        };
      }

      if (!data.title?.trim()) return;

      const res = await api.post(`/tasks/${taskId}/subtasks`, data);
      const updatedTask = res.data.task;

      setTasks((prev) =>
        prev.map((t) =>
          t._id === updatedTask._id
            ? reconcileTaskStatus(updatedTask)
            : t
        )
      );
    } catch (err) {
      console.error("Add subtask failed", err);
    }
  };

  const toggleSubtask = async (taskId, subtaskId) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task._id !== taskId) return task;

        const updatedTask = {
          ...task,
          subtasks: task.subtasks?.map((s) =>
            s._id === subtaskId
              ? {
                  ...s,
                  isCompleted: !s.isCompleted,
                  completedAt: !s.isCompleted
                    ? new Date().toISOString()
                    : null,
                }
              : s
          ),
        };

        return reconcileTaskStatus(updatedTask);
      })
    );

    try {
      const res = await api.patch(
        `/tasks/${taskId}/subtasks/${subtaskId}/toggle`
      );

      const updatedTask = res.data.task;

      setTasks((prev) =>
        prev.map((t) =>
          t._id === updatedTask._id
            ? reconcileTaskStatus(updatedTask)
            : t
        )
      );
    } catch (err) {
      console.error("Toggle subtask failed", err);
    }
  };

  const updateSubtask = async (taskId, subtaskId, payload) => {
    if (payload?.title !== undefined && !payload.title.trim()) return;

    try {
      const res = await api.patch(
        `/tasks/${taskId}/subtasks/${subtaskId}`,
        {
          title: payload.title ?? undefined,
          assignedTo: payload.assignedTo ?? null,
          deadline: payload.deadline ?? null,
        }
      );

      const updatedTask = res.data.task;

      setTasks((prev) =>
        prev.map((t) =>
          t._id === updatedTask._id
            ? reconcileTaskStatus(updatedTask)
            : t
        )
      );
    } catch (err) {
      console.error("Update subtask failed", err);
    }
  };

  const deleteSubtask = async (taskId, subtaskId) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task._id !== taskId) return task;

        const updatedTask = {
          ...task,
          subtasks: task.subtasks?.filter(
            (s) => s._id !== subtaskId
          ),
        };

        return reconcileTaskStatus(updatedTask);
      })
    );

    try {
      const res = await api.delete(
        `/tasks/${taskId}/subtasks/${subtaskId}`
      );

      const updatedTask = res.data.task;

      setTasks((prev) =>
        prev.map((t) =>
          t._id === updatedTask._id
            ? reconcileTaskStatus(updatedTask)
            : t
        )
      );
    } catch (err) {
      console.error("Delete subtask failed", err);
    }
  };

  return {
    addSubtask,
    toggleSubtask,
    updateSubtask,
    deleteSubtask,
  };
};
