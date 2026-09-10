"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { Navbar } from "@/components/Navbar";
import { api } from "@/lib/api";
import type { KitListItem } from "@/lib/types";
import { useSlowLoadHint } from "@/lib/useSlowLoadHint";

function KitCardSkeleton() {
  return (
    <div className="card">
      <div className="skeleton mb-3 h-4 w-2/3" />
      <div className="skeleton mb-2 h-3 w-full" />
      <div className="skeleton mb-4 h-3 w-4/5" />
      <div className="flex items-center justify-between">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-3 w-20" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card animate-fade-in-up flex flex-col items-center py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none">
          <path
            d="M4 6.5A2.5 2.5 0 0 1 6.5 4H16l4 4v9.5A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M9 12h6M9 15.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="text-base font-semibold text-slate-900">No kits yet</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        Paste a job description and a company URL, and we&apos;ll research, generate, and schedule your prep for
        you.
      </p>
      <Link href="/kits/new" className="btn-primary mt-5">
        Create your first kit
      </Link>
    </div>
  );
}

function DashboardContent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["kits"],
    queryFn: () => api.get<{ kits: KitListItem[] }>("/api/kits"),
  });
  const showColdStartHint = useSlowLoadHint(isLoading);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Your interview prep kits</h1>
            <p className="mt-1 text-sm text-slate-500">Pick one up where you left off, or start something new.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/kits/batch" className="btn-secondary">
              Batch upload
            </Link>
            <Link href="/kits/new" className="btn-primary">
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              New kit
            </Link>
          </div>
        </div>

        {isLoading && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <KitCardSkeleton key={i} />
              ))}
            </div>
            {showColdStartHint && (
              <p className="animate-fade-in mt-4 text-center text-xs text-slate-400">
                Still loading &mdash; the free-tier backend can take up to a minute to wake up after being idle.
              </p>
            )}
          </>
        )}

        {error && (
          <div className="card border-rose-200 bg-rose-50 text-sm text-rose-700">
            Failed to load your kits. Try refreshing the page.
          </div>
        )}

        {data && data.kits.length === 0 && <EmptyState />}

        {data && data.kits.length > 0 && (
          <div className="grid animate-fade-in gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.kits.map((kit) => {
              const uncovered = kit.coverage.uncovered_requirement_ids.length;
              return (
                <Link key={kit._id} href={`/kits/${kit._id}`} className="card-interactive block">
                  <h2 className="font-semibold text-slate-900">{kit.source.company || "Unknown company"}</h2>
                  <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{kit.company_brief?.summary}</p>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="badge bg-slate-100 text-slate-600">
                      {kit.schedule.days_available}-day plan
                    </span>
                    <span className={`badge ${uncovered === 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {uncovered === 0 ? "Fully covered" : `${uncovered} gap${uncovered === 1 ? "" : "s"}`}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
