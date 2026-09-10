"use client";

import { useMemo, useState } from "react";
import type { Confidence, Kit } from "@/lib/types";
import type { useKit } from "@/lib/useKit";

interface Props {
  kit: Kit;
  controls: ReturnType<typeof useKit>;
}

function weightFor(confidence: Confidence | null): number {
  // low confidence first, then never-practiced, then medium, then high
  if (confidence === "low") return 0;
  if (confidence === null) return 1;
  if (confidence === "medium") return 2;
  return 3; // high
}

export function PracticeMode({ kit, controls }: Props) {
  // Weakest material first: low confidence, then never-practiced, then
  // medium, then high - so review time goes where it's most needed.
  const queue = useMemo(
    () => [...kit.flashcards].sort((a, b) => weightFor(a.practice.confidence) - weightFor(b.practice.confidence)),
    [kit.flashcards],
  );
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (kit.flashcards.length === 0) {
    return <p className="card text-sm text-slate-500">Add some flashcards first to start practicing.</p>;
  }

  const card = queue[Math.min(index, queue.length - 1)];
  const done = index >= queue.length;

  async function handleConfidence(confidence: Confidence) {
    await controls.practiceFlashcard.mutateAsync({ fid: card.id, confidence });
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  if (done) {
    return (
      <div className="card text-center">
        <p className="text-sm text-slate-700">You&apos;ve been through every flashcard this round.</p>
        <button
          className="btn-primary mt-4"
          onClick={() => {
            setIndex(0);
            setRevealed(false);
          }}
        >
          Practice again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Card {index + 1} of {queue.length}
        </span>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-brand-500" style={{ width: `${((index + 1) / queue.length) * 100}%` }} />
        </div>
      </div>

      <div className="card min-h-[220px]">
        <p className="mb-4 text-xs uppercase tracking-wide text-slate-400">
          {revealed ? "Answer" : "Question"}
        </p>
        <p className="text-base text-slate-900">{revealed ? card.back : card.front}</p>
      </div>

      {!revealed ? (
        <button className="btn-primary w-full" onClick={() => setRevealed(true)}>
          Reveal answer
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <button
            className="btn bg-red-100 text-red-800 hover:bg-red-200"
            disabled={controls.practiceFlashcard.isPending}
            onClick={() => handleConfidence("low")}
          >
            Low confidence
          </button>
          <button
            className="btn bg-amber-100 text-amber-800 hover:bg-amber-200"
            disabled={controls.practiceFlashcard.isPending}
            onClick={() => handleConfidence("medium")}
          >
            Medium
          </button>
          <button
            className="btn bg-green-100 text-green-800 hover:bg-green-200"
            disabled={controls.practiceFlashcard.isPending}
            onClick={() => handleConfidence("high")}
          >
            High confidence
          </button>
        </div>
      )}
    </div>
  );
}
