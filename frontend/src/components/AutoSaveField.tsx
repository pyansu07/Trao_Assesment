"use client";

import { useEffect, useRef, useState } from "react";

type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

interface AutoSaveFieldProps {
  value: string;
  onSave: (value: string) => Promise<unknown>;
  multiline?: boolean;
  className?: string;
  ariaLabel?: string;
  debounceMs?: number;
}

/**
 * A text field that updates local state immediately (so typing feels
 * instant) and persists via `onSave` after the user pauses typing, rather
 * than on every keystroke. Shows a small save-state indicator and recovers
 * gracefully (keeps the local edit, flags the error) if persistence fails.
 */
export function AutoSaveField({ value, onSave, multiline, className, ariaLabel, debounceMs = 800 }: AutoSaveFieldProps) {
  const [local, setLocal] = useState(value);
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedExternalValue = useRef(value);

  useEffect(() => {
    // reflect external updates (e.g. regeneration) unless the user has a
    // pending local edit that hasn't been saved yet
    if (value !== lastSavedExternalValue.current && state !== "pending" && state !== "saving") {
      setLocal(value);
      lastSavedExternalValue.current = value;
    }
  }, [value, state]);

  function handleChange(next: string) {
    setLocal(next);
    setState("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setState("saving");
      try {
        await onSave(next);
        lastSavedExternalValue.current = next;
        setState("saved");
        setTimeout(() => setState((s) => (s === "saved" ? "idle" : s)), 1500);
      } catch {
        setState("error");
      }
    }, debounceMs);
  }

  const Field = multiline ? "textarea" : "input";
  const ringClass =
    state === "error"
      ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
      : state === "saving"
        ? "border-brand-200"
        : "";

  return (
    <div className="relative">
      <Field
        aria-label={ariaLabel}
        className={`${className ?? "input"} ${ringClass}`}
        value={local}
        rows={multiline ? 4 : undefined}
        onChange={(e) => handleChange(e.target.value)}
      />
      <SaveIndicator state={state} />
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const config = {
    pending: { label: "Editing", dot: "bg-slate-300", text: "text-slate-400" },
    saving: { label: "Saving", dot: "bg-brand-400 animate-pulse", text: "text-slate-400" },
    saved: { label: "Saved", dot: "bg-emerald-500", text: "text-emerald-600" },
    error: { label: "Failed to save", dot: "bg-rose-500", text: "text-rose-600" },
  }[state];
  return (
    <span className={`mt-1 flex items-center gap-1.5 text-xs ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
