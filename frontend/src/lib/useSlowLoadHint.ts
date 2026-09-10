"use client";

import { useEffect, useState } from "react";

/**
 * Render's free tier spins the backend down after ~15 minutes idle; the
 * first request after that can take 30-60s to wake it. A loading spinner
 * with no explanation reads as broken at that point. This returns true once
 * `loading` has been true for longer than `delayMs`, so callers can swap in
 * a reassuring "waking up the server" message only when it's actually
 * relevant - a fast, normal load never shows it.
 */
export function useSlowLoadHint(loading: boolean, delayMs = 3500): boolean {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowHint(false);
      return;
    }
    const timer = setTimeout(() => setShowHint(true), delayMs);
    return () => clearTimeout(timer);
  }, [loading, delayMs]);

  return showHint;
}
