"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { GenerationRun } from "@/lib/types";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/stageLabels";
import { useSlowLoadHint } from "@/lib/useSlowLoadHint";

interface GenerationProgressProps {
  runId: string;
  onComplete: (kitId: string) => void;
  onFailed?: (message: string) => void;
}

export function GenerationProgress({ runId, onComplete, onFailed }: GenerationProgressProps) {
  const [run, setRun] = useState<GenerationRun | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showColdStartHint = useSlowLoadHint(!run, 3500);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await api.get<{ run: GenerationRun }>(`/api/runs/${runId}`);
        if (cancelled) return;
        setRun(res.run);

        if (res.run.status === "completed" && res.run.kitId) {
          onComplete(res.run.kitId);
          return;
        }
        if (res.run.status === "failed") {
          onFailed?.(res.run.error?.message ?? "Generation failed");
          return;
        }
      } catch {
        // transient polling error - keep trying
      }
      if (!cancelled) {
        pollTimer.current = setTimeout(poll, 1500);
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const latestStatusByStage = new Map<string, "started" | "completed" | "failed">();
  for (const event of run?.stages ?? []) {
    latestStatusByStage.set(event.stage, event.status);
  }
  const completedCount = STAGE_ORDER.filter((s) => latestStatusByStage.get(s) === "completed").length;
  const progressPct = Math.round((completedCount / STAGE_ORDER.length) * 100);

  return (
    <div className="card animate-fade-in-up">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Generating your kit&hellip;</h2>
        <span className="text-xs font-medium text-brand-600">{progressPct}%</span>
      </div>
      <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <ul className="space-y-0.5">
        {STAGE_ORDER.map((stage, index) => {
          const status = latestStatusByStage.get(stage);
          const isLast = index === STAGE_ORDER.length - 1;
          return (
            <li key={stage} className="relative flex gap-3 pb-4">
              {!isLast && (
                <span
                  className={`absolute left-[9px] top-5 h-full w-px ${
                    status === "completed" ? "bg-brand-300" : "bg-slate-200"
                  }`}
                />
              )}
              <StatusIcon status={status} />
              <span
                className={`text-sm ${
                  status === "completed"
                    ? "text-slate-400 line-through decoration-slate-300"
                    : status === "started"
                      ? "font-medium text-slate-900"
                      : status === "failed"
                        ? "text-amber-700"
                        : "text-slate-400"
                }`}
              >
                {STAGE_LABELS[stage]}
              </span>
            </li>
          );
        })}
      </ul>

      {showColdStartHint && !run && (
        <p className="animate-fade-in mt-2 text-center text-xs text-slate-400">
          The free-tier backend can take up to a minute to wake up on its first request &mdash; still working.
        </p>
      )}

      {run?.status === "failed" && (
        <p className="animate-fade-in mt-4 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          {run.error?.message ?? "Generation failed."}
        </p>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status?: "started" | "completed" | "failed" }) {
  if (status === "completed") {
    return (
      <span className="relative z-10 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
        <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none">
          <path d="M4 10.5 8 14l8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="relative z-10 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-400 text-white text-[10px] font-bold">
        !
      </span>
    );
  }
  if (status === "started") {
    return (
      <span className="relative z-10 flex h-5 w-5 flex-shrink-0 items-center justify-center">
        <span className="absolute h-5 w-5 animate-ping rounded-full bg-brand-400 opacity-40" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-brand-500" />
      </span>
    );
  }
  return <span className="relative z-10 h-5 w-5 flex-shrink-0 rounded-full border-2 border-slate-200 bg-white" />;
}
