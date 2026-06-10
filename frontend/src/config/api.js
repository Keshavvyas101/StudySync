const LOCAL_API_URL = "http://localhost:4000";
const PRODUCTION_API_URL = "https://studysync-er5s.onrender.com";

const apiUrl =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? LOCAL_API_URL : PRODUCTION_API_URL);

export const API_ORIGIN = apiUrl.replace(/\/+$/, "").replace(/\/api$/, "");
export const API_BASE_URL = `${API_ORIGIN}/api`;
