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
    return (
      <div className="card animate-fade-in-up flex flex-col items-center py-14 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
            <path d="M5 8.5A1.5 1.5 0 0 1 6.5 7h11A1.5 1.5 0 0 1 19 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5v-9Z" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <p className="text-sm text-slate-500">Add some flashcards first to start practicing.</p>
      </div>
    );
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
      <div className="card animate-fade-in-up flex flex-col items-center py-14 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
            <path d="M4 10.5 8 14l8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-900">You&apos;ve been through every flashcard this round.</p>
        <p className="mt-1 text-sm text-slate-500">Nice work &mdash; come back later and weak cards surface first.</p>
        <button
          className="btn-primary mt-5"
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
    <div className="mx-auto max-w-lg animate-fade-in-up space-y-5">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-medium">
          Card {index + 1} of {queue.length}
        </span>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-500 ease-out"
            style={{ width: `${((index + 1) / queue.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="[perspective:1200px]">
        <button
          type="button"
          onClick={() => !revealed && setRevealed(true)}
          className={`relative min-h-[240px] w-full rounded-2xl border border-slate-200/70 bg-white p-6 text-left shadow-card transition-transform duration-500 [transform-style:preserve-3d] ${
            revealed ? "[transform:rotateY(180deg)]" : "cursor-pointer hover:shadow-card-hover"
          }`}
        >
          {/* front */}
          <div className="absolute inset-0 flex flex-col p-6 [backface-visibility:hidden]">
            <p className="mb-4 text-xs font-medium uppercase tracking-wide text-brand-500">Question</p>
            <p className="flex-1 text-lg font-medium leading-relaxed text-slate-900">{card.front}</p>
            <p className="mt-4 text-xs text-slate-400">Click to reveal the answer</p>
          </div>
          {/* back */}
          <div className="absolute inset-0 flex flex-col p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="mb-4 text-xs font-medium uppercase tracking-wide text-emerald-600">Answer</p>
            <p className="flex-1 text-lg leading-relaxed text-slate-900">{card.back}</p>
          </div>
        </button>
      </div>

      {!revealed ? (
        <button className="btn-primary w-full" onClick={() => setRevealed(true)}>
          Reveal answer
        </button>
      ) : (
        <div className="grid animate-fade-in grid-cols-3 gap-2">
          <button
            className="btn bg-rose-50 text-rose-700 hover:bg-rose-100"
            disabled={controls.practiceFlashcard.isPending}
            onClick={() => handleConfidence("low")}
          >
            Low
          </button>
          <button
            className="btn bg-amber-50 text-amber-700 hover:bg-amber-100"
            disabled={controls.practiceFlashcard.isPending}
            onClick={() => handleConfidence("medium")}
          >
            Medium
          </button>
          <button
            className="btn bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            disabled={controls.practiceFlashcard.isPending}
            onClick={() => handleConfidence("high")}
          >
            High
          </button>
        </div>
      )}
    </div>
  );
}
