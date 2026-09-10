import type { CrawledPage } from "./companyCrawler.js";

const TITLE_SEPARATORS = /[|\-–—:]/;
const NOISE_WORDS = /\b(home|homepage|official site|welcome to)\b/gi;

function titleSegments(title: string): string[] {
  return title
    .split(TITLE_SEPARATORS)
    .map((s) => s.replace(NOISE_WORDS, "").trim())
    .filter((s) => s.length > 1 && s.length < 60);
}

function hostnameFallback(companyUrl: string): string {
  try {
    const host = new URL(companyUrl).hostname.replace(/^www\./, "");
    const base = host.split(".")[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return "Unknown Company";
  }
}

/**
 * Best-effort, non-fabricated company display name. Page titles don't follow
 * a consistent "Site | Page" vs "Page | Site" convention across sites (or
 * even across pages on the same site), so guessing from a single title's
 * first segment is unreliable - especially when the crawl didn't start at
 * the homepage. Instead: when multiple pages were fetched, the segment that
 * RECURS across the most page titles is almost always the site/company name
 * (individual page names vary; the site name repeats). Falls back to the
 * URL hostname when there's no repeated segment to find.
 */
export function deriveCompanyName(pages: CrawledPage[], companyUrl: string): string {
  const countsByLower = new Map<string, number>();
  const originalCasingByLower = new Map<string, string>();

  for (const page of pages) {
    if (!page.title) continue;
    const uniqueSegments = new Set(titleSegments(page.title));
    for (const segment of uniqueSegments) {
      const key = segment.toLowerCase();
      countsByLower.set(key, (countsByLower.get(key) ?? 0) + 1);
      if (!originalCasingByLower.has(key)) originalCasingByLower.set(key, segment);
    }
  }

  const recurring = [...countsByLower.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])[0];
  if (recurring) return originalCasingByLower.get(recurring[0])!;

  // No repeated segment (0 or 1 page fetched) - prefer a real hostname over
  // guessing from a single ambiguous title, falling back to the title itself
  // only when the hostname isn't informative (e.g. localhost test fixtures).
  const hostBased = hostnameFallback(companyUrl);
  if (hostBased.toLowerCase() !== "localhost") return hostBased;

  const firstTitle = pages[0]?.title ? titleSegments(pages[0].title)[0] : undefined;
  return firstTitle ?? hostBased;
}
