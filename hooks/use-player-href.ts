"use client";

import { useEffect, useState } from "react";
import { getPlayerUserId, withPlayerQuery } from "@/lib/player-identity";

/**
 * Resolve a pathname with `?user=` without hydrating a different `href`
 * than the server rendered. `ssrUserId` should come from page `searchParams`
 * so launch URLs still include identity in the HTML.
 */
export function usePlayerHref(href: string | undefined, ssrUserId = ""): string | undefined {
  const [browserUserId, setBrowserUserId] = useState<string | null>(null);

  useEffect(() => {
    setBrowserUserId(getPlayerUserId());
  }, []);

  if (!href) return undefined;
  return withPlayerQuery(href, browserUserId ?? ssrUserId);
}
