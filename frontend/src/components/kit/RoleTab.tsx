import type { Kit } from "@/lib/types";

const PRIORITY_STYLE: Record<string, string> = {
  must: "bg-red-100 text-red-800",
  nice: "bg-slate-100 text-slate-600",
};

export function RoleTab({ kit }: { kit: Kit }) {
  const { role } = kit;

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-900">
          {role.title} <span className="font-normal text-slate-400">&middot; {role.seniority}</span>
        </h2>
        {role.responsibilities.length > 0 && (
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700">
            {role.responsibilities.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Extracted requirements</h2>
        {role.requirements.length === 0 && (
          <p className="text-sm text-slate-500">No requirements were extracted from this job description.</p>
        )}
        <ul className="space-y-2">
          {role.requirements.map((req) => (
            <li key={req.id} className="flex items-start gap-2 text-sm">
              <span className={`badge ${PRIORITY_STYLE[req.priority]}`}>{req.priority}</span>
              <span className="badge bg-brand-50 text-brand-700">{req.kind}</span>
              <span className="text-slate-700">{req.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
