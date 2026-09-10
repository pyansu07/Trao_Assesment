const lastRequestAt = new Map<string, number>();
const MIN_INTERVAL_MS = 350;

/** Simple per-host min-interval throttle so crawling doesn't hammer any single site. */
export async function throttleHost(hostname: string): Promise<void> {
  const last = lastRequestAt.get(hostname) ?? 0;
  const wait = last + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt.set(hostname, Date.now());
}
