import api from "./api";

/* ======================
   TASK APIs
====================== */

export const fetchTasksApi = async (roomId, limit = 10, skip = 0, includeArchived = false) => {
  const res = await api.get(
    `/tasks/${roomId}?limit=${limit}&skip=${skip}&includeArchived=${includeArchived}`
  );
  return res.data.tasks || [];
};

export const createTaskApi = async (roomId, payload) => {
  const res = await api.post(`/tasks/${roomId}`, payload);
  return res.data.task;
};

export const updateTaskApi = async (taskId, payload) => {
  const res = await api.patch(`/tasks/${taskId}`, payload);
  return res.data.task;
};

export const deleteTaskApi = async (taskId) => {
  await api.delete(`/tasks/${taskId}`);
};

export const toggleTaskStatusApi = async (taskId) => {
  const res = await api.patch(`/tasks/${taskId}/status`);
  return res.data.task;
};

/* ======================
   SUBTASK APIs
====================== */

export const addSubtaskApi = async (taskId, title) => {
  const res = await api.post(`/tasks/${taskId}/subtasks`, { title });
  return res.data.task;
};

export const toggleSubtaskApi = async (taskId, subtaskId) => {
  const res = await api.patch(
    `/tasks/${taskId}/subtasks/${subtaskId}/toggle`
  );
  return res.data.task;
};

export const updateSubtaskApi = async (taskId, subtaskId, payload) => {
  const res = await api.patch(
    `/tasks/${taskId}/subtasks/${subtaskId}`,
    payload
  );
  return res.data.task;
};

export const deleteSubtaskApi = async (taskId, subtaskId) => {
  const res = await api.delete(
    `/tasks/${taskId}/subtasks/${subtaskId}`
  );
  return res.data.task;
};
