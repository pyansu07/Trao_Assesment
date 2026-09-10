import type { ContentState } from "@/lib/types";

const STYLES: Record<ContentState, string> = {
  generated: "bg-slate-100 text-slate-500",
  edited: "bg-brand-100 text-brand-700",
  pinned: "bg-amber-100 text-amber-700",
};

const DOT: Record<ContentState, string> = {
  generated: "bg-slate-400",
  edited: "bg-brand-500",
  pinned: "bg-amber-500",
};

export function StateBadge({ state }: { state: ContentState }) {
  return (
    <span className={`badge gap-1.5 ${STYLES[state]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[state]}`} />
      {state}
    </span>
  );
}
