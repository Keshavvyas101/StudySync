import { io } from "socket.io-client";
import { API_ORIGIN } from "../config/api";

const socket = io(API_ORIGIN, {
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
