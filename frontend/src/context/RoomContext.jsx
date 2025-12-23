import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const RoomContext = createContext();

export const RoomProvider = ({ children }) => {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
  try {
    setLoading(true);
    const res = await api.get("/rooms/my");

    const roomList = res.data.rooms || res.data;

    setRooms(roomList);
    setActiveRoom(roomList[0] || null);
  } catch (err) {
    console.error("Failed to fetch rooms", err);
  } finally {
    setLoading(false);
  }
};


  const createRoom = async (name) => {
  try {
    const res = await api.post("/rooms", { name });

    // normalize response shape
    const newRoom = res.data.room || res.data;

    setRooms((prev) => [...prev, newRoom]);
    setActiveRoom(newRoom);
  } catch (err) {
    console.error("Failed to create room", err);
  }
};


  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <RoomContext.Provider
      value={{
        rooms,
        activeRoom,
        setActiveRoom,
        loading,
        createRoom,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRooms = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useRooms must be used within RoomProvider");
  }
  return context;
};



