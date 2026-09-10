import { describe, it, expect } from "vitest";
import { parseDisallowedPrefixes } from "./robotsPolicy.js";

describe("parseDisallowedPrefixes", () => {
  it("collects Disallow rules under a wildcard User-agent group", () => {
    const robotsTxt = ["User-agent: *", "Disallow: /admin", "Disallow: /private"].join("\n");
    expect(parseDisallowedPrefixes(robotsTxt)).toEqual(["/admin", "/private"]);
  });

  it("ignores Disallow rules scoped to a different bot", () => {
    const robotsTxt = ["User-agent: SomeOtherBot", "Disallow: /admin"].join("\n");
    expect(parseDisallowedPrefixes(robotsTxt)).toEqual([]);
  });

  it("applies rules scoped specifically to our bot name", () => {
    const robotsTxt = ["User-agent: InterviewPrepKitBot", "Disallow: /no-bots"].join("\n");
    expect(parseDisallowedPrefixes(robotsTxt)).toEqual(["/no-bots"]);
  });

  it("returns no restrictions for an empty robots.txt", () => {
    expect(parseDisallowedPrefixes("")).toEqual([]);
  });

  it("ignores comments and blank lines", () => {
    const robotsTxt = ["# comment", "", "User-agent: *", "# another comment", "Disallow: /secret"].join("\n");
    expect(parseDisallowedPrefixes(robotsTxt)).toEqual(["/secret"]);
  });

  it("handles a full-site disallow", () => {
    const robotsTxt = ["User-agent: *", "Disallow: /"].join("\n");
    expect(parseDisallowedPrefixes(robotsTxt)).toEqual(["/"]);
  });

  it("only applies the most recently matched User-agent group", () => {
    const robotsTxt = ["User-agent: *", "Disallow: /shared", "User-agent: Googlebot", "Disallow: /google-only"].join(
      "\n",
    );
    expect(parseDisallowedPrefixes(robotsTxt)).toEqual(["/shared"]);
  });
});
