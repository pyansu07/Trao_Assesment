"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { Navbar } from "@/components/Navbar";
import { api, ApiError } from "@/lib/api";
import type { GenerationRun } from "@/lib/types";

const SAMPLE = `[
  {
    "id": "case-1",
    "jd": "We are hiring a Backend Engineer with 4+ years of Node.js experience...",
    "company_url": "https://example.com",
    "days": 7
  }
]`;

function BatchContent() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [cases, setCases] = useState<unknown[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [runs, setRuns] = useState<GenerationRun[]>([]);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setCases(Array.isArray(parsed) ? parsed : parsed.cases);
      } catch {
        setParseError("That file isn't valid JSON.");
        setCases(null);
      }
    };
    reader.readAsText(file);
  }

  async function handleSubmit() {
    if (!cases) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ batchId: string; runIds: string[] }>("/api/batch", { cases });
      setBatchId(res.batchId);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!batchId) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await api.get<{ runs: GenerationRun[] }>(`/api/batch/${batchId}`);
        if (cancelled) return;
        setRuns(res.runs);
        const allDone = res.runs.every((r) => r.status === "completed" || r.status === "failed");
        if (!allDone) pollTimer.current = setTimeout(poll, 2000);
      } catch {
        if (!cancelled) pollTimer.current = setTimeout(poll, 3000);
      }
    }
    poll();
    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [batchId]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Batch upload</h1>
        <p className="mb-6 text-sm text-slate-500">
          Upload a JSON file with multiple cases (each with <code>jd</code>, <code>company_url</code>, and{" "}
          <code>days</code>). Cases run one at a time; if one fails, the rest still complete.
        </p>

        {!batchId && (
          <div className="card space-y-4">
            <div>
              <label className="label" htmlFor="batchFile">
                Cases JSON file
              </label>
              <input id="batchFile" type="file" accept="application/json" onChange={handleFile} className="text-sm" />
              {fileName && <p className="mt-1 text-xs text-slate-400">{fileName}</p>}
            </div>
            {parseError && <p className="text-sm text-red-600">{parseError}</p>}
            {cases && <p className="text-sm text-slate-600">{cases.length} case(s) ready to upload.</p>}
            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            <button className="btn-primary w-full" disabled={!cases || submitting} onClick={handleSubmit}>
              {submitting ? "Starting batch..." : "Start batch generation"}
            </button>
            <details className="text-xs text-slate-400">
              <summary className="cursor-pointer">Sample file format</summary>
              <pre className="mt-2 overflow-x-auto rounded bg-slate-100 p-2">{SAMPLE}</pre>
            </details>
          </div>
        )}

        {batchId && (
          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Batch progress</h2>
            <ul className="space-y-2">
              {runs.map((run) => (
                <li key={run._id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{run.input.company_url}</span>
                  <StatusBadge run={run} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link href="/dashboard" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
          Back to dashboard
        </Link>
      </main>
    </div>
  );
}

function StatusBadge({ run }: { run: GenerationRun }) {
  if (run.status === "completed" && run.kitId) {
    return (
      <Link href={`/kits/${run.kitId}`} className="badge bg-green-100 text-green-800 hover:underline">
        View kit
      </Link>
    );
  }
  if (run.status === "failed") {
    return <span className="badge bg-red-100 text-red-800">Failed</span>;
  }
  return <span className="badge bg-slate-100 text-slate-600">{run.status}</span>;
}

export default function BatchPage() {
  return (
    <RequireAuth>
      <BatchContent />
    </RequireAuth>
  );
}
