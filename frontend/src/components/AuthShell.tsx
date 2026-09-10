import type { ReactNode } from "react";
import { LogoMark } from "./Logo";

const HIGHLIGHTS = [
  { title: "Research, automated", body: "We crawl the company site and search for real interview discussion for you." },
  { title: "A kit that adapts", body: "Edit, reorder, and regenerate any section without losing your changes." },
  { title: "Practice that remembers", body: "Flashcard drills prioritize whatever you're least confident about." },
];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen">
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-violet-700 px-10 py-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 0, transparent 35%), radial-gradient(circle at 80% 70%, white 0, transparent 40%)",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <LogoMark className="h-9 w-9 bg-white/15 backdrop-blur" />
          <span className="text-sm font-semibold tracking-tight">
            Prep<span className="text-brand-200">Kit</span>
          </span>
        </div>

        <div className="relative">
          <h1 className="mb-3 text-3xl font-semibold leading-tight tracking-tight">
            Walk into your next interview actually ready.
          </h1>
          <p className="mb-10 text-sm text-brand-100">
            Paste a job description and a company URL. Get a categorized question bank, flashcards, and a
            day-by-day study plan built for exactly the time you have.
          </p>
          <ul className="space-y-5">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex gap-3">
                <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/15">
                  <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none">
                    <path d="M4 10.5 8 14l8-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{h.title}</p>
                  <p className="text-xs text-brand-100">{h.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-200/70">Built for the AI Interview Prep Kit assessment.</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <LogoMark />
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              Prep<span className="text-brand-600">Kit</span>
            </span>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
