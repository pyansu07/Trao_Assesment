"use client";

import type { GenerationMeta, Kit } from "@/lib/types";
import type { useKit } from "@/lib/useKit";
import { AutoSaveField } from "@/components/AutoSaveField";
import { StateBadge } from "@/components/kit/StateBadge";

interface Props {
  kit: Kit;
  controls: ReturnType<typeof useKit>;
  meta?: GenerationMeta;
}

export function CompanyTab({ kit, controls, meta }: Props) {
  const { company_brief, source } = kit;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Company brief</h2>
          <div className="flex items-center gap-2">
            <StateBadge state={company_brief.state} />
            <button
              className="btn-secondary text-xs"
              onClick={() => controls.pinCompanyBrief.mutate(company_brief.state !== "pinned")}
            >
              {company_brief.state === "pinned" ? "Unpin" : "Pin"}
            </button>
            <button
              className="btn-secondary text-xs"
              disabled={controls.regenerateCompanyBrief.isPending}
              onClick={() => {
                const force = company_brief.state !== "generated" ? confirm("This brief has been edited/pinned. Overwrite it with a freshly regenerated version?") : false;
                if (company_brief.state !== "generated" && !force) return;
                controls.regenerateCompanyBrief.mutate(force);
              }}
            >
              {controls.regenerateCompanyBrief.isPending ? "Regenerating..." : "Regenerate"}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Summary</label>
            <AutoSaveField
              multiline
              className="input"
              value={company_brief.summary}
              onSave={(summary) => controls.updateCompanyBrief.mutateAsync({ summary })}
              ariaLabel="Company summary"
            />
          </div>
          <div>
            <label className="label">What they do</label>
            <AutoSaveField
              multiline
              className="input"
              value={company_brief.what_they_do}
              onSave={(what_they_do) => controls.updateCompanyBrief.mutateAsync({ what_they_do })}
              ariaLabel="What the company does"
            />
          </div>
          {company_brief.sources.length > 0 && (
            <div>
              <p className="label mb-1">Sources</p>
              <ul className="space-y-1 text-xs text-brand-600">
                {company_brief.sources.map((src) => (
                  <li key={src} className="truncate">
                    <a href={src} target="_blank" rel="noreferrer" className="hover:underline">
                      {src}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Research summary</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-400">Company URL</dt>
            <dd className="truncate">
              <a href={source.company_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                {source.company_url}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Pages researched</dt>
            <dd>{source.pages_used.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">JD length</dt>
            <dd>{source.jd_chars} characters</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Researched at</dt>
            <dd>{new Date(source.researched_at).toLocaleString()}</dd>
          </div>
        </dl>
        {source.pages_used.length === 0 && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            The company website could not be reached, so this brief is based on the job description alone.
          </p>
        )}
      </div>

      <div className="card">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Public interview discussion</h2>
        <p className="mb-3 text-xs text-slate-500">
          Public search results about this company&apos;s interview process - used to inform company-fit
          questions, not treated as confirmed fact.
        </p>
        {meta?.interviewDiscussion?.found && meta.interviewDiscussion.results.length > 0 ? (
          <ul className="space-y-2">
            {meta.interviewDiscussion.results.map((hit) => (
              <li key={hit.url} className="text-sm">
                <a href={hit.url} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">
                  {hit.title}
                </a>
                <p className="text-xs text-slate-500">{hit.snippet}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">
            {meta?.interviewDiscussion?.note ?? "No public discussion of this company's interview process was found."}
          </p>
        )}
      </div>
    </div>
  );
}
