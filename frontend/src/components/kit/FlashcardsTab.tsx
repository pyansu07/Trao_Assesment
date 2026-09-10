"use client";

import { useState } from "react";
import type { Kit } from "@/lib/types";
import type { useKit } from "@/lib/useKit";
import { AutoSaveField } from "@/components/AutoSaveField";
import { StateBadge } from "@/components/kit/StateBadge";

interface Props {
  kit: Kit;
  controls: ReturnType<typeof useKit>;
}

export function FlashcardsTab({ kit, controls }: Props) {
  const [adding, setAdding] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  async function handleAdd() {
    if (!front.trim() || !back.trim()) return;
    await controls.addFlashcard.mutateAsync({ front, back });
    setFront("");
    setBack("");
    setAdding(false);
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2">
        <p className="text-xs text-slate-500">
          Regenerating replaces auto-generated cards; edited/pinned cards are kept.
        </p>
        <button
          className="btn-secondary ml-auto text-xs"
          disabled={controls.regenerateFlashcards.isPending}
          onClick={() => controls.regenerateFlashcards.mutate(false)}
        >
          {controls.regenerateFlashcards.isPending ? "Regenerating..." : "Regenerate"}
        </button>
        <button className="btn-primary text-xs" onClick={() => setAdding((v) => !v)}>
          {adding ? "Cancel" : "Add flashcard"}
        </button>
      </div>

      {adding && (
        <div className="card space-y-2">
          <textarea className="input" rows={2} placeholder="Front" value={front} onChange={(e) => setFront(e.target.value)} />
          <textarea className="input" rows={2} placeholder="Back" value={back} onChange={(e) => setBack(e.target.value)} />
          <button className="btn-primary text-xs" onClick={handleAdd} disabled={controls.addFlashcard.isPending}>
            Add
          </button>
        </div>
      )}

      {kit.flashcards.length === 0 ? (
        <p className="card text-sm text-slate-500">No flashcards yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {kit.flashcards.map((f) => (
            <div key={f.id} className="card">
              <div className="mb-2 flex items-center gap-2">
                <StateBadge state={f.state} />
                {f.practice.confidence && (
                  <span
                    className={`badge ${
                      f.practice.confidence === "low"
                        ? "bg-red-100 text-red-700"
                        : f.practice.confidence === "medium"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {f.practice.confidence} confidence
                  </span>
                )}
                <div className="ml-auto flex gap-2">
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => controls.pinFlashcard.mutate({ fid: f.id, pinned: f.state !== "pinned" })}
                  >
                    {f.state === "pinned" ? "Unpin" : "Pin"}
                  </button>
                  <button className="btn-danger text-xs" onClick={() => controls.deleteFlashcard.mutate(f.id)}>
                    Delete
                  </button>
                </div>
              </div>
              <label className="label">Front</label>
              <AutoSaveField
                multiline
                value={f.front}
                onSave={(front) => controls.updateFlashcard.mutateAsync({ fid: f.id, patch: { front } })}
                ariaLabel="Flashcard front"
              />
              <label className="label mt-2">Back</label>
              <AutoSaveField
                multiline
                value={f.back}
                onSave={(back) => controls.updateFlashcard.mutateAsync({ fid: f.id, patch: { back } })}
                ariaLabel="Flashcard back"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
