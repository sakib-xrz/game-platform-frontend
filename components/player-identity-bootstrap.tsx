"use client";

import { useEffect } from "react";
import { capturePlayerIdentity, getPlayerToken } from "@/lib/player-identity";
import { initGameBridge } from "@/lib/game-bridge";
import { verifyIntegrationSession } from "@/lib/api";

/**
 * Runs on every page load so launch_url `?token=` or `?user=` is stored before the user
 * interacts with games. Also initializes the standard host bi-directional bridge.
 */
export function PlayerIdentityBootstrap() {
  useEffect(() => {
    capturePlayerIdentity();
    initGameBridge();

    const token = getPlayerToken();
    if (token) {
      void verifyIntegrationSession();
    }
  }, []);

  // Also capture during first client render (before paint effects).
  if (typeof window !== "undefined") {
    capturePlayerIdentity();
  }

  return null;
}
