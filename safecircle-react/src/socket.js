import { io } from "socket.io-client";
import store from "./redux/store";

const BACKEND_URL = import.meta.env.VITE_API_URL || "";

export const socket = io(BACKEND_URL, { autoConnect: false });

// Connect with JWT auth token
export function connectSocket() {
  const token = store.getState().auth.token;
  if (!token) return;
  socket.auth = { token };
  if (!socket.connected) socket.connect();
}

// Disconnect cleanly
export function disconnectSocket() {
  socket.disconnect();
}

export default socket;