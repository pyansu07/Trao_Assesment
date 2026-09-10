import net from "node:net";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";

// ---------------------------------------------------------------------------
// SSRF policy. RETRIEVAL_ENV controls whether localhost/private targets are
// allowed:
//   - "evaluation": localhost/private IPs allowed. Required so the batch
//     evaluator and local dev/tests can crawl localhost fixture sites.
//   - "production": localhost/private/loopback ranges are rejected outright,
//     and every resolved DNS answer is re-checked (mitigates DNS rebinding).
// ---------------------------------------------------------------------------

export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

export function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.split(":").pop();
    if (v4 && net.isIPv4(v4)) return isPrivateIPv4(v4);
  }
  return false;
}

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) return isPrivateIPv6(ip);
  return true; // unknown format - fail closed
}

export function retrievalEnvAllowsPrivate(): boolean {
  return env.RETRIEVAL_ENV === "evaluation";
}

/**
 * Validates URL shape/protocol. IP-level SSRF checks happen at connect time
 * in safeFetch's custom DNS lookup so that the address actually connected to
 * is the one validated (avoids a DNS-rebinding gap between check and use).
 */
export function assertUrlShapeAllowed(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AppError("INVALID_INPUT", `Invalid URL: ${rawUrl}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AppError("INVALID_INPUT", `Unsupported URL protocol: ${url.protocol}`);
  }
  if (!retrievalEnvAllowsPrivate()) {
    const hostname = url.hostname.toLowerCase();
    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      throw new AppError("COMPANY_UNREACHABLE", "Localhost URLs are not allowed in production");
    }
    if (net.isIP(hostname) && isPrivateIp(hostname)) {
      throw new AppError("COMPANY_UNREACHABLE", "Private/loopback IP addresses are not allowed");
    }
  }
  return url;
}
