const PATHS: Record<string, string> = {
  Company: "M4 20V6.5A1.5 1.5 0 0 1 5.5 5h8A1.5 1.5 0 0 1 15 6.5V20M9 9h2M9 12h2M9 15h2M15 11h4.5a.5.5 0 0 1 .5.5V20M4 20h16",
  Role: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20c0-3.3 3.1-6 7-6s7 2.7 7 6",
  Questions: "M12 17.5h.01M12 14c0-2 2-1.8 2-3.8A2 2 0 0 0 12 8.4a2 2 0 0 0-2 2M5 12a7 7 0 1 1 14 0 7 7 0 0 1-14 0Z",
  Flashcards: "M5 8.5A1.5 1.5 0 0 1 6.5 7h11A1.5 1.5 0 0 1 19 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5v-9ZM8 4h8M5 11h14",
  Schedule: "M7 3v3M17 3v3M4.5 8h15M5 6h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM9 13h2M13 13h2M9 16h2",
  Coverage: "M12 3 5 6v5.5c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9V6l-7-3ZM9.5 12l1.8 1.8L15 10",
  Practice: "M8 5.5v13l11-6.5-11-6.5Z",
};

export function TabIcon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
