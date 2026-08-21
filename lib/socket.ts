import { io, type Socket } from "socket.io-client";
import { getPlayerUserId } from "@/lib/player-identity";

const SOCKET_URL = (process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8000").replace(/\/$/, "");

let socket: Socket | null = null;

export function getGameSocket(): Socket {
  if (socket) return socket;

  const userId = getPlayerUserId();

  socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    withCredentials: true,
    auth: userId ? { user_id: userId } : undefined,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5_000,
    timeout: 8_000,
  });

  return socket;
}

/** Drop the singleton so the next `getGameSocket()` joins the current player room. */
export function resetGameSocket(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

export { SOCKET_URL };
