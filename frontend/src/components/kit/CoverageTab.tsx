import type { Kit } from "@/lib/types";
import { SectionHeader } from "@/components/kit/SectionHeader";

export function CoverageTab({ kit }: { kit: Kit }) {
  const { coverage, role, flashcards, questions } = kit;
  const uncovered = role.requirements.filter((r) => coverage.uncovered_requirement_ids.includes(r.id));
  const lowConfidenceCards = flashcards.filter((f) => f.practice.confidence === "low");
  const mediumConfidenceCards = flashcards.filter((f) => f.practice.confidence === "medium");
  const neverPracticed = flashcards.filter((f) => f.practice.confidence === null);

  const weakRequirementTexts = new Set(uncovered.map((r) => r.text));
  for (const f of lowConfidenceCards) {
    for (const rid of f.requirement_ids) {
      const req = role.requirements.find((r) => r.id === rid);
      if (req) weakRequirementTexts.add(req.text);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <SectionHeader
          icon="Coverage"
          title="Requirement coverage"
          subtitle={`Computed deterministically — a requirement is covered when at least one question references it. Generation ran ${coverage.passes} pass${coverage.passes === 1 ? "" : "es"}.`}
        />
        {uncovered.length === 0 ? (
          <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
            <svg viewBox="0 0 20 20" className="h-4 w-4 flex-shrink-0" fill="none">
              <path d="M4 10.5 8 14l8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Every requirement is covered by at least one question.
          </p>
        ) : (
          <ul className="space-y-2">
            {uncovered.map((r) => (
              <li key={r.id} className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/50 p-2.5 text-sm">
                <span className={`badge flex-shrink-0 ${r.priority === "must" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"}`}>
                  {r.priority}
                </span>
                <span className="text-slate-700">{r.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <SectionHeader
          icon="Practice"
          title="Interview weak spots"
          subtitle="Requirements without question coverage, plus flashcards you've rated low confidence."
        />
        {weakRequirementTexts.size === 0 ? (
          <p className="text-sm text-slate-500">No weak spots detected yet &mdash; nice work.</p>
        ) : (
          <ul className="mb-4 space-y-1.5">
            {[...weakRequirementTexts].map((text) => (
              <li key={text} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                {text}
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-rose-50 py-2.5">
            <p className="text-lg font-semibold text-rose-700">{lowConfidenceCards.length}</p>
            <p className="text-[11px] text-rose-600">low confidence</p>
          </div>
          <div className="rounded-lg bg-amber-50 py-2.5">
            <p className="text-lg font-semibold text-amber-700">{mediumConfidenceCards.length}</p>
            <p className="text-[11px] text-amber-600">medium confidence</p>
          </div>
          <div className="rounded-lg bg-slate-100 py-2.5">
            <p className="text-lg font-semibold text-slate-600">{neverPracticed.length}</p>
            <p className="text-[11px] text-slate-500">not yet practiced</p>
          </div>
        </div>
      </div>

      <div className="card">
        <SectionHeader icon="Role" title="At a glance" />
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-slate-400">Requirements</dt>
            <dd className="text-lg font-semibold text-slate-900">{role.requirements.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Questions</dt>
            <dd className="text-lg font-semibold text-slate-900">{questions.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Flashcards</dt>
            <dd className="text-lg font-semibold text-slate-900">{flashcards.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Uncovered</dt>
            <dd className={`text-lg font-semibold ${coverage.uncovered_requirement_ids.length === 0 ? "text-emerald-600" : "text-amber-600"}`}>
              {coverage.uncovered_requirement_ids.length}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
