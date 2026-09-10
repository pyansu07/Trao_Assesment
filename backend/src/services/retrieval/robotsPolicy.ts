import { safeFetchPage } from "./safeFetch.js";

// ---------------------------------------------------------------------------
// Basic robots.txt compliance. Before fetching any page on a host, the
// crawler checks this. A missing/unreachable robots.txt is treated as
// unrestricted (standard convention). This is a simplified parser - it
// matches User-agent groups (our bot's name, falling back to "*") and
// Disallow prefixes; it does not implement Allow-precedence, wildcards, or
// crawl-delay. That's a documented simplification (README), not a silent gap.
// ---------------------------------------------------------------------------

const BOT_NAME = "interviewprepkitbot";
const robotsCache = new Map<string, Promise<string[]>>();

export function parseDisallowedPrefixes(robotsTxt: string): string[] {
  const lines = robotsTxt.split(/\r?\n/);
  let groupApplies = false;
  const disallowed: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === "user-agent") {
      groupApplies = value === "*" || value.toLowerCase().includes(BOT_NAME);
    } else if (key === "disallow" && groupApplies && value) {
      disallowed.push(value);
    }
  }
  return disallowed;
}

async function fetchDisallowedPrefixes(origin: string): Promise<string[]> {
  const cached = robotsCache.get(origin);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const page = await safeFetchPage(`${origin}/robots.txt`);
      return parseDisallowedPrefixes(page.html);
    } catch {
      // no robots.txt, or it couldn't be fetched - treat as unrestricted
      return [];
    }
  })();

  robotsCache.set(origin, promise);
  return promise;
}

export async function isAllowedByRobots(url: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const disallowed = await fetchDisallowedPrefixes(parsed.origin);
  return !disallowed.some((prefix) => parsed.pathname.startsWith(prefix));
}
