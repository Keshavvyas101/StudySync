import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Fetch logged-in user (on app load)
  const fetchMe = async () => {
    try {
      const res = await api.get("/users/me");
      const userData = res.data.user || res.data;
      setUser(userData || null);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  // 🔐 SOCKET LIFECYCLE (LOCKED HERE)
  useEffect(() => {
    if (user) {
      connectSocket(); // ✅ connect once when user exists
    } else {
      disconnectSocket(); // ✅ disconnect on logout / auth loss
    }
  }, [user]);

  // 🔹 LOGOUT
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout API failed", err);
    } finally {
      setUser(null); // triggers socket disconnect via effect
    }
  };

  const value = {
    user,
    loading,
    fetchMe,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
};
