"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { Navbar } from "@/components/Navbar";
import { Spinner } from "@/components/Spinner";
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
  const [dragOver, setDragOver] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function readFile(file: File) {
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

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
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

  const doneCount = runs.filter((r) => r.status === "completed" || r.status === "failed").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Batch upload</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          Upload a JSON file with multiple cases (each with <code className="rounded bg-slate-100 px-1 py-0.5">jd</code>,{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5">company_url</code>, and{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5">days</code>). Cases run one at a time; if one fails, the
          rest still complete.
        </p>

        {!batchId && (
          <div className="card animate-fade-in-up space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragOver ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <svg viewBox="0 0 24 24" className="mb-2 h-8 w-8 text-slate-400" fill="none">
                <path
                  d="M12 15V4m0 0 4 4m-4-4-4 4M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-sm font-medium text-slate-700">
                {fileName ?? "Drop a JSON file here, or click to browse"}
              </p>
              <p className="mt-1 text-xs text-slate-400">Up to 25 cases per batch</p>
              <input
                ref={fileInputRef}
                id="batchFile"
                type="file"
                accept="application/json"
                onChange={handleFile}
                className="hidden"
              />
            </div>
            {parseError && <p className="text-sm text-rose-600">{parseError}</p>}
            {cases && (
              <p className="animate-fade-in text-sm text-emerald-700">
                {cases.length} case{cases.length === 1 ? "" : "s"} ready to upload.
              </p>
            )}
            {submitError && <p className="text-sm text-rose-600">{submitError}</p>}
            <button className="btn-primary w-full" disabled={!cases || submitting} onClick={handleSubmit}>
              {submitting && <Spinner className="h-4 w-4" light />}
              {submitting ? "Starting batch..." : "Start batch generation"}
            </button>
            <details className="text-xs text-slate-400">
              <summary className="cursor-pointer select-none hover:text-slate-600">Sample file format</summary>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-slate-100">{SAMPLE}</pre>
            </details>
          </div>
        )}

        {batchId && (
          <div className="card animate-fade-in-up">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Batch progress</h2>
              <span className="text-xs text-slate-400">
                {doneCount}/{runs.length || "…"} done
              </span>
            </div>
            <ul className="divide-y divide-slate-100">
              {runs.map((run) => (
                <li key={run._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="truncate text-slate-700">{run.input.company_url}</span>
                  <StatusBadge run={run} />
                </li>
              ))}
              {runs.length === 0 && (
                <li className="flex items-center gap-2 py-2.5 text-sm text-slate-400">
                  <Spinner className="h-3.5 w-3.5" />
                  Starting...
                </li>
              )}
            </ul>
          </div>
        )}

        <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
          ← Back to dashboard
        </Link>
      </main>
    </div>
  );
}

function StatusBadge({ run }: { run: GenerationRun }) {
  if (run.status === "completed" && run.kitId) {
    return (
      <Link href={`/kits/${run.kitId}`} className="badge bg-emerald-100 text-emerald-800 hover:underline">
        View kit
      </Link>
    );
  }
  if (run.status === "failed") {
    return <span className="badge bg-rose-100 text-rose-800">Failed</span>;
  }
  return (
    <span className="badge flex items-center gap-1 bg-slate-100 text-slate-600">
      <Spinner className="h-3 w-3" />
      {run.status}
    </span>
  );
}

export default function BatchPage() {
  return (
    <RequireAuth>
      <BatchContent />
    </RequireAuth>
  );
}
