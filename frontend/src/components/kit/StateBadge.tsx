import type { ContentState } from "@/lib/types";

const STYLES: Record<ContentState, string> = {
  generated: "bg-slate-100 text-slate-600",
  edited: "bg-blue-100 text-blue-800",
  pinned: "bg-amber-100 text-amber-800",
};

export function StateBadge({ state }: { state: ContentState }) {
  return <span className={`badge ${STYLES[state]}`}>{state}</span>;
}
