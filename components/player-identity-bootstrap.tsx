"use client";

import { useEffect } from "react";
import { capturePlayerIdentity } from "@/lib/player-identity";

/**
 * Runs on every page load so launch_url `?user=` is stored before the user
 * taps a game card. Without this, home never reads the query and games open
 * without identity → 401 Authenticated player identity is required.
 */
export function PlayerIdentityBootstrap() {
  useEffect(() => {
    capturePlayerIdentity();
  }, []);

  // Also capture during first client render (before paint effects).
  if (typeof window !== "undefined") {
    capturePlayerIdentity();
  }

  return null;
}
