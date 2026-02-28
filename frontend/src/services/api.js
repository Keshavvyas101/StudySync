import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://studysync-er5s.onrender.com";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    "Cache-Control": "no-cache",
  },
});

export default api;