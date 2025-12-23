import api from "./api";

export const createTaskApi = async (roomId, payload) => {
  const res = await api.post(`/tasks/${roomId}`, payload);
  return res.data.task;
};

export const getTasksByRoomApi = async (roomId) => {
  const res = await api.get(`/tasks/${roomId}`);
  return res.data.tasks;
};

export const deleteTaskApi = async (taskId) => {
  await api.delete(`/tasks/${taskId}`);
};
