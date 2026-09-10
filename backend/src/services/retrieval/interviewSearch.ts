import * as cheerio from "cheerio";
import { safeFetchPage } from "./safeFetch.js";

// ---------------------------------------------------------------------------
// Searches for public discussion of a company's interview process using
// DuckDuckGo's keyless HTML search endpoint (no API key required - a
// genuine free tier). If SEARCH_API_KEY is configured this could be swapped
// for a paid provider (Serper/Bing/etc); DuckDuckGo HTML is the default so
// the feature works out of the box for anyone cloning the repo.
//
// If nothing useful is found (or the search itself fails), this returns
// found:false with an honest note instead of fabricating discussion.
// ---------------------------------------------------------------------------

export interface InterviewDiscussionHit {
  title: string;
  url: string;
  snippet: string;
}

export interface InterviewDiscussionResult {
  found: boolean;
  results: InterviewDiscussionHit[];
  note?: string;
}

const SEARCH_ENDPOINT = "https://html.duckduckgo.com/html/";
const MAX_RESULTS = 5;

function decodeDdgRedirect(href: string): string | null {
  try {
    const url = new URL(href, "https://duckduckgo.com");
    const uddg = url.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : href.startsWith("http") ? href : null;
  } catch {
    return null;
  }
}

export async function searchPublicInterviewDiscussion(companyName: string): Promise<InterviewDiscussionResult> {
  const trimmedName = companyName.trim();
  if (!trimmedName) {
    return { found: false, results: [], note: "No company name available to search for." };
  }

  const query = `${trimmedName} interview process questions experience`;
  const searchUrl = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}`;

  let page;
  try {
    page = await safeFetchPage(searchUrl);
  } catch (err) {
    return {
      found: false,
      results: [],
      note: `Public interview discussion search failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const $ = cheerio.load(page.html);
  const results: InterviewDiscussionHit[] = [];

  $(".result").each((_, el) => {
    if (results.length >= MAX_RESULTS) return;
    const titleEl = $(el).find(".result__a").first();
    const title = titleEl.text().replace(/\s+/g, " ").trim();
    const href = titleEl.attr("href");
    const snippet = $(el).find(".result__snippet").text().replace(/\s+/g, " ").trim();
    if (!title || !href) return;
    const targetUrl = decodeDdgRedirect(href);
    if (!targetUrl) return;
    results.push({ title, url: targetUrl, snippet: snippet.slice(0, 400) });
  });

  if (results.length === 0) {
    return {
      found: false,
      results: [],
      note: "No public discussion of this company's interview process was found.",
    };
  }

  return { found: true, results };
}
