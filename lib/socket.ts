import { io, type Socket } from "socket.io-client";
import { DEV_USER_ID } from "@/lib/api";

const SOCKET_URL = (process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8000").replace(/\/$/, "");

let socket: Socket | null = null;

export function getGameSocket(): Socket {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    withCredentials: true,
    auth: DEV_USER_ID ? { user_id: DEV_USER_ID } : undefined,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5_000,
    timeout: 8_000,
  });

  return socket;
}

export { SOCKET_URL };
