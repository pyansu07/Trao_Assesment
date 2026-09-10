import dns from "node:dns";
import { Agent, fetch as undiciFetch } from "undici";
import { withRetry } from "../../utils/retry.js";
import { throttleHost } from "../../utils/hostRateLimiter.js";
import { assertUrlShapeAllowed, isPrivateIp, retrievalEnvAllowsPrivate } from "./urlPolicy.js";

// ---------------------------------------------------------------------------
// SSRF-hardened HTTP fetch used for every external retrieval (company site
// crawling, public interview-discussion search). Guarantees:
//   - http/https only, validated before AND at DNS-resolution time
//   - DNS-rebinding mitigation: the custom `lookup` re-validates every
//     resolved address at actual connect time, not just at URL-parse time
//   - manual redirect handling with a hard cap, each hop re-validated
//   - hard response-size cap (streamed, aborted early if exceeded)
//   - content-type allowlist
//   - request timeout via AbortController
//   - retry with exponential backoff + jitter, but only for transient errors
//   - simple per-host rate limiting
// ---------------------------------------------------------------------------

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 10_000;
const ALLOWED_CONTENT_TYPES = ["text/html", "text/plain", "application/xhtml+xml"];
const USER_AGENT = "InterviewPrepKitBot/1.0 (+educational assessment project)";

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | dns.LookupAddress[],
  family?: number,
) => void;

function secureLookup(hostname: string, options: dns.LookupOptions, callback: LookupCallback): void {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, []);
    const list = addresses as dns.LookupAddress[];
    if (!retrievalEnvAllowsPrivate()) {
      const blocked = list.find((a) => isPrivateIp(a.address));
      if (blocked) {
        return callback(
          new Error(`SSRF_BLOCKED: ${hostname} resolved to disallowed address ${blocked.address}`),
          [],
        );
      }
    }
    if (options.all) {
      callback(null, list);
    } else {
      callback(null, list[0]?.address ?? "", list[0]?.family);
    }
  });
}

const secureAgent = new Agent({
  connect: { lookup: secureLookup as never, timeout: REQUEST_TIMEOUT_MS },
});

export interface FetchedPage {
  requestedUrl: string;
  finalUrl: string;
  html: string;
  contentType: string;
  status: number;
}

export class RetrievalError extends Error {
  retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "RetrievalError";
    this.retryable = retryable;
  }
}

async function readBodyWithLimit(res: { body: ReadableStream<Uint8Array> | null }): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Buffer[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      received += value.byteLength;
      if (received > MAX_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new RetrievalError("Response exceeded maximum allowed size", false);
      }
      chunks.push(Buffer.from(value));
    }
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function fetchOnce(targetUrl: URL, redirectsLeft: number, requestedUrl: string): Promise<FetchedPage> {
  await throttleHost(targetUrl.hostname);
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Awaited<ReturnType<typeof undiciFetch>>;
  try {
    res = await undiciFetch(targetUrl, {
      method: "GET",
      redirect: "manual",
      dispatcher: secureAgent,
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
    });
  } catch (err) {
    clearTimeout(timeoutHandle);
    const msg = err instanceof Error ? err.message : String(err);
    if (err instanceof Error && err.name === "AbortError") {
      throw new RetrievalError(`Timed out fetching ${targetUrl}`, true);
    }
    if (msg.includes("SSRF_BLOCKED")) {
      throw new RetrievalError(`Blocked unsafe target: ${targetUrl}`, false);
    }
    throw new RetrievalError(`Network error fetching ${targetUrl}: ${msg}`, true);
  }
  clearTimeout(timeoutHandle);

  if ([301, 302, 303, 307, 308].includes(res.status)) {
    const location = res.headers.get("location");
    if (!location) throw new RetrievalError(`Redirect with no Location header from ${targetUrl}`, false);
    if (redirectsLeft <= 0) throw new RetrievalError(`Too many redirects from ${requestedUrl}`, false);
    const nextUrl = assertUrlShapeAllowed(new URL(location, targetUrl).toString());
    return fetchOnce(nextUrl, redirectsLeft - 1, requestedUrl);
  }

  if (res.status >= 500) throw new RetrievalError(`Server error ${res.status} from ${targetUrl}`, true);
  if (res.status === 429) throw new RetrievalError(`Rate limited (429) by ${targetUrl}`, true);
  if (res.status >= 400) throw new RetrievalError(`HTTP ${res.status} from ${targetUrl}`, false);

  const contentType = res.headers.get("content-type") ?? "";
  const baseType = contentType.split(";")[0].trim().toLowerCase();
  if (baseType && !ALLOWED_CONTENT_TYPES.includes(baseType)) {
    throw new RetrievalError(`Unsupported content-type "${baseType}" from ${targetUrl}`, false);
  }

  const html = await readBodyWithLimit(res);
  return { requestedUrl, finalUrl: targetUrl.toString(), html, contentType: baseType, status: res.status };
}

/** Fetches a single page with full SSRF protection, redirect/size/type limits, and retry. */
export async function safeFetchPage(rawUrl: string): Promise<FetchedPage> {
  const url = assertUrlShapeAllowed(rawUrl);
  return withRetry(() => fetchOnce(url, MAX_REDIRECTS, rawUrl), {
    maxAttempts: 3,
    baseDelayMs: 500,
    isRetryable: (err) => (err instanceof RetrievalError ? err.retryable : true),
  });
}
