// src/context/RoomContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const RoomContext = createContext();

export const RoomProvider = ({ children }) => {
  const { user } = useAuth(); // 🔥 react to login/logout

  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ---------------- FETCH ROOMS ---------------- */
  const fetchRooms = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const res = await api.get("/rooms/my");

      const roomList = res.data.rooms || [];
      setRooms(roomList);
      setActiveRoom(roomList[0] || null);
    } catch (err) {
      console.error("Failed to fetch rooms", err);
      setRooms([]);
      setActiveRoom(null);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- FETCH MEMBERS ---------------- */
  const fetchMembers = async (roomId) => {
    if (!roomId) return;

    try {
      const res = await api.get(`/rooms/${roomId}/members`);
      setMembers(res.data.members || []);
    } catch (err) {
      console.error("Failed to fetch members", err);
      setMembers([]);
    }
  };

  /* ---------------- CREATE ROOM ---------------- */
  const createRoom = async (name) => {
    try {
      const res = await api.post("/rooms", { name });
      const newRoom = res.data.room;

      setRooms((prev) => [...prev, newRoom]);
      setActiveRoom(newRoom);
    } catch (err) {
      console.error("Failed to create room", err);
    }
  };

  /* ---------------- REACT TO AUTH CHANGE ---------------- */
  useEffect(() => {
    if (user) {
      fetchRooms(); // login → load rooms
    } else {
      // logout → clear everything
      setRooms([]);
      setActiveRoom(null);
      setMembers([]);
    }
  }, [user]);

  /* ---------------- REACT TO ACTIVE ROOM CHANGE ---------------- */
  useEffect(() => {
    if (activeRoom?._id) {
      fetchMembers(activeRoom._id);
    } else {
      setMembers([]);
    }
  }, [activeRoom]);

  return (
    <RoomContext.Provider
      value={{
        rooms,
        activeRoom,
        setActiveRoom,
        members,
        loading,
        fetchRooms,
        fetchMembers,
        createRoom,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRooms = () => {
  const ctx = useContext(RoomContext);
  if (!ctx) {
    throw new Error("useRooms must be used within RoomProvider");
  }
  return ctx;
};
