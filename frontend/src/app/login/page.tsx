"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, ApiError } from "@/lib/AuthContext";
import { AuthShell } from "@/components/AuthShell";
import { Spinner } from "@/components/Spinner";
import { useSlowLoadHint } from "@/lib/useSlowLoadHint";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const showColdStartHint = useSlowLoadHint(submitting, 3500);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="card">
        <h1 className="mb-1 text-xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
        <p className="mb-6 text-sm text-slate-500">Log in to your interview prep kits.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p role="alert" className="animate-fade-in rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting && <Spinner className="h-4 w-4" light />}
            {submitting ? "Logging in..." : "Log in"}
          </button>
          {showColdStartHint && (
            <p className="animate-fade-in text-center text-xs text-slate-400">
              First request after a while can take up to a minute &mdash; the free-tier backend is waking up.
            </p>
          )}
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          No account?{" "}
          <Link href="/register" className="font-medium text-brand-600 hover:text-brand-700 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
