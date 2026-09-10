"use client";

import { useState } from "react";
import type { Kit } from "@/lib/types";
import type { useKit } from "@/lib/useKit";
import { Spinner } from "@/components/Spinner";

interface Props {
  kit: Kit;
  controls: ReturnType<typeof useKit>;
}

export function ScheduleTab({ kit, controls }: Props) {
  const [days, setDays] = useState(kit.schedule.days_available);
  const questionsById = new Map(kit.questions.map((q) => [q.id, q]));
  const totalMinutes = kit.schedule.days.reduce((sum, d) => sum + d.minutes, 0);

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-700" htmlFor="scheduleDays">
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
            {controls.regenerateSchedule.isPending && <Spinner className="h-3.5 w-3.5" />}
            {controls.regenerateSchedule.isPending ? "Rebuilding..." : "Regenerate schedule"}
          </button>
          <span className="ml-auto badge bg-slate-100 text-slate-600">
            {Math.round(totalMinutes / 60)}h total
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Rebuilds the schedule deterministically from the current question set. This replaces the whole
          schedule (day-level edits aren&apos;t individually preserved, since schedule days don&apos;t carry
          edit state) but never touches your questions, flashcards, or company brief.
        </p>
      </div>

      <ol className="space-y-3">
        {kit.schedule.days.map((day) => (
          <li key={day.day} className="card flex gap-4">
            <div className="flex flex-shrink-0 flex-col items-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-sm font-semibold text-white">
                {day.day}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{day.focus}</h3>
                <span className="badge bg-slate-100 text-slate-600">{day.minutes} min</span>
              </div>
              {day.question_ids.length === 0 ? (
                <p className="text-sm text-slate-400">No questions scheduled.</p>
              ) : (
                <ul className="space-y-1.5">
                  {day.question_ids.map((qid) => (
                    <li key={qid} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-slate-300" />
                      {questionsById.get(qid)?.prompt ?? qid}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
