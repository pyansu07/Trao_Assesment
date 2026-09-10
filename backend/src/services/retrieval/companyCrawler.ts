import { safeFetchPage } from "./safeFetch.js";
import { extractCleanText, extractLinks, extractTitle } from "./htmlParser.js";
import { rankLinks } from "./linkRanker.js";
import { isAllowedByRobots } from "./robotsPolicy.js";

const MAX_PAGES_TO_FETCH = 4; // beyond the homepage itself

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
}

export interface CrawlFailure {
  url: string;
  reason: string;
}

export interface CrawlResult {
  homepageFetched: boolean;
  pagesUsed: CrawledPage[];
  failures: CrawlFailure[];
}

/**
 * Fetches the company homepage, discovers + ranks its own links (no
 * hard-coded paths), and fetches a bounded number of the most relevant ones.
 * Any single page failing is recorded and skipped - it never aborts the
 * whole crawl or the generation pipeline.
 */
export async function crawlCompanySite(companyUrl: string): Promise<CrawlResult> {
  const failures: CrawlFailure[] = [];
  const pagesUsed: CrawledPage[] = [];

  if (!(await isAllowedByRobots(companyUrl))) {
    failures.push({ url: companyUrl, reason: "Blocked by robots.txt" });
    return { homepageFetched: false, pagesUsed, failures };
  }

  let homepage;
  try {
    homepage = await safeFetchPage(companyUrl);
  } catch (err) {
    failures.push({ url: companyUrl, reason: err instanceof Error ? err.message : String(err) });
    return { homepageFetched: false, pagesUsed, failures };
  }

  pagesUsed.push({
    url: homepage.finalUrl,
    title: extractTitle(homepage.html),
    text: extractCleanText(homepage.html),
  });

  const baseHost = new URL(homepage.finalUrl).hostname;
  const links = extractLinks(homepage.html, homepage.finalUrl);
  const ranked = rankLinks(links, baseHost).filter((link) => link.score > 0);
  const toFetch = ranked.slice(0, MAX_PAGES_TO_FETCH);

  for (const link of toFetch) {
    if (!(await isAllowedByRobots(link.href))) {
      failures.push({ url: link.href, reason: "Blocked by robots.txt" });
      continue;
    }
    try {
      const page = await safeFetchPage(link.href);
      pagesUsed.push({
        url: page.finalUrl,
        title: extractTitle(page.html),
        text: extractCleanText(page.html),
      });
    } catch (err) {
      failures.push({ url: link.href, reason: err instanceof Error ? err.message : String(err) });
    }
  }

  return { homepageFetched: true, pagesUsed, failures };
}
