import * as cheerio from "cheerio";

export interface ExtractedLink {
  href: string;
  text: string;
}

const MAX_TEXT_CHARS = 12_000;

/** Strips scripts/styles/nav noise and returns readable visible text, bounded in length. */
export function extractCleanText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, nav, footer").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  return text.slice(0, MAX_TEXT_CHARS);
}

export function extractTitle(html: string): string {
  const $ = cheerio.load(html);
  return $("title").first().text().trim();
}

/** Extracts every anchor's href (resolved to absolute) and its visible text. */
export function extractLinks(html: string, baseUrl: string): ExtractedLink[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const links: ExtractedLink[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_, el) => {
    const hrefRaw = $(el).attr("href");
    if (!hrefRaw) return;
    if (hrefRaw.startsWith("mailto:") || hrefRaw.startsWith("tel:") || hrefRaw.startsWith("javascript:")) return;
    let absolute: URL;
    try {
      absolute = new URL(hrefRaw, base);
    } catch {
      return;
    }
    if (absolute.protocol !== "http:" && absolute.protocol !== "https:") return;
    absolute.hash = "";
    const key = absolute.toString();
    if (seen.has(key)) return;
    seen.add(key);
    const text = $(el).text().replace(/\s+/g, " ").trim();
    links.push({ href: key, text });
  });

  return links;
}
