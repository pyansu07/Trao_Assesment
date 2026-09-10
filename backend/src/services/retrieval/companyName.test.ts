import { describe, it, expect } from "vitest";
import { deriveCompanyName } from "./companyName.js";

describe("deriveCompanyName", () => {
  it("picks the segment that recurs across multiple page titles, regardless of order", () => {
    const pages = [
      { url: "https://acme.test/careers", title: "Careers | Acme Robotics", text: "" },
      { url: "https://acme.test/about", title: "About | Acme Robotics", text: "" },
    ];
    expect(deriveCompanyName(pages, "https://acme.test/careers")).toBe("Acme Robotics");
  });

  it("falls back to the hostname when only one page was fetched (a real domain)", () => {
    const pages = [{ url: "https://acme.test/careers", title: "Careers | Acme Robotics", text: "" }];
    expect(deriveCompanyName(pages, "https://acme.test/careers")).toBe("Acme");
  });

  it("derives a name from the hostname when the company site was entirely unreachable", () => {
    expect(deriveCompanyName([], "https://widgetco.test/")).toBe("Widgetco");
  });

  it("handles zero pages fetched against a localhost fixture without crashing", () => {
    expect(deriveCompanyName([], "http://localhost:9999/does-not-exist")).toBe("Localhost");
  });
});
