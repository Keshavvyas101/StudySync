import { createContext, useContext, useState } from "react";
import api from "../services/api";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRoomMembers = async (roomId) => {
    try {
      setLoading(true);
      const res = await api.get(`/rooms/${roomId}/members`);
      setUsers(res.data.members);
    } catch (err) {
      console.error("Failed to fetch members", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider
      value={{ users, loading, fetchRoomMembers }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUsers = () => {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUsers must be used within UserProvider");
  }
  return ctx;
};
