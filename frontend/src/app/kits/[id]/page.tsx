"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import { Navbar } from "@/components/Navbar";
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
    return <p className="p-8 text-sm text-slate-500">Loading kit...</p>;
  }
  if (kit.query.isError || !kit.query.data) {
    return <p className="p-8 text-sm text-red-600">Could not load this kit.</p>;
  }

  const data = kit.query.data.kit;
  const meta = kit.query.data.meta;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{data.source.company || "Untitled kit"}</h1>
            <p className="text-sm text-slate-500">
              {data.role.title || data.source.role} &middot; {data.schedule.days_available}-day plan
            </p>
          </div>
          <button className="btn-danger text-xs" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete kit"}
          </button>
        </div>
        {deleteError && <p className="mb-4 text-sm text-red-600">{deleteError}</p>}

        <nav className="mb-6 flex flex-wrap gap-1 border-b border-slate-200" role="tablist" aria-label="Kit sections">
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
              className={`px-3 py-2 text-sm font-medium ${
                tab === t
                  ? "border-b-2 border-brand-600 text-brand-700"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        <div id={`tabpanel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={-1}>
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
