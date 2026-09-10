"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import { Navbar } from "@/components/Navbar";
import { Spinner } from "@/components/Spinner";
import { TabIcon } from "@/components/TabIcon";
import { useSlowLoadHint } from "@/lib/useSlowLoadHint";
import { useKit } from "@/lib/useKit";
import { api, ApiError } from "@/lib/api";
import { CompanyTab } from "@/components/kit/CompanyTab";
import { RoleTab } from "@/components/kit/RoleTab";
import { QuestionsTab } from "@/components/kit/QuestionsTab";
import { FlashcardsTab } from "@/components/kit/FlashcardsTab";
import { ScheduleTab } from "@/components/kit/ScheduleTab";
import { CoverageTab } from "@/components/kit/CoverageTab";
import { PracticeMode } from "@/components/kit/PracticeMode";

const TABS = ["Company", "Role", "Questions", "Flashcards", "Schedule", "Coverage", "Practice"] as const;
type Tab = (typeof TABS)[number];

function KitDetailSkeleton() {
  const showColdStartHint = useSlowLoadHint(true, 3500);
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="skeleton mb-2 h-7 w-56" />
        <div className="skeleton mb-6 h-4 w-40" />
        <div className="mb-6 flex gap-2">
          {TABS.map((t) => (
            <div key={t} className="skeleton h-8 w-20 rounded-full" />
          ))}
        </div>
        <div className="card space-y-3">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
          <div className="skeleton h-4 w-3/4" />
        </div>
        {showColdStartHint && (
          <p className="animate-fade-in mt-4 text-center text-xs text-slate-400">
            The free-tier backend can take up to a minute to wake up after being idle &mdash; still loading.
          </p>
        )}
      </main>
    </div>
  );
}

function KitDetailContent() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const kit = useKit(id);
  const [tab, setTab] = useState<Tab>("Company");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm("Delete this kit? This cannot be undone.")) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/api/kits/${id}`);
      router.replace("/dashboard");
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete kit.");
      setDeleting(false);
    }
  }

  if (kit.query.isLoading) {
    return <KitDetailSkeleton />;
  }
  if (kit.query.isError || !kit.query.data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="card border-rose-200 bg-rose-50 text-sm text-rose-700">Could not load this kit.</div>
        </main>
      </div>
    );
  }

  const data = kit.query.data.kit;
  const meta = kit.query.data.meta;
  const uncovered = data.coverage.uncovered_requirement_ids.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {data.source.company || "Untitled kit"}
              </h1>
              <span className={`badge ${uncovered === 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {uncovered === 0 ? "Fully covered" : `${uncovered} gap${uncovered === 1 ? "" : "s"}`}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {data.role.title || data.source.role} &middot; {data.schedule.days_available}-day plan
            </p>
          </div>
          <button className="btn-danger text-xs" onClick={handleDelete} disabled={deleting}>
            {deleting && <Spinner className="h-3.5 w-3.5" />}
            {deleting ? "Deleting..." : "Delete kit"}
          </button>
        </div>
        {deleteError && (
          <p className="animate-fade-in mb-4 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            {deleteError}
          </p>
        )}

        <nav
          className="mb-6 flex flex-wrap gap-1 rounded-xl border border-slate-200/70 bg-white p-1 shadow-soft"
          role="tablist"
          aria-label="Kit sections"
        >
          {TABS.map((t, index) => (
            <button
              key={t}
              id={`tab-${t}`}
              role="tab"
              aria-selected={tab === t}
              aria-controls={`tabpanel-${t}`}
              tabIndex={tab === t ? 0 : -1}
              onClick={() => setTab(t)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  const delta = e.key === "ArrowRight" ? 1 : -1;
                  const next = TABS[(index + delta + TABS.length) % TABS.length];
                  setTab(next);
                  document.getElementById(`tab-${next}`)?.focus();
                }
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                tab === t ? "bg-brand-600 text-white shadow-soft" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              <TabIcon name={t} className="h-4 w-4" />
              {t}
            </button>
          ))}
        </nav>

        <div id={`tabpanel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={-1} className="animate-fade-in">
          {tab === "Company" && <CompanyTab kit={data} controls={kit} meta={meta} />}
          {tab === "Role" && <RoleTab kit={data} />}
          {tab === "Questions" && <QuestionsTab kit={data} controls={kit} />}
          {tab === "Flashcards" && <FlashcardsTab kit={data} controls={kit} />}
          {tab === "Schedule" && <ScheduleTab kit={data} controls={kit} />}
          {tab === "Coverage" && <CoverageTab kit={data} />}
          {tab === "Practice" && <PracticeMode kit={data} controls={kit} />}
        </div>
      </main>
    </div>
  );
}

export default function KitDetailPage() {
  return (
    <RequireAuth>
      <KitDetailContent />
    </RequireAuth>
  );
}
