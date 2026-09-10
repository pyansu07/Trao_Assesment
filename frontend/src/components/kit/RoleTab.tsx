import type { Kit } from "@/lib/types";
import { SectionHeader } from "@/components/kit/SectionHeader";

const PRIORITY_STYLE: Record<string, string> = {
  must: "bg-rose-100 text-rose-800",
  nice: "bg-slate-100 text-slate-600",
};

const KIND_STYLE: Record<string, string> = {
  technical: "bg-brand-50 text-brand-700",
  behavioural: "bg-violet-50 text-violet-700",
  domain: "bg-sky-50 text-sky-700",
};

export function RoleTab({ kit }: { kit: Kit }) {
  const { role } = kit;

  return (
    <div className="space-y-4">
      <div className="card">
        <SectionHeader icon="Role" title={role.title} subtitle={role.seniority} />
        {role.responsibilities.length > 0 && (
          <ul className="space-y-2">
            {role.responsibilities.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
                {r}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <SectionHeader
          icon="Questions"
          title="Extracted requirements"
          subtitle="Stable ids that questions and flashcards reference for coverage tracking."
        />
        {role.requirements.length === 0 && (
          <p className="text-sm text-slate-500">No requirements were extracted from this job description.</p>
        )}
        <ul className="space-y-2">
          {role.requirements.map((req) => (
            <li key={req.id} className="flex items-start gap-2 rounded-lg border border-slate-100 p-3 text-sm">
              <span className={`badge flex-shrink-0 ${PRIORITY_STYLE[req.priority]}`}>{req.priority}</span>
              <span className={`badge flex-shrink-0 ${KIND_STYLE[req.kind] ?? "bg-slate-100 text-slate-600"}`}>
                {req.kind}
              </span>
              <span className="text-slate-700">{req.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
