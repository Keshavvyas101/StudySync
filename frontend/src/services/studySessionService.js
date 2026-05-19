import api from "./api";

export const getActiveStudySessionApi = async () => {
  const res = await api.get("/study-sessions/active");
  return res.data;
};

export const getStudySessionHistoryApi = async (limit = 30) => {
  const res = await api.get(`/study-sessions/history?limit=${limit}`);
  return res.data.sessions || [];
};

export const startStudySessionApi = async (taskId) => {
  const res = await api.post("/study-sessions/start", { taskId });
  return res.data.session;
};

export const pauseStudySessionApi = async (sessionId) => {
  const res = await api.patch(`/study-sessions/${sessionId}/pause`);
  return res.data.session;
};

export const resumeStudySessionApi = async (sessionId) => {
  const res = await api.patch(`/study-sessions/${sessionId}/resume`);
  return res.data.session;
};

export const completeStudySessionApi = async (sessionId) => {
  const res = await api.patch(`/study-sessions/${sessionId}/complete`);
  return res.data.session;
};
