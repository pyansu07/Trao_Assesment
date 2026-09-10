import type { Kit } from "@/lib/types";

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
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Requirement coverage</h2>
        <p className="mb-3 text-xs text-slate-500">
          Computed deterministically: a requirement is covered when at least one question references it.
          Generation ran {coverage.passes} pass{coverage.passes === 1 ? "" : "es"}.
        </p>
        {uncovered.length === 0 ? (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            Every requirement is covered by at least one question.
          </p>
        ) : (
          <ul className="space-y-2">
            {uncovered.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <span className={`badge ${r.priority === "must" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"}`}>
                  {r.priority}
                </span>
                <span className="text-slate-700">{r.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Interview weak spots</h2>
        <p className="mb-3 text-xs text-slate-500">
          Requirements without question coverage, plus flashcards you&apos;ve rated low confidence - the
          topics most worth another look before your interview.
        </p>
        {weakRequirementTexts.size === 0 ? (
          <p className="text-sm text-slate-500">No weak spots detected yet - nice work.</p>
        ) : (
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
            {[...weakRequirementTexts].map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded bg-red-50 py-2 text-red-700">{lowConfidenceCards.length} low-confidence cards</div>
          <div className="rounded bg-amber-50 py-2 text-amber-700">{mediumConfidenceCards.length} medium-confidence</div>
          <div className="rounded bg-slate-50 py-2 text-slate-600">{neverPracticed.length} not yet practiced</div>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">At a glance</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-slate-400">Requirements</dt>
            <dd>{role.requirements.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Questions</dt>
            <dd>{questions.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Flashcards</dt>
            <dd>{flashcards.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Uncovered</dt>
            <dd>{coverage.uncovered_requirement_ids.length}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
