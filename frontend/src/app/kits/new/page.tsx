"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import { Navbar } from "@/components/Navbar";
import { GenerationProgress } from "@/components/GenerationProgress";
import { Spinner } from "@/components/Spinner";
import { api, ApiError } from "@/lib/api";

function NewKitContent() {
  const router = useRouter();
  const [jd, setJd] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [days, setDays] = useState(7);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ runId: string }>("/api/kits", { jd, company_url: companyUrl, days });
      setRunId(res.runId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create a new kit</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          Paste the job description, add the company&apos;s website, and choose how many days you have.{" "}
          <Link href="/kits/batch" className="font-medium text-brand-600 hover:underline">
            Preparing for several roles? Use batch upload →
          </Link>
        </p>

        {runId ? (
          <GenerationProgress
            runId={runId}
            onComplete={(kitId) => router.replace(`/kits/${kitId}`)}
            onFailed={(message) => setError(message)}
          />
        ) : (
          <form onSubmit={handleSubmit} className="card animate-fade-in-up space-y-5">
            <div>
              <label className="label" htmlFor="jd">
                Job description
              </label>
              <textarea
                id="jd"
                required
                minLength={1}
                maxLength={20000}
                rows={10}
                className="input resize-y"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full job description here..."
              />
              <p className="mt-1 text-right text-xs text-slate-400">{jd.length.toLocaleString()}/20,000</p>
            </div>
            <div>
              <label className="label" htmlFor="companyUrl">
                Company website URL
              </label>
              <input
                id="companyUrl"
                type="url"
                required
                className="input"
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="label" htmlFor="days">
                Days until interview
              </label>
              <input
                id="days"
                type="number"
                required
                min={1}
                max={60}
                className="input"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-slate-400">Between 1 and 60 days.</p>
            </div>
            {error && (
              <p role="alert" className="animate-fade-in rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                {error}
              </p>
            )}
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting && <Spinner className="h-4 w-4" light />}
              {submitting ? "Starting generation..." : "Generate kit"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

export default function NewKitPage() {
  return (
    <RequireAuth>
      <NewKitContent />
    </RequireAuth>
  );
}
