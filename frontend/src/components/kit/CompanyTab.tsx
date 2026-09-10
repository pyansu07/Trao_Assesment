"use client";

import type { GenerationMeta, Kit } from "@/lib/types";
import type { useKit } from "@/lib/useKit";
import { AutoSaveField } from "@/components/AutoSaveField";
import { StateBadge } from "@/components/kit/StateBadge";
import { SectionHeader } from "@/components/kit/SectionHeader";
import { Spinner } from "@/components/Spinner";

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
        <SectionHeader
          icon="Company"
          title="Company brief"
          actions={
            <>
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
                {controls.regenerateCompanyBrief.isPending && <Spinner className="h-3.5 w-3.5" />}
                {controls.regenerateCompanyBrief.isPending ? "Regenerating..." : "Regenerate"}
              </button>
            </>
          }
        />

        <div className="space-y-4">
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
              <p className="label mb-1.5">Sources</p>
              <ul className="space-y-1">
                {company_brief.sources.map((src) => (
                  <li key={src} className="truncate text-xs">
                    <a href={src} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
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
        <SectionHeader icon="Coverage" title="Research summary" />
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
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
            <dd className="font-medium text-slate-900">{source.pages_used.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">JD length</dt>
            <dd className="font-medium text-slate-900">{source.jd_chars.toLocaleString()} characters</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Researched at</dt>
            <dd className="font-medium text-slate-900">{new Date(source.researched_at).toLocaleString()}</dd>
          </div>
        </dl>
        {source.pages_used.length === 0 && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            The company website could not be reached, so this brief is based on the job description alone.
          </p>
        )}
      </div>

      <div className="card">
        <SectionHeader
          icon="Questions"
          title="Public interview discussion"
          subtitle="Used to inform company-fit questions, not treated as confirmed fact."
        />
        {meta?.interviewDiscussion?.found && meta.interviewDiscussion.results.length > 0 ? (
          <ul className="space-y-3">
            {meta.interviewDiscussion.results.map((hit) => (
              <li key={hit.url} className="rounded-lg border border-slate-100 p-3 text-sm">
                <a href={hit.url} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">
                  {hit.title}
                </a>
                <p className="mt-1 text-xs text-slate-500">{hit.snippet}</p>
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
