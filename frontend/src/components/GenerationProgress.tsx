"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { GenerationRun } from "@/lib/types";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/stageLabels";

interface GenerationProgressProps {
  runId: string;
  onComplete: (kitId: string) => void;
  onFailed?: (message: string) => void;
}

export function GenerationProgress({ runId, onComplete, onFailed }: GenerationProgressProps) {
  const [run, setRun] = useState<GenerationRun | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <div className="card">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Generating your kit...</h2>
      <ul className="space-y-2">
        {STAGE_ORDER.map((stage) => {
          const status = latestStatusByStage.get(stage);
          return (
            <li key={stage} className="flex items-center gap-2 text-sm">
              <StatusIcon status={status} />
              <span className={status === "completed" ? "text-slate-500 line-through" : "text-slate-800"}>
                {STAGE_LABELS[stage]}
              </span>
            </li>
          );
        })}
      </ul>
      {run?.status === "failed" && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {run.error?.message ?? "Generation failed."}
        </p>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status?: "started" | "completed" | "failed" }) {
  if (status === "completed") {
    return <span className="h-4 w-4 flex-shrink-0 rounded-full bg-green-500" aria-label="completed" />;
  }
  if (status === "failed") {
    return <span className="h-4 w-4 flex-shrink-0 rounded-full bg-amber-500" aria-label="issue" />;
  }
  if (status === "started") {
    return (
      <span
        className="h-4 w-4 flex-shrink-0 animate-pulse rounded-full bg-brand-500"
        aria-label="in progress"
      />
    );
  }
  return <span className="h-4 w-4 flex-shrink-0 rounded-full border border-slate-300" aria-label="pending" />;
}
