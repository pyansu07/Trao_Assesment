"use client";

import { Spinner } from "./Spinner";
import { LogoMark } from "./Logo";
import { useSlowLoadHint } from "@/lib/useSlowLoadHint";

interface LoadingScreenProps {
  label?: string;
}

/**
 * Full-page loading state. The backend runs on a free tier that sleeps
 * after inactivity, so a first load can genuinely take 30-60s - after a
 * few seconds this swaps in an explanation instead of just spinning
 * silently, which is the difference between "feels broken" and "feels fine".
 */
export function LoadingScreen({ label = "Loading" }: LoadingScreenProps) {
  const showColdStartHint = useSlowLoadHint(true, 3500);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-50 px-6">
      <div className="relative">
        <LogoMark className="h-12 w-12 animate-pulse" />
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Spinner className="h-4 w-4 text-brand-500" />
        <span>{label}&hellip;</span>
      </div>
      <div
        className={`max-w-xs text-center text-xs text-slate-400 transition-opacity duration-500 ${
          showColdStartHint ? "opacity-100" : "opacity-0"
        }`}
        aria-live="polite"
      >
        The backend runs on a free tier and can take up to a minute to wake up
        after being idle. Hang tight &mdash; this only happens on the first
        request.
      </div>
    </div>
  );
}
