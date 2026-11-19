import { io, type Socket } from "socket.io-client";
import { getPlayerApp, getPlayerToken, getPlayerUserId } from "@/lib/player-identity";

const SOCKET_URL = (process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8000").replace(/\/$/, "");

let socket: Socket | null = null;

export function getGameSocket(): Socket {
  if (socket) return socket;

  const userId = getPlayerUserId();
  const token = getPlayerToken();
  const app = getPlayerApp();
  // Host players are identified by their signed token (mapped server-side to
  // the internal id); user_id is kept for legacy non-host launches.
  const auth: Record<string, string> = {};
  if (userId) auth.user_id = userId;
  if (token) auth.token = token;
  if (app) auth.app = app;

  socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    withCredentials: true,
    auth: Object.keys(auth).length ? auth : undefined,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5_000,
    timeout: 8_000,
  });

  return socket;
}

export { SOCKET_URL };
