"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { Navbar } from "@/components/Navbar";
import { api } from "@/lib/api";
import type { KitListItem } from "@/lib/types";

function DashboardContent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["kits"],
    queryFn: () => api.get<{ kits: KitListItem[] }>("/api/kits"),
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900">Your interview prep kits</h1>
          <div className="flex gap-2">
            <Link href="/kits/batch" className="btn-secondary">
              Batch upload
            </Link>
            <Link href="/kits/new" className="btn-primary">
              New kit
            </Link>
          </div>
        </div>

        {isLoading && <p className="text-sm text-slate-500">Loading kits...</p>}
        {error && <p className="text-sm text-red-600">Failed to load kits.</p>}

        {data && data.kits.length === 0 && (
          <div className="card text-center">
            <p className="text-sm text-slate-500">
              No kits yet. Create one from a job description and company URL to get started.
            </p>
            <Link href="/kits/new" className="btn-primary mt-4 inline-flex">
              Create your first kit
            </Link>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.kits.map((kit) => (
            <Link key={kit._id} href={`/kits/${kit._id}`} className="card block hover:border-brand-400">
              <h2 className="font-medium text-slate-900">{kit.source.company || "Unknown company"}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{kit.company_brief?.summary}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>{kit.schedule.days_available} day plan</span>
                <span>
                  {kit.coverage.uncovered_requirement_ids.length === 0
                    ? "Fully covered"
                    : `${kit.coverage.uncovered_requirement_ids.length} gap(s)`}
                </span>
              </div>
            </Link>
          ))}
        </div>
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
