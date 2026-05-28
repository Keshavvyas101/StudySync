import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ===============================
     FETCH LOGGED-IN USER
     =============================== */
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
  let mounted = true;

  const initAuth = async () => {
    try {
      const res = await api.get("/users/me");

      if (!mounted) return;

      const userData = res.data.user || res.data;
      setUser(userData || null);
    } catch (err) {
      if (mounted) {
        setUser(null);
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };

  initAuth();

  return () => {
    mounted = false;
  };
}, []);

  /* ===============================
     SOCKET LIFECYCLE (LOCKED)
     =============================== */
  useEffect(() => {
    if (user) {
      connectSocket();
    } else {
      disconnectSocket();
    }
  }, [user]);

  /* ===============================
     LOGOUT
     =============================== */
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout API failed", err);
    } finally {
      setUser(null);
    }
  };

  /* ===============================
     🖼️ AVATAR UPDATE (NEW)
     =============================== */
  const updateUserAvatar = (avatar) => {
    /**
     * avatar shape expected:
     * {
     *   url: String,
     *   publicId: String
     * }
     */
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        avatar,
      };
    });
  };

  const value = {
    user,
    loading,
    fetchMe,
    logout,

    // 👇 NEW (used later by profile upload UI)
    updateUserAvatar,
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
