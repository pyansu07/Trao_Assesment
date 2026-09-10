"use client";

import { useState } from "react";
import type { Kit } from "@/lib/types";
import type { useKit } from "@/lib/useKit";
import { AutoSaveField } from "@/components/AutoSaveField";
import { StateBadge } from "@/components/kit/StateBadge";
import { SectionHeader } from "@/components/kit/SectionHeader";
import { Spinner } from "@/components/Spinner";

interface Props {
  kit: Kit;
  controls: ReturnType<typeof useKit>;
}

const CONFIDENCE_STYLE: Record<string, string> = {
  low: "bg-rose-100 text-rose-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-emerald-100 text-emerald-700",
};

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
      <div className="card">
        <SectionHeader
          icon="Flashcards"
          title="Flashcards"
          subtitle="Regenerating replaces auto-generated cards; edited/pinned cards are kept."
          actions={
            <>
              <button
                className="btn-secondary text-xs"
                disabled={controls.regenerateFlashcards.isPending}
                onClick={() => controls.regenerateFlashcards.mutate(false)}
              >
                {controls.regenerateFlashcards.isPending && <Spinner className="h-3.5 w-3.5" />}
                {controls.regenerateFlashcards.isPending ? "Regenerating..." : "Regenerate"}
              </button>
              <button className="btn-primary text-xs" onClick={() => setAdding((v) => !v)}>
                {adding ? "Cancel" : "+ Add flashcard"}
              </button>
            </>
          }
        />
      </div>

      {adding && (
        <div className="card animate-fade-in-up space-y-2">
          <textarea
            className="input resize-y"
            rows={2}
            placeholder="Front"
            value={front}
            onChange={(e) => setFront(e.target.value)}
          />
          <textarea
            className="input resize-y"
            rows={2}
            placeholder="Back"
            value={back}
            onChange={(e) => setBack(e.target.value)}
          />
          <button className="btn-primary text-xs" onClick={handleAdd} disabled={controls.addFlashcard.isPending}>
            {controls.addFlashcard.isPending && <Spinner className="h-3.5 w-3.5" />}
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
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <StateBadge state={f.state} />
                {f.practice.confidence && (
                  <span className={`badge ${CONFIDENCE_STYLE[f.practice.confidence]}`}>
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
              <label className="label mt-3">Back</label>
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
