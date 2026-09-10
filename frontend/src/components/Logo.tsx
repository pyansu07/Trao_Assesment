export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-soft ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" aria-hidden="true">
        <path
          d="M12 2 4 6v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6l-8-4Z"
          fill="currentColor"
          fillOpacity="0.18"
        />
        <path
          d="M12 2 4 6v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6l-8-4Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M9 12.5 11 14.5 15.5 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark />
      <span className="text-sm font-semibold tracking-tight text-slate-900">
        Prep<span className="text-brand-600">Kit</span>
      </span>
    </div>
  );
}
