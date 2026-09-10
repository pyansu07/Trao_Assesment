import type { ExtractedLink } from "./htmlParser.js";

// ---------------------------------------------------------------------------
// Ranks links discovered on the company's own homepage by how likely they are
// to contain hiring/interview/culture information. This is a *signal-based
// score*, not a hard-coded path list: any link whose href or anchor text
// contains one of these keyword signals is boosted, regardless of the site's
// actual URL structure. Sites with no such links simply score everything low
// (and the crawler is free to fetch none) instead of guessing a fake path.
// ---------------------------------------------------------------------------

const HIGH_VALUE_SIGNALS = [
  "career",
  "careers",
  "job",
  "jobs",
  "hiring",
  "hire",
  "interview",
  "engineering",
  "engineer",
  "handbook",
  "culture",
  "about",
  "working",
  "life-at",
  "life at",
  "team",
  "recruit",
  "join-us",
  "join us",
];

export interface RankedLink extends ExtractedLink {
  score: number;
}

function signalScore(haystack: string): number {
  const lower = haystack.toLowerCase();
  let score = 0;
  for (const signal of HIGH_VALUE_SIGNALS) {
    if (lower.includes(signal)) score += 1;
  }
  return score;
}

/** Scores + sorts links descending by relevance signal strength found in the href/anchor text. */
export function rankLinks(links: ExtractedLink[], baseHost: string): RankedLink[] {
  const scored: RankedLink[] = links.map((link) => {
    let score = signalScore(link.href) * 2 + signalScore(link.text) * 1.5;
    try {
      const linkHost = new URL(link.href).hostname;
      // mild preference for same-site links (keeps crawl on-topic) but does
      // not exclude subdomains (e.g. jobs.company.com, boards.greenhouse.io)
      if (linkHost === baseHost) score += 0.5;
    } catch {
      // ignore malformed
    }
    return { ...link, score };
  });

  return scored.sort((a, b) => b.score - a.score);
}
