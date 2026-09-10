// Process-wide minimum interval between calls sharing a key. Used to keep
// LLM request pacing under a free-tier provider's requests-per-minute limit
// proactively, instead of bursting and relying on retry/backoff to recover.
const lastCallAt = new Map<string, number>();

export async function throttleGlobal(key: string, minIntervalMs: number): Promise<void> {
  const last = lastCallAt.get(key) ?? 0;
  const wait = last + minIntervalMs - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastCallAt.set(key, Date.now());
}
