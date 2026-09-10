"use client";

import { useState } from "react";
import type { Kit } from "@/lib/types";
import type { useKit } from "@/lib/useKit";

interface Props {
  kit: Kit;
  controls: ReturnType<typeof useKit>;
}

export function ScheduleTab({ kit, controls }: Props) {
  const [days, setDays] = useState(kit.schedule.days_available);
  const questionsById = new Map(kit.questions.map((q) => [q.id, q]));

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-600" htmlFor="scheduleDays">
          Days
        </label>
        <input
          id="scheduleDays"
          type="number"
          min={1}
          max={60}
          className="input w-24"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        />
        <button
          className="btn-secondary text-xs"
          disabled={controls.regenerateSchedule.isPending}
          onClick={() => controls.regenerateSchedule.mutate(days)}
        >
          {controls.regenerateSchedule.isPending ? "Rebuilding..." : "Regenerate schedule"}
        </button>
        <p className="w-full text-xs text-slate-500">
          Rebuilds the schedule deterministically from the current question set. This replaces the whole
          schedule (day-level edits aren&apos;t individually preserved, since schedule days don&apos;t carry
          edit state) but never touches your questions, flashcards, or company brief.
        </p>
      </div>

      <ol className="space-y-3">
        {kit.schedule.days.map((day) => (
          <li key={day.day} className="card">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Day {day.day} &middot; {day.focus}
              </h3>
              <span className="badge bg-slate-100 text-slate-600">{day.minutes} min</span>
            </div>
            {day.question_ids.length === 0 ? (
              <p className="text-sm text-slate-400">No questions scheduled.</p>
            ) : (
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
                {day.question_ids.map((qid) => (
                  <li key={qid}>{questionsById.get(qid)?.prompt ?? qid}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
