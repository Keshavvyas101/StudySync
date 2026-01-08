// src/context/RoomContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const RoomContext = createContext();

export const RoomProvider = ({ children }) => {
  const { user } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ================= FETCH ROOMS ================= */
  const fetchRooms = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const res = await api.get("/rooms/my");
      const roomList = res.data.rooms || [];

      setRooms(roomList);

      // ✅ DO NOT OVERRIDE ACTIVE ROOM IF IT STILL EXISTS
      setActiveRoom((prevActive) => {
        if (prevActive) {
          const stillExists = roomList.find(
            (r) => r._id === prevActive._id
          );
          if (stillExists) return stillExists;
        }

        const savedRoomId = localStorage.getItem("activeRoomId");
        const restoredRoom = roomList.find(
          (r) => r._id === savedRoomId
        );

        return restoredRoom || roomList[0] || null;
      });
    } catch (err) {
      console.error("Failed to fetch rooms", err);
      setRooms([]);
      setActiveRoom(null);
    } finally {
      setLoading(false);
    }
  };

  /* ================= FETCH MEMBERS ================= */
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

  /* ================= CREATE ROOM ================= */
  const createRoom = async (name) => {
    try {
      const res = await api.post("/rooms", { name });
      const newRoom = res.data.room;

      setRooms((prev) => [...prev, newRoom]);
      setActiveRoom(newRoom);
      localStorage.setItem("activeRoomId", newRoom._id);
    } catch (err) {
      console.error("Failed to create room", err);
    }
  };

  /* ================= LEAVE ROOM ================= */
  const leaveRoom = async (roomId) => {
  try {
    await api.post("/rooms/leave", { roomId });

    setRooms((prevRooms) => {
      const updatedRooms = prevRooms.filter(
        (r) => r._id !== roomId
      );

      const nextRoom = updatedRooms[0] || null;

      setActiveRoom(nextRoom);

      if (nextRoom) {
        localStorage.setItem("activeRoomId", nextRoom._id);
      } else {
        localStorage.removeItem("activeRoomId");
      }

      return updatedRooms;
    });
  } catch (err) {
    console.error("Failed to leave room", err);
  }
};


  /* ================= DELETE ROOM ================= */
  const deleteRoom = async (roomId) => {
    try {
      await api.delete(`/rooms/${roomId}/delete`);

      setRooms((prevRooms) => {
        const updatedRooms = prevRooms.filter(
          (r) => r._id !== roomId
        );

        const nextRoom = updatedRooms[0] || null;
        setActiveRoom(nextRoom);

        if (nextRoom) {
          localStorage.setItem("activeRoomId", nextRoom._id);
        } else {
          localStorage.removeItem("activeRoomId");
        }

        return updatedRooms;
      });
    } catch (err) {
      console.error("Failed to delete room", err);
    }
  };

  /* ================= AUTH CHANGE ================= */
  useEffect(() => {
    if (user) {
      fetchRooms();
    } else {
      setRooms([]);
      setActiveRoom(null);
      setMembers([]);
      localStorage.removeItem("activeRoomId");
    }
  }, [user]);

  /* ================= ACTIVE ROOM CHANGE ================= */
  useEffect(() => {
    if (activeRoom?._id) {
      localStorage.setItem("activeRoomId", activeRoom._id);
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
        deleteRoom,
        leaveRoom,
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
