import api from "./api";

export const createRoomApi = async (payload) => {
  const res = await api.post("/rooms", payload);
  return res.data.room;
};

export const getMyRooms = async () => {
  const res = await api.get("/rooms/my");
  return res.data.rooms;
};

export const joinRoomApi = async (inviteCode) => {
  const res = await api.post("/rooms/join", { inviteCode });
  return res.data.room;
};
