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

  return (
    <div className="relative">
      <Field
        aria-label={ariaLabel}
        className={className ?? "input"}
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
  const label = { pending: "Editing...", saving: "Saving...", saved: "Saved", error: "Failed to save" }[state];
  const color =
    state === "error" ? "text-red-600" : state === "saved" ? "text-green-600" : "text-slate-400";
  return <span className={`mt-1 block text-xs ${color}`}>{label}</span>;
}
