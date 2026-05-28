import api from "./api";

export const fetchRoomAnalytics = async (roomId, range = "all") => {
  const url =
    range === "all"
      ? `/analytics/room/${roomId}/summary`
      : `/analytics/room/${roomId}/summary?range=${range}`;

  const res = await api.get(url);
  return res.data;
};

// Existing
export const fetchRoomStreak = async (roomId) => {
  const res = await api.get(`/analytics/room/${roomId}/streak`);
  return res.data;
};

export const fetchDailyProductivity = async (roomId) => {
  const res = await api.get(`/analytics/room/${roomId}/daily`);
  return res.data;
};

export const fetchWeeklyConsistency = async (roomId) => {
  const res = await api.get(`/analytics/room/${roomId}/consistency`);
  return res.data;
};

export const fetchWeeklyComparison = async (roomId) => {
  const res = await api.get(`/analytics/room/${roomId}/weekly-comparison`);
  return res.data;
};

export const fetchLast7DaysActivity = async (roomId) => {
  const res = await api.get(`/analytics/room/${roomId}/activity-7days`);
  return res.data;
};

export const fetchProductivityScore = async (roomId) => {
  const res = await api.get(`/analytics/room/${roomId}/productivity`);
  return res.data;
};

// ✅ NEW — Phase 2.1
export const fetchRoomComparison = async (roomId) => {
  const res = await api.get(`/analytics/room/${roomId}/comparison`);
  return res.data;
};


export const fetchMyBadges = async()=>{
  const  res= await api.get(`/analytics/me/badges`);
  return res.data;
}

