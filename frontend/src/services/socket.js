import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_API_URL, {
  withCredentials: true,
  autoConnect: false,
});

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export default socket;