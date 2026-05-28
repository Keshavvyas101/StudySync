import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const api = axios.create({
  baseURL: import.meta.env.DEV ? "/api" : `${API_URL}/api`,
  withCredentials: true,
  headers: {
    "Cache-Control": "no-cache",
  },
});

export default api;